# "I Used ChatGPT's Canvas for Six Months. Then OpenAI Quietly Killed It." (COMMUNITY)

- URL: https://medium.com/@mubashirburfat4/i-used-chatgpts-canvas-feature-for-six-months-then-openai-quietly-killed-it-88c542f1a63f
- Source type: community / opinion (Medium), dated **2026-06-24**
- Accessed: 2026-07-13

## Key claims
- **What worked:** Canvas preserved flow state ("finished the entire document in one sitting"), made **targeted edits highlighted in green** rather than replacing whole documents, kept the document persistently visible (avoiding the chat "wall of text"), and offered **version rollback** that reduced "anxiety" about irreversible changes.
- **What changed — Canvas retired:** Author states OpenAI **retired the persistent Canvas side panel on 2026-05-28**, replacing it with **inline "writing blocks" and "code blocks"** in the chat stream. Legacy model access phasing out by Aug 2026.
- **The regression:** Inline blocks mean "scroll past it and it's gone." The document shifted "from primary object to a piece of the conversation." It's "not immediately clear whether writing blocks carry the same rollback capability."
- **Why:** OpenAI's stated reason was **cross-device consistency** (a separate panel that "doesn't render the same way everywhere" was an engineering burden). Author's read of developer consensus: **lower-than-expected adoption** plus competition from Anthropic's Artifacts.

## Relevance to Hermes Canvas
- **Persistence + spatial permanence is the whole point of a canvas.** Demoting the artifact back into the scrolling chat stream destroyed the value. Hermes must keep the canvas a **persistent, primary spatial object**, not an inline block that scrolls away.
- **Adoption risk is real:** even a well-liked canvas can be "quietly killed" for low adoption. Signals that canvases get ignored (see auto-open + overwrite bug files) are a genuine product risk, not hypothetical.
- Cross-surface (mobile) rendering consistency is a real engineering tax on a bespoke panel — worth designing for from day one.

## Confidence
Med. Single-author opinion, but internally detailed and consistent with the official "consistency across surfaces" rationale and community bug threads. The **2026-05-28 retirement date** is the author's claim — flag as needing independent confirmation.
