// Procedurally generated placeholder frames.
//
// These stand in for real authored art (assets/player/<weapon>/<state>/...)
// until that art exists. The real art is single-direction, rotated at
// draw time by AnimationManager - these placeholders match that: each is
// one frame, drawn facing "up", the same convention real art follows.
//
// All shapes are drawn from scratch with canvas primitives - nothing here is
// traced, copied, or derived from existing artwork.

const FRAME_SIZE = 96;

const PALETTES = {
  unarmed: { body: '#8a8f87', accent: '#c94a3a', weapon: null },
  chainsaw: { body: '#7a7d74', accent: '#c94a3a', weapon: '#2b2e2a' },
  handgun: { body: '#7d8479', accent: '#c94a3a', weapon: '#4a4f4a' },
  revolver: { body: '#7f7568', accent: '#c94a3a', weapon: '#5c4632' },
  rifle: { body: '#6f7a6a', accent: '#c94a3a', weapon: '#3d4a3a' },
  smg: { body: '#75786f', accent: '#c94a3a', weapon: '#43463f' },
  shotgun: { body: '#847a6c', accent: '#c94a3a', weapon: '#5a4a35' },
};

function paletteFor(weaponId) {
  return PALETTES[weaponId] || PALETTES.unarmed;
}

function drawBody(ctx, palette, options = {}) {
  const { scale = 1, tint = null } = options;
  const r = FRAME_SIZE * 0.28 * scale;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Art faces "up" by convention, so the nose points up (-Y) here.
  ctx.fillStyle = tint || palette.body;
  ctx.strokeStyle = '#232320';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#d8d4c8';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.lineTo(-r * 0.4, -r * 0.15);
  ctx.lineTo(r * 0.4, -r * 0.15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return r;
}

function drawWeaponGlyph(ctx, weaponId, palette, bodyRadius, stateKey, t) {
  if (weaponId === 'chainsaw') {
    ctx.save();
    const extend = stateKey === 'start' ? 0.2 + t * 0.8 : 1;
    const jitter = stateKey === 'idle_running' ? Math.sin(t * Math.PI * 8) * 1.5 : 0;
    ctx.translate(jitter, 0);
    ctx.fillStyle = '#c9772f';
    ctx.fillRect(-bodyRadius * 0.2, -bodyRadius * 0.6, bodyRadius * 0.4, bodyRadius * 0.4);
    ctx.fillStyle = palette.weapon;
    ctx.fillRect(-bodyRadius * 0.1, -bodyRadius * (0.6 + 1.6 * extend), bodyRadius * 0.2, bodyRadius * 1.6 * extend);
    ctx.restore();
  } else if (palette.weapon) {
    ctx.save();
    ctx.fillStyle = palette.weapon;
    ctx.fillRect(-bodyRadius * 0.12, -bodyRadius * 1.3, bodyRadius * 0.24, bodyRadius * 0.9);
    ctx.restore();
  }
}

function frameEffects(stateKey, frameIndex, frameCount) {
  const t = frameCount > 1 ? frameIndex / (frameCount - 1) : 0;
  switch (stateKey) {
    case 'idle':
    case 'idle_running':
      return { scale: 1 + Math.sin(t * Math.PI * 2) * 0.02, t };
    case 'walk':
    case 'run':
      return { scale: 1 + Math.sin(t * Math.PI * 2) * 0.03, t };
    case 'hurt':
      return { tint: '#a83a3a', scale: 1.05, t };
    case 'death':
      return { deathT: t, t };
    default:
      return { t };
  }
}

// Single placeholder frame for (weaponId, stateKey, frameIndex). Matches the
// "up-facing, rotated at draw time" convention real art uses.
export function generatePlaceholderFrame(weaponId, stateKey, frameIndex, frameCount) {
  const palette = paletteFor(weaponId);
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_SIZE;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext('2d');
  const cx = FRAME_SIZE / 2;
  const cy = FRAME_SIZE / 2;
  const fx = frameEffects(stateKey, frameIndex, frameCount);

  ctx.save();
  ctx.translate(cx, cy);

  if (stateKey === 'death') {
    ctx.globalAlpha = 1 - fx.deathT * 0.5;
    ctx.rotate(fx.deathT * (Math.PI / 2.2));
  }

  const bodyRadius = drawBody(ctx, palette, fx);
  drawWeaponGlyph(ctx, weaponId, palette, bodyRadius, stateKey, fx.t);

  ctx.restore();
  return canvas;
}

// Small static pickup icon placeholder, used until a real icon exists at
// assets/items/<weapon>/icon.png.
// A classic side-view silhouette (cylinder, barrel, hammer, grip) rather
// than the generic character-holding-a-weapon icon - reads clearly as "a
// revolver" at a glance the way a pickup icon should.
function drawRevolverSideView(ctx, palette, size) {
  ctx.save();
  ctx.translate(size / 2, size / 2);

  ctx.fillStyle = palette.weapon;
  ctx.strokeStyle = '#1c1a16';
  ctx.lineWidth = 1.5;

  // Barrel
  ctx.beginPath();
  ctx.roundRect(-size * 0.34, -size * 0.06, size * 0.34, size * 0.12, 2);
  ctx.fill();
  ctx.stroke();

  // Cylinder
  ctx.beginPath();
  ctx.arc(-size * 0.02, 0, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1c1a16';
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    ctx.beginPath();
    ctx.arc(-size * 0.02 + Math.cos(a) * size * 0.08, Math.sin(a) * size * 0.08, size * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hammer
  ctx.fillStyle = palette.weapon;
  ctx.beginPath();
  ctx.moveTo(size * 0.1, -size * 0.1);
  ctx.lineTo(size * 0.16, -size * 0.22);
  ctx.lineTo(size * 0.22, -size * 0.2);
  ctx.lineTo(size * 0.16, -size * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Grip
  ctx.fillStyle = '#4a3324';
  ctx.beginPath();
  ctx.moveTo(size * 0.08, size * 0.05);
  ctx.lineTo(size * 0.22, size * 0.05);
  ctx.lineTo(size * 0.2, size * 0.32);
  ctx.lineTo(size * 0.1, size * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function generatePlaceholderIcon(weaponId) {
  const palette = paletteFor(weaponId);
  const size = 72;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (weaponId === 'revolver') {
    drawRevolverSideView(ctx, palette, size);
    return canvas;
  }

  ctx.save();
  ctx.translate(size / 2, size / 2);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.32, size * 0.3, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const r = drawBody(ctx, palette, {});
  drawWeaponGlyph(ctx, weaponId, palette, r, 'idle', 0);

  ctx.restore();
  return canvas;
}

// Placeholder icons for non-weapon supply pickups (see SupplyConfig.js).
// Used until a real icon exists at assets/items/<supplyId>/icon.png.
export function generateSupplyIcon(supplyId) {
  const size = 72;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(size / 2, size / 2);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.32, size * 0.26, size * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  const s = size * 0.32;
  switch (supplyId) {
    case 'weapon_crate':
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(-s, -s * 0.8, s * 2, s * 1.6);
      ctx.strokeStyle = '#3a2818';
      ctx.lineWidth = 3;
      ctx.strokeRect(-s, -s * 0.8, s * 2, s * 1.6);
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.8); ctx.lineTo(s, s * 0.8);
      ctx.moveTo(s, -s * 0.8); ctx.lineTo(-s, s * 0.8);
      ctx.stroke();
      break;
    case 'food':
      ctx.fillStyle = '#7a9c4a';
      ctx.beginPath();
      ctx.arc(0, s * 0.1, s * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a6b2a';
      ctx.fillRect(-s * 0.08, -s * 0.95, s * 0.16, s * 0.35);
      break;
    case 'water':
      ctx.fillStyle = '#3a7ac9';
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.9, s * 0.3, 0, s);
      ctx.quadraticCurveTo(-s * 0.9, s * 0.3, 0, -s);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.25, -s * 0.1, s * 0.12, s * 0.3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'ammo_box':
      ctx.fillStyle = '#5a5240';
      ctx.fillRect(-s, -s * 0.7, s * 2, s * 1.4);
      ctx.fillStyle = '#c9a13a';
      ctx.fillRect(-s * 0.7, -s * 0.3, s * 1.4, s * 0.5);
      break;
    case 'bandages':
      ctx.fillStyle = '#3f6b3f';
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8e4d8';
      ctx.fillRect(-s * 0.7, -s * 0.18, s * 1.4, s * 0.36);
      ctx.fillRect(-s * 0.18, -s * 0.7, s * 0.36, s * 1.4);
      break;
    default: // medkit and any future fallback
      ctx.fillStyle = '#a83a3a';
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8e4d8';
      ctx.fillRect(-s * 0.7, -s * 0.18, s * 1.4, s * 0.36);
      ctx.fillRect(-s * 0.18, -s * 0.7, s * 0.36, s * 1.4);
  }

  ctx.restore();
  return canvas;
}
