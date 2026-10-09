/**
 * Free Fire Style 2D Battle Royale Engine
 * Full 2D top-down / tactical perspective matching Free Fire:
 * - Grassy hills, electricity pylons, pine trees, concrete compound buildings
 * - Shrinking blue electric safe zone with countdown
 * - 25-player battle royale simulation with intelligent roaming bots
 * - Authentic HUD: Minimap, Compass, Alive/Kills, Weapon cards, HP/EP bars, Mobile touch controls
 * - Golden "BOOYAH!" victory celebration & elimination battle report
 */

import { updateMissionProgress, saveMatchResults, updateCurrency } from '../services/userService';

export interface WeaponDef {
  id: string;
  name: string;
  type: 'rifle' | 'smg' | 'shotgun' | 'sniper' | 'melee';
  damage: number;
  fireRate: number; // shots per sec
  magSize: number;
  reloadTime: number; // sec
  range: number;
  bulletSpeed: number;
  spread: number;
  pellets?: number;
  colorHex: string;
}

export const WEAPON_REGISTRY: Record<string, WeaponDef> = {
  m4a1: {
    id: 'm4a1',
    name: 'M4A1 RIFLE',
    type: 'rifle',
    damage: 34,
    fireRate: 9.5,
    magSize: 30,
    reloadTime: 1.8,
    range: 750,
    bulletSpeed: 1100,
    spread: 0.05,
    colorHex: '#3b82f6',
  },
  ump: {
    id: 'ump',
    name: 'UMP SMG',
    type: 'smg',
    damage: 26,
    fireRate: 13.0,
    magSize: 35,
    reloadTime: 1.5,
    range: 520,
    bulletSpeed: 950,
    spread: 0.09,
    colorHex: '#f59e0b',
  },
  shotgun: {
    id: 'shotgun',
    name: 'SPAS-12',
    type: 'shotgun',
    damage: 18, // per pellet
    pellets: 6,
    fireRate: 2.2,
    magSize: 6,
    reloadTime: 2.4,
    range: 380,
    bulletSpeed: 850,
    spread: 0.22,
    colorHex: '#ef4444',
  },
  awm: {
    id: 'awm',
    name: 'AWM SNIPER',
    type: 'sniper',
    damage: 120,
    fireRate: 1.1,
    magSize: 5,
    reloadTime: 2.6,
    range: 1100,
    bulletSpeed: 1600,
    spread: 0.01,
    colorHex: '#10b981',
  },
  fist: {
    id: 'fist',
    name: 'KATANA / FIST',
    type: 'melee',
    damage: 45,
    fireRate: 2.5,
    magSize: 999,
    reloadTime: 0.1,
    range: 70,
    bulletSpeed: 0,
    spread: 0,
    colorHex: '#e2e8f0',
  },
};

export interface LootItem {
  id: string;
  x: number;
  y: number;
  type: 'weapon' | 'medkit' | 'inhaler' | 'armor' | 'helmet' | 'ammo';
  weaponId?: string;
  value?: number;
  name: string;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  rangeRemaining: number;
  ownerId: string;
  colorHex: string;
}

export interface CharacterEntity {
  id: string;
  isPlayer: boolean;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  hp: number;
  maxHp: number;
  ep: number; // Energy Points (heals HP slowly)
  armor: number; // 0 to 100
  helmet: number; // 0 to 100
  isDead: boolean;
  currentWeapon: WeaponDef;
  ammoInMag: number;
  ammoReserve: number;
  isReloading: boolean;
  reloadProgress: number;
  lastShotTime: number;
  isSprinting: boolean;
  isScoping: boolean;
  skinId: string;
  // Bot AI specific
  targetX?: number;
  targetY?: number;
  aiState?: 'roam' | 'attack' | 'retreat' | 'loot';
  aiTargetEntity?: CharacterEntity | null;
  changeTargetTimer?: number;
}

export interface Structure {
  type: 'building' | 'pylon' | 'tree' | 'rock' | 'fence';
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  color?: string;
  interiorFloor?: boolean;
}

export class BattleRoyale2D {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;

  // World dimensions
  worldWidth = 2600;
  worldHeight = 2600;

  // Game state
  isRunning = false;
  isGameOver = false;
  isVictory = false;
  player: CharacterEntity;
  entities: CharacterEntity[] = [];
  bullets: Bullet[] = [];
  loot: LootItem[] = [];
  structures: Structure[] = [];

  // Safe Zone (Electric Storm)
  zoneCenterX = 1300;
  zoneCenterY = 1300;
  zoneRadius = 1400;
  targetZoneRadius = 1400;
  targetZoneCenterX = 1300;
  targetZoneCenterY = 1300;
  zonePhase = 1;
  zoneTimer = 45; // seconds until next shrink
  zoneShrinking = false;
  zoneDps = 4; // damage per sec outside zone

  // Match statistics
  aliveCount = 25;
  killCount = 0;
  matchDamage = 0;
  matchStartTime = 0;
  elapsedTime = 0;
  killFeed: Array<{ text: string; time: number; color: string }> = [];

  // Inputs
  keys: Record<string, boolean> = {};
  mouseX = 0;
  mouseY = 0;
  mouseWorldX = 0;
  mouseWorldY = 0;
  isMouseDown = false;

  // Touch Virtual Controls
  touchMove = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 };
  touchAim = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 };
  isTouchFiring = false;

  // Sound Engine
  audioCtx: AudioContext | null = null;

  // Callbacks to UI
  onStateUpdate?: (data: {
    hp: number;
    ep: number;
    armor: number;
    helmet: number;
    alive: number;
    kills: number;
    weapon: WeaponDef;
    ammo: number;
    reserve: number;
    zoneTimer: number;
    zoneShrinking: boolean;
    isReloading: boolean;
    isScoping: boolean;
  }) => void;
  onMatchEnd?: (result: { victory: boolean; kills: number; damage: number; rank: number }) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();

    // Default Player
    this.player = this.createEntity('player', true, 'Soldier (You)', 1300, 1300);

    this.initWorld();
    this.setupListeners();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playGunSound(type: string) {
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      if (type === 'sniper') {
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'shotgun') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.14);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      }
    } catch {}
  }

  playBooyahSound() {
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const notes = [261.6, 329.6, 392.0, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.4);
      });
    } catch {}
  }

  createEntity(id: string, isPlayer: boolean, name: string, x: number, y: number): CharacterEntity {
    return {
      id,
      isPlayer,
      name,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: isPlayer ? 220 : 190,
      hp: 200,
      maxHp: 200,
      ep: isPlayer ? 100 : 50,
      armor: 100,
      helmet: 100,
      isDead: false,
      currentWeapon: isPlayer ? { ...WEAPON_REGISTRY.m4a1 } : { ...WEAPON_REGISTRY.ump },
      ammoInMag: isPlayer ? 30 : 35,
      ammoReserve: 180,
      isReloading: false,
      reloadProgress: 0,
      lastShotTime: 0,
      isSprinting: false,
      isScoping: false,
      skinId: 'default',
      aiState: 'roam',
      changeTargetTimer: 0,
    };
  }

  initWorld() {
    this.structures = [];
    this.loot = [];
    this.entities = [];

    // Player position
    this.player.x = 1200 + (Math.random() - 0.5) * 400;
    this.player.y = 1200 + (Math.random() - 0.5) * 400;
    this.player.hp = 200;
    this.player.ep = 100;
    this.player.armor = 100;
    this.player.helmet = 100;
    this.player.isDead = false;
    this.player.currentWeapon = { ...WEAPON_REGISTRY.m4a1 };
    this.player.ammoInMag = 30;
    this.player.ammoReserve = 180;
    this.entities.push(this.player);

    // 1. High Voltage Transmission Towers (Pylons) like Image 1 & 4
    const pylonPositions = [
      { x: 700, y: 700 },
      { x: 1300, y: 650 },
      { x: 1900, y: 800 },
      { x: 900, y: 1500 },
      { x: 1700, y: 1700 },
      { x: 1200, y: 2100 },
    ];
    pylonPositions.forEach((pos) => {
      this.structures.push({
        type: 'pylon',
        x: pos.x,
        y: pos.y,
        w: 90,
        h: 90,
      });
    });

    // 2. Military Compound & Warehouses (Clock Tower & Compound Buildings from Image 3 & 5)
    const buildingPositions = [
      { x: 400, y: 450, w: 220, h: 180 },
      { x: 1400, y: 350, w: 280, h: 200 }, // Central Base Hangar
      { x: 1800, y: 1200, w: 240, h: 160 },
      { x: 600, y: 1800, w: 200, h: 220 },
      { x: 1500, y: 1800, w: 260, h: 190 },
      { x: 1000, y: 1000, w: 180, h: 180 }, // Clock tower
    ];
    buildingPositions.forEach((b) => {
      this.structures.push({
        type: 'building',
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
      });
      // Concrete Perimeter Fences
      this.structures.push({
        type: 'fence',
        x: b.x - 40,
        y: b.y - 40,
        w: b.w + 80,
        h: 12,
      });
    });

    // 3. Pine Trees & Boulders
    for (let i = 0; i < 90; i++) {
      const rx = 100 + Math.random() * (this.worldWidth - 200);
      const ry = 100 + Math.random() * (this.worldHeight - 200);
      this.structures.push({
        type: 'tree',
        x: rx,
        y: ry,
        w: 60,
        h: 60,
        radius: 35,
      });
    }

    // 4. Generate Loot Drops across compounds and fields
    const weaponKeys = ['m4a1', 'ump', 'shotgun', 'awm'];
    for (let i = 0; i < 60; i++) {
      const lx = 150 + Math.random() * (this.worldWidth - 300);
      const ly = 150 + Math.random() * (this.worldHeight - 300);
      const roll = Math.random();
      if (roll < 0.45) {
        const wKey = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
        this.loot.push({
          id: `loot_${i}`,
          x: lx,
          y: ly,
          type: 'weapon',
          weaponId: wKey,
          name: WEAPON_REGISTRY[wKey].name,
        });
      } else if (roll < 0.7) {
        this.loot.push({
          id: `loot_${i}`,
          x: lx,
          y: ly,
          type: 'medkit',
          value: 75,
          name: 'MEDKIT (+75 HP)',
        });
      } else if (roll < 0.85) {
        this.loot.push({
          id: `loot_${i}`,
          x: lx,
          y: ly,
          type: 'inhaler',
          value: 50,
          name: 'ENERGY INHALER (+50 EP)',
        });
      } else {
        this.loot.push({
          id: `loot_${i}`,
          x: lx,
          y: ly,
          type: 'armor',
          value: 50,
          name: 'TACTICAL VEST',
        });
      }
    }

    // 5. Spawn 24 Rogue AI Bots
    const botNames = [
      'Ghost_47', 'ShadowWolf', 'Rojob4R3r', 'DeltaSniper', 'Viper99',
      'K_HERO_IM', 'StrikerX', 'Neo_Blade', 'AlphaRecon', 'Falcon7',
      'Phoenix_FF', 'Zero_Cool', 'RaptorElite', 'CobraCommander', 'Slayer99',
      'IronClad', 'Titan_Bot', 'Spectre_01', 'CyberNinja', 'WarMaster',
      'BulletStorm', 'BlazeRider', 'NightRaid', 'ApexPredator'
    ];

    for (let i = 0; i < 24; i++) {
      const bx = 200 + Math.random() * (this.worldWidth - 400);
      const by = 200 + Math.random() * (this.worldHeight - 400);
      const bot = this.createEntity(`bot_${i}`, false, botNames[i], bx, by);
      // Give random starting weapon
      const wKey = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
      bot.currentWeapon = { ...WEAPON_REGISTRY[wKey] };
      bot.ammoInMag = bot.currentWeapon.magSize;
      this.entities.push(bot);
    }

    // Zone initialization
    this.zoneCenterX = this.worldWidth / 2;
    this.zoneCenterY = this.worldHeight / 2;
    this.zoneRadius = 1300;
    this.targetZoneRadius = 900;
    this.zoneTimer = 35;
    this.zoneShrinking = false;
    this.zonePhase = 1;

    this.aliveCount = this.entities.length;
    this.killCount = 0;
    this.matchDamage = 0;
    this.matchStartTime = performance.now();
    this.isGameOver = false;
    this.isVictory = false;

    this.addKillFeedMessage('25 OPERATORS DEPLOYED INTO THE ARENA', '#06b6d4');
  }

  setupListeners() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'r' || e.key === 'R') this.reload(this.player);
      if (e.key === '1') this.switchWeapon(this.player, 'm4a1');
      if (e.key === '2') this.switchWeapon(this.player, 'ump');
      if (e.key === '3') this.switchWeapon(this.player, 'shotgun');
      if (e.key === '4') this.switchWeapon(this.player, 'awm');
      if (e.key === '5') this.switchWeapon(this.player, 'fist');
      if (e.key === 'e' || e.key === 'E' || e.key === 'f' || e.key === 'F') this.pickupNearestLoot(this.player);
      if (e.key === 'h' || e.key === 'H') this.useMedkit(this.player);
      if (e.key === 'Shift') this.player.isSprinting = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key === 'Shift') this.player.isSprinting = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      this.initAudio();
      if (e.button === 0) {
        this.isMouseDown = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.player.isScoping = !this.player.isScoping;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  start() {
    this.isRunning = true;
    this.initAudio();
    this.loop();
  }

  stop() {
    this.isRunning = false;
  }

  switchWeapon(entity: CharacterEntity, weaponId: string) {
    if (WEAPON_REGISTRY[weaponId]) {
      entity.currentWeapon = { ...WEAPON_REGISTRY[weaponId] };
      entity.ammoInMag = entity.currentWeapon.magSize;
      entity.isReloading = false;
    }
  }

  reload(entity: CharacterEntity) {
    if (entity.isReloading || entity.ammoInMag >= entity.currentWeapon.magSize || entity.ammoReserve <= 0) return;
    entity.isReloading = true;
    entity.reloadProgress = 0;
  }

  useMedkit(entity: CharacterEntity) {
    if (entity.hp >= entity.maxHp) return;
    entity.hp = Math.min(entity.maxHp, entity.hp + 75);
    this.addKillFeedMessage(`${entity.name} applied First Aid (+75 HP)`, '#10b981');
  }

  pickupNearestLoot(entity: CharacterEntity) {
    const pickupDist = 80;
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const item = this.loot[i];
      const d = Math.hypot(item.x - entity.x, item.y - entity.y);
      if (d < pickupDist) {
        if (item.type === 'weapon' && item.weaponId) {
          entity.currentWeapon = { ...WEAPON_REGISTRY[item.weaponId] };
          entity.ammoInMag = entity.currentWeapon.magSize;
          entity.ammoReserve += 60;
          this.addKillFeedMessage(`Acquired ${item.name}`, '#f59e0b');
        } else if (item.type === 'medkit') {
          this.useMedkit(entity);
        } else if (item.type === 'inhaler') {
          entity.ep = Math.min(200, entity.ep + 50);
          this.addKillFeedMessage(`Inhaled Booster (+50 EP)`, '#06b6d4');
        } else if (item.type === 'armor') {
          entity.armor = 100;
          this.addKillFeedMessage(`Equipped Level 3 Tactical Armor`, '#3b82f6');
        }
        this.loot.splice(i, 1);
        break;
      }
    }
  }

  shoot(entity: CharacterEntity) {
    const now = performance.now() / 1000;
    const w = entity.currentWeapon;

    if (entity.isReloading) return;
    if (entity.ammoInMag <= 0) {
      this.reload(entity);
      return;
    }
    if (now - entity.lastShotTime < 1 / w.fireRate) return;

    entity.lastShotTime = now;
    entity.ammoInMag--;

    this.playGunSound(w.type);

    const pelletCount = w.pellets || 1;
    for (let p = 0; p < pelletCount; p++) {
      const spreadAngle = (Math.random() - 0.5) * w.spread;
      const angle = entity.angle + spreadAngle;
      const vx = Math.cos(angle) * w.bulletSpeed;
      const vy = Math.sin(angle) * w.bulletSpeed;

      this.bullets.push({
        x: entity.x + Math.cos(entity.angle) * 26,
        y: entity.y + Math.sin(entity.angle) * 26,
        vx,
        vy,
        damage: w.damage,
        rangeRemaining: w.range,
        ownerId: entity.id,
        colorHex: w.colorHex,
      });
    }
  }

  addKillFeedMessage(text: string, color = '#f59e0b') {
    this.killFeed.unshift({ text, time: performance.now() / 1000, color });
    if (this.killFeed.length > 5) {
      this.killFeed.pop();
    }
  }

  update(dt: number) {
    if (this.isGameOver) return;

    this.elapsedTime = (performance.now() - this.matchStartTime) / 1000;

    // 1. Safe Zone Shrink Logic
    this.updateSafeZone(dt);

    // 2. Player Controls & Movement
    this.updatePlayer(dt);

    // 3. AI Bot Logic
    this.updateBots(dt);

    // 4. Update Bullets & Collisions
    this.updateBullets(dt);

    // 5. Environmental storm damage
    this.applyZoneDamage(dt);

    // 6. Natural EP to HP Regeneration (Free Fire mechanic: EP slowly converts to HP)
    this.entities.forEach((ent) => {
      if (!ent.isDead && ent.ep > 0 && ent.hp < ent.maxHp) {
        const healAmt = 4 * dt;
        ent.hp = Math.min(ent.maxHp, ent.hp + healAmt);
        ent.ep = Math.max(0, ent.ep - healAmt * 0.8);
      }
    });

    // 7. Check Victory or Defeat
    const activeAlive = this.entities.filter((e) => !e.isDead);
    this.aliveCount = activeAlive.length;

    if (!this.player.isDead && activeAlive.length === 1 && activeAlive[0].isPlayer) {
      this.triggerVictory();
    } else if (this.player.isDead && !this.isGameOver) {
      this.triggerDefeat();
    }

    // 8. Notify React UI
    if (this.onStateUpdate) {
      this.onStateUpdate({
        hp: Math.round(this.player.hp),
        ep: Math.round(this.player.ep),
        armor: Math.round(this.player.armor),
        helmet: Math.round(this.player.helmet),
        alive: this.aliveCount,
        kills: this.killCount,
        weapon: this.player.currentWeapon,
        ammo: this.player.ammoInMag,
        reserve: this.player.ammoReserve,
        zoneTimer: Math.ceil(this.zoneTimer),
        zoneShrinking: this.zoneShrinking,
        isReloading: this.player.isReloading,
        isScoping: this.player.isScoping,
      });
    }
  }

  updateSafeZone(dt: number) {
    if (this.zoneShrinking) {
      // Interpolate towards target
      const speed = 25 * dt;
      this.zoneRadius = Math.max(this.targetZoneRadius, this.zoneRadius - speed);
      const dx = this.targetZoneCenterX - this.zoneCenterX;
      const dy = this.targetZoneCenterY - this.zoneCenterY;
      this.zoneCenterX += dx * 0.05 * dt;
      this.zoneCenterY += dy * 0.05 * dt;

      if (Math.abs(this.zoneRadius - this.targetZoneRadius) < 2) {
        this.zoneShrinking = false;
        this.zonePhase++;
        this.zoneTimer = Math.max(15, 45 - this.zonePhase * 8);
        this.targetZoneRadius = Math.max(150, this.zoneRadius * 0.55);
        this.targetZoneCenterX = this.zoneCenterX + (Math.random() - 0.5) * (this.zoneRadius * 0.4);
        this.targetZoneCenterY = this.zoneCenterY + (Math.random() - 0.5) * (this.zoneRadius * 0.4);
        this.addKillFeedMessage(`⚠️ Safe Zone stabilized (Phase ${this.zonePhase})`, '#06b6d4');
      }
    } else {
      this.zoneTimer -= dt;
      if (this.zoneTimer <= 0) {
        this.zoneShrinking = true;
        this.addKillFeedMessage('⚡ WARNING: Safe Zone is shrinking!', '#ef4444');
      }
    }
  }

  updatePlayer(dt: number) {
    if (this.player.isDead) return;

    // Movement direction
    let mx = 0;
    let my = 0;

    if (this.keys['w'] || this.keys['arrowup']) my -= 1;
    if (this.keys['s'] || this.arrowdown) my += 1;
    if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) mx += 1;

    // Touch Virtual Joystick input
    if (this.touchMove.active) {
      const dx = this.touchMove.curX - this.touchMove.startX;
      const dy = this.touchMove.curY - this.touchMove.startY;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        mx = dx / dist;
        my = dy / dist;
      }
    }

    const len = Math.hypot(mx, my);
    if (len > 0) {
      const moveSpeed = (this.player.isSprinting ? this.player.speed * 1.4 : this.player.speed) * (this.player.isScoping ? 0.6 : 1.0);
      this.player.vx = (mx / len) * moveSpeed;
      this.player.vy = (my / len) * moveSpeed;
    } else {
      this.player.vx = 0;
      this.player.vy = 0;
    }

    this.player.x = Math.max(40, Math.min(this.worldWidth - 40, this.player.x + this.player.vx * dt));
    this.player.y = Math.max(40, Math.min(this.worldHeight - 40, this.player.y + this.player.vy * dt));

    // Handle reload progress
    if (this.player.isReloading) {
      this.player.reloadProgress += dt / this.player.currentWeapon.reloadTime;
      if (this.player.reloadProgress >= 1) {
        this.player.isReloading = false;
        const needed = this.player.currentWeapon.magSize - this.player.ammoInMag;
        const take = Math.min(needed, this.player.ammoReserve);
        this.player.ammoInMag += take;
        this.player.ammoReserve -= take;
      }
    }

    // Aim direction: mouse or touch
    this.mouseWorldX = this.mouseX - this.width / 2 + this.player.x;
    this.mouseWorldY = this.mouseY - this.height / 2 + this.player.y;
    this.player.angle = Math.atan2(this.mouseWorldY - this.player.y, this.mouseWorldX - this.player.x);

    // Fire weapon
    if (this.isMouseDown || this.isTouchFiring) {
      this.shoot(this.player);
    }
  }

  get arrowdown() {
    return this.keys['arrowdown'] || false;
  }

  updateBots(dt: number) {
    this.entities.forEach((bot) => {
      if (bot.isPlayer || bot.isDead) return;

      // Reload
      if (bot.isReloading) {
        bot.reloadProgress += dt / bot.currentWeapon.reloadTime;
        if (bot.reloadProgress >= 1) {
          bot.isReloading = false;
          bot.ammoInMag = bot.currentWeapon.magSize;
        }
      }

      // Check distance to player and other bots
      let nearestTarget: CharacterEntity | null = null;
      let minDist = 450; // Detection radius

      // Target player if in range
      if (!this.player.isDead) {
        const dToPlayer = Math.hypot(this.player.x - bot.x, this.player.y - bot.y);
        if (dToPlayer < minDist) {
          nearestTarget = this.player;
          minDist = dToPlayer;
        }
      }

      // Or target another enemy bot
      if (!nearestTarget) {
        for (const other of this.entities) {
          if (other.id !== bot.id && !other.isDead) {
            const d = Math.hypot(other.x - bot.x, other.y - bot.y);
            if (d < minDist) {
              nearestTarget = other;
              minDist = d;
            }
          }
        }
      }

      bot.aiTargetEntity = nearestTarget;

      // Combat Behavior
      if (nearestTarget) {
        bot.angle = Math.atan2(nearestTarget.y - bot.y, nearestTarget.x - bot.x);
        // Move towards target if too far, or back away if too close
        if (minDist > 180) {
          bot.vx = Math.cos(bot.angle) * bot.speed * 0.9;
          bot.vy = Math.sin(bot.angle) * bot.speed * 0.9;
        } else if (minDist < 80) {
          bot.vx = -Math.cos(bot.angle) * bot.speed * 0.7;
          bot.vy = -Math.sin(bot.angle) * bot.speed * 0.7;
        } else {
          // Strafe
          bot.vx = -Math.sin(bot.angle) * bot.speed * 0.5;
          bot.vy = Math.cos(bot.angle) * bot.speed * 0.5;
        }

        // Fire at target with slight burst delay
        if (Math.random() < 0.6) {
          this.shoot(bot);
        }
      } else {
        // Roaming towards the safe zone
        const distToZone = Math.hypot(bot.x - this.zoneCenterX, bot.y - this.zoneCenterY);
        if (distToZone > this.zoneRadius * 0.75) {
          // Outside or near storm, head to center
          const angleToCenter = Math.atan2(this.zoneCenterY - bot.y, this.zoneCenterX - bot.x);
          bot.angle = angleToCenter;
          bot.vx = Math.cos(angleToCenter) * bot.speed;
          bot.vy = Math.sin(angleToCenter) * bot.speed;
        } else {
          // Wander peacefully
          bot.changeTargetTimer = (bot.changeTargetTimer || 0) - dt;
          if (bot.changeTargetTimer <= 0) {
            bot.changeTargetTimer = 2 + Math.random() * 3;
            bot.angle = Math.random() * Math.PI * 2;
            bot.vx = Math.cos(bot.angle) * (bot.speed * 0.5);
            bot.vy = Math.sin(bot.angle) * (bot.speed * 0.5);
          }
        }
      }

      bot.x = Math.max(40, Math.min(this.worldWidth - 40, bot.x + bot.vx * dt));
      bot.y = Math.max(40, Math.min(this.worldHeight - 40, bot.y + bot.vy * dt));
    });
  }

  updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const dist = Math.hypot(b.vx, b.vy) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rangeRemaining -= dist;

      if (b.rangeRemaining <= 0 || b.x < 0 || b.x > this.worldWidth || b.y < 0 || b.y > this.worldHeight) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Collision with structures (walls/buildings)
      let hitStructure = false;
      for (const s of this.structures) {
        if (s.type === 'building' || s.type === 'fence') {
          if (b.x >= s.x && b.x <= s.x + s.w && b.y >= s.y && b.y <= s.y + s.h) {
            hitStructure = true;
            break;
          }
        }
      }
      if (hitStructure) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Collision with characters
      for (const target of this.entities) {
        if (target.isDead || target.id === b.ownerId) continue;

        const hitDist = Math.hypot(target.x - b.x, target.y - b.y);
        if (hitDist < 24) {
          // Apply Damage (Armor absorbs 50% damage)
          let finalDmg = b.damage;
          if (target.armor > 0) {
            target.armor = Math.max(0, target.armor - finalDmg * 0.5);
            finalDmg *= 0.65;
          }

          target.hp -= finalDmg;

          if (b.ownerId === this.player.id) {
            this.matchDamage += Math.round(finalDmg);
          }

          if (target.hp <= 0 && !target.isDead) {
            target.isDead = true;
            target.hp = 0;

            const killer = this.entities.find((e) => e.id === b.ownerId);
            const killerName = killer ? killer.name : 'Rogue Bot';
            const weaponUsed = killer ? killer.currentWeapon.name.split(' ')[0] : 'Bullet';

            if (b.ownerId === this.player.id) {
              this.killCount++;
              this.addKillFeedMessage(`[ELIMINATED] ${target.name} (${weaponUsed})`, '#10b981');
              updateMissionProgress('kill_50_bots', 1);
              updateCurrency(15);
            } else {
              this.addKillFeedMessage(`${killerName} eliminated ${target.name} (${weaponUsed})`, '#f59e0b');
            }

            // Spawn Death Loot Crate
            this.loot.push({
              id: `death_${Date.now()}`,
              x: target.x,
              y: target.y,
              type: 'medkit',
              name: 'DEATH CRATE · MEDKIT',
            });
          }

          this.bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  applyZoneDamage(dt: number) {
    this.entities.forEach((ent) => {
      if (ent.isDead) return;
      const d = Math.hypot(ent.x - this.zoneCenterX, ent.y - this.zoneCenterY);
      if (d > this.zoneRadius) {
        ent.hp -= this.zoneDps * (1 + this.zonePhase * 0.6) * dt;
        if (ent.hp <= 0 && !ent.isDead) {
          ent.isDead = true;
          ent.hp = 0;
          this.addKillFeedMessage(`${ent.name} was caught outside the safe zone`, '#ef4444');
        }
      }
    });
  }

  triggerVictory() {
    this.isGameOver = true;
    this.isVictory = true;
    this.playBooyahSound();
    if (this.onMatchEnd) {
      this.onMatchEnd({
        victory: true,
        kills: this.killCount,
        damage: this.matchDamage,
        rank: 1,
      });
    }
    saveMatchResults(this.killCount * 300 + 1000, 10, this.killCount);
  }

  triggerDefeat() {
    this.isGameOver = true;
    this.isVictory = false;
    const rank = this.aliveCount + 1;
    if (this.onMatchEnd) {
      this.onMatchEnd({
        victory: false,
        kills: this.killCount,
        damage: this.matchDamage,
        rank,
      });
    }
    saveMatchResults(this.killCount * 150 + 200, 3, this.killCount);
  }

  // ==========================================
  // RENDER ENGINE: High-Fidelity Free Fire 2D Canvas
  // ==========================================
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Camera transform centered on player
    ctx.save();
    const camX = this.width / 2 - this.player.x;
    const camY = this.height / 2 - this.player.y;
    ctx.translate(camX, camY);

    // 1. Terrain & Grass Ground
    this.renderTerrain(ctx);

    // 2. Road paths & compound foundations
    this.renderCompoundFloors(ctx);

    // 3. World Structures (Buildings, Walls, Fences, Pylons)
    this.renderStructures(ctx);

    // 4. Ground Loot
    this.renderLoot(ctx);

    // 5. Characters & Soldier Sprites
    this.renderCharacters(ctx);

    // 6. Bullets & Tracers
    this.renderBullets(ctx);

    // 7. Tree Foliage Canopy (provides top-down shadow & concealment)
    this.renderTrees(ctx);

    // 8. Blue Electric Safe Zone Barrier
    this.renderSafeZone(ctx);

    ctx.restore();

    // 9. Overlay HUD (Minimap, Compass, Killfeed, BOOYAH screen)
    this.renderHUD(ctx);
  }

  renderTerrain(ctx: CanvasRenderingContext2D) {
    // Base tactical grassy battlefield green
    ctx.fillStyle = '#416d38';
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Grassy grid pattern with subtle shade variations
    ctx.fillStyle = '#3a6331';
    for (let x = 0; x < this.worldWidth; x += 120) {
      for (let y = 0; y < this.worldHeight; y += 120) {
        if ((x + y) % 240 === 0) {
          ctx.fillRect(x, y, 120, 120);
        }
      }
    }

    // Dirt trail pathways connecting compounds
    ctx.strokeStyle = '#8d734a';
    ctx.lineWidth = 45;
    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.quadraticCurveTo(1200, 800, 1500, 1400);
    ctx.quadraticCurveTo(1800, 1900, 2300, 2200);
    ctx.stroke();
  }

  renderCompoundFloors(ctx: CanvasRenderingContext2D) {
    this.structures.forEach((s) => {
      if (s.type === 'building') {
        // Polished concrete warehouse floor
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(s.x, s.y, s.w, s.h);

        // Floor tiles grid
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        for (let gx = s.x; gx < s.x + s.w; gx += 30) {
          ctx.beginPath();
          ctx.moveTo(gx, s.y);
          ctx.lineTo(gx, s.y + s.h);
          ctx.stroke();
        }
      }
    });
  }

  renderStructures(ctx: CanvasRenderingContext2D) {
    this.structures.forEach((s) => {
      if (s.type === 'building') {
        // Concrete Walls
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 10;
        ctx.strokeRect(s.x, s.y, s.w, s.h);

        // Wide doorway (matching Image 3)
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(s.x + s.w / 2 - 35, s.y + s.h - 6, 70, 12);
      } else if (s.type === 'fence') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(s.x, s.y, s.w, s.h);
      } else if (s.type === 'pylon') {
        // High voltage transmission tower base (from Image 1 & 4)
        ctx.save();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 4;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
        // Steel lattice X braces
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.w, s.y + s.h);
        ctx.moveTo(s.x + s.w, s.y);
        ctx.lineTo(s.x, s.y + s.h);
        ctx.stroke();
        // Tower center insulator box
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(s.x + s.w / 2 - 8, s.y + s.h / 2 - 8, 16, 16);
        ctx.restore();
      }
    });
  }

  renderLoot(ctx: CanvasRenderingContext2D) {
    this.loot.forEach((item) => {
      ctx.save();
      ctx.translate(item.x, item.y);

      // Glowing tactical ring
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = item.type === 'weapon' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)';
      ctx.fill();

      if (item.type === 'weapon') {
        // Gun icon silhouette
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-10, -3, 20, 6);
        ctx.fillRect(-2, 3, 5, 8);
      } else if (item.type === 'medkit') {
        // Medical cross crate
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);
      } else if (item.type === 'inhaler') {
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(-5, -9, 10, 18);
      } else {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  renderCharacters(ctx: CanvasRenderingContext2D) {
    this.entities.forEach((ent) => {
      if (ent.isDead) {
        // Render tombstone / skull crate
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(ent.x - 12, ent.y - 12, 24, 24);
        ctx.fillStyle = '#f87171';
        ctx.font = '10px sans-serif';
        ctx.fillText('CRATE', ent.x - 15, ent.y + 4);
        return;
      }

      ctx.save();
      ctx.translate(ent.x, ent.y);
      ctx.rotate(ent.angle);

      // Character body: Tactical soldier matching Image 1 & 2
      // 1. Tactical Backpack (attached to back)
      ctx.fillStyle = ent.isPlayer ? '#78350f' : '#334155';
      ctx.fillRect(-22, -10, 12, 20);

      // 2. Arms holding assault rifle
      ctx.fillStyle = '#d4a373'; // Skin tone arms
      ctx.fillRect(0, -11, 16, 6); // Right arm
      ctx.fillRect(0, 5, 14, 6); // Left arm

      // 3. Rifle in hands
      ctx.fillStyle = ent.currentWeapon.colorHex || '#1e293b';
      ctx.fillRect(6, -3, 22, 5); // Rifle barrel
      ctx.fillStyle = '#000000';
      ctx.fillRect(10, 0, 4, 6); // Mag

      // 4. Torso with tactical vest plate carrier
      ctx.fillStyle = ent.isPlayer ? '#1e293b' : '#3f3f46';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Military Helmet (Level 3 Spetsnaz helmet from Image 2)
      ctx.fillStyle = ent.isPlayer ? '#2e3a23' : '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // Helmet visor / tactical visor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, -6, 5, 12);

      ctx.restore();

      // Mini Health bar above head (Free Fire style)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(ent.x - 18, ent.y - 28, 36, 5);
      const hpPct = Math.max(0, ent.hp / ent.maxHp);
      ctx.fillStyle = ent.isPlayer ? '#22c55e' : '#ef4444';
      ctx.fillRect(ent.x - 17, ent.y - 27, 34 * hpPct, 3);
    });
  }

  renderBullets(ctx: CanvasRenderingContext2D) {
    this.bullets.forEach((b) => {
      ctx.save();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - (b.vx / 1100) * 14, b.y - (b.vy / 1100) * 14);
      ctx.stroke();

      // Glowing head
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  renderTrees(ctx: CanvasRenderingContext2D) {
    this.structures.forEach((s) => {
      if (s.type === 'tree' && s.radius) {
        ctx.save();
        // Pine tree shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.arc(s.x + 8, s.y + 12, s.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pine tree dense green foliage
        ctx.fillStyle = '#1c3d18';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner lighter needles
        ctx.fillStyle = '#265420';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  renderSafeZone(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // 1. Outer translucent electric blue storm field
    ctx.beginPath();
    ctx.rect(0, 0, this.worldWidth, this.worldHeight);
    ctx.arc(this.zoneCenterX, this.zoneCenterY, this.zoneRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.28)';
    ctx.fill();

    // 2. Pulsing electric ring boundary
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(this.zoneCenterX, this.zoneCenterY, this.zoneRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Next target white circle
    if (this.zoneRadius > this.targetZoneRadius) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.targetZoneCenterX, this.targetZoneCenterY, this.targetZoneRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderHUD(ctx: CanvasRenderingContext2D) {
    // 1. Radar Minimap (Top Left)
    this.renderMinimap(ctx);

    // 2. Compass Banner (Top Center)
    this.renderCompass(ctx);

    // 3. Kill Feed (Top Right Center)
    this.renderKillFeed(ctx);

    // 4. Victory BOOYAH screen if won!
    if (this.isVictory) {
      this.renderBooyahBanner(ctx);
    }
  }

  renderMinimap(ctx: CanvasRenderingContext2D) {
    const size = 110;
    const pad = 18;
    ctx.save();
    ctx.translate(pad, pad);

    // Minimap border circle
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.clip();

    // Map scaling
    const scale = size / this.worldWidth;
    ctx.fillStyle = '#3a6331';
    ctx.fillRect(0, 0, size, size);

    // Safe zone on map
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.zoneCenterX * scale, this.zoneCenterY * scale, this.zoneRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Player arrow
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(this.player.x * scale, this.player.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Enemy bot dots
    ctx.fillStyle = '#ef4444';
    this.entities.forEach((ent) => {
      if (!ent.isPlayer && !ent.isDead) {
        ctx.beginPath();
        ctx.arc(ent.x * scale, ent.y * scale, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  renderCompass(ctx: CanvasRenderingContext2D) {
    const cx = this.width / 2;
    const cy = 24;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.roundRect(cx - 150, 8, 300, 26, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N  ·  45° NE  ·  90° E  ·  135° SE  ·  180° S', cx, cy + 2);
    ctx.restore();
  }

  renderKillFeed(ctx: CanvasRenderingContext2D) {
    const rx = this.width - 20;
    let ry = 110;
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';

    this.killFeed.forEach((item) => {
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, rx, ry);
      ry += 18;
    });
    ctx.restore();
  }

  renderBooyahBanner(ctx: CanvasRenderingContext2D) {
    const cx = this.width / 2;
    const cy = this.height / 2 - 40;
    ctx.save();

    // Backdrop glow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Golden Banner ribbon matching Image 2
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 30;
    ctx.fillRect(cx - 260, cy - 50, 520, 100);

    // Banner Text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic 900 48px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOOYAH !', cx, cy + 12);

    ctx.font = 'bold 18px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Showtime! Match Victory', cx, cy + 38);

    // Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`ELIMINATIONS: ${this.killCount}  ·  DAMAGE: ${this.matchDamage}`, cx, cy + 90);
    ctx.restore();
  }

  loop = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - (this.lastFrameTime || now)) / 1000);
    this.lastFrameTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  };

  private lastFrameTime = 0;
}
