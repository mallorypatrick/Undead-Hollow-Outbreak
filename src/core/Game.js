import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from './Renderer.js';
import { Camera } from './Camera.js';
import { Player } from '../entities/Player.js';
import { Wall } from '../entities/Wall.js';
import { WeaponPickup } from '../entities/WeaponPickup.js';
import { SupplyPickup } from '../entities/SupplyPickup.js';
import { Bullet } from '../entities/Bullet.js';
import { Zombie } from '../entities/Zombie.js';
import { SUPPLY_IDS } from '../config/SupplyConfig.js';
import { getWeaponConfig } from '../config/WeaponConfig.js';
import { getLevelConfig } from '../config/LevelConfig.js';
import { pickZombieTypeForBiome } from '../config/BiomeConfig.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { UISystem, RESTART_BUTTON_RECT, BOSS_CHOICE_BUTTONS } from '../systems/UISystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { WaveController } from '../systems/WaveController.js';
import { SPRITE_SIZE } from '../assets/ProceduralSprites.js';
import { EnvironmentSprites } from '../assets/EnvironmentSprites.js';
import { tintCanvasSync, ROAD_TINTS } from '../assets/BiomeTint.js';
import { getStaticImage } from '../core/AssetLoader.js';
import { buildEnvironment } from '../systems/MapBuilder.js';
import { getTilesetTile } from '../assets/TilesetLoader.js';
import { drawDecoration } from '../systems/DecorationRenderer.js';
import {
  playSound, updateAmbience,
  startWaterProximityAmbience, stopWaterProximityAmbience,
  startUnderwaterAmbience, stopUnderwaterAmbience,
} from '../systems/AudioManager.js';
import { unlockAchievement, ACHIEVEMENTS } from '../platform/Platform.js';

const WORLD_WIDTH = 7680;
const WORLD_HEIGHT = 4320;
const WALL_THICKNESS = 64;

// Real Happy Harvest ground tiles, one per getGroundZone() zone, upgrading
// from their procedural placeholder once each loads - same
// "placeholder swaps for real art" pattern as everything else. The cache
// key passed into tintCanvasSync (see _drawGround) switches once each
// finishes loading, so the tinted result gets recomputed exactly once
// instead of staying stuck on a tinted placeholder forever.
const REAL_GROUND_HANDLES = {
  field: getStaticImage('ground:grass_field', 'assets/environment/ground/grass_field.png', EnvironmentSprites.fieldTile),
  road: getStaticImage('ground:dirt_field', 'assets/environment/ground/dirt_field.png', EnvironmentSprites.roadTile),
  cemetery: getStaticImage('ground:soil_field', 'assets/environment/ground/soil_field.png', EnvironmentSprites.cemeteryTile),
};

const ZOMBIE_SPAWN_MIN_DIST = 900;
const ZOMBIE_SPAWN_MAX_DIST = 1500;

// Survive-If-You-Can has no LevelConfig entry to read wave-difficulty knobs
// from (it never ends) - these are its fixed base/growth constants instead.
const SURVIVE_WAVE_BASE = 6;
const SURVIVE_WAVE_GROWTH = 1.5;
const SURVIVE_BIOME_ID = 'farm';

const CONTACT_SHAKE_MAGNITUDE = 10;
const CONTACT_SHAKE_DURATION = 0.2;

// How far in front of a ranged zombie's (military's) center its bullets and
// muzzle flash spawn from, so gunfire reads as coming from the gun instead
// of the body - same idea as Player's MUZZLE_OFFSET.
const MILITARY_MUZZLE_OFFSET = 24;

// From this campaign level onward, unprovoked military stop being hostile
// to the player (see _isMilitaryTruceActive/_findHostileTarget) - the
// story beat where the army realizes he's not the enemy.
const MILITARY_TRUCE_LEVEL = 16;

// Game-feel "juice": a brief freeze-frame on any hit (dealt or taken), and
// per-shot camera shake/kick read from each firearm's WeaponConfig.juice
// (see _processPlayerEvents' 'weaponFired' handling and Camera.shake/kick).
const HITSTOP_FRAMES = 3;
const WEAPON_SHAKE_DURATION = 0.12;
const WEAPON_KICK_DURATION = 0.1;
const CHAINSAW_SHAKE_DURATION = 0.1; // re-applied every frame while revving/cutting, see _updateChainsawRumble

// Game no longer owns a requestAnimationFrame loop or creates its own
// renderer/input - AppController owns those (shared with the menu system)
// and drives Game purely through update(dt)/render().
export class Game {
  constructor(renderer, input, runConfig = { runMode: 'campaign', levelId: 1 }) {
    this.renderer = renderer;
    this.input = input;
    this.ui = new UISystem();
    this.particles = new ParticleSystem();

    this._fps = 0;
    this._fpsAccumTime = 0;
    this._fpsAccumFrames = 0;
    this._hitstopFrames = 0;

    this.runMode = runConfig.runMode; // 'campaign' | 'survive'
    this.currentLevel = runConfig.levelId || 1;
    this.bestWaveReached = 0;
    // Set by AppController's `playing`-case check each frame: true once the
    // player clicks a Game-internal overlay button that needs to bounce
    // back out to a real AppController state (main menu / an ending).
    this.wantsMainMenu = false;
    this.pendingEnding = null; // null | 'cure' | 'succumb'

    this._setupNewRun();
  }

  // Reads the current run's mode/level into the concrete parameters
  // WaveController and buildEnvironment need - the one place campaign vs.
  // survive actually diverge.
  _resolveRunParams() {
    if (this.runMode === 'survive') {
      return {
        biomeId: SURVIVE_BIOME_ID,
        waveCount: Infinity,
        zombiesPerWaveBase: SURVIVE_WAVE_BASE,
        zombiesPerWaveGrowth: SURVIVE_WAVE_GROWTH,
        maxConcurrent: 0, // unused in survive mode - WaveController computes its own cap
        isBossLevel: false,
        bossType: null,
      };
    }
    const levelConfig = getLevelConfig(this.currentLevel);
    return {
      biomeId: levelConfig.biomeId,
      waveCount: levelConfig.waveCount,
      zombiesPerWaveBase: levelConfig.zombiesPerWaveBase,
      zombiesPerWaveGrowth: levelConfig.zombiesPerWaveGrowth,
      maxConcurrent: levelConfig.maxConcurrent,
      isBossLevel: !!levelConfig.isBossLevel,
      bossType: levelConfig.bossType || null,
    };
  }

  // Everything that needs to reset on restart/level-advance lives here,
  // separate from the one-time setup (renderer/input/ui/particles) in the
  // constructor. `carryPlayerState` is true when advancing to the next
  // campaign level (keep health/weapons) and false on death (full reset).
  _setupNewRun(inheritedLoot = null, carryPlayerState = false) {
    const prevPlayer = carryPlayerState ? this.player : null;
    const runParams = this._resolveRunParams();
    this.currentBiomeId = runParams.biomeId;

    this.camera = new Camera(WORLD_WIDTH, WORLD_HEIGHT);
    this.player = new Player(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    if (prevPlayer) {
      this.player.ownedWeapons = prevPlayer.ownedWeapons;
      this.player.currentWeapon = prevPlayer.currentWeapon;
      this.player.health = prevPlayer.health;
      this.player.maxHealth = prevPlayer.maxHealth;
    }

    if (this.runMode === 'campaign') {
      const objectiveText = runParams.isBossLevel
        ? 'OBJECTIVE: NEUTRALIZE THE HOSTILE TARGET'
        : 'OBJECTIVE: HOSTILE BREACH DETECTED WITHIN THE PERIMETER - ELIMINATE ALL HOSTILES';
      this.ui.showLevelLabel(`Level ${this.currentLevel} - ${getLevelConfig(this.currentLevel).displayName}`, objectiveText);
    }

    const boundaryWalls = this._buildBoundaryWalls();
    const env = buildEnvironment(WORLD_WIDTH, WORLD_HEIGHT, boundaryWalls, this.currentBiomeId, this.currentLevel);
    this.walls = boundaryWalls.concat(env.walls); // rendered as brick walls
    // Cars, trees, gravestones and the exit-gate tombstones are all solid
    // but stay purely-visual decorations (already drawn as sprites) -
    // collision checks use this combined set, rendering doesn't.
    this.colliders = this.walls.concat(env.carColliders, env.staticColliders);
    this.decorations = env.decorations;
    this.getGroundZone = env.getGroundZone;
    this.exitGate = env.exitGate;
    this.waterZones = env.waterZones;

    this.pickups = this._scatterWeaponPickups();
    this.supplies = this._scatterSupplyPickups();
    this.bullets = [];
    this.zombies = [];

    // The previous character rises again, still carrying whatever they
    // died with - killing them gives you their gear.
    if (inheritedLoot && inheritedLoot.length) {
      const pos = this._findRandomOpenPosition();
      if (pos) {
        const boss = new Zombie(pos.x, pos.y, 'player_boss');
        boss.lootWeapons = inheritedLoot;
        this.zombies.push(boss);
      }
    }

    this.waveController = null;
    this.pendingLevelComplete = false;
    this.pendingSurviveGameOver = false;
    this.pendingBossChoice = false;
    if (runParams.isBossLevel) {
      this._spawnScriptedBoss(runParams.bossType);
    } else {
      this.waveController = new WaveController({
        mode: this.runMode,
        biomeId: runParams.biomeId,
        waveCount: runParams.waveCount,
        zombiesPerWaveBase: runParams.zombiesPerWaveBase,
        zombiesPerWaveGrowth: runParams.zombiesPerWaveGrowth,
        maxConcurrent: runParams.maxConcurrent,
        onSpawnZombie: (biomeId) => this._spawnWaveZombie(biomeId),
        onWaveComplete: (waveNumber) => {
          if (this.runMode === 'survive') {
            this.bestWaveReached = Math.max(this.bestWaveReached, waveNumber);
            if (waveNumber >= 10) unlockAchievement(ACHIEVEMENTS.SURVIVE_10_WAVES);
          }
        },
        onLevelComplete: () => {
          this.pendingLevelComplete = true;
          this.ui.pushNotification('Level complete! Head to the tombstones to continue.');
        },
      });
    }

    this.particles.particles.length = 0;
    this.particles.decals.length = 0;

    // A fresh level means the previous one's water zone (if any) no longer
    // applies - stop any ambience loop it left running rather than let it
    // bleed into the new level until proximity happens to re-evaluate it.
    stopWaterProximityAmbience();
    stopUnderwaterAmbience();

    this._survivalTime = 0;
    this._deathHandled = false;
    this._globalMoanCooldown = 2.0; // small initial delay so it's not instant on spawn
    this._globalFootstepCooldown = 0;
  }

  _spawnWaveZombie(biomeId) {
    const spawnPos = this._findZombieSpawnPosition();
    if (!spawnPos) return;
    const zombie = new Zombie(spawnPos.x, spawnPos.y, pickZombieTypeForBiome(biomeId));
    zombie.fromWave = true; // tags it so _updateZombies only reports wave-spawned deaths back to WaveController
    this.zombies.push(zombie);
  }

  // Scripted, non-random boss spawn (level 39's The Fallen) - structurally
  // the same manual push used for the player_boss/"Reanimated Survivor"
  // mechanic above, just with no loot to carry.
  _spawnScriptedBoss(typeId) {
    const x = WORLD_WIDTH / 2;
    const y = WORLD_HEIGHT / 2;
    this.zombies.push(new Zombie(x, y, typeId));
  }

  // Advances to the next campaign level, keeping the player's current
  // health/weapons (unlike restart(), which is a full reset on death).
  _advanceLevel() {
    if (this.currentLevel === 1) unlockAchievement(ACHIEVEMENTS.LEVEL_1_COMPLETE);
    this.currentLevel++;
    this._setupNewRun(null, true);
  }

  restart() {
    const weaponIds = Object.keys(this.player.ownedWeapons).filter((id) => id !== 'unarmed');
    this._setupNewRun(weaponIds.length ? weaponIds : null);
  }

  _buildBoundaryWalls() {
    return [
      new Wall(0, 0, WORLD_WIDTH, WALL_THICKNESS), // top
      new Wall(0, WORLD_HEIGHT - WALL_THICKNESS, WORLD_WIDTH, WALL_THICKNESS), // bottom
      new Wall(0, 0, WALL_THICKNESS, WORLD_HEIGHT), // left
      new Wall(WORLD_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, WORLD_HEIGHT), // right
    ];
  }

  // Fractions of the world size, so the scatter stays sensible regardless
  // of how big WORLD_WIDTH/WORLD_HEIGHT are.
  _scatterWeaponPickups() {
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;
    return [
      new WeaponPickup(w * 0.28, h * 0.72, 'chainsaw'),
      new WeaponPickup(w * 0.85, h * 0.15, 'handgun'),
      new WeaponPickup(w * 0.15, h * 0.15, 'rifle'),
      new WeaponPickup(w * 0.88, h * 0.82, 'smg'),
      new WeaponPickup(w * 0.55, h * 0.85, 'shotgun'),
      new WeaponPickup(w * 0.4, h * 0.1, 'revolver'),
      new WeaponPickup(w * 0.72, h * 0.42, 'm4'),
      new WeaponPickup(w * 0.2, h * 0.55, 'bow'),
      new WeaponPickup(w * 0.62, h * 0.62, 'shotgun_homestead'),
    ];
  }

  // Supplies spawn at random valid (non-wall) positions across the map,
  // a handful of each type, and never despawn on their own.
  _scatterSupplyPickups() {
    const supplies = [];
    const perType = 4;
    for (const supplyId of SUPPLY_IDS) {
      for (let i = 0; i < perType; i++) {
        const pos = this._findRandomOpenPosition();
        if (pos) supplies.push(new SupplyPickup(pos.x, pos.y, supplyId));
      }
    }
    return supplies;
  }

  // Once the level's waves are cleared, walking between the two exit-gate
  // tombstones (see MapBuilder.placeExitGate) advances to the next level -
  // no button to click, just reach the gate. No-op on boss levels (no
  // waveController, pendingLevelComplete never becomes true there).
  _updateExitGate() {
    if (!this.pendingLevelComplete || !this.exitGate) return;
    const dx = this.player.x - this.exitGate.x;
    const dy = this.player.y - this.exitGate.y;
    if (dx * dx + dy * dy <= this.exitGate.triggerRadius ** 2) {
      this._advanceLevel();
    }
  }

  _findRandomOpenPosition() {
    const margin = WALL_THICKNESS + 60;
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = margin + Math.random() * (WORLD_WIDTH - margin * 2);
      const y = margin + Math.random() * (WORLD_HEIGHT - margin * 2);
      if (!CollisionSystem.circleIntersectsWalls(x, y, 30, this.colliders)) return { x, y };
    }
    return null;
  }

  _updateFps(dt) {
    this._fpsAccumTime += dt;
    this._fpsAccumFrames++;
    if (this._fpsAccumTime >= 0.5) {
      this._fps = Math.round(this._fpsAccumFrames / this._fpsAccumTime);
      this._fpsAccumTime = 0;
      this._fpsAccumFrames = 0;
    }
  }

  update(dt, isNight = false) {
    this._updateFps(dt);
    this._ambientAnimTime = (this._ambientAnimTime || 0) + dt;
    updateAmbience(dt, isNight);

    // Hitstop: a brief total freeze of gameplay motion on any hit (dealt or
    // taken) for extra impact. Input is still drained every frame so
    // nothing gets stuck "just pressed" across the freeze.
    if (this._hitstopFrames > 0) {
      this._hitstopFrames--;
      this.input.endFrame();
      return;
    }

    this.ui.update(dt);
    this.particles.update(dt);

    // Player.update() internally gates off movement/combat handling once
    // dead, but still needs to run every frame to advance the death
    // animation to completion.
    this.player.update(dt, this.input, this.camera);
    this._handleOverlayClicks();
    this._updateChainsawRumble();

    if (!this.player.isDead) {
      this._survivalTime += dt;
      CollisionSystem.resolveCircleVsWalls(this.player, this.colliders);
      CollisionSystem.clampToWorld(this.player, WORLD_WIDTH, WORLD_HEIGHT);
      this.camera.follow(this.player);

      this._updatePickups(dt);
      this._processPlayerEvents();
      if (this.waveController) this.waveController.update(dt, this.zombies.length);
      this._updateExitGate();
    } else {
      this._handleDeathTransition();
      this._handleRestartClick();
    }

    this.camera.update(dt);
    this._updateBullets(dt);
    this._updateZombies(dt);
    this._updateWaterEffects();
    this._updateBloodContamination();

    this.input.endFrame();
  }

  _updatePickups(dt) {
    for (const pickup of this.pickups) {
      pickup.update(dt);
      pickup.tryCollect(this.player);
    }
    this.pickups = this.pickups.filter((p) => !p.collected);

    for (const supply of this.supplies) {
      supply.update(dt);
      supply.tryCollect(this.player);
    }
    this.supplies = this.supplies.filter((s) => !s.collected);

    for (const message of this.player.drainNotifications()) {
      this.ui.pushNotification(message);
    }
  }

  _processPlayerEvents() {
    for (const event of this.player.drainEvents()) {
      if (event.type === 'shoot') {
        this.bullets.push(new Bullet(event));
      } else if (event.type === 'melee') {
        this._resolveMeleeHit(event);
      } else if (event.type === 'casing') {
        this.particles.spawnCasing(event.x, event.y, event.angle);
        playSound('bullet_casing');
      } else if (event.type === 'weaponFired') {
        const juice = getWeaponConfig(event.weaponId).juice;
        if (juice) {
          this.camera.shake(juice.shakeMagnitude, WEAPON_SHAKE_DURATION);
          if (juice.kickMagnitude) this.camera.kick(event.angle, juice.kickMagnitude, WEAPON_KICK_DURATION);
        }
        this.particles.spawnMuzzleFlash(event.x, event.y, event.angle);
      } else if (event.type === 'bloodTrail') {
        this.particles.spawnBloodTrail(event.x, event.y, event.faction);
      } else if (event.type === 'footprint') {
        this.particles.spawnFootprint(event.x, event.y, event.faction, event.angle);
      } else if (event.type === 'ripple') {
        this.particles.spawnRipple(event.x, event.y);
      }
    }
  }

  _resolveMeleeHit(event) {
    for (const zombie of this.zombies) {
      if (zombie.state === 'death') continue;
      const dx = zombie.x - event.x;
      const dy = zombie.y - event.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > event.range + zombie.radius) continue;

      const angleToZombie = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angleToZombie - event.angle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      if (angleDiff < Math.PI / 3) {
        this._damageZombie(zombie, event.damage, true);
      }
    }
  }

  // `fromPlayer` is true only when the player themself dealt this damage
  // (melee hit or a non-hostile bullet) - not when one zombie/soldier hits
  // another. Breaks the levels 16-39 military truce for this specific
  // soldier - see _findHostileTarget.
  _damageZombie(zombie, amount, fromPlayer = false) {
    if (fromPlayer && zombie.typeId === 'military') zombie.provoked = true;

    // The Fallen (level 39 story boss) doesn't just die on lethal damage -
    // her health floors at 1 and the fight pauses for the cure/succumb
    // choice prompt instead of the normal death animation/loot flow.
    if (zombie.typeId === 'the_fallen' && !this.pendingBossChoice) {
      const mitigated = Math.max(1, Math.round(amount - zombie.armor));
      if (zombie.health - mitigated <= 0) {
        zombie.health = 1;
        this.pendingBossChoice = true;
        this.particles.spawnBloodBurst(zombie.x, zombie.y, 8);
        return;
      }
    }

    const wasAlive = zombie.state !== 'death';
    zombie.takeDamage(amount);
    this._hitstopFrames = Math.max(this._hitstopFrames, HITSTOP_FRAMES);
    this.particles.spawnBloodBurst(zombie.x, zombie.y, 8);
    if (wasAlive && zombie.state === 'death') {
      this.particles.spawnBloodBurst(zombie.x, zombie.y, 18);
      this.particles.spawnDecal(zombie.x, zombie.y);
      unlockAchievement(ACHIEVEMENTS.FIRST_BLOOD);
    }
  }

  _updateBullets(dt) {
    for (const bullet of this.bullets) {
      bullet.update(dt);
      if (!bullet.alive) continue;

      // Fast bullets can move further in one frame than a thin collider
      // (e.g. a car) is wide, which would let a single endpoint check miss
      // it entirely. Sample along this frame's travel instead of just
      // checking the final position.
      const dx = bullet.x - bullet.prevX;
      const dy = bullet.y - bullet.prevY;
      const stepDist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.ceil(stepDist / 16));

      for (let s = 1; s <= steps && bullet.alive; s++) {
        const t = s / steps;
        const sx = bullet.prevX + dx * t;
        const sy = bullet.prevY + dy * t;

        const hitWall = CollisionSystem.findIntersectingWall(sx, sy, bullet.radius, this.colliders);
        if (hitWall) {
          bullet.x = sx;
          bullet.y = sy;
          bullet.alive = false;
          if (hitWall.isCar) {
            this.particles.spawnSparks(sx, sy);
            playSound('bullet_ricochet');
          }
          break;
        }

        if (bullet.hostile) {
          // Fired by military (see _updateZombies' wantsToFire) - can hit
          // either the player or a non-military zombie, whichever the
          // travel path actually crosses first. Never hits other military.
          if (!this.player.isDead) {
            const pdx = this.player.x - sx;
            const pdy = this.player.y - sy;
            if (pdx * pdx + pdy * pdy <= (this.player.radius + bullet.radius) ** 2) {
              bullet.x = sx;
              bullet.y = sy;
              this.player.takeDamage(bullet.damage);
              this._hitstopFrames = Math.max(this._hitstopFrames, HITSTOP_FRAMES);
              this.camera.shake(CONTACT_SHAKE_MAGNITUDE, CONTACT_SHAKE_DURATION);
              this.ui.triggerDamageFlash();
              bullet.alive = false;
              break;
            }
          }
          if (bullet.alive) {
            for (const zombie of this.zombies) {
              if (zombie.state === 'death' || zombie.typeId === 'military') continue;
              const zdx = zombie.x - sx;
              const zdy = zombie.y - sy;
              if (zdx * zdx + zdy * zdy <= (zombie.radius + bullet.radius) ** 2) {
                bullet.x = sx;
                bullet.y = sy;
                this._damageZombie(zombie, bullet.damage);
                bullet.alive = false;
                break;
              }
            }
          }
        } else {
          for (const zombie of this.zombies) {
            if (zombie.state === 'death') continue;
            const zdx = zombie.x - sx;
            const zdy = zombie.y - sy;
            if (zdx * zdx + zdy * zdy <= (zombie.radius + bullet.radius) ** 2) {
              bullet.x = sx;
              bullet.y = sy;
              this._damageZombie(zombie, bullet.damage, true);
              const juice = getWeaponConfig(bullet.weaponId).juice;
              if (juice && juice.knockback) zombie.applyKnockback(bullet.angle, juice.knockback);
              bullet.alive = false;
              break;
            }
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.alive);
  }

  _findZombieSpawnPosition() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = ZOMBIE_SPAWN_MIN_DIST + Math.random() * (ZOMBIE_SPAWN_MAX_DIST - ZOMBIE_SPAWN_MIN_DIST);
      const x = Math.max(WALL_THICKNESS + 40, Math.min(WORLD_WIDTH - WALL_THICKNESS - 40, this.player.x + Math.cos(angle) * dist));
      const y = Math.max(WALL_THICKNESS + 40, Math.min(WORLD_HEIGHT - WALL_THICKNESS - 40, this.player.y + Math.sin(angle) * dist));

      if (!CollisionSystem.circleIntersectsWalls(x, y, 30, this.colliders)) return { x, y };
    }
    return null;
  }

  // From MILITARY_TRUCE_LEVEL onward (the army realizes the player isn't
  // the enemy - and finds out who he's married to), military stop treating
  // him as hostile by default. Survive mode has no levels, so it's always
  // outside the truce (moot anyway - military never spawns in its farm biome).
  _isMilitaryTruceActive() {
    return this.runMode === 'campaign' && this.currentLevel >= MILITARY_TRUCE_LEVEL;
  }

  // Military fights zombies (and the player, unless the truce above is in
  // effect and this particular soldier hasn't been provoked); zombies fight
  // military (and the player) - two undead never target each other, and two
  // soldiers never target each other. Just picks whichever valid target is
  // nearest.
  _findHostileTarget(zombie) {
    const isMilitary = zombie.typeId === 'military';
    const skipPlayer = isMilitary && !zombie.provoked && this._isMilitaryTruceActive();
    let best = null;
    let bestDistSq = Infinity;
    const consider = (candidate) => {
      const dx = candidate.x - zombie.x;
      const dy = candidate.y - zombie.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = candidate;
      }
    };
    if (!this.player.isDead && !skipPlayer) consider(this.player);
    for (const other of this.zombies) {
      if (other === zombie || !other.alive || other.state === 'death') continue;
      const otherIsMilitary = other.typeId === 'military';
      if (isMilitary === otherIsMilitary) continue; // same faction - not a target
      consider(other);
    }
    return best;
  }

  _updateZombies(dt) {
    if (this.pendingBossChoice) return; // The Fallen is downed, fight is frozen for the choice prompt

    if (this._globalMoanCooldown > 0) this._globalMoanCooldown -= dt;
    if (this._globalFootstepCooldown > 0) this._globalFootstepCooldown -= dt;
    const risingAsUndead = []; // military that died this frame - spawned as new zombies after the loop

    for (const zombie of this.zombies) {
      if (!zombie.alive) continue;

      const target = this._findHostileTarget(zombie);
      const result = zombie.update(dt, target);

      if (zombie.state !== 'death') {
        CollisionSystem.resolveCircleVsWalls(zombie, this.colliders);
        CollisionSystem.clampToWorld(zombie, WORLD_WIDTH, WORLD_HEIGHT);
      }

      if (result.attacked && target) {
        if (target === this.player) {
          this.player.takeDamage(result.damage);
          this._hitstopFrames = Math.max(this._hitstopFrames, HITSTOP_FRAMES);
          this.camera.shake(CONTACT_SHAKE_MAGNITUDE, CONTACT_SHAKE_DURATION);
          this.ui.triggerDamageFlash();
        } else {
          this._damageZombie(target, result.damage);
        }
      }

      // Every zombie in range can *request* a moan, but only one actually
      // plays at a time, gated by a shared cooldown - otherwise a room full
      // of zombies turns into a constant overlapping groan.
      if (result.wantsMoan && this._globalMoanCooldown <= 0) {
        playSound('zombie_moan');
        this._globalMoanCooldown = 5 + Math.random() * 6;
      }

      // Same shared-cooldown idea as moans, but much shorter - footsteps
      // should read as a fairly constant shuffling ambience when a group is
      // nearby, this cooldown just stops perfectly-simultaneous requests
      // from stacking into a single loud click. Wading through a water zone
      // (waterDepth set by _updateWaterEffects) swaps in the wade sound plus
      // a ripple particle instead of a normal footstep.
      if (result.wantsFootstep && this._globalFootstepCooldown <= 0) {
        playSound(zombie.waterDepth ? 'wade' : 'footstep_walk');
        if (zombie.waterDepth) this.particles.spawnRipple(zombie.x, zombie.y);
        this._globalFootstepCooldown = 0.15;
      }

      // Blood trail/tracking system - see ParticleSystem.spawnBloodTrail/
      // spawnFootprint and _updateBloodContamination below. No shared
      // cooldown needed here (unlike moans/footsteps) since these are silent
      // decal spawns, not audio.
      if (result.wantsBloodTrail) {
        this.particles.spawnBloodTrail(zombie.x, zombie.y, zombie.faction);
      }
      if (result.wantsFootprint) {
        this.particles.spawnFootprint(zombie.x, zombie.y, zombie._contaminationFaction, zombie.angle);
      }

      if (result.wantsToFire) {
        const muzzleX = zombie.x + Math.cos(zombie.angle) * MILITARY_MUZZLE_OFFSET;
        const muzzleY = zombie.y + Math.sin(zombie.angle) * MILITARY_MUZZLE_OFFSET;
        this.bullets.push(new Bullet({
          x: muzzleX,
          y: muzzleY,
          angle: zombie.angle,
          speed: zombie.bulletSpeed,
          damage: zombie.bulletDamage,
          range: zombie.bulletRange,
          weaponId: zombie.typeId,
          hostile: true,
        }));
        this.particles.spawnMuzzleFlash(muzzleX, muzzleY, zombie.angle);
        playSound('handgun_shot');
      }

      if (!zombie.alive && zombie.lootWeapons && !zombie.lootGranted) {
        zombie.lootGranted = true;
        this._grantLootToPlayer(zombie.lootWeapons);
      }

      // Only zombies the WaveController actually spawned count toward wave
      // clearing - manually-pushed bosses (Reanimated Survivor, The Fallen)
      // aren't part of any wave's count.
      if (!zombie.alive && zombie.fromWave && this.waveController) {
        this.waveController.notifyZombieDied();
      }

      // A soldier killed by the undead doesn't stay dead for long.
      if (!zombie.alive && zombie.typeId === 'military' && !zombie._risen) {
        zombie._risen = true;
        risingAsUndead.push({ x: zombie.x, y: zombie.y });
      }
    }
    this.zombies = this.zombies.filter((z) => z.alive);

    for (const pos of risingAsUndead) {
      this.zombies.push(new Zombie(pos.x, pos.y, 'walker'));
    }
  }

  // Returns { depth: 'shallow'|'deep', type } for the water zone (if any)
  // containing (x, y), else null - see MapBuilder.placeWaterZone for the
  // ellipse shape this tests against.
  _getWaterDepthAt(x, y) {
    for (const zone of this.waterZones) {
      const nx = (x - zone.x) / zone.shallowRx;
      const ny = (y - zone.y) / zone.shallowRy;
      if (nx * nx + ny * ny > 1) continue;
      if (zone.deepRx > 0) {
        const dxr = (x - zone.x) / zone.deepRx;
        const dyr = (y - zone.y) / zone.deepRy;
        if (dxr * dxr + dyr * dyr <= 1) return { depth: 'deep', type: zone.type };
      }
      return { depth: 'shallow', type: zone.type };
    }
    return null;
  }

  // Sets waterDepth/waterType on the player and every living zombie each
  // frame (Player._handleMovement/_handleBreath and Zombie.update read them
  // back next frame - same one-frame-lag convention as blood contamination
  // below), and drives the water-proximity/underwater ambience loops based
  // on the player's distance to the level's one water zone.
  _updateWaterEffects() {
    if (this.player.isDead) {
      stopUnderwaterAmbience();
      stopWaterProximityAmbience();
      return;
    }

    const info = this._getWaterDepthAt(this.player.x, this.player.y);
    this.player.waterDepth = info ? info.depth : null;
    this.player.waterType = info ? info.type : null;

    for (const zombie of this.zombies) {
      if (zombie.state === 'death') continue;
      const zInfo = this._getWaterDepthAt(zombie.x, zombie.y);
      zombie.waterDepth = zInfo ? zInfo.depth : null;
      zombie.waterType = zInfo ? zInfo.type : null;
    }

    if (!this.waterZones.length) {
      stopUnderwaterAmbience();
      stopWaterProximityAmbience();
      return;
    }
    const zone = this.waterZones[0];
    const dx = this.player.x - zone.x;
    const dy = this.player.y - zone.y;
    const proximityRangeSq = (Math.max(zone.shallowRx, zone.shallowRy) + 700) ** 2;

    if (this.player.waterDepth === 'deep') {
      startUnderwaterAmbience();
    } else {
      stopUnderwaterAmbience();
      if (dx * dx + dy * dy <= proximityRangeSq) {
        startWaterProximityAmbience(zone.type);
      } else {
        stopWaterProximityAmbience();
      }
    }
  }

  // Blood trail/tracking system, part 2: whoever is BLEEDING (Player/Zombie)
  // already drops their own trail droplets via wantsBloodTrail above. This
  // is the other half - checking whether any living entity's feet just
  // overlapped a DIFFERENT faction's trail droplet, which "contaminates"
  // them for a few seconds and starts them leaving short-lived footprints in
  // that blood's color (see wantsFootprint / _handleBleeding on the
  // entities, and spawnFootprint on ParticleSystem). Deliberately runs after
  // every entity has already moved this frame, and only against
  // fadingDecals (actual blood, not the permanent gore splats from
  // spawnDecal, and not other footprints) so a zombie doesn't track through
  // decorative kill splatter or re-contaminate off its own prints.
  _updateBloodContamination() {
    if (!this.particles.fadingDecals.length) return;
    const CONTAMINATION_RADIUS_SQ = 30 * 30;
    const CONTAMINATION_DURATION = 2.5;

    const checkEntity = (entity) => {
      for (const d of this.particles.fadingDecals) {
        if (d.isFootprint || d.faction === entity.faction) continue;
        const dx = entity.x - d.x;
        const dy = entity.y - d.y;
        if (dx * dx + dy * dy <= CONTAMINATION_RADIUS_SQ) {
          entity.footContaminated = true;
          entity._footContamTimer = CONTAMINATION_DURATION;
          entity._contaminationFaction = d.faction;
          return;
        }
      }
    };

    if (!this.player.isDead) checkEntity(this.player);
    for (const zombie of this.zombies) {
      if (zombie.state === 'death') continue;
      checkEntity(zombie);
    }
  }

  _grantLootToPlayer(weaponIds) {
    for (const id of weaponIds) {
      this.player.pickupWeapon(id);
    }
    this.ui.pushNotification('You recovered your old gear');
  }

  _handleDeathTransition() {
    if (this._deathHandled) return;
    if (!this.player.isDeathAnimationFinished()) return;

    this._deathHandled = true;
    this.zombies.push(new Zombie(this.player.x, this.player.y, 'walker'));

    if (this.runMode === 'survive') {
      const finalWave = this.waveController ? this.waveController.currentWave : 0;
      this.bestWaveReached = Math.max(this.bestWaveReached, finalWave);
      this.pendingSurviveGameOver = true;
    }
  }

  // Continuous rumble while the chainsaw is revving/idling or mid-swing -
  // re-triggered every frame it's active rather than a one-shot, since
  // Camera.shake() just extends the existing shake (Math.max), giving a
  // sustained buzz instead of a single pulse.
  _updateChainsawRumble() {
    if (this.player.currentWeapon !== 'chainsaw') return;
    if (this.player.currentAnimation !== 'idle_running' && this.player.currentAnimation !== 'attack') return;
    const juice = getWeaponConfig('chainsaw').juice;
    if (juice) this.camera.shake(juice.shakeMagnitude, CHAINSAW_SHAKE_DURATION);
  }

  // The boss-choice overlay can appear while the player is still alive
  // (unlike the death/restart screen), so this runs every frame regardless
  // of isDead. Level-complete has no click of its own anymore - see
  // _updateExitGate().
  _handleOverlayClicks() {
    if (!this.pendingBossChoice || !this.input.wasMouseJustPressed()) return;
    const { x, y } = this.input.mouseScreen;
    const inRect = (r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;

    if (inRect(BOSS_CHOICE_BUTTONS.cure)) this.pendingEnding = 'cure';
    else if (inRect(BOSS_CHOICE_BUTTONS.succumb)) this.pendingEnding = 'succumb';
  }

  _handleRestartClick() {
    if (!this.player.isDeathAnimationFinished()) return;
    if (!this.input.wasMouseJustPressed()) return;

    const r = RESTART_BUTTON_RECT;
    const { x, y } = this.input.mouseScreen;
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
      if (this.runMode === 'survive') {
        this.wantsMainMenu = true;
      } else {
        this.restart();
      }
    }
  }

  render() {
    const ctx = this.renderer.ctx;
    this.renderer.clear();

    this._drawGround(ctx);
    this._drawWaterZones(ctx);
    for (const wall of this.walls) wall.draw(ctx, this.camera);
    this.particles.drawDecals(ctx, this.camera);
    this.particles.drawFadingDecals(ctx, this.camera);
    for (const deco of this.decorations) drawDecoration(ctx, this.camera, deco, this.currentBiomeId);
    for (const pickup of this.pickups) pickup.draw(ctx, this.camera);
    for (const supply of this.supplies) supply.draw(ctx, this.camera);
    for (const bullet of this.bullets) bullet.draw(ctx, this.camera);
    this.player.draw(ctx, this.camera);
    for (const zombie of this.zombies) zombie.draw(ctx, this.camera);
    this.particles.drawParticles(ctx, this.camera);

    this.ui.drawCrosshair(ctx, this.input);
    this.ui.drawHealthBar(ctx, this.player);
    this.ui.drawBreathMeter(ctx, this.player);
    this.ui.drawWeaponHud(ctx, this.player);
    this.ui.drawInventoryBar(ctx, this.player);
    this.ui.drawLevelLabel(ctx);
    const boss = this.zombies.find((z) => z.isBoss && z.alive);
    if (boss) this.ui.drawBossHealthBar(ctx, boss);
    this.ui.drawNotifications(ctx);
    this.ui.drawDamageFlash(ctx);
    this.ui.drawFps(ctx, this._fps);
    this.ui.drawDebug(ctx, this._debugLines());

    if (this.pendingBossChoice) {
      this.ui.drawBossChoicePrompt(ctx, this.input.mouseScreen);
    } else if (this.player.isDead && this.player.isDeathAnimationFinished()) {
      if (this.runMode === 'survive') {
        this.ui.drawSurviveGameOverScreen(ctx, { wavesReached: this.bestWaveReached }, this.input.mouseScreen);
      } else {
        this.ui.drawDeathScreen(ctx, { timeSurvived: this._formatTime(this._survivalTime) }, this.input.mouseScreen);
      }
    }
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  _drawGround(ctx) {
    const startX = Math.floor(this.camera.x / SPRITE_SIZE) * SPRITE_SIZE;
    const startY = Math.floor(this.camera.y / SPRITE_SIZE) * SPRITE_SIZE;

    for (let x = startX; x < this.camera.x + INTERNAL_WIDTH; x += SPRITE_SIZE) {
      for (let y = startY; y < this.camera.y + INTERNAL_HEIGHT; y += SPRITE_SIZE) {
        const screen = this.camera.worldToScreen(x, y);
        const zone = this.getGroundZone(x + SPRITE_SIZE / 2, y + SPRITE_SIZE / 2);
        const handle = REAL_GROUND_HANDLES[zone];
        // Distinct cache key while still on the placeholder vs. once the
        // real tile has loaded, so the tint gets recomputed the one time
        // the source actually changes instead of staying stale.
        const cacheKey = `${zone}_${handle.isPlaceholder ? 'placeholder' : 'real'}`;
        // Road uses its own gentler tint table (see ROAD_TINTS) - the
        // grass-calibrated BIOME_TINTS hue rotation corrupts the dirt
        // texture's very different base hue into pink/magenta.
        const tile = zone === 'road'
          ? tintCanvasSync(handle.image, this.currentBiomeId, cacheKey, ROAD_TINTS)
          : tintCanvasSync(handle.image, this.currentBiomeId, cacheKey);
        ctx.imageSmoothingEnabled = false; // crisp pixel-art scaling for the small real grass tile
        ctx.drawImage(tile, screen.x, screen.y, SPRITE_SIZE, SPRITE_SIZE);
      }
    }
  }

  // Draws each of this level's water zones (see MapBuilder.placeWaterZone)
  // as a tiled water texture clipped to an ellipse, with a type-based color
  // wash (blue for lake/pond, murky green for swamp) and a darker deep-water
  // ellipse where one exists. Deliberately uses the neutral/untinted water
  // tile ('farm' biome) regardless of the level's actual biome tint - water
  // color comes from its own type here, not the biome recolor system, so it
  // reads consistently across every biome instead of turning brown in the
  // desert or olive on a military base.
  _drawWaterZones(ctx) {
    if (!this.waterZones || !this.waterZones.length) return;
    const shimmer = 0.85 + Math.sin(this._ambientAnimTime * 1.4) * 0.15;
    const tile = getTilesetTile('water_1', 'farm').image;

    for (const zone of this.waterZones) {
      const screen = this.camera.worldToScreen(zone.x, zone.y);
      const margin = Math.max(zone.shallowRx, zone.shallowRy) + 40;
      if (screen.x < -margin || screen.x > INTERNAL_WIDTH + margin || screen.y < -margin || screen.y > INTERNAL_HEIGHT + margin) continue;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(screen.x, screen.y, zone.shallowRx, zone.shallowRy, 0, 0, Math.PI * 2);
      ctx.clip();

      if (tile && (tile.width || tile.naturalWidth)) {
        const pattern = ctx.createPattern(tile, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.globalAlpha = shimmer;
          ctx.fillRect(screen.x - zone.shallowRx, screen.y - zone.shallowRy, zone.shallowRx * 2, zone.shallowRy * 2);
          ctx.globalAlpha = 1;
        }
      }

      ctx.fillStyle = zone.type === 'swamp' ? 'rgba(64, 74, 34, 0.45)' : 'rgba(30, 90, 140, 0.32)';
      ctx.fillRect(screen.x - zone.shallowRx, screen.y - zone.shallowRy, zone.shallowRx * 2, zone.shallowRy * 2);

      if (zone.deepRx > 0) {
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y, zone.deepRx, zone.deepRy, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 35, 70, 0.45)';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  _debugLines() {
    const mouseWorld = this.camera.screenToWorld(this.input.mouseScreen.x, this.input.mouseScreen.y);
    return [
      `player: ${this.player.x.toFixed(0)}, ${this.player.y.toFixed(0)}  hp: ${Math.ceil(this.player.health)}`,
      `weapon: ${this.player.currentWeapon}  anim: ${this.player.currentAnimation}  dir: ${this.player.currentDirection}  frame: ${this.player.currentFrame}`,
      `angle: ${this.player.angle.toFixed(2)} rad`,
      `camera: ${this.camera.x.toFixed(0)}, ${this.camera.y.toFixed(0)}`,
      `mouse world: ${mouseWorld.x.toFixed(0)}, ${mouseWorld.y.toFixed(0)}`,
      `bullets: ${this.bullets.length}  zombies: ${this.zombies.length}  pickups: ${this.pickups.length}  supplies: ${this.supplies.length}  particles: ${this.particles.particles.length}`,
    ];
  }
}
