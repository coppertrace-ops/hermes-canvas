# C4 — Notebook anti-pattern + Observable reactive

**Accessed:** 2026-07-13
**Type:** community/eng-blog (KDnuggets, TDS, IEEE) + Observable/Simon Willison

## Sources
- https://www.kdnuggets.com/2019/11/notebook-anti-pattern.html (eng-blog)
- https://intothedepthsofdataengineering.wordpress.com/2019/10/21/the-notebook-anti-pattern/ (blog)
- IEEE "'How Not to Do It': Anti-patterns for Data Science in SE" (academic)
- https://simonwillison.net/2024/Mar/3/interesting-ideas-in-observable-framework/ (practitioner blog)
- https://datasciencenotebook.org/compare/jupyter/observable ; https://marimo.io/blog/dataflow

## Notes
**Notebook anti-pattern (community + academic consensus):** notebooks in **production pipelines** are an anti-pattern; "notebooks are for experimentation, not productionization." Cited failings: heavy reliance on state, lack of abstraction/modularization/tests, copy-paste code, "poor-quality code ignoring basic SE principles." Notebooks judged best for **EDA and experimentation**, worst for production/reuse.

**Observable (reactive JS notebooks):** cells are **reactive** — change one cell and all dependents auto re-evaluate (Excel-like). Stronger ordering guarantees than Jupyter's manual sequential model. Same reactive-dataflow family as Marimo (Python) and Pluto.jl (Julia). BUT: Observable notebooks are JS-only, run in-browser, and the editor is a proprietary observablehq.com product. Academic note (FlowBook, arXiv 2605.01560): "while reactive systems provide stronger ordering guarantees than standard notebooks, **none provide robust reproducibility guarantees** for Python's scientific ecosystem" — reactivity ≠ full reproducibility.

## Relevance to Hermes
Two lessons: (1) The industry consensus is that **stateful, exploratory legible-work tools don't survive contact with production/audit needs** without extra rigor — Hermes targets exactly that gap (auditable output). (2) **Reactivity alone doesn't guarantee reproducibility** — a cautionary note that Hermes' versioning must capture full lineage/inputs, not just ordered edits. Confidence: med-high (anti-pattern is broad consensus; Observable features official; reproducibility caveat academic).
