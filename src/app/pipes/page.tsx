"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { memo, Suspense, useCallback, useMemo, useState } from "react";
import ClientOnly from "../lib/ClientOnly";
import { noise, tone, unlockAudio } from "../lib/sfx";
import { useStored } from "../lib/useStored";
import ui from "../puzzle-ui/puzzle.module.css";
import styles from "./pipes.module.css";
import { E, N, PIPE_DIFFS, S, W, Difficulty, Tile, analyse, generatePuzzle } from "./generator";

const DIFF_ORDER: Difficulty[] = ["facile", "moyen", "difficile"];
const DIFF_NAME: Record<Difficulty, string> = { facile: "Sahel", moyen: "Moyen", difficile: "Hard 🔥" };

const ARMS: [number, number, number][] = [
  [N, 50, 0],
  [E, 100, 50],
  [S, 50, 100],
  [W, 0, 50],
];
const EDGE: [number, number, number][] = [
  [N, 50, 7],
  [E, 93, 50],
  [S, 50, 93],
  [W, 7, 50],
];

interface CellProps {
  base: number;
  turns: number;
  locked: boolean;
  source: boolean;
  depth: number;
  leak: number;
  won: boolean;
  onTap: () => void;
}

const Cell = memo(function Cell({ base, turns, locked, source, depth, leak, won, onTap }: CellProps) {
  const wet = depth >= 0;
  const arms = ARMS.filter(([d]) => base & d);
  return (
    <button
      type="button"
      className={`${styles.cell} ${locked && !source ? styles.locked : ""}`}
      onClick={onTap}
      aria-label={source ? "Source d'eau" : "Tuyau"}
    >
      <div className={styles.pipe} style={{ transform: `rotate(${turns * 90}deg)` }}>
        <svg
          viewBox="0 0 100 100"
          className={`${styles.svg} ${wet ? styles.wet : ""} ${won ? styles.glow : ""}`}
          style={{ ["--d" as string]: `${Math.max(0, depth) * 45}ms` }}
        >
          {arms.map(([d, x, y]) => <line key={`m${d}`} x1="50" y1="50" x2={x} y2={y} className={styles.metal} />)}
          <circle cx="50" cy="50" r="17" className={styles.metalHub} />
          {arms.map(([d, x, y]) => <line key={`c${d}`} x1="50" y1="50" x2={x} y2={y} className={styles.channel} />)}
          <circle cx="50" cy="50" r="10" className={styles.channelHub} />
          {wet && arms.map(([d, x, y]) => <line key={`f${d}`} x1="50" y1="50" x2={x} y2={y} className={styles.flow} />)}
        </svg>
      </div>

      {source && (
        <svg viewBox="0 0 100 100" className={styles.over}>
          <circle cx="50" cy="50" r="30" className={styles.sourceRing} />
          <circle cx="50" cy="50" r="23" className={styles.source} />
          <path d="M50 36 C 42 47, 41 52, 41 55 a9 9 0 0 0 18 0 c0 -3 -1 -8 -9 -19z" fill="white" opacity="0.95" />
        </svg>
      )}
      {leak > 0 && (
        <svg viewBox="0 0 100 100" className={styles.over}>
          {EDGE.map(([d, x, y]) => (leak & d ? <circle key={d} cx={x} cy={y} r="8" className={styles.leak} /> : null))}
        </svg>
      )}
      {locked && !source && (
        <svg viewBox="0 0 100 100" className={styles.over}>
          {[[12, 12], [88, 12], [12, 88], [88, 88]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="4.5" className={styles.bolt} />
          ))}
        </svg>
      )}
    </button>
  );
});

function PipesGame({ initial }: { initial: Difficulty }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>(initial);
  const [tiles, setTiles] = useState<Tile[]>(() => generatePuzzle(initial));
  const [start, setStart] = useState<Tile[]>(tiles);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [best, setBest] = useStored<Record<string, number>>("xoxo-pipes-best", {});
  const [levels, setLevels] = useStored<Record<string, number>>("xoxo-pipes-level", {});

  const n = PIPE_DIFFS[difficulty].size;
  const info = useMemo(() => analyse(tiles, n), [tiles, n]);
  const level = levels[difficulty] ?? 1;

  const fresh = useCallback((d: Difficulty) => {
    const t = generatePuzzle(d);
    setDifficulty(d);
    setTiles(t);
    setStart(t);
    setMoves(0);
    setWon(false);
    setNewBest(false);
  }, []);

  const restart = () => {
    setTiles(start.map((t) => ({ ...t })));
    setMoves(0);
    setWon(false);
    setNewBest(false);
  };

  const tap = useCallback(
    (i: number) => {
      if (won) return;
      if (tiles[i].locked) {
        tone({ freq: 150, dur: 0.08, type: "square", vol: 0.05 });
        return;
      }
      unlockAudio();
      const next = tiles.map((t, k) => (k === i ? { ...t, turns: t.turns + 1 } : t));
      const nm = moves + 1;
      setTiles(next);
      setMoves(nm);
      noise(0.04, 0.1, 1400);
      tone({ freq: 340, to: 480, dur: 0.06, type: "triangle", vol: 0.07 });
      const a = analyse(next, n);
      if (a.filledCount > info.filledCount) noise(0.25, 0.06, 500, 0.05, 0.4); // water rushing in
      if (a.solved) {
        setWon(true);
        setLevels({ ...levels, [difficulty]: level + 1 });
        const prev = best[difficulty];
        if (prev === undefined || nm < prev) {
          setBest({ ...best, [difficulty]: nm });
          setNewBest(true);
        }
        [523, 659, 784, 1046].forEach((f, k) => tone({ freq: f, dur: 0.3, type: "triangle", vol: 0.13, delay: 0.3 + k * 0.1 }));
      }
    },
    [won, tiles, moves, n, info.filledCount, best, difficulty, setBest, levels, level, setLevels]
  );

  const pct = Math.round((info.filledCount / tiles.length) * 100);

  return (
    <main className={ui.page} style={{ ["--acc1" as string]: "#0ea5e9", ["--acc2" as string]: "#6366f1" }}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={() => router.push("/?select=pipes")} aria-label="Retour">←</button>
        <div className={ui.titleBlock}>
          <h1 className={ui.title}>Pipes</h1>
          <span className={ui.subtitle}>💧 jeu te3 lma bech yfout</span>
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
            <small>{PIPE_DIFFS[d].label}</small>
          </button>
        ))}
      </div>

      <div className={ui.stats}>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Coups</span>
          <span className={`${ui.statValue} ${ui.statAccent}`}>{moves}</span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Fuites</span>
          <span className={`${ui.statValue} ${info.leakCount ? ui.statBad : ""}`}>{info.leakCount}</span>
        </div>
        <div className={ui.stat}>
          <span className={ui.statLabel}>Record</span>
          <span className={ui.statValue}>{best[difficulty] ?? "—"}</span>
        </div>
      </div>

      <div className={`${ui.frame} ${won ? ui.frameWin : ""}`}>
        <div className={styles.board} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {tiles.map((t, i) => (
            <Cell
              key={i}
              base={t.base}
              turns={t.turns}
              locked={t.locked}
              source={t.source}
              depth={info.depth[i]}
              leak={info.leaks[i]}
              won={won}
              onTap={() => tap(i)}
            />
          ))}
        </div>
        <div className={ui.progress}>
          <div className={ui.progressFill} style={{ width: `${pct}%` }} />
        </div>

        {won && (
          <div className={ui.overlay}>
            <div className={ui.overlayEmoji}>🌊</div>
            <h2 className={ui.overlayTitle}>Mchat lma mazyan!</h2>
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

      <p className={`${ui.note} ${info.leakCount > 0 ? ui.noteWarn : ""}`}>
        {info.leakCount > 0
          ? `💦 ${info.leakCount} fuite${info.leakCount > 1 ? "s" : ""} — dour les tuyaux bach lma ma yfoutch`
          : `Touche un tuyau bach tdourou · ${pct}% fih lma${PIPE_DIFFS[difficulty].locked ? " · 🔩 = mrakkeb, ma yetdourch" : ""}`}
      </p>

      <div className={ui.actions}>
        <button className={ui.btn} onClick={restart} disabled={moves === 0}>🔄 3awed</button>
        <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => fresh(difficulty)}>✨ Jdid</button>
      </div>
      <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => router.push("/?select=1")}>🏠 Bdel l jeu</button>
    </main>
  );
}

function PipesEntry() {
  const d = useSearchParams().get("diff");
  const initial: Difficulty = d === "difficile" ? "difficile" : d === "moyen" ? "moyen" : "facile";
  return (
    <ClientOnly>
      <PipesGame initial={initial} />
    </ClientOnly>
  );
}

export default function PipesPage() {
  return (
    <Suspense fallback={null}>
      <PipesEntry />
    </Suspense>
  );
}
