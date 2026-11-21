// Hangman Archery — level definitions.
// All positions are FRACTIONS of the world (0..1) so a level fits any screen
// (portrait phone or landscape desktop). The world is always 600 units high.

export interface Hostage {
  /** Gallows beam tip (where the rope hangs), as fraction of world W/H */
  x: number;
  y: number;
  /** Rope length in world units */
  rope: number;
  /** Pendulum swing amplitude (radians) and speed (rad/s) */
  swing?: number;
  swingSpeed?: number;
  /** Seconds before he runs out of breath */
  breath: number;
}

export interface Obstacle {
  kind: "wall" | "blade";
  /** Centre position (fractions) */
  x: number;
  y: number;
  /** Size in world units (wall: w × h, blade: length) */
  w: number;
  h: number;
  /** Moving walls: axis, amplitude (fraction of H or W) and speed */
  move?: "x" | "y";
  amp?: number;
  speed?: number;
  /** Blade rotation speed (rad/s) */
  spin?: number;
}

export interface Level {
  name: string;
  hint: string;
  arrows: number;
  /** Number of trajectory preview dots */
  guide: number;
  /** Horizontal wind acceleration (units/s²), + = towards the right */
  wind?: number;
  hostages: Hostage[];
  obstacles: Obstacle[];
  sky: "day" | "sunset" | "night";
}

export const LEVELS: Level[] = [
  {
    name: "L'bidaya",
    hint: "Hot sab3ek win ma kan, jbed l'lour w tlaq bach tqta3 l habl 🎯",
    arrows: 6, guide: 26, sky: "day",
    hostages: [{ x: 0.7, y: 0.2, rope: 90, breath: 30 }],
    obstacles: [],
  },
  {
    name: "B3id chwiya",
    hint: "Kol ma tjbed kter, kol ma tro7 b3id",
    arrows: 5, guide: 22, sky: "day",
    hostages: [{ x: 0.85, y: 0.15, rope: 110, breath: 25 }],
    obstacles: [],
  },
  {
    name: "Ytrejje7",
    hint: "L habl ytrejje7… stana l waqt l mlih",
    arrows: 5, guide: 20, sky: "day",
    hostages: [{ x: 0.75, y: 0.15, rope: 120, swing: 0.35, swingSpeed: 1.6, breath: 25 }],
    obstacles: [],
  },
  {
    name: "L'7it",
    hint: "Kayen 7it — tlaq lfoug 3lih",
    arrows: 5, guide: 18, sky: "sunset",
    hostages: [{ x: 0.82, y: 0.18, rope: 100, breath: 25 }],
    obstacles: [{ kind: "wall", x: 0.5, y: 0.72, w: 26, h: 230 }],
  },
  {
    name: "Jouj",
    hint: "Jouj bnadem — sauvihom les deux !",
    arrows: 6, guide: 16, sky: "sunset",
    hostages: [
      { x: 0.62, y: 0.2, rope: 90, breath: 28 },
      { x: 0.88, y: 0.12, rope: 120, breath: 28 },
    ],
    obstacles: [],
  },
  {
    name: "Planche",
    hint: "La planche tetle3 w tehbet",
    arrows: 5, guide: 14, sky: "sunset",
    hostages: [{ x: 0.8, y: 0.15, rope: 110, breath: 25 }],
    obstacles: [{ kind: "wall", x: 0.52, y: 0.45, w: 22, h: 150, move: "y", amp: 0.22, speed: 1.4 }],
  },
  {
    name: "L'ri7",
    hint: "Kayen ri7 💨 — chouf l flèche f'lfoug",
    arrows: 5, guide: 12, sky: "day", wind: -120,
    hostages: [{ x: 0.82, y: 0.16, rope: 110, breath: 22 }],
    obstacles: [],
  },
  {
    name: "Pendule",
    hint: "Ytrejje7 b zerba w b3id",
    arrows: 5, guide: 10, sky: "night",
    hostages: [{ x: 0.86, y: 0.12, rope: 140, swing: 0.5, swingSpeed: 2.3, breath: 22 }],
    obstacles: [],
  },
  {
    name: "Mélange",
    hint: "7it, pendule, w jouj bnadem",
    arrows: 6, guide: 10, sky: "night",
    hostages: [
      { x: 0.64, y: 0.18, rope: 95, swing: 0.3, swingSpeed: 1.8, breath: 25 },
      { x: 0.9, y: 0.12, rope: 120, breath: 25 },
    ],
    obstacles: [{ kind: "wall", x: 0.45, y: 0.75, w: 24, h: 200 }],
  },
  {
    name: "L'hélice",
    hint: "Attention l'hélice ⚙️",
    arrows: 5, guide: 8, sky: "night",
    hostages: [{ x: 0.82, y: 0.15, rope: 110, breath: 22 }],
    obstacles: [{ kind: "blade", x: 0.55, y: 0.45, w: 170, h: 10, spin: 1.8 }],
  },
  {
    name: "Tempête",
    hint: "Ri7 + planche — concentré !",
    arrows: 5, guide: 6, sky: "sunset", wind: 140,
    hostages: [{ x: 0.85, y: 0.14, rope: 120, swing: 0.25, swingSpeed: 1.5, breath: 22 }],
    obstacles: [{ kind: "wall", x: 0.55, y: 0.5, w: 22, h: 140, move: "y", amp: 0.2, speed: 1.9 }],
  },
  {
    name: "L'boss",
    hint: "Tlata bnadem… nta l'héros 🦸",
    arrows: 7, guide: 5, sky: "night", wind: -60,
    hostages: [
      { x: 0.55, y: 0.2, rope: 90, swing: 0.3, swingSpeed: 2, breath: 30 },
      { x: 0.72, y: 0.12, rope: 130, breath: 30 },
      { x: 0.9, y: 0.16, rope: 100, swing: 0.4, swingSpeed: 1.6, breath: 30 },
    ],
    obstacles: [{ kind: "blade", x: 0.42, y: 0.4, w: 120, h: 10, spin: -2.2 }],
  },
];
