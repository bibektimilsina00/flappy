"""Hand-written node registry. ~5 nodes — no auto-discovery needed.

Add a node: import its class and add one line to NODES.
"""

from apps.api.app.node_system.base import Node
from apps.api.app.node_system.nodes.audio import AudioNode
from apps.api.app.node_system.nodes.compose import ComposeNode
from apps.api.app.node_system.nodes.image import ImageNode
from apps.api.app.node_system.nodes.text import TextNode
from apps.api.app.node_system.nodes.upload import UploadNode
from apps.api.app.node_system.nodes.video import VideoNode

NODES: dict[str, type[Node]] = {
    n.metadata.type: n
    for n in (TextNode, ImageNode, VideoNode, AudioNode, ComposeNode, UploadNode)
}


def get_node(node_type: str) -> type[Node]:
    if node_type not in NODES:
        raise KeyError(f"Unknown node type: {node_type}")
    return NODES[node_type]
