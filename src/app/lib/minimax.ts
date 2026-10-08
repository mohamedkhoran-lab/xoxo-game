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
// Strategic opening moves for the AI (TicTacToeFun Guide)
// =============================================
function getOpeningMove(
  board: Board,
  machineSymbol: Player,
  humanSymbol: Player
): number | null {
  const pieces = countPieces(board);

  // ---- CASE 1: Machine plays FIRST (X) ----
  if (machineSymbol === "X") {
    // First move: The TicTacToeFun guide strongly recommends opening in the center (4 lines).
    // Center is simplest and covers half the winning lines; corners are also valid.
    if (pieces === 0) {
      // 70% Center (as recommended by the guide), 30% Corner for gameplay variety
      return Math.random() < 0.7
        ? CENTER
        : CORNERS[Math.floor(Math.random() * CORNERS.length)];
    }

    // Second move for machine (pieces === 2, machine placed 1, human placed 1)
    if (pieces === 2) {
      const machinePos = board.findIndex((c) => c === machineSymbol);

      // Subcase A: Machine opened in the CENTER (Move 1 = Center)
      if (machinePos === CENTER) {
        // If human played a corner -> Move 3: Play diagonally opposite corner to threaten a fork!
        const humanCorner = CORNERS.find((c) => board[c] === humanSymbol);
        if (humanCorner !== undefined) {
          const oppCorner = OPPOSITE_CORNER[humanCorner];
          if (board[oppCorner] === null) return oppCorner;
        }

        // If human played an edge (weak move) -> let strategic/minimax punish and force a win
        return null;
      }

      // Subcase B: Machine opened in a CORNER
      if (CORNERS.includes(machinePos)) {
        // Human did NOT play center → victory is guaranteed, use minimax to exploit
        if (board[CENTER] !== humanSymbol) {
          return null; // let minimax handle — it will find the winning path
        }

        // Human played center → play opposite corner (catty-corner)
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
      // Human opened at center → MUST take a corner (edge is a forced loss)
      if (board[CENTER] === humanSymbol) {
        return CORNERS[Math.floor(Math.random() * CORNERS.length)];
      }

      // Human opened in a corner → MUST take center (any other move is a forced loss)
      const humanCorner = CORNERS.find((c) => board[c] === humanSymbol);
      if (humanCorner !== undefined) {
        return CENTER;
      }

      // Human opened on an edge (beginner mistake) → take center
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

// =============================================
// Strategy Coach / Hint Helper (Based on TicTacToeFun Guide)
// Evaluates the board and returns the best move with the exact rule explanation
// =============================================
export interface StrategyHint {
  bestMove: number;
  priorityLevel: number;
  ruleTitle: string;
  ruleDescription: string;
  category: "win" | "block" | "fork" | "block-fork" | "center" | "opposite-corner" | "corner" | "edge";
}

export function getStrategyHint(
  board: Board,
  player: Player,
  opponent: Player
): StrategyHint | null {
  const emptyPositions = board
    .map((c, i) => (c === null ? i : -1))
    .filter((i) => i !== -1);

  if (emptyPositions.length === 0) return null;

  // 1. Règle 1 : Gagner immédiatement
  const winMove = findWinningMove(board, player);
  if (winMove !== null) {
    return {
      bestMove: winMove,
      priorityLevel: 1,
      category: "win",
      ruleTitle: "Règle 1 : Gagner immédiatement",
      ruleDescription: "Tu as 2 pions alignés ! Termine la ligne sur cette case pour gagner la partie maintenant.",
    };
  }

  // 2. Règle 2 : Bloquer la menace immédiate
  const blockMove = findWinningMove(board, opponent);
  if (blockMove !== null) {
    return {
      bestMove: blockMove,
      priorityLevel: 2,
      category: "block",
      ruleTitle: "Règle 2 : Bloquer la menace adverse",
      ruleDescription: "L'adversaire a 2 pions alignés et menace de gagner. Bloque cette case impérativement !",
    };
  }

  // 3. Règle 3 : Créer une Fourchette (Fork)
  for (const pos of emptyPositions) {
    if (createsFork(board, pos, player)) {
      return {
        bestMove: pos,
        priorityLevel: 3,
        category: "fork",
        ruleTitle: "Règle 3 : Créer une Fourchette (Fork)",
        ruleDescription: "Ce coup crée deux menaces de victoire à la fois. L'adversaire ne pourra en parer qu'une seule !",
      };
    }
  }

  // 4. Règle 4 : Bloquer la Fourchette adverse
  const opponentForkPositions = emptyPositions.filter((pos) =>
    createsFork(board, pos, opponent)
  );

  if (opponentForkPositions.length > 0) {
    // Essayer de contre-attaquer en forçant une défense sûre
    for (const pos of emptyPositions) {
      const testBoard = [...board];
      testBoard[pos] = player;
      let createsThreat = false;
      for (const [a, b, c] of LINES) {
        const cells = [testBoard[a], testBoard[b], testBoard[c]];
        const pCount = cells.filter((c) => c === player).length;
        const eCount = cells.filter((c) => c === null).length;
        if (pCount === 2 && eCount === 1) {
          createsThreat = true;
          const blockIdx = [a, b, c].find((idx) => testBoard[idx] === null);
          if (blockIdx !== undefined && !opponentForkPositions.includes(blockIdx)) {
            return {
              bestMove: pos,
              priorityLevel: 4,
              category: "block-fork",
              ruleTitle: "Règle 4 : Forcer la défense / Contre-attaquer le Fork",
              ruleDescription: "Attaque avec un 2-en-ligne qui force l'adversaire à défendre sans lui permettre de créer son fork.",
            };
          }
        }
      }
      if (createsThreat) continue;
    }

    return {
      bestMove: opponentForkPositions[0],
      priorityLevel: 4,
      category: "block-fork",
      ruleTitle: "Règle 4 : Bloquer la Fourchette adverse",
      ruleDescription: "Bloque la case clé où l'adversaire prépare un double piège fatal.",
    };
  }

  // 5. Règle 5 : Prendre le Centre
  if (board[CENTER] === null) {
    return {
      bestMove: CENTER,
      priorityLevel: 5,
      category: "center",
      ruleTitle: "Règle 5 : Prendre le Centre (4 lignes)",
      ruleDescription: "Le centre est la case maîtresse du jeu : elle contrôle 4 lignes gagnantes (2 diagonales, 1 ligne, 1 colonne).",
    };
  }

  // 6. Règle 6 : Jouer le Coin Opposé
  for (const corner of CORNERS) {
    if (board[corner] === opponent) {
      const opp = OPPOSITE_CORNER[corner];
      if (board[opp] === null) {
        return {
          bestMove: opp,
          priorityLevel: 6,
          category: "opposite-corner",
          ruleTitle: "Règle 6 : Jouer le Coin Opposé",
          ruleDescription: "L'adversaire occupe un coin. Prendre le coin diagonalement opposé prépare des contres favorables.",
        };
      }
    }
  }

  // 7. Règle 7 : Prendre un Coin libre (3 lignes)
  const emptyCorners = CORNERS.filter((c) => board[c] === null);
  if (emptyCorners.length > 0) {
    return {
      bestMove: emptyCorners[0],
      priorityLevel: 7,
      category: "corner",
      ruleTitle: "Règle 7 : Prendre un Coin libre (3 lignes)",
      ruleDescription: "Les coins contrôlent 3 lignes gagnantes chacun (le 2ème type de case le plus fort).",
    };
  }

  // 8. Règle 8 : Prendre une Bordure libre (2 lignes)
  const emptyEdges = EDGES.filter((e) => board[e] === null);
  if (emptyEdges.length > 0) {
    return {
      bestMove: emptyEdges[0],
      priorityLevel: 8,
      category: "edge",
      ruleTitle: "Règle 8 : Prendre une Bordure libre (2 lignes)",
      ruleDescription: "Les bordures ne contrôlent que 2 lignes gagnantes. À occuper en dernier lieu.",
    };
  }

  return null;
}

// =============================================
// Reference Data for Strategy Guide (TicTacToeFun Guide)
// =============================================
export const STRATEGY_GUIDE_DATA = {
  title: "Comment Ne Jamais Perdre à XO (Tic-Tac-Toe)",
  subtitle: "Guide Stratégique Complet inspiré de TicTacToeFun — Jeu résolu mathématiquement",
  corePrinciples: [
    {
      number: 1,
      title: "Gagne toujours si tu peux",
      desc: "Si tu as 2 pions alignés et la 3ème case vide, joue là immédiatement. Finis la partie sans te déconcentrer.",
    },
    {
      number: 2,
      title: "Bloque toujours si tu dois",
      desc: "Si ton adversaire a 2 pions alignés, bloque impérativement la 3ème case. C'est la priorité absolue avant tout autre coup.",
    },
  ],
  squarePower: [
    { name: "Centre", lines: 4, tag: "Le plus puissant", detail: "2 diagonales + ligne milieu + colonne milieu" },
    { name: "Coins (4)", lines: 3, tag: "Très puissant", detail: "1 ligne + 1 colonne + 1 diagonale chacun" },
    { name: "Bordures (4)", lines: 2, tag: "Le plus faible", detail: "1 ligne + 1 colonne seulement chacun" },
  ],
  priorityList: [
    { step: 1, name: "Gagner immédiatement", summary: "Compléter une ligne de 3." },
    { step: 2, name: "Bloquer immédiatement", summary: "Bloquer la ligne adverse de 2." },
    { step: 3, name: "Créer une fourchette (Fork)", summary: "Créer 2 menaces de victoire à la fois." },
    { step: 4, name: "Bloquer la fourchette adverse", summary: "Empêcher l'adversaire de créer 2 menaces." },
    { step: 5, name: "Prendre le centre", summary: "Case la plus forte (4 lignes)." },
    { step: 6, name: "Jouer le coin opposé", summary: "En réponse au coin de l'adversaire." },
    { step: 7, name: "Prendre un coin vide", summary: "Coins (3 lignes chacun)." },
    { step: 8, name: "Prendre une bordure vide", summary: "Bordures (2 lignes chacune)." },
  ],
  openings: {
    firstPlayerX: [
      {
        move: "Coup 1",
        action: "Prendre le Centre",
        why: "Contrôle 4 lignes potentielles. Met immédiatement la pression sur l'adversaire.",
      },
      {
        move: "Coup 3 (si O joue un Coin)",
        action: "Prendre le Coin diagonalement opposé",
        why: "Prépare une fourchette (fork) imparable si O commet la moindre imprécision.",
      },
      {
        move: "Coup 3 (si O joue une Bordure)",
        action: "Prendre un Coin pour créer un Fork",
        why: "Une bordure est une erreur pour O : victoire assurée avec un jeu parfait !",
      },
    ],
    secondPlayerO: [
      {
        trigger: "Si X joue le Centre",
        mustDo: "Jouer impérativement un COIN",
        warning: "Jouer une bordure face au centre mène mathématiquement à la défaite.",
      },
      {
        trigger: "Si X joue un Coin",
        mustDo: "Prendre impérativement le CENTRE",
        warning: "Tout autre coup donne une victoire forcée à X.",
      },
      {
        trigger: "Si X joue une Bordure",
        mustDo: "Prendre le CENTRE",
        warning: "Le coup le plus simple pour neutraliser et viser la victoire.",
      },
    ],
  },
  commonMistakes: [
    "Manquer son propre alignement gagnant de 2 pions",
    "Bloquer la mauvaise case en lisant mal la ligne adverse",
    "Jouer les bordures trop tôt dans la partie",
    "Ignorer les menaces de fourchette (fork) à 1 coup d'avance",
    "Jouer en mode pilote automatique sans analyser",
  ],
};

