"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./bubble-wrap.module.css";

// Punchy & Satisfying "Tartga" Pop Sound Synthesizer via Web Audio API
function playPopSound(soundIndex = 0) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const t = ctx.currentTime;
    const pitchOffset = (soundIndex % 7) * 22;

    // 1. Resonant Body Thud / Punch
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(500 + pitchOffset, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);

    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.065);

    // 2. Crisp Snap / Pop Transient
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = "triangle";
    snapOsc.frequency.setValueAtTime(850 + pitchOffset * 1.5, t);
    snapOsc.frequency.exponentialRampToValueAtTime(140, t + 0.035);

    snapGain.gain.setValueAtTime(0.35, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(t);
    snapOsc.stop(t + 0.035);

    // 3. Noise Burst for membrane rupture
    const bufferSize = Math.floor(ctx.sampleRate * 0.025);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1500, t);
    filter.Q.setValueAtTime(2.2, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);
  } catch {}
}

const TOTAL_BUBBLES = 36; // 6 columns x 6 rows
const COLOR_CLASSES = [
  styles["color-pink"],
  styles["color-purple"],
  styles["color-blue"],
  styles["color-cyan"],
  styles["color-mint"],
  styles["color-orange"],
];

function BubbleWrapContent() {
  const router = useRouter();

  // Boolean array: true = popped, false = unpopped
  const [poppedState, setPoppedState] = useState<boolean[]>(() =>
    Array(TOTAL_BUBBLES).fill(false)
  );

  const [poppedCount, setPoppedCount] = useState(0);
  const [mode, setMode] = useState<"relax" | "clean">("relax"); // relax = auto refill after 3s, clean = pop all
  const [isAllPopped, setIsAllPopped] = useState(false);
  const [activePopAnim, setActivePopAnim] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPointerDownRef = useRef(false);

  // Load count
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bubble-pop-count");
      if (saved) setPoppedCount(parseInt(saved, 10));
    } catch {}
  }, []);

  const popBubble = useCallback(
    (index: number) => {
      setPoppedState((prev) => {
        if (prev[index]) return prev; // already popped

        // Haptic feedback if supported on mobile
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(10);
          } catch {}
        }

        playPopSound(index);
        setActivePopAnim(index);

        const next = [...prev];
        next[index] = true;

        // Auto refill in "relax" mode
        if (mode === "relax") {
          setTimeout(() => {
            setPoppedState((curr) => {
              const updated = [...curr];
              updated[index] = false;
              return updated;
            });
          }, 3500);
        }

        // Check if all popped in "clean" mode
        if (next.every((p) => p)) {
          setIsAllPopped(true);
        }

        return next;
      });

      setPoppedCount((prev) => {
        const next = prev + 1;
        try {
          localStorage.setItem("bubble-pop-count", String(next));
        } catch {}
        return next;
      });
    },
    [mode]
  );

  // Fresh sheet
  const refillAll = () => {
    setPoppedState(Array(TOTAL_BUBBLES).fill(false));
    setIsAllPopped(false);
  };

  // Continuous pointer glide/drag support to pop multiple bubbles smoothly
  const handlePointerDown = (index: number) => {
    isPointerDownRef.current = true;
    popBubble(index);
  };

  const handlePointerEnter = (index: number) => {
    if (isPointerDownRef.current) {
      popBubble(index);
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isPointerDownRef.current = false;
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, []);

  // Touch glide handling over the grid
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.hasAttribute("data-bubble-idx")) {
      const idx = parseInt(element.getAttribute("data-bubble-idx") || "-1", 10);
      if (idx >= 0 && idx < TOTAL_BUBBLES) {
        popBubble(idx);
      }
    }
  };

  return (
    <main className={styles["bubble-page"]}>
      {/* Header */}
      <div className={styles["bubble-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => router.push("/?select=1")}
          id="btn-bubble-back"
        >
          ← Rja3
        </button>
        <div className={styles["bubble-logo"]}>
          <span className="gradient-text">Bubble Wrap 🫧</span>
        </div>
        <div className={styles["badge-bubble"]}>Anti-Stress</div>
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>Bulles Éclatées</span>
          <span className={`${styles["score-value"]} ${styles.popped}`}>{poppedCount}</span>
        </div>
        <span className={styles["score-divider"]}>·</span>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>Restantes</span>
          <span className={styles["score-value"]}>
            {TOTAL_BUBBLES - poppedState.filter(Boolean).length}
          </span>
        </div>
      </div>

      {/* Mode Chips */}
      <div className={styles["mode-toggle-bar"]}>
        <button
          className={`${styles["mode-chip"]} ${mode === "relax" ? styles.active : ""}`}
          onClick={() => {
            setMode("relax");
            refillAll();
          }}
        >
          ♾️ Mode Infini
        </button>
        <button
          className={`${styles["mode-chip"]} ${mode === "clean" ? styles.active : ""}`}
          onClick={() => {
            setMode("clean");
            refillAll();
          }}
        >
          🎯 Vider la feuille
        </button>
      </div>

      {/* Celebration banner when entire sheet is popped in "clean" mode */}
      {isAllPopped && (
        <div className={styles["celebrate-banner"]}>
          ✨ nasta3ref bik hakek ! ✨
        </div>
      )}

      {/* 6x6 Bubble Grid */}
      <div
        ref={containerRef}
        className={styles["sheet-container"]}
        onTouchMove={handleTouchMove}
      >
        {poppedState.map((isPopped, idx) => {
          const row = Math.floor(idx / 6);
          const colorClass = COLOR_CLASSES[row % COLOR_CLASSES.length];
          const isAnimating = activePopAnim === idx;

          return (
            <div
              key={idx}
              data-bubble-idx={idx}
              className={`
                ${styles.bubble}
                ${colorClass}
                ${isPopped ? styles["bubble-popped"] : styles["bubble-unpopped"]}
                ${isAnimating ? styles["bubble-pop-anim"] : ""}
              `}
              onPointerDown={() => handlePointerDown(idx)}
              onPointerEnter={() => handlePointerEnter(idx)}
            >
              {!isPopped && <div className={styles["bubble-glare"]} />}
            </div>
          );
        })}
      </div>

      <p className={styles.hint}>
        cliquer 3la les ballons bech tartaghom
      </p>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          id="btn-bubble-refill"
          className={styles["btn-refill"]}
          onClick={refillAll}
        >
          🔄 Nouvelle Feuille
        </button>
        <button
          id="btn-bubble-menu"
          className="btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => router.push("/?select=1")}
        >
          🏠 Changer de jeu
        </button>
      </div>
    </main>
  );
}

export default function BubbleWrapPage() {
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
      <BubbleWrapContent />
    </Suspense>
  );
}

