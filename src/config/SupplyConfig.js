// Data-driven registry for collectible supplies. Each `apply(player)`
// returns a notification message, or null if the caller (Player.pickupWeapon,
// for the weapon crate's "found a new gun" case) already queued its own.
export const SupplyConfig = {
  medkit: {
    id: 'medkit',
    displayName: 'Medical Kit',
    iconFolder: 'assets/items/medkit/',
    apply(player) {
      player.heal(50);
      return 'Used Medical Kit (+50 HP)';
    },
  },
  bandages: {
    id: 'bandages',
    displayName: 'Bandages',
    iconFolder: 'assets/items/bandages/',
    apply(player) {
      player.heal(20);
      return 'Used Bandages (+20 HP)';
    },
  },
  ammo_box: {
    id: 'ammo_box',
    displayName: 'Ammo Box',
    iconFolder: 'assets/items/ammo_box/',
    apply(player) {
      const gained = player.refillAmmo(20);
      return gained > 0 ? `Restocked ammo (+${gained} rounds)` : 'Picked up Ammo Box';
    },
  },
  weapon_crate: {
    id: 'weapon_crate',
    displayName: 'Weapon Crate',
    iconFolder: 'assets/items/weapon_crate/',
    apply(player) {
      return player.grantRandomWeapon();
    },
  },
  food: {
    id: 'food',
    displayName: 'Food',
    iconFolder: 'assets/items/food/',
    apply(player) {
      player.heal(10);
      return 'Ate Food (+10 HP)';
    },
  },
  water: {
    id: 'water',
    displayName: 'Water',
    iconFolder: 'assets/items/water/',
    apply(player) {
      player.heal(10);
      return 'Drank Water (+10 HP)';
    },
  },
  health_crop: {
    id: 'health_crop',
    displayName: 'Fresh Carrot',
    iconFolder: 'assets/items/health_crop/',
    apply(player) {
      player.heal(15);
      return 'Ate a Fresh Carrot (+15 HP)';
    },
  },
};

export const SUPPLY_IDS = Object.keys(SupplyConfig);

export function getSupplyConfig(id) {
  const config = SupplyConfig[id];
  if (!config) throw new Error(`Unknown supply id: ${id}`);
  return config;
}
