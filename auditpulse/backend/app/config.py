"""
AuditPulse Configuration
Reads settings from environment variables / .env file
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os


class Settings(BaseSettings):
    # App
    app_name: str = "AuditPulse"
    app_version: str = "1.0.0"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_secret_key: str = "dev-secret-key-change-in-production"

    # Database (SQLite default for zero-config local run, or PostgreSQL via .env)
    database_url: str = (
        "sqlite+aiosqlite:////tmp/auditpulse.db"
        if os.getenv("VERCEL")
        else "sqlite+aiosqlite:///./auditpulse.db"
    )
    database_sync_url: str = (
        "sqlite:////tmp/auditpulse.db"
        if os.getenv("VERCEL")
        else "sqlite:///./auditpulse.db"
    )

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # AI Provider
    ai_provider: str = "mock"  # openai | anthropic | google | mock
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"
    google_api_key: str = ""
    google_model: str = "gemini-1.5-pro"

    # File Upload
    max_upload_size_mb: int = 10
    allowed_policy_extensions: str = ".txt,.md,.pdf"
    allowed_code_extensions: str = ".js,.ts,.jsx,.tsx,.py,.java,.go"

    # GitHub
    github_webhook_secret: str = ""
    github_token: str = ""

    # Vendor Monitoring
    vendor_check_interval_hours: int = 24
    playwright_headless: bool = True

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def allowed_policy_ext_list(self) -> List[str]:
        return [e.strip() for e in self.allowed_policy_extensions.split(",")]

    @property
    def allowed_code_ext_list(self) -> List[str]:
        return [e.strip() for e in self.allowed_code_extensions.split(",")]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    # Resolve .env in backend dir, auditpulse dir, or workspace root
    _backend_dir = Path(__file__).resolve().parent.parent
    _env_candidates = (
        ".env",
        str(_backend_dir / ".env"),
        str(_backend_dir.parent / ".env"),
        str(_backend_dir.parent.parent / ".env"),
    )

    model_config = SettingsConfigDict(
        env_file=_env_candidates,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
