"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, Suspense } from "react";
import styles from "./water-sort.module.css";
import { useIsClient } from "../lib/useStored";
import { DIFFS, Difficulty, TUBE_CAPACITY, generateLevel as generate } from "./generator";

const generateLevel = (d: Difficulty) => generate(d, COLOR_NAMES);

// 12 high-contrast colours. Easy/medium use the first 4/6 (with icons);
// hard uses all 12 with colours ONLY, so you must read the colours.
const PALETTE: { name: string; icon: string; hex: string; gradient: string }[] = [
  { name: "Rouge",  icon: "🔴", hex: "#ef4444", gradient: "linear-gradient(180deg, #f87171, #b91c1c)" },
  { name: "Bleu",   icon: "🔵", hex: "#2563eb", gradient: "linear-gradient(180deg, #60a5fa, #1d4ed8)" },
  { name: "Vert",   icon: "🟢", hex: "#15803d", gradient: "linear-gradient(180deg, #22c55e, #14532d)" },
  { name: "Jaune",  icon: "🟡", hex: "#facc15", gradient: "linear-gradient(180deg, #fef08a, #eab308)" },
  { name: "Violet", icon: "🟣", hex: "#7e22ce", gradient: "linear-gradient(180deg, #a855f7, #581c87)" },
  { name: "Cyan",   icon: "🩵", hex: "#06b6d4", gradient: "linear-gradient(180deg, #67e8f9, #0891b2)" },
  { name: "Rose",   icon: "🌸", hex: "#ec4899", gradient: "linear-gradient(180deg, #f9a8d4, #db2777)" },
  { name: "Noir",   icon: "⚫", hex: "#18181b", gradient: "linear-gradient(180deg, #3f3f46, #09090b)" },
  { name: "Marron", icon: "🟤", hex: "#78350f", gradient: "linear-gradient(180deg, #a16207, #451a03)" },
  { name: "Orange", icon: "🟠", hex: "#f97316", gradient: "linear-gradient(180deg, #fdba74, #ea580c)" },
  { name: "Citron", icon: "🍋", hex: "#a3e635", gradient: "linear-gradient(180deg, #d9f99d, #84cc16)" },
  { name: "Gris",   icon: "🩶", hex: "#64748b", gradient: "linear-gradient(180deg, #94a3b8, #475569)" },
];

// Web Audio sound synthesizer for liquid sounds
function playWaterSound(type: "select" | "pour" | "error" | "win") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "select") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "pour") {
      // Bubbly liquid pour sound
      [360, 480, 600].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, ctx.currentTime + i * 0.04 + 0.09);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.04);
        osc.stop(ctx.currentTime + i * 0.04 + 0.09);
      });
    } else if (type === "error") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    }
  } catch {}
}

const COLOR_NAMES = PALETTE.map((p) => p.name);
const TUBE_LABEL: Record<Difficulty, string> = { facile: "6 Tubes", moyen: "8 Tubes", difficile: "14 Tubes" };

function WaterSortContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const diffParam = searchParams.get("diff");

  // Mode: "facile" (6 tubes), "moyen" (8 tubes), or "difficile" (11 tubes)
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    if (diffParam === "difficile") return "difficile";
    if (diffParam === "moyen") return "moyen";
    return "facile";
  });

  const [tubes, setTubes] = useState<string[][]>(() =>
    generateLevel(difficulty)
  );
  const [initialState, setInitialState] = useState<string[][]>(() => tubes);
  const [history, setHistory] = useState<string[][][]>([]);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [undosUsed, setUndosUsed] = useState(0);
  const cfg = DIFFS[difficulty];
  const undosLeft = cfg.undos - undosUsed;

  // Restart puzzle
  const restartLevel = useCallback(() => {
    setTubes(initialState.map((t) => [...t]));
    setHistory([]);
    setSelectedTube(null);
    setMoves(0);
    setIsWon(false);
    setUndosUsed(0);
  }, [initialState]);

  // New puzzle
  const newPuzzle = useCallback((diff: Difficulty) => {
    const generated = generateLevel(diff);
    setDifficulty(diff);
    setTubes(generated);
    setInitialState(generated.map((t) => [...t]));
    setHistory([]);
    setSelectedTube(null);
    setMoves(0);
    setIsWon(false);
    setUndosUsed(0);
  }, []);

  // Switch difficulty
  const handleDiffChange = (newDiff: Difficulty) => {
    if (newDiff === difficulty) return;
    newPuzzle(newDiff);
  };

  // Undo move
  const undo = () => {
    if (history.length === 0 || isWon || undosLeft <= 0) return;
    setUndosUsed((u) => u + 1);
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTubes(prev);
    setSelectedTube(null);
    setMoves((m) => Math.max(0, m - 1));
  };

  // Check if tube is solved (empty or 4 same colors)
  const isTubeSolved = (tube: string[]) => {
    if (tube.length === 0) return true;
    return tube.length === TUBE_CAPACITY && tube.every((c) => c === tube[0]);
  };

  // Check victory
  const checkWin = (currentTubes: string[][]) => {
    return currentTubes.every((t) => isTubeSolved(t));
  };

  // Handle tube click
  const handleTubeClick = (tubeIndex: number) => {
    if (isWon) return;

    if (selectedTube === null) {
      // First click: select source tube
      if (tubes[tubeIndex].length === 0) {
        // Can't select empty tube
        return;
      }
      playWaterSound("select");
      setSelectedTube(tubeIndex);
    } else {
      // Second click: either deselect or attempt pour
      if (selectedTube === tubeIndex) {
        // Deselect
        setSelectedTube(null);
        return;
      }

      const source = tubes[selectedTube];
      const target = tubes[tubeIndex];

      const sourceTopColor = source[source.length - 1];
      const targetCapacityRemaining = TUBE_CAPACITY - target.length;

      // Check if pour is valid
      const isValid =
        targetCapacityRemaining > 0 &&
        (target.length === 0 || target[target.length - 1] === sourceTopColor);

      if (!isValid) {
        // Invalid target: if target has liquid, switch selection to it
        if (target.length > 0) {
          playWaterSound("select");
          setSelectedTube(tubeIndex);
        } else {
          playWaterSound("error");
          setSelectedTube(null);
        }
        return;
      }

      // Count how many consecutive units of sourceTopColor are at the top of source
      let consecutiveCount = 0;
      for (let i = source.length - 1; i >= 0; i--) {
        if (source[i] === sourceTopColor) consecutiveCount++;
        else break;
      }

      const unitsToMove = Math.min(consecutiveCount, targetCapacityRemaining);

      // Save history for undo
      setHistory((prev) => [...prev, tubes.map((t) => [...t])]);

      // Move units
      const nextTubes = tubes.map((t) => [...t]);
      const movingColors = nextTubes[selectedTube].splice(
        nextTubes[selectedTube].length - unitsToMove,
        unitsToMove
      );
      nextTubes[tubeIndex].push(...movingColors);

      playWaterSound("pour");
      setTubes(nextTubes);
      setSelectedTube(null);
      setMoves((m) => m + 1);

      // Check victory
      if (checkWin(nextTubes)) {
        playWaterSound("win");
        setIsWon(true);
      }
    }
  };

  return (
    <main className={styles["watersort-page"]}>
      {/* Header */}
      <div className={styles["watersort-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => router.push("/?select=1")}
          id="btn-watersort-back"
        >
          ← Rja3
        </button>
        <div className={styles["watersort-logo"]}>
          <span className="gradient-text">Water Sort 🧪</span>
        </div>
        <div className={styles["badge-watersort"]}>
          {TUBE_LABEL[difficulty]}
        </div>
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>Coups Joués</span>
          <span className={`${styles["score-value"]} ${styles.moves}`}>{moves}</span>
        </div>
        <span className={styles["score-divider"]}>·</span>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>Niveau</span>
          <span className={styles["score-value"]}>
            {difficulty === "facile"
              ? "Sahel 🟢"
              : difficulty === "moyen"
              ? "Moyen 🟡"
              : "Difficile 🔥"}
          </span>
        </div>
      </div>

      {/* Difficulty Switcher */}
      <div className={styles["diff-bar"]}>
        <button
          className={`${styles["diff-chip"]} ${difficulty === "facile" ? styles.active : ""}`}
          onClick={() => handleDiffChange("facile")}
        >
          Sahel (6 tubes)
        </button>
        <button
          className={`${styles["diff-chip"]} ${difficulty === "moyen" ? styles.active : ""}`}
          onClick={() => handleDiffChange("moyen")}
        >
          Moyen (8 tubes)
        </button>
        <button
          className={`${styles["diff-chip"]} ${difficulty === "difficile" ? styles.active : ""}`}
          onClick={() => handleDiffChange("difficile")}
        >
          Difficile (14 tubes)
        </button>
      </div>

      {/* Tubes Arena */}
      <div className={styles["arena-card"]}>
        <div className={`${styles["tubes-container"]} ${difficulty === "difficile" ? styles["tubes-hard"] : ""}`}>
          {tubes.map((tube, tIdx) => {
            const isSelected = selectedTube === tIdx;
            const isSolved = tube.length === TUBE_CAPACITY && tube.every((c) => c === tube[0]);

            return (
              <div
                key={tIdx}
                className={`
                  ${styles.tube}
                  ${isSelected ? styles["tube-selected"] : ""}
                  ${isSolved ? styles["tube-solved"] : ""}
                `}
                onClick={() => handleTubeClick(tIdx)}
              >
                <div className={styles["tube-rim"]} />
                <div className={styles["tube-sheen"]} />

                {tube.map((colorName, uIdx) => {
                  const colorObj = PALETTE.find((p) => p.name === colorName) || PALETTE[0];
                  return (
                    <div
                      key={uIdx}
                      className={styles["liquid-unit"]}
                      style={{
                        background: colorObj.gradient,
                      }}
                    >
                      {cfg.icons && <span className={styles["liquid-icon"]}>{colorObj.icon}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Victory Overlay */}
        {isWon && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3.2rem" }}>🏆</div>
            <h2 className={styles["overlay-title"]}>nasta3ref bik hakek</h2>
            <p className={styles["overlay-score"]}>
              Résolu en <strong>{moves}</strong> coups !
            </p>
            <button
              id="btn-watersort-next"
              className={`${styles["btn-action"]} ${styles["btn-primary-watersort"]}`}
              onClick={() => newPuzzle(difficulty)}
            >
              ✨ Niveau Suivant
            </button>
          </div>
        )}
      </div>

      <p className={styles.hint}>
        {difficulty === "difficile"
          ? "Mode hard: ghir les couleurs, 5 annulations bark — fakker qbel ma tsabb 🧠"
          : "cliquer 3la tube tahakmeh w zawej tfaragh fih"}
      </p>

      {/* Control Actions */}
      <div className={styles["actions-row"]}>
        <button
          id="btn-watersort-undo"
          className={styles["btn-action"]}
          onClick={undo}
          disabled={history.length === 0 || isWon || undosLeft <= 0}
        >
          ↩️ Annuler {Number.isFinite(cfg.undos) ? `(${undosLeft} b9aw)` : `(${history.length})`}
        </button>
        <button
          id="btn-watersort-restart"
          className={styles["btn-action"]}
          onClick={restartLevel}
        >
          🔄 Recommencer
        </button>
        <button
          id="btn-watersort-new"
          className={`${styles["btn-action"]} ${styles["btn-primary-watersort"]}`}
          onClick={() => newPuzzle(difficulty)}
        >
          ✨ Nouveau
        </button>
      </div>

      <button
        id="btn-watersort-menu"
        className="btn-secondary"
        style={{ width: "100%", maxWidth: "460px", justifyContent: "center" }}
        onClick={() => router.push("/?select=1")}
      >
        🏠 Changer de jeu
      </button>
    </main>
  );
}

// Puzzles are random: generate them only in the browser so server HTML never mismatches.
function ClientOnly({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  return isClient ? <>{children}</> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: "3rem" }}>⏳</div>;
}

export default function WaterSortPage() {
  return (
    <Suspense
      fallback={
        <div
          className="page-wrapper"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}
        >
          <div style={{ fontSize: "3rem" }}>⏳</div>
        </div>
      }
    >
      <ClientOnly>
        <WaterSortContent />
      </ClientOnly>
    </Suspense>
  );
}
