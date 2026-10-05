"""FAQ Chat backend. Run locally: python app.py"""
import hmac
import os
import re
import time
from collections import defaultdict

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

from claude import ask_claude  # noqa: E402  (needs env loaded first)
from db import get_business, list_businesses, save_business, save_messages  # noqa: E402

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024  # reject oversized requests before reading them
# The demo's own public address is always allowed; ALLOWED_ORIGINS adds others (comma-separated).
# For a client deployment, change SITE_ORIGIN to the client's chat address.
SITE_ORIGIN = "https://chat.logicagentry.com"
_origins = [o.strip().rstrip("/") for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
CORS(app, origins=_origins if "*" in _origins else _origins + [SITE_ORIGIN])

MAX_PER_HOUR = int(os.getenv("MAX_MESSAGES_PER_HOUR", "30"))
MAX_MESSAGE_LENGTH = 500
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
MIN_ADMIN_PASSWORD_LENGTH = 12
MAX_ADMIN_FAILURES_PER_HOUR = 10
MAX_FAQ_LENGTH = 20000  # roughly 5k tokens sent with every chat message
SLUG = re.compile(r"^[a-z0-9-]{3,50}$")
COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
_hits = defaultdict(list)  # (bucket, ip) -> timestamps (resets on restart; fine for v1)


def client_ip() -> str:
    # On Render, requests pass through Cloudflare, which sets CF-Connecting-IP to the real visitor
    # IP and overwrites any value the visitor sends. X-Forwarded-For can't be used: its first entry
    # can be faked and its last entries are shared proxy addresses. Locally there's no proxy.
    # NOTE: only trust this header behind Cloudflare; on another host, revisit this.
    return request.headers.get("CF-Connecting-IP") or request.remote_addr or ""


def recent_hits(key) -> list:
    now = time.time()
    _hits[key] = [t for t in _hits[key] if now - t < 3600]
    return _hits[key]


def rate_limited(key, limit: int) -> bool:
    hits = recent_hits(key)
    if len(hits) >= limit:
        return True
    hits.append(time.time())
    return False


def admin_error():
    """Return an error response unless the request carries the right admin password."""
    if len(ADMIN_PASSWORD) < MIN_ADMIN_PASSWORD_LENGTH:
        return jsonify({"error": f"Admin is disabled: set ADMIN_PASSWORD ({MIN_ADMIN_PASSWORD_LENGTH}+ characters) on the server"}), 503
    failures = recent_hits(("admin-fail", client_ip()))
    if len(failures) >= MAX_ADMIN_FAILURES_PER_HOUR:
        return jsonify({"error": "Too many wrong passwords. Try again in an hour."}), 429
    given = request.headers.get("X-Admin-Password", "")
    if not hmac.compare_digest(given.encode(), ADMIN_PASSWORD.encode()):
        failures.append(time.time())
        return jsonify({"error": "Wrong password"}), 401
    return None


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/business/<business_id>")
def business_info(business_id):
    business = get_business(business_id)
    if not business:
        return jsonify({"error": "Business not found"}), 404
    # Never send the full FAQ to the browser, just display info
    return jsonify({"id": business["id"], "name": business["name"], "color": business["color"]})


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}
    business_id = data.get("business_id", "")
    message = (data.get("message") or "").strip()
    history = data.get("history") or []

    if not message:
        return jsonify({"error": "Message is empty"}), 400
    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Message is too long (max {MAX_MESSAGE_LENGTH} characters)"}), 400
    if not isinstance(history, list):
        return jsonify({"error": "History must be a list"}), 400

    business = get_business(business_id)
    if not business:
        return jsonify({"error": "Business not found"}), 404

    if rate_limited(("chat", client_ip()), MAX_PER_HOUR):
        return jsonify({"error": "Too many messages. Please try again later."}), 429

    try:
        reply = ask_claude(business, history, message)
    except Exception as e:
        app.logger.error(f"Claude error: {e}")
        return jsonify({"error": "Sorry, the assistant is unavailable right now."}), 502

    try:
        save_messages(business["id"], message, reply)
    except Exception as e:  # a logging failure shouldn't cost the visitor their answer
        app.logger.error(f"Saving messages failed: {e}")

    return jsonify({"reply": reply})


@app.get("/api/admin/businesses")
def admin_list_businesses():
    if err := admin_error():
        return err
    return jsonify(list_businesses())


@app.get("/api/admin/businesses/<business_id>")
def admin_get_business(business_id):
    if err := admin_error():
        return err
    business = get_business(business_id)
    if not business:
        return jsonify({"error": "Business not found"}), 404
    return jsonify(business)


@app.put("/api/admin/businesses/<business_id>")
def admin_save_business(business_id):
    if err := admin_error():
        return err
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    faq_text = (data.get("faq_text") or "").strip()
    color = (data.get("color") or "").strip()

    if not SLUG.match(business_id):
        return jsonify({"error": "ID must be 3-50 characters: lowercase letters, numbers and dashes"}), 400
    if not name or len(name) > 100:
        return jsonify({"error": "Name is required (max 100 characters)"}), 400
    if not faq_text:
        return jsonify({"error": "FAQ is empty"}), 400
    if len(faq_text) > MAX_FAQ_LENGTH:
        return jsonify({"error": f"FAQ is too long (max {MAX_FAQ_LENGTH} characters)"}), 400
    if not COLOR.match(color):
        return jsonify({"error": "Color must look like #0f766e"}), 400

    return jsonify(save_business(business_id, name, faq_text, color))


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", "5000")))
