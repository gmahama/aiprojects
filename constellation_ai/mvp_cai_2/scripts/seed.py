#!/usr/bin/env python3
"""
Seed script for Constellation AI development database.

Creates sample users, organizations, contacts, tags, activities, and followups.
Run with: python scripts/seed.py
"""

import asyncio
import sys
from datetime import datetime, timedelta, date
from uuid import uuid4

# Add backend to path
sys.path.insert(0, "backend")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import settings
from app.models.user import User, UserRole
from app.models.organization import Organization, OrgType, Classification
from app.models.contact import Contact
from app.models.tag import TagSet, Tag, ContactTag, OrganizationTag, ActivityTag
from app.models.activity import Activity, ActivityType, ActivityAttendee
from app.models.followup import FollowUp, FollowUpStatus


async def seed_database():
    """Seed the database with sample data."""
    engine = create_async_engine(settings.database_url)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("Seeding database...")

        # Create users
        print("  Creating users...")
        users = [
            User(
                id=uuid4(),
                email="admin@eastrock.com",
                display_name="Admin User",
                role=UserRole.ADMIN,
                is_active=True,
            ),
            User(
                id=uuid4(),
                email="manager@eastrock.com",
                display_name="Sarah Manager",
                role=UserRole.MANAGER,
                is_active=True,
            ),
            User(
                id=uuid4(),
                email="analyst@eastrock.com",
                display_name="John Analyst",
                role=UserRole.ANALYST,
                is_active=True,
            ),
            User(
                id=uuid4(),
                email="dev@eastrock.com",
                display_name="Dev User",
                role=UserRole.ADMIN,
                is_active=True,
            ),
        ]
        for user in users:
            db.add(user)
        await db.flush()

        admin = users[0]
        manager = users[1]
        analyst = users[2]

        # Create tag sets and tags
        print("  Creating tag sets and tags...")
        tag_sets_data = [
            ("Sector", "Industry sector classification", [
                "Technology", "Healthcare", "Energy", "Financials", "Industrials",
                "Consumer Discretionary", "Materials", "Real Estate"
            ]),
            ("Strategy", "Investment strategy focus", [
                "Growth", "Value", "Income", "Momentum", "Quality", "Multi-Strategy"
            ]),
            ("Geography", "Geographic focus", [
                "North America", "Europe", "Asia Pacific", "Emerging Markets",
                "Global", "Latin America"
            ]),
            ("Relationship Type", "Type of relationship", [
                "Prospect", "Client", "Former Client", "Partner", "Vendor", "Competitor"
            ]),
        ]

        all_tags = {}
        for set_name, description, tag_values in tag_sets_data:
            tag_set = TagSet(
                id=uuid4(),
                name=set_name,
                description=description,
            )
            db.add(tag_set)
            await db.flush()

            for value in tag_values:
                tag = Tag(
                    id=uuid4(),
                    tag_set_id=tag_set.id,
                    value=value,
                )
                db.add(tag)
                all_tags[f"{set_name}:{value}"] = tag

        await db.flush()

        # Create organizations
        print("  Creating organizations...")
        organizations = [
            Organization(
                id=uuid4(),
                name="Blackstone Capital Partners",
                short_name="Blackstone",
                org_type=OrgType.ASSET_MANAGER,
                website="https://www.blackstone.com",
                notes="Large alternative asset manager with focus on private equity.",
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=admin.id,
            ),
            Organization(
                id=uuid4(),
                name="Goldman Sachs Asset Management",
                short_name="GSAM",
                org_type=OrgType.ASSET_MANAGER,
                website="https://www.gsam.com",
                notes="Global investment manager with diverse product offerings.",
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=admin.id,
            ),
            Organization(
                id=uuid4(),
                name="Morgan Stanley Wealth Management",
                short_name="MS Wealth",
                org_type=OrgType.BROKER,
                website="https://www.morganstanley.com",
                notes="Major wealth management and brokerage firm.",
                classification=Classification.CONFIDENTIAL,
                owner_id=analyst.id,
                created_by=admin.id,
            ),
            Organization(
                id=uuid4(),
                name="Cambridge Associates",
                short_name="Cambridge",
                org_type=OrgType.CONSULTANT,
                website="https://www.cambridgeassociates.com",
                notes="Investment consulting firm for institutional investors.",
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=admin.id,
            ),
            Organization(
                id=uuid4(),
                name="Acme Corporation",
                short_name="Acme",
                org_type=OrgType.CORPORATE,
                website="https://www.acme.com",
                notes="Diversified industrial company with pension fund.",
                classification=Classification.INTERNAL,
                owner_id=analyst.id,
                created_by=admin.id,
            ),
        ]
        for org in organizations:
            db.add(org)
        await db.flush()

        # Add tags to organizations
        org_tags = [
            (organizations[0], ["Sector:Financials", "Strategy:Multi-Strategy", "Geography:Global", "Relationship Type:Client"]),
            (organizations[1], ["Sector:Financials", "Strategy:Growth", "Geography:North America", "Relationship Type:Prospect"]),
            (organizations[2], ["Sector:Financials", "Geography:North America", "Relationship Type:Partner"]),
            (organizations[3], ["Geography:Global", "Relationship Type:Vendor"]),
            (organizations[4], ["Sector:Industrials", "Geography:North America", "Relationship Type:Prospect"]),
        ]
        for org, tag_keys in org_tags:
            for key in tag_keys:
                tag = all_tags.get(key)
                if tag:
                    org_tag = OrganizationTag(
                        organization_id=org.id,
                        tag_id=tag.id,
                        tagged_by=admin.id,
                    )
                    db.add(org_tag)

        await db.flush()

        # Create contacts
        print("  Creating contacts...")
        contacts = [
            Contact(
                id=uuid4(),
                first_name="Michael",
                last_name="Chen",
                email="mchen@blackstone.com",
                phone="+1-212-555-0101",
                title="Managing Director, Investor Relations",
                organization_id=organizations[0].id,
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                notes="Primary contact for LP relations. Met at industry conference 2023.",
                created_by=admin.id,
            ),
            Contact(
                id=uuid4(),
                first_name="Jennifer",
                last_name="Williams",
                email="jwilliams@blackstone.com",
                phone="+1-212-555-0102",
                title="Vice President, Business Development",
                organization_id=organizations[0].id,
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=admin.id,
            ),
            Contact(
                id=uuid4(),
                first_name="David",
                last_name="Park",
                email="dpark@gsam.com",
                phone="+1-212-555-0201",
                title="Partner, Institutional Sales",
                organization_id=organizations[1].id,
                classification=Classification.INTERNAL,
                owner_id=analyst.id,
                notes="Key decision maker for alternative investments allocation.",
                created_by=admin.id,
            ),
            Contact(
                id=uuid4(),
                first_name="Amanda",
                last_name="Torres",
                email="atorres@morganstanley.com",
                phone="+1-212-555-0301",
                title="Executive Director",
                organization_id=organizations[2].id,
                classification=Classification.CONFIDENTIAL,
                owner_id=analyst.id,
                created_by=admin.id,
            ),
            Contact(
                id=uuid4(),
                first_name="Robert",
                last_name="Anderson",
                email="randerson@cambridge.com",
                phone="+1-617-555-0401",
                title="Senior Consultant",
                organization_id=organizations[3].id,
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                notes="Specializes in private equity and hedge fund manager selection.",
                created_by=admin.id,
            ),
            Contact(
                id=uuid4(),
                first_name="Lisa",
                last_name="Martinez",
                email="lmartinez@cambridge.com",
                phone="+1-617-555-0402",
                title="Research Analyst",
                organization_id=organizations[3].id,
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=admin.id,
            ),
            Contact(
                id=uuid4(),
                first_name="James",
                last_name="Thompson",
                email="jthompson@acme.com",
                phone="+1-312-555-0501",
                title="Chief Investment Officer",
                organization_id=organizations[4].id,
                classification=Classification.INTERNAL,
                owner_id=analyst.id,
                notes="Oversees $5B pension fund. Interested in alternative strategies.",
                created_by=admin.id,
            ),
            Contact(
                id=uuid4(),
                first_name="Emily",
                last_name="Rodriguez",
                email="erodriguez@acme.com",
                phone="+1-312-555-0502",
                title="Portfolio Manager",
                organization_id=organizations[4].id,
                classification=Classification.INTERNAL,
                owner_id=analyst.id,
                created_by=admin.id,
            ),
            # Independent contacts
            Contact(
                id=uuid4(),
                first_name="William",
                last_name="Davis",
                email="wdavis@independent.com",
                phone="+1-415-555-0601",
                title="Independent Consultant",
                organization_id=None,
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                notes="Former CIO at major endowment. Now advises on manager selection.",
                created_by=admin.id,
            ),
            Contact(
                id=uuid4(),
                first_name="Sarah",
                last_name="Johnson",
                email="sjohnson@familyoffice.com",
                phone="+1-305-555-0701",
                title="Principal",
                organization_id=None,
                classification=Classification.CONFIDENTIAL,
                owner_id=manager.id,
                notes="Family office principal with $500M in investable assets.",
                created_by=admin.id,
            ),
        ]
        for contact in contacts:
            db.add(contact)
        await db.flush()

        # Add tags to contacts
        contact_tags = [
            (contacts[0], ["Sector:Financials", "Strategy:Multi-Strategy"]),
            (contacts[2], ["Sector:Financials", "Strategy:Growth"]),
            (contacts[4], ["Geography:Global"]),
            (contacts[6], ["Sector:Industrials", "Strategy:Multi-Strategy"]),
            (contacts[8], ["Geography:North America"]),
        ]
        for contact, tag_keys in contact_tags:
            for key in tag_keys:
                tag = all_tags.get(key)
                if tag:
                    contact_tag = ContactTag(
                        contact_id=contact.id,
                        tag_id=tag.id,
                        tagged_by=admin.id,
                    )
                    db.add(contact_tag)

        await db.flush()

        # Create activities
        print("  Creating activities...")
        now = datetime.utcnow()
        activities = [
            Activity(
                id=uuid4(),
                activity_type=ActivityType.MEETING,
                title="Q4 Portfolio Review with Blackstone",
                description="Quarterly portfolio review and outlook discussion.",
                occurred_at=now - timedelta(days=30),
                location="Blackstone NYC Office",
                summary="Discussed Q4 performance and 2024 outlook. Portfolio up 12% YTD. Exploring co-investment opportunities in real estate.",
                key_points="- Strong Q4 performance\n- Real estate co-investment opportunity\n- Follow up on European fund launch",
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=manager.id,
            ),
            Activity(
                id=uuid4(),
                activity_type=ActivityType.CALL,
                title="Introduction call with GSAM",
                description="Initial call to discuss potential partnership.",
                occurred_at=now - timedelta(days=20),
                location=None,
                summary="Introductory call with David Park. GSAM looking to expand alternatives allocation. Interested in our growth equity strategy.",
                key_points="- Looking for growth equity exposure\n- $200M potential allocation\n- Send DDQ and track record",
                classification=Classification.INTERNAL,
                owner_id=analyst.id,
                created_by=analyst.id,
            ),
            Activity(
                id=uuid4(),
                activity_type=ActivityType.MEETING,
                title="Industry Conference - Private Equity Forum",
                description="Met several prospects at the PE Forum conference.",
                occurred_at=now - timedelta(days=15),
                location="Four Seasons, Boston",
                summary="Productive conference. Met with Cambridge Associates team and several family offices. Good interest in our new fund.",
                key_points="- Cambridge may include us in recommendations\n- Three new family office leads\n- Follow up with all contacts within 2 weeks",
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=manager.id,
            ),
            Activity(
                id=uuid4(),
                activity_type=ActivityType.NOTE,
                title="Research note on Acme pension fund",
                description="Internal research on potential prospect.",
                occurred_at=now - timedelta(days=10),
                location=None,
                summary="Acme pension fund has $5B AUM with 15% allocation to alternatives. Current manager lineup includes several competitors. CIO James Thompson has been vocal about increasing alternatives allocation.",
                key_points="- $5B AUM, 15% alternatives\n- Looking to increase alternatives to 20%\n- Key competitors already in portfolio",
                classification=Classification.INTERNAL,
                owner_id=analyst.id,
                created_by=analyst.id,
            ),
            Activity(
                id=uuid4(),
                activity_type=ActivityType.CALL,
                title="Follow-up with Cambridge Associates",
                description="Follow-up from conference meeting.",
                occurred_at=now - timedelta(days=7),
                location=None,
                summary="Called Robert Anderson to follow up from conference. They are updating their manager recommendations for Q1. Requested updated materials.",
                key_points="- Q1 recommendation update underway\n- Sent updated DDQ and performance\n- Scheduled on-site meeting",
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=manager.id,
            ),
            Activity(
                id=uuid4(),
                activity_type=ActivityType.EMAIL,
                title="DDQ submission to Morgan Stanley",
                description="Submitted DDQ for inclusion in their platform.",
                occurred_at=now - timedelta(days=5),
                location=None,
                summary="Submitted completed DDQ to Amanda Torres for Morgan Stanley's alternative investments platform review.",
                key_points="- DDQ submitted\n- Review period 4-6 weeks\n- May request on-site due diligence",
                classification=Classification.CONFIDENTIAL,
                owner_id=analyst.id,
                created_by=analyst.id,
            ),
            Activity(
                id=uuid4(),
                activity_type=ActivityType.MEETING,
                title="Lunch with William Davis",
                description="Networking lunch with former endowment CIO.",
                occurred_at=now - timedelta(days=3),
                location="The Capital Grille, NYC",
                summary="William provided valuable market intelligence. He's advising two family offices that may be good prospects. Offered to make introductions.",
                key_points="- Two warm family office introductions\n- Market color on competitor positioning\n- Follow up in 2 weeks",
                classification=Classification.INTERNAL,
                owner_id=manager.id,
                created_by=manager.id,
            ),
            Activity(
                id=uuid4(),
                activity_type=ActivityType.CALL,
                title="Acme CIO initial conversation",
                description="First call with James Thompson at Acme.",
                occurred_at=now - timedelta(days=1),
                location=None,
                summary="Good initial call with James. He's reviewing their alternatives allocation and looking for new managers. Interested in our growth equity track record.",
                key_points="- Reviewing alternatives allocation\n- RFP expected Q2\n- Send overview materials",
                classification=Classification.INTERNAL,
                owner_id=analyst.id,
                created_by=analyst.id,
            ),
        ]
        for activity in activities:
            db.add(activity)
        await db.flush()

        # Add attendees to activities
        activity_attendees = [
            (activities[0], [contacts[0], contacts[1]]),  # Blackstone meeting
            (activities[1], [contacts[2]]),  # GSAM call
            (activities[2], [contacts[4], contacts[5]]),  # Conference
            (activities[4], [contacts[4]]),  # Cambridge follow-up
            (activities[5], [contacts[3]]),  # MS DDQ
            (activities[6], [contacts[8]]),  # William Davis lunch
            (activities[7], [contacts[6]]),  # Acme call
        ]
        for activity, attendees in activity_attendees:
            for contact in attendees:
                attendee = ActivityAttendee(
                    activity_id=activity.id,
                    contact_id=contact.id,
                    role="ATTENDEE",
                )
                db.add(attendee)

        # Add tags to activities
        activity_tags_data = [
            (activities[0], ["Sector:Financials", "Strategy:Multi-Strategy"]),
            (activities[1], ["Sector:Financials", "Strategy:Growth"]),
            (activities[2], ["Geography:North America"]),
            (activities[3], ["Sector:Industrials"]),
            (activities[7], ["Sector:Industrials", "Strategy:Growth"]),
        ]
        for activity, tag_keys in activity_tags_data:
            for key in tag_keys:
                tag = all_tags.get(key)
                if tag:
                    activity_tag = ActivityTag(
                        activity_id=activity.id,
                        tag_id=tag.id,
                        tagged_by=admin.id,
                    )
                    db.add(activity_tag)

        await db.flush()

        # Create follow-ups
        print("  Creating follow-ups...")
        followups = [
            FollowUp(
                id=uuid4(),
                activity_id=activities[0].id,
                description="Send real estate co-investment term sheet",
                assigned_to=manager.id,
                due_date=date.today() + timedelta(days=7),
                status=FollowUpStatus.IN_PROGRESS,
                created_by=manager.id,
            ),
            FollowUp(
                id=uuid4(),
                activity_id=activities[1].id,
                description="Send DDQ and 5-year track record to David Park",
                assigned_to=analyst.id,
                due_date=date.today() + timedelta(days=3),
                status=FollowUpStatus.COMPLETED,
                completed_at=now - timedelta(days=15),
                created_by=analyst.id,
            ),
            FollowUp(
                id=uuid4(),
                activity_id=activities[2].id,
                description="Follow up with conference contacts",
                assigned_to=manager.id,
                due_date=date.today() - timedelta(days=2),
                status=FollowUpStatus.OPEN,
                created_by=manager.id,
            ),
            FollowUp(
                id=uuid4(),
                activity_id=activities[4].id,
                description="Schedule on-site meeting at Cambridge",
                assigned_to=manager.id,
                due_date=date.today() + timedelta(days=14),
                status=FollowUpStatus.OPEN,
                created_by=manager.id,
            ),
            FollowUp(
                id=uuid4(),
                activity_id=activities[5].id,
                description="Check on DDQ review status",
                assigned_to=analyst.id,
                due_date=date.today() + timedelta(days=21),
                status=FollowUpStatus.OPEN,
                created_by=analyst.id,
            ),
            FollowUp(
                id=uuid4(),
                activity_id=activities[6].id,
                description="Request family office introductions from William",
                assigned_to=manager.id,
                due_date=date.today() + timedelta(days=10),
                status=FollowUpStatus.OPEN,
                created_by=manager.id,
            ),
            FollowUp(
                id=uuid4(),
                activity_id=activities[7].id,
                description="Send Acme overview materials",
                assigned_to=analyst.id,
                due_date=date.today() + timedelta(days=2),
                status=FollowUpStatus.IN_PROGRESS,
                created_by=analyst.id,
            ),
            FollowUp(
                id=uuid4(),
                activity_id=activities[7].id,
                description="Schedule follow-up call with James Thompson",
                assigned_to=analyst.id,
                due_date=date.today() + timedelta(days=14),
                status=FollowUpStatus.OPEN,
                created_by=analyst.id,
            ),
        ]
        for followup in followups:
            db.add(followup)

        await db.commit()
        print("Database seeded successfully!")
        print(f"  - {len(users)} users")
        print(f"  - {len(tag_sets_data)} tag sets with tags")
        print(f"  - {len(organizations)} organizations")
        print(f"  - {len(contacts)} contacts")
        print(f"  - {len(activities)} activities")
        print(f"  - {len(followups)} follow-ups")


if __name__ == "__main__":
    asyncio.run(seed_database())
