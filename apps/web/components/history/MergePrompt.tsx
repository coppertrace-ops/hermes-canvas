import type { ArtifactType, ArtifactVersion } from "@hermes/contract";
import { buildMergePrompt } from "@hermes/diff";
import type { MergeResolution } from "@hermes/diff";
import { Badge, Button, cssVar, Panel, Text } from "@hermes/ui";
import { useMemo } from "react";
import { DiffView } from "./DiffView";

/**
 * Contended-write merge prompt (plan §2.2, §3). When a write's parent_seq was
 * stale, both versions are preserved (append-only — nothing is lost) and this
 * prompt surfaces the reconciliation. It shows what changed underneath the writer
 * (head vs base) and what the writer intended (contended vs base), then offers
 * only append-only resolutions. There is deliberately no destructive option: the
 * platform cannot lose a side, and neither can this UI.
 */

function label(r: MergeResolution): string {
  switch (r.kind) {
    case "keep_head":
      return "Keep current head";
    case "take_contended":
      return "Restore the contended version";
    case "manual":
      return `Edit from ${r.from}`;
  }
}

function resolutionId(r: MergeResolution): string {
  return r.kind === "manual" ? `manual:${r.from}` : r.kind;
}

export interface MergePromptProps {
  type: ArtifactType;
  versions: ArtifactVersion[];
  contendedSeq: number;
  headSeq?: number;
  onResolve: (resolution: string) => void | Promise<void>;
  onDismiss?: () => void;
  busy?: boolean;
}

export function MergePrompt({
  type,
  versions,
  contendedSeq,
  headSeq,
  onResolve,
  onDismiss,
  busy,
}: MergePromptProps) {
  const prompt = useMemo(
    () => buildMergePrompt(type, versions, contendedSeq, headSeq),
    [type, versions, contendedSeq, headSeq],
  );

  const headVersion = versions.find((v) => v.seq === prompt.headSeq) ?? null;
  const contendedVersion = versions.find((v) => v.seq === prompt.contendedSeq)!;

  return (
    <Panel
      title="Reconcile a contended write"
      raised
      className="hc-merge-prompt"
      role="dialog"
      aria-label="Contended write merge prompt"
      actions={
        <Badge tone="danger" size="sm" variant="solid">
          contended
        </Badge>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-4") }}>
        <Text size="sm">{prompt.summary}</Text>

        <div>
          <Text
            as="div"
            size="xs"
            tone="tertiary"
            weight="medium"
            mono
            style={{ marginBottom: cssVar("space-1") }}
          >
            contended v{prompt.contendedSeq} vs current head v{prompt.headSeq}
          </Text>
          <DiffView type={type} before={headVersion} after={contendedVersion} hideHeader />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: cssVar("space-2"),
            justifyContent: "flex-end",
          }}
        >
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss} disabled={busy}>
              Later
            </Button>
          )}
          {prompt.options.map((opt) => (
            <Button
              key={resolutionId(opt)}
              variant={opt.kind === "keep_head" ? "secondary" : "primary"}
              size="sm"
              disabled={busy}
              onClick={() => onResolve(resolutionId(opt))}
            >
              {label(opt)}
            </Button>
          ))}
        </div>
      </div>
    </Panel>
  );
}
