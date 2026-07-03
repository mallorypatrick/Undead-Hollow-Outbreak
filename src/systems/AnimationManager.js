// Resolves (weapon, state, time) -> a frame to draw, rotated to face the
// entity's current aim angle.
//
// One AnimationManager instance is owned per animated entity (currently
// Player and Zombie). It tracks playback time for whatever state its owner
// is currently in; the owner is responsible for calling reset() whenever it
// switches state or weapon.
import { getAnimationFrames } from '../core/AssetLoader.js';

const DEFAULT_BASE_FACING_ANGLE = -Math.PI / 2; // art drawn facing "up"

export class AnimationManager {
  constructor() {
    this.timeInState = 0;
    this.frameIndex = 0;
    this.finished = false;
  }

  reset() {
    this.timeInState = 0;
    this.frameIndex = 0;
    this.finished = false;
  }

  // Given the weapon's animation config for the *current* state, advance
  // playback. Looping states wrap forever; one-shot states clamp on their
  // last frame and set `finished = true` so the owner can transition out.
  update(dt, animConfig) {
    if (!animConfig) return;
    this.timeInState += dt;
    const frameCount = animConfig.frames.length;
    const rawIndex = Math.floor(this.timeInState / animConfig.frameDuration);

    if (animConfig.loop) {
      this.frameIndex = rawIndex % frameCount;
      this.finished = false;
    } else if (rawIndex >= frameCount - 1) {
      this.frameIndex = frameCount - 1;
      this.finished = true;
    } else {
      this.frameIndex = rawIndex;
      this.finished = false;
    }
  }

  draw(ctx, camera, entity, weaponConfig, stateKey) {
    const animConfig = weaponConfig.animations[stateKey];
    if (!animConfig) return;

    const frameSet = getAnimationFrames(weaponConfig.id, stateKey, animConfig, weaponConfig.assetFolder);
    const frameHandle = frameSet.frames[this.frameIndex];
    if (!frameHandle || !frameHandle.image) return;

    const screen = camera.worldToScreen(entity.x, entity.y);
    const size = entity.drawSize || 40;
    const baseAngle = weaponConfig.baseFacingAngle ?? DEFAULT_BASE_FACING_ANGLE;

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(entity.angle - baseAngle);
    ctx.drawImage(frameHandle.image, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // Weapons don't have to define every generic state. If a weapon has no
  // dedicated entry for the requested state, fall back to its combined
  // movement loop (e.g. the chainsaw's idle_running covers idle/walk/run),
  // and ultimately to idle so nothing ever fails to resolve.
  static resolveStateKey(weaponConfig, desiredState) {
    if (weaponConfig.animations[desiredState]) return desiredState;
    const isMovementState = desiredState === 'idle' || desiredState === 'walk' || desiredState === 'run';
    if (isMovementState && weaponConfig.animations.idle_running) return 'idle_running';
    return 'idle' in weaponConfig.animations ? 'idle' : desiredState;
  }
}
