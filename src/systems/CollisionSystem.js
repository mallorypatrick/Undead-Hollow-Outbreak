export const CollisionSystem = {
  // Resolves a circle (e.g. the player) against a list of AABB walls by
  // pushing the circle out along the axis of least penetration.
  resolveCircleVsWalls(circle, walls) {
    for (const wall of walls) {
      const insideRect =
        circle.x > wall.x && circle.x < wall.x + wall.width &&
        circle.y > wall.y && circle.y < wall.y + wall.height;

      if (insideRect) {
        // Center is fully inside the wall (e.g. teleported there) - the
        // closest-point method degenerates to a zero-length vector here,
        // so push out along whichever edge is shallowest instead.
        const left = circle.x - wall.x;
        const right = wall.x + wall.width - circle.x;
        const top = circle.y - wall.y;
        const bottom = wall.y + wall.height - circle.y;
        const min = Math.min(left, right, top, bottom);

        if (min === left) circle.x = wall.x - circle.radius;
        else if (min === right) circle.x = wall.x + wall.width + circle.radius;
        else if (min === top) circle.y = wall.y - circle.radius;
        else circle.y = wall.y + wall.height + circle.radius;
        continue;
      }

      const closestX = Math.max(wall.x, Math.min(circle.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(circle.y, wall.y + wall.height));

      const dx = circle.x - closestX;
      const dy = circle.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < circle.radius * circle.radius) {
        const dist = Math.sqrt(distSq);
        const overlap = circle.radius - dist;
        circle.x += (dx / dist) * overlap;
        circle.y += (dy / dist) * overlap;
      }
    }
  },

  clampToWorld(circle, worldWidth, worldHeight) {
    circle.x = Math.max(circle.radius, Math.min(circle.x, worldWidth - circle.radius));
    circle.y = Math.max(circle.radius, Math.min(circle.y, worldHeight - circle.radius));
  },

  // Simple boolean hit-test, used for fast-moving small circles (bullets)
  // where we only care "did it hit something", not how to push it out.
  circleIntersectsWalls(x, y, radius, walls) {
    return this.findIntersectingWall(x, y, radius, walls) !== null;
  },

  // Same test, but returns the specific wall/collider hit (or null) so the
  // caller can react differently depending on what it was - e.g. sparks off
  // a car versus nothing off a plain building wall.
  findIntersectingWall(x, y, radius, walls) {
    for (const wall of walls) {
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy < radius * radius) return wall;
    }
    return null;
  },
};
