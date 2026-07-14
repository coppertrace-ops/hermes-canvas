# Val Town — server-side sandbox for untrusted code (the EXPENSIVE alternative)

- Type: PRIMARY (Val Town engineering blog)
- Tag: cheap-safe / incumbent-arch
- Accessed: 2026-07-13
- URL: https://blog.val.town/blog/first-four-val-town-runtimes/

## What Val Town does

Val Town runs untrusted user JS **server-side** (they need to EXECUTE code, not
just render HTML). Evolution of runtimes:
- Naive "just run submitted JS in Node" → "you'd be mining crypto and running a
  botnet within the hour" — Node code has "unfettered access to your system's
  environment variables, filesystem, network."
- Moved to a Node app that launches **Deno subprocesses** via `node-deno-vm`,
  using Deno's permission sandbox + killing processes that run too long
  (infinite-loop / DoS protection).
- Requirements: vals isolated from host (no filesystem, no env vars) AND isolated
  from each other.
- Quote: "You can't really use JavaScript to build a JavaScript sandbox." → real
  isolation needs an OS/runtime boundary, not in-process JS tricks.

## Key contrast for Hermes Canvas

This is the model you need when you must **run arbitrary code with server
resources** (network, compute, secrets). It is comparatively heavy: subprocess
per exec, resource limits, timeouts, ongoing runtime maintenance.

But Hermes Canvas's stated boundary is RENDERING agent HTML/JS in the user's
browser, not executing it on the server. For pure client render, you do NOT need
Val Town's server sandbox — the browser's iframe opaque-origin + CSP already
contains it (no host filesystem/env is exposed to browser JS anyway). Server VM
sandboxes (Val Town, e2b, Vercel Sandbox, Cloudflare Sandbox) are needed only if
the artifact must do real server-side compute/network with credentials.

## Relevance to Fable claim #2

Evidence FOR "cheap": if the requirement is render-only, the costly server-VM
tier (Deno subprocess / Firecracker microVM) is unnecessary — a static
separate-origin iframe suffices. Val Town's heaviness is a function of
server-side EXECUTION, a requirement Hermes may not have.
- Confidence: HIGH for Val Town's own arch; MEDIUM for the mapping to Hermes
  (depends on whether Hermes ever needs server-side execution of agent code).
