import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from './Renderer.js';

export class Camera {
  constructor(worldWidth, worldHeight) {
    this.x = 0;
    this.y = 0;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    this.shakeTimer = 0;
    this.shakeMagnitude = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Directional recoil punch (weapon fire) - distinct from shake's
    // randomized jitter: snaps opposite the fire direction, then eases
    // linearly back to center.
    this.kickTimer = 0;
    this.kickDuration = 0;
    this.kickPeakX = 0;
    this.kickPeakY = 0;
    this.kickOffsetX = 0;
    this.kickOffsetY = 0;
  }

  follow(target) {
    this.x = target.x - INTERNAL_WIDTH / 2;
    this.y = target.y - INTERNAL_HEIGHT / 2;

    this.x = Math.max(0, Math.min(this.x, this.worldWidth - INTERNAL_WIDTH));
    this.y = Math.max(0, Math.min(this.y, this.worldHeight - INTERNAL_HEIGHT));
  }

  // Triggers (or extends) a brief shake. Only affects rendering
  // (worldToScreen) - screenToWorld stays stable so mouse aim never jitters.
  shake(magnitude, duration) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  // Recoil punch: snaps the view opposite `angle` (the direction just
  // fired), then eases back to center over `duration` - a sharp directional
  // jolt rather than shake's random jitter, so weapon fire reads as a
  // punch, not just noise.
  kick(angle, magnitude, duration) {
    this.kickPeakX = -Math.cos(angle) * magnitude;
    this.kickPeakY = -Math.sin(angle) * magnitude;
    this.kickTimer = duration;
    this.kickDuration = duration;
  }

  update(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeMagnitude = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      } else {
        this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeMagnitude;
        this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeMagnitude;
      }
    }

    if (this.kickTimer > 0) {
      this.kickTimer = Math.max(0, this.kickTimer - dt);
      const t = this.kickDuration > 0 ? this.kickTimer / this.kickDuration : 0;
      this.kickOffsetX = this.kickPeakX * t;
      this.kickOffsetY = this.kickPeakY * t;
    } else {
      this.kickOffsetX = 0;
      this.kickOffsetY = 0;
    }
  }

  worldToScreen(x, y) {
    return { x: x - this.x + this.shakeOffsetX + this.kickOffsetX, y: y - this.y + this.shakeOffsetY + this.kickOffsetY };
  }

  screenToWorld(x, y) {
    return { x: x + this.x, y: y + this.y };
  }
}
