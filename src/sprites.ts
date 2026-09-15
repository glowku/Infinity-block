import { BlockConfig, BlockType, BossDef, PowerUpConfig, PowerUpType } from './types';

export const BS = 32;

function hash(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) & 0xffff) / 0xffff;
}

export function makeBlockCanvas(cfg: {
  base: string;
  dark: string;
  light: string;
  detail?: (g: CanvasRenderingContext2D) => void;
}): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = BS;
  c.height = BS;
  const g = c.getContext('2d');
  if (!g) return c;

  g.fillStyle = cfg.base;
  g.fillRect(0, 0, BS, BS);
  for (let j = 0; j < BS; j++) {
    for (let i = 0; i < BS; i++) {
      const n = hash(i * 7 + j * 13, j * 5 + i * 3);
      if (n < 0.22) {
        g.fillStyle = cfg.dark;
        g.fillRect(i, j, 1, 1);
      } else if (n > 0.86) {
        g.fillStyle = cfg.light;
        g.fillRect(i, j, 1, 1);
      }
    }
  }
  g.fillStyle = cfg.light;
  g.fillRect(0, 0, BS, 2);
  g.fillRect(0, 0, 2, BS);
  g.fillStyle = cfg.dark;
  g.fillRect(0, BS - 2, BS, 2);
  g.fillRect(BS - 2, 0, 2, BS);
  if (cfg.detail) cfg.detail(g);
  return c;
}

export const SPRITES: Record<string, HTMLCanvasElement> = {
  stone: makeBlockCanvas({
    base: '#5a5a64',
    dark: '#333340',
    light: '#888894',
    detail: (g) => {
      g.fillStyle = '#2a2a36';
      g.fillRect(6, 8, 5, 4);
      g.fillRect(20, 18, 4, 5);
      g.fillRect(10, 22, 6, 3);
      g.fillStyle = '#9a9aa8';
      g.fillRect(14, 5, 2, 2);
      g.fillRect(24, 11, 2, 2);
    },
  }),
  wood: makeBlockCanvas({
    base: '#855429',
    dark: '#3a2208',
    light: '#b07840',
    detail: (g) => {
      g.fillStyle = '#4a2a10';
      g.fillRect(2, 7, BS - 4, 2);
      g.fillRect(2, 15, BS - 4, 2);
      g.fillRect(2, 23, BS - 4, 2);
      g.fillStyle = '#2a1808';
      g.fillRect(11, 11, 5, 5);
    },
  }),
  metal: makeBlockCanvas({
    base: '#6a7c8e',
    dark: '#2a3848',
    light: '#a0b8cc',
    detail: (g) => {
      [
        [4, 4],
        [BS - 9, 4],
        [4, BS - 9],
        [BS - 9, BS - 9],
      ].forEach(([a, b]) => {
        g.fillStyle = '#141c28';
        g.fillRect(a, b, 5, 5);
        g.fillStyle = '#c0d0e0';
        g.fillRect(a + 1, b + 1, 1, 1);
      });
      g.fillStyle = 'rgba(255,255,255,.6)';
      g.fillRect(11, 6, 1, 9);
      g.fillRect(14, 5, 1, 7);
    },
  }),
  ice: makeBlockCanvas({
    base: '#8ecdff',
    dark: '#3a7aae',
    light: '#e0f4ff',
    detail: (g) => {
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(16, 0);
      g.lineTo(0, 18);
      g.closePath();
      g.fill();
      g.strokeStyle = '#3a7aae';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(21, 8);
      g.lineTo(24, 14);
      g.lineTo(19, 22);
      g.stroke();
    },
  }),
  gold: makeBlockCanvas({
    base: '#e8b83c',
    dark: '#7a5a10',
    light: '#fff8b0',
    detail: (g) => {
      g.fillStyle = '#ffffe0';
      g.fillRect(6, 6, 4, 4);
      g.fillRect(20, 15, 3, 3);
      g.fillRect(11, 23, 3, 3);
      g.strokeStyle = '#fff';
      g.lineWidth = 1;
      g.strokeRect(3, 3, BS - 6, BS - 6);
    },
  }),
  volatile: makeBlockCanvas({
    base: '#d03030',
    dark: '#701010',
    light: '#ff9090',
    detail: (g) => {
      g.fillStyle = '#ffd040';
      g.fillRect(0, 12, BS, 4);
      g.fillRect(0, 20, BS, 4);
      g.fillStyle = '#141414';
      for (let i = 0; i < BS; i += 8) {
        g.fillRect(i, 13, 4, 1);
        g.fillRect(i + 4, 21, 4, 1);
      }
      g.fillStyle = '#fff';
      g.fillRect(15, 15, 2, 2);
    },
  }),
  crystal: makeBlockCanvas({
    base: '#b478f0',
    dark: '#4a1e80',
    light: '#e0c0ff',
    detail: (g) => {
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath();
      g.moveTo(BS / 2, 2);
      g.lineTo(BS - 3, BS / 2);
      g.lineTo(BS / 2, BS - 2);
      g.lineTo(3, BS / 2);
      g.closePath();
      g.fill();
      g.fillStyle = '#fff';
      g.fillRect(BS / 2 - 1, BS / 2 - 1, 2, 2);
    },
  }),
  obsidian: makeBlockCanvas({
    base: '#2a1c30',
    dark: '#0a0410',
    light: '#4a3854',
    detail: (g) => {
      g.fillStyle = '#a090b0';
      g.fillRect(5, 5, 2, 1);
      g.fillRect(25, 12, 1, 2);
      g.fillRect(14, 26, 2, 1);
      g.fillStyle = 'rgba(140,80,255,.4)';
      g.fillRect(17, 17, 3, 3);
    },
  }),
};

export const TYPES: Record<BlockType, BlockConfig> = {
  stone: { sprite: 'stone', hp: 48, xp: 10, weight: 26, col: '#888894', part: '#5a5a64', spark: '#ffd8a0' },
  wood: { sprite: 'wood', hp: 22, xp: 6, weight: 18, col: '#b07840', part: '#855429', spark: '#ffb060' },
  metal: { sprite: 'metal', hp: 88, xp: 24, weight: 12, col: '#a0b8cc', part: '#6a7c8e', spark: '#ffffff' },
  ice: { sprite: 'ice', hp: 22, xp: 12, weight: 12, col: '#e0f4ff', part: '#8ecdff', spark: '#e0f8ff' },
  gold: { sprite: 'gold', hp: 65, xp: 45, weight: 6, col: '#fff8b0', part: '#e8b83c', spark: '#ffff80' },
  volatile: { sprite: 'volatile', hp: 25, xp: 20, weight: 9, col: '#ff9090', part: '#d03030', spark: '#ffd040', explosive: true },
  crystal: { sprite: 'crystal', hp: 45, xp: 30, weight: 7, col: '#e0c0ff', part: '#b478f0', spark: '#ffd8ff' },
  obsidian: { sprite: 'obsidian', hp: 105, xp: 35, weight: 8, col: '#4a3854', part: '#2a1c30', spark: '#ff80ff' },
};

export const TYPE_KEYS = Object.keys(TYPES) as BlockType[];
export const WEIGHT_SUM = TYPE_KEYS.reduce((s, k) => s + TYPES[k].weight, 0);

export function pickType(): BlockType {
  let r = Math.random() * WEIGHT_SUM;
  for (const k of TYPE_KEYS) {
    r -= TYPES[k].weight;
    if (r <= 0) return k;
  }
  return 'stone';
}

export function makeBlockCanvasClone(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d');
  if (g) g.drawImage(src, 0, 0);
  return c;
}

export function punchBlock(b: { canvas: HTMLCanvasElement }, lx: number, ly: number, r: number) {
  if (!b || !b.canvas) return;
  try {
    const c = b.canvas.getContext('2d');
    if (!c) return;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(lx, ly, r, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r + (Math.random() * 7 - 2);
      c.beginPath();
      c.arc(lx + Math.cos(a) * d, ly + Math.sin(a) * d, 1.5 + Math.random() * 2, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  } catch {
    // ignore
  }
}

export const POWER_UP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  double_xp: {
    type: 'double_xp',
    label: '2X XP',
    name: 'Double XP',
    color: '#ffd700',
    glow: 'rgba(255, 215, 0, 0.7)',
    iconText: '2X',
    duration: 8,
    description: 'Doubles all earned XP to rapidly boost cannon level and stats',
  },
  multi_shot: {
    type: 'multi_shot',
    label: 'SPREAD CANNON',
    name: 'Spread Shot',
    color: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.7)',
    iconText: '+2',
    duration: 8,
    description: 'Deploys 2 additional high-velocity spread cannons',
  },
  bounce: {
    type: 'bounce',
    label: 'KINETIC BOUNCE',
    name: 'Bouncing Rounds',
    color: '#00ff7f',
    glow: 'rgba(0, 255, 127, 0.7)',
    iconText: 'RIC',
    duration: 8,
    description: 'Bullets ricochet 4 times off walls with explosive kinetic shockwaves',
  },
  super_pierce: {
    type: 'super_pierce',
    label: 'PLASMA PIERCE',
    name: 'Hyper Penetrator',
    color: '#ff00aa',
    glow: 'rgba(255, 0, 170, 0.8)',
    iconText: 'BEAM',
    duration: 8,
    description: 'Hyper-charged laser rounds rip through 5 blocks with 2.8x damage',
  },
  rapid_fire: {
    type: 'rapid_fire',
    label: 'RAPID VULCAN',
    name: 'Overdrive Vulcan',
    color: '#ffaa00',
    glow: 'rgba(255, 170, 0, 0.7)',
    iconText: 'MAX',
    duration: 7,
    description: 'Hyper-accelerates firing cadence with blazing tracer rounds',
  },
  nuke: {
    type: 'nuke',
    label: 'TACTICAL NUKE',
    name: 'Seismic Annihilator',
    color: '#ff3344',
    glow: 'rgba(255, 51, 68, 0.85)',
    iconText: 'NUKE',
    duration: 0,
    description: 'Massive tactical shockwave vaporizes lower blocks and heavily damages bosses',
  },
};

export function makeBossCanvas(def: BossDef): HTMLCanvasElement {
  const W = def.w * BS;
  const H = def.h * BS;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return c;

  g.fillStyle = def.color;
  g.fillRect(0, 0, W, H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const n = hash(i * 13 + j * 7, j * 11 + i * 5);
      if (n < 0.25) {
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(i, j, 1, 1);
      } else if (n > 0.85) {
        g.fillStyle = def.accent;
        g.globalAlpha = 0.45;
        g.fillRect(i, j, 1, 1);
        g.globalAlpha = 1;
      }
    }
  }

  // Armor plating grid
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.lineWidth = 2;
  for (let x = BS; x < W; x += BS) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  for (let y = BS; y < H; y += BS) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }

  // Glowing energy vents
  g.fillStyle = def.accent;
  g.globalAlpha = 0.8;
  for (let y = 6; y < H - 6; y += 10) {
    g.fillRect(4, y, W - 8, 2);
  }
  g.globalAlpha = 1;

  // Center reactor core
  const cx = W / 2;
  const cy = H / 2;
  const coreG = g.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) / 2);
  coreG.addColorStop(0, '#ffffff');
  coreG.addColorStop(0.3, def.accent);
  coreG.addColorStop(0.7, 'rgba(0,0,0,0.5)');
  coreG.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = coreG;
  g.fillRect(0, 0, W, H);

  // Border outline
  g.strokeStyle = def.accent;
  g.lineWidth = 3;
  g.strokeRect(1, 1, W - 2, H - 2);

  // Boss eyes / core nodes
  g.fillStyle = '#ffffff';
  g.fillRect(cx - 6, cy - 6, 12, 12);
  g.fillStyle = def.accent;
  g.fillRect(cx - 3, cy - 3, 6, 6);

  return c;
}
