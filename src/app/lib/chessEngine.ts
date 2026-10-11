// ========================================================
// CHESS AI ENGINE — Alpha-Beta Minimax with Piece-Square Tables
// ========================================================

export type PieceType = "P" | "R" | "N" | "B" | "Q" | "K";
export type PieceColor = "white" | "black";

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export type ChessBoard = (ChessPiece | null)[][];

export interface ChessMove {
  from: [number, number];
  to: [number, number];
  captured?: ChessPiece;
  promotion?: PieceType;
}

// Unicode symbols for SVG / display
export const CHESS_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘",
    P: "♙",
  },
  black: {
    K: "♚",
    Q: "♛",
    R: "♜",
    B: "♝",
    N: "♞",
    P: "♟",
  },
};

// Base material values
const PIECE_VALUES: Record<PieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

// Piece-Square Tables (from White's perspective; inverted for Black)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

export function cloneChessBoard(b: ChessBoard): ChessBoard {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function createInitialChessBoard(): ChessBoard {
  const b: ChessBoard = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  const backRank: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];

  // Black pieces (row 0, 1)
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: backRank[c], color: "black" };
    b[1][c] = { type: "P", color: "black" };
  }

  // White pieces (row 6, 7)
  for (let c = 0; c < 8; c++) {
    b[6][c] = { type: "P", color: "white" };
    b[7][c] = { type: backRank[c], color: "white" };
  }

  return b;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Generate legal moves for a specific piece
export function getLegalMovesForPiece(
  b: ChessBoard,
  r: number,
  c: number
): ChessMove[] {
  const piece = b[r][c];
  if (!piece) return [];

  const moves: ChessMove[] = [];
  const color = piece.color;
  const oppColor: PieceColor = color === "white" ? "black" : "white";

  // Ray moving helper (for R, B, Q)
  const addRays = (dirs: [number, number][]) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const dest = b[nr][nc];
        if (!dest) {
          moves.push({ from: [r, c], to: [nr, nc] });
        } else {
          if (dest.color === oppColor) {
            moves.push({ from: [r, c], to: [nr, nc], captured: dest });
          }
          break; // Ray blocked
        }
        nr += dr;
        nc += dc;
      }
    }
  };

  switch (piece.type) {
    case "P": {
      const fwd = color === "white" ? -1 : 1;
      const startRow = color === "white" ? 6 : 1;
      const promoRow = color === "white" ? 0 : 7;

      // Single forward step
      const nr = r + fwd;
      if (inBounds(nr, c) && b[nr][c] === null) {
        if (nr === promoRow) {
          moves.push({ from: [r, c], to: [nr, c], promotion: "Q" });
        } else {
          moves.push({ from: [r, c], to: [nr, c] });
          // Double forward step from starting position
          const nnr = r + 2 * fwd;
          if (r === startRow && b[nnr][c] === null) {
            moves.push({ from: [r, c], to: [nnr, c] });
          }
        }
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (inBounds(nr, nc)) {
          const dest = b[nr][nc];
          if (dest && dest.color === oppColor) {
            if (nr === promoRow) {
              moves.push({ from: [r, c], to: [nr, nc], captured: dest, promotion: "Q" });
            } else {
              moves.push({ from: [r, c], to: [nr, nc], captured: dest });
            }
          }
        }
      }
      break;
    }

    case "N": {
      const knightDirs = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of knightDirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) {
          const dest = b[nr][nc];
          if (!dest) {
            moves.push({ from: [r, c], to: [nr, nc] });
          } else if (dest.color === oppColor) {
            moves.push({ from: [r, c], to: [nr, nc], captured: dest });
          }
        }
      }
      break;
    }

    case "B":
      addRays([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      break;

    case "R":
      addRays([[-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;

    case "Q":
      addRays([
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ]);
      break;

    case "K": {
      const kingDirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];
      for (const [dr, dc] of kingDirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) {
          const dest = b[nr][nc];
          if (!dest) {
            moves.push({ from: [r, c], to: [nr, nc] });
          } else if (dest.color === oppColor) {
            moves.push({ from: [r, c], to: [nr, nc], captured: dest });
          }
        }
      }
      break;
    }
  }

  return moves;
}

// Generate all legal moves for a color
export function getAllChessMoves(b: ChessBoard, color: PieceColor): ChessMove[] {
  const allMoves: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (b[r][c]?.color === color) {
        allMoves.push(...getLegalMovesForPiece(b, r, c));
      }
    }
  }

  // Sort captures first for Alpha-Beta pruning
  allMoves.sort((m1, m2) => {
    const val1 = m1.captured ? PIECE_VALUES[m1.captured.type] : 0;
    const val2 = m2.captured ? PIECE_VALUES[m2.captured.type] : 0;
    return val2 - val1;
  });

  return allMoves;
}

// Apply a move
export function applyChessMove(b: ChessBoard, move: ChessMove): ChessBoard {
  const newB = cloneChessBoard(b);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;

  const piece = { ...newB[fr][fc]! };
  if (move.promotion) {
    piece.type = move.promotion;
  }

  newB[tr][tc] = piece;
  newB[fr][fc] = null;

  return newB;
}

// Positional Heuristic Evaluation
function evaluateChessBoard(b: ChessBoard, aiColor: PieceColor): number {
  let score = 0;
  let whiteKingAlive = false;
  let blackKingAlive = false;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = b[r][c];
      if (!piece) continue;

      if (piece.type === "K") {
        if (piece.color === "white") whiteKingAlive = true;
        if (piece.color === "black") blackKingAlive = true;
      }

      const isWhite = piece.color === "white";
      const isAI = piece.color === aiColor;
      const mult = isAI ? 1 : -1;

      // Material value
      const material = PIECE_VALUES[piece.type];
      score += mult * material;

      // Positional PST value
      const pstRow = isWhite ? r : 7 - r;
      let pstVal = 0;
      switch (piece.type) {
        case "P": pstVal = PAWN_PST[pstRow][c]; break;
        case "N": pstVal = KNIGHT_PST[pstRow][c]; break;
        case "B": pstVal = BISHOP_PST[pstRow][c]; break;
        case "R": pstVal = ROOK_PST[pstRow][c]; break;
        case "Q": pstVal = QUEEN_PST[pstRow][c]; break;
        case "K": pstVal = KING_PST[pstRow][c]; break;
      }
      score += mult * pstVal;
    }
  }

  if (aiColor === "black") {
    if (!whiteKingAlive) return 100000;
    if (!blackKingAlive) return -100000;
  } else {
    if (!blackKingAlive) return 100000;
    if (!whiteKingAlive) return -100000;
  }

  return score;
}

// Alpha-Beta Search
function alphaBetaChess(
  b: ChessBoard,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor
): number {
  const oppColor: PieceColor = aiColor === "black" ? "white" : "black";
  const currentColor = isMaximizing ? aiColor : oppColor;

  const moves = getAllChessMoves(b, currentColor);

  if (moves.length === 0) {
    return isMaximizing ? -50000 + depth : 50000 - depth;
  }

  if (depth <= 0) {
    return evaluateChessBoard(b, aiColor);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextB = applyChessMove(b, move);
      const evalScore = alphaBetaChess(nextB, depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const nextB = applyChessMove(b, move);
      const evalScore = alphaBetaChess(nextB, depth - 1, alpha, beta, true, aiColor);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

// Find Best Move for AI
export function getBestChessMove(
  b: ChessBoard,
  aiColor: PieceColor = "black",
  depth = 3
): ChessMove | null {
  const moves = getAllChessMoves(b, aiColor);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of moves) {
    const nextB = applyChessMove(b, move);
    const score = alphaBetaChess(nextB, depth - 1, alpha, beta, false, aiColor);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  return bestMove;
}
