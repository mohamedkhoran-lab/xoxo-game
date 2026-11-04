export interface Region {
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

export interface Drawing {
  id: string;
  name: string;
  icon: string;
  viewBox: string;
  regions: Region[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. PAPILLON VITRAIL ROYAL (Stained Glass Monarch Butterfly)
// ═══════════════════════════════════════════════════════════════════════════
const butterfly: Drawing = {
  id: "butterfly",
  name: "Papillon",
  icon: "🦋",
  viewBox: "0 0 400 400",
  regions: [
    // Background corner flourishes
    { id: "b-bg", tag: "rect", x: 0, y: 0, width: 400, height: 400 },
    // Floating sparkles
    { id: "b-sp1", tag: "polygon", points: "45,45 50,55 60,55 52,62 55,72 45,65 35,72 38,62 30,55 40,55" },
    { id: "b-sp2", tag: "polygon", points: "355,45 360,55 370,55 362,62 365,72 355,65 345,72 348,62 340,55 350,55" },
    { id: "b-sp3", tag: "circle", cx: 50, cy: 340, r: 12 },
    { id: "b-sp4", tag: "circle", cx: 350, cy: 340, r: 12 },
    { id: "b-sp5", tag: "circle", cx: 70, cy: 360, r: 7 },
    { id: "b-sp6", tag: "circle", cx: 330, cy: 360, r: 7 },

    // Outer Upper Wings (Base frame)
    { id: "b-wingUL-base", tag: "path", d: "M195 160 C160 90 90 70 55 120 C30 155 45 220 195 215 Z" },
    { id: "b-wingUR-base", tag: "path", d: "M205 160 C240 90 310 70 345 120 C370 155 355 220 205 215 Z" },

    // Upper-Left Wing Stained Glass Cells
    { id: "b-ul-c1", tag: "path", d: "M180 155 C150 115 115 105 85 130 C105 145 140 155 180 155 Z" },
    { id: "b-ul-c2", tag: "path", d: "M80 135 C60 155 65 185 85 195 C115 175 145 165 180 160 C140 155 105 145 80 135 Z" },
    { id: "b-ul-c3", tag: "path", d: "M90 195 C110 205 150 205 185 175 C155 175 120 185 90 195 Z" },
    { id: "b-ul-c4", tag: "circle", cx: 80, cy: 110, r: 10 },
    { id: "b-ul-c5", tag: "circle", cx: 110, cy: 95, r: 8 },
    { id: "b-ul-c6", tag: "circle", cx: 140, cy: 90, r: 8 },
    { id: "b-ul-c7", tag: "ellipse", cx: 62, cy: 155, rx: 7, ry: 14, transform: "rotate(-20 62 155)" },
    { id: "b-ul-c8", tag: "ellipse", cx: 70, cy: 185, rx: 6, ry: 10, transform: "rotate(15 70 185)" },

    // Upper-Right Wing Stained Glass Cells
    { id: "b-ur-c1", tag: "path", d: "M220 155 C250 115 285 105 315 130 C295 145 260 155 220 155 Z" },
    { id: "b-ur-c2", tag: "path", d: "M320 135 C340 155 335 185 315 195 C285 175 255 165 220 160 C260 155 295 145 320 135 Z" },
    { id: "b-ur-c3", tag: "path", d: "M310 195 C290 205 250 205 215 175 C245 175 280 185 310 195 Z" },
    { id: "b-ur-c4", tag: "circle", cx: 320, cy: 110, r: 10 },
    { id: "b-ur-c5", tag: "circle", cx: 290, cy: 95, r: 8 },
    { id: "b-ur-c6", tag: "circle", cx: 260, cy: 90, r: 8 },
    { id: "b-ur-c7", tag: "ellipse", cx: 338, cy: 155, rx: 7, ry: 14, transform: "rotate(20 338 155)" },
    { id: "b-ur-c8", tag: "ellipse", cx: 330, cy: 185, rx: 6, ry: 10, transform: "rotate(-15 330 185)" },

    // Outer Lower Wings (Base frame)
    { id: "b-wingLL-base", tag: "path", d: "M195 215 C145 225 75 240 85 305 C95 355 175 340 195 270 Z" },
    { id: "b-wingLR-base", tag: "path", d: "M205 215 C255 225 325 240 315 305 C305 355 225 340 205 270 Z" },

    // Lower-Left Wing Cells
    { id: "b-ll-c1", tag: "path", d: "M185 225 C140 235 105 250 115 280 C145 275 175 255 185 225 Z" },
    { id: "b-ll-c2", tag: "path", d: "M120 285 C145 280 175 265 185 240 C175 275 160 310 135 320 C120 310 115 295 120 285 Z" },
    { id: "b-ll-c3", tag: "circle", cx: 105, cy: 265, r: 9 },
    { id: "b-ll-c4", tag: "circle", cx: 108, cy: 295, r: 9 },
    { id: "b-ll-c5", tag: "circle", cx: 125, cy: 325, r: 8 },
    { id: "b-ll-c6", tag: "ellipse", cx: 155, cy: 325, rx: 12, ry: 7 },

    // Lower-Right Wing Cells
    { id: "b-lr-c1", tag: "path", d: "M215 225 C260 235 295 250 285 280 C255 275 225 255 215 225 Z" },
    { id: "b-lr-c2", tag: "path", d: "M280 285 C255 280 225 265 215 240 C225 275 240 310 265 320 C280 310 285 295 280 285 Z" },
    { id: "b-lr-c3", tag: "circle", cx: 295, cy: 265, r: 9 },
    { id: "b-lr-c4", tag: "circle", cx: 292, cy: 295, r: 9 },
    { id: "b-lr-c5", tag: "circle", cx: 275, cy: 325, r: 8 },
    { id: "b-lr-c6", tag: "ellipse", cx: 245, cy: 325, rx: 12, ry: 7 },

    // Segmented Butterfly Body
    { id: "b-seg1", tag: "ellipse", cx: 200, cy: 190, rx: 11, ry: 10 },
    { id: "b-seg2", tag: "ellipse", cx: 200, cy: 212, rx: 10, ry: 11 },
    { id: "b-seg3", tag: "ellipse", cx: 200, cy: 235, rx: 9, ry: 11 },
    { id: "b-seg4", tag: "ellipse", cx: 200, cy: 257, rx: 7, ry: 10 },
    { id: "b-seg5", tag: "ellipse", cx: 200, cy: 275, rx: 5, ry: 8 },

    // Head & Eyes
    { id: "b-head", tag: "circle", cx: 200, cy: 165, r: 14 },
    { id: "b-eyeL", tag: "circle", cx: 194, cy: 162, r: 4 },
    { id: "b-eyeR", tag: "circle", cx: 206, cy: 162, r: 4 },

    // Antennae Tips
    { id: "b-antTipL", tag: "ellipse", cx: 150, cy: 105, rx: 7, ry: 11, transform: "rotate(-30 150 105)" },
    { id: "b-antTipR", tag: "ellipse", cx: 250, cy: 105, rx: 7, ry: 11, transform: "rotate(30 250 105)" },
    { id: "b-antCurlL", tag: "path", d: "M195 155 Q170 120 150 105", decorative: true, strokeWidth: 2.5 },
    { id: "b-antCurlR", tag: "path", d: "M205 155 Q230 120 250 105", decorative: true, strokeWidth: 2.5 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. FLEUR MAJESTUEUSE & ABEILLE (Majestic Flower & Honeybee)
// ═══════════════════════════════════════════════════════════════════════════
const flower: Drawing = {
  id: "flower",
  name: "Fleur & Jardin",
  icon: "🌸",
  viewBox: "0 0 400 500",
  regions: [
    // Background Garden Sky
    { id: "fl-sky", tag: "rect", x: 0, y: 0, width: 400, height: 420 },
    { id: "fl-ground", tag: "rect", x: 0, y: 420, width: 400, height: 80 },

    // Decorative Pot with ethnic stripes
    { id: "fl-potBase", tag: "path", d: "M125 410 L140 485 L260 485 L275 410 Z" },
    { id: "fl-potStripe1", tag: "path", d: "M128 425 L132 445 L268 445 L272 425 Z" },
    { id: "fl-potStripe2", tag: "path", d: "M133 450 L137 470 L263 470 L267 450 Z" },
    { id: "fl-potRim", tag: "rect", x: 115, y: 395, width: 170, height: 18 },
    { id: "fl-potPlantSoil", tag: "ellipse", cx: 200, cy: 400, rx: 75, ry: 10 },

    // Main Stem
    { id: "fl-stem", tag: "path", d: "M195 200 Q190 300 195 400 L205 400 Q200 300 205 200 Z" },

    // Left Leaf (split in two colorable halves)
    { id: "fl-leafL-top", tag: "path", d: "M193 300 C140 270 95 285 85 320 C125 320 165 315 193 308 Z" },
    { id: "fl-leafL-bot", tag: "path", d: "M193 308 C165 315 125 320 85 320 C105 345 150 345 193 318 Z" },

    // Right Leaf (split in two colorable halves)
    { id: "fl-leafR-top", tag: "path", d: "M207 330 C260 300 305 315 315 350 C275 350 235 345 207 338 Z" },
    { id: "fl-leafR-bot", tag: "path", d: "M207 338 C235 345 275 350 315 350 C295 375 250 375 207 348 Z" },

    // Little sprout leaf
    { id: "fl-leafSmall", tag: "path", d: "M194 240 C160 220 145 235 150 255 C170 255 185 250 195 245 Z" },

    // Outer Petals Layer (8 petals)
    { id: "fl-op1", tag: "path", d: "M200 160 C180 100 165 50 200 30 C235 50 220 100 200 160 Z" },
    { id: "fl-op2", tag: "path", d: "M200 160 C240 115 280 85 305 110 C295 145 250 155 200 160 Z" },
    { id: "fl-op3", tag: "path", d: "M200 160 C255 145 310 165 320 200 C290 220 250 190 200 160 Z" },
    { id: "fl-op4", tag: "path", d: "M200 160 C240 205 275 250 255 280 C220 270 210 225 200 160 Z" },
    { id: "fl-op5", tag: "path", d: "M200 160 C220 225 205 275 185 285 C160 265 175 220 200 160 Z" },
    { id: "fl-op6", tag: "path", d: "M200 160 C160 220 120 245 95 220 C105 185 150 175 200 160 Z" },
    { id: "fl-op7", tag: "path", d: "M200 160 C145 175 90 155 80 120 C110 100 150 130 200 160 Z" },
    { id: "fl-op8", tag: "path", d: "M200 160 C160 115 125 70 145 45 C180 55 190 100 200 160 Z" },

    // Inner Petals Layer (8 petals)
    { id: "fl-ip1", tag: "path", d: "M200 160 C185 120 185 85 200 70 C215 85 215 120 200 160 Z" },
    { id: "fl-ip2", tag: "path", d: "M200 160 C225 130 250 110 260 125 C250 145 225 155 200 160 Z" },
    { id: "fl-ip3", tag: "path", d: "M200 160 C235 150 265 165 268 185 C250 195 225 180 200 160 Z" },
    { id: "fl-ip4", tag: "path", d: "M200 160 C225 185 245 210 235 225 C215 220 210 195 200 160 Z" },
    { id: "fl-ip5", tag: "path", d: "M200 160 C190 200 180 225 170 225 C160 215 175 190 200 160 Z" },
    { id: "fl-ip6", tag: "path", d: "M200 160 C175 190 155 200 140 185 C145 165 170 160 200 160 Z" },
    { id: "fl-ip7", tag: "path", d: "M200 160 C165 170 135 155 132 135 C150 125 175 140 200 160 Z" },
    { id: "fl-ip8", tag: "path", d: "M200 160 C175 130 155 105 165 95 C185 105 190 125 200 160 Z" },

    // Flower Heart (Pistil & Seeds)
    { id: "fl-centerOuter", tag: "circle", cx: 200, cy: 160, r: 35 },
    { id: "fl-centerMid", tag: "circle", cx: 200, cy: 160, r: 24 },
    { id: "fl-centerCore", tag: "circle", cx: 200, cy: 160, r: 12 },

    // Little Cute Honeybee
    { id: "fl-beeBody", tag: "ellipse", cx: 70, cy: 90, rx: 18, ry: 13, transform: "rotate(20 70 90)" },
    { id: "fl-beeHead", tag: "circle", cx: 88, cy: 96, r: 8 },
    { id: "fl-beeStripe1", tag: "path", d: "M66 78 Q74 91 63 102 L70 104 Q80 93 72 80 Z" },
    { id: "fl-beeWingTop", tag: "ellipse", cx: 62, cy: 68, rx: 12, ry: 7, transform: "rotate(-30 62 68)" },
    { id: "fl-beeWingBot", tag: "ellipse", cx: 50, cy: 75, rx: 10, ry: 6, transform: "rotate(-45 50 75)" },

    // Little Ladybug on Pot
    { id: "fl-ladyBody", tag: "circle", cx: 240, cy: 450, r: 10 },
    { id: "fl-ladyHead", tag: "circle", cx: 240, cy: 440, r: 5 },
    { id: "fl-ladyDot1", tag: "circle", cx: 236, cy: 448, r: 2 },
    { id: "fl-ladyDot2", tag: "circle", cx: 244, cy: 448, r: 2 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. MANDALA GÉOMÉTRIQUE SACRÉ (Sacred Geometric Mandala)
// ═══════════════════════════════════════════════════════════════════════════
const mandala: Drawing = {
  id: "mandala",
  name: "Mandala Sacré",
  icon: "🎯",
  viewBox: "0 0 400 400",
  regions: [
    // Background plate
    { id: "m-plate", tag: "rect", x: 0, y: 0, width: 400, height: 400 },
    // Outer ornate ring frame
    { id: "m-outerRing", tag: "circle", cx: 200, cy: 200, r: 188 },
    { id: "m-outerRing2", tag: "circle", cx: 200, cy: 200, r: 174 },

    // 8 Outer Giant Diamond Rays
    { id: "m-ray1", tag: "polygon", points: "200,12 214,50 186,50" },
    { id: "m-ray2", tag: "polygon", points: "333,67 315,95 295,75" },
    { id: "m-ray3", tag: "polygon", points: "388,200 350,214 350,186" },
    { id: "m-ray4", tag: "polygon", points: "333,333 295,325 315,305" },
    { id: "m-ray5", tag: "polygon", points: "200,388 186,350 214,350" },
    { id: "m-ray6", tag: "polygon", points: "67,333 85,305 105,325" },
    { id: "m-ray7", tag: "polygon", points: "12,200 50,186 50,214" },
    { id: "m-ray8", tag: "polygon", points: "67,67 105,75 85,95" },

    // 16 Scallop Border Beads
    { id: "m-b01", tag: "circle", cx: 200, cy: 32, r: 8 },
    { id: "m-b02", tag: "circle", cx: 265, cy: 45, r: 8 },
    { id: "m-b03", tag: "circle", cx: 318, cy: 82, r: 8 },
    { id: "m-b04", tag: "circle", cx: 355, cy: 135, r: 8 },
    { id: "m-b05", tag: "circle", cx: 368, cy: 200, r: 8 },
    { id: "m-b06", tag: "circle", cx: 355, cy: 265, r: 8 },
    { id: "m-b07", tag: "circle", cx: 318, cy: 318, r: 8 },
    { id: "m-b08", tag: "circle", cx: 265, cy: 355, r: 8 },
    { id: "m-b09", tag: "circle", cx: 200, cy: 368, r: 8 },
    { id: "m-b10", tag: "circle", cx: 135, cy: 355, r: 8 },
    { id: "m-b11", tag: "circle", cx: 82, cy: 318, r: 8 },
    { id: "m-b12", tag: "circle", cx: 45, cy: 265, r: 8 },
    { id: "m-b13", tag: "circle", cx: 32, cy: 200, r: 8 },
    { id: "m-b14", tag: "circle", cx: 45, cy: 135, r: 8 },
    { id: "m-b15", tag: "circle", cx: 82, cy: 82, r: 8 },
    { id: "m-b16", tag: "circle", cx: 135, cy: 45, r: 8 },

    // Ring of 8 Grand Lotus Petals
    { id: "m-gl1", tag: "path", d: "M200 200 C180 140 170 90 200 60 C230 90 220 140 200 200 Z", transform: "rotate(0 200 200)" },
    { id: "m-gl2", tag: "path", d: "M200 200 C180 140 170 90 200 60 C230 90 220 140 200 200 Z", transform: "rotate(45 200 200)" },
    { id: "m-gl3", tag: "path", d: "M200 200 C180 140 170 90 200 60 C230 90 220 140 200 200 Z", transform: "rotate(90 200 200)" },
    { id: "m-gl4", tag: "path", d: "M200 200 C180 140 170 90 200 60 C230 90 220 140 200 200 Z", transform: "rotate(135 200 200)" },
    { id: "m-gl5", tag: "path", d: "M200 200 C180 140 170 90 200 60 C230 90 220 140 200 200 Z", transform: "rotate(180 200 200)" },
    { id: "m-gl6", tag: "path", d: "M200 200 C180 140 170 90 200 60 C230 90 220 140 200 200 Z", transform: "rotate(225 200 200)" },
    { id: "m-gl7", tag: "path", d: "M200 200 C180 140 170 90 200 60 C230 90 220 140 200 200 Z", transform: "rotate(270 200 200)" },
    { id: "m-gl8", tag: "path", d: "M200 200 C180 140 170 90 200 60 C230 90 220 140 200 200 Z", transform: "rotate(315 200 200)" },

    // Intermediate Ring of 8 Diamonds
    { id: "m-dm1", tag: "polygon", points: "200,95 212,110 200,125 188,110", transform: "rotate(22.5 200 200)" },
    { id: "m-dm2", tag: "polygon", points: "200,95 212,110 200,125 188,110", transform: "rotate(67.5 200 200)" },
    { id: "m-dm3", tag: "polygon", points: "200,95 212,110 200,125 188,110", transform: "rotate(112.5 200 200)" },
    { id: "m-dm4", tag: "polygon", points: "200,95 212,110 200,125 188,110", transform: "rotate(157.5 200 200)" },
    { id: "m-dm5", tag: "polygon", points: "200,95 212,110 200,125 188,110", transform: "rotate(202.5 200 200)" },
    { id: "m-dm6", tag: "polygon", points: "200,95 212,110 200,125 188,110", transform: "rotate(247.5 200 200)" },
    { id: "m-dm7", tag: "polygon", points: "200,95 212,110 200,125 188,110", transform: "rotate(292.5 200 200)" },
    { id: "m-dm8", tag: "polygon", points: "200,95 212,110 200,125 188,110", transform: "rotate(337.5 200 200)" },

    // Inner Ring of 8 Teardrop Petals
    { id: "m-ip1", tag: "ellipse", cx: 200, cy: 155, rx: 11, ry: 25, transform: "rotate(0 200 200)" },
    { id: "m-ip2", tag: "ellipse", cx: 200, cy: 155, rx: 11, ry: 25, transform: "rotate(45 200 200)" },
    { id: "m-ip3", tag: "ellipse", cx: 200, cy: 155, rx: 11, ry: 25, transform: "rotate(90 200 200)" },
    { id: "m-ip4", tag: "ellipse", cx: 200, cy: 155, rx: 11, ry: 25, transform: "rotate(135 200 200)" },
    { id: "m-ip5", tag: "ellipse", cx: 200, cy: 155, rx: 11, ry: 25, transform: "rotate(180 200 200)" },
    { id: "m-ip6", tag: "ellipse", cx: 200, cy: 155, rx: 11, ry: 25, transform: "rotate(225 200 200)" },
    { id: "m-ip7", tag: "ellipse", cx: 200, cy: 155, rx: 11, ry: 25, transform: "rotate(270 200 200)" },
    { id: "m-ip8", tag: "ellipse", cx: 200, cy: 155, rx: 11, ry: 25, transform: "rotate(315 200 200)" },

    // Center Core Jewels
    { id: "m-coreOuter", tag: "circle", cx: 200, cy: 200, r: 30 },
    { id: "m-coreMid", tag: "circle", cx: 200, cy: 200, r: 18 },
    { id: "m-coreCenter", tag: "circle", cx: 200, cy: 200, r: 8 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. MAISON DE CONTE DE FÉES (Fairytale Cottage)
// ═══════════════════════════════════════════════════════════════════════════
const house: Drawing = {
  id: "house",
  name: "Maison Enchantée",
  icon: "🏠",
  viewBox: "0 0 400 400",
  regions: [
    // Sky
    { id: "h-sky", tag: "rect", x: 0, y: 0, width: 400, height: 260 },
    // Cheerful Sun
    { id: "h-sun", tag: "circle", cx: 335, cy: 55, r: 28 },
    // Sun Rays
    { id: "h-sr1", tag: "polygon", points: "335,18 340,8 330,8" },
    { id: "h-sr2", tag: "polygon", points: "372,55 382,50 382,60" },
    { id: "h-sr3", tag: "polygon", points: "360,80 370,88 365,95" },
    { id: "h-sr4", tag: "polygon", points: "310,80 300,90 305,95" },
    // Fluffy Layered Clouds
    { id: "h-cld1a", tag: "ellipse", cx: 75, cy: 55, rx: 25, ry: 16 },
    { id: "h-cld1b", tag: "ellipse", cx: 105, cy: 50, rx: 30, ry: 20 },
    { id: "h-cld1c", tag: "ellipse", cx: 135, cy: 55, rx: 22, ry: 15 },

    // Ground / Lush Lawn
    { id: "h-grass", tag: "rect", x: 0, y: 260, width: 400, height: 140 },

    // House Main Wall
    { id: "h-wall", tag: "rect", x: 85, y: 160, width: 215, height: 120 },

    // Shingled Roof (3 Layered Rows)
    { id: "h-roofBottom", tag: "polygon", points: "60,175 192,85 325,175 315,160 192,75 70,160" },
    { id: "h-roofMid", tag: "polygon", points: "75,150 192,68 310,150 295,135 192,58 90,135" },
    { id: "h-roofTop", tag: "polygon", points: "90,125 192,50 295,125" },

    // Chimney with brick stones
    { id: "h-chimney", tag: "rect", x: 235, y: 70, width: 30, height: 60 },
    { id: "h-chimCap", tag: "rect", x: 230, y: 62, width: 40, height: 10 },
    { id: "h-smoke1", tag: "circle", cx: 250, cy: 45, r: 10 },
    { id: "h-smoke2", tag: "circle", cx: 262, cy: 28, r: 13 },
    { id: "h-smoke3", tag: "circle", cx: 275, cy: 12, r: 16 },

    // Fairy Arched Door
    { id: "h-doorFrame", tag: "path", d: "M160 280 L160 215 C160 190 225 190 225 215 L225 280 Z" },
    { id: "h-doorInner", tag: "path", d: "M166 280 L166 220 C166 200 219 200 219 220 L219 280 Z" },
    { id: "h-doorWin", tag: "circle", cx: 192, cy: 225, r: 9 },
    { id: "h-doorHandle", tag: "circle", cx: 212, cy: 252, r: 4 },

    // Cottage Windows with Shutters
    { id: "h-winL", tag: "rect", x: 105, y: 185, width: 38, height: 42 },
    { id: "h-winL-shutL", tag: "rect", x: 92, y: 185, width: 12, height: 42 },
    { id: "h-winL-shutR", tag: "rect", x: 144, y: 185, width: 12, height: 42 },
    { id: "h-winR", tag: "rect", x: 242, y: 185, width: 38, height: 42 },
    { id: "h-winR-shutL", tag: "rect", x: 229, y: 185, width: 12, height: 42 },
    { id: "h-winR-shutR", tag: "rect", x: 281, y: 185, width: 12, height: 42 },

    // Flower boxes under windows
    { id: "h-boxL", tag: "rect", x: 95, y: 228, width: 58, height: 12 },
    { id: "h-boxR", tag: "rect", x: 232, y: 228, width: 58, height: 12 },

    // Cobblestone Path (7 Colorable Stones)
    { id: "h-stone1", tag: "ellipse", cx: 192, cy: 295, rx: 18, ry: 9 },
    { id: "h-stone2", tag: "ellipse", cx: 180, cy: 318, rx: 20, ry: 10 },
    { id: "h-stone3", tag: "ellipse", cx: 212, cy: 320, rx: 19, ry: 10 },
    { id: "h-stone4", tag: "ellipse", cx: 172, cy: 345, rx: 22, ry: 11 },
    { id: "h-stone5", tag: "ellipse", cx: 218, cy: 348, rx: 23, ry: 11 },
    { id: "h-stone6", tag: "ellipse", cx: 165, cy: 375, rx: 26, ry: 13 },
    { id: "h-stone7", tag: "ellipse", cx: 225, cy: 378, rx: 28, ry: 14 },

    // Garden Flowers
    { id: "h-fl1", tag: "circle", cx: 45, cy: 310, r: 12 },
    { id: "h-fl2", tag: "circle", cx: 70, cy: 325, r: 10 },
    { id: "h-fl3", tag: "circle", cx: 335, cy: 315, r: 14 },
    { id: "h-fl4", tag: "circle", cx: 365, cy: 330, r: 11 },

    // Apple Tree on Right
    { id: "h-treeTrunk", tag: "path", d: "M340 220 Q335 250 330 280 L355 280 Q350 250 345 220 Z" },
    { id: "h-treeCrown", tag: "circle", cx: 342, cy: 200, r: 38 },
    { id: "h-apple1", tag: "circle", cx: 325, cy: 190, r: 6 },
    { id: "h-apple2", tag: "circle", cx: 355, cy: 185, r: 6 },
    { id: "h-apple3", tag: "circle", cx: 342, cy: 215, r: 6 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. CHATON COSY & PELOTE DE LAINE (Cozy Kitten & Yarn Ball)
// ═══════════════════════════════════════════════════════════════════════════
const cat: Drawing = {
  id: "cat",
  name: "Chaton & Laine",
  icon: "🐱",
  viewBox: "0 0 400 450",
  regions: [
    // Background Room Wallpaper
    { id: "c-bg", tag: "rect", x: 0, y: 0, width: 400, height: 350 },
    // Floor
    { id: "c-floor", tag: "rect", x: 0, y: 350, width: 400, height: 100 },

    // Patterned Cushion / Mat
    { id: "c-cushion", tag: "ellipse", cx: 200, cy: 380, rx: 165, ry: 45 },
    { id: "c-cushionBorder", tag: "ellipse", cx: 200, cy: 380, rx: 145, ry: 35 },

    // Kitten Tail (4 Striped Segments!)
    { id: "c-tailSeg1", tag: "path", d: "M285 320 C315 300 345 270 340 240 L355 240 C360 280 325 315 295 335 Z" },
    { id: "c-tailSeg2", tag: "path", d: "M340 240 C335 210 350 180 340 160 L355 160 C368 185 355 215 355 240 Z" },
    { id: "c-tailTip", tag: "ellipse", cx: 348, cy: 152, rx: 12, ry: 10 },

    // Kitten Body
    { id: "c-body", tag: "ellipse", cx: 200, cy: 285, rx: 85, ry: 75 },
    // Cute Chest / Belly Bib
    { id: "c-bib", tag: "path", d: "M160 250 C160 330 240 330 240 250 C220 270 180 270 160 250 Z" },

    // Kitten Head
    { id: "c-head", tag: "circle", cx: 200, cy: 165, r: 68 },

    // Ears (Outer + Inner)
    { id: "c-earL-out", tag: "polygon", points: "145,120 120,55 175,95" },
    { id: "c-earL-in", tag: "polygon", points: "148,112 132,70 168,98" },
    { id: "c-earR-out", tag: "polygon", points: "255,120 280,55 225,95" },
    { id: "c-earR-in", tag: "polygon", points: "252,112 268,70 232,98" },

    // Forehead Tabby Stripes
    { id: "c-strp1", tag: "polygon", points: "196,110 204,110 200,128" },
    { id: "c-strp2", tag: "polygon", points: "182,115 190,115 188,130" },
    { id: "c-strp3", tag: "polygon", points: "218,115 210,115 212,130" },

    // Big Anime Eyes (Outer + Iris + Pupil)
    { id: "c-eyeL-white", tag: "ellipse", cx: 168, cy: 162, rx: 16, ry: 20 },
    { id: "c-eyeL-iris", tag: "circle", cx: 168, cy: 162, r: 12 },
    { id: "c-eyeL-pupil", tag: "circle", cx: 166, cy: 160, r: 6 },
    { id: "c-eyeR-white", tag: "ellipse", cx: 232, cy: 162, rx: 16, ry: 20 },
    { id: "c-eyeR-iris", tag: "circle", cx: 232, cy: 162, r: 12 },
    { id: "c-eyeR-pupil", tag: "circle", cx: 234, cy: 160, r: 6 },

    // Cute Cheeks & Nose
    { id: "c-cheekL", tag: "ellipse", cx: 148, cy: 185, rx: 10, ry: 6 },
    { id: "c-cheekR", tag: "ellipse", cx: 252, cy: 185, rx: 10, ry: 6 },
    { id: "c-nose", tag: "polygon", points: "200,186 193,178 207,178" },

    // Collar & Bell
    { id: "c-collar", tag: "path", d: "M155 225 Q200 245 245 225 L242 235 Q200 255 158 235 Z" },
    { id: "c-bell", tag: "circle", cx: 200, cy: 248, r: 10 },
    { id: "c-bellSlot", tag: "circle", cx: 200, cy: 252, r: 3 },

    // Front Paws with Toe Beans
    { id: "c-pawL", tag: "ellipse", cx: 165, cy: 350, rx: 20, ry: 14 },
    { id: "c-pawR", tag: "ellipse", cx: 235, cy: 350, rx: 20, ry: 14 },

    // Ball of Yarn with Loops
    { id: "c-yarnBall", tag: "circle", cx: 65, cy: 390, r: 30 },
    { id: "c-yarnBand1", tag: "path", d: "M45 375 Q65 390 85 375 L82 385 Q65 400 48 385 Z" },
    { id: "c-yarnBand2", tag: "path", d: "M48 395 Q65 410 82 395 L80 405 Q65 420 50 405 Z" },
    // Wandering yarn thread
    { id: "c-thread", tag: "path", d: "M95 395 Q140 420 180 395", decorative: true, strokeWidth: 3 },

    // Decorative whiskers
    { id: "c-wh1", tag: "path", d: "M160 185 L110 175", decorative: true, strokeWidth: 2 },
    { id: "c-wh2", tag: "path", d: "M160 192 L108 195", decorative: true, strokeWidth: 2 },
    { id: "c-wh3", tag: "path", d: "M240 185 L290 175", decorative: true, strokeWidth: 2 },
    { id: "c-wh4", tag: "path", d: "M240 192 L292 195", decorative: true, strokeWidth: 2 },
  ],
};

export const drawingsA: Drawing[] = [butterfly, flower, mandala, house, cat];
