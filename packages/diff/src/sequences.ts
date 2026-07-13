/**
 * Generic sequence diff — the one algorithm every typed diff in this package
 * reuses (lines, words, markdown blocks, board cards).
 *
 * Implements Myers' O(ND) greedy shortest-edit-script algorithm with backtrack.
 * It is deterministic, dependency-free, and comparator-driven so callers diff
 * arbitrary token types (strings, block objects, cards) without re-implementing
 * the core. Output is a flat, ordered edit script of equal / delete / insert
 * runs — the shape the renderers and semantic diffs build on.
 */

/** One step in an edit script. `del` items come from `a`, `ins` from `b`. */
export type EditOp<T> =
  | { type: "eq"; a: T; b: T; aIndex: number; bIndex: number }
  | { type: "del"; a: T; aIndex: number }
  | { type: "ins"; b: T; bIndex: number };

/** A contiguous run of one op type, produced by {@link groupOps}. */
export type EditRun<T> =
  | { type: "eq"; items: T[]; aStart: number; bStart: number }
  | { type: "del"; items: T[]; aStart: number }
  | { type: "ins"; items: T[]; bStart: number };

export type EqualityFn<T> = (a: T, b: T) => boolean;

const defaultEquals = <T>(a: T, b: T): boolean => a === b;

/**
 * Compute the shortest edit script transforming `a` into `b`.
 *
 * Myers' algorithm: a greedy walk of the edit graph tracking, for each diagonal
 * `k`, the furthest-reaching `x` reachable in `d` edits. We snapshot the frontier
 * (`trace`) per `d`, then backtrack to recover the actual path. This is O((N+M)·D)
 * time and memory where D is the edit distance — near-linear for similar inputs,
 * which is the common case for versioned documents.
 */
export function diffSequences<T>(
  a: readonly T[],
  b: readonly T[],
  equals: EqualityFn<T> = defaultEquals,
): EditOp<T>[] {
  const n = a.length;
  const m = b.length;

  // Fast paths keep the common "no change" / "pure append" cases allocation-cheap.
  if (n === 0 && m === 0) return [];
  if (n === 0) return b.map((bv, i) => ({ type: "ins", b: bv, bIndex: i }) as EditOp<T>);
  if (m === 0) return a.map((av, i) => ({ type: "del", a: av, aIndex: i }) as EditOp<T>);

  const max = n + m;
  const offset = max; // shift k into a non-negative array index
  const size = 2 * max + 1;
  // v[k + offset] = furthest x on diagonal k. Snapshot per d for backtracking.
  const v = new Array<number>(size).fill(0);
  const trace: number[][] = [];

  let found = -1;
  outer: for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      const kIdx = k + offset;
      // Choose whether we arrived here by a downward (insert) or rightward (delete) move.
      let x: number;
      if (k === -d || (k !== d && (v[kIdx - 1] ?? 0) < (v[kIdx + 1] ?? 0))) {
        x = v[kIdx + 1] ?? 0; // move down: took an insert from b
      } else {
        x = (v[kIdx - 1] ?? 0) + 1; // move right: took a delete from a
      }
      let y = x - k;
      // Slide down the diagonal over equal elements ("snakes").
      while (x < n && y < m && equals(a[x] as T, b[y] as T)) {
        x++;
        y++;
      }
      v[kIdx] = x;
      if (x >= n && y >= m) {
        found = d;
        break outer;
      }
    }
  }

  return backtrack(a, b, trace, found, offset, n, m);
}

/** Recover the ordered edit script by walking the per-d frontier snapshots back. */
function backtrack<T>(
  a: readonly T[],
  b: readonly T[],
  trace: number[][],
  d: number,
  offset: number,
  n: number,
  m: number,
): EditOp<T>[] {
  const ops: EditOp<T>[] = [];
  let x = n;
  let y = m;

  for (let depth = d; depth > 0; depth--) {
    const v = trace[depth]!;
    const k = x - y;
    const kIdx = k + offset;

    const down = k === -depth || (k !== depth && (v[kIdx - 1] ?? 0) < (v[kIdx + 1] ?? 0));
    const prevK = down ? k + 1 : k - 1;
    const prevX = v[prevK + offset] ?? 0;
    const prevY = prevX - prevK;

    // Emit the diagonal (equal) moves between (prevX,prevY)→(x,y) minus the single edit.
    while (x > prevX && y > prevY) {
      x--;
      y--;
      ops.push({ type: "eq", a: a[x] as T, b: b[y] as T, aIndex: x, bIndex: y });
    }
    if (depth > 0) {
      if (down) {
        y--;
        ops.push({ type: "ins", b: b[y] as T, bIndex: y });
      } else {
        x--;
        ops.push({ type: "del", a: a[x] as T, aIndex: x });
      }
    }
  }
  // Remaining leading diagonal (the d=0 snake).
  while (x > 0 && y > 0) {
    x--;
    y--;
    ops.push({ type: "eq", a: a[x] as T, b: b[y] as T, aIndex: x, bIndex: y });
  }
  ops.reverse();
  return ops;
}

/** Collapse an edit script into contiguous same-type runs (hunk building). */
export function groupOps<T>(ops: readonly EditOp<T>[]): EditRun<T>[] {
  const runs: EditRun<T>[] = [];
  for (const op of ops) {
    const last = runs[runs.length - 1];
    if (last && last.type === op.type) {
      if (op.type === "eq") (last as { items: T[] }).items.push(op.b);
      else if (op.type === "del") (last as { items: T[] }).items.push(op.a);
      else (last as { items: T[] }).items.push(op.b);
      continue;
    }
    if (op.type === "eq")
      runs.push({ type: "eq", items: [op.b], aStart: op.aIndex, bStart: op.bIndex });
    else if (op.type === "del") runs.push({ type: "del", items: [op.a], aStart: op.aIndex });
    else runs.push({ type: "ins", items: [op.b], bStart: op.bIndex });
  }
  return runs;
}

/** Counts of changed items — used for "changed vs whole-rewrite" heuristics + summaries. */
export interface DiffStat {
  added: number;
  removed: number;
  unchanged: number;
}

export function statOf<T>(ops: readonly EditOp<T>[]): DiffStat {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const op of ops) {
    if (op.type === "ins") added++;
    else if (op.type === "del") removed++;
    else unchanged++;
  }
  return { added, removed, unchanged };
}
