# Hermes host connector install (DigitalOcean / hermes-box)

Status as of 2026-07-13: **installed and verified** on the live Hermes gateway host.

## Topology

```text
This chat session
  → Docker tool backend
  → Mac mini (SSH)
  → hermes-box / DigitalOcean droplet
      ~/.hermes/plugins/canvas   (user plugin)
      HERMES_CANVAS_BASE_URL
      HERMES_SERVICE_TOKEN
  → Convex HTTP surface
      https://adjoining-swan-820.convex.site/agent/*
```

MacBook Neo was only the original setup terminal. It is **not** the Hermes runtime.

## What was installed

User plugin at:

```text
/home/hermes/.hermes/plugins/canvas
  plugin.yaml
  __init__.py      # hooks + tools + gateway-only reporter daemons
  client.py        # authenticated /agent/* client
```

A byte-exact provenance copy of the deployed `__init__.py` + `client.py` lives
in `docs/host-plugin-snapshot/` (not committed).

### Gateway-only reporter daemons

The plugin runs three background daemons, each a flock-guarded singleton that
starts only inside the long-lived gateway process (never per-turn workers):

- **Jobs reporter** (`.jobs_reporter.lock`) — registers the connector heartbeat
  and mirrors real hermes cron runs into the Canvas cron viewer.
- **Status reporter** (`.status_reporter.lock`) — `PUT /agent/status` every
  ~5 min plus an opportunistic, ≥60 s-debounced report after each turn
  (`post_llm_call`), feeding the Settings → Agent panel. Reads the live route
  and context from the in-process `GatewayRunner._agent_cache` (reached by a
  cached gc reflection, since `PluginContext` does not expose the runner) and
  falls back to `~/.hermes/config.yaml` + gateway package metadata. Every field
  is best-effort: unreadable fields are omitted, never fabricated.
- **Memory shipper** (shares the status thread) — `PUT /agent/memory` full
  mirror of the curated memory store (`~/.hermes/memories/MEMORY.md` +
  `USER.md`, `§`-delimited) on gateway start and every ~15 min when changed.
  Entry ids are stable content hashes; content is passed through
  `agent.redact.redact_sensitive_text` before leaving the host.

### Live tool-call receipts (2026-07-15)

The `pre_tool_call` / `post_tool_call` hooks are **live** (previously muted).
Each tool invocation posts `PUT /agent/tool-calls/{tool_call_id}` — a `running`
receipt at start, then a terminal `ok|error|blocked` update to the same id at
completion — feeding the live tool-call timeline. Args/results are redacted with
`agent.redact.redact_sensitive_text` on the host (the hook layer is upstream of
the display redactor) then truncated UTF-8-safely to the endpoint caps
(args_summary ≤500 B, result_tail ≤2048 B, error_message ≤2048 B). Posting is
fire-and-forget via a single background worker with a dedicated 5 s-timeout
client, so a slow Canvas never adds tool latency; a full queue or a 429 (the
endpoint's separate 120/min bucket) drops the receipt silently (429 logs at most
once/min, never retried). Set `HERMES_CANVAS_TOOLRECEIPT_DEBUG=1` to log each
post's id/status/http (no payloads); `HERMES_CANVAS_TOOLRECEIPT_SKIP=a,b` skips
named chatty tools (empty by default — none warranted). Verified end-to-end via
a live `canvas_list_artifacts` turn: one `tool_call_id` posted `running`→`ok`,
both HTTP 200.

Config:

```yaml
plugins:
  enabled:
    - canvas
platform_toolsets:
  cli:      [..., canvas]
  telegram: [..., canvas]
  signal:   [..., canvas]
```

Env on hermes-box (`~/.hermes/.env`):

```text
HERMES_CANVAS_BASE_URL=https://adjoining-swan-820.convex.site
HERMES_SERVICE_TOKEN=<raw 256-bit token>
```

Convex deployment env:

```text
HERMES_SERVICE_TOKEN_SHA256=<sha256 of token>
```

## Two layers (important design)

### 1. Automatic observer hooks
No model memory required. Emits receipts for:

- session start / end / finalize
- turn start (user message receipt)
- assistant final response
- tool start / tool result / tool error
- subagent start / stop
- API/model errors

### 2. Intentional canvas tools
Model-callable when a durable artifact is warranted:

- `canvas_get_updates`
- `canvas_post_message`
- `canvas_list_artifacts`
- `canvas_read_artifact`
- `canvas_create_artifact`
- `canvas_update_artifact`
- `canvas_archive_artifact`

## Verification evidence

| Check | Result |
|---|---|
| Gateway active | `hermes-gateway.service` active |
| Plugin enabled | `canvas` user plugin enabled |
| Tools enabled | canvas on cli + telegram (+ signal) |
| Plugin registered | `canvas plugin registered` + `canvas poller starting` in agent.log |
| Direct service-token write | `post_message` + `create_artifact` succeeded |
| Intentional tool path | `canvas_list_artifacts` used in live `hermes chat` turn |
| Live artifacts | `art_1`, `art_2`, `art_3` present in Convex |

Example live chat turn:

```text
hermes chat -q "Use canvas_list_artifacts then reply with only the artifact titles." \
  --provider xai -m grok-4.5 -t canvas

→ Connector smoke
  Wave1 host connector
  Wave1 connector status
```

## Known remaining gaps

1. **Protected public web deploy still needs one-time owner bootstrap**  
   JWT keys + `OWNER_EMAIL` + bootstrap secret + remove bootstrap secret. See `docs/runbook.md`.

2. **Human Canvas → Hermes inbound bridge is provisional**  
   The poller mirrors human Canvas messages into Telegram home as clearly labeled Canvas-originated messages. That is good enough for first use, but not the long-term same-session injection path. Better later: gateway-native inject / webhook.

3. **Automatic hook receipts are agent-authored message events**  
   They land in the agent event/message stream. Browser live UI still needs owner auth + live adapters to show them as the primary workspace view.

4. **Primary OpenAI model quota is currently exhausted**  
   Fallback `xai / grok-4.5` works and was used for the live tool proof.

## Operator commands

```bash
# status
ssh hermes-box 'hermes plugins list --plain --no-bundled; hermes tools list --platform telegram | rg canvas'

# re-enable after config edits
ssh hermes-box 'hermes plugins enable canvas --no-allow-tool-override'
ssh hermes-box 'hermes tools enable canvas --platform cli'
ssh hermes-box 'hermes tools enable canvas --platform telegram'

# gateway reload (must be outside the gateway process tree)
ssh hermes-box 'systemctl --user restart hermes-gateway.service'
```

## Rotation

1. Mint a new token (repo): `pnpm --filter @hermes/connector provision:token`
2. Set Convex hash: `npx convex env set HERMES_SERVICE_TOKEN_SHA256 <hash>`
3. Update hermes-box `HERMES_SERVICE_TOKEN`
4. Restart gateway from an external shell
