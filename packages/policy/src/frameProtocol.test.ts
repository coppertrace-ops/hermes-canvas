import { describe, expect, it } from "vitest";
import {
  isFromAppOrigin,
  isFromShell,
  readRenderMessage,
  readShellMessage,
  renderMessageSchema,
  shellMessageSchema,
} from "./frameProtocol";

/** Two distinct opaque "window" references — identity is by reference only. */
const shellWindow = { name: "shell" };
const foreignWindow = { name: "foreign" };
const iframe = { contentWindow: shellWindow };
const APP = "https://hermes-canvas.vercel.app";

describe("isFromShell — parent-side source-identity check", () => {
  it("accepts an event whose source IS the iframe's contentWindow", () => {
    expect(isFromShell({ data: {}, source: shellWindow, origin: "null" }, iframe)).toBe(true);
  });

  it("rejects a foreign window even when it claims a valid origin", () => {
    expect(isFromShell({ data: {}, source: foreignWindow, origin: APP }, iframe)).toBe(false);
  });

  it("rejects a null/absent source (cannot be spoofed into a match)", () => {
    expect(isFromShell({ data: {}, source: null }, iframe)).toBe(false);
    expect(isFromShell({ data: {} }, iframe)).toBe(false);
  });

  it("rejects when the iframe has no contentWindow (unmounted)", () => {
    expect(isFromShell({ data: {}, source: shellWindow }, { contentWindow: null })).toBe(false);
  });
});

describe("isFromAppOrigin — shell-side exact-origin check", () => {
  it("accepts an exact origin match", () => {
    expect(isFromAppOrigin({ data: {}, origin: APP }, APP)).toBe(true);
  });

  it("rejects the opaque-origin sentinel, mismatches, prefixes and wildcards", () => {
    expect(isFromAppOrigin({ data: {}, origin: "null" }, APP)).toBe(false);
    expect(isFromAppOrigin({ data: {}, origin: "https://evil.example" }, APP)).toBe(false);
    expect(isFromAppOrigin({ data: {}, origin: "https://hermes-canvas.vercel.app.evil.com" }, APP)).toBe(false);
    expect(isFromAppOrigin({ data: {}, origin: "http://hermes-canvas.vercel.app" }, APP)).toBe(false); // scheme
    expect(isFromAppOrigin({ data: {}, origin: "*" }, APP)).toBe(false);
    expect(isFromAppOrigin({ data: {}, origin: "" }, APP)).toBe(false);
  });

  it("rejects when the configured app origin is empty (misconfiguration is not open)", () => {
    expect(isFromAppOrigin({ data: {}, origin: "" }, "")).toBe(false);
  });
});

describe("wire schemas", () => {
  it("renderMessageSchema accepts a well-formed render and rejects malformed", () => {
    expect(renderMessageSchema.safeParse({ type: "render", html: "<h1>", artifactId: "art_1", seq: 3 }).success).toBe(true);
    expect(renderMessageSchema.safeParse({ type: "render", html: "<h1>", artifactId: "art_1", seq: -1 }).success).toBe(false);
    expect(renderMessageSchema.safeParse({ type: "render", html: 5, artifactId: "art_1", seq: 3 }).success).toBe(false);
    expect(renderMessageSchema.safeParse({ type: "ready" }).success).toBe(false);
  });

  it("shellMessageSchema accepts only the ready/height/render_error whitelist", () => {
    expect(shellMessageSchema.safeParse({ type: "ready" }).success).toBe(true);
    expect(shellMessageSchema.safeParse({ type: "height", height: 420 }).success).toBe(true);
    expect(shellMessageSchema.safeParse({ type: "render_error", message: "boom" }).success).toBe(true);
    // Non-whitelisted / content-bearing messages are rejected outright.
    expect(shellMessageSchema.safeParse({ type: "exfil", data: "secret" }).success).toBe(false);
    expect(shellMessageSchema.safeParse({ type: "render", html: "x", artifactId: "a", seq: 1 }).success).toBe(false);
    expect(shellMessageSchema.safeParse({ type: "height" }).success).toBe(false); // missing height
  });
});

describe("readShellMessage — hostile synthesized events (parent side)", () => {
  it("returns the message only for correct-source + whitelisted shape", () => {
    const ev = { data: { type: "height", height: 100 }, source: shellWindow, origin: "null" };
    expect(readShellMessage(ev, iframe)).toEqual({ type: "height", height: 100 });
  });

  it("rejects a foreign window even with a perfectly valid payload", () => {
    const ev = { data: { type: "ready" }, source: foreignWindow, origin: APP };
    expect(readShellMessage(ev, iframe)).toBeNull();
  });

  it("rejects a non-whitelisted type from the correct window", () => {
    const ev = { data: { type: "steal", cookies: "..." }, source: shellWindow, origin: "null" };
    expect(readShellMessage(ev, iframe)).toBeNull();
  });

  it("never throws on garbage data", () => {
    for (const data of [null, undefined, 42, "str", [], { type: 1 }]) {
      expect(readShellMessage({ data, source: shellWindow }, iframe)).toBeNull();
    }
  });
});

describe("readRenderMessage — hostile synthesized events (shell side)", () => {
  it("returns the render message only for exact app origin + valid shape", () => {
    const ev = { data: { type: "render", html: "<p>hi</p>", artifactId: "art_2", seq: 7 }, origin: APP };
    expect(readRenderMessage(ev, APP)).toEqual({ type: "render", html: "<p>hi</p>", artifactId: "art_2", seq: 7 });
  });

  it("rejects a valid render from a wrong / opaque origin", () => {
    const good = { type: "render", html: "<p>hi</p>", artifactId: "art_2", seq: 7 };
    expect(readRenderMessage({ data: good, origin: "https://evil.example" }, APP)).toBeNull();
    expect(readRenderMessage({ data: good, origin: "null" }, APP)).toBeNull();
  });

  it("rejects a malformed render even from the right origin", () => {
    expect(readRenderMessage({ data: { type: "render", html: "x" }, origin: APP }, APP)).toBeNull();
    expect(readRenderMessage({ data: { type: "ready" }, origin: APP }, APP)).toBeNull();
  });
});
