/**
 * Local demo seed (OWNER: PROOF integration).
 *
 * Illustrative content used only when there is no live Hermes state to show. It
 * is always presented behind an explicit "Demo data" banner — never dressed up as
 * live agent output. The shapes mirror the `@hermes/render` canvas view models and
 * the COURIER chat view models so the same components render this seed and, later,
 * real Convex-backed state with no change to the render tree.
 */

import type { ArtifactType, Author, RenderState } from "@hermes/contract";
import type { CanvasArtifactView, CanvasTabView } from "@hermes/render";
import type { ChatItem } from "../chat";

/** One artifact's resolved head content, ready for a renderer. */
export interface DemoArtifactContent {
  content: string;
  author: Author;
  why?: string;
  contended: boolean;
  renderState: RenderState;
}

export interface DemoArtifact extends CanvasArtifactView {
  content: DemoArtifactContent;
}

export type DemoTab = CanvasTabView;

// --- Content -----------------------------------------------------------------

const DESIGN_NOTES = `# Design notes

Hermes Canvas is an **authenticated workspace** shared by one human and the Hermes
agent. Every change — human or agent — lands as an *append-only version*, so the
history can never lie about what happened.

## Principles

1. One writer path — every write is a validated mutation.
2. Server-authoritative live updates — each view is a live query.
3. Honest states — empty, loading and error are designed, never blank.

### A note on external images

External images in agent Markdown are **blocked** and shown as a visible
placeholder with the target URL, turning an exfiltration attempt into audit
evidence:

![remote asset](https://example.com/tracker.png)

See the [architecture overview](https://example.com/architecture) for the three
trust origins.

> History that lies is worse than no history.

\`\`\`ts
// Every write records its intent (why) and the system's record of effect.
type ResolvedAction = { op: "create" | "update" | "restore"; seq: number };
\`\`\`
`;

const AUTH_FLOW = `flowchart LR
  H[Human] -->|Convex Auth session| WEB[Next.js app]
  WEB -->|live query subscription| CONVEX[(Convex)]
  AGENT[Hermes agent] -->|Bearer service token| API["/agent/* Canvas API"]
  API --> CONVEX
  CONVEX -->|realtime| WEB`;

const RUNBOOK = `# Runbook

Operational notes for the workspace.

## Deploy

- \`pnpm build\` produces the immutable Vercel build.
- Convex functions deploy atomically from git.
- Rollback is re-promotion of the previous build — never a data migration.

## Secrets

The Hermes service token is a 256-bit random value stored hashed in Convex and in
Hermes' runtime env. Rotation = replace the env var on both sides.
`;

const DEPLOY_GRAPH = `flowchart TD
  A[git push] --> B{CI green?}
  B -->|yes| C[Vercel build]
  B -->|no| D[block + report]
  C --> E[promote to prod]
  E --> F[live]`;

// --- Seed ---------------------------------------------------------------------

export interface DemoSeed {
  tabs: DemoTab[];
  artifacts: DemoArtifact[];
  initialTabId: string;
  initialArtifactId: string;
}

function artifact(
  id: string,
  tabId: string,
  type: ArtifactType,
  title: string,
  headSeq: number,
  changed: boolean,
  content: DemoArtifactContent,
): DemoArtifact {
  return { id, tabId, type, title, status: "active", headSeq, changed, content };
}

/** Build a fresh copy of the demo seed (never shared/mutated across mounts). */
export function buildDemoSeed(): DemoSeed {
  const artifacts: DemoArtifact[] = [
    artifact("demo_notes", "tab_design", "markdown", "Design notes", 12, true, {
      content: DESIGN_NOTES,
      author: "agent",
      why: "tightened the principles section",
      contended: false,
      renderState: "ok",
    }),
    artifact("demo_flow", "tab_design", "mermaid", "Auth flow", 4, false, {
      content: AUTH_FLOW,
      author: "agent",
      why: "added the realtime edge",
      contended: false,
      renderState: "ok",
    }),
    artifact("demo_runbook", "tab_ops", "markdown", "Runbook", 7, true, {
      content: RUNBOOK,
      author: "human",
      contended: false,
      renderState: "ok",
    }),
    artifact("demo_deploy", "tab_ops", "mermaid", "Deploy graph", 3, false, {
      content: DEPLOY_GRAPH,
      author: "agent",
      why: "documented the block-on-red path",
      contended: false,
      renderState: "ok",
    }),
  ];

  const tabs: DemoTab[] = [
    { id: "tab_design", title: "Design", order: 0, status: "active", changedCount: 0 },
    { id: "tab_ops", title: "Operations", order: 1, status: "active", changedCount: 0 },
  ];

  return {
    tabs,
    artifacts,
    initialTabId: "tab_design",
    initialArtifactId: "demo_notes",
  };
}

/** A short, lifelike opening chat transcript for the demo. */
export function buildDemoChatItems(now: number): ChatItem[] {
  return [
    {
      kind: "message",
      message: {
        id: "demo_m1",
        role: "human",
        body: "Can you tighten the principles section of the design notes and add the auth flow diagram?",
        status: "complete",
        attachments: [],
        at: now - 1000 * 60 * 8,
      },
    },
    {
      kind: "message",
      message: {
        id: "demo_m2",
        role: "agent",
        body: "Done — I rewrote the three principles for clarity and added an Auth flow diagram in the Design tab. Both landed as new versions; open History to see exactly what changed.",
        status: "complete",
        attachments: [],
        at: now - 1000 * 60 * 7,
      },
    },
    {
      kind: "system",
      event: {
        id: "demo_e1",
        kind: "artifact_updated",
        actor: "agent",
        refs: { artifact_id: "Design notes", version_seq: 12 },
        at: now - 1000 * 60 * 7,
        summary: "Hermes updated Design notes → v12",
      },
    },
    // A completed same-turn burst — collapses into a "3 tool calls" cluster so a
    // busy turn doesn't drown the transcript.
    demoTool("demo_tc1", "canvas_read_artifact", "ok", "sess_main", "turn_a", now - 1000 * 400, {
      argsSummary: "art_1 (Design notes)",
      resultTail: "# Design notes\n\nHermes Canvas is an authenticated workspace…",
      durationMs: 240,
    }),
    demoTool("demo_tc2", "canvas_read_artifact", "ok", "sess_main", "turn_a", now - 1000 * 399, {
      argsSummary: "art_2 (Auth flow)",
      resultTail: "flowchart LR\n  H[Human] --> WEB[Next.js app]",
      durationMs: 190,
    }),
    demoTool("demo_tc3", "canvas_update_artifact", "ok", "sess_main", "turn_a", now - 1000 * 398, {
      argsSummary: 'art_1 region "Principles" why="tightened wording"',
      resultTail: "head_seq: 12 (contended: false)",
      durationMs: 512,
    }),
    // A subagent tool (its session differs from the window majority) — standalone
    // row with a "subagent" chip.
    demoTool("demo_tc4", "web_search", "ok", "sess_sub", "turn_sub", now - 1000 * 380, {
      argsSummary: "convex live query best practices",
      resultTail: "3 results • top: docs.convex.dev/functions/query-functions",
      durationMs: 1340,
    }),
    {
      kind: "message",
      message: {
        id: "demo_m3",
        role: "human",
        body: "Great. This chat, the canvas, and the version history are all live here — try the theme toggle and drag the divider.",
        status: "complete",
        attachments: [],
        at: now - 1000 * 60 * 6,
      },
    },
    // A live, in-flight call — shows the running spinner + edit-in-place behaviour.
    demoTool("demo_tc5", "bash", "running", "sess_main", "turn_b", now - 1000 * 4, {
      argsSummary: "pnpm -r test",
    }),
  ];
}

/** Build one demo tool-call chat item (view model mirrors the live adapter). */
function demoTool(
  id: string,
  tool: string,
  status: "running" | "ok" | "error" | "blocked",
  sessionId: string,
  turnId: string,
  at: number,
  extra: { argsSummary?: string; resultTail?: string; errorMessage?: string; durationMs?: number },
): ChatItem {
  return {
    kind: "tool",
    toolCall: {
      id,
      tool,
      status,
      sessionId,
      turnId,
      at,
      updatedAt: at,
      startedAt: at,
      finishedAt: status === "running" ? undefined : at + (extra.durationMs ?? 0),
      ...extra,
    },
  };
}
