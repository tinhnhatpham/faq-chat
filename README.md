# FAQ Chat

An AI chat widget for small businesses. The business pastes its FAQ, gets one line of code for
its website, and visitors get instant answers taken **only** from that FAQ: no invented prices,
hours or policies, and no medical, legal or financial advice.

**Live demo:** https://faq-chat-demo.netlify.app/demo.html (Riverside Dental is a made-up clinic)

**Test results:** [TESTING.md](TESTING.md): prompt injection, made-up prices, forged chat
history, cost abuse and more, with the bugs the tests found and how they were fixed.

## How it works

```
Business website  ──<script src=".../widget.js" data-business="riverside-dental">
   └─ chat button + iframe (React)  ──>  Flask API  ──>  Claude (Haiku 4.5)
                                            └──────────>  Supabase (FAQs, chat log)
```

- **Embed:** `widget.js` is plain JavaScript, so it works on any site (WordPress, Wix, plain HTML).
  The chat runs in an iframe, so the business's CSS and ours can't break each other.
- **Backend (Flask):** builds a strict prompt from the FAQ and calls Claude. Only the last 10
  messages are sent, each trimmed, with a 32 KB request cap and a per-visitor hourly rate limit.
- **Database (Supabase):** Row Level Security is on with no public policies, so only the backend
  (server-side secret key) can read FAQs or conversations.
- **Admin page:** password-protected; create or edit a business's name, brand color and FAQ, and
  copy its embed code. Changes apply instantly, including the button color.

## Stack

Python / Flask on Render · React 19 + Vite on Netlify · Supabase (Postgres) · Claude API

## Project layout

| Path | What |
|---|---|
| `backend/` | Flask API (`app.py`), prompt + Claude call (`claude.py`), Supabase access (`db.py`) |
| `widget/` | Chat page, admin page, demo page and `public/widget.js` embed script |
| `supabase/schema.sql` | Tables, Row Level Security and demo data |

## Run locally

Backend: copy `backend/.env.example` to `backend/.env`, fill in the keys, then
`pip install -r requirements.txt` and `python app.py` (port 5000).
Widget: `npm install` and `npm run dev` in `widget/` (port 5173), then open `/demo.html`.

Built by Steven (LogicAgentry), an AI-assisted developer.
