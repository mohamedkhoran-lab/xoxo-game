"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./breakout.module.css";

// ========================
// Audio helper using Web Audio API
// ========================
function playTone(freq: number, type: OscillatorType = "sine", duration = 80) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {}
}

// Confetti Component for Win
function Confetti() {
  const pieces = Array.from({ length: 45 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: ["#55efc4", "#00cec9", "#f9ca24", "#fd79a8", "#6c63ff", "#ff7675"][
      Math.floor(Math.random() * 6)
    ],
    delay: Math.random() * 2,
    size: 8 + Math.random() * 10,
    shape: Math.random() > 0.5 ? "50%" : "2px",
  }));

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "fixed",
            left: `${p.left}%`,
            top: "-10px",
            background: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
            animation: "confettiFall 3s ease-in forwards",
            animationDelay: `${p.delay}s`,
            pointerEvents: "none",
            zIndex: 999,
          }}
        />
      ))}
    </>
  );
}

// ========================
// Game Constants
// ========================
const W = 400;
const H = 480;
const PADDLE_W = 76;
const PADDLE_H = 12;
const BALL_R = 6;
const BRICK_ROWS = 5;
const BRICK_COLS = 7;
const BRICK_PAD = 6;
const BRICK_TOP = 46;
const BRICK_H = 16;
const BRICK_W = (W - 20 - BRICK_PAD * (BRICK_COLS - 1)) / BRICK_COLS;

const ROW_COLORS = [
  { color: "#ff7675", pts: 50 }, // Row 0
  { color: "#e17055", pts: 40 }, // Row 1
  { color: "#f9ca24", pts: 30 }, // Row 2
  { color: "#55efc4", pts: 20 }, // Row 3
  { color: "#00cec9", pts: 10 }, // Row 4
];

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  pts: number;
  alive: boolean;
}

function initBricks(): Brick[] {
  const bricks: Brick[] = [];
  const startX = 10;
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: startX + c * (BRICK_W + BRICK_PAD),
        y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        w: BRICK_W,
        h: BRICK_H,
        color: ROW_COLORS[r].color,
        pts: ROW_COLORS[r].pts,
        alive: true,
      });
    }
  }
  return bricks;
}

function BreakoutContent() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);

  // States
  const [gameState, setGameState] = useState<"ready" | "playing" | "paused" | "gameover" | "win">("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Physics refs
  const paddleX = useRef((W - PADDLE_W) / 2);
  const ballX = useRef(W / 2);
  const ballY = useRef(H - 60);
  const ballDx = useRef(3.5);
  const ballDy = useRef(-4);
  const bricksRef = useRef<Brick[]>(initBricks());
  const keysPressed = useRef<Record<string, boolean>>({});
  const scoreRef = useRef(0);

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("breakout-best");
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {}
  }, []);

  const updateHighScore = useCallback((s: number) => {
    setHighScore((prev) => {
      if (s > prev) {
        setIsNewRecord(true);
        try {
          localStorage.setItem("breakout-best", String(s));
        } catch {}
        return s;
      }
      return prev;
    });
  }, []);

  // Reset ball position onto paddle
  const resetBall = () => {
    ballX.current = paddleX.current + PADDLE_W / 2;
    ballY.current = H - 35;
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI; // slight tilt
    const speed = 6.2; // Hard & fast
    ballDx.current = speed * Math.sin(angle);
    ballDy.current = -speed * Math.cos(angle);
  };

  // Start / Restart game
  const startGame = () => {
    paddleX.current = (W - PADDLE_W) / 2;
    bricksRef.current = initBricks();
    scoreRef.current = 0;
    setScore(0);
    setIsNewRecord(false);
    resetBall();
    setGameState("playing");
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D", "q", "Q", " "].includes(e.key)) {
        if (e.key === " ") {
          e.preventDefault();
          setGameState((prev) => (prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev));
          return;
        }
        keysPressed.current[e.key.toLowerCase()] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Pointer / Touch drag controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (gameState !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const pointerX = (e.clientX - rect.left) * scaleX;
      paddleX.current = Math.max(0, Math.min(W - PADDLE_W, pointerX - PADDLE_W / 2));
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerMove);
    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerMove);
    };
  }, [gameState]);

  // Game Loop
  const loop = useCallback(() => {
    if (gameState !== "playing") return;

    // 1. Move Paddle with keyboard
    const speed = 7.0;
    const k = keysPressed.current;
    if (k["arrowleft"] || k["a"] || k["q"]) {
      paddleX.current = Math.max(0, paddleX.current - speed);
    }
    if (k["arrowright"] || k["d"]) {
      paddleX.current = Math.min(W - PADDLE_W, paddleX.current + speed);
    }

    // 2. Move Ball
    ballX.current += ballDx.current;
    ballY.current += ballDy.current;

    // 3. Wall Collisions
    // Left & Right
    if (ballX.current - BALL_R <= 0) {
      ballX.current = BALL_R;
      ballDx.current = Math.abs(ballDx.current);
      playTone(320, "sine", 50);
    } else if (ballX.current + BALL_R >= W) {
      ballX.current = W - BALL_R;
      ballDx.current = -Math.abs(ballDx.current);
      playTone(320, "sine", 50);
    }

    // Top
    if (ballY.current - BALL_R <= 0) {
      ballY.current = BALL_R;
      ballDy.current = Math.abs(ballDy.current);
      playTone(360, "sine", 50);
    }

    // Bottom — Ball falls -> Instant Elimination
    if (ballY.current + BALL_R >= H) {
      playTone(160, "sawtooth", 250);
      setGameState("gameover");
      updateHighScore(scoreRef.current);
      return;
    }

    // 4. Paddle Collision
    const paddleY = H - 24;
    if (
      ballY.current + BALL_R >= paddleY &&
      ballY.current - BALL_R <= paddleY + PADDLE_H &&
      ballX.current >= paddleX.current - BALL_R &&
      ballX.current <= paddleX.current + PADDLE_W + BALL_R &&
      ballDy.current > 0
    ) {
      ballY.current = paddleY - BALL_R;
      // Hit angle calculation
      const hitOffset = (ballX.current - (paddleX.current + PADDLE_W / 2)) / (PADDLE_W / 2);
      const curSpeed = Math.min(9.0, Math.hypot(ballDx.current, ballDy.current) * 1.02);
      const maxAngle = Math.PI * 0.38; // ~68°
      const angle = hitOffset * maxAngle;

      ballDx.current = curSpeed * Math.sin(angle);
      ballDy.current = -curSpeed * Math.cos(angle);
      playTone(450, "triangle", 70);
    }

    // 5. Bricks Collision
    let allCleared = true;
    const bricks = bricksRef.current;
    for (const b of bricks) {
      if (!b.alive) continue;
      allCleared = false;

      // Axis-aligned bounding box collision
      if (
        ballX.current + BALL_R >= b.x &&
        ballX.current - BALL_R <= b.x + b.w &&
        ballY.current + BALL_R >= b.y &&
        ballY.current - BALL_R <= b.y + b.h
      ) {
        b.alive = false;
        scoreRef.current += b.pts;
        setScore(scoreRef.current);
        updateHighScore(scoreRef.current);
        playTone(300 + b.pts * 8, "square", 65);

        // Determine bounce axis based on smallest overlap
        const prevX = ballX.current - ballDx.current;
        const prevY = ballY.current - ballDy.current;

        if (prevX + BALL_R <= b.x || prevX - BALL_R >= b.x + b.w) {
          ballDx.current = -ballDx.current;
        } else {
          ballDy.current = -ballDy.current;
        }
        break; // break one brick per frame
      }
    }

    // Check Win
    if (allCleared) {
      playTone(700, "sine", 300);
      setGameState("win");
      updateHighScore(scoreRef.current);
      return;
    }

    // 6. Draw Routine
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear background
        ctx.fillStyle = "#0a1628";
        ctx.fillRect(0, 0, W, H);

        // Subtle background grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        for (let y = 0; y < H; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        // Draw Bricks
        for (const b of bricks) {
          if (!b.alive) continue;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 4);
          ctx.fill();

          // Brick top shine
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
          ctx.beginPath();
          ctx.roundRect(b.x + 2, b.y + 1, b.w - 4, 3, 2);
          ctx.fill();
        }

        // Draw Paddle
        ctx.shadowColor = "#55efc4";
        ctx.shadowBlur = 14;
        const grad = ctx.createLinearGradient(paddleX.current, 0, paddleX.current + PADDLE_W, 0);
        grad.addColorStop(0, "#55efc4");
        grad.addColorStop(1, "#00cec9");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(paddleX.current, paddleY, PADDLE_W, PADDLE_H, 6);
        ctx.fill();

        // Draw Ball
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ballX.current, ballY.current, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    animRef.current = requestAnimationFrame(loop);
  }, [gameState, updateHighScore]);

  useEffect(() => {
    if (gameState === "playing") {
      animRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, loop]);

  // Initial draw when ready or paused
  useEffect(() => {
    if (gameState !== "ready" && gameState !== "paused") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, W, H);

    // Draw Bricks
    for (const b of bricksRef.current) {
      if (!b.alive) continue;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Paddle
    const paddleY = H - 24;
    ctx.fillStyle = "#55efc4";
    ctx.beginPath();
    ctx.roundRect(paddleX.current, paddleY, PADDLE_W, PADDLE_H, 6);
    ctx.fill();

    // Ball
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ballX.current, ballY.current, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }, [gameState]);

  return (
    <main className={styles["breakout-page"]}>
      {gameState === "win" && <Confetti />}

      {/* Header */}
      <div className={styles["breakout-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => {
            cancelAnimationFrame(animRef.current);
            router.push("/?select=1");
          }}
          id="btn-breakout-back"
        >
          ← Rja3
        </button>
        <div className={styles["breakout-logo"]}>
          <span className="gradient-text">🧱 Breakout</span>
        </div>
        <div className={styles["badge-breakout"]}>Jeu Mrigel 🔥</div>
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
        <span className={styles["score-divider"]}>·</span>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>Mode</span>
          <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#ff7675" }}>⚡ 1 Seule Chance</span>
        </div>
      </div>

      {/* Canvas Arena */}
      <div className={styles["canvas-wrapper"]}>
        <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />

        {/* Ready Overlay */}
        {gameState === "ready" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>🧱</div>
            <h2 className={styles["overlay-title"]}>Breakout — Jeu Mrigel</h2>
            <p className={styles["overlay-score"]}>
              Harass ga3 les briques w ma tkhallich la balle tahbet !
            </p>
            <button id="btn-breakout-start" className="btn-primary" onClick={startGame}>
              ▶ Bda Tel3eb
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>💥</div>
            <h2 className={styles["overlay-title"]}>Khsert ! Eliminé !</h2>
            <p className={styles["overlay-score"]}>
              Score final : <strong>{score}</strong>
            </p>
            {isNewRecord && (
              <span style={{ color: "#f9ca24", fontWeight: 800 }}>🏆 Nouveau Record !</span>
            )}
            <button id="btn-breakout-retry" className="btn-primary" onClick={startGame}>
              🔄 Rejouer
            </button>
          </div>
        )}

        {/* Victory Overlay */}
        {gameState === "win" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3.2rem" }}>🎉</div>
            <h2 className={styles["overlay-title"]}>Bravo Rba7t ! 🏆</h2>
            <p className={styles["overlay-score"]}>
              Harasst ga3 les briques ! Score : <strong>{score}</strong>
            </p>
            <button id="btn-breakout-win-retry" className="btn-primary" onClick={startGame}>
              🔄 Rejouer
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === "paused" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "2.8rem" }}>⏸️</div>
            <h2 className={styles["overlay-title"]}>En Pause</h2>
            <button
              id="btn-breakout-resume"
              className="btn-primary"
              onClick={() => setGameState("playing")}
            >
              ▶ Reprendre
            </button>
          </div>
        )}
      </div>

      <p className={styles.hint}>
        Touches <strong>← / →</strong> ou <strong>A / D</strong> (ou glisse ton doigt / souris pour déplacer la palette)
      </p>

      {/* Action buttons */}
      <div className={styles["breakout-actions"]}>
        <button
          id="btn-breakout-restart"
          className={`${styles["action-btn"]} ${styles["btn-play"]}`}
          onClick={startGame}
        >
          🔄 Nouvelle Partie
        </button>
        <button
          id="btn-breakout-menu"
          className="btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => {
            cancelAnimationFrame(animRef.current);
            router.push("/?select=1");
          }}
        >
          🏠 Changer de jeu
        </button>
      </div>
    </main>
  );
}

export default function BreakoutPage() {
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
      <BreakoutContent />
    </Suspense>
  );
}
