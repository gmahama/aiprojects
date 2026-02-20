# Constellation AI — Claude Code One-Shot Build Instructions

# Git Setup (IMPORTANT)
- The git root is **not** this directory — it is `/Users/georgiemahama/Documents/code/aiprojects`
- All git commands must use: `git -C /Users/georgiemahama/Documents/code/aiprojects`
- All paths in git commands must be prefixed with `constellation_ai/mvp_cai_2/`
- The root `.gitignore` contains `lib/` which blocks `frontend/src/lib/` — use `git add -f` for files in that directory
- Sibling projects exist in the repo (`vinyl/`, `13f-scraper-clean`, etc.) — always stage files explicitly by name, never use `git add -A` or `git add .`
- The backend venv is at `backend/.venv/` — use `.venv/bin/alembic` and `.venv/bin/python` for backend commands

# Project Conventions
- Python: use async/await everywhere, type hints required
- Always run `alembic upgrade head` after schema changes
- Test endpoints with `curl` or `httpie` after building them
- Frontend: TypeScript strict, no `any` types
- All list endpoints must support pagination
- Never hard-delete records (soft-delete with is_deleted flag)
- Always log to audit_log on CUD operations
- DEV_MODE=true bypasses auth — always verify this works

## How to Use This File

Copy the entire contents below the line into Claude Code as a single prompt. Before running, make sure you're in an empty directory (or your existing repo root). If you have existing schema files, migrations, or partial code, mention that when pasting so Claude Code can integrate rather than overwrite.

---

## THE PROMPT (copy from here)

Build the complete v1 of **Constellation AI**, an internal CRM and knowledge platform for a SEC-registered investment adviser called East Rock. This is a full-stack application. Build everything in one pass — backend, frontend, database schema, Docker dev environment, and configuration.

Read these specs carefully. I'll describe the architecture, data model, features, and compliance requirements. Then build it all.

---

### 1. TECH STACK (non-negotiable)

- **Frontend:** Next.js 14+ (App Router) with TypeScript. Use MSAL (`@azure/msal-browser`, `@azure/msal-react`) for Microsoft Entra ID authentication. Tailwind CSS for styling. Use shadcn/ui components.
- **Backend:** FastAPI (Python 3.11+). Use SQLAlchemy 2.0 (async) as ORM. Alembic for migrations. Pydantic v2 for schemas.
- **Database:** PostgreSQL 16. Use UUIDs as primary keys everywhere. Enable `pg_trgm` and `unaccent` extensions for full-text search.
- **Blob Storage:** Azure Blob Storage for attachments (abstract behind a service layer so local dev can use filesystem).
- **Auth:** Microsoft Entra ID (Azure AD). Backend validates JWT tokens from Entra. Frontend uses MSAL popup/redirect flow.
- **Dev Environment:** Docker Compose with PostgreSQL. The app itself runs natively (not containerized) for hot reload.

---

### 2. PROJECT STRUCTURE

```
constellation-ai/
├── docker-compose.yml              # Postgres + any dev services
├── .env.example                    # All env vars documented
├── README.md
├── backend/
│   ├── pyproject.toml              # Use poetry or pip
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/              # Migration files
│   ├── app/
│   │   ├── main.py                # FastAPI app, lifespan, CORS, middleware
│   │   ├── config.py              # Settings via pydantic-settings
│   │   ├── database.py            # Async engine, session factory
│   │   ├── dependencies.py        # get_db, get_current_user, require_role
│   │   ├── auth/
│   │   │   ├── entra.py           # JWT validation, token decoding
│   │   │   └── rbac.py            # Role and classification checks
│   │   ├── models/                # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── organization.py
│   │   │   ├── contact.py
│   │   │   ├── activity.py
│   │   │   ├── attachment.py
│   │   │   ├── tag.py
│   │   │   ├── followup.py
│   │   │   └── audit.py
│   │   ├── schemas/               # Pydantic request/response models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── organization.py
│   │   │   ├── contact.py
│   │   │   ├── activity.py
│   │   │   ├── attachment.py
│   │   │   ├── tag.py
│   │   │   ├── followup.py
│   │   │   └── search.py
│   │   ├── routers/               # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── users.py
│   │   │   ├── organizations.py
│   │   │   ├── contacts.py
│   │   │   ├── activities.py
│   │   │   ├── attachments.py
│   │   │   ├── tags.py
│   │   │   ├── followups.py
│   │   │   ├── search.py
│   │   │   └── health.py
│   │   └── services/              # Business logic layer
│   │       ├── __init__.py
│   │       ├── audit_service.py
│   │       ├── blob_service.py
│   │       ├── search_service.py
│   │       └── export_service.py
│   └── tests/
│       └── conftest.py
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # Root layout with MsalProvider
│   │   │   ├── page.tsx           # Landing / dashboard
│   │   │   ├── contacts/
│   │   │   │   ├── page.tsx       # Contact list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Contact detail
│   │   │   ├── organizations/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── activities/
│   │   │   │   ├── page.tsx       # Activity list / timeline
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx   # Create meeting
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Activity detail
│   │   │   ├── search/
│   │   │   │   └── page.tsx       # Global search
│   │   │   └── admin/
│   │   │       ├── tags/
│   │   │       │   └── page.tsx   # Tag management
│   │   │       └── audit/
│   │   │           └── page.tsx   # Audit log viewer
│   │   ├── components/
│   │   │   ├── ui/                # shadcn components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── AuthGuard.tsx
│   │   │   ├── contacts/
│   │   │   │   ├── ContactForm.tsx
│   │   │   │   ├── ContactCard.tsx
│   │   │   │   └── ContactList.tsx
│   │   │   ├── activities/
│   │   │   │   ├── ActivityForm.tsx
│   │   │   │   ├── ActivityCard.tsx
│   │   │   │   ├── ActivityTimeline.tsx
│   │   │   │   └── AttendeeSelector.tsx
│   │   │   ├── attachments/
│   │   │   │   ├── FileUpload.tsx
│   │   │   │   └── AttachmentList.tsx
│   │   │   ├── tags/
│   │   │   │   ├── TagSelector.tsx
│   │   │   │   └── TagBadge.tsx
│   │   │   ├── followups/
│   │   │   │   ├── FollowUpForm.tsx
│   │   │   │   └── FollowUpList.tsx
│   │   │   └── search/
│   │   │       ├── SearchBar.tsx
│   │   │       └── SearchResults.tsx
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios/fetch wrapper with auth token
│   │   │   ├── msal-config.ts     # MSAL configuration
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── useApi.ts          # Authenticated API calls
│   │   │   └── useAuth.ts         # Auth state helper
│   │   └── types/
│   │       └── index.ts           # TypeScript types matching backend schemas
│   └── public/
└── scripts/
    ├── seed.py                    # Seed data for dev
    └── run-dev.sh                 # Start backend + frontend
```

---

### 3. DATABASE SCHEMA (implement exactly)

All tables use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`. All tables have `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (auto-updated via trigger or ORM event).

#### 3.1 `users`
```
id, entra_object_id (unique, from Azure AD), email (unique), display_name,
role ENUM('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER'),
is_active BOOLEAN DEFAULT TRUE,
created_at, updated_at
```

#### 3.2 `organizations`
```
id, name, short_name (nullable), org_type (nullable, e.g. 'ASSET_MANAGER', 'BROKER', 'CONSULTANT', 'CORPORATE', 'OTHER'),
website (nullable), notes (nullable),
classification ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED') DEFAULT 'INTERNAL',
owner_id FK -> users (nullable),
created_by FK -> users, created_at, updated_at
```

#### 3.3 `contacts`
```
id, first_name, last_name, email (nullable), phone (nullable),
title (nullable, job title), organization_id FK -> organizations (nullable),
classification ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED') DEFAULT 'INTERNAL',
owner_id FK -> users (nullable),
notes (nullable),
created_by FK -> users, created_at, updated_at
```

#### 3.4 `tag_sets` (controlled vocabulary categories)
```
id, name (unique, e.g. 'Sector', 'Strategy', 'Geography', 'Relationship Type'),
description (nullable), is_active BOOLEAN DEFAULT TRUE,
created_at, updated_at
```

#### 3.5 `tags`
```
id, tag_set_id FK -> tag_sets, value (text, the tag label),
is_active BOOLEAN DEFAULT TRUE,
UNIQUE(tag_set_id, value),
created_at, updated_at
```

#### 3.6 `contact_tags` (M:N)
```
contact_id FK -> contacts, tag_id FK -> tags,
PRIMARY KEY (contact_id, tag_id),
tagged_by FK -> users, tagged_at TIMESTAMPTZ DEFAULT NOW()
```

#### 3.7 `organization_tags` (M:N)
```
organization_id FK -> organizations, tag_id FK -> tags,
PRIMARY KEY (organization_id, tag_id),
tagged_by FK -> users, tagged_at TIMESTAMPTZ DEFAULT NOW()
```

#### 3.8 `activities`
```
id, activity_type ENUM('MEETING', 'CALL', 'EMAIL', 'NOTE', 'LLM_INTERACTION', 'SLACK_NOTE'),
title, description (nullable),
occurred_at TIMESTAMPTZ NOT NULL,
location (nullable),
summary (nullable, rich text or plain text),
key_points (nullable, text),
classification ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED') DEFAULT 'INTERNAL',
owner_id FK -> users,
created_by FK -> users, created_at, updated_at
```
Add a generated tsvector column for full-text search on `title || summary || key_points || description`.

#### 3.9 `activity_attendees` (M:N between activities and contacts)
```
activity_id FK -> activities, contact_id FK -> contacts,
role (nullable, e.g. 'ORGANIZER', 'PRESENTER', 'ATTENDEE'),
PRIMARY KEY (activity_id, contact_id)
```

#### 3.10 `activity_tags` (M:N)
```
activity_id FK -> activities, tag_id FK -> tags,
PRIMARY KEY (activity_id, tag_id),
tagged_by FK -> users, tagged_at TIMESTAMPTZ DEFAULT NOW()
```

#### 3.11 `activity_versions` (append-only history)
```
id, activity_id FK -> activities,
version_number INTEGER NOT NULL,
snapshot JSONB NOT NULL (full serialized state at that point),
changed_by FK -> users,
changed_at TIMESTAMPTZ DEFAULT NOW()
```

#### 3.12 `followups`
```
id, activity_id FK -> activities,
description TEXT NOT NULL,
assigned_to FK -> users (nullable),
due_date DATE (nullable),
status ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'OPEN',
completed_at TIMESTAMPTZ (nullable),
created_by FK -> users, created_at, updated_at
```

#### 3.13 `attachments`
```
id, activity_id FK -> activities,
filename TEXT NOT NULL,
content_type TEXT NOT NULL,
file_size_bytes BIGINT,
blob_path TEXT NOT NULL (path in blob storage),
checksum TEXT (SHA-256),
version_number INTEGER DEFAULT 1,
parent_attachment_id FK -> attachments (nullable, for version chains),
classification ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED') DEFAULT 'INTERNAL',
uploaded_by FK -> users, created_at
```
Allowlisted content types: `application/pdf`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-outlook`.

#### 3.14 `audit_log`
```
id, user_id FK -> users (nullable),
action ENUM('CREATE', 'READ', 'UPDATE', 'DELETE'),
entity_type TEXT NOT NULL (e.g. 'contact', 'activity', 'attachment'),
entity_id UUID NOT NULL,
details JSONB (nullable, diff or context),
ip_address TEXT (nullable),
created_at TIMESTAMPTZ DEFAULT NOW()
```
INDEX on (entity_type, entity_id) and (user_id, created_at).
READ events are only required for CONFIDENTIAL and RESTRICTED records.

---

### 4. BACKEND IMPLEMENTATION DETAILS

#### 4.1 Authentication & Authorization

**JWT Validation (`auth/entra.py`):**
- Fetch JWKS from `https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys`
- Cache JWKS with TTL (e.g., 1 hour)
- Validate token: audience, issuer, expiry, signature
- Extract `oid` (object_id), `preferred_username` (email), `name`
- Auto-provision user on first login if not in DB (role = VIEWER by default)

**For local development without Entra:**
- Support a `DEV_MODE=true` env var that bypasses JWT validation
- In dev mode, use a configurable `DEV_USER_EMAIL` to simulate a logged-in user
- This is critical — the app must be testable locally without Azure AD

**RBAC (`auth/rbac.py`):**
- ADMIN: full access, manage users, tags, audit log
- MANAGER: create/edit all records, assign ownership
- ANALYST: create/edit own records, view all INTERNAL, view CONFIDENTIAL if in group
- VIEWER: read-only access to INTERNAL records
- Classification gating: before returning any record, check `classification` vs user role/group
- RESTRICTED records: only accessible by ADMIN or explicit group membership (model as a `restricted_access_users` M:N table or keep simple with ADMIN-only for v1)

**Dependency injection:**
```python
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User: ...
def require_role(*roles: UserRole): ...  # returns dependency
def require_classification(classification: Classification): ...  # returns dependency
```

#### 4.2 Audit Logging (`services/audit_service.py`)

Create an `audit_log` helper that can be called from any router:
```python
async def log_action(db, user_id, action, entity_type, entity_id, details=None, ip_address=None): ...
```
- Log CREATE, UPDATE, DELETE on all entities
- Log READ on CONFIDENTIAL and RESTRICTED entities
- Capture the request IP from the FastAPI request object

#### 4.3 Activity Versioning

On every UPDATE to an activity:
1. Serialize the current state to JSON
2. Insert into `activity_versions` with incremented `version_number`
3. Then apply the update

#### 4.4 Attachment Service (`services/blob_service.py`)

Create an abstract interface:
```python
class BlobService(ABC):
    async def upload(self, file: UploadFile, path: str) -> str: ...
    async def download(self, path: str) -> StreamingResponse: ...
    async def delete(self, path: str) -> None: ...  # soft-delete only

class AzureBlobService(BlobService): ...  # Uses azure-storage-blob SDK
class LocalBlobService(BlobService): ...  # Uses local filesystem for dev
```
- Validate content-type against allowlist before upload
- Compute SHA-256 checksum on upload
- Never overwrite — new versions get new blob paths
- Blob path pattern: `attachments/{activity_id}/{attachment_id}/{filename}`

#### 4.5 Search Service (`services/search_service.py`)

- Full-text search using Postgres `to_tsvector('english', ...)` and `ts_rank`
- Search across activities (title, summary, key_points), contacts (name, notes), organizations (name, notes)
- Support structured filters: tags, date range, activity_type, owner, organization, classification
- Return unified search results with entity type, snippet, and relevance score
- Respect classification gating in search results

#### 4.6 Export Service (`services/export_service.py`)

- Admin-only endpoint: `GET /api/export/{entity_type}/{entity_id}`
- Produces a ZIP containing: entity JSON, all versions, all attachments, audit trail
- For bulk export: `POST /api/export/bulk` with filters, returns ZIP

#### 4.7 API Endpoints (complete list)

**Health:** `GET /api/health`

**Users:**
- `GET /api/users/me` — current user profile
- `GET /api/users` — list users (ADMIN)
- `PATCH /api/users/{id}` — update role (ADMIN)

**Organizations:**
- `GET /api/organizations` — list with pagination, filtering
- `POST /api/organizations` — create
- `GET /api/organizations/{id}` — detail with contacts and recent activities
- `PATCH /api/organizations/{id}` — update
- `DELETE /api/organizations/{id}` — soft delete

**Contacts:**
- `GET /api/contacts` — list with pagination, filtering, tag filtering
- `POST /api/contacts` — create
- `GET /api/contacts/{id}` — detail with activities timeline, tags, followups
- `PATCH /api/contacts/{id}` — update
- `DELETE /api/contacts/{id}` — soft delete
- `POST /api/contacts/{id}/tags` — add tags
- `DELETE /api/contacts/{id}/tags/{tag_id}` — remove tag

**Activities:**
- `GET /api/activities` — list with pagination, date range, type filter, tag filter
- `POST /api/activities` — create (with attendees, tags inline)
- `GET /api/activities/{id}` — detail with attendees, attachments, followups, versions
- `PATCH /api/activities/{id}` — update (triggers version snapshot)
- `DELETE /api/activities/{id}` — soft delete
- `GET /api/activities/{id}/versions` — version history

**Attachments:**
- `POST /api/activities/{id}/attachments` — upload file(s)
- `GET /api/attachments/{id}/download` — download file
- `DELETE /api/attachments/{id}` — soft delete

**Follow-ups:**
- `GET /api/followups` — list all (with filters: assigned_to, status, due_date range)
- `POST /api/activities/{id}/followups` — create
- `PATCH /api/followups/{id}` — update status, details
- `GET /api/followups/my` — current user's assigned followups

**Tags:**
- `GET /api/tag-sets` — list all tag sets with their tags
- `POST /api/tag-sets` — create tag set (ADMIN)
- `POST /api/tag-sets/{id}/tags` — add tag to set (ADMIN)
- `PATCH /api/tags/{id}` — update/deactivate tag (ADMIN)

**Search:**
- `GET /api/search?q=...&type=...&tags=...&from=...&to=...` — unified search

**Audit:**
- `GET /api/audit` — query audit log (ADMIN) with filters

**Export:**
- `GET /api/export/{entity_type}/{entity_id}` — single record export (ADMIN)

Use pagination everywhere: `?page=1&page_size=25` pattern, return `{ items: [...], total: int, page: int, page_size: int }`.

---

### 5. FRONTEND IMPLEMENTATION DETAILS

#### 5.1 Auth Flow

- MSAL config with tenant ID and client ID from env vars (`NEXT_PUBLIC_AZURE_CLIENT_ID`, `NEXT_PUBLIC_AZURE_TENANT_ID`)
- Scopes: `api://{backend_client_id}/access_as_user` (configurable)
- `MsalProvider` wraps the entire app in root layout
- `AuthGuard` component redirects to login if not authenticated
- `useAuth` hook exposes: `user`, `isAuthenticated`, `getToken()`, `login()`, `logout()`
- `useApi` hook wraps fetch/axios to automatically attach Bearer token
- **Dev mode support:** When `NEXT_PUBLIC_DEV_MODE=true`, skip MSAL and use a mock auth context

#### 5.2 Layout

- Left sidebar navigation: Dashboard, Contacts, Organizations, Activities, Follow-ups, Search, Admin (if ADMIN role)
- Top header: user avatar/name, logout, global search bar
- Responsive but desktop-first (this is an internal tool)

#### 5.3 Key Pages

**Dashboard (`/`):**
- Recent activities (last 7 days)
- My open follow-ups (assigned to current user)
- Quick-create buttons: New Meeting, New Contact
- Stats: total contacts, activities this month, open followups

**Contacts List (`/contacts`):**
- Table view with columns: Name, Organization, Title, Tags, Last Activity, Owner
- Filter sidebar: by organization, tags (multi-select), owner
- Search box (client-side filter + server search)
- Click row → contact detail

**Contact Detail (`/contacts/[id]`):**
- Profile card: name, title, org, email, phone, classification badge, owner
- Tags section with add/remove capability
- Activity timeline: chronological list of all activities involving this contact
- Open follow-ups related to this contact's activities

**Organizations List & Detail:** Similar pattern to contacts.

**Activities List (`/activities`):**
- Timeline/list view with date grouping
- Filter: by type (MEETING, CALL, etc.), date range, tags, attendees
- Each card shows: title, date, type badge, attendee avatars, tag badges

**Activity Detail (`/activities/[id]`):**
- Full view: title, type, date, location, classification
- Summary and key points (rendered as rich text or markdown)
- Attendees list (linked to contact profiles)
- Attachments list with download links
- Follow-ups section with inline create/edit
- Version history accordion

**New Activity (`/activities/new`):**
- Form: title, type (dropdown), date/time, location, classification
- Summary: textarea (markdown support nice-to-have)
- Key points: textarea
- Attendee selector: search contacts, multi-select
- Tags: multi-select grouped by tag set
- Attachments: drag-and-drop upload zone
- Follow-ups: inline add (description, assignee, due date)
- Save creates activity + attendees + tags + attachments + followups in one POST

**Follow-ups (`/followups`):**
- "My Follow-ups" view (default, filtered to current user)
- "All Follow-ups" view (for managers)
- Kanban-style or list view grouped by status
- Quick status toggle (OPEN → IN_PROGRESS → COMPLETED)

**Search (`/search`):**
- Full-page search with query input
- Results grouped by entity type: Contacts, Organizations, Activities
- Each result shows snippet with highlighted matches
- Filter refinement: entity type, date range, tags

**Admin: Tags (`/admin/tags`):**
- Manage tag sets and their tags
- Create new tag sets, add/deactivate tags
- Shows usage count per tag

**Admin: Audit Log (`/admin/audit`):**
- Filterable table: user, action, entity type, date range
- Expandable rows showing details JSON

#### 5.4 Component Notes

- `TagSelector`: grouped dropdown by tag_set, multi-select, shows colored badges
- `AttendeeSelector`: search-as-you-type against contacts API, shows selected as chips
- `FileUpload`: drag-and-drop zone, validates file types client-side, shows upload progress
- `ActivityTimeline`: vertical timeline with date grouping, type icons, expandable summaries

---

### 6. DOCKER COMPOSE (dev environment)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: constellation
      POSTGRES_USER: constellation
      POSTGRES_PASSWORD: constellation_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U constellation"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

The `init.sql` should enable extensions: `CREATE EXTENSION IF NOT EXISTS "pg_trgm"; CREATE EXTENSION IF NOT EXISTS "unaccent"; CREATE EXTENSION IF NOT EXISTS "pgcrypto";`

---

### 7. ENVIRONMENT VARIABLES

Create `.env.example` with all vars documented:

```
# Database
DATABASE_URL=postgresql+asyncpg://constellation:constellation_dev@localhost:5432/constellation

# Azure AD / Entra
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-backend-client-id
AZURE_CLIENT_SECRET=optional-for-backend

# Dev mode (bypasses auth)
DEV_MODE=true
DEV_USER_EMAIL=dev@eastrock.com
DEV_USER_NAME=Dev User

# Blob Storage
BLOB_STORAGE_TYPE=local  # 'local' or 'azure'
BLOB_STORAGE_PATH=./uploads  # for local
AZURE_STORAGE_CONNECTION_STRING=  # for azure
AZURE_STORAGE_CONTAINER=constellation-attachments

# Frontend (prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AZURE_CLIENT_ID=your-frontend-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
NEXT_PUBLIC_DEV_MODE=true
```

---

### 8. SEED DATA (`scripts/seed.py`)

Create a seed script that populates:
- 3 users (admin, manager, analyst)
- 5 organizations (mix of types: asset manager, broker, consultant, corporate)
- 15 contacts spread across those orgs
- 3 tag sets (Sector, Strategy, Geography) with 5-8 tags each (e.g., Sector: Technology, Healthcare, Energy, Financials, Industrials)
- 10 activities (mix of MEETING, CALL, NOTE) with attendees, tags, and summaries
- 8 follow-ups (mix of statuses)
- Realistic but fictional data appropriate for an investment adviser context

---

### 9. COMPLIANCE REQUIREMENTS (build these in from the start)

1. **Never hard-delete records.** Add `is_deleted BOOLEAN DEFAULT FALSE` and `deleted_at TIMESTAMPTZ` to contacts, organizations, activities, attachments. Filter these out in all queries but preserve them in DB.
2. **Audit everything.** Every CUD operation logs to audit_log. READ logging for CONFIDENTIAL/RESTRICTED.
3. **Classification gating.** Every query that returns records must filter by the user's classification access level.
4. **7-year retention.** No cascading deletes. Soft-delete only. The export service is the compliance production mechanism.
5. **Attachment immutability.** Never overwrite blobs. New versions = new blob objects with parent_attachment_id chain.

---

### 10. IMPLEMENTATION ORDER

Build in this exact order to keep things working at each step:

1. **Docker Compose + database setup** — get Postgres running
2. **Backend skeleton** — FastAPI app, config, database connection, health endpoint
3. **SQLAlchemy models** — all models from section 3
4. **Alembic initial migration** — generate and apply
5. **Auth module** — JWT validation + dev mode bypass
6. **RBAC + dependencies** — role checking, classification gating
7. **Audit service** — logging helper
8. **CRUD routers** — users, organizations, contacts, tags (in that order)
9. **Activities router** — with attendees, versions, tags
10. **Attachments router** — with blob service (local implementation first)
11. **Follow-ups router** — with status management
12. **Search router** — full-text search
13. **Export router** — ZIP export
14. **Seed script** — populate dev data
15. **Frontend: Next.js scaffold** — layout, auth, routing
16. **Frontend: API layer** — fetch wrapper, types, hooks
17. **Frontend: Dashboard + nav** — sidebar, header, dashboard page
18. **Frontend: Contacts** — list, detail, create/edit forms
19. **Frontend: Organizations** — list, detail, create/edit forms
20. **Frontend: Activities** — list, detail, create form with all sub-entities
21. **Frontend: Follow-ups** — list, status management
22. **Frontend: Search** — search page with results
23. **Frontend: Admin pages** — tags management, audit log viewer

---

### 11. QUALITY REQUIREMENTS

- All backend endpoints must have proper error handling (HTTPException with meaningful messages)
- Use async/await throughout the backend
- Type hints everywhere in Python
- TypeScript strict mode in frontend
- Pagination on all list endpoints
- Loading states and error states in frontend components
- Form validation on both client and server
- CORS configured for local dev (allow localhost:3000)
- API prefix: all routes under `/api/`

---

### 12. DO NOT

- Do NOT use any ORM auto-migration or auto-create. Use Alembic explicitly.
- Do NOT store files in the database. Use blob storage (or local filesystem in dev).
- Do NOT implement email or Slack ingestion (that's Phase 2+).
- Do NOT implement the LLM query/Ask endpoint yet (just the LLM_INTERACTION activity type in the schema).
- Do NOT implement events module (Phase 2).
- Do NOT use any paid/premium UI component libraries. shadcn/ui + Tailwind only.
- Do NOT skip soft-delete. This is a compliance requirement.
- Do NOT skip audit logging. This is a compliance requirement.

---

Now build everything. Start with the backend, get it working with the seed data, then build the frontend. Make sure `docker compose up -d` → `alembic upgrade head` → `python scripts/seed.py` → `uvicorn app.main:app --reload` → `npm run dev` gives a fully working application.
