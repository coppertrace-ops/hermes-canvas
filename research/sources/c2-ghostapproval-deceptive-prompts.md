# GhostApproval — when the approval prompt hides what the agent knows

- Type: SECURITY RESEARCH (Wiz) + PRESS
- Accessed: 2026-07-13
- URLs:
  - https://www.wiz.io/blog/ghostapproval-a-trust-boundary-gap-in-ai-coding-assistants (primary, Wiz)
  - https://www.theregister.com/security/2026/07/08/bug-in-top-ai-coding-agents... (press)
  - https://thehackernews.com/2026/07/friendly-fire-ai-agents-built-to-catch.html
  - https://cybersecuritynews.com/ghostapproval-vulnerability/

## What it is
- Disclosed 2026-07-08 (found 2026-02-10). Affects six major agents: Amazon Q
  Developer, Anthropic Claude Code, Augment, Cursor, Google Antigravity, Windsurf.
- Exploits symlink following (CWE-61): a file path the user approves silently
  resolves to a different, sensitive location outside the workspace sandbox →
  potential RCE on the developer's machine.

## The legibility/trust core (most relevant part)
- With Claude Code, the agent's INTERNAL reasoning said "I can see that
  project_settings.json is actually a zsh configuration file," yet the
  **confirmation prompt shown to the user** only asked "Make this edit to
  project_settings.json?" The agent knew the true target; the user did not.
- Wiz: this "transforms a sandbox bypass into an informed consent bypass; the
  Human-in-the-Loop safety net becomes a rubber stamp." When the prompt hides
  the danger, human review is theater.

## Vendor split (a trust-philosophy fault line)
- AWS fixed (LS 1.69.0, 2026-05-27, CVE-2026-12958); Cursor fixed (v3.0,
  2026-06-05, CVE-2026-50549); Google fixed 2026-05-22.
- **Anthropic disputed it's a vulnerability**, arguing users who trust a
  project directory own their approval decisions. → Industry disagreement on
  whether legibility of true actions is the tool's duty or the user's.

## Relevance to Hermes Canvas
- Sharpest evidence yet: a confirmation/approval UI is only as trustworthy as
  its FIDELITY to what the agent actually intends. Showing a friendly summary
  that omits the real target/effect is worse than no prompt — it manufactures
  false confidence. Hermes' "legible & auditable" thesis must mean surfacing
  the agent's *resolved, ground-truth* action (real path, real effect), not
  the agent's self-description.
- Also argues for an independent record: the agent's stated intent vs its
  actual resolved operation should both be visible/diffable.
- Confidence: HIGH (Wiz primary research + multiple press + assigned CVEs).
