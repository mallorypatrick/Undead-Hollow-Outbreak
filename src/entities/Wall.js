import { Sprites, SPRITE_SIZE } from '../assets/ProceduralSprites.js';

export class Wall {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);

    if (
      screen.x + this.width < 0 || screen.x > 1920 ||
      screen.y + this.height < 0 || screen.y > 1080
    ) {
      return; // offscreen, skip drawing
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(screen.x, screen.y, this.width, this.height);
    ctx.clip();
    for (let tx = 0; tx < this.width; tx += SPRITE_SIZE) {
      for (let ty = 0; ty < this.height; ty += SPRITE_SIZE) {
        ctx.drawImage(Sprites.wall, screen.x + tx, screen.y + ty, SPRITE_SIZE, SPRITE_SIZE);
      }
    }
    ctx.restore();
  }
}
