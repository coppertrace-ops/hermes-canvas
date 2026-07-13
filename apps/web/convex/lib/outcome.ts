import type { ApiError, Author, EventRefs, WriteResult } from "@hermes/contract";
import { CanvasError, rejectionEvent } from "@hermes/contract";
import type { MutationCtx } from "../_generated/server";
import { appendEvent } from "./store";

/**
 * A write mutation's return value.
 *
 * IMPORTANT (Convex semantics): an uncaught throw rolls back the ENTIRE mutation
 * transaction, which would also discard the `limit_rejected` event we record for
 * a blocked write. So rejections are RETURNED, not thrown — the transaction
 * commits, the event persists ("a blocked write is evidence, not silence", plan
 * §3), and the HTTP layer maps `{ ok: false }` to the right 4xx status.
 */
export type WriteOutcome = { ok: true; result: WriteResult } | { ok: false; error: ApiError };

/** Record the rejection event and return a committed failure outcome. */
export async function reject(
  ctx: MutationCtx,
  err: unknown,
  author: Author,
  refs: EventRefs,
  now: number,
): Promise<WriteOutcome> {
  if (err instanceof CanvasError) {
    await appendEvent(ctx, rejectionEvent(err, author, refs, now));
    return { ok: false, error: err.error };
  }
  // Unexpected error: re-throw so it surfaces (and rolls back) rather than
  // masquerading as a structured rejection.
  throw err;
}
