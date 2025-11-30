from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Manages application settings and environment variables."""
    FIREBASE_AUTH_EMULATOR_HOST: str | None = None
    FIREBASE_PROJECT_ID: str = "your-gcp-project-id"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

def get_settings() -> Settings:
    """Returns the application settings."""
    return Settings()
