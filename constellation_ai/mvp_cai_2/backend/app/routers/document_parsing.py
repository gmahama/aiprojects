"""
Document parsing router for AI-powered meeting extraction.

Accepts PDF or DOCX uploads, extracts text, and uses Claude to
parse meeting information for pre-filling Activity forms.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.config import settings
from app.dependencies import CurrentUser
from app.services.document_service import get_extractor, is_supported_content_type
from app.services.claude_extraction_service import (
    claude_extraction_service,
    ExtractedActivityData,
    ExtractedPerson,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class DocumentParseResponse(BaseModel):
    """Response from document parsing endpoint."""

    success: bool
    data: ExtractedActivityData | None = None
    error: str | None = None


@router.post("/parse-document", response_model=DocumentParseResponse)
async def parse_document(
    current_user: CurrentUser,
    file: Annotated[UploadFile, File(description="PDF or DOCX file to parse")],
) -> DocumentParseResponse:
    """
    Parse a document (PDF or DOCX) and extract meeting information using AI.

    This endpoint:
    1. Validates the file type and size
    2. Extracts text from the document
    3. Sends the text to Claude for meeting data extraction
    4. Returns structured data for pre-filling the Activity form

    Supported file types:
    - PDF (.pdf)
    - Word documents (.docx)

    Maximum file size: 10MB
    """
    # Check if feature is enabled
    if not settings.document_parsing_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document parsing feature is not enabled",
        )

    # Check if Claude API key is configured
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI extraction service is not configured",
        )

    # Validate content type
    content_type = file.content_type or ""
    if not is_supported_content_type(content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Supported types are PDF and DOCX.",
        )

    # Validate file size
    # Read file content to check size
    content = await file.read()
    file_size = len(content)
    await file.seek(0)  # Reset for extractor

    if file_size > settings.document_max_size_bytes:
        max_mb = settings.document_max_size_bytes / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {max_mb:.0f}MB.",
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty.",
        )

    # Get appropriate extractor
    extractor = get_extractor(content_type)
    if not extractor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No extractor available for content type: {content_type}",
        )

    try:
        # Extract text from document
        logger.info(f"Extracting text from {file.filename} ({content_type})")
        document_text = await extractor.extract_text(file)

        if not document_text or len(document_text.strip()) < 50:
            return DocumentParseResponse(
                success=False,
                error="Could not extract meaningful text from the document. The file may be image-based or corrupted.",
            )

        logger.info(f"Extracted {len(document_text)} characters from document")

        # Extract meeting data using Claude
        logger.info("Sending document text to Claude for extraction")
        extracted_data = await claude_extraction_service.extract_meeting_data(document_text)

        logger.info(f"Extraction complete with confidence: {extracted_data.confidence_score}")

        return DocumentParseResponse(
            success=True,
            data=extracted_data,
        )

    except ValueError as e:
        # Configuration errors
        logger.error(f"Configuration error during document parsing: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        # Log unexpected errors
        logger.exception(f"Error parsing document: {e}")
        return DocumentParseResponse(
            success=False,
            error="An error occurred while processing the document. Please try again.",
        )
