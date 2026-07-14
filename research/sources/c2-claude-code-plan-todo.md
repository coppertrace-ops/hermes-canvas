# Claude Code — Plan Mode & TodoWrite (agent legibility, OFFICIAL)

- Type: OFFICIAL docs + explainers
- Accessed: 2026-07-13
- URLs:
  - https://code.claude.com/docs/en/agent-sdk/todo-tracking (official)
  - https://platform.claude.com/docs/en/agent-sdk/todo-tracking (official)
  - https://github.com/anthropics/claude-code/issues/6968 (undocumented TodoWrite behavior)
  - https://github.com/anthropics/claude-code/issues/31888 (feature request: batch diff review like Cursor)
  - claudelog.com/faqs/what-is-todo-list-in-claude-code (community explainer)

## How Claude Code makes agent work legible
- **Plan Mode**: a session state where the agent may read/search/reason but
  is NOT allowed to write to disk or run side-effecting commands. It
  produces a concrete plan (which files, in what order, why) that the user
  reviews/approves via ExitPlanMode before any edits. "The plan is the spec";
  on discovering a needed deviation the agent should stop and surface it,
  not silently improvise.
- **TodoWrite / Todo lists**: auto-triggered for multi-step tasks (~3+ steps).
  Statuses pending / in_progress / completed update in real time, giving a
  live task list. Docs frame todos as "transparency into Claude's work plan"
  and a surface that "reveals Claude's interpretation of your instructions
  and enables mid-task steering."

## Notable gaps / community signal
- Issue #31888: users explicitly ask Claude Code to add a **batch diff review
  mode** ("show all changes together before approval, like Cursor's native
  agent") — i.e. the CLI's per-edit approval is felt to lack a consolidated
  review surface. (COMMUNITY feature request.)
- Issue #6968: proactive TodoWrite planning behavior was **undocumented** —
  users noticed the agent silently deciding to make/track todos.

## Relevance to Hermes Canvas
- Validates the "plan as reviewable artifact before execution" pattern and
  the read-only planning gate — directly on-thesis for legible/auditable work.
- Live todo list with explicit statuses is a proven legibility primitive.
- Gap to exploit: even Claude Code lacks a strong *consolidated visual diff
  review*; a canvas that shows all pending changes together is differentiated.
- Confidence: HIGH for plan/todo mechanics (official); MEDIUM for the
  "users want batch diff" signal (single high-visibility issue).
