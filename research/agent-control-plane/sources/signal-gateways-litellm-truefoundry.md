# SIGNAL: AI Gateways — LiteLLM, TrueFoundry, Cloudflare, Kong, Vercel (PRIMARY)

**Type:** PRIMARY (vendor pages + YC + funding press) + comparison articles
**Accessed:** 2026-07-13
**Confidence:** high (funding/product), med (exact pricing)

## LiteLLM (BerriAI)
- **Funding:** YC-backed; reported $1.6M seed (YC, Gravity Fund, Pioneer Fund); some sources cite
  ~$4M total. Mark med. YC: https://www.ycombinator.com/companies/litellm
- **Product:** OSS gateway/proxy to 100+ LLMs "with cost tracking, guardrails, loadbalancing and
  logging"; observability via Langfuse/Prometheus/OTEL. GitHub: https://github.com/BerriAI/litellm
- **Pricing (reviewer-reported):** OSS free self-host; Enterprise ~$250/mo to ~$30k/yr.
- **Wedge:** open-source GATEWAY + basic observability. HITL: no.

## TrueFoundry
- **Funding:** $19M Series A, announced 2025-02-06, led by Intel Capital; Eniac, Peak XV Surge,
  Jump Capital, angels. Primary: https://www.truefoundry.com/blog/announcing-our-19m-series-a-scaling-ai-deployment-with-autonomous-agents-on-autopilot
- **Product:** Enterprise AI Gateway + MCP Gateway; "~3-4 ms latency, 350+ RPS on 1 vCPU."
  Pricing: Developer/Pro/Enterprise usage-based; self-host ~$600-1,000/mo. https://www.truefoundry.com/pricing
- **Wedge:** GATEWAY + deployment platform ("agent on autopilot"). HITL: limited.

## Hyperscaler / platform gateways (governance angle)
- **Cloudflare AI Gateway:** Unified Billing, BYOK, Dynamic Routing, Semantic Caching, Rate
  Limiting, DLP/content moderation (PII). 14-20+ providers + Workers AI.
- **Kong AI Gateway:** "strongest governance primitives" — PII sanitization, prompt guards, rate
  limiting, compliance plugins, semantic routing.
- **Vercel AI Gateway:** "focus is on latency, caching, and ease of use rather than deep
  governance or observability … Limited controls for … governance, or cross-team visibility."
- Comparison: https://www.notdiamond.ai/blog/the-top-10-ai-gateways-for-the-multi-model-future-2026

**Read:** gateways compete on governance/observability but are LLM-request-centric, not
agent-run/HITL-centric. Vercel explicitly de-prioritizes governance.
