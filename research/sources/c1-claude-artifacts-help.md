# Claude Help Center — "What are artifacts and how do I use them?" (OFFICIAL)

- URL: https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them
- Source type: official (Anthropic help center)
- Accessed: 2026-07-13

## Key claims
- **What/where:** Claude creates artifacts for "substantial, self-contained content," rendered in "a dedicated window separate from the main conversation."
- **Supported types:** Markdown/plain-text documents, code snippets, single-page HTML sites, SVG images, diagrams/flowcharts, and interactive React components.
- **Versioning:** Users can "Switch between different versions using the version selector." Editing a prior chat message forks "a different version of the conversation, with its own set of artifacts" — so version history is tied to the conversation timeline, not a separate VCS.
- **Persistence / storage:** On Pro/Max/Team/Enterprise, artifacts support persistent storage with a **20 MB storage limit per artifact**, **text-only input** ("no images, files, or binary data"). Storage can be **personal (user-private) or shared (visible to all users)**.
- **Publishing/sharing:** "open it and click 'Publish.'" Sharing AI-powered artifacts is free; usage counts against *each viewer's* own subscription limits, not the creator's.
- **Sandboxing:** The help doc does NOT document the iframe/CSP/origin mechanics; it only says AI-powered artifacts "run on Anthropic's infrastructure."

## Relevance to Hermes Canvas
- Confirms **version history is conversation-anchored** and that forking a message forks the artifact set — a clean model for "branching" a canvas, but note it couples canvas history to chat history.
- Confirms the persistence tier is **gated (paid), text-only, capped per-artifact**, and split into personal vs shared scopes — a useful default taxonomy for Hermes canvas storage.
- The published "Artifacts space" (claude.ai/catalog/artifacts) collects artifacts across conversations — an explicit answer to sprawl: a library view decoupled from any single chat.

## Confidence
High (official). Version-selector and persistence limits are directly stated. Note the official doc is silent on sandbox internals.
