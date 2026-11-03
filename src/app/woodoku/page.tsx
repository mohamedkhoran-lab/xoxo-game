"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./woodoku.module.css";

// Web Audio sound synthesizer
function playWoodSound(type: "place" | "clear" | "gameover" | "select") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "select") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "place") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "clear") {
      // Ascending sweet chord
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.05);
        osc.stop(ctx.currentTime + idx * 0.05 + 0.22);
      });
    } else if (type === "gameover") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

// Available piece shapes (matrices of 0 and 1)
const PIECE_SHAPES: number[][][] = [
  // 1-cell
  [[1]],
  // 2-cell
  [[1, 1]],
  [[1], [1]],
  // 3-cell lines
  [[1, 1, 1]],
  [[1], [1], [1]],
  // 4-cell lines
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  // 2x2 Square
  [
    [1, 1],
    [1, 1],
  ],
  // 3x3 Square
  [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  // Corner 2x2
  [
    [1, 1],
    [1, 0],
  ],
  [
    [1, 1],
    [0, 1],
  ],
  [
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [1, 1],
  ],
  // L-Shapes 3x3
  [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 1],
  ],
  // T-Shapes
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [0, 1],
  ],
];

function getRandomPieces(): (number[][] | null)[] {
  const res: (number[][] | null)[] = [];
  for (let i = 0; i < 3; i++) {
    const pick = PIECE_SHAPES[Math.floor(Math.random() * PIECE_SHAPES.length)];
    res.push(pick);
  }
  return res;
}

function WoodokuContent() {
  const router = useRouter();

  // 9x9 board state: 0 = empty, 1 = filled
  const [board, setBoard] = useState<number[][]>(() =>
    Array(9).fill(0).map(() => Array(9).fill(0))
  );

  const [trayPieces, setTrayPieces] = useState<(number[][] | null)[]>(() => getRandomPieces());
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ r: number; c: number } | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [comboMessage, setComboMessage] = useState<string | null>(null);

  // Load High Score
  useEffect(() => {
    try {
      const s = localStorage.getItem("woodoku-best");
      if (s) setHighScore(parseInt(s, 10));
    } catch {}
  }, []);

  const saveHigh = useCallback((s: number) => {
    setHighScore((prev) => {
      if (s > prev) {
        try {
          localStorage.setItem("woodoku-best", String(s));
        } catch {}
        return s;
      }
      return prev;
    });
  }, []);

  // Check if a piece can fit at position (r, c)
  const canPlace = useCallback(
    (grid: number[][], piece: number[][], r: number, c: number): boolean => {
      const pRows = piece.length;
      const pCols = piece[0].length;

      if (r + pRows > 9 || c + pCols > 9) return false;

      for (let pr = 0; pr < pRows; pr++) {
        for (let pc = 0; pc < pCols; pc++) {
          if (piece[pr][pc] === 1 && grid[r + pr][c + pc] === 1) {
            return false;
          }
        }
      }
      return true;
    },
    []
  );

  // Check if a piece can fit anywhere on the board
  const canFitAnywhere = useCallback(
    (grid: number[][], piece: number[][]): boolean => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (canPlace(grid, piece, r, c)) {
            return true;
          }
        }
      }
      return false;
    },
    [canPlace]
  );

  // Check game over
  const checkGameOver = useCallback(
    (grid: number[][], pieces: (number[][] | null)[]) => {
      const activePieces = pieces.filter((p): p is number[][] => p !== null);
      if (activePieces.length === 0) return false;

      for (const piece of activePieces) {
        if (canFitAnywhere(grid, piece)) {
          return false;
        }
      }
      return true;
    },
    [canFitAnywhere]
  );

  // Restart Game
  const restartGame = useCallback(() => {
    const newBoard = Array(9).fill(0).map(() => Array(9).fill(0));
    setBoard(newBoard);
    setTrayPieces(getRandomPieces());
    setSelectedPieceIndex(null);
    setHoverCoord(null);
    setScore(0);
    setIsGameOver(false);
    setClearingCells(new Set());
  }, []);

  // Place selected piece at (r, c)
  const placePiece = (r: number, c: number) => {
    if (selectedPieceIndex === null || isGameOver) return;
    const piece = trayPieces[selectedPieceIndex];
    if (!piece) return;

    if (!canPlace(board, piece, r, c)) {
      return;
    }

    playWoodSound("place");

    // Count blocks placed
    let placedCount = 0;
    const nextBoard = board.map((row) => [...row]);
    for (let pr = 0; pr < piece.length; pr++) {
      for (let pc = 0; pc < piece[0].length; pc++) {
        if (piece[pr][pc] === 1) {
          nextBoard[r + pr][c + pc] = 1;
          placedCount++;
        }
      }
    }

    // Check lines & 3x3 boxes to clear
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];
    const boxesToClear: { br: number; bc: number }[] = [];

    // Rows
    for (let row = 0; row < 9; row++) {
      if (nextBoard[row].every((v) => v === 1)) {
        rowsToClear.push(row);
      }
    }

    // Columns
    for (let col = 0; col < 9; col++) {
      let full = true;
      for (let row = 0; row < 9; row++) {
        if (nextBoard[row][col] !== 1) {
          full = false;
          break;
        }
      }
      if (full) colsToClear.push(col);
    }

    // 3x3 Boxes
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        let full = true;
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            if (nextBoard[br * 3 + dr][bc * 3 + dc] !== 1) {
              full = false;
              break;
            }
          }
          if (!full) break;
        }
        if (full) boxesToClear.push({ br, bc });
      }
    }

    const cellsCleared = new Set<string>();

    rowsToClear.forEach((row) => {
      for (let col = 0; col < 9; col++) cellsCleared.add(`${row},${col}`);
    });
    colsToClear.forEach((col) => {
      for (let row = 0; row < 9; row++) cellsCleared.add(`${row},${col}`);
    });
    boxesToClear.forEach(({ br, bc }) => {
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          cellsCleared.add(`${br * 3 + dr},${bc * 3 + dc}`);
        }
      }
    });

    const totalLinesCleared = rowsToClear.length + colsToClear.length + boxesToClear.length;
    let earned = placedCount;

    if (totalLinesCleared > 0) {
      playWoodSound("clear");
      earned += totalLinesCleared * 25 * totalLinesCleared; // combo bonus
      setClearingCells(cellsCleared);

      setComboMessage("✨ nasta3ref bik hakek ! ✨");
      setTimeout(() => {
        setComboMessage(null);
      }, 1800);

      // Clear the cells on the board
      cellsCleared.forEach((key) => {
        const [cr, cc] = key.split(",").map(Number);
        nextBoard[cr][cc] = 0;
      });

      setTimeout(() => {
        setClearingCells(new Set());
      }, 300);
    }

    const newScore = score + earned;
    setScore(newScore);
    saveHigh(newScore);
    setBoard(nextBoard);

    // Consume piece
    const nextPieces = [...trayPieces];
    nextPieces[selectedPieceIndex] = null;
    setSelectedPieceIndex(null);
    setHoverCoord(null);

    // If tray is empty, refill with 3 new pieces
    let finalPieces = nextPieces;
    if (nextPieces.every((p) => p === null)) {
      finalPieces = getRandomPieces();
      setTrayPieces(finalPieces);
    } else {
      setTrayPieces(nextPieces);
    }

    // Check if remaining pieces can fit
    if (checkGameOver(nextBoard, finalPieces)) {
      playWoodSound("gameover");
      setIsGameOver(true);
    }
  };

  // Preview cells for hover / selection
  const previewCells = new Set<string>();
  if (selectedPieceIndex !== null && hoverCoord && !isGameOver) {
    const piece = trayPieces[selectedPieceIndex];
    if (piece && canPlace(board, piece, hoverCoord.r, hoverCoord.c)) {
      for (let pr = 0; pr < piece.length; pr++) {
        for (let pc = 0; pc < piece[0].length; pc++) {
          if (piece[pr][pc] === 1) {
            previewCells.add(`${hoverCoord.r + pr},${hoverCoord.c + pc}`);
          }
        }
      }
    }
  }

  return (
    <main className={styles["woodoku-page"]}>
      {/* Header */}
      <div className={styles["woodoku-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => router.push("/?select=1")}
          id="btn-woodoku-back"
        >
          ← Rja3
        </button>
        <div className={styles["woodoku-logo"]}>
          <span className="gradient-text">Woodoku 🪵</span>
        </div>
        <div className={styles["badge-woodoku"]}>Détente Zen</div>
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

      {/* Combo / Praise Banner */}
      {comboMessage && <div className={styles["combo-banner"]}>{comboMessage}</div>}

      {/* 9x9 Board */}
      <div className={styles["board-container"]}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isFilled = cell === 1;
            const isPreview = previewCells.has(`${r},${c}`);
            const isClearing = clearingCells.has(`${r},${c}`);

            // 3x3 alternate subgrid shading
            const br = Math.floor(r / 3);
            const bc = Math.floor(c / 3);
            const isAltZone = (br + bc) % 2 === 1;

            return (
              <div
                key={`${r}-${c}`}
                className={`
                  ${styles.cell}
                  ${isAltZone ? styles["cell-zone-alt"] : ""}
                  ${isFilled ? styles["cell-filled"] : ""}
                  ${isPreview ? styles["cell-preview-valid"] : ""}
                  ${isClearing ? styles["cell-clearing"] : ""}
                `}
                onMouseEnter={() => setHoverCoord({ r, c })}
                onClick={() => {
                  setHoverCoord({ r, c });
                  placePiece(r, c);
                }}
              />
            );
          })
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3rem" }}>🪵</div>
            <h2 className={styles["overlay-title"]}>nasta3ref bik hakek 👏</h2>
            <p className={styles["overlay-score"]}>
              Score final : <strong>{score}</strong>
            </p>
            <button
              id="btn-woodoku-retry"
              className={styles["btn-restart"]}
              onClick={restartGame}
            >
              🔄 Rejouer
            </button>
          </div>
        )}
      </div>

      <p className={styles.hint}>
        {selectedPieceIndex === null
          ? "1. Khtar forme ta7t 👇"
          : "2. 7otha fel blassa li rak baghiha fel grille 🎯"}
      </p>

      {/* Pieces Tray */}
      <div className={styles["pieces-tray"]}>
        {trayPieces.map((piece, idx) => {
          if (!piece) {
            return (
              <div key={idx} className={styles["piece-holder"]} style={{ opacity: 0.25 }} />
            );
          }

          const isSelected = selectedPieceIndex === idx;

          return (
            <div
              key={idx}
              className={`
                ${styles["piece-holder"]}
                ${isSelected ? styles["piece-selected"] : ""}
              `}
              onClick={() => {
                playWoodSound("select");
                setSelectedPieceIndex(isSelected ? null : idx);
              }}
            >
              <div
                className={styles["piece-grid"]}
                style={{
                  gridTemplateColumns: `repeat(${piece[0].length}, 1fr)`,
                }}
              >
                {piece.map((pRow, pr) =>
                  pRow.map((val, pc) => (
                    <div
                      key={`${pr}-${pc}`}
                      className={val === 1 ? styles["piece-block"] : styles["piece-block-empty"]}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          id="btn-woodoku-restart"
          className={styles["btn-restart"]}
          onClick={restartGame}
        >
          🔄 Nouvelle Partie
        </button>
        <button
          id="btn-woodoku-menu"
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

export default function WoodokuPage() {
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
      <WoodokuContent />
    </Suspense>
  );
}

