from logging.config import fileConfig

from alembic import context
from sqlmodel import SQLModel

from apps.api.app.core.config import settings

# Import every module that defines a table so SQLModel.metadata is complete.
from apps.api.app.features.assets import models as _assets  # noqa: F401
from apps.api.app.features.billing import models as _billing  # noqa: F401
from apps.api.app.features.executions import models as _executions  # noqa: F401
from apps.api.app.features.users import models as _users  # noqa: F401
from apps.api.app.features.workflows import models as _workflows  # noqa: F401
from apps.api.app.features.workspaces import models as _workspaces  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    from sqlalchemy import create_engine

    engine = create_engine(settings.database_url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
