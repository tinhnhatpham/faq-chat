"""Business data and chat logs, stored in Supabase (tables: see ../supabase/schema.sql).

Only this backend talks to Supabase, using the secret key. Row Level Security is on with
no policies, so the public key that Supabase hands out can read nothing.
"""
import os

from supabase import create_client

_client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])


def get_business(business_id: str):
    if not business_id:
        return None
    rows = (
        _client.table("businesses")
        .select("id, name, faq_text, color")
        .eq("id", business_id)
        .limit(1)
        .execute()
        .data
    )
    return rows[0] if rows else None


def list_businesses() -> list:
    return _client.table("businesses").select("id, name, color").order("name").execute().data


def save_business(business_id: str, name: str, faq_text: str, color: str) -> dict:
    """Create the business, or update it if the ID already exists."""
    row = {"id": business_id, "name": name, "faq_text": faq_text, "color": color}
    return _client.table("businesses").upsert(row).execute().data[0]


def save_messages(business_id: str, user_text: str, reply: str) -> None:
    _client.table("messages").insert([
        {"business_id": business_id, "role": "user", "content": user_text},
        {"business_id": business_id, "role": "assistant", "content": reply},
    ]).execute()
