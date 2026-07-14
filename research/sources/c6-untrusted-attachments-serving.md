# Serving untrusted user/agent uploads safely (attachments = stored-XSS risk)

- Type: PRIMARY/AUTHORITATIVE patterns (OWASP, GitHub security advisories, real bug reports)
- Tag: attachments
- Accessed: 2026-07-13
- URLs:
  - https://github.com/makeplane/plane/issues/1988 (missing Content-Disposition → XSS)
  - https://github.com/owen2345/camaleon-cms/security/advisories/GHSA-r9cr-qmfw-pmrc
  - GitHub SVG-upload stored-XSS advisories (shopware GHSA-xvhc-gm7j-mhmc, traccar, saleor)

## The threat

An uploaded HTML/SVG file served from the app's origin and rendered inline is
**stored XSS**: the browser executes its script in the app origin with the user's
session (cookies, localStorage). SVG is especially dangerous — it can carry inline
`<script>`. "When attachment files are opened by the browser without the
Content-Disposition header, it can lead to XSS."

## The three defenses (defense in depth)

1. **Separate origin** for user content. "Hosting media files in a separate domain
   from the main application (e.g. `media.example.com` instead of
   `example.com/media/`) helps prevent stored XSS impact, because the malicious
   content would be executed in a different origin context." (GitHub uses
   `*.githubusercontent.com`; Nextcloud uses `usercontent.apps.nextcloud.com`.)
2. **`Content-Disposition: attachment`** — forces download instead of inline
   render, so HTML/SVG never executes as a page.
   ```http
   Content-Disposition: attachment; filename="upload.bin"
   ```
3. **`X-Content-Type-Options: nosniff`** — stops the browser from MIME-sniffing a
   text/binary file into executable HTML/JS.
   ```http
   X-Content-Type-Options: nosniff
   ```

Additional: set a correct non-executable `Content-Type`, sanitize SVG, and a tight
CSP on the content origin.

## Relevance to Hermes Canvas

Agent-generated AND user-uploaded HTML are the SAME class of stored-XSS risk. The
same separate-origin discipline that protects rendered agent artifacts must also
govern attachment serving: dedicated content origin + `Content-Disposition:
attachment` (for downloads) or sandboxed iframe (for previews) + `nosniff`. If any
untrusted upload is ever served inline from the app origin, the whole boundary
collapses.
- Confidence: HIGH (OWASP-standard guidance + many concrete CVE-class advisories).
