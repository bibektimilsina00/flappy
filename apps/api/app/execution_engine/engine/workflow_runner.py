"""Orchestrate one workflow run: validate -> topo-schedule -> generate -> emit.

Per node: resolve the model (chosen or default), build a normalized request from
the node + upstream outputs, run its adapter (pre-check credits, charge on
success, persist the asset). Failures isolate; downstream is skipped.
"""

import asyncio

from apps.api.app.execution_engine.engine import graph as graph_mod
from apps.api.app.execution_engine.engine.event_emitter import EventEmitter
from apps.api.app.execution_engine.engine.run_context import RunContext
from apps.api.app.integrations.base.adapter import GenerationRequest
from apps.api.app.integrations.base.model_spec import ModelSpec
from apps.api.app.integrations.registry import get_adapter, provider_usd, resolve_model


def _resolve_params(model: ModelSpec, overrides: dict) -> dict:
    params = {p.key: p.default for p in model.params}
    params.update({k: v for k, v in (overrides or {}).items() if k in params})
    return params


def _build_request(node: graph_mod.GraphNode, results: dict[str, dict], model: ModelSpec) -> GenerationRequest:
    data = node.data or {}
    inputs: dict = {}
    image_urls: list[str] = []
    for dep in node.deps:
        dep_out = results.get(dep, {})
        inputs.update(dep_out)
        if dep_out.get("url"):
            image_urls.append(dep_out["url"])
    if image_urls:
        inputs["image_urls"] = image_urls  # upstream media, for image-input models
    return GenerationRequest(
        kind=node.type,
        prompt=data.get("text") or data.get("prompt"),
        inputs=inputs,
        params=_resolve_params(model, data.get("params", {})),
    )


def _stored_output(node: graph_mod.GraphNode, prior: dict[str, dict]) -> dict:
    """Outputs an upstream node produced on a prior run: text from the graph,
    media from the persisted assets (passed in as `prior`)."""
    data = node.data or {}
    output = {"text": data.get("text")}
    url = prior.get(node.id, {}).get("url")
    if url:
        output["url"] = url
    return output


async def run_workflow(
    graph: dict,
    emitter: EventEmitter,
    ctx: RunContext,
    run_only: str | None = None,
    prior: dict[str, dict] | None = None,
) -> tuple[str, str | None]:
    prior = prior or {}
    emitter.emit("execution.started")

    try:
        nodes = graph_mod.build(graph)
        order = graph_mod.topo_order(nodes)
    except graph_mod.GraphError as exc:
        emitter.emit("execution.failed", message=str(exc))
        return "failed", str(exc)

    failed: set[str] = set()
    results: dict[str, dict] = {}

    for node_id in order:
        node = nodes[node_id]

        # Uploaded asset: a source node, not a generator. Pass its media through
        # (re-presigned) in every run mode, so it displays and feeds downstream.
        upload_key = (node.data or {}).get("upload_key")
        if upload_key:
            url = ctx.storage.url(upload_key)
            results[node_id] = {"url": url, "text": None, "cost": 0}
            if run_only is None or node_id == run_only:
                emitter.emit("node.succeeded", node_id=node_id, data=results[node_id])
            continue

        # Single-node run: upstream already generated — reuse its stored output.
        if run_only is not None and node_id != run_only:
            results[node_id] = _stored_output(node, prior)
            continue

        if any(dep in failed for dep in node.deps):
            failed.add(node_id)
            emitter.emit("node.skipped", node_id=node_id, message="Skipped (upstream failed)")
            continue

        model = resolve_model(node.type, (node.data or {}).get("model"))
        if model is None:
            failed.add(node_id)
            emitter.emit("node.failed", node_id=node_id, message=f"No model for {node.type}")
            continue

        emitter.emit("node.started", node_id=node_id, data={"type": node.type, "model": model.name})
        adapter = get_adapter(model.adapter)
        request = _build_request(node, results, model)
        cost = adapter.estimate_cost(model, request)

        if not ctx.has_credits(cost):
            emitter.emit("node.failed", node_id=node_id, message="Insufficient credits")
            emitter.emit("execution.failed", message="Insufficient credits")
            return "failed", "Insufficient credits"

        try:
            emitter.emit("node.log", node_id=node_id, message=f"Generating with {model.name}…")
            result = await asyncio.to_thread(adapter.generate, model, request, ctx)
            ctx.charge(cost, node_id, node.type, provider_usd(model))

            # Presign the stable key once for this session's live event.
            url = ctx.storage.url(result.key) if result.key is not None else None
            output = {"url": url, "text": result.text, "cost": cost}
            results[node_id] = output
            if result.key is not None:
                ctx.on_asset(node_id, node.type, result.key, url, cost)
                emitter.emit("node.log", node_id=node_id, message=f"Saved asset · {cost} credits")
            emitter.emit("node.succeeded", node_id=node_id, data=output)
        except Exception as exc:  # noqa: BLE001 — isolate per node
            failed.add(node_id)
            emitter.emit("node.failed", node_id=node_id, message=str(exc))

    status = "failed" if failed else "completed"
    emitter.emit(f"execution.{status}")
    return status, None
