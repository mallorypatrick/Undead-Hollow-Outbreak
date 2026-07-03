import { getStaticImage } from '../core/AssetLoader.js';

const TRACER_COLORS = {
  handgun: '#ffdf9e',
  revolver: '#ffe4b0',
  rifle: '#fff2c4',
  smg: '#ffe6a3',
  shotgun: '#ffcf7a',
  military: '#ff5a4a', // enemy fire reads visually distinct from the player's own tracers
};

// Real bullet sprite option (see Settings -> Graphics). Off by default until
// toggled on - some players prefer the simple tracer line for readability
// in a crowd.
let useRealSprites = false;
export function setUseRealBulletSprites(enabled) {
  useRealSprites = enabled;
}

const BULLET_SPRITE_FILES = {
  handgun: 'bullet_1.png',
  revolver: 'bullet_2.png',
  rifle: 'bullet_3.png',
  smg: 'bullet_5.png',
  shotgun: 'bullet_4.png',
};

function tracerPlaceholder(color) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(4, 4, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function getBulletSprite(weaponId) {
  const file = BULLET_SPRITE_FILES[weaponId] || BULLET_SPRITE_FILES.handgun;
  const placeholder = tracerPlaceholder(TRACER_COLORS[weaponId] || '#ffe6a3');
  return getStaticImage(`bullet:${weaponId}`, `assets/effects/bullets/${file}`, placeholder);
}

export class Bullet {
  constructor({ x, y, angle, speed, damage, headshotMultiplier = 1, range = 1000, weaponId, hostile = false }) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.headshotMultiplier = headshotMultiplier;
    this.range = range;
    this.weaponId = weaponId;
    this.radius = 4;
    // Fired by an enemy at the player, instead of by the player at enemies.
    this.hostile = hostile;

    this.traveled = 0;
    this.alive = true;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;

    const step = this.speed * dt;
    this.x += Math.cos(this.angle) * step;
    this.y += Math.sin(this.angle) * step;
    this.traveled += step;

    if (this.traveled >= this.range) this.alive = false;
  }

  draw(ctx, camera) {
    const to = camera.worldToScreen(this.x, this.y);

    if (useRealSprites) {
      const sprite = getBulletSprite(this.weaponId);
      const size = 16;
      ctx.save();
      ctx.translate(to.x, to.y);
      ctx.rotate(this.angle);
      ctx.drawImage(sprite.image, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }

    const from = camera.worldToScreen(this.prevX, this.prevY);
    ctx.save();
    ctx.strokeStyle = TRACER_COLORS[this.weaponId] || '#ffe6a3';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }
}
