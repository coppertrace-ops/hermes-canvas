# Do We Need CRDTs? (1 human + 1 agent) — Analysis

Type: engineering blogs + docs. Accessed: 2026-07-13.
Sources: electric.ax/blog/2026/04/08/ai-agents-as-crdt-peers-with-yjs; yjs docs; smarttechdevs/velt CRDT guides.

## The case FOR CRDTs (Yjs)
- CRDTs give conflict-free merge of concurrent edits without a central lock; last-write-wins (LWW) "guarantees someone's work is deleted" when two writers edit the same region simultaneously.
- Recent pattern (Electric, Apr 2026): make the AI agent a server-side Yjs peer that opens its own doc and connects to the same stream as the human — the agent becomes "just another participant." Elegant for streaming agent edits INTO a shared rich-text/ProseMirror doc where human is also actively typing in the same region.

## The case AGAINST (overkill for Hermes)
- CRDTs shine with MULTIPLE concurrent HUMAN writers editing the SAME region with no server arbiter. Hermes is 1 human + 1 agent, and the writes are largely turn-based / partitioned: human sends a message, agent responds and edits an artifact.
- With a server-authoritative model (Convex/DO), the server serializes writes (strict serializable in Convex; single-threaded DO). True simultaneous same-character contention between the one human and one agent is rare and can be handled with: section-level locking, "agent is editing" UI state, or append-only + versioned artifacts (which the brief already wants).
- CRDT infra cost/complexity: extra client+server library, larger document payloads (tombstones/metadata grow over time), a sync server (Y-Sweet/Hocuspocus/Liveblocks) to run and pay for, and harder debugging of merged state.

## Verdict for Hermes
Server-authoritative + versioned artifacts + optimistic UI is very likely sufficient. Reserve CRDT/Yjs only if you later want true simultaneous free-form co-editing of the same text region by human and agent. For now CRDT = added cost/complexity without a matching contention problem.

Confidence: MEDIUM-HIGH (reasoned from architecture; no single source says "don't use CRDT for 1+1", but the contention argument is well established).
