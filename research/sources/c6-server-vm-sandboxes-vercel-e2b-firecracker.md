# Server-VM sandboxes: Vercel Sandbox, e2b, Firecracker microVMs (the heavy tier)

- Type: PRIMARY (Vercel changelog/KB, e2b docs) + secondary comparisons
- Tag: incumbent-arch / cheap-safe
- Accessed: 2026-07-13
- URLs:
  - https://vercel.com/changelog/vercel-sandboxes-ga
  - https://vercel.com/kb/guide/vercel-sandbox-vs-e2b
  - https://modal.com/resources/best-code-execution-sandboxes-ai-agents
  - https://github.com/dloss/awesome-agent-sandboxes

## What these are

Ephemeral **server-side** compute for EXECUTING untrusted / AI-generated code:
- **Vercel Sandbox** (GA): "ephemeral compute primitive for safely executing
  untrusted code" in "temporary Linux microVMs." Runs "AI agent-generated outputs,
  unverified user uploads, and third-party code." Each sandbox runs inside a
  **Firecracker microVM**, "isolated from your infrastructure, so code running in a
  sandbox is blocked from accessing environment variables, database connections,
  and cloud resources."
- **e2b**: secure sandboxes for AI agents, each in a **Firecracker microVM** →
  VM-level isolation, low overhead. Persistent agent environments + exec tools.
- **Firecracker** (AWS, the shared substrate): microVM monitor ~50,000 lines of
  Rust emulating only a handful of devices (vs QEMU's ~1.4M lines of C) → small
  attack surface, strong kernel isolation, fast boot.

## Why this tier exists

Needed when the artifact must actually RUN with server resources: filesystem,
package installs, network calls with credentials, long compute. Isolation boundary
is the OS/hypervisor (kernel), not the browser.

## Cost signal (Fable #2)

This tier is real infrastructure: microVM lifecycle, boot/warm-pool, per-exec
metering, egress control. It is the EXPENSIVE way. Incumbents reach for it only
because they must execute code, not merely render it.

## Relevance to Hermes Canvas

Sets the ceiling. If Hermes only RENDERS agent HTML in the browser, it can skip
this entire tier — the browser sandbox contains client JS with no server VM at
all. The server-VM tier becomes necessary only if agents run backend code (e.g.
data processing, package execution) inside the artifact. Evidence for "cheap is
possible" IF the requirement stays render-only.
- Confidence: HIGH (Vercel/e2b primary on their own products).
