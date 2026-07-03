// All sprites are generated procedurally at runtime with canvas drawing calls.
// No external image files, and nothing traced/copied from existing artwork.
export const SPRITE_SIZE = 182;

function makeCanvas(size = SPRITE_SIZE) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

// Survivor sprite, facing "right" (angle 0). Rotated per-frame at draw time.
export function createPlayerSprite() {
  const size = SPRITE_SIZE;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.28;

  ctx.save();
  ctx.translate(cx, cy);

  // Soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.9, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#8a8f87';
  ctx.strokeStyle = '#2b2e2a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Facing indicator (nose)
  ctx.fillStyle = '#d8d4c8';
  ctx.beginPath();
  ctx.moveTo(r * 0.9, 0);
  ctx.lineTo(r * 0.2, -r * 0.4);
  ctx.lineTo(r * 0.2, r * 0.4);
  ctx.closePath();
  ctx.fill();

  // Head accent
  ctx.fillStyle = '#c94a3a';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  return c;
}

// Boundary / obstacle wall texture, tiled.
export function createWallTexture(size = SPRITE_SIZE) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#3a3a38';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#232320';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);

  // Rough debris/noise speckle for a weathered look.
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 40; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const s = rand() * 6 + 1;
    ctx.fillRect(x, y, s, s);
  }

  return c;
}

// Subtle ground texture tile for the map floor.
export function createGroundTexture(size = SPRITE_SIZE) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#161613';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);

  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 15; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const s = rand() * 4 + 1;
    ctx.fillRect(x, y, s, s);
  }

  return c;
}

export function createCrosshairSprite(size = 48) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.strokeStyle = '#d8d4c8';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  const gap = size * 0.12;
  const len = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + len);
  ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + len, cy);
  ctx.stroke();

  ctx.fillStyle = '#c94a3a';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

// Minimal placeholder for the shambling AI zombie (used only for the
// post-death player handoff for now; the full horde roster is a later
// milestone). Sickly, hunched, low-detail on purpose - easy to tell apart
// from the player silhouette at a glance.
export function createZombieSprite() {
  const size = SPRITE_SIZE;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.26;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.9, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5c6650';
  ctx.strokeStyle = '#1c1f19';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(2, 2, r, 0, Math.PI * 2); // slightly off-center for a hunched look
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3f4536';
  ctx.beginPath();
  ctx.moveTo(r * 0.85, 0);
  ctx.lineTo(r * 0.1, -r * 0.35);
  ctx.lineTo(r * 0.1, r * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#8a2f2f';
  ctx.beginPath();
  ctx.arc(4, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  return c;
}

// Original pixel-art rotting-hand pointer, used as the menu-navigation
// cursor ("for the fun of it") - drawn entirely from primitives, not traced
// from any existing artwork.
export function createZombieHandCursor(size = 40) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const px = size / 16; // chunky "pixel" unit so it reads as retro pixel art

  const skin = '#5a7a4a';
  const skinDark = '#3f5a34';
  const nail = '#c9c4b0';
  const bone = '#e8e4d8';
  const blood = '#8a1f1f';

  ctx.imageSmoothingEnabled = false;

  const rect = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * px), Math.round(gy * px), Math.round(gw * px), Math.round(gh * px));
  };

  // Pointing index finger (the tip is the actual click point, top-left).
  rect(0, 0, 3, 7, skin);
  rect(0, 0, 1, 7, skinDark);
  rect(0.5, 1, 1, 1, nail);

  // Knuckle joints down the finger.
  rect(0.5, 3, 2, 1, skinDark);
  rect(0.5, 5.5, 2, 1, skinDark);

  // Palm/hand mass.
  rect(1, 6.5, 6, 6, skin);
  rect(1, 6.5, 6, 1.5, skinDark);

  // Two curled-under fingers, knuckles visible.
  rect(6, 8, 3, 2.5, skin);
  rect(6.5, 10.2, 2.5, 2, skin);

  // Exposed bone + wound at the wrist, matching the game's gore palette.
  rect(1.5, 12, 5, 1.5, blood);
  rect(2.5, 13, 1, 2.5, bone);
  rect(4, 13, 1, 2.5, bone);

  return c;
}

export const Sprites = {
  player: createPlayerSprite(),
  zombie: createZombieSprite(),
  wall: createWallTexture(),
  ground: createGroundTexture(),
  crosshair: createCrosshairSprite(),
  zombieHandCursor: createZombieHandCursor(),
};
