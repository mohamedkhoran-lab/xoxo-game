// Water Sort — level generator with a solver that guarantees every puzzle is solvable.

export const TUBE_CAPACITY = 4;
export type Difficulty = "facile" | "moyen" | "difficile";

export interface DiffConfig {
  colors: number;
  empty: number;
  /** show emoji icons on the liquid (easy/medium) or colours only (hard) */
  icons: boolean;
  /** max undos (Infinity = unlimited) */
  undos: number;
  /** hard rules: no identical neighbours in a tube, no direct merge at start */
  strict: boolean;
}

export const DIFFS: Record<Difficulty, DiffConfig> = {
  facile: { colors: 4, empty: 2, icons: true, undos: Infinity, strict: false },
  moyen: { colors: 6, empty: 2, icons: true, undos: Infinity, strict: false },
  difficile: { colors: 12, empty: 2, icons: false, undos: 5, strict: true },
};

const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const top = (t: string[]) => t[t.length - 1];

/** True if every tube is empty or full of one colour. */
export function isSolved(tubes: string[][]) {
  return tubes.every((t) => t.length === 0 || (t.length === TUBE_CAPACITY && t.every((c) => c === t[0])));
}

/** Depth-first solver with memo. Returns true if solvable within the node budget. */
export function solvable(start: string[][], budget = 250_000): boolean {
  const seen = new Set<string>();
  let nodes = 0;
  const key = (ts: string[][]) => ts.map((t) => t.join(",")).sort().join("|");

  const dfs = (ts: string[][]): boolean => {
    if (isSolved(ts)) return true;
    if (++nodes > budget) return false;
    const k = key(ts);
    if (seen.has(k)) return false;
    seen.add(k);

    // Generate moves, preferring pours onto a matching colour over pours into empties
    const moves: [number, number, number][] = [];
    for (let i = 0; i < ts.length; i++) {
      const src = ts[i];
      if (!src.length) continue;
      const c = top(src);
      let run = 0;
      for (let x = src.length - 1; x >= 0 && src[x] === c; x--) run++;
      const uniform = run === src.length;
      for (let j = 0; j < ts.length; j++) {
        if (i === j) continue;
        const dst = ts[j];
        if (dst.length === TUBE_CAPACITY) continue;
        if (dst.length === 0) {
          if (uniform) continue; // pouring a uniform tube into an empty one is useless
          moves.push([i, j, 0]);
        } else if (top(dst) === c) {
          const room = TUBE_CAPACITY - dst.length;
          moves.push([i, j, Math.min(run, room) === run ? 2 : 1]);
        }
      }
    }
    moves.sort((a, b) => b[2] - a[2]);
    const tried = new Set<string>();
    for (const [i, j] of moves) {
      if (ts[j].length === 0) {
        const tag = `${i}>empty`;
        if (tried.has(tag)) continue;
        tried.add(tag);
      }
      const next = ts.map((t) => t.slice());
      const c = top(next[i]);
      while (next[i].length && top(next[i]) === c && next[j].length < TUBE_CAPACITY) next[j].push(next[i].pop()!);
      if (dfs(next)) return true;
    }
    return false;
  };

  return dfs(start.map((t) => t.slice()));
}

function strictOk(tubes: string[][]): boolean {
  for (const t of tubes) {
    for (let i = 1; i < t.length; i++) if (t[i] === t[i - 1]) return false;
    const counts: Record<string, number> = {};
    for (const c of t) counts[c] = (counts[c] ?? 0) + 1;
    if (Object.values(counts).some((n) => n >= 3)) return false;
  }
  // no two tubes share the same top colour → no free merge at the start
  const tops = tubes.map(top);
  return new Set(tops).size === tops.length;
}

function randomTubes(colors: string[]): string[][] {
  const pool = shuffle(colors.flatMap((c) => Array<string>(TUBE_CAPACITY).fill(c)));
  return colors.map((_, i) => pool.slice(i * TUBE_CAPACITY, (i + 1) * TUBE_CAPACITY));
}

/** Layer-by-layer construction: no identical neighbours, max 2 of a colour per tube, all top colours different. */
function buildStrict(colors: string[]): string[][] | null {
  const left: Record<string, number> = Object.fromEntries(colors.map((c) => [c, TUBE_CAPACITY]));
  const tubes: string[][] = colors.map(() => []);
  for (let layer = 0; layer < TUBE_CAPACITY; layer++) {
    const usedThisLayer = new Set<string>();
    const isTop = layer === TUBE_CAPACITY - 1;
    // fill the most constrained colours first by visiting tubes in random order
    for (const t of shuffle(tubes.map((_, i) => i))) {
      const tube = tubes[t];
      const options = colors.filter(
        (c) =>
          left[c] > 0 &&
          top(tube) !== c &&
          tube.filter((x) => x === c).length < 2 &&
          (!isTop || !usedThisLayer.has(c))
      );
      if (!options.length) return null;
      // prefer colours with many units left so nothing gets stranded
      const maxLeft = Math.max(...options.map((c) => left[c]));
      const best = options.filter((c) => left[c] === maxLeft);
      const c = best[Math.floor(Math.random() * best.length)];
      tube.push(c);
      left[c]--;
      usedThisLayer.add(c);
    }
  }
  return tubes;
}

export function generateLevel(diff: Difficulty, colorNames: string[], strict = DIFFS[diff].strict): string[][] {
  const cfg = DIFFS[diff];
  const colors = colorNames.slice(0, cfg.colors);

  for (let attempt = 0; attempt < 400; attempt++) {
    const tubes = strict ? buildStrict(colors) : randomTubes(colors);
    if (!tubes) continue;

    if (tubes.some((t) => t.every((c) => c === t[0]))) continue; // no pre-solved tube
    if (strict && !strictOk(tubes)) continue;

    for (let e = 0; e < cfg.empty; e++) tubes.push([]);
    if (solvable(tubes)) return tubes;
  }
  // Fallback (practically never reached): same colours, relaxed shuffle rules
  return generateLevel(diff, colorNames, false);
}
