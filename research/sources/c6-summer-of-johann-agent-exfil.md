# "The Summer of Johann" — AI coding-agent exfil sweep (Aug 2025)

- Type: PRIMARY (Simon Willison summarizing Johann Rehberger / Embrace The Red)
- Tag: prompt-injection
- Accessed: 2026-07-13
- URL: https://simonwillison.net/2025/Aug/15/the-summer-of-johann/

## The sweep — one bug class, every major agent (all Aug 2025)

| Product | Date (2025) | Exfiltration mechanism |
|---|---|---|
| ChatGPT | Aug 1 | Markdown images via Azure storage bucket logging |
| Codex Web | Aug 2 | Internet access via Azure VPS |
| Cursor IDE | Aug 4 | **Mermaid diagram embedded image URLs** |
| Devin AI | Aug 6-8 | Browser tools, shell, markdown images, port exposure |
| OpenHands | Aug 9-10 | Env-var exfil via **DNS**, malware install |
| Claude Code | Aug 11 | **DNS** via pre-approved cmds (ping, nslookup, dig, host) |
| GitHub Copilot | Aug 12 | Config-file manipulation for RCE |
| Google Jules | Aug 13-15 | Markdown images, view_text_website tool, hidden Unicode |

## Rehberger's framing (verbatim)

Lethal-trifecta chain = "**prompt injection** leading to a **confused deputy** that
then enables **automatic tool invocation**."

## Key takeaways for Hermes

- The exfil channel is NOT only `<img>`: also **Mermaid-rendered image URLs**, and
  **DNS lookups** (ping/nslookup/dig resolve attacker-controlled hostnames encoding
  data — bypasses HTTP allowlists entirely).
- Anything that turns model output into an automatic network request (image render,
  diagram render, link unfurl, a tool that fetches a URL) is an exfil primitive.
- For a RENDER-ONLY browser artifact, the surface is narrower than these agent-tool
  cases (no shell/DNS tools), which is a point in favor of the browser-sandbox
  approach: the browser can't make raw DNS/shell calls, and CSP kills img/fetch.

## Relevance to Hermes Canvas

Broadens the threat model beyond `<img>` beacons; but also shows Hermes's
render-only client surface AVOIDS the worst legs (shell, DNS, arbitrary tools) that
plague full coding agents. Argues render-only + CSP is a materially smaller attack
surface than server-side agent execution.
- Confidence: HIGH (Simon Willison + Rehberger, dated, itemized).
