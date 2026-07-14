# C4 — Notebook reproducibility (large-scale studies)

**Accessed:** 2026-07-13
**Type:** academic (peer-reviewed / arXiv)

## Sources
- Pimentel et al., "A Large-scale Study about Quality and Reproducibility of Jupyter Notebooks" (MSR 2019) — https://leomurta.github.io/papers/pimentel2019a.pdf
- "Understanding and improving the quality and reproducibility of Jupyter notebooks" (PMC8106381, extended journal version)
- "Computational reproducibility of Jupyter notebooks from biomedical publications" (GigaScience 2023/2024, doi 10.1093/gigascience/giad113)
- IoLab report, UW CSE503 (2025); "How Scientists Use Jupyter Notebooks" (arXiv 2503.12309)

## Notes
**Headline numbers (Pimentel et al., ~1.4M GitHub notebooks):**
- Only **~25%** of valid notebooks executed **without errors** top-to-bottom.
- Only **~4–5%** **reproduced the same results** as their saved outputs. (Precise: of 863,878 attempted executions of valid notebooks, **24.11%** ran clean, **4.03%** reproduced identical results.)
- **36%** showed evidence of **out-of-order execution**; **76%** showed **skips** in execution order.

Root cause named repeatedly: notebook execution is **stateful** — cells run out of order, variables persist after the code that created them is edited/deleted, displayed output may not match a clean rerun. Biomedical-publications study (2023) reruns notebooks from papers and finds low reproducibility even for published science.

These numbers are widely cited (often as "96% don't reproduce, 75% don't run") as the empirical backbone of the notebook reproducibility crisis.

## Relevance to Hermes
Hard empirical evidence that **the most successful "legible work" medium (notebooks) fails at reproducibility** because the visible artifact is decoupled from a deterministic process. Directly motivates Hermes' bet: legibility without *reproducible lineage* is untrustworthy. A versioned artifact whose each state is reconstructable would address exactly the failure these studies quantify. Confidence: high (peer-reviewed, large-N, multiply corroborated).
