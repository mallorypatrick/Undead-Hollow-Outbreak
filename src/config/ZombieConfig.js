// Single source of truth for every zombie type. To add a new type: add one
// entry here and a palette entry in src/assets/ZombieSprites.js. Nothing
// else needs to change - the spawner, AI, and combat code all read from
// this config.
export const ZombieConfig = {
  walker: {
    id: 'walker',
    displayName: 'Walker',
    health: 60,
    damage: 10,
    speed: 55,
    armor: 0,
    radius: 24, // hitbox - kept smaller than drawSize
    drawSize: 92, // matches the player's visual size
    attackCooldown: 1.0,
    attackRange: 34,
    spawnWeight: 5,
    usesRealArt: true,
  },
  runner: {
    id: 'runner',
    displayName: 'Runner',
    health: 28,
    damage: 8,
    speed: 145,
    armor: 0,
    radius: 20,
    drawSize: 92, // matches the player's visual size
    attackCooldown: 0.7,
    attackRange: 30,
    spawnWeight: 3,
    usesRealArt: true,
  },
  crawler: {
    id: 'crawler',
    displayName: 'Crawler',
    health: 40,
    damage: 6,
    speed: 24,
    armor: 0,
    radius: 14, // deliberately small hitbox - easy to lose track of
    drawSize: 92, // matches the player's visual size
    attackCooldown: 1.1,
    attackRange: 28,
    spawnWeight: 3,
    usesRealArt: true,
  },
  bloated: {
    id: 'bloated',
    displayName: 'Bloated',
    health: 170,
    damage: 16,
    speed: 34,
    armor: 0,
    radius: 32,
    drawSize: 96,
    attackCooldown: 1.4,
    attackRange: 40,
    spawnWeight: 2,
    usesRealArt: true,
  },
  police: {
    id: 'police',
    displayName: 'Police Zombie',
    health: 95,
    damage: 12,
    speed: 68,
    armor: 4, // flat damage reduction per hit, min 1 damage always gets through
    radius: 25,
    drawSize: 92, // matches the player's visual size
    attackCooldown: 0.9,
    attackRange: 34,
    spawnWeight: 2,
    usesRealArt: true,
  },
  wretch: {
    id: 'wretch',
    displayName: 'Wretch',
    health: 50,
    damage: 9,
    speed: 60,
    armor: 0,
    radius: 22,
    drawSize: 92, // matches the player's visual size
    attackCooldown: 1.0,
    attackRange: 32,
    spawnWeight: 3,
    usesRealArt: true,
  },
  behemoth: {
    id: 'behemoth',
    displayName: 'Behemoth',
    health: 220,
    damage: 20,
    speed: 30,
    armor: 2,
    radius: 36,
    drawSize: 110,
    attackCooldown: 1.5,
    attackRange: 44,
    spawnWeight: 2,
    usesRealArt: true,
  },
  skeleton: {
    id: 'skeleton',
    displayName: 'Skeleton',
    health: 70,
    damage: 13,
    speed: 65,
    armor: 1,
    radius: 24,
    drawSize: 92, // matches the player's visual size
    attackCooldown: 0.85,
    attackRange: 36,
    spawnWeight: 3,
    usesRealArt: true,
  },
  // A hostile human, not an undead one. Fights at range instead of closing
  // to melee - see Zombie.ranged / Game._updateZombies.
  military: {
    id: 'military',
    displayName: 'Hostile Soldier',
    health: 85,
    damage: 15,
    speed: 70,
    armor: 3,
    radius: 24,
    drawSize: 92, // matches the player's visual size
    attackCooldown: 0.8,
    attackRange: 34,
    spawnWeight: 2,
    usesRealArt: true,
    ranged: true,
    engagementRange: 520,
    fireRate: 1.3,
    bulletDamage: 11,
    bulletSpeed: 1500,
    bulletRange: 900,
  },
  // Not part of the normal random spawn pool (spawnWeight 0) - this is the
  // player's own previous character, risen as a boss after a death+restart,
  // still carrying whatever weapons it died with. See Zombie.lootWeapons /
  // Game._grantLootToPlayer.
  player_boss: {
    id: 'player_boss',
    displayName: 'Reanimated Survivor',
    health: 650,
    damage: 22,
    speed: 52,
    armor: 6,
    radius: 40,
    drawSize: 140,
    attackCooldown: 1.0,
    attackRange: 46,
    spawnWeight: 0,
    isBoss: true,
    usesRealArt: true,
  },
  // Level 39's story boss - not the player's own past self, a distinct
  // narrative character (see Game._spawnScriptedBoss). Starts ranged
  // (soldier instincts) and drops into a melee rage once badly hurt - see
  // Zombie.js's meleeRageThreshold.
  the_fallen: {
    id: 'the_fallen',
    displayName: 'The Fallen',
    health: 900,
    damage: 24,
    speed: 58,
    armor: 5,
    radius: 42,
    drawSize: 130,
    attackCooldown: 1.1,
    attackRange: 48,
    spawnWeight: 0,
    isBoss: true,
    usesRealArt: true,
    ranged: true,
    engagementRange: 480,
    fireRate: 1.6,
    bulletDamage: 14,
    bulletSpeed: 1300,
    bulletRange: 850,
    meleeRageHealthPct: 0.35,
  },
};

export const ZOMBIE_TYPE_IDS = Object.keys(ZombieConfig);

export function getZombieConfig(typeId) {
  const config = ZombieConfig[typeId];
  if (!config) throw new Error(`Unknown zombie type: ${typeId}`);
  return config;
}

// Weighted random pick across all types (heavier weight = more common).
export function pickRandomZombieType() {
  const totalWeight = ZOMBIE_TYPE_IDS.reduce((sum, id) => sum + ZombieConfig[id].spawnWeight, 0);
  let roll = Math.random() * totalWeight;
  for (const id of ZOMBIE_TYPE_IDS) {
    roll -= ZombieConfig[id].spawnWeight;
    if (roll <= 0) return id;
  }
  return ZOMBIE_TYPE_IDS[0];
}
