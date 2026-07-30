from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt

from apps.api.app.core.config import settings

ALGORITHM = "HS256"
TOKEN_TTL = timedelta(minutes=settings.access_token_expire_minutes)

_ph = PasswordHasher()


def hash_password(raw: str) -> str:
    return _ph.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, raw)
    except VerifyMismatchError:
        return False


def create_access_token(subject: str) -> str:
    expire = datetime.now(UTC) + TOKEN_TTL
    return jwt.encode({"sub": subject, "exp": expire}, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> str | None:
    """Return the token subject (user id) or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
