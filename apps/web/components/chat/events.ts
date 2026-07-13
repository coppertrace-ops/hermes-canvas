/**
 * System-event → chat line formatting (OWNER: COURIER).
 *
 * The chat feed interleaves messages with system lines driven by the ledger's
 * `events` stream (plan §3: "Events drive the chat-side system lines"). This
 * module is the single, pure mapping from a contract `FeedEvent` to the
 * `SystemEvent` view model the row component renders. Kept DOM-free so it is
 * exhaustively unit-testable and so a new event kind is a compile error here
 * (the switch is `never`-checked) rather than a silently unlabeled row.
 */

import type { EventActor, EventKind, EventRefs, FeedEvent } from "@hermes/contract";
import type { SystemEvent } from "./types";

/** Actor label as it reads in a system line. */
function actorName(actor: EventActor): string {
  switch (actor) {
    case "agent":
      return "Hermes";
    case "human":
      return "You";
    case "system":
    default:
      return "System";
  }
}

/** A short, honest one-liner for an event. Never invents detail it doesn't have. */
function summarize(kind: EventKind, actor: EventActor, refs: EventRefs): string {
  const who = actorName(actor);
  const artifact = refs.artifact_id ? ` ${refs.artifact_id}` : "";
  const seq = refs.version_seq !== undefined ? ` → v${refs.version_seq}` : "";
  switch (kind) {
    case "artifact_created":
      return `${who} created artifact${artifact}${seq}`;
    case "artifact_updated":
      return `${who} updated artifact${artifact}${seq}`;
    case "artifact_archived":
      return `${who} archived artifact${artifact}`;
    case "tab_changed":
      return `${who} changed a tab${refs.tab_id ? ` (${refs.tab_id})` : ""}`;
    case "job_registered":
      return `${who} registered job${refs.job_key ? ` ${refs.job_key}` : ""}`;
    case "job_run":
      return `${who} reported a run${refs.job_key ? ` for ${refs.job_key}` : ""}`;
    case "limit_rejected":
      // A blocked write is evidence, not silence (plan §3) — surface it plainly.
      return `${who}'s write was rejected by a limit`;
    case "auth":
      return `${who} authenticated`;
    case "message":
      // Messages render as bubbles, not system lines; a bare label is the fallback.
      return `${who} sent a message`;
    default: {
      // Exhaustiveness guard: a new EventKind must be handled above.
      const _exhaustive: never = kind;
      return `${who}: ${String(_exhaustive)}`;
    }
  }
}

/**
 * Event kinds that render as a system line in the chat. `message` events are
 * excluded — those are shown as real message bubbles, not narrations.
 */
export function isSystemLineKind(kind: EventKind): boolean {
  return kind !== "message";
}

/** Build the `SystemEvent` view model for one feed event. */
export function describeSystemEvent(event: FeedEvent): SystemEvent {
  return {
    id: `evt_${event.seq}`,
    kind: event.kind,
    actor: event.actor,
    refs: event.refs,
    at: event.at,
    summary: summarize(event.kind, event.actor, event.refs),
  };
}
