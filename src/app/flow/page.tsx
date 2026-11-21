"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import ClientOnly from "../lib/ClientOnly";
import { noise, tone, unlockAudio } from "../lib/sfx";
import { useStored } from "../lib/useStored";
import ui from "../puzzle-ui/puzzle.module.css";
import styles from "./flow.module.css";
import { FLOW_DIFFS, Difficulty, FlowPuzzle, generateFlow } from "./generator";

const DIFF_ORDER: Difficulty[] = ["facile", "moyen", "difficile"];
const DIFF_NAME: Record<Difficulty, string> = { facile: "Sahel", moyen: "Moyen", difficile: "Hard 🔥" };

const COLORS = ["#ff4d5e", "#3d8bff", "#2ee66b", "#ffd93d", "#ff8a2b", "#22d3ee", "#e05cff", "#b6f23a", "#f5f5ff"];
const PITCH = [392, 440, 494, 523, 587, 659, 698, 784, 880];

const complete = (path: number[], pair: [number, number]) =>
  path.length >= 2 && ((path[0] === pair[0] && path[path.length - 1] === pair[1]) || (path[0] === pair[1] && path[path.length - 1] === pair[0]));

function FlowGame({ initial }: { initial: Difficulty }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>(initial);
  const [puzzle, setPuzzle] = useState<FlowPuzzle>(() => generateFlow(initial));
  const [paths, setPaths] = useState<number[][]>(() => Array.from({ length: FLOW_DIFFS[initial].colors }, () => []));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [best, setBest] = useStored<Record<string, number>>("xoxo-flow-best", {});
  const [levels, setLevels] = useStored<Record<string, number>>("xoxo-flow-level", {});
  const [active, setActive] = useState<number | null>(null);
  const level = levels[difficulty] ?? 1;

  const pathsRef = useRef<number[][]>(paths);
  const drag = useRef<number | null>(null); // colour being drawn
  const movesRef = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const n = puzzle.size;
  const total = n * n;

  const dotColor = useMemo(() => {
    const m = Array<number>(total).fill(-1);
    puzzle.pairs.forEach(([a, b], c) => {
      m[a] = c;
      m[b] = c;
    });
    return m;
  }, [puzzle, total]);

  const commit = (p: number[][]) => {
    pathsRef.current = p;
    setPaths(p);
  };

  const fresh = (d: Difficulty) => {
    const pz = generateFlow(d);
    setDifficulty(d);
    setPuzzle(pz);
    commit(Array.from({ length: pz.pairs.length }, () => []));
    setMoves(0);
    movesRef.current = 0;
    setWon(false);
    setNewBest(false);
  };

  const restart = () => {
    commit(Array.from({ length: puzzle.pairs.length }, () => []));
    setMoves(0);
    movesRef.current = 0;
    setWon(false);
    setNewBest(false);
  };

  const ownerOf = (p: number[][], cell: number) => p.findIndex((pa) => pa.includes(cell));

  const cellAt = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const col = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)));
    const row = Math.min(n - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * n)));
    return row * n + col;
  };

  /** Try to move the head of colour c into `next`. Returns the new paths, or null if the move is blocked. */
  const stepInto = (p: number[][], c: number, next: number): number[][] | null => {
    const path = p[c];
    if (!path.length) return null;
    const pair = puzzle.pairs[c];
    // go back one cell = erase the head
    if (path.length >= 2 && next === path[path.length - 2]) {
      const q = p.slice();
      q[c] = path.slice(0, -1);
      return q;
    }
    if (complete(path, pair)) return null; // finished: only backtracking allowed
    const dc = dotColor[next];
    if (dc !== -1 && dc !== c) return null; // other colour's dot
    if (dc === c && next === path[0]) return null; // own start dot
    const own = path.indexOf(next);
    if (own !== -1) {
      const q = p.slice();
      q[c] = path.slice(0, own + 1); // crossing own trail cuts the loop
      return q;
    }
    const q = p.slice();
    const other = ownerOf(p, next);
    if (other !== -1 && other !== c) q[other] = p[other].slice(0, p[other].indexOf(next)); // cut the other path
    q[c] = [...path, next];
    return q;
  };

  const handleDown = (e: React.PointerEvent<SVGSVGElement>) => {
    unlockAudio();
    if (won) return;
    const cell = cellAt(e);
    const p = pathsRef.current;
    let c = dotColor[cell];
    let q: number[][];
    if (c !== -1) {
      q = p.slice();
      q[c] = [cell]; // start (or restart) this colour from its dot
    } else {
      c = ownerOf(p, cell);
      if (c === -1) return;
      q = p.slice();
      q[c] = p[c].slice(0, p[c].indexOf(cell) + 1); // continue from this cell
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = c;
    setActive(c);
    movesRef.current += 1;
    setMoves(movesRef.current);
    commit(q);
    tone({ freq: PITCH[c % PITCH.length], dur: 0.08, type: "sine", vol: 0.1 });
  };

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const c = drag.current;
    if (c === null) return;
    const target = cellAt(e);
    let p = pathsRef.current;
    let guard = 0;
    while (guard++ < 20) {
      const path = p[c];
      const head = path[path.length - 1];
      if (head === target) break;
      const hr = Math.floor(head / n), hc = head % n;
      const tr = Math.floor(target / n), tc = target % n;
      const next = Math.abs(tc - hc) >= Math.abs(tr - hr) ? hr * n + hc + Math.sign(tc - hc) : (hr + Math.sign(tr - hr)) * n + hc;
      const q = stepInto(p, c, next);
      if (!q) break;
      const wasComplete = complete(q[c], puzzle.pairs[c]) && !complete(p[c], puzzle.pairs[c]);
      p = q;
      if (wasComplete) {
        tone({ freq: PITCH[c % PITCH.length], dur: 0.25, type: "triangle", vol: 0.16 });
        tone({ freq: PITCH[c % PITCH.length] * 1.5, dur: 0.3, type: "triangle", vol: 0.1, delay: 0.08 });
        break;
      }
    }
    if (p !== pathsRef.current) commit(p);
  };

  const handleUp = () => {
    if (drag.current === null) return;
    drag.current = null;
    setActive(null);
    const p = pathsRef.current;
    const allDone = p.every((pa, c) => complete(pa, puzzle.pairs[c]));
    const covered = new Set(p.flat()).size;
    if (allDone && covered === total) {
      setWon(true);
      setLevels({ ...levels, [difficulty]: level + 1 });
      const mv = movesRef.current;
      const prev = best[difficulty];
      if (prev === undefined || mv < prev) {
        setBest({ ...best, [difficulty]: mv });
        setNewBest(true);
      }
      [523, 659, 784, 1046].forEach((f, k) => tone({ freq: f, dur: 0.3, type: "triangle", vol: 0.14, delay: k * 0.1 }));
      noise(0.9, 0.1, 900, 0.1, 0.3);
    }
  };

  const connected = paths.filter((pa, c) => complete(pa, puzzle.pairs[c])).length;
  const covered = new Set(paths.flat()).size;
  const percent = Math.round((covered / total) * 100);
  const allConnected = connected === puzzle.pairs.length;
  const bestNow = best[difficulty];

  const centre = (cell: number) => `${(cell % n) * 100 + 50},${Math.floor(cell / n) * 100 + 50}`;
  const ownerAt = useMemo(() => {
    const m = Array<number>(total).fill(-1);
    paths.forEach((pa, c) => pa.forEach((cell) => (m[cell] = c)));
    return m;
  }, [paths, total]);

  const head = active !== null && paths[active]?.length ? paths[active][paths[active].length - 1] : -1;

  return (
    <main className={ui.page} style={{ ["--acc1" as string]: "#a855f7", ["--acc2" as string]: "#ec4899" }}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={() => router.push("/?select=flow")} aria-label="Retour">←</button>
        <div className={ui.titleBlock}>
          <h1 className={ui.title}>Flow</h1>
          <span className={ui.subtitle}>🌈 jeu chbeb w khtouta mayatla9awch</span>
        </div>
        <div className={ui.levelBadge}>
          <small>Niv</small>
          <b>{level}</b>
        </div>
      </div>

      <div className={ui.segmented}>
        {DIFF_ORDER.map((d) => (
          <button key={d} className={`${ui.segBtn} ${difficulty === d ? ui.segActive : ""}`} onClick={() => d !== difficulty && fresh(d)}>
            {DIFF_NAME[d]}
            <small>{FLOW_DIFFS[d].label} · {FLOW_DIFFS[d].colors} 🎨</small>
          </button>
        ))}
      </div>

      <div className={ui.stats}>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Coups</span>
          <span className={`${ui.statValue} ${ui.statAccent}`}>{moves}</span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Paires</span>
          <span className={ui.statValue}>
            {connected}/{puzzle.pairs.length}
          </span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Record</span>
          <span className={ui.statValue}>{bestNow ?? "—"}</span>
        </div>
      </div>

      <div className={`${ui.frame} ${won ? ui.frameWin : ""}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${n * 100} ${n * 100}`}
          className={styles.board}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <defs>
            <filter id="flowGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width={n * 100} height={n * 100} fill="#090b1a" />
          {/* cell plates (tinted with the colour that covers them) */}
          {Array.from({ length: total }, (_, cell) => {
            const c = ownerAt[cell];
            return (
              <rect
                key={cell}
                x={(cell % n) * 100 + 4}
                y={Math.floor(cell / n) * 100 + 4}
                width="92"
                height="92"
                rx="14"
                fill={c === -1 ? "#121630" : COLORS[c % COLORS.length]}
                opacity={c === -1 ? 1 : 0.22}
              />
            );
          })}
          {/* finger halo */}
          {head >= 0 && active !== null && (
            <circle cx={(head % n) * 100 + 50} cy={Math.floor(head / n) * 100 + 50} r="62" fill={COLORS[active % COLORS.length]} opacity="0.25" className={styles.halo} />
          )}
          {/* paths */}
          {paths.map((pa, c) =>
            pa.length > 1 ? (
              <polyline
                key={c}
                points={pa.map(centre).join(" ")}
                fill="none"
                stroke={COLORS[c % COLORS.length]}
                strokeWidth="34"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={complete(pa, puzzle.pairs[c]) ? "url(#flowGlow)" : undefined}
                className={styles.path}
              />
            ) : null
          )}
          {/* dots */}
          {puzzle.pairs.map(([a, b], c) => {
            const done = complete(paths[c] ?? [], puzzle.pairs[c]);
            return [a, b].map((cell) => {
              const cx = (cell % n) * 100 + 50, cy = Math.floor(cell / n) * 100 + 50;
              return (
                <g key={`${c}-${cell}`} className={done ? undefined : styles.dotIdle}>
                  <circle cx={cx} cy={cy} r="34" fill={COLORS[c % COLORS.length]} />
                  <circle cx={cx - 9} cy={cy - 10} r="9" fill="white" opacity="0.4" />
                  {done && <circle cx={cx} cy={cy} r="12" fill="white" opacity="0.9" />}
                </g>
              );
            });
          })}
        </svg>
        <div className={ui.progress}>
          <div className={ui.progressFill} style={{ width: `${percent}%` }} />
        </div>

        {won && (
          <div className={ui.overlay}>
            <div className={ui.overlayEmoji}>🌈</div>
            <h2 className={ui.overlayTitle}>Chbeb w khtouta!</h2>
            <p className={ui.overlayText}>
              Niveau {level - 1} réussi en <strong>{moves}</strong> coups
            </p>
            {newBest && <span className={ui.overlayRecord}>🏆 Nouveau record!</span>}
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => fresh(difficulty)}>
              Niveau {level} →
            </button>
          </div>
        )}
      </div>

      <p className={`${ui.note} ${allConnected && percent < 100 ? ui.noteWarn : ""}`}>
        {allConnected && percent < 100
          ? `✨ Kol les paires mrabtin — bessah kamel les cases lkhawin (${percent}%)`
          : `Jbed men noqta l noqta b nafs l loun · ma ykhtaltouch · kol case tetmla (${percent}%)`}
      </p>

      <div className={ui.actions}>
        <button className={ui.btn} onClick={restart} disabled={moves === 0}>🔄 3awed</button>
        <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => fresh(difficulty)}>✨ Jdid</button>
      </div>
      <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => router.push("/?select=1")}>🏠 Bdel l jeu</button>
    </main>
  );
}

function FlowEntry() {
  const params = useSearchParams();
  const d = params.get("diff");
  const initial: Difficulty = d === "difficile" ? "difficile" : d === "moyen" ? "moyen" : "facile";
  return (
    <ClientOnly>
      <FlowGame initial={initial} />
    </ClientOnly>
  );
}

export default function FlowPage() {
  return (
    <Suspense fallback={null}>
      <FlowEntry />
    </Suspense>
  );
}
