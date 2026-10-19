"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./pong.module.css";

// ========================
// Audio helper using Web Audio API
// ========================
function playSound(freq: number, type: OscillatorType = "sine", duration = 80) {
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

// ========================
// Constants
// ========================
const W = 420;
const H = 280;
const PADDLE_W = 10;
const PADDLE_H = 58;
const BALL_R = 7;
const WIN_SCORE = 5;

function PongContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "vs-ami" ? "vs-ami" : "vs-machine";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);

  // Game state
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [gameState, setGameState] = useState<"ready" | "playing" | "paused" | "gameover">("ready");
  const [winner, setWinner] = useState<string | null>(null);

  // Physics & coordinates in refs for 60fps rendering
  const p1Y = useRef((H - PADDLE_H) / 2);
  const p2Y = useRef((H - PADDLE_H) / 2);
  const ballX = useRef(W / 2);
  const ballY = useRef(H / 2);
  const ballDx = useRef(4.5);
  const ballDy = useRef(2.5);
  const keysPressed = useRef<Record<string, boolean>>({});

  const p1ScoreRef = useRef(0);
  const p2ScoreRef = useRef(0);

  const resetBall = (towardsPlayer = true) => {
    ballX.current = W / 2;
    ballY.current = H / 2;
    const speed = 4.5;
    const angle = (Math.random() * 0.8 - 0.4) * Math.PI; // between -36° and +36°
    const dir = towardsPlayer ? -1 : 1;
    ballDx.current = dir * speed * Math.cos(angle);
    ballDy.current = speed * Math.sin(angle);
  };

  const startGame = () => {
    p1Y.current = (H - PADDLE_H) / 2;
    p2Y.current = (H - PADDLE_H) / 2;
    p1ScoreRef.current = 0;
    p2ScoreRef.current = 0;
    setP1Score(0);
    setP2Score(0);
    setWinner(null);
    resetBall(Math.random() > 0.5);
    setGameState("playing");
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "w", "W", "s", "S", "z", "Z", " "].includes(e.key)) {
        if (e.key === " ") {
          e.preventDefault();
          setGameState(prev => (prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev));
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

  // Mouse & Touch controls on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (gameState !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const scaleX = W / rect.width;
      const pointerX = (e.clientX - rect.left) * scaleX;
      const pointerY = (e.clientY - rect.top) * scaleY;

      if (mode === "vs-machine") {
        // Player controls left paddle
        p1Y.current = Math.max(0, Math.min(H - PADDLE_H, pointerY - PADDLE_H / 2));
      } else {
        // 2 player touch on same screen: left half moves P1, right half moves P2
        if (pointerX < W / 2) {
          p1Y.current = Math.max(0, Math.min(H - PADDLE_H, pointerY - PADDLE_H / 2));
        } else {
          p2Y.current = Math.max(0, Math.min(H - PADDLE_H, pointerY - PADDLE_H / 2));
        }
      }
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerMove);
    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerMove);
    };
  }, [gameState, mode]);

  // Main Animation and Physics loop
  const loop = useCallback(() => {
    if (gameState !== "playing") {
      return;
    }

    // 1. Move Player 1 (W / S or Z / S or ArrowUp / ArrowDown in single player)
    const speed = 5.5;
    const k = keysPressed.current;
    if (k["w"] || k["z"] || (mode === "vs-machine" && k["arrowup"])) {
      p1Y.current = Math.max(0, p1Y.current - speed);
    }
    if (k["s"] || (mode === "vs-machine" && k["arrowdown"])) {
      p1Y.current = Math.min(H - PADDLE_H, p1Y.current + speed);
    }

    // 2. Move Player 2 (Friend OR Amine Unbeatable AI)
    if (mode === "vs-ami") {
      if (k["arrowup"]) {
        p2Y.current = Math.max(0, p2Y.current - speed);
      }
      if (k["arrowdown"]) {
        p2Y.current = Math.min(H - PADDLE_H, p2Y.current + speed);
      }
    } else {
      // AMINE UNBEATABLE AI: Perfect prediction & tracking
      // When ball is heading right, paddle locks onto ball with instant responsiveness
      if (ballDx.current > 0) {
        const targetY = ballY.current - PADDLE_H / 2;
        const aiDiff = targetY - p2Y.current;
        const aiSpeed = 7.5; // Very fast and flawless tracking
        if (Math.abs(aiDiff) > aiSpeed) {
          p2Y.current += Math.sign(aiDiff) * aiSpeed;
        } else {
          p2Y.current = targetY;
        }
      } else {
        // When ball goes left, center smoothly to wait for the return
        const centerY = (H - PADDLE_H) / 2;
        const diff = centerY - p2Y.current;
        p2Y.current += Math.sign(diff) * Math.min(Math.abs(diff), 2.5);
      }
      p2Y.current = Math.max(0, Math.min(H - PADDLE_H, p2Y.current));
    }

    // 3. Move Ball
    ballX.current += ballDx.current;
    ballY.current += ballDy.current;

    // Top and Bottom wall collision
    if (ballY.current - BALL_R <= 0) {
      ballY.current = BALL_R;
      ballDy.current = Math.abs(ballDy.current);
      playSound(350, "sine", 60);
    } else if (ballY.current + BALL_R >= H) {
      ballY.current = H - BALL_R;
      ballDy.current = -Math.abs(ballDy.current);
      playSound(350, "sine", 60);
    }

    // 4. Paddle Collisions
    // Left Paddle (Player 1)
    const p1X = 14;
    if (
      ballX.current - BALL_R <= p1X + PADDLE_W &&
      ballX.current + BALL_R >= p1X &&
      ballY.current >= p1Y.current - BALL_R &&
      ballY.current <= p1Y.current + PADDLE_H + BALL_R &&
      ballDx.current < 0
    ) {
      ballX.current = p1X + PADDLE_W + BALL_R;
      const offset = (ballY.current - (p1Y.current + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(8.5, Math.hypot(ballDx.current, ballDy.current) * 1.04);
      const maxAngle = Math.PI * 0.38; // ~68 degrees
      ballDx.current = speed * Math.cos(offset * maxAngle);
      ballDy.current = speed * Math.sin(offset * maxAngle);
      playSound(440, "triangle", 80);
    }

    // Right Paddle (Amine AI or Player 2)
    const p2X = W - 14 - PADDLE_W;
    if (
      ballX.current + BALL_R >= p2X &&
      ballX.current - BALL_R <= p2X + PADDLE_W &&
      ballY.current >= p2Y.current - BALL_R &&
      ballY.current <= p2Y.current + PADDLE_H + BALL_R &&
      ballDx.current > 0
    ) {
      ballX.current = p2X - BALL_R;
      const offset = (ballY.current - (p2Y.current + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(9.0, Math.hypot(ballDx.current, ballDy.current) * 1.04);
      const maxAngle = Math.PI * 0.38;
      ballDx.current = -speed * Math.cos(offset * maxAngle);
      ballDy.current = speed * Math.sin(offset * maxAngle);
      playSound(520, "triangle", 80);
    }

    // 5. Point Scored
    // Right side lost -> Player 1 scores
    if (ballX.current > W + BALL_R * 2) {
      playSound(650, "square", 180);
      p1ScoreRef.current += 1;
      setP1Score(p1ScoreRef.current);
      if (p1ScoreRef.current >= WIN_SCORE) {
        setWinner(mode === "vs-machine" ? "Toi (Miracle!)" : "Joueur 1");
        setGameState("gameover");
      } else {
        resetBall(false);
      }
    }

    // Left side lost -> Player 2 / Amine scores
    if (ballX.current < -BALL_R * 2) {
      playSound(180, "sawtooth", 240);
      p2ScoreRef.current += 1;
      setP2Score(p2ScoreRef.current);
      if (p2ScoreRef.current >= WIN_SCORE) {
        setWinner(mode === "vs-machine" ? "Amine 😈" : "Joueur 2");
        setGameState("gameover");
      } else {
        resetBall(true);
      }
    }

    // 6. Draw on Canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Background
        ctx.fillStyle = "#0d0d1a";
        ctx.fillRect(0, 0, W, H);

        // Middle dashed line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Center circle outline
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 36, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Player 1 Paddle (Purple/Cyan glow)
        ctx.shadowColor = "#6c63ff";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#6c63ff";
        ctx.beginPath();
        ctx.roundRect(14, p1Y.current, PADDLE_W, PADDLE_H, 4);
        ctx.fill();

        // Player 2 Paddle (Pink glow for Amine/Player 2)
        ctx.shadowColor = mode === "vs-machine" ? "#ff4757" : "#fd79a8";
        ctx.shadowBlur = 14;
        ctx.fillStyle = mode === "vs-machine" ? "#ff4757" : "#fd79a8";
        ctx.beginPath();
        ctx.roundRect(W - 14 - PADDLE_W, p2Y.current, PADDLE_W, PADDLE_H, 4);
        ctx.fill();

        // Ball
        ctx.shadowColor = "#00cec9";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ballX.current, ballY.current, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    animRef.current = requestAnimationFrame(loop);
  }, [gameState, mode]);

  useEffect(() => {
    if (gameState === "playing") {
      animRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, loop]);

  // Draw initial canvas frame when ready or paused
  useEffect(() => {
    if (gameState !== "ready" && gameState !== "paused") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0d0d1a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#6c63ff";
    ctx.beginPath();
    ctx.roundRect(14, p1Y.current, PADDLE_W, PADDLE_H, 4);
    ctx.fill();

    ctx.fillStyle = mode === "vs-machine" ? "#ff4757" : "#fd79a8";
    ctx.beginPath();
    ctx.roundRect(W - 14 - PADDLE_W, p2Y.current, PADDLE_W, PADDLE_H, 4);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ballX.current, ballY.current, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }, [gameState, mode]);

  return (
    <main className={styles["pong-page"]}>
      {/* Header */}
      <div className={styles["pong-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => {
            cancelAnimationFrame(animRef.current);
            router.push("/?select=1");
          }}
          id="btn-pong-back"
        >
          ← Rja3
        </button>
        <div className={styles["pong-logo"]}>
          <span className="gradient-text">🏓 Pong</span>
        </div>
        <div className={styles["badge-pong"]}>
          {mode === "vs-machine" ? "Amine (Imbattable)" : "2 Joueurs"}
        </div>
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>
            {mode === "vs-machine" ? "Toi" : "Joueur 1"}
          </span>
          <span className={`${styles["score-value"]} ${styles["left-score"]}`}>{p1Score}</span>
        </div>
        <span className={styles["score-divider"]}>:</span>
        <div className={styles["score-item"]}>
          <span className={styles["score-label"]}>
            {mode === "vs-machine" ? "Amine 😈" : "Joueur 2"}
          </span>
          <span className={`${styles["score-value"]} ${styles["right-score"]}`}>{p2Score}</span>
        </div>
      </div>

      {/* Canvas Arena */}
      <div className={styles["canvas-wrapper"]}>
        <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />

        {/* Ready overlay */}
        {gameState === "ready" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>🏓</div>
            <h2 className={styles["overlay-title"]}>
              {mode === "vs-machine" ? "Pong vs Amine" : "Pong 2 Joueurs"}
            </h2>
            <p className={styles["overlay-sub"]}>
              {mode === "vs-machine"
                ? "Tsayi zahrek m3a Amine ? 5 points pour gagner !"
                : "5 points pour gagner ! Bda el match ?"}
            </p>
            <button id="btn-pong-start" className="btn-primary" onClick={startGame}>
              ▶ Bda Tel3eb
            </button>
          </div>
        )}

        {/* Game Over overlay */}
        {gameState === "gameover" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3.2rem" }}>{winner === "Amine 😈" ? "😈" : "🏆"}</div>
            <h2 className={styles["overlay-title"]}>
              {winner === "Amine 😈" ? "Amine Rba7ك ! 😈" : `${winner} Rba7 ! 🏆`}
            </h2>
            <p className={styles["overlay-sub"]}>
              {winner === "Amine 😈"
                ? "Goultlek bayna beli takhsser m3a Amine ! Imbattable 😉"
                : "Bravo ! Match 9wiy !"}
            </p>
            <button id="btn-pong-retry" className="btn-primary" onClick={startGame}>
              🔄 Rejouer
            </button>
          </div>
        )}

        {/* Paused overlay */}
        {gameState === "paused" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "2.8rem" }}>⏸️</div>
            <h2 className={styles["overlay-title"]}>En Pause</h2>
            <button id="btn-pong-resume" className="btn-primary" onClick={() => setGameState("playing")}>
              ▶ Reprendre
            </button>
          </div>
        )}
      </div>

      {/* Controls Hint Box */}
      <div className={styles["controls-hint"]}>
        <div className={styles["hint-title"]}>🎮 Contrôles</div>
        <div className={styles["hint-row"]}>
          {mode === "vs-machine" ? (
            <span className={styles["hint-left"]}>
              Clavier: <strong>W / S</strong> ou <strong>↑ / ↓</strong> (ou glisse ton doigt / souris sur l&apos;écran)
            </span>
          ) : (
            <>
              <span className={styles["hint-left"]}>
                P1: <strong>W / S</strong>
              </span>
              <span className={styles["hint-right"]}>
                P2: <strong>↑ / ↓</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles["pong-actions"]}>
        <div className={styles["action-row"]}>
          <button
            id="btn-pong-restart"
            className={`${styles["action-btn"]} ${styles["btn-restart"]}`}
            onClick={startGame}
          >
            🔄 Nouvelle Partie
          </button>
          <button
            id="btn-pong-mode"
            className="btn-secondary"
            onClick={() => {
              cancelAnimationFrame(animRef.current);
              router.push("/?select=pong");
            }}
          >
            ⚙️ Mode
          </button>
        </div>
        <button
          id="btn-pong-menu"
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

export default function PongPage() {
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
      <PongContent />
    </Suspense>
  );
}
