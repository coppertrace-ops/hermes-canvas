# Source: Sculptor (Imbue) + omnara

**Accessed:** 2026-07-13

## PRIMARY — Sculptor (Imbue)

**https://imbue.com/sculptor/ + https://github.com/imbue-ai/sculptor** (confidence: high)
- Tagline: "The missing UI for parallel coding agents."
- "Every agent runs in its own container, so they can all execute code safely in parallel." (CONTAINERS, not just worktrees.)
- Pairing Mode: "With one click, Sculptor brings an agent's work from its container into your local repo, keeping your files and git state synced."
- "Test the agent's work instantly in your own dev environment and commit changes you like—all without losing your flow."
- Merge: "Sculptor will flag potential merge conflicts automatically" → "hand them back to the agent to resolve."
- **STRUCTURED STATE:** "Sculptor saves every agent session with its plans, chats, tool calls, and code changes all intact." "reopen a past session anytime."
- Agents: "Claude Code is supported today, and GPT-5 is next"; Codex via OpenAI API key.
- Pricing: "Sculptor is free while we're in beta. You'll just need Anthropic access—we support API keys or your Claude Pro/Max plan." (BYOK). (confidence: med, from search)

## PRIMARY — omnara (YC S25)

**https://github.com/omnara-ai/omnara + https://www.omnara.com/** (confidence: high)
- "Mission Control for Your AI Agents" / "Your AI workforce, in your pocket" / "The control plane for agents."
- "Get real-time visibility into what your agents are doing, and respond to their questions instantly from a single dashboard on web and mobile."
- "transforms your AI agents (Claude Code, Codex CLI, n8n, and more) from silent workers into communicative teammates." "Supports structured messaging alongside terminal output."
- Surfaces: web (claude.omnara.com), iOS, Android, CLI; custom agents via Python SDK, REST API, or MCP.
- License: **Apache 2.0** (OSS core); hosted omnara.com on Claude Agent SDK. Old repo archived Feb 2026.
- Pricing (secondary, re-verify): free tier ~10 agent sessions/mo; ~$9/mo unlimited; enterprise SSO. (confidence: med)

## READ

- Sculptor is the closest to legible-without-terminal in THIS cluster: containers + persisted "plans, chats, tool calls, code changes" = structured provenance, plus Pairing Mode for human takeover. omnara is the closest on the CONTROL-PLANE/remote-monitoring axis (phone approve/steer, structured messaging vs pure terminal). Both BYOK.
