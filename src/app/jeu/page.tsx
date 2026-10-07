"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import {
  Board,
  Player,
  checkWinner,
  getWinningLine,
  isBoardFull,
  getBestMove,
} from "../lib/minimax";
import styles from "./game.module.css";

// ========================
// Darija expressions
// ========================
const HUMAN_TURN_TAUNTS = [
  "messkin",
  "rak khasser",
  "chhel samet",
  "eya hak hadi a d3ifff",
  "eya haa rohh",
  "oooooplaaa",
  "bghit nsa9sik chata3ref dir fi hyatek ?? jeu w takhser fih",
  "chhel koont tedi fel primaire hambok",
  "3endek zero IQ",
  "rasssek khawi ben3ami",
];

const MACHINE_WIN_TAUNTS = [
  "messskinnnnnn bki bki",
  "roh trgod rohh win bin anta",
  "madabik tasskout derwek",
  "wech gltek ? rak khasser",
  "machakitch kayen chance a d3if",
  "bghit nsa9sik chata3ref dir fi hyatek ?? jeu w takhser fih",
  "3endek zero IQ",
  "rasssek khawi ben3ami",
];

const DRAW_TAUNTS = [
  "a hah t3alamt tal3eb bsh machi heja",
  "nul berk matafrahch bezef",
];

const HUMAN_START_TAUNT = "eya a bdaa a d3ifff";

// ========================
// SVG Symbols — Bold and clear
// ========================
function XSymbol() {
  return (
    <svg className={styles["cell-svg"]} viewBox="0 0 100 100" aria-label="X">
      <line className={`${styles["x-line"]} ${styles["x-line-1"]}`} x1="20" y1="20" x2="80" y2="80" />
      <line className={`${styles["x-line"]} ${styles["x-line-2"]}`} x1="80" y1="20" x2="20" y2="80" />
    </svg>
  );
}

function OSymbol() {
  return (
    <svg className={styles["cell-svg"]} viewBox="0 0 100 100" aria-label="O">
      <circle className={styles["o-circle"]} cx="50" cy="50" r="30" />
    </svg>
  );
}

// ========================
// Confetti
// ========================
function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: ["#6c63ff", "#fd79a8", "#00cec9", "#f9ca24", "#a29bfe", "#ff6b6b"][
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
          className={styles["confetti-piece"]}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ========================
// Main Game Content
// ========================
function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "vs-machine";

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<Player>("X");
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [tauntMsg, setTauntMsg] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [scores, setScores] = useState({ wins: 0, losses: 0, draws: 0 });
  const [machineFirst, setMachineFirst] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Anti-repeat shuffle decks and history
  const lastTauntRef = useRef<string>("");
  const turnDeckRef = useRef<string[]>([]);
  const winDeckRef = useRef<string[]>([]);
  const drawDeckRef = useRef<string[]>([]);

  const getNextTaunt = useCallback((list: string[], deckRef: React.MutableRefObject<string[]>) => {
    if (deckRef.current.length === 0) {
      const deck = [...list];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      if (deck.length > 1 && deck[0] === lastTauntRef.current) {
        const swapIdx = Math.floor(Math.random() * (deck.length - 1)) + 1;
        [deck[0], deck[swapIdx]] = [deck[swapIdx], deck[0]];
      }
      deckRef.current = deck;
    }

    let next = deckRef.current.shift()!;
    if (next === lastTauntRef.current && deckRef.current.length > 0) {
      deckRef.current.push(next);
      next = deckRef.current.shift()!;
    }
    lastTauntRef.current = next;
    return next;
  }, []);

  const humanSymbol: Player = machineFirst ? "O" : "X";
  const machineSymbol: Player = machineFirst ? "X" : "O";

  useEffect(() => {
    try {
      const saved = localStorage.getItem("xo-scores");
      if (saved) setScores(JSON.parse(saved));
    } catch {}
  }, []);

  const saveScores = useCallback((ns: typeof scores) => {
    try { localStorage.setItem("xo-scores", JSON.stringify(ns)); } catch {}
  }, []);

  const makeMachineMove = useCallback(
    (currentBoard: Board) => {
      setIsThinking(true);
      setTimeout(() => {
        const newBoard = [...currentBoard];
        const move = getBestMove(newBoard, machineSymbol, humanSymbol);
        if (move !== -1) newBoard[move] = machineSymbol;

        const w = checkWinner(newBoard);
        const full = isBoardFull(newBoard);
        setBoard(newBoard);
        setIsThinking(false);

        if (w) {
          setWinner(w);
          setWinLine(getWinningLine(newBoard));
          if (w === humanSymbol) {
            setShowConfetti(true);
            const ns = { ...scores, wins: scores.wins + 1 };
            setScores(ns); saveScores(ns);
          } else {
            setTauntMsg(getNextTaunt(MACHINE_WIN_TAUNTS, winDeckRef));
            const ns = { ...scores, losses: scores.losses + 1 };
            setScores(ns); saveScores(ns);
          }
        } else if (full) {
          setWinner("draw");
          setTauntMsg(getNextTaunt(DRAW_TAUNTS, drawDeckRef));
          const ns = { ...scores, draws: scores.draws + 1 };
          setScores(ns); saveScores(ns);
        } else {
          setCurrentTurn(humanSymbol);
          setTauntMsg(getNextTaunt(HUMAN_TURN_TAUNTS, turnDeckRef));
        }
      }, 600 + Math.random() * 300);
    },
    [machineSymbol, humanSymbol, scores, saveScores, getNextTaunt]
  );

  const startGame = useCallback((mFirst: boolean) => {
    setMachineFirst(mFirst);
    setGameStarted(true);
    const newBoard: Board = Array(9).fill(null);
    setBoard(newBoard);
    setWinner(null);
    setWinLine(null);
    setShowConfetti(false);

    if (mFirst) {
      // machine (X) goes first
      setIsThinking(true);
      setTimeout(() => {
        const move = getBestMove(newBoard, "X", "O");
        const b = [...newBoard];
        b[move] = "X";
        setBoard(b);
        setIsThinking(false);
        setCurrentTurn("O");
        setTauntMsg(getNextTaunt(HUMAN_TURN_TAUNTS, turnDeckRef));
      }, 600);
    } else {
      setCurrentTurn("X");
      lastTauntRef.current = HUMAN_START_TAUNT;
      setTauntMsg(HUMAN_START_TAUNT);
    }
  }, [getNextTaunt]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] || winner || isThinking) return;
      if (mode === "vs-machine" && (!gameStarted || currentTurn !== humanSymbol)) return;

      const newBoard = [...board];
      newBoard[index] = currentTurn;

      const w = checkWinner(newBoard);
      const full = isBoardFull(newBoard);
      setBoard(newBoard);

      if (w) {
        setWinner(w);
        setWinLine(getWinningLine(newBoard));
        setShowConfetti(true);
        if (mode === "vs-machine") {
          if (w === humanSymbol) {
            const ns = { ...scores, wins: scores.wins + 1 };
            setScores(ns); saveScores(ns);
          } else {
            setTauntMsg(getNextTaunt(MACHINE_WIN_TAUNTS, winDeckRef));
            const ns = { ...scores, losses: scores.losses + 1 };
            setScores(ns); saveScores(ns);
          }
        } else {
          // vs-ami mode (Joueur X vs Joueur O)
          const ns =
            w === "X"
              ? { ...scores, wins: scores.wins + 1 }
              : { ...scores, losses: scores.losses + 1 };
          setScores(ns);
          saveScores(ns);
        }
        return;
      }

      if (full) {
        setWinner("draw");
        if (mode === "vs-machine") {
          setTauntMsg(getNextTaunt(DRAW_TAUNTS, drawDeckRef));
        }
        const ns = { ...scores, draws: scores.draws + 1 };
        setScores(ns); saveScores(ns);
        return;
      }

      if (mode === "vs-machine") {
        setCurrentTurn(machineSymbol);
        makeMachineMove(newBoard);
      } else {
        setCurrentTurn(currentTurn === "X" ? "O" : "X");
        setTauntMsg("");
      }
    },
    [board, winner, isThinking, gameStarted, mode, currentTurn, humanSymbol, machineSymbol, scores, saveScores, makeMachineMove, getNextTaunt]
  );

  // Rejouer = restart the same game (same mode, same who-starts)
  const resetGame = useCallback(() => {
    const newBoard: Board = Array(9).fill(null);
    setBoard(newBoard);
    setWinner(null);
    setWinLine(null);
    setShowConfetti(false);

    if (mode === "vs-machine") {
      if (machineFirst) {
        setIsThinking(true);
        setTimeout(() => {
          const move = getBestMove(newBoard, "X", "O");
          const b = [...newBoard];
          b[move] = "X";
          setBoard(b);
          setIsThinking(false);
          setCurrentTurn("O");
          setTauntMsg(getNextTaunt(HUMAN_TURN_TAUNTS, turnDeckRef));
        }, 600);
      } else {
        setCurrentTurn("X");
        lastTauntRef.current = HUMAN_START_TAUNT;
        setTauntMsg(HUMAN_START_TAUNT);
      }
    } else {
      setCurrentTurn("X");
    }
  }, [mode, machineFirst, getNextTaunt]);

  // Commencer = go directly to mode selection (machine ou amis)
  const goBackToMenu = useCallback(() => {
    router.push("/?select=1");
  }, [router]);

  const statusClass =
    winner === "draw" ? styles.draw
    : winner === humanSymbol ? styles.win
    : winner ? styles.lose : "";

  return (
    <main className={styles["game-page"]}>
      {showConfetti && <Confetti />}

      {/* Header */}
      <div className={styles["game-header"]}>
        <button className={`${styles["back-link"]} btn-ghost`} onClick={() => router.push("/")} id="btn-back-home">
          ← Rja3
        </button>
        <div className={styles["game-logo"]}>
          <span className="gradient-text">XO</span>
        </div>
        <div className={styles["mode-badge"]}>
          {mode === "vs-machine" ? "vs Machine" : "vs Sahbi"}
        </div>
      </div>

      {/* Score Board */}
      <div className={styles["score-board"]}>
        <div className={styles["score-player"]}>
          <span className={styles["score-player-name"]}>{mode === "vs-machine" ? "Nta" : "Joueur X"}</span>
          <span className={`${styles["score-player-score"]} ${styles["score-x"]}`}>{scores.wins}</span>
        </div>
        <span className={styles["score-divider"]}>·</span>
        <div className={styles["score-player"]}>
          <span className={styles["score-player-name"]}>Nul</span>
          <span className={`${styles["score-player-score"]} ${styles["score-draw"]}`}>{scores.draws}</span>
        </div>
        <span className={styles["score-divider"]}>·</span>
        <div className={styles["score-player"]}>
          <span className={styles["score-player-name"]}>{mode === "vs-machine" ? "Machine" : "Joueur O"}</span>
          <span className={`${styles["score-player-score"]} ${styles["score-o"]}`}>{scores.losses}</span>
        </div>
      </div>

      {/* First move selector — vs machine only */}
      {mode === "vs-machine" && !gameStarted && (
        <div className={styles["first-move-selector"]}>
          <span className={styles["first-move-label"]}>chcoun yabda</span>
          <div className={styles["first-move-options"]}>
            <button
              className={styles["first-move-btn"]}
              onClick={() => startGame(true)}
              id="btn-machine-first"
            >
              nta lawel
            </button>
            <button
              className={styles["first-move-btn"]}
              onClick={() => startGame(false)}
              id="btn-human-first"
            >
              ana lawel
            </button>
          </div>
        </div>
      )}

      {/* Message Banner for vs-machine */}
      {mode === "vs-machine" && gameStarted && (
        <div className={`${styles["status-banner"]} ${statusClass}`}>
          {isThinking ? (
            <div className={styles["thinking-indicator"]}>
              <span className={styles["thinking-dots"]}>
                <span /><span /><span />
              </span>
            </div>
          ) : (
            <span className={styles["status-text"]}>{tauntMsg}</span>
          )}
        </div>
      )}

      {/* Message Banner for vs-ami */}
      {mode === "vs-ami" && (
        <div className={`${styles["status-banner"]} ${winner ? (winner === "draw" ? styles.draw : styles.win) : ""}`}>
          <span className={styles["status-text"]}>
            {winner
              ? (winner === "draw" ? "Nul" : `Joueur ${winner} rabah !`)
              : `Tour : Joueur ${currentTurn}`}
          </span>
        </div>
      )}

      {/* Board */}
      <div className={styles["board-wrapper"]}>
        <div className={styles["board-grid"]} role="grid" aria-label="Grille XO">
          {board.map((cell, i) => {
            const isWinning = winLine?.includes(i) ?? false;
            const isFilled = !!cell;
            const isDisabled =
              isFilled || !!winner || isThinking ||
              (mode === "vs-machine" && (!gameStarted || currentTurn !== humanSymbol));

            return (
              <div
                key={i}
                role="gridcell"
                id={`cell-${i}`}
                aria-label={`Case ${i + 1}${cell ? `: ${cell}` : ""}`}
                className={[
                  styles.cell,
                  isFilled ? styles.filled : "",
                  isWinning ? styles.winning : "",
                  isDisabled ? styles.disabled : "",
                ].join(" ")}
                onClick={() => handleCellClick(i)}
              >
                {cell === "X" && <XSymbol />}
                {cell === "O" && <OSymbol />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions — two buttons: Rejouer + Commencer */}
      <div className={styles["game-actions"]}>
        {(winner || (mode === "vs-machine" && gameStarted) || (mode === "vs-ami" && board.some(Boolean))) && (
          <div className={styles["action-buttons"]}>
            <button
              id="btn-rejouer"
              className={`btn-primary ${styles["action-btn"]}`}
              onClick={resetGame}
            >
              🔄 Rejouer
            </button>
            <button
              id="btn-commencer"
              className={`btn-secondary ${styles["action-btn"]}`}
              onClick={goBackToMenu}
            >
              🏠 Commencer
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="page-wrapper" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <div style={{ fontSize: "3rem" }}>⏳</div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
