export type BlockType = 
  | 'stone'
  | 'wood'
  | 'metal'
  | 'ice'
  | 'gold'
  | 'volatile'
  | 'crystal'
  | 'obsidian';

export type PowerUpType = 
  | 'double_xp'
  | 'multi_shot'
  | 'bounce'
  | 'super_pierce'
  | 'rapid_fire'
  | 'nuke';

export interface PowerUpConfig {
  type: PowerUpType;
  label: string;
  name: string;
  color: string;
  glow: string;
  iconText: string;
  duration: number; // in seconds (0 for instant like nuke)
  description: string;
}

export interface ActivePowerUp {
  type: PowerUpType;
  timeLeft: number;
  duration: number;
}

export interface PowerUpDrop {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  dead: boolean;
}

export interface BlockConfig {
  sprite: string;
  hp: number;
  xp: number;
  weight: number;
  col: string;
  part: string;
  spark: string;
  explosive?: boolean;
}

export interface BossDef {
  id: string;
  name: string;
  w: number; // width in block units
  h: number; // height in block units
  hp: number;
  xp: number;
  color: string;
  accent: string;
  attack: 'barrage' | 'explode' | 'freeze' | 'pulse' | 'shard' | 'all';
  attackCd: number;
  at: number; // seconds when boss spawns
  isFinal?: boolean;
}

export interface BossEntity {
  def: BossDef;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
  flash: number;
  attackTimer: number;
  brickSalvoTimer: number;
  age: number;
  enraged: boolean;
}

export interface GridCell {
  type: BlockType;
  hp: number;
  maxHP: number;
  age: number;
  flash: number;
  canvas: HTMLCanvasElement;
}

export interface ComboMilestone {
  at: number;
  effect: 'chain' | 'fire' | 'storm' | 'nova' | 'supernova' | 'aegis_overdrive';
  color: string;
}

export interface GameHUDData {
  height: number;
  totalXP: number;
  level: number;
  zoom: number;
  combo: number;
  comboTimer: number;
  activePowerUps: ActivePowerUp[];
  boss: {
    name: string;
    hp: number;
    maxHp: number;
    accent: string;
    color: string;
    enraged: boolean;
  } | null;
  bestHeight: number;
  gameOver: boolean;
  dangerCountdown: number | null;
  dangerReason: string | null;
  cannonTier: number; // 1: single, 2: double, 3: triple, 4: quad, 5: penta+
  bulletProperties: {
    multiCount: number;
    isSuperPiercing: boolean;
    isBouncing: boolean;
    isDoubleXP: boolean;
    isRapid: boolean;
  };
  aiDrone: {
    active: boolean;
    level: number;
    dps: number;
    missileCount: number;
  } | null;
  goblinActive: boolean;
  aegisOverdrive: {
    active: boolean;
    timeLeft: number;
    duration: number;
  } | null;
}
