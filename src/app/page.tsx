"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./page.module.css";

// Floating background decorations
const FLOATERS = [
  { char: "✕", top: "10%",  left: "5%",  delay: "0s",   size: "3rem" },
  { char: "○", top: "20%",  left: "88%", delay: "1s",   size: "2.5rem" },
  { char: "✕", top: "70%",  left: "3%",  delay: "2s",   size: "2rem" },
  { char: "○", top: "80%",  left: "90%", delay: "0.5s", size: "3.5rem" },
  { char: "✕", top: "45%",  left: "92%", delay: "1.5s", size: "2rem" },
  { char: "○", top: "55%",  left: "2%",  delay: "2.5s", size: "2.5rem" },
];

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // Auto-progress on step 0 (opening) after 2.5s
  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => goToStep(1), 2600);
      return () => clearTimeout(t);
    }
  }, [step]);

  const goToStep = (next: number) => {
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 350);
  };

  const goToGame = (mode: string) => {
    router.push(`/jeu?mode=${mode}`);
  };

  return (
    <main className={styles["intro-wrapper"]}>
      {/* Floating decorations */}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className={i % 2 === 0 ? styles["float-x"] : styles["float-o"]}
          style={{
            top: f.top,
            left: f.left,
            animationDelay: f.delay,
            fontSize: f.size,
          }}
        >
          {f.char}
        </span>
      ))}

      {/* Progress dots */}
      <div className={styles["progress-dots"]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`${styles.dot} ${step === i ? styles.active : ""}`}
          />
        ))}
      </div>

      {/* ====== STEP 0 — WOW OPENING ====== */}
      {step === 0 && visible && (
        <div className={styles.step} key="step0">
          <div className={styles["opening-logo"]}>
            <span className={styles["xo-big"]}>XO</span>
          </div>
        </div>
      )}

      {/* ====== STEP 1 — "weee , rak baghi tal3eeeb ??" ====== */}
      {step === 1 && visible && (
        <div className={styles.step} key="step1">
          <h1 className={styles["taunt-big-text"]}>
            weee , rak baghi tal3eeeb ??
          </h1>
          <button
            id="btn-waah-nal3eb"
            className={styles["btn-wow"]}
            onClick={() => goToStep(2)}
          >
            waah nal3eb
          </button>
        </div>
      )}

      {/* ====== STEP 2 — "bsh m3a amine baynaa beli takhsser" ====== */}
      {step === 2 && visible && (
        <div className={styles.step} key="step2">
          <div className={styles["step2-card"]}>
            <p className={styles["step2-text"]}>
              bsh m3a amine baynaa beli takhsser
            </p>
          </div>
          <button
            id="btn-la-narbeh"
            className={`${styles["btn-wow"]} ${styles["btn-pink"]}`}
            onClick={() => goToStep(3)}
          >
            la narbeh ana
          </button>
        </div>
      )}

      {/* ====== STEP 3 — "cheel samet" ====== */}
      {step === 3 && visible && (
        <div className={styles.step} key="step3">
          <h2 className={styles["step3-text"]}>
            cheel samet
          </h2>
          <button
            id="btn-enter-game"
            className={styles["btn-wow"]}
            onClick={() => goToStep(4)}
          >
            w ana samet 3lik roh
          </button>
        </div>
      )}

      {/* ====== STEP 4 — MODE SELECTION ====== */}
      {step === 4 && visible && (
        <div className={styles.step} key="step4">
          <h2 className={styles["mode-title"]}>khtar kifech tal3aab</h2>
          <div className={styles["mode-cards"]}>
            {/* vs Machine */}
            <button
              id="btn-vs-machine"
              className={`${styles["mode-card"]} ${styles.machine}`}
              onClick={() => goToGame("vs-machine")}
            >
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>
                  tssayi zahrek m3eya w narabhek beynaa a d3if
                </span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* vs Friend */}
            <button
              id="btn-vs-ami"
              className={`${styles["mode-card"]} ${styles.friend}`}
              onClick={() => goToGame("vs-ami")}
            >
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>
                  nal33eb m3a sahbi
                </span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
