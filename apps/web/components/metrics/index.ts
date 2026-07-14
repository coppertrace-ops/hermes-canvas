/**
 * Metrics subsystem surface (OWNER: PROOF integration).
 *
 * The owner-facing read side of the readership test. `ReadershipPanel` is the live
 * (Convex-backed) surface; `ReadershipView` is the pure presentational core, split
 * out so rendering unit-tests without Convex.
 */

export { ReadershipPanel } from "./ReadershipPanel";
export { ReadershipView, isEmptyReadership, formatDuration } from "./ReadershipView";
export type { ReadershipViewProps } from "./ReadershipView";
