# SIGNAL: Demand — HN "How are you monitoring AI agents in production?" (ANECDOTE)

**Type:** ANECDOTE (Hacker News thread — labeled anecdote, NOT primary fact)
**Title:** "Ask HN: How are you monitoring AI agents in production?"
**URL:** https://news.ycombinator.com/item?id=47301395
**Date:** ~2026-03 (thread ~4 months before access)
**Accessed:** 2026-07-13
**Confidence:** med (real practitioners, self-selected sample — directional demand signal)

Verbatim commenter quotes (attribution = HN usernames):
- chirdeeps: "observability and governance cannot live inside the agent framework. They have to
  live in an independent execution layer"
- zippolyon: "most tools record what happened...but not why the agent deviated from the plan"
- mej2020: "Spend keys are pre-funded API keys with hard spend limits, so you can hand one to an
  agent"
- Horos: "llm does not act on production. he build scripts, and you take the greatest care of
  theses scripts" [sic]
- verdverm: "OTEL & LGTM, the same stack I use for monitoring everything, on a technical level"

Pain points surfaced in thread: fragmented audit trails across frameworks; intent-vs-execution
gaps undetected in real time; surprise LLM billing from untracked tokens; no visibility into
agent decision steps.

**Read:** genuine practitioner demand for (a) an execution/observability layer OUTSIDE the agent
framework, (b) "why did it deviate" legibility (not just logs), (c) spend control, (d) HITL
approval before production action. Note the split: some experienced engineers already just use
OTEL/LGTM and are skeptical of dedicated tools.

**Related (could not fetch — HTTP 429):** "Understanding how to run a fleet of agents"
https://news.ycombinator.com/item?id=48204719 (2026-05-21) — discusses queue + markdown
todo/done task files for orchestrating many agents. Capture deferred.

**Related blog (ANECDOTE):** dev.to "I Run a Fleet of AI Agents in Production" cites (unverified)
"State of AI Agent Security 2026": "88% of organizations reported confirmed or suspected security
incidents involving AI agents" and "only 47% of deployed agents receive any active monitoring."
DO NOT treat these figures as verified — source-of-source, unconfirmed.
