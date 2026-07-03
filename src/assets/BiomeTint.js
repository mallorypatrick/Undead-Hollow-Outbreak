// Recolors tile/sprite images per-biome via an HSL hue/saturation/lightness
// shift, so the single farm/rural tileset can visually stand in for every
// biome without new art. Each (biomeId, tileId) pair is only ever tinted
// once - the result is cached forever, same idea as every other asset
// handle in this project.
const cache = new Map(); // key: `${biomeId}:${tileId}` -> live { image, isPlaceholder } handle

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function tintCanvas(sourceImage, delta) {
  const w = sourceImage.naturalWidth || sourceImage.width;
  const h = sourceImage.naturalHeight || sourceImage.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(sourceImage, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // skip fully transparent pixels
    const [h1, s1, l1] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const h2 = (h1 + delta.hueShift + 1) % 1;
    const s2 = Math.max(0, Math.min(1, s1 * delta.satMul + delta.satAdd));
    const l2 = Math.max(0, Math.min(1, l1 * delta.lightMul + delta.lightAdd));
    const [r, g, b] = hslToRgb(h2, s2, l2);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  ctx.putImageData(imageData, 0, 0);
  return c;
}

// hueShift is a fraction of the 360-degree wheel (0-1), not degrees.
export const BIOME_TINTS = {
  farm: null, // baseline - the existing look, untouched
  // All of these are calibrated against the real Happy Harvest grass tile's
  // vivid ~120deg green base (not the old muted procedural texture) - hue
  // math below is "target hue minus 120deg", expressed as a 0-1 fraction.
  desert: { hueShift: -0.24, satMul: 0.4, satAdd: 0.12, lightMul: 1.35, lightAdd: 0.08 }, // -> ~35deg warm sand
  city: { hueShift: 0.0, satMul: 0.35, satAdd: 0.0, lightMul: 0.72, lightAdd: -0.02 },
  subway: { hueShift: 0.02, satMul: 0.3, satAdd: 0.0, lightMul: 0.42, lightAdd: -0.05 },
  marine_base: { hueShift: -0.12, satMul: 0.55, satAdd: 0.0, lightMul: 0.8, lightAdd: 0.0 }, // -> ~77deg olive
  army_base: { hueShift: -0.15, satMul: 0.5, satAdd: 0.0, lightMul: 0.68, lightAdd: -0.02 }, // -> ~66deg, darker olive-drab
  area51: { hueShift: -0.02, satMul: 0.15, satAdd: 0.0, lightMul: 1.05, lightAdd: 0.1 },
  // Not a real biome - a bespoke skin tint for The Fallen's unique art, so
  // she reads as a distinct character rather than "an area51 zombie."
  the_fallen_skin: { hueShift: 0.34, satMul: 0.5, satAdd: 0.1, lightMul: 0.68, lightAdd: -0.03 },
};

// BIOME_TINTS' hueShift values are calibrated for the grass field's ~140deg
// green baseline - applying them to the real dirt road texture (a much
// warmer ~30deg tan) wraps it around into pink/magenta instead of the
// intended olive/sand/grey, since a 30deg source minus e.g. army_base's -54
// deg shift lands around 336deg. Roads get their own, much gentler table -
// small hue nudges plus saturation/lightness only - that varies the road's
// look per biome without corrupting its hue. Cemetery only ever appears in
// the untinted 'farm' biome today, so it doesn't need its own table.
export const ROAD_TINTS = {
  farm: null,
  desert: { hueShift: 0, satMul: 1.1, satAdd: 0, lightMul: 1.15, lightAdd: 0.03 },
  city: { hueShift: 0, satMul: 0.25, satAdd: 0, lightMul: 0.65, lightAdd: -0.02 },
  subway: { hueShift: 0, satMul: 0.2, satAdd: 0, lightMul: 0.35, lightAdd: -0.05 },
  marine_base: { hueShift: 0.05, satMul: 0.7, satAdd: 0, lightMul: 0.85, lightAdd: 0 },
  army_base: { hueShift: 0.05, satMul: 0.6, satAdd: 0, lightMul: 0.75, lightAdd: -0.02 },
  area51: { hueShift: 0, satMul: 0.3, satAdd: 0, lightMul: 1.1, lightAdd: 0.05 },
};

// handle: an AssetLoader-style live { image, isPlaceholder } object.
// Returns a live handle of the same shape whose .image is the tinted
// result, produced lazily once the source has actually finished loading
// (recoloring a placeholder canvas would be meaningless, and an Image that
// hasn't decoded yet has no pixels to read).
export function getTintedImage(handle, tileId, biomeId) {
  const delta = BIOME_TINTS[biomeId];
  if (!delta) return handle; // 'farm'/null/unknown biome -> untouched passthrough

  const key = `${biomeId}:${tileId}`;
  const cached = cache.get(key);
  if (cached && !cached.isPlaceholder) return cached;

  const wrapper = cached || { image: handle.image, isPlaceholder: true };
  if (!handle.isPlaceholder) {
    wrapper.image = tintCanvas(handle.image, delta);
    wrapper.isPlaceholder = false;
  }
  cache.set(key, wrapper);
  return wrapper;
}

// Synchronous variant for sources that are already-loaded canvases (e.g.
// the ground-zone textures in Game.js), so there's no placeholder/async
// handling to do at all. `table` defaults to BIOME_TINTS (grass-calibrated)
// but Game._drawGround passes ROAD_TINTS for the road zone - see above.
export function tintCanvasSync(canvas, biomeId, cacheKey, table = BIOME_TINTS) {
  const delta = table[biomeId];
  if (!delta) return canvas;

  const key = `sync:${table === BIOME_TINTS ? 'field' : 'road'}:${biomeId}:${cacheKey}`;
  if (cache.has(key)) return cache.get(key);

  const tinted = tintCanvas(canvas, delta);
  cache.set(key, tinted);
  return tinted;
}
