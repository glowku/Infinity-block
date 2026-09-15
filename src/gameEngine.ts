import { sound } from './audio';
import {
  BS,
  makeBlockCanvasClone,
  makeBossCanvas,
  pickType,
  POWER_UP_CONFIGS,
  punchBlock,
  SPRITES,
  TYPES,
} from './sprites';
import {
  ActivePowerUp,
  BlockType,
  BossDef,
  BossEntity,
  ComboMilestone,
  GameHUDData,
  GridCell,
  PowerUpDrop,
  PowerUpType,
} from './types';

export const PX_W = 480;
export const PX_H = 720;
export const ROWS = 16;
export const PLAY_TOP = 52;
export const GROUND_Y = PLAY_TOP + ROWS * BS;
export const START_COLS = 15;
export const MAX_COLS = 25;
export const GROUND_MARGIN = 55;

export const rnd = (a = 1, b = 0) => Math.random() * (a - b) + b;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export const BOSS_DEFS: BossDef[] = [
  {
    id: 'obelisk',
    name: 'THE OBELISK',
    w: 2,
    h: 4,
    hp: 2200,
    xp: 500,
    color: '#4a3854',
    accent: '#d8b0ff',
    attack: 'barrage',
    attackCd: 3.2,
    at: 30,
  },
  {
    id: 'pyro',
    name: 'PYRO CORE',
    w: 3,
    h: 2,
    hp: 4800,
    xp: 1000,
    color: '#d03030',
    accent: '#ffd040',
    attack: 'explode',
    attackCd: 3.0,
    at: 75,
  },
  {
    id: 'cryo',
    name: 'CRYO TITAN',
    w: 4,
    h: 3,
    hp: 9500,
    xp: 1800,
    color: '#3a7aae',
    accent: '#e0f4ff',
    attack: 'freeze',
    attackCd: 3.5,
    at: 135,
  },
  {
    id: 'reactor',
    name: 'THE REACTOR',
    w: 5,
    h: 2,
    hp: 16000,
    xp: 3000,
    color: '#4a6080',
    accent: '#4ad4ff',
    attack: 'pulse',
    attackCd: 2.6,
    at: 210,
  },
  {
    id: 'void',
    name: 'VOID SHARD',
    w: 4,
    h: 4,
    hp: 26000,
    xp: 5000,
    color: '#2a1c30',
    accent: '#b478f0',
    attack: 'shard',
    attackCd: 2.8,
    at: 290,
  },
  {
    id: 'final',
    name: 'OMEGA ███ COLOSSUS',
    w: 7,
    h: 4,
    hp: 42000,
    xp: 10000,
    color: '#150820',
    accent: '#ff2055',
    attack: 'all',
    attackCd: 1.8,
    at: 380,
    isFinal: true,
  },
];

export const COMBO_MILESTONES: ComboMilestone[] = [
  { at: 10, effect: 'chain', color: '#8cf' },
  { at: 25, effect: 'fire', color: '#ff8020' },
  { at: 45, effect: 'storm', color: '#b478f0' },
  { at: 70, effect: 'nova', color: '#ffd24a' },
  { at: 100, effect: 'supernova', color: '#ff3a5a' },
  { at: 150, effect: 'aegis_overdrive', color: '#00ffff' },
];

export class HomingMissile {
  public dead = false;
  public life = 3.5;
  public trail: { x: number; y: number }[] = [];
  public targetCol: number = -1;
  public targetRow: number = -1;
  public targetIsBoss: boolean = false;

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public damage: number = 85
  ) {}

  update(dt: number, engine: GameEngine) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();

    // Acquire target if none
    let targetX = this.x;
    let targetY = PLAY_TOP;

    if (engine.activeBoss) {
      targetX = engine.activeBoss.x + engine.activeBoss.w / 2;
      targetY = engine.activeBoss.y + engine.activeBoss.h / 2;
      this.targetIsBoss = true;
    } else {
      // Target highest block in the grid or lowest HP block
      let highestRow = ROWS;
      let targetC = Math.floor(engine.cols / 2);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < engine.cols; c++) {
          if (engine.grid[r][c]) {
            highestRow = r;
            targetC = c;
            break;
          }
        }
        if (highestRow < ROWS) break;
      }
      if (highestRow < ROWS) {
        targetX = targetC * BS + BS / 2;
        targetY = PLAY_TOP + highestRow * BS + BS / 2;
      }
    }

    // Steer towards target smoothly
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const angle = Math.atan2(dy, dx);
    const speed = 720;
    const currentAngle = Math.atan2(this.vy, this.vx);
    let diff = angle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const newAngle = currentAngle + diff * Math.min(1, dt * 8);

    this.vx = Math.cos(newAngle) * speed;
    this.vy = Math.sin(newAngle) * speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Check collision with boss
    if (engine.activeBoss) {
      const b = engine.activeBoss;
      if (this.x >= b.x && this.x <= b.x + b.w && this.y >= b.y && this.y <= b.y + b.h) {
        this.dead = true;
        engine.damageBoss(b, this.x, this.y, true, this.damage);
        engine.explode(this.x, this.y, 45, this.damage * 0.4);
        sound.hit();
        return;
      }
    }

    // Check collision with grid blocks
    const col = Math.floor(this.x / BS);
    const row = Math.floor((this.y - PLAY_TOP) / BS);
    if (col >= 0 && col < engine.cols && row >= 0 && row < ROWS) {
      const cell = engine.grid[row][col];
      if (cell) {
        this.dead = true;
        cell.hp -= this.damage;
        cell.flash = 1;
        engine.flashes.push(new Flash(this.x, this.y, 35, 0.15, '#00e5ff'));
        engine.rings.push(new Ring(this.x, this.y, '#00e5ff', 40));
        sound.explode();
        if (cell.hp <= 0) {
          engine.destroyQ.push({ col, row });
        }
        engine.explode(this.x, this.y, 50, this.damage * 0.5);
      }
    }
  }

  draw(g: CanvasRenderingContext2D) {
    // Engine smoke / plasma trail
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const a = (i / this.trail.length) * 0.6;
      g.fillStyle = `rgba(0, 229, 255, ${a})`;
      g.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    const angle = Math.atan2(this.vy, this.vx);
    g.save();
    g.translate(this.x, this.y);
    g.rotate(angle);

    // Missile body
    g.fillStyle = '#1e293b';
    g.fillRect(-10, -3, 16, 6);
    g.fillStyle = '#00e5ff';
    g.beginPath();
    g.moveTo(6, -3);
    g.lineTo(12, 0);
    g.lineTo(6, 3);
    g.closePath();
    g.fill();

    // Rocket thruster flame
    g.fillStyle = '#ffaa00';
    g.fillRect(-13, -2, 4, 4);
    g.restore();
  }
}

export class GoblinEntity {
  public dead = false;
  public x: number;
  public y: number;
  public targetX: number;
  public state: 'entering' | 'casting' | 'leaving' = 'entering';
  public timer = 0;
  public castTimer = 0;
  public halfColsSpawned = 0;
  public targetCol: number;

  constructor(public worldW: number, public cols: number) {
    // Starts off-screen left or right
    const fromLeft = Math.random() < 0.5;
    this.x = fromLeft ? -50 : worldW + 50;
    this.y = PLAY_TOP + 40 + rnd(80);
    this.targetCol = Math.floor(rnd(cols - 2, 1));
    this.targetX = this.targetCol * BS + BS / 2;
  }

  update(dt: number, engine: GameEngine) {
    this.timer += dt;

    if (this.state === 'entering') {
      const dx = this.targetX - this.x;
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 260);
      if (Math.abs(dx) < 6) {
        this.state = 'casting';
        this.castTimer = 0.4;
        sound.teleport();
      }
    } else if (this.state === 'casting') {
      this.castTimer -= dt;
      if (this.castTimer <= 0 && this.halfColsSpawned < 1) {
        this.halfColsSpawned++;
        this.spawnHalfColumn(engine);
        this.state = 'leaving';
        this.targetX = this.x > engine.worldW / 2 ? engine.worldW + 80 : -80;
      }
    } else if (this.state === 'leaving') {
      const dx = this.targetX - this.x;
      this.x += Math.sign(dx) * dt * 320;
      if (this.x < -70 || this.x > engine.worldW + 70) {
        this.dead = true;
      }
    }
  }

  spawnHalfColumn(engine: GameEngine) {
    sound.columnBreak();
    const col = clamp(this.targetCol, 0, engine.cols - 1);
    const halfHeight = Math.floor(ROWS / 2); // 8 blocks

    // Drop an impressive cascade of 8 half-column blocks
    const types: BlockType[] = ['stone', 'wood', 'ice', 'volatile', 'gold'];
    for (let r = 0; r < halfHeight; r++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const by = PLAY_TOP - (r + 1) * (BS + 4);
      engine.falling.push(
        new FallingBlock(type, col * BS, by, rnd(10, -10), 180 + r * 30)
      );
    }

    const cx = col * BS + BS / 2;
    engine.floats.push(
      new FloatText(cx, PLAY_TOP + 20, 'GOBLIN SUMMON: HALF-COLUMN!', '#a855f7', 13)
    );
    engine.flashes.push(new Flash(cx, PLAY_TOP + 60, 90, 0.4, '#c084fc'));
    engine.rings.push(new Ring(cx, PLAY_TOP + 60, '#a855f7', 120));
  }

  draw(g: CanvasRenderingContext2D) {
    g.save();
    g.translate(this.x, this.y);

    const bob = Math.sin(this.timer * 8) * 4;

    // Goblin aura
    const halo = g.createRadialGradient(0, bob, 0, 0, bob, 26);
    halo.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo;
    g.fillRect(-26, bob - 26, 52, 52);

    // Goblin body & hood (mystical sprite look)
    g.fillStyle = '#581c87';
    g.beginPath();
    g.arc(0, bob, 14, 0, Math.PI * 2);
    g.fill();

    // Goblin face / ears
    g.fillStyle = '#4ade80';
    g.beginPath();
    g.arc(0, bob + 2, 9, 0, Math.PI * 2);
    g.fill();

    // Pointy ears
    g.fillStyle = '#22c55e';
    g.beginPath();
    g.moveTo(-8, bob);
    g.lineTo(-18, bob - 6);
    g.lineTo(-6, bob + 6);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(8, bob);
    g.lineTo(18, bob - 6);
    g.lineTo(6, bob + 6);
    g.closePath();
    g.fill();

    // Glowing eyes
    g.fillStyle = '#fbbf24';
    g.fillRect(-4, bob, 3, 3);
    g.fillRect(2, bob, 3, 3);

    // Staff orb
    const castGlow = this.state === 'casting' ? 1.5 : 0.8;
    g.fillStyle = '#ec4899';
    g.beginPath();
    g.arc(14, bob - 8, 5 * castGlow, 0, Math.PI * 2);
    g.fill();

    g.restore();
  }
}

export class AIDroneCompanion {
  public level = 1;
  public active = false;
  public dps = 120;
  public missileCount = 1;
  public shootTimer = 1.6;
  public x = 0;
  public y = 0;
  public angle = 0;
  public missiles: HomingMissile[] = [];

  constructor() {}

  update(dt: number, engine: GameEngine) {
    if (!this.active) return;

    // Orbit around the player cannon smoothly
    this.angle += dt * 2.4;
    const cx = engine.cannonWorldX();
    const cy = engine.cannonWorldY() - 35;
    const radius = 55;
    this.x = cx + Math.cos(this.angle) * radius;
    this.y = cy + Math.sin(this.angle) * (radius * 0.55);

    // Auto-targeting & automatic missile launch
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && !engine.gameOver) {
      // Rapid cadence scaling with drone level
      const fireInterval = Math.max(0.65, 1.8 - this.level * 0.14);
      this.shootTimer = fireInterval;
      this.launchSalvo(engine);
    }

    // Update active homing missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      this.missiles[i].update(dt, engine);
      if (this.missiles[i].dead) this.missiles.splice(i, 1);
    }
  }

  launchSalvo(engine: GameEngine) {
    sound.missileLaunch();
    const count = Math.min(4, Math.floor(1 + this.level / 3));
    const damage = Math.floor(this.dps * 0.5);

    for (let i = 0; i < count; i++) {
      const spreadAngle = (i - (count - 1) / 2) * 0.35 - Math.PI / 2;
      const vx = Math.cos(spreadAngle) * 450;
      const vy = Math.sin(spreadAngle) * 450;
      const m = new HomingMissile(this.x, this.y, vx, vy, damage);
      this.missiles.push(m);
    }

    engine.flashes.push(new Flash(this.x, this.y, 25, 0.15, '#00e5ff'));
    engine.rings.push(new Ring(this.x, this.y, '#00e5ff', 35));
  }

  upgrade() {
    this.level++;
    this.dps = Math.floor(120 * Math.pow(1.32, this.level - 1));
    this.missileCount = Math.min(4, Math.floor(1 + this.level / 3));
  }

  draw(g: CanvasRenderingContext2D) {
    if (!this.active) return;

    for (const m of this.missiles) m.draw(g);

    g.save();
    g.translate(this.x, this.y);

    // Drone outer energy shield
    const pulse = 0.6 + 0.4 * Math.sin(this.angle * 4);
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, 24);
    halo.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = halo;
    g.fillRect(-24, -24, 48, 48);

    // Drone chassis
    g.fillStyle = '#0f172a';
    g.beginPath();
    g.arc(0, 0, 11, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = '#00e5ff';
    g.lineWidth = 1.8;
    g.stroke();

    // Twin weapon wings
    g.fillStyle = '#06b6d4';
    g.fillRect(-16, -2, 6, 4);
    g.fillRect(10, -2, 6, 4);

    // AI Core eye
    g.fillStyle = '#38bdf8';
    g.beginPath();
    g.arc(0, 0, 4.5, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#ffffff';
    g.fillRect(-1, -1, 2, 2);

    g.restore();
  }
}

export class Particle {
  public dead = false;
  private maxLife: number;

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public color: string,
    public size: number,
    public life: number,
    public grav: number = 1200
  ) {
    this.maxLife = life;
  }

  update(dt: number) {
    this.vy += this.grav * dt;
    this.vx *= 0.98;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y > GROUND_Y && this.vy > 0) {
      this.y = GROUND_Y;
      this.vy = -this.vy * 0.4;
      this.vx *= 0.6;
    }
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(g: CanvasRenderingContext2D) {
    const a = this.life / this.maxLife;
    g.globalAlpha = a;
    g.fillStyle = this.color;
    const s = this.size * (0.4 + a * 0.6);
    g.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    g.globalAlpha = 1;
  }
}

export class FloatText {
  public dead = false;
  public life = 1.5;
  public vy = -100;
  public scale = 2;

  constructor(
    public x: number,
    public y: number,
    public text: string,
    public color: string,
    public size: number = 11
  ) {}

  update(dt: number) {
    this.y += this.vy * dt;
    this.vy *= 0.92;
    this.scale += (1 - this.scale) * Math.min(1, dt * 9);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(g: CanvasRenderingContext2D) {
    const a = Math.min(1, this.life * 1.7);
    g.globalAlpha = a;
    g.save();
    g.translate(this.x, this.y);
    g.scale(this.scale, this.scale);
    g.font = `bold ${this.size}px Courier New`;
    g.textAlign = 'center';
    g.fillStyle = '#000';
    g.fillText(this.text, 1.5, 1.5);
    g.fillStyle = this.color;
    g.fillText(this.text, 0, 0);
    g.restore();
    g.globalAlpha = 1;
  }
}

export class Ring {
  public dead = false;
  public r = 6;
  public life = 0.5;
  public maxLife = 0.5;

  constructor(
    public x: number,
    public y: number,
    public color: string,
    public maxR: number
  ) {}

  update(dt: number) {
    this.r += (this.maxR - this.r) * Math.min(1, dt * 13);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(g: CanvasRenderingContext2D) {
    const a = this.life / this.maxLife;
    g.globalAlpha = a;
    g.strokeStyle = this.color;
    g.lineWidth = 3 * a;
    g.beginPath();
    g.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }
}

export class Flash {
  public dead = false;
  public maxLife: number;

  constructor(
    public x: number,
    public y: number,
    public r: number,
    public life: number,
    public color: string = '#ffffff'
  ) {
    this.maxLife = life;
  }

  update(dt: number) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(g: CanvasRenderingContext2D) {
    const a = this.life / this.maxLife;
    const grd = g.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    grd.addColorStop(0, this.color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a;
    g.fillStyle = grd;
    g.fillRect(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
    g.globalAlpha = 1;
  }
}

export class Bolt {
  public dead = false;
  public maxLife: number;
  public pts: { x: number; y: number }[] = [];

  constructor(
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
    public color: string,
    public life: number = 0.25
  ) {
    this.maxLife = life;
    this.pts = [{ x: x1, y: y1 }];
    const segs = 6;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const mx = x1 + (x2 - x1) * t;
      const my = y1 + (y2 - y1) * t;
      const perp = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      const off = rnd(10, -10);
      this.pts.push({ x: mx + Math.cos(perp) * off, y: my + Math.sin(perp) * off });
    }
    this.pts.push({ x: x2, y: y2 });
  }

  update(dt: number) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(g: CanvasRenderingContext2D) {
    const a = this.life / this.maxLife;
    g.globalAlpha = a;
    g.strokeStyle = this.color;
    g.lineWidth = 2;
    g.shadowColor = this.color;
    g.shadowBlur = 8;
    g.beginPath();
    g.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i < this.pts.length; i++) g.lineTo(this.pts[i].x, this.pts[i].y);
    g.stroke();
    g.shadowBlur = 0;
    g.globalAlpha = 1;
  }
}

export class FallingBlock {
  public angle = 0;
  public av = rnd(4, -4);
  public dead = false;
  public canvas: HTMLCanvasElement;
  public hp: number;
  public maxHP: number;
  public age = 0;

  constructor(
    public type: BlockType,
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    existing?: HTMLCanvasElement
  ) {
    this.canvas = existing || makeBlockCanvasClone(SPRITES[TYPES[type].sprite]);
    this.hp = TYPES[type].hp;
    this.maxHP = TYPES[type].hp;
  }

  update(dt: number, speedMult: number, engine: GameEngine) {
    // Increased falling gravity for fast, snappy arcade action
    this.vy += 2200 * speedMult * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.av * dt;
    this.av *= 0.985;

    if (this.x < 0) {
      this.x = 0;
      this.vx = -this.vx * 0.5;
      this.av = -this.av * 0.6;
    }
    if (this.x + BS > engine.worldW) {
      this.x = engine.worldW - BS;
      this.vx = -this.vx * 0.5;
      this.av = -this.av * 0.6;
    }
    if (this.y < PLAY_TOP) {
      this.y = PLAY_TOP;
      this.vy = Math.abs(this.vy) * 0.3;
    }
    this.tryLand(engine);
  }

  tryLand(engine: GameEngine) {
    const nextY = this.y + Math.max(4, this.vy * 0.02);
    if (this.wouldCollide(this.x, nextY, engine)) {
      const col = clamp(Math.round(this.x / BS), 0, engine.cols - 1);
      let targetRow = -1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (engine.grid[r][col]) continue;
        if (r === ROWS - 1 || engine.grid[r + 1][col]) {
          targetRow = r;
          break;
        }
      }
      if (targetRow === -1) {
        // Immediate neighbor spill check
        for (const sign of [-1, 1]) {
          const c2 = col + sign;
          if (c2 >= 0 && c2 < engine.cols) {
            for (let r = ROWS - 1; r >= 0; r--) {
              if (!engine.grid[r][c2]) {
                if (r === ROWS - 1 || engine.grid[r + 1][c2]) {
                  this.settle(c2, r, engine);
                  return;
                }
              }
            }
          }
        }
        // No space on top - ceiling overflow game over!
        engine.triggerGameOver('CEILING OVERFLOW: COLUMN PUSHED OUT OF BOUNDS!');
        this.dead = true;
        return;
      }
      this.settle(col, targetRow, engine);
      return;
    }
    if (this.y + BS >= GROUND_Y) {
      const col = clamp(Math.round(this.x / BS), 0, engine.cols - 1);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!engine.grid[r][col]) {
          this.settle(col, r, engine);
          return;
        }
      }
      engine.triggerGameOver('CEILING BREACHED: COLUMN REACHED GROUND!');
      this.dead = true;
    }
  }

  settle(col: number, row: number, engine: GameEngine) {
    if (engine.grid[row][col]) {
      for (let r = row; r >= 0; r--) {
        if (!engine.grid[r][col]) {
          row = r;
          break;
        }
      }
    }
    if (engine.grid[row][col] || row < 0) {
      engine.triggerGameOver('CEILING OVERLOAD: CRITICAL DEFENSE FAILURE!');
      this.dead = true;
      return;
    }
    engine.grid[row][col] = {
      type: this.type,
      hp: this.hp,
      maxHP: this.maxHP,
      age: this.age,
      flash: 1,
      canvas: this.canvas,
    };
    this.dead = true;
    const px = col * BS + BS / 2;
    const py = PLAY_TOP + row * BS + BS;
    for (let i = 0; i < 6; i++) {
      engine.particles.push(
        new Particle(
          px + rnd(12, -12),
          py,
          rnd(90, -90),
          rnd(-30, -110),
          TYPES[this.type].part,
          2 + rnd(2),
          0.35 + rnd(0.35)
        )
      );
    }
    engine.flashes.push(new Flash(px, py, 22, 0.1, TYPES[this.type].spark));
    engine.addShake(0.9);
  }

  wouldCollide(x: number, y: number, engine: GameEngine) {
    const l = Math.floor(x / BS);
    const r2 = Math.floor((x + BS - 1) / BS);
    const t = Math.floor((y - PLAY_TOP) / BS);
    const b2 = Math.floor((y + BS - 1 - PLAY_TOP) / BS);
    if (b2 >= ROWS) return true;
    if (l < 0 || r2 >= engine.cols) return false;
    for (let rr = Math.max(0, t); rr <= Math.min(ROWS - 1, b2); rr++) {
      for (let cc = l; cc <= r2; cc++) {
        if (engine.grid[rr][cc]) return true;
      }
    }
    return false;
  }

  draw(g: CanvasRenderingContext2D) {
    g.save();
    g.translate(this.x + BS / 2, this.y + BS / 2);
    g.rotate(this.angle);
    g.shadowColor = TYPES[this.type].col;
    g.shadowBlur = 6;
    g.drawImage(this.canvas, -BS / 2, -BS / 2);
    g.shadowBlur = 0;
    g.restore();
  }
}

export class Projectile {
  public dead = false;
  public trail: { x: number; y: number }[] = [];
  public life = 1.1;
  public pastGround = false;
  public pierce: number = 0;
  public bounces: number = 0;
  public isSuper: boolean = false;
  public isBounce: boolean = false;
  public damage: number = 28;
  public color: string = '#8cf';

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    pierce: number,
    bounces: number,
    isSuper: boolean,
    isBounce: boolean,
    damage: number
  ) {
    this.pierce = pierce;
    this.bounces = bounces;
    this.isSuper = isSuper;
    this.isBounce = isBounce;
    this.damage = damage;
    if (isSuper) {
      this.color = '#ff00aa';
    } else if (isBounce) {
      this.color = '#00ff7f';
    } else {
      this.color = '#8cf';
    }
  }

  update(dt: number, engine: GameEngine) {
    const speed = Math.hypot(this.vx, this.vy);
    const steps = Math.max(1, Math.ceil((speed * dt) / 5));
    const sdt = dt / steps;

    for (let s = 0; s < steps; s++) {
      this.x += this.vx * sdt;
      this.y += this.vy * sdt;

      if (!this.pastGround && this.y < GROUND_Y - 4) {
        this.pastGround = true;
      }

      // Tactical side-wall ricochet
      if (this.isBounce && this.bounces > 0) {
        if (this.x < 4) {
          this.x = 4;
          this.vx = Math.abs(this.vx);
          this.damage *= 1.15; // Kinetic acceleration!
          this.bounces--;
          sound.bounce();
          engine.rings.push(new Ring(this.x, this.y, '#00ff7f', 36));
        } else if (this.x > engine.worldW - 4) {
          this.x = engine.worldW - 4;
          this.vx = -Math.abs(this.vx);
          this.damage *= 1.15;
          this.bounces--;
          sound.bounce();
          engine.rings.push(new Ring(this.x, this.y, '#00ff7f', 36));
        }
      }

      // Power-up crate pickup check
      for (const drop of engine.powerUpDrops) {
        if (drop.dead) continue;
        const d = Math.hypot(this.x - drop.x, this.y - drop.y);
        if (d < drop.radius + 12) {
          drop.dead = true;
          engine.activatePowerUp(drop.type);
          if (this.pierce <= 0) {
            this.dead = true;
            return;
          }
          this.pierce--;
        }
      }

      // Boss collision check
      if (engine.activeBoss) {
        const boss = engine.activeBoss;
        if (
          this.x >= boss.x &&
          this.x <= boss.x + boss.w &&
          this.y >= boss.y &&
          this.y <= boss.y + boss.h
        ) {
          engine.damageBoss(boss, this.x, this.y, this.isSuper, this.damage);
          if (this.isSuper) {
            engine.rings.push(new Ring(this.x, this.y, '#ff00aa', 30));
          }
          if (this.pierce > 0) {
            this.pierce--;
            this.damage *= this.isSuper ? 0.95 : 0.88;
          } else {
            this.dead = true;
            return;
          }
        }
      }

      // Mid-air falling block collision check
      for (let fi = 0; fi < engine.falling.length; fi++) {
        const fb = engine.falling[fi];
        if (fb.dead) continue;
        if (
          this.x >= fb.x &&
          this.x <= fb.x + BS &&
          this.y >= fb.y &&
          this.y <= fb.y + BS
        ) {
          fb.hp -= this.damage;
          fb.vy *= 0.5;
          engine.flashes.push(new Flash(this.x, this.y, 22, 0.12, this.isSuper ? '#ff00aa' : TYPES[fb.type].spark));
          sound.hit();
          if (this.isSuper) {
            engine.rings.push(new Ring(this.x, this.y, '#ff00aa', 26));
          }
          if (fb.hp <= 0) {
            fb.dead = true;
            engine.createBlockExplosion(this.x, this.y, fb.type);
            engine.awardXP(TYPES[fb.type].xp * 1.2, this.x, this.y);
          }
          if (this.pierce > 0) {
            this.pierce--;
            this.damage *= this.isSuper ? 0.95 : 0.88;
          } else {
            this.dead = true;
            return;
          }
        }
      }

      // Grid collision check
      const hit = this.checkHit(engine);
      if (hit) {
        this.onHit(hit, engine);
        if (this.isSuper) {
          engine.rings.push(new Ring(this.x, this.y, '#ff00aa', 28));
        }
        if (this.pierce > 0) {
          this.pierce--;
          this.damage *= this.isSuper ? 0.95 : 0.88;
        } else {
          this.dead = true;
          return;
        }
      }

      if (
        this.x < -40 ||
        this.x > engine.worldW + 40 ||
        this.y < -40 ||
        this.y > PX_H + 40
      ) {
        this.dead = true;
        return;
      }
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  checkHit(engine: GameEngine) {
    if (this.pastGround && this.y >= GROUND_Y) {
      return { kind: 'ground', x: this.x, y: GROUND_Y, col: -1, row: -1, block: null };
    }
    const c = Math.floor(this.x / BS);
    const r = Math.floor((this.y - PLAY_TOP) / BS);
    if (r < 0 || r >= ROWS || c < 0 || c >= engine.cols) return null;
    const b = engine.grid[r][c];
    if (b) return { kind: 'block', col: c, row: r, block: b, x: this.x, y: this.y };
    return null;
  }

  onHit(
    hit: { kind: string; x: number; y: number; col: number; row: number; block: GridCell | null },
    engine: GameEngine
  ) {
    if (hit.kind === 'ground') {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + rnd(1.2, -1.2);
        const sp = 80 + rnd(160);
        engine.particles.push(
          new Particle(hit.x, hit.y, Math.cos(a) * sp, Math.sin(a) * sp, '#ffd24a', 2 + rnd(2), 0.2 + rnd(0.25), 1400)
        );
      }
      engine.flashes.push(new Flash(hit.x, hit.y, 18, 0.1, '#ffd24a'));
      engine.addShake(0.6);
      return;
    }

    const b = hit.block;
    if (!b) return;

    const hitDamage = this.damage;

    const localX = hit.x - hit.col * BS;
    const localY = hit.y - (PLAY_TOP + hit.row * BS);
    punchBlock(b, localX, localY, (this.isSuper ? 8 : 5) + rnd(2));

    b.hp -= hitDamage;
    b.flash = 0.8;
    b.age = Math.max(0, b.age - 0.8);

    if (this.isSuper) {
      sound.superPierce();
      engine.flashes.push(new Flash(hit.x, hit.y, 28, 0.14, '#ff00aa'));
      engine.rings.push(new Ring(hit.x, hit.y, '#ff00aa', 32));
    } else if (this.isBounce) {
      sound.bounce();
      engine.flashes.push(new Flash(hit.x, hit.y, 24, 0.12, '#00ff7f'));
      engine.rings.push(new Ring(hit.x, hit.y, '#00ff7f', 28));
      // Kinetic shockwave cracks adjacent blocks
      const neighbors = [
        [hit.col - 1, hit.row],
        [hit.col + 1, hit.row],
        [hit.col, hit.row - 1],
        [hit.col, hit.row + 1],
      ];
      for (const [nc, nr] of neighbors) {
        if (nc >= 0 && nc < engine.cols && nr >= 0 && nr < ROWS) {
          const nb = engine.grid[nr][nc];
          if (nb) {
            nb.hp -= hitDamage * 0.4;
            nb.flash = 0.6;
            if (nb.hp <= 0) engine.destroyQ.push({ col: nc, row: nr });
          }
        }
      }
    } else {
      sound.hit();
    }

    const T = TYPES[b.type];
    if (T) {
      for (let i = 0; i < (this.isSuper ? 10 : this.isBounce ? 8 : 5); i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 80 + rnd(240);
        engine.particles.push(
          new Particle(
            hit.x,
            hit.y,
            Math.cos(a) * sp,
            Math.sin(a) * sp - 40,
            this.isSuper ? '#ff00aa' : this.isBounce ? '#00ff7f' : Math.random() < 0.5 ? T.spark : T.part,
            1 + rnd(3.5),
            0.15 + rnd(0.35),
            900
          )
        );
      }
      engine.flashes.push(new Flash(hit.x, hit.y, 18, 0.1, T.spark));
    }

    engine.addShake(this.isSuper ? 1.6 : this.isBounce ? 1.2 : 0.8);
    engine.hitstop = Math.max(engine.hitstop, 0.012);

    engine.combo++;
    engine.comboTimer = 2.4;
    engine.checkComboMilestones();

    if (b.hp <= 0) {
      engine.destroyQ.push({ col: hit.col, row: hit.row });
    }
  }

  draw(g: CanvasRenderingContext2D) {
    // Projectile trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (i / this.trail.length) * 0.7;
      const s = (this.isSuper ? 4.5 : this.isBounce ? 3.8 : 2.8) * (i / this.trail.length) + 1;
      g.globalAlpha = a;
      g.fillStyle = this.color;
      g.beginPath();
      g.arc(t.x, t.y, s, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    // Glowing core - crisp & radiant
    const rad = this.isSuper ? 13 : this.isBounce ? 10 : 8;
    const grd = g.createRadialGradient(this.x, this.y, 0, this.x, this.y, rad);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.35, this.color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(this.x - rad, this.y - rad, rad * 2, rad * 2);

    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(this.x, this.y, this.isSuper ? 3.5 : this.isBounce ? 2.8 : 2.2, 0, Math.PI * 2);
    g.fill();
  }
}

export class GameEngine {
  public cols = START_COLS;
  public worldW = START_COLS * BS;
  public zoom = 1;
  public camOffsetScreenX = PX_W / 2;
  public camOffsetScreenY = PX_H - GROUND_MARGIN;

  public grid: (GridCell | null)[][] = [];
  public falling: FallingBlock[] = [];
  public particles: Particle[] = [];
  public projectiles: Projectile[] = [];
  public floats: FloatText[] = [];
  public rings: Ring[] = [];
  public flashes: Flash[] = [];
  public bolts: Bolt[] = [];
  public powerUpDrops: PowerUpDrop[] = [];
  public activePowerUps: Map<PowerUpType, { timeLeft: number; duration: number }> = new Map();

  public destroyQ: { col: number; row: number }[] = [];
  public explodeQ: { x: number; y: number; radius: number; damage: number }[] = [];

  public xp = 0;
  public totalXP = 0;
  public level = 1;
  public xpNext = 100;
  public combo = 0;
  public comboTimer = 0;
  public lastMilestone = 0;
  public gameTime = 0;
  public spawnTimer = 0.3;
  public nextBossAt = BOSS_DEFS[0].at;
  public shake = 0;
  public hitstop = 0;
  public flashWhite = 0;
  public flashColor = '#ffffff';
  public damage = 28;
  public fireRate = 0.12;
  public gameOver = false;
  public bestHeight = 0;
  public cannonRecoil = 0;
  public cannonFlash = 0;
  public hazardPulse = 0;
  public dangerCountdown: number | null = null;
  public dangerReason: string | null = null;
  private dangerAlarmTimer = 0;

  // New endgame mechanics: AI Drone companion, Goblin Column Spawner, Aegis Overdrive
  public aiDrone: AIDroneCompanion = new AIDroneCompanion();
  public goblins: GoblinEntity[] = [];
  public nextGoblinTime = 20;
  public aegisOverdrive = {
    active: false,
    duration: 8.0,
    timeLeft: 0,
    ceilingBoost: 160,
  };

  public activeBoss: BossEntity | null = null;
  public bossIndex = 0;
  private nextDropId = 1;
  private nextColTime = 25;

  public mouseScreenX = PX_W / 2;
  public mouseScreenY = 200;
  public mouseWorldX = (START_COLS * BS) / 2;
  public mouseWorldY = 200;
  public mouseDown = false;
  public shootCD = 0;

  // Stars and cosmic motes
  public stars: { x: number; y: number; depth: number; size: number; phase: number; hue: string }[] = [];
  public motes: { x: number; y: number; vx: number; vy: number; size: number; life: number; hue: string }[] = [];

  constructor() {
    this.initCosmos();
    this.reset();
  }

  private initCosmos() {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * PX_W,
        y: Math.random() * PX_H,
        depth: 0.15 + Math.random() * 0.85,
        size: Math.random() < 0.85 ? 1 : 2,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.15 ? 'warm' : Math.random() < 0.2 ? 'cool' : 'white',
      });
    }
    this.motes = [];
    for (let i = 0; i < 40; i++) {
      this.motes.push({
        x: Math.random() * PX_W,
        y: Math.random() * PX_H,
        vx: rnd(8, -8),
        vy: -6 - Math.random() * 14,
        size: 1 + Math.random(),
        life: 3 + Math.random() * 6,
        hue: Math.random() < 0.5 ? '#4ad4ff' : '#a080ff',
      });
    }
  }

  public reset() {
    this.cols = START_COLS;
    this.worldW = this.cols * BS;
    this.zoom = 1;
    this.grid = Array.from({ length: ROWS }, () => Array(this.cols).fill(null));
    this.falling = [];
    this.particles = [];
    this.projectiles = [];
    this.floats = [];
    this.rings = [];
    this.flashes = [];
    this.bolts = [];
    this.powerUpDrops = [];
    this.activePowerUps.clear();
    this.destroyQ = [];
    this.explodeQ = [];

    this.xp = 0;
    this.totalXP = 0;
    this.level = 1;
    this.xpNext = 100;
    this.combo = 0;
    this.comboTimer = 0;
    this.lastMilestone = 0;
    this.gameTime = 0;
    this.spawnTimer = 0.25;
    this.nextBossAt = BOSS_DEFS[0].at;
    this.shake = 0;
    this.hitstop = 0;
    this.flashWhite = 0;
    this.flashColor = '#ffffff';
    this.damage = 44;
    this.fireRate = 0.11;
    this.gameOver = false;
    this.bestHeight = 0;
    this.cannonRecoil = 0;
    this.cannonFlash = 0;
    this.hazardPulse = 0;
    this.dangerCountdown = null;
    this.dangerReason = null;
    this.dangerAlarmTimer = 0;
    this.activeBoss = null;
    this.bossIndex = 0;
    this.nextColTime = 25;
    this.aiDrone = new AIDroneCompanion();
    this.goblins = [];
    this.nextGoblinTime = 18;
    this.aegisOverdrive = {
      active: false,
      duration: 8.0,
      timeLeft: 0,
      ceilingBoost: 160,
    };
    this.updateCamera();
  }

  public updateCamera() {
    this.worldW = this.cols * BS;
    this.zoom = PX_W / this.worldW;
    this.camOffsetScreenX = PX_W / 2;
    this.camOffsetScreenY = PX_H - GROUND_MARGIN;
  }

  public screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - this.camOffsetScreenX) / this.zoom + this.worldW / 2,
      y: (sy - this.camOffsetScreenY) / this.zoom + GROUND_Y,
    };
  }

  public addShake(_n: number) {
    // Camera shake disabled per user request for rock-solid screen stability and zero vibrations
    this.shake = 0;
  }

  public cannonWorldX() {
    return this.worldW / 2;
  }

  public cannonWorldY() {
    return GROUND_Y + 20;
  }

  // Multi-shot count based on level evolution + active power-ups
  public getMultiShotCount(): number {
    let base = 1;
    if (this.level >= 10) base = 4; // Quad heavy at lvl 10
    else if (this.level >= 6) base = 3; // Triple spread at lvl 6
    else if (this.level >= 3) base = 2; // Dual cannon at lvl 3

    if (this.activePowerUps.has('multi_shot')) {
      base += 2; // +2 tactical extra cannons when spread power-up active!
    }
    return Math.min(6, base);
  }

  public isPowerUpActive(type: PowerUpType): boolean {
    return this.activePowerUps.has(type);
  }

  public activatePowerUp(type: PowerUpType) {
    const cfg = POWER_UP_CONFIGS[type];
    sound.powerUp();

    this.flashes.push(new Flash(this.cannonWorldX(), this.cannonWorldY() - 40, 110, 0.4, cfg.color));
    this.rings.push(new Ring(this.cannonWorldX(), this.cannonWorldY() - 40, cfg.color, 180));
    this.floats.push(new FloatText(this.cannonWorldX(), this.cannonWorldY() - 80, `[ ${cfg.label} ]`, cfg.color, 17));

    if (type === 'nuke') {
      this.triggerNuke();
      return;
    }

    this.activePowerUps.set(type, {
      timeLeft: cfg.duration,
      duration: cfg.duration,
    });
  }

  private triggerNuke() {
    sound.epicNuke();
    this.addShake(16);
    this.flashWhite = 0.95;
    this.flashColor = '#ff3344';

    const cx = this.cannonWorldX();
    const cy = GROUND_Y - 80;

    // Massive shockwave visuals
    this.rings.push(new Ring(cx, cy, '#ff3344', 320));
    this.rings.push(new Ring(cx, cy, '#ffd040', 240));
    this.rings.push(new Ring(cx, cy, '#ffffff', 160));
    this.flashes.push(new Flash(cx, cy, 260, 0.6, '#ff4444'));

    // Fiery debris burst
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + rnd(450);
      this.particles.push(
        new Particle(
          cx,
          cy,
          Math.cos(a) * sp,
          Math.sin(a) * sp - 80,
          Math.random() < 0.4 ? '#ff3344' : Math.random() < 0.7 ? '#ffd040' : '#ffffff',
          2 + rnd(4),
          0.4 + rnd(0.6),
          800
        )
      );
    }

    // Completely obliterate bottom 4 rows of blocks
    for (let r = ROWS - 4; r < ROWS; r++) {
      for (let c = 0; c < this.cols; c++) {
        const b = this.grid[r][c];
        if (b) {
          b.hp = 0;
          this.destroyQ.push({ col: c, row: r });
        }
      }
    }

    // Also vaporize any low falling blocks
    for (let i = this.falling.length - 1; i >= 0; i--) {
      if (this.falling[i].y >= GROUND_Y - 5 * BS) {
        this.createBlockExplosion(this.falling[i].x + BS / 2, this.falling[i].y + BS / 2, this.falling[i].type);
        this.falling[i].dead = true;
      }
    }

    if (this.activeBoss) {
      this.activeBoss.hp -= 2500;
      this.activeBoss.flash = 1;
      this.floats.push(
        new FloatText(this.activeBoss.x + this.activeBoss.w / 2, this.activeBoss.y, '-2,500 SEISMIC NUKE!', '#ff3344', 18)
      );
      if (this.activeBoss.hp <= 0) {
        this.killBoss(this.activeBoss);
      }
    }

    this.floats.push(new FloatText(cx, cy - 100, 'TACTICAL NUKE DETONATED!', '#ff3344', 18));
  }

  public awardXP(amount: number, x: number, y: number) {
    let finalXP = amount;
    if (this.activePowerUps.has('double_xp')) {
      finalXP *= 2;
    }
    // Combo multiplier capped at +100% (+0.02 per combo count up to 50)
    const comboBonus = Math.min(1.0, this.combo * 0.02);
    const gained = Math.floor(finalXP * (1 + comboBonus));
    this.addXP(gained);
    this.floats.push(new FloatText(x, y - 6, `+${gained} XP`, this.activePowerUps.has('double_xp') ? '#ffd700' : '#8cf', 11));
  }

  public addXP(n: number) {
    this.xp += n;
    this.totalXP += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Math.floor(this.xpNext * 1.45 + 90);
      this.onLevelUp();
    }
  }

  private onLevelUp() {
    sound.levelUp();
    this.addShake(4);
    this.flashWhite = Math.max(this.flashWhite, 0.35);
    this.flashColor = '#ffd24a';

    const cx = this.cannonWorldX();
    const cy = this.cannonWorldY() - 40;
    this.rings.push(new Ring(cx, cy, '#ffd24a', 160));
    this.flashes.push(new Flash(cx, cy, 90, 0.4, '#ffd24a'));

    let perkMessage = `LEVEL ${this.level} REACHED!`;
    if (this.level === 3) perkMessage = 'EVOLUTION: TWIN CANNON (2X SHOT)!';
    if (this.level === 5) {
      perkMessage = 'TACTICAL AI UNLOCKED: HOMING MISSILE DRONE ONLINE!';
      this.activateAIDrone();
    } else if (this.level > 5 && this.aiDrone.active) {
      this.aiDrone.upgrade();
      this.floats.push(new FloatText(cx, cy - 90, `AI DRONE OVERCLOCKED (DPS: ${this.aiDrone.dps})!`, '#00e5ff', 13));
    }
    if (this.level === 6) perkMessage = 'EVOLUTION: TRIPLE SPREAD (3X SHOT)!';
    if (this.level === 10) perkMessage = 'EVOLUTION: HEAVY QUAD (4X SHOT)!';

    this.floats.push(new FloatText(cx, cy - 70, perkMessage, '#ffd24a', 15));

    this.damage += 6;
    this.fireRate = Math.max(0.055, this.fireRate * 0.96);
  }

  public triggerComboMilestone(m: ComboMilestone) {
    const cx = this.cannonWorldX();
    const cy = this.cannonWorldY() - 60;
    this.floats.push(new FloatText(cx, cy - 30, m.effect.toUpperCase(), m.color, 14));
    this.flashWhite = Math.max(this.flashWhite, 0.2);
    this.flashColor = m.color;

    if (m.effect === 'chain') {
      const targets: [number, number][] = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c]) targets.push([c, r]);
        }
      }
      for (let i = 0; i < Math.min(3, targets.length); i++) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        const b = this.grid[t[1]][t[0]];
        if (!b) continue;
        const bx = t[0] * BS + BS / 2;
        const by = PLAY_TOP + t[1] * BS + BS / 2;
        this.bolts.push(new Bolt(cx, cy, bx, by, m.color, 0.25));
        b.hp -= 25;
        b.flash = 0.8;
        if (b.hp <= 0) this.destroyQ.push({ col: t[0], row: t[1] });
      }
      this.addShake(1.5);
    }
    if (m.effect === 'fire') {
      for (let r = ROWS - 2; r < ROWS; r++) {
        for (let c = Math.max(0, Math.floor(this.cols / 2) - 2); c <= Math.min(this.cols - 1, Math.floor(this.cols / 2) + 2); c++) {
          const b = this.grid[r][c];
          if (!b) continue;
          b.hp -= 35;
          b.flash = 0.8;
          punchBlock(b, BS / 2, BS / 2, 6);
          if (b.hp <= 0) this.destroyQ.push({ col: c, row: r });
        }
      }
      this.addShake(2);
    }
    if (m.effect === 'storm') {
      for (let i = 0; i < 3; i++) {
        const tx = rnd(this.worldW * 0.9, this.worldW * 0.1);
        const ty = rnd(GROUND_Y - 30, PLAY_TOP + 30);
        this.bolts.push(new Bolt(tx, PLAY_TOP - 10, tx, ty, m.color, 0.25));
        this.flashes.push(new Flash(tx, ty, 30, 0.15, m.color));
        const c = Math.floor(tx / BS);
        const r = Math.floor((ty - PLAY_TOP) / BS);
        if (c >= 0 && c < this.cols && r >= 0 && r < ROWS) {
          const b = this.grid[r][c];
          if (b) {
            b.hp -= 35;
            b.flash = 0.8;
            if (b.hp <= 0) this.destroyQ.push({ col: c, row: r });
          }
        }
      }
      this.addShake(2.5);
    }
    if (m.effect === 'nova') {
      for (let r = ROWS - 4; r < ROWS; r++) {
        for (let c = 0; c < this.cols; c++) {
          const b = this.grid[r][c];
          if (!b) continue;
          b.hp -= 25;
          b.flash = 0.8;
          if (b.hp <= 0) this.destroyQ.push({ col: c, row: r });
        }
      }
      this.rings.push(new Ring(cx, cy, m.color, 240));
      this.addShake(3.5);
    }
    if (m.effect === 'supernova') {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < this.cols; c++) {
          const b = this.grid[r][c];
          if (!b) continue;
          b.hp -= 60;
          b.flash = 0.8;
          punchBlock(b, BS / 2, BS / 2, 8);
          if (b.hp <= 0) this.destroyQ.push({ col: c, row: r });
        }
      }
      if (this.activeBoss) this.activeBoss.hp -= 600;
      this.addShake(5);
      this.flashWhite = 0.4;
      this.flashColor = m.color;
      this.hitstop = 0.08;
    }
    if (m.effect === 'aegis_overdrive') {
      this.triggerAegisOverdrive();
    }
  }

  public activateAIDrone() {
    this.aiDrone.active = true;
    sound.missileLaunch();
    const cx = this.cannonWorldX();
    const cy = this.cannonWorldY() - 40;
    this.rings.push(new Ring(cx, cy, '#00e5ff', 240));
    this.flashes.push(new Flash(cx, cy, 140, 0.5, '#00e5ff'));
    this.flashWhite = 0.35;
    this.flashColor = '#00e5ff';
  }

  public triggerAegisOverdrive() {
    sound.aegisShield();
    this.aegisOverdrive.active = true;
    this.aegisOverdrive.timeLeft = this.aegisOverdrive.duration;
    const cx = this.cannonWorldX();
    const cy = this.cannonWorldY() - 60;
    this.rings.push(new Ring(cx, cy, '#00ffff', 360));
    this.rings.push(new Ring(cx, cy, '#ffffff', 260));
    this.flashes.push(new Flash(cx, cy, 260, 0.7, '#00ffff'));
    this.flashWhite = 0.55;
    this.flashColor = '#00ffff';
    this.floats.push(new FloatText(cx, cy - 80, 'AEGIS OVERDRIVE ACTIVE! CEILING EXPANDED & INVULNERABLE!', '#00ffff', 16));

    // Spawn massive deluge of bonus blocks
    const types: BlockType[] = ['gold', 'volatile', 'crystal', 'ice', 'wood'];
    for (let i = 0; i < 28; i++) {
      const c = Math.floor(Math.random() * this.cols);
      const bx = c * BS;
      const by = PLAY_TOP - 160 - Math.random() * 200;
      const t = types[Math.floor(Math.random() * types.length)];
      this.falling.push(new FallingBlock(t, bx, by, rnd(30, -30), rnd(160, 90)));
    }
  }

  public checkComboMilestones() {
    for (const m of COMBO_MILESTONES) {
      if (this.combo >= m.at && this.lastMilestone < m.at) {
        this.lastMilestone = m.at;
        this.triggerComboMilestone(m);
      }
    }
  }

  public destroyBlock(col: number, row: number) {
    if (col < 0 || col >= this.cols || row < 0 || row >= ROWS) return;
    const b = this.grid[row][col];
    if (!b) return;
    const T = TYPES[b.type];
    if (!T) return;

    sound.destroy();
    const cx = col * BS + BS / 2;
    const cy = PLAY_TOP + row * BS + BS / 2;

    this.createBlockExplosion(cx, cy, b.type);

    this.awardXP(T.xp * (1 + b.age * 0.05), cx, cy);

    this.combo++;
    this.comboTimer = 2.4;

    // Power-up crate drop chance: generous and rewarding
    const dropRate = b.type === 'gold' ? 0.22 : b.type === 'crystal' ? 0.18 : b.type === 'metal' ? 0.12 : b.type === 'volatile' ? 0.10 : 0.06;
    if (Math.random() < dropRate) {
      this.spawnPowerUpDrop(cx, cy);
    }

    if (b.type === 'crystal') this.shardBurst(col, row);

    this.grid[row][col] = null;

    if (T.explosive) {
      sound.explode();
      this.explodeQ.push({ x: cx, y: cy, radius: 130, damage: 95 });
    }

    this.checkComboMilestones();
  }

  public createBlockExplosion(cx: number, cy: number, type: BlockType) {
    const T = TYPES[type];
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + rnd(340);
      this.particles.push(
        new Particle(
          cx,
          cy,
          Math.cos(a) * sp,
          Math.sin(a) * sp - 70,
          Math.random() < 0.5 ? T.col : T.part,
          3 + rnd(4),
          0.5 + rnd(0.9),
          1050
        )
      );
    }
    this.flashes.push(new Flash(cx, cy, 55, 0.2, T.spark));
    this.rings.push(new Ring(cx, cy, T.spark, 55));
    this.addShake(2.5);
    this.hitstop = Math.max(this.hitstop, 0.028);
  }

  private spawnPowerUpDrop(x: number, y: number) {
    const pool: PowerUpType[] = ['double_xp', 'multi_shot', 'bounce', 'super_pierce', 'rapid_fire', 'nuke'];
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    this.powerUpDrops.push({
      id: this.nextDropId++,
      type: chosen,
      x,
      y,
      vx: rnd(40, -40),
      vy: -120, // pops upward first
      radius: 14,
      age: 0,
      dead: false,
    });
  }

  public shardBurst(col: number, row: number) {
    const cx = col * BS + BS / 2;
    const cy = PLAY_TOP + row * BS + BS / 2;
    const neighbors = [
      [col - 1, row],
      [col + 1, row],
      [col, row - 1],
      [col, row + 1],
    ];
    for (const [c, r] of neighbors) {
      if (c < 0 || c >= this.cols || r < 0 || r >= ROWS) continue;
      const b = this.grid[r][c];
      if (!b) continue;
      this.bolts.push(new Bolt(cx, cy, c * BS + BS / 2, PLAY_TOP + r * BS + BS / 2, '#d8b0ff', 0.3));
      b.hp -= 30;
      b.flash = 1;
      if (b.hp <= 0) this.destroyQ.push({ col: c, row: r });
    }
  }

  public explode(x: number, y: number, radius: number, damage: number) {
    for (let i = 0; i < 45; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + rnd(480);
      const c = Math.random() < 0.4 ? '#ffd24a' : Math.random() < 0.5 ? '#ff8020' : '#ff3030';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 70, c, 3 + rnd(5), 0.5 + rnd(0.9), 750)
      );
    }
    this.rings.push(new Ring(x, y, '#ffaa44', radius * 1.4));
    this.rings.push(new Ring(x, y, '#ffffff', radius * 0.9));
    this.flashes.push(new Flash(x, y, radius * 1.7, 0.3, '#ffaa44'));
    this.addShake(4.5);
    this.hitstop = Math.max(this.hitstop, 0.05);
    this.flashWhite = Math.max(this.flashWhite, 0.2);
    this.flashColor = '#ffaa44';

    const cRad = Math.ceil(radius / BS) + 1;
    const cc = Math.floor(x / BS);
    const cr = Math.floor((y - PLAY_TOP) / BS);
    for (let dr = -cRad; dr <= cRad; dr++) {
      for (let dc = -cRad; dc <= cRad; dc++) {
        const r = cr + dr;
        const c = cc + dc;
        if (r < 0 || r >= ROWS || c < 0 || c >= this.cols) continue;
        const b = this.grid[r][c];
        if (!b) continue;
        const bx = c * BS + BS / 2;
        const by = PLAY_TOP + r * BS + BS / 2;
        const d = Math.hypot(bx - x, by - y);
        if (d < radius + BS / 2) {
          const dmg = damage * (1 - d / (radius + BS / 2));
          punchBlock(b, BS / 2, BS / 2, 9);
          b.hp -= dmg;
          b.flash = 1;
          if (b.hp <= 0) this.destroyQ.push({ col: c, row: r });
        }
      }
    }
  }

  public processQueues() {
    let iter = 0;
    while ((this.destroyQ.length || this.explodeQ.length) && iter < 60) {
      while (this.destroyQ.length) {
        const d = this.destroyQ.shift();
        if (d && d.row >= 0 && d.row < ROWS && d.col >= 0 && d.col < this.cols) {
          const cell = this.grid[d.row][d.col];
          if (cell) this.destroyBlock(d.col, d.row);
        }
      }
      while (this.explodeQ.length) {
        const e = this.explodeQ.shift();
        if (e) this.explode(e.x, e.y, e.radius, e.damage);
      }
      iter++;
    }
    this.destroyQ.length = 0;
    this.explodeQ.length = 0;
  }

  public updateSupport() {
    for (let r = ROWS - 2; r >= 0; r--) {
      for (let c = 0; c < this.cols; c++) {
        const b = this.grid[r][c];
        if (!b) continue;
        if (this.grid[r + 1][c]) continue;
        this.grid[r][c] = null;
        this.falling.push(new FallingBlock(b.type, c * BS, PLAY_TOP + r * BS, rnd(30, -30), 20, b.canvas));
      }
    }
  }

  public spawnBoss(def: BossDef) {
    sound.bossWarning();
    const startX = (this.worldW - def.w * BS) / 2;
    const startY = PLAY_TOP;

    const boss: BossEntity = {
      def,
      hp: def.hp,
      maxHp: def.hp,
      x: startX,
      y: startY,
      vx: 60, // Active movement!
      w: def.w * BS,
      h: def.h * BS,
      canvas: makeBossCanvas(def),
      flash: 0,
      attackTimer: 2.5,
      brickSalvoTimer: 1.5,
      age: 0,
      enraged: false,
    };

    this.activeBoss = boss;

    const cx = boss.x + boss.w / 2;
    const cy = boss.y + boss.h / 2;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + rnd(300);
      this.particles.push(
        new Particle(
          cx,
          cy,
          Math.cos(a) * sp,
          Math.sin(a) * sp,
          Math.random() < 0.5 ? def.accent : def.color,
          3 + rnd(4),
          0.6 + rnd(0.8),
          400
        )
      );
    }
    this.rings.push(new Ring(cx, cy, def.accent, 180));
    this.flashes.push(new Flash(cx, cy, 150, 0.5, def.accent));
    this.flashWhite = Math.max(this.flashWhite, 0.4);
    this.flashColor = def.accent;
    this.addShake(6);
    this.hitstop = Math.max(this.hitstop, 0.08);

    this.floats.push(new FloatText(cx, cy + boss.h + 20, `WARNING: ${def.name}`, def.accent, 18));
  }

  public damageBoss(boss: BossEntity, hitX: number, hitY: number, isSuper: boolean, rawDamage?: number) {
    const dmg = rawDamage !== undefined ? rawDamage : this.damage * (isSuper ? 1.5 : 1.0);
    boss.hp -= dmg;
    boss.flash = 1;
    this.addShake(isSuper ? 2.5 : 1.2);
    this.hitstop = Math.max(this.hitstop, 0.015);

    // Enrage check
    if (!boss.enraged && boss.hp <= boss.maxHp * 0.45) {
      boss.enraged = true;
      boss.vx *= 1.8;
      sound.bossRoar();
      this.floats.push(new FloatText(boss.x + boss.w / 2, boss.y - 20, 'ENRAGED!', '#ff0033', 18));
      this.flashWhite = 0.4;
      this.flashColor = '#ff0033';
      this.addShake(6);
    }

    for (let i = 0; i < (isSuper ? 16 : 8); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 100 + rnd(320);
      this.particles.push(
        new Particle(
          hitX,
          hitY,
          Math.cos(a) * sp,
          Math.sin(a) * sp - 50,
          Math.random() < 0.5 ? boss.def.accent : boss.def.color,
          2 + rnd(4),
          0.3 + rnd(0.6),
          900
        )
      );
    }

    this.combo++;
    this.comboTimer = 2.5;

    if (boss.hp <= 0) {
      this.killBoss(boss);
    }
  }

  public killBoss(boss: BossEntity) {
    sound.bossRoar();
    const def = boss.def;
    const cx = boss.x + boss.w / 2;
    const cy = boss.y + boss.h / 2;

    for (let i = 0; i < 140; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 150 + rnd(600);
      this.particles.push(
        new Particle(
          cx,
          cy,
          Math.cos(a) * sp,
          Math.sin(a) * sp - 100,
          Math.random() < 0.5 ? def.accent : def.color,
          3 + rnd(6),
          0.8 + rnd(1.2),
          700
        )
      );
    }
    this.rings.push(new Ring(cx, cy, def.accent, 280));
    this.rings.push(new Ring(cx, cy, '#ffffff', 180));
    this.flashes.push(new Flash(cx, cy, 280, 0.7, def.accent));
    this.flashWhite = 0.7;
    this.flashColor = def.accent;
    this.addShake(10);
    this.hitstop = 0.15;

    this.awardXP(def.xp, cx, cy);
    this.floats.push(new FloatText(cx, cy - 30, `${def.name} DEFEATED!`, def.accent, 18));

    // Boss drops 2 tactical power-up crates
    this.spawnPowerUpDrop(cx - 24, cy);
    this.spawnPowerUpDrop(cx + 24, cy);

    this.activeBoss = null;
    this.bossIndex++;
    if (this.bossIndex < BOSS_DEFS.length) {
      this.nextBossAt = this.gameTime + 32;
    } else {
      this.nextBossAt = Infinity;
    }
  }

  public bossLaunchBricks(boss: BossEntity, count: number) {
    const types: BlockType[] = ['wood', 'ice', 'volatile', 'stone', 'crystal'];
    for (let i = 0; i < count; i++) {
      const bx = boss.x + Math.random() * boss.w;
      const by = boss.y + boss.h + 2;
      const t = types[Math.floor(Math.random() * types.length)];
      const vx = rnd(140, -140);
      const vy = rnd(200, 100);
      this.falling.push(new FallingBlock(t, clamp(bx, 0, this.worldW - BS), by, vx, vy));
    }
    this.flashes.push(new Flash(boss.x + boss.w / 2, boss.y + boss.h, 45, 0.2, boss.def.accent));
    this.addShake(1.5);
  }

  public bossAttack(boss: BossEntity) {
    const def = boss.def;
    const cx = boss.x + boss.w / 2;
    const cy = boss.y + boss.h / 2;

    // Launch heavy brick barrage
    this.bossLaunchBricks(boss, boss.enraged ? 7 : 4);

    if (def.attack === 'explode' || def.attack === 'all') {
      sound.explode();
      for (let i = 0; i < 3; i++) {
        const tx = rnd(this.worldW * 0.8, this.worldW * 0.2);
        const ty = rnd(GROUND_Y - 40, GROUND_Y - 260);
        this.explodeQ.push({ x: tx, y: ty, radius: 80, damage: 35 });
      }
    }
    if (def.attack === 'freeze' || def.attack === 'all') {
      const r0 = Math.floor(rnd(ROWS - 3, ROWS - 7));
      for (let r = r0; r < r0 + 2 && r < ROWS; r++) {
        for (let c = 0; c < this.cols; c++) {
          const b = this.grid[r][c];
          if (b) {
            b.type = 'ice';
            b.canvas = makeBlockCanvasClone(SPRITES.ice);
            b.hp = TYPES.ice.hp;
            b.flash = 1;
          }
        }
      }
      for (let i = 0; i < 30; i++) {
        const c = Math.floor(Math.random() * this.cols);
        const r = Math.floor(Math.random() * (ROWS - r0)) + r0;
        const px = c * BS + BS / 2;
        const py = PLAY_TOP + r * BS + BS / 2;
        this.particles.push(
          new Particle(px, py, rnd(30, -30), -80 - rnd(60), '#e0f4ff', 2 + rnd(2), 0.5 + rnd(0.5), 300)
        );
      }
    }
    if (def.attack === 'pulse' || def.attack === 'all') {
      this.addShake(3.5);
      this.cannonRecoil = 1;
      this.rings.push(new Ring(cx, cy, def.accent, 220));
      for (let i = 0; i < 35; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 200 + rnd(300);
        this.particles.push(
          new Particle(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, def.accent, 2 + rnd(3), 0.5, 200)
        );
      }
    }
    if (def.attack === 'shard' || def.attack === 'all') {
      for (let i = 0; i < (boss.enraged ? 6 : 4); i++) {
        const c = Math.floor(Math.random() * this.cols);
        this.falling.push(new FallingBlock('volatile', c * BS, PLAY_TOP - BS - 4, rnd(40, -40), 90));
      }
    }
  }

  public checkBossSpawn() {
    if (this.activeBoss) return;
    if (this.bossIndex >= BOSS_DEFS.length) return;
    if (this.gameTime >= this.nextBossAt) {
      this.spawnBoss(BOSS_DEFS[this.bossIndex]);
    }
  }

  public fire() {
    const cwx = this.cannonWorldX();
    const cwy = this.cannonWorldY();
    const dx = this.mouseWorldX - cwx;
    const dy = this.mouseWorldY - cwy;
    const d = Math.hypot(dx, dy);
    if (d < 8) return;

    const nx = dx / d;
    const ny = dy / d;
    if (ny > 0.35) return; // Can't shoot directly into ground

    const multiCount = this.getMultiShotCount();
    const isSuper = this.isPowerUpActive('super_pierce');
    const isBounce = this.isPowerUpActive('bounce');
    const isRapid = this.isPowerUpActive('rapid_fire');
    const speed = isRapid ? 1520 : isSuper ? 1480 : 1320;

    // Pierce: Super pierce penetrates 5 blocks!
    const pierce = isSuper ? 5 : 0;
    // Bounces: bouncing perk gives 4 ricochets off sidewalls with kinetic boost!
    const bounces = isBounce ? 4 : 0;

    // Bullet damage calculation: full impact per bullet so multi-shot is devastating!
    const bulletDamage = this.damage * (isSuper ? 2.8 : isBounce ? 1.35 : 1.0);

    // Allow plenty of active projectiles on screen
    const MAX_PROJECTILES = 48;
    if (this.projectiles.length >= MAX_PROJECTILES) {
      this.projectiles.splice(0, this.projectiles.length - MAX_PROJECTILES + 1);
    }

    sound.shoot(isSuper, isBounce, multiCount);

    // Multi-shot firing spread
    const spreadAngle = 0.065; // radians
    const baseAngle = Math.atan2(ny, nx);

    const sparkColor = isSuper ? '#ff00aa' : isBounce ? '#00ff7f' : isRapid ? '#ffaa00' : '#ffd040';

    for (let i = 0; i < multiCount; i++) {
      let angle = baseAngle;
      if (multiCount > 1) {
        const offsetIndex = i - (multiCount - 1) / 2;
        angle += offsetIndex * spreadAngle;
      }
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const px = cwx + Math.cos(angle) * 36;
      const py = cwy + Math.sin(angle) * 36;

      const p = new Projectile(px, py, vx, vy, pierce, bounces, isSuper, isBounce, bulletDamage);
      this.projectiles.push(p);

      // Muzzle sparks
      for (let j = 0; j < 3; j++) {
        const a = angle + rnd(0.35, -0.35);
        const sp = 100 + rnd(160);
        this.particles.push(
          new Particle(
            px,
            py,
            Math.cos(a) * sp,
            Math.sin(a) * sp,
            sparkColor,
            2 + rnd(2.5),
            0.15 + rnd(0.18),
            200
          )
        );
      }
    }

    this.cannonRecoil = 0.8;
    this.cannonFlash = 0.8;
    this.addShake(0.5);
    this.flashes.push(new Flash(cwx + nx * 34, cwy + ny * 34, 20, 0.08, isSuper ? '#ff00aa' : '#8cf'));
  }

  public checkColumnGrow() {
    if (this.cols >= MAX_COLS) return;
    if (this.gameTime >= this.nextColTime) {
      this.addColumnPair();
      this.nextColTime += 25;
    }
  }

  public addColumnPair() {
    if (this.cols + 2 > MAX_COLS) return;
    for (let r = 0; r < ROWS; r++) {
      this.grid[r].unshift(null);
      this.grid[r].push(null);
    }
    this.cols += 2;
    for (const f of this.falling) f.x += BS;
    for (const p of this.particles) p.x += BS;
    for (const pr of this.projectiles) pr.x += BS;
    for (const fx of this.floats) fx.x += BS;
    for (const fx of this.rings) fx.x += BS;
    for (const fx of this.flashes) fx.x += BS;
    for (const d of this.powerUpDrops) d.x += BS;
    for (const b of this.bolts) {
      b.x1 += BS;
      b.x2 += BS;
      for (const p of b.pts) p.x += BS;
    }
    if (this.activeBoss) {
      this.activeBoss.x += BS;
    }
    this.updateCamera();
    this.flashes.push(new Flash(this.worldW / 2, GROUND_Y - 100, 200, 0.5, '#4ad4ff'));
    this.rings.push(new Ring(this.worldW / 2, GROUND_Y - 100, '#4ad4ff', 220));
  }

  public spawnTop() {
    const free: number[] = [];
    for (let c = 0; c < this.cols; c++) {
      if (!this.grid[0][c]) free.push(c);
    }
    if (free.length === 0) {
      this.triggerGameOver('CRITICAL CEILING OVERLOAD!');
      return;
    }

    // EXPONENTIAL SPAWN RATE & MULTI-BLOCK BURSTS:
    // Balanced curve that remains adrenaline-pumping but breakable
    const burstCount = Math.min(free.length, 1 + Math.floor(this.gameTime / 45));

    for (let b = 0; b < burstCount; b++) {
      if (free.length === 0) break;
      const idx = Math.floor(Math.random() * free.length);
      const col = free.splice(idx, 1)[0];
      const type = pickType();
      this.falling.push(new FallingBlock(type, col * BS, PLAY_TOP - BS - 4, rnd(20, -20), 110));
    }
  }

  public triggerGameOver(reason: string = 'CEILING BREACHED: CANNON CRUSHED!') {
    if (this.gameOver) return;
    if (this.aegisOverdrive.active) {
      // Invulnerable during Aegis Overdrive! Ceiling line holds!
      return;
    }
    this.gameOver = true;
    this.dangerReason = reason;
    sound.explode();
    this.addShake(12);
    this.hitstop = 0.2;
    this.flashWhite = 0.8;
    this.flashColor = '#ff2040';
  }

  public update(dt: number) {
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt *= 0.15;
    }
    this.gameTime += dt;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.lastMilestone = 0;
      }
    }

    // Update active power-up timers
    for (const [type, data] of this.activePowerUps.entries()) {
      data.timeLeft -= dt;
      if (data.timeLeft <= 0) {
        this.activePowerUps.delete(type);
      }
    }

    // Aegis Overdrive timer & bonus block pop effect
    if (this.aegisOverdrive.active) {
      this.aegisOverdrive.timeLeft -= dt;
      if (this.aegisOverdrive.timeLeft <= 0) {
        this.aegisOverdrive.active = false;
        this.aegisOverdrive.timeLeft = 0;
      } else {
        // Bonus block fountain during Aegis Overdrive!
        if (Math.random() < dt * 7) {
          const col = Math.floor(Math.random() * this.cols);
          const type = pickType();
          this.falling.push(
            new FallingBlock(type, col * BS, PLAY_TOP - 120 - Math.random() * 80, rnd(25, -25), rnd(180, 110))
          );
        }
      }
    }

    // AI Companion Drone logic & missile firing
    if (this.aiDrone.active) {
      this.aiDrone.update(dt, this);
    }

    // Goblin Column Spawner logic
    if (!this.gameOver) {
      this.nextGoblinTime -= dt;
      if (this.nextGoblinTime <= 0) {
        // Goblin spawns periodically (every 22-38s, faster if drone unlocked)
        const minGap = this.aiDrone.active ? 16 : 24;
        this.nextGoblinTime = minGap + Math.random() * 14;
        this.goblins.push(new GoblinEntity(this.worldW, this.cols));
      }
    }

    for (let i = this.goblins.length - 1; i >= 0; i--) {
      this.goblins[i].update(dt, this);
      if (this.goblins[i].dead) this.goblins.splice(i, 1);
    }

    this.checkColumnGrow();

    // SMOOTH & EXPONENTIAL CHALLENGE PROGRESSION:
    // Once AI drone is unlocked, block frequency and complexity scale exponentially
    if (!this.gameOver) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTop();
        let baseInterval = Math.max(0.10, 0.52 * Math.exp(-this.gameTime * 0.009));
        // Exponential difficulty ramp when AI drone is unlocked
        if (this.aiDrone.active) {
          const aiOverdriveFactor = Math.pow(1.15, Math.min(12, this.aiDrone.level));
          baseInterval = Math.max(0.06, baseInterval / aiOverdriveFactor);
        }
        if (this.aegisOverdrive.active) {
          // Rapid block onslaught bonus during Aegis Overdrive!
          baseInterval *= 0.35;
        }
        this.spawnTimer = baseInterval * (0.75 + Math.random() * 0.5);
      }
    }

    this.checkBossSpawn();

    // ACCELERATED FALL SPEED:
    // Scales dynamically and exponentially when AI drone is active
    let speedMult = 1.08 + Math.pow(this.gameTime / 45, 1.1) + this.level * 0.03;
    if (this.aiDrone.active) {
      speedMult *= 1.0 + 0.06 * Math.min(10, this.aiDrone.level);
    }

    for (let i = this.falling.length - 1; i >= 0; i--) {
      this.falling[i].update(dt, speedMult, this);
      if (this.falling[i].dead) this.falling.splice(i, 1);
    }

    // Firing logic
    if (this.mouseDown && !this.gameOver) {
      this.shootCD -= dt;
      if (this.shootCD <= 0) {
        this.fire();
        const currentFireRate = this.isPowerUpActive('rapid_fire') ? this.fireRate * 0.38 : this.fireRate;
        this.shootCD = currentFireRate;
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(dt, this);
      if (this.projectiles[i].dead) this.projectiles.splice(i, 1);
    }

    // Update power up drops
    for (let i = this.powerUpDrops.length - 1; i >= 0; i--) {
      const d = this.powerUpDrops[i];
      d.vy += 400 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.age += dt;

      // Bounce on floor
      if (d.y > GROUND_Y - d.radius) {
        d.y = GROUND_Y - d.radius;
        d.vy = -d.vy * 0.5;
        d.vx *= 0.8;
      }
      if (d.x < d.radius) {
        d.x = d.radius;
        d.vx = -d.vx;
      }
      if (d.x > this.worldW - d.radius) {
        d.x = this.worldW - d.radius;
        d.vx = -d.vx;
      }
      if (d.dead || d.age > 22) {
        this.powerUpDrops.splice(i, 1);
      }
    }

    this.processQueues();
    this.updateSupport();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < this.cols; c++) {
        const b = this.grid[r][c];
        if (!b) continue;
        b.age += dt;
        if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 6);
      }
    }

    // Active boss update: patrol back and forth & salvo bricks
    if (this.activeBoss) {
      const boss = this.activeBoss;
      boss.age += dt;
      boss.attackTimer -= dt;
      boss.brickSalvoTimer -= dt;

      // Smooth horizontal patrol movement
      boss.x += boss.vx * dt;
      if (boss.x <= 4) {
        boss.x = 4;
        boss.vx = Math.abs(boss.vx);
      } else if (boss.x + boss.w >= this.worldW - 4) {
        boss.x = this.worldW - 4 - boss.w;
        boss.vx = -Math.abs(boss.vx);
      }

      // Vertical weave when enraged
      if (boss.enraged) {
        boss.y = PLAY_TOP + Math.sin(boss.age * 3.5) * 18;
      }

      // Crushes any top-row blocks in its path
      const leftC = Math.floor(boss.x / BS);
      const rightC = Math.floor((boss.x + boss.w - 1) / BS);
      for (let c = leftC; c <= rightC; c++) {
        if (c >= 0 && c < this.cols && this.grid[0][c]) {
          this.destroyBlock(c, 0);
        }
      }

      // Continuous brick barrage timer
      if (boss.brickSalvoTimer <= 0) {
        boss.brickSalvoTimer = boss.enraged ? 1.0 : 1.8;
        this.bossLaunchBricks(boss, boss.enraged ? 4 : 2);
      }

      // Special attacks
      if (boss.attackTimer <= 0) {
        boss.attackTimer = boss.def.attackCd * (boss.enraged ? 0.65 : 1.0);
        this.bossAttack(boss);
      }

      if (boss.flash > 0) boss.flash = Math.max(0, boss.flash - dt * 5);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }
    if (this.particles.length > 2000) this.particles.splice(0, this.particles.length - 2000);

    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].update(dt);
      if (this.rings[i].dead) this.rings.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].update(dt);
      if (this.flashes[i].dead) this.flashes.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      this.floats[i].update(dt);
      if (this.floats[i].dead) this.floats.splice(i, 1);
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].update(dt);
      if (this.bolts[i].dead) this.bolts.splice(i, 1);
    }

    for (const m of this.motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;
      if (m.life <= 0 || m.y < -10) {
        m.x = Math.random() * PX_W;
        m.y = PX_H + 10;
        m.vy = -6 - Math.random() * 14;
        m.vx = rnd(8, -8);
        m.life = 3 + Math.random() * 6;
      }
    }

    if (this.cannonRecoil > 0) this.cannonRecoil = Math.max(0, this.cannonRecoil - dt * 7);
    if (this.cannonFlash > 0) this.cannonFlash = Math.max(0, this.cannonFlash - dt * 6);

    let filled = 0;
    for (let c = 0; c < this.cols; c++) if (this.grid[0][c]) filled++;
    this.hazardPulse = filled / this.cols;

    // Danger and Ceiling Breach logic
    if (this.aegisOverdrive.active) {
      // Aegis Overdrive holds the ceiling! No danger alarm or collapse!
      this.dangerCountdown = null;
      this.dangerReason = 'AEGIS OVERDRIVE ACTIVE: CEILING BARRIER INVULNERABLE!';
    } else if (filled > 0 && !this.gameOver) {
      this.dangerReason = `CEILING WARNING: ${filled}/${this.cols} BLOCKS REACHED TOP`;
      if (this.dangerCountdown === null) {
        this.dangerCountdown = 3.5;
        sound.dangerAlarm();
        this.dangerAlarmTimer = 0.55;
      } else {
        this.dangerCountdown -= dt;
        this.dangerAlarmTimer -= dt;
        if (this.dangerAlarmTimer <= 0) {
          sound.dangerAlarm();
          this.dangerAlarmTimer = 0.55;
        }
        const maxThreshold = Math.max(6, Math.floor(this.cols * 0.55));
        if (this.dangerCountdown <= 0 || filled >= maxThreshold) {
          this.triggerGameOver('CRITICAL CEILING COLLAPSE: CANNON CRUSHED!');
        }
      }
    } else {
      this.dangerCountdown = null;
      this.dangerReason = null;
    }

    this.shake *= Math.pow(0.0001, dt);
    if (this.shake < 0.05) this.shake = 0;
    if (this.flashWhite > 0) this.flashWhite = Math.max(0, this.flashWhite - dt * 3);
  }

  public getHUDData(): GameHUDData {
    let height = 0;
    for (let r = 0; r < ROWS; r++) {
      let has = false;
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
          has = true;
          break;
        }
      }
      if (has) {
        height = ROWS - r;
        break;
      }
    }
    if (height > this.bestHeight) this.bestHeight = height;

    const activeList: ActivePowerUp[] = [];
    for (const [type, data] of this.activePowerUps.entries()) {
      activeList.push({
        type,
        timeLeft: data.timeLeft,
        duration: data.duration,
      });
    }

    return {
      height,
      totalXP: this.totalXP,
      level: this.level,
      zoom: this.zoom,
      combo: this.combo,
      comboTimer: this.comboTimer,
      activePowerUps: activeList,
      boss: this.activeBoss
        ? {
            name: this.activeBoss.def.name,
            hp: Math.max(0, this.activeBoss.hp),
            maxHp: this.activeBoss.maxHp,
            accent: this.activeBoss.def.accent,
            color: this.activeBoss.def.color,
            enraged: this.activeBoss.enraged,
          }
        : null,
      bestHeight: this.bestHeight,
      gameOver: this.gameOver,
      cannonTier: this.getMultiShotCount(),
      bulletProperties: {
        multiCount: this.getMultiShotCount(),
        isSuperPiercing: this.isPowerUpActive('super_pierce'),
        isBouncing: this.isPowerUpActive('bounce'),
        isDoubleXP: this.isPowerUpActive('double_xp'),
        isRapid: this.isPowerUpActive('rapid_fire'),
      },
      dangerCountdown: this.dangerCountdown,
      dangerReason: this.dangerReason,
      aiDrone: {
        active: this.aiDrone.active,
        level: this.aiDrone.level,
        dps: this.aiDrone.dps,
        missileCount: this.aiDrone.missileCount,
      },
      goblinActive: this.goblins.length > 0,
      aegisOverdrive: {
        active: this.aegisOverdrive.active,
        duration: this.aegisOverdrive.duration,
        timeLeft: this.aegisOverdrive.timeLeft,
      },
    };
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Rock-solid camera (no screen shake / jitter)

    this.drawSky(ctx);
    this.drawMotes(ctx);
    this.drawWorld(ctx);
    this.drawCrosshair(ctx);

    ctx.restore();

    if (this.flashWhite > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashWhite;
      ctx.fillRect(0, 0, PX_W, PX_H);
      ctx.globalAlpha = 1;
    }

    this.drawScanlines(ctx);
    this.drawVignette(ctx);
    this.drawComboHUD(ctx);
  }

  private drawSky(g: CanvasRenderingContext2D) {
    const grad = g.createLinearGradient(0, 0, 0, PX_H);
    grad.addColorStop(0, '#05071a');
    grad.addColorStop(0.35, '#080a1e');
    grad.addColorStop(0.7, '#0a0716');
    grad.addColorStop(1, '#12060e');
    g.fillStyle = grad;
    g.fillRect(0, 0, PX_W, PX_H);

    const t = this.gameTime * 0.15;
    const blobs = [
      { x: PX_W * 0.25 + Math.sin(t * 0.7) * 30, y: PX_H * 0.3, r: 180, c: 'rgba(80,40,180,0.14)' },
      { x: PX_W * 0.75 + Math.cos(t * 0.9) * 30, y: PX_H * 0.55, r: 200, c: 'rgba(200,40,120,0.10)' },
      { x: PX_W * 0.5 + Math.sin(t * 1.1) * 20, y: PX_H * 0.15, r: 150, c: 'rgba(40,140,220,0.12)' },
    ];
    for (const b of blobs) {
      const grd = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grd.addColorStop(0, b.c);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }

    const scroll = this.gameTime * 8;
    for (const s of this.stars) {
      const y = ((s.y + scroll * s.depth) % (PX_H + 40)) - 20;
      const a = 0.35 + 0.65 * s.depth;
      const twinkle = 0.7 + 0.3 * Math.sin(this.gameTime * 2 + s.phase);
      g.globalAlpha = a * twinkle;
      if (s.hue === 'warm') g.fillStyle = '#ffd8a8';
      else if (s.hue === 'cool') g.fillStyle = '#a8d8ff';
      else g.fillStyle = '#ffffff';
      g.fillRect(s.x, y, s.size, s.size);
    }
    g.globalAlpha = 1;

    const groundScreenY = this.camOffsetScreenY;
    const hg = g.createLinearGradient(0, groundScreenY - 130, 0, groundScreenY);
    hg.addColorStop(0, 'rgba(80,140,220,0)');
    hg.addColorStop(1, 'rgba(60,140,220,0.2)');
    g.fillStyle = hg;
    g.fillRect(0, groundScreenY - 130, PX_W, 130);
  }

  private drawMotes(g: CanvasRenderingContext2D) {
    for (const m of this.motes) {
      const a = Math.min(1, m.life / 2) * 0.7;
      g.globalAlpha = a;
      g.fillStyle = m.hue;
      g.fillRect(m.x, m.y, m.size, m.size);
    }
    g.globalAlpha = 1;
  }

  private drawWorld(g: CanvasRenderingContext2D) {
    g.save();
    g.translate(this.camOffsetScreenX, this.camOffsetScreenY);
    g.scale(this.zoom, this.zoom);
    g.translate(-this.worldW / 2, -GROUND_Y);

    // Background grid
    g.strokeStyle = 'rgba(80,140,220,0.07)';
    g.lineWidth = 1 / this.zoom;
    for (let r = 0; r <= ROWS; r++) {
      const y = PLAY_TOP + r * BS + 0.5;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(this.worldW, y);
      g.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = c * BS + 0.5;
      g.beginPath();
      g.moveTo(x, PLAY_TOP);
      g.lineTo(x, GROUND_Y);
      g.stroke();
    }

    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(-2, PLAY_TOP, 2, ROWS * BS);
    g.fillRect(this.worldW, PLAY_TOP, 2, ROWS * BS);

    // Grid Blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < this.cols; c++) {
        const b = this.grid[r][c];
        if (!b) continue;
        const x = c * BS;
        const y = PLAY_TOP + r * BS;
        g.drawImage(b.canvas, x, y);
        if (b.age > 5) {
          const pulse = 0.5 + 0.5 * Math.sin(this.gameTime * 4 + r + c);
          const alpha = Math.min(0.3, (b.age - 5) * 0.02) * pulse;
          g.fillStyle = `rgba(255,60,60,${alpha})`;
          g.fillRect(x, y, BS, BS);
        }
        if (b.flash > 0) {
          g.fillStyle = `rgba(255,255,255,${b.flash * 0.7})`;
          g.fillRect(x, y, BS, BS);
        }
      }
    }

    // Power-up drops
    for (const drop of this.powerUpDrops) {
      const cfg = POWER_UP_CONFIGS[drop.type];
      const pulse = 0.7 + 0.3 * Math.sin(drop.age * 8);

      g.save();
      g.translate(drop.x, drop.y);

      // Glow halo
      const hg = g.createRadialGradient(0, 0, 2, 0, 0, drop.radius * 1.8);
      hg.addColorStop(0, cfg.glow);
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hg;
      g.fillRect(-drop.radius * 2, -drop.radius * 2, drop.radius * 4, drop.radius * 4);

      // Badge container
      g.fillStyle = '#0a1018';
      g.beginPath();
      g.arc(0, 0, drop.radius, 0, Math.PI * 2);
      g.fill();

      g.strokeStyle = cfg.color;
      g.lineWidth = 2;
      g.stroke();

      g.font = 'bold 9px Courier New';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#ffffff';
      g.fillText(cfg.iconText, 0, 0);

      g.restore();
    }

    // Falling blocks
    for (const fb of this.falling) fb.draw(g);

    // Active boss entity
    if (this.activeBoss) {
      const boss = this.activeBoss;
      g.save();
      if (boss.flash > 0) {
        g.shadowColor = '#ffffff';
        g.shadowBlur = 20;
      }
      g.drawImage(boss.canvas, boss.x, boss.y);
      g.restore();

      if (boss.flash > 0) {
        g.fillStyle = `rgba(255,255,255,${boss.flash * 0.7})`;
        g.fillRect(boss.x, boss.y, boss.w, boss.h);
      }

      const pulse = 0.3 + 0.3 * Math.sin(this.gameTime * (boss.enraged ? 10 : 5));
      g.strokeStyle = boss.enraged ? '#ff0033' : boss.def.accent;
      g.lineWidth = (boss.enraged ? 3 : 2) / this.zoom;
      g.globalAlpha = pulse + 0.2;
      g.strokeRect(boss.x + 1, boss.y + 1, boss.w - 2, boss.h - 2);
      g.globalAlpha = 1;

      // Center reactor pulsation
      const coreG = g.createRadialGradient(
        boss.x + boss.w / 2,
        boss.y + boss.h / 2,
        0,
        boss.x + boss.w / 2,
        boss.y + boss.h / 2,
        boss.w * 0.4
      );
      coreG.addColorStop(0, `rgba(255,255,255,${0.4 + pulse})`);
      coreG.addColorStop(0.6, boss.enraged ? '#ff0033' : boss.def.accent);
      coreG.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = coreG;
      g.globalAlpha = 0.5;
      g.fillRect(boss.x, boss.y, boss.w, boss.h);
      g.globalAlpha = 1;
    }

    for (const p of this.projectiles) p.draw(g);
    for (const p of this.particles) p.draw(g);
    for (const r of this.rings) r.draw(g);
    for (const f of this.flashes) f.draw(g);
    for (const b of this.bolts) b.draw(g);
    for (const f of this.floats) f.draw(g);
    for (const gob of this.goblins) gob.draw(g);

    // AI Companion Drone rendering
    if (this.aiDrone.active) {
      this.aiDrone.draw(g);
    }

    // Aegis Overdrive barrier aura and energy grid
    if (this.aegisOverdrive.active) {
      const aTime = this.gameTime * 6;
      const boostY = PLAY_TOP - this.aegisOverdrive.ceilingBoost;
      const barrierPulse = 0.6 + 0.4 * Math.sin(aTime);

      // Aegis dome glow
      const domeGrd = g.createLinearGradient(0, boostY - 20, 0, PLAY_TOP + 40);
      domeGrd.addColorStop(0, `rgba(0, 255, 255, ${0.45 * barrierPulse})`);
      domeGrd.addColorStop(0.5, `rgba(0, 229, 255, ${0.2 * barrierPulse})`);
      domeGrd.addColorStop(1, 'rgba(0, 229, 255, 0)');
      g.fillStyle = domeGrd;
      g.fillRect(0, boostY - 20, this.worldW, this.aegisOverdrive.ceilingBoost + 60);

      // Aegis elevated ceiling boundary line
      g.fillStyle = '#00ffff';
      g.fillRect(0, boostY - 3, this.worldW, 4 / this.zoom);

      // Hexagonal / grid barrier lines
      g.strokeStyle = `rgba(0, 255, 255, ${0.7 * barrierPulse})`;
      g.lineWidth = 2 / this.zoom;
      g.beginPath();
      for (let x = 0; x <= this.worldW; x += 40) {
        g.moveTo(x, boostY);
        g.lineTo(x + 20, PLAY_TOP);
      }
      g.stroke();
    }

    // Ground platform
    const gg = g.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 200);
    gg.addColorStop(0, '#141c2a');
    gg.addColorStop(0.3, '#0a1018');
    gg.addColorStop(1, '#03040a');
    g.fillStyle = gg;
    g.fillRect(-20, GROUND_Y, this.worldW + 40, 260);

    g.fillStyle = '#4ad4ff';
    g.fillRect(0, GROUND_Y, this.worldW, 1 / this.zoom);
    g.fillStyle = 'rgba(74,212,255,0.4)';
    g.fillRect(0, GROUND_Y - 1, this.worldW, 1 / this.zoom);

    for (let i = 0; i < 4; i++) {
      const y = GROUND_Y + 10 + i * 16;
      g.strokeStyle = `rgba(74,140,220,${0.15 - i * 0.02})`;
      g.lineWidth = 1 / this.zoom;
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(this.worldW, y + 0.5);
      g.stroke();
    }

    for (let x = 60; x < this.worldW; x += 140) {
      const pulse = 0.4 + 0.6 * Math.sin(this.gameTime * 2 + x * 0.03);
      const grd = g.createRadialGradient(x, GROUND_Y + 8, 0, x, GROUND_Y + 8, 24);
      grd.addColorStop(0, `rgba(74,212,255,${0.4 * pulse})`);
      grd.addColorStop(1, 'rgba(74,212,255,0)');
      g.fillStyle = grd;
      g.fillRect(x - 24, GROUND_Y - 16, 48, 48);
      g.fillStyle = `rgba(180,240,255,${0.7 * pulse})`;
      g.fillRect(x - 4, GROUND_Y + 6, 8, 2);
    }

    // Ceiling Danger line
    const cg = g.createLinearGradient(0, PLAY_TOP - 14, 0, PLAY_TOP + 4);
    cg.addColorStop(0, '#0a1220');
    cg.addColorStop(1, '#1a2535');
    g.fillStyle = cg;
    g.fillRect(0, PLAY_TOP - 14, this.worldW, 16);
    g.fillStyle = '#4a7aa0';
    g.fillRect(0, PLAY_TOP - 1, this.worldW, 1 / this.zoom);
    const off = (this.gameTime * 40) % 12;
    g.fillStyle = 'rgba(255,80,80,0.18)';
    for (let x = -12; x < this.worldW; x += 12) {
      g.beginPath();
      g.moveTo(x + off, PLAY_TOP - 14);
      g.lineTo(x + off + 6, PLAY_TOP - 14);
      g.lineTo(x + off + 12, PLAY_TOP - 2);
      g.lineTo(x + off + 6, PLAY_TOP - 2);
      g.closePath();
      g.fill();
    }

    if (this.hazardPulse > 0) {
      const a = 0.1 + this.hazardPulse * 0.5 + 0.15 * Math.sin(this.gameTime * 14);
      g.strokeStyle = `rgba(255,50,80,${a})`;
      g.lineWidth = 3 / this.zoom;
      g.strokeRect(2, PLAY_TOP + 2, this.worldW - 4, ROWS * BS - 4);
    }

    this.drawCannon(g);

    g.restore();
  }

  private drawCannon(g: CanvasRenderingContext2D) {
    const cx = this.cannonWorldX();
    const cy = this.cannonWorldY();
    const dx = this.mouseWorldX - cx;
    const dy = this.mouseWorldY - cy;
    const d = Math.hypot(dx, dy);
    const angle = d > 1 ? Math.atan2(dy, dx) : -Math.PI / 2;
    const recoil = this.cannonRecoil * 8;
    const multiCount = this.getMultiShotCount();
    const isSuper = this.isPowerUpActive('super_pierce');
    const isBounce = this.isPowerUpActive('bounce');

    // Cannon energy ambient halo
    const haloColor = isSuper
      ? 'rgba(255, 0, 170, 0.35)'
      : isBounce
      ? 'rgba(0, 255, 127, 0.35)'
      : 'rgba(74, 180, 255, 0.25)';

    const bgGlow = g.createRadialGradient(cx, cy, 0, cx, cy, 90);
    bgGlow.addColorStop(0, haloColor);
    bgGlow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bgGlow;
    g.fillRect(cx - 90, cy - 90, 180, 180);

    g.save();
    g.translate(cx, cy);
    g.rotate(angle);
    g.translate(-recoil, 0);

    // Draw multi-barrel evolution based on multiCount
    const barrelOffsets =
      multiCount === 1
        ? [0]
        : multiCount === 2
        ? [-6, 6]
        : multiCount === 3
        ? [-9, 0, 9]
        : multiCount === 4
        ? [-12, -4, 4, 12]
        : [-14, -7, 0, 7, 14];

    for (const bo of barrelOffsets) {
      g.save();
      g.translate(0, bo);

      const barrelLength = multiCount >= 4 ? 64 : 54;
      const barrelHeight = multiCount >= 4 ? 6 : 8;

      const bg2 = g.createLinearGradient(0, -barrelHeight / 2, 0, barrelHeight / 2);
      bg2.addColorStop(0, '#2a3a55');
      bg2.addColorStop(0.5, isSuper ? '#702050' : isBounce ? '#206040' : '#3a5070');
      bg2.addColorStop(1, '#141c28');
      g.fillStyle = bg2;
      g.fillRect(-10, -barrelHeight / 2, barrelLength, barrelHeight);

      // Barrel muzzle cap
      g.fillStyle = isSuper ? '#ff00aa' : isBounce ? '#00ff7f' : '#4ad4ff';
      g.fillRect(barrelLength - 14, -barrelHeight / 2 - 1, 6, barrelHeight + 2);

      // Plasma vent flash
      const m = 0.5 + 0.5 * Math.sin(this.gameTime * 8) + this.cannonFlash * 2;
      g.fillStyle = isSuper
        ? `rgba(255, 100, 200, ${Math.min(1, m * 0.7)})`
        : `rgba(140, 210, 255, ${Math.min(1, m * 0.7)})`;
      g.fillRect(barrelLength - 8, -barrelHeight / 2 + 1, 6, barrelHeight - 2);

      g.restore();
    }

    g.restore();

    // Turret base pivot
    g.fillStyle = '#0a1220';
    g.beginPath();
    g.arc(cx, cy, 24, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a2a3e';
    g.beginPath();
    g.arc(cx, cy, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a405a';
    g.beginPath();
    g.arc(cx, cy, 13, 0, Math.PI * 2);
    g.fill();

    const corePulse = 0.6 + 0.4 * Math.sin(this.gameTime * 6);
    const coreG = g.createRadialGradient(cx, cy, 0, cx, cy, 15);
    coreG.addColorStop(0, '#ffffff');
    coreG.addColorStop(0.4, isSuper ? '#ff00aa' : isBounce ? '#00ff7f' : '#4ad4ff');
    coreG.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = coreG;
    g.beginPath();
    g.arc(cx, cy, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.fillRect(cx - 2, cy - 2, 4, 4);
  }

  private drawCrosshair(g: CanvasRenderingContext2D) {
    if (this.gameOver) return;
    const x = this.mouseScreenX;
    const y = this.mouseScreenY;
    const pulse = 0.7 + 0.3 * Math.sin(this.gameTime * 6);
    const isSuper = this.isPowerUpActive('super_pierce');
    const isBounce = this.isPowerUpActive('bounce');
    const strokeColor = isSuper
      ? `rgba(255,0,170,${pulse})`
      : isBounce
      ? `rgba(0,255,127,${pulse})`
      : `rgba(140,220,255,${pulse})`;

    g.strokeStyle = strokeColor;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, y, 11, 0, Math.PI * 2);
    g.stroke();

    g.beginPath();
    g.moveTo(x - 15, y);
    g.lineTo(x - 6, y);
    g.moveTo(x + 6, y);
    g.lineTo(x + 15, y);
    g.moveTo(x, y - 15);
    g.lineTo(x, y - 6);
    g.moveTo(x, y + 6);
    g.lineTo(x, y + 15);
    g.stroke();

    g.fillStyle = '#fff';
    g.fillRect(x - 1, y - 1, 2, 2);
  }

  private drawScanlines(g: CanvasRenderingContext2D) {
    g.save();
    g.globalAlpha = 0.04;
    g.fillStyle = '#000';
    for (let y = 0; y < PX_H; y += 3) g.fillRect(0, y, PX_W, 1);
    g.restore();
  }

  private drawVignette(g: CanvasRenderingContext2D) {
    const vg = g.createRadialGradient(
      PX_W / 2,
      PX_H / 2,
      Math.min(PX_W, PX_H) * 0.35,
      PX_W / 2,
      PX_H / 2,
      Math.max(PX_W, PX_H) * 0.75
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = vg;
    g.fillRect(0, 0, PX_W, PX_H);
  }

  private drawComboHUD(g: CanvasRenderingContext2D) {
    if (this.combo < 2) return;
    const alpha = Math.min(1, this.comboTimer / 0.6);
    const scale = 1 + (1 - Math.min(1, this.comboTimer / 0.4)) * 0.15;
    const y = 84;
    g.save();
    g.globalAlpha = alpha;
    g.translate(PX_W / 2, y);
    g.scale(scale, scale);
    g.font = 'bold 13px Courier New';
    g.textAlign = 'center';
    g.fillStyle = '#2a4a6a';
    g.fillText('COMBO', 0, -10);
    g.font = 'bold 22px Courier New';
    g.fillStyle = '#000';
    g.fillText(`×${this.combo}`, 2, 12);
    g.fillStyle = '#cfe8ff';
    g.fillText(`×${this.combo}`, 0, 10);
    g.fillStyle = `rgba(74,212,255,${0.4 * alpha})`;
    g.fillRect(-24, 18, 48, 1);
    g.restore();
  }
}
