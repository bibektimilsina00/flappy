from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from apps.api.app.api.deps import get_session
from apps.api.app.core.config import settings
from apps.api.app.core.security import create_access_token, decode_token
from apps.api.app.features.auth import oauth, service
from apps.api.app.features.auth.schemas import RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    token, user = service.register(session, data)
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    token, user = service.login(session, form.username, form.password)
    return TokenResponse(access_token=token, user=user)


@router.get("/providers")
def oauth_providers():
    """Which OAuth providers are configured — lets the UI show only usable ones."""
    return {name: oauth.is_configured(name) for name in oauth.PROVIDERS}


@router.get("/oauth/{provider}/login")
def oauth_login(provider: str):
    if provider not in oauth.PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")
    if not oauth.is_configured(provider):
        raise HTTPException(status_code=400, detail=f"{provider} OAuth is not configured")
    # Signed state (sub=provider) gives us stateless CSRF protection on callback.
    state = create_access_token(provider)
    return RedirectResponse(oauth.authorize_url(provider, state))


@router.get("/oauth/{provider}/callback")
def oauth_callback(
    provider: str,
    code: str,
    state: str,
    session: Session = Depends(get_session),
):
    if provider not in oauth.PROVIDERS or decode_token(state) != provider:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    info = oauth.exchange(provider, code)
    if not info["email"]:
        raise HTTPException(status_code=400, detail="Provider did not return an email")

    token, _user = service.login_oauth(
        session, provider, info["email"], info["name"], avatar_url=info.get("avatar_url")
    )
    return RedirectResponse(f"{settings.frontend_url}/auth/callback?token={token}")
