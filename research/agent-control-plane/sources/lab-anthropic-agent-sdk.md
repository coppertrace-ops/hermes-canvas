# Anthropic Claude Agent SDK (observability + HITL)

**Accessed:** 2026-07-13
**Confidence:** high (official code.claude.com docs fetched cleanly)

## Sources
- Agent SDK overview — https://code.claude.com/docs/en/agent-sdk/overview
- Observability with OpenTelemetry — https://code.claude.com/docs/en/agent-sdk/observability
- Configure permissions — https://code.claude.com/docs/en/agent-sdk/permissions
- Handle approvals and user input — https://code.claude.com/docs/en/agent-sdk/user-input

## What it is
- "Build production AI agents with Claude Code as a library."
- "The Agent SDK gives you the same tools, agent loop, and context management that power Claude Code, programmable in Python and TypeScript."

## CRITICAL: observability = "bring your own backend"
- "The Agent SDK can export this data as OpenTelemetry traces, metrics, and log events to any backend that accepts the OpenTelemetry Protocol (OTLP), such as Honeycomb, Datadog, Grafana, Langfuse, or a self-hosted collector."
- "The SDK does not produce telemetry of its own." (CLI exports directly to your collector.)
- Off by default: "Telemetry is off until you set CLAUDE_CODE_ENABLE_TELEMETRY=1 and choose at least one exporter."
- "Tracing is in beta. Span names and attributes may change between releases."
→ No Anthropic-hosted agent-run trace viewer for the SDK. You stand up the backend.

## HITL is a native SDK primitive (mechanism, not UI)
- "The Claude Agent SDK provides permission controls to manage how Claude uses tools."
- "Both trigger your canUseTool callback, which pauses execution until you return a response."
- Deferred review supported ("callback can stay pending indefinitely... resume later from the persisted session"); PermissionRequest hook can "send external notifications (Slack, email, push)."
- Permission modes: default, dontAsk, acceptEdits, bypassPermissions, plan, auto.
→ Anthropic ships the approval mechanism; you build the review UI.

## Model-locked
Auth = Anthropic API key, or Claude via Bedrock / Vertex / Azure Foundry — all Claude models only. Not a cross-model framework. (MCP is the one open/cross-model piece.)

## Dev vs operator / pricing
Aimed at developers building agents. SDK library free (Commercial ToS); pay per token. Managed Agents = separate Anthropic-hosted REST runtime.
