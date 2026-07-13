import type { ArtifactType, ArtifactStatus, Author, RenderState } from "@hermes/contract";

/**
 * Canvas data-adapter interface (PANES, plan §7).
 *
 * The canvas shell + panes are pure UI: they read view models and invoke
 * callbacks through this seam. Integration (a later phase) supplies a concrete
 * adapter backed by Convex live queries + mutations; nothing in the canvas
 * components imports Convex directly, so they render identically against a mock
 * adapter in tests/storybook and against live state in the app.
 *
 * All identifiers are opaque strings (Convex ids at runtime). View models mirror
 * the `@hermes/contract` vocabulary but are deliberately UI-shaped (e.g. a
 * pre-computed `changed` flag) so the components carry no business logic.
 */

/** A tab in the tab bar. `changedCount` aggregates unseen artifact changes. */
export interface CanvasTabView {
  id: string;
  title: string;
  /** Sort order within the bar (ascending). */
  order: number;
  status: ArtifactStatus;
  /**
   * Number of artifacts in this tab with `head_seq > last_seen.seq`
   * (plan §3 changed-since-last-looked). `0` ⇒ no changed badge.
   */
  changedCount: number;
}

/** An artifact listed within a tab. */
export interface CanvasArtifactView {
  id: string;
  tabId?: string;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  headSeq: number;
  /** `head_seq > last_seen.seq` — drives the per-artifact changed badge. */
  changed: boolean;
}

/** The resolved content of one artifact version, ready to render. */
export interface ArtifactVersionView {
  artifactId: string;
  seq: number;
  content: string;
  author: Author;
  why?: string;
  contended: boolean;
  /** `render_error` ⇒ renderers show the error + raw source (plan §2.2). */
  renderState: RenderState;
}

/**
 * Async load state for an artifact's content — the source of the pane's
 * empty/loading/error states. A live adapter maps a Convex query's
 * loading/error/data into this union.
 */
export type ArtifactContentState =
  | { status: "loading" }
  | { status: "error"; message: string; retry?: () => void }
  | { status: "empty" }
  | { status: "ready"; version: ArtifactVersionView };

/** UI → integration lifecycle callbacks. All are fire-and-forget from the UI. */
export interface CanvasActions {
  /** Tab lifecycle (plan §2.2 `PUT/PATCH /agent/tabs`; archive-only removal). */
  createTab(title: string): void;
  renameTab(tabId: string, title: string): void;
  /** Move a tab to a new index in the active-tab ordering. */
  reorderTab(tabId: string, toIndex: number): void;
  archiveTab(tabId: string): void;
  selectTab(tabId: string): void;
  selectArtifact(artifactId: string): void;
  /** Optional: create/archive artifacts if the surface exposes it. */
  createArtifact?(tabId: string, type: ArtifactType, title: string): void;
  archiveArtifact?(artifactId: string): void;
}

/**
 * The full read+write seam the canvas consumes. A mock implementation drives
 * tests; the Convex-backed implementation is supplied at integration.
 */
export interface CanvasDataAdapter {
  /** Active tabs, in display order. */
  tabs: CanvasTabView[];
  /** Artifacts belonging to a tab, in display order. */
  artifactsByTab(tabId: string): CanvasArtifactView[];
  /** Live content state for one artifact (optionally a historical `seq`). */
  getArtifactContent(artifactId: string, seq?: number): ArtifactContentState;
  actions: CanvasActions;
  /**
   * Mark an artifact seen (focused + visible), clearing its changed badge
   * (plan §3). Optional — some surfaces track this elsewhere.
   */
  markSeen?(artifactId: string): void;
}
