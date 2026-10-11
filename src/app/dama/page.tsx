"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import {
  getBestDamaMove,
  applyFullMove,
  PlayerId,
  Piece,
  Board,
  cloneBoard,
} from "../lib/damaEngine";
import styles from "./dama.module.css";

// ========================
// Types
// ========================
interface Move {
  to: [number, number];
  captured?: [number, number];
  isCapture: boolean;
}

interface HistoryState {
  board: Board;
  currentTurn: PlayerId;
  winner: PlayerId | null;
  lastMove: { from: [number, number]; to: [number, number] } | null;
  p1Count: number;
  p2Count: number;
}

// ========================
// Initial Board Setup (8x8)
// ========================
function createInitialBoard(): Board {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      // Pieces only on dark squares: (r + c) % 2 === 1
      if ((r + c) % 2 === 1) {
        if (r < 3) {
          // Player 2 (Rose / Amine) top
          board[r][c] = { player: 2, isKing: false };
        } else if (r > 4) {
          // Player 1 (Violet / Humain) bottom
          board[r][c] = { player: 1, isKing: false };
        }
      }
    }
  }
  return board;
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
// Dama Game Content
// ========================
function DamaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "vs-machine";

  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [currentTurn, setCurrentTurn] = useState<PlayerId>(1);
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
  const [isChainJump, setIsChainJump] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<PlayerId | null>(null);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);

  // Count pieces
  const pieceCounts = useMemo(() => {
    let p1 = 0;
    let p2 = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece?.player === 1) p1++;
        if (piece?.player === 2) p2++;
      }
    }
    return { p1, p2 };
  }, [board]);

  // Valid moves for a piece at (r, c)
  const getMovesForPiece = useCallback(
    (b: Board, r: number, c: number, chainOnly = false): Move[] => {
      const piece = b[r][c];
      if (!piece) return [];

      const moves: Move[] = [];
      const opponent: PlayerId = piece.player === 1 ? 2 : 1;

      // Regular move directions:
      // Normal pieces can ONLY move forward! Only Kings move forward and backward.
      const moveDirs = piece.isKing
        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        : piece.player === 1
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]];

      // Simple moves (only if not in a multi-jump sequence)
      if (!chainOnly) {
        for (const [dr, dc] of moveDirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === null) {
            moves.push({ to: [nr, nc], isCapture: false });
          }
        }
      }

      // Capture jumps:
      // Normal pieces can ONLY capture FORWARD!
      // Only Kings (Dames) can capture forward AND backward in all 4 directions.
      const captureDirs = piece.isKing
        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        : piece.player === 1
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]];

      for (const [dr, dc] of captureDirs) {
        const midR = r + dr;
        const midC = c + dc;
        const landR = r + 2 * dr;
        const landC = c + 2 * dc;

        if (
          landR >= 0 &&
          landR < 8 &&
          landC >= 0 &&
          landC < 8 &&
          b[midR][midC]?.player === opponent &&
          b[landR][landC] === null
        ) {
          moves.push({
            to: [landR, landC],
            captured: [midR, midC],
            isCapture: true,
          });
        }
      }

      return moves;
    },
    []
  );

  // Check if a player has any valid moves on the entire board
  const hasAnyMoves = useCallback(
    (b: Board, player: PlayerId): boolean => {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (b[r][c]?.player === player) {
            const m = getMovesForPiece(b, r, c, false);
            if (m.length > 0) return true;
          }
        }
      }
      return false;
    },
    [getMovesForPiece]
  );

  // Pieces that have at least one valid capture move
  const piecesWithCaptures = useMemo(() => {
    if (winner) return [];
    if (isChainJump && selectedPiece) {
      return [selectedPiece];
    }
    const list: [number, number][] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.player === currentTurn) {
          const moves = getMovesForPiece(board, r, c, false);
          if (moves.some((m) => m.isCapture)) {
            list.push([r, c]);
          }
        }
      }
    }
    return list;
  }, [board, currentTurn, isChainJump, selectedPiece, winner, getMovesForPiece]);

  const isCaptureMandatory = piecesWithCaptures.length > 0;

  // Available moves for selected piece
  const availableMoves = useMemo(() => {
    if (!selectedPiece || winner) return [];
    const [r, c] = selectedPiece;
    const moves = getMovesForPiece(board, r, c, isChainJump);
    // If a capture is mandatory, ONLY capture moves are permitted
    if (isCaptureMandatory) {
      return moves.filter((m) => m.isCapture);
    }
    return moves;
  }, [selectedPiece, board, isChainJump, isCaptureMandatory, winner, getMovesForPiece]);

  // AI Turn (Machine / Amine - Player 2)
  useEffect(() => {
    if (mode !== "vs-machine" || currentTurn !== 2 || winner) return;

    setIsAiThinking(true);
    const delay = 600 + Math.random() * 300;

    const timer = setTimeout(() => {
      const bestMove = getBestDamaMove(board, 2, 6);
      if (!bestMove) {
        // AI has no moves, human wins!
        setWinner(1);
        setIsAiThinking(false);
        return;
      }

      // Snapshot history before AI move
      setHistory((prev) => [
        ...prev,
        {
          board: cloneBoard(board),
          currentTurn: 2,
          winner: null,
          lastMove,
          p1Count: pieceCounts.p1,
          p2Count: pieceCounts.p2,
        },
      ]);

      const nextBoard = applyFullMove(board, bestMove);
      setBoard(nextBoard);
      setLastMove({ from: bestMove.from, to: bestMove.to });
      setIsAiThinking(false);

      // Check victory
      let p1 = 0;
      let p2 = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (nextBoard[r][c]?.player === 1) p1++;
          if (nextBoard[r][c]?.player === 2) p2++;
        }
      }

      if (p1 === 0) {
        setWinner(2);
      } else if (!hasAnyMoves(nextBoard, 1)) {
        setWinner(2);
      } else {
        setCurrentTurn(1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [mode, currentTurn, winner, board, lastMove, pieceCounts, hasAnyMoves]);

  // Handle click on square or piece
  const handleSquareClick = (r: number, c: number) => {
    if (winner || (mode === "vs-machine" && (isAiThinking || currentTurn === 2))) {
      return;
    }

    const clickedPiece = board[r][c];

    // If currently waiting for a multi-jump, you can only move the selected piece
    if (isChainJump) {
      if (selectedPiece && selectedPiece[0] === r && selectedPiece[1] === c) {
        return; // already selected
      }
      const validMove = availableMoves.find((m) => m.to[0] === r && m.to[1] === c);
      if (validMove) {
        executeMove(validMove);
      }
      return;
    }

    // Selecting own piece (enforcing forced capture: can only select pieces that can capture)
    if (clickedPiece && clickedPiece.player === currentTurn) {
      if (
        isCaptureMandatory &&
        !piecesWithCaptures.some(([pr, pc]) => pr === r && pc === c)
      ) {
        // Cannot select a non-capturing piece when a capture is mandatory!
        return;
      }
      setSelectedPiece([r, c]);
      return;
    }

    // Making a move if a piece is selected
    if (selectedPiece) {
      const validMove = availableMoves.find((m) => m.to[0] === r && m.to[1] === c);
      if (validMove) {
        executeMove(validMove);
      } else if (!clickedPiece) {
        setSelectedPiece(null);
      }
    }
  };

  // Execute a validated move (Human)
  const executeMove = (move: Move) => {
    if (!selectedPiece) return;
    const [fromR, fromC] = selectedPiece;
    const [toR, toC] = move.to;

    // Save history for Undo
    setHistory((prev) => [
      ...prev,
      {
        board: cloneBoard(board),
        currentTurn,
        winner,
        lastMove,
        p1Count: pieceCounts.p1,
        p2Count: pieceCounts.p2,
      },
    ]);

    const newBoard = cloneBoard(board);
    const movingPiece = { ...newBoard[fromR][fromC]! };

    // Move piece
    newBoard[toR][toC] = movingPiece;
    newBoard[fromR][fromC] = null;

    // If capture, remove captured piece
    if (move.captured) {
      const [capR, capC] = move.captured;
      newBoard[capR][capC] = null;
    }

    // Check King crowning
    let justCrowned = false;
    if (movingPiece.player === 1 && toR === 0 && !movingPiece.isKing) {
      movingPiece.isKing = true;
      justCrowned = true;
    } else if (movingPiece.player === 2 && toR === 7 && !movingPiece.isKing) {
      movingPiece.isKing = true;
      justCrowned = true;
    }

    setLastMove({ from: [fromR, fromC], to: [toR, toC] });

    // Check for multi-capture jump
    if (move.isCapture && !justCrowned) {
      const followUpCaptures = getMovesForPiece(newBoard, toR, toC, true).filter(
        (m) => m.isCapture
      );
      if (followUpCaptures.length > 0) {
        setBoard(newBoard);
        setSelectedPiece([toR, toC]);
        setIsChainJump(true);
        return; // player continues jumping!
      }
    }

    // Next turn
    setIsChainJump(false);
    setSelectedPiece(null);

    // Check victory
    let p1 = 0;
    let p2 = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (newBoard[r][c]?.player === 1) p1++;
        if (newBoard[r][c]?.player === 2) p2++;
      }
    }

    const nextPlayer: PlayerId = currentTurn === 1 ? 2 : 1;
    if (p1 === 0) {
      setBoard(newBoard);
      setWinner(2);
      return;
    }
    if (p2 === 0) {
      setBoard(newBoard);
      setWinner(1);
      return;
    }

    if (!hasAnyMoves(newBoard, nextPlayer)) {
      setBoard(newBoard);
      setWinner(currentTurn);
      return;
    }

    setBoard(newBoard);
    setCurrentTurn(nextPlayer);
  };

  // Undo (Revenir en arrière)
  const handleUndo = () => {
    if (history.length === 0 || isAiThinking) return;

    if (mode === "vs-machine") {
      // Revert back to the state where it was Player 1's turn
      let targetIdx = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].currentTurn === 1) {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx !== -1) {
        const target = history[targetIdx];
        setBoard(target.board);
        setCurrentTurn(1);
        setWinner(null);
        setLastMove(target.lastMove);
        setSelectedPiece(null);
        setIsChainJump(false);
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
      setIsChainJump(false);
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  // Restart game
  const handleRestart = () => {
    setBoard(createInitialBoard());
    setCurrentTurn(1);
    setSelectedPiece(null);
    setIsChainJump(false);
    setIsAiThinking(false);
    setWinner(null);
    setLastMove(null);
    setHistory([]);
  };

  return (
    <main className={styles["dama-page"]}>
      {winner && <Confetti />}

      {/* Header */}
      <div className={styles["dama-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => router.push("/?select=1")}
          id="btn-dama-back"
        >
          ← Rja3
        </button>
        <div className={styles["dama-logo"]}>
          <span className="gradient-text">Dama</span>
        </div>
        <div className={styles["mode-badge"]}>
          <span>{mode === "vs-machine" ? "vs Amine" : "vs Sahbi"}</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        <div
          className={`${styles["player-card"]} ${
            currentTurn === 1 && !winner ? styles["active-p1"] : ""
          }`}
        >
          <span className={styles["player-name"]}>
            <span className={`${styles["player-dot"]} ${styles["dot-p1"]}`} />
            {mode === "vs-machine" ? "Nta" : "Joueur 1"}
          </span>
          <span className={styles["player-pieces"]}>{pieceCounts.p1} pions</span>
        </div>

        <div className={styles["vs-divider"]}>VS</div>

        <div
          className={`${styles["player-card"]} ${
            currentTurn === 2 && !winner ? styles["active-p2"] : ""
          }`}
        >
          <span className={styles["player-name"]}>
            <span className={`${styles["player-dot"]} ${styles["dot-p2"]}`} />
            {mode === "vs-machine" ? "Amine" : "Joueur 2"}
          </span>
          <span className={styles["player-pieces"]}>{pieceCounts.p2} pions</span>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`${styles["status-banner"]} ${
          winner === 1
            ? styles["win-p1"]
            : winner === 2
            ? styles["win-p2"]
            : isCaptureMandatory
            ? styles.mandatory
            : ""
        }`}
      >
        {winner ? (
          <span>
            🎉 {mode === "vs-machine" ? (winner === 1 ? "Victoire de Nta !" : "Victoire d'Amine !") : `Victoire du Joueur ${winner} !`}
          </span>
        ) : isAiThinking ? (
          <div className="thinking-indicator" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>Amine réfléchit...</span>
          </div>
        ) : isChainJump ? (
          <span>⚔️ Capture multiple disponible !</span>
        ) : isCaptureMandatory ? (
          <span>
            ⚔️ <strong>Prise obligatoire !</strong>
          </span>
        ) : (
          <span>
            Tour :{" "}
            <strong>
              {mode === "vs-machine"
                ? currentTurn === 1
                  ? "Nta (Violet)"
                  : "Amine (Rose)"
                : currentTurn === 1
                ? "Joueur 1 (Violet)"
                : "Joueur 2 (Rose)"}
            </strong>
          </span>
        )}
      </div>

      {/* Board */}
      <div className={styles["board-wrapper"]}>
        <div className={styles["dama-board"]} role="grid" aria-label="Damier Dama">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedPiece?.[0] === r && selectedPiece?.[1] === c;
              const isMustCapture =
                isCaptureMandatory &&
                piece?.player === currentTurn &&
                piecesWithCaptures.some(([pr, pc]) => pr === r && pc === c);
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
                        targetMove.isCapture ? styles["target-dot-capture"] : "",
                      ].join(" ")}
                    />
                  )}

                  {/* Piece */}
                  {piece && (
                    <div
                      className={[
                        styles.piece,
                        piece.player === 1 ? styles["piece-p1"] : styles["piece-p2"],
                        isSelected ? styles["piece-selected"] : "",
                        isMustCapture ? styles["piece-must-capture"] : "",
                      ].join(" ")}
                    >
                      {piece.isKing && <span className={styles["king-icon"]}>👑</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles["dama-actions"]}>
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
            id="btn-restart-dama"
            className={`${styles["action-btn"]} ${styles["btn-replay"]}`}
            onClick={handleRestart}
          >
            🔄 Recommencer
          </button>
        </div>
        <button
          id="btn-menu-dama"
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

export default function DamaPage() {
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
      <DamaContent />
    </Suspense>
  );
}
