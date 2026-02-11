from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://constellation:constellation_dev@localhost:5432/constellation"

    # Azure AD / Entra
    azure_tenant_id: str = "your-tenant-id"
    azure_client_id: str = "your-backend-client-id"
    azure_client_secret: str = ""

    # Dev mode (bypasses auth)
    dev_mode: bool = True
    dev_user_email: str = "dev@eastrock.com"
    dev_user_name: str = "Dev User"

    # Blob Storage
    blob_storage_type: Literal["local", "azure"] = "local"
    blob_storage_path: str = "./uploads"
    azure_storage_connection_string: str = ""
    azure_storage_container: str = "constellation-attachments"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Document Parsing / Claude API
    anthropic_api_key: str = ""
    document_parsing_enabled: bool = True
    document_max_size_bytes: int = 10 * 1024 * 1024  # 10 MB

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
