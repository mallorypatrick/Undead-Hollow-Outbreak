// Loads real art when it exists on disk, and transparently falls back to a
// procedurally generated placeholder when it doesn't. Callers always read
// `.image` off the returned handle - the handle object itself never changes
// identity, so a real PNG that finishes loading after the placeholder was
// already handed out just starts being drawn on the next frame with no
// extra plumbing.
import { generatePlaceholderFrame, generatePlaceholderIcon, generateSupplyIcon } from '../assets/ProceduralSpriteSheets.js';

const imageCache = new Map();
const frameSetCache = new Map();

function loadWithFallback(cacheKey, realPath, placeholderCanvas) {
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  const handle = { image: placeholderCanvas, isPlaceholder: true };

  if (realPath) {
    const real = new Image();
    real.onload = () => {
      handle.image = real;
      handle.isPlaceholder = false;
    };
    real.onerror = () => { /* no authored art yet - placeholder stays active */ };
    real.src = realPath;
  }

  imageCache.set(cacheKey, handle);
  return handle;
}

// Returns { frames: [{image}, {image}, ...] } for an animation state, one
// handle per frame file listed in animConfig.frames.
export function getAnimationFrames(weaponId, stateKey, animConfig, assetFolder) {
  const key = `${weaponId}:${stateKey}`;
  if (frameSetCache.has(key)) return frameSetCache.get(key);

  const frames = animConfig.frames.map((file, index) => {
    const placeholder = generatePlaceholderFrame(weaponId, stateKey, index, animConfig.frames.length);
    return loadWithFallback(`${key}:${index}`, assetFolder + file, placeholder);
  });

  const handle = { frames };
  frameSetCache.set(key, handle);
  return handle;
}

// Single static pickup icon. Convention: assets/items/<weapon>/icon.png.
export function getPickupIcon(weaponId, pickupIconFolder) {
  const placeholder = generatePlaceholderIcon(weaponId);
  const realPath = pickupIconFolder ? `${pickupIconFolder}icon.png` : null;
  return loadWithFallback(`icon:${weaponId}`, realPath, placeholder);
}

// Single static icon for a supply pickup. Convention: assets/items/<id>/icon.png.
export function getSupplyIcon(supplyId, iconFolder) {
  const placeholder = generateSupplyIcon(supplyId);
  const realPath = iconFolder ? `${iconFolder}icon.png` : null;
  return loadWithFallback(`supply-icon:${supplyId}`, realPath, placeholder);
}

// General-purpose escape hatch for one-off images (e.g. the zombie sprite)
// that don't fit the per-weapon animation/pickup conventions above.
export function getStaticImage(cacheKey, realPath, placeholderCanvas) {
  return loadWithFallback(cacheKey, realPath, placeholderCanvas);
}
