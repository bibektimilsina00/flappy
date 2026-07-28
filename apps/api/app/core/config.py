from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All values come from the environment (.env at the repo root)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    database_url: str = ""
    redis_url: str = ""
    secret_key: str = ""
    access_token_expire_minutes: int = 1440

    # Storage
    s3_endpoint: str = ""
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""

    # URLs
    api_base_url: str = ""
    frontend_url: str = ""

    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    discord_client_id: str = ""
    discord_client_secret: str = ""

    # Generation provider keys
    gemini_api_key: str = ""
    openai_api_key: str = ""
    open_router_api_key: str = ""
    replicate_api_key: str = ""

    # Spend guardrail (real provider USD). 0 disables the daily cap.
    daily_spend_cap_usd: float = 0.0

    # Assistant model (empty -> openrouter/free, which works on the free tier).
    assistant_model: str = ""


settings = Settings()
