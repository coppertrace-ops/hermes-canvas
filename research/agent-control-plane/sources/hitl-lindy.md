# Source: Lindy — "Ask for Confirmation" HITL

- **URL:** https://docs.lindy.ai/testing/human-in-the-loop
- **Accessed:** 2026-07-13
- **Type:** PRIMARY (vendor docs)
- **Confidence:** high

## What it is
Business-user "AI employee"/agent builder. HITL via per-action "Ask for Confirmation" toggle; agent pauses and drafts the action for review inside the Lindy task view (or via emailed approval link).

## Verbatim (per docs, via search)
- "Lindy will not take action until you approve it in the Lindy task view."
- "you will see the action as a 'draft' in your Lindy's task view. Once you click 'Send email'... Lindy will proceed."
- The "Ask for Confirmation" field "appears for actions with 'side effects,' such as writing or updating data in other apps."

## HITL model
Blocking **per-action confirmation** (draft → approve). Reviewer sees the drafted content (some provenance for that step); not a full run-state/provenance console.

## Buyer / persona / deploy / price
Business user / ops (non-developer). SaaS. Task/credit-based pricing (not captured verbatim here).
