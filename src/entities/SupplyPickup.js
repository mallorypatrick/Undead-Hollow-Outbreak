import { getSupplyConfig } from '../config/SupplyConfig.js';
import { getSupplyIcon } from '../core/AssetLoader.js';
import { playSound } from '../systems/AudioManager.js';

const ICON_DRAW_SIZE = 60;
const PICKUP_RADIUS = 40;

// World-placed supply pickup (medkit, bandages, ammo box, weapon crate,
// food, water). Same bob-and-collect shape as WeaponPickup, but applies a
// generic effect instead of equipping a weapon. Never despawns on its own -
// only removed once collected.
export class SupplyPickup {
  constructor(x, y, supplyId) {
    this.x = x;
    this.y = y;
    this.supplyId = supplyId;
    this.radius = PICKUP_RADIUS;
    this.collected = false;

    this._time = Math.random() * 10;
  }

  update(dt) {
    this._time += dt;
  }

  tryCollect(player) {
    if (this.collected || player.isDead) return false;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const reach = this.radius + player.radius;
    if (dx * dx + dy * dy > reach * reach) return false;

    this.collected = true;
    const config = getSupplyConfig(this.supplyId);
    const message = config.apply(player);
    if (message) player.notify(message);
    playSound('pickup');
    return true;
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    if (screen.x < -100 || screen.x > 2020 || screen.y < -100 || screen.y > 1180) return;

    const config = getSupplyConfig(this.supplyId);
    const icon = getSupplyIcon(this.supplyId, config.iconFolder);
    const bob = Math.sin(this._time * 2.4) * 6;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(screen.x, screen.y + ICON_DRAW_SIZE * 0.4, ICON_DRAW_SIZE * 0.35, ICON_DRAW_SIZE * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.drawImage(
      icon.image,
      screen.x - ICON_DRAW_SIZE / 2,
      screen.y - ICON_DRAW_SIZE / 2 + bob,
      ICON_DRAW_SIZE,
      ICON_DRAW_SIZE
    );

    ctx.font = '15px monospace';
    ctx.fillStyle = 'rgba(216, 212, 200, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(config.displayName, screen.x, screen.y + ICON_DRAW_SIZE * 0.7 + bob);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}
