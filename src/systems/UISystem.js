import { Sprites } from '../assets/ProceduralSprites.js';
import { getWeaponConfig, WEAPON_SLOT_ORDER } from '../config/WeaponConfig.js';
import { getPickupIcon, getStaticImage } from '../core/AssetLoader.js';
import { generatePlaceholderIcon } from '../assets/ProceduralSpriteSheets.js';

function getHealthPanelImage() {
  return getStaticImage('ui:health_panel', 'assets/ui/health_panel.png', generatePlaceholderIcon('unarmed')).image;
}
function getFuryHaloImage() {
  return getStaticImage('ui:fury_halo', 'assets/ui/fury_halo.png', generatePlaceholderIcon('unarmed')).image;
}

const NOTIFICATION_LIFETIME = 2.5;

const DAMAGE_FLASH_DURATION = 0.35;

// How long the "Level N - Title" readout stays on screen after entering a
// level before it auto-hides (see UISystem.showLevelLabel/drawLevelLabel).
const LEVEL_LABEL_DURATION = 2;
const LEVEL_LABEL_FADE = 0.4; // tail-end fade-out, not an abrupt cut

// Rect of the death-screen restart button, in internal canvas coordinates.
// Exported so Game can hit-test clicks against the exact same rect drawn.
// Reused (same position) for the Survive-mode game-over screen's "MAIN
// MENU" button - only the label/action differs by runMode.
export const RESTART_BUTTON_RECT = { x: 810, y: 660, width: 300, height: 64 };

// The Fallen boss-choice prompt, two buttons side by side.
export const BOSS_CHOICE_BUTTONS = {
  cure: { x: 560, y: 660, width: 360, height: 72 },
  succumb: { x: 1000, y: 660, width: 360, height: 72 },
};

function drawOverlayButton(ctx, r, label, mouseScreen) {
  const hovered = mouseScreen &&
    mouseScreen.x >= r.x && mouseScreen.x <= r.x + r.width &&
    mouseScreen.y >= r.y && mouseScreen.y <= r.y + r.height;

  ctx.fillStyle = hovered ? 'rgba(201,74,58,0.5)' : 'rgba(201,74,58,0.28)';
  ctx.fillRect(r.x, r.y, r.width, r.height);
  ctx.strokeStyle = '#c94a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.width, r.height);

  ctx.fillStyle = '#d8d4c8';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.width / 2, r.y + r.height / 2 + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export class UISystem {
  constructor() {
    this.notifications = []; // { text, timer }
    this.damageFlashTimer = 0;
    this.levelLabelText = null;
    this.levelObjectiveText = null;
    this.levelLabelTimer = 0;
  }

  update(dt) {
    for (const n of this.notifications) n.timer -= dt;
    this.notifications = this.notifications.filter((n) => n.timer > 0);

    if (this.damageFlashTimer > 0) this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    if (this.levelLabelTimer > 0) this.levelLabelTimer = Math.max(0, this.levelLabelTimer - dt);
  }

  // Shows the "Level N - Title" readout plus a military-style mission
  // objective line beneath it, both for LEVEL_LABEL_DURATION seconds, then
  // both auto-hide together - see drawLevelLabel.
  showLevelLabel(text, objectiveText = null) {
    this.levelLabelText = text;
    this.levelObjectiveText = objectiveText;
    this.levelLabelTimer = LEVEL_LABEL_DURATION;
  }

  pushNotification(text) {
    this.notifications.push({ text, timer: NOTIFICATION_LIFETIME });
  }

  triggerDamageFlash() {
    this.damageFlashTimer = DAMAGE_FLASH_DURATION;
  }

  drawDamageFlash(ctx) {
    if (this.damageFlashTimer <= 0) return;
    const alpha = (this.damageFlashTimer / DAMAGE_FLASH_DURATION) * 0.45;
    ctx.save();
    ctx.fillStyle = `rgba(180, 20, 20, ${alpha})`;
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.restore();
  }

  drawCrosshair(ctx, input) {
    const size = 48;
    ctx.drawImage(
      Sprites.crosshair,
      input.mouseScreen.x - size / 2,
      input.mouseScreen.y - size / 2,
      size,
      size
    );
  }

  // Top-center readout of the current campaign level and its narrative
  // title, shown for LEVEL_LABEL_DURATION seconds after entering a level
  // (set via showLevelLabel) then fading out over the last LEVEL_LABEL_FADE
  // seconds, rather than staying on screen the whole level.
  drawLevelLabel(ctx) {
    if (!this.levelLabelText || this.levelLabelTimer <= 0) return;
    const alpha = Math.min(1, this.levelLabelTimer / LEVEL_LABEL_FADE);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    const width = ctx.measureText(this.levelLabelText).width + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(960 - width / 2, 14, width, 36);
    ctx.fillStyle = '#d8d4c8';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.levelLabelText, 960, 32);

    // Mission objective, a smaller line directly under the level name -
    // same visibility window/fade as the name above it.
    if (this.levelObjectiveText) {
      ctx.font = '18px monospace';
      const objWidth = ctx.measureText(this.levelObjectiveText).width + 32;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(960 - objWidth / 2, 54, objWidth, 28);
      ctx.fillStyle = '#c94a3a';
      ctx.fillText(this.levelObjectiveText, 960, 68);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  drawFps(ctx, fps) {
    ctx.save();
    ctx.font = '24px monospace';
    ctx.fillStyle = '#7fff8a';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${fps}`, 20, 20);
    ctx.restore();
  }

  drawDebug(ctx, lines) {
    ctx.save();
    ctx.font = '18px monospace';
    ctx.fillStyle = 'rgba(216, 212, 200, 0.85)';
    ctx.textBaseline = 'top';
    let y = 56;
    for (const line of lines) {
      ctx.fillText(line, 20, y);
      y += 22;
    }
    ctx.restore();
  }

  drawHealthBar(ctx, player) {
    const panelW = 380;
    const panelH = 152; // 500x200 source, aspect preserved
    const x = 16;
    const y = 900;
    const pct = Math.max(0, player.health / player.maxHealth);

    ctx.save();

    // Low-health pulsing glow, drawn behind the panel so it reads as a
    // warning aura rather than obscuring the readout.
    if (pct <= 0.3) {
      const pulse = 0.4 + 0.35 * Math.sin(performance.now() / 220);
      ctx.globalAlpha = pulse;
      const haloSize = panelH * 0.9;
      ctx.drawImage(getFuryHaloImage(), x + panelW * 0.5 - haloSize / 2, y + panelH * 0.55 - haloSize / 2, haloSize, haloSize);
      ctx.globalAlpha = 1;
    }

    ctx.drawImage(getHealthPanelImage(), x, y, panelW, panelH);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#f0ece0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(player.health)} / ${player.maxHealth}`, x + panelW * 0.5, y + panelH * 0.55);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Thin percentage bar under the decorative panel - exact numeric
    // readout, independent of how the art is interpreted.
    const barY = y + panelH + 6;
    const barW = panelW;
    const barH = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, barY, barW, barH);
    ctx.fillStyle = pct > 0.3 ? '#8a2f2f' : '#c94a3a';
    ctx.fillRect(x, barY, barW * pct, barH);
    ctx.strokeStyle = 'rgba(216,212,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, barY, barW, barH);

    ctx.restore();
  }

  // Shown while submerged in deep water and for a moment after resurfacing
  // (while still recovering) - see Player._handleBreath. Blue when full,
  // shifting toward red as breath runs out, same "danger color" idea as the
  // health bar's low-health state.
  drawBreathMeter(ctx, player) {
    if (player.waterDepth !== 'deep' && player.breath >= player.maxBreath) return;
    const x = 16;
    const y = 862;
    const w = 380;
    const h = 22;
    const pct = Math.max(0, player.breath / player.maxBreath);

    ctx.save();
    ctx.fillStyle = 'rgba(10,15,25,0.65)';
    ctx.fillRect(x, y, w, h);

    const r = Math.round(220 - pct * 180);
    const g = Math.round(60 + pct * 140);
    const b = Math.round(90 + pct * 165);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x + 3, y + 3, (w - 6) * pct, h - 6);

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#f0ece0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BREATH', x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  drawBossHealthBar(ctx, zombie) {
    const width = 900;
    const height = 34;
    const x = 960 - width / 2;
    const y = 60;
    const pct = Math.max(0, zombie.health / zombie.maxHealth);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c94a3a';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(zombie.displayName || 'BOSS', 960, y - 12);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#8a1f1f';
    ctx.fillRect(x, y, width * pct, height);
    ctx.strokeStyle = 'rgba(216,212,200,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  drawWeaponHud(ctx, player) {
    const config = getWeaponConfig(player.currentWeapon);
    const x = 1880;
    const y = 1010;

    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '22px monospace';
    ctx.fillStyle = '#d8d4c8';
    ctx.fillText(config.displayName, x, y - 20);

    const ammo = player.getAmmoDisplay();
    if (ammo) {
      ctx.font = '28px monospace';
      ctx.fillStyle = ammo.magazine === 0 ? '#c94a3a' : '#d8d4c8';
      const label = ammo.reloading ? 'RELOADING...' : `${ammo.magazine} / ${ammo.reserve}`;
      ctx.fillText(label, x, y + 12);
    } else {
      ctx.font = '20px monospace';
      ctx.fillStyle = 'rgba(216,212,200,0.6)';
      ctx.fillText('melee', x, y + 12);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawInventoryBar(ctx, player) {
    const slotSize = 68;
    const gap = 12;
    const owned = WEAPON_SLOT_ORDER.filter((id) => player.ownedWeapons[id]);
    const totalWidth = owned.length * slotSize + (owned.length - 1) * gap;
    let x = 960 - totalWidth / 2;
    const y = 990;

    ctx.save();
    owned.forEach((id, i) => {
      const config = getWeaponConfig(id);
      const slotX = x + i * (slotSize + gap);
      const isActive = id === player.currentWeapon;

      ctx.fillStyle = isActive ? 'rgba(201,74,58,0.35)' : 'rgba(0,0,0,0.45)';
      ctx.fillRect(slotX, y, slotSize, slotSize);
      ctx.strokeStyle = isActive ? '#c94a3a' : 'rgba(216,212,200,0.4)';
      ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.strokeRect(slotX, y, slotSize, slotSize);

      if (id !== 'unarmed') {
        const icon = getPickupIcon(id, config.pickupIconFolder);
        const iconSize = slotSize * 0.72;
        ctx.drawImage(icon.image, slotX + (slotSize - iconSize) / 2, y + (slotSize - iconSize) / 2, iconSize, iconSize);
      } else {
        ctx.font = '13px monospace';
        ctx.fillStyle = 'rgba(216,212,200,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText('fists', slotX + slotSize / 2, y + slotSize / 2 + 4);
        ctx.textAlign = 'left';
      }

      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(216,212,200,0.7)';
      ctx.fillText(`${WEAPON_SLOT_ORDER.indexOf(id) + 1}`, slotX + 4, y + 14);
    });
    ctx.restore();
  }

  drawNotifications(ctx) {
    if (this.notifications.length === 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace';
    let y = 140;
    for (const n of this.notifications) {
      const alpha = Math.min(1, n.timer / 0.5);
      ctx.fillStyle = `rgba(216, 212, 200, ${alpha})`;
      ctx.fillText(n.text, 960, y);
      y += 34;
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawDeathScreen(ctx, stats, mouseScreen) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, 1920, 1080);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c94a3a';
    ctx.font = 'bold 72px monospace';
    ctx.fillText('YOU DIED', 960, 420);

    ctx.fillStyle = '#d8d4c8';
    ctx.font = '28px monospace';
    ctx.fillText(`Time survived: ${stats.timeSurvived}`, 960, 520);
    ctx.fillText('You have risen as one of the hollow.', 960, 570);

    const r = RESTART_BUTTON_RECT;
    const hovered = mouseScreen &&
      mouseScreen.x >= r.x && mouseScreen.x <= r.x + r.width &&
      mouseScreen.y >= r.y && mouseScreen.y <= r.y + r.height;

    ctx.fillStyle = hovered ? 'rgba(201,74,58,0.5)' : 'rgba(201,74,58,0.28)';
    ctx.fillRect(r.x, r.y, r.width, r.height);
    ctx.strokeStyle = '#c94a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.width, r.height);

    ctx.fillStyle = '#d8d4c8';
    ctx.font = 'bold 26px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('RESTART', r.x + r.width / 2, r.y + r.height / 2 + 2);
    ctx.textBaseline = 'alphabetic';

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Survive-If-You-Can's death screen - same visual language as
  // drawDeathScreen, but the headline stat is waves survived rather than
  // time, and the button returns to the main menu instead of restarting
  // the same run.
  drawSurviveGameOverScreen(ctx, stats, mouseScreen) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, 1920, 1080);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c94a3a';
    ctx.font = 'bold 72px monospace';
    ctx.fillText('YOU DIED', 960, 420);

    ctx.fillStyle = '#d8d4c8';
    ctx.font = '28px monospace';
    ctx.fillText(`Waves survived: ${stats.wavesReached}`, 960, 520);
    ctx.fillText('You have risen as one of the hollow.', 960, 570);
    ctx.textAlign = 'left';

    drawOverlayButton(ctx, RESTART_BUTTON_RECT, 'MAIN MENU', mouseScreen);
    ctx.restore();
  }

  // The Fallen, downed at level 39 - the branching-ending choice prompt.
  drawBossChoicePrompt(ctx, mouseScreen) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 1920, 1080);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8664f';
    ctx.font = 'bold 44px monospace';
    ctx.fillText('SHE LOOKS UP AT YOU, STILL BREATHING.', 960, 540);
    ctx.fillStyle = '#d8d4c8';
    ctx.font = '24px monospace';
    ctx.fillText('What do you do?', 960, 590);
    ctx.textAlign = 'left';

    drawOverlayButton(ctx, BOSS_CHOICE_BUTTONS.cure, 'CURE HER', mouseScreen);
    drawOverlayButton(ctx, BOSS_CHOICE_BUTTONS.succumb, 'LET HER LIVE', mouseScreen);
    ctx.restore();
  }
}
