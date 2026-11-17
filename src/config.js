'use strict';
if (!window.Phaser) {
  const boot = document.getElementById('boot');
  boot.classList.add('failed');
  boot.innerHTML = 'SLAGHOUSE<small>Phaser could not be loaded, so the game can\'t start. It comes from the jsDelivr CDN, so check your connection and try again. The file must also match its integrity hash.</small><button type="button" onclick="location.reload()">RETRY</button>';
  throw new Error('Phaser missing');
}

// =============================================================================
//  CONFIG / TUNING
// =============================================================================
const VIEW_W = 960, VIEW_H = 540, ZOOM = 2;           // world view = 480 x 270 art pixels
const TS = 16, MAP_W = 100, MAP_H = 27, LW = MAP_W * TS, LH = MAP_H * TS;
const BG = { far: 0.25, mid: 0.5, pad: 32 };         // parallax scroll factors
const ADD = Phaser.BlendModes.ADD;

const TUNE = {
  GRAVITY: 800, FALL_EXTRA: 250, RUN_SPEED: 200,
  GROUND_ACCEL: 2200, GROUND_DECEL: 2600, AIR_ACCEL: 1400, AIR_DECEL: 500, AIR_MOMENTUM_DECAY: 260,
  JUMP_VELOCITY: 355, JUMP_CUT: 0.5, MAX_FALL: 560, COYOTE_MS: 90, JUMP_BUFFER_MS: 110,
  PLAYER_HP: 100, IFRAMES_MS: 750, HEALTH_PACK: 30,
  NAIL:    { cooldown: 125,  speed: 560, damage: 12, spread: 2.5, life: 0.9 },
  SHOTGUN: { cooldown: 667,  pellets: 5, speed: 470, damage: 10, spread: 9, life: 0.32, knock: 140 },
  ROCKET:  { cooldown: 1250, speed: 330, radius: 60, maxDamage: 80, minDamage: 25, selfDamage: 12, push: 430, maxRise: 560 },
  GRENADE: { cooldown: 800, speed: 300, lift: 70, fuse: 1.4, bounce: 0.55, radius: 56, maxDamage: 75, minDamage: 20, selfDamage: 10, push: 380, maxRise: 520 },
  DRONE_BOLT: { speed: 150, damage: 10 },
  ENFORCER: { burst: 3, burstGap: 90, bulletSpeed: 380, damage: 5, aimMs: 480 },
  STALKER: { lunge: 320, windupMs: 280 },
  HEAVY_STOMP: 15,
  ARC:  { cooldown: 50, damage: 4, range: 170, chain: 2, chainRange: 70, chainFactor: 0.6 },
  RAIL: { cooldown: 1500, damage: 100, range: 900, knock: 160 },
  SAW:  { cooldown: 650, speed: 310, damage: 28, bounces: 4, life: 2.4 },
  BULWARK: { bashMs: 400, bashSpeed: 270, bashDmg: 18, turnRate: 2.4 },
  MENDER: { heal: 20, range: 120 },
  HEADSHOT: 2,                                            // damage multiplier on humanoid heads
  KICK:  { cooldown: 450, damage: 25, push: 420, range: 26, parrySpeed: 700, parryDamage: 40, wallSplat: 20 },
  FLAME: { cooldown: 40, damage: 3, range: 92, cone: 18, burn: 3, burnDps: 8 },
  SING:  { cooldown: 1800, speed: 170, travel: 0.8, well: 1.4, pull: 110 },
  SING_BLAST: { radius: 72, maxDamage: 90, minDamage: 35, selfDamage: 15, push: 300, maxRise: 420, style: 'void' },
  BARREL: { radius: 64, maxDamage: 90, minDamage: 25, selfDamage: 25, push: 460, maxRise: 600, hp: 20, scenery: true },
  TICK:  { speed: 150, leap: 230, armRange: 22, fuse: 350, radius: 46, maxDamage: 40, minDamage: 12, selfDamage: 30, push: 300, maxRise: 400, enemy: true },
  SNIPER: { aimMs: 1100, lockAt: 0.75, bulletSpeed: 900, damage: 22, fireCd: 2.6 },
  BOSS:  { speed: 55, slag: { radius: 34, maxDamage: 30, minDamage: 10, enemyDamage: 20, selfDamage: 16, push: 260, maxRise: 360, enemy: true, spare: 'boss', burn: 1.5 } },
  RAIN:  { shower: [7, 9], clear: [5, 7], tell: 1.2, gap: [0.28, 0.55] },   // SLAG RAIN comes in showers (s) with clear spells; a drop every gap s
  MINI:    { cooldown: 45, spinUp: 0.55, speed: 600, damage: 7, spread: 4.5, life: 0.75 },
  CLUSTER: { cooldown: 1400, speed: 250, lift: 140, bomblets: 6,
             shell: { radius: 30, maxDamage: 30, minDamage: 10, selfDamage: 6, push: 220, maxRise: 360, tileDamage: 50 },
             bomb:  { radius: 34, maxDamage: 44, minDamage: 12, selfDamage: 8, push: 240, maxRise: 400, tileDamage: 70 } },
  ROCKETEER: { aimMs: 750, lockAt: 0.6, rocketSpeed: 175, fireCd: 3.3,
               blast: { radius: 44, maxDamage: 30, minDamage: 8, enemyDamage: 20, selfDamage: 20, push: 320, maxRise: 440, enemy: true, tileDamage: 70 } },
  WASP:    { speed: 115, height: 92, bombGap: 0.32, runBombs: 3, rest: 2.2,
             bomb: { radius: 40, maxDamage: 30, minDamage: 8, enemyDamage: 16, selfDamage: 15, push: 280, maxRise: 400, enemy: true, tileDamage: 60 } },
  RAMMER:  { windMs: 650, speed: 330, chargeT: 1.7, dmg: 30, stun: 1.8, cd: 2.4 },
  TILE:    { span: 3 },                                   // girders/gratings may overhang this many tiles past an anchor
  STAKE:   { cooldown: 900, speed: 640, damage: 65, life: 1.1, carry: 2 },
  MINE:    { cooldown: 650, max: 4, speed: 230, lift: 90, arm: 0.6, trigger: 30, radius: 52, maxDamage: 85, minDamage: 25, selfDamage: 14, push: 420, maxRise: 540, tileDamage: 90 },
  JET:     { speed: 150, range: 130, height: 56, tellMs: 350, burst: 4, gap: 0.09, bulletSpeed: 400, damage: 5,
             boom: { radius: 46, maxDamage: 50, minDamage: 14, selfDamage: 16, push: 360, maxRise: 460, tileDamage: 70, scenery: true } },
  SAPPER:  { plantRange: 80, plantMs: 550, fuse: 2.0, cd: 4.5,
             blast: { radius: 54, maxDamage: 40, minDamage: 10, enemyDamage: 30, selfDamage: 28, push: 380, maxRise: 500, enemy: true, tileDamage: 120 } },
  BROOD:   { speed: 26, cd: 3.8, tellMs: 700, spawn: 2, max: 5, burst: 4 },
  CANISTER: { radius: 58, maxDamage: 70, minDamage: 20, selfDamage: 18, push: 420, maxRise: 560, tileDamage: 80, scenery: true },
  CRYO:    { cooldown: 60, range: 110, cone: 12, chill: 0.11, damage: 1.5, thaw: 3.2 },
  SENTRY:  { recharge: 12, life: 14, range: 250, rate: 0.11, damage: 6, hp: 60, turn: 7 },
  SCREAMER: { speed: 270, windMs: 500, turn: 3.2,
              boom: { radius: 42, maxDamage: 40, minDamage: 10, enemyDamage: 25, selfDamage: 20, push: 340, maxRise: 460, enemy: true, tileDamage: 60 } },
  WARDEN:  { range: 120, links: 2, soak: 0.25 },
  JUGG:    { speed: 34, spinMs: 650, fireT: 1.8, rate: 0.085, bulletSpeed: 380, damage: 3, turn: 1.4, cd: 2.4 },
  CAMPAIGN_JUGG: { spinMs: 950, fireT: 1.25, rate: 0.14, turn: 1.1, cd: 3.4 },
  RAMPAGE: { time: 6000, fire: 0.6, damage: 1.25 },
  PRISM:   { cooldown: 420, damage: 30, bounces: 4, range: 900 },
  HOOK:    { cooldown: 650, speed: 720, range: 270, pull: 480, yank: 430, zipT: 0.9 },
  CLOAKER: { strikeDmg: 20, revealMs: 350, dash: 320 },
  PYRO:    { windMs: 500, fireCd: 2.6,
             burst: { radius: 26, maxDamage: 12, minDamage: 4, enemyDamage: 10, selfDamage: 8, push: 120, maxRise: 200, enemy: true, burn: 2, tileDamage: 12 },
             tank: { radius: 48, maxDamage: 60, minDamage: 15, selfDamage: 18, push: 360, maxRise: 460, burn: 3, tileDamage: 70, scenery: true } },
  GUNSHIP: { speed: 75, alt: 124, volleyCd: 4, dropCd: 9, strafeCd: 6.5,
             crash: { radius: 90, maxDamage: 120, minDamage: 30, selfDamage: 30, push: 520, maxRise: 640, tileDamage: 140, scenery: true } },
  CAMPAIGN_GUNSHIP: { hp: 360, firstVolley: 3.5, volleyCd: 5.5, rocketTellMs: 950, rockets: 2, rocketGapMs: 520,
                       firstDrop: 12, firstStrafe: 8, strafeTellMs: 700, strafeCd: 8, rounds: 9, shotGap: 0.14, recovery: 2.8 },
  // ---- overdrive round ----
  DASH:    { speed: 440, time: 0.15, cd: 0.55, iframes: 0.2, keep: 0.55 },
  RIPPER:  { cooldown: 55, damage: 5, reach: 24, half: 7, heal: 6, tile: 9 },
  HORNET:  { cooldown: 650, lockMs: 150, maxLocks: 6, perTarget: 3, lockRange: 330, lockRadius: 80, speed: 150, top: 390, accel: 760, turn: 7.5, life: 3,
             blast: { radius: 24, maxDamage: 28, minDamage: 10, selfDamage: 3, push: 140, maxRise: 220, tileDamage: 30 } },
  LANCE:   { cooldown: 450, charge: 1.0, minDamage: 35, maxDamage: 170, range: 760, bore: 5, recoil: 420, burn: 3, vent: 2.2, ventDmg: 8,
             burst: { radius: 46, maxDamage: 70, minDamage: 20, selfDamage: 10, push: 360, maxRise: 460, tileDamage: 90, burn: 2 } },
  GLAIVE:  { cooldown: 260, speed: 470, range: 200, damage: 24, grind: 11, grindMs: 140, hover: 2.4, back: 520 },
  SLAGLING: { hop: [0.45, 0.9], vx: 120, vy: [230, 320] },
  BURROWER: { speed: 150, tellMs: 700, rise: 430, exposed: 1.0, cd: [1.2, 2.2], dmg: 22 },
  HARPOON:  { windMs: 600, speed: 430, range: 260, reel: 270, reelT: 1.4, hookDmg: 6, slashDmg: 16, breakDmg: 25, cd: 3.4 },
  LINKER:   { speed: 95, gap: 170, chargeMs: 800, liveMs: 2000, offMs: 1800, dmg: 12, enemyDps: 30, pair: 420 },
  TIDE:     { calm: 11, warn: 2.2, rise: 3, hold: 6, fall: 3, top: 372, floor: 400, dmg: 5, tick: 0.4 },
  // ---- crucible round ----
  EXECUTE: { frac: 0.2, minHp: 30, orbs: [2, 3], orbHeal: 5, dropChance: 0.2 },
  HAMMER:  { cooldown: 550, charge: 0.5, swingDmg: 35, swingKnock: 320, reach: 26, slamMin: 30, slamMax: 75, waveMin: 50, waveMax: 120, waveSpeed: 420,
             launch: 330, dive: 640, tile: 40 },
  COIL:    { cooldown: 380, max: 3, speed: 330, lift: 60, life: 12, zapR: 72, zapDmg: 9, zapCd: 0.45, link: 200, fenceDps: 45, overload: 0.45,
             burst: { radius: 50, maxDamage: 45, minDamage: 15, selfDamage: 6, push: 220, maxRise: 300, tileDamage: 20, style: 'arc' } },
  FLAK:    { cooldown: 750, speed: 450, fuse: 0.22, shards: 9, shardSpeed: 520, shardDmg: 9, spread: 26, bounces: 2, direct: 30 },
  MIRROR:  { shieldHp: 80, reflectSpeed: 360, reflectDmg: 8 },
  HIVE:    { max: 12, rate: 0.35, speed: 40, keep: 150 },
  GNAT:    { speed: 170, accel: 520, sting: 4, sep: 9 },
  STITCH:  { range: 320, channel: 1.3, cd: 4, hpFrac: 0.5, breakDmg: 15 },
  WYRM:    { segs: 9, gap: 13, gravity: 700, skimGravity: 420, high: 130, skim: 28, tellMs: 900, cd: [1.4, 2.4], headDmg: 22, segDmg: 12, segTake: 0.6, spit: 0.5 },
  // ---- furnace round ----
  TRACTOR: { cooldown: 300, range: 100, cone: 0.5, throw: 540, crush: 6, impact: 30 },
  ACID:    { cooldown: 45, damage: 1.5, range: 100, cone: 14, corrode: 5, bonus: 1.4, shield: 1.6 },   // shield = seconds of spray to melt a riot shield
  BUZZSAW: { speed: 230, dmg: 14, friendly: 18, owned: 40, steer: 0.35 },
  MAGNET:  { field: 80, bend: 22, pulseCd: 3.5, tellMs: 500, pull: 300, zap: 12 },               // bend = rad/s your shots turn away at the centre
  TARSPIT: { slow: 0.5, jump: 0.72, patch: 7, burnT: 5 },
  // ---- shockworks round ----
  SHOCK:   { cooldown: 600, holdMs: 220, range: 420, beamDmg: 34, orbSpeed: 150, orbLife: 2.4, orbR: 7 },
  SHOCK_ORB:   { radius: 24, minDamage: 10, maxDamage: 26, selfDamage: 6, push: 220, maxRise: 300, tileDamage: 10, style: 'arc' },
  SHOCK_COMBO: { radius: 76, minDamage: 40, maxDamage: 130, selfDamage: 20, push: 480, maxRise: 600, tileDamage: 70, style: 'arc' },
  NEEDLE:  { cooldown: 95, speed: 360, dmg: 4, turn: 6, stick: 7, life: 1.3, fade: 3 },
  NEEDLE_BOOM: { radius: 36, minDamage: 30, maxDamage: 75, selfDamage: 6, push: 220, maxRise: 300, tileDamage: 20, style: 'arc' },
  MIMIC:   { trigger: 46, speed: 150, leap: 260 },
  HOWITZER:{ speed: 34, range: 420, plantMs: 550, shells: 3, gap: 0.22, flight: 1.15, cd: 4.5,
             blast: { radius: 40, maxDamage: 18, minDamage: 6, enemyDamage: 14, selfDamage: 18, push: 300, maxRise: 400, enemy: true, tileDamage: 50 } },
  BLINKER: { tellMs: 450, windMs: 320, dash: 430, dashMs: 300, dmg: 16, lingerMs: 900, cd: 2.2 },
  JETS:    { idle: 9, tell: 1.1, fire: 1.3, stagger: 0.3, dmg: 9 },
  // ---- slagforge round ----
  DRILL:   { cooldown: 900, speed: 260, life: 2.5, grind: 40, grindT: 1.2, wallT: 0.6,
             blast: { radius: 44, maxDamage: 70, minDamage: 20, selfDamage: 14, push: 380, maxRise: 500, tileDamage: 60 } },
  REVOLVER:{ cooldown: 260, fan: 120, dmg: 26, range: 520, rounds: 6, reload: 1.0, ricochet: 220, trickMul: 1.25, spread: 6 },
  GASBAG:  { speed: 42, swellMs: 600, burstR: 34, cloudR: 46, cloudT: 6, dmg: 4 },
  GAS_BOOM:{ radius: 70, maxDamage: 70, minDamage: 20, selfDamage: 25, push: 450, maxRise: 600, tileDamage: 40, burn: 3 },
  WELDER:  { speed: 70, heal: 20, range: 90, buildMs: 1200, buildCd: 12, maxTurrets: 2 },
  TURRET:  { fireCd: 1.3, tellMs: 300, speed: 300, dmg: 6 },
  DUELIST: { windupMs: 300, comboMs: 170, lunge: 300 },
  VOLATILE:{ radius: 40, maxDamage: 35, minDamage: 10, selfDamage: 0, push: 220, maxRise: 300, tileDamage: 15 },
  WALL:    { slide: 90, reach: 3, climbX: 55, jumpX: 110, crossX: 160, jumpK: 1.07, grace: 160, lock: 45 },
  // ---- ironclad round ----
  FLARE:   { cooldown: 700, speed: 330, burn: 6, dps: 10, igniteR: 22, lightR: 90, max: 4 },
  LIMPET:  { cooldown: 300, speed: 300, holdMs: 350, max: 5, gap: 0.06 },
  LIMPET_BOOM: { radius: 38, maxDamage: 55, minDamage: 15, selfDamage: 12, push: 360, maxRise: 480, tileDamage: 45 },
  CREEPER: { speed: 95, drop: 320, bite: 14, ground: 120, climbAfter: 4 },
  ROLLER:  { walk: 40, curlMs: 400, roll: 260, rollT: 2.6, dmg: 18, armour: 0.25, dizzy: 1.2, bounces: 2 },
  JAMMER:  { cd: 5, tellMs: 800, ring: 220, reach: 160, jam: 1.6 },
  PIPE:    { t: 3.5, len: 56, dmg: 6, pdmg: 5, push: 140 },
  AIMASSIST: { range: 260, cone: 0.2, pull: 0.6 },
  // ---- sorting line round ----
  NET:     { cooldown: 800, speed: 280, radius: 26, hold: 3, dps: 6 },
  FLAIL:   { cooldown: 500, r: 30, spinUp: 0.6, w0: 4, w1: 13, hit: 14, throwSpeed: 420, throwDmg: 40, out: 0.5 },
  CLAW:    { track: 90, drop: 420, lift: 200, liftT: 0.8, dmg: 8, throwV: 340, breakDmg: 30, cd: 2.5 },
  SPARKER: { hop: 230, link: 110, dmg: 10 },
  GOLEM:   { speed: 45, throwCd: 3, slamCd: 2.5, scrap: { radius: 26, maxDamage: 14, minDamage: 5, enemyDamage: 12, selfDamage: 12, push: 260, maxRise: 360, enemy: true, tileDamage: 40 } },
  PRESS:   { tell: 0.6, slam: 0.1, hold: 0.45, rise: 1.0, dmg: 40, edmg: 200 },
  // ---- overtime round ----
  ORBITAL: { cooldown: 5000, paint: 0.8, delay: 0.6, fire: 1.0, half: 7, dps: 90, range: 400 },
  CUTTER:  { cooldown: 480, speed: 420, life: 0.7, half: 10, dmg: 30 },
  ECHO:    { lag: 1.5, fireCd: 0.35, speed: 330, dmg: 8 },
  PILFER:  { speed: 210, flee: 160, escape: 15 },
  POGO:    { crouch: 0.25, jump: [380, 460], slam: 600, dmg: 16 },
  ENDLESS: { base: 8, per: 2, max: 22, hpPer: 0.07, cycle: 3 },
  // ---- codex round ----
  SPIDER:  { cooldown: 600, speed: 260, walk: 110, life: 6, max: 4, blast: { radius: 34, maxDamage: 50, minDamage: 15, selfDamage: 10, push: 300, maxRise: 420, tileDamage: 35 } },
  NAPALM:  { cooldown: 1100, speed: 300, splash: 44, burn: 3 },
  BEACON:  { callMs: 3000, cd: 8, adds: 2 },
  SLUG:    { speed: 35, trail: 0.4, pool: 3, spitCd: 3, corrode: 4, dmg: 3 },
  LEECH:   { speed: 190, drain: 3, slow: 0.8 },
  // ---- supply round ----
  SUPPLY:  { first: 22, every: 40, fall: 60, time: 10, aegis: 60, med: 40, eliteHp: 150, eliteChance: 0.3 },
  BEES:    { cooldown: 900, speed: 300, n: 6, life: 4, fly: 230, sting: 4, stingCd: 0.3 },
  WHIP:    { cooldown: 420, reach: 74, dmg: 28, pull: 260 },
  GRENADIER: { windMs: 450, fireCd: 2.6, fuse: 1.6, blast: { radius: 40, maxDamage: 22, minDamage: 6, enemyDamage: 16, selfDamage: 20, push: 320, maxRise: 420, enemy: true, tileDamage: 45 } },
  SPIKEBALL: { speed: 90, rage: 150, dmg: 14 },
  PARA:    { fall: 50, burstCd: 1.5, speed: 300, dmg: 5, walk: 50 },
  // ---- mastery round ----
  SHRINK:  { cooldown: 700, range: 380, time: 8, take: 1.5 },
  SONIC:   { cooldown: 900, range: 110, cone: 0.55, push: 420, dmg: 10 },
  LUGGER:  { speed: 55, reach: 300, throwAt: 220, barrel: { radius: 64, maxDamage: 30, minDamage: 10, enemyDamage: 60, selfDamage: 30, push: 460, maxRise: 600, enemy: true, tileDamage: 60 } },
  BLIMP:   { speed: 40, alt: 80, bombCd: 1.2 },
  STRIDER: { speed: 30, cd: 4, tellMs: 800, sweep: 1.2, arc: 0.5, dmg: 12 },
  MASTERY: [25, 100, 250],
  // ---- finale round ----
  GRAV:    { cooldown: 1000, speed: 360, lift: 90, fuse: 0.9, radius: 90, float: 1.4, rise: 120, slam: 640, slamDmg: 30, dmg: 6 },
  PINBALL: { cooldown: 700, speed: 560, life: 5, bounce: 0.84, dmg: 16, perBounce: 6, maxBounce: 10 },
  WRAITH:  { speed: 50, strikeAt: 85, tellMs: 450, lunge: 300, lungeMs: 380, fadeMs: 1400, dmg: 14 },
  CHILLER: { speed: 50, cd: 2.8, keep: [140, 240], ice: 74, iceT: 8, grip: 0.3, slide: 0.06, chill: 1.5, dmg: 6 },
  WARHORN: { speed: 45, cd: 7, tellMs: 700, radius: 230, time: 6, take: 0.5 },
  MULTI:   { window: 650 },
  // ---- arsenal round ----
  FIREWORK: { cooldown: 650, speed: 300, fuse: [0.45, 0.7], dmg: 18, blast: 10, stars: 10, starDmg: 7, starSpeed: [120, 220], starLife: [0.6, 0.9] },
  KATANA:   { cooldown: 260, reach: 46, arc: 1.9, dmg: 30, dashMul: 1.8, push: 260 },
  ORBITER:  { speed: 55, plates: 3, plateHp: 40, spin: 1.6, radius: 22, cd: 2.2 },
  SWAPPER:  { speed: 60, cd: 6.5, tellMs: 900, range: 360, breakDmg: 20 },
  SCORCHER: { speed: 150, run: 1.6, rest: 1.2, trail: 2.4, take: 1.5 },
  // ---- elite round ----
  ELITE:    { hp: 1.3, armorHp: 2.0, shield: 0.4, shieldDelay: 3500, regen: 0.06,
              boom: { radius: 56, maxDamage: 32, minDamage: 10, selfDamage: 22, push: 300, maxRise: 380, enemy: true } },
  VACUUM:   { cooldown: 450, range: 170, cone: 0.6, pull: 420, store: 24, burst: 16, shard: 9, speed: 520, spread: 20 },
  SIPHON:   { cooldown: 60, range: 140, cone: 0.4, dmg: 2.2, heal: 0.22, slow: 0.75 },
  GRAPPLER: { speed: 55, reach: 30, tellMs: 420, lunge: 260, holdMs: 650, throwX: 430, throwY: 260, dmg: 8, throwDmg: 14, breakDmg: 35 },
  SPOTTER:  { speed: 70, keep: [180, 300], lock: 1.0, take: 1.25, markMs: 1500 },
  HOUND:    { speed: 190, leapAt: 110, tellMs: 260, leapX: 300, leapY: 230, recover: 0.6, flank: 60 },
  // ---- wrecking-yard round ----
  WRECK:    { r: 10, dmg: 60, pdmg: 25 },
  SPLITTER: { cooldown: 650, speed: 430, life: 0.8, dmg: [22, 14, 10, 7], gens: 3, fan: 0.3 },
  DECOY:    { cooldown: 1400, speed: 280, lift: 90, fuse: 0.7, life: 5, pull: 260,
              boom: { radius: 62, maxDamage: 70, minDamage: 20, selfDamage: 14, push: 420, maxRise: 520 } },
  TORCHER:  { speed: 45, reach: 96, sprayMs: 1400, coolMs: 1100, sweep: 0.55, dmg: 7, back: 1.6,
              boom: { radius: 58, maxDamage: 60, minDamage: 18, selfDamage: 18, push: 380, maxRise: 480, scenery: true } },
  DISCUS:   { speed: 70, keep: [150, 250], cd: 3.2, disc: 280, range: 260, dmg: 10, kickDmg: 45 },
  SPOREPOD: { cd: 3.2, n: 3, speed: 70, turn: 2.2, life: 4.5, dmg: 6 },
  // ---- armory round ----
  STASIS:    { cooldown: 1300, speed: 300, lift: 80, fuse: 0.8, radius: 70, time: 3, bonus: 1.25 },
  MICROWAVE: { cooldown: 70, range: 150, cone: 0.35, dmg: 1.5, cook: 0.07, pop: 40, popFrac: 0.15, splash: 25 },
  VORTEX:    { speed: 45, cd: 6, spin: 2.5, tellMs: 600, range: 190, pull: 95, shred: 6, take: 1.25 },
  PYLON:     { cd: 3.6, charge: 1.4, range: 160, dmg: 14, chain: 10 },
  SCAVENGER: { speed: 110, eatMs: 1500, heal: 30, grow: 0.15, maxGrow: 3, leapAt: 70, take: 1.5 },
  // ---- foreman round ----
  GAUNTLET:  { cooldown: 700, dmg: 45, push: 480, splash: 15, boost: 1.45 },
  MARKSMAN:  { cooldown: 1000, dmg: 80, head: 3, range: 900, pierce: 0.6 },
  SHELLBACK: { speed: 40, front: 0.2, flipT: 3, bashAt: 60, tellMs: 400, bash: 230, bashMs: 320 },
  SHINOBI:   { run: 120, leapCd: 1.6, leapY: 380, leapX: 220, starSpeed: 320, starDmg: 7, cling: 0.5 },
  THUNDER:   { speed: 60, alt: 120, cd: 3.2, charge: 0.8, dmg: 16, edmg: 20, w: 12 },
  // ---- mutator round ----
  TRIPWIRE:  { cooldown: 900, speed: 320, max: 2, zap: 25, trips: 4, len: 400,
               boom: { radius: 44, maxDamage: 50, minDamage: 15, selfDamage: 10, push: 320, maxRise: 400 } },
  DRONEPOD:  { cooldown: 4000, n: 2, life: 10, rate: 0.4, dmg: 8, range: 260, orbit: 26 },
  HEADSMAN:  { speed: 40, reach: 44, tellMs: 800, dmg: 30, edmg: 40, crackT: 1.0, recoverMs: 900, take: 1.5 },
  BERSERKER: { speed: 70, rageSpeed: 150, swingAt: 28, swingCd: 0.9, rageCd: 0.45, dmg: 12, take: 1.25 },
  BASTION:   { speed: 40, keep: [120, 220], cd: 6, wallT: 4, wallHp: 60, wallH: 40, fireCd: 1.6 },
  // ---- debrief round ----
  GASLAUNCH: { cooldown: 1100, speed: 280, lift: 80, fuse: 1.0, r: 1.25 },
  BUBBLE:    { cooldown: 380, speed: 200, life: 2.6, float: 2.2, rise: 70, big: 200, dmg: 12 },
  ZEALOT:    { speed: 45, cd: 3, orb: 120, orbDmg: 10, soulR: 180, soulHp: 20, maxSouls: 3 },
  MINELAYER: { speed: 70, cd: 2.5, max: 5, arm: 0.6, trig: 26, fuse: 0.35,
               boom: { radius: 40, maxDamage: 30, minDamage: 10, selfDamage: 22, push: 300, maxRise: 380, enemy: true } },
  RATKING:   { speed: 50, shed: 5, maxRats: 6, burst: 4, ratSpeed: 130 },
  // ---- rush round ----
  SHIELD:    { cooldown: 500, arc: 0.75, reach: 22, slow: 0.6, bash: 30, push: 420 },
  GLUE:      { cooldown: 320, speed: 340, dmg: 6, glueT: 3, slow: 0.35, pud: 6, pudW: 30 },
  PORCUPINE: { speed: 45, per: 40, n: 10, spd: 220, dmg: 6, cd: 5, tellMs: 500 },
  SPONGE:    { speed: 50, cap: 12, spd: 260, dmg: 7 },
  LEAPER:    { speed: 60, cd: 3.5, tellMs: 700, air: 0.8, dmg: 18, recoverMs: 800 },
  // ---- powerhouse round ----
  RAILS:     { idle: [4, 5.5], warn: 1.2, live: 2.2, tick: 0.3, dmg: 6, edmg: 12 },
  NUKE:      { cooldown: 3500, speed: 240, lift: 60, boom: { radius: 120, maxDamage: 220, minDamage: 40, selfDamage: 45, push: 700, maxRise: 800, tileDamage: 80 } },
  DRAGON:    { cooldown: 800, pellets: 6, spread: 16, speed: 420, dmg: 7, burn: 2.5, patch: 0.35, knock: 120 },
  DOZER:     { speed: 50, front: 0.3, rear: 1.5, crush: 20 },
  COPYCAT:   { speed: 60, cd: 2.4 },
  JELLY:     { speed: 30, drop: 36, tick: 0.3, dmg: 6, nova: 50, novaDmg: 18 },
  // ---- gold round ----
  SEED:      { cooldown: 1200, speed: 260, max: 2, grow: 1, life: 9, cd: 1.6, range: 220, dmg: 8, spore: 150 },
  TETHER:    { cooldown: 300, speed: 600, max: 3, share: 0.6, life: 8, dmg: 6 },
  CINDER:    { speed: 150, hop: 260, trail: 1.6, owned: 1.5, ownSpeed: 260, ownDmg: 40 },
  GATLING:   { speed: 35, keep: [140, 260], spin: 0.9, burst: 2.2, rate: 0.07, dmg: 5, turn: 1.2, cool: 1.5, front: 0.6, hot: 1.5 },
  // ---- expansion: enemies ----
  FLAILER:   { speed: 50, close: 26, keep: 60, r: 32, spin: 5.5, windSpin: 12, windMs: 550, cd: [2.8, 3.8], reach: 165, throwSpeed: 420, reel: 460, hit: 12, ehit: 10, throwDmg: 22, ethrowDmg: 20 },
  HOSER:     { speed: 85, keep: [80, 160], range: 190, braceMs: 450, spray: 1.1, turn: 1.8, blast: 340, push: 2600, dmg: 3, tick: 0.3, soak: 1.6, cd: [2.4, 3.2], tank: 72 },
  DEMO:      { speed: 175, lightMs: 700, fuse: 3, hop: 300, drop: 0.7,
               boom: { radius: 52, maxDamage: 36, minDamage: 10, enemyDamage: 40, selfDamage: 30, push: 400, maxRise: 500, enemy: true, tileDamage: 90 },
               shot: { radius: 56, maxDamage: 40, minDamage: 12, enemyDamage: 70, selfDamage: 24, push: 420, maxRise: 520, enemy: true, tileDamage: 90 } },
  PANZER:    { speed: 38, keep: [150, 260], turnMs: 900, gunTurn: 1.8, aimMs: 650, flight: 1.1, cd: [3.4, 4.4], coaxAt: 120, burst: 4, gap: 0.08, coaxDmg: 5, coaxCd: 2.2,
               front: 0.35, rear: 1.5, top: 1.5, boom: { radius: 50, maxDamage: 40, minDamage: 12, selfDamage: 14, push: 360, maxRise: 460, tileDamage: 60, scenery: true } },
  REAPER:    { speed: 70, rush: 110, at: 120, tellMs: 700, whirl: 1.2, drive: 185, r: 20, tick: 0.2, dmg: 9, edmg: 10, dizzy: 1.6, take: 1.75, cd: [2, 3] },
  GULL:      { speed: 95, alt: 105, orbit: 80, screamMs: 520, dive: [0.45, 0.85], rake: 14, cd: [2.4, 3.4], bonk: 0.8 },
  OVERCLOCK: { speed: 60, keep: [160, 260], range: 150, links: 3, charge: 0.5, haste: 1.35 },
  REFRACTOR: { cd: [2.8, 3.6], tellMs: 900, fireMs: 250, bounces: 2, range: 760, dmg: 20, edmg: 15, near: 6, bank: 0.5 },
  MIRAGE:    { speed: 80, keep: [140, 240], fireCd: [2, 2.6], volley: 3, gap: 0.16, boltSpeed: 220, dmg: 6, castMs: 600, castCd: [6, 8], spread: 56, life: 12 },
  CLINGER:   { speed: 150, hold: 2, throwSpeed: 420, flight: 1.2,
               boom: { radius: 40, maxDamage: 30, minDamage: 10, enemyDamage: 30, selfDamage: 28, push: 320, maxRise: 420, enemy: true, tileDamage: 50 },
               thrown: { radius: 44, maxDamage: 60, minDamage: 20, selfDamage: 12, push: 340, maxRise: 440, tileDamage: 60 },
               pop: { radius: 26, maxDamage: 14, minDamage: 4, enemyDamage: 14, selfDamage: 12, push: 220, maxRise: 300, enemy: true, tileDamage: 20 } },
  BANNER:    { speed: 40, keep: [200, 300], radius: 150, heal: 5, plant: 6 },
  FOREMAN:   { speed: 40, rage: 62, cd: 2.2, slamTell: 700, slamDmg: 22, spray: 3, magnet: 1.6, pull: 110, maxHounds: 4, core: 1.3 },
};
const DIFFS = [                                        // title screen: left / right picks one
  { name: 'EASY', dmg: 0.6, hp: 0.8, score: 0.7 },
  { name: 'NORMAL', dmg: 1, hp: 1, score: 1 },
  { name: 'BRUTAL', dmg: 1.4, hp: 1.25, score: 1.5 },
];
const optNum = (key, def, lo, hi) => { try { const v = parseFloat(localStorage.getItem('slaghouse.' + key)); return v >= lo && v <= hi ? v : def; } catch (err) { return def; } };
const OPTS = { shake: optNum('shake', 1, 0, 1), music: optNum('music', 1, 0, 1), sfx: optNum('sfx', 1, 0, 1), diff: optNum('diff', 1, 0, 2) | 0, flash: optNum('flash', 1, 0, 1), mut: optNum('mut', 0, 0, 5) | 0, muted: optNum('muted', 0, 0, 1) | 0 };   // pause menu / title options, remembered
// run mutators (OPTIONS): one at a time, remembered
const MUTATORS = [
  { id: 'none', name: 'NONE', d: 'THE FOUNDRY AS IT COMES.' },
  { id: 'glass', name: 'GLASS CANNON', d: 'YOU DEAL DOUBLE AND TAKE DOUBLE.' },
  { id: 'swarm', name: 'SWARM', d: 'HALF AGAIN AS MANY FOES, A THIRD WEAKER.' },
  { id: 'lowg', name: 'MOON BOOTS', d: 'LOW GRAVITY EVERY WAVE.' },
  { id: 'dark', name: 'LIGHTS OUT', d: 'EVERY WAVE IN THE DARK.' },
  { id: 'vamp', name: 'VAMPIRE', d: 'EVERY KILL HEALS 4. NO MEDKITS.' },
];
const SWARM_SKIP = new Set(['boss', 'foreman', 'jugg', 'wyrm', 'gunship']);   // SWARM never doubles (or thins) a boss
const dailyArena = (day = dayKey()) => Math.floor(seeded(day)() * ARENAS.length);   // the DAILY's arena: the same for everyone that day
// ---- gamepad (standard mapping): polled once per game step so every scene sees the same just-pressed edges ----
//  LS move (down + A drops), RS aim, RT fire, LT mine, A jump, B dash, X kick, Y hook, RB sentry, hold LB wheel,
//  D-pad up/down cycle weapons, Start pause. Menus: D-pad / LS, A pick, B back.
const PAD = {
  b: [], prev: [], ax: [0, 0, 0, 0], on: false, active: false, gp: null, stickY: 0, prevStickY: 0, stickX: 0, prevStickX: 0, rumbleAt: 0,
  poll() {
    let gp = null;
    try { if (navigator.getGamepads) for (const p of navigator.getGamepads()) if (p && p.connected) { gp = p; break; } } catch (err) { gp = null; }
    this.gp = gp; this.on = !!gp; this.prev = this.b;
    this.b = gp ? gp.buttons.map(x => x.value) : [];
    const st = (x, y) => Math.hypot(x, y) < 0.22 ? [0, 0] : [x, y];     // radial dead zone per stick (a per-axis one kills shallow angles)
    this.ax = gp ? [...st(gp.axes[0] || 0, gp.axes[1] || 0), ...st(gp.axes[2] || 0, gp.axes[3] || 0)] : [0, 0, 0, 0];
    this.prevStickY = this.stickY; this.stickY = this.ax[1] < -0.6 ? -1 : this.ax[1] > 0.6 ? 1 : 0;
    this.prevStickX = this.stickX; this.stickX = this.ax[0] < -0.6 ? -1 : this.ax[0] > 0.6 ? 1 : 0;
    if (gp && (this.b.some(v => v > 0.4) || this.ax.some(v => v))) this.active = true;
  },
  down(i) { return (this.b[i] || 0) > 0.4; },
  jd(i) { return this.down(i) && !((this.prev[i] || 0) > 0.4); },
  menuY() { return this.jd(12) || (this.stickY < 0 && this.prevStickY >= 0) ? -1 : this.jd(13) || (this.stickY > 0 && this.prevStickY <= 0) ? 1 : 0; },
  menuX() { return this.jd(14) || (this.stickX < 0 && this.prevStickX >= 0) ? -1 : this.jd(15) || (this.stickX > 0 && this.prevStickX <= 0) ? 1 : 0; },
  rumble(ms, k) {                                                       // a buzz in the hands for hits and blasts (follows the screen-shake setting)
    const a = this.gp && this.gp.vibrationActuator, now = performance.now();
    if (!a || !this.active || OPTS.shake <= 0 || now < this.rumbleAt) return;
    this.rumbleAt = now + 40;
    try { a.playEffect('dual-rumble', { duration: Math.min(ms, 400), strongMagnitude: clamp(k * OPTS.shake, 0, 1), weakMagnitude: clamp(k * 1.4 * OPTS.shake, 0, 1) }); } catch (err) { /* no rumble */ }
  },
};
// The device the player last touched picks the prompts: pad input sets PAD.active in poll(), a key or the mouse clears it.
for (const ev of ['keydown', 'mousemove', 'mousedown', 'wheel']) window.addEventListener(ev, () => { PAD.active = false; }, { passive: true });
// ---- medals: earned in a run, collected for good (localStorage) ----
const MEDALS = [
  { id: 'untouched', name: 'UNTOUCHABLE', d: 'CLEAR A WAVE WITHOUT A SCRATCH' },
  { id: 'trick', name: 'TRICK ARTIST', d: '5 TRICK SHOTS' },
  { id: 'chain', name: 'CHAIN REACTION', d: 'A X20 COMBO' },
  { id: 'exec', name: 'EXECUTIONER', d: '5 EXECUTIONS' },
  { id: 'pyro', name: 'PYROMANIAC', d: '15 KILLS ON BURNING FOES' },
  { id: 'bully', name: 'GRAVITY BULLY', d: '5 CRUSH KILLS' },
  { id: 'jockey', name: 'SHOCK JOCKEY', d: '3 SHOCK COMBOS' },
  { id: 'pin', name: 'PINCUSHION', d: '3 SUPERCOMBINES' },
  { id: 'decor', name: 'INTERIOR DECORATOR', d: '5 WALL SPLATS' },
  { id: 'arsenal', name: 'ARSENAL', d: 'KILLS WITH 15 GUNS' },
  { id: 'rampager', name: 'RAMPAGER', d: '3 RAMPAGES IN A RUN' },
  { id: 'massacre', name: 'MASSACRE', d: 'A 6-KILL CHAIN' },
  { id: 'blademaster', name: 'BLADEMASTER', d: '8 KATANA DEFLECTS IN A RUN' },
  { id: 'elitehunter', name: 'ELITE HUNTER', d: '6 ELITES IN A RUN' },
  { id: 'wrecker', name: 'WRECKING CREW', d: '3 WRECKING-BALL KILLS IN A RUN' },
  { id: 'popcorn', name: 'POPCORN', d: '5 MICROWAVE POPS IN A RUN' },
  { id: 'unionbuster', name: 'UNION BUSTER', d: 'BRING DOWN THE FOREMAN' },
  { id: 'mutant', name: 'MUTANT', d: 'WIN THE CAMPAIGN WITH A MUTATOR ON' },
  { id: 'pest', name: 'PEST CONTROL', d: '15 RATBOTS IN A RUN' },
  { id: 'rusher', name: 'RUSHER', d: 'BEAT BOSS RUSH' },
  { id: 'nukeit', name: 'NUKE IT', d: '5 KILLS WITH ONE MINI-NUKE' },
  { id: 'goldsmith', name: 'GOLDSMITH', d: 'GOLD-PLATE A GUN (3 STARS)' },
  { id: 'ghost', name: 'GHOST STEP', d: '10 DASH DODGES' },
  { id: 'demo', name: 'DEMOLITION', d: 'DETONATE 4 LIMPETS AT ONCE' },
  { id: 'slayer', name: 'SLAG SLAYER', d: 'BEAT THE SMELTER' },
  { id: 'speed', name: 'SPEEDRUNNER', d: 'WIN IN UNDER 10 MINUTES IN ONE RUN' },
  { id: 'ironclad', name: 'IRONCLAD', d: 'WIN ON BRUTAL' },
];
const mutTag = r => { const m = r && r.mut && MUTATORS.find(o => o.id === r.mut); return m ? '  ' + m.name : ''; };   // '  GLASS CANNON' for a record set with a mutator on
// ---- saved progress: read the stored value again right before writing, so two tabs on this origin add up instead of overwriting each other ----
const Store = {
  get(key, valid, fallback) { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return valid(v) ? v : fallback; } catch (err) { return fallback; } },
  update(key, valid, fallback, fn) {                    // returns what was written, or null when storage is blocked (the caller keeps its unsaved changes)
    const v = fn(this.get(key, valid, fallback));
    try { localStorage.setItem(key, JSON.stringify(v)); return v; } catch (err) { return null; }
  },
};
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
// A phone or tablet with no fine pointer can tap through the title but can't play a run without a keyboard or a pad.
const touchOnly = () => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (err) { return false; } };
const loadRec = key => { try { const o = JSON.parse(localStorage.getItem(key) || 'null'); return o && typeof o === 'object' && isFinite(o.score) ? o : null; } catch (err) { return null; } };   // a saved record, or null if it's missing or mangled
const loadMedals = () => { try { const a = JSON.parse(localStorage.getItem('slaghouse.medals') || '[]'); return Array.isArray(a) ? a : []; } catch (err) { return []; } };
// ---- perks: after each wave you pick one of three (they stay for the run) ----
const PERKS = [
  { id: 'hollow', tag: 'HOL', name: 'HOLLOW POINTS', d: ['+20% DAMAGE', 'FROM EVERYTHING', 'YOU DISH OUT'] },
  { id: 'trigger', tag: 'TRG', name: 'HAIR TRIGGER', d: ['GUNS FIRE', '20% FASTER'] },
  { id: 'vampire', tag: 'VMP', name: 'VAMPIRE', d: ['EVERY KILL', 'HEALS 3 HP'] },
  { id: 'boots', tag: 'BTS', name: 'IRON BOOTS', d: ['KICKS HIT TWICE', 'AS HARD AND', 'RECHARGE FASTER'] },
  { id: 'djump', tag: '2JP', name: 'DOUBLE JUMP', d: ['ONE MORE JUMP', 'IN MID-AIR'] },
  { id: 'blast', tag: 'BLS', name: 'BLAST SHIELD', d: ['YOUR OWN BLASTS', 'HURT 75% LESS'] },
  { id: 'burner', tag: 'AFT', name: 'AFTERBURNER', d: ['DASH RECHARGES', '40% FASTER AND', 'IGNITES FOES'] },
  { id: 'scav', tag: 'SCV', name: 'SCAVENGER', d: ['KILLS DROP A', 'HEALTH ORB 15%', 'OF THE TIME'] },
  { id: 'style', tag: 'SHW', name: 'SHOWBOAT', d: ['STYLE BUILDS', '50% FASTER'] },
  { id: 'volatile', tag: 'VOL', name: 'VOLATILE', d: ['1 IN 4 KILLS', 'BLOWS UP'] },
  { id: 'adren', tag: 'ADR', name: 'ADRENALINE', d: ['UNDER 35 HP YOU', 'DEAL 50% MORE'] },
  { id: 'thorns', tag: 'BRB', name: 'BARBED PLATE', d: ['FOES THAT TOUCH', 'YOU TAKE 20'] },
];
// ---- codex: every foe, a silhouette until you've met it ----
const CODEX = [
  ['grunt', 'GRUNT', 'w0', 'A MELTWORKER GONE FERAL. 45 HP, BITES FOR 12, NEVER ALONE.'],
  ['drone', 'DRONE', 'd0', 'HOVERS OUT OF REACH AND SPITS PINK BOLTS. 30 HP.'],
  ['heavy', 'HEAVY', 'w0', 'THE BRUISER. 120 HP, STOMPS THE FLOOR AND HITS FOR 20.'],
  ['enforcer', 'ENFORCER', 'idle0', 'RIFLEMAN. LASER TELL, 3-ROUND BURSTS, RELOADS IN COVER.'],
  ['stalker', 'STALKER', 'idle', 'FAST HUNTER. CIRCLES BEHIND YOU, LEAPS ASIDE, LUNGES FOR 16.'],
  ['bulwark', 'BULWARK', 'idle0', 'RIOT SHIELD STOPS FRONTAL SHOTS. GET OVER IT OR BEHIND IT.'],
  ['mender', 'MENDER', 'm0', 'FIELD MEDIC DRONE. HEALS THE MOST HURT ALLY BY TETHER.'],
  ['sniper', 'SNIPER', 'idle0', 'CLIMBS TO A PERCH. BLUE LASER, THEN A 22-DAMAGE ROUND.'],
  ['tick', 'TICK', 'k0', 'SUICIDE CRAWLER. ARMS ON CONTACT AND BLOWS. THEY CHAIN.'],
  ['rocketeer', 'ROCKETEER', 'idle0', 'LAUNCHER TROOPER. ROCKETS CAN BE SHOT DOWN OR KICKED BACK.'],
  ['wasp', 'WASP', 'p0', 'BOMBER DRONE. FINDS A LANE OVER YOUR HEAD, THEN BOMB RUNS.'],
  ['rammer', 'RAMMER', 'w0', 'ARMOURED CHARGER. SNORT TELL, THEN IT FLATTENS EVERYTHING.'],
  ['jet', 'JET TROOPER', 'j0', 'JETPACK GUNNER. A CLEAN KILL SENDS THE PACK HAYWIRE.'],
  ['sapper', 'SAPPER', 'idle', 'RUNS IN, KNEELS, PLANTS A SATCHEL AND FLEES. SHOOT THE CHARGE.'],
  ['brood', 'BROOD MOTHER', 'w0', 'BIRTHS TICKS EVERY FEW SECONDS. BURSTS INTO MORE WHEN IT DIES.'],
  ['screamer', 'SCREAMER', 's0', 'FLAMING KAMIKAZE SKULL. SHRIEKS, DIVES AND BLOWS.'],
  ['warden', 'WARDEN', 'v0', 'SHIELD DRONE. BUBBLES TWO ALLIES. KILL IT AND THE SHIELDS DROP.'],
  ['jugg', 'JUGGERNAUT', 's0w0', 'MINI-BOSS. SPINS UP A MINIGUN; ARMOUR CRACKS OFF IN STAGES.'],
  ['cloaker', 'CLOAKER', 'idle', 'PHASE-CLOAKED ASSASSIN. ANY HIT REVEALS IT.'],
  ['pyro', 'PYRO', 'idle', 'FIREPROOF FIREBOMBER. ITS TANK GOES UP WHEN IT DIES.'],
  ['gunship', 'GUNSHIP', 'g0', 'FLYING MINI-BOSS. ROCKET VOLLEYS, STRAFING RUNS, DROPS TROOPS.'],
  ['slagling', 'SLAGLING', 'a', 'MOLTEN BLOB. SPLITS BIG, MID, SMALL. SEVEN KILLS EACH.'],
  ['burrower', 'BURROWER', 'sw0', 'SLAG WORM. SWIMS UNDER YOUR FLOOR, ERUPTS UNDER YOUR FEET.'],
  ['harpooner', 'HARPOONER', 'idle', 'CHAIN HARPOON. REELS YOU IN FOR A SLASH. KICK OR DASH FREE.'],
  ['linker', 'LINKER', 'l0', 'FENCE DRONES. PAIRS THROW A BEAM AT CHEST HEIGHT.'],
  ['mirror', 'MIRROR KNIGHT', 'idle0', 'PRISM SHIELD SENDS YOUR SHOTS BACK UNTIL IT SHATTERS.'],
  ['hive', 'HIVE', 'h0', 'FLOATING SAC. KEEPS A GNAT SWARM GOING. KILL IT, THEY DIE OFF.'],
  ['gnat', 'GNAT', 'n0', 'FLOCKING STINGER. 4 HP, STINGS FOR 4 AND DIES DOING IT.'],
  ['stitcher', 'STITCHER', 's0', 'RAISES CORPSES AS REVENANTS. GIB THE BODIES.'],
  ['wyrm', 'SLAG WYRM', 'c', 'MINI-BOSS. NINE-SEGMENT WORM THAT BREACHES AND SKIMS.'],
  ['buzzsaw', 'BUZZSAW', 'z0', 'RICOCHETING BLADE DRONE. KICK IT BACK AND IT IS YOURS.'],
  ['magnet', 'MAGNETRON', 'm0', 'ITS FIELD TURNS BULLETS AWAY. BEAMS AND BLASTS DO NOT CARE.'],
  ['tarspit', 'TAR SPITTER', 'idle', 'LOBS TAR THAT SLOWS YOU. ANY FIRE SETS THE TAR ALIGHT.'],
  ['mimic', 'MIMIC', 'bite', 'AN EXPLOSIVE DRUM WITH TEETH. STILL BLOWS LIKE A DRUM.'],
  ['howitzer', 'HOWITZER', 'w0', 'ARTILLERY TRIPOD. THREE-SHELL BARRAGES WITH LANDING RINGS.'],
  ['blinker', 'BLINKER', 'b0', 'TELEPORTS IN BEHIND YOU AFTER A VIOLET SHIMMER, THEN DASHES.'],
  ['gasbag', 'GASBAG', 'g0', 'BURSTS INTO A TOXIC CLOUD. LIGHT THE CLOUD FOR A FIREBALL.'],
  ['welder', 'WELDER', 'w0', 'REPAIRS DAMAGED MACHINES AND BUILDS MINI TURRETS.'],
  ['turret', 'MINI TURRET', 't0', 'A WELDER BUILT IT. LASER TELL, THEN A BOLT.'],
  ['duelist', 'DUELIST', 'idle', 'READS YOUR AIM AND SIDESTEPS. CHAINS UP TO THREE CUTS.'],
  ['creeper', 'CREEPER', 'c0', 'CEILING SPIDER. DROPS WHEN YOU PASS UNDER IT.'],
  ['roller', 'ROLLER', 'r0', 'CURLS UP AND BOWLS AT YOU. DIZZY AFTER THE LAST WALL.'],
  ['jammer', 'JAMMER', 'j0', 'EMP RING JAMS YOUR GUN. DASH THROUGH THE RING.'],
  ['claw', 'CLAW', 'open', 'CRANE CLAW. GRABS YOU FROM ABOVE AND FLINGS YOU.'],
  ['sparker', 'SPARKER', 's0', 'HOPPING CAPACITORS. ANY TWO LINK WITH A LIVE ARC.'],
  ['golem', 'SCRAP GOLEM', 'g0', 'LOBS SCRAP OVER COVER, SLAMS UP CLOSE, DIES IN SHRAPNEL.'],
  ['echo', 'ECHO', 'idle0', 'YOUR OWN HOLOGRAM, 1.5 S BEHIND. SHOOTS WHEN YOU SHOT.'],
  ['pilferer', 'PILFERER', 'p0', 'THIEF DRONE. STEALS THE GUN IN YOUR HANDS.'],
  ['pogo', 'POGO', 'c', 'SPRING BOT. BOUNCES OVER YOU AND SLAMS DOWN.'],
  ['beacon', 'BEACON', 'b0', 'CALLS REINFORCEMENTS AFTER 3 S. KILL IT FIRST.'],
  ['slug', 'SLUG', 's0', 'ACID TRAIL AND SPIT. CORRODED, YOU TAKE MORE DAMAGE.'],
  ['leech', 'LEECH', 'l0', 'LATCHES ON AND DRAINS YOU. DASH OR KICK TO SHAKE IT OFF.'],
  ['grenadier', 'GRENADIER', 'idle', 'LOBS BOUNCING GRENADES ON A FUSE. KICK THEM BACK.'],
  ['spikeball', 'SPIKEBALL', 'k0', 'A ROLLING SPIKED MINE. GETS FASTER WHEN HURT.'],
  ['para', 'PARATROOPER', 'drop', 'SHOOTS ON THE WAY DOWN. SHOOT THE CHUTE AND IT DROPS.'],
  ['lugger', 'LUGGER', 'w0', 'THROWS THE ARENA\'S DRUMS AT YOU. SHOOT THE ONE IT CARRIES.'],
  ['blimp', 'BLIMP', 'b0', 'BOMBER AIRSHIP. CRASHES IN FLAMES WHEN IT GOES DOWN.'],
  ['strider', 'STRIDER', 'w0', 'TALL WALKER. A SWEEPING LASER AT HEAD HEIGHT: DUCK OR JUMP IT.'],
  ['wraith', 'WRAITH', 'f0', 'DRIFTS THROUGH WALLS. SHRIEKS, THEN LUNGES. SHOOT IT IN THE OPEN.'],
  ['chiller', 'CHILLER', 'w0', 'LOBS FROST THAT ICES THE FLOOR. ON ICE YOU SLIDE. FIRE MELTS IT.'],
  ['warhorn', 'WARHORN', 'w0', 'ITS HORN RALLIES FOES: HALF DAMAGE FOR 6 S. SILENCE IT FIRST.'],
  ['orbiter', 'ORBITER', 'o0', 'PLATES SPIN ROUND ITS CORE AND EAT SHOTS. FIRE THROUGH GAPS.'],
  ['swapper', 'SWAPPER', 'w0', 'TRADES PLACES WITH YOU AFTER A VIOLET TELL. HIT IT TO BREAK IT.'],
  ['scorcher', 'SCORCHER', 'r0', 'SPRINTS IN BURSTS, LEAVING FIRE. WINDED AFTER: X1.5 DAMAGE.'],
  ['grappler', 'GRAPPLER', 'w0', 'GRABS YOU AND HURLS YOU ACROSS THE ROOM. KICK OR DASH FREE.'],
  ['spotter', 'SPOTTER', 's0', 'ITS RED EYE MARKS YOU: EVERY FOE HUNTS YOU, HITS DO +25%.'],
  ['hound', 'HOUND', 'r0', 'RUNS IN PAIRS, FLANKS AND POUNCES. KICK IT OUT OF THE AIR.'],
  ['torcher', 'TORCHER', 'w0', 'SWEEPS A FLAMETHROWER. GET BEHIND IT: THE TANK BLOWS.'],
  ['discus', 'DISCUS', 'w0', 'THROWS A DISC THAT COMES BACK. KICK IT TO RETURN THE FAVOUR.'],
  ['sporepod', 'SPORE POD', 'p0', 'ROOTED FUNGUS. PUFFS HOMING SPORES: SHOOT THEM DOWN.'],
  ['vortex', 'VORTEX', 'v0', 'SPINS UP A VORTEX THAT DRAGS YOU IN AND SHREDS. DASH OUT.'],
  ['pylon', 'ARC PYLON', 'p0', 'CHARGES, THEN ARCS LIGHTNING AT YOU. BREAK ITS LINE OF SIGHT.'],
  ['scavenger', 'SCAVENGER', 'w0', 'EATS THE DEAD TO HEAL AND GROW. CLEAN UP OR KILL IT FAST.'],
  ['shellback', 'SHELLBACK', 'w0', 'ITS SHELL SHRUGS OFF SHOTS FROM THE FRONT. KICK OR BLAST IT OVER.'],
  ['shinobi', 'SHINOBI', 'w0', 'LEAPS WALL TO WALL, THROWING STARS AT THE TOP OF EVERY JUMP.'],
  ['thundercloud', 'THUNDERCLOUD', 'c0', 'HANGS OVER YOU AND DROPS LIGHTNING. KEEP MOVING.'],
  ['headsman', 'HEADSMAN', 'w0', 'A SLOW AXE THAT SPLITS THE FLOOR. ITS AXE STICKS: HIT IT THEN.'],
  ['berserker', 'BERSERKER', 'w0', 'HALF DEAD, IT GOES BERSERK: TWICE AS FAST, BUT SOFTER.'],
  ['bastion', 'BASTION', 'w0', 'THROWS UP A HARD-LIGHT WALL THAT STOPS BULLETS. GO ROUND.'],
  ['zealot', 'ZEALOT', 'w0', 'DRINKS THE SOULS OF FOES DYING NEAR IT. KILL IT FIRST.'],
  ['minelayer', 'MINE LAYER', 'm0', 'SEEDS THE FLOOR WITH PROXIMITY MINES. SHOOT THEM SAFELY.'],
  ['ratking', 'RAT KING', 'w0', 'A KNOT OF RATBOTS. SHEDS THEM AS IT GOES, BURSTS WHEN KILLED.'],
  ['ratbot', 'RATBOT', 'r0', 'SKITTERING NIBBLER. 8 HP. COMES IN PACKS.'],
  ['porcupine', 'PORCUPINE', 'w0', 'EVERY 40 DAMAGE IT TAKES, IT FIRES QUILLS EVERY WHICH WAY.'],
  ['sponge', 'SPONGE', 'w0', 'SOAKS UP BULLETS AND SPITS THEM BACK. BLAST, BURN OR BEAM IT.'],
  ['leaper', 'LEAPER', 'w0', 'MARKS WHERE YOU STAND, LEAPS ONTO IT, SHOCKWAVES ON LANDING.'],
  ['bulldozer', 'BULLDOZER', 'w0', 'ITS PLOW SHOVES EVERYTHING AHEAD AND SHRUGS OFF SHOTS. FLANK IT.'],
  ['copycat', 'COPYCAT', 'c0', 'COPIES THE GUN IN YOUR HAND: BURSTS, SPREADS, LOBS OR BEAMS.'],
  ['jelly', 'JELLYFISH', 'j0', 'DRIFTS OVER YOU TRAILING SHOCK TENDRILS. POPS IN A SHOCK NOVA.'],
  ['cinder', 'CINDER WHEEL', 'w0', 'A BURNING WHEEL THAT ROLLS AND HOPS. KICK IT BACK AT THEM.'],
  ['gatling', 'GATLING', 'w0', 'SPINS UP, THEN HOSES YOU. OUTRUN THE STREAM; HIT IT WHEN HOT.'],
  ['banner', 'BANNER', 'w0', 'PLANTS A BANNER THAT HEALS EVERY FOE NEAR IT. TAKE IT DOWN.'],
  ['flailer', 'FLAILER', 'w0', 'WHIRLS A SPIKED BALL ROUND ITSELF, THEN HURLS IT. GET INSIDE.'],
  ['hoser', 'HOSER', 'w0', 'ITS JET BLASTS YOU BACK AND SOAKS YOU. ITS TANK LEAVES A PUDDLE.'],
  ['demo', 'DEMO RUNNER', 'r0', 'SPRINTS AT YOU WITH LIT DYNAMITE. SHOOT THE BUNDLE FIRST.'],
  ['panzer', 'PANZER', 'w0', 'MINI-TANK THAT LOBS SHELLS. ARMOURED UP FRONT: GET BEHIND IT.'],
  ['reaper', 'REAPER', 'w0', 'WHIRLS ITS SCYTHES AT YOU, THEN REELS. HIT IT WHILE IT IS DIZZY.'],
  ['gull', 'GULL', 'f0', 'CIRCLES HIGH, SCREECHES, THEN SWOOPS TO RAKE YOU.'],
  ['overclock', 'OVERCLOCKER', 'o0', 'BEAMS HASTE INTO THREE FOES. KILL IT AND THE LINKS SNAP.'],
  ['refractor', 'REFRACTOR', 'p0', 'BANKS A LASER OFF TWO WALLS. THE THIN LINE SHOWS ITS PATH.'],
  ['mirage', 'MIRAGE', 'w0', 'PROJECTS TWO DECOYS OF ITSELF. ONLY THE REAL ONE BLEEDS.'],
  ['clinger', 'CLINGER', 'c0', 'CLAMPS ON AND BLOWS. KICK OR DASH IT OFF AT THEM.'],
  ['foreman', 'THE FOREMAN', 'w0', 'OVERTIME BOSS. SLAMS, SPRAYS RIVETS, MAGNETS YOU IN, CALLS HOUNDS.'],
  ['boss', 'THE SMELTER', 'w0', 'THE FOUNDRY WARDEN. MORTARS, SLAMS, SLAG BREATH, OVERHEAT.'],
];
const SEEN = new Set(Store.get('slaghouse.seen', Array.isArray, []));
const markSeen = kind => {                                // adds to the stored list, so another tab's sightings stay
  if (SEEN.has(kind) || !CODEX.some(c => c[0] === kind)) return;
  SEEN.add(kind);
  const all = Store.update('slaghouse.seen', Array.isArray, [], a => [...new Set([...a, ...SEEN])]);
  if (all) all.forEach(k => SEEN.add(k));
};
const POWERS = { dmg: { name: 'OVERDRIVE', col: 0xff3040 }, haste: { name: 'HASTE', col: 0xffe040 }, aegis: { name: 'AEGIS', col: 0x40b0ff }, med: { name: 'MEDPACK', col: 0x40ff80 } };
// ---- daily challenge: the same seeded waves for everyone today ----
const dayKey = () => { const d = new Date(); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };   // UTC, so every time zone shares the day's run
const seeded = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// ---- weapon mastery: lifetime kills per gun; 25 / 100 / 250 earn a star (+5% damage each) ----
const MASTERY = Store.get('slaghouse.mastery', isObj, {});
const masteryStars = id => TUNE.MASTERY.filter(n => (MASTERY[id] || 0) >= n).length;
const LIFE = Object.assign({ kills: 0, runs: 0, deaths: 0, time: 0 }, Store.get('slaghouse.life', isObj, {}));
const addCounts = (into, now, base) => { const o = { ...into }; for (const k in now) if (typeof now[k] === 'number') o[k] = (+into[k] || 0) + now[k] - (base[k] || 0); return o; };   // stored + (ours now - ours at the last save)
let lifeBase = { ...LIFE }, masteryBase = { ...MASTERY };
const saveLife = () => {
  const all = Store.update('slaghouse.life', isObj, {}, o => addCounts(o, LIFE, lifeBase));
  if (all) { Object.assign(LIFE, all); lifeBase = { ...LIFE }; }
};
const saveMastery = () => {
  const all = Store.update('slaghouse.mastery', isObj, {}, o => addCounts(o, MASTERY, masteryBase));
  if (all) { Object.assign(MASTERY, all); masteryBase = { ...MASTERY }; }
};
let RUNMODE = 'campaign';                                // the title's pick: a key of RUN_MODES ('campaign', 'endless' for OVERTIME, 'daily', 'bossrush')
const saveOpt = key => { try { localStorage.setItem('slaghouse.' + key, String(OPTS[key])); } catch (err) { /* private mode */ } };
const WEAPONS = [
  Object.assign({ id: 'nail', name: 'NAILGUN', gun: 'nail' }, TUNE.NAIL),
  Object.assign({ id: 'shotgun', name: 'SHOTGUN', gun: 'shotgun' }, TUNE.SHOTGUN),
  Object.assign({ id: 'grenade', name: 'GRENADES', gun: 'grenade' }, TUNE.GRENADE),
  Object.assign({ id: 'rocket', name: 'ROCKETS', gun: 'rocket' }, TUNE.ROCKET),
  Object.assign({ id: 'arc', name: 'ARC CASTER', gun: 'arc' }, TUNE.ARC),
  Object.assign({ id: 'rail', name: 'RAILGUN', gun: 'rail' }, TUNE.RAIL),
  Object.assign({ id: 'saw', name: 'SAW LAUNCHER', gun: 'saw' }, TUNE.SAW),
  Object.assign({ id: 'flame', name: 'SLAG HOSE', gun: 'flame' }, TUNE.FLAME),
  Object.assign({ id: 'sing', name: 'SINGULARITY', gun: 'sing' }, TUNE.SING),
  Object.assign({ id: 'mini', name: 'RIVET MINIGUN', gun: 'mini' }, TUNE.MINI),
  Object.assign({ id: 'cluster', name: 'CLUSTER MORTAR', gun: 'cluster' }, TUNE.CLUSTER),
  Object.assign({ id: 'stake', name: 'STAKE DRIVER', gun: 'stake' }, TUNE.STAKE),
  Object.assign({ id: 'cryo', name: 'CRYO CANNON', gun: 'cryo' }, TUNE.CRYO),
  Object.assign({ id: 'prism', name: 'PRISM LASER', gun: 'prism' }, TUNE.PRISM),
  Object.assign({ id: 'ripper', name: 'RIPPER', gun: 'ripper' }, TUNE.RIPPER),
  Object.assign({ id: 'hornet', name: 'HORNET POD', gun: 'hornet' }, TUNE.HORNET),
  Object.assign({ id: 'lance', name: 'MAGMA LANCE', gun: 'lance' }, TUNE.LANCE),
  Object.assign({ id: 'glaive', name: 'GLAIVE', gun: 'glaive' }, TUNE.GLAIVE),
  Object.assign({ id: 'hammer', name: 'FORGE HAMMER', gun: 'hammer' }, TUNE.HAMMER),
  Object.assign({ id: 'coil', name: 'STORM COIL', gun: 'coil' }, TUNE.COIL),
  Object.assign({ id: 'flak', name: 'FLAK CANNON', gun: 'flak' }, TUNE.FLAK),
  Object.assign({ id: 'tractor', name: 'TRACTOR', gun: 'tractor' }, TUNE.TRACTOR),
  Object.assign({ id: 'acid', name: 'CORRODER', gun: 'acid' }, TUNE.ACID),
  Object.assign({ id: 'shock', name: 'SHOCK RIFLE', gun: 'shock' }, TUNE.SHOCK),
  Object.assign({ id: 'needler', name: 'NEEDLER', gun: 'needler' }, TUNE.NEEDLE),
  Object.assign({ id: 'drill', name: 'DRILL LAUNCHER', gun: 'drill' }, TUNE.DRILL),
  Object.assign({ id: 'revolver', name: 'TRICK REVOLVER', gun: 'revolver' }, TUNE.REVOLVER),
  Object.assign({ id: 'flare', name: 'FLARE GUN', gun: 'flare' }, TUNE.FLARE),
  Object.assign({ id: 'limpet', name: 'LIMPET LAUNCHER', gun: 'limpet' }, TUNE.LIMPET),
  Object.assign({ id: 'net', name: 'NET GUN', gun: 'net' }, TUNE.NET),
  Object.assign({ id: 'flail', name: 'CHAIN FLAIL', gun: 'flail' }, TUNE.FLAIL),
  Object.assign({ id: 'orbital', name: 'ORBITAL DESIGNATOR', gun: 'orbital' }, TUNE.ORBITAL),
  Object.assign({ id: 'cutter', name: 'PLASMA CUTTER', gun: 'cutter' }, TUNE.CUTTER),
  Object.assign({ id: 'spider', name: 'SPIDER MINES', gun: 'spider' }, TUNE.SPIDER),
  Object.assign({ id: 'napalm', name: 'NAPALM LAUNCHER', gun: 'napalm' }, TUNE.NAPALM),
  Object.assign({ id: 'bees', name: 'BEE SWARM', gun: 'bees' }, TUNE.BEES),
  Object.assign({ id: 'whip', name: 'LASER WHIP', gun: 'whip' }, TUNE.WHIP),
  Object.assign({ id: 'shrink', name: 'SHRINK RAY', gun: 'shrink' }, TUNE.SHRINK),
  Object.assign({ id: 'sonic', name: 'SONIC BLASTER', gun: 'sonic' }, TUNE.SONIC),
  Object.assign({ id: 'grav', name: 'GRAV BOMB', gun: 'grav' }, TUNE.GRAV),
  Object.assign({ id: 'pinball', name: 'PINBALL CANNON', gun: 'pinball' }, TUNE.PINBALL),
  Object.assign({ id: 'firework', name: 'FIREWORK LAUNCHER', gun: 'firework' }, TUNE.FIREWORK),
  Object.assign({ id: 'katana', name: 'PLASMA KATANA', gun: 'katana' }, TUNE.KATANA),
  Object.assign({ id: 'vacuum', name: 'SCRAP VACUUM', gun: 'vacuum' }, TUNE.VACUUM),
  Object.assign({ id: 'siphon', name: 'SIPHON', gun: 'siphon' }, TUNE.SIPHON),
  Object.assign({ id: 'splitter', name: 'SPLITTER', gun: 'splitter' }, TUNE.SPLITTER),
  Object.assign({ id: 'decoy', name: 'DECOY LAUNCHER', gun: 'decoy' }, TUNE.DECOY),
  Object.assign({ id: 'stasis', name: 'STASIS GRENADE', gun: 'stasis' }, TUNE.STASIS),
  Object.assign({ id: 'microwave', name: 'MICROWAVE', gun: 'microwave' }, TUNE.MICROWAVE),
  Object.assign({ id: 'gauntlet', name: 'ROCKET GAUNTLET', gun: 'gauntlet' }, TUNE.GAUNTLET),
  Object.assign({ id: 'marksman', name: 'MARKSMAN RIFLE', gun: 'marksman' }, TUNE.MARKSMAN),
  Object.assign({ id: 'tripwire', name: 'TRIPWIRE', gun: 'tripwire' }, TUNE.TRIPWIRE),
  Object.assign({ id: 'dronepod', name: 'DRONE POD', gun: 'dronepod' }, TUNE.DRONEPOD),
  Object.assign({ id: 'gaslaunch', name: 'GAS LAUNCHER', gun: 'gaslaunch' }, TUNE.GASLAUNCH),
  Object.assign({ id: 'bubble', name: 'BUBBLE GUN', gun: 'bubble' }, TUNE.BUBBLE),
  Object.assign({ id: 'shield', name: 'RIOT SHIELD', gun: 'shield' }, TUNE.SHIELD),
  Object.assign({ id: 'glue', name: 'GLUE GUN', gun: 'glue' }, TUNE.GLUE),
  Object.assign({ id: 'nuke', name: 'MINI-NUKE', gun: 'nuke' }, TUNE.NUKE),
  Object.assign({ id: 'dragon', name: "DRAGON'S BREATH", gun: 'dragon' }, TUNE.DRAGON),
  Object.assign({ id: 'seed', name: 'SEED LAUNCHER', gun: 'seed' }, TUNE.SEED),
  Object.assign({ id: 'tether', name: 'TETHER GUN', gun: 'tether' }, TUNE.TETHER),
];
// one line per gun for the weapon wheel
const BLURBS = {
  nail: 'FAST NAILS. THE OLD RELIABLE.', shotgun: '5 PELLETS. BEST UP CLOSE.', grenade: 'BOUNCING LOBS ON A 1.4 S FUSE.',
  rocket: 'BIG BLAST. ROCKET-JUMP ON IT.', arc: 'A LIGHTNING BEAM THAT CHAINS.', rail: 'PIERCES EVERY BODY ON THE LINE.',
  saw: 'BLADES THAT RICOCHET 4 TIMES.', flame: 'SHORT CONE. SETS FOES ALIGHT.', sing: 'AN ORB THAT OPENS A GRAVITY WELL.',
  mini: 'SPIN IT UP, THEN HOSE THEM DOWN.', cluster: 'AIRBURSTS INTO BOMBLETS.', stake: 'HEAVY STAKES PIN FOES TO WALLS.',
  cryo: 'CHILLS, THEN FREEZES INTO STATUES.', prism: 'A BEAM THAT BOUNCES OFF WALLS.', ripper: 'A HELD CHAIN BLADE. 90 DPS.',
  hornet: 'HOLD TO LOCK ON, LET GO: MISSILES.', lance: 'CHARGE A MOLTEN BEAM. UP TO 170.', glaive: 'A RING THAT FLIES OUT AND BACK.',
  hammer: 'SWING, OR HOLD TO SLAM THE FLOOR.', coil: 'STICKY TESLA COILS THAT ARC.', flak: 'A SHELL THAT BURSTS INTO SHARDS.',
  tractor: 'GRAB DRUMS AND FOES. THROW THEM.', acid: 'ACID CONE. CORRODED FOES TAKE MORE.', shock: 'TAP AN ORB, HOLD A BEAM: COMBO.',
  needler: 'HOMING NEEDLES THAT SUPERCOMBINE.', drill: 'BORES THROUGH CRATES AND GIRDERS.', revolver: 'SIX ROUNDS. HOLD TO FAN THE HAMMER.',
  flare: 'STICKS AND BURNS. LIGHTS THE DARK.', limpet: 'STICKY BOMBS. HOLD TO SET OFF ALL.', net: 'TANGLES EVERYTHING IT CATCHES.',
  flail: 'HOLD: A SPIKED BALL WHIRLS ROUND.', orbital: 'PAINT A SPOT. A BEAM FROM ABOVE.', cutter: 'A FLAT PLASMA BLADE. CUTS ROWS.',
  spider: 'MINES THAT SCUTTLE AT FOES.', napalm: 'FUEL CANS THAT SPLASH FIRE.', bees: 'A HIVE POD OF HOMING STINGERS.',
  whip: 'A LONG CRACK THAT DRAGS FOES IN.', shrink: 'SHRINK A FOE. LAND ON IT: SQUISH.', sonic: 'A CONE OF SOUND. SHOVES AND STUNS.',
  grav: 'FLOATS FOES UP, THEN SLAMS THEM.', pinball: 'BOUNCES. HITS HARDER EVERY BOUNCE.',
  firework: 'WILD ROCKETS THAT BURST INTO STARS.', katana: 'SLASH. BATS SHOTS BACK. DASH-CUT.',
  vacuum: 'HOLD: SUCK UP SCRAP. LET GO: BLAST.', siphon: 'A DRAIN BEAM. HEALS YOU AS IT HURTS.',
  splitter: 'A BOLT THAT SPLITS IN TWO ON IMPACT.', decoy: 'A HOLO YOU. FOES GO FOR IT. IT BLOWS.',
  stasis: 'A FIELD THAT STOPS TIME. HITS STACK.', microwave: 'COOK A FOE UNTIL IT POPS.',
  gauntlet: 'A ROCKET PUNCH. YOU GO WITH IT.', marksman: 'SCOPED. PIERCES. HEADSHOTS X3.',
  tripwire: 'STICKS ANYWHERE. ITS BEAM ZAPS FOES.', dronepod: 'TWO GUN DRONES ORBIT YOU FOR 10 S.',
  gaslaunch: 'A CLOUD THAT EATS FOES. LIGHT IT UP.', bubble: 'TRAPS FOES IN BUBBLES. POP TO DROP.',
  shield: 'HOLD: BLOCK, REFLECT. LET GO: BASH.', glue: 'GLUE GLOBS. GUMMED-UP FOES CRAWL.',
  nuke: 'ONE SLOW SHELL. ONE VERY BIG BANG.', dragon: 'BURNING BUCKSHOT. SETS FLOORS ALIGHT.',
  seed: 'PLANTS A FUNGUS THAT SPORES FOES.', tether: 'LINK 3 FOES. HURT ONE, HURT ALL.',
};
// Keyboard bindings (#109). The scene reads keys by name (this.keys.W, this.jd.SPACE), and each name sits on one or two
// physical keys by KeyboardEvent.code, so WASD, the number row and the punctuation weapon keys stay where they are on
// any layout, whatever the keys print. The defaults are the US positions. OPTIONS > KEYS rebinds them (slaghouse.binds),
// and every hint, the CONTROLS page and the weapon slot labels follow, using the keyboard's own labels where the
// browser gives them (navigator.keyboard) and the pixel font can draw them.
const SLOT_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO', 'MINUS', 'PLUS', 'BACKSPACE', 'OPEN_BRACKET',
  'CLOSED_BRACKET', 'BACK_SLASH', 'SEMICOLON', 'QUOTES', 'COMMA', 'PERIOD', 'FORWARD_SLASH', 'Z', 'X', 'K', 'L', 'U', 'I', 'O', 'Y', 'H'];   // weapon slots 1-30
const BIND_DEFAULTS = {
  A: ['KeyA'], D: ['KeyD'], W: ['KeyW'], S: ['KeyS'], LEFT: ['ArrowLeft'], RIGHT: ['ArrowRight'], UP: ['ArrowUp'], DOWN: ['ArrowDown'],
  SPACE: ['Space'], SHIFT: ['ShiftLeft', 'ShiftRight'], J: ['KeyJ'], F: ['KeyF'], G: ['KeyG'], C: ['KeyC'], T: ['KeyT'], TAB: ['Tab'],
  Q: ['KeyQ'], E: ['KeyE'], R: ['KeyR'], ESC: ['Escape'], P: ['KeyP'], ENTER: ['Enter', 'NumpadEnter'], M: ['KeyM'], N: ['KeyN'], B: ['KeyB'],
  V: ['KeyV'], ONE: ['Digit1'], TWO: ['Digit2'], THREE: ['Digit3'], FOUR: ['Digit4'], FIVE: ['Digit5'], SIX: ['Digit6'], SEVEN: ['Digit7'],
  EIGHT: ['Digit8'], NINE: ['Digit9'], ZERO: ['Digit0'], MINUS: ['Minus'], PLUS: ['Equal'], BACKSPACE: ['Backspace'], OPEN_BRACKET: ['BracketLeft'],
  CLOSED_BRACKET: ['BracketRight'], BACK_SLASH: ['Backslash'], SEMICOLON: ['Semicolon'], QUOTES: ['Quote'], COMMA: ['Comma'], PERIOD: ['Period'],
  FORWARD_SLASH: ['Slash'], Z: ['KeyZ'], X: ['KeyX'], K: ['KeyK'], L: ['KeyL'], U: ['KeyU'], I: ['KeyI'], O: ['KeyO'], Y: ['KeyY'], H: ['KeyH'],
};
const BIND_ROWS = [                                // the KEYS page, top to bottom
  ['A', 'MOVE LEFT'], ['D', 'MOVE RIGHT'], ['W', 'UP / JUMP'], ['S', 'DOWN / DROP'], ['LEFT', 'MOVE LEFT 2'], ['RIGHT', 'MOVE RIGHT 2'],
  ['UP', 'UP / JUMP 2'], ['DOWN', 'DOWN / DROP 2'], ['SPACE', 'JUMP'], ['SHIFT', 'DASH'], ['J', 'FIRE ON KEYS'], ['F', 'KICK'], ['G', 'MINE'],
  ['C', 'HOOK'], ['T', 'SENTRY'], ['TAB', 'WEAPON WHEEL'], ['Q', 'PREVIOUS WEAPON'], ['E', 'NEXT WEAPON'], ['R', 'RESTART'], ['ESC', 'PAUSE'],
  ['P', 'PAUSE 2'], ['ENTER', 'CONFIRM'], ['M', 'MUTE'], ['N', 'SAMPLED / SYNTH SFX'], ['B', 'SAMPLED / SYNTH MUSIC'], ['V', 'POST FX'],
  ...SLOT_NAMES.map((n, i) => [n, (i + 1) + ' ' + WEAPONS[i].name]),
];
const CODE_LABELS = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'RSHIFT', ControlLeft: 'CTRL', ControlRight: 'RCTRL', AltLeft: 'ALT',
  AltRight: 'RALT', Tab: 'TAB', Escape: 'ESC', Enter: 'ENTER', NumpadEnter: 'ENTER', Backspace: 'BKSP', CapsLock: 'CAPS', ArrowUp: 'UP',
  ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  IntlBackslash: 'INTL', Semicolon: ';', Quote: "'", Backquote: 'GRAVE', Comma: ',', Period: '.', Slash: '/', Insert: 'INS', Delete: 'DEL',
  Home: 'HOME', End: 'END', PageUp: 'PGUP', PageDown: 'PGDN' };
let KEY_LAYOUT = null;                             // code -> what this keyboard prints on it, where the browser tells us
function keyLabel(code) {
  const ch = KEY_LAYOUT && KEY_LAYOUT.get(code);
  if (ch && ch.trim() && [...ch.toUpperCase()].every(c => FONT[c])) return ch.toUpperCase();   // only what the pixel font can draw
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  const m = /^(?:Key|Digit)(\w)$/.exec(code), n = /^Numpad(\w+)$/.exec(code);
  return m ? m[1] : n ? 'NUM' + n[1].toUpperCase().slice(0, 3) : code.toUpperCase().slice(0, 6);
}
function loadBinds() {                             // a saved binding wins only if it's one or two plausible key codes
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('slaghouse.binds') || 'null'); } catch (err) { /* private mode or junk */ }
  const out = {};
  for (const [name, def] of Object.entries(BIND_DEFAULTS)) {
    const v = saved && saved[name];
    out[name] = Array.isArray(v) && v.length >= 1 && v.length <= 2 && v.every(c => typeof c === 'string' && /^[A-Za-z0-9]{2,24}$/.test(c)) ? v.slice() : def.slice();
  }
  return out;
}
loadBinds.defaults = () => Object.fromEntries(Object.entries(BIND_DEFAULTS).map(([n, c]) => [n, c.slice()]));
let BINDS = loadBinds();
function saveBinds() { try { localStorage.setItem('slaghouse.binds', JSON.stringify(BINDS)); } catch (err) { /* private mode */ } }
const bindLabel = name => keyLabel(BINDS[name][0]);
const bindRow = name => (BIND_ROWS.find(r => r[0] === name) || [name, name])[1];
const SLOT_KEYS = [];                              // the HUD's short label per weapon slot (< = backspace); wheel-only guns get a space
function slotLabels() {
  SLOT_KEYS.length = 0;
  WEAPONS.forEach((w, i) => { const c = SLOT_NAMES[i] && BINDS[SLOT_NAMES[i]][0]; SLOT_KEYS.push(!c ? ' ' : c === 'Backspace' ? '<' : keyLabel(c).slice(0, 2)); });
}
slotLabels();
// elite foes: one trait each, a coloured aura and a diamond over the head
const ELITE_KINDS = ['armored', 'shielded', 'volatile', 'regen'];
const ELITE_COL = { armored: 0x9ab8d8, shielded: 0x46e6ff, volatile: 0xff6a20, regen: 0x5cff7a };
const NO_ELITE = new Set(['boss', 'foreman', 'jugg', 'wyrm', 'wyrmseg', 'gunship', 'hive', 'turret', 'mimic', 'echo', 'burrower', 'gnat', 'slagling', 'slagmid', 'slagbit', 'demo', 'mirage', 'clinger']);
// One record per foe kind: stats, hitbox and gibs, plus what the scene looks up by kind: frame0 is the frame it
// spawns on, flier means no gravity and air spawn points, humanoid means head shots, cover and alerts, and update
// names the GameScene method that runs it each frame (updateWalker for the plain ones). visuals names the method
// that draws its own glow, beams and tells each frame (none for the plain ones), and marks says which shared status
// marks draw over it first: all of them (a net, a microwave's swell, a bubble, stasis) unless it says 'net' for only
// the net or 'none'. death names the method for its own death: blasts, spills, loose parts, a boss's fall (none for
// the ones that just burst). setup names the method that gives it its own fields, images and start position when it
// spawns (setupHumanoid for the humanoids without their own, setupMolten for the slag; the grunt needs none). armour
// names a method that adjusts each hit on it in damageEnemy before difficulty and perks (a plate, a weak spot, a fuse
// a shot sets off), and contact one that runs when it touches you instead of the plain bite and says whether it dealt
// with the touch (a blast, a clamp, a rake). FLIERS and isHumanoid below are built from these, and
// dev/playtest/kinds.js checks every kind (#52).
// The rest are values killEnemy reads, all left out on most kinds: ragdoll drops it as a ragdoll you can keep shooting
// on a light kill (it needs RAG art), haywire sends its jetpack off on one, noAirStyle skips the airborne kill bonus,
// deathFlash is the colours of a flash as it dies, killZoom a camera punch, gibPower the least force its gibs fly
// with and gibSpread how far apart they start (5 px otherwise), noGibs none at all, burstSparks and burstFire add
// sparks or fire to its blood burst, killShake is [ms, intensity] and killStop the hit stop in ms (120 / 45
// otherwise), dropGun the icon its gun drops as (icon_rifle otherwise), winDelay holds the win that long when it's
// the last foe, and skipOneLeft skips the ONE LEFT callout it would set off (#145).
const ENEMY = {
  grunt: { key: 'grunt', frame0: 'w0', update: 'updateWalker', fw: 20, fh: 18, bw: 12, bh: 14, hp: 45, patrol: 42, chase: 150, jumpV: 360, sight: 190, range: 70, touch: 12, kb: 1,
           gibs: ['g_flesh1', 'g_flesh2', 'g_flesh3', 'g_jaw', 'g_chunk', 'g_bone', 'g_rib', 'g_plate', 'g_chunk'], gibN: [11, 15], ragdoll: true },
  heavy: { key: 'heavy', frame0: 'w0', setup: 'setupHeavy', update: 'updateWalker', visuals: 'visHeavy', fw: 28, fh: 28, bw: 18, bh: 24, hp: 120, patrol: 30, chase: 92, jumpV: 330, leapV: 330, sight: 220, range: 60, touch: 20, kb: 0.35,
           gibs: ['g_core', 'g_plateL', 'g_plateL', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_flesh1', 'g_bone', 'g_rib', 'g_plate', 'g_chunk', 'g_chunk'], gibN: [18, 24], killZoom: 0.08, burstFire: true, killShake: [220, 0.01], killStop: 90 },
  drone: { key: 'drone', frame0: 'd0', flier: true, setup: 'setupDrone', update: 'updateDrone', visuals: 'visDrone', fw: 18, fh: 16, bw: 12, bh: 12, hp: 30, sight: 240, touch: 8, kb: 1.3,
           gibs: ['g_eye', 'g_plateL', 'g_plate', 'g_wire', 'g_wire', 'g_plate', 'g_chunk', 'g_flesh1'], gibN: [9, 12], noAirStyle: true, burstSparks: true },
  enforcer: { key: 'enforcer', frame0: 'idle0', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visRifleman', fw: 18, fh: 24, bw: 10, bh: 20, hp: 60, speed: 120, sight: 300, touch: 8, kb: 0.8, dodge: 0.5, dodgeCd: 1.6, head: 'g_ehelm',
              gibs: ['g_earmor', 'g_earmor', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [12, 16], ragdoll: true },
  stalker: { key: 'stalker', frame0: 'idle', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visStalker', fw: 20, fh: 24, bw: 10, bh: 20, hp: 40, speed: 175, sight: 260, touch: 10, lungeDmg: 16, kb: 1, dodge: 0.55, dodgeCd: 1.2, head: 'g_hood',
             gibs: ['g_blade', 'g_blade', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib'], gibN: [11, 15], ragdoll: true },
  bulwark: { key: 'bulwark', frame0: 'idle0', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visBulwark', fw: 22, fh: 24, bw: 12, bh: 20, hp: 100, speed: 80, sight: 260, touch: 10, kb: 0.3, dodge: 0, dodgeCd: 99, head: 'g_bhelm',
             gibs: ['g_shield', 'g_plateL', 'g_shard', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [14, 18], ragdoll: true, killZoom: 0.08 },
  mender: { key: 'mender', frame0: 'm0', flier: true, setup: 'setupMender', update: 'updateMender', visuals: 'visMender', marks: 'none', fw: 18, fh: 16, bw: 12, bh: 12, hp: 40, sight: 260, touch: 6, kb: 1.2,
            gibs: ['g_mcore', 'g_plate', 'g_wire', 'g_plate', 'g_shard', 'g_shard2', 'g_wire'], gibN: [9, 12], noAirStyle: true, deathFlash: [0xffffff, 0xa0ffc8, 0x40ff90] },
  tick: { key: 'tick', frame0: 'k0', setup: 'setupTick', update: 'updateTick', death: 'deathTick', fw: 14, fh: 10, bw: 10, bh: 8, hp: 12, speed: 150, sight: 260, touch: 0, kb: 1.4, gibs: ['g_chunk', 'g_chunk', 'g_flesh1'], gibN: [4, 6], skipOneLeft: true },
  sniper: { key: 'sniper', frame0: 'idle0', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visRifleman', fw: 18, fh: 24, bw: 10, bh: 20, hp: 45, speed: 110, sight: 520, touch: 6, kb: 0.9, dodge: 0.4, dodgeCd: 2, head: 'g_shood',
            gibs: ['g_earmor', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [11, 14], ragdoll: true, dropGun: 'icon_sniper' },
  rocketeer: { key: 'rocketeer', frame0: 'idle0', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visRifleman', fw: 20, fh: 24, bw: 11, bh: 20, hp: 70, speed: 95, sight: 340, touch: 8, kb: 0.6, dodge: 0.3, dodgeCd: 2, head: 'g_rhelm',
               gibs: ['g_rarmor', 'g_rarmor', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [12, 16], ragdoll: true, dropGun: 'icon_rlaunch' },
  wasp: { key: 'wasp', frame0: 'p0', flier: true, setup: 'setupWasp', update: 'updateWasp', visuals: 'visWasp', fw: 22, fh: 14, bw: 16, bh: 10, hp: 45, sight: 320, touch: 8, kb: 1,
          gibs: ['g_wing', 'g_wing', 'g_plate', 'g_wire', 'g_eye', 'g_plateL', 'g_chunk'], gibN: [9, 12] },
  rammer: { key: 'rammer', frame0: 'w0', setup: 'setupRammer', update: 'updateRammer', visuals: 'visRammer', fw: 30, fh: 22, bw: 22, bh: 18, hp: 170, patrol: 28, chase: 70, sight: 260, touch: 18, kb: 0.15,
            gibs: ['g_horn', 'g_plateL', 'g_plateL', 'g_plateL', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_flesh1', 'g_bone', 'g_rib', 'g_chunk', 'g_chunk'], gibN: [18, 24] },
  jet: { key: 'jet', frame0: 'j0', flier: true, setup: 'setupJet', update: 'updateJet', visuals: 'visJet', fw: 20, fh: 24, bw: 10, bh: 18, hp: 55, sight: 320, touch: 6, kb: 0.9, head: 'g_jhelm',
         gibs: ['g_jarmor', 'g_jarmor', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_wire', 'g_plate'], gibN: [12, 15], haywire: true, dropGun: 'icon_smg' },
  sapper: { key: 'sapper', frame0: 'idle', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visSapper', death: 'deathSapper', fw: 18, fh: 24, bw: 10, bh: 20, hp: 50, speed: 150, sight: 280, touch: 6, kb: 1, dodge: 0.45, dodgeCd: 1.5, head: 'g_smask',
            gibs: ['g_satchel', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [11, 14], ragdoll: true },
  brood: { key: 'brood', frame0: 'w0', setup: 'setupBrood', update: 'updateBrood', visuals: 'visBrood', death: 'deathBrood', fw: 34, fh: 26, bw: 26, bh: 20, hp: 170, sight: 260, touch: 14, kb: 0.2,
           gibs: ['g_egg', 'g_egg', 'g_egg', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_chunk', 'g_rib', 'g_bone'], gibN: [22, 28] },
  cloaker: { key: 'cloaker', frame0: 'idle', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visCloaker', fw: 18, fh: 24, bw: 10, bh: 20, hp: 45, speed: 190, sight: 300, touch: 0, kb: 1, dodge: 0.5, dodgeCd: 1.4, head: 'g_chood',
             gibs: ['g_blade', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [11, 14], ragdoll: true },
  pyro: { key: 'pyro', frame0: 'idle', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visPyro', death: 'deathPyro', fw: 18, fh: 24, bw: 11, bh: 20, hp: 60, speed: 100, sight: 300, touch: 8, kb: 0.8, dodge: 0.3, dodgeCd: 2, head: 'g_pmask',
          gibs: ['g_tank', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [12, 15], ragdoll: true },
  gunship: { key: 'gunship', frame0: 'g0', flier: true, setup: 'setupGunship', update: 'updateGunship', visuals: 'visGunship', death: 'deathGunship', fw: 56, fh: 24, bw: 48, bh: 18, hp: 500, sight: 700, touch: 15, kb: 0.02,
             gibs: ['g_plateL', 'g_plateL', 'g_plateL', 'g_jplate', 'g_jplate', 'g_wire', 'g_wire', 'g_shard', 'g_shard2', 'g_plate', 'g_core'], gibN: [20, 26], noGibs: true },
  screamer: { key: 'screamer', frame0: 's0', flier: true, setup: 'setupScreamer', update: 'updateScreamer', visuals: 'visScreamer', death: 'deathScreamer', fw: 14, fh: 12, bw: 10, bh: 9, hp: 18, sight: 300, touch: 0, kb: 1.4, gibs: ['g_skull', 'g_chunk', 'g_bone'], gibN: [4, 6] },
  warden: { key: 'warden', frame0: 'v0', flier: true, setup: 'setupWarden', update: 'updateWarden', visuals: 'visWarden', death: 'deathWarden', fw: 18, fh: 16, bw: 12, bh: 12, hp: 50, sight: 280, touch: 6, kb: 1.1, gibs: ['g_dish', 'g_plate', 'g_wire', 'g_plate', 'g_shard', 'g_shard2'], gibN: [8, 11] },
  jugg: { key: 'jugg', frame0: 's0w0', setup: 'setupJugg', update: 'updateJugg', visuals: 'visJugg', death: 'deathJugg', fw: 32, fh: 30, bw: 20, bh: 26, hp: 420, sight: 320, touch: 20, kb: 0.1, head: 'g_jughelm',
          gibs: ['g_jplate', 'g_jplate', 'g_jplate', 'g_plateL', 'g_plateL', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_flesh1', 'g_bone', 'g_rib', 'g_chunk', 'g_chunk', 'g_core'], gibN: [24, 30] },
  boss: { key: 'boss', frame0: 'w0', setup: 'setupBoss', update: 'updateBoss', visuals: 'visBoss', death: 'deathBoss', fw: 48, fh: 44, bw: 32, bh: 38, hp: 900, sight: 900, touch: 22, kb: 0.05,
          gibs: ['g_core', 'g_core', 'g_core', 'g_plateL', 'g_plateL', 'g_plateL', 'g_plateL', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_flesh1', 'g_flesh2',
                 'g_bone', 'g_bone', 'g_rib', 'g_rib', 'g_jaw', 'g_shard', 'g_shard2', 'g_shard', 'g_plate', 'g_plate', 'g_chunk', 'g_chunk'], gibN: [34, 40], gibPower: 1.7, gibSpread: 18, winDelay: 1900 },
  // ---- overdrive round ----
  slagling: { key: 'slagling', frame0: 'a', setup: 'setupMolten', update: 'updateSlagling', visuals: 'visMolten', marks: 'none', fw: 26, fh: 20, bw: 20, bh: 15, hp: 70, sight: 300, touch: 12, kb: 0.5, tier: 2, child: 'slagmid', molten: true,
              gibs: ['g_slag', 'g_crust', 'g_slag', 'g_crust', 'g_slag', 'g_slag', 'g_crust'], gibN: [10, 13] },
  slagmid:  { key: 'slagmid', frame0: 'a', setup: 'setupMolten', update: 'updateSlagling', visuals: 'visMolten', marks: 'none', fw: 18, fh: 14, bw: 14, bh: 10, hp: 30, sight: 300, touch: 8, kb: 0.8, tier: 1, child: 'slagbit', molten: true,
              gibs: ['g_slag', 'g_crust', 'g_slag', 'g_slag'], gibN: [6, 8] },
  slagbit:  { key: 'slagbit', frame0: 'a', setup: 'setupMolten', update: 'updateSlagling', visuals: 'visMolten', marks: 'none', fw: 12, fh: 10, bw: 9, bh: 7, hp: 12, sight: 300, touch: 5, kb: 1.2, tier: 0, molten: true, gibs: ['g_slag', 'g_crust'], gibN: [3, 5] },
  burrower: { key: 'burrower', frame0: 'sw0', setup: 'setupBurrower', update: 'updateBurrower', visuals: 'visBurrower', marks: 'none', death: 'deathBurrower', fw: 18, fh: 30, bw: 12, bh: 24, hp: 120, sight: 900, touch: 0, kb: 0.25,
              gibs: ['g_wormseg', 'g_wormseg', 'g_wormseg', 'g_tooth', 'g_tooth', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_chunk', 'g_core', 'g_wormseg'], gibN: [16, 20], burstFire: true },
  harpooner: { key: 'harpooner', frame0: 'idle', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visHarpooner', marks: 'none', fw: 20, fh: 24, bw: 11, bh: 20, hp: 70, speed: 105, sight: 310, touch: 8, kb: 0.7, dodge: 0.3, dodgeCd: 2, head: 'g_hhelm',
               gibs: ['g_chain', 'g_chain', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [12, 15] },
  linker: { key: 'linker', frame0: 'l0', flier: true, setup: 'setupLinker', update: 'updateLinker', visuals: 'visLinker', marks: 'none', death: 'deathLinker', fw: 16, fh: 14, bw: 12, bh: 10, hp: 40, sight: 320, touch: 6, kb: 1.1, mech: true,
            gibs: ['g_emitter', 'g_plate', 'g_wire', 'g_shard', 'g_shard2', 'g_wire'], gibN: [8, 10] },
  // ---- crucible round ----
  mirror: { key: 'mirror', frame0: 'idle0', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visBulwark', fw: 22, fh: 24, bw: 12, bh: 20, hp: 90, speed: 85, sight: 260, touch: 10, kb: 0.3, dodge: 0, dodgeCd: 99, head: 'g_mhelm',
            gibs: ['g_glass', 'g_glass', 'g_glass', 'g_plateL', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib'], gibN: [14, 18] },
  hive: { key: 'hive', frame0: 'h0', flier: true, setup: 'setupHive', update: 'updateHive', visuals: 'visHive', death: 'deathHive', fw: 22, fh: 22, bw: 16, bh: 16, hp: 90, sight: 300, touch: 8, kb: 0.4,
          gibs: ['g_hive', 'g_hive', 'g_hive', 'g_flesh1', 'g_flesh2', 'g_chunk', 'g_chunk', 'g_flesh3'], gibN: [12, 16] },
  gnat: { key: 'gnat', frame0: 'n0', flier: true, setup: 'setupGnat', update: 'updateGnat', marks: 'none', fw: 7, fh: 6, bw: 5, bh: 4, hp: 4, sight: 420, touch: 0, kb: 2, tiny: true, gibs: ['g_chunk'], gibN: [0, 1] },
  stitcher: { key: 'stitcher', frame0: 's0', flier: true, setup: 'setupStitcher', update: 'updateStitcher', visuals: 'visStitcher', death: 'deathStitcher', fw: 18, fh: 16, bw: 12, bh: 12, hp: 55, sight: 300, touch: 6, kb: 1.1, mech: true,
              gibs: ['g_needle', 'g_needle', 'g_plate', 'g_wire', 'g_skull', 'g_shard'], gibN: [9, 12] },
  wyrm: { key: 'wyrm', frame0: 'c', flier: true, setup: 'setupWyrm', update: 'updateWyrm', visuals: 'visWyrm', death: 'deathWyrm', fw: 28, fh: 26, bw: 18, bh: 18, hp: 700, sight: 900, touch: 0, kb: 0.02, noClip: true, noFreeze: true,
          gibs: ['g_wyrmplate', 'g_wyrmplate', 'g_wormseg', 'g_wormseg', 'g_tooth', 'g_tooth', 'g_tooth', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_core', 'g_core', 'g_chunk'], gibN: [20, 26] },
  wyrmseg: { key: 'wyrmseg', frame0: 'a', flier: true, setup: 'setupWyrmseg', update: 'updateWyrmseg', visuals: 'visWyrm', fw: 20, fh: 20, bw: 14, bh: 14, hp: 99999, sight: 900, touch: 0, kb: 0, noClip: true, noFreeze: true,
             gibs: ['g_wyrmplate', 'g_wormseg', 'g_flesh1', 'g_chunk', 'g_wormseg'], gibN: [5, 7] },
  // ---- furnace round ----
  buzzsaw: { key: 'buzzsaw', frame0: 'z0', flier: true, setup: 'setupBuzzsaw', update: 'updateBuzzsaw', visuals: 'visBuzzsaw', marks: 'none', death: 'deathBuzzsaw', fw: 16, fh: 16, bw: 12, bh: 12, hp: 50, sight: 420, touch: 0, kb: 0, mech: true, gibs: ['g_shard', 'g_shard2', 'g_shard', 'g_eye', 'g_wire'], gibN: [8, 10] },
  magnet: { key: 'magnet', frame0: 'm0', flier: true, setup: 'setupMagnet', update: 'updateMagnet', visuals: 'visMagnet', marks: 'none', death: 'deathMagnet', fw: 18, fh: 18, bw: 14, bh: 14, hp: 70, sight: 320, touch: 6, kb: 0.6, mech: true, gibs: ['g_magnet', 'g_magnet', 'g_plate', 'g_wire', 'g_shard', 'g_wire'], gibN: [9, 12] },
  mimic: { key: 'mimic', frame0: 'h', setup: 'setupMimic', update: 'updateMimic', visuals: 'visMimic', death: 'deathMimic', fw: 14, fh: 18, bw: 10, bh: 13, hp: 60, speed: 150, sight: 200, touch: 15, kb: 0.8, gibs: ['g_barrel', 'g_barrel', 'g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone', 'g_flesh3'], gibN: [10, 13] },
  howitzer: { key: 'howitzer', frame0: 'w0', setup: 'setupHowitzer', update: 'updateHowitzer', visuals: 'visHowitzer', death: 'deathHowitzer', fw: 26, fh: 22, bw: 16, bh: 18, hp: 160, speed: 34, sight: 420, touch: 10, kb: 0.35, mech: true, gibs: ['g_plate', 'g_plate', 'g_wire', 'g_shard', 'g_shard2', 'g_eye', 'g_wire'], gibN: [10, 13] },
  blinker: { key: 'blinker', frame0: 'b0', flier: true, setup: 'setupBlinker', update: 'updateBlinker', visuals: 'visBlinker', death: 'deathBlinker', fw: 16, fh: 20, bw: 10, bh: 16, hp: 45, sight: 300, touch: 0, kb: 0.9, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_shard', 'g_wire', 'g_flesh3'], gibN: [8, 11] },
  gasbag: { key: 'gasbag', frame0: 'g0', flier: true, setup: 'setupGasbag', update: 'updateGasbag', visuals: 'visGasbag', death: 'deathGasbag', fw: 18, fh: 20, bw: 14, bh: 14, hp: 30, sight: 300, touch: 0, kb: 0.9, gibs: ['g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk'], gibN: [5, 7] },
  welder: { key: 'welder', frame0: 'w0', setup: 'setupWelder', update: 'updateWelder', visuals: 'visWelder', death: 'deathWelder', fw: 18, fh: 20, bw: 12, bh: 18, hp: 70, speed: 70, sight: 320, touch: 8, kb: 0.7, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_wire', 'g_eye'], gibN: [8, 11] },
  turret: { key: 'turret', frame0: 't0', setup: 'setupTurret', update: 'updateTurret', visuals: 'visTurret', death: 'deathTurret', fw: 14, fh: 10, bw: 12, bh: 9, hp: 30, sight: 300, touch: 0, kb: 0, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard'], gibN: [4, 6] },
  duelist: { key: 'duelist', frame0: 'idle', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visDuelist', fw: 18, fh: 24, bw: 10, bh: 20, hp: 65, speed: 130, chase: 190, sight: 320, touch: 0, kb: 0.8, dodge: 0.75, dodgeCd: 0.7, head: 'g_dmask', lungeDmg: 12,
             gibs: ['g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk', 'g_flesh1'], gibN: [12, 15] },
  creeper: { key: 'creeper', frame0: 'c0', flier: true, setup: 'setupCreeper', update: 'updateCreeper', visuals: 'visCreeper', fw: 16, fh: 10, bw: 12, bh: 8, hp: 40, sight: 360, touch: 14, kb: 1, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone', 'g_flesh3'], gibN: [7, 9] },
  roller: { key: 'roller', frame0: 'r0', setup: 'setupRoller', update: 'updateRoller', visuals: 'visRoller', fw: 18, fh: 18, bw: 14, bh: 14, hp: 90, speed: 40, sight: 320, touch: 10, kb: 0.5, gibs: ['g_plate', 'g_flesh1', 'g_flesh2', 'g_chunk', 'g_plate', 'g_bone'], gibN: [10, 13] },
  jammer: { key: 'jammer', frame0: 'j0', flier: true, setup: 'setupJammer', update: 'updateJammer', visuals: 'visJammer', death: 'deathJammer', fw: 16, fh: 14, bw: 12, bh: 10, hp: 40, sight: 340, touch: 6, kb: 0.9, mech: true, gibs: ['g_shard', 'g_wire', 'g_shard2', 'g_eye', 'g_wire'], gibN: [7, 9] },
  claw: { key: 'claw', frame0: 'open', flier: true, setup: 'setupClaw', update: 'updateClaw', visuals: 'visClaw', marks: 'net', death: 'deathClaw', fw: 16, fh: 12, bw: 12, bh: 10, hp: 120, sight: 420, touch: 0, kb: 0, mech: true, noClip: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_plate', 'g_wire'], gibN: [8, 10] },
  sparker: { key: 'sparker', frame0: 's0', setup: 'setupSparker', update: 'updateSparker', visuals: 'visSparker', fw: 12, fh: 12, bw: 10, bh: 10, hp: 30, sight: 320, touch: 8, kb: 1, mech: true, gibs: ['g_shard', 'g_wire', 'g_eye'], gibN: [4, 6] },
  golem: { key: 'golem', frame0: 'g0', setup: 'setupGolem', update: 'updateGolem', visuals: 'visGolem', death: 'deathGolem', fw: 28, fh: 30, bw: 20, bh: 28, hp: 260, speed: 45, sight: 360, touch: 16, kb: 0.25, mech: true, gibs: ['g_plate', 'g_plate', 'g_plate', 'g_wire', 'g_shard', 'g_shard2', 'g_barrel', 'g_wire'], gibN: [14, 18] },
  echo: { key: 'echo', frame0: 'idle0', flier: true, setup: 'setupEcho', update: 'updateEcho', visuals: 'visEcho', marks: 'net', death: 'deathEcho', fw: 18, fh: 24, bw: 10, bh: 20, hp: 50, sight: 400, touch: 0, kb: 0, mech: true, gibs: [], gibN: [0, 0] },
  pilferer: { key: 'pilferer', frame0: 'p0', flier: true, setup: 'setupPilferer', update: 'updatePilferer', visuals: 'visPilferer', death: 'deathPilferer', fw: 14, fh: 10, bw: 10, bh: 8, hp: 25, sight: 420, touch: 0, kb: 1, mech: true, gibs: ['g_shard', 'g_wire', 'g_eye'], gibN: [4, 6] },
  pogo: { key: 'pogo', frame0: 'c', setup: 'setupPogo', update: 'updatePogo', visuals: 'visPogo', fw: 16, fh: 18, bw: 12, bh: 16, hp: 70, sight: 360, touch: 10, kb: 0.6, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [7, 9] },
  beacon: { key: 'beacon', frame0: 'b0', flier: true, setup: 'setupBeacon', update: 'updateBeacon', visuals: 'visBeacon', fw: 14, fh: 16, bw: 10, bh: 12, hp: 35, sight: 360, touch: 0, kb: 0.7, mech: true, gibs: ['g_shard', 'g_wire', 'g_eye', 'g_shard2'], gibN: [5, 7] },
  slug: { key: 'slug', frame0: 's0', setup: 'setupSlug', update: 'updateSlug', visuals: 'visSlug', death: 'deathSlug', fw: 18, fh: 10, bw: 14, bh: 8, hp: 80, sight: 300, touch: 10, kb: 0.4, gibs: ['g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_flesh1'], gibN: [8, 11] },
  leech: { key: 'leech', frame0: 'l0', flier: true, setup: 'setupLeech', update: 'updateLeech', death: 'deathLeech', fw: 10, fh: 8, bw: 8, bh: 6, hp: 20, sight: 320, touch: 0, kb: 1, gibs: ['g_flesh1', 'g_flesh2'], gibN: [3, 4] },
  grenadier: { key: 'grenadier', frame0: 'idle', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visGrenadier', marks: 'net', fw: 18, fh: 24, bw: 11, bh: 20, hp: 65, speed: 100, sight: 320, touch: 8, kb: 0.7, dodge: 0.3, dodgeCd: 2, head: 'g_gmask',
             gibs: ['g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [12, 15] },
  spikeball: { key: 'spikeball', frame0: 'k0', setup: 'setupSpikeball', update: 'updateSpikeball', visuals: 'visSpikeball', fw: 14, fh: 14, bw: 12, bh: 12, hp: 60, sight: 320, touch: 0, kb: 0, mech: true, gibs: ['g_shard', 'g_shard2', 'g_plate', 'g_shard'], gibN: [6, 8] },
  para: { key: 'para', frame0: 'drop', setup: 'setupPara', update: 'updatePara', visuals: 'visPara', fw: 16, fh: 22, bw: 10, bh: 18, hp: 50, sight: 400, touch: 8, kb: 0.8, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone', 'g_flesh3', 'g_chunk'], gibN: [10, 13] },
  lugger: { key: 'lugger', frame0: 'w0', setup: 'setupLugger', update: 'updateLugger', visuals: 'visLugger', death: 'deathLugger', fw: 22, fh: 26, bw: 16, bh: 24, hp: 140, speed: 55, sight: 340, touch: 14, kb: 0.4, gibs: ['g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk', 'g_flesh1'], gibN: [14, 17] },
  blimp: { key: 'blimp', frame0: 'b0', flier: true, setup: 'setupBlimp', update: 'updateBlimp', visuals: 'visBlimp', death: 'deathBlimp', fw: 34, fh: 20, bw: 28, bh: 14, hp: 220, sight: 500, touch: 0, kb: 0.2, mech: true, noClip: true, gibs: ['g_plate', 'g_plate', 'g_wire', 'g_shard', 'g_shard2', 'g_wire'], gibN: [10, 13] },
  strider: { key: 'strider', frame0: 'w0', setup: 'setupStrider', update: 'updateStrider', visuals: 'visStrider', fw: 20, fh: 36, bw: 12, bh: 34, hp: 150, sight: 420, touch: 10, kb: 0.3, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_eye', 'g_plate', 'g_shard2'], gibN: [10, 13] },
  cinder: { key: 'cinder', frame0: 'w0', setup: 'setupCinder', update: 'updateCinder', visuals: 'visCinder', death: 'deathCinder', fw: 16, fh: 16, bw: 12, bh: 12, hp: 60, speed: 150, sight: 420, touch: 12, kb: 0.5, mech: true, gibs: ['g_plate', 'g_shard', 'g_shard2'], gibN: [6, 8] },
  gatling: { key: 'gatling', frame0: 'w0', setup: 'setupGatling', update: 'updateGatling', visuals: 'visGatling', fw: 22, fh: 24, bw: 14, bh: 20, hp: 150, speed: 35, sight: 420, touch: 10, kb: 0.3, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_plate', 'g_bone'], gibN: [11, 14] },
  banner: { key: 'banner', frame0: 'w0', setup: 'setupBanner', update: 'updateBanner', visuals: 'visBanner', fw: 16, fh: 26, bw: 10, bh: 20, hp: 80, speed: 40, sight: 420, touch: 8, kb: 0.6, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [9, 12] },
  bulldozer: { key: 'bulldozer', frame0: 'w0', setup: 'setupBulldozer', update: 'updateBulldozer', visuals: 'visBulldozer', fw: 26, fh: 20, bw: 22, bh: 16, hp: 180, speed: 50, sight: 380, touch: 14, kb: 0.05, mech: true, gibs: ['g_plate', 'g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [10, 14] },
  copycat: { key: 'copycat', frame0: 'c0', flier: true, setup: 'setupCopycat', update: 'updateCopycat', visuals: 'visCopycat', death: 'deathCopycat', fw: 16, fh: 14, bw: 12, bh: 10, hp: 70, speed: 60, sight: 480, touch: 0, kb: 0.5, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard'], gibN: [6, 8] },
  jelly: { key: 'jelly', frame0: 'j0', flier: true, setup: 'setupJelly', update: 'updateJelly', visuals: 'visJelly', death: 'deathJelly', fw: 16, fh: 20, bw: 12, bh: 10, hp: 50, speed: 30, sight: 400, touch: 0, kb: 0.6, gibs: ['g_flesh1', 'g_flesh2'], gibN: [5, 7] },
  porcupine: { key: 'porcupine', frame0: 'w0', setup: 'setupPorcupine', update: 'updatePorcupine', visuals: 'visPorcupine', fw: 20, fh: 16, bw: 16, bh: 12, hp: 90, speed: 45, sight: 380, touch: 10, kb: 0.5, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [9, 12] },
  sponge: { key: 'sponge', frame0: 'w0', setup: 'setupSponge', update: 'updateSponge', visuals: 'visSponge', fw: 20, fh: 20, bw: 16, bh: 16, hp: 100, speed: 50, sight: 380, touch: 8, kb: 0.2, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk'], gibN: [9, 12] },
  leaper: { key: 'leaper', frame0: 'w0', setup: 'setupLeaper', update: 'updateLeaper', visuals: 'visLeaper', fw: 18, fh: 18, bw: 14, bh: 14, hp: 70, speed: 60, sight: 420, touch: 10, kb: 0.6, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [7, 10] },
  zealot: { key: 'zealot', frame0: 'w0', setup: 'setupZealot', update: 'updateZealot', visuals: 'visZealot', fw: 16, fh: 24, bw: 10, bh: 20, hp: 80, speed: 45, sight: 420, touch: 8, kb: 0.7, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [9, 12] },
  minelayer: { key: 'minelayer', frame0: 'm0', flier: true, setup: 'setupMinelayer', update: 'updateMinelayer', fw: 20, fh: 12, bw: 16, bh: 9, hp: 50, speed: 70, sight: 500, touch: 0, kb: 0.5, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard'], gibN: [5, 7] },
  ratking: { key: 'ratking', frame0: 'w0', setup: 'setupRatking', update: 'updateRatking', death: 'deathRatking', fw: 22, fh: 16, bw: 18, bh: 13, hp: 90, speed: 50, sight: 380, touch: 8, kb: 0.4, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [8, 11] },
  ratbot: { key: 'ratbot', frame0: 'r0', setup: 'setupRatbot', update: 'updateRatbot', fw: 8, fh: 6, bw: 6, bh: 5, hp: 8, speed: 130, sight: 420, touch: 4, kb: 1, tiny: true, mech: true, gibs: ['g_shard'], gibN: [1, 2] },
  headsman: { key: 'headsman', frame0: 'w0', setup: 'setupHeadsman', update: 'updateHeadsman', visuals: 'visHeadsman', fw: 24, fh: 28, bw: 14, bh: 24, hp: 200, speed: 40, sight: 360, touch: 12, kb: 0.2, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_chunk', 'g_bone'], gibN: [14, 18] },
  berserker: { key: 'berserker', frame0: 'w0', setup: 'setupBerserker', update: 'updateBerserker', visuals: 'visBerserker', fw: 18, fh: 24, bw: 12, bh: 20, hp: 100, speed: 70, sight: 380, touch: 10, kb: 0.6, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [10, 13] },
  bastion: { key: 'bastion', frame0: 'w0', setup: 'setupBastion', update: 'updateBastion', fw: 18, fh: 22, bw: 12, bh: 18, hp: 120, speed: 40, sight: 400, touch: 8, kb: 0.4, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_plate'], gibN: [8, 11] },
  shellback: { key: 'shellback', frame0: 'w0', setup: 'setupShellback', update: 'updateShellback', fw: 22, fh: 16, bw: 18, bh: 12, hp: 110, speed: 40, sight: 360, touch: 12, kb: 0.3, gibs: ['g_flesh1', 'g_chunk', 'g_plate', 'g_shard'], gibN: [9, 12] },
  shinobi: { key: 'shinobi', frame0: 'w0', setup: 'setupShinobi', update: 'updateShinobi', fw: 16, fh: 22, bw: 10, bh: 18, hp: 55, speed: 120, sight: 460, touch: 8, kb: 0.8, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [9, 12] },
  thundercloud: { key: 'thundercloud', frame0: 'c0', flier: true, setup: 'setupThundercloud', update: 'updateThunder', visuals: 'visThundercloud', fw: 26, fh: 14, bw: 22, bh: 10, hp: 70, speed: 60, sight: 520, touch: 0, kb: 0.3, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard'], gibN: [6, 9] },
  foreman: { key: 'foreman', frame0: 'w0', setup: 'setupForeman', update: 'updateForeman', visuals: 'visForeman', death: 'deathForeman', fw: 44, fh: 36, bw: 34, bh: 30, hp: 1400, speed: 40, sight: 1200, touch: 18, kb: 0.04, mech: true, noFreeze: true, gibs: ['g_plate', 'g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [18, 24] },
  vortex: { key: 'vortex', frame0: 'v0', flier: true, setup: 'setupVortex', update: 'updateVortex', visuals: 'visVortex', fw: 18, fh: 18, bw: 14, bh: 14, hp: 80, speed: 45, sight: 460, touch: 8, kb: 0.4, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [7, 10] },
  pylon: { key: 'pylon', frame0: 'p0', setup: 'setupPylon', update: 'updatePylon', visuals: 'visPylon', fw: 16, fh: 28, bw: 12, bh: 26, hp: 100, speed: 0, sight: 420, touch: 6, kb: 0, mech: true, gibs: ['g_plate', 'g_wire', 'g_wire', 'g_shard'], gibN: [8, 11] },
  scavenger: { key: 'scavenger', frame0: 'w0', setup: 'setupScavenger', update: 'updateScavenger', fw: 20, fh: 18, bw: 14, bh: 14, hp: 60, speed: 110, sight: 400, touch: 10, kb: 0.8, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [9, 12] },
  torcher: { key: 'torcher', frame0: 'w0', setup: 'setupTorcher', update: 'updateTorcher', visuals: 'visTorcher', death: 'deathTorcher', fw: 22, fh: 24, bw: 14, bh: 20, hp: 140, speed: 45, sight: 340, touch: 10, kb: 0.4, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_plate', 'g_bone'], gibN: [11, 14] },
  discus: { key: 'discus', frame0: 'w0', setup: 'setupDiscus', update: 'updateDiscus', death: 'deathDiscus', fw: 16, fh: 24, bw: 10, bh: 20, hp: 65, speed: 70, sight: 420, touch: 8, kb: 0.8, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [9, 12] },
  sporepod: { key: 'sporepod', frame0: 'p0', setup: 'setupSporepod', update: 'updateSporepod', visuals: 'visSporepod', death: 'deathSporepod', fw: 20, fh: 18, bw: 16, bh: 14, hp: 90, speed: 0, sight: 380, touch: 6, kb: 0, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk'], gibN: [8, 11] },
  grappler: { key: 'grappler', frame0: 'w0', setup: 'setupGrappler', update: 'updateGrappler', fw: 22, fh: 26, bw: 14, bh: 22, hp: 160, speed: 55, sight: 360, touch: 0, kb: 0.3, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_chunk', 'g_bone'], gibN: [12, 16] },
  spotter: { key: 'spotter', frame0: 's0', flier: true, setup: 'setupSpotter', update: 'updateSpotter', visuals: 'visSpotter', fw: 16, fh: 14, bw: 12, bh: 10, hp: 40, speed: 70, sight: 520, touch: 0, kb: 0.6, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard'], gibN: [5, 7] },
  hound: { key: 'hound', frame0: 'r0', setup: 'setupHound', update: 'updateHound', visuals: 'visHound', fw: 22, fh: 14, bw: 16, bh: 10, hp: 45, speed: 190, sight: 420, touch: 10, kb: 0.9, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [6, 9] },
  orbiter: { key: 'orbiter', frame0: 'o0', flier: true, setup: 'setupOrbiter', update: 'updateOrbiter', visuals: 'visOrbiter', death: 'deathOrbiter', fw: 16, fh: 16, bw: 12, bh: 12, hp: 60, speed: 55, sight: 420, touch: 10, kb: 0.4, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_plate'], gibN: [6, 9] },
  swapper: { key: 'swapper', frame0: 'w0', setup: 'setupSwapper', update: 'updateSwapper', visuals: 'visSwapper', fw: 16, fh: 24, bw: 11, bh: 20, hp: 70, speed: 60, sight: 400, touch: 10, kb: 0.6, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [7, 10] },
  scorcher: { key: 'scorcher', frame0: 'r0', setup: 'setupScorcher', update: 'updateScorcher', visuals: 'visScorcher', death: 'deathScorcher', fw: 18, fh: 22, bw: 10, bh: 18, hp: 55, speed: 150, sight: 380, touch: 12, kb: 0.8, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [9, 12] },
  wraith: { key: 'wraith', frame0: 'f0', flier: true, setup: 'setupWraith', update: 'updateWraith', visuals: 'visWraith', death: 'deathWraith', fw: 18, fh: 22, bw: 12, bh: 16, hp: 70, speed: 50, sight: 600, touch: 14, kb: 0.3, mech: true, noClip: true, noFreeze: true, gibs: [], gibN: [0, 0] },
  chiller: { key: 'chiller', frame0: 'w0', setup: 'setupChiller', update: 'updateChiller', visuals: 'visChiller', death: 'deathChiller', fw: 18, fh: 24, bw: 11, bh: 20, hp: 80, speed: 50, sight: 340, touch: 8, kb: 0.6, gibs: ['g_flesh1', 'g_flesh2', 'g_chunk', 'g_shard', 'g_shard2', 'g_bone'], gibN: [10, 13] },
  warhorn: { key: 'warhorn', frame0: 'w0', setup: 'setupWarhorn', update: 'updateWarhorn', fw: 20, fh: 20, bw: 14, bh: 16, hp: 110, speed: 45, sight: 380, touch: 8, kb: 0.5, mech: true, gibs: ['g_plate', 'g_wire', 'g_shard', 'g_plate', 'g_shard2'], gibN: [8, 11] },
  // ---- expansion: enemies ----
  flailer: { key: 'flailer', frame0: 'w0', setup: 'setupFlailer', update: 'updateFlailer', visuals: 'visFlailer', death: 'deathFlailer', contact: 'contactNone', fw: 24, fh: 24, bw: 14, bh: 20, hp: 130, speed: 50, sight: 400, touch: 0, kb: 0.35,
             gibs: ['g_chain', 'g_chain', 'g_plate', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib'], gibN: [12, 16] },
  hoser: { key: 'hoser', frame0: 'w0', setup: 'setupHoser', update: 'updateHoser', visuals: 'visHoser', death: 'deathHoser', fw: 18, fh: 24, bw: 11, bh: 20, hp: 75, speed: 85, sight: 380, touch: 8, kb: 0.7,
           gibs: ['g_hosetank', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib'], gibN: [11, 14] },
  demo: { key: 'demo', frame0: 'r0', setup: 'setupDemo', update: 'updateDemo', visuals: 'visDemo', death: 'deathDemo', armour: 'armourDemo', contact: 'contactDemo', fw: 16, fh: 22, bw: 10, bh: 18, hp: 35, speed: 175, sight: 420, touch: 0, kb: 0.9,
          gibs: ['g_tnt', 'g_tnt', 'g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone'], gibN: [9, 12] },
  panzer: { key: 'panzer', frame0: 'w0', setup: 'setupPanzer', update: 'updatePanzer', visuals: 'visPanzer', death: 'deathPanzer', armour: 'armourPanzer', fw: 30, fh: 20, bw: 26, bh: 15, hp: 200, speed: 38, sight: 460, touch: 12, kb: 0.1, mech: true,
            gibs: ['g_tread', 'g_tread', 'g_plateL', 'g_plateL', 'g_plate', 'g_wire', 'g_shard', 'g_shard2'], gibN: [12, 16], killShake: [220, 0.01], killStop: 80 },
  reaper: { key: 'reaper', frame0: 'w0', setup: 'setupReaper', update: 'updateReaper', visuals: 'visReaper', armour: 'armourReaper', contact: 'contactReaper', fw: 22, fh: 32, bw: 12, bh: 28, hp: 140, speed: 70, sight: 420, touch: 10, kb: 0.4, mech: true,
            gibs: ['g_scythe', 'g_scythe', 'g_plate', 'g_wire', 'g_shard', 'g_eye'], gibN: [10, 13] },
  gull: { key: 'gull', frame0: 'f0', flier: true, setup: 'setupGull', update: 'updateGull', visuals: 'visGull', contact: 'contactGull', fw: 22, fh: 14, bw: 14, bh: 9, hp: 40, speed: 95, sight: 460, touch: 0, kb: 0.9, mech: true,
          gibs: ['g_feather', 'g_feather', 'g_feather', 'g_wire', 'g_plate', 'g_eye'], gibN: [8, 11], noAirStyle: true },
  overclock: { key: 'overclock', frame0: 'o0', flier: true, setup: 'setupOverclock', update: 'updateOverclock', visuals: 'visOverclock', death: 'deathOverclock', contact: 'contactNone', fw: 16, fh: 16, bw: 12, bh: 12, hp: 45, speed: 60, sight: 460, touch: 0, kb: 0.8, mech: true,
               gibs: ['g_coil', 'g_plate', 'g_wire', 'g_shard', 'g_wire'], gibN: [7, 9], noAirStyle: true },
  refractor: { key: 'refractor', frame0: 'p0', setup: 'setupRefractor', update: 'updateRefractor', visuals: 'visRefractor', fw: 18, fh: 18, bw: 14, bh: 14, hp: 90, speed: 0, sight: 520, touch: 6, kb: 0, mech: true,
               gibs: ['g_prism', 'g_prism', 'g_glass', 'g_plate', 'g_wire', 'g_shard'], gibN: [8, 11] },
  mirage: { key: 'mirage', frame0: 'w0', setup: 'setupMirage', update: 'updateMirage', visuals: 'visMirage', death: 'deathMirage', fw: 16, fh: 24, bw: 10, bh: 20, hp: 70, speed: 80, sight: 420, touch: 8, kb: 0.7,
            gibs: ['g_xmask', 'g_flesh1', 'g_flesh2', 'g_chunk', 'g_bone', 'g_rib'], gibN: [10, 13] },
  clinger: { key: 'clinger', frame0: 'c0', flier: true, setup: 'setupClinger', update: 'updateClinger', visuals: 'visClinger', death: 'deathClinger', armour: 'armourClinger', contact: 'contactClinger', fw: 12, fh: 12, bw: 9, bh: 9, hp: 20, speed: 150, sight: 420, touch: 0, kb: 1.2, mech: true,
             gibs: ['g_magnet', 'g_shard', 'g_wire'], gibN: [4, 6], noAirStyle: true },
  tarspit: { key: 'tarspit', frame0: 'idle', humanoid: true, setup: 'setupHumanoid', update: 'updateHumanoid', visuals: 'visTarspit', death: 'deathTarspit', fw: 18, fh: 24, bw: 11, bh: 20, hp: 60, speed: 100, sight: 300, touch: 8, kb: 0.8, dodge: 0.3, dodgeCd: 2, head: 'g_tmask',
             gibs: ['g_tartank', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [12, 15] },
};
const KEEPER_HOP = 290;                             // ranged keepers' hop when blocked: clears the 3-tile step stepOk lets them take (48 px needs 277 at gravity 800)
const HUMANOIDS = new Set(Object.keys(ENEMY).filter(k => ENEMY[k].humanoid));
const isHumanoid = e => HUMANOIDS.has(e.kind);
const isRifleman = e => e.kind === 'enforcer' || e.kind === 'sniper' || e.kind === 'rocketeer';
const BARRELS = [[20, 24], [45, 20], [58, 24], [75, 24], [88, 12], [35, 16]];
const TILE_HP = { x: 55, g: 80, '=': 30 };                        // breakable tiles: crate, girder, grating
const CANISTERS = [[12, 24], [50, 20], [66, 16], [83, 24]];        // gas canisters: shoot one and it rockets about
// Twenty kinds of breakable scenery. Each row: HP; how it mounts ('floor' stands on a tile, 'wall' is bolted to the
// backdrop, 'hang' dangles from whatever is overhead and swings when hit); what it's made of (the chips and the sound a
// hit makes); the methods that run on a hit, on breaking and while it goes off; how long fire takes to cook it off
// (cook); its light ([tint, scale x, scale y, x, y, alpha] from its centre) and the callout when it kills something.
const PROPS = {
  neon:      { hp: 20, mount: 'wall',  mat: 'glass', hit: 'hitNeon', brk: 'breakNeon', live: 'liveNeon', light: [0xff3aa0, 2.6, 1.0, 0, 0, 0.55], call: 'SIGN OFF!' },
  tube:      { hp: 6,  mount: 'hang',  mat: 'glass', brk: 'breakTube', live: 'liveTube', light: [0xc8ecff, 1.8, 0.7, 0, 2, 0.5], cone: [0xd8f2ff, 1.3, 1.5, 0.15], call: 'LIGHTS OUT!' },
  flood:     { hp: 30, mount: 'floor', mat: 'metal', brk: 'breakFlood', live: 'liveFlood', light: [0xfff0c0, 1.1, 1.1, 5, -6, 0.6], beam: [0xfff2d0, 1.7, 2.6, 0.14], call: 'TIMBER!' },
  fuse:      { hp: 15, mount: 'wall',  mat: 'metal', brk: 'breakFuse', live: 'liveFuse', light: [0xff2a14, 0.3, 0.3, 3, -3, 0.7], call: 'SHORT CIRCUIT!' },
  capacitor: { hp: 40, mount: 'floor', mat: 'metal', brk: 'breakCap', live: 'liveCap', light: [0x46a0ff, 0.9, 1.1, 0, -2, 0.35], call: 'OVERCHARGED!' },
  propane:   { hp: 22, mount: 'floor', mat: 'metal', brk: 'breakPropane', live: 'livePropane', cook: 2.2, call: 'COOKED!' },
  toxic:     { hp: 22, mount: 'floor', mat: 'metal', hit: 'hitLeak', brk: 'breakToxic', light: [0x7dff4a, 0.8, 0.5, -2, -5, 0.3], call: 'TOXIC!' },
  cryo:      { hp: 22, mount: 'floor', mat: 'metal', hit: 'hitLeak', brk: 'breakCryo', light: [0x9adcff, 0.8, 1.0, 0, 0, 0.18], call: 'FLASH FROZEN!' },
  oil:       { hp: 18, mount: 'floor', mat: 'metal', hit: 'hitLeak', brk: 'breakOil', cook: 3, call: 'SLICK!' },
  boiler:    { hp: 50, mount: 'floor', mat: 'metal', hit: 'hitBoiler', brk: 'breakBoiler', live: 'liveBoiler', light: [0xff7020, 1.1, 0.6, 0, 11, 0.45], call: 'SCALDED!' },
  fan:       { hp: 30, mount: 'wall',  mat: 'metal', brk: 'breakFan', call: 'FAN MAIL!' },
  ladle:     { hp: 36, mount: 'hang',  mat: 'metal', brk: 'breakLadle', live: 'liveLadle', light: [0xff7a20, 1.6, 0.9, 0, -3, 0.55], call: 'FRESH SLAG!' },
  vending:   { hp: 60, mount: 'floor', mat: 'glass', hit: 'hitVending', brk: 'breakVending', live: 'liveVending', light: [0x3ae8e0, 1.2, 1.6, -2, -2, 0.32], call: 'REFRESHING!' },
  terminal:  { hp: 28, mount: 'floor', mat: 'glass', brk: 'breakTerminal', live: 'liveTerminal', light: [0x46f088, 1.4, 0.8, 0, -3, 0.3], call: 'BLUE SCREEN!' },
  ammo:      { hp: 26, mount: 'floor', mat: 'wood',  brk: 'breakAmmo', live: 'liveAmmo', cook: 1.4, call: 'COOK-OFF!' },
  flares:    { hp: 16, mount: 'floor', mat: 'wood',  brk: 'breakFlares', live: 'liveFlares', cook: 1.2, call: 'SIGNAL FIRE!' },
  ext:       { hp: 8,  mount: 'wall',  mat: 'metal', brk: 'breakExt', live: 'liveExt', call: 'FOGGED!' },
  window:    { hp: 12, mount: 'wall',  mat: 'glass', hit: 'hitWindow', brk: 'breakWindow', call: 'GLASSED!' },
  horn:      { hp: 12, mount: 'wall',  mat: 'metal', brk: 'breakHorn', light: [0xff2a14, 0.45, 0.45, -6, -4, 0.8], call: 'FEEDBACK!' },
  water:     { hp: 40, mount: 'floor', mat: 'metal', hit: 'hitLeak', brk: 'breakWater', call: 'WASHED OUT!' },
};
const PROP_BLAST = {                                               // the props that go bang
  propane: { radius: 72, maxDamage: 85, minDamage: 25, selfDamage: 22, push: 470, maxRise: 600, burn: 3, tileDamage: 70, scenery: true },
  boiler:  { radius: 84, maxDamage: 60, minDamage: 15, selfDamage: 18, push: 640, maxRise: 660, tileDamage: 60, scenery: true },
  small:   { radius: 30, maxDamage: 26, minDamage: 8, selfDamage: 8, push: 240, maxRise: 340, tileDamage: 18, scenery: true },
  slag:    { radius: 40, maxDamage: 40, minDamage: 12, selfDamage: 14, push: 300, maxRise: 380, burn: 2, tileDamage: 30, scenery: true },
};
const FLIERS = new Set(Object.keys(ENEMY).filter(k => ENEMY[k].flier));
const MOD_CARDS = { dark: 'BLACKOUT :: STAY IN THE LIGHT', slag: 'SLAG RAIN :: WATCH THE SKY', lowg: 'LOW GRAVITY :: MIND THE HANG TIME', melt: 'MELTDOWN :: THE FLOOR IS SLAG' };
const POSTFX = { on: (() => { try { return localStorage.getItem('slaghouse.postfx') !== '0'; } catch (err) { return true; } })() };   // V toggles bloom / warp / grading
const STYLE_RANKS = [
  { n: 'D', t: 0, c: '#8f9bab' }, { n: 'C', t: 90, c: '#5cc8ff' }, { n: 'B', t: 220, c: '#5cff7a' }, { n: 'A', t: 400, c: '#ffe14a' },
  { n: 'S', t: 640, c: '#ff9a2a' }, { n: 'SS', t: 920, c: '#ff5a3a' }, { n: 'SSS', t: 1250, c: '#ff3aa0' },
];

