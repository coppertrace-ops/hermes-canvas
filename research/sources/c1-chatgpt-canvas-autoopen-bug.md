# OpenAI Community — "Canvas opens automatically" & feature-overload (COMMUNITY)

- URLs:
  - https://community.openai.com/t/canvas-opens-automatically-how-to-prevent-that/1055091
  - https://community.openai.com/t/any-way-of-disabling-canvas-in-a-chat/1083584 (related)
- Source type: community threads (OpenAI Developer Community)
- Accessed: 2026-07-13. Posts dated Dec 2024.

## Key claims
- Canvas **opens automatically even when users don't want it**, and reportedly keeps triggering "even when disabled in settings." "Is there a way to stop letting ChatGPT open that canvas thing? Feels kind of bugged that it opens automatically." (2024-12-14)
- Users want it available on demand but not auto-invoked: "I want Canvas enabled... However, I do NOT always want my conversation to open it of its own accord" (2024-12-28).
- Workaround: repeatedly instructing the model to "respond inline, do not open Canvas."
- Users frame the persistence of the bug as a sign of weak bug-triage responsiveness.

## Relevance to Hermes Canvas
- **Unwanted auto-invocation is a top friction point.** A canvas that pops open when the user just wanted a chat answer is experienced as intrusive feature-overload. Hermes should make canvas invocation **predictable and user-controllable** (explicit trigger, or a confident classifier + easy dismiss), and honor a persistent "don't auto-open" preference.
- Confirms the **feature-overload / "I ignore the panel" risk** is real for auto-surfaced canvases — directly relevant to research question 4 (do these panels actually get used, or ignored/resented?).

## Confidence
Med-high that the complaint is real and recurring (multiple dated users, multiple threads). Represents a vocal subset, not necessarily majority sentiment.
