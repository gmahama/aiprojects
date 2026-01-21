# Claude.md — Project Instructions

## Project Overview
This project is an MVP internal CRM / knowledge system focused on **people**, **meetings**, and **contextual memory**.

Core goals:
- Maintain structured profiles for people (investors, founders, operators, etc.)
- Log recent meetings and notes tied back to those people
- Support fast retrieval via global search and tags
- Stay simple, auditable, and extensible

This is **not** a generic CRM. Optimize for speed, clarity, and analytical usefulness.

---

## MVP Scope (Strict)
Only build what is explicitly listed below.

### Core Objects
1. **Person**
   - Name
   - Organization / affiliation
   - Role / title
   - Contact info (lightweight)
   - Notes (freeform)
   - Tags (freeform, many-to-many)

2. **Meeting**
   - Date & time
   - Participants (linked to Person)
   - Notes (freeform, markdown-friendly)
   - Tags (freeform)
   - Optional: location / medium (in-person, call, email)

### Constraints
- Only **recent meetings** (no long-term archival logic)
- No workflows, reminders, tasks, or follow-ups
- No permissions, roles, or multi-user logic
- No external data ingestion in MVP

---

## UX Principles
- Bias toward **fast capture** over perfect structure
- Everything searchable
- Minimal clicks to:
  - Find a person
  - See recent meetings
  - Add a new meeting
- Avoid "CRM-y" complexity

---

## Search & Retrieval
- One **global search** across:
  - People
  - Meeting notes
  - Tags
- Search should feel forgiving (substring / fuzzy is fine)
- Tags are user-defined strings, not enums

---

## Data Model Guidance
- Use simple relational modeling
- Favor clarity over cleverness
- Explicit join tables (e.g., person_meetings, entity_tags)

Do **not** introduce:
- Polymorphic models
- Event sourcing
- Premature optimization
- Over-normalized schemas

---

## Tech Assumptions (Adjust Only If Necessary)
Unless explicitly told otherwise:
- Backend: simple API (REST or lightweight RPC)
- DB: relational (Postgres or SQLite acceptable for MVP)
- Frontend: basic CRUD views, no heavy state machines

---

## Coding Standards
- Small, readable functions
- Explicit naming > brevity
- Prefer boring, proven patterns
- Leave TODOs where scope is intentionally deferred

When unsure:
- Choose the simplest implementation
- Document the assumption inline
- Do not invent features

---

## Out of Scope (Do Not Build)
- AI summarization
- Automatic entity extraction
- Email / calendar sync
- Permissions, sharing, or collaboration
- Analytics dashboards
- Mobile optimization

---

## How to Work on This Repo
- Treat each task as incremental and mergeable
- Avoid large refactors unless explicitly requested
- If adding a dependency, justify it briefly in comments
- If something feels ambiguous, implement the narrowest interpretation

---

## North Star
At any point, ask:
> "Does this help me quickly remember who someone is and what we discussed recently?"

If not, don't build it.
