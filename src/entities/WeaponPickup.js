import { getWeaponConfig } from '../config/WeaponConfig.js';
import { getPickupIcon } from '../core/AssetLoader.js';

const ICON_DRAW_SIZE = 72;
const PICKUP_RADIUS = 44;

export class WeaponPickup {
  constructor(x, y, weaponId) {
    this.x = x;
    this.y = y;
    this.weaponId = weaponId;
    this.radius = PICKUP_RADIUS;
    this.collected = false;

    this._time = Math.random() * 10; // desync bob/flicker across pickups
  }

  update(dt) {
    this._time += dt;
  }

  // Returns the pickupWeapon() result if this pickup was just collected,
  // otherwise null. Caller (Game) is responsible for removing collected
  // pickups from the world list.
  tryCollect(player) {
    if (this.collected || player.isDead) return null;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distSq = dx * dx + dy * dy;
    const reach = this.radius + player.radius;
    if (distSq > reach * reach) return null;

    this.collected = true;
    return player.pickupWeapon(this.weaponId);
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    if (
      screen.x < -100 || screen.x > 2020 ||
      screen.y < -100 || screen.y > 1180
    ) {
      return;
    }

    const config = getWeaponConfig(this.weaponId);
    const icon = getPickupIcon(this.weaponId, config.pickupIconFolder);
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

    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(216, 212, 200, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(config.displayName, screen.x, screen.y + ICON_DRAW_SIZE * 0.75 + bob);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}
