# SIGNAL: Buyer demand — LangChain "State of Agent Engineering" survey (PRIMARY-ish)

**Type:** PRIMARY (vendor-published survey; vendor has bias toward observability narrative)
**URL:** https://www.langchain.com/state-of-agent-engineering
**Accessed:** 2026-07-13
**Confidence:** med-high (large sample, but vendor-run; obs vendor incentive to show obs demand)

**Sample:** 1,340 responses; fielded 2025-11-18 to 2025-12-02.

Verbatim / near-verbatim findings:
- "89% of organizations" have implemented some form of observability for agents. Among those
  running agents in production: "94% have some form of observability in place, and 71.5% have
  full tracing capabilities."
- Evaluation lags observability: 52.4% run offline evals; online eval adoption 37.3% (rising to
  54.7% / 44.8% among teams with production agents).
- HITL: "human review (59.8%) remains essential for nuanced or high stake situations, while
  LLM-as-judge approaches (53.3%) are increasingly used to scale assessments."
- Top production concern: **Quality (32%)** — "hallucinations and consistency of outputs" and
  "context engineering."
- Framing quote: "without visibility into how an agent reasons and acts, teams can't reliably
  debug failures, optimize performance, or build trust."

**Read (buyer evidence):** observability is now "table stakes" (≈89%), so pure observability is
commoditizing; EVAL and especially ONLINE eval + HITL review are the still-unsaturated needs.
"Human review" at ~60% confirms HITL is a real, widespread buyer behavior — not a niche.

**Caveat:** LangChain sells LangSmith (observability), so the 89% "observability adoption" figure
is vendor-favorable framing. Treat magnitudes as directional.
