import type { ReactNode } from "react";
import { Button, EmptyState, Spinner } from "@hermes/ui";

/**
 * Honest artifact empty / loading / error states (PANES; plan §7, GLASS
 * direction: "honest empty/loading/error states, never a blank pane").
 *
 * These are the states an {@link import("../adapter/types").ArtifactContentState}
 * maps to, kept as standalone presentational components so a pane composes them
 * and tests render them in isolation.
 */

export interface ArtifactLoadingProps {
  /** What is loading, e.g. the artifact title. */
  label?: string;
  className?: string;
}

/** In-flight content load. A visible "working" signal, never a blank surface. */
export function ArtifactLoading({ label, className }: ArtifactLoadingProps) {
  return (
    <div
      className={className ? `hc-artifact-state hc-artifact-state--loading ${className}` : "hc-artifact-state hc-artifact-state--loading"}
      data-state="loading"
    >
      <Spinner label={label ? `Loading ${label}` : "Loading artifact"} />
      <p className="hc-artifact-state__text">{label ? `Loading ${label}…` : "Loading…"}</p>
    </div>
  );
}

export interface ArtifactErrorProps {
  /** Human-readable failure, shown verbatim. */
  message: string;
  /** Optional retry affordance — renders a button when provided. */
  onRetry?: () => void;
  className?: string;
}

/** A load/render failure that names what went wrong and offers a next step. */
export function ArtifactError({ message, onRetry, className }: ArtifactErrorProps) {
  return (
    <div
      className={className ? `hc-artifact-state hc-artifact-state--error ${className}` : "hc-artifact-state hc-artifact-state--error"}
      data-state="error"
      role="alert"
    >
      <EmptyState
        size="sm"
        icon={null}
        title="Couldn't load this artifact"
        description={message}
        action={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

export interface ArtifactEmptyProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Icon slot forwarded to EmptyState. Pass `null` for none. */
  icon?: ReactNode;
  className?: string;
}

/** Nothing selected / nothing here yet. */
export function ArtifactEmpty({ title, description, action, icon, className }: ArtifactEmptyProps) {
  return (
    <div
      className={className ? `hc-artifact-state hc-artifact-state--empty ${className}` : "hc-artifact-state hc-artifact-state--empty"}
      data-state="empty"
    >
      <EmptyState
        title={title ?? "No artifact selected"}
        description={description ?? "Select an artifact from a tab, or wait for Hermes to create one."}
        action={action}
        {...(icon !== undefined ? { icon } : {})}
      />
    </div>
  );
}
