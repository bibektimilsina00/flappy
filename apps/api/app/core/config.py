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
    s3_region: str = ""  # R2 wants "auto"; MinIO doesn't care

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

    # Dodo Payments (merchant of record). Empty = payments disabled.
    dodo_api_key: str = ""
    dodo_webhook_key: str = ""
    dodo_environment: str = "test_mode"  # test_mode | live_mode
    # Subscription product ids from the Dodo dashboard, one per paid tier.
    dodo_product_plus: str = ""
    dodo_product_pro: str = ""
    dodo_product_ultra: str = ""
    dodo_product_studio_s: str = ""
    dodo_product_studio_m: str = ""
    dodo_product_studio_l: str = ""
    dodo_product_studio_xl: str = ""
    dodo_product_studio_max: str = ""
    free_monthly_credits: float = 100.0  # free plan tops up to this monthly

    # Assistant model (empty -> openrouter/free, which works on the free tier).
    assistant_model: str = ""

    # Clips (video repurposing) — CLIPS-PLAN.md
    # Transcription model on OpenRouter's /audio/transcriptions (word timestamps).
    clips_transcribe_model: str = "openai/whisper-large-v3-turbo"
    # Netscape cookies.txt for yt-dlp — YouTube bot-walls datacenter IPs.
    clips_cookies_file: str = ""
    # bgutil PO-token provider service URL (empty = disabled).
    clips_pot_provider_url: str = ""
    # Residential proxy for yt-dlp, e.g. http://user:pass@gw.dataimpulse.com:823
    # (empty = direct). Only ingest traffic goes through it.
    clips_proxy: str = ""
    clips_select_model: str = ""  # empty -> default text model
    # Credit standard: 1 credit ≈ $0.01 of value.
    clips_credits_select: float = 5.0  # the LLM moment-selection call
    clips_credits_per_clip: float = 10.0  # per rendered clip
    clips_credits_per_2min: float = 1.0  # ingest+transcribe, per 2 min of source (min 5)

    # Social publishing OAuth apps (M5). YouTube reuses the Google app above.
    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""
    # Sandbox app (for testing before the production app is audited). When
    # tiktok_use_sandbox is true and these are set, TikTok OAuth uses them.
    tiktok_sandbox_client_key: str = ""
    tiktok_sandbox_client_secret: str = ""
    tiktok_use_sandbox: bool = False
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
