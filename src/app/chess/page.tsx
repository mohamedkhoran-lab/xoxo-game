"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, Suspense } from "react";
import {
  ChessMove,
  ChessPiece,
  ChessState,
  PieceColor,
  PieceType,
  Square,
  createInitialState,
  getLegalMoves,
  applyMove,
  getBestMove,
  getGameStatus,
  findKing,
  CHESS_SYMBOLS,
} from "../lib/chessEngine";
import styles from "./chess.module.css";

interface Snapshot {
  state: ChessState;
  lastMove: { from: Square; to: Square } | null;
  captured: ChessPiece[];
}

const FILES = "abcdefgh";

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 95,
      color: ["#6c63ff", "#fd79a8", "#00cec9", "#f9ca24", "#a29bfe", "#ff6b6b"][i % 6],
      delay: Math.random() * 2,
      size: 8 + Math.random() * 8,
      round: Math.random() > 0.5,
    }))
  );
  return (
    <div className={styles.confettiLayer}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-12px",
            background: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.round ? "50%" : "2px",
            animation: "confettiFall 3s ease-in forwards",
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function ChessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "vs-machine";
  const vsAI = mode === "vs-machine";

  const [game, setGame] = useState<ChessState>(createInitialState);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [captured, setCaptured] = useState<ChessPiece[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [promo, setPromo] = useState<ChessMove[] | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const status = useMemo(() => getGameStatus(game), [game]);
  const isOver = status.kind !== "playing";
  const inCheck = status.kind === "playing" && status.check;
  const kingInDanger = inCheck || status.kind === "checkmate" ? findKing(game.board, game.turn) : null;

  const availableMoves = useMemo(() => {
    if (!selected || isOver) return [];
    return getLegalMoves(game, selected[0], selected[1]);
  }, [selected, game, isOver]);

  // Lock browser gestures (pinch / double-tap zoom, rubber-band scroll) while playing
  useEffect(() => {
    const prev = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    const stopGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stopGesture);
    document.addEventListener("dblclick", stopGesture);
    return () => {
      document.body.style.overscrollBehavior = prev;
      document.removeEventListener("gesturestart", stopGesture);
      document.removeEventListener("dblclick", stopGesture);
    };
  }, []);

  const commitMove = (move: ChessMove) => {
    setHistory((h) => [...h, { state: game, lastMove, captured }]);
    if (move.captured) setCaptured((c) => [...c, move.captured!]);
    setGame(applyMove(game, move));
    setLastMove({ from: move.from, to: move.to });
    setSelected(null);
    setPromo(null);
  };

  // AI turn (Amine plays black)
  const aiTurn = vsAI && game.turn === "black" && !isOver;
  useEffect(() => {
    if (!aiTurn) return;
    const think = setTimeout(() => setIsAiThinking(true), 0);
    const timer = setTimeout(() => {
      const move = getBestMove(game, 3);
      setIsAiThinking(false);
      if (move) commitMove(move);
    }, 450 + Math.random() * 300);
    return () => {
      clearTimeout(think);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTurn, game]);

  const handleSquareClick = (r: number, c: number) => {
    if (isOver || promo || (vsAI && game.turn === "black")) return;
    const piece = game.board[r][c];

    if (selected && selected[0] === r && selected[1] === c) {
      setSelected(null);
      return;
    }
    if (piece && piece.color === game.turn) {
      setSelected([r, c]);
      return;
    }
    if (selected) {
      const options = availableMoves.filter((m) => m.to[0] === r && m.to[1] === c);
      if (options.length > 1 && options[0].promotion) setPromo(options);
      else if (options.length === 1) commitMove(options[0]);
      else setSelected(null);
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || isAiThinking) return;
    // vs AI: go back to the last position where it was the human's turn
    let idx = history.length - 1;
    if (vsAI) while (idx > 0 && history[idx].state.turn !== "white") idx--;
    const snap = history[idx];
    setGame(snap.state);
    setLastMove(snap.lastMove);
    setCaptured(snap.captured);
    setHistory(history.slice(0, idx));
    setSelected(null);
    setPromo(null);
  };

  const handleRestart = () => {
    setGame(createInitialState());
    setSelected(null);
    setLastMove(null);
    setCaptured([]);
    setHistory([]);
    setPromo(null);
    setIsAiThinking(false);
  };

  const nameOf = (color: PieceColor) =>
    vsAI ? (color === "white" ? "Nta" : "Amine") : color === "white" ? "Joueur 1" : "Joueur 2";

  let banner: React.ReactNode;
  let bannerClass = "";
  if (status.kind === "checkmate") {
    banner = <>♛ Échec et mat ! Rbe7 <strong>{nameOf(status.winner)}</strong> 🎉</>;
    bannerClass = status.winner === "white" ? styles["win-white"] : styles["win-black"];
  } else if (status.kind === "stalemate") {
    banner = <>🤝 Pat — match nul (ma kayen hata coup)</>;
  } else if (status.kind === "draw") {
    banner = <>🤝 Match nul {status.reason === "material" ? "(pièces insuffisantes)" : "(règle des 50 coups)"}</>;
  } else if (isAiThinking) {
    banner = <>Amine ykhamem... 🤔</>;
  } else if (inCheck) {
    banner = <>⚠️ Échec ! <strong>{nameOf(game.turn)}</strong>, sauvi l malik 👑</>;
    bannerClass = styles["banner-check"];
  } else {
    banner = <>Dorek : <strong>{nameOf(game.turn)}</strong> ({game.turn === "white" ? "Violet" : "Rose"})</>;
  }

  const capturedBy = (color: PieceColor) => captured.filter((p) => p.color !== color);

  return (
    <main className={styles["chess-page"]}>
      {(status.kind === "checkmate" && (!vsAI || status.winner === "white")) && <Confetti />}

      <div className={styles["chess-header"]}>
        <button className={`${styles["back-link"]} btn-ghost`} onClick={() => router.push("/?select=1")} id="btn-chess-back">
          ← Rja3
        </button>
        <div className={styles["chess-logo"]}>
          <span className="gradient-text">Chess</span>
        </div>
        <div className={styles["mode-badge"]}>{vsAI ? "vs Amine" : "vs Sahbi"}</div>
      </div>

      <div className={styles.scoreboard}>
        {(["white", "black"] as PieceColor[]).map((color, i) => (
          <div key={color} style={{ display: "contents" }}>
            {i === 1 && <div className={styles["vs-divider"]}>VS</div>}
            <div className={`${styles["player-card"]} ${game.turn === color && !isOver ? styles[color === "white" ? "active-white" : "active-black"] : ""}`}>
              <span className={styles["player-name"]}>
                <span className={`${styles["player-dot"]} ${styles[color === "white" ? "dot-white" : "dot-black"]}`} />
                {nameOf(color)}
              </span>
              <span className={styles["captured-row"]}>
                {capturedBy(color).length === 0
                  ? "—"
                  : capturedBy(color).map((p, k) => (
                      <span key={k} className={p.color === "white" ? styles["cap-white"] : styles["cap-black"]}>
                        {CHESS_SYMBOLS[p.color][p.type]}
                      </span>
                    ))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={`${styles["status-banner"]} ${bannerClass}`}>{banner}</div>

      <div className={styles["board-wrapper"]}>
        <div className={styles["chess-board"]} role="grid" aria-label="Échiquier">
          {game.board.map((row, r) =>
            row.map((piece, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selected?.[0] === r && selected?.[1] === c;
              const isLast =
                (lastMove?.from[0] === r && lastMove?.from[1] === c) ||
                (lastMove?.to[0] === r && lastMove?.to[1] === c);
              const target = availableMoves.find((m) => m.to[0] === r && m.to[1] === c);
              const isKingDanger = kingInDanger?.[0] === r && kingInDanger?.[1] === c;

              return (
                <div
                  key={`${r}-${c}`}
                  role="gridcell"
                  className={[
                    styles.square,
                    isDark ? styles["square-dark"] : styles["square-light"],
                    isLast ? styles["square-last-move"] : "",
                    isSelected ? styles["square-selected"] : "",
                    isKingDanger ? styles["square-check"] : "",
                    target ? styles["square-valid-target"] : "",
                  ].join(" ")}
                  onClick={() => handleSquareClick(r, c)}
                >
                  {c === 0 && <span className={`${styles.coord} ${styles["coord-rank"]}`}>{8 - r}</span>}
                  {r === 7 && <span className={`${styles.coord} ${styles["coord-file"]}`}>{FILES[c]}</span>}
                  {target && (
                    <div className={target.captured ? styles["target-ring"] : styles["target-dot"]} />
                  )}
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

          {promo && (
            <div className={styles["promo-overlay"]}>
              <div className={styles["promo-box"]}>
                <span className={styles["promo-title"]}>Khayar l pièce 👇</span>
                <div className={styles["promo-choices"]}>
                  {(["Q", "R", "B", "N"] as PieceType[]).map((t) => {
                    const m = promo.find((x) => x.promotion === t)!;
                    return (
                      <button key={t} className={styles["promo-btn"]} onClick={() => commitMove(m)}>
                        <span className={game.turn === "white" ? styles["piece-white"] : styles["piece-black"]}>
                          {CHESS_SYMBOLS[game.turn][t]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button className={styles["promo-cancel"]} onClick={() => setPromo(null)}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className={styles.tip}>
        💡 Roque : clique 3la l malik, w ghadi tchouf deux cases (côté court / côté long) ki tkoun mumkin.
      </p>

      <div className={styles["chess-actions"]}>
        <div className={styles["action-row"]}>
          <button
            className={`${styles["action-btn"]} ${styles["btn-undo"]}`}
            onClick={handleUndo}
            disabled={history.length === 0 || isAiThinking}
          >
            ↩ Rja3 coup
          </button>
          <button className={`${styles["action-btn"]} ${styles["btn-replay"]}`} onClick={handleRestart}>
            🔄 3awed
          </button>
        </div>
        <button
          className="btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => router.push("/?select=1")}
        >
          🏠 Bdel l jeu
        </button>
      </div>
    </main>
  );
}

export default function ChessPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: "3rem" }}>⏳</div>}>
      <ChessContent />
    </Suspense>
  );
}
