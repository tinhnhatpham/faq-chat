# FAQ Chat backend

See the [main README](../README.md) for the overview.

## Run locally
1. `python -m venv venv` and activate it (Windows: `venv\Scripts\activate`)
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill in the values
4. `python app.py` (port 5000)

## Quick test
curl http://localhost:5000/api/health

curl -X POST http://localhost:5000/api/chat -H "Content-Type: application/json" -d '{"business_id":"riverside-dental","message":"What are your hours?"}'

Break-it test results: [TESTING.md](../TESTING.md)
