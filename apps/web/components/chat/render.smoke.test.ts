import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AttachmentPreview } from "./AttachmentPreview";
import { MessageBubble } from "./MessageBubble";
import { MockChatPane } from "./ChatPane";
import { SystemEventRow } from "./SystemEventRow";
import { ToolCallCluster, ToolCallRow } from "./ToolCallRow";
import type { AttachmentView, ChatMessage, SystemEvent, ToolCall } from "./types";

const tc = (over: Partial<ToolCall> = {}): ToolCall => ({
  id: "tc1",
  tool: "canvas_update_artifact",
  status: "ok",
  at: 1,
  updatedAt: 1,
  ...over,
});

/**
 * Runtime render smoke tests: prove the real component tree renders without
 * throwing and emits the expected honest states (empty, connecting, error+retry).
 * Uses `renderToStaticMarkup` so it needs no DOM and no extra tooling — the initial
 * server render exercises the full JSX/import graph of the subsystem.
 */

describe("chat render smoke", () => {
  it("renders the assembled mock pane with its empty + connecting states", () => {
    const html = renderToStaticMarkup(h(MockChatPane, {}));
    expect(html).toContain("No messages yet"); // EmptyState
    expect(html).toContain("Connecting"); // ConnectionBanner (pre-subscribe frame)
    expect(html).toContain("Send"); // Composer send button
    expect(html).toContain("Attach"); // Composer attach button
  });

  it("renders a human bubble and an agent bubble", () => {
    const human: ChatMessage = {
      id: "m1",
      role: "human",
      body: "hi there",
      status: "complete",
      attachments: [],
      at: 1,
    };
    const agent: ChatMessage = {
      id: "m2",
      role: "agent",
      body: "hello back",
      status: "complete",
      attachments: [],
      at: 2,
    };
    expect(renderToStaticMarkup(h(MessageBubble, { message: human }))).toContain("hi there");
    expect(renderToStaticMarkup(h(MessageBubble, { message: agent }))).toContain("hello back");
  });

  it("renders a failed message with a visible error and retry control", () => {
    const failed: ChatMessage = {
      id: "m3",
      role: "human",
      body: "nope",
      status: "error",
      error: "network down",
      attachments: [],
      at: 3,
    };
    const html = renderToStaticMarkup(h(MessageBubble, { message: failed, onRetry: () => {} }));
    expect(html).toContain("network down");
    expect(html).toContain("Retry");
  });

  it("renders a system-event row from its summary", () => {
    const event: SystemEvent = {
      id: "evt_9",
      kind: "artifact_updated",
      actor: "agent",
      refs: {},
      at: 4,
      summary: "Hermes updated artifact art_1 → v3",
    };
    expect(renderToStaticMarkup(h(SystemEventRow, { event }))).toContain(
      "Hermes updated artifact art_1 → v3",
    );
  });

  it("renders a running tool-call row with the tool name and a spinner", () => {
    const html = renderToStaticMarkup(
      h(ToolCallRow, { toolCall: tc({ status: "running", argsSummary: "art_1 region" }) }),
    );
    expect(html).toContain("canvas_update_artifact");
    expect(html).toContain("art_1 region");
    expect(html).toContain("hc-spinner"); // running state
    expect(html).toContain('data-status="running"');
  });

  it("renders a completed tool-call row with a duration", () => {
    const html = renderToStaticMarkup(h(ToolCallRow, { toolCall: tc({ status: "ok", durationMs: 1400 }) }));
    expect(html).toContain("1.4s");
    expect(html).toContain('data-status="ok"');
  });

  it("renders a failed tool-call row and its expandable error detail affordance", () => {
    const html = renderToStaticMarkup(
      h(ToolCallRow, { toolCall: tc({ status: "error", errorMessage: "boom: exit 1" }) }),
    );
    expect(html).toContain('data-status="error"');
    // The row is a button (keyboard-expandable) when there is detail to show.
    expect(html).toContain("aria-expanded");
  });

  it("shows a subagent chip when the session differs from the window majority", () => {
    const html = renderToStaticMarkup(
      h(ToolCallRow, { toolCall: tc({ sessionId: "sub" }), majoritySessionId: "main" }),
    );
    expect(html).toContain("subagent");
  });

  it("renders a collapsed tool-call cluster as 'N tool calls'", () => {
    const html = renderToStaticMarkup(
      h(ToolCallCluster, { tools: [tc({ id: "a" }), tc({ id: "b", status: "error" }), tc({ id: "c" })] }),
    );
    expect(html).toContain("3 tool calls");
    expect(html).toContain("1 failed");
  });

  it("renders an attachment with an upload progress bar", () => {
    const uploading: AttachmentView = {
      id: "a1",
      name: "photo.png",
      mime: "image/png",
      size: 2048,
      status: "uploading",
      progress: 0.5,
    };
    const html = renderToStaticMarkup(h(AttachmentPreview, { attachment: uploading }));
    expect(html).toContain("photo.png");
    expect(html).toContain("progressbar");
  });
});
