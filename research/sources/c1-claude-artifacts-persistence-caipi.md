# Caipi Field Notes — "Can Claude Artifacts Save Data? What Persists and What Silently Disappears" (COMMUNITY)

- URL: https://caipi.ai/blog/can-claude-artifacts-save-data
- Source type: community / technical blog
- Accessed: 2026-07-13. States: doc checked June 2026; Artifacts launched June 2024; persistence added October 2025.

## Key claims
- **What persists (published, paid only):** Artifact *code* survives refreshes and sessions (stored in the conversation). Storage writes persist only if the artifact is published, on a paid plan, text-only, and ≤20 MB. "Persistent storage is only available for published artifacts."
- **Draft artifacts:** code persists, but runtime state does not; storage operations "will not succeed until the artifact is published."
- **Silent failures — the big one:** `localStorage` and `sessionStorage` are blocked via CSP + iframe sandbox restrictions. Claude's own system prompt reportedly instructs: "NEVER use localStorage, sessionStorage, or ANY browser storage APIs in artifacts. These APIs are NOT supported." Writes "fail without visible errors — the app renders, the save button responds, and the data goes nowhere."
- **The unpublish trap:** "Unpublishing also permanently deletes all associated storage data (both personal and shared)" — no export step, no grace period, irreversible.
- **In-memory state** (React state, JS variables) resets on refresh or close.
- The **official help center does not document the localStorage restriction**, "creating user confusion."

## Relevance to Hermes Canvas
- **Silent write failures are the #1 legibility trap.** When the sandbox blocks storage but the UI still "responds," users lose data and trust. Hermes must surface storage/network denials *visibly* (toast/inline error), not fail silently.
- The **published-vs-draft persistence split** is confusing to users — a canvas that "looks saved" but isn't is a footgun. Hermes should make persistence state explicit on the canvas itself.
- **Destructive unpublish** (deletes data with no export) is a cautionary tale: any "remove/unpublish" action on a Hermes canvas needs a confirm + export path.

## Confidence
Med-high. Claims align with the official 20MB/text-only limits and the CSP-blocks-network findings; the quoted system-prompt line is second-hand. Behavior (silent failure, unpublish deletion) is well-corroborated across community reports.
