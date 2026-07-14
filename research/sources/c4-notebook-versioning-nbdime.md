# C4 — Notebook versioning & diffing (nbdime, ReviewNB)

**Accessed:** 2026-07-13
**Type:** official (nbdime docs, Jupyter JEP) + vendor (ReviewNB) + community

## Sources
- https://nbdime.readthedocs.io/en/latest/ (official)
- https://github.com/jupyter/nbdime (official)
- https://jupyter.org/enhancement-proposals/08-notebook-diff/notebook-diff.html (official JEP)
- https://blog.reviewnb.com/rich-diffs-for-jupyter/ (vendor)
- https://dhirajpatra.medium.com/resolve-conflict-in-jupyter-notebook-c71480b9be2c (community)

## Notes
**The core problem:** Jupyter notebooks are **JSON** with rich media (HTML, images, base64 outputs) embedded inline — "a hybrid format not well supported in Git." Plain `git diff` is nearly unreadable and **merge conflicts are a well-known source of pain** because Git can't merge the JSON structurally.

**nbdime** provides "content-aware" diff/merge that understands notebook structure: `nbdiff-web` (rich rendered diff), `nbmerge` (3-way merge with automatic conflict resolution), git driver integration (`nbdime config-git`). Diff algorithms handle source cells *and* output cells by MIME type. On conflict, the merge driver still produces a valid, viewable notebook with conflict markers.

**ReviewNB** (vendor) sells rich rendered diffs for notebook PRs — the existence of a paid product signals how bad native notebook diffing is.

## Relevance to Hermes / versioning tag
Directly relevant to Hermes' "versioned artifact + diff" mechanic. Lesson: **naive serialization formats make diffing/merging painful; you need a content-aware, structure-aware diff to make versions legible.** A raw JSON diff of a notebook is *technically* a version history but *not human-legible* — the same trap Hermes must avoid. Rendered/semantic diffs (nbdime, ReviewNB) are what make version history actually auditable. Strong design lesson: **versioning is necessary but not sufficient; the diff renderer is where legibility lives.** Confidence: high (official + established tooling ecosystem).
