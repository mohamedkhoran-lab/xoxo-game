"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./simon.module.css";

const COLORS = ["green", "red", "yellow", "blue"] as const;
type Color = typeof COLORS[number];

const AUDIO_FREQS: Record<Color, number> = { green: 261, red: 329, yellow: 392, blue: 523 };

function playBeep(freq: number, duration = 300) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {}
}

function SimonContent() {
  const router = useRouter();
  const [sequence, setSequence] = useState<Color[]>([]);
  const [userInput, setUserInput] = useState<Color[]>([]);
  const [litColor, setLitColor] = useState<Color | null>(null);
  const [phase, setPhase] = useState<"idle" | "showing" | "input" | "error" | "win">("idle");
  const [level, setLevel] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const isRunning = useRef(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("simon-best");
      if (s) setBestLevel(parseInt(s));
    } catch {}
  }, []);

  const flashColor = useCallback((color: Color, dur = 350) => {
    return new Promise<void>(resolve => {
      setLitColor(color);
      playBeep(AUDIO_FREQS[color], dur - 50);
      setTimeout(() => {
        setLitColor(null);
        setTimeout(resolve, 100);
      }, dur);
    });
  }, []);

  const showSequence = useCallback(async (seq: Color[]) => {
    setPhase("showing");
    isRunning.current = true;
    await new Promise(r => setTimeout(r, 500));
    for (const color of seq) {
      if (!isRunning.current) return;
      await flashColor(color, 400);
    }
    setPhase("input");
    setUserInput([]);
  }, [flashColor]);

  const startGame = useCallback(() => {
    isRunning.current = true;
    const first = COLORS[Math.floor(Math.random() * 4)];
    const seq = [first];
    setSequence(seq);
    setLevel(1);
    showSequence(seq);
  }, [showSequence]);

  const handleColorClick = useCallback(async (color: Color) => {
    if (phase !== "input") return;
    await flashColor(color, 250);
    const newInput = [...userInput, color];
    setUserInput(newInput);

    const idx = newInput.length - 1;
    if (newInput[idx] !== sequence[idx]) {
      // Error
      setPhase("error");
      isRunning.current = false;
      playBeep(110, 600);
      return;
    }

    if (newInput.length === sequence.length) {
      // Level complete
      const nextLevel = level + 1;
      if (nextLevel > bestLevel) {
        setBestLevel(nextLevel);
        try { localStorage.setItem("simon-best", String(nextLevel)); } catch {}
      }
      setLevel(nextLevel);
      await new Promise(r => setTimeout(r, 600));
      const nextColor = COLORS[Math.floor(Math.random() * 4)];
      const newSeq = [...sequence, nextColor];
      setSequence(newSeq);
      showSequence(newSeq);
    }
  }, [phase, userInput, sequence, level, bestLevel, flashColor, showSequence]);

  const statusText =
    phase === "idle"    ? "Appuie sur Commencer !" :
    phase === "showing" ? `Regarde bien... Niveau ${level}` :
    phase === "input"   ? `À toi ! (${userInput.length}/${sequence.length})` :
    phase === "error"   ? `❌ Raté ! T'étais au niveau ${level}` :
    "🎉 Incroyable !";

  const btnClass = (c: Color) =>
    [styles["simon-btn"], styles[`btn-${c}`], litColor === c ? styles.lit : ""].join(" ");

  return (
    <main className={styles["simon-page"]}>
      {/* Header */}
      <div className={styles["simon-header"]}>
        <button className={`${styles["back-link"]} btn-ghost`} onClick={() => { isRunning.current=false; router.push("/?select=1"); }} id="btn-simon-back">
          ← Rja3
        </button>
        <div className={styles["simon-logo"]}>
          <span className="gradient-text">Simon 🔴</span>
        </div>
        <div className={styles["badge-simon"]}>Mémoire</div>
      </div>

      {/* Level */}
      <div className={styles["level-bar"]}>
        <div className={styles["level-item"]}>
          <span className={styles["level-label"]}>Niveau</span>
          <span className={styles["level-value"]}>{level}</span>
        </div>
        <span className={styles["level-divider"]}>·</span>
        <div className={styles["level-item"]}>
          <span className={styles["level-label"]}>Record</span>
          <span className={`${styles["level-value"]} ${styles.best}`}>{bestLevel}</span>
        </div>
      </div>

      {/* Status */}
      <div className={`${styles["status-banner"]} ${styles[phase] || ""}`}>
        {statusText}
      </div>

      {/* Simon Board */}
      <div className={styles["simon-board"]}>
        {COLORS.map(color => (
          <button
            key={color}
            id={`btn-simon-${color}`}
            className={btnClass(color)}
            onClick={() => handleColorClick(color)}
            disabled={phase !== "input"}
            aria-label={color}
          />
        ))}
      </div>

      {/* Actions */}
      <div className={styles["simon-actions"]}>
        <button
          id="btn-simon-start"
          className={`${styles["action-btn"]} ${styles["btn-start"]}`}
          onClick={startGame}
          disabled={phase === "showing" || phase === "input"}
        >
          {phase === "idle" ? "▶ Commencer" : phase === "error" ? "🔄 Rejouer" : "⟳ Réinitialiser"}
        </button>
        <button id="btn-simon-menu" className="btn-secondary" style={{ width:"100%", justifyContent:"center" }} onClick={() => { isRunning.current=false; router.push("/?select=1"); }}>
          🏠 Changer de jeu
        </button>
      </div>
    </main>
  );
}

export default function SimonPage() {
  return (
    <Suspense fallback={
      <div className="page-wrapper" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <div style={{ fontSize:"3rem" }}>⏳</div>
      </div>
    }>
      <SimonContent />
    </Suspense>
  );
}
