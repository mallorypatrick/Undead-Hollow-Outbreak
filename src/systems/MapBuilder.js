// Builds the large scrolling map for whichever biome the current level is
// set in. Every biome shares the same building blocks - road bands, a
// scattered-decoration field, collision-checked rect/point placement - just
// parameterized differently (see BIOME_LAYOUTS). Real wall collision comes
// from plain Wall instances and {x,y,width,height,isCar:true} car rects,
// identical in shape to what the original single-map version produced, so
// nothing downstream (CollisionSystem, Game's collider merging, bullets)
// needs to change.
import { Wall } from '../entities/Wall.js';
import { CollisionSystem } from './CollisionSystem.js';
import { CAR_TYPE_IDS } from './DecorationRenderer.js';

// Collision box per car type, matching each sprite's real render bounds
// (see DecorationRenderer.CAR_SPRITES) - every car sprite is a tightly-
// cropped single-car image, so the box is just width x (width * aspect).
const CAR_SIZE = {
  car_red: { w: 140, h: 65.6 },
  car_pickup_black: { w: 140, h: 78.3 },
  car_suv_blue: { w: 140, h: 80.9 },
  car_sedan_black: { w: 140, h: 66.4 },
  car_pickup_blue: { w: 140, h: 74.1 },
  car_pickup_red: { w: 170, h: 64.4 },
  car_ambulance: { w: 150, h: 82.2 },
  car_van_pink: { w: 140, h: 85.8 },
};
const DEFAULT_CAR_COLLIDER = { w: 120, h: 110 };

// Small solid colliders for decorations that should block movement (trees,
// gravestones, the level-exit tombstones) without being drawn as brick
// walls - same {x,y,width,height} shape as everything else CollisionSystem
// consumes, just kept in their own array so DecorationRenderer (not
// Wall.draw()) is what actually paints them.
const TREE_COLLIDER_RADIUS = 22;
const GRAVESTONE_COLLIDER_RADIUS = 18;
const EXIT_GATE_TOMBSTONE_RADIUS = 24;
const EXIT_GATE_TOMBSTONE_SPACING = 220;
const EXIT_GATE_TRIGGER_RADIUS = 170;

function pushSmallCollider(staticColliders, x, y, radius) {
  staticColliders.push({ x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 });
}

const BIOME_LAYOUTS = {
  farm: { roadWidth: 260, treeCount: 150, corpseCount: 60, carCount: 10, hasCemetery: true },
  desert: { roadWidth: 220, treeCount: 10, corpseCount: 40, carCount: 6, hasCemetery: false, sparseBuildings: true },
  city: { roadWidth: 320, treeCount: 20, corpseCount: 90, carCount: 26, hasCemetery: false, denseBuildings: true, extraRoadBands: true },
  subway: { roadWidth: 380, corridorMode: true },
  marine_base: { roadWidth: 240, treeCount: 40, corpseCount: 70, carCount: 8, hasCemetery: false, fortified: true },
  army_base: { roadWidth: 240, treeCount: 30, corpseCount: 80, carCount: 10, hasCemetery: false, fortified: true, fortifiedScale: 1.3 },
  area51: { roadWidth: 200, treeCount: 0, corpseCount: 30, carCount: 4, hasCemetery: false, sparse: true },
};

export function buildEnvironment(worldWidth, worldHeight, boundaryWalls, biomeId = 'farm') {
  const layout = BIOME_LAYOUTS[biomeId] || BIOME_LAYOUTS.farm;

  if (layout.corridorMode) {
    return buildSubwayEnvironment(worldWidth, worldHeight, boundaryWalls, layout);
  }
  return buildOpenWorldEnvironment(worldWidth, worldHeight, boundaryWalls, biomeId, layout);
}

// --- shared open-world builder (farm/desert/city/marine_base/army_base/area51) ---

function buildOpenWorldEnvironment(worldWidth, worldHeight, boundaryWalls, biomeId, layout) {
  const roadWidth = layout.roadWidth;
  const roadBands = [
    { x: 0, y: worldHeight / 2 - roadWidth / 2, w: worldWidth, h: roadWidth },
    { x: worldWidth / 2 - roadWidth / 2, y: 0, w: roadWidth, h: worldHeight },
  ];
  if (layout.extraRoadBands) {
    roadBands.push(
      { x: 0, y: worldHeight * 0.22 - roadWidth / 4, w: worldWidth, h: roadWidth / 2 },
      { x: 0, y: worldHeight * 0.78 - roadWidth / 4, w: worldWidth, h: roadWidth / 2 },
      { x: worldWidth * 0.22 - roadWidth / 4, y: 0, w: roadWidth / 2, h: worldHeight },
      { x: worldWidth * 0.78 - roadWidth / 4, y: 0, w: roadWidth / 2, h: worldHeight },
    );
  }
  const cemeteryZone = layout.hasCemetery
    ? { x: worldWidth * 0.06, y: worldHeight * 0.08, w: 640, h: 560 }
    : null;

  const walls = [];
  const decorations = [];
  const staticColliders = [];
  const collidersForPlacement = [...boundaryWalls];

  if (biomeId === 'farm') {
    buildFarmBuildings(worldWidth, worldHeight, walls, decorations, collidersForPlacement, staticColliders);
  } else if (layout.sparseBuildings) {
    buildDesertBuildings(worldWidth, worldHeight, walls, decorations, collidersForPlacement);
  } else if (layout.denseBuildings) {
    buildCityBuildings(worldWidth, worldHeight, roadBands, walls, decorations, collidersForPlacement);
  } else if (layout.fortified) {
    buildFortifiedCompound(worldWidth, worldHeight, walls, decorations, collidersForPlacement, layout.fortifiedScale || 1, biomeId, staticColliders);
  } else if (layout.sparse) {
    buildArea51Facility(worldWidth, worldHeight, walls, decorations, collidersForPlacement, staticColliders);
  }

  // --- gravestones, confined to the cemetery patch (farm only) - solid, static meshes ---
  if (cemeteryZone) {
    for (let i = 0; i < 22; i++) {
      const x = cemeteryZone.x + 40 + Math.random() * (cemeteryZone.w - 80);
      const y = cemeteryZone.y + 40 + Math.random() * (cemeteryZone.h - 80);
      decorations.push({ x, y, type: 'gravestone', rotation: (Math.random() - 0.5) * 0.3 });
      pushSmallCollider(staticColliders, x, y, GRAVESTONE_COLLIDER_RADIUS);
    }
  }

  // --- abandoned cars, scattered individually along the roads ---
  // Each car is placed via the same collision-checked retry pattern as
  // trees/houses below, checked against every wall AND every car placed
  // so far - guarantees real separation, so they read as parked/abandoned
  // traffic rather than a crash pileup.
  const CAR_MIN_GAP = 55; // extra clearance beyond each car's own box, so neighbors don't look like they're touching
  const carColliders = [];
  let carsPlaced = 0;
  for (let attempt = 0; attempt < layout.carCount * 30 && carsPlaced < layout.carCount; attempt++) {
    const onHorizontal = Math.random() < 0.5;
    const band = roadBands[onHorizontal ? 0 : 1];
    const x = onHorizontal ? Math.random() * worldWidth : band.x + Math.random() * band.w;
    const y = onHorizontal ? band.y + Math.random() * band.h : Math.random() * worldHeight;
    const type = pick(CAR_TYPE_IDS);
    // Roughly aligned with the road direction (parked, not spun out), with a little natural variance.
    const rotation = (onHorizontal ? 0 : Math.PI / 2) + (Math.random() - 0.5) * 0.35;

    const size = CAR_SIZE[type] || DEFAULT_CAR_COLLIDER;
    const rotatedSideways = Math.abs(Math.cos(rotation)) < 0.5;
    const boxW = rotatedSideways ? size.h : size.w;
    const boxH = rotatedSideways ? size.w : size.h;
    const testRadius = Math.max(boxW, boxH) / 2 + CAR_MIN_GAP;
    if (CollisionSystem.circleIntersectsWalls(x, y, testRadius, collidersForPlacement)) continue;

    decorations.push({ x, y, type, rotation });
    const carCollider = { x: x - boxW / 2, y: y - boxH / 2, width: boxW, height: boxH, isCar: true };
    carColliders.push(carCollider);
    collidersForPlacement.push(carCollider);
    carsPlaced++;
  }

  // --- trees, scattered across open ground away from roads/buildings/cemetery ---
  // Solid, static meshes - the player walks around them, not through them.
  let treesPlaced = 0;
  const treeTarget = layout.treeCount || 0;
  for (let attempt = 0; attempt < 500 && treesPlaced < treeTarget; attempt++) {
    const x = 150 + Math.random() * (worldWidth - 300);
    const y = 150 + Math.random() * (worldHeight - 300);
    if (isInsideAny(x, y, roadBands) || (cemeteryZone && isInsideRect(x, y, cemeteryZone)) || CollisionSystem.circleIntersectsWalls(x, y, 60, collidersForPlacement)) continue;
    if (biomeId === 'farm') {
      // Mix the procedural tree with the real Happy Harvest tree sprite for variety.
      if (Math.random() < 0.35) {
        decorations.push({ x, y, type: 'tree_happyharvest', rotation: 0 });
      } else {
        decorations.push({ x, y, type: 'tree', scale: 0.8 + Math.random() * 0.6 });
      }
    } else {
      decorations.push({ x, y, tileId: pick(['tree_1', 'tree_2', 'tree_3', 'tree_4']), drawWidth: 90, drawHeight: 90, rotation: 0 });
    }
    pushSmallCollider(staticColliders, x, y, TREE_COLLIDER_RADIUS);
    collidersForPlacement.push(staticColliders[staticColliders.length - 1]);
    treesPlaced++;
  }

  // --- corpses (human + zombie), scattered generously across the whole map ---
  const corpseTarget = layout.corpseCount || 0;
  for (let i = 0; i < corpseTarget; i++) {
    const x = 100 + Math.random() * (worldWidth - 200);
    const y = 100 + Math.random() * (worldHeight - 200);
    if (CollisionSystem.circleIntersectsWalls(x, y, 30, collidersForPlacement)) continue;
    if (Math.random() < 0.3) {
      decorations.push({ x, y, tileId: pick(['corpse_flies_1', 'corpse_flies_2', 'corpse_flies_3']), drawWidth: 70, drawHeight: 70, rotation: Math.random() * Math.PI * 2 });
    } else {
      decorations.push({
        x, y,
        type: Math.random() < 0.5 ? 'humanCorpse' : 'zombieCorpse',
        rotation: Math.random() * Math.PI * 2,
      });
    }
  }

  // --- biome-flavor extra decorations, scattered lightly across open ground ---
  scatterFlavorDecorations(biomeId, worldWidth, worldHeight, roadBands, cemeteryZone, collidersForPlacement, decorations);

  // --- small ground clutter (clover/rocks), scattered across every biome ---
  scatterProps(worldWidth, worldHeight, roadBands, cemeteryZone, collidersForPlacement, decorations);

  // --- level-exit tombstone gate: a pair of solid tombstones near the far
  // edge of the map, straddling the vertical road so it's a natural
  // landmark to walk toward. Once the level's waves are cleared, walking
  // between the two tombstones advances to the next level (see
  // Game._updateExitGate) - they stay solid the whole time, you walk
  // through the gap, not through the stones themselves.
  const gateX = worldWidth / 2;
  const gateY = worldHeight * 0.06;
  const exitGate = placeExitGate(gateX, gateY, decorations, staticColliders);

  return {
    walls,
    carColliders,
    staticColliders,
    decorations,
    exitGate,
    getGroundZone(x, y) {
      if (isInsideAny(x, y, roadBands)) return 'road';
      if (cemeteryZone && isInsideRect(x, y, cemeteryZone)) return 'cemetery';
      return 'field';
    },
  };
}

function placeExitGate(gateX, gateY, decorations, staticColliders) {
  const leftX = gateX - EXIT_GATE_TOMBSTONE_SPACING / 2;
  const rightX = gateX + EXIT_GATE_TOMBSTONE_SPACING / 2;
  decorations.push({ x: leftX, y: gateY, tileId: 'tombstone_1', drawWidth: 60, drawHeight: 70 });
  decorations.push({ x: rightX, y: gateY, tileId: 'tombstone_1', drawWidth: 60, drawHeight: 70 });
  pushSmallCollider(staticColliders, leftX, gateY, EXIT_GATE_TOMBSTONE_RADIUS);
  pushSmallCollider(staticColliders, rightX, gateY, EXIT_GATE_TOMBSTONE_RADIUS);
  return { x: gateX, y: gateY, triggerRadius: EXIT_GATE_TRIGGER_RADIUS };
}

// --- per-biome building placement ---

function buildFarmBuildings(worldWidth, worldHeight, walls, decorations, collidersForPlacement, staticColliders) {
  const clusterCx = worldWidth * 0.78;
  const clusterCy = worldHeight * 0.75;
  const farmhouse = { x: clusterCx - 220, y: clusterCy, w: 260, h: 200 };
  const barn = { x: clusterCx + 160, y: clusterCy + 60, w: 300, h: 220 };
  walls.push(new Wall(farmhouse.x, farmhouse.y, farmhouse.w, farmhouse.h));
  walls.push(new Wall(barn.x, barn.y, barn.w, barn.h));
  // DecorationRenderer draws EnvironmentSprites centered at deco.x/y, but
  // farmhouse/barn are {x,y,w,h} top-left rects (matching the Wall above) -
  // center the decoration so the visible building actually lines up with
  // its own collision box instead of sitting offset by half its size.
  decorations.push({ x: farmhouse.x + farmhouse.w / 2, y: farmhouse.y + farmhouse.h / 2, type: 'farmhouse' });
  decorations.push({ x: barn.x + barn.w / 2, y: barn.y + barn.h / 2, type: 'barn' });

  // Bounding box of both buildings' full footprints (not just their x/y
  // anchors) - using just the anchors left the barn's far/bottom edges
  // poking out past the fence line, since it sits further right/down than
  // the farmhouse by less than its own width/height.
  const fenceMargin = 160;
  const clusterMinX = Math.min(farmhouse.x, barn.x);
  const clusterMinY = Math.min(farmhouse.y, barn.y);
  const clusterMaxX = Math.max(farmhouse.x + farmhouse.w, barn.x + barn.w);
  const clusterMaxY = Math.max(farmhouse.y + farmhouse.h, barn.y + barn.h);
  const fx = clusterMinX - fenceMargin;
  const fy = clusterMinY - fenceMargin;
  const fw = (clusterMaxX - clusterMinX) + fenceMargin * 2;
  const fh = (clusterMaxY - clusterMinY) + fenceMargin * 2;
  addFenceLine(decorations, fx, fy, fx + fw, fy, null, staticColliders, collidersForPlacement);
  addFenceLine(decorations, fx, fy + fh, fx + fw, fy + fh, null, staticColliders, collidersForPlacement);
  addFenceLine(decorations, fx, fy, fx, fy + fh, null, staticColliders, collidersForPlacement);
  addFenceLine(decorations, fx + fw, fy, fx + fw, fy + fh, null, staticColliders, collidersForPlacement);

  for (const w of walls) collidersForPlacement.push(w);

  // A few standalone neighboring houses dotted around the open farmland,
  // away from the main farmhouse/barn cluster - mixes the small Happy
  // Harvest house with the bigger, more detailed barn-style house for
  // variety. Solid, same as every other building.
  const HOUSE_TYPES = [
    { type: 'house_happyharvest', w: 90, h: 135 },
    { type: 'house_barn', w: 170, h: 170 },
  ];
  const houseTarget = 4;
  let housesPlaced = 0;
  for (let attempt = 0; attempt < houseTarget * 20 && housesPlaced < houseTarget; attempt++) {
    const houseType = pick(HOUSE_TYPES);
    const { w, h } = houseType;
    const x = 300 + Math.random() * (worldWidth - 600 - w);
    const y = 300 + Math.random() * (worldHeight - 600 - h);
    const testRadius = Math.max(w, h) / 2 + 60;
    if (CollisionSystem.circleIntersectsWalls(x + w / 2, y + h / 2, testRadius, collidersForPlacement)) continue;

    const houseWall = new Wall(x, y, w, h);
    walls.push(houseWall);
    collidersForPlacement.push(houseWall);
    decorations.push({ x: x + w / 2, y: y + h / 2, type: houseType.type, rotation: 0 });
    housesPlaced++;
  }
}

const ROOF_COLORS = {
  desert: '#8a4a2a',
  city: '#3a3a3a',
  marine_base: '#4a5a3a',
  army_base: '#3a4a2a',
  area51: '#7a7a7a',
};

function buildDesertBuildings(worldWidth, worldHeight, walls, decorations, collidersForPlacement) {
  const roofColor = ROOF_COLORS.desert;
  const cx = worldWidth * 0.7;
  const cy = worldHeight * 0.3;
  const outpost = { x: cx, y: cy, w: 200, h: 160 };
  walls.push(new Wall(outpost.x, outpost.y, outpost.w, outpost.h));
  decorations.push({ x: outpost.x + outpost.w / 2, y: outpost.y + outpost.h / 2, tileId: 'building_small_1', drawWidth: outpost.w, drawHeight: outpost.h, isBuilding: true, roofColor });

  const gasStation = { x: worldWidth * 0.25, y: worldHeight * 0.6, w: 220, h: 160 };
  walls.push(new Wall(gasStation.x, gasStation.y, gasStation.w, gasStation.h));
  // Bright canopy-yellow roof so it reads as a gas station, not just another building.
  decorations.push({ x: gasStation.x + gasStation.w / 2, y: gasStation.y + gasStation.h / 2, tileId: 'gas_station_1', drawWidth: gasStation.w, drawHeight: gasStation.h, isBuilding: true, roofColor: '#d4af37' });

  for (const w of walls) collidersForPlacement.push(w);
}

function buildCityBuildings(worldWidth, worldHeight, roadBands, walls, decorations, collidersForPlacement) {
  const target = 12;
  let placed = 0;
  for (let attempt = 0; attempt < target * 20 && placed < target; attempt++) {
    const w = 220 + Math.random() * 220;
    const h = 180 + Math.random() * 200;
    const x = 300 + Math.random() * (worldWidth - 600 - w);
    const y = 300 + Math.random() * (worldHeight - 600 - h);
    if (isInsideAny(x, y, roadBands) || isInsideAny(x + w, y + h, roadBands)) continue;
    const testRadius = Math.max(w, h) / 2 + 50;
    if (CollisionSystem.circleIntersectsWalls(x + w / 2, y + h / 2, testRadius, collidersForPlacement)) continue;

    const wall = new Wall(x, y, w, h);
    walls.push(wall);
    collidersForPlacement.push(wall);
    const tileId = Math.random() < 0.5
      ? pick(['building_big_1', 'building_big_2', 'building_big_3', 'building_big_4'])
      : pick(['building_small_1', 'building_small_2', 'building_small_3', 'building_small_4']);
    decorations.push({ x: x + w / 2, y: y + h / 2, tileId, drawWidth: w, drawHeight: h, isBuilding: true, roofColor: ROOF_COLORS.city });
    placed++;
  }
}

function buildFortifiedCompound(worldWidth, worldHeight, walls, decorations, collidersForPlacement, scale, biomeId, staticColliders) {
  const roofColor = ROOF_COLORS[biomeId] || ROOF_COLORS.marine_base;
  const cx = worldWidth / 2;
  const cy = worldHeight * 0.4;
  const buildingCount = Math.round(4 * scale);
  const spanX = 900 * scale;
  const spanY = 700 * scale;

  let placed = 0;
  const perimeterMargin = 260;
  let minX = cx, maxX = cx, minY = cy, maxY = cy;
  for (let attempt = 0; attempt < buildingCount * 20 && placed < buildingCount; attempt++) {
    const w = 240 + Math.random() * 160;
    const h = 200 + Math.random() * 140;
    const x = cx - spanX / 2 + Math.random() * spanX;
    const y = cy - spanY / 2 + Math.random() * spanY;
    const testRadius = Math.max(w, h) / 2 + 60;
    if (CollisionSystem.circleIntersectsWalls(x + w / 2, y + h / 2, testRadius, collidersForPlacement)) continue;

    const wall = new Wall(x, y, w, h);
    walls.push(wall);
    collidersForPlacement.push(wall);
    decorations.push({ x: x + w / 2, y: y + h / 2, tileId: pick(['building_big_1', 'building_big_2', 'building_big_3', 'building_big_4']), drawWidth: w, drawHeight: h, isBuilding: true, roofColor });
    minX = Math.min(minX, x); maxX = Math.max(maxX, x + w);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y + h);
    placed++;
  }

  // Barricaded perimeter around whatever actually got placed.
  const px = minX - perimeterMargin;
  const py = minY - perimeterMargin;
  const pw = (maxX - minX) + perimeterMargin * 2;
  const ph = (maxY - minY) + perimeterMargin * 2;
  addFenceLine(decorations, px, py, px + pw, py, 'terrain_wall_1', staticColliders, collidersForPlacement);
  addFenceLine(decorations, px, py + ph, px + pw, py + ph, 'terrain_wall_1', staticColliders, collidersForPlacement);
  addFenceLine(decorations, px, py, px, py + ph, 'terrain_wall_1', staticColliders, collidersForPlacement);
  addFenceLine(decorations, px + pw, py, px + pw, py + ph, 'terrain_wall_1', staticColliders, collidersForPlacement);

  // A helipad marker on open ground near the compound, and a couple of
  // solid watchtowers along the perimeter - blueprint-style military base
  // flavor (see DecorationRenderer's military_helipad/military_watchtower).
  decorations.push({ x: px + pw * 0.5, y: py + ph + 220, type: 'military_helipad', rotation: 0 });

  const towerSpots = [
    { x: px + 30, y: py + 30 },
    { x: px + pw - 30, y: py + ph - 30 },
  ];
  for (const spot of towerSpots) {
    const tw = 40, th = 55;
    const towerWall = new Wall(spot.x - tw / 2, spot.y - th / 2, tw, th);
    walls.push(towerWall);
    collidersForPlacement.push(towerWall);
    decorations.push({ x: spot.x, y: spot.y, type: 'military_watchtower', rotation: 0 });
  }
}

function buildArea51Facility(worldWidth, worldHeight, walls, decorations, collidersForPlacement, staticColliders) {
  const roofColor = ROOF_COLORS.area51;
  const cx = worldWidth / 2;
  const cy = worldHeight / 2;

  // Main facility - the boss arena backdrop, still the biggest structure -
  // plus a couple of smaller satellite outbuildings so the compound reads
  // as an actual secure site instead of one lone box, with a perimeter
  // fence tying it together like the marine/army compounds.
  const facility = { x: cx - 260, y: cy - 200, w: 520, h: 400 };
  const mainWall = new Wall(facility.x, facility.y, facility.w, facility.h);
  walls.push(mainWall);
  collidersForPlacement.push(mainWall);
  decorations.push({ x: facility.x + facility.w / 2, y: facility.y + facility.h / 2, tileId: 'building_big_1', drawWidth: facility.w, drawHeight: facility.h, isBuilding: true, roofColor });

  const outbuildings = [
    { x: facility.x - 340, y: facility.y + 60, w: 180, h: 150 },
    { x: facility.x + facility.w + 160, y: facility.y + 100, w: 200, h: 160 },
  ];
  for (const b of outbuildings) {
    const wall = new Wall(b.x, b.y, b.w, b.h);
    walls.push(wall);
    collidersForPlacement.push(wall);
    decorations.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, tileId: pick(['building_small_1', 'building_small_2', 'building_small_3', 'building_small_4']), drawWidth: b.w, drawHeight: b.h, isBuilding: true, roofColor });
  }

  const perimeterMargin = 300;
  const px = facility.x - 340 - perimeterMargin;
  const py = facility.y - perimeterMargin;
  const pw = (facility.x + facility.w + 160 + 200) - px + perimeterMargin;
  const ph = facility.h + perimeterMargin * 2;
  addFenceLine(decorations, px, py, px + pw, py, 'terrain_wall_1', staticColliders, collidersForPlacement);
  addFenceLine(decorations, px, py + ph, px + pw, py + ph, 'terrain_wall_1', staticColliders, collidersForPlacement);
  addFenceLine(decorations, px, py, px, py + ph, 'terrain_wall_1', staticColliders, collidersForPlacement);
  addFenceLine(decorations, px + pw, py, px + pw, py + ph, 'terrain_wall_1', staticColliders, collidersForPlacement);
}

// --- small ground clutter, every open-world biome ---

const PROPS_COUNT = 25;
const PROPS_SIZE = 36;

function scatterProps(worldWidth, worldHeight, roadBands, cemeteryZone, colliders, decorations) {
  let placed = 0;
  for (let attempt = 0; attempt < PROPS_COUNT * 12 && placed < PROPS_COUNT; attempt++) {
    const x = 150 + Math.random() * (worldWidth - 300);
    const y = 150 + Math.random() * (worldHeight - 300);
    if (isInsideAny(x, y, roadBands) || (cemeteryZone && isInsideRect(x, y, cemeteryZone))) continue;
    if (CollisionSystem.circleIntersectsWalls(x, y, PROPS_SIZE * 0.6, colliders)) continue;
    decorations.push({ x, y, type: pick(['prop_clover', 'prop_rock']), rotation: Math.random() * Math.PI * 2 });
    placed++;
  }
}

// --- light per-biome flavor decorations (crops/scarecrow/windmill/urban/broken cars) ---

function scatterFlavorDecorations(biomeId, worldWidth, worldHeight, roadBands, cemeteryZone, colliders, decorations) {
  const flavor = {
    // Real Happy Harvest crop sprites (deco.type, tinted by nothing - own
    // colors) instead of the tileset's generic crops_1..4 - this is the
    // "keep the crop side on the ground" half of that pack; the carrot
    // icon (deco/health_crop) is the other half, used as a health pickup.
    farm: [{ type: ['crop_bush', 'crop_fruiting', 'crop_sprout'], count: 40, size: 60 }, { tileId: ['scarecrow_1', 'scarecrow_2'], count: 3, size: 90 }, { tileId: ['windmill_1'], count: 1, size: 200 }],
    city: [{ tileId: ['broken_cars_1', 'broken_cars_2', 'broken_cars_3'], count: 14, size: 100 }, { tileId: ['urban_1', 'urban_2', 'urban_3', 'urban_4'], count: 16, size: 70 }],
    marine_base: [{ tileId: ['broken_cars_1', 'broken_cars_2'], count: 6, size: 100 }],
    army_base: [{ tileId: ['broken_cars_1', 'broken_cars_2', 'broken_cars_3'], count: 8, size: 100 }],
  }[biomeId];
  if (!flavor) return;

  for (const group of flavor) {
    let placed = 0;
    for (let attempt = 0; attempt < group.count * 12 && placed < group.count; attempt++) {
      const x = 150 + Math.random() * (worldWidth - 300);
      const y = 150 + Math.random() * (worldHeight - 300);
      if (isInsideAny(x, y, roadBands) || (cemeteryZone && isInsideRect(x, y, cemeteryZone))) continue;
      if (CollisionSystem.circleIntersectsWalls(x, y, group.size * 0.6, colliders)) continue;
      const art = group.type ? { type: pick(group.type) } : { tileId: pick(group.tileId) };
      decorations.push({ x, y, ...art, drawWidth: group.size, drawHeight: group.size, rotation: Math.random() * Math.PI * 2 });
      placed++;
    }
  }
}

// --- subway: a winding corridor made of solid blocks around a snake path ---

function buildSubwayEnvironment(worldWidth, worldHeight, boundaryWalls, layout) {
  const cols = 6;
  const rows = 4;
  const cellW = worldWidth / cols;
  const cellH = worldHeight / rows;

  // A simple zigzag path through the grid - every other cell in the path
  // stays open (the "rooms"), everything else becomes a solid block, so the
  // player is funneled through a winding tunnel using nothing but ordinary
  // Wall rects.
  const path = new Set([
    '0,0', '1,0', '2,0', '2,1', '2,2', '3,2', '4,2', '4,1', '4,0', '5,0', '5,1', '5,2', '5,3', '4,3', '3,3', '2,3', '1,3', '1,2', '1,1', '0,1',
  ]);

  const walls = [];
  const decorations = [];
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      if (path.has(`${cx},${cy}`)) continue;
      walls.push(new Wall(cx * cellW, cy * cellH, cellW, cellH));
    }
  }

  for (let i = 0; i < 20; i++) {
    // Only scatter within path cells so decorations never land inside a
    // solid block.
    const cellKeys = Array.from(path);
    const [cx, cy] = cellKeys[Math.floor(Math.random() * cellKeys.length)].split(',').map(Number);
    const x = cx * cellW + cellW * 0.5 + (Math.random() - 0.5) * cellW * 0.6;
    const y = cy * cellH + cellH * 0.5 + (Math.random() - 0.5) * cellH * 0.6;
    decorations.push({ x, y, tileId: pick(['corpse_flies_1', 'corpse_flies_2', 'corpse_flies_3']), drawWidth: 70, drawHeight: 70, rotation: Math.random() * Math.PI * 2 });
  }

  // Exit gate sits in the far corner cell of the maze (5,3), the point
  // furthest from the player's spawn at world-center.
  const staticColliders = [];
  const gateX = 5 * cellW + cellW * 0.5;
  const gateY = 3 * cellH + cellH * 0.5;
  const exitGate = placeExitGate(gateX, gateY, decorations, staticColliders);

  return {
    walls,
    carColliders: [],
    staticColliders,
    decorations,
    exitGate,
    getGroundZone() {
      return 'road'; // the whole subway reads as paved/underground
    },
  };
}

// --- shared helpers ---

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// FENCE_COLLIDER_THICKNESS is a solid invisible strip spanning the full
// line (staticColliders, not a Wall) - same "collide without being drawn as
// brick" idea as pushSmallCollider for trees/gravestones, so the thin
// fence-post/rail decorations keep their real look instead of being
// replaced by Wall's tiled brick texture. Every current call site is
// strictly axis-aligned (a rectangle's four sides), so a plain
// horizontal-or-vertical rect is enough - no rotation support needed.
const FENCE_COLLIDER_THICKNESS = 26;

function addFenceLine(decorations, x1, y1, x2, y2, tileId = null, staticColliders = null, collidersForPlacement = null) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const segments = Math.max(1, Math.round(length / 96));
  const angle = Math.atan2(dy, dx);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    if (tileId) {
      decorations.push({ x: x1 + dx * t, y: y1 + dy * t, tileId, drawWidth: 90, drawHeight: 90, rotation: angle });
    } else {
      decorations.push({ x: x1 + dx * t, y: y1 + dy * t, type: 'fencePost', rotation: angle });
      if (i < segments) {
        decorations.push({ x: x1 + dx * (t + 0.5 / segments), y: y1 + dy * (t + 0.5 / segments), type: 'fenceRail', rotation: angle });
      }
    }
  }

  if (staticColliders) {
    const t = FENCE_COLLIDER_THICKNESS;
    const rect = dy === 0
      ? { x: Math.min(x1, x2), y: y1 - t / 2, width: Math.abs(dx), height: t }
      : { x: x1 - t / 2, y: Math.min(y1, y2), width: t, height: Math.abs(dy) };
    staticColliders.push(rect);
    if (collidersForPlacement) collidersForPlacement.push(rect);
  }
}

function isInsideRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function isInsideAny(x, y, rects) {
  return rects.some((r) => isInsideRect(x, y, r));
}
