# C4 — Marimo reactive notebook (Jupyter alternative)

**Accessed:** 2026-07-13
**Type:** official (marimo.io, docs, GitHub) + community comparison

## Sources
- https://marimo.io/features/vs-jupyter-alternative (official, biased toward marimo)
- https://github.com/marimo-team/marimo (official repo)
- https://marimo.io/blog/dataflow (official — "Python notebooks as dataflow graphs")
- https://docs.marimo.io/faq/ (official)
- https://onlyutkarsh.com/posts/2026/jupyter-vs-marimo-notebooks/ (community comparison)

## Notes
Marimo's pitch directly targets Jupyter's failures documented in C4 reproducibility notes. It cites "over 75% of Jupyter notebooks on GitHub don't run, 96% don't reproduce" as motivation.

**Reactive execution:** running a cell automatically re-runs all cells that depend on its variables (spreadsheet-like dataflow). Code and outputs stay in sync → **eliminates hidden state.** Deleting a cell **scrubs its variables from memory.** Marimo statically analyzes code to build a **dependency DAG** and re-runs as needed, guaranteeing code/outputs/state are consistent.

**Git-friendly:** notebooks stored as **pure Python (.py)**, versionable with Git, runnable as scripts, deployable as apps — vs Jupyter's JSON blobs that "require extra steps to version."

Claimed benefits: reproducible, interactive elements built in, deployable as web apps, executable as scripts, AI-native editor.

(Flag: marimo.io is the vendor; reproducibility stats are real/cited but the "solves it" framing is promotional. Reactive systems give ordering guarantees but, per Observable/FlowBook sources, still don't fully guarantee Python-ecosystem reproducibility.)

## Relevance to Hermes
Marimo is a real-world validation that the market wants **process-output binding + git-native versioning** for legible computational work. Its two core moves — (1) kill hidden state so the visible artifact reflects a deterministic process, (2) store as diffable plain text — are conceptually the same moves Hermes makes for agent output artifacts. Useful design precedent and a "who else is doing this" reference. Confidence: high for features (official/OSS), med for reproducibility-solved claims.
