"""Shared Canvas HTTP client for platform + tools plugins."""
from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

logger = logging.getLogger("hermes.plugins.canvas")


class CanvasError(Exception):
    def __init__(self, status: int, code: str, message: str, detail: Any = None):
        super().__init__(f"{status} {code}: {message}")
        self.status = status
        self.code = code
        self.message = message
        self.detail = detail


class CanvasClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        service_token: Optional[str] = None,
        timeout_s: float = 30.0,
    ) -> None:
        self.base_url = (base_url or os.environ.get("HERMES_CANVAS_BASE_URL", "")).rstrip("/")
        self.service_token = service_token or os.environ.get("HERMES_SERVICE_TOKEN", "")
        self.timeout_s = timeout_s
        if not self.base_url:
            raise RuntimeError("HERMES_CANVAS_BASE_URL is required")
        if not self.service_token:
            raise RuntimeError("HERMES_SERVICE_TOKEN is required")

    def _request(
        self,
        method: str,
        path: str,
        *,
        query: Optional[dict[str, Any]] = None,
        body: Any = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        if query:
            q = {k: str(v) for k, v in query.items() if v is not None}
            if q:
                url = f"{url}?{urllib.parse.urlencode(q)}"
        data = None
        headers = {
            "Authorization": f"Bearer {self.service_token}",
            "Accept": "application/json",
        }
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
                raw = resp.read().decode("utf-8") or "{}"
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
                err = parsed.get("error") or {}
                raise CanvasError(
                    e.code,
                    str(err.get("code") or "http_error"),
                    str(err.get("message") or e.reason),
                    err.get("detail"),
                ) from None
            except CanvasError:
                raise
            except Exception:
                raise CanvasError(e.code, "http_error", raw or str(e.reason)) from None
        except urllib.error.URLError as e:
            raise CanvasError(0, "network_error", str(e.reason or e)) from None

    def get_updates(self, cursor: int = 0) -> dict:
        return self._request("GET", "/agent/updates", query={"cursor": cursor})

    def post_message(self, payload: dict) -> dict:
        return self._request("POST", "/agent/messages", body=payload)

    def post_text(self, text: str) -> dict:
        return self.post_message({"text": text})

    def post_stream(self, stream_id: str, delta: str = "", *, done: bool = False, text: str = "") -> dict:
        body: dict[str, Any] = {"stream_id": stream_id, "done": done}
        if delta:
            body["delta"] = delta
        if text:
            body["text"] = text
        return self.post_message(body)

    def ack_messages(self, message_ids: list) -> dict:
        return self._request("POST", "/agent/updates/ack", body={"message_ids": list(message_ids)})

    def list_artifacts(self) -> list:
        return self._request("GET", "/agent/artifacts").get("artifacts", [])

    def read_artifact(self, artifact_id: str, seq: Optional[int] = None) -> dict:
        return self._request(
            "GET",
            f"/agent/artifacts/{urllib.parse.quote(artifact_id, safe='')}",
            query={"seq": seq} if seq is not None else None,
        )

    def create_artifact(self, payload: dict) -> dict:
        return self._request("POST", "/agent/artifacts", body=payload)

    def update_artifact(self, artifact_id: str, payload: dict) -> dict:
        return self._request(
            "PATCH",
            f"/agent/artifacts/{urllib.parse.quote(artifact_id, safe='')}",
            body=payload,
        )

    def archive_artifact(self, artifact_id: str, why: str) -> dict:
        return self._request(
            "POST",
            f"/agent/artifacts/{urllib.parse.quote(artifact_id, safe='')}/archive",
            body={"why": why},
        )

    def register_job(self, key: str, payload: dict) -> dict:
        return self._request(
            "PUT",
            f"/agent/jobs/{urllib.parse.quote(key, safe='')}",
            body=payload,
        )

    def report_run(self, key: str, payload: dict) -> dict:
        return self._request(
            "POST",
            f"/agent/jobs/{urllib.parse.quote(key, safe='')}/runs",
            body=payload,
        )

    def report_status(self, payload: dict) -> dict:
        """PUT the gateway's self-reported runtime state (singleton upsert)."""
        return self._request("PUT", "/agent/status", body=payload)

    def sync_memory(self, payload: dict) -> dict:
        """PUT a bulk mirror of the host memory store. full:true replaces."""
        return self._request("PUT", "/agent/memory", body=payload)


_client: Optional[CanvasClient] = None


def get_client() -> Optional[CanvasClient]:
    global _client
    if _client is not None:
        return _client
    try:
        _client = CanvasClient()
        return _client
    except Exception as e:
        logger.warning("canvas client unavailable: %s", e)
        return None
