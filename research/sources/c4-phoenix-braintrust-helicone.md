# C4 — Phoenix / Braintrust / Helicone landscape

**Accessed:** 2026-07-13
**Type:** vendor comparison articles (Braintrust, Arize, Laminar) — flag competitive bias

## Sources
- https://www.braintrust.dev/articles/arize-phoenix-vs-braintrust (vendor, biased)
- https://arize.com/docs/phoenix/.../braintrust-open-source-alternative-llm-evaluation-platform-comparison (vendor, biased)
- https://laminar.sh/article/arize-phoenix-alternatives-2026 (vendor, biased)
- https://www.confident-ai.com/knowledge-base/compare/top-7-llm-observability-tools (comparison)

## Notes
**Arize Phoenix:** open-source LLM observability; **OpenTelemetry / OpenInference** (OTLP) tracing capturing every prompt, tool call, agent step. Self-hostable, free OSS; managed from ~$50/mo. 50+ instrumentations. Criticism: "focuses on tracing without evaluation automation."

**Braintrust:** full LLM dev lifecycle — prompt experimentation, CI/CD eval, statistical comparison, deployment blocking, prod observability, prompt versioning with A/B testing. Free tier 1GB + unlimited users. Only ~5 instrumentation options (vs Arize 50+).

**Helicone:** LLM **proxy** — swap one URL, get instant logging with <5ms P95 overhead. "Stops at observability. No evals, datasets, or experimentation." (Comparison claims OpenAI-focused — flag, may be outdated/biased.)

Pattern across the category: everyone builds a **span/trace tree over OpenTelemetry**; differentiation is on evals, CI/CD gating, and instrumentation breadth — NOT on making output legible to non-developers. **Prompt/experiment versioning** exists (Braintrust) but versions *prompts*, not human-facing output artifacts.

## Relevance to Hermes
Confirms the whole observability category converges on OTel span trees for **developers doing evals/debugging**. None targets rendered-output legibility for end users. "Versioning" in this space = prompt/dataset versioning, a different axis from artifact/canvas versioning. Hermes' versioned-output-artifact framing is genuinely orthogonal to this crowded category. Confidence: med (vendor-sourced, competitive bias; treat specific feature claims like "Helicone OpenAI-only" cautiously).
