"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import styles from "./jeu2048.module.css";

// ========================
// Types & Constants
// ========================
type Grid = (number | null)[][];

function createEmptyGrid(): Grid {
  return Array(4).fill(null).map(() => Array(4).fill(null));
}

function addRandomTile(grid: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!grid[r][c]) empty.push([r, c]);
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function initGrid(): Grid {
  let g = createEmptyGrid();
  g = addRandomTile(g);
  g = addRandomTile(g);
  return g;
}

// Slide & merge a single row to the left
function slideRow(row: (number | null)[]): { row: (number | null)[]; score: number } {
  const nums = row.filter(Boolean) as number[];
  let score = 0;
  const merged: (number | null)[] = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      merged.push(nums[i] * 2);
      score += nums[i] * 2;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(null);
  return { row: merged, score };
}

type Direction = "left" | "right" | "up" | "down";

function move(grid: Grid, dir: Direction): { grid: Grid; score: number; moved: boolean } {
  let g = grid.map(row => [...row]);
  let totalScore = 0;
  let moved = false;

  const rotateLeft = (gr: Grid): Grid =>
    gr[0].map((_, c) => gr.map(row => row[c]).reverse());
  const rotateRight = (gr: Grid): Grid =>
    gr[0].map((_, c) => gr.map(row => row[3 - c]));

  if (dir === "right")  g = rotateLeft(rotateLeft(g));
  if (dir === "up")     g = rotateRight(g);
  if (dir === "down")   g = rotateLeft(g);

  g = g.map(row => {
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    if (newRow.some((v, i) => v !== row[i])) moved = true;
    return newRow;
  });

  if (dir === "right")  g = rotateLeft(rotateLeft(g));
  if (dir === "up")     g = rotateLeft(g);
  if (dir === "down")   g = rotateRight(g);

  return { grid: g, score: totalScore, moved };
}

function hasWon(grid: Grid): boolean {
  return grid.some(row => row.some(v => v === 2048));
}

function hasLost(grid: Grid): boolean {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (!grid[r][c]) return false;
    if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
    if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
  }
  return true;
}

function getTileClass(val: number | null): string {
  if (!val) return "";
  if (val >= 2048) return val === 2048 ? styles["tile-2048"] : styles["tile-super"];
  return styles[`tile-${val}` as keyof typeof styles] || styles["tile-super"];
}

// ========================
// Main Component
// ========================
function Game2048Content() {
  const router = useRouter();
  const [grid, setGrid] = useState<Grid>(initGrid);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set());

  // Load best score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("2048-best");
      if (saved) setBestScore(parseInt(saved));
    } catch {}
  }, []);

  const saveBest = useCallback((s: number) => {
    setBestScore(prev => {
      const next = Math.max(prev, s);
      try { localStorage.setItem("2048-best", String(next)); } catch {}
      return next;
    });
  }, []);

  const doMove = useCallback((dir: Direction) => {
    if (status === "lost") return;
    setGrid(prev => {
      const { grid: newGrid, score: gained, moved } = move(prev, dir);
      if (!moved) return prev;
      const withNew = addRandomTile(newGrid);
      setScore(s => {
        const next = s + gained;
        saveBest(next);
        return next;
      });
      // Track new tiles
      const newSet = new Set<string>();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (withNew[r][c] && !newGrid[r][c]) newSet.add(`${r}-${c}`);
      }
      setNewTiles(newSet);
      setTimeout(() => setNewTiles(new Set()), 200);

      if (hasWon(withNew) && status === "playing") setStatus("won");
      else if (hasLost(withNew)) setStatus("lost");
      return withNew;
    });
  }, [status, saveBest]);

  const restart = useCallback(() => {
    setGrid(initGrid());
    setScore(0);
    setStatus("playing");
    setNewTiles(new Set());
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowLeft: "left", ArrowRight: "right",
        ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); doMove(dir); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  // Swipe handlers (Mouse & Touch supported via pointer events)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX > 25 || absY > 25) {
      if (absX > absY) doMove(dx > 0 ? "right" : "left");
      else doMove(dy > 0 ? "down" : "up");
    }
    dragStartRef.current = null;
  };

  const statusMsg =
    status === "won"  ? "🎉 2048 ! rak rbahti !" :
    status === "lost" ? "💀 Game Over — wach dir ?" :
    "swipe hadouk les numeros";

  return (
    <main className={styles.page2048}>
      {/* Header */}
      <div className={styles.header}>
        <button className={`${styles["back-link"]} btn-ghost`} onClick={() => router.push("/?select=1")} id="btn-2048-back">
          ← Rja3
        </button>
        <div className={styles.logo}>
          <span className="gradient-text-gold">2048</span>
        </div>
        <div className={styles.badge}>Puzzle 🧠</div>
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>Score</span>
          <span className={styles["score-value"]}>{score}</span>
        </div>
        <span className={styles["score-divider"]}>·</span>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>Record</span>
          <span className={`${styles["score-value"]} ${styles.best}`}>{bestScore}</span>
        </div>
      </div>

      {/* Status */}
      <div className={`${styles["status-banner"]} ${status === "won" ? styles.won : status === "lost" ? styles.lost : ""}`}>
        <span>{statusMsg}</span>
      </div>

      {/* Grid */}
      <div
        className={styles["grid-wrapper"]}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const key = `${r}-${c}`;
            const isNew = newTiles.has(key);
            return (
              <div
                key={key}
                id={`cell-${r}-${c}`}
                className={[styles.cell, val ? getTileClass(val) : "", isNew ? styles["tile-new"] : ""].join(" ")}
              >
                {val || ""}
              </div>
            );
          })
        )}
      </div>

      <p className={styles.hint}>swipe hadouk les numeros</p>

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles["action-row"]}>
          <button id="btn-2048-new" className={`${styles["action-btn"]} ${styles["btn-new"]}`} onClick={restart}>
            🔄 Nouvelle Partie
          </button>
        </div>
        <button id="btn-2048-menu" className="btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={() => router.push("/?select=1")}>
          🏠 Changer de jeu
        </button>
      </div>
    </main>
  );
}

export default function Page2048() {
  return (
    <Suspense fallback={
      <div className="page-wrapper" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <div style={{ fontSize: "3rem" }}>⏳</div>
      </div>
    }>
      <Game2048Content />
    </Suspense>
  );
}
