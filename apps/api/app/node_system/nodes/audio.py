from apps.api.app.node_system.base import Node, NodeIO, NodeMetadata
from apps.api.app.node_system.context import NodeContext


class AudioNode(Node):
    metadata = NodeMetadata(
        type="audio",
        title="Audio / TTS",
        category="generate",
        inputs=[NodeIO("text", "text")],
        outputs=[NodeIO("audio", "audio")],
    )

    async def execute(self, inputs: dict, ctx: NodeContext) -> dict:
        # ponytail: wire a TTS provider here; return the asset ref.
        raise NotImplementedError("Audio/TTS provider not wired yet")
