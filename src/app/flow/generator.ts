// Flow — puzzle generator.
// A random Hamiltonian path of the grid (backbite algorithm) is cut into coloured segments;
// the two ends of each segment become a pair of dots. The full-cover solution always exists.

export type Difficulty = "facile" | "moyen" | "difficile";

export interface FlowConfig {
  size: number;
  colors: number;
  minLen: number;
  label: string;
}

export const FLOW_DIFFS: Record<Difficulty, FlowConfig> = {
  facile: { size: 5, colors: 4, minLen: 4, label: "5×5" },
  moyen: { size: 7, colors: 6, minLen: 4, label: "7×7" },
  difficile: { size: 9, colors: 9, minLen: 4, label: "9×9" },
};

export interface FlowPuzzle {
  size: number;
  /** dot pairs, one per colour: [cellA, cellB] */
  pairs: [number, number][];
}

function neighbours(i: number, n: number): number[] {
  const r = Math.floor(i / n), c = i % n;
  const out: number[] = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

export function hamiltonianPath(n: number): number[] {
  // start from a snake, then shuffle with backbite moves (keeps it a Hamiltonian path)
  const path: number[] = [];
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < n; k++) path.push(r * n + (r % 2 === 0 ? k : n - 1 - k));
  }
  const iterations = n * n * 40;
  for (let it = 0; it < iterations; it++) {
    if (Math.random() < 0.5) path.reverse();
    const L = path.length;
    const end = path[L - 1];
    const options = neighbours(end, n).filter((q) => q !== path[L - 2]);
    const q = options[Math.floor(Math.random() * options.length)];
    const j = path.indexOf(q);
    const seg = path.splice(j + 1).reverse();
    path.push(...seg);
  }
  return path;
}

const dist = (a: number, b: number, n: number) =>
  Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs((a % n) - (b % n));

export function generateFlow(diff: Difficulty): FlowPuzzle {
  const { size: n, colors: k, minLen } = FLOW_DIFFS[diff];
  const total = n * n;

  for (let round = 0; round < 60; round++) {
    const path = hamiltonianPath(n);
    for (let attempt = 0; attempt < 40; attempt++) {
      // random composition: every segment has at least minLen cells
      const extra = total - k * minLen;
      const cuts = Array.from({ length: k - 1 }, () => Math.floor(Math.random() * (extra + 1))).sort((a, b) => a - b);
      const lens: number[] = [];
      let prev = 0;
      for (const c of cuts) { lens.push(minLen + c - prev); prev = c; }
      lens.push(minLen + extra - prev);

      const pairs: [number, number][] = [];
      let pos = 0, ok = true;
      for (const len of lens) {
        const a = path[pos], b = path[pos + len - 1];
        if (dist(a, b, n) < 2) { ok = false; break; } // ends touching = trivial pair
        pairs.push([a, b]);
        pos += len;
      }
      if (ok) return { size: n, pairs };
    }
  }
  // extremely unlikely fallback: plain snake split
  const path = hamiltonianPath(n);
  const len = Math.floor(total / k);
  return {
    size: n,
    pairs: Array.from({ length: k }, (_, i) => [path[i * len], path[i === k - 1 ? total - 1 : (i + 1) * len - 1]] as [number, number]),
  };
}
