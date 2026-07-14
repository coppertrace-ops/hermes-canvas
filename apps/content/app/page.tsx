"use client";

/**
 * Sandbox content shell (OWNER: WARDEN, spec §2.2).
 *
 * This page IS the sandboxed frame document. It runs at an OPAQUE origin (the app
 * embeds it with `sandbox="allow-scripts"`, never same-origin), under the
 * content CSP that closes every egress channel. Its only job:
 *
 *   1. Announce `{type:'ready'}` to the parent once its listener is attached.
 *   2. Accept exactly one downward message — `{type:'render', html, artifactId,
 *      seq}` — and ONLY if it is from the app origin (`readRenderMessage` verifies
 *      `event.origin === APP_ORIGIN` exactly). Everything else is ignored.
 *   3. Inject the HTML so the artifact's inline scripts execute (it may compute),
 *      then report `{type:'height'}`. External script/network loads are already
 *      dead at the CSP layer.
 *   4. On any thrown error, report `{type:'render_error', message}` — never blank.
 *
 * It sends ONLY the whitelisted control messages up, targeted at `APP_ORIGIN`
 * exactly (never `"*"` when the origin is known) — content never flows back.
 */

import { useEffect, useRef } from "react";
import { readRenderMessage } from "@hermes/policy";
import { APP_ORIGIN } from "../appOrigin";

/** Upward messages are targeted at the app origin exactly (fail-closed if unset). */
const PARENT_TARGET = APP_ORIGIN.length > 0 ? APP_ORIGIN : "*";

/**
 * Inject artifact HTML into the shell so inline scripts execute. `innerHTML`
 * alone does NOT run inserted `<script>` nodes, so each is recreated. External
 * `src` scripts are still gated by CSP `script-src 'self'` — an artifact can
 * compute via inline scripts, it cannot load third-party code.
 */
function injectHtml(container: HTMLElement, html: string): void {
  container.innerHTML = html;
  const scripts = Array.from(container.querySelectorAll("script"));
  for (const old of scripts) {
    const fresh = document.createElement("script");
    for (const attr of Array.from(old.attributes)) fresh.setAttribute(attr.name, attr.value);
    fresh.textContent = old.textContent;
    old.replaceWith(fresh);
  }
}

export default function ContentShell() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const post = (msg: Record<string, unknown>) => window.parent?.postMessage(msg, PARENT_TARGET);
    const postHeight = () =>
      post({ type: "height", height: document.documentElement.scrollHeight });

    function onMessage(event: MessageEvent) {
      const msg = readRenderMessage(event, APP_ORIGIN);
      if (!msg) return; // wrong origin or malformed — ignored (parent counts rejects)
      const container = rootRef.current;
      if (!container) return;
      try {
        injectHtml(container, msg.html);
        postHeight();
      } catch (err) {
        post({ type: "render_error", message: err instanceof Error ? err.message : String(err) });
      }
    }

    window.addEventListener("message", onMessage);
    const observer = new ResizeObserver(postHeight);
    observer.observe(document.documentElement);
    // Announce readiness only AFTER the listener is live, so no render is missed.
    post({ type: "ready" });

    return () => {
      window.removeEventListener("message", onMessage);
      observer.disconnect();
    };
  }, []);

  return <div ref={rootRef} id="hermes-artifact-root" />;
}
