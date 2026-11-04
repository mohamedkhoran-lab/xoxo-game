"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./dino.module.css";

// Logical game arena dimensions
const W = 600;
const H = 220;
const GROUND_Y = 185;

// Physics
const GRAVITY = 0.62;
const JUMP_FORCE = -11.5;
const FAST_FALL = 1.8;
const INITIAL_SPEED = 6.2;
const MAX_SPEED = 14.0;

// Pixel Art Bitmaps (1 = filled pixel, 0 / space = transparent)
const SPRITE_DINO_STAND = [
  "                    ######################  ",
  "                    ########################",
  "                    ####  ##################",
  "                    ########################",
  "                    ########################",
  "                    ########################",
  "                    ##############          ",
  "                    ####################    ",
  "#                   ################        ",
  "##                  ############            ",
  "###                 ##############          ",
  "####              ##################        ",
  "#####            ###################        ",
  "######          ####################        ",
  "####################################        ",
  "####################################        ",
  " ###################################        ",
  "  ##################################        ",
  "   #################################        ",
  "    ################################        ",
  "     ###############################        ",
  "      ##############################        ",
  "       #############################        ",
  "        ###########################         ",
  "         ##########################         ",
  "          ########################          ",
  "           ######################           ",
  "            ####################            ",
  "             ##################             ",
  "              ################              ",
  "               ##############               ",
  "                ############                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "              ######    ######              ",
  "              ######    ######              ",
];

const SPRITE_DINO_RUN_1 = [
  "                    ######################  ",
  "                    ########################",
  "                    ####  ##################",
  "                    ########################",
  "                    ########################",
  "                    ########################",
  "                    ##############          ",
  "                    ####################    ",
  "#                   ################        ",
  "##                  ############            ",
  "###                 ##############          ",
  "####              ##################        ",
  "#####            ###################        ",
  "######          ####################        ",
  "####################################        ",
  "####################################        ",
  " ###################################        ",
  "  ##################################        ",
  "   #################################        ",
  "    ################################        ",
  "     ###############################        ",
  "      ##############################        ",
  "       #############################        ",
  "        ###########################         ",
  "         ##########################         ",
  "          ########################          ",
  "           ######################           ",
  "            ####################            ",
  "             ##################             ",
  "              ################              ",
  "               ##############               ",
  "                ############                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ######              ",
  "                ####                        ",
  "                ####                        ",
  "                ######                      ",
  "                ######                      ",
];

const SPRITE_DINO_RUN_2 = [
  "                    ######################  ",
  "                    ########################",
  "                    ####  ##################",
  "                    ########################",
  "                    ########################",
  "                    ########################",
  "                    ##############          ",
  "                    ####################    ",
  "#                   ################        ",
  "##                  ############            ",
  "###                 ##############          ",
  "####              ##################        ",
  "#####            ###################        ",
  "######          ####################        ",
  "####################################        ",
  "####################################        ",
  " ###################################        ",
  "  ##################################        ",
  "   #################################        ",
  "    ################################        ",
  "     ###############################        ",
  "      ##############################        ",
  "       #############################        ",
  "        ###########################         ",
  "         ##########################         ",
  "          ########################          ",
  "           ######################           ",
  "            ####################            ",
  "             ##################             ",
  "              ################              ",
  "               ##############               ",
  "                ############                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "              ######    ####                ",
  "                        ####                ",
  "                        ####                ",
  "                      ######                ",
  "                      ######                ",
];

const SPRITE_DINO_DEAD = [
  "                    ######################  ",
  "                    ########################",
  "                    ## # # #################",
  "                    ##  #  #################",
  "                    ## # # #################",
  "                    ########################",
  "                    ##############          ",
  "                    ####################    ",
  "#                   ################        ",
  "##                  ############            ",
  "###                 ##############          ",
  "####              ##################        ",
  "#####            ###################        ",
  "######          ####################        ",
  "####################################        ",
  "####################################        ",
  " ###################################        ",
  "  ##################################        ",
  "   #################################        ",
  "    ################################        ",
  "     ###############################        ",
  "      ##############################        ",
  "       #############################        ",
  "        ###########################         ",
  "         ##########################         ",
  "          ########################          ",
  "           ######################           ",
  "            ####################            ",
  "             ##################             ",
  "              ################              ",
  "               ##############               ",
  "                ############                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "                ####    ####                ",
  "              ######    ######              ",
  "              ######    ######              ",
];

const SPRITE_DINO_DUCK_1 = [
  "                                    ######################  ",
  "                                    ########################",
  "                                    ####  ##################",
  "                                    ########################",
  "                                    ########################",
  "                                    ########################",
  "                                    ##############          ",
  "#                   ####################################    ",
  "##                  ################################        ",
  "###                 ############################            ",
  "####              ################################          ",
  "#####            ###################################        ",
  "######          ####################################        ",
  "####################################################        ",
  "####################################################        ",
  " ###################################################        ",
  "  ##################################################        ",
  "   #################################################        ",
  "    ################################################        ",
  "     ################################               ",
  "      ##############################                ",
  "       #############################                ",
  "        ####                    ####                ",
  "        ####                    ####                ",
  "        ####                    ######              ",
  "        ######                                      ",
];

const SPRITE_DINO_DUCK_2 = [
  "                                    ######################  ",
  "                                    ########################",
  "                                    ####  ##################",
  "                                    ########################",
  "                                    ########################",
  "                                    ########################",
  "                                    ##############          ",
  "#                   ####################################    ",
  "##                  ################################        ",
  "###                 ############################            ",
  "####              ################################          ",
  "#####            ###################################        ",
  "######          ####################################        ",
  "####################################################        ",
  "####################################################        ",
  " ###################################################        ",
  "  ##################################################        ",
  "   #################################################        ",
  "    ################################################        ",
  "     ################################               ",
  "      ##############################                ",
  "       #############################                ",
  "        ####                    ####                ",
  "        ####                    ####                ",
  "                                ######              ",
  "                                ######              ",
];

const SPRITE_CACTUS_SMALL = [
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "  ## ####     ",
  "  ## ####     ",
  "  ## ####  ## ",
  "  ## ####  ## ",
  "  ## ####  ## ",
  "  #######  ## ",
  "   ######  ## ",
  "     ######## ",
  "     #######  ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
  "     ####     ",
];

const SPRITE_CACTUS_LARGE = [
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "  ###  ######       ",
  "  ###  ######       ",
  "  ###  ######       ",
  "  ###  ######  ###  ",
  "  ###  ######  ###  ",
  "  ###  ######  ###  ",
  "  ###  ######  ###  ",
  "  ###########  ###  ",
  "   ##########  ###  ",
  "       ###########  ",
  "       ##########   ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
  "       ######       ",
];

const SPRITE_BIRD_UP = [
  "                  ####                      ",
  "                  ######                    ",
  "                  ########                  ",
  "                  ##########                ",
  "                  ############              ",
  "                  ##############            ",
  "                  ################          ",
  "  ##              ##################        ",
  "  ####            ####################      ",
  "  ######          ######################    ",
  "  ########        ########################  ",
  "  ##########      ##########################",
  "############################################",
  "############################################",
  "  ##########################################",
  "    ########################################",
  "      ######################################",
  "        ######################              ",
  "          ##################                ",
  "            ##############                  ",
  "              ##########                    ",
  "                ######                      ",
  "                  ##                        ",
];

const SPRITE_BIRD_DOWN = [
  "                  ####                      ",
  "                  ######                    ",
  "                  ########                  ",
  "                  ##########                ",
  "                  ############              ",
  "                  ##############            ",
  "                  ################          ",
  "  ##              ##################        ",
  "  ####            ####################      ",
  "  ######          ######################    ",
  "  ########        ########################  ",
  "  ##########      ##########################",
  "############################################",
  "############################################",
  "  ##########################################",
  "    ######################                  ",
  "      ################                    ##",
  "        ############                    ####",
  "          ########                    ######",
  "            ####                    ########",
  "                                  ##########",
  "                                ############",
  "                              ##############",
];

const SPRITE_CLOUD = [
  "          #############             ",
  "        #################           ",
  "       ###################          ",
  "   ###########################      ",
  "  #############################     ",
  " ###############################    ",
  "#################################   ",
  "#################################   ",
  "##################################  ",
  "################################### ",
  " #################################  ",
  "  ###############################   ",
  "    ###########################     ",
  "       #####################        ",
];

// Helper to convert ASCII art to offscreen canvas
function createBitmapCanvas(art: string[], color: string): HTMLCanvasElement {
  const h = art.length;
  const w = art[0].length;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = color;
  for (let r = 0; r < h; r++) {
    const row = art[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === "#") {
        ctx.fillRect(c, r, 1, 1);
      }
    }
  }
  return canvas;
}

// 8-bit Audio Synthesizer
function playDinoAudio(type: "jump" | "score" | "crash", muted = false) {
  if (muted) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "jump") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "score") {
      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.09 + 0.12
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.12);
      });
    } else if (type === "crash") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {}
}

type ObstacleType =
  | "cactus_small"
  | "cactus_double_small"
  | "cactus_triple_small"
  | "cactus_large"
  | "cactus_double_large"
  | "bird_low"
  | "bird_mid"
  | "bird_high";

interface Obstacle {
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  birdFrame: number;
  birdTimer: number;
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
}

interface TerrainBump {
  x: number;
  length: number;
}

export default function DinoPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">(
    "idle"
  );
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isDucking, setIsDucking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs for real-time game loop
  const gameStateRef = useRef<"idle" | "playing" | "gameover">("idle");
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const isDuckingRef = useRef(false);
  const isMutedRef = useRef(false);

  // Dino state
  const dinoRef = useRef({
    x: 45,
    y: GROUND_Y - 44,
    vy: 0,
    isGrounded: true,
    runFrame: 0,
    runTimer: 0,
  });

  // Duck timer for auto-standup on tap
  const duckTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Touch start coordinates for mobile swipe detection
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);

  // World objects
  const obstaclesRef = useRef<Obstacle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const terrainBumpsRef = useRef<TerrainBump[]>([]);
  const nextSpawnDistRef = useRef(300);

  // Milestone flash
  const flashTimerRef = useRef(0);
  const lastScoreMilestoneRef = useRef(0);

  // Cached sprites
  const spritesRef = useRef<{
    day: Record<string, HTMLCanvasElement>;
    night: Record<string, HTMLCanvasElement>;
  } | null>(null);

  // Sync ref with states
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  useEffect(() => {
    isDuckingRef.current = isDucking;
  }, [isDucking]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Load high score & mute preference
  useEffect(() => {
    try {
      const savedHi = localStorage.getItem("xoxo-dino-best");
      if (savedHi) setHighScore(parseInt(savedHi, 10) || 0);
      const savedMute = localStorage.getItem("xoxo-dino-muted");
      if (savedMute === "true") setIsMuted(true);
    } catch {}
  }, []);

  // Pre-render sprite bitmaps once
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Palette: Day mode (#334155 slate) and Night mode (#f8fafc white)
    const colorDay = "#334155";
    const colorNight = "#e2e8f0";
    const colorCloud = "#cbd5e1";

    const buildSet = (color: string) => ({
      stand: createBitmapCanvas(SPRITE_DINO_STAND, color),
      run1: createBitmapCanvas(SPRITE_DINO_RUN_1, color),
      run2: createBitmapCanvas(SPRITE_DINO_RUN_2, color),
      dead: createBitmapCanvas(SPRITE_DINO_DEAD, color),
      duck1: createBitmapCanvas(SPRITE_DINO_DUCK_1, color),
      duck2: createBitmapCanvas(SPRITE_DINO_DUCK_2, color),
      cactusSmall: createBitmapCanvas(SPRITE_CACTUS_SMALL, color),
      cactusLarge: createBitmapCanvas(SPRITE_CACTUS_LARGE, color),
      birdUp: createBitmapCanvas(SPRITE_BIRD_UP, color),
      birdDown: createBitmapCanvas(SPRITE_BIRD_DOWN, color),
      cloud: createBitmapCanvas(SPRITE_CLOUD, colorCloud),
    });

    spritesRef.current = {
      day: buildSet(colorDay),
      night: buildSet(colorNight),
    };

    // Initialize clouds
    cloudsRef.current = [
      { x: 120, y: 35, speed: 0.8 },
      { x: 340, y: 55, speed: 1.1 },
      { x: 520, y: 25, speed: 0.9 },
    ];

    // Initialize terrain bumps
    const bumps: TerrainBump[] = [];
    for (let x = 0; x < W; x += 15 + Math.random() * 35) {
      bumps.push({ x, length: 2 + Math.floor(Math.random() * 5) });
    }
    terrainBumpsRef.current = bumps;
  }, []);

  // Sound toggle handler
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("xoxo-dino-muted", String(next));
      } catch {}
      return next;
    });
  };

  // Start / Reset Game
  const startGame = useCallback(() => {
    if (duckTimerRef.current) {
      clearTimeout(duckTimerRef.current);
      duckTimerRef.current = null;
    }
    setIsDucking(false);
    isDuckingRef.current = false;
    setGameState("playing");
    gameStateRef.current = "playing";
    scoreRef.current = 0;
    setScore(0);
    speedRef.current = INITIAL_SPEED;
    nextSpawnDistRef.current = 280;
    lastScoreMilestoneRef.current = 0;
    flashTimerRef.current = 0;

    dinoRef.current = {
      x: 45,
      y: GROUND_Y - 44,
      vy: 0,
      isGrounded: true,
      runFrame: 0,
      runTimer: 0,
    };

    obstaclesRef.current = [];
  }, []);

  // Jump Action (also cancels any active ducking)
  const handleJump = useCallback(() => {
    if (gameStateRef.current === "idle" || gameStateRef.current === "gameover") {
      startGame();
      return;
    }

    // Cancel active duck immediately so Dino springs up
    if (duckTimerRef.current) {
      clearTimeout(duckTimerRef.current);
      duckTimerRef.current = null;
    }
    setIsDucking(false);
    isDuckingRef.current = false;

    const dino = dinoRef.current;
    if (dino.isGrounded) {
      dino.vy = JUMP_FORCE;
      dino.isGrounded = false;
      playDinoAudio("jump", isMutedRef.current);
    }
  }, [startGame]);

  // Duck Action (supports holding or auto-standup duration in ms)
  const handleDuckStart = useCallback((autoDurationMs?: number) => {
    if (gameStateRef.current === "idle" || gameStateRef.current === "gameover") {
      startGame();
      return;
    }
    if (duckTimerRef.current) {
      clearTimeout(duckTimerRef.current);
      duckTimerRef.current = null;
    }
    setIsDucking(true);
    isDuckingRef.current = true;

    // Fast-fall if in mid-air
    const dino = dinoRef.current;
    if (!dino.isGrounded && dino.vy < 0) {
      dino.vy += FAST_FALL * 3;
    }

    // If an auto duration is provided (e.g. on mobile tap), stand up automatically
    if (autoDurationMs) {
      duckTimerRef.current = setTimeout(() => {
        setIsDucking(false);
        isDuckingRef.current = false;
        duckTimerRef.current = null;
      }, autoDurationMs);
    }
  }, [startGame]);

  const handleDuckEnd = useCallback(() => {
    if (duckTimerRef.current) {
      clearTimeout(duckTimerRef.current);
      duckTimerRef.current = null;
    }
    setIsDucking(false);
    isDuckingRef.current = false;
  }, []);

  // Touch & Swipe handlers on Canvas for mobile
  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (gameStateRef.current === "idle" || gameStateRef.current === "gameover") {
      startGame();
      return;
    }
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStartPos.current || gameStateRef.current !== "playing") return;
    const t = e.touches[0];
    const dy = t.clientY - touchStartPos.current.y;
    // Downward swipe > 20px -> DUCK (thawad)!
    if (dy > 20 && !isDuckingRef.current) {
      handleDuckStart(800);
      touchStartPos.current = null; // consume swipe
    }
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStartPos.current) return;
    const duration = Date.now() - touchStartPos.current.time;
    // If it was a quick tap (< 400ms) without swiping down -> JUMP (tna9az)!
    if (duration < 400) {
      handleJump();
    }
    touchStartPos.current = null;
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        handleJump();
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        handleDuckStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        handleDuckEnd();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleJump, handleDuckStart, handleDuckEnd]);

  // Main Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);

      const state = gameStateRef.current;
      const sprites = spritesRef.current;
      if (!sprites) return;

      const currentScore = Math.floor(scoreRef.current);
      // Night cycle occurs every 700 points for a duration of 200 points
      const isNight = currentScore % 1400 >= 700;
      const spriteSet = isNight ? sprites.night : sprites.day;

      // Update physics & movement when playing
      if (state === "playing") {
        // Accelerate speed gradually
        speedRef.current = Math.min(
          MAX_SPEED,
          INITIAL_SPEED + (currentScore / 100) * 0.35
        );
        const speed = speedRef.current;

        // Increment score
        scoreRef.current += speed * 0.024;
        const newScore = Math.floor(scoreRef.current);
        setScore(newScore);

        // Check 100-point milestone chime
        const milestone = Math.floor(newScore / 100) * 100;
        if (milestone > 0 && milestone !== lastScoreMilestoneRef.current) {
          lastScoreMilestoneRef.current = milestone;
          flashTimerRef.current = 65; // ~1 second blink
          playDinoAudio("score", isMutedRef.current);
        }
        if (flashTimerRef.current > 0) flashTimerRef.current--;

        // Dino Jump Physics
        const dino = dinoRef.current;
        const ducking = isDuckingRef.current;
        const dinoH = ducking ? 26 : 44;

        if (!dino.isGrounded) {
          // If ducking in mid air, drop faster
          dino.vy += GRAVITY + (ducking ? FAST_FALL : 0);
          dino.y += dino.vy;

          if (dino.y >= GROUND_Y - dinoH) {
            dino.y = GROUND_Y - dinoH;
            dino.vy = 0;
            dino.isGrounded = true;
          }
        } else {
          dino.y = GROUND_Y - dinoH;
        }

        // Dino Run Animation (flip frame every few ticks)
        dino.runTimer += speed * 0.15;
        if (dino.runTimer >= 10) {
          dino.runFrame = dino.runFrame === 0 ? 1 : 0;
          dino.runTimer = 0;
        }

        // Move Terrain bumps
        terrainBumpsRef.current.forEach((b) => {
          b.x -= speed;
          if (b.x < -10) b.x = W + Math.random() * 30;
        });

        // Move Clouds
        cloudsRef.current.forEach((c) => {
          c.x -= c.speed * (speed / INITIAL_SPEED);
          if (c.x < -60) {
            c.x = W + 20 + Math.random() * 50;
            c.y = 20 + Math.random() * 60;
          }
        });

        // Spawn Obstacles
        nextSpawnDistRef.current -= speed;
        if (nextSpawnDistRef.current <= 0) {
          // Choose obstacle type based on score
          const types: ObstacleType[] = ["cactus_small", "cactus_large"];
          if (newScore > 120) {
            types.push("cactus_double_small", "cactus_double_large");
          }
          if (newScore > 250) {
            types.push("cactus_triple_small");
            types.push("bird_low", "bird_mid");
          }
          if (newScore > 450) {
            types.push("bird_high");
          }

          const chosenType = types[Math.floor(Math.random() * types.length)];
          let w = 14;
          let h = 35;
          let y = GROUND_Y - 35;

          if (chosenType === "cactus_small") {
            w = 14;
            h = 35;
            y = GROUND_Y - 35;
          } else if (chosenType === "cactus_double_small") {
            w = 30;
            h = 35;
            y = GROUND_Y - 35;
          } else if (chosenType === "cactus_triple_small") {
            w = 46;
            h = 35;
            y = GROUND_Y - 35;
          } else if (chosenType === "cactus_large") {
            w = 20;
            h = 40;
            y = GROUND_Y - 40;
          } else if (chosenType === "cactus_double_large") {
            w = 42;
            h = 40;
            y = GROUND_Y - 40;
          } else if (chosenType === "bird_low") {
            // Low bird: must jump over!
            w = 44;
            h = 24;
            y = GROUND_Y - 26;
          } else if (chosenType === "bird_mid") {
            // Mid bird: must duck under!
            w = 44;
            h = 24;
            y = GROUND_Y - 50;
          } else if (chosenType === "bird_high") {
            // High bird: safe to walk under
            w = 44;
            h = 24;
            y = GROUND_Y - 76;
          }

          obstaclesRef.current.push({
            type: chosenType,
            x: W + 10,
            y,
            width: w,
            height: h,
            birdFrame: 0,
            birdTimer: 0,
          });

          // Reset spawn distance based on speed
          const minGap = 200 + speed * 13;
          nextSpawnDistRef.current = minGap + Math.random() * 220;
        }

        // Move Obstacles & Collision Check
        const dinoBox = {
          x: dino.x + 5,
          y: dino.y + (ducking ? 4 : 4),
          w: ducking ? 50 : 34,
          h: ducking ? 20 : 38,
        };

        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obs = obstaclesRef.current[i];
          obs.x -= speed;

          // Animate bird flapping
          if (obs.type.startsWith("bird")) {
            obs.birdTimer += 1;
            if (obs.birdTimer >= 8) {
              obs.birdFrame = obs.birdFrame === 0 ? 1 : 0;
              obs.birdTimer = 0;
            }
          }

          // Collision detection with inner padding for fair arcade feel
          const padX = 6;
          const padY = 5;
          const collides =
            dinoBox.x + dinoBox.w - padX > obs.x + padX &&
            dinoBox.x + padX < obs.x + obs.width - padX &&
            dinoBox.y + dinoBox.h - padY > obs.y + padY &&
            dinoBox.y + padY < obs.y + obs.height - padY;

          if (collides) {
            // Game Over!
            setGameState("gameover");
            gameStateRef.current = "gameover";
            playDinoAudio("crash", isMutedRef.current);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([60, 40, 70]);
            }
            if (newScore > highScore) {
              setHighScore(newScore);
              try {
                localStorage.setItem("xoxo-dino-best", String(newScore));
              } catch {}
            }
            break;
          }

          // Remove obstacles off-screen
          if (obs.x + obs.width < -30) {
            obstaclesRef.current.splice(i, 1);
          }
        }
      }

      // ================= DRAWING =================
      ctx.clearRect(0, 0, W, H);

      // Background Sky
      if (isNight) {
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, W, H);

        // Twinkling stars in night sky
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        [
          [50, 25],
          [130, 45],
          [220, 20],
          [310, 35],
          [400, 15],
          [480, 40],
          [550, 25],
        ].forEach(([sx, sy]) => {
          ctx.fillRect(sx, sy, 2, 2);
        });

        // Crescent moon
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(W - 70, 35, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#090d16";
        ctx.beginPath();
        ctx.arc(W - 65, 33, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, W, H);
      }

      // Draw Clouds
      cloudsRef.current.forEach((c) => {
        ctx.drawImage(spriteSet.cloud, c.x, c.y);
      });

      // Draw Ground Line
      ctx.strokeStyle = isNight ? "#334155" : "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(W, GROUND_Y);
      ctx.stroke();

      // Draw Ground Bumps / Rolling Pebbles
      ctx.fillStyle = isNight ? "#475569" : "#94a3b8";
      terrainBumpsRef.current.forEach((b) => {
        ctx.fillRect(b.x, GROUND_Y + 4, b.length, 2);
      });

      // Draw Obstacles
      obstaclesRef.current.forEach((obs) => {
        if (obs.type === "cactus_small") {
          ctx.drawImage(spriteSet.cactusSmall, obs.x, obs.y);
        } else if (obs.type === "cactus_double_small") {
          ctx.drawImage(spriteSet.cactusSmall, obs.x, obs.y);
          ctx.drawImage(spriteSet.cactusSmall, obs.x + 16, obs.y);
        } else if (obs.type === "cactus_triple_small") {
          ctx.drawImage(spriteSet.cactusSmall, obs.x, obs.y);
          ctx.drawImage(spriteSet.cactusSmall, obs.x + 16, obs.y);
          ctx.drawImage(spriteSet.cactusSmall, obs.x + 32, obs.y);
        } else if (obs.type === "cactus_large") {
          ctx.drawImage(spriteSet.cactusLarge, obs.x, obs.y);
        } else if (obs.type === "cactus_double_large") {
          ctx.drawImage(spriteSet.cactusLarge, obs.x, obs.y);
          ctx.drawImage(spriteSet.cactusLarge, obs.x + 22, obs.y);
        } else if (obs.type.startsWith("bird")) {
          const birdSprite =
            obs.birdFrame === 0 ? spriteSet.birdUp : spriteSet.birdDown;
          ctx.drawImage(birdSprite, obs.x, obs.y);
        }
      });

      // Draw Dino
      const dino = dinoRef.current;
      const ducking = isDuckingRef.current;

      let dinoSprite: HTMLCanvasElement;
      if (state === "gameover") {
        dinoSprite = spriteSet.dead;
      } else if (!dino.isGrounded) {
        dinoSprite = spriteSet.stand;
      } else if (ducking) {
        dinoSprite = dino.runFrame === 0 ? spriteSet.duck1 : spriteSet.duck2;
      } else if (state === "playing") {
        dinoSprite = dino.runFrame === 0 ? spriteSet.run1 : spriteSet.run2;
      } else {
        dinoSprite = spriteSet.stand;
      }

      ctx.drawImage(dinoSprite, dino.x, dino.y);

      // Score Display inside Canvas (Authentic retro Chrome style)
      ctx.fillStyle = isNight ? "#e2e8f0" : "#475569";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "right";

      const hiStr = `HI ${String(highScore).padStart(5, "0")}`;
      ctx.fillText(hiStr, W - 90, 26);

      // If flashing after milestone, blink score
      const showCurrent =
        flashTimerRef.current === 0 ||
        Math.floor(flashTimerRef.current / 8) % 2 === 0;
      if (showCurrent) {
        const curStr = String(currentScore).padStart(5, "0");
        ctx.fillText(curStr, W - 20, 26);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [highScore]);

  return (
    <div className={styles["dino-page"]}>
      {/* Header bar */}
      <div className={styles["dino-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => router.push("/?select=1")}
          id="btn-dino-back"
        >
          ← Rja3
        </button>

        <div className={styles["header-center"]}>
          <div className={styles["badge-dino"]}>
            <span>🦖</span>
            <span>Dino Runner</span>
          </div>
        </div>

        <button
          className={styles["btn-mute"]}
          onClick={toggleMute}
          title={isMuted ? "Fa3el sawt" : "Seket sawt"}
          aria-label="Sound Toggle"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Scoreboard bar */}
      <div className={styles.scoreboard}>
        <div className={styles["score-box"]}>
          <span className={styles["score-label"]}>Score</span>
          <span className={styles["score-val"]}>
            {String(score).padStart(5, "0")}
          </span>
        </div>

        <div className={styles["score-badge"]}>
          <span>Vitesse: {speedRef.current.toFixed(1)}x</span>
        </div>

        <div className={styles["score-box"]}>
          <span className={styles["score-label"]}>Record</span>
          <span className={`${styles["score-val"]} ${styles["score-hi"]}`}>
            {String(highScore).padStart(5, "0")}
          </span>
        </div>
      </div>

      {/* Canvas Game Arena */}
      <div
        className={styles["canvas-wrapper"]}
        onClick={handleJump}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className={styles.canvas}
        />

        {/* Start Overlay */}
        {gameState === "idle" && (
          <div className={styles.overlay}>
            <div className={styles["overlay-title"]}>
              <span>🦖</span>
              <span>Dino Runner</span>
            </div>
            <p className={styles["overlay-sub"]}>
              jeu te3 bekri li bla internet!
              <br />
              <strong>Clique n&apos;importe win wela Space bech tebda</strong>
            </p>
            <div className={styles["overlay-actions"]}>
              <button
                className={styles["btn-restart"]}
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
              >
                <span>Ebda el le3b 🚀</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div className={styles.overlay}>
            <div className={styles["overlay-title"]}>
              <span>💥</span>
              <span>Khsart!</span>
            </div>
            <p className={styles["overlay-sub"]}>
              Score: <strong>{score}</strong> | Record:{" "}
              <strong>{highScore}</strong>
            </p>
            <div className={styles["overlay-actions"]}>
              <button
                className={styles["btn-restart"]}
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
              >
                <span>3awed l3ab 🔁</span>
              </button>
              <button
                className={styles["btn-home"]}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/?select=1");
                }}
              >
                <span>← Rja3</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls Bar */}
      <div className={styles["controls-bar"]}>
        <button
          className={`${styles["ctrl-btn"]} ${styles["btn-jump"]}`}
          onClick={(e) => {
            e.stopPropagation();
            handleJump();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleJump();
          }}
          aria-label="Na9az"
        >
          <span>🚀</span>
          <span>NA9AZ</span>
        </button>

        <button
          className={`${styles["ctrl-btn"]} ${styles["btn-duck"]} ${
            isDucking ? styles.ducking : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleDuckStart(800);
          }}
          onMouseDown={() => handleDuckStart(1200)}
          onMouseUp={handleDuckEnd}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDuckStart(800);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Thawad"
        >
          <span>⬇️</span>
          <span>THAWAD</span>
        </button>
      </div>

      {/* Keyboard Controls Hint */}
      <div className={styles.hint}>
        <span>PC:</span>
        <span className={styles.kbd}>Space</span>
        <span>ou</span>
        <span className={styles.kbd}>↑</span>
        <span>bech tna9az |</span>
        <span className={styles.kbd}>↓</span>
        <span>bech thawad</span>
      </div>
    </div>
  );
}

