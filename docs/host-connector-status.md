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
      https://qualified-alligator-800.convex.site/agent/*
```

MacBook Neo was only the original setup terminal. It is **not** the Hermes runtime.

## What was installed

User plugin at:

```text
/home/hermes/.hermes/plugins/canvas
  plugin.yaml
  __init__.py      # hooks + tools
  client.py        # authenticated /agent/* client
```

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
HERMES_CANVAS_BASE_URL=https://qualified-alligator-800.convex.site
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
