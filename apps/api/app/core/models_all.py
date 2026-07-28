"""Import every table model so SQLModel.metadata is complete in any process.

Foreign keys (e.g. execution.workflow_id -> workflow.id) only resolve if all
referenced tables are registered. The worker imports fewer modules than the API,
so this is imported at the Celery boundary to guarantee full registration.
"""

from apps.api.app.features.assets.models import Asset  # noqa: F401
from apps.api.app.features.assistant.models import AssistantThread  # noqa: F401
from apps.api.app.features.collections.models import Collection  # noqa: F401
from apps.api.app.features.video_editor.models import VideoEditorProject  # noqa: F401
from apps.api.app.features.billing.models import Credit, UsageRecord  # noqa: F401
from apps.api.app.features.executions.models import Execution  # noqa: F401
from apps.api.app.features.users.models import User  # noqa: F401
from apps.api.app.features.workflows.models import Workflow  # noqa: F401
from apps.api.app.features.workspaces.models import Workspace  # noqa: F401
