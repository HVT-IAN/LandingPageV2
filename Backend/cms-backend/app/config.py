from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./cms.db"
    secret_key: str = "dev-secret-change-me"
    cookie_secure: bool = False
    token_hours: int = 12

    admin_email: str = "admin@example.com"
    admin_password: str = "change-me-now"

    # Orígenes permitidos para la landing (separados por coma).
    # En producción agrega https://TU-USUARIO.github.io
    allowed_origins: str = "http://127.0.0.1:5500,http://localhost:5500"

    @property
    def cors_origins(self) -> list[str]:
        return [origen.strip() for origen in self.allowed_origins.split(",") if origen.strip()]

    # Solo lo usa scripts/migrate_to_postgres.py (no afecta a la app)
    target_database_url: str = ""

    @field_validator("database_url", "target_database_url")
    @classmethod
    def usar_driver_psycopg(cls, valor: str) -> str:
        """Acepta las URLs tal como las copia Neon (postgresql://...)."""
        valor = valor.strip()
        for prefijo in ("postgres://", "postgresql://"):
            if valor.startswith(prefijo):
                return "postgresql+psycopg://" + valor[len(prefijo):]
        return valor

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    mail_to: str = ""

    uploads_dir: Path = BASE_DIR / "uploads"
    max_upload_mb: int = 5
    # Carpetas opcionales que se sirven en producción
    landing_dir: Path = BASE_DIR / "landing"
    admin_dist_dir: Path = BASE_DIR / "admin-dist"


settings = Settings()
