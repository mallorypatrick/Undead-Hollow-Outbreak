import { EnvironmentSprites } from '../assets/EnvironmentSprites.js';
import { getStaticImage } from '../core/AssetLoader.js';
import { getTilesetTile } from '../assets/TilesetLoader.js';

// Real pixel-art sprites keyed by deco.type - cars (see
// assets/environment/vehicles/), the Happy Harvest house, and its crop
// decorations - all sharing the same fixed-aspect-ratio draw path below.
// These car sprites are tightly-cropped single-car images (no transparent
// grid padding), so their render width/aspect map directly to real pixel
// dimensions.
const CAR_SPRITES = {
  car_red: { path: 'assets/environment/vehicles/car_red.png', width: 140, aspect: 208 / 444, color: '#7a1f1f' },
  car_pickup_black: { path: 'assets/environment/vehicles/car_pickup_black.png', width: 140, aspect: 66 / 118, color: '#1a1a1a' },
  car_suv_blue: { path: 'assets/environment/vehicles/car_suv_blue.png', width: 140, aspect: 67 / 116, color: '#1f2a6a' },
  car_sedan_black: { path: 'assets/environment/vehicles/car_sedan_black.png', width: 140, aspect: 56 / 118, color: '#161616' },
  car_pickup_blue: { path: 'assets/environment/vehicles/car_pickup_blue.png', width: 140, aspect: 63 / 119, color: '#1a2fae' },
  car_pickup_red: { path: 'assets/environment/vehicles/car_pickup_red.png', width: 170, aspect: 75 / 198, color: '#8a3a3a' },
  car_ambulance: { path: 'assets/environment/vehicles/car_ambulance.png', width: 150, aspect: 63 / 115, color: '#c8c4b8' },
  car_van_pink: { path: 'assets/environment/vehicles/car_van_pink.png', width: 140, aspect: 65 / 106, color: '#c93a9a' },
};

export const CAR_TYPE_IDS = Object.keys(CAR_SPRITES);

const REAL_SPRITES = {
  ...CAR_SPRITES,
  house_happyharvest: { path: 'assets/environment/house_happyharvest.png', width: 90, aspect: 96 / 64, color: '#8a4a3a' },
  // Bigger, more detailed front-facing barn-style house - a second, larger
  // building type for farm variety alongside the smaller Happy Harvest house.
  house_barn: { path: 'assets/environment/house_barn.png', width: 170, aspect: 1, color: '#8a5a3a' },
  tree_happyharvest: { path: 'assets/environment/tree_happyharvest.png', width: 56, aspect: 80 / 48, color: '#2e6a2a' },
  prop_clover: { path: 'assets/environment/props/prop_clover.png', width: 40, aspect: 1, color: '#3a7a2a' },
  prop_rock: { path: 'assets/environment/props/prop_rock.png', width: 40, aspect: 1, color: '#6a6a6a' },
  crop_bush: { path: 'assets/environment/crops/crop_bush.png', width: 64, aspect: 1, color: '#3a6a2a' },
  crop_fruiting: { path: 'assets/environment/crops/crop_fruiting.png', width: 64, aspect: 1, color: '#c9622a' },
  crop_sprout: { path: 'assets/environment/crops/crop_sprout.png', width: 48, aspect: 1, color: '#4a8a3a' },
  // Cropped from the G2kx0d military base blueprint reference - a flat
  // ground marker (helipad) and a small watchtower structure, for
  // marine_base/army_base flavor. Keep their own grayscale blueprint look
  // rather than routing through the biome tint - reads as a tactical
  // schematic accent against the tinted olive ground.
  military_helipad: { path: 'assets/environment/military/helipad.png', width: 120, aspect: 1, color: '#8a8a72' },
  military_watchtower: { path: 'assets/environment/military/watchtower.png', width: 95, aspect: 260 / 180, color: '#6a6a5a' },
};

function realSpritePlaceholder(color, aspect) {
  const w = 140;
  const h = Math.round(w * aspect);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  return canvas;
}

// Draws one static map decoration (tree/fence/building/gravestone/corpse/
// car), fully culled if it's off the visible viewport. `biomeId` only
// matters for tileset-sourced decorations (deco.tileId) - it selects which
// per-biome recolor of the shared farm/rural tileset to draw.
export function drawDecoration(ctx, camera, deco, biomeId) {
  const screen = camera.worldToScreen(deco.x, deco.y);
  if (screen.x < -320 || screen.x > 2240 || screen.y < -320 || screen.y > 1400) return;

  const rotation = deco.rotation || 0;

  if (REAL_SPRITES[deco.type]) {
    const info = REAL_SPRITES[deco.type];
    const handle = getStaticImage(`deco:${deco.type}`, info.path, realSpritePlaceholder(info.color, info.aspect));
    const w = info.width;
    const h = info.width * info.aspect;
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(rotation);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(handle.image, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  // Buildings compose a real structure - a wall texture tiled at native
  // scale (not one tiny tile stretched blurry across the whole footprint),
  // a roof band along the top, and a door centered at the bottom - instead
  // of a single flat rectangle. See MapBuilder's building-placement
  // functions for where isBuilding/roofColor get set.
  if (deco.tileId && deco.isBuilding) {
    const handle = getTilesetTile(deco.tileId, biomeId);
    const w = deco.drawWidth;
    const h = deco.drawHeight;
    const roofH = Math.min(h * 0.28, 70);
    const doorW = Math.min(30, w * 0.16);
    const doorH = Math.min(42, h * 0.24);

    ctx.save();
    ctx.translate(screen.x - w / 2, screen.y - h / 2);
    ctx.imageSmoothingEnabled = false;

    const TILE_DRAW_SIZE = 32; // 2x native 16px - crisp, not blurry-stretched
    for (let ty = 0; ty < h; ty += TILE_DRAW_SIZE) {
      const th = Math.min(TILE_DRAW_SIZE, h - ty);
      for (let tx = 0; tx < w; tx += TILE_DRAW_SIZE) {
        const tw = Math.min(TILE_DRAW_SIZE, w - tx);
        ctx.drawImage(handle.image, tx, ty, tw, th);
      }
    }

    ctx.fillStyle = deco.roofColor || '#4a2e26';
    ctx.fillRect(0, 0, w, roofH);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, roofH - 6, w, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    ctx.fillStyle = '#241a14';
    ctx.fillRect(w / 2 - doorW / 2, h - doorH, doorW, doorH);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(w / 2 - doorW / 2, h - doorH, doorW, 3);

    ctx.restore();
    return;
  }

  if (deco.tileId) {
    const handle = getTilesetTile(deco.tileId, biomeId);
    const w = deco.drawWidth || 80;
    const h = deco.drawHeight || w;
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(rotation);
    ctx.imageSmoothingEnabled = false; // keep the small pixel-art tiles crisp when upscaled
    ctx.drawImage(handle.image, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  const sprite = EnvironmentSprites[deco.type];
  if (!sprite) return;
  const scale = deco.scale || 1;
  const w = sprite.width * scale;
  const h = sprite.height * scale;

  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(rotation);
  ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  ctx.restore();
}
