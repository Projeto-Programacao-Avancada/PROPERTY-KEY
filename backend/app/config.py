from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 720
    cors_origins: str = "http://localhost:5173"
    upload_dir: str = str(DEFAULT_UPLOAD_DIR)

    @field_validator("secret_key")
    @classmethod
    def _secret_long_enough(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY deve ter pelo menos 32 caracteres.")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def gallery_upload_path(self) -> Path:
        return Path(self.upload_dir).resolve() / "gallery"


settings = Settings()  # type: ignore[call-arg]
