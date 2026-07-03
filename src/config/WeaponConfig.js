// Single source of truth for every weapon in the game.
//
// To add a new weapon: drop its animation frames in assets/player/<id>/ and
// its pickup icon in assets/items/<id>/, then add one entry below. No other
// file needs to change - Player, AnimationManager, AssetLoader,
// WeaponPickup and the HUD all read from this config.
//
// Sprite convention:
//   - The art is drawn facing one canonical direction ("up"/North), as a
//     small round top-down character. There is no per-direction art -
//     AnimationManager rotates the whole sprite at draw time to match the
//     player's aim angle, offset by `baseFacingAngle`.
//   - Each animation state is a list of individual frame files (not a grid
//     sheet), played back at `frameDuration` seconds per frame.
//   - Until a listed file exists on disk, AssetLoader transparently
//     substitutes a procedurally generated placeholder frame - drop the
//     real PNG in and it takes over automatically, no code changes needed.
//   - On-screen draw size is fixed at 40x40 regardless of source resolution
//     (see Player.drawSize / Zombie.drawSize).

export const ANIMATION_STATE = {
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
  SHOOT: 'shoot',
  RELOAD: 'reload',
  ATTACK: 'attack',
  PUNCH: 'punch',
  CHAINSAW_START: 'start',
  CHAINSAW_IDLE_RUNNING: 'idle_running',
  HURT: 'hurt',
  DEATH: 'death',
};

export const WEAPON_CATEGORY = {
  UNARMED: 'unarmed',
  MELEE: 'melee',
  MELEE_POWERED: 'melee_powered', // chainsaw: motor start/loop/attack instead of a single swing
  FIREARM: 'firearm',
};

// Art faces "up" (North) by default; rotate by (aimAngle - (-90deg)) to
// match. Kept as a named default so an individual weapon can override it if
// its source art was drawn facing a different way.
const DEFAULT_BASE_FACING_ANGLE = -Math.PI / 2;

// Per-shot "juice" (hit weight/feedback), read by Game.js when a weapon
// fires or its bullet connects: knockback pushes the target back,
// shakeMagnitude/kickMagnitude drive the camera (see Camera.shake/kick).
// SMG gets a bit more of everything per its own block below.
const BASE_FIREARM_JUICE = { knockback: 220, shakeMagnitude: 4, kickMagnitude: 4 };
const SMG_JUICE = { knockback: 260, shakeMagnitude: 5, kickMagnitude: 5 };

function frameRange(dir, prefix, count) {
  const files = [];
  for (let i = 1; i <= count; i++) {
    files.push(`${dir}/${prefix}_${String(i).padStart(2, '0')}.png`);
  }
  return files;
}

// Every weapon that only has a single authored pose so far reuses that one
// frame across all its generic states. Swap in real per-state frame lists
// as more animation art is delivered - nothing else needs to change.
function singlePoseAnimations(file, { hasShootReload = false, hasPunch = false } = {}) {
  const animations = {
    idle: { frames: [file], frameDuration: 0.3, loop: true },
    walk: { frames: [file], frameDuration: 0.3, loop: true },
    run: { frames: [file], frameDuration: 0.3, loop: true },
    hurt: { frames: [file], frameDuration: 0.15, loop: false },
    death: { frames: [file], frameDuration: 0.5, loop: false },
  };
  if (hasShootReload) {
    animations.shoot = { frames: [file], frameDuration: 0.12, loop: false };
    animations.reload = { frames: [file], frameDuration: 0.3, loop: false };
  }
  if (hasPunch) {
    animations.punch = { frames: [file], frameDuration: 0.1, loop: false };
  }
  return animations;
}

export const WeaponConfig = {
  unarmed: {
    id: 'unarmed',
    displayName: 'Unarmed',
    category: WEAPON_CATEGORY.UNARMED,
    isStartingWeapon: true,
    assetFolder: 'assets/player/unarmed/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasPunch: true }),
    combat: {
      canFire: false,
      melee: { damage: 12, range: 70, cooldown: 0.6, animation: 'punch' },
    },
    sound: { attack: 'punch' },
  },

  chainsaw: {
    id: 'chainsaw',
    displayName: 'Chainsaw',
    category: WEAPON_CATEGORY.MELEE_POWERED,
    assetFolder: 'assets/player/chainsaw/',
    pickupIconFolder: 'assets/items/chainsaw/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: {
      start: { frames: frameRange('start', 'frame', 11), frameDuration: 0.045, loop: false },
      idle_running: { frames: frameRange('idle_running', 'frame', 9), frameDuration: 0.09, loop: true },
      attack: { frames: frameRange('attack', 'frame', 11), frameDuration: 0.035, loop: false },
      // No dedicated hurt/death art yet for the chainsaw pose - placeholder
      // frames render until survivor_chainsaw_hurt/death sequences exist.
      hurt: { frames: ['hurt.png'], frameDuration: 0.15, loop: false },
      death: { frames: ['death.png'], frameDuration: 0.5, loop: false },
    },
    combat: {
      canFire: false,
      melee: { damage: 45, range: 95, cooldown: 0.3, animation: 'attack' },
    },
    // attackLoop plays continuously while the attack button is held (see
    // Player._handleCombatInput) - `attack` is unused now but kept so this
    // matches every other weapon's sound shape.
    sound: { start: 'chainsaw_start', loop: 'chainsaw_loop', attack: 'chainsaw_attack', attackLoop: 'chainsaw_attack_loop' },
    // Continuous rumble while revving/cutting, not a per-shot punch like the
    // firearms below - no knockback/kick, it's melee. See Game._updateChainsawRumble.
    juice: { shakeMagnitude: 4 },
  },

  handgun: {
    id: 'handgun',
    displayName: 'M9 Handgun',
    category: WEAPON_CATEGORY.FIREARM,
    assetFolder: 'assets/player/handgun/',
    pickupIconFolder: 'assets/items/handgun/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasShootReload: true }),
    combat: {
      canFire: true,
      automatic: false,
      damage: 22,
      headshotMultiplier: 2.5,
      fireRate: 0.28,
      magazineSize: 12,
      startingAmmo: 36,
      reloadTime: 1.1,
      pellets: 1,
      spread: 0.02,
      projectileSpeed: 2400,
      range: 1200,
      ejectsCasing: true,
    },
    sound: { shoot: 'handgun_shot', reload: 'pistol_reload', draw: 'pistol_draw', holster: 'pistol_holster' },
    juice: BASE_FIREARM_JUICE,
  },

  revolver: {
    id: 'revolver',
    displayName: 'Revolver',
    category: WEAPON_CATEGORY.FIREARM,
    assetFolder: 'assets/player/revolver/',
    pickupIconFolder: 'assets/items/revolver/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasShootReload: true }),
    combat: {
      canFire: true,
      automatic: false,
      damage: 38,
      headshotMultiplier: 2.8,
      fireRate: 0.45,
      magazineSize: 6,
      startingAmmo: 24,
      reloadTime: 1.6,
      pellets: 1,
      spread: 0.01,
      projectileSpeed: 2600,
      range: 1400,
    },
    sound: { shoot: 'revolver_shot', reload: 'pistol_reload', draw: 'pistol_draw', holster: 'pistol_holster' },
    juice: BASE_FIREARM_JUICE,
  },

  rifle: {
    id: 'rifle',
    displayName: 'Hunting Rifle',
    category: WEAPON_CATEGORY.FIREARM,
    assetFolder: 'assets/player/rifle/',
    pickupIconFolder: 'assets/items/rifle/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasShootReload: true }),
    combat: {
      canFire: true,
      automatic: false,
      damage: 55,
      headshotMultiplier: 3,
      fireRate: 0.85,
      magazineSize: 5,
      startingAmmo: 20,
      reloadTime: 1.7,
      pellets: 1,
      spread: 0.005,
      projectileSpeed: 3200,
      range: 2000,
      ejectsCasing: true,
    },
    // Draw/holster are asymmetric on purpose (matches the source sound set) -
    // drawing plays a sniper-style cue, but holstering shares the same
    // generic rifle_holster used by the M4 below.
    sound: { shoot: 'rifle_shot', reload: 'rifle_reload', draw: 'sniper_draw', holster: 'rifle_holster' },
    juice: BASE_FIREARM_JUICE,
  },

  smg: {
    id: 'smg',
    displayName: 'MAC-10 SMG',
    category: WEAPON_CATEGORY.FIREARM,
    assetFolder: 'assets/player/smg/',
    pickupIconFolder: 'assets/items/smg/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasShootReload: true }),
    combat: {
      canFire: true,
      automatic: true,
      damage: 14,
      headshotMultiplier: 2,
      fireRate: 0.09,
      magazineSize: 30,
      startingAmmo: 90,
      reloadTime: 1.4,
      pellets: 1,
      spread: 0.06,
      projectileSpeed: 2200,
      range: 900,
      ejectsCasing: true,
    },
    sound: { shoot: 'smg_shot', reload: 'smg_reload', draw: 'pistol_draw', holster: 'pistol_holster' },
    juice: SMG_JUICE,
  },

  shotgun: {
    id: 'shotgun',
    displayName: 'Pump Shotgun',
    category: WEAPON_CATEGORY.FIREARM,
    assetFolder: 'assets/player/shotgun/',
    pickupIconFolder: 'assets/items/shotgun/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasShootReload: true }),
    combat: {
      canFire: true,
      automatic: false,
      damage: 18,
      headshotMultiplier: 2,
      fireRate: 0.75,
      magazineSize: 6,
      startingAmmo: 24,
      reloadTime: 0.55,
      reloadPerShell: true,
      pellets: 8,
      spread: 0.18,
      projectileSpeed: 2000,
      range: 550,
      ejectsCasing: true,
    },
    sound: { shoot: 'shotgun_blast', reload: 'shotgun_shell_in', draw: 'shotgun_draw', holster: 'shotgun_holster' },
    juice: BASE_FIREARM_JUICE,
  },

  // A second shotgun variant - identical combat stats and every sound
  // (fire, reload, draw, holster/pickup) to the Pump Shotgun above, just a
  // different look/name, per the source art's own naming.
  shotgun_homestead: {
    id: 'shotgun_homestead',
    displayName: 'Homestead 12 Gauge',
    category: WEAPON_CATEGORY.FIREARM,
    assetFolder: 'assets/player/shotgun_homestead/',
    pickupIconFolder: 'assets/items/shotgun_homestead/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasShootReload: true }),
    combat: {
      canFire: true,
      automatic: false,
      damage: 18,
      headshotMultiplier: 2,
      fireRate: 0.75,
      magazineSize: 6,
      startingAmmo: 24,
      reloadTime: 0.55,
      reloadPerShell: true,
      pellets: 8,
      spread: 0.18,
      projectileSpeed: 2000,
      range: 550,
      ejectsCasing: true,
    },
    sound: { shoot: 'shotgun_blast', reload: 'shotgun_shell_in', draw: 'shotgun_draw', holster: 'shotgun_holster' },
    juice: BASE_FIREARM_JUICE,
  },

  m4: {
    id: 'm4',
    displayName: 'M4 Carbine',
    category: WEAPON_CATEGORY.FIREARM,
    assetFolder: 'assets/player/m4/',
    pickupIconFolder: 'assets/items/m4/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasShootReload: true }),
    combat: {
      canFire: true,
      automatic: true,
      damage: 20,
      headshotMultiplier: 2.2,
      fireRate: 0.11,
      magazineSize: 30,
      startingAmmo: 90,
      reloadTime: 1.5,
      pellets: 1,
      spread: 0.045,
      projectileSpeed: 2600,
      range: 1400,
      ejectsCasing: true,
    },
    // Shares the SMG's exact fire sound (not the bolt-action rifle_shot) -
    // both are full-auto weapons and meant to sound the same when firing.
    sound: { shoot: 'smg_shot', reload: 'rifle_reload', draw: 'rifle_draw', holster: 'rifle_holster' },
    juice: SMG_JUICE,
  },

  bow: {
    id: 'bow',
    displayName: 'Crossbow',
    category: WEAPON_CATEGORY.FIREARM,
    assetFolder: 'assets/player/bow/',
    pickupIconFolder: 'assets/items/bow/',
    baseFacingAngle: DEFAULT_BASE_FACING_ANGLE,
    animations: singlePoseAnimations('idle.png', { hasShootReload: true }),
    combat: {
      canFire: true,
      automatic: false,
      damage: 60,
      headshotMultiplier: 3,
      fireRate: 0.9,
      magazineSize: 6,
      startingAmmo: 18,
      reloadTime: 1.3,
      pellets: 1,
      spread: 0.01,
      projectileSpeed: 1800,
      range: 1300,
      // Arrows, not brass - no casing ejection.
    },
    sound: { shoot: 'xbow_fire', reload: 'xbow_pull', draw: 'bow_draw', holster: 'bow_holster' },
    juice: BASE_FIREARM_JUICE,
  },
};

export const WEAPON_IDS = Object.keys(WeaponConfig);

export function getWeaponConfig(weaponId) {
  const config = WeaponConfig[weaponId];
  if (!config) throw new Error(`Unknown weapon id: ${weaponId}`);
  return config;
}

// 8-way facing is still tracked on the player (useful for HUD/debug and any
// future direction-aware logic); with single-direction art it doesn't
// affect which frames are drawn, only continuous rotation does.
export const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function directionIndexFromAngle(angleRadians) {
  const twoPi = Math.PI * 2;
  let a = (angleRadians + Math.PI / 2) % twoPi;
  if (a < 0) a += twoPi;
  const slice = twoPi / 8;
  return Math.round(a / slice) % 8;
}

// Number-key slot order, shared by Player (switching) and UISystem
// (inventory bar) so the two can never drift out of sync. Index order also
// defines the key bound to each weapon: Digit1 = slot 0, etc.
export const WEAPON_SLOT_ORDER = ['unarmed', 'chainsaw', 'handgun', 'revolver', 'rifle', 'smg', 'shotgun', 'm4', 'bow', 'shotgun_homestead'];
export const WEAPON_SLOT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
