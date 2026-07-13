import { describe, expect, it } from "vitest";
import { diffSequences, groupOps, statOf } from "./sequences";

/**
 * The generic Myers diff underpins every typed diff in the package, so it is
 * tested hardest: the reconstruction invariant (applying the script transforms a
 * into b) is a property every input must satisfy.
 */

function applyScript<T>(a: readonly T[], ops: ReturnType<typeof diffSequences<T>>): T[] {
  const out: T[] = [];
  for (const op of ops) {
    if (op.type === "eq") out.push(op.b);
    else if (op.type === "ins") out.push(op.b);
    // del: drop
  }
  return out;
}

describe("diffSequences reconstruction invariant", () => {
  const cases: Array<[string[], string[]]> = [
    [[], []],
    [["a"], []],
    [[], ["a"]],
    [
      ["a", "b", "c"],
      ["a", "b", "c"],
    ],
    [
      ["a", "b", "c"],
      ["a", "x", "c"],
    ],
    [
      ["a", "b", "c", "d"],
      ["b", "d", "e"],
    ],
    [
      ["the", "quick", "brown", "fox"],
      ["the", "slow", "brown", "cat", "fox"],
    ],
    [
      ["1", "2", "3", "4", "5"],
      ["3", "4", "5", "6", "7"],
    ],
  ];
  it.each(cases)("applying script(%j → %j) yields b", (a, b) => {
    const ops = diffSequences(a, b);
    expect(applyScript(a, ops)).toEqual(b);
  });

  it("emits only equal ops for identical inputs", () => {
    const ops = diffSequences(["a", "b", "c"], ["a", "b", "c"]);
    expect(ops.every((o) => o.type === "eq")).toBe(true);
  });

  it("finds the minimal edit distance for a single substitution", () => {
    const ops = diffSequences(["a", "b", "c"], ["a", "x", "c"]);
    const s = statOf(ops);
    expect(s).toEqual({ added: 1, removed: 1, unchanged: 2 });
  });

  it("honors a custom equality comparator", () => {
    const a = [{ k: 1 }, { k: 2 }];
    const b = [{ k: 1 }, { k: 3 }];
    const ops = diffSequences(a, b, (x, y) => x.k === y.k);
    expect(statOf(ops)).toEqual({ added: 1, removed: 1, unchanged: 1 });
  });
});

describe("groupOps", () => {
  it("collapses runs of the same op type", () => {
    const ops = diffSequences(["a", "b", "c", "d"], ["a", "x", "y", "d"]);
    const runs = groupOps(ops);
    // eq[a] del[b,c] ins[x,y] eq[d]
    expect(runs.map((r) => r.type)).toEqual(["eq", "del", "ins", "eq"]);
    const del = runs.find((r) => r.type === "del")!;
    expect(del.items).toEqual(["b", "c"]);
  });
});
