# Anthropic — "How we contain Claude across products" (OFFICIAL / ENG-BLOG)

- URL: https://www.anthropic.com/engineering/how-we-contain-claude
- Source type: official / engineering blog (Anthropic)
- Accessed: 2026-07-13. (Publication date not captured; recent — references Claude Cowork.)

## Scope note
This post covers Anthropic's *code-execution* containment across products. It is the authoritative primary source for how Claude runs code server-side and locally, but it does NOT document the iframe/CSP mechanics of the Artifacts *rendering* surface (see c1-claude-artifacts-sandbox-origin.md for that).

## Key claims (quoted / paraphrased)
- **claude.ai code execution** runs in a "gVisor container on isolated infrastructure," with an ephemeral per-session filesystem and server-side-only network (no code runs on the user's local machine). Isolation is infrastructure-level tenant separation.
- **Claude Code (local)** uses OS-level sandboxes: "Seatbelt on macOS, bubblewrap on Linux." Default policy: reads allowed, writes restricted to workspace, and "network is denied by default." User approval is required before workspace access.
- **Claude Cowork (VM-based)** uses "Apple's Virtualization framework on macOS, HCS on Windows," isolated via "vsock + hypervisor boundary." Mount modes: "read-only, read-write, and read-write-no-delete." "Credentials stay in the host keychain and never enter the guest machine." A man-in-the-middle proxy inside the VM intercepts API traffic using provisioned session tokens.
- **Cross-product network policy:** egress allowlist filtering by domain; tool output is inspected before entering the model context; server-side fetch headers are filtered.

## Relevance to Hermes Canvas
- Confirms the incumbent design pattern: **network-denied-by-default plus domain egress allowlist** is the baseline for running agent code. Any canvas that lets an agent's code touch the network needs an explicit allowlist and MITM/proxy inspection, not open egress.
- Confirms **ephemeral per-session filesystem** as the default; persistence is a deliberate, separate layer.
- The gap in this doc (no iframe/CSP detail) shows Anthropic treats *code execution* and *artifact rendering* as two distinct containment problems — a useful architectural split for Hermes.

## Confidence
High for the code-execution claims (primary source). The rendering/iframe mechanics are out of scope here.
