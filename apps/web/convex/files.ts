import type { ApiError } from "@hermes/contract";
import { CanvasError, rejectionEvent } from "@hermes/contract";
import { isDemoBypassEnabled } from "@hermes/env";
import { LIMITS } from "@hermes/policy";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  httpAction,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import type { AuthCtx } from "./authGuard";
import { appendEvent } from "./lib/store";

/**
 * Attachment upload + serving (OWNER: COURIER, plan §4 / §7).
 *
 * Two responsibilities live here, both security-load-bearing:
 *
 *  1. `generateUploadUrl` — the owner-only mutation the composer calls to get a
 *     Convex storage upload URL. Human auth is enforced here (the frontend is not a
 *     trust boundary, plan §6); the demo bypass is honored only in non-production.
 *
 *  2. `serveAttachment` — serves stored bytes as a DOWNLOAD, never inline. A
 *     user-uploaded `.html`/`.svg` must never render in the app origin (stored-XSS
 *     class, plan §4). We force `Content-Type: application/octet-stream`,
 *     `X-Content-Type-Options: nosniff`, and `Content-Disposition: attachment`, plus
 *     a belt-and-braces `Content-Security-Policy: sandbox`. This is the WARDEN
 *     header policy; the size cap is imported from `@hermes/policy` so client and
 *     server name the exact same 10 MB limit.
 *
 * WIRING: Convex serves exactly one HTTP router (`convex/http.ts`). It mounts the
 * owner-guarded human download at `/attachments/:id` (`serveAttachment`) and the
 * service-token agent read at `/agent/attachments/:id` (which calls the shared
 * `respondWithAttachment`), so both paths apply the identical byte policy.
 *
 * BINDING: an upload is a two-step flow. `generateUploadUrl` mints the one-shot
 * storage URL; after the client PUTs the bytes it calls `bindAttachment`, which
 * reads the size + sha256 Convex computed at ingest, enforces the 10 MB cap
 * SERVER-side (oversize ⇒ the blob is deleted and a `limit_rejected` event is
 * recorded — evidence, not silence), and only then records the `attachments` row
 * that the serving paths key on. The `attachments` table + `messages.attachments`
 * are additive schema (plan §3, §9).
 */

// ---------------------------------------------------------------------------
// Header policy (pure, testable). Replace with `@hermes/policy` exports verbatim
// once WARDEN publishes the attachment header helper; the shape is intentionally
// the one WARDEN's spec describes so the swap is a re-import, not a rewrite.
// ---------------------------------------------------------------------------

// Control chars (NUL..US and DEL). CR/LF here are the header-injection vector.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-]/g;
// Anything outside printable ASCII, for the Content-Disposition ascii fallback.
const NON_ASCII = /[^ -~]/g;

/** Strip control chars and header-injection vectors from a user-supplied filename. */
export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(CONTROL_CHARS, "").replace(/["\\]/g, "").replace(/\//g, "_").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 255) : "attachment";
}

/**
 * The exact response headers every attachment is served with. Download-only,
 * un-sniffable, and inert even if a browser ignored the disposition.
 */
export function attachmentHeaders(
  filename: string,
  contentLength?: number,
): Record<string, string> {
  const safe = sanitizeFilename(filename);
  const asciiFallback = safe.replace(NON_ASCII, "_");
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safe)}`,
    // Defense in depth: even if disposition were ignored, nothing can execute.
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": "private, no-store",
  };
  if (contentLength !== undefined && Number.isFinite(contentLength)) {
    headers["Content-Length"] = String(contentLength);
  }
  return headers;
}

/** The authoritative attachment size cap (10 MB), from WARDEN's policy. */
export const MAX_ATTACHMENT_BYTES = LIMITS.maxAttachmentBytes;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Require the authenticated owner. Demo bypass is honored only off-production.
 * Typed to the minimal `AuthCtx` (just `ctx.auth`) so it guards both the upload
 * mutations and the browser metadata query.
 */
async function requireOwner(ctx: AuthCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) return;
  if (isDemoBypassEnabled()) return;
  throw new Error("unauthorized: owner sign-in required");
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Mint a one-shot Convex storage upload URL for the owner. The client PUTs the file
 * bytes directly to this URL (with its own 10 MB guard already applied) and receives
 * a storage id back from Convex, which it then attaches to the outgoing message.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireOwner(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Outcome of binding an uploaded blob to an attachment record. */
export type BindOutcome =
  | { ok: true; attachment_id: string; sha256: string; size: number }
  | { ok: false; error: ApiError };

/**
 * Validate and bind an uploaded blob (owner-only). The client uploads to the URL
 * from `generateUploadUrl`, then calls this with the returned storage id.
 *
 * The 10 MB cap is enforced HERE, server-side, off the size Convex measured at
 * ingest — the client's own guard is a courtesy, not the trust boundary. An
 * oversize blob is deleted (storage delete is allowed; it is not append-only
 * history) and rejected with a structured `oversize` error plus a `limit_rejected`
 * event, so a blocked upload is evidence. The `sha256` is the digest Convex
 * computed at ingest, never a client-supplied value.
 */
export const bindAttachment = mutation({
  args: { storage_id: v.string(), name: v.string(), mime: v.optional(v.string()) },
  handler: async (ctx, args): Promise<BindOutcome> => {
    await requireOwner(ctx);
    const now = Date.now();
    const storageId = args.storage_id as Id<"_storage">;
    const meta = await ctx.db.system.get(storageId);
    if (!meta) {
      // The blob was never uploaded (or already gone) — nothing to bind.
      return { ok: false, error: CanvasError.notFound(`upload ${args.storage_id}`).error };
    }

    if (meta.size > MAX_ATTACHMENT_BYTES) {
      await ctx.storage.delete(storageId);
      const err = CanvasError.oversize({
        limit: "ATTACHMENT_BYTES",
        limit_value: MAX_ATTACHMENT_BYTES,
        actual: meta.size,
        unit: "bytes",
      });
      await appendEvent(ctx, rejectionEvent(err, "human", {}, now));
      return { ok: false, error: err.error };
    }

    const attachmentId = await ctx.db.insert("attachments", {
      file_id: args.storage_id,
      name: sanitizeFilename(args.name),
      mime: args.mime ?? meta.contentType ?? "application/octet-stream",
      size: meta.size,
      sha256: meta.sha256,
      uploaded_by: "human",
      at: now,
    });
    return { ok: true, attachment_id: attachmentId, sha256: meta.sha256, size: meta.size };
  },
});

// ---------------------------------------------------------------------------
// Metadata read (browser)
// ---------------------------------------------------------------------------

/**
 * The chip-rendering metadata for one bound attachment. Deliberately does NOT
 * include `file_id` (the `_storage` id) — that stays internal to the serving
 * paths; the browser only ever needs the display name, MIME, and size to render a
 * chip, and reaches the bytes through the owner-guarded `/attachments/:id` route.
 */
export interface AttachmentMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
}

/**
 * Resolve a batch of attachment ids to their display metadata (owner-only). The
 * chat feed carries only attachment ids (`FeedMessage.attachments`); the browser
 * calls this to turn those into name + size chips. Unknown or malformed ids are
 * silently skipped (a dangling reference renders nothing rather than erroring the
 * whole batch). Owner-guarded like every other browser-facing reader — the raw
 * `attachments` table is never world-readable over the public Convex API.
 */
export const listAttachmentsMeta = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args): Promise<AttachmentMeta[]> => {
    await requireOwner(ctx);
    const out: AttachmentMeta[] = [];
    for (const raw of args.ids) {
      const id = ctx.db.normalizeId("attachments", raw);
      if (!id) continue;
      const doc = await ctx.db.get(id);
      if (!doc) continue;
      out.push({ id: raw, name: doc.name, mime: doc.mime, size: doc.size });
    }
    return out;
  },
});

// ---------------------------------------------------------------------------
// Serving (download-only)
// ---------------------------------------------------------------------------

/** Minimal safe headers for an error response (no body sniffing). */
const ERROR_HEADERS = { "Content-Type": "text/plain", "X-Content-Type-Options": "nosniff" };

/** The subset of an attachment row the serving paths need. */
export interface AttachmentRef {
  file_id: string;
  name: string;
  size: number;
}

/**
 * Resolve an attachment id to its stored-blob reference. Internal — the serving
 * HTTP actions (agent + human) call it via `ctx.runQuery`; there is no public
 * (browser-callable) query that exposes the storage id.
 */
export const attachmentRef = internalQuery({
  args: { attachment_id: v.string() },
  handler: async (ctx, args): Promise<AttachmentRef | null> => {
    const id = ctx.db.normalizeId("attachments", args.attachment_id);
    if (!id) return null;
    const doc = await ctx.db.get(id);
    if (!doc) return null;
    return { file_id: doc.file_id, name: doc.name, size: doc.size };
  },
});

/**
 * Serve an attachment's bytes as a download, given its attachment id. Shared by
 * BOTH serving routes so the byte policy cannot diverge: authorization is the
 * caller's job (service token for the agent route, owner identity for the human
 * route); this function only resolves → size-checks → serves. The 10 MB serve
 * refusal is defense in depth even though `bindAttachment` already capped ingest.
 */
export async function respondWithAttachment(ctx: ActionCtx, attachmentId: string): Promise<Response> {
  const ref = await ctx.runQuery(internal.files.attachmentRef, { attachment_id: attachmentId });
  if (!ref) {
    return new Response("not found", { status: 404, headers: ERROR_HEADERS });
  }
  if (ref.size > MAX_ATTACHMENT_BYTES) {
    return new Response("attachment too large", { status: 413, headers: ERROR_HEADERS });
  }
  const blob = await ctx.storage.get(ref.file_id as Id<"_storage">);
  if (!blob) {
    return new Response("not found", { status: 404, headers: ERROR_HEADERS });
  }
  if (blob.size > MAX_ATTACHMENT_BYTES) {
    return new Response("attachment too large", { status: 413, headers: ERROR_HEADERS });
  }
  return new Response(blob, { status: 200, headers: attachmentHeaders(ref.name, blob.size) });
}

/**
 * Human download route (`GET /attachments/:id`, mounted in `http.ts`). Requires
 * the authenticated owner (demo bypass only off-production); the id is the last
 * path segment. Delegates the bytes to `respondWithAttachment`.
 */
export const serveAttachment = httpAction(async (ctx, request) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity && !isDemoBypassEnabled()) {
    return new Response("unauthorized", { status: 401, headers: ERROR_HEADERS });
  }
  const attachmentId = new URL(request.url).pathname.split("/").filter(Boolean).pop();
  if (!attachmentId) {
    return new Response("bad request", { status: 400, headers: ERROR_HEADERS });
  }
  return respondWithAttachment(ctx, attachmentId);
});
