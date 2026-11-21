"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FLEVELS, FLevel } from "./levels";
import { tone, noise, unlockAudio, setMuted } from "../lib/sfx";
import { useStored } from "../lib/useStored";
import styles from "./football.module.css";

// ================= CONSTANTS (metres / seconds) =================
const G = 9.81;
const R = 0.11; // ball radius
const GOAL_W = 3.66; // half width
const GOAL_H = 2.44;
const GOAL_DEPTH = 1.8;
const CAM_BACK = 7;
const CAM_Y = 3.2;
const WALL_DIST = 9.15;
const PLAYER_R = 0.28;

type Phase = "menu" | "intro" | "aim" | "fly" | "pass" | "won" | "lost";
type Outcome = "goal" | "save" | "block" | "post" | "bar" | "out" | "short" | "intercept";

const OUTCOME_TEXT: Record<Outcome, string> = {
  goal: "GOOOOOL! 🔥",
  save: "Saveha l gardien 🧤",
  block: "Darbet f l mur 🧱",
  post: "Poteau! 😱",
  bar: "La barre! 😱",
  out: "Barra! 😬",
  short: "Dh3iifa… zid l force 💪",
  intercept: "Qta3ha l'adversaire ✋",
};

interface Progress { unlocked: number; stars: number[] }
interface Pt { x: number; y: number; t: number }
interface Body { x: number; z: number }

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  let t = l2 === 0 ? 0 : ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/** Unit vector from (x,z) toward the goal centre, and its right-hand perpendicular. */
function frameAt(x: number, z: number) {
  const L = Math.hypot(x, z) || 1;
  const ux = -x / L, uz = -z / L;
  return { ux, uz, rx: -uz, rz: ux };
}

/** Goalkeeper body pose (world x,y on his plane) from his base x and hand position. */
function keeperPose(k: { x: number; hx: number; hy: number }) {
  const hipX = k.x + (k.hx - k.x) * 0.35;
  const hipY = Math.max(0.45, Math.min(2.0, 0.45 + (k.hy - 0.45) * 0.45));
  let dx = k.hx - hipX, dy = k.hy - hipY;
  const L = Math.hypot(dx, dy) || 1;
  dx /= L; dy /= L;
  const shoulder = { x: hipX + dx * 0.55, y: hipY + dy * 0.55 };
  // perpendicular pointing "up" for the head offset
  let px = -dy, py = dx;
  if (py < 0) { px = -px; py = -py; }
  return {
    hip: { x: hipX, y: hipY },
    shoulder,
    hand: { x: k.hx, y: k.hy },
    head: { x: shoulder.x + dx * 0.16 + px * 0.1, y: shoulder.y + dy * 0.16 + py * 0.1 },
    foot: { x: hipX - dx * 0.85, y: Math.max(0.08, hipY - dy * 0.85) },
  };
}

function buildWall(lv: FLevel): Body[] {
  if (!lv.wall) return [];
  const [bx, bz] = lv.ball;
  const f = frameAt(bx, bz);
  const cx = bx + f.ux * WALL_DIST, cz = bz + f.uz * WALL_DIST;
  const shift = bx > 0.5 ? 0.45 : bx < -0.5 ? -0.45 : 0;
  return Array.from({ length: lv.wall }, (_, i) => {
    const off = (i - (lv.wall - 1) / 2) * PLAYER_R * 2 + shift;
    return { x: cx + f.rx * off, z: cz + f.rz * off };
  });
}

// Stable crowd pattern
const CROWD = Array.from({ length: 520 }, (_, i) => ({
  a: ((i * 0.6180339) % 1) * 3.2 - 1.6,
  v: ((i * 0.7548776) % 1),
  c: ["#ef4444", "#f8fafc", "#3b82f6", "#facc15", "#22c55e", "#f97316", "#a855f7"][i % 7],
}));

export default function FootballPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [progress, setProgress] = useStored<Progress>("xoxo-football-v2", { unlocked: 0, stars: [] });
  const [muted, setMutedState] = useStored<boolean>("xoxo-football-muted", false);

  const [phase, setPhase] = useState<Phase>("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [attempts, setAttempts] = useState(3);
  const [passes, setPasses] = useState(0);
  const [result, setResult] = useState<{ stars: number; text: string }>({ stars: 0, text: "" });

  const g = useRef({
    W: 400, H: 700, dpr: 1, f: 800, hz: 210,
    t: 0,
    phase: "menu" as Phase,
    level: FLEVELS[0],
    levelIdx: 0,
    holder: { x: 0, z: 11 } as Body,
    holderMate: -1,
    ball: { x: 0, y: R, z: 11, vx: 0, vy: 0, vz: 0, ax: 0, az: 0, rot: 0 },
    shotT: 0,
    trail: [] as { x: number; y: number; z: number }[],
    cam: { x: 0, z: 18, phi: 0 },
    fBase: 800,
    snapCam: true,
    kickPhi: 0,
    keeper: { x: 0, hx: 0, hy: 1.3, tx: 0, ty: 1.3, react: 0.3, speed: 5, diving: false },
    wall: [] as Body[],
    wallJump: 0,
    swipe: [] as Pt[],
    swiping: false,
    pointerId: -1,
    swipeFade: [] as Pt[],
    swipeFadeT: 0,
    outcome: null as Outcome | null,
    outcomeT: 0,
    attempts: 3,
    passes: 0,
    passTarget: -1,
    goalX: 0,
    goalY: 0,
    net: { x: 0, y: 0, amt: 0 },
    crowdJump: 0,
    confetti: [] as { x: number; y: number; vx: number; vy: number; c: string; life: number }[],
  });

  useEffect(() => setMuted(muted), [muted]);

  // ---------- Lock page ----------
  useEffect(() => {
    const html = document.documentElement;
    const prev = { o: document.body.style.overflow, ob: document.body.style.overscrollBehavior };
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    html.classList.add("game-locked");
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    return () => {
      document.body.style.overflow = prev.o;
      document.body.style.overscrollBehavior = prev.ob;
      html.classList.remove("game-locked");
      document.removeEventListener("gesturestart", stop);
    };
  }, []);

  // ---------- Setup helpers ----------
  const placeBall = useCallback((x: number, z: number, snapCam: boolean) => {
    const s = g.current;
    s.holder = { x, z };
    s.ball = { x, y: R, z, vx: 0, vy: 0, vz: 0, ax: 0, az: 0, rot: 0 };
    s.trail = [];
    s.shotT = 0;
    s.outcome = null;
    s.wallJump = 0;
    const lv = s.level;
    s.keeper.x = lv.wall ? (x > 0 ? -0.6 : x < 0 ? 0.6 : 0) : Math.max(-0.8, Math.min(0.8, x * 0.06));
    s.keeper.hx = s.keeper.x;
    s.keeper.hy = 1.3;
    s.keeper.diving = false;
    if (snapCam) s.snapCam = true;
  }, []);

  const resetAttempt = useCallback(() => {
    const s = g.current;
    s.holderMate = -1;
    s.net.amt = 0;
    placeBall(s.level.ball[0], s.level.ball[1], true);
    s.phase = "aim";
    setPhase("aim");
  }, [placeBall]);

  const startLevel = useCallback((idx: number) => {
    const s = g.current;
    const lv = FLEVELS[idx];
    s.level = lv;
    s.levelIdx = idx;
    s.attempts = lv.attempts;
    s.passes = 0;
    s.wall = buildWall(lv);
    s.confetti = [];
    s.holderMate = -1;
    placeBall(lv.ball[0], lv.ball[1], true);
    s.phase = "intro";
    setLevelIdx(idx);
    setAttempts(lv.attempts);
    setPasses(0);
    setPhase("intro");
  }, [placeBall]);

  const beginPlay = () => {
    unlockAudio();
    const s = g.current;
    s.phase = "aim";
    setPhase("aim");
    tone({ freq: 2100, dur: 0.18, type: "square", vol: 0.06 });
    tone({ freq: 2100, dur: 0.35, type: "square", vol: 0.06, delay: 0.22 });
  };

  const openMenu = () => {
    g.current.phase = "menu";
    setPhase("menu");
  };

  // ---------- Resize ----------
  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      const s = g.current;
      s.W = r.width;
      s.H = r.height;
      s.dpr = dpr;
      s.fBase = Math.min(2.1 * r.width, 1.25 * r.height);
      s.snapCam = true;
      s.hz = r.height * 0.3;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ---------- Projection ----------
  const project = (x: number, y: number, z: number) => {
    const s = g.current;
    const rx = x - s.cam.x, rz = s.cam.z - z;
    const c = Math.cos(s.cam.phi), sn = Math.sin(s.cam.phi);
    const xp = rx * c - rz * sn;
    const d = rx * sn + rz * c;
    if (d < 0.3) return null;
    const k = s.f / d;
    return { sx: s.W / 2 + xp * k, sy: s.hz - (y - CAM_Y) * k, d, k };
  };

  /** Screen point → point on the goal plane z = 0 */
  const unprojectGoal = (sx: number, sy: number) => {
    const s = g.current;
    const xp = (sx - s.W / 2) / s.f, yp = (s.hz - sy) / s.f;
    const c = Math.cos(s.cam.phi), sn = Math.sin(s.cam.phi);
    const rx = xp * c + sn;
    const rz = -xp * sn + c;
    const t = s.cam.z / Math.max(0.05, rz);
    return { x: s.cam.x + rx * t, y: CAM_Y + yp * t };
  };

  const defenderPos = (lvDef: FLevel["defenders"][number], t: number): Body => ({
    x: lvDef.x + (lvDef.amp ?? 0) * Math.sin(t * (lvDef.speed ?? 0)),
    z: lvDef.z,
  });

  // ---------- Shooting ----------
  const kick = (pts: Pt[]) => {
    const s = g.current;
    const lv = s.level;
    const start = pts[0], end = pts[pts.length - 1];
    const cx = end.x - start.x, cy = end.y - start.y;
    const chord = Math.hypot(cx, cy);
    if (chord < 40 || cy > -15) return false;
    const dur = Math.max(60, end.t - start.t);

    // 1) Pass? (swipe ends on a teammate)
    for (let i = 0; i < lv.mates.length; i++) {
      if (i === s.holderMate) continue;
      const [mx, mz] = lv.mates[i];
      const p = project(mx, 1.0, mz);
      if (!p) continue;
      if (Math.hypot(end.x - p.sx, end.y - p.sy) < Math.max(50, 1.4 * p.k)) {
        s.passTarget = i;
        const b = s.ball;
        const dx = mx - b.x, dz = mz - b.z;
        const L = Math.hypot(dx, dz);
        const sp = 17;
        b.vx = (dx / L) * sp;
        b.vz = (dz / L) * sp;
        b.vy = 1.2;
        b.ax = b.az = 0;
        s.phase = "pass";
        s.shotT = 0;
        setPhase("pass");
        noise(0.08, 0.35, 900);
        tone({ freq: 140, to: 70, dur: 0.12, vol: 0.25 });
        return true;
      }
    }

    // 2) Shot: the swipe end point is the aim on the goal plane (short swipes are extended)
    const gy = project(0, 1.0, 0)?.sy ?? s.hz;
    let ex = end.x, ey = end.y;
    if (end.y > gy && start.y - end.y > 20) {
      const k = Math.min(3, (start.y - gy) / (start.y - end.y));
      ex = start.x + cx * k;
      ey = start.y + cy * k;
    }
    const target = unprojectGoal(ex, ey);
    let tx = target.x, ty = target.y;

    const vn = chord / s.H / (dur / 1000); // screen-heights per second
    const V = Math.max(15, Math.min(33, 13 + vn * 6.5));
    if (vn > 5.2) ty += (vn - 5.2) * 0.55; // over-hit → sails high
    const sigma = 0.07 + 0.2 * ((V - 15) / 18);
    tx += gauss() * sigma;
    ty += gauss() * sigma * 0.6;
    ty = Math.max(R + 0.02, ty);
    if (V < 16.5 && Math.hypot(s.ball.x, s.ball.z) > 22) ty = Math.min(ty, 0.5); // too weak from far

    // curve from swipe bend
    let maxCross = 0;
    for (const p of pts) {
      const cr = (cx * (p.y - start.y) - cy * (p.x - start.x)) / chord;
      if (Math.abs(cr) > Math.abs(maxCross)) maxCross = cr;
    }
    const bend = Math.max(-0.45, Math.min(0.45, maxCross / chord));

    const b = s.ball;
    const D = Math.hypot(tx - b.x, b.z);
    const T = D / V;
    const bulge = bend * D * 0.5;
    const a = Math.max(-15, Math.min(15, (-8 * bulge) / (T * T)));
    const ux = (tx - b.x) / D, uz = -b.z / D;
    const rx = -uz, rz = ux;
    b.ax = rx * a;
    b.az = rz * a;
    b.vx = (tx - b.x) / T - 0.5 * b.ax * T;
    b.vz = (0 - b.z) / T - 0.5 * b.az * T;
    b.vy = (ty - R + 0.5 * G * T * T) / T;

    // Goalkeeper plan: predicts the crossing (good keepers read the curve)
    const kz = 0.35;
    const qa = 0.5 * b.az, qb = b.vz, qc = b.z - kz;
    let tc = T;
    if (Math.abs(qa) > 1e-6) {
      const disc = qb * qb - 4 * qa * qc;
      if (disc >= 0) {
        const r1 = (-qb - Math.sqrt(disc)) / (2 * qa), r2 = (-qb + Math.sqrt(disc)) / (2 * qa);
        tc = [r1, r2].filter((v) => v > 0).sort((p, q) => p - q)[0] ?? T;
      }
    } else tc = -qc / qb;
    const realX = b.x + b.vx * tc + 0.5 * b.ax * tc * tc;
    const realY = R + b.vy * tc - 0.5 * G * tc * tc;
    const straightX = b.x + b.vx * tc; // naive read: ignores the curve
    const skill = lv.keeper;
    const k = s.keeper;
    const px = realX * skill + straightX * (1 - skill) + gauss() * (1 - skill) * 0.8;
    const py = realY + gauss() * (1 - skill) * 0.4;
    const reach = 1.5 + 2.0 * skill;
    let dxk = Math.max(-GOAL_W - 0.3, Math.min(GOAL_W + 0.3, px)) - k.x;
    let dyk = Math.max(0.2, Math.min(GOAL_H + 0.1, py)) - 1.0;
    const dl = Math.hypot(dxk, dyk);
    if (dl > reach) { dxk *= reach / dl; dyk *= reach / dl; }
    k.tx = k.x + dxk;
    k.ty = 1.0 + dyk;
    k.react = 0.38 - 0.22 * skill;
    k.speed = 4 + 5 * skill;
    k.diving = false;

    s.goalX = realX;
    s.goalY = realY;
    s.phase = "fly";
    s.shotT = 0;
    setPhase("fly");
    noise(0.1, 0.5, 700, 0, 0.7);
    tone({ freq: 120, to: 50, dur: 0.15, vol: 0.35 });
    return true;
  };

  // ---------- Main loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const setOutcome = (o: Outcome) => {
      const s = g.current;
      if (s.outcome) return;
      s.outcome = o;
      s.outcomeT = o === "goal" ? 2.2 : 1.6;
      if (o === "goal") {
        s.crowdJump = 2.5;
        noise(2.2, 0.35, 900, 0, 0.3);
        [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.3, type: "triangle", vol: 0.12, delay: 0.1 + i * 0.1 }));
        for (let i = 0; i < 90; i++) {
          s.confetti.push({
            x: Math.random() * s.W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120,
            c: ["#facc15", "#ef4444", "#22c55e", "#3b82f6", "#fff"][i % 5], life: 3,
          });
        }
      } else if (o === "save") {
        noise(0.15, 0.4, 500);
        noise(1.0, 0.12, 400, 0.1, 0.3);
      } else if (o === "post" || o === "bar") {
        tone({ freq: 1250, dur: 0.5, type: "triangle", vol: 0.2 });
        tone({ freq: 1870, dur: 0.4, type: "sine", vol: 0.1 });
      } else {
        noise(0.8, 0.1, 350, 0, 0.3);
      }
    };

    const update = (dt: number) => {
      const s = g.current;
      const lv = s.level;
      s.t += dt;
      s.crowdJump = Math.max(0, s.crowdJump - dt);
      s.swipeFadeT = Math.max(0, s.swipeFadeT - dt);

      // camera behind the ball holder; frames the goal AND the next teammate (if any)
      {
        const hx = s.holder.x, hz0 = s.holder.z;
        const angTo = (x: number, z: number) => Math.atan2(x - hx, hz0 - z);
        let mid = angTo(0, 0);
        let fT = s.fBase;
        const next = s.holderMate + 1;
        if (next < lv.mates.length && s.phase !== "fly") {
          const aG = mid, aM = angTo(lv.mates[next][0], lv.mates[next][1]);
          mid = (aG + aM) / 2;
          const spread = Math.abs(aG - aM) / 2;
          fT = Math.min(s.fBase, (s.W / 2 - 45) / Math.tan(Math.min(1.2, spread + 0.1)));
        }
        const camTX = hx - Math.sin(mid) * CAM_BACK, camTZ = hz0 + Math.cos(mid) * CAM_BACK;
        const lerp = s.snapCam ? 1 : Math.min(1, dt * 3);
        s.snapCam = false;
        s.cam.x += (camTX - s.cam.x) * lerp;
        s.cam.z += (camTZ - s.cam.z) * lerp;
        s.cam.phi += (mid - s.cam.phi) * lerp;
        s.f += (fT - s.f) * lerp;
      }

      // keeper idle sway
      const k = s.keeper;
      if (s.phase === "aim" || s.phase === "pass" || s.phase === "intro") {
        const ideal = lv.wall ? k.x : Math.max(-0.9, Math.min(0.9, s.ball.x * 0.06));
        k.x += (ideal - k.x) * Math.min(1, dt * 2) + Math.sin(s.t * 2) * 0.002;
        k.hx = k.x;
        k.hy = 1.3;
      }

      // confetti
      for (const c of s.confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.life -= dt * 0.35; }
      s.confetti = s.confetti.filter((c) => c.life > 0 && c.y < s.H + 20);

      const b = s.ball;

      if (s.phase === "pass") {
        s.shotT += dt;
        const steps = 3;
        for (let i = 0; i < steps; i++) {
          const h = dt / steps;
          b.vy -= G * h;
          b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
          if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) > 1 ? -b.vy * 0.4 : 0; }
          b.rot += 0.2;
          if (!s.outcome) {
            for (const d of lv.defenders) {
              const p = defenderPos(d, s.t);
              if (Math.hypot(p.x - b.x, p.z - b.z) < 0.75) {
                b.vx = b.vz = 0;
                setOutcome("intercept");
              }
            }
          }
          const [mx, mz] = lv.mates[s.passTarget];
          if (!s.outcome && Math.hypot(mx - b.x, mz - b.z) < 0.6) {
            s.holderMate = s.passTarget;
            s.passes++;
            setPasses(s.passes);
            placeBall(mx, mz, false);
            s.phase = "aim";
            setPhase("aim");
            noise(0.05, 0.2, 600);
            break;
          }
        }
      }

      if (s.phase === "fly") {
        s.shotT += dt;
        // wall jumps shortly after the kick
        const jt = s.shotT - 0.1;
        s.wallJump = jt > 0 && jt < 0.55 ? Math.sin((jt / 0.55) * Math.PI) * 0.42 : 0;
        // keeper dive
        if (s.shotT > k.react && !s.outcome) {
          k.diving = true;
          const dx = k.tx - k.hx, dy = k.ty - k.hy;
          const dl = Math.hypot(dx, dy);
          const step = k.speed * dt;
          if (dl > step) { k.hx += (dx / dl) * step; k.hy += (dy / dl) * step; }
          else { k.hx = k.tx; k.hy = k.ty; }
        }

        const sub = 6;
        const h = dt / sub;
        for (let i = 0; i < sub; i++) {
          const pz = b.z;
          const air = b.y > R + 0.02;
          if (air) { b.vx += b.ax * h; b.vz += b.az * h; }
          b.vy -= G * h;
          b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
          b.rot += Math.hypot(b.vx, b.vz) * h * 2;
          if (b.y < R) {
            b.y = R;
            b.vy = b.vy < -1.5 ? -b.vy * 0.5 : 0;
            b.vx *= 0.985; b.vz *= 0.985;
            b.ax = b.az = 0;
          }

          if (!s.outcome) {
            // wall + defenders
            const blockers = [
              ...s.wall.map((w) => ({ ...w, top: 1.85 + s.wallJump })),
              ...lv.defenders.map((d) => ({ ...defenderPos(d, s.t), top: 1.85 })),
            ];
            for (const p of blockers) {
              if (Math.hypot(p.x - b.x, p.z - b.z) < PLAYER_R + R && b.y < p.top + R) {
                b.vz = -b.vz * 0.3; b.vx = -b.vx * 0.3 + (Math.random() - 0.5) * 3; b.vy = Math.max(b.vy, 2) * 0.6;
                b.ax = b.az = 0;
                setOutcome("block");
                noise(0.12, 0.4, 400);
                break;
              }
            }
          }

          if (!s.outcome && pz > 0.35 && b.z <= 0.35) {
            // goalkeeper
            const handHit = Math.hypot(b.x - k.hx, b.y - k.hy) < 0.42 + R;
            const pose = keeperPose(k);
            const bodyHit = k.diving
              ? distToSeg(b.x, b.y, pose.hip.x, pose.hip.y, k.hx, k.hy) < 0.25 + R ||
                distToSeg(b.x, b.y, pose.foot.x, pose.foot.y, pose.hip.x, pose.hip.y) < 0.12 + R
              : Math.abs(b.x - k.x) < 0.3 + R && b.y < 1.85;
            if (handHit || bodyHit) {
              b.vz = Math.abs(b.vz) * 0.25 + 2;
              b.vx = (b.x - k.x >= 0 ? 1 : -1) * (3 + Math.random() * 3);
              b.vy = 2 + Math.random() * 3;
              b.ax = b.az = 0;
              setOutcome("save");
            }
          }

          if (!s.outcome && pz > 0 && b.z <= 0) {
            const ax = Math.abs(b.x);
            const postHit = Math.abs(ax - GOAL_W) < R + 0.06 && b.y < GOAL_H + 0.06;
            const barHit = Math.abs(b.y - GOAL_H) < R + 0.06 && ax < GOAL_W + 0.06;
            if (postHit || barHit) {
              b.vz = Math.abs(b.vz) * 0.55;
              if (postHit) b.vx = -Math.sign(b.x) * Math.abs(b.vx) * 0.5 - Math.sign(b.x) * 1.5;
              if (barHit) b.vy = -Math.abs(b.vy) * 0.4 - 1;
              b.ax = b.az = 0;
              setOutcome(postHit ? "post" : "bar");
            } else if (ax < GOAL_W - R && b.y < GOAL_H - R) {
              setOutcome("goal");
              s.goalX = b.x;
              s.goalY = b.y;
            } else {
              setOutcome("out");
            }
          }

          // net catches the ball
          if (s.outcome === "goal" && b.z < -GOAL_DEPTH + R) {
            b.z = -GOAL_DEPTH + R;
            s.net = { x: b.x, y: b.y, amt: 1 };
            b.vz = 0.3; b.vx *= 0.2; b.ax = b.az = 0;
          }
          // side netting
          if (s.outcome === "goal" && Math.abs(b.x) > GOAL_W - R && b.z < 0) {
            b.x = Math.sign(b.x) * (GOAL_W - R); b.vx = -b.vx * 0.2;
          }
          if (s.outcome === "goal" && b.y > GOAL_H - R && b.z < 0) { b.y = GOAL_H - R; b.vy = -Math.abs(b.vy) * 0.2; }
        }

        s.trail.push({ x: b.x, y: b.y, z: b.z });
        if (s.trail.length > 26) s.trail.shift();

        if (!s.outcome) {
          const sp = Math.hypot(b.vx, b.vy, b.vz);
          if ((sp < 0.6 && b.z > 0) || s.shotT > 4.5) setOutcome("short");
        }
      }

      s.net.amt = Math.max(0, s.net.amt - dt * 1.5);

      // resolve outcome after a short replay moment
      if (s.outcome && (s.phase === "fly" || s.phase === "pass")) {
        s.outcomeT -= dt;
        if (s.outcomeT <= 0) {
          const o = s.outcome;
          if (o === "goal") {
            const corner = Math.abs(s.goalX) > 2.4 || s.goalY > 1.75;
            const first = s.attempts === lv.attempts;
            const stars = 1 + (first ? 1 : 0) + (corner ? 1 : 0);
            s.phase = "won";
            setResult({
              stars,
              text: corner ? "F la lucarne! 🎯 Tir mondial" : first ? "Men l'awel! 🔥" : "Marquit! Bravo 👏",
            });
            setPhase("won");
          } else {
            s.attempts--;
            setAttempts(s.attempts);
            if (s.attempts <= 0) {
              s.phase = "lost";
              setResult({ stars: 0, text: OUTCOME_TEXT[o] });
              setPhase("lost");
            } else {
              resetAttempt();
            }
          }
        }
      }
    };

    // ---------- Drawing ----------
    const P = project;

    const quad = (pts: [number, number, number][], fill: string) => {
      const ps = pts.map(([x, y, z]) => P(x, y, z));
      if (ps.some((p) => !p)) return;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ps.forEach((p, i) => (i ? ctx.lineTo(p!.sx, p!.sy) : ctx.moveTo(p!.sx, p!.sy)));
      ctx.closePath();
      ctx.fill();
    };

    const polyline = (pts: [number, number, number][], width: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      let prev: ReturnType<typeof P> = null;
      for (const [x, y, z] of pts) {
        const p = P(x, y, z);
        if (p && prev) {
          ctx.lineWidth = Math.max(1, width * (p.k + prev.k) / 2);
          ctx.beginPath(); ctx.moveTo(prev.sx, prev.sy); ctx.lineTo(p.sx, p.sy); ctx.stroke();
        }
        prev = p;
      }
    };

    const seg = (x1: number, z1: number, x2: number, z2: number, n = 10): [number, number, number][] =>
      Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, 0, z1 + ((z2 - z1) * i) / n]);

    const drawPlayer = (x: number, z: number, o: { jersey: string; shorts: string; facing: boolean; lift?: number; num?: number; kick?: number }) => {
      const lift = o.lift ?? 0;
      const sh = P(x, 0, z);
      if (!sh) return;
      const k = sh.k;
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(sh.sx, sh.sy, 0.38 * k, 0.11 * k, 0, 0, Math.PI * 2); ctx.fill();
      const Y = (y: number) => sh.sy - (y + lift) * k;
      const cx = sh.sx;
      // legs
      const kick = o.kick ?? 0;
      ctx.fillStyle = o.facing ? "#f1c27d" : "#e0ac69";
      ctx.fillRect(cx - 0.16 * k, Y(0.85), 0.12 * k, 0.6 * k);
      ctx.save();
      ctx.translate(cx + 0.1 * k, Y(0.85));
      ctx.rotate(-kick * 0.9);
      ctx.fillRect(-0.06 * k, 0, 0.12 * k, 0.6 * k);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(-0.065 * k, 0.45 * k, 0.13 * k, 0.32 * k);
      ctx.fillStyle = "#111827";
      ctx.fillRect(-0.07 * k, 0.75 * k, 0.16 * k, 0.08 * k);
      ctx.restore();
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(cx - 0.165 * k, Y(0.4), 0.13 * k, 0.32 * k);
      ctx.fillStyle = "#111827";
      ctx.fillRect(cx - 0.18 * k, Y(0.08), 0.16 * k, 0.08 * k);
      // shorts
      ctx.fillStyle = o.shorts;
      ctx.beginPath(); ctx.roundRect(cx - 0.22 * k, Y(1.02), 0.44 * k, 0.24 * k, 0.04 * k); ctx.fill();
      // arms
      ctx.strokeStyle = "#e0ac69";
      ctx.lineWidth = Math.max(1, 0.09 * k);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 0.25 * k, Y(1.45)); ctx.lineTo(cx - 0.32 * k, Y(1.0));
      ctx.moveTo(cx + 0.25 * k, Y(1.45)); ctx.lineTo(cx + 0.32 * k, Y(1.0));
      ctx.stroke();
      // torso
      ctx.fillStyle = o.jersey;
      ctx.beginPath(); ctx.roundRect(cx - 0.25 * k, Y(1.52), 0.5 * k, 0.54 * k, 0.08 * k); ctx.fill();
      if (!o.facing && o.num && k > 18) {
        ctx.fillStyle = "white";
        ctx.font = `800 ${Math.round(0.26 * k)}px Outfit, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(o.num), cx, Y(1.25));
      }
      // head
      ctx.fillStyle = "#e0ac69";
      ctx.beginPath(); ctx.arc(cx, Y(1.66), 0.12 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      if (o.facing) ctx.arc(cx, Y(1.7), 0.125 * k, Math.PI, Math.PI * 2);
      else ctx.arc(cx, Y(1.67), 0.125 * k, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawKeeper = () => {
      const s = g.current;
      const k = s.keeper;
      const z = 0.3;
      const base = P(k.x, 0, z);
      if (!base) return;
      const sc = base.k;
      if (!k.diving) {
        drawPlayer(k.x, z, { jersey: "#16a34a", shorts: "#111827", facing: true });
        // gloves up
        ctx.fillStyle = "#facc15";
        const lp = P(k.x - 0.38, 1.35, z), rp = P(k.x + 0.38, 1.35, z);
        if (lp && rp) {
          ctx.beginPath(); ctx.arc(lp.sx, lp.sy, 0.08 * sc, 0, Math.PI * 2); ctx.arc(rp.sx, rp.sy, 0.08 * sc, 0, Math.PI * 2); ctx.fill();
        }
        return;
      }
      // diving body, built in world space (x,y on the keeper plane) then projected
      const pose = keeperPose(k);
      const pr = (q: { x: number; y: number }) => P(q.x, q.y, z);
      const hip = pr(pose.hip), sho = pr(pose.shoulder), hand = pr(pose.hand), foot = pr(pose.foot), head = pr(pose.head);
      if (!hip || !sho || !hand || !foot || !head) return;
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse((foot.sx + hand.sx) / 2, base.sy, Math.abs(hand.sx - foot.sx) / 2 + 0.3 * sc, 0.1 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 0.17 * sc;
      ctx.beginPath(); ctx.moveTo(hip.sx, hip.sy); ctx.lineTo(foot.sx, foot.sy); ctx.stroke();
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 0.42 * sc;
      ctx.beginPath(); ctx.moveTo(hip.sx, hip.sy); ctx.lineTo(sho.sx, sho.sy); ctx.stroke();
      ctx.strokeStyle = "#15803d";
      ctx.lineWidth = 0.11 * sc;
      ctx.beginPath(); ctx.moveTo(sho.sx, sho.sy); ctx.lineTo(hand.sx, hand.sy); ctx.stroke();
      ctx.fillStyle = "#e0ac69";
      ctx.beginPath(); ctx.arc(head.sx, head.sy, 0.12 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath(); ctx.arc(hand.sx, hand.sy, 0.1 * sc, 0, Math.PI * 2); ctx.fill();
    };

    const drawBall = () => {
      const s = g.current;
      const b = s.ball;
      const p = P(b.x, b.y, b.z);
      if (!p) return;
      const r = Math.max(2, R * p.k);
      const grd = ctx.createRadialGradient(p.sx - r * 0.35, p.sy - r * 0.35, r * 0.1, p.sx, p.sy, r);
      grd.addColorStop(0, "#ffffff");
      grd.addColorStop(1, "#cbd5e1");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1f2937";
      for (let i = 0; i < 3; i++) {
        const a = b.rot + (i * Math.PI * 2) / 3;
        const ox = Math.cos(a) * r * 0.5, oy = Math.sin(a * 0.7) * r * 0.5;
        ctx.beginPath(); ctx.arc(p.sx + ox, p.sy + oy, r * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.stroke();
    };

    const draw = () => {
      const s = g.current;
      const lv = s.level;
      const { W, H, hz } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // sky (night match under floodlights)
      const sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, "#0b1736");
      sky.addColorStop(1, "#1e3a6e");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hz + 2);

      // stands + crowd (parallax with camera yaw)
      const standTop = hz - H * 0.17;
      const st = ctx.createLinearGradient(0, standTop, 0, hz);
      st.addColorStop(0, "#111827");
      st.addColorStop(1, "#1f2937");
      ctx.fillStyle = st;
      ctx.fillRect(0, standTop, W, hz - standTop + 1);
      const jump = s.crowdJump > 0 ? s.crowdJump : 0;
      for (let i = 0; i < CROWD.length; i++) {
        const c = CROWD[i];
        const sx = W / 2 + (c.a - s.cam.phi) * s.f * 0.55;
        if (sx < -4 || sx > W + 4) continue;
        const bounce = jump ? Math.abs(Math.sin(s.t * 12 + i)) * 4 * Math.min(1, jump) : 0;
        const sy = standTop + 4 + c.v * (hz - standTop - 10) - bounce;
        ctx.fillStyle = c.c;
        ctx.fillRect(sx, sy, 3, 3);
      }
      // floodlights
      for (const lx of [0.12, 0.88]) {
        const glow = ctx.createRadialGradient(W * lx, standTop - 10, 2, W * lx, standTop - 10, 60);
        glow.addColorStop(0, "rgba(255,255,230,0.9)");
        glow.addColorStop(1, "rgba(255,255,230,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(W * lx - 60, standTop - 70, 120, 120);
      }

      // pitch base
      const grass = ctx.createLinearGradient(0, hz, 0, H);
      grass.addColorStop(0, "#2f7d32");
      grass.addColorStop(1, "#3f9a3f");
      ctx.fillStyle = grass;
      ctx.fillRect(0, hz, W, H - hz);
      // mowing stripes
      const zMax = s.cam.z - 1;
      for (let z = -6, i = 0; z < zMax; z += 4, i++) {
        if (i % 2) continue;
        for (let x = -45; x < 45; x += 5) {
          quad([[x, 0, z], [x + 5, 0, z], [x + 5, 0, Math.min(z + 4, zMax)], [x, 0, Math.min(z + 4, zMax)]], "rgba(255,255,255,0.055)");
        }
      }

      // ad boards behind goal
      const boards = ["#dc2626", "#2563eb", "#f59e0b", "#7c3aed", "#059669"];
      for (let i = 0; i < 12; i++) {
        const x0 = -36 + i * 6;
        quad([[x0, 0, -4], [x0 + 6, 0, -4], [x0 + 6, 0.9, -4], [x0, 0.9, -4]], boards[i % boards.length]);
        const mid = P(x0 + 3, 0.45, -4);
        if (mid && mid.k > 6) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = `800 ${Math.round(0.5 * mid.k)}px Outfit, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(i % 2 ? "XOXO" : "AMINE", mid.sx, mid.sy);
        }
      }

      // pitch lines
      const LW = 0.12, LC = "rgba(255,255,255,0.85)";
      polyline(seg(-34, 0, 34, 0, 30), LW, LC);
      polyline([...seg(-9.16, 0, -9.16, 5.5, 4), ...seg(-9.16, 5.5, 9.16, 5.5, 8), ...seg(9.16, 5.5, 9.16, 0, 4)], LW, LC);
      polyline([...seg(-20.16, 0, -20.16, 16.5, 8), ...seg(-20.16, 16.5, 20.16, 16.5, 16), ...seg(20.16, 16.5, 20.16, 0, 8)], LW, LC);
      const arc: [number, number, number][] = [];
      for (let a = -0.93; a <= 0.93; a += 0.06) arc.push([Math.sin(a) * 9.15, 0, 11 + Math.cos(a) * 9.15]);
      polyline(arc, LW, LC);
      const spot = P(0, 0, 11);
      if (spot) { ctx.fillStyle = LC; ctx.beginPath(); ctx.ellipse(spot.sx, spot.sy, 0.12 * spot.k, 0.05 * spot.k, 0, 0, Math.PI * 2); ctx.fill(); }

      // ball shadow
      {
        const b = s.ball;
        const sp = P(b.x, 0, b.z);
        if (sp) {
          const r = R * sp.k * Math.max(0.4, 1.2 - b.y * 0.1);
          ctx.fillStyle = `rgba(0,0,0,${Math.max(0.08, 0.35 - b.y * 0.05)})`;
          ctx.beginPath(); ctx.ellipse(sp.sx, sp.sy, r * 1.2, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        }
      }

      // ---- goal (back net first) ----
      const nb = s.net.amt;
      const netZ = (x: number, y: number) => -GOAL_DEPTH - (nb > 0 ? nb * 0.6 * Math.exp(-((x - s.net.x) ** 2 + (y - s.net.y) ** 2) / 0.8) : 0);
      ctx.globalAlpha = 0.55;
      for (let x = -GOAL_W; x <= GOAL_W + 0.01; x += 0.35) {
        const pts: [number, number, number][] = [];
        for (let y = 0; y <= GOAL_H; y += 0.3) pts.push([x, y, netZ(x, y)]);
        pts.push([x, GOAL_H, 0]);
        polyline(pts, 0.015, "#e5e7eb");
      }
      for (let y = 0; y <= GOAL_H; y += 0.3) {
        const pts: [number, number, number][] = [[-GOAL_W, y, 0]];
        for (let x = -GOAL_W; x <= GOAL_W + 0.01; x += 0.35) pts.push([x, y, netZ(x, y)]);
        pts.push([GOAL_W, y, 0]);
        polyline(pts, 0.015, "#e5e7eb");
      }
      ctx.globalAlpha = 1;

      if (s.ball.z < 0) drawBall();

      // posts & bar
      polyline([[-GOAL_W, 0, 0], [-GOAL_W, GOAL_H, 0], [GOAL_W, GOAL_H, 0], [GOAL_W, 0, 0]], 0.12, "#ffffff");

      // ---- sortable entities ----
      type Ent = { d: number; draw: () => void };
      const ents: Ent[] = [];
      const depth = (x: number, z: number) => P(x, 0, z)?.d ?? -1;
      ents.push({ d: depth(s.keeper.x, 0.3), draw: drawKeeper });
      s.wall.forEach((w) => ents.push({ d: depth(w.x, w.z), draw: () => drawPlayer(w.x, w.z, { jersey: "#dc2626", shorts: "#f8fafc", facing: true, lift: s.wallJump }) }));
      lv.defenders.forEach((d) => {
        const p = defenderPos(d, s.t);
        ents.push({ d: depth(p.x, p.z), draw: () => drawPlayer(p.x, p.z, { jersey: "#dc2626", shorts: "#f8fafc", facing: true }) });
      });
      // teammates (+ original kicker after a pass)
      const mates: { x: number; z: number; idx: number }[] = lv.mates.map(([x, z], idx) => ({ x, z, idx }));
      if (s.holderMate >= 0) mates.push({ x: lv.ball[0] - 0.6, z: lv.ball[1] + 0.9, idx: -2 });
      mates.forEach((m) => {
        if (m.idx === s.holderMate) return;
        ents.push({
          d: depth(m.x, m.z),
          draw: () => {
            if (s.phase === "aim" && m.idx >= 0) {
              const gp = P(m.x, 0, m.z);
              if (gp) {
                const pulse = 1 + Math.sin(s.t * 5) * 0.12;
                ctx.strokeStyle = "rgba(250,204,21,0.95)";
                ctx.lineWidth = Math.max(2, 0.07 * gp.k);
                ctx.beginPath(); ctx.ellipse(gp.sx, gp.sy, 0.75 * gp.k * pulse, 0.25 * gp.k * pulse, 0, 0, Math.PI * 2); ctx.stroke();
              }
            }
            drawPlayer(m.x, m.z, { jersey: "#2563eb", shorts: "#f8fafc", facing: false, num: 7 + m.idx * 3 });
          },
        });
      });
      // kicker (you) behind the ball
      {
        // placed from the camera's point of view so he never hides the ball
        if (s.phase !== "fly") s.kickPhi = s.cam.phi;
        const fx = Math.sin(s.kickPhi), fz = -Math.cos(s.kickPhi);
        const rgx = Math.cos(s.kickPhi), rgz = Math.sin(s.kickPhi);
        const kickP = s.phase === "fly" ? Math.min(1, s.shotT / 0.12) : 0;
        const back = 0.85 - kickP * 0.55;
        const side = 0.6 - kickP * 0.25;
        const kx = s.holder.x - fx * back - rgx * side;
        const kz = s.holder.z - fz * back - rgz * side;
        const kickPose = s.phase === "fly" ? Math.max(0, 1 - Math.abs(s.shotT - 0.12) / 0.25) : 0;
        ents.push({ d: depth(kx, kz), draw: () => drawPlayer(kx, kz, { jersey: "#2563eb", shorts: "#f8fafc", facing: false, num: 10, kick: kickPose }) });
      }
      if (s.ball.z >= 0) ents.push({ d: P(s.ball.x, s.ball.y, s.ball.z)?.d ?? 1, draw: drawBall });
      ents.sort((a, b) => b.d - a.d).forEach((e) => e.d > 0 && e.draw());

      // ball trail
      if (s.trail.length > 2) {
        for (let i = 1; i < s.trail.length; i++) {
          const a = P(s.trail[i - 1].x, s.trail[i - 1].y, s.trail[i - 1].z);
          const c = P(s.trail[i].x, s.trail[i].y, s.trail[i].z);
          if (!a || !c) continue;
          ctx.strokeStyle = `rgba(255,255,255,${(i / s.trail.length) * 0.45})`;
          ctx.lineWidth = Math.max(1, R * c.k * 0.9 * (i / s.trail.length));
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
        }
      }

      // swipe trail
      const drawSwipe = (pts: Pt[], alpha: number) => {
        if (pts.length < 2) return;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = `rgba(250,204,21,${alpha})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      };
      if (s.swiping) drawSwipe(s.swipe, 0.9);
      else if (s.swipeFadeT > 0) drawSwipe(s.swipeFade, s.swipeFadeT / 0.5 * 0.8);

      // outcome text
      if (s.outcome) {
        const o = s.outcome;
        const age = (o === "goal" ? 2.2 : 1.6) - s.outcomeT;
        const scl = Math.min(1, age * 4);
        ctx.save();
        ctx.translate(W / 2, H * 0.47);
        ctx.scale(0.6 + scl * 0.4, 0.6 + scl * 0.4);
        ctx.globalAlpha = Math.min(1, age * 4);
        ctx.font = `900 ${o === "goal" ? Math.round(Math.min(W * 0.13, 64)) : Math.round(Math.min(W * 0.07, 34))}px Outfit, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.strokeText(OUTCOME_TEXT[o], 0, 0);
        ctx.fillStyle = o === "goal" ? "#facc15" : "#ffffff";
        ctx.fillText(OUTCOME_TEXT[o], 0, 0);
        ctx.restore();
      }

      // confetti
      for (const c of s.confetti) {
        ctx.globalAlpha = Math.min(1, c.life);
        ctx.fillStyle = c.c;
        ctx.fillRect(c.x, c.y, 5, 8);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Input ----------
  const localPt = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (s.phase !== "aim" || s.swiping) return;
    unlockAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    s.pointerId = e.pointerId;
    s.swiping = true;
    s.swipe = [localPt(e)];
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (!s.swiping || e.pointerId !== s.pointerId) return;
    s.swipe.push(localPt(e));
    // a swipe is a gesture: keep only the last ~0.6s
    const now = performance.now();
    while (s.swipe.length > 2 && now - s.swipe[0].t > 600) s.swipe.shift();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (!s.swiping || e.pointerId !== s.pointerId) return;
    s.swiping = false;
    s.swipe.push(localPt(e));
    s.swipeFade = s.swipe;
    s.swipeFadeT = 0.5;
    if (s.phase === "aim") kick(s.swipe);
  };

  const onPointerCancel = () => {
    g.current.swiping = false;
  };

  // ---------- Save progress ----------
  const savedKey = useRef("");
  useEffect(() => {
    if (phase !== "won") return;
    const key = `${levelIdx}-${result.stars}`;
    if (savedKey.current === key) return;
    savedKey.current = key;
    const stars = [...progress.stars];
    stars[levelIdx] = Math.max(stars[levelIdx] ?? 0, result.stars);
    setProgress({ unlocked: Math.max(progress.unlocked, Math.min(levelIdx + 1, FLEVELS.length - 1)), stars });
  }, [phase, levelIdx, result.stars, progress, setProgress]);

  const level = FLEVELS[levelIdx];
  const totalStars = progress.stars.reduce((a, b) => a + (b ?? 0), 0);
  const inGame = phase === "aim" || phase === "fly" || phase === "pass";

  return (
    <div className={styles.screen}>
      <div className={styles.hud}>
        <button className={styles.hudBtn} onClick={() => (phase === "menu" ? router.push("/?select=1") : openMenu())} aria-label="Retour">←</button>
        <div className={styles.hudTitle}>{phase === "menu" ? "Football ⚽" : `Niveau ${levelIdx + 1} · ${level.name}`}</div>
        <div className={styles.hudRight}>
          {phase !== "menu" && (
            <span className={styles.balls}>
              {Array.from({ length: level.attempts }, (_, i) => (
                <span key={i} className={i < attempts ? "" : styles.ballUsed}>⚽</span>
              ))}
            </span>
          )}
          <button className={styles.hudBtn} onClick={() => setMutedState(!muted)} aria-label="Son">{muted ? "🔇" : "🔊"}</button>
        </div>
      </div>

      <div className={styles.stage} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {inGame && phase === "aim" && attempts === level.attempts && passes === 0 && (
          <div className={styles.hint}>
            {level.mates.length ? "👆 Swipe 3la sahbek (passe) wela l l but (tir)" : "👆 Swipe men l bolla l l but — m3awej = effet"}
          </div>
        )}

        {phase === "menu" && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              <h1 className={styles.panelTitle}>Football Hero ⚽</h1>
              <p className={styles.panelText}>
                <b>Swipe</b> bach tirer: win t7ebes sab3ek = win troh l bolla. Swipe <b>m3awej</b> = effet (courbe).
                Swipe 3la <b>sahbek</b> = passe.
              </p>
              <div className={styles.starsTotal}>⭐ {totalStars} / {FLEVELS.length * 3}</div>
              <div className={styles.levelGrid}>
                {FLEVELS.map((lv, i) => {
                  const locked = i > progress.unlocked;
                  const st = progress.stars[i] ?? 0;
                  return (
                    <button key={i} className={`${styles.levelBtn} ${locked ? styles.levelLocked : ""}`} disabled={locked} onClick={() => startLevel(i)}>
                      <span className={styles.levelNum}>{locked ? "🔒" : i + 1}</span>
                      <span className={styles.levelStars}>{[0, 1, 2].map((k) => (k < st ? "★" : "☆")).join("")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {phase === "intro" && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              <div className={styles.levelTag}>Niveau {levelIdx + 1} / {FLEVELS.length}</div>
              <h2 className={styles.panelTitle}>{level.name}</h2>
              <p className={styles.panelText}>{level.brief}</p>
              <div className={styles.introInfo}>
                <span>⚽ {level.attempts} essais</span>
                <span>🧤 Gardien {Math.round(level.keeper * 100)}%</span>
                {level.wall ? <span>🧱 Mur {level.wall}</span> : null}
                {level.mates.length ? <span>🤝 {level.mates.length} passe{level.mates.length > 1 ? "s" : ""}</span> : null}
              </div>
              <p className={styles.starsRule}>★ Marki · ★ Men l&apos;awel · ★ F l coin / lucarne</p>
              <button className={styles.primary} onClick={beginPlay}>Yallah! ⚽</button>
            </div>
          </div>
        )}

        {(phase === "won" || phase === "lost") && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              {phase === "won" ? (
                <>
                  <h2 className={styles.panelTitle}>GOOOL! 🎉</h2>
                  <div className={styles.bigStars}>
                    {[0, 1, 2].map((k) => (
                      <span key={k} className={k < result.stars ? styles.starOn : styles.starOff} style={{ animationDelay: `${k * 0.15}s` }}>★</span>
                    ))}
                  </div>
                  <p className={styles.panelText}>{result.text}</p>
                </>
              ) : (
                <>
                  <h2 className={styles.panelTitle}>Khsart 😢</h2>
                  <p className={styles.panelText}>{result.text} — ma b9awch les essais.</p>
                </>
              )}
              <div className={styles.btnRow}>
                <button className={styles.secondary} onClick={() => startLevel(levelIdx)}>🔄 3awed</button>
                {phase === "won" && levelIdx < FLEVELS.length - 1 && (
                  <button className={styles.primary} onClick={() => startLevel(levelIdx + 1)}>Niveau jay →</button>
                )}
              </div>
              <button className={styles.link} onClick={openMenu}>📋 Les niveaux</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
