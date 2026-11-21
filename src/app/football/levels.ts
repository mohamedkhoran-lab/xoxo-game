// Football (Score Hero style) — level data.
// Coordinates in metres. Goal line is z = 0, goal centre x = 0, the pitch extends to +z.
// Goal mouth: x ∈ [-3.66, 3.66], y ∈ [0, 2.44].

export interface Defender {
  x: number;
  z: number;
  /** side-to-side patrol amplitude (m) and speed (rad/s) */
  amp?: number;
  speed?: number;
}

export interface FLevel {
  name: string;
  brief: string;
  /** starting ball position */
  ball: [number, number];
  /** teammates you can pass to */
  mates: [number, number][];
  defenders: Defender[];
  /** number of players in the free-kick wall (0 = none) */
  wall: number;
  /** goalkeeper skill 0..1 */
  keeper: number;
  attempts: number;
}

export const FLEVELS: FLevel[] = [
  {
    name: "Penalty",
    brief: "Swipe men l bolla l l but. Vise les coins!",
    ball: [0, 11], mates: [], defenders: [], wall: 0, keeper: 0.15, attempts: 3,
  },
  {
    name: "Angle",
    brief: "Tir men l jenb — dir l bolla f l poteau l b3id",
    ball: [-7, 15], mates: [], defenders: [], wall: 0, keeper: 0.3, attempts: 3,
  },
  {
    name: "Coup franc",
    brief: "Kayen mur 🧱 — tla3 l bolla fougou",
    ball: [1, 21], mates: [], defenders: [], wall: 3, keeper: 0.35, attempts: 3,
  },
  {
    name: "Effet",
    brief: "Dir swipe m3awej (courbe) bach tdour 3la l mur ↪️",
    ball: [7, 20], mates: [], defenders: [], wall: 4, keeper: 0.4, attempts: 3,
  },
  {
    name: "La passe",
    brief: "Swipe 3la sahbek bach t3tih l passe, men ba3d tir!",
    ball: [-12, 30], mates: [[3, 17]], defenders: [{ x: -6, z: 26, amp: 1.2, speed: 1.2 }], wall: 0, keeper: 0.45, attempts: 3,
  },
  {
    name: "Mur kbir",
    brief: "5 joueurs f l mur — courbe wela fougou",
    ball: [-2, 24], mates: [], defenders: [], wall: 5, keeper: 0.5, attempts: 3,
  },
  {
    name: "Contre-attaque",
    brief: "Jouj passes w marki 🔥",
    ball: [16, 36], mates: [[6, 25], [-4, 14]],
    defenders: [{ x: 10, z: 30, amp: 2, speed: 1.4 }, { x: 0, z: 19, amp: 2.5, speed: 1.1 }],
    wall: 0, keeper: 0.55, attempts: 3,
  },
  {
    name: "Bord de surface",
    brief: "Angle fermé — l'effet howa l7al",
    ball: [-15, 17], mates: [], defenders: [{ x: -8, z: 9, amp: 1, speed: 1.5 }], wall: 0, keeper: 0.6, attempts: 3,
  },
  {
    name: "Spécialiste",
    brief: "Coup franc parfait — lucarne!",
    ball: [-5, 19], mates: [], defenders: [], wall: 5, keeper: 0.68, attempts: 3,
  },
  {
    name: "Tiki-taka",
    brief: "Passi, passi… w tir",
    ball: [-14, 34], mates: [[-3, 26], [9, 16]],
    defenders: [{ x: -8, z: 30, amp: 2, speed: 1.6 }, { x: 3, z: 21, amp: 3, speed: 1.3 }, { x: 4, z: 9, amp: 1.5, speed: 1.8 }],
    wall: 0, keeper: 0.72, attempts: 3,
  },
  {
    name: "Frappe de loin",
    brief: "Men b3id — frappe qwiya w précise",
    ball: [2, 29], mates: [], defenders: [{ x: 0, z: 18, amp: 3, speed: 1.2 }], wall: 0, keeper: 0.7, attempts: 3,
  },
  {
    name: "Finale 🏆",
    brief: "La finale! Mur, défenseurs, gardien fort…",
    ball: [10, 32], mates: [[-6, 24], [2, 15]],
    defenders: [{ x: 3, z: 28, amp: 2.5, speed: 1.7 }, { x: -3, z: 19, amp: 2.5, speed: 1.5 }],
    wall: 0, keeper: 0.85, attempts: 3,
  },
];
