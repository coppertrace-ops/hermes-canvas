import { FRAME_SANDBOX_ATTR, FORBIDDEN_SANDBOX_TOKENS } from "@hermes/policy";
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain-JS mirror consumed by next.config.mjs (no type decls).
import { appCspHostsFromEnv } from "../../appCsp.mjs";
import {
  clampFrameHeight,
  createFrameHost,
  DEFAULT_CONTENT_ORIGIN,
  FRAME_MAX_HEIGHT_PX,
  FRAME_MIN_HEIGHT_PX,
  resolveContentOrigin,
  type FrameHostState,
  type HostFrameLike,
} from "./htmlFrameHost";

/**
 * Parent-side frame-host controller specs (WP5, toward G5).
 *
 * DOM-free, with synthesized hostile events — the same posture as
 * `@hermes/policy`'s frameProtocol tests. Proves: render is posted only after a
 * source-identity-verified `ready`; non-whitelisted messages from our own frame
 * are counted and ignored; foreign-window messages never reach the protocol;
 * failure states are explicit (never a silent blank).
 */

type Posted = { message: unknown; targetOrigin: string };

function makeFrame(): { iframe: HostFrameLike; posted: Posted[]; win: object } {
  const posted: Posted[] = [];
  const win = {
    postMessage(message: unknown, targetOrigin: string) {
      posted.push({ message, targetOrigin });
    },
  };
  return { iframe: { contentWindow: win }, posted, win };
}

const CONTENT = { html: "<h1>hi</h1>", artifactId: "art_9", seq: 3 };

function makeHost(content = CONTENT) {
  const { iframe, posted, win } = makeFrame();
  const states: FrameHostState[] = [];
  const host = createFrameHost(iframe, content, (s) => states.push(s));
  return { host, posted, win, states };
}

describe("createFrameHost — ready → render handshake", () => {
  it("posts nothing before ready", () => {
    const { host, posted } = makeHost();
    expect(host.state.phase).toBe("connecting");
    host.setContent({ ...CONTENT, seq: 4, html: "<p>new</p>" });
    expect(posted).toHaveLength(0);
  });

  it("posts the exact render message after a source-verified ready", () => {
    const { host, posted, win } = makeHost();
    const disposition = host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    expect(disposition).toBe("handled");
    expect(posted).toHaveLength(1);
    expect(posted[0]!.message).toEqual({
      type: "render",
      html: CONTENT.html,
      artifactId: CONTENT.artifactId,
      seq: CONTENT.seq,
    });
    // Opaque-origin recipient: "*" is the only deliverable targetOrigin; safety
    // rests on source identity + addressing the specific window we created.
    expect(posted[0]!.targetOrigin).toBe("*");
    expect(host.state).toEqual({ phase: "active", height: null });
  });

  it("re-posts current content on a shell reload (second ready)", () => {
    const { host, posted, win } = makeHost();
    host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    host.setContent({ ...CONTENT, seq: 5, html: "<p>v5</p>" });
    expect(posted).toHaveLength(2);
    host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    expect(posted).toHaveLength(3);
    expect((posted[2]!.message as { seq: number }).seq).toBe(5);
  });

  it("does not re-post when setContent carries identical content", () => {
    const { host, posted, win } = makeHost();
    host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    host.setContent({ ...CONTENT });
    expect(posted).toHaveLength(1);
  });
});

describe("createFrameHost — hostile / foreign messages", () => {
  it("ignores a ready whose source is not our frame (spoofed identity)", () => {
    const { host, posted } = makeHost();
    const attacker = { postMessage() {} };
    expect(host.handleMessage({ data: { type: "ready" }, source: attacker, origin: "null" })).toBe(
      "not_ours",
    );
    expect(posted).toHaveLength(0);
    expect(host.state.phase).toBe("connecting");
    expect(host.rejectedCount).toBe(0);
  });

  it("counts a non-whitelisted message FROM our frame as a tripwire reject", () => {
    const { host, win } = makeHost();
    expect(
      host.handleMessage({ data: { type: "steal", payload: "x" }, source: win, origin: "null" }),
    ).toBe("rejected");
    expect(
      host.handleMessage({ data: { type: "render", html: "<b>up?</b>", artifactId: "a", seq: 1 }, source: win, origin: "null" }),
    ).toBe("rejected"); // content may never flow UP, even well-formed
    expect(host.rejectedCount).toBe(2);
    expect(host.state.phase).toBe("connecting");
  });

  it("ignores malformed control messages (bad height shape) as rejects", () => {
    const { host, win } = makeHost();
    host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    expect(host.handleMessage({ data: { type: "height", height: "9999" }, source: win, origin: "null" })).toBe("rejected");
    expect(host.state).toEqual({ phase: "active", height: null });
  });

  it("never throws on garbage events", () => {
    const { host } = makeHost();
    for (const data of [null, undefined, 42, "ready", { type: null }, []]) {
      expect(() => host.handleMessage({ data, source: null, origin: "https://evil.example" })).not.toThrow();
    }
    expect(host.state.phase).toBe("connecting");
  });
});

describe("createFrameHost — heights, errors, timeout", () => {
  it("applies clamped heights only while active", () => {
    const { host, win, states } = makeHost();
    host.handleMessage({ data: { type: "height", height: 500 }, source: win, origin: "null" });
    expect(host.state.phase).toBe("connecting"); // height before ready is ignored
    host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    host.handleMessage({ data: { type: "height", height: 500 }, source: win, origin: "null" });
    expect(host.state).toEqual({ phase: "active", height: 500 });
    host.handleMessage({ data: { type: "height", height: 10 ** 9 }, source: win, origin: "null" });
    expect(host.state).toEqual({ phase: "active", height: FRAME_MAX_HEIGHT_PX });
    expect(states.length).toBeGreaterThanOrEqual(3);
  });

  it("surfaces render_error with its message and recovers on new content", () => {
    const { host, win, posted } = makeHost();
    host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    host.handleMessage({ data: { type: "render_error", message: "boom at line 3" }, source: win, origin: "null" });
    expect(host.state).toEqual({ phase: "render_error", message: "boom at line 3" });
    host.setContent({ ...CONTENT, seq: 6, html: "<p>fixed</p>" });
    expect(posted).toHaveLength(2);
    expect(host.state).toEqual({ phase: "active", height: null });
  });

  it("timeout before ready ⇒ unavailable; a late ready still recovers", () => {
    const { host, win } = makeHost();
    host.timeout();
    expect(host.state.phase).toBe("unavailable");
    host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    expect(host.state).toEqual({ phase: "active", height: null });
  });

  it("timeout after ready is a no-op", () => {
    const { host, win } = makeHost();
    host.handleMessage({ data: { type: "ready" }, source: win, origin: "null" });
    host.timeout();
    expect(host.state).toEqual({ phase: "active", height: null });
  });
});

describe("clampFrameHeight / resolveContentOrigin", () => {
  it("clamps to the documented bounds and rejects non-finite values", () => {
    expect(clampFrameHeight(0)).toBe(FRAME_MIN_HEIGHT_PX);
    expect(clampFrameHeight(Infinity)).toBe(FRAME_MIN_HEIGHT_PX);
    expect(clampFrameHeight(NaN)).toBe(FRAME_MIN_HEIGHT_PX);
    expect(clampFrameHeight(123.6)).toBe(124);
    expect(clampFrameHeight(10 ** 12)).toBe(FRAME_MAX_HEIGHT_PX);
  });

  it("strips trailing slashes and falls back to the default origin", () => {
    expect(resolveContentOrigin("https://x.example//")).toBe("https://x.example");
    expect(resolveContentOrigin("")).toBe(DEFAULT_CONTENT_ORIGIN);
    expect(resolveContentOrigin(undefined)).toBe(DEFAULT_CONTENT_ORIGIN);
  });

  it("default origin matches the app CSP frame-src default (drift guard)", () => {
    expect(appCspHostsFromEnv({}).contentHost).toBe(DEFAULT_CONTENT_ORIGIN);
  });
});

describe("sandbox posture (G5 floor)", () => {
  it("the sandbox attr is allow-scripts only and carries no forbidden token", () => {
    expect(FRAME_SANDBOX_ATTR).toBe("allow-scripts");
    for (const token of FORBIDDEN_SANDBOX_TOKENS) {
      expect(FRAME_SANDBOX_ATTR.includes(token)).toBe(false);
    }
  });
});
