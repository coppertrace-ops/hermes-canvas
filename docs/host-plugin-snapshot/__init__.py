"""Hermes Canvas plugin — automatic telemetry + intentional canvas tools.

This is the host-side connector for Hermes Canvas. It does NOT rely on the model
remembering to update the dashboard.

Two layers:
1. Observer hooks automatically emit lifecycle receipts into Canvas.
2. Explicit tools let Hermes intentionally create/update canvas artifacts.

Inbound Canvas→Hermes chat bridging is handled by a lightweight background
poller that mirrors human pending messages into the Telegram home channel as
clearly-labeled Canvas-originated messages, so the running gateway session can
answer them and the post_llm_call hook can write the reply back.
"""
from __future__ import annotations

import contextlib
import hashlib
import json
import logging
import os
import queue
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from .client import CanvasError, get_client

logger = logging.getLogger("hermes.plugins.canvas")

_STATE_LOCK = threading.Lock()
_TURN_STREAMS: dict[str, str] = {}
_SEEN_MESSAGE_IDS: set[str] = set()
_POLLER_STARTED = False
_CURSOR = 0


def _clip(text: Any, n: int = 3500) -> str:
    s = text if isinstance(text, str) else json.dumps(text, default=str)
    if len(s) <= n:
        return s
    return s[: n - 20] + "\n…[truncated]"


def _safe_post_text(text: str) -> None:
    client = get_client()
    if not client:
        return
    try:
        client.post_text(_clip(text, 12000))
    except Exception as e:
        logger.warning("canvas post_text failed: %s", e)


def _safe_create_markdown(title: str, content: str, why: str) -> None:
    client = get_client()
    if not client:
        return
    try:
        client.create_artifact(
            {
                "type": "markdown",
                "title": title[:120],
                "content": _clip(content, 50000),
                "why": why[:500],
            }
        )
    except Exception as e:
        logger.warning("canvas create_artifact failed: %s", e)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

def _json_ok(data: Any) -> str:
    return json.dumps({"ok": True, "data": data}, default=str)


def _json_err(e: Exception) -> str:
    if isinstance(e, CanvasError):
        return json.dumps(
            {
                "ok": False,
                "error": {
                    "status": e.status,
                    "code": e.code,
                    "message": e.message,
                    "detail": e.detail,
                },
            },
            default=str,
        )
    return json.dumps({"ok": False, "error": {"code": "client_error", "message": str(e)}})


def _require_client():
    client = get_client()
    if not client:
        raise RuntimeError(
            "Canvas client not configured. Set HERMES_CANVAS_BASE_URL and HERMES_SERVICE_TOKEN."
        )
    return client


def handle_canvas_get_updates(args: dict, **kwargs) -> str:
    try:
        client = _require_client()
        cursor = int(args.get("cursor") or 0)
        return _json_ok(client.get_updates(cursor))
    except Exception as e:
        return _json_err(e)


def handle_canvas_post_message(args: dict, **kwargs) -> str:
    try:
        client = _require_client()
        if args.get("text") is not None:
            payload = {"text": str(args["text"])}
        else:
            payload = {
                "stream_id": str(args.get("stream_id") or ""),
                "delta": str(args.get("delta") or ""),
            }
            if "done" in args:
                payload["done"] = bool(args["done"])
        return _json_ok(client.post_message(payload))
    except Exception as e:
        return _json_err(e)


def handle_canvas_list_artifacts(args: dict, **kwargs) -> str:
    try:
        return _json_ok(_require_client().list_artifacts())
    except Exception as e:
        return _json_err(e)


def handle_canvas_read_artifact(args: dict, **kwargs) -> str:
    try:
        seq = args.get("seq")
        return _json_ok(
            _require_client().read_artifact(
                str(args.get("artifact_id") or ""),
                int(seq) if seq is not None else None,
            )
        )
    except Exception as e:
        return _json_err(e)


def handle_canvas_create_artifact(args: dict, **kwargs) -> str:
    try:
        payload = {
            "type": str(args.get("type") or "markdown"),
            "title": str(args.get("title") or "Untitled"),
            "content": str(args.get("content") or ""),
            "why": str(args.get("why") or "agent write"),
        }
        if args.get("tab_id"):
            payload["tab_id"] = str(args["tab_id"])
        return _json_ok(_require_client().create_artifact(payload))
    except Exception as e:
        return _json_err(e)


def handle_canvas_update_artifact(args: dict, **kwargs) -> str:
    try:
        artifact_id = str(args.get("artifact_id") or "")
        edit = args.get("edit")
        if not isinstance(edit, dict):
            # convenience: treat content as replace_all
            edit = {"mode": "replace_all", "content": str(args.get("content") or "")}
        payload = {
            "parent_seq": int(args.get("parent_seq") or 0),
            "why": str(args.get("why") or "agent update"),
            "edit": edit,
        }
        return _json_ok(_require_client().update_artifact(artifact_id, payload))
    except Exception as e:
        return _json_err(e)


def handle_canvas_archive_artifact(args: dict, **kwargs) -> str:
    try:
        return _json_ok(
            _require_client().archive_artifact(
                str(args.get("artifact_id") or ""),
                str(args.get("why") or "archive"),
            )
        )
    except Exception as e:
        return _json_err(e)


def check_canvas_requirements() -> bool:
    return bool(os.environ.get("HERMES_CANVAS_BASE_URL") and os.environ.get("HERMES_SERVICE_TOKEN"))


_TOOLS = [
    (
        "canvas_get_updates",
        {
            "name": "canvas_get_updates",
            "description": "Poll Hermes Canvas for pending human messages and events since a cursor.",
            "parameters": {
                "type": "object",
                "properties": {"cursor": {"type": "integer", "description": "Monotonic cursor; 0 from start."}},
            },
        },
        handle_canvas_get_updates,
        "📥",
    ),
    (
        "canvas_post_message",
        {
            "name": "canvas_post_message",
            "description": "Post an assistant message or streaming delta into Hermes Canvas chat.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "stream_id": {"type": "string"},
                    "delta": {"type": "string"},
                    "done": {"type": "boolean"},
                },
            },
        },
        handle_canvas_post_message,
        "💬",
    ),
    (
        "canvas_list_artifacts",
        {
            "name": "canvas_list_artifacts",
            "description": "List current Hermes Canvas artifacts and their head sequences.",
            "parameters": {"type": "object", "properties": {}},
        },
        handle_canvas_list_artifacts,
        "🗂️",
    ),
    (
        "canvas_read_artifact",
        {
            "name": "canvas_read_artifact",
            "description": "Read a Hermes Canvas artifact head or historical version.",
            "parameters": {
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "seq": {"type": "integer"},
                },
                "required": ["artifact_id"],
            },
        },
        handle_canvas_read_artifact,
        "📖",
    ),
    (
        "canvas_create_artifact",
        {
            "name": "canvas_create_artifact",
            "description": "Create a durable Hermes Canvas artifact (markdown/mermaid/html-static/board).",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["markdown", "mermaid", "html-static", "board"]},
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "why": {"type": "string"},
                    "tab_id": {"type": "string"},
                },
                "required": ["type", "title", "content", "why"],
            },
        },
        handle_canvas_create_artifact,
        "📝",
    ),
    (
        "canvas_update_artifact",
        {
            "name": "canvas_update_artifact",
            "description": "Update a Hermes Canvas artifact with replace_all or region edit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "parent_seq": {"type": "integer"},
                    "why": {"type": "string"},
                    "content": {"type": "string", "description": "Convenience replace_all content"},
                    "edit": {"type": "object"},
                },
                "required": ["artifact_id", "parent_seq", "why"],
            },
        },
        handle_canvas_update_artifact,
        "✏️",
    ),
    (
        "canvas_archive_artifact",
        {
            "name": "canvas_archive_artifact",
            "description": "Archive a Hermes Canvas artifact.",
            "parameters": {
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "why": {"type": "string"},
                },
                "required": ["artifact_id", "why"],
            },
        },
        handle_canvas_archive_artifact,
        "📦",
    ),
]


# ---------------------------------------------------------------------------
# Observer hooks — automatic, no model memory required
# ---------------------------------------------------------------------------

def on_session_start(**kwargs) -> None:
    return  # muted
    # original muted below
    sid = kwargs.get("session_id") or "unknown"
    _safe_post_text(f"🟢 session started · `{sid}`")


def on_session_end(**kwargs) -> None:
    return  # muted
    # original muted below
    sid = kwargs.get("session_id") or "unknown"
    reason = kwargs.get("reason") or ("completed" if kwargs.get("completed") else "ended")
    interrupted = kwargs.get("interrupted")
    _safe_post_text(
        f"⏹ session end · `{sid}` · {reason}"
        + (" · interrupted" if interrupted else "")
    )


def on_session_finalize(**kwargs) -> None:
    return  # muted
    # original muted below
    sid = kwargs.get("session_id") or "unknown"
    _safe_post_text(f"🧹 session finalized · `{sid}`")


def pre_llm_call(**kwargs) -> None:
    return  # muted
    # original muted below
    turn_id = str(kwargs.get("turn_id") or uuid.uuid4())
    stream_id = f"turn-{turn_id}"
    with _STATE_LOCK:
        _TURN_STREAMS[turn_id] = stream_id
    user_message = kwargs.get("user_message") or ""
    platform = kwargs.get("platform") or ""
    model = kwargs.get("model") or ""
    # Mirror human turn into Canvas as a receipt (not as a human-authored Canvas chat row).
    _safe_post_text(
        "👤 turn start"
        + (f" · platform={platform}" if platform else "")
        + (f" · model={model}" if model else "")
        + f"\n\n{_clip(user_message, 4000)}"
    )


def post_llm_call(**kwargs) -> None:
    # Opportunistically refresh the Settings status panel with the model +
    # platform this turn actually ran on. Cheap and best-effort: it only
    # records the latest turn and wakes the reporter thread, which enforces
    # the >=60s debounce and does the actual PUT off the hot path.
    try:
        _note_turn(kwargs.get("model") or "", kwargs.get("platform") or "")
    except Exception:
        pass
    # Skip when turn is on canvas platform — adapter.send owns the bubble.
    platform = str(kwargs.get("platform") or "").lower()
    if platform in ("canvas", "canvas_chat", "canvas-platform"):
        return
    assistant = kwargs.get("assistant_response") or ""
    client = get_client()
    if not client or not assistant:
        return
    try:
        client.post_text(_clip(assistant, 12000))
    except Exception as e:
        logger.warning("canvas post assistant failed: %s", e)


# ---------------------------------------------------------------------------
# Tool-call receipts → live tool-call feed (PUT /agent/tool-calls/{id}).
#
# pre_tool_call posts a "running" receipt; post_tool_call updates the same id in
# place with a terminal status + timing + a redacted result tail. Posting is
# fire-and-forget through a single background worker with a short-timeout client
# so a slow Canvas NEVER adds latency to tool execution.
#
# CRITICAL: args/result arrive here UNREDACTED — this hook layer is upstream of
# the display-path redactor. Every arg/result/error preview is passed through
# agent.redact.redact_sensitive_text before it leaves the host, then truncated
# UTF-8-safely to the endpoint's byte caps.
# ---------------------------------------------------------------------------

_TOOLCALL_QUEUE: "Optional[queue.Queue]" = None
_TOOLCALL_WORKER_STARTED = False
_TOOLCALL_CLIENT: Any = None
_TOOLCALL_RL_LOGGED_MS = 0  # last 429 log stamp (one warn/min max)

_TOOLCALL_QUEUE_MAX = int(os.environ.get("HERMES_CANVAS_TOOLRECEIPT_QUEUE", "2000"))
_TOOLCALL_TIMEOUT_S = float(os.environ.get("HERMES_CANVAS_TOOLRECEIPT_TIMEOUT_S", "5"))
# Operator lever: log id+status (never payloads) on each successful post so a
# receipt can be traced end-to-end. Off by default — receipts are high-volume.
_TOOLCALL_DEBUG = os.environ.get("HERMES_CANVAS_TOOLRECEIPT_DEBUG", "").lower() in {"1", "true", "yes"}
_TOOLCALL_ARGS_MAX_BYTES = 500
_TOOLCALL_TAIL_MAX_BYTES = 2048
_TOOLCALL_ERR_MAX_BYTES = 2048
_TOOLCALL_TOOL_MAX_BYTES = 256
_TOOLCALL_ID_MAX = 256

# Skip-list for ultra-chatty internal tools (comma-separated names). Empty by
# default: inspection of the gateway tool loop found no tool that fires
# dozens/min today (the canvas poller that used to is retired). Set
# HERMES_CANVAS_TOOLRECEIPT_SKIP to add names without a code change.
_TOOLCALL_SKIP = {
    s.strip()
    for s in os.environ.get("HERMES_CANVAS_TOOLRECEIPT_SKIP", "").split(",")
    if s.strip()
}

# post-hook status vocabulary (ok|error|blocked|cancelled|timeout) → the
# endpoint's terminal set (ok|error|blocked). cancelled/timeout are failures.
_TERMINAL_STATUS_MAP = {
    "ok": "ok",
    "error": "error",
    "blocked": "blocked",
    "cancelled": "error",
    "timeout": "error",
}

_ID_SAFE = frozenset(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-"
)

_PRIMARY_ARG_KEYS = (
    "command", "cmd", "file_path", "path", "query", "url", "pattern",
    "prompt", "text", "content", "artifact_id", "id", "name", "key",
)


def _utf8_truncate(s: str, max_bytes: int) -> str:
    """Clip to at most max_bytes of UTF-8 without splitting a codepoint."""
    if not s:
        return ""
    b = s.encode("utf-8")
    if len(b) <= max_bytes:
        return s
    return b[:max_bytes].decode("utf-8", errors="ignore")


def _redact_display(text: str) -> str:
    """Mask secrets before an arg/result preview leaves the host. The tool hook
    layer bypasses the display redactor, so we apply it here. Safe on any
    string; non-secret text passes through unchanged."""
    if not text:
        return ""
    try:
        from agent.redact import redact_sensitive_text
        return redact_sensitive_text(text, force=True, file_read=True)
    except Exception:
        return text


def _preview_value(v: Any) -> str:
    if isinstance(v, str):
        s = v
    elif v is None or isinstance(v, (int, float, bool)):
        s = json.dumps(v)
    else:
        try:
            s = json.dumps(v, default=str, ensure_ascii=False)
        except Exception:
            s = str(v)
    s = s.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    if len(s) > 140:
        s = s[:139] + "…"
    return s


def _summarize_args(args: Any) -> str:
    """Compact, single-line, repr-ish preview of a tool's args — primary arg
    first when identifiable. Redacted, then truncated to <=500 UTF-8 bytes."""
    try:
        if isinstance(args, dict) and args:
            ordered = [k for k in _PRIMARY_ARG_KEYS if k in args]
            ordered += [k for k in args if k not in ordered]
            preview = ", ".join(f"{k}={_preview_value(args[k])}" for k in ordered)
        elif args:
            preview = _preview_value(args)
        else:
            preview = ""
    except Exception:
        preview = ""
    return _utf8_truncate(_redact_display(preview), _TOOLCALL_ARGS_MAX_BYTES)


def _result_tail(result: Any) -> str:
    """Last ~2KB of the result, redacted then truncated UTF-8-safely."""
    if result is None:
        return ""
    s = result if isinstance(result, str) else json.dumps(result, default=str, ensure_ascii=False)
    if not s:
        return ""
    # Redact a bounded tail (wider than the cap, for regex context), then clip.
    return _utf8_truncate(_redact_display(s[-8000:]), _TOOLCALL_TAIL_MAX_BYTES)


def _sanitize_tool_call_id(raw: Any) -> str:
    """Coerce to the endpoint id charset [A-Za-z0-9._:-] (<=256). Synthesize a
    fallback id when the runtime hands us nothing usable so the receipt still
    lands rather than being dropped."""
    cleaned = "".join(c for c in str(raw or "") if c in _ID_SAFE)[:_TOOLCALL_ID_MAX]
    return cleaned or f"tc-{uuid.uuid4().hex}"


def _get_toolcall_client() -> Any:
    """Dedicated short-timeout client for receipts so a stalled Canvas can never
    hold the worker for the shared client's 30s."""
    global _TOOLCALL_CLIENT
    if _TOOLCALL_CLIENT is not None:
        return _TOOLCALL_CLIENT
    try:
        from .client import CanvasClient
        _TOOLCALL_CLIENT = CanvasClient(timeout_s=_TOOLCALL_TIMEOUT_S)
    except Exception as e:
        logger.debug("canvas tool-receipt client unavailable: %s", e)
        return None
    return _TOOLCALL_CLIENT


def _log_rate_limited() -> None:
    global _TOOLCALL_RL_LOGGED_MS
    now = _now_ms()
    if now - _TOOLCALL_RL_LOGGED_MS >= 60000:
        _TOOLCALL_RL_LOGGED_MS = now
        logger.warning("canvas tool receipts rate-limited (429); dropping until quota resets")


def _toolcall_worker_loop() -> None:
    logger.info("canvas tool-receipt worker starting pid=%s", os.getpid())
    while True:
        try:
            item = _TOOLCALL_QUEUE.get()
        except Exception:
            continue
        if not item:
            continue
        tool_call_id, payload = item
        client = _get_toolcall_client()
        if client is None:
            continue
        try:
            client.report_tool_call(tool_call_id, payload)
            if _TOOLCALL_DEBUG:
                logger.info(
                    "canvas tool receipt ok id=%s status=%s http=200",
                    tool_call_id,
                    payload.get("status"),
                )
        except CanvasError as e:
            if e.status == 429:
                _log_rate_limited()
            else:
                logger.debug("canvas tool receipt failed id=%s: %s", tool_call_id, e)
        except Exception as e:
            logger.debug("canvas tool receipt error id=%s: %s", tool_call_id, e)


def _ensure_toolcall_worker() -> None:
    global _TOOLCALL_QUEUE, _TOOLCALL_WORKER_STARTED
    if _TOOLCALL_WORKER_STARTED:
        return
    with _STATE_LOCK:
        if _TOOLCALL_WORKER_STARTED:
            return
        _TOOLCALL_QUEUE = queue.Queue(maxsize=_TOOLCALL_QUEUE_MAX)
        t = threading.Thread(
            target=_toolcall_worker_loop, name="hermes-canvas-toolreceipts", daemon=True
        )
        t.start()
        _TOOLCALL_WORKER_STARTED = True


def _enqueue_receipt(tool_call_id: str, payload: dict) -> None:
    """Hand a receipt to the worker. Never blocks: a full queue drops the
    receipt so tool execution latency can never regress."""
    _ensure_toolcall_worker()
    try:
        _TOOLCALL_QUEUE.put_nowait((tool_call_id, payload))
    except queue.Full:
        pass


def pre_tool_call(**kwargs) -> None:
    """Observer: emit a 'running' receipt for the live tool-call feed. Posting is
    off-thread and never raises, so tool execution is never delayed or broken."""
    try:
        tool = str(kwargs.get("tool_name") or "tool")
        if tool in _TOOLCALL_SKIP:
            return
        payload: dict[str, Any] = {
            "tool": _utf8_truncate(tool, _TOOLCALL_TOOL_MAX_BYTES),
            "status": "running",
            "args_summary": _summarize_args(kwargs.get("args")),
            "started_at": _now_ms(),
        }
        sid = kwargs.get("session_id")
        if sid:
            payload["session_id"] = str(sid)
        tid = kwargs.get("turn_id")
        if tid:
            payload["turn_id"] = str(tid)
        _enqueue_receipt(_sanitize_tool_call_id(kwargs.get("tool_call_id")), payload)
    except Exception as e:
        logger.debug("canvas pre_tool_call receipt error: %s", e)


def post_tool_call(**kwargs) -> None:
    """Observer: update the same tool_call_id in place with the terminal status
    (ok|error|blocked), timing, a redacted result tail, and any error message.
    args_summary is resent so a completed-only row is self-sufficient if the
    'running' PUT never landed. Off-thread; never raises."""
    try:
        tool = str(kwargs.get("tool_name") or "tool")
        if tool in _TOOLCALL_SKIP:
            return
        finished = _now_ms()
        raw_status = str(kwargs.get("status") or "ok").lower()
        payload: dict[str, Any] = {
            "tool": _utf8_truncate(tool, _TOOLCALL_TOOL_MAX_BYTES),
            "status": _TERMINAL_STATUS_MAP.get(raw_status, "error"),
            "args_summary": _summarize_args(kwargs.get("args")),
            "result_tail": _result_tail(kwargs.get("result")),
            "finished_at": finished,
        }
        dur = kwargs.get("duration_ms")
        if isinstance(dur, (int, float)) and dur >= 0:
            payload["duration_ms"] = int(dur)
            payload["started_at"] = finished - int(dur)  # keep finished_at >= started_at
        err = kwargs.get("error_message")
        if err:
            payload["error_message"] = _utf8_truncate(
                _redact_display(str(err)), _TOOLCALL_ERR_MAX_BYTES
            )
        sid = kwargs.get("session_id")
        if sid:
            payload["session_id"] = str(sid)
        tid = kwargs.get("turn_id")
        if tid:
            payload["turn_id"] = str(tid)
        _enqueue_receipt(_sanitize_tool_call_id(kwargs.get("tool_call_id")), payload)
    except Exception as e:
        logger.debug("canvas post_tool_call receipt error: %s", e)


def subagent_start(**kwargs) -> None:
    return  # muted
    # original muted below
    goal = kwargs.get("child_goal") or ""
    child = kwargs.get("child_session_id") or kwargs.get("child_subagent_id") or ""
    _safe_post_text(f"🧬 subagent start · `{child}`\n{_clip(goal, 1500)}")


def subagent_stop(**kwargs) -> None:
    return  # muted
    # original muted below
    status = kwargs.get("status") or kwargs.get("child_status") or "done"
    summary = kwargs.get("child_summary") or ""
    duration = kwargs.get("duration_ms")
    dur = f" · {duration}ms" if duration is not None else ""
    _safe_post_text(f"🧬 subagent {status}{dur}\n{_clip(summary, 2000)}")


def api_request_error(**kwargs) -> None:
    return  # muted
    # original muted below
    model = kwargs.get("model") or ""
    status = kwargs.get("status_code")
    reason = kwargs.get("reason") or ""
    err = kwargs.get("error") or {}
    _safe_post_text(
        f"⚠️ model error · {model} · status={status}\n{reason}\n{_clip(err, 1200)}"
    )


# ---------------------------------------------------------------------------
# Inbound poller: Canvas human messages → Telegram home (gateway-visible)
# ---------------------------------------------------------------------------

def _mirror_pending_to_telegram(text: str, message_id: str) -> None:
    """Inject Canvas human text as a real agent turn via local webhook.

    IMPORTANT: `hermes send` is outbound-only (no agent loop). That caused
    Telegram spam with zero replies. We POST to the gateway webhook route
    `canvas-human`, which runs the agent and delivers the reply to Telegram;
    `post_llm_call` also mirrors the assistant answer into Canvas chat.
    """
    import json
    import urllib.error
    import urllib.request

    url = os.environ.get(
        "HERMES_CANVAS_INJECT_URL",
        "http://127.0.0.1:8644/webhooks/canvas-human",
    )
    payload = {
        "message_id": message_id,
        "text": text,
        "source": "hermes-canvas",
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            # Idempotency key — webhook skips duplicate delivery IDs
            "X-Request-ID": f"canvas-{message_id}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            logger.info(
                "canvas inject ok mid=%s status=%s body=%s",
                message_id,
                resp.status,
                raw[:200],
            )
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        logger.warning("canvas inject HTTP %s mid=%s: %s", e.code, message_id, err[:300])
        raise
    except Exception as e:
        logger.warning("canvas inject failed mid=%s: %s", message_id, e)
        raise



def _is_gateway_process() -> bool:
    """Poller must only run inside the long-lived gateway, not per-agent workers."""
    import sys
    argv = " ".join(sys.argv).lower()
    if "gateway" in argv:
        return True
    # Some gateway entrypoints only expose -m hermes_cli.main gateway run
    if "hermes_cli.main" in argv and "run" in argv and "chat" not in argv:
        # still too broad — prefer explicit markers
        pass
    if os.environ.get("HERMES_GATEWAY_MODE", "").lower() in {"1", "true", "yes"}:
        return True
    # Heuristic: gateway process name in /proc
    try:
        import pathlib
        cmd = pathlib.Path(f"/proc/{os.getpid()}/cmdline").read_bytes().replace(b"\x00", b" ").decode(errors="ignore").lower()
        if "gateway" in cmd:
            return True
    except Exception:
        pass
    return False


def _acquire_poller_lock() -> bool:
    """Cross-process singleton lock so only one canvas poller exists."""
    import fcntl
    lock_path = Path.home() / ".hermes/plugins/canvas/.poller.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(lock_path), os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(fd)
        return False
    # Keep fd open for process lifetime (module-global)
    global _POLLER_LOCK_FD
    _POLLER_LOCK_FD = fd
    try:
        os.write(fd, f"{os.getpid()}\n".encode())
    except Exception:
        pass
    return True


def _poller_loop() -> None:
    global _CURSOR
    logger.info("canvas poller starting (ack-safe)")
    while True:
        try:
            client = get_client()
            if not client:
                time.sleep(5)
                continue
            res = client.get_updates(_CURSOR)
            messages = res.get("messages") or []
            _CURSOR = max(_CURSOR, int(res.get("cursor") or _CURSOR))
            delivered: list[str] = []
            for msg in messages:
                # Only mirror human-authored messages into Hermes.
                role = msg.get("role") or msg.get("author") or ""
                mid = str(msg.get("id") or msg.get("message_id") or "")
                body = msg.get("body") or msg.get("text") or ""
                if not body or not mid:
                    continue
                if role not in {"human", "user"}:
                    continue
                with _STATE_LOCK:
                    if mid in _SEEN_MESSAGE_IDS:
                        delivered.append(mid)  # already mirrored; still ack
                        continue
                    _SEEN_MESSAGE_IDS.add(mid)
                    if len(_SEEN_MESSAGE_IDS) > 5000:
                        _SEEN_MESSAGE_IDS.clear()
                        _SEEN_MESSAGE_IDS.add(mid)
                try:
                    _mirror_pending_to_telegram(str(body), mid)
                    delivered.append(mid)
                except Exception as inject_err:
                    # Allow retry: forget SEEN so a later tick can re-inject
                    with _STATE_LOCK:
                        _SEEN_MESSAGE_IDS.discard(mid)
                    logger.warning("canvas inject failed for %s: %s", mid, inject_err)
            if delivered:
                try:
                    client.ack_messages(delivered)
                except Exception as e:
                    logger.warning("canvas ack failed: %s", e)
        except Exception as e:
            logger.warning("canvas poller error: %s", e)
        time.sleep(float(os.environ.get("HERMES_CANVAS_POLL_INTERVAL_S", "2")))


def _ensure_poller() -> None:
    logger.info("canvas tools poller retired — platform adapter owns inbound")
    return
    # noqa: dead code below kept for reference
    global _POLLER_STARTED
    with _STATE_LOCK:
        if _POLLER_STARTED:
            return
        if os.environ.get("HERMES_CANVAS_DISABLE_POLLER", "").lower() in {"1", "true", "yes"}:
            logger.info("canvas poller disabled via HERMES_CANVAS_DISABLE_POLLER")
            return
        if not _is_gateway_process():
            logger.debug("canvas poller skipped (not gateway process)")
            return
        if not _acquire_poller_lock():
            logger.info("canvas poller skipped (another process holds lock)")
            return
        _POLLER_STARTED = True
        t = threading.Thread(target=_poller_loop, name="hermes-canvas-poller", daemon=True)
        t.start()
        logger.info("canvas poller thread started pid=%s", os.getpid())


# ---------------------------------------------------------------------------
# Jobs reporter: register scheduled work + report runs into the Canvas cron
# viewer. The Canvas only *reports* runs; hermes' own scheduler owns firing.
#
# Two sources of truth are surfaced:
#   1. A connector heartbeat ("canvas-connector-heartbeat") — proof the plugin
#      is loaded and alive in the gateway; reported hourly.
#   2. Real hermes cron jobs, mirrored from ~/.hermes/cron/jobs.json. We cannot
#      safely hook hermes' scheduler internals, so instead we observe each
#      job's persisted last_run_at/last_status and report the completed run
#      with its true timestamps. run_id is derived from (job id, last_run_at)
#      so re-observing the same run is idempotent server-side.
# ---------------------------------------------------------------------------

_JOBS_REPORTER_STARTED = False
_LOCK_FDS: dict[str, int] = {}
_HEARTBEAT_KEY = "canvas-connector-heartbeat"
_JOB_LOG_TAIL_BYTES = 16384
_CRON_JOBS_PATH = Path.home() / ".hermes/cron/jobs.json"
_CRON_OUTPUT_DIR = Path.home() / ".hermes/cron/output"


def _now_ms() -> int:
    return int(time.time() * 1000)


def _iso_to_ms(s: Any) -> Optional[int]:
    if not s or not isinstance(s, str):
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp() * 1000)
    except Exception:
        return None


def _cron_from_schedule(sched: dict) -> Optional[str]:
    """Best-effort cron string for a hermes schedule; None if not recurring."""
    kind = (sched or {}).get("kind")
    if kind == "cron":
        return sched.get("expr") or sched.get("display")
    if kind == "interval":
        m = int(sched.get("minutes") or 0)
        if m <= 0:
            return None
        if m < 60 and 60 % m == 0:
            return f"*/{m} * * * *"
        if m == 60:
            return "0 * * * *"
        if m % 60 == 0 and (m // 60) < 24:
            return f"0 */{m // 60} * * *"
        # Not cleanly cron-expressible — surface the human display instead.
        return sched.get("display") or f"every {m}m"
    return None


def _cron_run_tail(job_id: str) -> str:
    """Newest per-run output file for a cron job, bounded to the log limit."""
    try:
        d = _CRON_OUTPUT_DIR / str(job_id)
        files = sorted(d.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            return ""
        text = files[0].read_text(errors="replace")
        return text[-(_JOB_LOG_TAIL_BYTES - 256):]
    except Exception:
        return ""


def _load_cron_jobs() -> list[dict]:
    try:
        data = json.loads(_CRON_JOBS_PATH.read_text())
        jobs = data.get("jobs") if isinstance(data, dict) else data
        return jobs or []
    except Exception as e:
        logger.debug("canvas jobs reporter: could not read cron jobs: %s", e)
        return []


@contextlib.contextmanager
def run_reporter(client, key: str, *, summary: str = ""):
    """Wrap a unit of work: report started, then succeeded/failed with duration.

    Yields a `log(line)` callable whose accumulated text is sent (bounded) as
    the run's log_tail. Re-raises any exception after reporting failure.
    """
    run_id = uuid.uuid4().hex
    started = _now_ms()
    lines: list[str] = []
    try:
        client.report_run(key, {"key": key, "run_id": run_id, "status": "started", "started_at": started})
    except Exception as e:
        logger.warning("canvas run_reporter start failed key=%s: %s", key, e)

    status = "succeeded"
    err: Optional[BaseException] = None
    try:
        yield lines.append
    except BaseException as e:  # report then propagate
        status, err = "failed", e
        lines.append(f"ERROR: {e!r}")
        raise
    finally:
        finished = _now_ms()
        tail = "\n".join(str(x) for x in lines)[-(_JOB_LOG_TAIL_BYTES - 256):]
        note = (summary or key) + f" · {finished - started}ms" + (" · failed" if err else "")
        try:
            client.report_run(
                key,
                {
                    "key": key,
                    "run_id": run_id,
                    "status": status,
                    "started_at": started,
                    "finished_at": finished,
                    "summary": note[:500],
                    "log_tail": tail,
                },
            )
        except Exception as e:
            logger.warning("canvas run_reporter finish failed key=%s: %s", key, e)


def _register_known_jobs(client) -> list[dict]:
    """Register the heartbeat + every recurring hermes cron job. Returns the
    list of recurring cron jobs (id/name/cron/last_run_at) we will mirror."""
    try:
        client.register_job(
            _HEARTBEAT_KEY,
            {
                "key": _HEARTBEAT_KEY,
                "name": "Canvas connector heartbeat",
                "schedule_cron": "0 * * * *",
                "description": "Liveness beat from the Hermes gateway canvas plugin; also mirrors hermes cron runs.",
                "source": "hermes-box canvas plugin",
                "status": "active",
            },
        )
    except Exception as e:
        logger.warning("canvas heartbeat register failed: %s", e)

    recurring: list[dict] = []
    for j in _load_cron_jobs():
        jid = j.get("id")
        if not jid:
            continue
        cron = _cron_from_schedule(j.get("schedule") or {})
        if cron is None:
            # One-shot / non-recurring (e.g. a completed 'once' job) — not a
            # scheduled job for the cron viewer; skip.
            continue
        key = f"cron-{jid}"
        status = "active" if j.get("enabled") and not j.get("paused_at") else "paused"
        try:
            client.register_job(
                key,
                {
                    "key": key,
                    "name": str(j.get("name") or jid),
                    "schedule_cron": cron,
                    "description": f"hermes cron job {jid} ({j.get('schedule_display') or cron}).",
                    "source": "hermes cron (hermes-box)",
                    "status": status,
                },
            )
        except Exception as e:
            logger.warning("canvas cron register failed key=%s: %s", key, e)
        recurring.append({"id": jid, "name": j.get("name") or jid, "cron": cron})
    return recurring


def _mirror_cron_runs(client, tracked: dict[str, str]) -> list[str]:
    """Report any cron run not yet seen (by last_run_at). Returns keys reported."""
    reported: list[str] = []
    for j in _load_cron_jobs():
        jid = j.get("id")
        if not jid or _cron_from_schedule(j.get("schedule") or {}) is None:
            continue
        last = j.get("last_run_at")
        if not last:
            continue
        key = f"cron-{jid}"
        if tracked.get(key) == last:
            continue
        ok = (j.get("last_status") in (None, "ok")) and not j.get("last_error")
        status = "succeeded" if ok else "failed"
        started = _iso_to_ms(last) or _now_ms()
        payload = {
            "key": key,
            "run_id": f"{jid}-{last}",
            "status": status,
            "started_at": started,
            "finished_at": started,
            "summary": f"{j.get('name') or jid} · {status} · {last}"[:500],
            "log_tail": _cron_run_tail(jid) or (str(j.get("last_error"))[:2000] if j.get("last_error") else ""),
        }
        try:
            client.report_run(key, payload)
            tracked[key] = last
            reported.append(key)
        except Exception as e:
            logger.warning("canvas cron run report failed key=%s: %s", key, e)
    return reported


def _jobs_reporter_loop() -> None:
    logger.info("canvas jobs reporter starting pid=%s", os.getpid())
    tick_s = float(os.environ.get("HERMES_CANVAS_JOBS_TICK_S", "300"))
    heartbeat_every = max(1, int(round(3600 / tick_s)))  # ~hourly heartbeat
    tracked: dict[str, str] = {}
    i = 0
    # Prime registrations once so the viewer is populated immediately on boot.
    client = get_client()
    if client:
        try:
            _register_known_jobs(client)
        except Exception as e:
            logger.warning("canvas jobs initial register failed: %s", e)
    while True:
        try:
            client = get_client()
            if not client:
                time.sleep(tick_s)
                continue
            mirrored = _mirror_cron_runs(client, tracked)
            if i % heartbeat_every == 0:
                recurring = _register_known_jobs(client)
                with run_reporter(client, _HEARTBEAT_KEY, summary="connector alive") as log:
                    log(f"gateway pid {os.getpid()} alive at {datetime.now(timezone.utc).isoformat()}")
                    log(f"recurring cron jobs tracked: {len(recurring)}")
                    for r in recurring:
                        log(f"  {r['id']} {r['name']} [{r['cron']}]")
                    if mirrored:
                        log(f"runs mirrored this cycle: {', '.join(mirrored)}")
        except Exception as e:
            logger.warning("canvas jobs reporter error: %s", e)
        i += 1
        time.sleep(tick_s)


def _acquire_named_lock(name: str) -> bool:
    """Cross-process singleton lock, one fd held for process lifetime."""
    import fcntl
    lock_path = Path.home() / ".hermes/plugins/canvas" / name
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(lock_path), os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(fd)
        return False
    _LOCK_FDS[name] = fd
    try:
        os.write(fd, f"{os.getpid()}\n".encode())
    except Exception:
        pass
    return True


def _ensure_jobs_reporter() -> None:
    global _JOBS_REPORTER_STARTED
    with _STATE_LOCK:
        if _JOBS_REPORTER_STARTED:
            return
        if os.environ.get("HERMES_CANVAS_DISABLE_JOBS_REPORTER", "").lower() in {"1", "true", "yes"}:
            logger.info("canvas jobs reporter disabled via HERMES_CANVAS_DISABLE_JOBS_REPORTER")
            return
        if not _is_gateway_process():
            logger.debug("canvas jobs reporter skipped (not gateway process)")
            return
        if not _acquire_named_lock(".jobs_reporter.lock"):
            logger.info("canvas jobs reporter skipped (another process holds lock)")
            return
        _JOBS_REPORTER_STARTED = True
        t = threading.Thread(target=_jobs_reporter_loop, name="hermes-canvas-jobs", daemon=True)
        t.start()
        logger.info("canvas jobs reporter thread started pid=%s", os.getpid())


# ---------------------------------------------------------------------------
# Status + memory reporter: feed the Settings tab's Agent and Memory panels.
#
# Two PUT surfaces on the Convex service-token path (docs/agent-api.md
# Infrastructure section):
#   PUT /agent/status  — the gateway's runtime state (model, provider, context
#                        usage, toolsets, platforms, sessions, memory provider).
#                        Sent every ~5 min AND opportunistically after each turn
#                        (debounced >=60s) so the panel tracks the live route.
#   PUT /agent/memory  — a full mirror of the host's curated memory store
#                        (MEMORY.md + USER.md, §-delimited). Full sync on start
#                        and every ~15 min when the store changed.
#
# Runs only inside the long-lived gateway process (same guard + flock pattern
# as the jobs reporter) so exactly one reporter exists across worker forks.
# Every field is best-effort: we omit what the runtime doesn't truthfully
# expose rather than fabricate — the UI renders "not reported" honestly.
# ---------------------------------------------------------------------------

_STATUS_REPORTER_STARTED = False
_STATUS_WAKE = threading.Event()
_LAST_TURN: dict[str, Any] = {}
_LAST_STATUS_MS = 0
_LAST_MEMORY_SIG: Optional[str] = None
_RUNNER_REF: Any = None
_RUNNER_MISS_LOGGED = False

_MEMORY_DIR = Path.home() / ".hermes/memories"
_MEMORY_FILES = (("MEMORY.md", "memory"), ("USER.md", "user"))
_MEMORY_DELIM = "\n§\n"
_STATUS_MEMORY_MAX_ENTRIES = 500
_STATUS_BODY_MAX_BYTES = 16 * 1024


def _note_turn(model: str, platform: str) -> None:
    """Record the latest turn's route and wake the reporter (debounced there)."""
    with _STATE_LOCK:
        if model:
            _LAST_TURN["model"] = str(model)
        if platform:
            _LAST_TURN["platform"] = str(platform)
        _LAST_TURN["ts"] = _now_ms()
    _STATUS_WAKE.set()


def _gateway_version() -> str:
    try:
        import importlib.metadata as _md
        return _md.version("hermes-agent")
    except Exception:
        return ""


def _process_uptime_s() -> Optional[float]:
    try:
        with open(f"/proc/{os.getpid()}/stat") as f:
            starttime = int(f.read().split()[21])
        hz = os.sysconf("SC_CLK_TCK")
        with open("/proc/uptime") as f:
            up = float(f.read().split()[0])
        return max(0.0, up - starttime / hz)
    except Exception:
        return None


def _load_gateway_config() -> dict:
    try:
        from hermes_cli.config import load_config
        cfg = load_config()
        if isinstance(cfg, dict):
            return cfg
    except Exception:
        pass
    try:
        import yaml
        p = Path.home() / ".hermes/config.yaml"
        data = yaml.safe_load(p.read_text()) if p.exists() else {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _find_gateway_runner() -> Any:
    """Locate the single live GatewayRunner in-process (gc scan, cached on hit).

    The plugin runs inside the gateway process but PluginContext does not hand
    us the runner, and register() fires before the runner is constructed — so we
    re-scan on each call until we find it, then cache for the process lifetime.
    Returns None outside the gateway or before the runner exists.
    """
    global _RUNNER_REF, _RUNNER_MISS_LOGGED
    if _RUNNER_REF is not None:
        return _RUNNER_REF
    try:
        import gc
        from gateway.run import GatewayRunner
        for obj in gc.get_objects():
            try:
                if isinstance(obj, GatewayRunner):
                    _RUNNER_REF = obj
                    logger.info("canvas status: gateway runner located (live agent cache reachable)")
                    return obj
            except Exception:
                continue
        if not _RUNNER_MISS_LOGGED:
            logger.info("canvas status: gateway runner not yet found; using config fallback (will retry)")
            _RUNNER_MISS_LOGGED = True
    except Exception as e:
        logger.debug("canvas status: gateway runner lookup failed: %s", e)
    return None


def _live_agent_and_sessions():
    """Return (most_recent_agent_or_None, sessions_active_or_None) from the
    runner's warm agent cache. Best-effort; both None if unreachable."""
    runner = _find_gateway_runner()
    if runner is None:
        return None, None
    cache = getattr(runner, "_agent_cache", None)
    lock = getattr(runner, "_agent_cache_lock", None)
    if cache is None or lock is None:
        return None, None
    try:
        with lock:
            items = list(cache.items())
    except Exception:
        return None, None
    sessions_active = len(items)
    agent = None
    for _key, val in reversed(items):  # OrderedDict: most-recently-used last
        cand = val[0] if isinstance(val, (list, tuple)) and val else None
        if cand is not None and getattr(cand, "model", None):
            agent = cand
            break
    return agent, sessions_active


def _enabled_platforms(cfg: dict) -> list:
    """Platforms the gateway actually serves: config `platforms` enabled=true
    plus credential-gated adapters whose token is present in the environment."""
    out: list = []
    plats = cfg.get("platforms") if isinstance(cfg, dict) else None
    if isinstance(plats, dict):
        for name, spec in plats.items():
            if isinstance(spec, dict) and spec.get("enabled"):
                out.append(str(name))
    env_gated = {
        "telegram": "TELEGRAM_BOT_TOKEN",
        "signal": "SIGNAL_ACCOUNT",
        "email": "EMAIL_ADDRESS",
    }
    for name, env in env_gated.items():
        if os.environ.get(env) and name not in out:
            out.append(name)
    return out


def _configured_toolsets(cfg: dict) -> list:
    """The primary (cli) enabled toolset set from platform_toolsets."""
    pt = cfg.get("platform_toolsets") if isinstance(cfg, dict) else None
    if isinstance(pt, dict):
        cli = pt.get("cli")
        if isinstance(cli, list) and cli:
            return [str(x) for x in cli]
    return []


def _model_fallbacks(cfg: dict) -> list:
    fb = cfg.get("fallback_model") if isinstance(cfg, dict) else None
    out: list = []
    if isinstance(fb, list):
        for item in fb:
            if isinstance(item, dict):
                prov = str(item.get("provider") or "").strip()
                model = str(item.get("model") or "").strip()
                if model:
                    out.append(f"{prov}/{model}" if prov else model)
    return out


def _build_status_payload() -> Optional[dict]:
    cfg = _load_gateway_config()
    model_cfg = cfg.get("model") if isinstance(cfg.get("model"), dict) else {}
    agent_cfg = cfg.get("agent") if isinstance(cfg.get("agent"), dict) else {}

    agent, sessions_active = _live_agent_and_sessions()

    model = ""
    provider = ""
    context_used = 0
    context_max = 0
    if agent is not None:
        model = str(getattr(agent, "model", "") or "")
        provider = str(getattr(agent, "provider", "") or "")
        try:
            from agent.context_breakdown import compute_session_context_breakdown
            bd = compute_session_context_breakdown(agent)
            context_used = int(bd.get("context_used") or 0)
            context_max = int(bd.get("context_max") or 0)
        except Exception:
            comp = getattr(agent, "context_compressor", None)
            if comp is not None:
                context_used = int(getattr(comp, "last_prompt_tokens", 0) or 0)
                context_max = int(getattr(comp, "context_length", 0) or 0)

    # Fall back to the last observed turn, then to configured defaults.
    with _STATE_LOCK:
        last_model = str(_LAST_TURN.get("model") or "")
    model = model or last_model or str(model_cfg.get("default") or model_cfg.get("model") or "")
    provider = provider or str(model_cfg.get("provider") or "")
    if not context_max:
        cm = model_cfg.get("context_length")
        if isinstance(cm, int) and cm > 0:
            context_max = cm

    if not model or not provider:
        # The two required fields are unknowable — skip rather than send a
        # half-blank singleton.
        return None

    payload: dict[str, Any] = {"model": model, "provider": provider}

    effort = str(agent_cfg.get("reasoning_effort") or "").strip()
    if effort:
        payload["effort"] = effort

    fallbacks = _model_fallbacks(cfg)
    if fallbacks:
        payload["fallbacks"] = fallbacks

    ctx: dict[str, int] = {}
    if context_used > 0:
        ctx["used_tokens"] = context_used
    if context_max > 0:
        ctx["max_tokens"] = context_max
    if ctx:
        payload["context"] = ctx

    gw: dict[str, Any] = {}
    ver = _gateway_version()
    if ver:
        gw["version"] = ver
    up = _process_uptime_s()
    if up is not None:
        gw["uptime_s"] = round(up, 1)
    if gw:
        payload["gateway"] = gw

    toolsets = _configured_toolsets(cfg)
    if toolsets:
        payload["toolsets"] = toolsets
    platforms = _enabled_platforms(cfg)
    if platforms:
        payload["platforms"] = platforms
    if sessions_active is not None:
        payload["sessions_active"] = int(sessions_active)

    # Curated memory is the builtin file store (MEMORY.md/USER.md); no external
    # provider is configured, so there is no recall budget to report.
    mem_cfg = cfg.get("memory") if isinstance(cfg.get("memory"), dict) else {}
    mem_provider = str(mem_cfg.get("provider") or "builtin")
    payload["memory"] = {"provider": mem_provider}

    return payload


def _redact_memory(text: str) -> str:
    """Defensive secret masking before mirroring memory off-host. Safe on any
    string — non-secret text passes through unchanged."""
    try:
        from agent.redact import redact_sensitive_text
        return redact_sensitive_text(text, force=True, file_read=True)
    except Exception:
        return text


def _read_memory_entries() -> list:
    """Map the §-delimited MEMORY.md / USER.md stores to sync entries.

    entry_id is a stable content hash (RAW content, pre-redaction) so an
    unchanged entry keeps its id across syncs; a full:true sync then removes
    rows whose entry no longer exists. The files carry no per-entry timestamps,
    so created_at/updated_at both take the file mtime — the best truth on disk.
    """
    out: list = []
    for fn, tag in _MEMORY_FILES:
        p = _MEMORY_DIR / fn
        if not p.exists():
            continue
        try:
            raw = p.read_text(encoding="utf-8")
            mtime_ms = int(p.stat().st_mtime * 1000)
        except Exception:
            continue
        entries = [e.strip() for e in raw.split(_MEMORY_DELIM) if e.strip()]
        entries = list(dict.fromkeys(entries))  # match the store's dedupe
        for e in entries:
            eid = f"{fn}:{hashlib.sha1(e.encode('utf-8')).hexdigest()[:16]}"
            out.append(
                {
                    "entry_id": eid,
                    "content": _redact_memory(e),
                    "tags": [tag],
                    "source": fn,
                    "created_at": mtime_ms,
                    "updated_at": mtime_ms,
                }
            )
    return out


def _maybe_sync_memory(client, *, force: bool) -> Optional[int]:
    """Full-mirror the memory store if it changed (or force). Returns the entry
    count shipped, or None if skipped/failed."""
    global _LAST_MEMORY_SIG
    entries = _read_memory_entries()
    truncated = False
    if len(entries) > _STATUS_MEMORY_MAX_ENTRIES:
        entries.sort(key=lambda e: e.get("updated_at") or 0, reverse=True)
        entries = entries[:_STATUS_MEMORY_MAX_ENTRIES]
        truncated = True
    sig = hashlib.sha1(
        json.dumps(
            [(e["entry_id"], e["content"], e["updated_at"]) for e in entries],
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    if not force and sig == _LAST_MEMORY_SIG:
        return None
    try:
        client.sync_memory({"entries": entries, "full": True})
        _LAST_MEMORY_SIG = sig
        if truncated:
            logger.warning(
                "canvas memory sync truncated to %d most-recent entries",
                _STATUS_MEMORY_MAX_ENTRIES,
            )
        logger.info("canvas memory synced: %d entries (full)", len(entries))
        return len(entries)
    except Exception as e:
        logger.warning("canvas memory sync failed: %s", e)
        return None


def _send_status(client) -> bool:
    global _LAST_STATUS_MS
    payload = _build_status_payload()
    if not payload:
        logger.debug("canvas status: nothing reportable this tick")
        return False
    # Defensively enforce the 16KB body cap (drop optional toolsets first).
    try:
        if len(json.dumps(payload).encode("utf-8")) > _STATUS_BODY_MAX_BYTES:
            payload.pop("toolsets", None)
    except Exception:
        pass
    try:
        client.report_status(payload)
        _LAST_STATUS_MS = _now_ms()
        logger.info(
            "canvas status reported: model=%s provider=%s context=%s sessions=%s",
            payload.get("model"),
            payload.get("provider"),
            "yes" if payload.get("context") else "no",
            payload.get("sessions_active", "n/a"),
        )
        return True
    except Exception as e:
        logger.warning("canvas status report failed: %s", e)
        return False


def _status_reporter_loop() -> None:
    logger.info("canvas status+memory reporter starting pid=%s", os.getpid())
    status_tick_s = float(os.environ.get("HERMES_CANVAS_STATUS_TICK_S", "300"))
    memory_tick_s = float(os.environ.get("HERMES_CANVAS_MEMORY_TICK_S", "900"))
    debounce_ms = int(float(os.environ.get("HERMES_CANVAS_STATUS_DEBOUNCE_S", "60")) * 1000)

    # Prime both surfaces immediately on boot.
    client = get_client()
    if client:
        _send_status(client)
        _maybe_sync_memory(client, force=True)
    last_memory_ms = _now_ms()

    # register() fires before the GatewayRunner is constructed, so the boot
    # status above can't see the live agent cache. Re-report once shortly after
    # boot to fill in context/sessions as soon as the runner exists.
    bootstrap_s = float(os.environ.get("HERMES_CANVAS_STATUS_BOOTSTRAP_S", "25"))
    if bootstrap_s > 0 and not _STATUS_WAKE.wait(timeout=bootstrap_s):
        client = get_client()
        if client:
            _send_status(client)

    while True:
        woke = _STATUS_WAKE.wait(timeout=status_tick_s)
        _STATUS_WAKE.clear()
        try:
            client = get_client()
            if not client:
                continue
            now = _now_ms()
            # Turn-triggered wake honours the debounce; periodic tick always sends.
            if not (woke and (now - _LAST_STATUS_MS) < debounce_ms):
                _send_status(client)
            if (_now_ms() - last_memory_ms) >= memory_tick_s * 1000:
                _maybe_sync_memory(client, force=False)
                last_memory_ms = _now_ms()
        except Exception as e:
            logger.warning("canvas status reporter error: %s", e)


def _ensure_status_reporter() -> None:
    global _STATUS_REPORTER_STARTED
    with _STATE_LOCK:
        if _STATUS_REPORTER_STARTED:
            return
        if os.environ.get("HERMES_CANVAS_DISABLE_STATUS_REPORTER", "").lower() in {"1", "true", "yes"}:
            logger.info("canvas status reporter disabled via HERMES_CANVAS_DISABLE_STATUS_REPORTER")
            return
        if not _is_gateway_process():
            logger.debug("canvas status reporter skipped (not gateway process)")
            return
        if not _acquire_named_lock(".status_reporter.lock"):
            logger.info("canvas status reporter skipped (another process holds lock)")
            return
        _STATUS_REPORTER_STARTED = True
        t = threading.Thread(target=_status_reporter_loop, name="hermes-canvas-status", daemon=True)
        t.start()
        logger.info("canvas status reporter thread started pid=%s", os.getpid())


def register(ctx) -> None:
    if not check_canvas_requirements():
        logger.warning(
            "canvas plugin: missing HERMES_CANVAS_BASE_URL / HERMES_SERVICE_TOKEN; not registering"
        )
        return

    for name, schema, handler, emoji in _TOOLS:
        ctx.register_tool(
            name=name,
            toolset="canvas",
            schema=schema,
            handler=handler,
            check_fn=check_canvas_requirements,
            emoji=emoji,
            description=schema.get("description", ""),
        )

    ctx.register_hook("on_session_start", on_session_start)
    ctx.register_hook("on_session_end", on_session_end)
    ctx.register_hook("on_session_finalize", on_session_finalize)
    ctx.register_hook("pre_llm_call", pre_llm_call)
    ctx.register_hook("post_llm_call", post_llm_call)
    ctx.register_hook("pre_tool_call", pre_tool_call)
    ctx.register_hook("post_tool_call", post_tool_call)
    ctx.register_hook("subagent_start", subagent_start)
    ctx.register_hook("subagent_stop", subagent_stop)
    ctx.register_hook("api_request_error", api_request_error)

    _ensure_poller()
    _ensure_jobs_reporter()
    _ensure_status_reporter()
    logger.info("canvas plugin registered")
