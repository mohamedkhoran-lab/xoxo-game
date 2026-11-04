import { Drawing } from "./drawings-a";

// ═══════════════════════════════════════════════════════════════════════════
// 6. CARPE KOÏ JAPONAISE & RÉCIF (Japanese Koi Fish & Coral Reef)
// ═══════════════════════════════════════════════════════════════════════════
const fish: Drawing = {
  id: "fish",
  name: "Poisson & Récif",
  icon: "🐠",
  viewBox: "0 0 500 400",
  regions: [
    // Water background
    { id: "fi-ocean", tag: "rect", x: 0, y: 0, width: 500, height: 340 },
    // Sea bottom / sand dunes
    { id: "fi-sand", tag: "path", d: "M0 340 Q130 315 250 335 T500 330 L500 400 L0 400 Z" },

    // Coral Reef Branches
    { id: "fi-coralBase", tag: "path", d: "M25 350 L35 240 Q45 220 60 235 L55 270 Q70 250 85 265 L70 350 Z" },
    { id: "fi-coralTip1", tag: "circle", cx: 60, cy: 232, r: 9 },
    { id: "fi-coralTip2", tag: "circle", cx: 85, cy: 262, r: 8 },
    { id: "fi-coralTip3", tag: "circle", cx: 38, cy: 238, r: 7 },

    // Wavy Seaweed
    { id: "fi-sw1", tag: "path", d: "M90 350 Q65 270 100 200 T80 120 Q105 200 115 270 T105 350 Z" },
    { id: "fi-sw2", tag: "path", d: "M435 345 Q465 270 430 200 T455 130 Q430 200 420 270 T425 345 Z" },

    // Sea Pebbles (5 stones)
    { id: "fi-peb1", tag: "ellipse", cx: 160, cy: 370, rx: 18, ry: 9 },
    { id: "fi-peb2", tag: "ellipse", cx: 195, cy: 375, rx: 14, ry: 8 },
    { id: "fi-peb3", tag: "ellipse", cx: 270, cy: 368, rx: 22, ry: 11 },
    { id: "fi-peb4", tag: "ellipse", cx: 310, cy: 376, rx: 15, ry: 8 },
    { id: "fi-peb5", tag: "ellipse", cx: 345, cy: 370, rx: 17, ry: 9 },

    // Starfish with ornate center
    { id: "fi-starArm", tag: "polygon", points: "410,345 418,360 435,360 422,370 427,385 410,375 393,385 398,370 385,360 402,360" },
    { id: "fi-starCore", tag: "circle", cx: 410, cy: 368, r: 6 },

    // Seashell
    { id: "fi-shellBody", tag: "path", d: "M220 375 C220 355 255 355 255 375 Z" },
    { id: "fi-shellRays", tag: "path", d: "M228 375 L237 360 L247 375", decorative: true, strokeWidth: 1.5 },

    // Koi Head
    { id: "fi-head", tag: "path", d: "M145 190 C155 130 205 130 220 190 C205 250 155 250 145 190 Z" },
    // Koi Eye & Iris
    { id: "fi-eyeWhite", tag: "circle", cx: 182, cy: 172, r: 14 },
    { id: "fi-eyePupil", tag: "circle", cx: 178, cy: 172, r: 7 },
    // Koi Whisker Barbel
    { id: "fi-barbel", tag: "path", d: "M145 195 Q130 215 118 210", decorative: true, strokeWidth: 2.5 },

    // Koi Body (Main Frame)
    { id: "fi-body", tag: "path", d: "M215 135 C280 115 340 135 365 190 C340 245 280 265 215 245 Z" },

    // Intricate Scales Pattern (8 Individual Colorable Scales)
    { id: "fi-sc1", tag: "ellipse", cx: 250, cy: 155, rx: 18, ry: 13, transform: "rotate(-10 250 155)" },
    { id: "fi-sc2", tag: "ellipse", cx: 290, cy: 155, rx: 18, ry: 13, transform: "rotate(-5 290 155)" },
    { id: "fi-sc3", tag: "ellipse", cx: 235, cy: 190, rx: 18, ry: 14 },
    { id: "fi-sc4", tag: "ellipse", cx: 275, cy: 190, rx: 18, ry: 14 },
    { id: "fi-sc5", tag: "ellipse", cx: 315, cy: 190, rx: 17, ry: 13 },
    { id: "fi-sc6", tag: "ellipse", cx: 250, cy: 225, rx: 18, ry: 13, transform: "rotate(10 250 225)" },
    { id: "fi-sc7", tag: "ellipse", cx: 290, cy: 225, rx: 18, ry: 13, transform: "rotate(5 290 225)" },
    { id: "fi-sc8", tag: "ellipse", cx: 330, cy: 220, rx: 14, ry: 11 },

    // Flowing Ribbon Dorsal Fin (3 Ribbons)
    { id: "fi-dor1", tag: "path", d: "M230 133 C245 75 285 70 300 120 C275 125 250 130 230 133 Z" },
    { id: "fi-dor2", tag: "path", d: "M290 115 C315 65 355 75 360 140 C340 135 315 125 290 115 Z" },
    { id: "fi-dor3", tag: "path", d: "M350 135 C365 95 385 110 375 160 C365 150 355 142 350 135 Z" },

    // Flowing Ventral Fin (2 Ribbons)
    { id: "fi-ven1", tag: "path", d: "M240 248 C255 305 295 310 305 258 C280 252 260 250 240 248 Z" },
    { id: "fi-ven2", tag: "path", d: "M295 260 C315 310 345 305 348 250 C330 253 310 258 295 260 Z" },

    // Pectoral Fin (Flowing fan shape)
    { id: "fi-pecTop", tag: "path", d: "M210 205 C240 205 270 230 255 248 C240 248 220 225 210 205 Z" },
    { id: "fi-pecBot", tag: "path", d: "M215 215 C240 225 265 255 245 265 C230 265 215 240 215 215 Z" },

    // Majestic Flowing Tail Fin (4 Distinct Ribbons!)
    { id: "fi-tailBase", tag: "polygon", points: "360,180 380,190 360,200" },
    { id: "fi-tailRib1", tag: "path", d: "M375 185 C410 135 465 100 480 125 C450 155 420 180 380 188 Z" },
    { id: "fi-tailRib2", tag: "path", d: "M380 188 C430 165 475 155 488 175 C455 190 420 193 382 191 Z" },
    { id: "fi-tailRib3", tag: "path", d: "M382 191 C430 195 475 210 485 230 C445 220 415 210 380 194 Z" },
    { id: "fi-tailRib4", tag: "path", d: "M380 194 C420 215 455 250 470 280 C445 260 405 235 375 198 Z" },

    // Rising Air Bubbles (5 bubbles)
    { id: "fi-bub1", tag: "circle", cx: 120, cy: 155, r: 10 },
    { id: "fi-bub2", tag: "circle", cx: 102, cy: 110, r: 15 },
    { id: "fi-bub3", tag: "circle", cx: 125, cy: 75, r: 8 },
    { id: "fi-bub4", tag: "circle", cx: 90, cy: 45, r: 12 },
    { id: "fi-bub5", tag: "circle", cx: 135, cy: 30, r: 6 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. COCCINELLE VINTAGE & VOYAGE (Retro Vintage Beetle Car & Luggage)
// ═══════════════════════════════════════════════════════════════════════════
const car: Drawing = {
  id: "car",
  name: "Voiture Vintage",
  icon: "🚗",
  viewBox: "0 0 500 350",
  regions: [
    // Sky
    { id: "cr-sky", tag: "rect", x: 0, y: 0, width: 500, height: 250 },
    // Sun
    { id: "cr-sun", tag: "circle", cx: 65, cy: 55, r: 32 },
    // Sun Rings
    { id: "cr-sunRing", tag: "circle", cx: 65, cy: 55, r: 42, decorative: true, strokeWidth: 1.5 },

    // Mountain silhouettes in background
    { id: "cr-mnt1", tag: "polygon", points: "120,250 200,160 280,250" },
    { id: "cr-mnt1-snow", tag: "polygon", points: "185,178 200,160 215,178 208,185 200,180 192,185" },
    { id: "cr-mnt2", tag: "polygon", points: "240,250 320,180 400,250" },
    { id: "cr-mnt2-snow", tag: "polygon", points: "305,195 320,180 335,195 328,202 320,197 312,202" },

    // Clouds
    { id: "cr-cld1", tag: "ellipse", cx: 380, cy: 60, rx: 35, ry: 18 },
    { id: "cr-cld2", tag: "ellipse", cx: 415, cy: 55, rx: 30, ry: 20 },

    // Road & Sidewalk
    { id: "cr-sidewalk", tag: "rect", x: 0, y: 250, width: 500, height: 18 },
    { id: "cr-road", tag: "rect", x: 0, y: 268, width: 500, height: 82 },
    // Road Dash Lines
    { id: "cr-dash1", tag: "rect", x: 30, y: 305, width: 65, height: 8 },
    { id: "cr-dash2", tag: "rect", x: 165, y: 305, width: 65, height: 8 },
    { id: "cr-dash3", tag: "rect", x: 300, y: 305, width: 65, height: 8 },
    { id: "cr-dash4", tag: "rect", x: 435, y: 305, width: 65, height: 8 },

    // Vintage Luggage on Roof Rack
    { id: "cr-rackBar", tag: "rect", x: 205, y: 105, width: 140, height: 6 },
    { id: "cr-luggageBig", tag: "rect", x: 220, y: 75, width: 75, height: 30 },
    { id: "cr-strap1", tag: "rect", x: 235, y: 75, width: 8, height: 30 },
    { id: "cr-strap2", tag: "rect", x: 272, y: 75, width: 8, height: 30 },
    { id: "cr-luggageSmall", tag: "rect", x: 295, y: 82, width: 45, height: 23 },
    { id: "cr-strap3", tag: "rect", x: 312, y: 82, width: 6, height: 23 },

    // Vintage Beetle Cabin / Roof Curve
    { id: "cr-cabinRoof", tag: "path", d: "M165 175 C190 110 330 110 375 175 Z" },
    // Rear Windshield
    { id: "cr-winRear", tag: "path", d: "M180 170 C195 130 230 120 245 120 L245 170 Z" },
    // Center Door Window
    { id: "cr-winCenter", tag: "rect", x: 252, y: 120, width: 60, height: 50 },
    // Front Windshield
    { id: "cr-winFront", tag: "path", d: "M320 120 C335 120 355 135 365 170 L320 170 Z" },

    // Lower Car Body (Two-Tone Retro Style)
    // Upper body belt
    { id: "cr-bodyUpper", tag: "path", d: "M55 210 Q60 175 115 175 L165 175 L375 175 L430 175 Q465 175 460 215 L435 215 L365 215 L180 215 L55 215 Z" },
    // Lower body chassis
    { id: "cr-bodyLower", tag: "path", d: "M45 215 L45 240 L115 240 C115 200 185 200 185 240 L370 240 C370 200 440 200 440 240 L465 240 L465 215 Z" },

    // Front Fender Arch
    { id: "cr-fenderF", tag: "path", d: "M360 240 C360 190 450 190 450 240 C435 205 375 205 360 240 Z" },
    // Rear Fender Arch
    { id: "cr-fenderR", tag: "path", d: "M105 240 C105 190 195 190 195 240 C180 205 120 205 105 240 Z" },

    // Car Door Panel & Handle
    { id: "cr-doorPanel", tag: "rect", x: 245, y: 175, width: 75, height: 60 },
    { id: "cr-doorHandle", tag: "rect", x: 255, y: 185, width: 18, height: 6 },

    // Chrome Bumpers
    { id: "cr-bumpF", tag: "path", d: "M455 230 C475 230 475 248 455 248 Z" },
    { id: "cr-bumpR", tag: "path", d: "M45 230 C25 230 25 248 45 248 Z" },

    // Headlight & Taillight
    { id: "cr-headlightRim", tag: "circle", cx: 450, cy: 195, r: 14 },
    { id: "cr-headlightCore", tag: "circle", cx: 450, cy: 195, r: 8 },
    { id: "cr-taillight", tag: "rect", x: 45, y: 190, width: 12, height: 22 },

    // Detailed Wheels (Front & Rear)
    // Rear Wheel
    { id: "cr-tireR", tag: "circle", cx: 150, cy: 240, r: 36 },
    { id: "cr-rimR", tag: "circle", cx: 150, cy: 240, r: 24 },
    { id: "cr-capR", tag: "circle", cx: 150, cy: 240, r: 12 },
    // Front Wheel
    { id: "cr-tireF", tag: "circle", cx: 405, cy: 240, r: 36 },
    { id: "cr-rimF", tag: "circle", cx: 405, cy: 240, r: 24 },
    { id: "cr-capF", tag: "circle", cx: 405, cy: 240, r: 12 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 8. CIEL NOCTURNE & LUNE MYSTIQUE (Mystic Night Sky & Moon)
// ═══════════════════════════════════════════════════════════════════════════
const nightSky: Drawing = {
  id: "nightsky",
  name: "Ciel Féerique",
  icon: "🌙",
  viewBox: "0 0 400 400",
  regions: [
    // Cosmic Night Sky
    { id: "ns-sky", tag: "rect", x: 0, y: 0, width: 400, height: 400 },

    // Grand Sleeping Crescent Moon
    { id: "ns-moonBody", tag: "path", d: "M290 60 C220 60 170 125 170 195 C170 265 220 330 290 330 C235 300 215 240 220 195 C225 145 255 90 290 60 Z" },
    // Moon's Nightcap
    { id: "ns-capBase", tag: "path", d: "M245 75 Q275 60 290 60 L310 90 Q275 85 245 75 Z" },
    { id: "ns-capTip", tag: "path", d: "M290 60 Q340 30 360 65 L350 75 Q325 50 285 70 Z" },
    { id: "ns-pomPom", tag: "circle", cx: 365, cy: 72, r: 12 },
    // Moon Sleeping Face Details
    { id: "ns-moonEye", tag: "path", d: "M240 180 Q252 192 265 180", decorative: true, strokeWidth: 2.5 },
    { id: "ns-moonCheek", tag: "circle", cx: 248, cy: 202, r: 9 },

    // Shooting Star with 3 Comet Trail Ribbons
    { id: "ns-cometHead", tag: "polygon", points: "115,50 120,62 135,62 122,72 127,85 115,75 103,85 108,72 95,62 110,62" },
    { id: "ns-cometRib1", tag: "path", d: "M100 60 Q55 45 20 50 Q55 52 105 65 Z" },
    { id: "ns-cometRib2", tag: "path", d: "M105 68 Q50 65 15 80 Q55 75 110 75 Z" },
    { id: "ns-cometRib3", tag: "path", d: "M110 78 Q60 85 25 110 Q65 95 115 85 Z" },

    // Sparkling 5-Pointed Stars (7 colorable stars)
    { id: "ns-st1", tag: "polygon", points: "65,140 69,152 82,152 71,160 75,172 65,164 55,172 59,160 48,152 61,152" },
    { id: "ns-st2", tag: "polygon", points: "135,120 138,130 150,130 140,137 143,148 135,141 127,148 130,137 120,130 132,130" },
    { id: "ns-st3", tag: "polygon", points: "80,210 83,218 92,218 84,223 87,232 80,227 73,232 76,223 68,218 77,218" },
    { id: "ns-st4", tag: "polygon", points: "340,140 343,150 355,150 345,157 348,168 340,161 332,168 335,157 325,150 337,150" },
    { id: "ns-st5", tag: "polygon", points: "355,220 358,228 368,228 360,234 363,243 355,237 347,243 350,234 342,228 352,228" },
    { id: "ns-st6", tag: "polygon", points: "155,40 158,48 168,48 160,54 163,63 155,57 147,63 150,54 142,48 152,48" },
    { id: "ns-st7", tag: "polygon", points: "205,80 208,88 218,88 210,94 213,103 205,97 197,103 200,94 192,88 202,88" },

    // Dreamy Clouds
    { id: "ns-cld1a", tag: "ellipse", cx: 130, cy: 250, rx: 32, ry: 18 },
    { id: "ns-cld1b", tag: "ellipse", cx: 165, cy: 242, rx: 36, ry: 22 },
    { id: "ns-cld1c", tag: "ellipse", cx: 200, cy: 250, rx: 30, ry: 17 },

    // Patchwork Rolling Hills (Foreground)
    { id: "ns-hillFar", tag: "path", d: "M0 310 Q120 260 240 290 T400 280 L400 400 L0 400 Z" },
    { id: "ns-hillNear", tag: "path", d: "M0 345 Q160 300 300 335 T400 325 L400 400 L0 400 Z" },

    // Fairytale Lighthouse / Tower on distant hill
    { id: "ns-towerBase", tag: "polygon", points: "325,320 330,265 348,265 353,320" },
    { id: "ns-towerRoof", tag: "polygon", points: "323,265 339,245 355,265" },
    { id: "ns-towerBeacon", tag: "circle", cx: 339, cy: 275, r: 7 },

    // Pine Trees on Hills (3 trees)
    { id: "ns-tree1-top", tag: "polygon", points: "65,275 52,305 78,305" },
    { id: "ns-tree1-bot", tag: "polygon", points: "65,295 48,330 82,330" },
    { id: "ns-tree1-trunk", tag: "rect", x: 62, y: 330, width: 6, height: 18 },

    { id: "ns-tree2-top", tag: "polygon", points: "105,295 95,320 115,320" },
    { id: "ns-tree2-bot", tag: "polygon", points: "105,310 90,342 120,342" },
    { id: "ns-tree2-trunk", tag: "rect", x: 102, y: 342, width: 6, height: 16 },

    { id: "ns-tree3-top", tag: "polygon", points: "260,305 250,332 270,332" },
    { id: "ns-tree3-trunk", tag: "rect", x: 257, y: 332, width: 6, height: 16 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 9. CŒUR VITRAIL & ROSES (Stained Glass Mandala Heart & Blooming Rose)
// ═══════════════════════════════════════════════════════════════════════════
const heart: Drawing = {
  id: "heart",
  name: "Cœur Romantique",
  icon: "❤️",
  viewBox: "0 0 400 400",
  regions: [
    // Background Plate
    { id: "ht-bg", tag: "rect", x: 0, y: 0, width: 400, height: 400 },

    // Floating Cherub Mini Hearts (4 corner hearts with wings)
    { id: "ht-mh1", tag: "path", d: "M55 55 C55 55 35 38 35 25 C35 14 46 10 55 18 C64 10 75 14 75 25 C75 38 55 55 55 55 Z" },
    { id: "ht-mh1-wL", tag: "ellipse", cx: 28, cy: 30, rx: 10, ry: 5, transform: "rotate(-30 28 30)" },
    { id: "ht-mh1-wR", tag: "ellipse", cx: 82, cy: 30, rx: 10, ry: 5, transform: "rotate(30 82 30)" },

    { id: "ht-mh2", tag: "path", d: "M345 55 C345 55 325 38 325 25 C325 14 336 10 345 18 C354 10 365 14 365 25 C365 38 345 55 345 55 Z" },
    { id: "ht-mh2-wL", tag: "ellipse", cx: 318, cy: 30, rx: 10, ry: 5, transform: "rotate(-30 318 30)" },
    { id: "ht-mh2-wR", tag: "ellipse", cx: 372, cy: 30, rx: 10, ry: 5, transform: "rotate(30 372 30)" },

    // Giant Outer Heart Frame
    { id: "ht-frameOuter", tag: "path", d: "M200 355 C200 355 42 245 42 140 C42 65 120 40 200 115 C280 40 358 65 358 140 C358 245 200 355 200 355 Z" },
    { id: "ht-frameInner", tag: "path", d: "M200 330 C200 330 68 230 68 145 C68 85 132 68 200 128 C268 68 332 85 332 145 C332 230 200 330 200 330 Z" },

    // Stained Glass Radiant Crystal Facets inside the heart
    { id: "ht-crystL1", tag: "polygon", points: "200,130 145,85 105,105 155,145" },
    { id: "ht-crystL2", tag: "polygon", points: "105,105 75,135 110,165 155,145" },
    { id: "ht-crystL3", tag: "polygon", points: "75,135 78,185 125,200 110,165" },
    { id: "ht-crystL4", tag: "polygon", points: "78,185 115,245 155,235 125,200" },
    { id: "ht-crystL5", tag: "polygon", points: "115,245 200,320 180,265 155,235" },

    { id: "ht-crystR1", tag: "polygon", points: "200,130 255,85 295,105 245,145" },
    { id: "ht-crystR2", tag: "polygon", points: "295,105 325,135 290,165 245,145" },
    { id: "ht-crystR3", tag: "polygon", points: "325,135 322,185 275,200 290,165" },
    { id: "ht-crystR4", tag: "polygon", points: "322,185 285,245 245,235 275,200" },
    { id: "ht-crystR5", tag: "polygon", points: "285,245 200,320 220,265 245,235" },

    // Central Blooming Rose Blossom
    { id: "ht-roseCore", tag: "circle", cx: 200, cy: 195, r: 16 },
    { id: "ht-rosePet1", tag: "path", d: "M200 179 C185 160 215 160 200 179 Z" },
    { id: "ht-rosePet2", tag: "path", d: "M215 188 C235 178 240 205 215 200 Z" },
    { id: "ht-rosePet3", tag: "path", d: "M212 208 C225 228 198 238 198 212 Z" },
    { id: "ht-rosePet4", tag: "path", d: "M188 208 C175 228 160 202 185 198 Z" },
    { id: "ht-rosePet5", tag: "path", d: "M185 188 C165 178 180 162 195 180 Z" },

    // Rose Leaves
    { id: "ht-rLeafL", tag: "path", d: "M175 215 C145 225 140 245 160 245 C175 245 180 230 175 215 Z" },
    { id: "ht-rLeafR", tag: "path", d: "M225 215 C255 225 260 245 240 245 C225 245 220 230 225 215 Z" },

    // Flowing Celebration Ribbon Banner below
    { id: "ht-ribbonMid", tag: "path", d: "M110 355 Q200 375 290 355 L285 385 Q200 405 115 385 Z" },
    { id: "ht-ribbonTailL", tag: "polygon", points: "110,355 115,385 65,395 80,375 65,360" },
    { id: "ht-ribbonTailR", tag: "polygon", points: "290,355 285,385 335,395 320,375 335,360" },

    // Sparkles & Pearls
    { id: "ht-spk1", tag: "circle", cx: 120, cy: 65, r: 6 },
    { id: "ht-spk2", tag: "circle", cx: 280, cy: 65, r: 6 },
    { id: "ht-spk3", tag: "circle", cx: 25, cy: 190, r: 7 },
    { id: "ht-spk4", tag: "circle", cx: 375, cy: 190, r: 7 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 10. DINOSAURE JURASSIQUE & VOLCAN (Jurassic Dinosaur & Volcano)
// ═══════════════════════════════════════════════════════════════════════════
const dinosaur: Drawing = {
  id: "dinosaur",
  name: "Monde Jurassique",
  icon: "🦖",
  viewBox: "0 0 500 400",
  regions: [
    // Prehistoric Sky
    { id: "dn-sky", tag: "rect", x: 0, y: 0, width: 500, height: 320 },
    // Glowing Sun
    { id: "dn-sun", tag: "circle", cx: 440, cy: 60, r: 35 },

    // Prehistoric Ground & Fern Jungle
    { id: "dn-ground", tag: "rect", x: 0, y: 320, width: 500, height: 80 },

    // Giant Active Volcano
    { id: "dn-volcanoBody", tag: "polygon", points: "20,325 85,150 145,150 220,325" },
    { id: "dn-volcanoCrater", tag: "ellipse", cx: 115, cy: 150, rx: 30, ry: 9 },
    // Flowing Lava Streams down the mountain
    { id: "dn-lava1", tag: "path", d: "M105 155 Q95 210 70 270 Q85 270 115 210 Q118 160 105 155 Z" },
    { id: "dn-lava2", tag: "path", d: "M125 155 Q135 220 160 280 Q150 280 130 220 Q122 160 125 155 Z" },

    // Billowing Smoke Clouds
    { id: "dn-smk1", tag: "circle", cx: 108, cy: 125, r: 16 },
    { id: "dn-smk2", tag: "circle", cx: 128, cy: 98, r: 20 },
    { id: "dn-smk3", tag: "circle", cx: 102, cy: 65, r: 24 },
    { id: "dn-smk4", tag: "circle", cx: 135, cy: 40, r: 26 },

    // Dino Curving Tail
    { id: "dn-tail", tag: "path", d: "M180 275 C100 285 45 225 35 180 C55 220 120 250 180 250 Z" },

    // Dino Main Body
    { id: "dn-body", tag: "ellipse", cx: 255, cy: 260, rx: 95, ry: 68 },
    // Dino Highlighted Belly Plate
    { id: "dn-belly", tag: "ellipse", cx: 255, cy: 285, rx: 60, ry: 35 },

    // Back Dorsal Plates / Spikes (5 plates)
    { id: "dn-spk1", tag: "polygon", points: "185,200 172,175 198,190" },
    { id: "dn-spk2", tag: "polygon", points: "215,193 208,165 230,188" },
    { id: "dn-spk3", tag: "polygon", points: "250,192 248,162 268,192" },
    { id: "dn-spk4", tag: "polygon", points: "285,200 290,172 302,205" },
    { id: "dn-spk5", tag: "polygon", points: "315,212 328,188 335,225" },

    // Dino Spots on Body (6 spots)
    { id: "dn-spot1", tag: "circle", cx: 215, cy: 235, r: 10 },
    { id: "dn-spot2", tag: "circle", cx: 245, cy: 230, r: 12 },
    { id: "dn-spot3", tag: "circle", cx: 280, cy: 235, r: 11 },
    { id: "dn-spot4", tag: "circle", cx: 230, cy: 260, r: 9 },
    { id: "dn-spot5", tag: "circle", cx: 265, cy: 260, r: 10 },
    { id: "dn-spot6", tag: "circle", cx: 295, cy: 255, r: 8 },

    // Dino Long Graceful Neck
    { id: "dn-neck", tag: "path", d: "M305 240 C350 215 385 165 370 100 L340 110 C345 155 315 195 280 220 Z" },

    // Dino Friendly Head
    { id: "dn-head", tag: "path", d: "M340 108 C340 75 390 65 420 85 C430 100 420 125 395 130 C368 134 345 125 340 108 Z" },
    // Dino Eye
    { id: "dn-eyeWhite", tag: "circle", cx: 388, cy: 92, r: 8 },
    { id: "dn-eyePupil", tag: "circle", cx: 386, cy: 92, r: 4 },
    // Dino Nostril & Smile
    { id: "dn-nostril", tag: "circle", cx: 412, cy: 92, r: 3 },
    { id: "dn-smile", tag: "path", d: "M388 112 Q405 118 415 106", decorative: true, strokeWidth: 2.5 },

    // Sturdy Columnar Legs (4 legs)
    { id: "dn-legB2", tag: "rect", x: 170, y: 285, width: 22, height: 55 },
    { id: "dn-footB2", tag: "ellipse", cx: 178, cy: 340, rx: 16, ry: 9 },

    { id: "dn-legB1", tag: "rect", x: 198, y: 290, width: 26, height: 50 },
    { id: "dn-footB1", tag: "ellipse", cx: 208, cy: 340, rx: 18, ry: 9 },

    { id: "dn-legF2", tag: "rect", x: 318, y: 285, width: 20, height: 55 },
    { id: "dn-footF2", tag: "ellipse", cx: 332, cy: 340, rx: 15, ry: 9 },

    { id: "dn-legF1", tag: "rect", x: 290, y: 290, width: 24, height: 50 },
    { id: "dn-footF1", tag: "ellipse", cx: 304, cy: 340, rx: 17, ry: 9 },

    // Tropical Palm Tree on Right
    { id: "dn-palmTrunk", tag: "path", d: "M455 330 Q445 260 465 200 L478 200 Q455 260 468 330 Z" },
    { id: "dn-coconut1", tag: "circle", cx: 460, cy: 202, r: 7 },
    { id: "dn-coconut2", tag: "circle", cx: 470, cy: 204, r: 6 },
    { id: "dn-frond1", tag: "path", d: "M465 200 Q425 170 395 205 Q430 185 465 200 Z" },
    { id: "dn-frond2", tag: "path", d: "M468 200 Q465 150 480 185 Q470 170 468 200 Z" },
    { id: "dn-frond3", tag: "path", d: "M470 200 Q500 160 515 195 Q490 180 470 200 Z" },

    // Dino Egg in Nest
    { id: "dn-nest", tag: "ellipse", cx: 380, cy: 350, rx: 30, ry: 10 },
    { id: "dn-eggTop", tag: "path", d: "M370 342 C370 320 390 320 390 342 L385 340 L380 345 L375 340 Z" },
    { id: "dn-eggBot", tag: "path", d: "M370 342 L375 340 L380 345 L385 340 L390 342 C390 358 370 358 370 342 Z" },
  ],
};

export const drawingsB: Drawing[] = [fish, car, nightSky, heart, dinosaur];
