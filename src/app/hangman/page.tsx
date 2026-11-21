"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { LEVELS, Level } from "./levels";
import { tone, noise, unlockAudio, setMuted } from "../lib/sfx";
import { useStored } from "../lib/useStored";
import styles from "./hangman.module.css";

// ================= CONSTANTS =================
const WORLD_H = 600;
const GROUND = 0.9 * WORLD_H;
const GRAVITY = 820;
const MIN_SPEED = 260;
const MAX_SPEED = 1080;
const ARROW_LEN = 36;
const SHOT_COOLDOWN = 0.35;

const BODY_LINES = ["ayy! a viser mlih 😫", "marakch tchouf ??", "kamal 3liya khir…", "rani nmout hna 😵"];
const SAVED_LINES = ["Ya3tik saha! 🙏", "Sauvitni khoya!", "Nta l'héros ❤️", "Merci bezzaf!"];

// ================= TYPES =================
interface Arrow {
  x: number; y: number; vx: number; vy: number; angle: number;
  state: "fly" | "stuck" | "gone";
  /** stuck on hostage i (local coords along body) or obstacle j */
  onHostage?: number; onObstacle?: number;
  lx?: number; ly?: number; la?: number;
}

interface HostageState {
  cut: boolean;
  dead: boolean;
  breath: number;
  phase: number;
  /** falling / landed after cut */
  fx: number; fy: number; fvy: number; landed: boolean;
  speech: string; speechT: number;
  shake: number;
  hits: number;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }

type Phase = "menu" | "intro" | "play" | "won" | "lost";

interface Progress { unlocked: number; stars: number[] }

// ================= GEOMETRY HELPERS =================
function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  let t = l2 === 0 ? 0 : ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/** Pendulum geometry of hostage i at time t (world units). */
function hostageGeom(lv: Level, i: number, hs: HostageState, W: number, t: number) {
  const h = lv.hostages[i];
  const px = hostageX(h.x, W);
  const py = h.y * WORLD_H;
  if (hs.cut) {
    // Upright, falling or standing on the ground
    const nx = hs.fx, ny = hs.fy;
    return { px, py, a: 0, nx, ny, dx: 0, dy: 1 };
  }
  const a = (h.swing ?? 0) * Math.sin(t * (h.swingSpeed ?? 0) + hs.phase) + (hs.shake > 0 ? Math.sin(t * 60) * 0.05 * hs.shake : 0);
  const dx = Math.sin(a), dy = Math.cos(a);
  return { px, py, a, nx: px + dx * h.rope, ny: py + dy * h.rope, dx, dy };
}

function obstacleGeom(o: Level["obstacles"][number], W: number, t: number) {
  let cx = o.x * W, cy = o.y * WORLD_H;
  if (o.move === "y") cy += Math.sin(t * (o.speed ?? 1)) * (o.amp ?? 0) * WORLD_H;
  if (o.move === "x") cx += Math.sin(t * (o.speed ?? 1)) * (o.amp ?? 0) * W;
  const ang = o.kind === "blade" ? t * (o.spin ?? 0) : 0;
  return { cx, cy, ang };
}

/** Rope x position. Levels use fractions up to 0.9; they are stretched so that the
 *  gallows post (always on the FAR side of the rope, away from the archer) stays on screen. */
function hostageX(frac: number, W: number) {
  return (frac * (W - 60)) / 0.9;
}

/** The post is always to the right of the rope so it never stands between the archer and the rope. */
function postXOf(px: number) {
  return px + 46;
}

/** Rotate a vector by angle th. */
function rot(x: number, y: number, th: number) {
  const c = Math.cos(th), s = Math.sin(th);
  return [x * c - y * s, x * s + y * c] as const;
}

function bowPos(W: number) {
  return { x: Math.max(48, 0.09 * W), y: GROUND - 78 };
}

// ================= COMPONENT =================
export default function HangmanPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [progress, setProgress] = useStored<Progress>("xoxo-hangman-v2", { unlocked: 0, stars: [] });
  const [muted, setMutedState] = useStored<boolean>("xoxo-hangman-muted", false);

  const [phase, setPhase] = useState<Phase>("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [arrowsLeft, setArrowsLeft] = useState(0);
  const [result, setResult] = useState<{ stars: number; reason?: string }>({ stars: 0 });

  // Mutable game state for the render loop (never read during render)
  const g = useRef({
    W: 960,
    scale: 1,
    dpr: 1,
    t: 0,
    level: LEVELS[0],
    levelIdx: 0,
    phase: "menu" as Phase,
    arrows: [] as Arrow[],
    arrowsLeft: 0,
    shotsFired: 0,
    hostages: [] as HostageState[],
    particles: [] as Particle[],
    aiming: false,
    aimStart: { x: 0, y: 0 },
    aimCur: { x: 0, y: 0 },
    pointerId: -1,
    cooldown: 0,
    endTimer: -1,
    pendingResult: null as null | { win: boolean; reason?: string },
  });

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  // ---------- Lock page (no scroll / zoom / bounce) ----------
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

  // ---------- Level control ----------
  const startLevel = useCallback((idx: number) => {
    const lv = LEVELS[idx];
    const s = g.current;
    s.level = lv;
    s.levelIdx = idx;
    s.t = 0;
    s.arrows = [];
    s.particles = [];
    s.arrowsLeft = lv.arrows;
    s.shotsFired = 0;
    s.aiming = false;
    s.cooldown = 0;
    s.endTimer = -1;
    s.pendingResult = null;
    s.hostages = lv.hostages.map((h, i) => ({
      cut: false, dead: false, breath: h.breath, phase: i * 1.3,
      fx: 0, fy: 0, fvy: 0, landed: false,
      speech: i === 0 ? "3teqni!! 😱" : "", speechT: i === 0 ? 2.2 : 0, shake: 0, hits: 0,
    }));
    s.phase = "intro";
    setLevelIdx(idx);
    setArrowsLeft(lv.arrows);
    setPhase("intro");
  }, []);

  const beginPlay = () => {
    unlockAudio();
    g.current.phase = "play";
    setPhase("play");
    tone({ freq: 660, dur: 0.12, type: "triangle", vol: 0.15 });
  };

  const openMenu = () => {
    g.current.phase = "menu";
    setPhase("menu");
  };

  // ---------- Resize canvas to its container (crisp on retina) ----------
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      const s = g.current;
      s.dpr = dpr;
      s.scale = r.height / WORLD_H;
      // world width follows the screen aspect, clamped so levels stay playable
      s.W = Math.min(Math.max(r.width / s.scale, 0.52 * WORLD_H), 1.8 * WORLD_H);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ---------- Main loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const burst = (x: number, y: number, color: string, n = 14, speed = 220) => {
      const s = g.current;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random());
        s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.6 + Math.random() * 0.5, color, size: 2 + Math.random() * 3 });
      }
    };

    const finish = (win: boolean, reason?: string) => {
      const s = g.current;
      if (s.pendingResult) return;
      s.pendingResult = { win, reason };
      s.endTimer = win ? 1.4 : 1.1;
      s.aiming = false;
      if (win) {
        [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.25, type: "triangle", vol: 0.18, delay: i * 0.11 }));
      } else {
        [392, 330, 262].forEach((f, i) => tone({ freq: f, dur: 0.3, type: "sawtooth", vol: 0.1, delay: i * 0.15 }));
      }
    };

    const update = (dt: number) => {
      const s = g.current;
      const lv = s.level;
      s.t += dt;
      s.cooldown = Math.max(0, s.cooldown - dt);
      const W = s.W;

      // hostages
      s.hostages.forEach((hs, i) => {
        hs.speechT = Math.max(0, hs.speechT - dt);
        hs.shake = Math.max(0, hs.shake - dt * 2);
        if (!hs.cut && !hs.dead && s.phase === "play" && !s.pendingResult) {
          hs.breath -= dt;
          if (hs.breath <= 0) {
            hs.breath = 0;
            hs.dead = true;
            finish(false, "Ma lhaqtch… l bnadem ma 9derch ytnefes 😢");
          }
        }
        if (hs.cut && !hs.landed) {
          hs.fvy += GRAVITY * dt;
          hs.fy += hs.fvy * dt;
          const groundNeck = GROUND - 100;
          if (hs.fy >= groundNeck) {
            hs.fy = groundNeck;
            hs.landed = true;
            hs.speech = SAVED_LINES[i % SAVED_LINES.length];
            hs.speechT = 2.5;
            noise(0.15, 0.2, 300);
          }
        }
      });

      // arrows
      const sub = 4;
      const h = dt / sub;
      for (const a of s.arrows) {
        if (a.state !== "fly") continue;
        for (let k = 0; k < sub && a.state === "fly"; k++) {
          a.vy += GRAVITY * h;
          a.vx += (lv.wind ?? 0) * h;
          a.x += a.vx * h;
          a.y += a.vy * h;
          a.angle = Math.atan2(a.vy, a.vx);
          const tx = a.x + Math.cos(a.angle) * (ARROW_LEN / 2);
          const ty = a.y + Math.sin(a.angle) * (ARROW_LEN / 2);

          // hostages: rope (cut), head (lose), body (penalty)
          for (let i = 0; i < s.hostages.length && a.state === "fly"; i++) {
            const hs = s.hostages[i];
            if (hs.dead) continue;
            const geo = hostageGeom(lv, i, hs, W, s.t);
            if (!hs.cut && distToSeg(tx, ty, geo.px, geo.py, geo.nx, geo.ny - 2) < 7) {
              hs.cut = true;
              hs.fx = geo.nx;
              hs.fy = geo.ny;
              hs.fvy = 0;
              burst(tx, ty, "#c8a165", 16, 160);
              noise(0.12, 0.3, 2400, 0, 2);
              tone({ freq: 880, to: 1320, dur: 0.15, type: "square", vol: 0.08 });
              // arrow keeps flying after cutting the rope
              continue;
            }
            const headX = geo.nx + geo.dx * 13, headY = geo.ny + geo.dy * 13;
            if (Math.hypot(tx - headX, ty - headY) < 13) {
              a.state = "stuck";
              a.onHostage = i;
              [a.lx, a.ly] = rot(tx - geo.nx, ty - geo.ny, geo.a); a.la = a.angle + geo.a;
              hs.dead = true;
              burst(tx, ty, "#e11d48", 22, 200);
              noise(0.25, 0.35, 500);
              finish(false, "Headshot! 💀 Qtelto, ma sauvitouch…");
              break;
            }
            const shX = geo.nx + geo.dx * 26, shY = geo.ny + geo.dy * 26;
            const hipX = geo.nx + geo.dx * 62, hipY = geo.ny + geo.dy * 62;
            const ftX = geo.nx + geo.dx * 100, ftY = geo.ny + geo.dy * 100;
            if (distToSeg(tx, ty, shX, shY, hipX, hipY) < 11 || distToSeg(tx, ty, hipX, hipY, ftX, ftY) < 8) {
              a.state = "stuck";
              a.onHostage = i;
              [a.lx, a.ly] = rot(tx - geo.nx, ty - geo.ny, geo.a); a.la = a.angle + geo.a;
              hs.hits++;
              hs.breath = Math.max(0.5, hs.breath - 6);
              hs.shake = 1.2;
              hs.speech = BODY_LINES[(hs.hits - 1) % BODY_LINES.length];
              hs.speechT = 2.2;
              burst(tx, ty, "#ef4444", 10, 120);
              tone({ freq: 300, to: 160, dur: 0.25, type: "sawtooth", vol: 0.12 });
            }
          }
          if (a.state !== "fly") break;

          // obstacles
          for (let j = 0; j < lv.obstacles.length; j++) {
            const o = lv.obstacles[j];
            const og = obstacleGeom(o, W, s.t);
            let hit = false;
            if (o.kind === "wall") {
              hit = Math.abs(tx - og.cx) < o.w / 2 && Math.abs(ty - og.cy) < o.h / 2;
            } else {
              const hx = Math.cos(og.ang) * o.w / 2, hy = Math.sin(og.ang) * o.w / 2;
              hit = distToSeg(tx, ty, og.cx - hx, og.cy - hy, og.cx + hx, og.cy + hy) < o.h / 2 + 3;
            }
            if (hit) {
              a.state = "stuck";
              a.onObstacle = j;
              // local coords (rotated frame for blades)
              const rx = tx - og.cx, ry = ty - og.cy;
              const c = Math.cos(-og.ang), sn = Math.sin(-og.ang);
              a.lx = rx * c - ry * sn; a.ly = rx * sn + ry * c; a.la = a.angle - og.ang;
              noise(0.08, 0.3, 700);
              break;
            }
          }
          if (a.state !== "fly") break;

          // (gallows posts are scenery: arrows only interact with ropes, bodies and obstacles)

          if (ty >= GROUND) {
            a.state = "stuck";
            a.y -= ty - GROUND;
            a.lx = a.x; a.ly = a.y; a.la = a.angle;
            noise(0.06, 0.15, 400);
          } else if (a.x > W + 80 || a.x < -80 || a.y > WORLD_H + 50) {
            a.state = "gone";
          }
        }
      }

      // particles
      for (const p of s.particles) {
        p.vy += 500 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      // win / lose checks
      if (s.phase === "play" && !s.pendingResult) {
        if (s.hostages.every((hs) => hs.cut)) finish(true);
        else if (s.arrowsLeft === 0 && !s.arrows.some((a) => a.state === "fly")) {
          finish(false, "Kmlou l flèches 🏹… 3awed!");
        }
      }

      if (s.pendingResult && s.endTimer > 0) {
        s.endTimer -= dt;
        if (s.endTimer <= 0) {
          const { win, reason } = s.pendingResult;
          s.phase = win ? "won" : "lost";
          let stars = 0;
          if (win) {
            const extra = s.shotsFired - lv.hostages.length;
            const hits = s.hostages.reduce((n, hs) => n + hs.hits, 0);
            stars = extra <= 0 ? 3 : extra <= 1 ? 2 : 1;
            if (hits > 0) stars = Math.min(stars, 2);
          }
          setResult({ stars, reason });
          setPhase(win ? "won" : "lost");
        }
      }
    };

    // ---------- Drawing ----------
    const drawMan = (x: number, y: number, dx: number, dy: number, hs: HostageState, scared: boolean) => {
      // (x,y) = neck point, (dx,dy) = body direction
      const P = (d: number, side = 0) => [x + dx * d + -dy * side, y + dy * d + dx * side] as const;
      const [hx, hy] = P(13);
      const [shx, shy] = P(26);
      const [hipx, hipy] = P(62);
      ctx.lineCap = "round";
      // legs
      ctx.strokeStyle = "#1e3a8a";
      ctx.lineWidth = 7;
      const legSpread = hs.landed ? 9 + Math.abs(Math.sin(g.current.t * 8)) * 4 : 5;
      for (const sd of [-1, 1]) {
        const [fx, fy] = P(100, sd * legSpread);
        ctx.beginPath(); ctx.moveTo(hipx, hipy); ctx.lineTo(fx, fy); ctx.stroke();
      }
      // torso
      ctx.strokeStyle = hs.hits > 0 ? "#dc2626" : "#f97316";
      ctx.lineWidth = 15;
      ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(hipx, hipy); ctx.stroke();
      // arms: tied behind when hanging, raised when saved
      ctx.strokeStyle = "#f2c9a0";
      ctx.lineWidth = 5;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(shx + -dy * sd * 6, shy + dx * sd * 6);
        if (hs.landed) {
          const wave = Math.sin(g.current.t * 10 + sd) * 6;
          ctx.lineTo(shx + sd * 18, shy - 26 + wave);
        } else {
          const [ax, ay] = P(56, sd * 9);
          ctx.lineTo(ax, ay);
        }
        ctx.stroke();
      }
      // head
      ctx.fillStyle = "#f2c9a0";
      ctx.strokeStyle = "#7c4a24";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // hair
      ctx.fillStyle = "#3b2414";
      ctx.beginPath(); ctx.arc(hx, hy - 3, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      // face
      ctx.fillStyle = "#111";
      if (hs.dead) {
        ctx.strokeStyle = "#111"; ctx.lineWidth = 1.8;
        for (const ex of [-4.5, 4.5]) {
          ctx.beginPath(); ctx.moveTo(hx + ex - 2, hy - 3); ctx.lineTo(hx + ex + 2, hy + 1);
          ctx.moveTo(hx + ex + 2, hy - 3); ctx.lineTo(hx + ex - 2, hy + 1); ctx.stroke();
        }
      } else {
        for (const ex of [-4.5, 4.5]) { ctx.beginPath(); ctx.arc(hx + ex, hy - 1, 1.8, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath();
        if (scared) { ctx.ellipse(hx, hy + 5, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.strokeStyle = "#111"; ctx.lineWidth = 1.8; ctx.arc(hx, hy + 2, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
      }
    };

    const drawArrow = (x: number, y: number, ang: number, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.strokeStyle = "#6b4423";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-ARROW_LEN / 2, 0); ctx.lineTo(ARROW_LEN / 2 - 4, 0); ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath(); ctx.moveTo(ARROW_LEN / 2 + 5, 0); ctx.lineTo(ARROW_LEN / 2 - 6, -5); ctx.lineTo(ARROW_LEN / 2 - 6, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.moveTo(-ARROW_LEN / 2, 0); ctx.lineTo(-ARROW_LEN / 2 - 7, -6); ctx.lineTo(-ARROW_LEN / 2 + 5, 0); ctx.lineTo(-ARROW_LEN / 2 - 7, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    };

    // below=true: bubble under the anchor (used while hanging so it never hides the rope)
    const bubble = (x: number, y: number, text: string, alpha: number, below = false) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 3);
      ctx.font = "700 15px Outfit, sans-serif";
      const w = ctx.measureText(text).width + 18;
      const bx = Math.min(Math.max(x - w / 2, 6), g.current.W - w - 6);
      const by = below ? y + 8 : y - 34;
      ctx.fillStyle = "white";
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, w, 26, 10);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      if (below) { ctx.moveTo(x - 5, by); ctx.lineTo(x, by - 8); ctx.lineTo(x + 5, by); }
      else { ctx.moveTo(x - 5, by + 26); ctx.lineTo(x, by + 34); ctx.lineTo(x + 5, by + 26); }
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx + 9, by + 13);
      ctx.restore();
    };

    const aimVector = () => {
      const s = g.current;
      const dx = (s.aimStart.x - s.aimCur.x);
      const dy = (s.aimStart.y - s.aimCur.y);
      const len = Math.hypot(dx, dy);
      const cssMin = Math.min(canvas.clientWidth, canvas.clientHeight);
      const power = Math.min(len / (0.32 * cssMin), 1);
      return { angle: Math.atan2(dy, dx), power, len };
    };

    const draw = () => {
      const s = g.current;
      const lv = s.level;
      const W = s.W;
      const sc = s.scale * s.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // center world horizontally if canvas is wider/narrower than W
      const offX = (canvas.width - W * sc) / 2;
      ctx.setTransform(sc, 0, 0, sc, offX, 0);

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      if (lv.sky === "night") { sky.addColorStop(0, "#0b1033"); sky.addColorStop(1, "#3b3f8f"); }
      else if (lv.sky === "sunset") { sky.addColorStop(0, "#4c1d95"); sky.addColorStop(0.55, "#f97316"); sky.addColorStop(1, "#fde68a"); }
      else { sky.addColorStop(0, "#38bdf8"); sky.addColorStop(1, "#e0f2fe"); }
      ctx.fillStyle = sky;
      ctx.fillRect(-offX / sc, 0, canvas.width / sc, GROUND);

      // Sun / moon / stars
      if (lv.sky === "night") {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        for (let i = 0; i < 40; i++) {
          const sx = (i * 97.3) % W;
          const sy = (i * 53.7) % (GROUND * 0.6);
          ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(s.t + i));
          ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#f1f5f9";
        ctx.beginPath(); ctx.arc(W * 0.78, 80, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0b1033";
        ctx.beginPath(); ctx.arc(W * 0.78 + 10, 74, 22, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = lv.sky === "sunset" ? "#fde047" : "#fef08a";
        ctx.beginPath(); ctx.arc(W * 0.3, lv.sky === "sunset" ? GROUND - 120 : 90, 34, 0, Math.PI * 2); ctx.fill();
        // clouds
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        for (let i = 0; i < 3; i++) {
          const cx = ((s.t * (8 + i * 4) + i * 300) % (W + 200)) - 100;
          const cy = 60 + i * 45;
          ctx.beginPath();
          ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.arc(cx + 20, cy - 8, 22, 0, Math.PI * 2); ctx.arc(cx + 44, cy, 17, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Hills
      const hill = (color: string, base: number, amp: number, freq: number, ph: number) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-offX / sc, GROUND);
        for (let x = -offX / sc; x <= W + offX / sc + 10; x += 12) ctx.lineTo(x, base - Math.sin(x * freq + ph) * amp - Math.sin(x * freq * 2.3) * amp * 0.4);
        ctx.lineTo(W + offX / sc + 10, GROUND);
        ctx.fill();
      };
      const night = lv.sky === "night";
      hill(night ? "#1e2a5a" : "#86c06c", GROUND - 70, 26, 0.008, 1);
      hill(night ? "#18224a" : "#5fa04e", GROUND - 30, 18, 0.013, 3);

      // Ground
      const gr = ctx.createLinearGradient(0, GROUND, 0, WORLD_H);
      gr.addColorStop(0, night ? "#14532d" : "#4d9a3a");
      gr.addColorStop(1, night ? "#052e16" : "#2f6b23");
      ctx.fillStyle = gr;
      ctx.fillRect(-offX / sc, GROUND, canvas.width / sc, WORLD_H - GROUND + 2);

      // Wind indicator
      if (lv.wind) {
        const dir = Math.sign(lv.wind);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const wx = ((s.t * 120 * dir + i * W / 4) % W + W) % W;
          const wy = 150 + i * 70;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 30 * dir, wy); ctx.stroke();
        }
      }

      // Obstacles
      lv.obstacles.forEach((o, j) => {
        const og = obstacleGeom(o, W, s.t);
        ctx.save();
        ctx.translate(og.cx, og.cy);
        ctx.rotate(og.ang);
        if (o.kind === "wall") {
          ctx.fillStyle = "#78716c";
          ctx.strokeStyle = "#44403c";
          ctx.lineWidth = 2;
          ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
          ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
          ctx.strokeStyle = "rgba(0,0,0,0.25)";
          for (let yy = -o.h / 2 + 18; yy < o.h / 2; yy += 18) { ctx.beginPath(); ctx.moveTo(-o.w / 2, yy); ctx.lineTo(o.w / 2, yy); ctx.stroke(); }
        } else {
          ctx.fillStyle = "#cbd5e1";
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(-o.w / 2, -o.h / 2, o.w, o.h, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#334155";
          ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        }
        // arrows stuck on it
        s.arrows.forEach((a) => {
          if (a.state === "stuck" && a.onObstacle === j) drawArrow(a.lx! - Math.cos(a.la!) * ARROW_LEN / 2, a.ly! - Math.sin(a.la!) * ARROW_LEN / 2, a.la!);
        });
        ctx.restore();
      });

      // Gallows + hostages
      lv.hostages.forEach((h, i) => {
        const hs = s.hostages[i];
        if (!hs) return;
        const px = hostageX(h.x, W), py = h.y * WORLD_H;
        const postX = postXOf(px);
        const side = Math.sign(postX - px);
        const beamL = Math.min(px, postX) - 10, beamR = Math.max(px, postX) + 6;
        ctx.fillStyle = "#7c4a24";
        ctx.strokeStyle = "#4a2c14";
        ctx.lineWidth = 2;
        ctx.fillRect(postX - 6, py - 8, 12, GROUND - py + 8);
        ctx.strokeRect(postX - 6, py - 8, 12, GROUND - py + 8);
        ctx.fillRect(beamL, py - 10, beamR - beamL, 10);
        ctx.strokeRect(beamL, py - 10, beamR - beamL, 10);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#7c4a24";
        ctx.beginPath(); ctx.moveTo(postX, py + 34); ctx.lineTo(postX - 30 * side, py); ctx.stroke();
        ctx.fillStyle = "#4a2c14";
        ctx.fillRect(postX - 18, GROUND - 6, 36, 6);

        const geo = hostageGeom(lv, i, hs, W, s.t);
        // rope
        ctx.strokeStyle = "#c8a165";
        ctx.lineWidth = 3;
        if (!hs.cut) {
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(geo.nx, geo.ny); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(s.t * 3) * 4, py + 30); ctx.stroke();
        }
        drawMan(geo.nx, geo.ny, geo.dx, geo.dy, hs, !hs.cut);
        // noose knot
        if (!hs.cut) {
          ctx.fillStyle = "#a07d48";
          ctx.beginPath(); ctx.arc(geo.nx, geo.ny + 2, 4, 0, Math.PI * 2); ctx.fill();
        }
        // arrows stuck in this hostage
        s.arrows.forEach((a) => {
          if (a.state === "stuck" && a.onHostage === i) {
            const [rx, ry] = rot(a.lx!, a.ly!, -geo.a);
            const ang = a.la! - geo.a;
            drawArrow(geo.nx + rx - Math.cos(ang) * ARROW_LEN / 2, geo.ny + ry - Math.sin(ang) * ARROW_LEN / 2, ang);
          }
        });
        // breath bar
        if (!hs.cut && !hs.dead) {
          const ratio = hs.breath / h.breath;
          const bw = 56;
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.beginPath(); ctx.roundRect(px - bw / 2 + 18, py - 30, bw, 9, 4); ctx.fill();
          ctx.fillStyle = ratio > 0.5 ? "#22c55e" : ratio > 0.25 ? "#f59e0b" : "#ef4444";
          ctx.beginPath(); ctx.roundRect(px - bw / 2 + 18, py - 30, bw * ratio, 9, 4); ctx.fill();
        }
        if (hs.speechT > 0 && hs.speech) {
          if (hs.cut) bubble(geo.nx, geo.ny - 10, hs.speech, hs.speechT);
          else bubble(geo.nx + geo.dx * 102, geo.ny + geo.dy * 102, hs.speech, hs.speechT, true);
        }
      });

      // Archer
      const bow = bowPos(W);
      let aimAng = -0.6, pull = 0;
      if (s.aiming) {
        const av = aimVector();
        if (av.len > 8) { aimAng = av.angle; pull = av.power; }
      }
      // body
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(bow.x - 14, bow.y + 30); ctx.lineTo(bow.x - 22, GROUND); ctx.moveTo(bow.x - 14, bow.y + 30); ctx.lineTo(bow.x - 4, GROUND); ctx.stroke();
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(bow.x - 14, bow.y - 6); ctx.lineTo(bow.x - 14, bow.y + 32); ctx.stroke();
      ctx.fillStyle = "#f2c9a0";
      ctx.beginPath(); ctx.arc(bow.x - 14, bow.y - 20, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath(); ctx.arc(bow.x - 14, bow.y - 24, 11, Math.PI, Math.PI * 2); ctx.fill();
      // bow + string
      ctx.save();
      ctx.translate(bow.x, bow.y);
      ctx.rotate(aimAng);
      ctx.strokeStyle = "#f2c9a0"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.strokeStyle = "#92400e"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(-6, 0, 30, -1.2, 1.2); ctx.stroke();
      const sx = -6 + Math.cos(1.2) * 30;
      const sy = Math.sin(1.2) * 30;
      const pullX = sx - 8 - pull * 26;
      ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, -sy); ctx.lineTo(pullX, 0); ctx.lineTo(sx, sy); ctx.stroke();
      if (s.phase === "play" && s.arrowsLeft > 0 && s.cooldown <= 0 && !s.pendingResult) {
        ctx.restore();
        drawArrow(bow.x + Math.cos(aimAng) * (pullX + ARROW_LEN / 2), bow.y + Math.sin(aimAng) * (pullX + ARROW_LEN / 2), aimAng);
      } else ctx.restore();

      // Trajectory preview
      if (s.aiming) {
        const av = aimVector();
        if (av.len > 8) {
          const sp = MIN_SPEED + av.power * (MAX_SPEED - MIN_SPEED);
          let x = bow.x, y = bow.y, vx = Math.cos(av.angle) * sp, vy = Math.sin(av.angle) * sp;
          const step = 0.045;
          for (let i = 0; i < lv.guide; i++) {
            for (let k = 0; k < 3; k++) {
              vy += GRAVITY * step / 3; vx += (lv.wind ?? 0) * step / 3;
              x += vx * step / 3; y += vy * step / 3;
            }
            if (y > GROUND) break;
            ctx.fillStyle = `rgba(255,255,255,${0.9 - (i / lv.guide) * 0.7})`;
            ctx.beginPath(); ctx.arc(x, y, 3.2 - (i / lv.guide) * 1.6, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      // Flying / ground arrows
      s.arrows.forEach((a) => {
        if (a.state === "fly") drawArrow(a.x, a.y, a.angle);
        else if (a.state === "stuck" && a.onHostage === undefined && a.onObstacle === undefined) drawArrow(a.lx!, a.ly!, a.la!, 0.9);
      });

      // Particles
      s.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Power meter while aiming (screen-space feel, top-left of archer)
      if (s.aiming) {
        const av = aimVector();
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath(); ctx.roundRect(bow.x - 30, GROUND + 14, 70, 10, 5); ctx.fill();
        ctx.fillStyle = av.power > 0.85 ? "#ef4444" : av.power > 0.5 ? "#f59e0b" : "#22c55e";
        ctx.beginPath(); ctx.roundRect(bow.x - 30, GROUND + 14, 70 * av.power, 10, 5); ctx.fill();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (g.current.phase !== "menu") update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---------- Input: drag ANYWHERE on the screen to aim (slingshot) ----------
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (s.phase !== "play" || s.pendingResult || s.arrowsLeft <= 0 || s.cooldown > 0 || s.aiming) return;
    unlockAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    s.pointerId = e.pointerId;
    s.aiming = true;
    s.aimStart = { x: e.clientX, y: e.clientY };
    s.aimCur = { x: e.clientX, y: e.clientY };
    tone({ freq: 180, to: 260, dur: 0.2, type: "triangle", vol: 0.06 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (!s.aiming || e.pointerId !== s.pointerId) return;
    s.aimCur = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (!s.aiming || e.pointerId !== s.pointerId) return;
    s.aiming = false;
    const dx = s.aimStart.x - e.clientX;
    const dy = s.aimStart.y - e.clientY;
    const len = Math.hypot(dx, dy);
    const canvas = canvasRef.current!;
    const cssMin = Math.min(canvas.clientWidth, canvas.clientHeight);
    if (len < 14 || s.phase !== "play" || s.pendingResult) return;
    const power = Math.min(len / (0.32 * cssMin), 1);
    const angle = Math.atan2(dy, dx);
    const sp = MIN_SPEED + power * (MAX_SPEED - MIN_SPEED);
    const bow = bowPos(s.W);
    s.arrows.push({ x: bow.x, y: bow.y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, angle, state: "fly" });
    s.arrowsLeft--;
    s.shotsFired++;
    s.cooldown = SHOT_COOLDOWN;
    setArrowsLeft(s.arrowsLeft);
    noise(0.18, 0.25, 1800, 0, 0.6);
    tone({ freq: 420, to: 180, dur: 0.12, type: "triangle", vol: 0.1 });
  };

  const onPointerCancel = () => {
    g.current.aiming = false;
  };

  // Save progress when a level is won
  const lastSaved = useRef<string>("");
  useEffect(() => {
    if (phase !== "won") return;
    const key = `${levelIdx}-${result.stars}`;
    if (lastSaved.current === key) return;
    lastSaved.current = key;
    const stars = [...progress.stars];
    stars[levelIdx] = Math.max(stars[levelIdx] ?? 0, result.stars);
    setProgress({ unlocked: Math.max(progress.unlocked, Math.min(levelIdx + 1, LEVELS.length - 1)), stars });
  }, [phase, levelIdx, result.stars, progress, setProgress]);

  const level = LEVELS[levelIdx];
  const totalStars = progress.stars.reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className={styles.screen}>
      {/* HUD */}
      <div className={styles.hud}>
        <button className={styles.hudBtn} onClick={() => (phase === "menu" ? router.push("/?select=1") : openMenu())} aria-label="Retour">
          ←
        </button>
        <div className={styles.hudTitle}>
          {phase === "menu" ? "Hangman Archery 🎯" : `Niveau ${levelIdx + 1} · ${level.name}`}
        </div>
        <div className={styles.hudRight}>
          {phase !== "menu" && (
            <span className={`${styles.quiver} ${arrowsLeft <= 1 ? styles.quiverLow : ""}`}>🏹 {arrowsLeft}</span>
          )}
          <button className={styles.hudBtn} onClick={() => setMutedState(!muted)} aria-label="Son">
            {muted ? "🔇" : "🔊"}
          </button>
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

        {phase === "play" && arrowsLeft === level.arrows && (
          <div className={styles.dragHint}>👆 Hot sab3ek, jbed l&apos;lour w tlaq</div>
        )}

        {/* LEVEL SELECT */}
        {phase === "menu" && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              <h1 className={styles.panelTitle}>Sauvi l bnadem 🎯</h1>
              <p className={styles.panelText}>
                Qta3 l habl b l flèche qbel ma ykmal nefsou. <b>Ma tdarbouch f rasou!</b>
              </p>
              <div className={styles.starsTotal}>⭐ {totalStars} / {LEVELS.length * 3}</div>
              <div className={styles.levelGrid}>
                {LEVELS.map((lv, i) => {
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

        {/* INTRO */}
        {phase === "intro" && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              <div className={styles.levelTag}>Niveau {levelIdx + 1} / {LEVELS.length}</div>
              <h2 className={styles.panelTitle}>{level.name}</h2>
              <p className={styles.panelText}>{level.hint}</p>
              <div className={styles.introInfo}>
                <span>🏹 {level.arrows} flèches</span>
                <span>🫁 {Math.min(...level.hostages.map((h) => h.breath))}s</span>
                {level.wind ? <span>💨 ri7</span> : null}
              </div>
              <button className={styles.primary} onClick={beginPlay}>Yallah! 🏹</button>
            </div>
          </div>
        )}

        {/* RESULT */}
        {(phase === "won" || phase === "lost") && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              {phase === "won" ? (
                <>
                  <h2 className={styles.panelTitle}>Sauvitou! 🎉</h2>
                  <div className={styles.bigStars}>
                    {[0, 1, 2].map((k) => (
                      <span key={k} className={k < result.stars ? styles.starOn : styles.starOff} style={{ animationDelay: `${k * 0.15}s` }}>★</span>
                    ))}
                  </div>
                  <p className={styles.panelText}>
                    {result.stars === 3 ? "Parfait! Kol flèche f blasetha 🔥" : result.stars === 2 ? "Mlih bezzaf!" : "Sauvitou, bessah b zehr 😅"}
                  </p>
                </>
              ) : (
                <>
                  <h2 className={styles.panelTitle}>Khsart 😢</h2>
                  <p className={styles.panelText}>{result.reason}</p>
                </>
              )}
              <div className={styles.btnRow}>
                <button className={styles.secondary} onClick={() => startLevel(levelIdx)}>🔄 3awed</button>
                {phase === "won" && levelIdx < LEVELS.length - 1 && (
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
