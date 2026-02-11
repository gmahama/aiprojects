# Constellation AI Backend

FastAPI backend for Constellation AI CRM platform.

## Setup

```bash
poetry install
alembic upgrade head
python ../scripts/seed.py
uvicorn app.main:app --reload
```
