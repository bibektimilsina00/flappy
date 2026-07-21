"""Parse a React Flow workflow graph into an executable DAG.

Graph JSON shape:
    {"nodes": [{"id", "type", "data"}...],
     "edges": [{"source", "target", "sourceHandle", "targetHandle"}...]}
"""

from dataclasses import dataclass, field


class GraphError(ValueError):
    pass


@dataclass
class GraphNode:
    id: str
    type: str
    data: dict
    deps: list[str] = field(default_factory=list)  # upstream node ids


def build(graph: dict) -> dict[str, GraphNode]:
    nodes: dict[str, GraphNode] = {}
    for n in graph.get("nodes", []):
        nodes[n["id"]] = GraphNode(id=n["id"], type=n["type"], data=n.get("data", {}))

    for e in graph.get("edges", []):
        src, tgt = e["source"], e["target"]
        if src not in nodes or tgt not in nodes:
            raise GraphError(f"Edge references unknown node: {src} -> {tgt}")
        nodes[tgt].deps.append(src)
    return nodes


def topo_order(nodes: dict[str, GraphNode]) -> list[str]:
    """Kahn's algorithm. Raises GraphError on a cycle."""
    indegree = {nid: len(n.deps) for nid, n in nodes.items()}
    queue = [nid for nid, d in indegree.items() if d == 0]
    # children map
    children: dict[str, list[str]] = {nid: [] for nid in nodes}
    for nid, n in nodes.items():
        for dep in n.deps:
            children[dep].append(nid)

    order: list[str] = []
    while queue:
        nid = queue.pop(0)
        order.append(nid)
        for child in children[nid]:
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)

    if len(order) != len(nodes):
        raise GraphError("Workflow graph has a cycle")
    return order
