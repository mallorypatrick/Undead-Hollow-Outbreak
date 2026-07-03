import {
  getWeaponConfig,
  WEAPON_CATEGORY,
  WEAPON_IDS,
  DIRECTIONS,
  directionIndexFromAngle,
  WEAPON_SLOT_ORDER,
  WEAPON_SLOT_KEYS,
} from '../config/WeaponConfig.js';
import { AnimationManager } from '../systems/AnimationManager.js';
import { playSound, startLoopSound, stopLoopSound } from '../systems/AudioManager.js';
import { unlockAchievement, ACHIEVEMENTS } from '../platform/Platform.js';

// States that freeze player movement while their animation plays out. Firing
// and reloading deliberately are NOT in this set - you can walk and shoot,
// same as most top-down shooters.
const MOVEMENT_LOCKING_STATES = new Set(['punch', 'attack', 'start', 'hurt', 'death']);

// Seconds between footstep sounds while actively moving - shorter while
// sprinting, matching the faster gait. See _handleMovement.
const FOOTSTEP_INTERVAL_WALK = 0.38;
const FOOTSTEP_INTERVAL_RUN = 0.24;

// Blood trail/tracking system - see ParticleSystem.spawnBloodTrail/
// spawnFootprint and Game._updateBloodContamination (which owns the
// contamination timer/duration; the player only owns its own bleeding state
// and how often it drops a decal while either is active). Bleeding is
// cosmetic only, layered on top of the real health/hurt-sound handling in
// takeDamage - it never deals damage on its own.
const BLEED_DURATION = 4.5;
const BLOOD_TRAIL_INTERVAL = 0.3;
const FOOTPRINT_INTERVAL = 0.22;

// How far in front of the player's center bullets spawn, so they leave from
// the gun's muzzle instead of the body's center. The small side offset
// nudges that point toward the hand holding the gun (a hair to the right
// of dead-center-forward) rather than the body's exact midline.
const MUZZLE_OFFSET = 26;
const MUZZLE_SIDE_OFFSET = 6;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 26;
    this.walkSpeed = 240;
    this.runSpeed = 420;
    this.drawSize = 92;

    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.isDead = false;

    // Cheat flags (IDDQD / IDKFA / cheat panel) - off by default.
    this.godMode = false;
    this.infiniteAmmo = false;

    // --- data-driven weapon/animation state ---
    this.currentWeapon = 'unarmed';
    this.ownedWeapons = { unarmed: {} };
    this.currentAnimation = 'idle';
    this.currentDirection = DIRECTIONS[4]; // 'S', facing the camera by default
    this.directionIndex = 4;
    this.angle = 0;

    this.animator = new AnimationManager();
    this._activeStateKey = null;

    this.actionState = null; // null | punch | attack | start | shoot | reload | hurt | death
    this.chainsawReady = false;
    this.fireCooldownTimer = 0;
    this.meleeCooldownTimer = 0;
    // Tracks whether the chainsaw's continuous cutting-loop sound is
    // currently playing, independent of the swing/damage cooldown - it
    // starts the instant the button goes down and stops the instant it's
    // released, rather than one-shotting per swing (see _handleCombatInput).
    this._chainsawAttackLoopActive = false;
    // Same idea as the chainsaw loop above, but for full-auto firearms
    // (smg/m4) with a sound.shootLoop - continuous fire noise while the
    // trigger is held instead of one-shotting per bullet.
    this._autoFireLoopActive = false;

    this._lastMoveVector = { x: 0, y: 0 };
    this._isSprinting = false;
    // 0 so the very first step plays immediately rather than waiting out a
    // full interval - see _handleMovement.
    this._footstepTimer = 0;

    // Drained every frame by Game to spawn bullets / resolve melee hits.
    // Keeps Player decoupled from Bullet/CollisionSystem specifics.
    this.pendingEvents = [];

    // Pickup notifications are queued the same way.
    this.pendingNotifications = [];

    // Whether the flashlight beam is currently lit - toggled by F/gamepad Y
    // (see _handleFlashlight). Purely a player-state flag; whether it's
    // actually DRAWN (and whether toggling even does anything) is gated by
    // the Master Settings "Flashlight" feature toggle + time of day, which
    // live in AppController's settings, not here - see AppController's
    // night-overlay rendering.
    this.flashlightOn = false;

    // Blood trail/tracking state - see the constants above and
    // Game._updateBloodContamination for how footContaminated gets set.
    this.faction = 'player';
    this.bleeding = false;
    this._bleedTimer = 0;
    this._bloodTrailTimer = 0;
    this.footContaminated = false;
    this._footContamTimer = 0;
    this._footprintTimer = 0;
    this._contaminationFaction = null;
  }

  get currentFrame() {
    return this.animator.frameIndex;
  }

  // --- main update ---

  update(dt, input, camera) {
    this._tickCooldowns(dt);
    this._updateAimAndDirection(input, camera);

    if (!this.isDead) {
      this._handleWeaponSwitch(input);
      this._handleCombatInput(input);
      this._handleFlashlight(input);

      const movementFrozen = this.actionState && MOVEMENT_LOCKING_STATES.has(this.actionState);
      if (!movementFrozen) {
        this._handleMovement(dt, input);
        if (!this.actionState) this._setMovementAnimation();
      } else {
        this._lastMoveVector = { x: 0, y: 0 };
      }
    } else {
      this.currentAnimation = 'death';
    }

    const weaponConfig = getWeaponConfig(this.currentWeapon);
    this._applyAnimationState(dt, weaponConfig);

    if (!this.isDead && this.actionState && this.animator.finished) {
      this._onActionFinished(weaponConfig);
    }
  }

  _tickCooldowns(dt) {
    if (this.fireCooldownTimer > 0) this.fireCooldownTimer = Math.max(0, this.fireCooldownTimer - dt);
    if (this.meleeCooldownTimer > 0) this.meleeCooldownTimer = Math.max(0, this.meleeCooldownTimer - dt);
  }

  _updateAimAndDirection(input, camera) {
    // Right stick takes over only while actively deflected (see
    // Input.getGamepadAimAngle) so mouse aim keeps working seamlessly the
    // rest of the time - the two never fight over which one "owns" aim.
    const gamepadAngle = input.getGamepadAimAngle();
    if (gamepadAngle !== null) {
      this.angle = gamepadAngle;
    } else {
      const mouseWorld = camera.screenToWorld(input.mouseScreen.x, input.mouseScreen.y);
      this.angle = Math.atan2(mouseWorld.y - this.y, mouseWorld.x - this.x);
    }
    this.directionIndex = directionIndexFromAngle(this.angle);
    this.currentDirection = DIRECTIONS[this.directionIndex];
  }

  _handleMovement(dt, input) {
    const move = input.getMoveVector();
    const sprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight') || input.isGamepadSprintHeld();
    const moving = move.x !== 0 || move.y !== 0;
    const speed = moving && sprinting ? this.runSpeed : this.walkSpeed;

    this.x += move.x * speed * dt;
    this.y += move.y * speed * dt;

    this._lastMoveVector = move;
    this._isSprinting = sprinting;

    if (moving) {
      this._footstepTimer -= dt;
      if (this._footstepTimer <= 0) {
        playSound('footstep_walk');
        this._footstepTimer = sprinting ? FOOTSTEP_INTERVAL_RUN : FOOTSTEP_INTERVAL_WALK;
      }
    } else {
      this._footstepTimer = 0; // next step plays immediately once moving resumes
    }

    this._handleBleeding(dt, moving);
  }

  // Blood trail (own bleeding) and footprint (walked through someone else's
  // blood - footContaminated is set externally by
  // Game._updateBloodContamination) decal requests, queued as pending events
  // the same way shoot/melee/casing already are since Player has no direct
  // reference to ParticleSystem. See takeDamage for where bleeding starts.
  _handleBleeding(dt, moving) {
    if (this.bleeding) {
      this._bleedTimer -= dt;
      if (this._bleedTimer <= 0) this.bleeding = false;
    }
    if (this.bleeding && moving) {
      this._bloodTrailTimer -= dt;
      if (this._bloodTrailTimer <= 0) {
        this._bloodTrailTimer = BLOOD_TRAIL_INTERVAL;
        this.pendingEvents.push({ type: 'bloodTrail', x: this.x, y: this.y, faction: this.faction });
      }
    }

    if (this.footContaminated) {
      this._footContamTimer -= dt;
      if (this._footContamTimer <= 0) {
        this.footContaminated = false;
        this._contaminationFaction = null;
      }
    }
    if (this.footContaminated && moving) {
      this._footprintTimer -= dt;
      if (this._footprintTimer <= 0) {
        this._footprintTimer = FOOTPRINT_INTERVAL;
        this.pendingEvents.push({ type: 'footprint', x: this.x, y: this.y, faction: this._contaminationFaction, angle: this.angle });
      }
    }
  }

  _setMovementAnimation() {
    const moving = this._lastMoveVector.x !== 0 || this._lastMoveVector.y !== 0;
    this.currentAnimation = moving ? (this._isSprinting ? 'run' : 'walk') : 'idle';
  }

  // --- flashlight ---

  _handleFlashlight(input) {
    if (input.wasJustPressed('KeyF') || input.wasJustPressed('GamepadFlashlight')) {
      this.flashlightOn = !this.flashlightOn;
      playSound('flashlight_toggle');
    }
  }

  // --- weapon switching ---

  _handleWeaponSwitch(input) {
    for (let i = 0; i < WEAPON_SLOT_KEYS.length; i++) {
      if (input.wasJustPressed(WEAPON_SLOT_KEYS[i]) && this.ownedWeapons[WEAPON_SLOT_ORDER[i]]) {
        this.equipWeapon(WEAPON_SLOT_ORDER[i]);
      }
    }

    // Bumpers cycle through owned weapons in slot order - there's no
    // "digit key" equivalent for a controller, so this is its own path
    // rather than reusing the loop above.
    if (input.wasJustPressed('GamepadWeaponNext')) this._cycleWeapon(1);
    else if (input.wasJustPressed('GamepadWeaponPrev')) this._cycleWeapon(-1);
  }

  // Steps to the next/previous OWNED weapon in WEAPON_SLOT_ORDER, wrapping
  // around - skips any slot the player doesn't have yet.
  _cycleWeapon(direction) {
    const currentIndex = WEAPON_SLOT_ORDER.indexOf(this.currentWeapon);
    const count = WEAPON_SLOT_ORDER.length;
    for (let step = 1; step <= count; step++) {
      const nextIndex = (currentIndex + direction * step + count) % count;
      const nextId = WEAPON_SLOT_ORDER[nextIndex];
      if (this.ownedWeapons[nextId]) {
        this.equipWeapon(nextId);
        return;
      }
    }
  }

  equipWeapon(weaponId) {
    if (weaponId === this.currentWeapon || !this.ownedWeapons[weaponId]) return;

    const prevConfig = getWeaponConfig(this.currentWeapon);
    if (prevConfig.category === WEAPON_CATEGORY.MELEE_POWERED) {
      stopLoopSound(prevConfig.sound.loop);
      if (this._chainsawAttackLoopActive) {
        stopLoopSound(prevConfig.sound.attackLoop);
        this._chainsawAttackLoopActive = false;
      }
    }
    if (this._autoFireLoopActive) {
      stopLoopSound(prevConfig.sound.shootLoop);
      this._autoFireLoopActive = false;
    }
    // Holstering the outgoing weapon, if it has a holster sound - chainsaw's
    // own 'start' cue below already covers that side for itself.
    if (prevConfig.sound.holster) playSound(prevConfig.sound.holster);

    this.currentWeapon = weaponId;
    this.actionState = null;
    this.chainsawReady = false;
    this.fireCooldownTimer = 0;
    this.meleeCooldownTimer = 0;

    const config = getWeaponConfig(weaponId);
    if (config.category === WEAPON_CATEGORY.MELEE_POWERED) {
      playSound(config.sound.start);
      this._startAction('start');
    } else {
      this.currentAnimation = 'idle';
      if (config.sound.draw) playSound(config.sound.draw);
    }
  }

  // Called by WeaponPickup when the player walks over a weapon. Returns
  // enough info for the caller to show a notification.
  pickupWeapon(weaponId) {
    const config = getWeaponConfig(weaponId);
    const alreadyOwned = !!this.ownedWeapons[weaponId];

    if (!alreadyOwned) {
      this.ownedWeapons[weaponId] = config.combat.canFire
        ? {
          magazine: config.combat.magazineSize,
          reserve: Math.max(0, config.combat.startingAmmo - config.combat.magazineSize),
        }
        : {};
      if (Object.keys(this.ownedWeapons).length === WEAPON_IDS.length) {
        unlockAchievement(ACHIEVEMENTS.ARSENAL_COMPLETE);
      }
    } else if (config.combat.canFire) {
      this.ownedWeapons[weaponId].reserve += config.combat.startingAmmo;
    }

    if (this.currentWeapon === 'unarmed' && weaponId !== 'unarmed') {
      this.equipWeapon(weaponId);
    }

    const message = alreadyOwned
      ? `Picked up ${config.displayName} ammo`
      : `Picked up ${config.displayName}`;
    this.pendingNotifications.push(message);
    // Each weapon family plays its own holster-style sound on pickup
    // (see WeaponConfig sound.holster); anything without one (unarmed,
    // chainsaw) falls back to the generic pickup chime.
    playSound(config.sound.holster || 'pickup');

    return { weaponId, displayName: config.displayName, alreadyOwned };
  }

  notify(message) {
    this.pendingNotifications.push(message);
  }

  // --- supply pickup effects (see SupplyConfig.js) ---

  heal(amount) {
    if (this.isDead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Tops up reserve ammo for every owned firearm. Returns the total rounds
  // actually gained (0 if the player owns no firearms yet).
  refillAmmo(amountPerWeapon) {
    let total = 0;
    for (const [weaponId, ammo] of Object.entries(this.ownedWeapons)) {
      const config = getWeaponConfig(weaponId);
      if (!config.combat.canFire) continue;
      const cap = config.combat.startingAmmo * 2; // soft cap so ammo boxes can't stockpile forever
      const before = ammo.reserve;
      ammo.reserve = Math.min(cap, ammo.reserve + amountPerWeapon);
      total += ammo.reserve - before;
    }
    return total;
  }

  // Grants a weapon the player doesn't already own; if they own everything,
  // tops up a random owned firearm's ammo instead. Returns a notification
  // message, or null when pickupWeapon() already queued its own.
  grantRandomWeapon() {
    const notOwned = WEAPON_IDS.filter((id) => id !== 'unarmed' && !this.ownedWeapons[id]);
    if (notOwned.length > 0) {
      const pick = notOwned[Math.floor(Math.random() * notOwned.length)];
      this.pickupWeapon(pick);
      return null;
    }

    const firearms = Object.keys(this.ownedWeapons).filter((id) => getWeaponConfig(id).combat.canFire);
    if (firearms.length > 0) {
      const pick = firearms[Math.floor(Math.random() * firearms.length)];
      const config = getWeaponConfig(pick);
      this.ownedWeapons[pick].reserve += config.combat.startingAmmo;
      return `Weapon Crate: extra ${config.displayName} ammo!`;
    }

    return 'Weapon Crate was empty.';
  }

  // --- combat ---

  _handleCombatInput(input) {
    const config = getWeaponConfig(this.currentWeapon);

    if (config.category === WEAPON_CATEGORY.UNARMED) {
      if (!this.actionState && input.mouseDown && this.meleeCooldownTimer <= 0) {
        this._triggerMelee(config);
      }
      return;
    }

    if (config.category === WEAPON_CATEGORY.MELEE_POWERED) {
      if (!this.chainsawReady) return; // still starting up, ignore attack input

      // The cutting-loop sound tracks the mouse button directly (starts the
      // instant it's pressed, stops the instant it's released) rather than
      // the swing/damage cooldown below - otherwise it reads as a one-shot
      // "chomp" per swing instead of a continuous chainsaw noise.
      if (input.mouseDown && !this._chainsawAttackLoopActive) {
        startLoopSound(config.sound.attackLoop);
        this._chainsawAttackLoopActive = true;
      } else if (!input.mouseDown && this._chainsawAttackLoopActive) {
        stopLoopSound(config.sound.attackLoop);
        this._chainsawAttackLoopActive = false;
      }

      const canAttackNow = !this.actionState || this.actionState === 'attack';
      if (canAttackNow && input.mouseDown && this.meleeCooldownTimer <= 0) {
        this._triggerMelee(config);
      }
      return;
    }

    if (config.category === WEAPON_CATEGORY.FIREARM) {
      if (config.sound.shootLoop) {
        const ammo = this.ownedWeapons[this.currentWeapon];
        const canLoop = input.mouseDown && this.actionState !== 'reload' && (ammo.magazine > 0 || this.infiniteAmmo);
        if (canLoop && !this._autoFireLoopActive) {
          startLoopSound(config.sound.shootLoop);
          this._autoFireLoopActive = true;
        } else if (!canLoop && this._autoFireLoopActive) {
          stopLoopSound(config.sound.shootLoop);
          this._autoFireLoopActive = false;
        }
      }

      if (this.actionState !== 'reload') {
        const wantsFire = config.combat.automatic ? input.mouseDown : input.wasMouseJustPressed();
        if (wantsFire && this.fireCooldownTimer <= 0) {
          const ammo = this.ownedWeapons[this.currentWeapon];
          if (ammo.magazine > 0 || this.infiniteAmmo) {
            this._fireWeapon(config);
          } else if (input.wasMouseJustPressed()) {
            playSound('reload_generic');
          }
        }
      }
      if ((input.wasJustPressed('KeyR') || input.wasJustPressed('GamepadReload')) && this.actionState !== 'reload') {
        this._tryReload(config);
      }
    }
  }

  _triggerMelee(config) {
    const melee = config.combat.melee;
    this.meleeCooldownTimer = melee.cooldown;
    // The chainsaw's attack sound is a continuous loop tied to the mouse
    // button (see _handleCombatInput), not a one-shot per swing like fists.
    if (config.category !== WEAPON_CATEGORY.MELEE_POWERED) playSound(config.sound.attack);
    this._startAction(melee.animation);

    this.pendingEvents.push({
      type: 'melee',
      x: this.x,
      y: this.y,
      angle: this.angle,
      damage: melee.damage,
      range: melee.range,
      weaponId: config.id,
    });
  }

  _fireWeapon(config) {
    const ammo = this.ownedWeapons[this.currentWeapon];
    if (!this.infiniteAmmo) ammo.magazine -= 1;
    this.fireCooldownTimer = config.combat.fireRate;
    // Full-auto weapons with a shootLoop get their audio from that
    // continuous loop instead (see _handleCombatInput) - avoids stacking a
    // one-shot clip on top of it every single bullet.
    if (!config.sound.shootLoop) playSound(config.sound.shoot);
    this._startAction('shoot');

    // Spawn from the muzzle (in front of the character, along the aim
    // direction, nudged slightly toward the gun hand) rather than the
    // body's exact center, so shots visually leave from the gun tip and
    // travel exactly where the crosshair is aimed.
    const sideAngle = this.angle + Math.PI / 2;
    const muzzleX = this.x + Math.cos(this.angle) * MUZZLE_OFFSET + Math.cos(sideAngle) * MUZZLE_SIDE_OFFSET;
    const muzzleY = this.y + Math.sin(this.angle) * MUZZLE_OFFSET + Math.sin(sideAngle) * MUZZLE_SIDE_OFFSET;

    // One event per trigger pull (not per pellet) so shotgun's 8 pellets
    // don't multiply screen shake/kick/muzzle-flash eightfold - see
    // Game._processPlayerEvents.
    this.pendingEvents.push({ type: 'weaponFired', angle: this.angle, weaponId: config.id, x: muzzleX, y: muzzleY });

    const pellets = config.combat.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spread = (Math.random() - 0.5) * 2 * config.combat.spread;
      this.pendingEvents.push({
        type: 'shoot',
        x: muzzleX,
        y: muzzleY,
        angle: this.angle + spread,
        damage: config.combat.damage,
        headshotMultiplier: config.combat.headshotMultiplier,
        speed: config.combat.projectileSpeed,
        range: config.combat.range,
        weaponId: config.id,
      });
    }

    if (config.combat.ejectsCasing) {
      // Ejects from the side/rear of the gun, roughly opposite the muzzle
      // side-offset, with a little randomness so they don't all fly the
      // same way.
      const ejectAngle = this.angle - Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      this.pendingEvents.push({ type: 'casing', x: muzzleX, y: muzzleY, angle: ejectAngle });
    }
  }

  _tryReload(config) {
    const ammo = this.ownedWeapons[this.currentWeapon];
    if (ammo.magazine >= config.combat.magazineSize || ammo.reserve <= 0) return;
    playSound(config.sound.reload);
    // A shared cocking/pull layer on top of every weapon's own reload clip -
    // the bow's own reload IS this sound (see WeaponConfig), so it doesn't
    // need it played a second time on top of itself.
    if (config.id !== 'bow') playSound('xbow_pull');
    this._startAction('reload');
  }

  _startAction(stateKey) {
    this.actionState = stateKey;
    this.currentAnimation = stateKey;
    this._activeStateKey = stateKey;
    this.animator.reset();
  }

  _onActionFinished(weaponConfig) {
    const finished = this.actionState;
    this.actionState = null;

    if (finished === 'start') {
      this.chainsawReady = true;
      startLoopSound(weaponConfig.sound.loop);
    } else if (finished === 'reload') {
      const ammo = this.ownedWeapons[this.currentWeapon];
      const needed = weaponConfig.combat.magazineSize - ammo.magazine;
      const transfer = Math.min(needed, ammo.reserve);
      ammo.magazine += transfer;
      ammo.reserve -= transfer;
    }
  }

  // --- damage / death ---

  takeDamage(amount) {
    if (this.isDead || this.godMode) return;
    this.bleeding = true;
    this._bleedTimer = BLEED_DURATION;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this._die();
    } else {
      playSound('hurt');
      this._startAction('hurt');
    }
  }

  _die() {
    this.isDead = true;
    this.actionState = 'death';
    playSound('death');
    this._startAction('death');

    const config = getWeaponConfig(this.currentWeapon);
    if (config.category === WEAPON_CATEGORY.MELEE_POWERED) {
      stopLoopSound(config.sound.loop);
      if (this._chainsawAttackLoopActive) {
        stopLoopSound(config.sound.attackLoop);
        this._chainsawAttackLoopActive = false;
      }
    }
    if (this._autoFireLoopActive) {
      stopLoopSound(config.sound.shootLoop);
      this._autoFireLoopActive = false;
    }
  }

  isDeathAnimationFinished() {
    return this.isDead && this.animator.finished;
  }

  // --- animation plumbing ---

  _applyAnimationState(dt, weaponConfig) {
    const stateKey = AnimationManager.resolveStateKey(weaponConfig, this.currentAnimation);
    if (stateKey !== this._activeStateKey) {
      this._activeStateKey = stateKey;
      this.animator.reset();
    }
    this.currentAnimation = stateKey;
    this.animator.update(dt, weaponConfig.animations[stateKey]);
  }

  drainEvents() {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  drainNotifications() {
    const notifications = this.pendingNotifications;
    this.pendingNotifications = [];
    return notifications;
  }

  getAmmoDisplay() {
    const config = getWeaponConfig(this.currentWeapon);
    if (!config.combat.canFire) return null;
    const ammo = this.ownedWeapons[this.currentWeapon];
    return { magazine: ammo.magazine, reserve: ammo.reserve, reloading: this.actionState === 'reload' };
  }

  draw(ctx, camera) {
    const weaponConfig = getWeaponConfig(this.currentWeapon);
    this.animator.draw(ctx, camera, this, weaponConfig, this.currentAnimation);
  }
}
