# Constellation AI v0.1

Internal CRM and knowledge platform for East Rock, an SEC-registered investment adviser.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, MSAL for Azure AD auth
- **Backend:** FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2
- **Database:** PostgreSQL 16
- **Auth:** Microsoft Entra ID (Azure AD)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose

### Setup

1. **Clone and configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure AD credentials (or keep DEV_MODE=true for local dev)
   ```

2. **Start PostgreSQL:**
   ```bash
   docker compose up -d
   ```

3. **Set up backend:**
   ```bash
   cd backend
   poetry install
   alembic upgrade head
   python ../scripts/seed.py
   ```

4. **Set up frontend:**
   ```bash
   cd frontend
   npm install
   ```

5. **Run the application:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   uvicorn app.main:app --reload

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Access the app:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Development Mode

Set `DEV_MODE=true` in `.env` to bypass Azure AD authentication. This uses `DEV_USER_EMAIL` to simulate a logged-in user.

## Project Structure

```
constellation-ai/
├── docker-compose.yml          # PostgreSQL dev database
├── .env.example                # Environment variables template
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── main.py            # FastAPI app entry
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routers/           # API endpoints
│   │   ├── services/          # Business logic
│   │   └── auth/              # Authentication
│   ├── alembic/               # Database migrations
│   └── tests/                 # API tests
├── frontend/                   # Next.js application
│   └── src/
│       ├── app/               # App Router pages
│       ├── components/        # React components
│       ├── lib/               # Utilities
│       └── hooks/             # Custom hooks
└── scripts/                    # Dev utilities
```

## API Documentation

When the backend is running, visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

## Compliance Features

- **Soft-delete only:** Records are never hard-deleted (7-year retention requirement)
- **Audit logging:** All CUD operations logged; READ logged for CONFIDENTIAL/RESTRICTED records
- **Classification gating:** INTERNAL, CONFIDENTIAL, RESTRICTED access levels
- **Attachment versioning:** Files are never overwritten; version chains preserved
