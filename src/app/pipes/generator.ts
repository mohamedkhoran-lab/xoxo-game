// Pipes — puzzle generator + water-flow analysis.
// Every puzzle is built from a solved network (a spanning tree of pipes, plus a few loops),
// then the free tiles are rotated randomly, so a solution always exists.

export const N = 1, E = 2, S = 4, W = 8;
export type Difficulty = "facile" | "moyen" | "difficile";

export interface PipeConfig {
  size: number;
  /** probability of adding an extra (loop) connection between neighbours */
  loops: number;
  /** share of tiles that are locked (cannot be rotated) */
  locked: number;
  label: string;
}

export const PIPE_DIFFS: Record<Difficulty, PipeConfig> = {
  facile: { size: 4, loops: 0, locked: 0, label: "4×4" },
  moyen: { size: 6, loops: 0.1, locked: 0.08, label: "6×6" },
  difficile: { size: 8, loops: 0.16, locked: 0.12, label: "8×8" },
};

export interface Tile {
  /** pipe openings in the solved orientation */
  base: number;
  /** quarter-turns clockwise applied to the solved orientation (unbounded counter) */
  turns: number;
  locked: boolean;
  source: boolean;
}

export const rotCW = (m: number) => ((m << 1) | (m >> 3)) & 15;
export const rotN = (m: number, k: number) => {
  let r = m;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) r = rotCW(r);
  return r;
};
const opposite = (d: number) => ((d << 2) | (d >> 2)) & 15;

export const maskOf = (t: Tile) => rotN(t.base, t.turns);

function neighbour(i: number, d: number, n: number): number {
  const r = Math.floor(i / n), c = i % n;
  if (d === N) return r > 0 ? i - n : -1;
  if (d === S) return r < n - 1 ? i + n : -1;
  if (d === E) return c < n - 1 ? i + 1 : -1;
  return c > 0 ? i - 1 : -1;
}

export interface Analysis {
  filled: boolean[];
  /** BFS distance from the source (-1 = dry), used to animate the water spreading */
  depth: number[];
  /** per tile: openings where water spills out (only on filled tiles) */
  leaks: number[];
  filledCount: number;
  leakCount: number;
  solved: boolean;
}

export function analyse(tiles: Tile[], n: number): Analysis {
  const masks = tiles.map(maskOf);
  const filled = Array<boolean>(tiles.length).fill(false);
  const depth = Array<number>(tiles.length).fill(-1);
  const start = tiles.findIndex((t) => t.source);
  const queue = [start];
  filled[start] = true;
  depth[start] = 0;
  for (let qi = 0; qi < queue.length; qi++) {
    const i = queue[qi];
    for (const d of [N, E, S, W]) {
      if (!(masks[i] & d)) continue;
      const j = neighbour(i, d, n);
      if (j < 0 || filled[j]) continue;
      if (masks[j] & opposite(d)) {
        filled[j] = true;
        depth[j] = depth[i] + 1;
        queue.push(j);
      }
    }
  }
  const leaks = Array<number>(tiles.length).fill(0);
  let leakCount = 0, filledCount = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (!filled[i]) continue;
    filledCount++;
    for (const d of [N, E, S, W]) {
      if (!(masks[i] & d)) continue;
      const j = neighbour(i, d, n);
      if (j < 0 || !(masks[j] & opposite(d))) {
        leaks[i] |= d;
        leakCount++;
      }
    }
  }
  return { filled, depth, leaks, filledCount, leakCount, solved: filledCount === tiles.length && leakCount === 0 };
}

export function generatePuzzle(diff: Difficulty): Tile[] {
  const cfg = PIPE_DIFFS[diff];
  const n = cfg.size;
  const total = n * n;

  for (let attempt = 0; attempt < 50; attempt++) {
    const masks = Array<number>(total).fill(0);
    const link = (a: number, b: number, d: number) => {
      masks[a] |= d;
      masks[b] |= opposite(d);
    };

    // Randomised Prim: grow a spanning tree from a random source cell
    const source = Math.floor(Math.random() * total);
    const inTree = Array<boolean>(total).fill(false);
    inTree[source] = true;
    const frontier: [number, number, number][] = []; // [from, to, dir]
    const pushEdges = (i: number) => {
      for (const d of [N, E, S, W]) {
        const j = neighbour(i, d, n);
        if (j >= 0 && !inTree[j]) frontier.push([i, j, d]);
      }
    };
    pushEdges(source);
    while (frontier.length) {
      const k = Math.floor(Math.random() * frontier.length);
      const [a, b, d] = frontier[k];
      frontier[k] = frontier[frontier.length - 1];
      frontier.pop();
      if (inTree[b]) continue;
      inTree[b] = true;
      link(a, b, d);
      pushEdges(b);
    }
    // Extra loops make tees / crosses and several possible routes
    for (let i = 0; i < total; i++) {
      for (const d of [E, S]) {
        const j = neighbour(i, d, n);
        if (j >= 0 && !(masks[i] & d) && Math.random() < cfg.loops) link(i, j, d);
      }
    }

    const tiles: Tile[] = masks.map((m, i) => ({
      base: m,
      turns: 0,
      locked: i === source || (m !== 15 && Math.random() < cfg.locked),
      source: i === source,
    }));
    for (const t of tiles) if (!t.locked) t.turns = Math.floor(Math.random() * 4);

    const a = analyse(tiles, n);
    // not already solved, and at least a few tiles to turn
    if (!a.solved && tiles.filter((t) => !t.locked && t.turns % 4 !== 0).length >= Math.min(3, total / 4)) return tiles;
  }
  throw new Error("pipes: could not generate puzzle");
}
