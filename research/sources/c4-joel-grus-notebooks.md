# C4 — "I Don't Like Notebooks" (Joel Grus, JupyterCon 2018)

**Accessed:** 2026-07-13
**Type:** talk (primary, 2018) + community reactions (HN, Yihui Xie rebuttal)

## Sources
- https://yihui.org/en/2018/09/notebook-war/ (rebuttal blog, "The First Notebook War", 2018)
- https://news.ycombinator.com/item?id=19859913 (HN discussion — community, anecdote)
- https://yahnd.com/theater/r/youtube/7jiPeIFXb6U/ (HN comments aggregator on the talk)
- Original: Grus JupyterCon 2018 slides/talk "I Don't Like Notebooks"

## Notes
Grus' #1 complaint: **hidden state and out-of-order execution.** You define a variable in one cell, later reassign it; if you don't run cells in order — or you delete a cell after running it — it's "hard or impossible to know from inspection what the true state of your variables is." The displayed output may not correspond to any clean top-to-bottom run. His sardonic fix: tutorials should loudly warn "DON'T RUN YOUR CELLS OUT OF ORDER YOU FOOL."

Other complaints: no integration with dev tooling (linters), poor modularity, discourages testing, encourages copy-paste. Concession (echoed by rebuttals): if users habitually **restart-and-run-all** (recompile from scratch) rather than shipping out-of-order results, notebooks are "probably fine."

**Community reaction:** highly polarizing ("The First Notebook War"). Yihui Xie's rebuttal argues the problems are real but partly user-discipline and tooling issues, not intrinsic. HN threads split between "puts it perfectly, I hate notebooks" and "skill issue / notebooks are fine for EDA." (Flag: anecdotal, opinion-heavy.)

## Relevance to Hermes
The canonical statement that **the artifact you see in a notebook may not reflect the process that produced it** — the output and the execution are decoupled, so you can't trust what you're reading. This is the exact failure Hermes' versioned-artifact-with-lineage aims to fix: bind the visible output to a reproducible, ordered history. Notebooks are the original "legible computational work" that failed at *trustworthy* legibility precisely because state was hidden. Confidence: high (well-documented, canonical talk).
