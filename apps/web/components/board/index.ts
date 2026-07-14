/**
 * Kanban board surface (PANES; Wave 2 P6, plan §6). Column/card renderer with
 * drag = one appended version, plus the pure snapshot helpers it drives. Rendered
 * by `ArtifactPane` behind the `boards` flag; the board JSON schema and semantic
 * diff live in `@hermes/contract` / `@hermes/diff`.
 */

export { BoardView } from "./BoardView";
export type { BoardViewProps } from "./BoardView";

export { moveCard, findCard, serializeBoard, boardsEqual } from "./boardOps";
