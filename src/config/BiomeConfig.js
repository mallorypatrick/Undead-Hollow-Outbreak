// Single source of truth for every biome the campaign/survival modes can
// take place in. Follows the same convention as WeaponConfig/ZombieConfig:
// one data object, an IDS list, and an accessor. `tint` keys into
// BiomeTint.BIOME_TINTS; `zombieWeights` is a per-biome override of
// ZombieConfig's spawn weights (e.g. military shows up far more in the two
// army biomes, police only fits the city).
export const BiomeConfig = {
  farm: {
    id: 'farm',
    displayName: 'Farmland',
    tint: 'farm',
    zombieWeights: { walker: 5, runner: 3, crawler: 3, wretch: 3, bloated: 2, skeleton: 3, police: 1, military: 0 },
  },
  desert: {
    id: 'desert',
    displayName: 'Desert Outskirts',
    tint: 'desert',
    zombieWeights: { walker: 5, runner: 4, crawler: 3, wretch: 2, bloated: 2, skeleton: 4, police: 1, military: 1 },
  },
  city: {
    id: 'city',
    displayName: 'City Outbreak',
    tint: 'city',
    zombieWeights: { walker: 6, runner: 4, crawler: 3, wretch: 3, bloated: 2, skeleton: 2, police: 4, military: 1 },
  },
  subway: {
    id: 'subway',
    displayName: 'Subway Tunnels',
    tint: 'subway',
    zombieWeights: { walker: 4, runner: 5, crawler: 5, wretch: 4, bloated: 1, skeleton: 2, police: 1, military: 0 },
  },
  marine_base: {
    id: 'marine_base',
    displayName: 'Marine Corps Base',
    tint: 'marine_base',
    zombieWeights: { walker: 3, runner: 3, crawler: 2, wretch: 2, bloated: 2, skeleton: 2, police: 0, military: 6 },
  },
  army_base: {
    id: 'army_base',
    displayName: 'Army Base',
    tint: 'army_base',
    zombieWeights: { walker: 3, runner: 3, crawler: 2, wretch: 2, bloated: 3, skeleton: 3, police: 0, military: 8 },
  },
  area51: {
    id: 'area51',
    displayName: 'Area 51',
    tint: 'area51',
    zombieWeights: { walker: 2, runner: 2, crawler: 2, wretch: 2, bloated: 1, skeleton: 1, police: 0, military: 4 },
  },
};

export const BIOME_IDS = Object.keys(BiomeConfig);

export function getBiomeConfig(biomeId) {
  const config = BiomeConfig[biomeId];
  if (!config) throw new Error(`Unknown biome: ${biomeId}`);
  return config;
}

// Weighted random pick scoped to one biome's roster (mirrors
// ZombieConfig.pickRandomZombieType, but biome-aware).
export function pickZombieTypeForBiome(biomeId) {
  const weights = getBiomeConfig(biomeId).zombieWeights;
  const ids = Object.keys(weights).filter((id) => weights[id] > 0);
  const total = ids.reduce((sum, id) => sum + weights[id], 0);
  let roll = Math.random() * total;
  for (const id of ids) {
    roll -= weights[id];
    if (roll <= 0) return id;
  }
  return ids[0];
}
