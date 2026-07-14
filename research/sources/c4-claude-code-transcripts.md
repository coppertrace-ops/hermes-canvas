# C4 — Claude Code / agent transcript legibility

**Accessed:** 2026-07-13
**Type:** community tooling + practitioner blog (Simon Willison)

## Sources
- https://simonw.substack.com/p/a-new-way-to-extract-detailed-transcripts (Simon Willison, practitioner)
- https://claude-dev.tools/docs/transcripts (claude-devtools, third-party OSS tool)
- https://claude-dev.tools/docs/tool-calls (same)
- https://code.claude.com/docs/en/agent-sdk/agent-loop (official Anthropic docs)

## Notes
How agent transcripts present work today, and why it's hard to read:

- In the terminal, Claude Code **collapses tool calls into one-line summaries** ("Read 3 files", "Edited 2 files", "Ran bash command"). This condensed view "makes it difficult to understand the full details of what the agent actually did." → legibility gap in the default surface.
- The `--verbose` flag "dumps raw JSON that includes internal system prompts and **thousands of lines of noise**." → the opposite failure: full trace is unreadable.
- Third-party **claude-devtools** exists precisely to bridge this: parses `~/.claude` session logs and renders a chronological conversation view with **specialized renderers per tool** — syntax-highlighted reads, **inline Edit diffs**, full Bash output, regex match highlighting, **recursive subagent trees**, rendered Markdown/Mermaid, per-turn token usage, visible thinking steps.

**Key signal:** the useful middle ground is neither the collapsed summary nor the raw JSON firehose — it's **per-tool rendered views, especially inline diffs for edits.** A whole cottage industry of transcript-rendering tools exists because raw agent transcripts aren't legible.

## Relevance to Hermes / Fable claim #3 (FOR)
The two default agent-trace surfaces both fail: collapsed = too little, verbose JSON = too much noise. What people build to fix it foregrounds **diffs of the artifact** (inline Edit diffs) — i.e., they reconstruct an artifact-diff view out of the trace because that's what's actually legible. This is direct evidence that **artifact-diff legibility > raw-trace legibility**, exactly Hermes' bet. Confidence: med (community tooling + one prominent practitioner; not a controlled study — flag as strong-signal anecdote).
