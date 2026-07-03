// Central registry of raw tile paths from the "Zombie Apocalypse Tileset"
// pack (copied into assets/tileset/<category>/ - see the campaign/biome
// plan for the full category breakdown). Each category folder has more
// files than we reference here; TILE_PATHS only lists the handful of
// representative variants MapBuilder/DecorationRenderer actually draw -
// the rest of each folder is just unused inventory, not a gap.
//
// getTilesetTile(tileId, biomeId) is the one entry point callers use: it
// loads the raw PNG (real-art-with-placeholder-fallback, same as every
// other asset in this project) and hands it through BiomeTint so the same
// farm/rural art can stand in for every biome via a per-biome recolor.
import { getStaticImage } from '../core/AssetLoader.js';
import { getTintedImage } from './BiomeTint.js';

const T = 'assets/tileset/';

const TILE_PATHS = {
  road_1: `${T}road/Zombie-Tileset---_0029_Capa-30.png`,
  road_2: `${T}road/Zombie-Tileset---_0030_Capa-31.png`,
  road_3: `${T}road/Zombie-Tileset---_0031_Capa-32.png`,
  road_4: `${T}road/Zombie-Tileset---_0032_Capa-33.png`,

  terrain_path_1: `${T}terrain_path/Zombie-Tileset---_0065_Capa-66.png`,
  terrain_path_2: `${T}terrain_path/Zombie-Tileset---_0066_Capa-67.png`,
  terrain_path_3: `${T}terrain_path/Zombie-Tileset---_0067_Capa-68.png`,

  terrain_1: `${T}terrain/Zombie-Tileset---_0077_Capa-78.png`,
  terrain_2: `${T}terrain/Zombie-Tileset---_0078_Capa-79.png`,
  terrain_3: `${T}terrain/Zombie-Tileset---_0079_Capa-80.png`,
  terrain_4: `${T}terrain/Zombie-Tileset---_0080_Capa-81.png`,

  building_small_1: `${T}building_small/Zombie-Tileset---_0091_Capa-92.png`,
  building_small_2: `${T}building_small/Zombie-Tileset---_0092_Capa-93.png`,
  building_small_3: `${T}building_small/Zombie-Tileset---_0093_Capa-94.png`,
  building_small_4: `${T}building_small/Zombie-Tileset---_0094_Capa-95.png`,

  building_big_1: `${T}building_big/Zombie-Tileset---_0000_Capa-1.png`,
  building_big_2: `${T}building_big/Zombie-Tileset---_0001_Capa-2.png`,
  building_big_3: `${T}building_big/Zombie-Tileset---_0002_Capa-3.png`,
  building_big_4: `${T}building_big/Zombie-Tileset---_0003_Capa-4.png`,

  barn_1: `${T}barn/Zombie-Tileset---_0226_Capa-227.png`,
  barn_2: `${T}barn/Zombie-Tileset---_0227_Capa-228.png`,
  barn_3: `${T}barn/Zombie-Tileset---_0228_Capa-229.png`,
  barn_4: `${T}barn/Zombie-Tileset---_0229_Capa-230.png`,

  fence_1: `${T}fence/Zombie-Tileset---_0126_Capa-127.png`,
  fence_2: `${T}fence/Zombie-Tileset---_0127_Capa-128.png`,
  fence_3: `${T}fence/Zombie-Tileset---_0128_Capa-129.png`,

  bush_1: `${T}bush/Zombie-Tileset---_0081_Capa-82.png`,
  bush_2: `${T}bush/Zombie-Tileset---_0082_Capa-83.png`,
  bush_3: `${T}bush/Zombie-Tileset---_0083_Capa-84.png`,

  tree_1: `${T}tree/Zombie-Tileset---_0134_Capa-135.png`,
  tree_2: `${T}tree/Zombie-Tileset---_0135_Capa-136.png`,
  tree_3: `${T}tree/Zombie-Tileset---_0136_Capa-137.png`,
  tree_4: `${T}tree/Zombie-Tileset---_0137_Capa-138.png`,

  crops_1: `${T}crops/Zombie-Tileset---_0109_Capa-110.png`,
  crops_2: `${T}crops/Zombie-Tileset---_0110_Capa-111.png`,
  crops_3: `${T}crops/Zombie-Tileset---_0111_Capa-112.png`,
  crops_4: `${T}crops/Zombie-Tileset---_0112_Capa-113.png`,

  gas_station_1: `${T}gas_station/Zombie-Tileset---_0143_Capa-144.png`,
  gas_station_2: `${T}gas_station/Zombie-Tileset---_0144_Capa-145.png`,

  tombstone_1: `${T}tombstone/Zombie-Tileset---_0357_Capa-358.png`,

  corpse_flies_1: `${T}corpse_flies/Zombie-Tileset---_0290_Capa-291.png`,
  corpse_flies_2: `${T}corpse_flies/Zombie-Tileset---_0291_Capa-292.png`,
  corpse_flies_3: `${T}corpse_flies/Zombie-Tileset---_0292_Capa-293.png`,

  broken_cars_1: `${T}broken_cars/Zombie-Tileset---_0179_Capa-180.png`,
  broken_cars_2: `${T}broken_cars/Zombie-Tileset---_0180_Capa-181.png`,
  broken_cars_3: `${T}broken_cars/Zombie-Tileset---_0181_Capa-182.png`,

  urban_1: `${T}urban/Zombie-Tileset---_0145_Capa-146.png`,
  urban_2: `${T}urban/Zombie-Tileset---_0150_Capa-151.png`,
  urban_3: `${T}urban/Zombie-Tileset---_0151_Capa-152.png`,
  urban_4: `${T}urban/Zombie-Tileset---_0152_Capa-153.png`,

  water_1: `${T}water/Zombie-Tileset---_0061_Capa-62.png`,
  water_2: `${T}water/Zombie-Tileset---_0062_Capa-63.png`,

  water_bridge_1: `${T}water_bridge/Zombie-Tileset---_0055_Capa-56.png`,
  water_bridge_2: `${T}water_bridge/Zombie-Tileset---_0056_Capa-57.png`,

  bridge_1: `${T}bridge/Zombie-Tileset---_0106_Capa-107.png`,
  bridge_2: `${T}bridge/Zombie-Tileset---_0107_Capa-108.png`,

  terrain_wall_1: `${T}terrain_wall/Zombie-Tileset---_0064_Capa-65.png`,

  straw_1: `${T}straw/Zombie-Tileset---_0118_Capa-119.png`,
  straw_2: `${T}straw/Zombie-Tileset---_0119_Capa-120.png`,

  scarecrow_1: `${T}scarecrow/Zombie-Tileset---_0124_Capa-125.png`,
  scarecrow_2: `${T}scarecrow/Zombie-Tileset---_0125_Capa-126.png`,

  windmill_1: `${T}windmill/Zombie-Tileset---_0218_Capa-219.png`,
  windmill_2: `${T}windmill/Zombie-Tileset---_0219_Capa-220.png`,
};

export const TILE_IDS = Object.keys(TILE_PATHS);

function makePlaceholderTile() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a3a30';
  ctx.fillRect(0, 0, 16, 16);
  return canvas;
}

// Returns a live { image, isPlaceholder } handle whose .image is the given
// tile recolored for biomeId (or the untouched original for 'farm'/null -
// see BiomeTint.BIOME_TINTS).
export function getTilesetTile(tileId, biomeId) {
  const path = TILE_PATHS[tileId];
  if (!path) throw new Error(`Unknown tileset tile: ${tileId}`);
  const rawHandle = getStaticImage(`tileset-raw:${tileId}`, path, makePlaceholderTile());
  return getTintedImage(rawHandle, tileId, biomeId);
}
