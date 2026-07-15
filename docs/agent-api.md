# Hermes Canvas — Agent API (v1)

> Generated from `packages/contract` (`renderAgentApiMarkdown`). Do not hand-edit.

Base URL: `https://<deployment>.convex.site` · Auth: `Authorization: Bearer ${HERMES_SERVICE_TOKEN}`

## Behavioural rules

> You write to the Canvas through these tools only. Three rules the evidence demands:
> 1. Read before write: base every update on the seq you last read (fresh parent_seq). A stale parent still lands but is flagged contended.
> 2. Prefer region edits over regenerating whole documents — region edits are the defence against truncation/overwrite failures.
> 3. Give an honest one-line `why` on every write. It is stored next to the server's record of what actually happened.

## Limits

| Limit | Value |
|---|---|
| `VERSION_CONTENT_BYTES` | 262144 |
| `ATTACHMENT_BYTES` | 10485760 |
| `MESSAGE_BYTES` | 32768 |
| `JOB_LOG_TAIL_BYTES` | 16384 |
| `WHY_MAX_CHARS` | 200 |
| `TITLE_MAX_CHARS` | 200 |
| `WRITES_PER_MIN_PER_ARTIFACT` | 20 |
| `AGENT_WRITES_PER_MIN_GLOBAL` | 60 |
| `MESSAGE_COALESCE_MS` | 500 |
| `RATE_WINDOW_MS` | 60000 |

## Tools

### `canvas_get_updates` — `GET /agent/updates`

Fetch new user messages and events since a cursor. Fallback for the WebSocket pendingWork subscription; poll only when the socket is unavailable.

```json
{
  "type": "object",
  "properties": {
    "cursor": {
      "type": "integer",
      "minimum": 0,
      "default": 0
    }
  }
}
```

### `canvas_post_message` — `POST /agent/messages`

Post an assistant chat message. Either {text} for a whole message or {stream_id, delta, done?} to stream. Chunks are coalesced at >= 500 ms; 32768 bytes max per message.

```json
{
  "oneOf": [
    {
      "type": "object",
      "required": [
        "text"
      ],
      "properties": {
        "text": {
          "type": "string"
        }
      }
    },
    {
      "type": "object",
      "required": [
        "stream_id",
        "delta"
      ],
      "properties": {
        "stream_id": {
          "type": "string"
        },
        "delta": {
          "type": "string"
        },
        "done": {
          "type": "boolean"
        }
      }
    }
  ]
}
```

### `canvas_list_artifacts` — `GET /agent/artifacts`

List all artifacts with their current head_seq, type, title, tab, and status.

```json
{
  "type": "object",
  "properties": {}
}
```

### `canvas_read_artifact` — `GET /agent/artifacts/:id`

Read an artifact's current content, or a historical version via ?seq=. Always read before writing so you have a fresh parent_seq.

```json
{
  "type": "object",
  "required": [
    "artifact_id"
  ],
  "properties": {
    "artifact_id": {
      "type": "string"
    },
    "seq": {
      "type": "integer",
      "minimum": 1
    }
  }
}
```

### `canvas_create_artifact` — `POST /agent/artifacts`

Create a canvas artifact. 'why' is required (<= 200 chars); content <= 262144 bytes.

```json
{
  "type": "object",
  "required": [
    "type",
    "title",
    "content",
    "why"
  ],
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "markdown",
        "mermaid",
        "html-static",
        "board"
      ]
    },
    "title": {
      "type": "string",
      "maxLength": 200
    },
    "tab_id": {
      "type": "string"
    },
    "content": {
      "type": "string"
    },
    "why": {
      "type": "string",
      "maxLength": 200
    }
  }
}
```

### `canvas_update_artifact` — `PATCH /agent/artifacts/:id`

Update a canvas artifact. Prefer region edits; always base on the seq you last read. A stale parent_seq still lands (append-only) but is flagged contended.

```json
{
  "type": "object",
  "required": [
    "artifact_id",
    "parent_seq",
    "why",
    "edit"
  ],
  "properties": {
    "artifact_id": {
      "type": "string"
    },
    "parent_seq": {
      "type": "integer",
      "minimum": 0
    },
    "why": {
      "type": "string",
      "maxLength": 200
    },
    "edit": {
      "oneOf": [
        {
          "type": "object",
          "required": [
            "mode",
            "content"
          ],
          "properties": {
            "mode": {
              "const": "replace_all"
            },
            "content": {
              "type": "string"
            }
          }
        },
        {
          "type": "object",
          "required": [
            "mode",
            "anchor",
            "content"
          ],
          "properties": {
            "mode": {
              "const": "region"
            },
            "anchor": {
              "oneOf": [
                {
                  "type": "object",
                  "required": [
                    "heading"
                  ],
                  "properties": {
                    "heading": {
                      "type": "string"
                    }
                  }
                },
                {
                  "type": "object",
                  "required": [
                    "start_line",
                    "end_line"
                  ],
                  "properties": {
                    "start_line": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "end_line": {
                      "type": "integer",
                      "minimum": 1
                    }
                  }
                }
              ]
            },
            "content": {
              "type": "string"
            }
          }
        }
      ]
    }
  }
}
```

### `canvas_archive_artifact` — `POST /agent/artifacts/:id/archive`

Soft-archive an artifact (reversible). There is no delete endpoint.

```json
{
  "type": "object",
  "required": [
    "artifact_id",
    "why"
  ],
  "properties": {
    "artifact_id": {
      "type": "string"
    },
    "why": {
      "type": "string",
      "maxLength": 200
    }
  }
}
```

### `canvas_create_tab` — `PUT /agent/tabs`

Create a tab. Removal is archive-only.

```json
{
  "type": "object",
  "required": [
    "title"
  ],
  "properties": {
    "title": {
      "type": "string",
      "maxLength": 200
    },
    "order": {
      "type": "integer"
    }
  }
}
```

### `canvas_update_tab` — `PATCH /agent/tabs/:id`

Rename, reorder, or archive a tab.

```json
{
  "type": "object",
  "required": [
    "tab_id"
  ],
  "properties": {
    "tab_id": {
      "type": "string"
    },
    "title": {
      "type": "string",
      "maxLength": 200
    },
    "order": {
      "type": "integer"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "archived"
      ]
    }
  }
}
```

### `canvas_register_job` — `PUT /agent/jobs/:key`

Register or update a scheduled job for the cron viewer. The Canvas reports runs; it does not schedule them.

```json
{
  "type": "object",
  "required": [
    "key",
    "name",
    "schedule_cron"
  ],
  "properties": {
    "key": {
      "type": "string"
    },
    "name": {
      "type": "string",
      "maxLength": 200
    },
    "schedule_cron": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "source": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "paused"
      ]
    }
  }
}
```

### `canvas_report_run` — `POST /agent/jobs/:key/runs`

Report a job run at start and completion. log_tail <= 16384 bytes.

```json
{
  "type": "object",
  "required": [
    "key",
    "run_id",
    "status",
    "started_at"
  ],
  "properties": {
    "key": {
      "type": "string"
    },
    "run_id": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "started",
        "succeeded",
        "failed"
      ]
    },
    "started_at": {
      "type": "integer"
    },
    "finished_at": {
      "type": "integer"
    },
    "summary": {
      "type": "string"
    },
    "log_tail": {
      "type": "string"
    }
  }
}
```

### `canvas_get_attachment` — `GET /agent/attachments/:id`

Read a user-shared file — the same bytes the human sees. Served with nosniff + attachment disposition.

```json
{
  "type": "object",
  "required": [
    "attachment_id"
  ],
  "properties": {
    "attachment_id": {
      "type": "string"
    }
  }
}
```

## Infrastructure endpoints

> Service-token endpoints the Hermes gateway calls to report its own state. These are NOT model tools — the model never invokes them — and are consumed only by the owner's Settings panel.

### `agent_report_status` — `PUT /agent/status`

Report the gateway's runtime state (model, provider, effort, context usage, toolsets, sessions, …). Upserts a singleton; the server stamps reported_at. Body <= 16384 bytes.

```json
{
  "type": "object",
  "required": [
    "model",
    "provider"
  ],
  "properties": {
    "model": {
      "type": "string"
    },
    "provider": {
      "type": "string"
    },
    "effort": {
      "type": "string"
    },
    "fallbacks": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "context": {
      "type": "object",
      "properties": {
        "used_tokens": {
          "type": "integer",
          "minimum": 0
        },
        "max_tokens": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "gateway": {
      "type": "object",
      "properties": {
        "version": {
          "type": "string"
        },
        "uptime_s": {
          "type": "number",
          "minimum": 0
        }
      }
    },
    "toolsets": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "platforms": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "sessions_active": {
      "type": "integer",
      "minimum": 0
    },
    "memory": {
      "type": "object",
      "properties": {
        "provider": {
          "type": "string"
        },
        "recall_budget": {
          "type": "number",
          "minimum": 0
        }
      }
    }
  }
}
```

### `agent_sync_memory` — `PUT /agent/memory`

Bulk-mirror the host memory store. Upserts each entry by entry_id; with full:true, local rows absent from the payload are removed (this table mirrors host state, it is not the append-only ledger). <= 500 entries/request; content <= 8192 bytes each.

```json
{
  "type": "object",
  "required": [
    "entries"
  ],
  "properties": {
    "entries": {
      "type": "array",
      "maxItems": 500,
      "items": {
        "type": "object",
        "required": [
          "entry_id",
          "content"
        ],
        "properties": {
          "entry_id": {
            "type": "string"
          },
          "content": {
            "type": "string"
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "source": {
            "type": "string"
          },
          "created_at": {
            "type": "integer",
            "minimum": 0
          },
          "updated_at": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "full": {
      "type": "boolean"
    }
  }
}
```

