"""Builds the prompt from a business FAQ and calls Claude."""
import os
from anthropic import Anthropic

client = Anthropic()  # reads ANTHROPIC_API_KEY from the environment
MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
MAX_HISTORY = 10  # only send the last 10 messages to keep cost low


def build_system_prompt(business: dict) -> str:
    return f"""You are the website assistant for {business['name']}.

Answer visitor questions using ONLY the FAQ below.

Rules:
- If the answer is not in the FAQ, say you don't have that information and suggest contacting {business['name']} directly.
- Never invent prices, hours, policies, or availability.
- Never give medical, legal, or financial advice.
- Keep answers short: 1-3 sentences.
- Be friendly and professional.

FAQ:
{business['faq_text']}"""


def ask_claude(business: dict, history: list, message: str) -> str:
    messages = [
        {"role": m["role"], "content": m["content"]}
        for m in history[-MAX_HISTORY:]
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    messages.append({"role": "user", "content": message})

    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        system=build_system_prompt(business),
        messages=messages,
    )
    return "".join(b.text for b in response.content if b.type == "text").strip()
