// Types
export type Player = "X" | "O" | null;
export type Board = Player[];

// All winning lines
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

const CORNERS = [0, 2, 6, 8];
const EDGES = [1, 3, 5, 7];
const CENTER = 4;

// Opposite corners mapping
const OPPOSITE_CORNER: Record<number, number> = {
  0: 8, 2: 6, 6: 2, 8: 0,
};

// Check winner
export function checkWinner(board: Board): Player {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Get winning line indices
export function getWinningLine(board: Board): number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

// Check if board is full
export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

// Count how many pieces are on the board
function countPieces(board: Board): number {
  return board.filter((cell) => cell !== null).length;
}

// =============================================
// Minimax algorithm — guaranteed optimal play
// =============================================
function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  machineSymbol: Player,
  humanSymbol: Player
): number {
  const winner = checkWinner(board);

  if (winner === machineSymbol) return 10 - depth;
  if (winner === humanSymbol) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = machineSymbol;
        const score = minimax(board, depth + 1, false, machineSymbol, humanSymbol);
        board[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = humanSymbol;
        const score = minimax(board, depth + 1, true, machineSymbol, humanSymbol);
        board[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
}

// =============================================
// Check if placing 'player' at 'pos' creates a fork
// (two distinct winning threats simultaneously)
// =============================================
function createsFork(board: Board, pos: number, player: Player): boolean {
  const testBoard = [...board];
  testBoard[pos] = player;
  let threats = 0;
  for (const [a, b, c] of LINES) {
    const cells = [testBoard[a], testBoard[b], testBoard[c]];
    const playerCount = cells.filter((c) => c === player).length;
    const emptyCount = cells.filter((c) => c === null).length;
    if (playerCount === 2 && emptyCount === 1) threats++;
  }
  return threats >= 2;
}

// =============================================
// Find a move that wins immediately
// =============================================
function findWinningMove(board: Board, player: Player): number | null {
  for (const [a, b, c] of LINES) {
    const cells = [board[a], board[b], board[c]];
    const indices = [a, b, c];
    const playerCount = cells.filter((c) => c === player).length;
    const emptyCount = cells.filter((c) => c === null).length;
    if (playerCount === 2 && emptyCount === 1) {
      const emptyIdx = indices.find((idx) => board[idx] === null);
      if (emptyIdx !== undefined) return emptyIdx;
    }
  }
  return null;
}

// =============================================
// Strategic opening moves for the AI
// =============================================
function getOpeningMove(
  board: Board,
  machineSymbol: Player,
  humanSymbol: Player
): number | null {
  const pieces = countPieces(board);

  // ---- CASE 1: Machine plays FIRST (X) ----
  if (machineSymbol === "X") {
    // First move: always play a corner
    if (pieces === 0) {
      return CORNERS[Math.floor(Math.random() * CORNERS.length)];
    }

    // Second move for machine (pieces === 2, machine placed 1, human placed 1)
    if (pieces === 2) {
      const machinePos = board.findIndex((c) => c === machineSymbol);

      // Human did NOT play center → victory is guaranteed, use minimax to exploit
      if (board[CENTER] !== humanSymbol) {
        return null; // let minimax handle — it will find the winning path
      }

      // Human played center → play opposite corner (catty-corner)
      if (CORNERS.includes(machinePos)) {
        const oppositeCorner = OPPOSITE_CORNER[machinePos];
        if (!board[oppositeCorner]) return oppositeCorner;
      }
    }

    // Third move for machine (pieces === 4)
    if (pieces === 4) {
      // If we have two corners and human has center, check for fork opportunities
      const machinePieces = board
        .map((c, i) => (c === machineSymbol ? i : -1))
        .filter((i) => i !== -1);

      // If both machine pieces are in opposite corners and human played center
      if (
        machinePieces.length === 2 &&
        machinePieces.every((p) => CORNERS.includes(p)) &&
        board[CENTER] === humanSymbol
      ) {
        // If human's second piece is in a corner, take remaining corner for a fork
        const humanCorners = CORNERS.filter((c) => board[c] === humanSymbol);
        if (humanCorners.length > 0) {
          const emptyCorners = CORNERS.filter((c) => board[c] === null);
          for (const corner of emptyCorners) {
            if (createsFork(board, corner, machineSymbol)) return corner;
          }
          if (emptyCorners.length > 0) return emptyCorners[0];
        }
      }

      // Otherwise let minimax handle
      return null;
    }
  }

  // ---- CASE 2: Machine plays SECOND (O) ----
  if (machineSymbol === "O") {
    // First response move (pieces === 1, human placed 1)
    if (pieces === 1) {
      // Human opened at center → take a corner
      if (board[CENTER] === humanSymbol) {
        return CORNERS[Math.floor(Math.random() * CORNERS.length)];
      }

      // Human opened in a corner → take center
      const humanCorner = CORNERS.find((c) => board[c] === humanSymbol);
      if (humanCorner !== undefined) {
        return CENTER;
      }

      // Human opened on an edge → take center
      const humanEdge = EDGES.find((e) => board[e] === humanSymbol);
      if (humanEdge !== undefined) {
        return CENTER;
      }
    }
  }

  return null; // no special opening, use full strategy
}

// =============================================
// Decision tree priority hierarchy
// =============================================
function getStrategicMove(
  board: Board,
  machineSymbol: Player,
  humanSymbol: Player
): number | null {
  // Priority 1: Win immediately
  const winMove = findWinningMove(board, machineSymbol);
  if (winMove !== null) return winMove;

  // Priority 2: Block opponent from winning
  const blockMove = findWinningMove(board, humanSymbol);
  if (blockMove !== null) return blockMove;

  // Priority 3: Create a fork (two simultaneous threats)
  const emptyPositions = board
    .map((c, i) => (c === null ? i : -1))
    .filter((i) => i !== -1);

  for (const pos of emptyPositions) {
    if (createsFork(board, pos, machineSymbol)) return pos;
  }

  // Priority 4: Block opponent's fork
  // If opponent can create a fork, either force them to defend elsewhere
  // or directly block the fork position
  const opponentForkPositions: number[] = [];
  for (const pos of emptyPositions) {
    if (createsFork(board, pos, humanSymbol)) {
      opponentForkPositions.push(pos);
    }
  }

  if (opponentForkPositions.length === 1) {
    return opponentForkPositions[0];
  }

  if (opponentForkPositions.length > 1) {
    // Force opponent to defend by creating a two-in-a-row,
    // but only if our forcing move doesn't create a fork for them
    for (const pos of emptyPositions) {
      const testBoard = [...board];
      testBoard[pos] = machineSymbol;

      // Check if this creates a line of 2 for us
      let createsThreat = false;
      for (const [a, b, c] of LINES) {
        const cells = [testBoard[a], testBoard[b], testBoard[c]];
        const machineCount = cells.filter((c) => c === machineSymbol).length;
        const emptyCount = cells.filter((c) => c === null).length;
        if (machineCount === 2 && emptyCount === 1) {
          createsThreat = true;
          // Make sure blocking us doesn't give opponent a fork
          const blockIdx = [a, b, c].find((idx) => testBoard[idx] === null);
          if (blockIdx !== undefined && !opponentForkPositions.includes(blockIdx)) {
            return pos;
          }
        }
      }
      if (createsThreat) continue;
    }
    // If no safe forcing move, block one of the fork positions
    return opponentForkPositions[0];
  }

  // Priority 5: Take center
  if (board[CENTER] === null) return CENTER;

  // Priority 6: Take opposite corner
  for (const corner of CORNERS) {
    if (board[corner] === humanSymbol) {
      const opp = OPPOSITE_CORNER[corner];
      if (board[opp] === null) return opp;
    }
  }

  // Priority 7: Take any empty corner
  const emptyCorners = CORNERS.filter((c) => board[c] === null);
  if (emptyCorners.length > 0) {
    return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
  }

  // Priority 8: Take any empty edge
  const emptyEdges = EDGES.filter((e) => board[e] === null);
  if (emptyEdges.length > 0) {
    return emptyEdges[Math.floor(Math.random() * emptyEdges.length)];
  }

  return null;
}

// =============================================
// Main AI entry point — 100% unbeatable
// Combines strategic openings + priority hierarchy + Minimax fallback
// =============================================
export function getBestMove(
  board: Board,
  machineSymbol: Player,
  humanSymbol: Player
): number {
  // 1) Try strategic opening moves
  const openingMove = getOpeningMove(board, machineSymbol, humanSymbol);
  if (openingMove !== null) return openingMove;

  // 2) Try the decision tree priorities
  const strategicMove = getStrategicMove(board, machineSymbol, humanSymbol);
  if (strategicMove !== null) return strategicMove;

  // 3) Fallback to pure Minimax (guaranteed optimal)
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = machineSymbol;
      const score = minimax(board, 0, false, machineSymbol, humanSymbol);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }

  return bestMove;
}
