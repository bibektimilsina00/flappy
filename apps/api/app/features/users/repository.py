"""DB queries for users. Keep all SQL here; service.py calls into it."""

import uuid

from sqlmodel import Session, select

from apps.api.app.features.users.models import User


def get(session: Session, user_id: uuid.UUID) -> User | None:
    return session.get(User, user_id)


def get_by_email(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()


def add(session: Session, user: User) -> User:
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
