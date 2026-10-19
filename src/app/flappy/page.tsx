"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./flappy.module.css";

// ========================
// Constants
// ========================
const W = 360, H = 540;
const BIRD_X = 80, BIRD_R = 18;
const GRAVITY = 0.45, FLAP_FORCE = -8;
const PIPE_W = 52, PIPE_GAP = 150, PIPE_SPEED = 2.8;
const PIPE_INTERVAL = 1600; // ms

interface Pipe { x: number; topH: number; scored: boolean; }

function FlappyContent() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastPipeTime = useRef(0);

  const birdY    = useRef(H / 2);
  const velY     = useRef(0);
  const pipes    = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<"ready" | "playing" | "gameover">("ready");

  const [displayState, setDisplayState] = useState<"ready" | "playing" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("flappy-best");
      if (s) setHighScore(parseInt(s));
    } catch {}
  }, []);

  const saveHigh = useCallback((s: number) => {
    setHighScore(prev => {
      if (s > prev) {
        setIsNew(true);
        try { localStorage.setItem("flappy-best", String(s)); } catch {}
        return s;
      }
      return prev;
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1a2a6c");
    sky.addColorStop(1, "#4a90d9");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Clouds (static decorations)
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    [[60,80,80,30],[200,50,100,25],[290,110,70,22]].forEach(([x,y,w,h]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground
    ctx.fillStyle = "#5a7a3a";
    ctx.fillRect(0, H - 40, W, 40);
    ctx.fillStyle = "#4a6a2a";
    ctx.fillRect(0, H - 40, W, 10);

    // Pipes
    pipes.current.forEach(pipe => {
      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 8;
      // Top pipe
      const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
      topGrad.addColorStop(0, "#2ecc71");
      topGrad.addColorStop(1, "#27ae60");
      ctx.fillStyle = topGrad;
      ctx.fillRect(pipe.x, 0, PIPE_W, pipe.topH);
      // Top cap
      ctx.fillRect(pipe.x - 4, pipe.topH - 20, PIPE_W + 8, 20);
      // Bottom pipe
      const botY = pipe.topH + PIPE_GAP;
      ctx.fillRect(pipe.x, botY, PIPE_W, H - botY);
      // Bottom cap
      ctx.fillRect(pipe.x - 4, botY, PIPE_W + 8, 20);
      ctx.shadowBlur = 0;
    });

    // Bird
    const by = birdY.current;
    const angle = Math.max(-0.5, Math.min(1.2, velY.current * 0.06));
    ctx.save();
    ctx.translate(BIRD_X, by);
    ctx.rotate(angle);
    // Body
    ctx.shadowColor = "#fdcb6e";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#fdcb6e";
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_R, BIRD_R - 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wing
    ctx.fillStyle = "#f0932b";
    ctx.beginPath();
    ctx.ellipse(-6, 3, 10, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(8, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.fillStyle = "#e17055";
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(22, -3);
    ctx.lineTo(22, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Score overlay
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.roundRect(W/2 - 40, 16, 80, 38, 20);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(scoreRef.current), W / 2, 42);
  }, []);

  const tick = useCallback((timestamp: number) => {
    if (gameStateRef.current !== "playing") return;

    // Physics
    velY.current += GRAVITY;
    birdY.current += velY.current;

    // Pipes
    if (timestamp - lastPipeTime.current > PIPE_INTERVAL) {
      const topH = 60 + Math.random() * (H - PIPE_GAP - 100 - 40);
      pipes.current.push({ x: W + 10, topH, scored: false });
      lastPipeTime.current = timestamp;
    }

    pipes.current.forEach(pipe => { pipe.x -= PIPE_SPEED; });
    pipes.current = pipes.current.filter(p => p.x > -PIPE_W - 10);

    // Scoring
    pipes.current.forEach(pipe => {
      if (!pipe.scored && pipe.x + PIPE_W < BIRD_X) {
        pipe.scored = true;
        scoreRef.current++;
        setScore(scoreRef.current);
      }
    });

    // Collision — ground / ceiling
    if (birdY.current > H - 40 - BIRD_R || birdY.current < BIRD_R) {
      gameStateRef.current = "gameover";
      setDisplayState("gameover");
      saveHigh(scoreRef.current);
      draw();
      return;
    }

    // Collision — pipes
    for (const pipe of pipes.current) {
      const inX = BIRD_X + BIRD_R - 4 > pipe.x && BIRD_X - BIRD_R + 4 < pipe.x + PIPE_W;
      const inY = birdY.current - BIRD_R + 4 < pipe.topH || birdY.current + BIRD_R - 4 > pipe.topH + PIPE_GAP;
      if (inX && inY) {
        gameStateRef.current = "gameover";
        setDisplayState("gameover");
        saveHigh(scoreRef.current);
        draw();
        return;
      }
    }

    draw();
    animRef.current = requestAnimationFrame(tick);
  }, [draw, saveHigh]);

  const flap = useCallback(() => {
    if (gameStateRef.current === "ready") {
      gameStateRef.current = "playing";
      setDisplayState("playing");
      lastPipeTime.current = performance.now();
    }
    if (gameStateRef.current === "playing") {
      velY.current = FLAP_FORCE;
    }
  }, []);

  const startGame = useCallback(() => {
    birdY.current = H / 2;
    velY.current = 0;
    pipes.current = [];
    scoreRef.current = 0;
    setScore(0);
    setIsNew(false);
    gameStateRef.current = "ready";
    setDisplayState("ready");
    lastPipeTime.current = 0;
    cancelAnimationFrame(animRef.current);
    draw();
  }, [draw]);

  // Start loop when playing
  useEffect(() => {
    if (displayState === "playing") {
      animRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [displayState, tick]);

  // Initial draw
  useEffect(() => { draw(); }, [draw]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        if (displayState === "gameover") startGame();
        else flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap, startGame, displayState]);

  return (
    <main className={styles["flappy-page"]}>
      {/* Header */}
      <div className={styles["flappy-header"]}>
        <button className={`${styles["back-link"]} btn-ghost`} onClick={() => { cancelAnimationFrame(animRef.current); router.push("/?select=1"); }} id="btn-flappy-back">
          ← Rja3
        </button>
        <div className={styles["flappy-logo"]}>
          <span className="gradient-text">Flappy 🐦</span>
        </div>
        <div className={styles["badge-flappy"]}>Nostalgie</div>
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
          <span className={`${styles["score-value"]} ${styles.best}`}>{highScore}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className={styles["canvas-wrapper"]} onClick={() => displayState === "gameover" ? startGame() : flap()}>
        <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />
        {displayState === "ready" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>🐦</div>
            <h2 className={styles["overlay-title"]}>Flappy Bird</h2>
            <p className={styles["overlay-score"]}>Clique ou Espace pour voler !</p>
            <button id="btn-flappy-start" className="btn-primary" onClick={flap}>▶ Bda Tel3eb</button>
          </div>
        )}
        {displayState === "gameover" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>💥</div>
            <h2 className={styles["overlay-title"]}>Game Over !</h2>
            <p className={styles["overlay-score"]}>Score : <strong>{score}</strong></p>
            {isNew && <span style={{ color:"#fdcb6e", fontWeight:800 }}>🏆 Nouveau Record !</span>}
            <button id="btn-flappy-retry" className="btn-primary" onClick={startGame}>🔄 Rejouer</button>
          </div>
        )}
      </div>

      <p className={styles.hint}>cliquer wela espace bech tna9az</p>

      {/* Actions */}
      <div className={styles["flappy-actions"]}>
        <button id="btn-flappy-restart" className={`${styles["action-btn"]} ${styles["btn-flap"]}`} onClick={startGame}>
          🔄 Nouvelle Partie
        </button>
        <button id="btn-flappy-menu" className="btn-secondary" style={{ width:"100%", justifyContent:"center" }} onClick={() => { cancelAnimationFrame(animRef.current); router.push("/?select=1"); }}>
          🏠 Changer de jeu
        </button>
      </div>
    </main>
  );
}

export default function FlappyPage() {
  return (
    <Suspense fallback={
      <div className="page-wrapper" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <div style={{ fontSize:"3rem" }}>⏳</div>
      </div>
    }>
      <FlappyContent />
    </Suspense>
  );
}
