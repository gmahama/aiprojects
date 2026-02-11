from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    health,
    users,
    organizations,
    contacts,
    activities,
    attachments,
    tags,
    followups,
    search,
    audit,
    export,
    events,
    document_parsing,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="Constellation AI",
    description="Internal CRM and knowledge platform for East Rock",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["Organizations"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["Contacts"])
app.include_router(activities.router, prefix="/api/activities", tags=["Activities"])
app.include_router(attachments.router, prefix="/api/attachments", tags=["Attachments"])
app.include_router(tags.router, prefix="/api", tags=["Tags"])
app.include_router(followups.router, prefix="/api/followups", tags=["Follow-ups"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(document_parsing.router, prefix="/api", tags=["Document Parsing"])
