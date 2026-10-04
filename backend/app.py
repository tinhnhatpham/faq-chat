"""FAQ Chat backend. Run locally: python app.py"""
import os
import time
from collections import defaultdict

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

from claude import ask_claude  # noqa: E402  (needs env loaded first)
from db import get_business    # noqa: E402

app = Flask(__name__)
CORS(app, origins=os.getenv("ALLOWED_ORIGINS", "*").split(","))

MAX_PER_HOUR = int(os.getenv("MAX_MESSAGES_PER_HOUR", "30"))
MAX_MESSAGE_LENGTH = 500
_requests = defaultdict(list)  # ip -> timestamps (resets on restart; fine for v1)


def rate_limited(ip: str) -> bool:
    now = time.time()
    _requests[ip] = [t for t in _requests[ip] if now - t < 3600]
    if len(_requests[ip]) >= MAX_PER_HOUR:
        return True
    _requests[ip].append(now)
    return False


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

    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
    if rate_limited(ip):
        return jsonify({"error": "Too many messages. Please try again later."}), 429

    try:
        reply = ask_claude(business, history, message)
    except Exception as e:
        app.logger.error(f"Claude error: {e}")
        return jsonify({"error": "Sorry, the assistant is unavailable right now."}), 502

    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", "5000")))
