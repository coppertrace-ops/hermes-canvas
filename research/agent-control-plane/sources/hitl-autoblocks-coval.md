# Source: Autoblocks + Coval — agent testing/eval with human review

- **URLs:**
  - https://www.autoblocks.ai/ , https://docs-v1.autoblocks.ai/testing/human-review
  - https://www.coval.ai/ , https://www.coval.ai/pricing/
- **Accessed:** 2026-07-13
- **Type:** PRIMARY (vendor sites/docs)
- **Confidence:** high (features), low (pricing = contact-sales for both)

## Autoblocks
LLM/agent testing + eval platform with SME human-review. "Human review mode is designed for humans to review, grade, and discuss test results." SMEs (clinical/legal/compliance) "annotate outputs and feed corrections back into the model's evaluation baseline without writing evaluation code." Red-team simulation + production monitoring.
- HITL model: **async annotation / review-after** in a test/eval loop — NOT blocking runtime approval.
- Buyer: AI product + domain-expert teams (healthcare/finance/legal). Deploy: SaaS. Pricing: not public.

## Coval
Voice/chat-agent evaluation platform: "simulate before launch, observe in production, and review with humans." "It routes the calls that matter to human QA, then turns reviewer judgment into sharper... evals." Raised $28M Series A.
- HITL model: **review-after human QA feeding an AI judge** — not runtime gate.
- Buyer: voice-AI teams. Deploy: SaaS; 7-day trial (CC required); paid plans contact support@coval.dev. Pricing: not public.

## Relevance
Both are **pre/post-production eval + human annotation**, not live run-state supervision/approval. Adjacent (evidence/review culture) but different job than Hermes' operate-live control plane.
