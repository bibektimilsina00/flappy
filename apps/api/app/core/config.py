from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All values come from the environment (.env at the repo root)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    database_url: str = ""
    redis_url: str = ""
    secret_key: str = ""
    access_token_expire_minutes: int = 43200  # 30 days — consumer app, not a bank

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

    # Clips (video repurposing) — CLIPS-PLAN.md
    clips_whisper_model: str = "small"
    clips_select_model: str = ""  # empty -> default text model
    clips_credits_select: float = 1.0
    clips_credits_per_clip: float = 2.0

    # Social publishing OAuth apps (M5). YouTube reuses the Google app above.
    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""
    facebook_app_id: str = ""
    facebook_app_secret: str = ""
    # "Instagram API with Instagram Login" (standalone, no Facebook page needed)
    instagram_app_id: str = ""
    instagram_app_secret: str = ""
    x_client_id: str = ""
    x_client_secret: str = ""
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""


settings = Settings()
