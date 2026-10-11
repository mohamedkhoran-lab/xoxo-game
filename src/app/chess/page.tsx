"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import {
  ChessBoard,
  ChessMove,
  PieceColor,
  createInitialChessBoard,
  cloneChessBoard,
  getLegalMovesForPiece,
  getAllChessMoves,
  applyChessMove,
  getBestChessMove,
  CHESS_SYMBOLS,
} from "../lib/chessEngine";
import styles from "./chess.module.css";

// ========================
// Types
// ========================
interface HistoryState {
  board: ChessBoard;
  currentTurn: PieceColor;
  winner: PieceColor | null;
  lastMove: { from: [number, number]; to: [number, number] } | null;
}

// ========================
// Confetti Component
// ========================
function Confetti() {
  const pieces = Array.from({ length: 45 }, (_, i) => ({
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
// Chess Game Content
// ========================
function ChessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "vs-machine";

  const [board, setBoard] = useState<ChessBoard>(createInitialChessBoard);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>("white");
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);

  // Count active pieces
  const pieceCounts = useMemo(() => {
    let white = 0;
    let black = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece?.color === "white") white++;
        if (piece?.color === "black") black++;
      }
    }
    return { white, black };
  }, [board]);

  // Available moves for currently selected square
  const availableMoves = useMemo(() => {
    if (!selectedPiece || winner) return [];
    const [r, c] = selectedPiece;
    return getLegalMovesForPiece(board, r, c);
  }, [selectedPiece, board, winner]);

  // AI Turn (Amine - Black pieces)
  useEffect(() => {
    if (mode !== "vs-machine" || currentTurn !== "black" || winner) return;

    setIsAiThinking(true);
    const delay = 650 + Math.random() * 300;

    const timer = setTimeout(() => {
      const bestMove = getBestChessMove(board, "black", 3);
      if (!bestMove) {
        // AI has no moves, White wins
        setWinner("white");
        setIsAiThinking(false);
        return;
      }

      // Snapshot history before AI move
      setHistory((prev) => [
        ...prev,
        {
          board: cloneChessBoard(board),
          currentTurn: "black",
          winner: null,
          lastMove,
        },
      ]);

      const nextBoard = applyChessMove(board, bestMove);
      setBoard(nextBoard);
      setLastMove({ from: bestMove.from, to: bestMove.to });
      setIsAiThinking(false);

      // Check if White King captured
      let whiteKingAlive = false;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (nextBoard[r][c]?.type === "K" && nextBoard[r][c]?.color === "white") {
            whiteKingAlive = true;
          }
        }
      }

      if (!whiteKingAlive) {
        setWinner("black");
      } else if (getAllChessMoves(nextBoard, "white").length === 0) {
        setWinner("black");
      } else {
        setCurrentTurn("white");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [mode, currentTurn, winner, board, lastMove]);

  // Handle Square Click
  const handleSquareClick = (r: number, c: number) => {
    if (winner || (mode === "vs-machine" && (isAiThinking || currentTurn === "black"))) {
      return;
    }

    const clickedPiece = board[r][c];

    // Selecting own piece
    if (clickedPiece && clickedPiece.color === currentTurn) {
      setSelectedPiece([r, c]);
      return;
    }

    // Making move if piece is already selected
    if (selectedPiece) {
      const validMove = availableMoves.find((m) => m.to[0] === r && m.to[1] === c);
      if (validMove) {
        executeMove(validMove);
      } else if (!clickedPiece) {
        setSelectedPiece(null);
      }
    }
  };

  // Execute Human Move
  const executeMove = (move: ChessMove) => {
    // Save history
    setHistory((prev) => [
      ...prev,
      {
        board: cloneChessBoard(board),
        currentTurn,
        winner,
        lastMove,
      },
    ]);

    const nextBoard = applyChessMove(board, move);
    setBoard(nextBoard);
    setLastMove({ from: move.from, to: move.to });
    setSelectedPiece(null);

    // Check if Black King was captured
    let blackKingAlive = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (nextBoard[r][c]?.type === "K" && nextBoard[r][c]?.color === "black") {
          blackKingAlive = true;
        }
      }
    }

    const nextTurn: PieceColor = currentTurn === "white" ? "black" : "white";

    if (!blackKingAlive) {
      setWinner("white");
      return;
    }

    if (getAllChessMoves(nextBoard, nextTurn).length === 0) {
      setWinner(currentTurn);
      return;
    }

    setCurrentTurn(nextTurn);
  };

  // Undo (Revenir en arrière)
  const handleUndo = () => {
    if (history.length === 0 || isAiThinking) return;

    if (mode === "vs-machine") {
      // Revert back to the snapshot where it was White's turn
      let targetIdx = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].currentTurn === "white") {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx !== -1) {
        const target = history[targetIdx];
        setBoard(target.board);
        setCurrentTurn("white");
        setWinner(null);
        setLastMove(target.lastMove);
        setSelectedPiece(null);
        setHistory((prev) => prev.slice(0, targetIdx));
      } else {
        handleRestart();
      }
    } else {
      const last = history[history.length - 1];
      setBoard(last.board);
      setCurrentTurn(last.currentTurn);
      setWinner(last.winner);
      setLastMove(last.lastMove);
      setSelectedPiece(null);
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  // Restart Game
  const handleRestart = () => {
    setBoard(createInitialChessBoard());
    setCurrentTurn("white");
    setSelectedPiece(null);
    setIsAiThinking(false);
    setWinner(null);
    setLastMove(null);
    setHistory([]);
  };

  return (
    <main className={styles["chess-page"]}>
      {winner && <Confetti />}

      {/* Header */}
      <div className={styles["chess-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => router.push("/?select=1")}
          id="btn-chess-back"
        >
          ← Rja3
        </button>
        <div className={styles["chess-logo"]}>
          <span className="gradient-text">Chess</span>
        </div>
        <div className={styles["mode-badge"]}>
          <span>{mode === "vs-machine" ? "vs Amine" : "vs Sahbi"}</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        <div
          className={`${styles["player-card"]} ${
            currentTurn === "white" && !winner ? styles["active-white"] : ""
          }`}
        >
          <span className={styles["player-name"]}>
            <span className={`${styles["player-dot"]} ${styles["dot-white"]}`} />
            {mode === "vs-machine" ? "Nta" : "Joueur 1"}
          </span>
          <span className={styles["player-pieces"]}>{pieceCounts.white} pièces</span>
        </div>

        <div className={styles["vs-divider"]}>VS</div>

        <div
          className={`${styles["player-card"]} ${
            currentTurn === "black" && !winner ? styles["active-black"] : ""
          }`}
        >
          <span className={styles["player-name"]}>
            <span className={`${styles["player-dot"]} ${styles["dot-black"]}`} />
            {mode === "vs-machine" ? "Amine" : "Joueur 2"}
          </span>
          <span className={styles["player-pieces"]}>{pieceCounts.black} pièces</span>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`${styles["status-banner"]} ${
          winner === "white"
            ? styles["win-white"]
            : winner === "black"
            ? styles["win-black"]
            : ""
        }`}
      >
        {winner ? (
          <span>
            🎉 {mode === "vs-machine" ? (winner === "white" ? "Victoire de Nta !" : "Victoire d'Amine !") : `Victoire du Joueur ${winner === "white" ? "1" : "2"} !`}
          </span>
        ) : isAiThinking ? (
          <div className="thinking-indicator" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>Amine réfléchit...</span>
          </div>
        ) : (
          <span>
            Tour :{" "}
            <strong>
              {mode === "vs-machine"
                ? currentTurn === "white"
                  ? "Nta (Blanc/Violet)"
                  : "Amine (Noir/Rose)"
                : currentTurn === "white"
                ? "Joueur 1 (Blanc/Violet)"
                : "Joueur 2 (Noir/Rose)"}
            </strong>
          </span>
        )}
      </div>

      {/* Board */}
      <div className={styles["board-wrapper"]}>
        <div className={styles["chess-board"]} role="grid" aria-label="Échiquier">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedPiece?.[0] === r && selectedPiece?.[1] === c;
              const isLastMove =
                (lastMove?.from[0] === r && lastMove?.from[1] === c) ||
                (lastMove?.to[0] === r && lastMove?.to[1] === c);
              const targetMove = availableMoves.find(
                (m) => m.to[0] === r && m.to[1] === c
              );

              return (
                <div
                  key={`${r}-${c}`}
                  id={`square-${r}-${c}`}
                  role="gridcell"
                  className={[
                    styles.square,
                    isDark ? styles["square-dark"] : styles["square-light"],
                    isSelected ? styles["square-selected"] : "",
                    isLastMove ? styles["square-last-move"] : "",
                    targetMove ? styles["square-valid-target"] : "",
                  ].join(" ")}
                  onClick={() => handleSquareClick(r, c)}
                >
                  {/* Hint dot for valid destination */}
                  {targetMove && (
                    <div
                      className={[
                        styles["target-dot"],
                        targetMove.captured ? styles["target-dot-capture"] : "",
                      ].join(" ")}
                    />
                  )}

                  {/* Piece */}
                  {piece && (
                    <span
                      className={[
                        styles.piece,
                        piece.color === "white" ? styles["piece-white"] : styles["piece-black"],
                        isSelected ? styles["piece-selected"] : "",
                      ].join(" ")}
                    >
                      {CHESS_SYMBOLS[piece.color][piece.type]}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles["chess-actions"]}>
        <div className={styles["action-row"]}>
          <button
            id="btn-undo-move"
            className={`${styles["action-btn"]} ${styles["btn-undo"]}`}
            onClick={handleUndo}
            disabled={history.length === 0 || !!winner || isAiThinking}
          >
            ↩ Revenir en arrière
          </button>
          <button
            id="btn-restart-chess"
            className={`${styles["action-btn"]} ${styles["btn-replay"]}`}
            onClick={handleRestart}
          >
            🔄 Recommencer
          </button>
        </div>
        <button
          id="btn-menu-chess"
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

export default function ChessPage() {
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
      <ChessContent />
    </Suspense>
  );
}
