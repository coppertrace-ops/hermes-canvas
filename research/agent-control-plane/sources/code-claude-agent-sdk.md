# Claude Agent SDK — headless run primitive & structured events

**Primary URLs:**
- https://code.claude.com/docs/en/agent-sdk/python (Python SDK reference)
- https://platform.claude.com/docs/en/agent-sdk/sessions (sessions)
- https://platform.claude.com/docs/en/agent-sdk/streaming-output (streaming)

**Accessed:** 2026-07-13

## Verbatim quotes (PRIMARY / official)

- `query()` "Returns an async iterator that yields messages as they arrive. Each call to query() starts fresh with no memory of previous interactions unless you pass continue_conversation=True or resume in ClaudeAgentOptions." — headless run primitive + resume by session ID.
- `ClaudeSDKClient` "Maintains a conversation session across multiple exchanges." Methods include `receive_messages()`, `receive_response()`, and `async def interrupt(self)` — programmatic stop/interrupt mid-task.
- Structured message union: `Message = UserMessage | AssistantMessage | SystemMessage | ResultMessage | StreamEvent | RateLimitEvent` — STRUCTURED typed events, not terminal scraping.
- `ResultMessage` carries `subtype` ("success"/"error_*"), `duration_ms`, `total_cost_usd`, `usage`, `session_id`, `is_error`, `num_turns` — structured run-result provenance.
- Partial streaming: setting `include_partial_messages` yields `StreamEvent` messages "containing raw API events as they arrive."
- Human-approval gate: `can_use_tool` callback "is the SDK replacement for the interactive permission prompt"; returns `PermissionResultAllow` (can rewrite `updated_input`) or `PermissionResultDeny(interrupt=True)`. Plus `hooks` to "intercept tool calls before execution."

## Confidence
- HIGH: SDK gives a headless run primitive with resumable sessions, structured typed message/tool events, interrupt, and programmatic approve/deny — the raw building blocks a control plane would consume. It is a LIBRARY (BYO-compute / BYO-UI), not a hosted dashboard.
