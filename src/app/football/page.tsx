"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import styles from "./football.module.css";

// ================= AUDIO SYNTHESIZER (WEB AUDIO API) =================
function playFootballSound(type: "kick" | "whistle" | "goal" | "save" | "post" | "miss" | "bullet") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "kick" || type === "bullet") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const startFreq = type === "bullet" ? 175 : 140;
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(type === "bullet" ? 0.65 : 0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);

      // Bruit blanc de frappe
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(type === "bullet" ? 700 : 520, ctx.currentTime);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
    } else if (type === "whistle") {
      [2450, 2720].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(freq + 40, ctx.currentTime + 0.14);
        osc.frequency.linearRampToValueAtTime(freq, ctx.currentTime + 0.32);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.32);
      });
    } else if (type === "goal") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.26, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.5);
      });

      const bufferSize = ctx.sampleRate * 0.9;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }
      const crowd = ctx.createBufferSource();
      crowd.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(850, ctx.currentTime);
      const crowdGain = ctx.createGain();
      crowdGain.gain.setValueAtTime(0.35, ctx.currentTime);
      crowdGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      crowd.connect(filter);
      filter.connect(crowdGain);
      crowdGain.connect(ctx.destination);
      crowd.start();
    } else if (type === "save") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(190, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.55, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === "post") {
      [587.33, 880, 1174.66, 1760].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.28, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      });
    } else if (type === "miss") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(135, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(85, ctx.currentTime + 0.38);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    }
  } catch {
    // Audio non bloquant
  }
}

// ================= MATH & CURVE UTILITIES =================
interface Point {
  x: number;
  y: number;
}

// Lissage Catmull-Rom pour obtenir la courbe Score! Hero fluide
function getCatmullRomPoints(points: Point[], numSegmentsPerSpan = 8): Point[] {
  if (points.length < 2) return points;
  if (points.length === 2) {
    const res: Point[] = [];
    for (let i = 0; i <= numSegmentsPerSpan; i++) {
      const t = i / numSegmentsPerSpan;
      res.push({
        x: points[0].x + (points[1].x - points[0].x) * t,
        y: points[0].y + (points[1].y - points[0].y) * t,
      });
    }
    return res;
  }

  const p = [points[0], ...points, points[points.length - 1]];
  const smoothed: Point[] = [];

  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];

    for (let j = 0; j < numSegmentsPerSpan; j++) {
      const t = j / numSegmentsPerSpan;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      smoothed.push({ x, y });
    }
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}

function getPathTotalLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

// Dérivation aérodynamique (Anti-zigzag) : si le joueur trace "gauche droite gauche droite",
// le ballon ne zigzague pas comme un serpent mais dérive selon la physique réelle du football !
function computeAerodynamicTrajectory(rawPoints: Point[]): {
  points: Point[];
  isDerived: boolean;
  inflections: number;
} {
  if (rawPoints.length < 3) {
    return { points: getCatmullRomPoints(rawPoints, 6), isDerived: false, inflections: 0 };
  }

  const p0 = rawPoints[0];
  const pEnd = rawPoints[rawPoints.length - 1];
  const dx = pEnd.x - p0.x;
  const dy = pEnd.y - p0.y;
  const cordLen = Math.hypot(dx, dy);
  if (cordLen < 15) {
    return { points: getCatmullRomPoints(rawPoints, 6), isDerived: false, inflections: 0 };
  }

  // Vecteur normal perpendiculaire à la corde reliant le départ à la cible
  const nx = -dy / cordLen;
  const ny = dx / cordLen;

  let inflections = 0;
  let lastSign = 0;
  let netDev = 0;

  for (let i = 1; i < rawPoints.length - 1; i++) {
    const vx = rawPoints[i].x - p0.x;
    const vy = rawPoints[i].y - p0.y;
    const dev = vx * nx + vy * ny;
    netDev += dev;
    const sign = dev > 5 ? 1 : dev < -5 ? -1 : 0;
    if (sign !== 0) {
      if (lastSign !== 0 && sign !== lastSign) {
        inflections++;
      }
      lastSign = sign;
    }
  }

  // RÈGLE SCORE! HERO RÉELLE : Si plusieurs zigzags (inflections > 1), le ballon dérive !
  if (inflections > 1) {
    const avgDev = netDev / (rawPoints.length - 2);
    const clampedDev = Math.max(-65, Math.min(65, avgDev * 0.85));

    const midX = (p0.x + pEnd.x) / 2 + nx * clampedDev;
    const midY = (p0.y + pEnd.y) / 2 + ny * clampedDev;

    const derivedPoints: Point[] = [];
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const invT = 1 - t;
      const x = invT * invT * p0.x + 2 * invT * t * midX + t * t * pEnd.x;
      const y = invT * invT * p0.y + 2 * invT * t * midY + t * t * pEnd.y;
      derivedPoints.push({ x, y });
    }
    return { points: derivedPoints, isDerived: true, inflections };
  }

  return { points: getCatmullRomPoints(rawPoints, 6), isDerived: false, inflections };
}

interface NetNode {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
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

function FootballGameContent() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCardRef = useRef<HTMLDivElement | null>(null);

  // Stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shotsCount, setShotsCount] = useState(0);
  const [lastShotSpeed, setLastShotSpeed] = useState(98);
  const [lastShotPlacement, setLastShotPlacement] = useState("Frappe Enroulée 🎯");
  const [gameResult, setGameResult] = useState<"idle" | "goal" | "saved" | "post" | "miss">("idle");

  // État du moteur 60 FPS
  const stateRef = useRef({
    // Ballon
    ballX: 480,
    ballY: 440,
    ballZ: 0,
    ballRadius: 18,
    ballSpin: 0,
    ballVisible: true,
    inFlight: false,
    flightProgress: 0,
    flightDuration: 0.62,
    isBulletShot: false,
    curvePoints: [] as Point[],
    trail: [] as { x: number; y: number; z: number; alpha: number }[],

    // Tracé de la flèche Score! Hero
    isDrawing: false,
    rawDrawPoints: [] as Point[],
    smoothDrawPoints: [] as Point[],
    drawStartTime: 0,
    isDerived: false,

    // Tireur
    strikerX: 480,
    strikerY: 450,
    strikerPhase: 0,
    isKicking: false,

    // Gardien de but réaliste (Simulation physique réelle)
    gkBaseX: 480,
    gkBaseY: 218,
    gkStartX: 480,
    gkStartY: 218,
    gkX: 480,
    gkY: 218,
    gkTargetX: 480,
    gkTargetY: 218,
    gkState: "idle" as "idle" | "diving" | "saved" | "beaten",
    gkDiveProgress: 0,
    gkDiveDuration: 0.52,
    gkBounceTimer: 0,
    gkBodyAngle: 0,
    gkIsHighDive: false,
    gkDiveDir: 1,
    gkGloveX: 480,
    gkGloveY: 200,

    // Caméra cinématique dynamique (Score! Hero zoom & pan)
    camZoom: 1.0,
    camPanX: 0,
    camPanY: 0,
    camShake: 0,

    // Filet 3D (Net spring physics)
    netNodes: [] as NetNode[][],
    netImpactX: 0,
    netImpactY: 0,
    netImpactActive: false,

    // Particules & Flashs
    particles: [] as Particle[],
    flashbulbs: [] as { x: number; y: number; alpha: number }[],
    time: 0,
  });

  // Initialisation du filet 3D
  const initNetGrid = useCallback(() => {
    const s = stateRef.current;
    const cols = 16;
    const rows = 9;
    const nodes: NetNode[][] = [];

    const goalLeft = 300;
    const goalRight = 660;
    const goalTop = 138;
    const goalBottom = 224;

    for (let r = 0; r <= rows; r++) {
      const rowNodes: NetNode[] = [];
      const v = r / rows;
      const y = goalTop + v * (goalBottom - goalTop);

      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const x = goalLeft + u * (goalRight - goalLeft);
        rowNodes.push({
          baseX: x,
          baseY: y,
          x,
          y,
          vx: 0,
          vy: 0,
        });
      }
      nodes.push(rowNodes);
    }
    s.netNodes = nodes;
  }, []);

  // Réinitialiser le tir
  const resetShot = useCallback(() => {
    const s = stateRef.current;
    s.ballX = 480;
    s.ballY = 440;
    s.ballZ = 0;
    s.ballRadius = 18;
    s.ballSpin = 0;
    s.ballVisible = true;
    s.inFlight = false;
    s.flightProgress = 0;
    s.isBulletShot = false;
    s.curvePoints = [];
    s.trail = [];

    s.isDrawing = false;
    s.rawDrawPoints = [];
    s.smoothDrawPoints = [];
    s.isDerived = false;

    s.strikerPhase = 0;
    s.isKicking = false;

    s.gkStartX = 480;
    s.gkStartY = 218;
    s.gkX = 480;
    s.gkY = 218;
    s.gkTargetX = 480;
    s.gkTargetY = 218;
    s.gkState = "idle";
    s.gkDiveProgress = 0;
    s.gkBodyAngle = 0;
    s.gkGloveX = 480;
    s.gkGloveY = 200;

    s.camZoom = 1.0;
    s.camPanX = 0;
    s.camPanY = 0;
    s.camShake = 0;

    s.netImpactActive = false;

    initNetGrid();
    setGameResult("idle");
  }, [initNetGrid]);

  useEffect(() => {
    initNetGrid();
    playFootballSound("whistle");
  }, [initNetGrid]);

  useEffect(() => {
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

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

  // BOUCLE PRINCIPALE 60 FPS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;
      const s = stateRef.current;
      s.time += dt;

      // ================= 1. PHYSIQUE & ANIMATIONS =================
      // Flashs dans la foule
      if (Math.random() < 0.09) {
        s.flashbulbs.push({
          x: 40 + Math.random() * 880,
          y: 40 + Math.random() * 85,
          alpha: 1,
        });
      }
      for (let i = s.flashbulbs.length - 1; i >= 0; i--) {
        const fb = s.flashbulbs[i];
        fb.alpha -= dt * 4;
        if (fb.alpha <= 0) s.flashbulbs.splice(i, 1);
      }

      // Amortissement du shake caméra
      if (s.camShake > 0) {
        s.camShake = Math.max(0, s.camShake - dt * 25);
      }

      // Animation du tireur
      if (s.isKicking) {
        s.strikerPhase = Math.min(1.0, s.strikerPhase + dt * 6.5);
      }

      // Gardien en attente (Ready bounce)
      if (s.gkState === "idle") {
        s.gkBounceTimer += dt * 5.5;
        s.gkY = s.gkBaseY + Math.sin(s.gkBounceTimer) * 2;
        s.gkX = s.gkBaseX + Math.sin(s.gkBounceTimer * 0.5) * 4;
      }

      // Plongeon du gardien ("saute comme vrai")
      if (s.gkState === "diving") {
        s.gkDiveProgress = Math.min(1.0, s.gkDiveProgress + dt / s.gkDiveDuration);
        const p = s.gkDiveProgress;

        const easeX = 1 - Math.pow(1 - p, 2.4);
        s.gkX = s.gkStartX + (s.gkTargetX - s.gkStartX) * easeX;

        // Hauteur de saut balistique
        const jumpAltitude = s.gkIsHighDive ? 46 : 16;
        const jumpArc = Math.sin(p * Math.PI) * jumpAltitude;
        const targetLift = s.gkStartY + (s.gkTargetY - s.gkStartY) * easeX;
        s.gkY = targetLift - jumpArc;

        // Angle de rotation athlétique
        const targetAngle = s.gkDiveDir * (s.gkIsHighDive ? 1.15 : 0.8);
        s.gkBodyAngle = targetAngle * Math.sin(Math.min(1, p * 1.3) * Math.PI * 0.5);

        // Position de la main / gant
        const armStretch = s.gkIsHighDive ? 48 : 38;
        s.gkGloveX = s.gkX + s.gkDiveDir * Math.cos(Math.abs(s.gkBodyAngle) * 0.7) * armStretch;
        s.gkGloveY = s.gkY - Math.sin(Math.abs(s.gkBodyAngle) * 0.7) * armStretch - 6;

        // Projections d'herbe au sol lors de la poussée
        if (p < 0.22 && Math.random() < 0.45) {
          s.particles.push({
            x: s.gkStartX - s.gkDiveDir * 8,
            y: 220,
            vx: -s.gkDiveDir * (30 + Math.random() * 50),
            vy: -15 - Math.random() * 30,
            color: Math.random() > 0.5 ? "#15803d" : "#ffffff",
            size: 2 + Math.random() * 2,
            alpha: 0.9,
            life: 0.4,
          });
        }
      }

      // PHYSIQUE DU BALLON EN VOL
      if (s.inFlight && s.curvePoints.length >= 2) {
        s.flightProgress += dt / s.flightDuration;
        const p = Math.min(s.flightProgress, 1.0);

        // Caméra cinématique Score! Hero : zoom progressif et pan fluide vers le but
        const targetCamZoom = 1.0 + p * 0.12;
        s.camZoom += (targetCamZoom - s.camZoom) * 0.1;
        const targetPanX = (s.ballX - 480) * 0.18;
        const targetPanY = (s.ballY - 260) * 0.12;
        s.camPanX += (targetPanX - s.camPanX) * 0.1;
        s.camPanY += (targetPanY - s.camPanY) * 0.1;

        const indexFloat = p * (s.curvePoints.length - 1);
        const idx = Math.floor(indexFloat);
        const fract = indexFloat - idx;
        const pt1 = s.curvePoints[idx];
        const pt2 = s.curvePoints[Math.min(idx + 1, s.curvePoints.length - 1)];

        const curveX = pt1.x + (pt2.x - pt1.x) * fract;
        const curveY = pt1.y + (pt2.y - pt1.y) * fract;

        const arch = Math.sin(p * Math.PI) * 44;
        s.ballX = curveX;
        s.ballY = curveY - arch;
        s.ballZ = p;
        s.ballRadius = 18 * (1 - p * 0.52);
        s.ballSpin += dt * 16;

        s.trail.push({ x: s.ballX, y: s.ballY, z: s.ballZ, alpha: s.isBulletShot ? 0.95 : 0.75 });
        if (s.trail.length > (s.isBulletShot ? 20 : 14)) s.trail.shift();

        // ARRIVÉE DU BALLON SUR LA LIGNE DE BUT (Z = 1.0)
        if (s.flightProgress >= 1.0) {
          s.inFlight = false;
          s.flightProgress = 1.0;

          const targetX = s.curvePoints[s.curvePoints.length - 1].x;
          const targetY = s.curvePoints[s.curvePoints.length - 1].y;

          const goalLeft = 300;
          const goalRight = 660;
          const goalTop = 138;
          const goalBottom = 224;

          const hitLeftPost = Math.abs(targetX - goalLeft) < 13 && targetY >= goalTop - 6 && targetY <= goalBottom;
          const hitRightPost = Math.abs(targetX - goalRight) < 13 && targetY >= goalTop - 6 && targetY <= goalBottom;
          const hitCrossbar = Math.abs(targetY - goalTop) < 11 && targetX >= goalLeft && targetX <= goalRight;

          setShotsCount((c) => c + 1);

          if (hitLeftPost || hitRightPost || hitCrossbar) {
            playFootballSound("post");
            setGameResult("post");
            setStreak(0);
            s.gkState = "saved";
            s.camShake = 7;

            for (let i = 0; i < 30; i++) {
              s.particles.push({
                x: targetX,
                y: targetY,
                vx: (Math.random() - 0.5) * 220,
                vy: -Math.random() * 180,
                color: "#facc15",
                size: 2.5 + Math.random() * 2,
                alpha: 1,
                life: 0.6,
              });
            }
          } else if (
            targetX >= goalLeft + 8 &&
            targetX <= goalRight - 8 &&
            targetY >= goalTop + 6 &&
            targetY <= goalBottom
          ) {
            // VERIFICATION PHYSIQUE REELLE DE L'ARRET (DISTANCE BALLE / GANTS)
            // Le gardien n'arrête QUE si ses gants ou son corps sont véritablement à portée !
            const distGlove = Math.hypot(targetX - s.gkGloveX, targetY - s.gkGloveY);
            const distTorso = Math.hypot(targetX - s.gkX, targetY - s.gkY);
            const isPhysicallySaved = distGlove < 34 || distTorso < 26;

            if (isPhysicallySaved) {
              // Arrêt du gardien
              playFootballSound("save");
              setGameResult("saved");
              setStreak(0);
              s.gkState = "saved";

              for (let i = 0; i < 22; i++) {
                s.particles.push({
                  x: s.gkGloveX,
                  y: s.gkGloveY,
                  vx: (Math.random() - 0.5) * 160,
                  vy: (Math.random() - 0.5) * 160,
                  color: "#ffffff",
                  size: 2.5 + Math.random() * 2,
                  alpha: 1,
                  life: 0.5,
                });
              }
            } else {
              // BUUUUUT ! ⚽🔥
              playFootballSound("goal");
              setScore((sc) => sc + 1);
              setStreak((st) => st + 1);
              setGameResult("goal");
              s.gkState = "beaten";
              s.camShake = 9;

              s.netImpactX = targetX;
              s.netImpactY = targetY;
              s.netImpactActive = true;

              const confettiColors = ["#10b981", "#ef4444", "#ffffff", "#facc15", "#38bdf8", "#ec4899"];
              for (let i = 0; i < 95; i++) {
                s.particles.push({
                  x: targetX,
                  y: targetY,
                  vx: (Math.random() - 0.5) * 460,
                  vy: -150 - Math.random() * 340,
                  color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                  size: 3 + Math.random() * 4,
                  alpha: 1,
                  life: 1.8,
                });
              }
            }
          } else {
            playFootballSound("miss");
            setGameResult("miss");
            setStreak(0);
          }
        }
      }

      s.trail.forEach((t) => {
        t.alpha -= dt * 2.2;
      });

      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 380 * dt;
        p.life -= dt;
        p.alpha = Math.max(0, p.life);
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      if (s.netImpactActive) {
        s.netNodes.forEach((row) => {
          row.forEach((node) => {
            const dist = Math.hypot(node.baseX - s.netImpactX, node.baseY - s.netImpactY);
            if (dist < 90) {
              const force = (1 - dist / 90) * 24;
              node.y = node.baseY - force * 0.45;
              node.x = node.baseX + (node.baseX - s.netImpactX) * 0.18;
            }
          });
        });
      }

      // ================= 2. RENDU CANVAS AVEC CAMERA CINEMATIQUE =================
      ctx.clearRect(0, 0, 960, 540);

      ctx.save();
      // Application de la caméra dynamique
      const shakeX = (Math.random() - 0.5) * s.camShake;
      const shakeY = (Math.random() - 0.5) * s.camShake;
      ctx.translate(480 + shakeX - s.camPanX, 270 + shakeY - s.camPanY);
      ctx.scale(s.camZoom, s.camZoom);
      ctx.translate(-480, -270);

      // A) Ciel de nuit moderne
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 180);
      skyGrad.addColorStop(0, "#030712");
      skyGrad.addColorStop(0.5, "#0b1528");
      skyGrad.addColorStop(1, "#111827");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-200, -200, 1360, 380);

      // B) Tribune de supporters
      const standsGrad = ctx.createLinearGradient(0, 48, 0, 165);
      standsGrad.addColorStop(0, "#1e293b");
      standsGrad.addColorStop(0.5, "#334155");
      standsGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = standsGrad;
      ctx.fillRect(-200, 48, 1360, 117);

      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      for (let sx = -100; sx < 1060; sx += 8) {
        for (let sy = 56; sy < 145; sy += 11) {
          ctx.beginPath();
          ctx.arc(sx + (sy % 16 === 0 ? 4 : 0), sy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let fx = -80; fx < 1040; fx += 65) {
        ctx.fillStyle = fx % 130 === 0 ? "#10b981" : "#ffffff";
        ctx.fillRect(fx, 82 + Math.sin(s.time * 2.2 + fx) * 3, 20, 5);
      }

      s.flashbulbs.forEach((fb) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${fb.alpha})`;
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // C) Projecteurs de stade LED
      const lightX = [130, 330, 630, 830];
      lightX.forEach((lx) => {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(lx - 2, 8, 4, 38);
        ctx.fillRect(lx - 16, 8, 32, 7);

        ctx.fillStyle = "#ffffff";
        for (let b = -12; b <= 12; b += 8) {
          ctx.beginPath();
          ctx.arc(lx + b, 11, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        const coneGrad = ctx.createRadialGradient(lx, 12, 5, lx, 260, 320);
        coneGrad.addColorStop(0, "rgba(255, 255, 255, 0.42)");
        coneGrad.addColorStop(0.3, "rgba(254, 240, 138, 0.12)");
        coneGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(lx - 14, 15);
        ctx.lineTo(lx - 180, 540);
        ctx.lineTo(lx + 180, 540);
        ctx.lineTo(lx + 14, 15);
        ctx.closePath();
        ctx.fill();
      });

      // D) Panneaux publicitaires LED
      ctx.fillStyle = "#022c22";
      ctx.fillRect(-200, 155, 1360, 18);
      ctx.fillStyle = "#34d399";
      ctx.font = '900 10.5px "Outfit", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("★ SCORE! HERO ★ TE33 BOLLA ★ STRIKE & GOAL ★ TOP CORNER CHALLENGE ★", 480, 164);

      // E) Pelouse 3D
      const grassStartY = 170;
      const grassStripeH = 37;
      for (let row = 0; row < 12; row++) {
        const yTop = grassStartY + row * grassStripeH;
        const isDark = row % 2 === 0;
        ctx.fillStyle = isDark ? "#15803d" : "#16a34a";
        ctx.fillRect(-200, yTop, 1360, grassStripeH + 1);
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(-100, 224);
      ctx.lineTo(1060, 224);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(210, 224);
      ctx.lineTo(130, 480);
      ctx.lineTo(830, 480);
      ctx.lineTo(750, 224);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(480, 440, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(480, 440, 52, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // F) But 3D (Poteaux, Barre & Filet)
      const goalLeft = 300;
      const goalRight = 660;
      const goalTop = 138;
      const goalBottom = 224;

      ctx.fillStyle = "rgba(2, 44, 34, 0.72)";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight + 22, goalBottom);
      ctx.lineTo(goalLeft - 22, goalBottom);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 1.1;

      for (let r = 0; r < s.netNodes.length; r++) {
        ctx.beginPath();
        for (let c = 0; c < s.netNodes[r].length; c++) {
          const pt = s.netNodes[r][c];
          if (c === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      if (s.netNodes.length > 0) {
        for (let c = 0; c < s.netNodes[0].length; c++) {
          ctx.beginPath();
          for (let r = 0; r < s.netNodes.length; r++) {
            const pt = s.netNodes[r][c];
            if (r === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }
      }

      // Poteaux blancs tubulaires
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.moveTo(goalLeft + 3, goalTop + 3);
      ctx.lineTo(goalRight + 3, goalTop + 3);
      ctx.moveTo(goalLeft + 3, goalTop + 3);
      ctx.lineTo(goalLeft + 3, goalBottom + 4);
      ctx.moveTo(goalRight + 3, goalTop + 3);
      ctx.lineTo(goalRight + 3, goalBottom + 4);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(goalLeft - 1, goalTop - 1);
      ctx.lineTo(goalRight + 1, goalTop - 1);
      ctx.stroke();

      // ================= G) GARDIEN DE BUT REALISTE ("SAUTE COMME VRAI") =================
      const isDiving = s.gkState === "diving";
      const isSaved = s.gkState === "saved";
      const isBeaten = s.gkState === "beaten";

      // Ombre au sol (se détache en l'air !)
      const groundY = 222;
      const heightOffGround = Math.max(0, groundY - s.gkY);
      const shadowScale = Math.max(0.35, 1 - heightOffGround / 65);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.32 * shadowScale})`;
      ctx.beginPath();
      ctx.ellipse(s.gkX, groundY, 22 * shadowScale, 6.5 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(s.gkX, s.gkY);

      if (isDiving) {
        ctx.rotate(s.gkBodyAngle);
      } else if (isSaved) {
        ctx.rotate(s.gkBodyAngle * 0.9);
      } else if (isBeaten) {
        ctx.rotate(s.gkDiveDir * 0.35);
      }

      const jerseyMain = "#eab308";
      const jerseyDark = "#ca8a04";
      const jerseyTrim = "#0f172a";
      const gloveColor = "#ffffff";
      const gloveBack = "#ef4444";

      if (isDiving || isSaved) {
        const dir = s.gkDiveDir;

        // Jambe arrière
        ctx.strokeStyle = jerseyTrim;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-dir * 6, 12);
        ctx.lineTo(-dir * 28, 22);
        ctx.stroke();
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-dir * 33, 20, dir > 0 ? 8 : -8, 5);

        // Jambe avant
        ctx.strokeStyle = jerseyTrim;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(dir * 4, 10);
        ctx.lineTo(dir * 16, 26);
        ctx.lineTo(dir * 6, 34);
        ctx.stroke();
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(dir * 4, 32, dir > 0 ? 7 : -7, 5);

        // Short noir
        ctx.fillStyle = "#090d16";
        ctx.beginPath();
        ctx.roundRect(-10, 2, 20, 14, 4);
        ctx.fill();

        // Torse
        const torsoGrad = ctx.createLinearGradient(-12, -24, 12, 6);
        torsoGrad.addColorStop(0, jerseyMain);
        torsoGrad.addColorStop(1, jerseyDark);
        ctx.fillStyle = torsoGrad;
        ctx.beginPath();
        ctx.roundRect(-12, -24, 24, 28, 5);
        ctx.fill();

        ctx.strokeStyle = jerseyTrim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -18);
        ctx.lineTo(10, -18);
        ctx.stroke();

        ctx.fillStyle = jerseyTrim;
        ctx.font = '900 11px "Outfit", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("1", 0, -6);

        // Tête
        ctx.fillStyle = "#fed7aa";
        ctx.beginPath();
        ctx.arc(dir * 2, -34, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(dir * 2, -36, 8.5, Math.PI, 0);
        ctx.fill();

        // Bras arrière
        ctx.strokeStyle = jerseyMain;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-dir * 9, -20);
        ctx.lineTo(-dir * 18, -10);
        ctx.stroke();
        ctx.fillStyle = gloveBack;
        ctx.beginPath();
        ctx.arc(-dir * 20, -9, 5, 0, Math.PI * 2);
        ctx.fill();

        // Bras avant en pleine détente
        ctx.strokeStyle = jerseyMain;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(dir * 8, -22);
        ctx.lineTo(dir * 28, -36);
        ctx.lineTo(dir * 44, -46);
        ctx.stroke();

        ctx.fillStyle = jerseyTrim;
        ctx.beginPath();
        ctx.arc(dir * 28, -36, 4, 0, Math.PI * 2);
        ctx.fill();

        // Gant pro
        ctx.save();
        ctx.translate(dir * 46, -48);
        ctx.fillStyle = jerseyTrim;
        ctx.fillRect(-3, -3, 6, 6);
        ctx.fillStyle = gloveBack;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = gloveColor;
        ctx.beginPath();
        ctx.arc(dir * 1.5, -1, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = gloveColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dir * 6, -5);
        ctx.moveTo(0, 0);
        ctx.lineTo(dir * 7, 0);
        ctx.moveTo(0, 0);
        ctx.lineTo(dir * 6, 5);
        ctx.stroke();
        ctx.restore();
      } else {
        const bounce = Math.sin(s.gkBounceTimer) * 2;

        ctx.strokeStyle = jerseyTrim;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(-12, 10 + bounce * 0.4);
        ctx.lineTo(-14, 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(7, -4);
        ctx.lineTo(12, 10 + bounce * 0.4);
        ctx.lineTo(14, 20);
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-18, 18, 9, 5);
        ctx.fillRect(9, 18, 9, 5);

        ctx.fillStyle = jerseyTrim;
        ctx.fillRect(-15, 6, 5, 10);
        ctx.fillRect(10, 6, 5, 10);

        ctx.fillStyle = "#090d16";
        ctx.beginPath();
        ctx.roundRect(-11, -12, 22, 14, 3);
        ctx.fill();

        const torsoGrad = ctx.createLinearGradient(-11, -38, 11, -12);
        torsoGrad.addColorStop(0, jerseyMain);
        torsoGrad.addColorStop(1, jerseyDark);
        ctx.fillStyle = torsoGrad;
        ctx.beginPath();
        ctx.roundRect(-12, -38, 24, 28, 5);
        ctx.fill();

        ctx.fillStyle = jerseyTrim;
        ctx.font = '900 11px "Outfit", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("1", 0, -22);

        ctx.fillStyle = "#fed7aa";
        ctx.beginPath();
        ctx.arc(0, -47, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(0, -49, 9, Math.PI, 0);
        ctx.fill();

        ctx.strokeStyle = jerseyMain;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-11, -34);
        ctx.lineTo(-22, -26 + bounce);
        ctx.lineTo(-18, -16 + bounce);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(11, -34);
        ctx.lineTo(22, -26 + bounce);
        ctx.lineTo(18, -16 + bounce);
        ctx.stroke();

        [-18, 18].forEach((gx) => {
          ctx.fillStyle = gloveBack;
          ctx.beginPath();
          ctx.arc(gx, -15 + bounce, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = gloveColor;
          ctx.beginPath();
          ctx.arc(gx, -15 + bounce, 4.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.restore(); // Fin Gardien

      // H) Traînée lumineuse derrière le ballon
      s.trail.forEach((t) => {
        ctx.fillStyle = s.isBulletShot
          ? `rgba(56, 189, 248, ${t.alpha * 0.75})`
          : `rgba(255, 255, 255, ${t.alpha * 0.6})`;
        ctx.beginPath();
        const trSize = (s.isBulletShot ? 15 : 13) * (1 - t.z * 0.52);
        ctx.arc(t.x, t.y, trSize, 0, Math.PI * 2);
        ctx.fill();
      });

      // I) BALLON DE FOOTBALL REALISTE (3D FIFA MATCH BALL)
      if (s.ballVisible) {
        ctx.save();
        ctx.translate(s.ballX, s.ballY);

        const shadowY = Math.max(0, 440 - s.ballY);
        const shadowDistScale = Math.max(0.3, 1 - shadowY / 120);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.36 * shadowDistScale})`;
        ctx.beginPath();
        ctx.ellipse(
          0,
          s.ballRadius + 2 + shadowY * 0.15,
          s.ballRadius * shadowDistScale * 1.1,
          s.ballRadius * shadowDistScale * 0.45,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.rotate(s.ballSpin);
        const r = s.ballRadius;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2);
        ctx.fill();

        for (let a = 0; a < 5; a++) {
          const ang = (a * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * r * 0.68, Math.sin(ang) * r * 0.68, r * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }

        const shineGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r);
        shineGrad.addColorStop(0, "rgba(255, 255, 255, 0.75)");
        shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        shineGrad.addColorStop(1, "rgba(0, 0, 0, 0.3)");
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // J) TIREUR AU PREMIER PLAN
      ctx.save();
      ctx.translate(s.strikerX, s.strikerY);

      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 16, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      const kickP = s.strikerPhase;
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(-12, 16);
      ctx.stroke();
      ctx.fillStyle = "#10b981";
      ctx.fillRect(-18, 14, 14, 6);

      ctx.save();
      ctx.translate(10, -5);
      const legAngle = kickP < 0.3 ? -kickP * 2.2 : (kickP - 0.3) * 1.8;
      ctx.rotate(legAngle);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, 20);
      ctx.stroke();
      ctx.fillStyle = "#10b981";
      ctx.fillRect(2, 18, 14, 6);
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(-14, -22, 28, 18, 4);
      ctx.fill();

      ctx.fillStyle = "#047857";
      ctx.beginPath();
      ctx.roundRect(-15, -52, 30, 32, 6);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = '900 13px "Outfit", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("10", 0, -32);

      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-14, -46);
      ctx.lineTo(-24, -32);
      ctx.moveTo(14, -46);
      ctx.lineTo(24, -34);
      ctx.stroke();

      ctx.fillStyle = "#fed7aa";
      ctx.beginPath();
      ctx.arc(0, -62, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(0, -65, 11, Math.PI, 0);
      ctx.fill();

      ctx.restore(); // Fin Striker

      // ================= K) FLECHE SCORE! HERO GRIS / BLANCHE =================
      if (s.isDrawing && s.smoothDrawPoints.length >= 2) {
        const pts = s.smoothDrawPoints;

        ctx.save();

        // 1. Ombre portée douce
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + 3);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y + 3);
        }
        ctx.stroke();

        // 2. Bordure gris clair Score! Hero (#cbd5e1 / #e2e8f0)
        ctx.strokeStyle = "rgba(226, 232, 240, 0.95)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // 3. Cœur blanc pur éclatant Score! Hero (#ffffff)
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 4. Perles blanches espacées le long de la trajectoire
        const stepDist = 24;
        let distAccum = 0;
        for (let i = 1; i < pts.length; i++) {
          const segDist = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          distAccum += segDist;
          if (distAccum >= stepDist) {
            distAccum = 0;
            const px = pts[i].x;
            const py = pts[i].y;

            ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(px, py, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 5. Chevrons directionnels blancs (> > >)
        let chvDist = 0;
        for (let i = 2; i < pts.length - 2; i += 2) {
          const segDist = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          chvDist += segDist;
          if (chvDist >= 48) {
            chvDist = 0;
            const ang = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
            ctx.save();
            ctx.translate(pts[i].x, pts[i].y);
            ctx.rotate(ang);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-5, -4);
            ctx.lineTo(2, 0);
            ctx.lineTo(-5, 4);
            ctx.stroke();
            ctx.restore();
          }
        }

        // 6. TÊTE DE FLÈCHE SCORE! HERO BLANCHE ÉLÉGANTE
        const lastPt = pts[pts.length - 1];
        const prevPt = pts[Math.max(0, pts.length - 4)];
        const arrowAngle = Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x);

        ctx.save();
        ctx.translate(lastPt.x, lastPt.y);
        ctx.rotate(arrowAngle);

        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(-14, -8);
        ctx.lineTo(-9, 2);
        ctx.lineTo(-14, 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-14, -10);
        ctx.lineTo(-9, 0);
        ctx.lineTo(-14, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // 7. RÉTICULE DE CIBLE CIRCULAIRE SCORE! HERO
        ctx.save();
        ctx.translate(lastPt.x, lastPt.y);

        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(0, -22);
        ctx.moveTo(0, 18);
        ctx.lineTo(0, 22);
        ctx.moveTo(-18, 0);
        ctx.lineTo(-22, 0);
        ctx.moveTo(18, 0);
        ctx.lineTo(22, 0);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Badge de dérivation aérodynamique (Anti-zigzag)
        if (s.isDerived) {
          ctx.save();
          ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
          ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-75, -44, 150, 20, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#38bdf8";
          ctx.font = '900 9.5px "Outfit", sans-serif';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🌪️ DÉRIVATION AÉRODYNAMIQUE", 0, -34);
          ctx.restore();
        }

        ctx.restore();
        ctx.restore();
      }

      // L) Confettis
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.restore(); // Fin de la caméra cinématique

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ÉCOUTEURS POINTER
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (960 / rect.width),
      y: (clientY - rect.top) * (540 / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (s.inFlight) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const coords = getCanvasCoords(e.clientX, e.clientY);

    s.isDrawing = true;
    s.drawStartTime = performance.now();
    s.rawDrawPoints = [{ x: s.ballX, y: s.ballY }, coords];
    const aero = computeAerodynamicTrajectory(s.rawDrawPoints);
    s.smoothDrawPoints = aero.points;
    s.isDerived = aero.isDerived;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s.isDrawing) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    const last = s.rawDrawPoints[s.rawDrawPoints.length - 1];
    const dist = Math.hypot(coords.x - last.x, coords.y - last.y);

    if (dist >= 12) {
      s.rawDrawPoints.push(coords);
      const aero = computeAerodynamicTrajectory(s.rawDrawPoints);
      s.smoothDrawPoints = aero.points;
      s.isDerived = aero.isDerived;
    }
  };

  const handlePointerUp = () => {
    const s = stateRef.current;
    if (!s.isDrawing) return;
    s.isDrawing = false;

    if (s.smoothDrawPoints.length < 5) {
      s.rawDrawPoints = [];
      s.smoothDrawPoints = [];
      return;
    }

    const startPt = s.smoothDrawPoints[0];
    const endPt = s.smoothDrawPoints[s.smoothDrawPoints.length - 1];
    const totalDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);

    if (totalDist < 55) {
      s.rawDrawPoints = [];
      s.smoothDrawPoints = [];
      return;
    }

    // Calcul de la vitesse physique du tir basée sur la vivacité du geste
    const drawDuration = Math.max(0.12, (performance.now() - s.drawStartTime) / 1000);
    const swipeVelocity = (totalDist / drawDuration) * 0.12;
    const speed = Math.min(128, Math.max(74, Math.floor(72 + swipeVelocity + totalDist * 0.14)));
    setLastShotSpeed(speed);

    const isBullet = speed >= 100;
    s.isBulletShot = isBullet;
    // Durée de vol réelle de la balle : plus le tir est rapide, plus la balle arrive vite
    const flightTime = Math.max(0.46, Math.min(0.72, 0.78 - (speed - 74) * 0.005));
    s.flightDuration = flightTime;

    // Détermination de la zone
    let placement = s.isDerived ? "Dérivation aérodynamique 🌪️" : "Frappe tendue";
    if (endPt.x < 370 && endPt.y < 172) placement = s.isDerived ? "Lucarne Dérivée 🌪️" : "Pleine Lucarne Gauche 🎯";
    else if (endPt.x > 590 && endPt.y < 172) placement = s.isDerived ? "Lucarne Dérivée 🌪️" : "Pleine Lucarne Droite 🎯";
    else if (endPt.x < 370 && endPt.y >= 195) placement = "Petit filet gauche ⚡";
    else if (endPt.x > 590 && endPt.y >= 195) placement = "Petit filet droit ⚡";
    else if (isBullet) placement = "Missile plein centre 🚀";
    else if (endPt.x < 370) placement = "Ras du poteau gauche";
    else if (endPt.x > 590) placement = "Ras du poteau droit";
    setLastShotPlacement(placement);

    // Déclenchement de la frappe
    s.isKicking = true;
    s.curvePoints = [...s.smoothDrawPoints];
    s.inFlight = true;
    s.flightProgress = 0;

    playFootballSound(isBullet ? "bullet" : "kick");

    // ================= SIMULATION PHYSIQUE AUTHENTIQUE DU GARDIEN =================
    // Pas de script "si coin = but" !
    // Le gardien a un temps de réaction humain (~0.16s), puis il plonge vers la cible.
    // Sa vitesse de plongeon maximale est réaliste (~290 px/s).
    // Si la balle arrive avant qu'il ne puisse atteindre les coordonnées avec ses gants -> BUT !
    // Si le tir est trop mou, ou prévisible, ou central -> ARRET DU GARDIEN !
    const reactionDelay = 160; // 0.16s
    const availableDiveTime = Math.max(0.1, flightTime - 0.16);

    const diveDir = endPt.x >= s.gkBaseX ? 1 : -1;
    const isHigh = endPt.y < 185;

    // Distance horizontale que le gardien doit couvrir
    const distanceNeeded = Math.abs(endPt.x - s.gkBaseX);
    // Vitesse de déplacement du gardien en vol (en px/s)
    const keeperAgility = 285; // Agilité réaliste
    const maxDistanceCovered = keeperAgility * availableDiveTime;

    // Destination physique où le gardien peut réellement arriver au maximum de son extension
    const actualCovered = Math.min(distanceNeeded, maxDistanceCovered);
    const actualTargetX = s.gkBaseX + diveDir * actualCovered;

    setTimeout(() => {
      s.gkState = "diving";
      s.gkStartX = s.gkX;
      s.gkStartY = s.gkY;
      s.gkDiveProgress = 0;
      s.gkIsHighDive = isHigh;
      s.gkDiveDir = diveDir;

      s.gkTargetX = actualTargetX;
      s.gkTargetY = Math.max(150, Math.min(218, endPt.y));
    }, reactionDelay);
  };

  return (
    <main className={styles["football-page"]}>
      {/* HEADER */}
      <div className={styles["football-header"]}>
        <button
          className={styles["back-link"]}
          onClick={() => router.push("/?select=1")}
          id="btn-football-back"
        >
          ← Rja3
        </button>

        <div className={styles["football-logo"]}>
          <span className={`gradient-text ${styles["logo-main"]}`}>Score! Hero ⚽</span>
          <span className={styles["logo-sub"]}>te33 bolla</span>
        </div>

        <div className={styles["header-badges"]}>
          <div className={styles["badge-score"]}>
            <span>⚽ Buts :</span>
            <span style={{ color: "#10b981", fontWeight: 900 }}>{score}</span>
          </div>
          {streak > 1 && (
            <div className={`${styles["badge-score"]} ${styles["badge-streak"]}`}>
              <span>🔥 x{streak}</span>
            </div>
          )}
          <button
            className={styles["btn-header-tool"]}
            onClick={toggleFullscreen}
            title="Plein écran"
            id="btn-football-fullscreen"
          >
            <span>⛶</span>
          </button>
        </div>
      </div>

      {/* BARRE D'INSTRUCTIONS MINIMALISTE & PRO */}
      <div className={styles["instruction-bar"]}>
        <div className={styles["instruction-text"]}>
          <span>👆</span>
          <span>Trace la trajectoire au doigt ou à la souris pour enrouler ou fusiller le gardien !</span>
        </div>
        <span className={styles["hint-chip"]}>Physique Score! Hero 🎯</span>
      </div>

      {/* ARENA CANVAS DESIGN REALISTE */}
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

        {/* OVERLAY : BUUUUT ! ⚽🔥 */}
        {gameResult === "goal" && (
          <div className={styles.overlay}>
            <div className={styles["overlay-emoji"]}>⚽🔥</div>
            <h2 className={styles["overlay-title"]} style={{ color: "#10b981" }}>
              BUUUUUT !
            </h2>
            <p className={styles["overlay-desc"]}>
              Superbe but ! Ta frappe a trompé la détente du gardien !
            </p>
            <div className={styles["overlay-stats-row"]}>
              <span className={styles["stat-pill"]}>⚡ {lastShotSpeed} km/h</span>
              <span className={styles["stat-pill"]}>{lastShotPlacement}</span>
              <span className={styles["stat-pill"]}>🔥 Série : {streak}</span>
            </div>
            <div className={styles["overlay-buttons"]}>
              <button
                className={`${styles["btn-action"]} ${styles["btn-action-primary"]}`}
                onClick={resetShot}
                id="btn-football-retry-goal"
              >
                ⚽ Tirer à nouveau
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY : ARRET DU GARDIEN ! 🧤 */}
        {gameResult === "saved" && (
          <div className={styles.overlay}>
            <div className={styles["overlay-emoji"]}>🧤</div>
            <h2 className={styles["overlay-title"]} style={{ color: "#f59e0b" }}>
              ARRÊT DU GARDIEN !
            </h2>
            <p className={styles["overlay-desc"]}>
              Le gardien a réussi la parade ! Accélère ton geste pour frapper plus fort ou enroule davantage !
            </p>
            <div className={styles["overlay-stats-row"]}>
              <span className={styles["stat-pill"]}>⚡ {lastShotSpeed} km/h</span>
              <span className={styles["stat-pill"]}>{lastShotPlacement}</span>
            </div>
            <div className={styles["overlay-buttons"]}>
              <button
                className={`${styles["btn-action"]} ${styles["btn-action-primary"]}`}
                onClick={resetShot}
                id="btn-football-retry-saved"
              >
                🔄 Réessayer
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY : POTEAU ! 🥅💥 */}
        {gameResult === "post" && (
          <div className={styles.overlay}>
            <div className={styles["overlay-emoji"]}>💥</div>
            <h2 className={styles["overlay-title"]} style={{ color: "#ef4444" }}>
              POTEAU / BARRE !
            </h2>
            <p className={styles["overlay-desc"]}>
              Le montant tremble encore ! Ajuste de quelques centimètres vers l&apos;intérieur !
            </p>
            <div className={styles["overlay-stats-row"]}>
              <span className={styles["stat-pill"]}>⚡ {lastShotSpeed} km/h</span>
              <span className={styles["stat-pill"]}>{lastShotPlacement}</span>
            </div>
            <div className={styles["overlay-buttons"]}>
              <button
                className={`${styles["btn-action"]} ${styles["btn-action-primary"]}`}
                onClick={resetShot}
                id="btn-football-retry-post"
              >
                🔄 Réessayer
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY : TIR MANQUE ! ❌ */}
        {gameResult === "miss" && (
          <div className={styles.overlay}>
            <div className={styles["overlay-emoji"]}>💨</div>
            <h2 className={styles["overlay-title"]} style={{ color: "#94a3b8" }}>
              HORS CADRE !
            </h2>
            <p className={styles["overlay-desc"]}>
              La frappe passe à côté ! Vise bien entre les poteaux blancs !
            </p>
            <div className={styles["overlay-buttons"]}>
              <button
                className={`${styles["btn-action"]} ${styles["btn-action-primary"]}`}
                onClick={resetShot}
                id="btn-football-retry-miss"
              >
                🔄 Tirer à nouveau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COMMANDES BAS DE PAGE */}
      <div className={styles["actions-row"]}>
        <button
          className={styles["btn-action"]}
          onClick={resetShot}
          id="btn-football-reset"
        >
          🔄 Recommencer
        </button>
        <button
          className="btn-secondary"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => router.push("/?select=1")}
          id="btn-football-menu"
        >
          🏠 Changer de jeu
        </button>
      </div>
    </main>
  );
}

export default function FootballPage() {
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
      <FootballGameContent />
    </Suspense>
  );
}
