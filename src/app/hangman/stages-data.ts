export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  isMoving?: boolean;
  moveSpeed?: number;
  minY?: number;
  maxY?: number;
  direction?: number;
  isRotating?: boolean; // Poutre / pale tournante
  rotateSpeed?: number;
  length?: number;
}

export interface HangmanStageConfig {
  stageNumber: number; // 1 à 5
  title: string;
  subtitle: string;
  arrowsAvailable: number; // Exactement 5 flèches
  gallowsX: number; // Position X de la potence / cible
  gallowsY: number; // Position Y de la potence
  ropeLength: number; // Longueur de la corde
  ropeWidth: number; // Tolérance d'impact de la corde
  isSwinging?: boolean; // La corde oscille-t-elle ?
  swingSpeed?: number;
  swingAngle?: number;
  trajectoryDots: number; // Nombre de points de trajectoire ("chemin")
  obstacles: Obstacle[];
}

export interface DifficultyConfig {
  id: "facile" | "moyen" | "hard";
  name: string;
  badge: string;
  caption: string;
  color: string;
  stages: HangmanStageConfig[];
}

export const ARCHERY_STAGES: Record<"facile" | "moyen" | "hard", DifficultyConfig> = {
  // ================= NIVEAU 1 : SAHEL (Facile) =================
  // Pas de caption comme demandé !
  facile: {
    id: "facile",
    name: "Sahel",
    badge: "🌱 Sahel",
    caption: "", // PAS DE CAPTION
    color: "#10b981",
    stages: [
      {
        stageNumber: 1,
        title: "Niveau 1/5 : Début Sahel",
        subtitle: "Corde accessible — Ajuste ton tir sur le grand terrain !",
        arrowsAvailable: 5,
        gallowsX: 520,
        gallowsY: 120,
        ropeLength: 68,
        ropeWidth: 24,
        isSwinging: false,
        trajectoryDots: 12,
        obstacles: [],
      },
      {
        stageNumber: 2,
        title: "Niveau 2/5 : Petite Caisse",
        subtitle: "Une caisse en bois s'interpose — Lève un peu le tir !",
        arrowsAvailable: 5,
        gallowsX: 580,
        gallowsY: 120,
        ropeLength: 62,
        ropeWidth: 22,
        isSwinging: false,
        trajectoryDots: 10,
        obstacles: [
          { x: 350, y: 350, width: 48, height: 125, color: "#854d0e" },
        ],
      },
      {
        stageNumber: 3,
        title: "Niveau 3/5 : Mur de Pierre",
        subtitle: "Un mur élevé barre la route — Tir en cloche requis !",
        arrowsAvailable: 5,
        gallowsX: 640,
        gallowsY: 125,
        ropeLength: 56,
        ropeWidth: 20,
        isSwinging: false,
        trajectoryDots: 9,
        obstacles: [
          { x: 380, y: 265, width: 50, height: 210, color: "#64748b" },
        ],
      },
      {
        stageNumber: 4,
        title: "Niveau 4/5 : Grand Mur + Corde Mobile",
        subtitle: "Le bonhomme oscille et le mur est haut — On sent la difficulté !",
        arrowsAvailable: 5,
        gallowsX: 700,
        gallowsY: 115,
        ropeLength: 50,
        ropeWidth: 18,
        isSwinging: true,
        swingSpeed: 1.5,
        swingAngle: 12,
        trajectoryDots: 8,
        obstacles: [
          { x: 410, y: 225, width: 52, height: 250, color: "#475569" },
        ],
      },
      {
        stageNumber: 5,
        title: "Niveau 5/5 : Sahel Fin (Déjà corsé !)",
        subtitle: "Mur élevé + barrière mobile au milieu !",
        arrowsAvailable: 5,
        gallowsX: 750,
        gallowsY: 120,
        ropeLength: 45,
        ropeWidth: 16,
        isSwinging: true,
        swingSpeed: 1.8,
        swingAngle: 14,
        trajectoryDots: 7,
        obstacles: [
          { x: 370, y: 260, width: 48, height: 215, color: "#475569" },
          {
            x: 520,
            y: 150,
            width: 40,
            height: 130,
            color: "#b45309",
            isMoving: true,
            moveSpeed: 1.8,
            minY: 90,
            maxY: 270,
            direction: 1,
          },
        ],
      },
    ],
  },

  // ================= NIVEAU 2 : MOYEN =================
  moyen: {
    id: "moyen",
    name: "Moyen",
    badge: "🟡 Moyen",
    caption: "chwiya tkhmam w tarkiz",
    color: "#f59e0b",
    stages: [
      {
        stageNumber: 1,
        title: "Niveau 1/5 : Mur Moyen & Guide Réduit",
        subtitle: "Guide de visée court — Calibre ta parabole !",
        arrowsAvailable: 5,
        gallowsX: 650,
        gallowsY: 120,
        ropeLength: 42,
        ropeWidth: 15,
        isSwinging: false,
        trajectoryDots: 7,
        obstacles: [
          { x: 380, y: 230, width: 52, height: 245, color: "#64748b" },
        ],
      },
      {
        stageNumber: 2,
        title: "Niveau 2/5 : Deux Piliers Médiévaux",
        subtitle: "Deux piliers imposent une fenêtre de tir étroite !",
        arrowsAvailable: 5,
        gallowsX: 710,
        gallowsY: 110,
        ropeLength: 38,
        ropeWidth: 14,
        isSwinging: false,
        trajectoryDots: 6,
        obstacles: [
          { x: 360, y: 245, width: 45, height: 230, color: "#78350f" },
          { x: 510, y: 185, width: 45, height: 290, color: "#475569" },
        ],
      },
      {
        stageNumber: 3,
        title: "Niveau 3/5 : Barrière Mobile Rapide",
        subtitle: "La barrière monte et descend vivement — Trouve le bon tempo !",
        arrowsAvailable: 5,
        gallowsX: 750,
        gallowsY: 115,
        ropeLength: 34,
        ropeWidth: 13,
        isSwinging: true,
        swingSpeed: 2.0,
        swingAngle: 15,
        trajectoryDots: 6,
        obstacles: [
          { x: 360, y: 265, width: 45, height: 210, color: "#334155" },
          {
            x: 500,
            y: 130,
            width: 40,
            height: 150,
            color: "#b45309",
            isMoving: true,
            moveSpeed: 2.4,
            minY: 70,
            maxY: 280,
            direction: 1,
          },
        ],
      },
      {
        stageNumber: 4,
        title: "Niveau 4/5 : Forteresse & Balançoire",
        subtitle: "Grand mur de donjon + corde qui balance vivement !",
        arrowsAvailable: 5,
        gallowsX: 780,
        gallowsY: 110,
        ropeLength: 30,
        ropeWidth: 12,
        isSwinging: true,
        swingSpeed: 2.3,
        swingAngle: 16,
        trajectoryDots: 5,
        obstacles: [
          { x: 390, y: 180, width: 58, height: 295, color: "#1e293b" },
          { x: 560, y: 85, width: 38, height: 110, color: "#78350f" },
        ],
      },
      {
        stageNumber: 5,
        title: "Niveau 5/5 : Hélice Tournante & Donjon",
        subtitle: "Une pale en bois tourne dans les airs au milieu !",
        arrowsAvailable: 5,
        gallowsX: 800,
        gallowsY: 105,
        ropeLength: 28,
        ropeWidth: 11,
        isSwinging: true,
        swingSpeed: 2.5,
        swingAngle: 17,
        trajectoryDots: 5,
        obstacles: [
          { x: 360, y: 240, width: 50, height: 235, color: "#334155" },
          {
            x: 520,
            y: 180,
            width: 14,
            height: 14,
            color: "#854d0e",
            isRotating: true,
            rotateSpeed: 2.2,
            length: 135,
          },
        ],
      },
    ],
  },

  // ================= NIVEAU 3 : HARD (1 & 2 FACILE UN PEU, 3 4 5 IMBATTABLE MAIS POSSIBLE !) =================
  hard: {
    id: "hard",
    name: "Hard",
    badge: "🔥 Hard",
    caption: "salek rohek ida 9adite",
    color: "#ef4444",
    stages: [
      {
        stageNumber: 1,
        title: "Niveau 1/5 : Donjon & Cloche Accessible",
        subtitle: "Un peu de facile pour démarrer le Hard — Belle parabole au-dessus du mur !",
        arrowsAvailable: 5,
        gallowsX: 720,
        gallowsY: 115,
        ropeLength: 32, // Un peu plus facile (32px au lieu de 20px)
        ropeWidth: 11,
        isSwinging: false,
        trajectoryDots: 6, // 6 points de visée pour bien s'ajuster
        obstacles: [
          { x: 400, y: 200, width: 55, height: 275, color: "#1e293b" },
        ],
      },
      {
        stageNumber: 2,
        title: "Niveau 2/5 : Herse Mobile & Timing Clair",
        subtitle: "La herse monte et descend — Fenêtre de tir ouverte et jouable !",
        arrowsAvailable: 5,
        gallowsX: 750,
        gallowsY: 110,
        ropeLength: 28, // Un peu plus facile (28px)
        ropeWidth: 10,
        isSwinging: true,
        swingSpeed: 2.0,
        swingAngle: 14,
        trajectoryDots: 5,
        obstacles: [
          { x: 370, y: 250, width: 50, height: 225, color: "#334155" },
          {
            x: 510,
            y: 120,
            width: 40,
            height: 155,
            color: "#991b1b",
            isMoving: true,
            moveSpeed: 2.2, // Vitesse modérée pour avoir une vraie opportunité
            minY: 60,
            maxY: 270,
            direction: 1,
          },
        ],
      },
      {
        stageNumber: 3,
        title: "Niveau 3/5 : Donjon Haut (Imbattable mais possible !)",
        subtitle: "Grand mur de forteresse + corde mobile — Tir en cloche chirurgical !",
        arrowsAvailable: 5,
        gallowsX: 780,
        gallowsY: 105,
        ropeLength: 22,
        ropeWidth: 8,
        isSwinging: true,
        swingSpeed: 2.6,
        swingAngle: 18,
        trajectoryDots: 4,
        obstacles: [
          { x: 420, y: 160, width: 60, height: 315, color: "#0f172a" },
          { x: 580, y: 90, width: 34, height: 80, color: "#78350f" },
        ],
      },
      {
        stageNumber: 4,
        title: "Niveau 4/5 : Moulin Rapide (Imbattable mais possible !)",
        subtitle: "Pales rotatives au milieu — Vise précisément entre les pales !",
        arrowsAvailable: 5,
        gallowsX: 800,
        gallowsY: 100,
        ropeLength: 20,
        ropeWidth: 7.5,
        isSwinging: true,
        swingSpeed: 2.9,
        swingAngle: 20,
        trajectoryDots: 4,
        obstacles: [
          { x: 380, y: 220, width: 50, height: 255, color: "#0f172a" },
          {
            x: 540,
            y: 175,
            width: 14,
            height: 14,
            color: "#b45309",
            isRotating: true,
            rotateSpeed: 2.5,
            length: 140,
          },
        ],
      },
      {
        stageNumber: 5,
        title: "Niveau 5/5 : HARD DE HARD 🔥💀 (IL Y A POSSIBILITÉ !)",
        subtitle: "Hélice tournante + Tour + Corde 18px à 820px — Le tir de maître possible !",
        arrowsAvailable: 5,
        gallowsX: 820,
        gallowsY: 95,
        ropeLength: 18, // 18px : Défi légendaire mais réel
        ropeWidth: 7,   // Zone d'impact 7px : possible à couper !
        isSwinging: true,
        swingSpeed: 3.2,
        swingAngle: 22,
        trajectoryDots: 4, // 4 points de visée pour bien sentir l'angle initial
        obstacles: [
          {
            x: 400,
            y: 210,
            width: 55,
            height: 265,
            color: "#0f172a",
          },
          {
            x: 560,
            y: 170,
            width: 14,
            height: 14,
            color: "#991b1b",
            isRotating: true,
            rotateSpeed: 2.8,
            length: 145,
          },
        ],
      },
    ],
  },
};
