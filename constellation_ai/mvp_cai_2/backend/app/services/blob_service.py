import os
import hashlib
import aiofiles
from abc import ABC, abstractmethod
from pathlib import Path
from uuid import UUID
from fastapi import UploadFile
from fastapi.responses import StreamingResponse

from app.config import settings


class BlobService(ABC):
    """Abstract base class for blob storage services."""

    @abstractmethod
    async def upload(self, file: UploadFile, path: str) -> tuple[str, str, int]:
        """
        Upload a file to blob storage.

        Args:
            file: The uploaded file
            path: The storage path

        Returns:
            Tuple of (blob_path, checksum, file_size)
        """
        pass

    @abstractmethod
    async def download(self, path: str) -> StreamingResponse:
        """
        Download a file from blob storage.

        Args:
            path: The blob path

        Returns:
            StreamingResponse with the file content
        """
        pass

    @abstractmethod
    async def delete(self, path: str) -> None:
        """
        Soft-delete a file (mark as deleted, don't actually remove).

        Args:
            path: The blob path
        """
        pass

    @staticmethod
    def generate_path(activity_id: UUID, attachment_id: UUID, filename: str) -> str:
        """Generate a blob path for an attachment."""
        return f"attachments/{activity_id}/{attachment_id}/{filename}"


class LocalBlobService(BlobService):
    """Local filesystem implementation for development."""

    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def upload(self, file: UploadFile, path: str) -> tuple[str, str, int]:
        full_path = self.base_path / path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Calculate checksum while writing
        sha256_hash = hashlib.sha256()
        file_size = 0

        async with aiofiles.open(full_path, "wb") as f:
            while chunk := await file.read(8192):
                sha256_hash.update(chunk)
                file_size += len(chunk)
                await f.write(chunk)

        checksum = sha256_hash.hexdigest()
        return path, checksum, file_size

    async def download(self, path: str) -> StreamingResponse:
        full_path = self.base_path / path

        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        async def file_iterator():
            async with aiofiles.open(full_path, "rb") as f:
                while chunk := await f.read(8192):
                    yield chunk

        filename = Path(path).name
        return StreamingResponse(
            file_iterator(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    async def delete(self, path: str) -> None:
        # Soft delete - just mark in metadata, don't actually delete
        # For local dev, we could create a .deleted marker file
        deleted_marker = self.base_path / f"{path}.deleted"
        deleted_marker.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(deleted_marker, "w") as f:
            await f.write("")


class AzureBlobService(BlobService):
    """Azure Blob Storage implementation."""

    def __init__(self, connection_string: str, container_name: str):
        from azure.storage.blob.aio import BlobServiceClient

        self.connection_string = connection_string
        self.container_name = container_name
        self._client: BlobServiceClient | None = None

    async def _get_client(self):
        if self._client is None:
            from azure.storage.blob.aio import BlobServiceClient

            self._client = BlobServiceClient.from_connection_string(self.connection_string)
        return self._client

    async def upload(self, file: UploadFile, path: str) -> tuple[str, str, int]:
        client = await self._get_client()
        container_client = client.get_container_client(self.container_name)

        # Read file content and calculate checksum
        content = await file.read()
        checksum = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        # Upload to Azure
        blob_client = container_client.get_blob_client(path)
        await blob_client.upload_blob(content, overwrite=False)

        return path, checksum, file_size

    async def download(self, path: str) -> StreamingResponse:
        client = await self._get_client()
        container_client = client.get_container_client(self.container_name)
        blob_client = container_client.get_blob_client(path)

        async def blob_iterator():
            download_stream = await blob_client.download_blob()
            async for chunk in download_stream.chunks():
                yield chunk

        filename = Path(path).name
        return StreamingResponse(
            blob_iterator(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    async def delete(self, path: str) -> None:
        # Soft delete via Azure's soft delete feature or custom metadata
        client = await self._get_client()
        container_client = client.get_container_client(self.container_name)
        blob_client = container_client.get_blob_client(path)

        # Set deleted metadata instead of actual deletion
        await blob_client.set_blob_metadata({"deleted": "true"})


def get_blob_service() -> BlobService:
    """Factory function to get the appropriate blob service based on config."""
    if settings.blob_storage_type == "azure":
        return AzureBlobService(
            connection_string=settings.azure_storage_connection_string,
            container_name=settings.azure_storage_container,
        )
    else:
        return LocalBlobService(base_path=settings.blob_storage_path)
