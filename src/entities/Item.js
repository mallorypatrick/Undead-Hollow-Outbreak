// Placeholder for the supplies/loot milestone. Not instantiated yet.
export class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.collected = false;
  }

  update(dt) {
    // Idle bob/animation logic to be implemented in a later milestone.
  }

  draw(ctx, camera) {
    // Rendering to be implemented in a later milestone.
  }
}
