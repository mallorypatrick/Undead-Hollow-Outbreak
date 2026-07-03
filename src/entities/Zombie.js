import { getZombieConfig } from '../config/ZombieConfig.js';
import { getZombieFrames } from '../assets/ZombieSprites.js';
import { playSound } from '../systems/AudioManager.js';

const FRAME_DURATIONS = { walk: 0.16, attack: 0.11, death: 0.16 };
const BASE_FACING_ANGLE = -Math.PI / 2; // art drawn facing "up", same convention as Player
const MOAN_AUDIBLE_RANGE = 1100;
const KNOCKBACK_DECAY = 0.82; // per-frame multiplier - dies out over a handful of frames
// Footstep cadence while state === 'walk' (i.e. actually translating this
// frame, in every movement branch below) - scaled by speed so a fast
// runner steps more often than a shuffling crawler. Game._updateZombies
// applies a short shared cooldown across every zombie's request so a crowd
// doesn't turn into overlapping audio spam - see wantsFootstep below.
const FOOTSTEP_INTERVAL_BASE = 0.4;
const FOOTSTEP_REFERENCE_SPEED = 100;

// Blood trail/tracking system (see ParticleSystem.spawnBloodTrail/
// spawnFootprint and Game._updateBloodContamination, which owns the
// contamination timer/duration - this zombie only owns its own bleeding
// state and how often it drops a decal while either is active). Bleeding
// itself is cosmetic only - it never damages the zombie, just marks it as a
// moving blood source for a while after it's hit.
const BLEED_DURATION = 4.5;
const BLOOD_TRAIL_INTERVAL = 0.3;
const FOOTPRINT_INTERVAL = 0.22;

// Hostile zombie with a simple chase-and-attack AI. If update() is called
// with no target (used for the player-turned-zombie handoff on death) it
// falls back to wandering instead of standing still.
export class Zombie {
  constructor(x, y, typeId = 'walker') {
    const config = getZombieConfig(typeId);
    this.typeId = typeId;

    this.x = x;
    this.y = y;
    this.radius = config.radius; // hitbox - smaller than drawSize on purpose
    this.drawSize = config.drawSize;
    this.speed = config.speed;
    this.health = config.health;
    this.maxHealth = config.health;
    this.damage = config.damage;
    this.armor = config.armor;
    this.attackCooldownDuration = config.attackCooldown;
    this.attackRange = config.attackRange;
    this.isBoss = !!config.isBoss;
    this.displayName = config.displayName;
    this.usesRealArt = !!config.usesRealArt;

    // Fights at range instead of closing to melee (currently just the
    // military type) - see _updateRanged().
    this.ranged = !!config.ranged;
    this.engagementRange = config.engagementRange || 0;
    this.fireRateSeconds = config.fireRate || 1;
    this.bulletDamage = config.bulletDamage || 0;
    this.bulletSpeed = config.bulletSpeed || 1000;
    this.bulletRange = config.bulletRange || 800;
    this.fireTimer = Math.random() * this.fireRateSeconds;
    // Two-phase ranged types (currently just The Fallen) drop the ranged
    // behavior and fight purely in melee once health falls below this
    // fraction - 0 (the default) means "never", so every other ranged type
    // (military) is completely unaffected.
    this.meleeRageThreshold = config.meleeRageHealthPct || 0;

    // Set by Game when this is the player's previous character risen as a
    // boss (see restart()/_grantLootToPlayer) - the weapon ids it died
    // carrying, granted to the player once this zombie is finally put down.
    this.lootWeapons = null;
    this.lootGranted = false;

    this.alive = true;
    this.deathFinished = false;
    this.angle = Math.random() * Math.PI * 2;
    this.state = 'walk'; // walk | attack | death
    this._lastState = null;
    this.frameTime = 0;
    this.frameIndex = 0;
    this.attackTimer = 0;

    this._wanderTimer = 0;
    this._moanTimer = 1 + Math.random() * 4;
    this._footstepTimer = Math.random() * FOOTSTEP_INTERVAL_BASE; // staggered so a group doesn't step in unison

    // Decaying push-back velocity from a firearm hit (see applyKnockback) -
    // additive on top of whatever the AI/state logic already moved this
    // frame, so it reads as an external shove rather than replacing movement.
    this.knockbackVX = 0;
    this.knockbackVY = 0;

    // Military only: true once the player has damaged this specific soldier
    // during the levels 16-39 truce - breaks the truce for just this unit,
    // which then targets the player like any other level. See
    // Game._findHostileTarget/_damageZombie. Always false (and unused)
    // outside the military type.
    this.provoked = false;

    // Blood trail/tracking state - see the constants above and
    // Game._updateBloodContamination for how footContaminated gets set.
    this.faction = typeId === 'military' ? 'military' : 'zombie';
    this.bleeding = false;
    this._bleedTimer = 0;
    this._bloodTrailTimer = 0;
    this.footContaminated = false;
    this._footContamTimer = 0;
    this._footprintTimer = 0;
    this._contaminationFaction = null;
  }

  // `force` is an initial velocity (units/sec) along `angle`; it decays
  // away over a few frames via KNOCKBACK_DECAY in update().
  applyKnockback(angle, force) {
    this.knockbackVX += Math.cos(angle) * force;
    this.knockbackVY += Math.sin(angle) * force;
  }

  // Returns { attacked, damage } so the caller (Game) can apply damage and
  // trigger effects without Zombie needing to know about Player internals.
  update(dt, target) {
    if (this.attackTimer > 0) this.attackTimer -= dt;

    if (this.state === 'death') {
      this._advanceFrame(dt);
      return { attacked: false };
    }

    let attacked = false;
    let wantsMoan = false;
    let wantsToFire = false;

    if (target && !target.isDead) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.angle = Math.atan2(dy, dx);

      // Only *requests* a moan here - Game applies a shared cooldown across
      // all zombies so a room full of them doesn't turn into a constant
      // overlapping groan. See Game._updateZombies.
      this._moanTimer -= dt;
      if (this._moanTimer <= 0) {
        this._moanTimer = 6 + Math.random() * 8;
        if (dist <= MOAN_AUDIBLE_RANGE) wantsMoan = true;
      }

      const isEnraged = this.meleeRageThreshold > 0 && this.health <= this.maxHealth * this.meleeRageThreshold;
      if (this.ranged && !isEnraged) {
        if (dist <= this.engagementRange) {
          // Holds position and fires rather than closing to melee.
          this.state = 'attack';
          this.fireTimer -= dt;
          if (this.fireTimer <= 0) {
            this.fireTimer = this.fireRateSeconds;
            wantsToFire = true;
          }
        } else {
          this.state = 'walk';
          this.x += Math.cos(this.angle) * this.speed * dt;
          this.y += Math.sin(this.angle) * this.speed * dt;
        }
      } else {
        const reach = this.attackRange + this.radius + (target.radius || 0);
        if (dist <= reach) {
          this.state = 'attack';
          if (this.attackTimer <= 0) {
            attacked = true;
            this.attackTimer = this.attackCooldownDuration;
          }
        } else {
          this.state = 'walk';
          this.x += Math.cos(this.angle) * this.speed * dt;
          this.y += Math.sin(this.angle) * this.speed * dt;
        }
      }
    } else {
      // No target - wander, same idea as the old post-death placeholder AI.
      this.state = 'walk';
      this._wanderTimer -= dt;
      if (this._wanderTimer <= 0) {
        this.angle += (Math.random() - 0.5) * Math.PI;
        this._wanderTimer = 1.5 + Math.random() * 2.5;
      }
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
    }

    if (this.knockbackVX || this.knockbackVY) {
      this.x += this.knockbackVX * dt;
      this.y += this.knockbackVY * dt;
      this.knockbackVX *= KNOCKBACK_DECAY;
      this.knockbackVY *= KNOCKBACK_DECAY;
      if (Math.abs(this.knockbackVX) < 5) this.knockbackVX = 0;
      if (Math.abs(this.knockbackVY) < 5) this.knockbackVY = 0;
    }

    // Only *requests* a footstep here - same shared-cooldown idea as
    // wantsMoan above, so a crowd of zombies doesn't turn into overlapping
    // audio spam. See Game._updateZombies.
    let wantsFootstep = false;
    if (this.state === 'walk') {
      this._footstepTimer -= dt;
      if (this._footstepTimer <= 0) {
        this._footstepTimer = FOOTSTEP_INTERVAL_BASE * (FOOTSTEP_REFERENCE_SPEED / Math.max(30, this.speed));
        wantsFootstep = true;
      }
    }

    // Blood trail (own bleeding) and footprints (walked through someone
    // else's blood - footContaminated is set externally by
    // Game._updateBloodContamination) request decal spawns the same way
    // wantsFootstep does above; Game._updateZombies acts on them.
    if (this.bleeding) {
      this._bleedTimer -= dt;
      if (this._bleedTimer <= 0) this.bleeding = false;
    }
    let wantsBloodTrail = false;
    if (this.bleeding && this.state === 'walk') {
      this._bloodTrailTimer -= dt;
      if (this._bloodTrailTimer <= 0) {
        this._bloodTrailTimer = BLOOD_TRAIL_INTERVAL;
        wantsBloodTrail = true;
      }
    }

    if (this.footContaminated) {
      this._footContamTimer -= dt;
      if (this._footContamTimer <= 0) {
        this.footContaminated = false;
        this._contaminationFaction = null;
      }
    }
    let wantsFootprint = false;
    if (this.footContaminated && this.state === 'walk') {
      this._footprintTimer -= dt;
      if (this._footprintTimer <= 0) {
        this._footprintTimer = FOOTPRINT_INTERVAL;
        wantsFootprint = true;
      }
    }

    this._advanceFrame(dt);
    return { attacked, damage: this.damage, wantsMoan, wantsToFire, wantsFootstep, wantsBloodTrail, wantsFootprint };
  }

  // Returns the actual damage dealt (after armor) so callers can show it.
  takeDamage(amount) {
    if (!this.alive || this.state === 'death') return 0;
    this.bleeding = true;
    this._bleedTimer = BLEED_DURATION;
    const mitigated = Math.max(1, Math.round(amount - this.armor));
    this.health -= mitigated;
    // The military type is human, not undead - reuses the player's own
    // hurt-grunt/death sounds instead of the zombie gargle/moan set.
    const isHuman = this.typeId === 'military';

    if (this.health <= 0) {
      this.health = 0;
      this.state = 'death';
      this.frameTime = 0;
      this.frameIndex = 0;
      this._lastState = null;
      playSound(isHuman ? 'death' : 'zombie_death');
    } else {
      playSound(isHuman ? 'hurt' : 'zombie_hit');
    }
    return mitigated;
  }

  _advanceFrame(dt) {
    if (this.state !== this._lastState) {
      this.frameTime = 0;
      this.frameIndex = 0;
      this._lastState = this.state;
    }
    this.frameTime += dt;

    const frames = getZombieFrames(this.typeId)[this.state];
    const duration = FRAME_DURATIONS[this.state];
    const rawIndex = Math.floor(this.frameTime / duration);

    if (this.state === 'death') {
      if (rawIndex >= frames.length - 1) {
        this.frameIndex = frames.length - 1;
        this.deathFinished = true;
        this.alive = false;
      } else {
        this.frameIndex = rawIndex;
      }
    } else {
      this.frameIndex = rawIndex % frames.length;
    }
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    if (screen.x < -120 || screen.x > 2040 || screen.y < -120 || screen.y > 1200) return;

    const frames = getZombieFrames(this.typeId)[this.state];
    const raw = frames[this.frameIndex] || frames[0];
    // Procedural types store plain canvases; real-art types store a live
    // AssetLoader handle (`.image` swaps from placeholder to real art once
    // it finishes loading) - support both without either side knowing about
    // the other's representation.
    const frame = raw.image || raw;

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(this.angle - BASE_FACING_ANGLE);

    if (this.usesRealArt && this.state === 'death') {
      const frameCount = frames.length;
      const duration = FRAME_DURATIONS.death * frameCount;
      const progress = Math.min(1, this.frameTime / duration);
      ctx.globalAlpha = 1 - progress * 0.6;
      ctx.rotate(progress * (Math.PI / 2.4));
    }

    ctx.drawImage(frame, -this.drawSize / 2, -this.drawSize / 2, this.drawSize, this.drawSize);
    ctx.restore();
  }
}
