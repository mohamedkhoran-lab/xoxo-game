"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./snake.module.css";

// ========================
// Types & Constants
// ========================
interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 20; // 20x20 cells
const CANVAS_SIZE = 400; // 400x400 px (20px per cell)
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const TICK_SPEED = 110; // ms per tick

const DIRS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

function generateFood(snake: Point[]): Point {
  let food: Point;
  while (true) {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    const onSnake = snake.some((s) => s.x === food.x && s.y === food.y);
    if (!onSnake) break;
  }
  return food;
}

// ========================
// Confetti Component
// ========================
function Confetti() {
  const pieces = Array.from({ length: 45 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: ["#00cec9", "#6c63ff", "#fd79a8", "#f9ca24", "#55efc4", "#ff7675"][
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
            animation: `confettiFall 3s ease-in forwards`,
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
// Snake Game Content
// ========================
function SnakeContent() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<"ready" | "playing" | "paused" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Mutable game state refs for smooth 60fps / interval
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const dirRef = useRef<Point>(DIRS.RIGHT);
  const nextDirRef = useRef<Point>(DIRS.RIGHT);
  const foodRef = useRef<Point>({ x: 15, y: 10 });

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("snake-high-score");
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {}
  }, []);

  // Save High Score
  const updateHighScore = useCallback((newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      setIsNewRecord(true);
      try {
        localStorage.setItem("snake-high-score", newScore.toString());
      } catch {}
    }
  }, [highScore]);

  // Handle direction input
  const changeDirection = useCallback((newDir: Point) => {
    const current = dirRef.current;
    // Prevent 180° instant reverse
    if (newDir.x !== -current.x && newDir.y !== -current.y) {
      nextDirRef.current = newDir;
    }
  }, []);

  // Keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
        case "z":
        case "Z":
          e.preventDefault();
          changeDirection(DIRS.UP);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          changeDirection(DIRS.DOWN);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
        case "q":
        case "Q":
          e.preventDefault();
          changeDirection(DIRS.LEFT);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          changeDirection(DIRS.RIGHT);
          break;
        case " ":
          e.preventDefault();
          if (gameState === "playing") setGameState("paused");
          else if (gameState === "paused") setGameState("playing");
          else if (gameState === "ready" || gameState === "gameover") startGame();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection, gameState]);

  // Start / Restart Game
  const startGame = () => {
    const initSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    snakeRef.current = initSnake;
    dirRef.current = DIRS.RIGHT;
    nextDirRef.current = DIRS.RIGHT;
    foodRef.current = generateFood(initSnake);
    setScore(0);
    setIsNewRecord(false);
    setGameState("playing");
  };

  // Main Game Loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const interval = setInterval(() => {
      const snake = snakeRef.current;
      dirRef.current = nextDirRef.current;
      const dir = dirRef.current;

      const head = snake[0];
      const newHead: Point = { x: head.x + dir.x, y: head.y + dir.y };

      // 1) Wall Collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameState("gameover");
        updateHighScore(score);
        return;
      }

      // 2) Self Collision
      if (snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameState("gameover");
        updateHighScore(score);
        return;
      }

      // 3) Move snake
      const newSnake = [newHead, ...snake];

      // 4) Check food
      const food = foodRef.current;
      if (newHead.x === food.x && newHead.y === food.y) {
        const nextScore = score + 10;
        setScore(nextScore);
        updateHighScore(nextScore);
        foodRef.current = generateFood(newSnake);
      } else {
        newSnake.pop(); // Remove tail segment
      }

      snakeRef.current = newSnake;
      drawCanvas();
    }, TICK_SPEED);

    return () => clearInterval(interval);
  }, [gameState, score, updateHighScore]);

  // Canvas Drawing Routine
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#181628";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(108, 99, 255, 0.07)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw Food (Glowing Apple)
    const food = foodRef.current;
    const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
    const fr = CELL_SIZE / 2 - 2;

    ctx.save();
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();

    // Leaf
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(fx + 2, fy - fr + 1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Snake
    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      const sx = seg.x * CELL_SIZE;
      const sy = seg.y * CELL_SIZE;

      ctx.save();
      if (i === 0) {
        // Head: bright cyan with glow
        ctx.shadowColor = "#00cec9";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#00cec9";
        ctx.beginPath();
        ctx.roundRect(sx + 1, sy + 1, CELL_SIZE - 2, CELL_SIZE - 2, 6);
        ctx.fill();

        // Eyes on the head looking in current direction
        ctx.fillStyle = "#181628";
        const dir = dirRef.current;
        let eye1: [number, number], eye2: [number, number];

        if (dir.x === 1) {
          eye1 = [sx + 14, sy + 5];
          eye2 = [sx + 14, sy + 13];
        } else if (dir.x === -1) {
          eye1 = [sx + 4, sy + 5];
          eye2 = [sx + 4, sy + 13];
        } else if (dir.y === -1) {
          eye1 = [sx + 5, sy + 4];
          eye2 = [sx + 13, sy + 4];
        } else {
          eye1 = [sx + 5, sy + 14];
          eye2 = [sx + 13, sy + 14];
        }

        ctx.beginPath();
        ctx.arc(eye1[0], eye1[1], 2, 0, Math.PI * 2);
        ctx.arc(eye2[0], eye2[1], 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body: Gradient from indigo to purple
        const ratio = i / snake.length;
        ctx.fillStyle = ratio < 0.5 ? "#6c63ff" : "#a29bfe";
        ctx.beginPath();
        ctx.roundRect(sx + 2, sy + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
        ctx.fill();
      }
      ctx.restore();
    });
  }, []);

  // Initial render of canvas
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, gameState]);

  return (
    <main className={styles["snake-page"]}>
      {isNewRecord && <Confetti />}

      {/* Header */}
      <div className={styles["snake-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => router.push("/?select=1")}
          id="btn-snake-back"
        >
          ← Rja3
        </button>
        <div className={styles["snake-logo"]}>
          <span className="gradient-text">Snake 🐍</span>
        </div>
        <div className={styles["badge-arcade"]}>
          <span>Retro Nostalgie</span>
        </div>
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
          <span className={`${styles["score-value"]} ${styles.high}`}>{highScore}</span>
        </div>
      </div>

      {/* Game Canvas Box */}
      <div className={styles["canvas-wrapper"]}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className={styles.canvas}
        />

        {/* Ready Overlay */}
        {gameState === "ready" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>🐍</div>
            <h2 className={styles["overlay-title"]}>Snake — Laf3aa</h2>
            <p className={styles["overlay-score"]}>Koul el teffah w ma tadrabch fel 7it !</p>
            <button
              id="btn-snake-start"
              className="btn-primary"
              onClick={startGame}
            >
              ▶ Bda Tel3eb
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>💥</div>
            <h2 className={styles["overlay-title"]}>Khsert ! (Game Over)</h2>
            <p className={styles["overlay-score"]}>
              Score final : <strong>{score}</strong>
            </p>
            {isNewRecord && (
              <span style={{ color: "#f9ca24", fontWeight: 800 }}>🏆 Nouveau Record !</span>
            )}
            <button
              id="btn-snake-retry"
              className="btn-primary"
              onClick={startGame}
            >
              🔄 Rejouer
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === "paused" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>⏸️</div>
            <h2 className={styles["overlay-title"]}>En Pause</h2>
            <button
              id="btn-snake-resume"
              className="btn-primary"
              onClick={() => setGameState("playing")}
            >
              ▶ Reprendre
            </button>
          </div>
        )}
      </div>

      {/* On-Screen D-Pad Controls (4 flèches directes comme demandé) */}
      <div className={styles["controls-wrapper"]} aria-label="Contrôles Snake">
        <button
          id="btn-dpad-up"
          className={styles["dpad-btn"]}
          onClick={() => changeDirection(DIRS.UP)}
          aria-label="Haut"
        >
          ▲
        </button>
        <div className={styles["dpad-row"]}>
          <button
            id="btn-dpad-left"
            className={styles["dpad-btn"]}
            onClick={() => changeDirection(DIRS.LEFT)}
            aria-label="Gauche"
          >
            ◄
          </button>
          <button
            id="btn-dpad-down"
            className={styles["dpad-btn"]}
            onClick={() => changeDirection(DIRS.DOWN)}
            aria-label="Bas"
          >
            ▼
          </button>
          <button
            id="btn-dpad-right"
            className={styles["dpad-btn"]}
            onClick={() => changeDirection(DIRS.RIGHT)}
            aria-label="Droite"
          >
            ►
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className={styles["snake-actions"]}>
        <div className={styles["action-row"]}>
          {gameState === "playing" && (
            <button
              id="btn-snake-pause"
              className={`${styles["action-btn"]} ${styles["btn-pause"]}`}
              onClick={() => setGameState("paused")}
            >
              ⏸️ Pause
            </button>
          )}
          {gameState === "paused" && (
            <button
              id="btn-snake-unpause"
              className={`${styles["action-btn"]} ${styles["btn-play"]}`}
              onClick={() => setGameState("playing")}
            >
              ▶ Reprendre
            </button>
          )}
          {(gameState === "playing" || gameState === "paused" || gameState === "gameover") && (
            <button
              id="btn-snake-restart"
              className={`${styles["action-btn"]} ${styles["btn-play"]}`}
              onClick={startGame}
            >
              🔄 Rejouer
            </button>
          )}
        </div>
        <button
          id="btn-menu-snake"
          className="btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => router.push("/?select=1")}
        >
          🏠 Commencer (Changer de jeu)
        </button>
      </div>
    </main>
  );
}

export default function SnakePage() {
  return (
    <Suspense
      fallback={
        <div
          className="page-wrapper"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <div style={{ fontSize: "3rem" }}>⏳</div>
        </div>
      }
    >
      <SnakeContent />
    </Suspense>
  );
}
