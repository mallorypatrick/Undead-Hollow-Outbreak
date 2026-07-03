// Lightweight blood particle burst + persistent ground decals. Particles
// are plain data (no per-particle canvas work) so spawning dozens per hit
// stays cheap; decals reuse a handful of pre-rendered canvases instead of
// drawing fresh shapes every frame.
import { getStaticImage } from '../core/AssetLoader.js';

const DECAL_VARIANTS = 4;
const MAX_DECALS = 150;

function renderCasingPlaceholder() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9a13a';
  ctx.fillRect(1, 2, 14, 4);
  return canvas;
}

// Real ejected-casing sprite (falls back to the procedural brass rect above
// until it finishes loading, same pattern as every other real-art asset).
const casingImageHandle = getStaticImage('effect:bullet_casing', 'assets/effects/bullet_casing.png', renderCasingPlaceholder());

function renderMuzzleFlashPlaceholder() {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(14, 20, 2, 14, 20, 18);
  grad.addColorStop(0, 'rgba(255,240,180,0.95)');
  grad.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(14, 20, 18, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

// 3-frame muzzle flash (see Player._fireWeapon's 'weaponFired' event /
// Game._processPlayerEvents). The source art's bright core sits left-of-
// center with rays fanning out to the right, so it's drawn treating
// "rightward" as its natural forward direction and rotated to the fire
// angle - MUZZLE_FLASH_ANCHOR is that core point, as a fraction of the
// frame's width/height, so it lines up with the muzzle instead of the
// sprite's own center.
const MUZZLE_FLASH_ANCHOR = { x: 0.28, y: 0.5 };
const muzzleFlashHandles = [1, 2, 3].map((i) =>
  getStaticImage(`effect:muzzle_flash:${i}`, `assets/effects/muzzle_flash/frame_0${i}.png`, renderMuzzleFlashPlaceholder())
);

function renderDecal(seed) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  ctx.translate(size / 2, size / 2);
  const blobs = 6 + Math.floor(rand() * 4);
  for (let i = 0; i < blobs; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * size * 0.28;
    const r = size * (0.12 + rand() * 0.16);
    ctx.fillStyle = rand() < 0.6 ? 'rgba(90,10,10,0.55)' : 'rgba(50,6,6,0.5)';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

const decalCanvases = Array.from({ length: DECAL_VARIANTS }, (_, i) => renderDecal(i * 137 + 7));

// Blood-trail/tracking system: unlike the permanent gore splats above, these
// fade out over a limited duration and come in per-faction colors so a
// player/zombie/military trail reads as visually distinct (and can overlap/
// stack). See Player._handleBleeding, Zombie.update's wantsBloodTrail/
// wantsFootprint, and Game._updateBloodContamination for how entities decide
// when to spawn one of these.
const FACTION_BLOOD_COLOR = {
  player: { base: 'rgba(150,20,20,', alt: 'rgba(95,10,10,' },
  military: { base: 'rgba(120,28,18,', alt: 'rgba(75,20,12,' },
  zombie: { base: 'rgba(78,82,24,', alt: 'rgba(58,16,10,' }, // necrotic yellow-green tinge mixed with dark red
};
const TRAIL_VARIANTS = 3;
const FOOTPRINT_VARIANTS = 3;
const MAX_FADING_DECALS = 260;
const BLOOD_TRAIL_LIFE = [4, 6.5]; // seconds, "fades gradually" - randomized range
const FOOTPRINT_LIFE = [2, 3]; // seconds, per spec

function renderTrailDrop(seed, colors) {
  const size = 20;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  ctx.translate(size / 2, size / 2);
  const blobs = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < blobs; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * size * 0.18;
    const r = size * (0.16 + rand() * 0.14);
    ctx.fillStyle = (rand() < 0.6 ? colors.base : colors.alt) + '0.85)';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

// A small heel+ball-of-foot smear rather than a literal shoe outline - reads
// fine at gameplay scale/rotation without needing real footprint art.
function renderFootprint(colors) {
  const w = 14;
  const h = 26;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colors.base + '0.7)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.78, w * 0.34, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.32, w * 0.42, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

const trailCanvases = {};
const footprintCanvases = {};
for (const faction of Object.keys(FACTION_BLOOD_COLOR)) {
  const colors = FACTION_BLOOD_COLOR[faction];
  trailCanvases[faction] = Array.from({ length: TRAIL_VARIANTS }, (_, i) => renderTrailDrop(i * 191 + faction.length, colors));
  footprintCanvases[faction] = Array.from({ length: FOOTPRINT_VARIANTS }, () => renderFootprint(colors));
}

const QUALITY_PRESETS = {
  low: { maxDecals: 40, particleMultiplier: 0.4 },
  medium: { maxDecals: 90, particleMultiplier: 0.7 },
  high: { maxDecals: MAX_DECALS, particleMultiplier: 1 },
};

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.decals = [];
    this.fadingDecals = []; // blood trails + footprints - see spawnBloodTrail/spawnFootprint
    this.maxDecals = MAX_DECALS;
    this.particleMultiplier = 1;
  }

  setQualityTier(tier) {
    const preset = QUALITY_PRESETS[tier] || QUALITY_PRESETS.high;
    this.maxDecals = preset.maxDecals;
    this.particleMultiplier = preset.particleMultiplier;
  }

  spawnBloodBurst(x, y, count = 10) {
    const actualCount = Math.max(1, Math.round(count * this.particleMultiplier));
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        dark: Math.random() < 0.5,
      });
    }
  }

  // Ejected from the gun's ejection port when firing certain weapons -
  // small, brief, and rendered as a tumbling brass rectangle rather than a
  // blood fleck (see kind: 'casing' in drawParticles).
  spawnCasing(x, y, ejectAngle) {
    const speed = 70 + Math.random() * 70;
    this.particles.push({
      x, y,
      vx: Math.cos(ejectAngle) * speed,
      vy: Math.sin(ejectAngle) * speed,
      life: 0,
      maxLife: 0.7 + Math.random() * 0.4,
      size: 3.5,
      kind: 'casing',
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 14,
    });
  }

  // A single very brief flash right at the gun's muzzle, rotated to the
  // exact fire angle so it reads as coming out of the barrel tip instead of
  // hovering nearby - see Game._processPlayerEvents' 'weaponFired' handling.
  spawnMuzzleFlash(x, y, angle) {
    this.particles.push({
      x, y,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.055,
      kind: 'muzzleFlash',
      angle,
      frame: Math.floor(Math.random() * muzzleFlashHandles.length),
    });
  }

  // Bright, fast, very short-lived - a bullet striking metal (a car) rather
  // than a soft target.
  spawnSparks(x, y, count = 8) {
    const actualCount = Math.max(1, Math.round(count * this.particleMultiplier));
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 140 + Math.random() * 220;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.12 + Math.random() * 0.14,
        size: 1.5 + Math.random() * 1.5,
        kind: 'spark',
      });
    }
  }

  spawnDecal(x, y) {
    this.decals.push({
      x, y,
      variant: Math.floor(Math.random() * DECAL_VARIANTS),
      scale: 0.7 + Math.random() * 0.8,
      rotation: Math.random() * Math.PI * 2,
    });
    if (this.decals.length > this.maxDecals) this.decals.shift();
  }

  // A drop from an actively-bleeding entity's own trail. `faction` is
  // 'player' | 'zombie' | 'military' - see FACTION_BLOOD_COLOR. Fades out
  // gradually over BLOOD_TRAIL_LIFE rather than persisting like spawnDecal's
  // gore splats, and is what Game._updateBloodContamination checks other
  // entities against to decide who's stepped in it.
  spawnBloodTrail(x, y, faction) {
    const variants = trailCanvases[faction] || trailCanvases.player;
    this.fadingDecals.push({
      x, y,
      canvas: variants[Math.floor(Math.random() * variants.length)],
      rotation: Math.random() * Math.PI * 2,
      scale: 0.8 + Math.random() * 0.6,
      age: 0,
      maxAge: BLOOD_TRAIL_LIFE[0] + Math.random() * (BLOOD_TRAIL_LIFE[1] - BLOOD_TRAIL_LIFE[0]),
      faction,
      isFootprint: false,
    });
    if (this.fadingDecals.length > MAX_FADING_DECALS) this.fadingDecals.shift();
  }

  // Left behind by an entity whose feet are currently contaminated with a
  // DIFFERENT faction's blood (see Game._updateBloodContamination) -
  // `faction` here is the blood's source faction, not the walker's own, so a
  // zombie tracking through player blood leaves red prints, not green ones.
  // Short-lived (2-3s) per spec, distinct from the longer trail-droplet fade.
  spawnFootprint(x, y, faction, angle) {
    const variants = footprintCanvases[faction] || footprintCanvases.player;
    this.fadingDecals.push({
      x, y,
      canvas: variants[Math.floor(Math.random() * variants.length)],
      rotation: angle,
      scale: 0.9 + Math.random() * 0.3,
      age: 0,
      maxAge: FOOTPRINT_LIFE[0] + Math.random() * (FOOTPRINT_LIFE[1] - FOOTPRINT_LIFE[0]),
      faction,
      isFootprint: true,
    });
    if (this.fadingDecals.length > MAX_FADING_DECALS) this.fadingDecals.shift();
  }

  update(dt) {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.kind === 'spark' ? 0.8 : 0.9;
      p.vy *= p.kind === 'spark' ? 0.8 : 0.9;
      if (p.kind === 'casing') p.rotation += p.spin * dt;
    }
    if (this.particles.length) {
      this.particles = this.particles.filter((p) => p.life < p.maxLife);
    }

    if (this.fadingDecals.length) {
      for (const d of this.fadingDecals) d.age += dt;
      this.fadingDecals = this.fadingDecals.filter((d) => d.age < d.maxAge);
    }
  }

  drawDecals(ctx, camera) {
    for (const d of this.decals) {
      const screen = camera.worldToScreen(d.x, d.y);
      if (screen.x < -80 || screen.x > 2000 || screen.y < -80 || screen.y > 1160) continue;
      const size = 64 * d.scale;
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(d.rotation);
      ctx.drawImage(decalCanvases[d.variant], -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  drawFadingDecals(ctx, camera) {
    for (const d of this.fadingDecals) {
      const screen = camera.worldToScreen(d.x, d.y);
      if (screen.x < -40 || screen.x > 1960 || screen.y < -40 || screen.y > 1120) continue;
      // Gradual linear fade across the decal's whole lifetime - "heavier
      // bleeding" already reads as more/denser drops laid down over time
      // rather than any single decal being more opaque.
      const alpha = Math.max(0, 1 - d.age / d.maxAge);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(screen.x, screen.y);
      ctx.rotate(d.rotation);
      const w = d.canvas.width * d.scale;
      const h = d.canvas.height * d.scale;
      ctx.drawImage(d.canvas, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawParticles(ctx, camera) {
    for (const p of this.particles) {
      const screen = camera.worldToScreen(p.x, p.y);
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.kind === 'casing') {
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate(p.rotation);
        const w = p.size * 2.6;
        const h = p.size * 1.4;
        ctx.drawImage(casingImageHandle.image, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else if (p.kind === 'spark') {
        ctx.strokeStyle = '#ffdf8a';
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(screen.x - p.vx * 0.02, screen.y - p.vy * 0.02);
        ctx.stroke();
      } else if (p.kind === 'muzzleFlash') {
        const handle = muzzleFlashHandles[p.frame];
        const w = 60, h = 60;
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate(p.angle);
        ctx.drawImage(handle.image, -w * MUZZLE_FLASH_ANCHOR.x, -h * MUZZLE_FLASH_ANCHOR.y, w, h);
        ctx.restore();
      } else {
        ctx.fillStyle = p.dark ? '#4a0f0f' : '#8a1f1f';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
