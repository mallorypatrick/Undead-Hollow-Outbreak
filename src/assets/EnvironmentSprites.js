// Procedurally generated map decoration art (trees, fences, buildings,
// gravestones, corpses) plus ground tile textures (grass/road/field/
// cemetery). Everything is generated once at module load and cached -
// drawing a decoration is just drawImage(), which is what keeps a map with
// hundreds of scattered objects cheap to render every frame.
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// --- ground tiles (182x182, tileable) ---

export function createRoadTile() {
  const size = 182;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2b2b2c';
  ctx.fillRect(0, 0, size, size);
  const rand = seededRandom(99);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 30; i++) {
    ctx.fillRect(rand() * size, rand() * size, rand() * 4 + 1, rand() * 4 + 1);
  }
  ctx.fillStyle = '#c9b23a';
  ctx.fillRect(size / 2 - 4, 0, 8, size * 0.4);
  ctx.fillRect(size / 2 - 4, size * 0.6, 8, size * 0.4);
  return c;
}

export function createFieldTile() {
  const size = 182;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a3f2a';
  ctx.fillRect(0, 0, size, size);
  const rand = seededRandom(41);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let y = 10; y < size; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y) * 3);
    ctx.lineTo(size, y + Math.cos(y) * 3);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(120,110,60,0.15)';
  for (let i = 0; i < 20; i++) ctx.fillRect(rand() * size, rand() * size, 3, 3);
  return c;
}

export function createCemeteryTile() {
  const size = 182;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2e3324';
  ctx.fillRect(0, 0, size, size);
  const rand = seededRandom(7);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 25; i++) ctx.fillRect(rand() * size, rand() * size, rand() * 3 + 1, rand() * 3 + 1);
  return c;
}

// --- decorations ---

export function createTree() {
  const size = 96;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.32, size * 0.28, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(-size * 0.05, -size * 0.05, size * 0.1, size * 0.35);
  ctx.fillStyle = '#2f4a2a';
  ctx.beginPath();
  ctx.arc(0, -size * 0.15, size * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d5c34';
  ctx.beginPath();
  ctx.arc(-size * 0.08, -size * 0.25, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function createFencePost() {
  const w = 40, h = 64;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(w * 0.2, h * 0.85, w * 0.6, h * 0.1);
  ctx.fillStyle = '#6b5638';
  ctx.fillRect(w * 0.4, h * 0.1, w * 0.2, h * 0.8);
  ctx.strokeStyle = '#4a3a24';
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.4, h * 0.1, w * 0.2, h * 0.8);
  return c;
}

export function createFenceRail() {
  const w = 100, h = 24;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a6440';
  ctx.fillRect(0, h * 0.2, w, h * 0.25);
  ctx.fillRect(0, h * 0.6, w, h * 0.25);
  ctx.strokeStyle = '#4a3a24';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, h * 0.2, w, h * 0.25);
  ctx.strokeRect(0, h * 0.6, w, h * 0.25);
  return c;
}

export function createFarmhouse() {
  const w = 260, h = 200;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  // The triangular roof below doesn't cover the canvas's top corners -
  // without this, those corners stay transparent and the collision Wall's
  // grey brick texture (drawn underneath, same rect) bleeds through.
  ctx.fillStyle = '#5c3a2a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(6, h * 0.35 + 6, w - 12, h * 0.65 - 6);
  ctx.fillStyle = '#8a7a5a';
  ctx.fillRect(0, h * 0.35, w, h * 0.65);
  ctx.strokeStyle = '#4a3f2a';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, h * 0.35, w, h * 0.65);
  ctx.fillStyle = '#5c3a2a';
  ctx.beginPath();
  ctx.moveTo(-10, h * 0.38);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(w + 10, h * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(120,150,170,0.6)';
  ctx.fillRect(w * 0.15, h * 0.55, w * 0.18, h * 0.22);
  ctx.fillRect(w * 0.67, h * 0.55, w * 0.18, h * 0.22);
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(w * 0.42, h * 0.62, w * 0.16, h * 0.38);
  return c;
}

export function createBarn() {
  const w = 300, h = 220;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  // Same fix as createFarmhouse - fill the whole canvas first so the
  // triangular roof's uncovered corners don't let the collision Wall's
  // grey brick texture show through underneath.
  ctx.fillStyle = '#5c211d';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(6, h * 0.4 + 6, w - 12, h * 0.6 - 6);
  ctx.fillStyle = '#7a2f2a';
  ctx.fillRect(0, h * 0.4, w, h * 0.6);
  ctx.strokeStyle = '#3a1512';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, h * 0.4, w, h * 0.6);
  ctx.fillStyle = '#5c211d';
  ctx.beginPath();
  ctx.moveTo(-15, h * 0.42);
  ctx.lineTo(w * 0.5, 0);
  ctx.lineTo(w + 15, h * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8d9a0';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.18, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2015';
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h);
  ctx.lineTo(w * 0.35, h * 0.55);
  ctx.lineTo(w * 0.5, h * 0.45);
  ctx.lineTo(w * 0.65, h * 0.55);
  ctx.lineTo(w * 0.65, h);
  ctx.closePath();
  ctx.fill();
  return c;
}

export function createGravestone() {
  const w = 44, h = 56;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.92, w * 0.4, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a8a86';
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.85);
  ctx.lineTo(w * 0.15, h * 0.3);
  ctx.quadraticCurveTo(w * 0.15, h * 0.05, w * 0.5, h * 0.05);
  ctx.quadraticCurveTo(w * 0.85, h * 0.05, w * 0.85, h * 0.3);
  ctx.lineTo(w * 0.85, h * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a5a56';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.2);
  ctx.lineTo(w * 0.5, h * 0.7);
  ctx.stroke();
  return c;
}

function createCorpse(isZombie) {
  const w = 56, h = 40;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.translate(w / 2, h / 2);
  ctx.fillStyle = 'rgba(60,8,8,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.48, h * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isZombie ? '#4a5240' : '#5a5248';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.32, h * 0.28, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isZombie ? '#3a4030' : '#3a3630';
  ctx.beginPath();
  ctx.arc(w * 0.28, -h * 0.05, h * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // limbs
  ctx.strokeStyle = isZombie ? '#4a5240' : '#5a5248';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, -h * 0.15);
  ctx.lineTo(-w * 0.45, -h * 0.3);
  ctx.moveTo(-w * 0.2, h * 0.15);
  ctx.lineTo(-w * 0.45, h * 0.32);
  ctx.stroke();

  return c;
}

export function createHumanCorpse() {
  return createCorpse(false);
}

export function createZombieCorpse() {
  return createCorpse(true);
}

const cache = new Map();
function cached(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

export const EnvironmentSprites = {
  get roadTile() { return cached('road', createRoadTile); },
  get fieldTile() { return cached('field', createFieldTile); },
  get cemeteryTile() { return cached('cemetery', createCemeteryTile); },
  get tree() { return cached('tree', createTree); },
  get fencePost() { return cached('fencePost', createFencePost); },
  get fenceRail() { return cached('fenceRail', createFenceRail); },
  get farmhouse() { return cached('farmhouse', createFarmhouse); },
  get barn() { return cached('barn', createBarn); },
  get gravestone() { return cached('gravestone', createGravestone); },
  get humanCorpse() { return cached('humanCorpse', createHumanCorpse); },
  get zombieCorpse() { return cached('zombieCorpse', createZombieCorpse); },
};
