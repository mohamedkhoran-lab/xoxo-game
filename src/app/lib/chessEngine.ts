// ========================================================
// CHESS ENGINE — full rules (check, mate, stalemate, castling,
// en passant, promotion) + Alpha-Beta AI with piece-square tables
// ========================================================

export type PieceType = "P" | "R" | "N" | "B" | "Q" | "K";
export type PieceColor = "white" | "black";

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export type ChessBoard = (ChessPiece | null)[][];
export type Square = [number, number];

export interface ChessMove {
  from: Square;
  to: Square;
  captured?: ChessPiece;
  promotion?: PieceType;
  castle?: "K" | "Q";
  enPassant?: boolean;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface ChessState {
  board: ChessBoard;
  turn: PieceColor;
  castling: CastlingRights;
  /** Square a pawn can capture onto en passant (the skipped square), or null. */
  ep: Square | null;
  /** Half-moves since last capture or pawn move (50-move rule). */
  halfmove: number;
}

export type GameStatus =
  | { kind: "playing"; check: boolean }
  | { kind: "checkmate"; winner: PieceColor }
  | { kind: "stalemate" }
  | { kind: "draw"; reason: "material" | "fifty" };

export const CHESS_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
  black: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

const PIECE_VALUES: Record<PieceType, number> = {
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0,
};

// Piece-Square Tables (White's perspective, row 0 = rank 8)
const PST: Record<PieceType, number[][]> = {
  P: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  N: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  B: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  R: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  Q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  K: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

const other = (c: PieceColor): PieceColor => (c === "white" ? "black" : "white");
const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const KNIGHT_DIRS: Square[] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_DIRS: Square[] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG: Square[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTHO: Square[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function cloneChessBoard(b: ChessBoard): ChessBoard {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function createInitialChessBoard(): ChessBoard {
  const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: back[c], color: "black" };
    b[1][c] = { type: "P", color: "black" };
    b[6][c] = { type: "P", color: "white" };
    b[7][c] = { type: back[c], color: "white" };
  }
  return b;
}

export function createInitialState(): ChessState {
  return {
    board: createInitialChessBoard(),
    turn: "white",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    ep: null,
    halfmove: 0,
  };
}

export function findKing(b: ChessBoard, color: PieceColor): Square | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c]?.type === "K" && b[r][c]?.color === color) return [r, c];
  return null;
}

/** Is square (r,c) attacked by any piece of color `by`? */
export function isSquareAttacked(b: ChessBoard, r: number, c: number, by: PieceColor): boolean {
  // Pawns: a pawn of color `by` attacks diagonally forward
  const pr = by === "white" ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const p = inBounds(pr, c + dc) ? b[pr][c + dc] : null;
    if (p && p.color === by && p.type === "P") return true;
  }
  for (const [dr, dc] of KNIGHT_DIRS) {
    const nr = r + dr, nc = c + dc;
    const p = inBounds(nr, nc) ? b[nr][nc] : null;
    if (p && p.color === by && p.type === "N") return true;
  }
  for (const [dr, dc] of KING_DIRS) {
    const nr = r + dr, nc = c + dc;
    const p = inBounds(nr, nc) ? b[nr][nc] : null;
    if (p && p.color === by && p.type === "K") return true;
  }
  const ray = (dirs: Square[], types: PieceType[]) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const p = b[nr][nc];
        if (p) {
          if (p.color === by && types.includes(p.type)) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    return false;
  };
  return ray(DIAG, ["B", "Q"]) || ray(ORTHO, ["R", "Q"]);
}

export function isInCheck(b: ChessBoard, color: PieceColor): boolean {
  const k = findKing(b, color);
  return k ? isSquareAttacked(b, k[0], k[1], other(color)) : false;
}

/** Pseudo-legal moves (may leave own king in check). */
function pseudoMoves(s: ChessState, r: number, c: number): ChessMove[] {
  const b = s.board;
  const piece = b[r][c];
  if (!piece) return [];
  const color = piece.color;
  const opp = other(color);
  const moves: ChessMove[] = [];

  const push = (tr: number, tc: number, extra: Partial<ChessMove> = {}) => {
    const dest = b[tr][tc];
    moves.push({ from: [r, c], to: [tr, tc], ...(dest ? { captured: dest } : {}), ...extra });
  };

  const rays = (dirs: Square[]) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const dest = b[nr][nc];
        if (!dest) push(nr, nc);
        else {
          if (dest.color === opp) push(nr, nc);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  };

  switch (piece.type) {
    case "P": {
      const fwd = color === "white" ? -1 : 1;
      const start = color === "white" ? 6 : 1;
      const promoRow = color === "white" ? 0 : 7;
      const addPawn = (tr: number, tc: number, extra: Partial<ChessMove> = {}) => {
        if (tr === promoRow) {
          for (const p of ["Q", "R", "B", "N"] as PieceType[]) push(tr, tc, { ...extra, promotion: p });
        } else push(tr, tc, extra);
      };
      const nr = r + fwd;
      if (inBounds(nr, c) && !b[nr][c]) {
        addPawn(nr, c);
        if (r === start && !b[r + 2 * fwd][c]) push(r + 2 * fwd, c);
      }
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const dest = b[nr][nc];
        if (dest && dest.color === opp) addPawn(nr, nc);
        else if (s.ep && s.ep[0] === nr && s.ep[1] === nc) {
          moves.push({
            from: [r, c],
            to: [nr, nc],
            enPassant: true,
            captured: b[r][nc] ?? { type: "P", color: opp },
          });
        }
      }
      break;
    }
    case "N":
      for (const [dr, dc] of KNIGHT_DIRS) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && b[nr][nc]?.color !== color) push(nr, nc);
      }
      break;
    case "B": rays(DIAG); break;
    case "R": rays(ORTHO); break;
    case "Q": rays([...DIAG, ...ORTHO]); break;
    case "K": {
      for (const [dr, dc] of KING_DIRS) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && b[nr][nc]?.color !== color) push(nr, nc);
      }
      // Castling (roque)
      const home = color === "white" ? 7 : 0;
      if (r === home && c === 4 && !isSquareAttacked(b, home, 4, opp)) {
        const kSide = color === "white" ? s.castling.wK : s.castling.bK;
        const qSide = color === "white" ? s.castling.wQ : s.castling.bQ;
        const rook = (cc: number) => b[home][cc]?.type === "R" && b[home][cc]?.color === color;
        if (kSide && rook(7) && !b[home][5] && !b[home][6] &&
            !isSquareAttacked(b, home, 5, opp) && !isSquareAttacked(b, home, 6, opp)) {
          moves.push({ from: [r, c], to: [home, 6], castle: "K" });
        }
        if (qSide && rook(0) && !b[home][1] && !b[home][2] && !b[home][3] &&
            !isSquareAttacked(b, home, 3, opp) && !isSquareAttacked(b, home, 2, opp)) {
          moves.push({ from: [r, c], to: [home, 2], castle: "Q" });
        }
      }
      break;
    }
  }
  return moves;
}

/** Apply a move and return the new state (turn switched). */
export function applyMove(s: ChessState, m: ChessMove): ChessState {
  const b = cloneChessBoard(s.board);
  const [fr, fc] = m.from;
  const [tr, tc] = m.to;
  const piece = b[fr][fc]!;
  const castling = { ...s.castling };

  b[tr][tc] = m.promotion ? { type: m.promotion, color: piece.color } : piece;
  b[fr][fc] = null;

  if (m.enPassant) b[fr][tc] = null;
  if (m.castle === "K") { b[tr][5] = b[tr][7]; b[tr][7] = null; }
  if (m.castle === "Q") { b[tr][3] = b[tr][0]; b[tr][0] = null; }

  // Update castling rights
  if (piece.type === "K") {
    if (piece.color === "white") { castling.wK = false; castling.wQ = false; }
    else { castling.bK = false; castling.bQ = false; }
  }
  const touch = (r: number, c: number) => {
    if (r === 7 && c === 0) castling.wQ = false;
    if (r === 7 && c === 7) castling.wK = false;
    if (r === 0 && c === 0) castling.bQ = false;
    if (r === 0 && c === 7) castling.bK = false;
  };
  touch(fr, fc);
  touch(tr, tc);

  const ep: Square | null =
    piece.type === "P" && Math.abs(tr - fr) === 2 ? [(fr + tr) / 2, fc] : null;

  return {
    board: b,
    turn: other(s.turn),
    castling,
    ep,
    halfmove: piece.type === "P" || m.captured ? 0 : s.halfmove + 1,
  };
}

/** Fully legal moves for the piece at (r,c). */
export function getLegalMoves(s: ChessState, r: number, c: number): ChessMove[] {
  const piece = s.board[r][c];
  if (!piece) return [];
  return pseudoMoves(s, r, c).filter((m) => !isInCheck(applyMove(s, m).board, piece.color));
}

export function getAllLegalMoves(s: ChessState, color: PieceColor = s.turn): ChessMove[] {
  const st = color === s.turn ? s : { ...s, turn: color };
  const out: ChessMove[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (st.board[r][c]?.color === color) out.push(...getLegalMoves(st, r, c));
  return out;
}

function insufficientMaterial(b: ChessBoard): boolean {
  const minors: { color: PieceColor; sq: number }[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p.type === "K") continue;
      if (p.type === "N" || p.type === "B") minors.push({ color: p.color, sq: (r + c) % 2 });
      else return false;
    }
  return minors.length <= 1;
}

export function getGameStatus(s: ChessState): GameStatus {
  const check = isInCheck(s.board, s.turn);
  if (getAllLegalMoves(s).length === 0) {
    return check ? { kind: "checkmate", winner: other(s.turn) } : { kind: "stalemate" };
  }
  if (insufficientMaterial(s.board)) return { kind: "draw", reason: "material" };
  if (s.halfmove >= 100) return { kind: "draw", reason: "fifty" };
  return { kind: "playing", check };
}

// ========================================================
// AI
// ========================================================
function evaluate(b: ChessBoard, ai: PieceColor): number {
  let score = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) continue;
      const row = p.color === "white" ? r : 7 - r;
      const v = PIECE_VALUES[p.type] + PST[p.type][row][c];
      score += p.color === ai ? v : -v;
    }
  return score;
}

function orderMoves(moves: ChessMove[], b: ChessBoard): ChessMove[] {
  const val = (m: ChessMove) =>
    (m.captured ? 10 * PIECE_VALUES[m.captured.type] - PIECE_VALUES[b[m.from[0]][m.from[1]]!.type] / 10 : 0) +
    (m.promotion === "Q" ? 800 : 0) + (m.castle ? 30 : 0);
  return moves.sort((a, z) => val(z) - val(a));
}

const MATE = 1_000_000;

function search(s: ChessState, depth: number, alpha: number, beta: number, ai: PieceColor, ply: number): number {
  const moves = getAllLegalMoves(s);
  if (moves.length === 0) {
    if (isInCheck(s.board, s.turn)) return s.turn === ai ? -MATE + ply : MATE - ply;
    return 0;
  }
  if (depth <= 0) return evaluate(s.board, ai);

  orderMoves(moves, s.board);
  const maximizing = s.turn === ai;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const v = search(applyMove(s, m), depth - 1, alpha, beta, ai, ply + 1);
    if (maximizing) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
    else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

export function getBestMove(s: ChessState, depth = 3): ChessMove | null {
  const ai = s.turn;
  const moves = orderMoves(getAllLegalMoves(s), s.board);
  if (moves.length === 0) return null;
  let best: ChessMove[] = [];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const m of moves) {
    const v = search(applyMove(s, m), depth - 1, alpha, Infinity, ai, 1);
    if (v > bestScore) { bestScore = v; best = [m]; }
    else if (v === bestScore) best.push(m);
    // alpha = best-1 keeps ties exact (a result == bestScore is a true score, not a bound)
    alpha = bestScore - 1;
  }
  // Small variety among equally good moves
  return best[Math.floor(Math.random() * best.length)];
}
