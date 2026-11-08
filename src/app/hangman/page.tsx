"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./hangman.module.css";
import {
  ARCHERY_STAGES,
  type DifficultyConfig,
  type HangmanStageConfig,
  type Obstacle,
} from "./stages-data";

// Synthétiseur audio Web Audio API
function playArcherySound(type: "draw" | "shoot" | "cut" | "hitMan" | "thud" | "win" | "lose") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "draw") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(260, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "shoot") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "cut") {
      [880, 1174, 1760].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + i * 0.05 + 0.25);
      });
    } else if (type === "hitMan") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.26, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === "thud") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.35);
      });
    } else if (type === "lose") {
      [349.23, 293.66, 246.94, 175.0].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.28);
      });
    }
  } catch {}
}

const GRAVITY = 720;
const MAX_PULL = 90;
const POWER_MULT = 9.8;

// Les 3 phrases exactes demandées lors d'une touche sur le corps (un après un) :
const COMPLAINT_MESSAGES = [
  "ayy a viser mlih",
  "marakche tchouf ??",
  "kamal 3liya khir",
];

interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  inFlight: boolean;
  stuck: boolean;
  stuckOnMan?: boolean;
  offsetFromManX?: number;
  offsetFromManY?: number;
  stuckObstacleIndex?: number;
  stuckType?: "rect" | "rotating";
  offsetObsX?: number;
  offsetObsY?: number;
  rotRadius?: number;
  rotAngleOffset?: number;
  initialArrowAngle?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function HangmanArcheryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const diffParam = searchParams.get("diff");

  const [difficulty, setDifficulty] = useState<"facile" | "moyen" | "hard">(() => {
    if (diffParam === "hard") return "hard";
    if (diffParam === "moyen") return "moyen";
    return "facile";
  });

  const [stageIndex, setStageIndex] = useState(0);

  // Progression séquentielle : Niveaux débloqués un par un (1 -> 2 -> 3 -> 4 -> 5)
  const [unlockedLevels, setUnlockedLevels] = useState<Record<"facile" | "moyen" | "hard", number>>({
    facile: 0,
    moyen: 0,
    hard: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCardRef = useRef<HTMLDivElement | null>(null);

  // Zoom adaptatif pour smartphone : 1.0 par défaut pour voir tout le terrain sans couper l'archer
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const currentDiffData: DifficultyConfig = ARCHERY_STAGES[difficulty];
  const stageConfig: HangmanStageConfig = currentDiffData.stages[stageIndex];

  const [arrowsLeft, setArrowsLeft] = useState(stageConfig.arrowsAvailable);
  const [gameStatus, setGameStatus] = useState<"aiming" | "flying" | "won" | "lost">("aiming");
  const [lossReason, setLossReason] = useState<"head" | "body" | "arrows">("arrows");

  // État physique et d'animation
  const stateRef = useRef({
    bowX: 120,
    bowY: 385,
    isDragging: false,
    dragCurrentX: 120,
    dragCurrentY: 385,
    arrows: [] as Arrow[],
    activeArrow: null as Arrow | null,
    manX: stageConfig.gallowsX,
    manY: stageConfig.gallowsY + stageConfig.ropeLength + 45,
    manState: "hanging" as "hanging" | "falling" | "saved" | "dead",
    manVy: 0,
    ropeCut: false,
    particles: [] as Particle[],
    obstacles: [] as Obstacle[],
    time: 0,
    clouds: [
      { x: 50, y: 55, speed: 12, scale: 0.95 },
      { x: 300, y: 85, speed: 8, scale: 1.2 },
      { x: 600, y: 45, speed: 10, scale: 0.85 },
      { x: 840, y: 70, speed: 14, scale: 1.1 },
    ],
    manHitsCount: 0,
    arrowsRemaining: stageConfig.arrowsAvailable,
    status: "aiming" as "aiming" | "flying" | "won" | "lost",
    speechText: "",
    speechTimer: 0,
    complaintCycle: 0,
    deathReason: null as "head" | "body" | "arrows" | null,
  });

  // Initialisation du niveau
  const initStage = useCallback(
    (newDiff: "facile" | "moyen" | "hard", newStageIdx: number) => {
      const cfg = ARCHERY_STAGES[newDiff].stages[newStageIdx];
      setDifficulty(newDiff);
      setStageIndex(newStageIdx);
      setArrowsLeft(cfg.arrowsAvailable);
      setGameStatus("aiming");
      setLossReason("arrows");

      const s = stateRef.current;
      s.manX = cfg.gallowsX;
      s.manY = cfg.gallowsY + cfg.ropeLength + 45;
      s.manState = "hanging";
      s.manVy = 0;
      s.ropeCut = false;
      s.arrows = [];
      s.activeArrow = null;
      s.particles = [];
      s.obstacles = JSON.parse(JSON.stringify(cfg.obstacles));
      s.isDragging = false;
      s.dragCurrentX = s.bowX;
      s.dragCurrentY = s.bowY;
      s.manHitsCount = 0;
      s.arrowsRemaining = cfg.arrowsAvailable;
      s.status = "aiming";
      s.complaintCycle = 0;
      s.deathReason = null;

      // DEMANDE : "viser mlihh khoyaa" dure JUSTE 4s et UNIQUEMENT dans la 1ère partie de chaque niveau (newStageIdx === 0)
      if (newStageIdx === 0) {
        s.speechText = "viser mlihh khoyaa";
        s.speechTimer = 4.0; // Exactement 4 secondes !
      } else {
        s.speechText = "";
        s.speechTimer = 0;
      }
    },
    []
  );

  useEffect(() => {
    initStage(difficulty, stageIndex);
  }, [difficulty, stageIndex, initStage]);

  // 1. Bloquer le scroll/overscroll/bounce du navigateur sur mobile (comme Pong et Dino)
  useEffect(() => {
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // 2. Écouteurs tactiles natifs non-passifs pour bloquer tout déplacement/scroll du navigateur
  useEffect(() => {
    const canvas = canvasRef.current;
    const card = canvasCardRef.current;
    if (!canvas) return;

    const blockTouch = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };

    canvas.addEventListener("touchstart", blockTouch, { passive: false });
    canvas.addEventListener("touchmove", blockTouch, { passive: false });
    canvas.addEventListener("touchend", blockTouch, { passive: false });
    canvas.addEventListener("touchcancel", blockTouch, { passive: false });

    if (card) {
      card.addEventListener("touchstart", blockTouch, { passive: false });
      card.addEventListener("touchmove", blockTouch, { passive: false });
    }

    return () => {
      canvas.removeEventListener("touchstart", blockTouch);
      canvas.removeEventListener("touchmove", blockTouch);
      canvas.removeEventListener("touchend", blockTouch);
      canvas.removeEventListener("touchcancel", blockTouch);
      if (card) {
        card.removeEventListener("touchstart", blockTouch);
        card.removeEventListener("touchmove", blockTouch);
      }
    };
  }, []);

  const toggleFullscreen = () => {
    const card = canvasCardRef.current;
    if (!card) return;
    if (!document.fullscreenElement) {
      card.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Boucle de rendu Canvas & Moteur physique 60fps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const s = stateRef.current;
      s.time += dt;

      // Décompte du timer de parole
      if (s.speechTimer > 0) {
        s.speechTimer -= dt;
        if (s.speechTimer <= 0) {
          s.speechText = "";
        }
      }

      // 1. PHYSIQUE
      // Obstacles mobiles & rotatifs
      s.obstacles.forEach((obs) => {
        if (obs.isMoving && obs.moveSpeed && obs.minY !== undefined && obs.maxY !== undefined) {
          obs.y += (obs.direction || 1) * obs.moveSpeed;
          if (obs.y > obs.maxY) {
            obs.y = obs.maxY;
            obs.direction = -1;
          } else if (obs.y < obs.minY) {
            obs.y = obs.minY;
            obs.direction = 1;
          }
        }
      });

      // Mise à jour de la position des flèches plantées sur obstacles ou bonhomme
      s.arrows.forEach((arr) => {
        if (arr.stuckObstacleIndex !== undefined && arr.stuckObstacleIndex >= 0) {
          const obs = s.obstacles[arr.stuckObstacleIndex];
          if (obs) {
            if (arr.stuckType === "rotating") {
              const curRot = s.time * (obs.rotateSpeed || 2);
              arr.x = obs.x + Math.cos(curRot + (arr.rotAngleOffset || 0)) * (arr.rotRadius || 0);
              arr.y = obs.y + Math.sin(curRot + (arr.rotAngleOffset || 0)) * (arr.rotRadius || 0);
              arr.angle = (arr.initialArrowAngle || 0) + curRot;
            } else if (arr.stuckType === "rect") {
              arr.x = obs.x + (arr.offsetObsX || 0);
              arr.y = obs.y + (arr.offsetObsY || 0);
            }
          }
        } else if (arr.stuckOnMan) {
          arr.x = s.manX + (arr.offsetFromManX || 0);
          arr.y = s.manY + (arr.offsetFromManY || 0);
        }
      });

      // Nuages
      s.clouds.forEach((c) => {
        c.x += c.speed * dt;
        if (c.x > 1040) c.x = -130;
      });

      // Humain & Corde
      const gallowsX = stageConfig.gallowsX;
      const gallowsY = stageConfig.gallowsY;
      const ropeLength = stageConfig.ropeLength;

      if (s.manState === "hanging") {
        if (stageConfig.isSwinging && stageConfig.swingSpeed && stageConfig.swingAngle) {
          const swingRad = ((Math.sin(s.time * stageConfig.swingSpeed) * stageConfig.swingAngle) * Math.PI) / 180;
          s.manX = gallowsX + Math.sin(swingRad) * ropeLength;
          s.manY = gallowsY + Math.cos(swingRad) * ropeLength + 45;
        } else {
          s.manX = gallowsX;
          s.manY = gallowsY + ropeLength + 45;
        }
      } else if (s.manState === "falling") {
        s.manVy += GRAVITY * dt;
        s.manY += s.manVy * dt;
        if (s.manY >= 430) {
          s.manY = 430;
          s.manVy = 0;
          s.manState = "saved";
          playArcherySound("win");
          setGameStatus("won");
          s.status = "won";
          s.speechText = "rbaaht ! 🏆";
          s.speechTimer = 4.0;

          // Débloquer le niveau suivant
          setUnlockedLevels((prev) => ({
            ...prev,
            [difficulty]: Math.max(prev[difficulty], stageIndex + 1),
          }));

          // Feux d'artifice de confettis
          const confettiColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
          for (let i = 0; i < 65; i++) {
            s.particles.push({
              x: s.manX,
              y: s.manY - 20,
              vx: (Math.random() - 0.5) * 360,
              vy: -150 - Math.random() * 260,
              color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
              size: 3 + Math.random() * 4,
              alpha: 1,
              life: 1.8,
            });
          }
        }
      }

      // Flèche active en vol
      if (s.activeArrow && s.activeArrow.inFlight) {
        const arrow = s.activeArrow;
        arrow.vy += GRAVITY * dt;
        arrow.x += arrow.vx * dt;
        arrow.y += arrow.vy * dt;
        arrow.angle = Math.atan2(arrow.vy, arrow.vx);

        // TEST 1 : Corde coupée
        if (!s.ropeCut && s.manState === "hanging") {
          const ropeTopX = gallowsX;
          const ropeTopY = gallowsY;
          const ropeBottomX = s.manX;
          const ropeBottomY = s.manY - 45;

          const l2 = (ropeBottomX - ropeTopX) ** 2 + (ropeBottomY - ropeTopY) ** 2;
          let t = ((arrow.x - ropeTopX) * (ropeBottomX - ropeTopX) + (arrow.y - ropeTopY) * (ropeBottomY - ropeTopY)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = ropeTopX + t * (ropeBottomX - ropeTopX);
          const projY = ropeTopY + t * (ropeBottomY - ropeTopY);
          const distToRope = Math.hypot(arrow.x - projX, arrow.y - projY);

          const isMobile = typeof window !== "undefined" && window.innerWidth < 680;
          const hitTolerance = isMobile ? stageConfig.ropeWidth * 1.45 : stageConfig.ropeWidth;

          if (distToRope <= hitTolerance) {
            s.ropeCut = true;
            s.manState = "falling";
            s.manVy = 50;
            playArcherySound("cut");

            for (let i = 0; i < 32; i++) {
              s.particles.push({
                x: projX,
                y: projY,
                vx: (Math.random() - 0.5) * 260,
                vy: (Math.random() - 0.5) * 260,
                color: Math.random() > 0.5 ? "#f59e0b" : "#fef08a",
                size: 2.5 + Math.random() * 3.5,
                alpha: 1,
                life: 0.9,
              });
            }
          }
        }

        // TEST 2 : FLÈCHE TOUCHANT L'HUMAIN (TÊTE SÉPARÉE DE CORPS !) - Uniquement s'il est encore suspendu
        if (!s.ropeCut && s.manState === "hanging") {
          const dxMan = arrow.x - s.manX;
          const dyMan = arrow.y - s.manY;

          // Détection de la tête (centre : x=0, y=-32, rayon 18)
          const hitHead = Math.hypot(dxMan, dyMan + 32) < 18;
          // Détection du corps (torse & jambes)
          const hitTorso = Math.abs(dxMan) < 15 && dyMan >= -12 && dyMan <= 28;
          const hitLegs = Math.abs(dxMan) < 14 && dyMan > 28 && dyMan <= 55;

          if (hitHead) {
            // DEMANDE : Touché à la tête = NON PAS NORMAL ! DIT "ayyy rassi" ET MORT IMMÉDIATE !
            arrow.inFlight = false;
            arrow.stuck = true;
            arrow.stuckOnMan = true;
            arrow.offsetFromManX = dxMan;
            arrow.offsetFromManY = dyMan;
            s.arrows.push(arrow);
            s.activeArrow = null;

            s.manHitsCount = 3; // Mortel !
            s.manState = "dead";
            s.speechText = "ayyy rassi"; // Phrase exacte demandée pour la tête !
            s.speechTimer = 5.5;
            s.deathReason = "head";

            playArcherySound("hitMan");
            playArcherySound("lose");
            setGameStatus("lost");
            setLossReason("head");
            s.status = "lost";

            for (let i = 0; i < 20; i++) {
              s.particles.push({
                x: arrow.x,
                y: arrow.y,
                vx: (Math.random() - 0.5) * 160,
                vy: (Math.random() - 0.5) * 160,
                color: "#ef4444",
                size: 3 + Math.random() * 3,
                alpha: 1,
                life: 0.8,
              });
            }
          } else if (hitTorso || hitLegs) {
            // Touché au corps par erreur : 3 phrases un après un
            arrow.inFlight = false;
            arrow.stuck = true;
            arrow.stuckOnMan = true;
            arrow.offsetFromManX = dxMan;
            arrow.offsetFromManY = dyMan;
            s.arrows.push(arrow);
            s.activeArrow = null;

            s.manHitsCount += 1;
            playArcherySound("hitMan");

            // CYCLE DES 3 PHRASES (UN APRÈS UN) :
            // 1. "ayy a viser mlih"
            // 2. "marakche tchouf ??"
            // 3. "kamal 3liya khir"
            const phrase = COMPLAINT_MESSAGES[s.complaintCycle % COMPLAINT_MESSAGES.length];
            s.complaintCycle += 1;
            s.speechText = phrase;
            s.speechTimer = 5.5; // RESTE 5 À 6 SECONDES

            for (let i = 0; i < 16; i++) {
              s.particles.push({
                x: arrow.x,
                y: arrow.y,
                vx: (Math.random() - 0.5) * 140,
                vy: (Math.random() - 0.5) * 140,
                color: "#ef4444",
                size: 2.5 + Math.random() * 2.5,
                alpha: 1,
                life: 0.7,
              });
            }

            if (s.manHitsCount >= 3) {
              s.manState = "dead";
              s.deathReason = "body";
              playArcherySound("lose");
              setGameStatus("lost");
              setLossReason("body");
              s.status = "lost";
              s.speechText = "kamal 3liya khir ☠️";
              s.speechTimer = 6;
            } else {
              setGameStatus("aiming");
              s.status = "aiming";
            }
          }
        }

        // TEST 3 : Obstacles statiques & rotatifs (Plantation sur l'obstacle)
        if (arrow.inFlight) {
          for (let obsIndex = 0; obsIndex < s.obstacles.length; obsIndex++) {
            const obs = s.obstacles[obsIndex];
            if (obs.isRotating) {
              // Obstacle rotatif (pales de moulin / hélice)
              const rotAngle = s.time * (obs.rotateSpeed || 2);
              const halfLen = (obs.length || 120) / 2;

              // Pale 1
              const x1 = obs.x + Math.cos(rotAngle) * halfLen;
              const y1 = obs.y + Math.sin(rotAngle) * halfLen;
              const x2 = obs.x - Math.cos(rotAngle) * halfLen;
              const y2 = obs.y - Math.sin(rotAngle) * halfLen;

              // Pale 2 (perpendiculaire)
              const x3 = obs.x + Math.cos(rotAngle + Math.PI / 2) * halfLen;
              const y3 = obs.y + Math.sin(rotAngle + Math.PI / 2) * halfLen;
              const x4 = obs.x - Math.cos(rotAngle + Math.PI / 2) * halfLen;
              const y4 = obs.y - Math.sin(rotAngle + Math.PI / 2) * halfLen;

              const d1 = distToSegment(arrow.x, arrow.y, x1, y1, x2, y2);
              const d2 = distToSegment(arrow.x, arrow.y, x3, y3, x4, y4);

              if (d1 < 12 || d2 < 12) {
                arrow.inFlight = false;
                arrow.stuck = true;
                arrow.stuckObstacleIndex = obsIndex;
                arrow.stuckType = "rotating";

                const curRot = s.time * (obs.rotateSpeed || 2);
                const dx = arrow.x - obs.x;
                const dy = arrow.y - obs.y;
                arrow.rotRadius = Math.hypot(dx, dy);
                arrow.rotAngleOffset = Math.atan2(dy, dx) - curRot;
                arrow.initialArrowAngle = arrow.angle - curRot;

                s.arrows.push(arrow);
                s.activeArrow = null;
                playArcherySound("thud");
                setGameStatus("aiming");
                s.status = "aiming";
                break;
              }
            } else {
              // Obstacle rectangulaire classique (mobile ou statique)
              if (
                arrow.x >= obs.x &&
                arrow.x <= obs.x + obs.width &&
                arrow.y >= obs.y &&
                arrow.y <= obs.y + obs.height
              ) {
                arrow.inFlight = false;
                arrow.stuck = true;
                arrow.stuckObstacleIndex = obsIndex;
                arrow.stuckType = "rect";

                // Stocke l'offset relatif pour bouger solidairement avec l'obstacle !
                arrow.offsetObsX = arrow.x - obs.x;
                arrow.offsetObsY = arrow.y - obs.y;

                s.arrows.push(arrow);
                s.activeArrow = null;
                playArcherySound("thud");
                setGameStatus("aiming");
                s.status = "aiming";
                break;
              }
            }
          }
        }

        // TEST 3.5 : Potence en bois massif (Arrêt net si on touche le bois de la potence)
        if (arrow && arrow.inFlight) {
          const inGallowsBeam =
            arrow.x >= gallowsX - 25 &&
            arrow.x <= gallowsX + 55 &&
            arrow.y >= gallowsY - 22 &&
            arrow.y <= gallowsY - 2;
          const inGallowsPost =
            arrow.x >= gallowsX + 38 &&
            arrow.x <= gallowsX + 58 &&
            arrow.y >= gallowsY - 20 &&
            arrow.y <= 475;

          if (inGallowsBeam || inGallowsPost) {
            arrow.inFlight = false;
            arrow.stuck = true;
            s.arrows.push(arrow);
            s.activeArrow = null;
            playArcherySound("thud");
            setGameStatus("aiming");
            s.status = "aiming";
          }
        }

        // TEST 4 : Sol & Hors écran
        if (arrow && arrow.inFlight) {
          if (arrow.y >= 475) {
            arrow.y = 475;
            arrow.inFlight = false;
            arrow.stuck = true;
            s.arrows.push(arrow);
            s.activeArrow = null;
            playArcherySound("thud");
            setGameStatus("aiming");
            s.status = "aiming";
          } else if (arrow.x > 1020 || arrow.x < -30 || arrow.y < -60) {
            arrow.inFlight = false;
            s.activeArrow = null;
            setGameStatus("aiming");
            s.status = "aiming";
          }
        }

        if (
          !s.activeArrow &&
          s.arrowsRemaining <= 0 &&
          !s.ropeCut &&
          s.manState === "hanging"
        ) {
          s.deathReason = "arrows";
          setLossReason("arrows");
          setGameStatus("lost");
          s.status = "lost";
          playArcherySound("lose");
        }
      }

      // Vérification générale de défaite si flèches finies et bonhomme non sauvé
      if (
        !s.activeArrow &&
        s.arrowsRemaining <= 0 &&
        !s.ropeCut &&
        s.manState === "hanging" &&
        s.status !== "lost" &&
        s.status !== "won"
      ) {
        s.deathReason = "arrows";
        setLossReason("arrows");
        setGameStatus("lost");
        s.status = "lost";
        playArcherySound("lose");
      }

      // Particules
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 320 * dt;
        p.life -= dt;
        p.alpha = Math.max(0, p.life);
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // ================= 2. RENDU CANVAS DESIGN WOW =================
      ctx.clearRect(0, 0, 960, 540);

      // Camera Zoom & Pan (pour téléphone et zoom)
      ctx.save();
      const currentZoom = zoomLevelRef.current;
      if (currentZoom > 1.0) {
        // Centrage de la caméra entre l'archer et la cible pour que ce ne soit pas "loin" sur téléphone
        const targetCenterX = (s.bowX + stageConfig.gallowsX) / 2;
        const targetCenterY = (s.bowY + stageConfig.gallowsY) / 2 - 20;
        ctx.translate(480, 270);
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-targetCenterX, -targetCenterY);
      }

      // Ciel dégradé d'aube médiévale étendu
      const skyGrad = ctx.createLinearGradient(0, -200, 0, 520);
      skyGrad.addColorStop(0, "#0284c7");
      skyGrad.addColorStop(0.35, "#38bdf8");
      skyGrad.addColorStop(0.7, "#bae6fd");
      skyGrad.addColorStop(1, "#f0fdf4");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-350, -250, 1660, 950);

      // Soleil doré et halo radiant
      const sunHalo = ctx.createRadialGradient(830, 85, 10, 830, 85, 80);
      sunHalo.addColorStop(0, "#ffffff");
      sunHalo.addColorStop(0.3, "#fef08a");
      sunHalo.addColorStop(0.7, "rgba(254, 240, 138, 0.4)");
      sunHalo.addColorStop(1, "rgba(254, 240, 138, 0)");
      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(830, 85, 80, 0, Math.PI * 2);
      ctx.fill();

      // Nuages parallaxe
      ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
      s.clouds.forEach((cl) => {
        ctx.save();
        ctx.translate(cl.x, cl.y);
        ctx.scale(cl.scale, cl.scale);
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.arc(16, -10, 24, 0, Math.PI * 2);
        ctx.arc(38, -6, 20, 0, Math.PI * 2);
        ctx.arc(52, 2, 16, 0, Math.PI * 2);
        ctx.arc(26, 8, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Montagnes lointaines avec forteresse médiévale (étendues)
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.moveTo(-350, 480);
      ctx.lineTo(-350, 320);
      ctx.lineTo(150, 230);
      ctx.lineTo(310, 290);
      ctx.lineTo(490, 200);
      ctx.lineTo(650, 280);
      ctx.lineTo(810, 230);
      ctx.lineTo(1350, 300);
      ctx.lineTo(1350, 480);
      ctx.closePath();
      ctx.fill();

      // Château médiéval
      ctx.fillStyle = "#64748b";
      ctx.fillRect(480, 188, 22, 15);
      ctx.fillRect(477, 184, 6, 6);
      ctx.fillRect(499, 184, 6, 6);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(491, 184);
      ctx.lineTo(491, 170);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(491, 170);
      ctx.lineTo(500, 173);
      ctx.lineTo(491, 176);
      ctx.closePath();
      ctx.fill();

      // Collines moyennes étendues
      ctx.fillStyle = "#86efac";
      ctx.beginPath();
      ctx.moveTo(-350, 480);
      ctx.quadraticCurveTo(250, 360, 510, 400);
      ctx.quadraticCurveTo(770, 440, 1350, 380);
      ctx.lineTo(1350, 600);
      ctx.lineTo(-350, 600);
      ctx.fill();

      // Sol riche en herbe avec fleurs étendu
      const groundGrad = ctx.createLinearGradient(0, 475, 0, 540);
      groundGrad.addColorStop(0, "#4ade80");
      groundGrad.addColorStop(0.18, "#22c55e");
      groundGrad.addColorStop(1, "#15803d");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(-350, 475, 1700, 95);

      ctx.fillStyle = "#78350f";
      ctx.fillRect(-350, 518, 1700, 40);

      // Brins d'herbe
      ctx.strokeStyle = "#86efac";
      ctx.lineWidth = 2.5;
      for (let gx = -250; gx < 1250; gx += 22) {
        ctx.beginPath();
        ctx.moveTo(gx, 475);
        ctx.lineTo(gx + 3, 467);
        ctx.moveTo(gx + 5, 475);
        ctx.lineTo(gx + 10, 465);
        ctx.stroke();
      }

      // Fleurs
      for (let fx = -220; fx < 1250; fx += 55) {
        const isRed = Math.abs(fx) % 110 === 0;
        ctx.fillStyle = isRed ? "#ef4444" : "#ffffff";
        ctx.beginPath();
        ctx.arc(fx, 472, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(fx, 472, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Obstacles du niveau (statiques et rotatifs)
      s.obstacles.forEach((obs) => {
        ctx.save();
        if (obs.isRotating) {
          // Obstacle rotatif à 4 pales
          const rotAngle = s.time * (obs.rotateSpeed || 2);
          const halfLen = (obs.length || 120) / 2;

          ctx.translate(obs.x, obs.y);
          ctx.rotate(rotAngle);

          // Pales en bois
          ctx.fillStyle = obs.color || "#854d0e";
          ctx.strokeStyle = "#271202";
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.roundRect(-halfLen, -7, obs.length || 120, 14, 4);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.roundRect(-7, -halfLen, 14, obs.length || 120, 4);
          ctx.fill();
          ctx.stroke();

          // Moyeu central en fer
          ctx.fillStyle = "#475569";
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // Obstacle rectangulaire
          ctx.fillStyle = obs.color || "#854d0e";
          ctx.strokeStyle = "#271202";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = "rgba(0,0,0,0.22)";
          ctx.lineWidth = 1.5;
          for (let py = obs.y + 20; py < obs.y + obs.height; py += 24) {
            ctx.beginPath();
            ctx.moveTo(obs.x + 3, py);
            ctx.lineTo(obs.x + obs.width - 3, py);
            ctx.stroke();
          }
        }
        ctx.restore();
      });

      // Potence en chêne massif
      ctx.save();
      ctx.fillStyle = "#5c2c08";
      ctx.strokeStyle = "#2e1502";
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      ctx.roundRect(gallowsX + 38, gallowsY - 20, 20, 390, 5);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(gallowsX - 25, gallowsY - 20, 80, 18, 5);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(gallowsX + 38, gallowsY + 34);
      ctx.lineTo(gallowsX + 8, gallowsY - 2);
      ctx.lineTo(gallowsX + 20, gallowsY - 2);
      ctx.lineTo(gallowsX + 38, gallowsY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gallowsX, gallowsY - 2, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Corde (très petite en Hard !)
      if (!s.ropeCut) {
        ctx.save();
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = difficulty === "hard" ? 3 : 4.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(gallowsX, gallowsY);
        ctx.lineTo(s.manX, s.manY - 45);
        ctx.stroke();

        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(gallowsX, gallowsY);
        ctx.lineTo(s.manX, s.manY - 45);
        ctx.stroke();

        ctx.fillStyle = "#92400e";
        ctx.beginPath();
        ctx.arc(s.manX, s.manY - 45, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Humain "Bnadem" (بنادم)
      ctx.save();
      ctx.translate(s.manX, s.manY);

      if (s.manState === "dead") {
        ctx.rotate(0.28);
      } else if (s.manState === "saved") {
        ctx.translate(0, -Math.abs(Math.sin(s.time * 6)) * 16);
      }

      // Ombre
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.beginPath();
      ctx.ellipse(0, 475 - s.manY, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jambes & Baskets
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-6, 20);
      ctx.lineTo(-7, 44);
      ctx.moveTo(6, 20);
      ctx.lineTo(7, 44);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-12, 42, 11, 6);
      ctx.fillRect(2, 42, 11, 6);

      // Corps
      ctx.fillStyle = s.manState === "saved" ? "#10b981" : "#0284c7";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-13, -14, 26, 35, 7);
      ctx.fill();
      ctx.stroke();

      // Bras
      ctx.strokeStyle = s.manState === "saved" ? "#10b981" : "#0284c7";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      if (s.manState === "saved") {
        ctx.moveTo(-10, -8);
        ctx.lineTo(-22, -30);
        ctx.moveTo(10, -8);
        ctx.lineTo(22, -30);
      } else {
        ctx.moveTo(-10, -8);
        ctx.lineTo(-15, 16);
        ctx.moveTo(10, -8);
        ctx.lineTo(15, 16);
      }
      ctx.stroke();

      // Corde torse
      if (!s.ropeCut) {
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.moveTo(-12, 8);
        ctx.lineTo(12, 8);
        ctx.stroke();
      }

      // Tête
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -32, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(244, 63, 94, 0.4)";
      ctx.beginPath();
      ctx.arc(-10, -28, 4, 0, Math.PI * 2);
      ctx.arc(10, -28, 4, 0, Math.PI * 2);
      ctx.fill();

      // Casquette
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, -38, 15, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(0, -39, 18, 5);

      // Yeux & Bouche
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#0f172a";

      if (s.manState === "dead" || s.manHitsCount >= 3) {
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-9, -36);
        ctx.lineTo(-3, -30);
        ctx.moveTo(-3, -36);
        ctx.lineTo(-9, -30);
        ctx.moveTo(3, -36);
        ctx.lineTo(9, -30);
        ctx.moveTo(9, -36);
        ctx.lineTo(3, -30);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.ellipse(0, -22, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.manState === "saved") {
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-5, -33, 4, Math.PI, 0);
        ctx.arc(5, -33, 4, Math.PI, 0);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, -26, 7, 0, Math.PI);
        ctx.fill();
      } else {
        let eyeDx = 0;
        let eyeDy = 0;
        if (s.activeArrow) {
          const angleToArrow = Math.atan2(s.activeArrow.y - s.manY, s.activeArrow.x - s.manX);
          eyeDx = Math.cos(angleToArrow) * 2.5;
          eyeDy = Math.sin(angleToArrow) * 2;
        }

        ctx.beginPath();
        ctx.arc(-5 + eyeDx, -33 + eyeDy, 2.5, 0, Math.PI * 2);
        ctx.arc(5 + eyeDx, -33 + eyeDy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (s.manHitsCount === 2) {
          ctx.beginPath();
          ctx.arc(0, -24, 4.5, Math.PI, 0);
          ctx.stroke();
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(15, -42, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.manHitsCount === 1) {
          ctx.beginPath();
          ctx.ellipse(0, -24, 2.8, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, -26, 4.5, 0, Math.PI);
          ctx.stroke();
        }
      }

      ctx.restore(); // Fin Man

      // BULLE DE PAROLE QUI SORT DE LA BOUCHE
      if (s.speechText && s.speechText.length > 0) {
        ctx.save();
        ctx.font = '900 13px "Outfit", sans-serif';
        const msg = s.speechText;
        const textMetrics = ctx.measureText(msg);
        const padH = 14;
        const padV = 8;
        const bubbleW = textMetrics.width + padH * 2;
        const bubbleH = 28;

        const showOnLeft = s.manX > 750;
        const bx = showOnLeft ? s.manX - bubbleW - 22 : s.manX + 22;
        const by = s.manY - 58;

        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(bx, by, bubbleW, bubbleH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = "transparent";
        ctx.beginPath();
        if (showOnLeft) {
          ctx.moveTo(bx + bubbleW, by + 10);
          ctx.lineTo(s.manX - 2, s.manY - 26);
          ctx.lineTo(bx + bubbleW, by + 18);
        } else {
          ctx.moveTo(bx, by + 10);
          ctx.lineTo(s.manX + 2, s.manY - 26);
          ctx.lineTo(bx, by + 18);
        }
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = s.manHitsCount >= 3 ? "#dc2626" : s.manHitsCount > 0 ? "#b45309" : "#0f172a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(msg, bx + bubbleW / 2, by + bubbleH / 2 + 1);
        ctx.restore();
      }

      // ARCHER ROBIN HOOD À GAUCHE
      const bowX = s.bowX;
      const bowY = s.bowY;

      ctx.save();
      ctx.fillStyle = "#94a3b8";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(bowX - 60, bowY + 40, 70, 45, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.roundRect(bowX - 42, bowY - 18, 12, 34, 4);
      ctx.fill();
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(bowX - 44, bowY - 26, 4, 10);
      ctx.fillRect(bowX - 38, bowY - 28, 4, 12);

      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.roundRect(bowX - 35, bowY - 10, 24, 52, 7);
      ctx.fill();

      ctx.fillStyle = "#78350f";
      ctx.fillRect(bowX - 35, bowY + 14, 24, 6);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(bowX - 26, bowY + 13, 6, 8);

      ctx.fillStyle = "#166534";
      ctx.beginPath();
      ctx.arc(bowX - 23, bowY - 24, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(bowX - 28, bowY - 32);
      ctx.lineTo(bowX - 45, bowY - 48);
      ctx.lineTo(bowX - 24, bowY - 36);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fed7aa";
      ctx.beginPath();
      ctx.arc(bowX - 21, bowY - 22, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(bowX - 17, -24 + bowY, 3, 3);

      // Arc & Corde
      const pullX = s.isDragging ? s.dragCurrentX : bowX;
      const pullY = s.isDragging ? s.dragCurrentY : bowY;
      const dragDist = Math.hypot(bowX - pullX, bowY - pullY);
      const flexBonus = s.isDragging ? Math.min(dragDist * 0.15, 12) : 0;

      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(bowX + 6 - flexBonus, bowY, 34, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bowX + 6 - flexBonus, bowY - 34);
      ctx.lineTo(pullX, pullY);
      ctx.lineTo(bowX + 6 - flexBonus, bowY + 34);
      ctx.stroke();

      if (s.isDragging) {
        ctx.strokeStyle = "#fed7aa";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bowX - 16, bowY);
        ctx.lineTo(pullX, pullY);
        ctx.stroke();
      }

      // BADGE AU-DESSUS DE L'ARCHER : NOMBRE DE FLÈCHES RESTANTES
      ctx.font = '900 13px "Outfit", sans-serif';
      const arrowBadgeText = `🏹 ${s.arrowsRemaining}`;
      const badgeTextW = ctx.measureText(arrowBadgeText).width;
      const badgePillW = badgeTextW + 16;
      const badgePillH = 22;
      const badgePillX = bowX - 23 - badgePillW / 2;
      const badgePillY = bowY - 60;

      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = s.arrowsRemaining <= 1 ? "#fef2f2" : "#ffffff";
      ctx.strokeStyle = s.arrowsRemaining <= 1 ? "#ef4444" : "#cbd5e1";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(badgePillX, badgePillY, badgePillW, badgePillH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.fillStyle = s.arrowsRemaining <= 1 ? "#dc2626" : "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(arrowBadgeText, badgePillX + badgePillW / 2, badgePillY + badgePillH / 2 + 1);

      ctx.restore();

      // TRAJECTOIRE PRÉDICTIVE (CONTRÔLÉE PAR STAGE CONFIG — 0 EN HARD !)
      if (s.isDragging && stageConfig.trajectoryDots > 0) {
        const dx = bowX - s.dragCurrentX;
        const dy = bowY - s.dragCurrentY;
        const dist = Math.min(Math.hypot(dx, dy), MAX_PULL);
        const angle = Math.atan2(dy, dx);
        const speed = dist * POWER_MULT;
        const vx0 = Math.cos(angle) * speed;
        const vy0 = Math.sin(angle) * speed;

        ctx.save();
        const stepDt = 0.045;
        const maxSteps = stageConfig.trajectoryDots;
        let trajX = bowX;
        let trajY = bowY;
        let trajVx = vx0;
        let trajVy = vy0;

        for (let i = 0; i < maxSteps; i++) {
          trajVy += GRAVITY * stepDt;
          trajX += trajVx * stepDt;
          trajY += trajVy * stepDt;

          const progress = i / maxSteps;
          ctx.fillStyle = `rgba(239, 68, 68, ${0.9 - progress * 0.45})`;
          ctx.beginPath();
          const dotSize = Math.max(1.8, 4.4 - i * 0.1);
          ctx.arc(trajX, trajY, dotSize, 0, Math.PI * 2);
          ctx.fill();

          if (i === 0) {
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.arc(trajX, trajY, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        ctx.save();
        ctx.translate(pullX, pullY);
        ctx.rotate(angle);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(46, 0);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(46, -5);
        ctx.lineTo(58, 0);
        ctx.lineTo(46, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (s.isDragging) {
        // En mode Hard (0 dots) : flèche sur la corde uniquement
        const dx = bowX - s.dragCurrentX;
        const dy = bowY - s.dragCurrentY;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(pullX, pullY);
        ctx.rotate(angle);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(46, 0);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(46, -5);
        ctx.lineTo(58, 0);
        ctx.lineTo(46, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Flèche active
      if (s.activeArrow && s.activeArrow.inFlight) {
        const arr = s.activeArrow;
        ctx.save();
        ctx.translate(arr.x, arr.y);
        ctx.rotate(arr.angle);
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-32, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(14, -5);
        ctx.lineTo(26, 0);
        ctx.lineTo(14, 5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-32, -4);
        ctx.lineTo(-24, 0);
        ctx.lineTo(-32, 4);
        ctx.stroke();
        ctx.restore();
      }

      // Flèches plantées
      s.arrows.forEach((arr) => {
        if (!arr.stuckOnMan && arr.stuck) {
          ctx.save();
          ctx.translate(arr.x, arr.y);
          ctx.rotate(arr.angle);
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(-28, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.moveTo(8, -4);
          ctx.lineTo(16, 0);
          ctx.lineTo(8, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });

      // Particules
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.restore(); // Fin Camera Zoom

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, stageIndex, stageConfig]);

  // ÉCOUTEURS POINTER
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) * (960 / rect.width);
    let y = (e.clientY - rect.top) * (540 / rect.height);

    const currentZoom = zoomLevelRef.current;
    if (currentZoom > 1.0) {
      const targetCenterX = (stateRef.current.bowX + stageConfig.gallowsX) / 2;
      const targetCenterY = (stateRef.current.bowY + stageConfig.gallowsY) / 2 - 20;
      x = (x - 480) / currentZoom + targetCenterX;
      y = (y - 270) / currentZoom + targetCenterY;
    }

    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (gameStatus !== "aiming" || s.status !== "aiming" || arrowsLeft <= 0 || s.ropeCut) return;
    if (s.activeArrow && s.activeArrow.inFlight) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    s.isDragging = true;
    const coords = getCanvasCoords(e);
    s.dragCurrentX = coords.x;
    s.dragCurrentY = coords.y;
    playArcherySound("draw");
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s.isDragging) return;
    const coords = getCanvasCoords(e);
    s.dragCurrentX = coords.x;
    s.dragCurrentY = coords.y;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s.isDragging) return;
    s.isDragging = false;

    const dx = s.bowX - s.dragCurrentX;
    const dy = s.bowY - s.dragCurrentY;
    const pullDist = Math.hypot(dx, dy);

    if (pullDist >= 14) {
      const clampedPull = Math.min(pullDist, MAX_PULL);
      const angle = Math.atan2(dy, dx);
      const speed = clampedPull * POWER_MULT;

      const newArrow: Arrow = {
        x: s.bowX,
        y: s.bowY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        inFlight: true,
        stuck: false,
      };

      s.activeArrow = newArrow;
      const nextArrows = arrowsLeft - 1;
      setArrowsLeft(nextArrows);
      s.arrowsRemaining = nextArrows;
      setGameStatus("flying");
      s.status = "flying";
      playArcherySound("shoot");
    }
  };

  const nextStage = () => {
    if (stageIndex < 4) {
      initStage(difficulty, stageIndex + 1);
    } else {
      initStage(difficulty, 0);
    }
  };

  const restartStage = () => {
    initStage(difficulty, stageIndex);
  };

  return (
    <main className={styles["archery-page"]}>
      {/* HEADER */}
      <div className={styles["archery-header"]}>
        <button
          className={styles["back-link"]}
          onClick={() => router.push("/?select=1")}
          id="btn-archery-back"
        >
          ← Rja3
        </button>
        <div className={styles["archery-logo"]}>
          <span className="gradient-text">Hangman Archery 🎯</span>
        </div>
        <div className={styles["header-badges"]}>
          <div className={`${styles["badge-quiver"]} ${arrowsLeft <= 1 ? styles.danger : ""}`}>
            <span>🏹</span>
            <span>{arrowsLeft} flèches</span>
          </div>
          <button
            className={`${styles["btn-header-tool"]} ${zoomLevel > 1.0 ? styles.active : ""}`}
            onClick={() => setZoomLevel((z) => (z > 1.0 ? 1.0 : 1.35))}
            title="Activer ou désactiver le zoom mobile"
            id="btn-toggle-zoom"
          >
            <span>🔍</span>
            <span>{zoomLevel > 1.0 ? "1.35x" : "1x"}</span>
          </button>
          <button
            className={styles["btn-header-tool"]}
            onClick={toggleFullscreen}
            title="Mode plein écran (Mobile / PC)"
            id="btn-toggle-fullscreen"
          >
            <span>⛶</span>
          </button>
        </div>
      </div>

      {/* RAPPEL MOBILE POUR ÉCRAN PAYSAGE */}
      <span className={styles["mobile-hint-pill"]}>
        📲 Tourne en paysage ou clique ⛶ pour plein écran
      </span>

      {/* SELECTEUR DE DIFFICULTÉ (3 Niveaux : Sahel, Moyen, Hard) */}
      <div className={styles["diff-container"]}>
        <div className={styles["diff-bar"]}>
          <button
            className={`${styles["diff-chip"]} ${
              difficulty === "facile" ? styles["active-facile"] : ""
            }`}
            onClick={() => initStage("facile", 0)}
            id="btn-diff-facile"
          >
            Sahel 🌱
          </button>
          <button
            className={`${styles["diff-chip"]} ${
              difficulty === "moyen" ? styles["active-moyen"] : ""
            }`}
            onClick={() => initStage("moyen", 0)}
            id="btn-diff-moyen"
          >
            Moyen 🟡
          </button>
          <button
            className={`${styles["diff-chip"]} ${
              difficulty === "hard" ? styles["active-hard"] : ""
            }`}
            onClick={() => initStage("hard", 0)}
            id="btn-diff-hard"
          >
            Hard 🔥
          </button>
        </div>
        <span className={styles["diff-caption"]}>{currentDiffData.caption}</span>
      </div>

      {/* PROGRESSION SÉQUENTIELLE DES 5 NIVEAUX (1 -> 2 -> 3 -> 4 -> 5) */}
      <div className={styles["stage-stepper-box"]}>
        <div className={styles["stage-stepper"]}>
          {[0, 1, 2, 3, 4].map((idx) => {
            const isCurrent = stageIndex === idx;
            const isUnlocked = idx <= unlockedLevels[difficulty];
            const isCleared = idx < unlockedLevels[difficulty];

            return (
              <button
                key={idx}
                className={`
                  ${styles["stage-dot-btn"]}
                  ${isCurrent ? styles.current : ""}
                  ${isCleared ? styles.cleared : ""}
                  ${!isUnlocked ? styles.locked : ""}
                `}
                onClick={() => {
                  if (isUnlocked) initStage(difficulty, idx);
                }}
                disabled={!isUnlocked}
                title={isUnlocked ? `Niveau ${idx + 1}` : `Niveau ${idx + 1} verrouillé 🔒`}
              >
                {!isUnlocked ? "🔒" : isCleared ? "✓" : `Niv ${idx + 1}`}
              </button>
            );
          })}
        </div>

        <div className={styles["stage-info-bar"]}>
          <span>{stageConfig.title}</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            {difficulty === "hard"
              ? "🔥 Trajectoire courte & Corde minuscule — Hard Ultime !"
              : "🎯 Vise la corde pour sauver l'humain !"}
          </span>
        </div>
      </div>

      {/* CANVAS ARENA CARD DESIGN WOW */}
      <div ref={canvasCardRef} className={styles["canvas-card"]}>
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className={styles["canvas-viewport"]}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* OVERLAYS VICTOIRE (rbaaht / troh niveau morah / roh niveau X) */}
        {gameStatus === "won" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3.6rem" }}>🏆</div>
            <h2 className={styles["overlay-title"]} style={{ color: "#10b981" }}>
              rbaaht !
            </h2>
            <p className={styles["overlay-desc"]}>
              {stageIndex < 4 ? (
                <>troh niveau morah</>
              ) : (
                <>Mabrouk ! Kémelt kamel les 5 niveaux en {currentDiffData.name} ! 🎉</>
              )}
            </p>
            <div className={styles["overlay-buttons"]}>
              <button
                className={`${styles["btn-action"]} ${styles["btn-action-primary"]}`}
                onClick={nextStage}
                id="btn-archery-next"
              >
                {stageIndex < 4 ? `roh niveau ${stageIndex + 2}` : "🔄 Rejouer le niveau"}
              </button>
            </div>
          </div>
        )}

        {/* OVERLAYS DÉFAITE (dommage kamlou les fleche / OPTION RECOMMENCER PAS PLUS) */}
        {gameStatus === "lost" && (
          <div className={styles.overlay}>
            <div style={{ fontSize: "3.6rem" }}>
              {lossReason === "head" ? "😵" : lossReason === "body" ? "☠️" : "🏹"}
            </div>
            <h2 className={styles["overlay-title"]} style={{ color: "#ef4444" }}>
              {lossReason === "head"
                ? "ayyy rassi !"
                : lossReason === "body"
                ? "kamal 3liya khir !"
                : "dommage kamlou les fleche"}
            </h2>
            <div className={styles["overlay-buttons"]}>
              <button
                className={`${styles["btn-action"]} ${styles["btn-action-primary"]}`}
                onClick={restartStage}
                id="btn-archery-retry"
              >
                🔄 Recommencer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ACTION CONTROLS */}
      <div className={styles["actions-row"]}>
        <button
          className={styles["btn-action"]}
          onClick={restartStage}
          id="btn-archery-restart"
        >
          🔄 Recommencer
        </button>
        <button
          className="btn-secondary"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => router.push("/?select=1")}
          id="btn-archery-menu"
        >
          🏠 Changer de jeu
        </button>
      </div>
    </main>
  );
}

export default function HangmanPage() {
  return (
    <Suspense
      fallback={
        <div
          className="page-wrapper"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <div style={{ fontSize: "3rem" }}>⏳</div>
        </div>
      }
    >
      <HangmanArcheryContent />
    </Suspense>
  );
}
