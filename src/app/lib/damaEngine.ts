// ========================================================
// DAMA AI ENGINE — Alpha-Beta Minimax with Tactical Traps
// ========================================================

export type PlayerId = 1 | 2;

export interface Piece {
  player: PlayerId;
  isKing: boolean;
}

export type Board = (Piece | null)[][];

export interface MoveStep {
  from: [number, number];
  to: [number, number];
  captured?: [number, number];
  isCapture: boolean;
}

export interface FullMove {
  from: [number, number];
  to: [number, number];
  steps: MoveStep[];
  isCapture: boolean;
  capturedPieces: [number, number][];
}

const ALL_DIAGS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

// Helper: clone board
export function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

// Check if square is inside board
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Find all single jumps from (r, c)
function getSingleJumps(
  b: Board,
  r: number,
  c: number,
  piece: Piece
): { to: [number, number]; captured: [number, number] }[] {
  const opponent: PlayerId = piece.player === 1 ? 2 : 1;
  const jumps: { to: [number, number]; captured: [number, number] }[] = [];

  // Normal pieces can only capture forward; only Kings can capture in all 4 directions
  const jumpDirs = piece.isKing
    ? ALL_DIAGS
    : piece.player === 1
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];

  for (const [dr, dc] of jumpDirs) {
    const midR = r + dr;
    const midC = c + dc;
    const landR = r + 2 * dr;
    const landC = c + 2 * dc;

    if (
      inBounds(landR, landC) &&
      b[midR][midC]?.player === opponent &&
      b[landR][landC] === null
    ) {
      jumps.push({ to: [landR, landC], captured: [midR, midC] });
    }
  }

  return jumps;
}

// Recursively build all complete multi-jump capture chains
function getCaptureChains(
  b: Board,
  r: number,
  c: number,
  piece: Piece,
  currentSteps: MoveStep[] = [],
  capturedSoFar: [number, number][] = []
): FullMove[] {
  const jumps = getSingleJumps(b, r, c, piece);

  // Filter jumps that would re-capture an already captured piece in this chain
  const validJumps = jumps.filter(
    (j) => !capturedSoFar.some(([cr, cc]) => cr === j.captured[0] && cc === j.captured[1])
  );

  if (validJumps.length === 0) {
    if (currentSteps.length > 0) {
      return [
        {
          from: currentSteps[0].from,
          to: [r, c],
          steps: currentSteps,
          isCapture: true,
          capturedPieces: capturedSoFar,
        },
      ];
    }
    return [];
  }

  const allChains: FullMove[] = [];

  for (const jump of validJumps) {
    const nextBoard = cloneBoard(b);
    const moving = { ...piece };

    // Move piece on simulated board
    nextBoard[jump.to[0]][jump.to[1]] = moving;
    nextBoard[r][c] = null;
    nextBoard[jump.captured[0]][jump.captured[1]] = null;

    // King crowning check
    if (moving.player === 1 && jump.to[0] === 0) moving.isKing = true;
    if (moving.player === 2 && jump.to[0] === 7) moving.isKing = true;

    const step: MoveStep = {
      from: [r, c],
      to: jump.to,
      captured: jump.captured,
      isCapture: true,
    };

    const nextChains = getCaptureChains(
      nextBoard,
      jump.to[0],
      jump.to[1],
      moving,
      [...currentSteps, step],
      [...capturedSoFar, jump.captured]
    );

    allChains.push(...nextChains);
  }

  return allChains;
}

// Get all legal moves for a player (applying forced capture rule)
export function getAllLegalMoves(b: Board, player: PlayerId): FullMove[] {
  const captureMoves: FullMove[] = [];
  const simpleMoves: FullMove[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = b[r][c];
      if (piece && piece.player === player) {
        // 1) Find captures
        const chains = getCaptureChains(b, r, c, piece);
        if (chains.length > 0) {
          captureMoves.push(...chains);
        }

        // 2) Find simple moves
        const moveDirs = piece.isKing
          ? ALL_DIAGS
          : piece.player === 1
          ? [[-1, -1], [-1, 1]]
          : [[1, -1], [1, 1]];

        for (const [dr, dc] of moveDirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc) && b[nr][nc] === null) {
            simpleMoves.push({
              from: [r, c],
              to: [nr, nc],
              steps: [{ from: [r, c], to: [nr, nc], isCapture: false }],
              isCapture: false,
              capturedPieces: [],
            });
          }
        }
      }
    }
  }

  // FORCED CAPTURE: If any capture exists, ONLY captures are legal!
  if (captureMoves.length > 0) {
    // Sort captures by number of pieces captured (prioritize big rafles!)
    captureMoves.sort((a, b) => b.capturedPieces.length - a.capturedPieces.length);
    return captureMoves;
  }

  return simpleMoves;
}

// Apply a FullMove to a board and return new board
export function applyFullMove(b: Board, move: FullMove): Board {
  const newB = cloneBoard(b);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = { ...newB[fr][fc]! };

  newB[fr][fc] = null;
  newB[tr][tc] = piece;

  for (const [cr, cc] of move.capturedPieces) {
    newB[cr][cc] = null;
  }

  // Crowning
  if (piece.player === 1 && tr === 0) piece.isKing = true;
  if (piece.player === 2 && tr === 7) piece.isKing = true;

  return newB;
}

// ========================================================
// HEURISTIC EVALUATION FUNCTION (Positional + Tactical)
// ========================================================
function evaluateBoard(b: Board, aiPlayer: PlayerId): number {
  const humanPlayer: PlayerId = aiPlayer === 1 ? 2 : 1;
  let score = 0;

  let aiPieces = 0;
  let humanPieces = 0;
  let aiKings = 0;
  let humanKings = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = b[r][c];
      if (!piece) continue;

      const isAI = piece.player === aiPlayer;
      const mult = isAI ? 1 : -1;

      if (isAI) {
        aiPieces++;
        if (piece.isKing) aiKings++;
      } else {
        humanPieces++;
        if (piece.isKing) humanKings++;
      }

      // Base value: Normal piece = 100, King = 320
      const baseVal = piece.isKing ? 320 : 100;
      score += mult * baseVal;

      // Positional Value:
      // 1) Center Control (columns 2, 3, 4, 5 and rows 2, 3, 4, 5)
      if (c >= 2 && c <= 5 && r >= 2 && r <= 5) {
        score += mult * (piece.isKing ? 25 : 18);
      }

      // 2) Edge Safety (edges 0 and 7 can't be jumped from the side)
      if (c === 0 || c === 7) {
        score += mult * 12;
      }

      // 3) Advancement towards promotion
      if (!piece.isKing) {
        const advancement = aiPlayer === 2 ? r : 7 - r;
        score += mult * advancement * 5;
      }

      // 4) Back Rank Defense (protecting the promotion line)
      if (!piece.isKing) {
        if (aiPlayer === 2 && r === 0) score += 20; // AI back row
        if (aiPlayer === 1 && r === 7) score += 20;
        if (humanPlayer === 1 && r === 7) score -= 20; // Human back row
        if (humanPlayer === 2 && r === 0) score -= 20;
      }
    }
  }

  // Decisive game over scores
  if (humanPieces === 0) return 100000;
  if (aiPieces === 0) return -100000;

  // Mobility bonus
  const aiMoves = getAllLegalMoves(b, aiPlayer).length;
  const humanMoves = getAllLegalMoves(b, humanPlayer).length;
  score += (aiMoves - humanMoves) * 8;

  if (humanMoves === 0) return 99000;
  if (aiMoves === 0) return -99000;

  return score;
}

// ========================================================
// ALPHA-BETA MINIMAX SEARCH
// ========================================================
function alphaBeta(
  b: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: PlayerId
): number {
  const humanPlayer: PlayerId = aiPlayer === 1 ? 2 : 1;
  const currentActor = isMaximizing ? aiPlayer : humanPlayer;

  const legalMoves = getAllLegalMoves(b, currentActor);

  // Terminal state: no moves left
  if (legalMoves.length === 0) {
    return isMaximizing ? -90000 + depth : 90000 - depth;
  }

  if (depth <= 0) {
    return evaluateBoard(b, aiPlayer);
  }

  // Move ordering: put captures first for massive alpha-beta cutoffs
  legalMoves.sort((m1, m2) => {
    const c1 = m1.capturedPieces.length;
    const c2 = m2.capturedPieces.length;
    return c2 - c1;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      const nextB = applyFullMove(b, move);
      // Quiescence extension: if move was a capture, extend search depth by 1
      const depthExtension = move.isCapture && depth === 1 ? 1 : 0;
      const evaluation = alphaBeta(
        nextB,
        depth - 1 + depthExtension,
        alpha,
        beta,
        false,
        aiPlayer
      );
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      const nextB = applyFullMove(b, move);
      const depthExtension = move.isCapture && depth === 1 ? 1 : 0;
      const evaluation = alphaBeta(
        nextB,
        depth - 1 + depthExtension,
        alpha,
        beta,
        true,
        aiPlayer
      );
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

// ========================================================
// GET BEST AI MOVE — Unbeatable & Tactical
// ========================================================
export function getBestDamaMove(
  b: Board,
  aiPlayer: PlayerId,
  searchDepth = 6
): FullMove | null {
  const legalMoves = getAllLegalMoves(b, aiPlayer);

  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) return legalMoves[0];

  // Sort captures first
  legalMoves.sort((m1, m2) => m2.capturedPieces.length - m1.capturedPieces.length);

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of legalMoves) {
    const nextB = applyFullMove(b, move);
    const score = alphaBeta(nextB, searchDepth - 1, alpha, beta, false, aiPlayer);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  return bestMove;
}
