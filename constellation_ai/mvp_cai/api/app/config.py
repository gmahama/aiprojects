from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://crm_user:crm_password@localhost:5432/crm_db"
    app_name: str = "CRM API"

    class Config:
        env_file = ".env"


settings = Settings()
