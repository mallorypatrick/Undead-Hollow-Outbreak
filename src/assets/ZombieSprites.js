// Procedurally generated zombie art, one small frame set per type,
// generated once and cached (cheap to reuse via drawImage across every
// spawned instance of that type - important since dozens can be on screen
// at once). Drawn facing "up", rotated at draw time like the player.
//
// Nothing here is traced, copied, or derived from existing artwork - each
// type gets a distinct original silhouette/palette so they're readable at
// a glance, not a reskin of a real design.
import { getStaticImage } from '../core/AssetLoader.js';
import { getTintedImage } from './BiomeTint.js';

const FRAME_SIZE = 96;

const PALETTES = {
  walker: { body: '#5c6650', accent: '#3f4536', gore: '#7a2f2f' },
  runner: { body: '#6a4f45', accent: '#4a332b', gore: '#8a2f2f' },
  crawler: { body: '#4a4f42', accent: '#2e3128', gore: '#6a2a2a' },
  bloated: { body: '#6f7a3f', accent: '#4f5a2a', gore: '#7a3a2f' },
  police: { body: '#39455a', accent: '#242c3a', gore: '#7a2f2f' },
  // Dark navy/brown, echoing the player's own color scheme - this used to
  // be you.
  player_boss: { body: '#1c2438', accent: '#4a3324', gore: '#c94a3a' },
};

function drawLimb(ctx, angleFromCenter, length, width, color) {
  ctx.save();
  ctx.rotate(angleFromCenter);
  ctx.fillStyle = color;
  ctx.fillRect(-width / 2, 0, width, length);
  ctx.restore();
}

function drawZombieBody(ctx, typeId, palette, t, state) {
  const shapes = {
    walker: { r: 0.26, hunch: 0.05, limbLen: 0.22 },
    runner: { r: 0.22, hunch: 0.02, limbLen: 0.3 },
    crawler: { r: 0.24, hunch: 0.22, limbLen: 0.16 },
    bloated: { r: 0.34, hunch: 0.0, limbLen: 0.16 },
    police: { r: 0.27, hunch: 0.04, limbLen: 0.2 },
    player_boss: { r: 0.32, hunch: 0.03, limbLen: 0.26 },
  };
  const shape = shapes[typeId] || shapes.walker;
  const r = FRAME_SIZE * shape.r;
  const wobble = Math.sin(t * Math.PI * 2) * (state === 'walk' ? 0.06 : 0.02);

  ctx.save();
  ctx.translate(0, shape.hunch * FRAME_SIZE);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Limbs (simple stubs either side, swinging slightly with the walk cycle)
  const limbLen = FRAME_SIZE * shape.limbLen;
  drawLimb(ctx, -0.5 - wobble, limbLen, r * 0.3, palette.accent);
  drawLimb(ctx, 0.5 + wobble, limbLen, r * 0.3, palette.accent);

  // Body
  ctx.fillStyle = palette.body;
  ctx.strokeStyle = '#161613';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r * (1 + wobble * 0.3), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Facing hint
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(-r * 0.35, -r * 0.1);
  ctx.lineTo(r * 0.35, -r * 0.1);
  ctx.closePath();
  ctx.fill();

  // Type-specific accents
  if (typeId === 'police') {
    ctx.fillStyle = '#1b2230';
    ctx.fillRect(-r * 0.4, -r * 0.95, r * 0.8, r * 0.3); // cap brim
    ctx.fillStyle = '#c9a13a';
    ctx.fillRect(-r * 0.08, -r * 0.85, r * 0.16, r * 0.16); // badge glint
  } else if (typeId === 'bloated') {
    ctx.fillStyle = 'rgba(120,140,60,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (typeId === 'crawler') {
    ctx.fillStyle = palette.accent;
    ctx.fillRect(-r * 0.5, r * 0.5, r, r * 0.25); // dragging lower body
  } else if (typeId === 'player_boss') {
    ctx.strokeStyle = 'rgba(201,74,58,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Gore fleck
  ctx.fillStyle = palette.gore;
  ctx.beginPath();
  ctx.arc(r * 0.2, r * 0.1, r * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawDeathFrame(ctx, typeId, palette, t) {
  ctx.save();
  ctx.globalAlpha = 1 - t * 0.6;
  ctx.rotate(t * (Math.PI / 2.4));
  drawZombieBody(ctx, typeId, palette, 0, 'death');

  ctx.fillStyle = 'rgba(90,10,10,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, FRAME_SIZE * 0.15 * t, FRAME_SIZE * 0.3 * t, FRAME_SIZE * 0.12 * t, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAttackFrame(ctx, typeId, palette, t) {
  const lunge = Math.sin(t * Math.PI) * FRAME_SIZE * 0.12;
  ctx.save();
  ctx.translate(0, -lunge);
  drawZombieBody(ctx, typeId, palette, t, 'attack');
  ctx.restore();
}

function renderFrame(typeId, palette, state, t) {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_SIZE;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.translate(FRAME_SIZE / 2, FRAME_SIZE / 2);

  if (state === 'death') drawDeathFrame(ctx, typeId, palette, t);
  else if (state === 'attack') drawAttackFrame(ctx, typeId, palette, t);
  else drawZombieBody(ctx, typeId, palette, t, 'walk');

  return canvas;
}

const FRAME_COUNTS = { walk: 4, attack: 3, death: 4 };
const frameCache = new Map();

// Types with real authored art instead of procedural generation. Each state
// not listed falls back to the "walk" set (Zombie.draw() applies a generic
// fade+spin over it for death when there's no dedicated death animation).
const REAL_ART_TYPES = {
  walker: { assetFolder: 'assets/zombie/walker/', states: { walk: { folder: 'pose/', count: 1 } } },
  runner: { assetFolder: 'assets/zombie/runner/', states: { walk: { folder: 'pose/', count: 1 } } },
  crawler: { assetFolder: 'assets/zombie/crawler/', states: { walk: { folder: 'pose/', count: 1 } } },
  bloated: { assetFolder: 'assets/zombie/bloated/', states: { walk: { folder: 'pose/', count: 1 } } },
  police: { assetFolder: 'assets/zombie/police/', states: { walk: { folder: 'pose/', count: 1 } } },
  wretch: { assetFolder: 'assets/zombie/wretch/', states: { walk: { folder: 'move/', count: 8 } } },
  behemoth: { assetFolder: 'assets/zombie/behemoth/', states: { walk: { folder: 'move/', count: 8 } } },
  skeleton: {
    assetFolder: 'assets/zombie/skeleton/',
    states: {
      walk: { folder: 'move/', count: 17 },
      attack: { folder: 'attack/', count: 9 },
    },
  },
  military: { assetFolder: 'assets/zombie/military/', states: { walk: { folder: 'pose/', count: 1 } } },
  player_boss: { assetFolder: 'assets/zombie/player_boss/', states: { walk: { folder: 'pose/', count: 1 } } },
  // Reuses the same source frames as Wretch (per reference art), recolored
  // under a bespoke "the_fallen_skin" tint (see BiomeTint.js) and drawn at
  // a much larger drawSize so she still reads as a distinct, unique boss
  // rather than a plain reused Wretch.
  the_fallen: { assetFolder: 'assets/zombie/wretch/', states: { walk: { folder: 'move/', count: 8 } } },
};

function loadRealFrameArray(typeId, assetFolder, stateConfig) {
  const frames = [];
  for (let i = 1; i <= stateConfig.count; i++) {
    const file = `${stateConfig.folder}frame_${String(i).padStart(2, '0')}.png`;
    const t = stateConfig.count > 1 ? (i - 1) / (stateConfig.count - 1) : 0;
    const placeholder = renderFrame(typeId, PALETTES[typeId] || PALETTES.walker, 'walk', t);
    // Keep the live handle (not just its .image) - AssetLoader swaps the
    // real art in after it finishes loading, and Zombie.draw() reads
    // `.image` fresh every frame so that swap is picked up automatically.
    frames.push(getStaticImage(`zombie:${typeId}:${stateConfig.folder}:${i}`, assetFolder + file, placeholder));
  }
  return frames;
}

// Same as loadRealFrameArray, but routes each frame through BiomeTint under
// a bespoke synthetic "biome" id instead of loading it untouched - only
// The Fallen uses this, since she's the one zombie type sourced from the
// tileset copy rather than assets/zombie/.
function loadTintedFrameArray(typeId, assetFolder, stateConfig) {
  const frames = [];
  for (let i = 1; i <= stateConfig.count; i++) {
    const file = `${stateConfig.folder}frame_${String(i).padStart(2, '0')}.png`;
    const t = stateConfig.count > 1 ? (i - 1) / (stateConfig.count - 1) : 0;
    const placeholder = renderFrame(typeId, PALETTES[typeId] || PALETTES.walker, 'walk', t);
    const rawHandle = getStaticImage(`zombie:${typeId}:${stateConfig.folder}:${i}`, assetFolder + file, placeholder);
    frames.push(getTintedImage(rawHandle, `the_fallen:${stateConfig.folder}:${i}`, 'the_fallen_skin'));
  }
  return frames;
}

function getRealArtFrames(typeId) {
  const config = REAL_ART_TYPES[typeId];
  const loader = typeId === 'the_fallen' ? loadTintedFrameArray : loadRealFrameArray;
  const walkFrames = loader(typeId, config.assetFolder, config.states.walk);
  const attackFrames = config.states.attack
    ? loader(typeId, config.assetFolder, config.states.attack)
    : walkFrames;
  const deathFrames = config.states.death
    ? loader(typeId, config.assetFolder, config.states.death)
    : walkFrames;
  return { walk: walkFrames, attack: attackFrames, death: deathFrames };
}

export function getZombieFrames(typeId) {
  // The Fallen's frames are tinted (see BiomeTint.getTintedImage), which
  // upgrades from placeholder to real art by being polled again once the
  // raw source has loaded - unlike every other type here, there's no
  // onload callback doing that automatically, so she can't go through the
  // permanent frameCache below or she'd get stuck on the placeholder
  // forever. Recomputing every call is cheap: there's only ever one
  // instance of this type on screen (the scripted level-39 boss).
  if (typeId === 'the_fallen') return getRealArtFrames(typeId);

  if (frameCache.has(typeId)) return frameCache.get(typeId);

  if (REAL_ART_TYPES[typeId]) {
    const sets = getRealArtFrames(typeId);
    frameCache.set(typeId, sets);
    return sets;
  }

  const palette = PALETTES[typeId] || PALETTES.walker;
  const sets = {};
  for (const [state, count] of Object.entries(FRAME_COUNTS)) {
    sets[state] = [];
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      sets[state].push(renderFrame(typeId, palette, state, t));
    }
  }
  frameCache.set(typeId, sets);
  return sets;
}
