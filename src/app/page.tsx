"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
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

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const directSelect = searchParams.get("select");

  const initialStep =
    directSelect === "1"         ? 1 :
    directSelect === "mode"      ? 4 :
    directSelect === "dama"      ? 5 :
    directSelect === "chess"     ? 6 :
    directSelect === "pong"      ? 7 :
    directSelect === "watersort" ? 8 :
    0;

  const [step, setStep] = useState(initialStep);
  const [visible, setVisible] = useState(true);

  const goToStep = (next: number) => {
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 240);
  };

  const goToGame = (route: string) => {
    router.push(route);
  };

  return (
    <main className={styles["intro-wrapper"]}>
      {/* Vitality animated ambient lights for background continuity */}
      <div className={styles.vitalityOrb1} />
      <div className={styles.vitalityOrb2} />
      <div className={styles.vitalityOrb3} />

      {/* Floating decorations */}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className={`${i % 2 === 0 ? styles["float-x"] : styles["float-o"]} ${styles[`floater-${i}`]}`}
          style={{ top: f.top, left: f.left, animationDelay: f.delay, fontSize: f.size }}
        >
          {f.char}
        </span>
      ))}

      {/* Progress dots */}
      <div className={styles["progress-dots"]}>
        {[0, 1, 2, 4].map((stepIndex) => {
          const isActive = [5, 6, 7, 8].includes(step) ? stepIndex === 1 : step === stepIndex;
          return (
            <div key={stepIndex} className={`${styles.dot} ${isActive ? styles.active : ""}`} />
          );
        })}
      </div>

      {/* ====== STEP 0 ====== */}
      {step === 0 && (
        <div className={`${styles.step} ${styles.heroStep} ${!visible ? styles.stepOut : styles.stepIn}`} key="step0">
          <div className={styles.heroHalo} />
          <h1 className={styles["welcome-title"]}>
            rak baghi tal3ab chwiya ??
          </h1>
          <button
            id="btn-commencer"
            className={styles["btn-commencer-bright"]}
            onClick={() => goToStep(1)}
          >
            oui nal3eeb , eya rohhh!!!
          </button>
        </div>
      )}

      {/* ====== STEP 1 — CHARAK BAGHI TEL3EB ?? ====== */}
      {step === 1 && (
        <div className={`${styles.step} ${!visible ? styles.stepOut : styles.stepIn}`} key="step1">
          <h1 className={styles["mode-title"]}>
            charak baghi tel3eb ??
          </h1>
          <div className={styles["games-grid"]}>

            {/* XOXO */}
            <button id="btn-game-xoxo" className={`${styles["mode-card"]} ${styles["game-xoxo"]}`} onClick={() => goToStep(2)}>
              <div className={styles["game-card-icon"]}><span className={styles["xo-mini-tag"]}>XO</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>XOXO</span>
                <span className={styles["mode-card-sub"]}>tal3eb contre amine wela contre sahbek</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* DAMA */}
            <button id="btn-game-dama" className={`${styles["mode-card"]} ${styles["game-dama"]}`} onClick={() => goToStep(5)}>
              <div className={styles["game-card-icon"]}><span className={styles["dama-mini-tag"]}>👑</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Dama</span>
                <span className={styles["mode-card-sub"]}>contre amine wela m3a sahbek</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* CHESS */}
            <button id="btn-game-chess" className={`${styles["mode-card"]} ${styles["game-chess"]}`} onClick={() => goToStep(6)}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>♟️</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Chess</span>
                <span className={styles["mode-card-sub"]}>contre amine wela m3a sahbek</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* SNAKE */}
            <button id="btn-game-snake" className={`${styles["mode-card"]} ${styles["game-snake"]}`} onClick={() => router.push("/snake")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🐍</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Snake (te3 laf3aa)</span>
                <span className={styles["mode-card-sub"]}>nostalgie souvenir 🎮</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* 2048 */}
            <button id="btn-game-2048" className={`${styles["mode-card"]} ${styles["game-2048"]}`} onClick={() => router.push("/jeu-2048")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.4rem", fontWeight: 900 }}>2048</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>2048</span>
                <span className={styles["mode-card-sub"]}>ida rak baghi trayah chwya essayer heda jeu</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* MEMORY */}
            <button id="btn-game-memory" className={`${styles["mode-card"]} ${styles["game-memory"]}`} onClick={() => router.push("/memory")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🃏</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Memory Cards</span>
                <span className={styles["mode-card-sub"]}>ida 3endek memoire kbirrra</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* SIMON SAYS */}
            <button id="btn-game-simon" className={`${styles["mode-card"]} ${styles["game-simon"]}`} onClick={() => router.push("/simon")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🔴</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Simon Says</span>
                <span className={styles["mode-card-sub"]}>z3ma memoire ta3ek kbira ??</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* FLAPPY BIRD */}
            <button id="btn-game-flappy" className={`${styles["mode-card"]} ${styles["game-flappy"]}`} onClick={() => router.push("/flappy")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🐦</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Flappy Bird</span>
                <span className={styles["mode-card-sub"]}>chwya nostalgie 🎮</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* PONG */}
            <button id="btn-game-pong" className={`${styles["mode-card"]} ${styles["game-pong"]}`} onClick={() => goToStep(7)}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🏓</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Pong</span>
                <span className={styles["mode-card-sub"]}>ta9der m3a sahbek wela m3eya</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* BREAKOUT */}
            <button id="btn-game-breakout" className={`${styles["mode-card"]} ${styles["game-breakout"]}`} onClick={() => router.push("/breakout")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🧱</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Breakout</span>
                <span className={styles["mode-card-sub"]}>jeu mrigel 🔥</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* WOODOKU */}
            <button id="btn-game-woodoku" className={`${styles["mode-card"]} ${styles["game-woodoku"]}`} onClick={() => router.push("/woodoku")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🪵</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Woodoku</span>
                <span className={styles["mode-card-sub"]}>jeu t relaxer chwiya bih</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* BUBBLE WRAP */}
            <button id="btn-game-bubble" className={`${styles["mode-card"]} ${styles["game-bubble"]}`} onClick={() => router.push("/bubble-wrap")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🫧</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Bubble Wrap</span>
                <span className={styles["mode-card-sub"]}>el ra7aaaa w tagla3 stresse</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* WATER SORT */}
            <button id="btn-game-watersort" className={`${styles["mode-card"]} ${styles["game-watersort"]}`} onClick={() => goToStep(8)}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🧪</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Water Sort</span>
                <span className={styles["mode-card-sub"]}>jeu prefere ta3i heda</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* DINO RUNNER */}
            <button id="btn-game-dino" className={`${styles["mode-card"]} ${styles["game-dino"]}`} onClick={() => router.push("/dino")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🦖</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Dino Runner</span>
                <span className={styles["mode-card-sub"]}>jeu te3 bekri li bla internet</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* COLORIAGE */}
            <button id="btn-game-coloriage" className={`${styles["mode-card"]} ${styles["game-coloriage"]}`} onClick={() => router.push("/coloriage")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🎨</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Coloriage</span>
                <span className={styles["mode-card-sub"]}>ida rak baghi tlawen</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* HANGMAN */}
            <button id="btn-game-hangman" className={`${styles["mode-card"]} ${styles["game-hangman"]}`} onClick={() => router.push("/hangman")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>🎯</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Hangman</span>
                <span className={styles["mode-card-sub"]}>jeu te3 tsalak bnadem</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* FOOTBALL */}
            <button id="btn-game-football" className={`${styles["mode-card"]} ${styles["game-football"]}`} onClick={() => router.push("/football")}>
              <div className={styles["game-card-icon"]}><span style={{ fontSize: "1.7rem" }}>⚽</span></div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>Football</span>
                <span className={styles["mode-card-sub"]}>te33 bolla</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

          </div>
        </div>
      )}

      {/* ====== STEP 2 ====== */}
      {step === 2 && (
        <div className={`${styles.step} ${!visible ? styles.stepOut : styles.stepIn}`} key="step2">
          <div className={styles["step2-card"]}>
            <p className={styles["step2-text"]}>bsh m3a amine baynaa beli takhsser</p>
          </div>
          <button id="btn-la-narbeh" className={`${styles["btn-wow"]} ${styles["btn-pink"]}`} onClick={() => goToStep(4)}>
            la narbeh ana
          </button>
        </div>
      )}

      {/* ====== STEP 4 — XOXO MODE SELECTION ====== */}
      {step === 4 && (
        <div className={`${styles.step} ${!visible ? styles.stepOut : styles.stepIn}`} key="step4">
          <h2 className={styles["mode-title"]}>khtar kifech tal3aab</h2>
          <div className={styles["mode-cards"]}>
            <button id="btn-vs-machine" className={`${styles["mode-card"]} ${styles.machine}`} onClick={() => goToGame("/jeu?mode=vs-machine")}>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>tssayi zahrek m3eya w narabhek beynaa a d3if</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
            <button id="btn-vs-ami" className={`${styles["mode-card"]} ${styles.friend}`} onClick={() => goToGame("/jeu?mode=vs-ami")}>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>nal33eb m3a sahbi</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
          </div>
          <button className={styles["btn-back-step"]} onClick={() => goToStep(1)} id="btn-change-game">← baghi nbadel jeu</button>
        </div>
      )}

      {/* ====== STEP 5 — DAMA MODE SELECTION ====== */}
      {step === 5 && (
        <div className={`${styles.step} ${!visible ? styles.stepOut : styles.stepIn}`} key="step5">
          <h2 className={styles["mode-title"]}>khtar kifech tal3aab Dama</h2>
          <div className={styles["mode-cards"]}>
            <button id="btn-dama-vs-amine" className={`${styles["mode-card"]} ${styles.machine}`} onClick={() => router.push("/dama?mode=vs-machine")}>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>tal3eeb contre amine bassah machakitch tarba7</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
            <button id="btn-dama-vs-ami" className={`${styles["mode-card"]} ${styles.friend}`} onClick={() => router.push("/dama?mode=vs-ami")}>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>tal3eb m3a sahbek</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
          </div>
          <button className={styles["btn-back-step"]} onClick={() => goToStep(1)} id="btn-change-game-dama">← baghi nbadel jeu</button>
        </div>
      )}

      {/* ====== STEP 6 — CHESS MODE SELECTION ====== */}
      {step === 6 && (
        <div className={`${styles.step} ${!visible ? styles.stepOut : styles.stepIn}`} key="step6">
          <h2 className={styles["mode-title"]}>khtar kifech tal3aab Chess</h2>
          <div className={styles["mode-cards"]}>
            <button id="btn-chess-vs-amine" className={`${styles["mode-card"]} ${styles.machine}`} onClick={() => router.push("/chess?mode=vs-machine")}>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>tal3eeb contre amine bassah machakitch tarba7</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
            <button id="btn-chess-vs-ami" className={`${styles["mode-card"]} ${styles.friend}`} onClick={() => router.push("/chess?mode=vs-ami")}>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>tal3eb m3a sahbek</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
          </div>
          <button className={styles["btn-back-step"]} onClick={() => goToStep(1)} id="btn-change-game-chess">← baghi nbadel jeu</button>
        </div>
      )}

      {/* ====== STEP 7 — PONG MODE SELECTION ====== */}
      {step === 7 && (
        <div className={`${styles.step} ${!visible ? styles.stepOut : styles.stepIn}`} key="step7">
          <h2 className={styles["mode-title"]}>khtar kifech tal3aab Pong</h2>
          <div className={styles["mode-cards"]}>
            <button id="btn-pong-vs-amine" className={`${styles["mode-card"]} ${styles.machine}`} onClick={() => router.push("/pong?mode=vs-machine")}>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>tal3eb contre amine ida 9adit 😈</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
            <button id="btn-pong-vs-ami" className={`${styles["mode-card"]} ${styles.friend}`} onClick={() => router.push("/pong?mode=vs-ami")}>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>tal3ab contre sahbek</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
          </div>
          <button className={styles["btn-back-step"]} onClick={() => goToStep(1)} id="btn-change-game-pong">← baghi nbadel jeu</button>
        </div>
      )}

      {/* ====== STEP 8 — WATER SORT DIFFICULTY SELECTION ====== */}
      {step === 8 && (
        <div className={`${styles.step} ${!visible ? styles.stepOut : styles.stepIn}`} key="step8">
          <h2 className={styles["mode-title"]}>khtar le niveau</h2>
          <div className={styles["mode-cards"]}>
            {/* 1. Super facile */}
            <button
              id="btn-watersort-easy"
              className={`${styles["mode-card"]} ${styles.friend}`}
              onClick={() => router.push("/water-sort?diff=facile")}
            >
              <div className={styles["game-card-icon"]}>
                <span style={{ fontSize: "1.6rem" }}>🌱</span>
              </div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>niveau sahel aaa d3iff</span>
                <span className={styles["mode-card-sub"]}>6 tubes — super sahel w trelakser</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* 2. Moyen */}
            <button
              id="btn-watersort-medium"
              className={`${styles["mode-card"]} ${styles.friend}`}
              onClick={() => router.push("/water-sort?diff=moyen")}
            >
              <div className={styles["game-card-icon"]}>
                <span style={{ fontSize: "1.6rem" }}>🟡</span>
              </div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>niveau moyen chwiya</span>
                <span className={styles["mode-card-sub"]}>8 tubes — mrigel w trelakser</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>

            {/* 3. Difficile */}
            <button
              id="btn-watersort-hard"
              className={`${styles["mode-card"]} ${styles.machine}`}
              onClick={() => router.push("/water-sort?diff=difficile")}
            >
              <div className={styles["game-card-icon"]}>
                <span style={{ fontSize: "1.6rem" }}>🔥</span>
              </div>
              <div className={styles["mode-card-content"]}>
                <span className={styles["mode-card-title"]}>niveau dificille w salek rohek</span>
                <span className={styles["mode-card-sub"]}>11 tubes — pour les vrais pros</span>
              </div>
              <span className={styles["mode-card-arrow"]}>→</span>
            </button>
          </div>
          <button
            className={styles["btn-back-step"]}
            onClick={() => goToStep(1)}
            id="btn-change-game-watersort"
          >
            ← baghi nbadel jeu
          </button>
        </div>
      )}

    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="page-wrapper" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <div style={{ fontSize: "3rem" }}>⏳</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
