from collections.abc import Generator

from sqlmodel import Session, create_engine

from apps.api.app.core.config import settings

engine = create_engine(settings.database_url, echo=False, pool_pre_ping=True)


def get_session() -> Generator[Session]:
    with Session(engine) as session:
        yield session
