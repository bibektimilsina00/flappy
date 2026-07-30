"""AI assistant for the editor.

Chats with the user, answers platform + general questions, writes video scripts,
and — when asked to build or edit — returns a list of graph `operations` the
frontend applies to the canvas. Uses OpenRouter with a structured JSON response
so the reply and the operations come back together.
"""

import json
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.core.config import settings
from apps.api.app.features.assistant import repository
from apps.api.app.features.users.models import User
from apps.api.app.integrations.registry import list_models, model_to_dict

router = APIRouter(prefix="/assistant", tags=["assistant"])

# Free router works on the free tier; override for stronger models once funded.
ASSISTANT_MODEL = settings.assistant_model or "openrouter/free"
CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"


class GraphNode(BaseModel):
    id: str
    type: str | None = None
    data: dict = {}


class ChatRequest(BaseModel):
    message: str
    thread_id: uuid.UUID | None = None
    workflow_id: uuid.UUID | None = None
    nodes: list[GraphNode] = []


RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string", "description": "Natural-language answer to show the user."},
        "suggestions": {
            "type": "array",
            "description": "2-4 short clickable follow-up actions or answer choices for the user.",
            "items": {"type": "string"},
        },
        "operations": {
            "type": "array",
            "description": "Canvas edits to apply. Empty if the user only asked a question.",
            "items": {
                "type": "object",
                "properties": {
                    "op": {
                        "type": "string",
                        "enum": ["add_node", "update_node", "connect", "delete_node", "run_node"],
                    },
                    "id": {
                        "type": "string",
                        "description": "Node id. For add_node, a temp id you invent (e.g. n1) and reuse in connect/run_node.",
                    },
                    "kind": {"type": "string", "enum": ["text", "image", "video", "audio"]},
                    "source": {"type": "string"},
                    "target": {"type": "string"},
                    "prompt": {
                        "type": "string",
                        "description": "Prompt for an image/video/audio node.",
                    },
                    "text": {
                        "type": "string",
                        "description": "Body for a text node (also sets it to text mode).",
                    },
                    "model": {
                        "type": "string",
                        "description": "Optional model id from the catalog.",
                    },
                    "params": {
                        "type": "string",
                        "description": 'JSON object string of model params to set, e.g. \'{"aspectRatio":"9:16"}\'. Use only keys/values valid for the chosen model.',
                    },
                },
                "required": ["op"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["reply"],
    "additionalProperties": False,
}


def _fmt_params(params: list[dict]) -> str:
    parts = []
    for p in params or []:
        if p.get("options"):
            parts.append(f"{p['key']}:{'|'.join(str(o) for o in p['options'])}")
        elif p.get("type") == "number":
            parts.append(f"{p['key']}:{p.get('min', '')}-{p.get('max', '')}")
        else:
            parts.append(p["key"])
    return f" [{', '.join(parts)}]" if parts else ""


def _models_summary() -> str:
    out = []
    for kind in ("text", "image", "video", "audio"):
        feats = [model_to_dict(m) for m in list_models(kind)]
        feats = [m for m in feats if m.get("featured")]
        names = ", ".join(
            f"{m['name']} ({m['id']}){_fmt_params(m.get('params') or [])}" for m in feats[:8]
        )
        out.append(f"- {kind}: {names or 'none'}")
    return "\n".join(out)


def _truncate(d: dict) -> dict:
    out = {}
    for k, v in d.items():
        if k in ("upload_key", "upload", "kind"):
            continue
        out[k] = (v[:100] + "…") if isinstance(v, str) and len(v) > 100 else v
    return out


def _graph_summary(nodes: list[GraphNode]) -> str:
    if not nodes:
        return "The canvas is currently empty."
    lines = [
        f"  {n.id} [{n.type}] {json.dumps(_truncate(n.data or {}), ensure_ascii=False)}"
        for n in nodes[:60]
    ]
    return "Current canvas nodes (full config — you can edit any field):\n" + "\n".join(lines)


def _system_prompt(nodes: list[GraphNode]) -> str:
    return f"""You are the built-in AI assistant for a node-based AI video-generation studio \
(like a visual canvas where each node generates media with AI). Be warm, concise and genuinely helpful.

WHAT THE PLATFORM IS
- Users build workflows on a canvas out of connected nodes. Each node runs an AI model.
- Node kinds:
  - text  — writes/holds text (scripts, prompts). Output: text.
  - image — generates an image from a prompt (and optional reference image). Output: image.
  - video — generates a video from a prompt (and optional image/video input). Output: video.
  - audio — generates speech or music from text. Output: audio.
- Connections carry data downstream. Rules: a text node connects into a prompt input; an image \
node connects into an image input; a video node into a video input. So text → image → video is a \
common pipeline (script → keyframe → clip).
- Each node has a chosen model and parameters (aspect ratio, voice, duration, etc.).

AVAILABLE MODELS — each with its configurable params (pick ids when setting a node's model; \
brackets list the param keys and allowed values). Omit to use the default model.
{_models_summary()}

{_graph_summary(nodes)}

HOW TO RESPOND
Always return JSON matching the schema: {{"reply": string, "operations": [...]}}.
- For general questions, explanations, or scripts: put the full answer in `reply` and leave `operations` empty.
- When the user asks you to BUILD or EDIT the workflow, put a short confirmation in `reply` AND the concrete \
edits in `operations`:
  - add_node: {{"op":"add_node","id":"<temp id, e.g. n1>","kind":"text|image|video|audio","prompt":"...","text":"...","model":"<optional>","params":"<optional JSON of model params>"}}
  - update_node: {{"op":"update_node","id":"<existing node id>","prompt":"...","text":"...","model":"...","params":"..."}}
- To configure a node fully, set `model` AND `params` (a JSON string using only the keys/values listed \
for that model above), e.g. params:'{{"aspectRatio":"9:16"}}' or '{{"voice":"Kore"}}'. You have complete \
control over every field of every node.
  - connect: {{"op":"connect","source":"<id>","target":"<id>"}}  (reuse temp ids from add_node)
  - delete_node: {{"op":"delete_node","id":"<existing id>"}}
  - run_node: {{"op":"run_node","id":"<id>"}}  (generate that node + its upstream chain)
- Only run nodes when the user asks to generate/run/make it. To generate a whole pipeline, run_node \
the final node — its upstream nodes run automatically. Running spends the workspace's credits.

SUGGESTIONS (be proactive and intelligent)
- Always fill `suggestions` with 2-4 short, specific, clickable next actions tailored to the moment. \
Examples: after writing a script → ["Generate image assets for each scene", "Turn this into a video", \
"Add narration audio"]; after building nodes → ["Generate it now", "Make it 9:16 vertical", "Try a different style"].
- The user clicks a suggestion to run it, so phrase each as a command you can act on next turn.

ASKING QUESTIONS
- If the request is missing something that materially changes the result (aspect ratio, length, visual style, \
voice), ask ONE brief question in `reply` and put the choices in `suggestions` (e.g. ["9:16 vertical", \
"16:9 landscape", "1:1 square"]). Don't over-ask — pick sensible defaults for minor details and proceed.
- When the user DID give enough detail (or clicks a suggestion), just do it — don't ask again.
- To build a whole video: add a text node with a script, an image node for the key visual, a video node, \
connect them in order, and set good prompts. Reuse your temp ids (n1, n2, …) in the connects.
- If the user asks for a video script, WRITE a great, production-ready script in `reply` — and, if they \
want it on the canvas, also add a text node containing it.
- Only include operations the user actually asked for. Never invent node ids that aren't in the canvas for \
update/delete."""


@router.get("/threads")
def list_threads(
    workflow_id: uuid.UUID | None = None,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    return [
        {"id": str(t.id), "title": t.title, "updated_at": t.updated_at.isoformat()}
        for t in repository.list_for_workflow(session, workspace_id, workflow_id)
    ]


@router.get("/threads/{thread_id}")
def get_thread(
    thread_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    thread = repository.get(session, workspace_id, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"id": str(thread.id), "title": thread.title, "messages": thread.messages or []}


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_thread(
    thread_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> None:
    thread = repository.get(session, workspace_id, thread_id)
    if thread is not None:
        repository.delete(session, thread)


@router.post("/chat")
def chat(
    body: ChatRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    if not settings.open_router_api_key:
        raise HTTPException(status_code=503, detail="Assistant is not configured (missing key).")

    thread = repository.get(session, workspace_id, body.thread_id) if body.thread_id else None
    if thread is None:
        thread = repository.create(session, workspace_id, body.workflow_id)

    history: list[dict] = list(thread.messages or [])
    history.append({"role": "user", "content": body.message})

    messages = [{"role": "system", "content": _system_prompt(body.nodes)}]
    messages += [{"role": m["role"], "content": m["content"]} for m in history]

    try:
        with httpx.Client(timeout=120) as client:
            res = client.post(
                CHAT_URL,
                headers={"Authorization": f"Bearer {settings.open_router_api_key}"},
                json={
                    "model": ASSISTANT_MODEL,
                    "messages": messages,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "assistant_reply",
                            "strict": True,
                            "schema": RESPONSE_SCHEMA,
                        },
                    },
                },
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text[:300])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Assistant failed: {exc}")

    result = _parse(content)
    history.append(
        {"role": "assistant", "content": result["reply"], "suggestions": result["suggestions"]}
    )
    repository.save(session, thread, history, title=body.message)
    return {"thread_id": str(thread.id), **result}


def _parse(content: str) -> dict:
    """Extract {reply, operations} — tolerant of models that wrap or drift."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        start, end = content.find("{"), content.rfind("}")
        try:
            data = json.loads(content[start : end + 1]) if start != -1 and end != -1 else {}
        except json.JSONDecodeError:
            data = {}
    if not isinstance(data, dict) or "reply" not in data:
        return {
            "reply": content.strip() or "Sorry, I couldn't produce a response.",
            "operations": [],
            "suggestions": [],
        }
    ops = data.get("operations") or []
    sugg = data.get("suggestions") or []
    return {
        "reply": str(data.get("reply", "")),
        "operations": ops if isinstance(ops, list) else [],
        "suggestions": [str(s) for s in sugg][:4] if isinstance(sugg, list) else [],
    }
