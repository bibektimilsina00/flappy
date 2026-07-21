"""Self-check for the DAG builder. Run: pytest, or `python -m ...test_graph`."""

from apps.api.app.execution_engine.engine import graph as g


def _graph(nodes, edges):
    return {
        "nodes": [{"id": n, "type": "text", "data": {}} for n in nodes],
        "edges": [{"source": s, "target": t} for s, t in edges],
    }


def test_topo_order_respects_deps():
    nodes = g.build(_graph(["a", "b", "c"], [("a", "b"), ("b", "c")]))
    order = g.topo_order(nodes)
    assert order.index("a") < order.index("b") < order.index("c")


def test_cycle_raises():
    nodes = g.build(_graph(["a", "b"], [("a", "b"), ("b", "a")]))
    try:
        g.topo_order(nodes)
        raise AssertionError("expected GraphError on cycle")
    except g.GraphError:
        pass


def test_unknown_edge_raises():
    try:
        g.build(_graph(["a"], [("a", "ghost")]))
        raise AssertionError("expected GraphError on dangling edge")
    except g.GraphError:
        pass


if __name__ == "__main__":
    test_topo_order_respects_deps()
    test_cycle_raises()
    test_unknown_edge_raises()
    print("ok")
