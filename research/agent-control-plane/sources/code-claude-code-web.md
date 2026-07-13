# Claude Code on the Web (Anthropic)

**Primary URLs:**
- https://claude.com/blog/claude-code-on-the-web (announcement)
- https://www.anthropic.com/engineering/claude-code-sandboxing (sandboxing)
- https://code.claude.com/docs/en/sandbox-environments (sandbox docs)

**Accessed:** 2026-07-13

## Verbatim quotes (PRIMARY / official)

- "assign multiple coding tasks to Claude that run on Anthropic-managed cloud infrastructure" (blog)
- "run multiple tasks in parallel across different repositories from a single interface" (blog) — multi-run surface.
- "real-time progress tracking, and you can actively steer Claude to adjust course as it's working" (blog) — live state + steer.
- "Every Claude Code task runs in an isolated sandbox environment with network and filesystem restrictions" (blog / sandboxing).
- "git interactions are handled through a secure proxy service that ensures Claude can only access authorized repositories" (blog) — credentials kept outside sandbox.
- "automatic PR creation and clear change summaries" (blog) — provenance via PR + summary.
- "Claude Code can use test-driven development to verify changes" (blog).
- "Cloud-based sessions share rate limits with all other Claude Code usage" (blog) — no separate metered price; consumes Pro/Max plan limits.
- "we're making Claude Code available on our iOS app so developers can explore coding with Claude on the go" (blog).
- Availability: "beta as a research preview for Pro and Max users"; connect a repo at claude.com/code.

## Confidence
- HIGH: Anthropic-managed hosted infra, parallel tasks from single interface, live progress + steer, sandbox, auto-PR, TDD, shared rate limits, iOS.
- MEDIUM: the browser UI is a task list / multi-run surface, but Anthropic does not publish a fleet "mission-control over hundreds of runs" dashboard here — provenance depth (commit/diff/deploy links) is summarized via PR rather than a structured provenance panel.
