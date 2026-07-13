/**
 * `UpdatesPoller` — the cursor-tracking poll fallback for the `pendingWork`
 * WebSocket subscription (OWNER: LEDGER, plan §2.1).
 *
 * The production default is a Convex WS subscription (function calls only on
 * change); this poller is the fallback the plan names — `GET /agent/updates?
 * cursor=` — used when the socket is unavailable. It owns exactly one piece of
 * state: the monotonic `cursor`. Each poll fetches everything after the cursor,
 * hands the new messages/events to the caller, and advances the cursor to the
 * server-returned value so nothing is re-delivered.
 *
 * The design keeps a single testable step (`pollOnce`) separate from the
 * self-driving loop (`start`/`stop`), and injects the timer so the loop can be
 * exercised deterministically.
 */

import type { FeedEvent, FeedMessage, UpdatesResponse } from "@hermes/contract";
import type { HermesCanvasClient } from "./client";

/** Delivered on every poll that returned new work. */
export interface UpdatesBatch {
  messages: FeedMessage[];
  events: FeedEvent[];
  /** The cursor AFTER applying this batch (what the next poll will send). */
  cursor: number;
}

export interface PollerOptions {
  /** Cursor to start from (default 0 — the beginning of the feed). */
  cursor?: number;
  /** Milliseconds between polls when the socket is unavailable (default 2000). */
  intervalMs?: number;
  /** Called with each non-empty batch. May be async; the loop awaits it. */
  onBatch: (batch: UpdatesBatch) => void | Promise<void>;
  /**
   * Called when a poll throws. Return (or resolve) `true` to keep polling,
   * `false`/`void` to stop the loop. Default behaviour is to keep polling — a
   * transient network blip should not silence the agent.
   */
  onError?: (error: unknown) => boolean | void | Promise<boolean | void>;
  /** Injectable sleep (ms) so the loop is deterministically testable. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class UpdatesPoller {
  private cursor: number;
  private readonly client: HermesCanvasClient;
  private readonly intervalMs: number;
  private readonly onBatch: PollerOptions["onBatch"];
  private readonly onError?: PollerOptions["onError"];
  private readonly sleep: (ms: number) => Promise<void>;
  private running = false;

  constructor(client: HermesCanvasClient, options: PollerOptions) {
    this.client = client;
    this.cursor = options.cursor ?? 0;
    this.intervalMs = options.intervalMs ?? 2000;
    this.onBatch = options.onBatch;
    this.onError = options.onError;
    this.sleep = options.sleep ?? defaultSleep;
  }

  /** The cursor the next poll will send. */
  get currentCursor(): number {
    return this.cursor;
  }

  /** Whether the self-driving loop is active. */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Fetch once from the current cursor. If the server reports new work, advance
   * the cursor and invoke `onBatch`. Returns the raw response so callers driving
   * their own loop can inspect it. The cursor only advances on success — a throw
   * leaves it untouched so the failed range is retried.
   */
  async pollOnce(): Promise<UpdatesResponse> {
    const res = await this.client.getUpdates(this.cursor);
    const hasWork = res.messages.length > 0 || res.events.length > 0;
    // The server cursor is monotonic; never let it regress on an empty poll.
    const nextCursor = Math.max(this.cursor, res.cursor);
    if (hasWork) {
      await this.onBatch({ messages: res.messages, events: res.events, cursor: nextCursor });
    }
    this.cursor = nextCursor;
    return res;
  }

  /**
   * Run the poll loop until `stop()` is called (or an `onError` handler returns
   * false). Resolves when the loop exits. Calling `start` while already running
   * is a no-op that resolves immediately.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      try {
        await this.pollOnce();
      } catch (error) {
        const keepGoing = this.onError ? await this.onError(error) : true;
        if (keepGoing === false) {
          this.running = false;
          break;
        }
      }
      if (this.running) await this.sleep(this.intervalMs);
    }
  }

  /** Ask the loop to exit after the in-flight poll settles. */
  stop(): void {
    this.running = false;
  }
}
