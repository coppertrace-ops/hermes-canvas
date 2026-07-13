import type { ArtifactVersion } from "@hermes/contract";
import { previewRestore } from "@hermes/diff";
import { Button, cssVar, Panel, Text } from "@hermes/ui";
import { useMemo, useState } from "react";

/**
 * Restore confirmation (plan §3). Restore is append-only: it adds a NEW head
 * version whose content equals the chosen one — it never overwrites or rewinds
 * history. This dialog makes that explicit before calling the restore mutation,
 * previews the seq the restore will produce and the `resolved_action` the server
 * will record, and requires an honest `why`. A no-op restore (choosing the head)
 * is disabled rather than silently doing nothing.
 */

export interface RestoreConfirmProps {
  versions: ArtifactVersion[];
  /** The version whose content will be reinstated. */
  sourceSeq: number;
  headSeq?: number;
  onConfirm: (why: string) => void | Promise<void>;
  onCancel: () => void;
  /** Disable inputs while the restore is in flight. */
  busy?: boolean;
}

export function RestoreConfirm({
  versions,
  sourceSeq,
  headSeq,
  onConfirm,
  onCancel,
  busy,
}: RestoreConfirmProps) {
  const preview = useMemo(
    () => previewRestore(versions, sourceSeq, headSeq),
    [versions, sourceSeq, headSeq],
  );
  const [why, setWhy] = useState(`restore v${sourceSeq}`);

  return (
    <Panel
      title={`Restore v${sourceSeq}`}
      variant="default"
      raised
      className="hc-restore-confirm"
      role="dialog"
      aria-modal="true"
      aria-label={`Restore version ${sourceSeq}`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-3") }}>
        <Text size="sm">{preview.message}</Text>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: cssVar("space-2"),
            fontFamily: cssVar("font-mono"),
            fontSize: cssVar("font-size-sm"),
          }}
        >
          <Text as="span" size="sm" tone="tertiary" mono>
            source
          </Text>
          <Text as="span" size="sm" mono>
            v{preview.sourceSeq}
          </Text>
          <Text as="span" size="sm" tone="tertiary" mono>
            current head
          </Text>
          <Text as="span" size="sm" mono>
            v{preview.currentHeadSeq} (preserved)
          </Text>
          <Text as="span" size="sm" tone="tertiary" mono>
            will create
          </Text>
          <Text as="span" size="sm" tone="accent" mono>
            v{preview.resultingSeq} · op: restore
          </Text>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: cssVar("space-1") }}>
          <Text as="span" size="xs" tone="secondary" weight="medium">
            Why (recorded with the restore)
          </Text>
          <input
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            disabled={busy || preview.isNoop}
            style={{
              padding: cssVar("space-2"),
              borderRadius: cssVar("radius-sm"),
              border: `1px solid ${cssVar("border")}`,
              background: cssVar("surface"),
              color: cssVar("text"),
              fontSize: cssVar("font-size-sm"),
            }}
          />
        </label>

        <div style={{ display: "flex", gap: cssVar("space-2"), justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy || preview.isNoop || why.trim().length === 0}
            onClick={() => onConfirm(why.trim())}
          >
            {preview.isNoop ? "Already current" : `Restore as v${preview.resultingSeq}`}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
