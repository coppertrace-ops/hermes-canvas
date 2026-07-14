# ChatGPT Canvas — official help + launch (OFFICIAL)

- URLs:
  - https://help.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt-and-how-do-i-use-it (help center; returned 403 to fetch, claims below from search extraction + corroborating guides)
  - https://openai.com/index/introducing-canvas/ (launch post, **2024-10-03**; 403 to direct fetch)
- Source type: official (OpenAI). Some detail cross-checked against DataCamp/Zapier guides.
- Accessed: 2026-07-13

## Key claims
- **Targeted, non-destructive edits:** When asked for a revision, ChatGPT "went into the document itself and made the targeted change, highlighted in green" rather than regenerating the whole document. Canvas modifies the document in place and can offer a diff/updated text.
- **Show changes / diff:** A "Show changes" button in the top toolbar shows additions and deletions for both documents and code (a later addition — see c1-chatgpt-canvas-tracked-changes.md).
- **Version navigation:** Arrows in the top-right toggle Previous/Next version; these only appear after the second version is generated. "Restore this version" at the bottom reverts to an earlier version. Every change is saved automatically.
- **Direct manual editing:** Users can type directly into the doc/code, accepting AI suggestions or editing by hand. Shortcut menus offer edits like adjust length, reading level, add polish, add emojis; code shortcuts include add comments, fix bugs, port languages, add logs, and code review.
- **Code execution:** For Python, an **Execute** button runs code in-browser; output appears in a console at the bottom. (Canvas' render/exec could produce external network requests.)
- **Auto-trigger:** Canvas opens automatically when the model judges the task warrants it (a friction point — see auto-open bug file).

## Relevance to Hermes Canvas
- The **targeted-inline-edit + green highlight** model is the widely praised UX baseline; regenerate-the-whole-thing is the anti-pattern.
- **Restore-this-version** as an explicit, always-available control matters — but only if the underlying history is reliable (it wasn't; see overwrite bug file).
- Auto-opening the canvas without user intent is a recurring complaint — Hermes should make canvas invocation predictable/controllable.

## Confidence
Med-high for behavior (corroborated across official + multiple guides). Exact help-center wording not directly fetched (403); launch date 2024-10-03 is reliable.
