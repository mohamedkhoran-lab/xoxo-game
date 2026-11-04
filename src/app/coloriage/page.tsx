"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./coloriage.module.css";

// ─── Types ───
interface Region {
  id: string;
  tag: "path" | "circle" | "ellipse" | "rect" | "polygon";
  d?: string;
  cx?: number; cy?: number; r?: number;
  rx?: number; ry?: number;
  x?: number; y?: number; width?: number; height?: number;
  points?: string;
  transform?: string;
  decorative?: boolean;
  strokeWidth?: number;
}

interface Drawing {
  id: string;
  name: string;
  icon: string;
  viewBox: string;
  regions: Region[];
}

// ─── Color Palette ───
const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#78716c", "#1e293b", "#f8fafc",
];

// ─── Sound Effects ───
function playColorSound(muted: boolean) {
  if (muted) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const freq = 400 + Math.random() * 400;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {}
}

// ─── Lazy-loaded drawing data ───
let _drawings: Drawing[] | null = null;
async function getDrawings(): Promise<Drawing[]> {
  if (_drawings) return _drawings;
  const [a, b] = await Promise.all([
    import("./drawings-a"),
    import("./drawings-b"),
  ]);
  _drawings = [...a.drawingsA, ...b.drawingsB];
  return _drawings;
}

// ─── SVG Renderer ───
function renderRegion(
  region: Region,
  fill: string,
  onClick: () => void,
  isEraser: boolean,
) {
  const common: Record<string, unknown> = {
    key: region.id,
    fill,
    stroke: "#2d3436",
    strokeWidth: region.strokeWidth ?? 2.5,
    strokeLinejoin: "round",
    strokeLinecap: "round",
    cursor: region.decorative ? "default" : "pointer",
    onClick: region.decorative ? undefined : onClick,
    style: {
      transition: "fill 0.12s ease",
      pointerEvents: region.decorative ? "none" : "auto",
    },
  };

  if (region.transform) common.transform = region.transform;
  if (region.decorative) {
    common.fill = "none";
    common.strokeWidth = region.strokeWidth ?? 1.5;
    common.stroke = "#94a3b8";
  }

  switch (region.tag) {
    case "path":
      return <path d={region.d} {...common} />;
    case "circle":
      return <circle cx={region.cx} cy={region.cy} r={region.r} {...common} />;
    case "ellipse":
      return <ellipse cx={region.cx} cy={region.cy} rx={region.rx} ry={region.ry} {...common} />;
    case "rect":
      return <rect x={region.x} y={region.y} width={region.width} height={region.height} {...common} />;
    case "polygon":
      return <polygon points={region.points} {...common} />;
    default:
      return null;
  }
}

// ─── Main Component ───
export default function ColoPage() {
  const router = useRouter();

  // Data
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isEraser, setIsEraser] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Fills state: { [drawingId]: { [regionId]: color } }
  const [allFills, setAllFills] = useState<Record<string, Record<string, string>>>({});

  // Undo history per drawing
  const [undoStacks, setUndoStacks] = useState<Record<string, Record<string, string>[]>>({});

  // Zoom/Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  // Load drawings
  useEffect(() => {
    getDrawings().then((d) => {
      setDrawings(d);
      setLoading(false);
    });
  }, []);

  // Load saved fills from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("xoxo-coloriage-fills");
      if (saved) setAllFills(JSON.parse(saved));
      const savedMute = localStorage.getItem("xoxo-coloriage-muted");
      if (savedMute === "true") setIsMuted(true);
    } catch {}
  }, []);

  // Save fills when they change
  useEffect(() => {
    try {
      localStorage.setItem("xoxo-coloriage-fills", JSON.stringify(allFills));
    } catch {}
  }, [allFills]);

  // Current drawing's fills
  const fills = selectedDrawing ? (allFills[selectedDrawing.id] || {}) : {};

  // Region click handler
  const handleRegionClick = useCallback(
    (regionId: string) => {
      if (!selectedDrawing) return;

      const drawingId = selectedDrawing.id;
      const prevFills = allFills[drawingId] || {};
      const color = isEraser ? "#ffffff" : selectedColor;

      // Save to undo stack
      setUndoStacks((prev) => ({
        ...prev,
        [drawingId]: [...(prev[drawingId] || []), { ...prevFills }],
      }));

      // Apply color
      setAllFills((prev) => ({
        ...prev,
        [drawingId]: { ...prevFills, [regionId]: color },
      }));

      playColorSound(isMuted);
    },
    [selectedDrawing, selectedColor, isEraser, allFills, isMuted]
  );

  // Undo
  const handleUndo = () => {
    if (!selectedDrawing) return;
    const stack = undoStacks[selectedDrawing.id] || [];
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    setUndoStacks((old) => ({
      ...old,
      [selectedDrawing.id]: stack.slice(0, -1),
    }));
    setAllFills((old) => ({
      ...old,
      [selectedDrawing.id]: prev,
    }));
  };

  // Reset current drawing
  const handleReset = () => {
    if (!selectedDrawing) return;
    const drawingId = selectedDrawing.id;
    const prevFills = allFills[drawingId] || {};
    setUndoStacks((old) => ({
      ...old,
      [drawingId]: [...(old[drawingId] || []), { ...prevFills }],
    }));
    setAllFills((old) => ({
      ...old,
      [drawingId]: {},
    }));
  };

  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(5, z + 0.5));
  const zoomOut = () => {
    setZoom((z) => {
      const nz = Math.max(1, z - 0.5);
      if (nz === 1) setPan({ x: 0, y: 0 });
      return nz;
    });
  };
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => {
      const nz = Math.max(1, Math.min(5, z - e.deltaY * 0.002));
      if (nz <= 1) setPan({ x: 0, y: 0 });
      return nz;
    });
  }, []);

  // Pan handlers (mouse)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      isPanning.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    },
    [zoom]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current || zoom <= 1) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx / zoom, y: p.y + dy / zoom }));
    },
    [zoom]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Touch handlers (pan + pinch zoom)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        lastPinchDist.current = dist;
      } else if (e.touches.length === 1 && zoom > 1) {
        // Pan start
        isPanning.current = true;
        lastPointer.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [zoom]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        // Pinch zoom
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = dist / lastPinchDist.current;
        lastPinchDist.current = dist;
        setZoom((z) => Math.max(1, Math.min(5, z * scale)));
      } else if (e.touches.length === 1 && isPanning.current && zoom > 1) {
        // Pan
        const dx = e.touches[0].clientX - lastPointer.current.x;
        const dy = e.touches[0].clientY - lastPointer.current.y;
        lastPointer.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        setPan((p) => ({ x: p.x + dx / zoom, y: p.y + dy / zoom }));
      }
    },
    [zoom]
  );

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false;
    lastPinchDist.current = null;
  }, []);

  // Select a drawing
  const openDrawing = (drawing: Drawing) => {
    setSelectedDrawing(drawing);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Go back to gallery
  const backToGallery = () => {
    setSelectedDrawing(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      try { localStorage.setItem("xoxo-coloriage-muted", String(next)); } catch {}
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles["coloriage-page"]} style={{ justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ fontSize: "3rem", animation: "spin 1.5s linear infinite" }}>🎨</div>
        <p style={{ color: "#64748b", fontWeight: 600 }}>Chargement des dessins...</p>
      </div>
    );
  }

  // ────────────── GALLERY VIEW ──────────────
  if (!selectedDrawing) {
    return (
      <div className={styles["coloriage-page"]}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={`${styles["back-link"]} btn-ghost`}
            onClick={() => router.push("/?select=1")}
          >
            ← Rja3
          </button>
          <div className={styles.badge}>
            <span>🎨</span>
            <span>Coloriage</span>
          </div>
          <button
            className={styles["back-link"]}
            onClick={toggleMute}
            style={{ fontSize: "1.1rem" }}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>

        <h1 className={styles["gallery-title"]}>Khtar dessin bech tlaw3no 🎨</h1>
        <p className={styles["gallery-sub"]}>10 dessins — clique 3la wa7ed bech tebda tlawen</p>

        <div className={styles["gallery-grid"]}>
          {drawings.map((d) => {
            const dFills = allFills[d.id] || {};
            const filledCount = Object.keys(dFills).filter((k) => dFills[k] !== "#ffffff").length;
            const totalRegions = d.regions.filter((r) => !r.decorative).length;
            const progress = totalRegions > 0 ? Math.round((filledCount / totalRegions) * 100) : 0;

            return (
              <div
                key={d.id}
                className={styles["gallery-card"]}
                onClick={() => openDrawing(d)}
              >
                <div className={styles["gallery-thumb"]}>
                  <svg viewBox={d.viewBox} xmlns="http://www.w3.org/2000/svg">
                    {d.regions.map((r) =>
                      renderRegion(
                        r,
                        dFills[r.id] || (r.decorative ? "none" : "#ffffff"),
                        () => {},
                        false
                      )
                    )}
                  </svg>
                </div>
                <div className={styles["gallery-info"]}>
                  <span className={styles["gallery-icon"]}>{d.icon}</span>
                  <span className={styles["gallery-name"]}>{d.name}</span>
                </div>
                {progress > 0 && (
                  <div
                    style={{
                      width: "100%",
                      height: 4,
                      borderRadius: 4,
                      background: "#f1f5f9",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: progress === 100
                          ? "linear-gradient(90deg, #22c55e, #10b981)"
                          : "linear-gradient(90deg, #6366f1, #a855f7)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ────────────── COLORING WORKSPACE VIEW ──────────────
  const undoCount = (undoStacks[selectedDrawing.id] || []).length;

  return (
    <div className={styles["coloriage-page"]}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={backToGallery}
        >
          ← Les dessins
        </button>
        <div className={styles.badge}>
          <span>🎨</span>
          <span>Coloriage</span>
        </div>
        <button
          className={styles["back-link"]}
          onClick={toggleMute}
          style={{ fontSize: "1.1rem" }}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Workspace */}
      <div className={styles.workspace}>
        <div className={styles["workspace-header"]}>
          <span className={styles["drawing-name"]}>
            <span>{selectedDrawing.icon}</span>
            <span>{selectedDrawing.name}</span>
          </span>
          <button className={styles["btn-gallery"]} onClick={backToGallery}>
            🖼️ Changer
          </button>
        </div>

        {/* Zoomable SVG Canvas */}
        <div
          ref={containerRef}
          className={styles["canvas-container"]}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div
            className={styles["canvas-inner"]}
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
            <svg
              viewBox={selectedDrawing.viewBox}
              xmlns="http://www.w3.org/2000/svg"
              style={{ background: "#ffffff" }}
            >
              {selectedDrawing.regions.map((region) =>
                renderRegion(
                  region,
                  fills[region.id] || (region.decorative ? "none" : "#ffffff"),
                  () => handleRegionClick(region.id),
                  isEraser
                )
              )}
            </svg>
          </div>

          {/* Zoom Controls */}
          <div className={styles["zoom-bar"]}>
            <button className={styles["zoom-btn"]} onClick={zoomOut}>−</button>
            <span className={styles["zoom-label"]}>{Math.round(zoom * 100)}%</span>
            <button className={styles["zoom-btn"]} onClick={zoomIn}>+</button>
            {zoom > 1 && (
              <button className={styles["zoom-btn"]} onClick={resetZoom}>↺</button>
            )}
          </div>
        </div>

        {/* Color Palette & Tools */}
        <div className={styles.toolbar}>
          <span className={styles["toolbar-label"]}>Couleurs</span>
          <div className={styles.palette}>
            {COLORS.map((color) => (
              <div
                key={color}
                className={`${styles.swatch} ${
                  !isEraser && selectedColor === color ? styles.active : ""
                }`}
                style={{ background: color }}
                onClick={() => {
                  setSelectedColor(color);
                  setIsEraser(false);
                }}
              />
            ))}
            <div
              className={`${styles.swatch} ${styles.eraser} ${
                isEraser ? styles.active : ""
              }`}
              onClick={() => setIsEraser(true)}
              title="Gomme"
            />
          </div>

          <div className={styles["tools-row"]}>
            <button
              className={`${styles["tool-btn"]} ${styles.undo}`}
              onClick={handleUndo}
              disabled={undoCount === 0}
              style={{ opacity: undoCount === 0 ? 0.4 : 1 }}
            >
              ↩️ Undo {undoCount > 0 && `(${undoCount})`}
            </button>
            <button
              className={`${styles["tool-btn"]} ${styles.reset}`}
              onClick={handleReset}
            >
              🗑️ Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

