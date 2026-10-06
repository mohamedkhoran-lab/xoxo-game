// Types
export type Player = "X" | "O" | null;
export type Board = Player[];

// Check winner
export function checkWinner(board: Board): Player {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Get winning line indices
export function getWinningLine(board: Board): number[] | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (const line of lines) {
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

// Minimax algorithm — Machine is always "O"
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

// Get best move for machine
export function getBestMove(
  board: Board,
  machineSymbol: Player,
  humanSymbol: Player
): number {
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
