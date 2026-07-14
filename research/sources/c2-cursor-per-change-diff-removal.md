# Cursor — Removal of per-change / inline diff review (community backlash)

- Type: COMMUNITY (Cursor Community Forum — Feature Requests + Bug Reports)
- Accessed: 2026-07-13
- Primary URLs:
  - https://forum.cursor.com/t/bring-back-per-change-apply-inline-diff-review-you-re-throwing-away-your-best-ux-advantage/160856 (posted 2026-05-17)
  - https://forum.cursor.com/t/after-updating-cursor-agent-mode-applies-file-changes-directly-to-disk-with-no-red-green-inline-diff-and-no-keep-undo-or-accept-reject-controls.../162532 (posted 2026-06-05)
  - Related: /t/152581, /t/146198, /t/150367, /t/142029, /t/131728

## What happened
A 2026 Cursor update changed Agent-mode behavior so edits are applied
directly to disk and reviewed only at the session level, rather than the
prior file-by-file / chunk-by-chunk inline diff review with red/green
highlighting and per-hunk Accept/Reject (Keep/Undo) controls. Paying
users treated this as a regression that removed "your best UX advantage."

## Key user quotes
- "I could review this feature's edits, accept what I wanted, and reject
  what I didn't — file by file, chunk by chunk." (OP, 2026-05-17)
- "There are so many times when the agent does 90% of the code correct
  but 1 or 2 changes are wrong." (why granular reject matters)
- One user "accidentally ripped off almost my whole Git Repo" due to the
  unclear change (thread 162532) — real consequence of losing the review gate.

## Engagement / corroboration
- Canonical thread: 6,000+ views, 386 likes. Cursor support acknowledged
  it as a widespread issue (2026-05-22 reply). Multiple parallel threads
  (six+ linked) report the same auto-apply-with-no-diff experience →
  strongly corroborated, not a one-off.
- Resolution for the "direct to disk" bug (162532) was actually a settings
  fix: Cursor Settings > Agents > Applying Changes > enable Inline Diffs
  toggle. So the capability still exists but default/discoverability shifted.

## Relevance to Hermes Canvas
- Direct evidence that a per-hunk, red/green, accept/reject diff gate is
  a *praised* and *load-bearing* trust feature; removing/defaulting it off
  produces immediate backlash and real data-loss incidents.
- Users want BOTH: (a) apply-all-then-review batch diffs, and (b) granular
  per-file/per-hunk reject. Legibility of "pending vs applied" state matters.
- Confidence: HIGH (many corroborating threads + vendor acknowledgement).
