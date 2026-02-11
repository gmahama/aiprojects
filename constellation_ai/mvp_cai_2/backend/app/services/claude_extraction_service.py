"""
Claude API-based meeting data extraction service.

Uses Claude to extract structured meeting information from document text
for pre-filling Activity creation forms.
"""

import json
import logging
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)


class ExtractedPerson(BaseModel):
    """A person extracted from a meeting document."""

    name: str
    organization: str | None = None
    title: str | None = None
    email: str | None = None


class ExtractedActivityData(BaseModel):
    """Structured data extracted from a meeting document."""

    title: str | None = None
    persons: list[ExtractedPerson] = Field(default_factory=list)
    organizations: list[str] = Field(default_factory=list)
    location: str | None = None
    occurred_at: str | None = None  # ISO 8601 format
    summary: str | None = None
    key_points: str | None = None
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


EXTRACTION_PROMPT = """You are an expert at extracting structured meeting information from documents.

Analyze the following document text and extract meeting-related information. Return a JSON object with the following structure:

{
  "title": "A concise title for the meeting (infer if not explicit)",
  "persons": [
    {
      "name": "Full name of the person",
      "organization": "Company or organization name if mentioned",
      "title": "Job title if mentioned",
      "email": "Email address if found"
    }
  ],
  "organizations": ["List of company/organization names mentioned"],
  "location": "Meeting venue, city, or location if mentioned",
  "occurred_at": "Date and time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS) if found",
  "summary": "A 2-4 sentence executive summary of the meeting",
  "key_points": "Bullet points of key takeaways (use markdown bullets)",
  "confidence_score": 0.0-1.0 indicating how confident you are in the extraction quality
}

Guidelines:
- Extract only information that is clearly present in the document
- For persons, include all attendees, participants, or people mentioned in context
- If a date is found but no time, use 09:00:00 as default
- If only a relative date (e.g., "last Tuesday") is found, do not include occurred_at
- For key_points, use "- " prefix for each bullet point
- Set confidence_score based on how clear and complete the meeting information is:
  - 0.8-1.0: Clear meeting notes with explicit attendees, date, and discussion points
  - 0.5-0.7: Some meeting context but missing key details
  - 0.2-0.4: Document appears to be about a meeting but limited extractable info
  - 0.0-0.2: Document may not be meeting-related

Return ONLY the JSON object, no additional text or markdown formatting.

Document text:
"""


class ClaudeExtractionService:
    """Service for extracting meeting data using Claude API."""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        """Lazy initialization of Anthropic client."""
        if self._client is None:
            import anthropic
            self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        return self._client

    async def extract_meeting_data(self, document_text: str) -> ExtractedActivityData:
        """
        Extract meeting information from document text using Claude.

        Args:
            document_text: The extracted text content from a document

        Returns:
            ExtractedActivityData with extracted meeting information

        Raises:
            ValueError: If Claude API key is not configured
            Exception: If Claude API call fails
        """
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")

        # Truncate very long documents to avoid token limits
        max_chars = 100000  # ~25k tokens approximately
        truncated_text = document_text[:max_chars]
        if len(document_text) > max_chars:
            truncated_text += "\n\n[Document truncated due to length...]"

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                messages=[
                    {
                        "role": "user",
                        "content": EXTRACTION_PROMPT + truncated_text
                    }
                ]
            )

            response_text = message.content[0].text
            logger.debug(f"Claude extraction response: {response_text[:500]}...")

            # Parse the JSON response
            extracted_data = self._parse_response(response_text)
            return extracted_data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            return ExtractedActivityData(confidence_score=0.0)
        except Exception as e:
            logger.error(f"Claude API call failed: {e}")
            raise

    def _parse_response(self, response_text: str) -> ExtractedActivityData:
        """Parse Claude's JSON response into ExtractedActivityData."""
        # Clean up response - remove any markdown code blocks if present
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            # Remove markdown code block
            lines = cleaned.split("\n")
            # Remove first line (```json or ```)
            lines = lines[1:]
            # Remove last line (```)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines)

        data: dict[str, Any] = json.loads(cleaned)

        # Parse persons
        persons = []
        for p in data.get("persons", []):
            if isinstance(p, dict) and p.get("name"):
                persons.append(ExtractedPerson(
                    name=p.get("name", ""),
                    organization=p.get("organization"),
                    title=p.get("title"),
                    email=p.get("email"),
                ))

        # Validate occurred_at if present
        occurred_at = data.get("occurred_at")
        if occurred_at:
            try:
                # Validate it's a valid ISO format
                datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
            except ValueError:
                logger.warning(f"Invalid occurred_at format: {occurred_at}")
                occurred_at = None

        return ExtractedActivityData(
            title=data.get("title"),
            persons=persons,
            organizations=data.get("organizations", []),
            location=data.get("location"),
            occurred_at=occurred_at,
            summary=data.get("summary"),
            key_points=data.get("key_points"),
            confidence_score=float(data.get("confidence_score", 0.5)),
        )


# Singleton instance
claude_extraction_service = ClaudeExtractionService()
