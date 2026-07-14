# Fable staged implementation plan — Canvas chat as Hermes platform

Execution-ready plan for Opus agents. Research base: `.hermes/research/canvas-chat-platform/{01,02,03}-*.md`.  
**Decision taken: Option Platform-Plugin** — implement Canvas chat as a Hermes **gateway plugin platform adapter** (Telegram-class), with Convex as store and a time-boxed **assistant-ui** spike for chat chrome. **Hermes remains external**; no agent loop in Convex.

**Binding product constraints**
- Chat is an operational workspace channel, not generic AI canvas chrome.
- **No Telegram transport** for Canvas human messages in the target design.
- Artifacts stay tool/plugin territory; chat I/O is platform-only.
- **No implementation until Frank approves this plan.**

---

## 1. Architecture

```text
Browser (owner) ──Convex Auth──► Convex (messages, events, ack)
                                      ▲
Hermes gateway                        │ Bearer service token
  platform: canvas ──poll/push undelivered humans──┘
       │ handle_message → agent turn
       └── send() → POST /agent/messages (+ typing/stream later)
```

Load-bearing properties:
1. **One inbound path:** Canvas human → undelivered query → adapter `handle_message` (real agent turn).
2. **One outbound path:** adapter `send` → Convex agent message (not `post_llm_call` primary, not `hermes send`).
3. **Durable ack** after successful handoff to gateway (existing `agent_delivered_at`).
4. **Singleton poller** (flock + gateway-process-only) until push exists.
5. **UI kit is a spike gate**, not a sacred rewrite.

---

## 2. Phases

| Phase | Name | Entry | Exit gate |
|-------|------|-------|-----------|
| P0 | Freeze + kill-switches | Plan approved | Document current interim path; disable Telegram inject for humans |
| P1 | Platform adapter skeleton | P0 | `register_platform(canvas)` connects; `hermes gateway status` shows canvas |
| P2 | Inbound human path | P1 | One Canvas human msg → one agent turn (logs prove platform=canvas) |
| P3 | Outbound send path | P2 | Agent reply appears once in Canvas UI (no double post) |
| P4 | UI spike (assistant-ui) | P2 parallel OK | Spike pass/fail recorded; choose kit or keep hand-rolled |
| P5 | Integration + teardown | P3+P4 | E2E hard-refresh: send hello → single reply; no Telegram required |
| P6 | Hardening | P5 | Tests for ack/dedupe; docs; remove dead bridge code |

---

## 3. Work packages (path-exclusive)

### WP-A — Platform adapter (Opus, host + hermes-agent plugin)
**Owns:** `~/.hermes/plugins/canvas/` split or new `plugins/platforms/canvas_chat/`  
**Do:**
1. `plugin.yaml` + `register(ctx.register_platform(...))` following Telegram pattern.
2. `CanvasAdapter(BasePlatformAdapter)`: connect/disconnect/send/send_typing/get_chat_info.
3. Inbound: flocked poller of undelivered humans only; build `MessageEvent`; `handle_message`; ack after accept.
4. Outbound: `send` → existing `POST /agent/messages`.
5. Remove human path that uses `hermes send` or generic webhook→telegram for transport.
6. Keep artifact tools as separate tool registration (no chat rows from tool hooks).

**Tests:** unit mock Convex; integration script: inject human → expect one agent message.

### WP-B — Contract/backend (if needed)
**Owns:** `apps/web/convex/{canvas,human,http}.ts` only if gaps  
**Likely:**
- Ensure list messages streaming fields for typing/stream_id (if P4 needs)
- Keep ack endpoint stable
- Optional: agent typing status mutation (only if spike requires)

### WP-C — Chat UI spike (Opus, web only)
**Owns:** `apps/web/components/chat/**`  
**Do:**
1. 1-day spike: assistant-ui over Convex message query.
2. Acceptance checklist from `02-chat-ui-frameworks.md`.
3. If fail: improve hand-rolled MessageBubble (markdown + StreamingDots) instead of full kit.

### WP-D — Verification
**Owns:** scripts + manual checklist  
- Hard-refresh UI; send “ping”; single reply; artifacts still work; no 4× Telegram.

---

## 4. Explicit non-goals (this plan)
- Multi-user / multi-workspace tenancy
- Instagram / extra social
- Replacing Convex
- Full board/html polish
- Core Hermes PR (plugin path only unless blocked)

---

## 5. Risks (from adversarial memo)
| Risk | Mitigation |
|------|------------|
| Poller still racy | flock + gateway-only + durable ack |
| Double bubbles | kill post_llm as primary; single send path |
| assistant-ui glue explosion | 1-day kill criterion |
| Session fragmentation | stable `chat_id=canvas:home` |
| Scope bleed into artifacts | path locks |

---

## 6. Human unblockers
| Item | Who | When |
|------|-----|------|
| Approve this plan | Frank | before WP-A code |
| Optional: `claude auth login` on Mac mini | Frank | if deeper Opus CLI desired |
| Gateway restart after plugin install | Hermes/host | after WP-A |

**Required human now:** plan approval only.

---

## 7. Wave feel (what Frank sees when done)
1. Type in Canvas chat → Hermes answers **in Canvas** (one bubble).
2. Markdown looks good; typing indicator while working.
3. Artifacts rail still works; no Telegram spam from Canvas humans.
4. Telegram remains a separate home channel for non-Canvas work.

---

## 8. Implementation order for agents
```
WP-A P0–P3 (serial) → WP-C spike (parallel after P1) → WP-D → WP-A P6 teardown
```

## 9. Definition of done
- [ ] Canvas human message processed with `platform=canvas` in gateway logs
- [ ] Exactly one assistant message in Convex per turn
- [ ] UI shows it without hard-reload (live query)
- [ ] Zero reliance on Telegram for that path
- [ ] Dead code removed or feature-flagged off
- [ ] Memo updated: researched → planned → implemented → verified

---

**Approve with:** `approve chat platform plan` (or list edits).  
**Do not implement until then.**
