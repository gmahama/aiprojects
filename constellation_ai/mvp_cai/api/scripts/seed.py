#!/usr/bin/env python3
"""
Seed script to populate the database with sample People and Meetings data.

Usage:
    python -m scripts.seed

Idempotency:
    This script checks for existing data by email before inserting.
    Running multiple times will skip existing records and only add missing ones.
"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import Base, Meeting, MeetingAttendee, Person


def get_or_create_person(db: Session, email: str, **kwargs) -> tuple[Person, bool]:
    """
    Get existing person by email or create new one.
    Returns (person, created) tuple.
    """
    existing = db.query(Person).filter(Person.primary_email == email).first()
    if existing:
        return existing, False

    person = Person(primary_email=email, **kwargs)
    db.add(person)
    db.flush()
    return person, True


def seed_people(db: Session) -> list[Person]:
    """Create sample people records."""
    people_data = [
        {
            "first_name": "Sarah",
            "last_name": "Chen",
            "primary_email": "sarah.chen@techcorp.io",
            "employer": "TechCorp",
            "title": "VP of Engineering",
            "notes": "Met at SaaStr conference. Interested in our API platform.",
            "tags": ["enterprise", "technical-buyer", "saas"],
        },
        {
            "first_name": "Marcus",
            "last_name": "Williams",
            "primary_email": "marcus.w@startupventures.com",
            "employer": "Startup Ventures",
            "title": "Partner",
            "notes": "Investor focused on B2B SaaS. Portfolio includes 3 unicorns.",
            "tags": ["investor", "b2b", "warm-lead"],
        },
        {
            "first_name": "Elena",
            "last_name": "Rodriguez",
            "primary_email": "elena.rodriguez@globalbank.com",
            "employer": "Global Bank",
            "title": "Chief Digital Officer",
            "notes": "Leading digital transformation initiative. Budget approved for Q2.",
            "tags": ["enterprise", "finance", "decision-maker"],
        },
        {
            "first_name": "James",
            "last_name": "Okonkwo",
            "primary_email": "j.okonkwo@acmeconsulting.net",
            "employer": "Acme Consulting",
            "title": "Senior Consultant",
            "notes": "Implementation partner. Has deployed our solution at 5 clients.",
            "tags": ["partner", "consultant", "referral-source"],
        },
        {
            "first_name": "Priya",
            "last_name": "Sharma",
            "primary_email": "priya@foundersclub.org",
            "employer": "Founders Club",
            "title": "Community Director",
            "notes": "Organizes monthly founder dinners. Good for introductions.",
            "tags": ["connector", "community", "networking"],
        },
    ]

    people = []
    for data in people_data:
        person, created = get_or_create_person(db, data["primary_email"], **{
            k: v for k, v in data.items() if k != "primary_email"
        })
        status = "created" if created else "exists"
        print(f"  [{status}] {person.first_name} {person.last_name}")
        people.append(person)

    return people


def seed_meetings(db: Session, people: list[Person]) -> list[Meeting]:
    """Create sample meetings with attendees."""
    now = datetime.now(timezone.utc)

    meetings_data = [
        {
            "occurred_at": now - timedelta(days=14),
            "type": "coffee",
            "location": "Blue Bottle Coffee, SOMA",
            "agenda": "Initial introduction and discovery call",
            "notes": "Sarah is evaluating platforms for their new microservices architecture. "
                     "Key requirements: API gateway, rate limiting, analytics dashboard.",
            "next_steps": "Send technical whitepaper. Schedule demo with her team.",
            "attendees": [
                {"person": people[0], "role": "prospect"},  # Sarah
            ],
        },
        {
            "occurred_at": now - timedelta(days=7),
            "type": "zoom",
            "location": None,
            "agenda": "Q1 portfolio review and market discussion",
            "notes": "Marcus shared insights on current funding environment. "
                     "Mentioned 2 portfolio companies that might be good prospects.",
            "next_steps": "Send intro email to portfolio companies. Follow up next month.",
            "attendees": [
                {"person": people[1], "role": "organizer"},  # Marcus
                {"person": people[4], "role": "attendee"},   # Priya
            ],
        },
        {
            "occurred_at": now - timedelta(days=2),
            "type": "in-person",
            "location": "Global Bank HQ, Conference Room 4B",
            "agenda": "Technical deep-dive and security review",
            "notes": "Presented architecture to Elena's security and engineering teams. "
                     "They need SOC2 Type II certification (we have it). "
                     "Positive reception overall. James joined to share implementation experience.",
            "next_steps": "Send SOC2 report. Prepare pricing proposal for 10K seats.",
            "attendees": [
                {"person": people[2], "role": "organizer"},  # Elena
                {"person": people[3], "role": "attendee"},   # James
            ],
        },
    ]

    meetings = []
    for data in meetings_data:
        # Check if a meeting with same type and occurred_at exists
        existing = db.query(Meeting).filter(
            Meeting.type == data["type"],
            Meeting.occurred_at == data["occurred_at"],
        ).first()

        if existing:
            print(f"  [exists] {data['type']} on {data['occurred_at'].date()}")
            meetings.append(existing)
            continue

        attendees_data = data.pop("attendees")
        meeting = Meeting(**data)
        db.add(meeting)
        db.flush()

        for attendee_info in attendees_data:
            attendee = MeetingAttendee(
                meeting_id=meeting.id,
                person_id=attendee_info["person"].id,
                role=attendee_info["role"],
            )
            db.add(attendee)

        print(f"  [created] {meeting.type} on {meeting.occurred_at.date()} "
              f"with {len(attendees_data)} attendee(s)")
        meetings.append(meeting)

    return meetings


def main():
    """Run the seed script."""
    print("=" * 50)
    print("CRM Database Seed Script")
    print("=" * 50)

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("\nSeeding people...")
        people = seed_people(db)

        print("\nSeeding meetings...")
        seed_meetings(db, people)

        db.commit()
        print("\n" + "=" * 50)
        print("Seed completed successfully!")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"\nError during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
