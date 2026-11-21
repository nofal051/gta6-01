// The weapon system — four guns, ammo, pickups, and a shop.
//
// Round two shipped one gun: a pistol with a shared ammo pool. This
// module gives the player a small armoury instead. Each weapon has
// its own feel — the pistol is steady and cheap, the SMG sprays fast
// and wild, the shotgun throws a fan of pellets up close, the rifle
// hits hard at range — and its own ammo count, so switching guns
// mid-fight is a real decision. Guns and ammo come from two places:
// weapon pickups lying around the city (a crate by the port, a box on
// the boardwalk) and the ammunition store, where cash buys a new gun
// or a refill box for the one in hand.
//
// Firing lives here now: fireWeapon reads the current gun's rate,
// damage and spread, pushes bullets that carry their own damage, and
// keeps a per-weapon cooldown so the SMG cannot fire like a rifle.
// The bullet step in combat.js spends bullets the same way whatever
// gun fired them, so nothing else in combat had to change.
import { AMMO_BOX, AMMO_PRICE, WEAPON_PRICES } from './config.js';
import { BULLET_SPEED } from './config.js';
import { addWanted } from './player.js';
import { scarePedestrians } from './pedestrians.js';

// One-line flavour for the shop menu and the phone stats tab.
export const WEAPON_DESCS = {
  pistol: 'Steady, cheap, always with you.',
  smg: 'Sprays fast and wild up close.',
  shotgun: 'Five pellets, one loud argument.',
  rifle: 'Hits hard, reaches far, kicks slow.',
};

// A full line about one gun: name, damage, rate and ammo on hand.
export function weaponInfo(state, key) {
  const gun = WEAPONS[key];
  const held = state.weapons.owned[key];
  const ammo = held ? held.ammo : 0;
  return `${gun.name} — ${gun.damage} dmg · ${gun.rate}s between shots · ${ammo} rounds · ${WEAPON_DESCS[key]}`;
}
// The armoury. `damage` is per bullet, `rate` is seconds between
// shots, `spread` is the random cone in radians, `pellets` is how
// many bullets one trigger pull throws, `range` is bullet lifetime.
export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, rate: 0.28, spread: 0.03, pellets: 1, range: 0.9, sound: 'shot' },
  smg: { name: 'SMG', damage: 18, rate: 0.09, spread: 0.12, pellets: 1, range: 0.7, sound: 'shot' },
  shotgun: { name: 'Shotgun', damage: 22, rate: 0.7, spread: 0.22, pellets: 5, range: 0.5, sound: 'shot' },
  rifle: { name: 'Rifle', damage: 70, rate: 0.55, spread: 0.01, pellets: 1, range: 1.4, sound: 'shot' },
};

export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'rifle'];

// The ammunition store: a shopfront on the north-west side of the
// city, between the spawn corner and the park.
export function createWeapons(world, rng) {
  const shop = {
    x: world.roadsX[1] + 48,
    y: world.roadsY[2] + 48,
    w: 150,
    h: 100,
    menuOpen: false,
    dismissed: false,
    selected: 0,
    message: '',
    messageTimer: 0,
  };
  // Three weapon pickups seeded around the city: port, boardwalk,
  // and the park's south corner. Taken ones come back after a while,
  // at the same spot, so the streets keep arming the player.
  const pickups = [
    { x: world.port.x + 40, y: world.port.y + 60, kind: 'smg', taken: false, respawn: 0 },
    { x: world.beach.x + 30, y: world.roadsY[1], kind: 'shotgun', taken: false, respawn: 0 },
    { x: world.park.x + world.park.w - 30, y: world.park.y + world.park.h - 30, kind: 'rifle', taken: false, respawn: 0 },
  ];
  return {
    shop,
    pickups,
    current: 'pistol',
    owned: { pistol: { ammo: 24 } },
    cooldown: 0,
    // Which row of the shop menu the cursor sits on.
    shopIndex: 0,
  };
}

// Is the player close enough to the ammunition store to shop?
export function nearWeaponShop(weapons, player) {
  const s = weapons.shop;
  return (
    player.x > s.x - 60 &&
    player.x < s.x + s.w + 60 &&
    player.y > s.y - 60 &&
    player.y < s.y + s.h + 60
  );
}

// The ammo the HUD shows: the current gun's own box.
export function currentAmmo(state) {
  const held = state.weapons.owned[state.weapons.current];
  return held ? held.ammo : 0;
}

// Cycle to the next owned gun (V). The player's legacy ammo counter
// follows, so the old HUD line and the save file stay meaningful.
export function cycleWeapon(state) {
  const owned = WEAPON_ORDER.filter((key) => state.weapons.owned[key]);
  if (owned.length < 2) return null;
  const at = owned.indexOf(state.weapons.current);
  state.weapons.current = owned[(at + 1) % owned.length];
  state.player.ammo = currentAmmo(state);
  return state.weapons.current;
}

// Fire the current gun. On foot only, and only when its cooldown has
// run out and it still has a round in the box. A shotgun pull throws
// five pellets in a fan; every other gun throws one bullet straight
// down the aim line with a little spread. Each shot is still a crime.
export function fireWeapon(state, audio) {
  const p = state.player;
  const w = state.weapons;
  if (!p.onFoot) return false;
  if (w.cooldown > 0) return false;
  const key = w.current;
  const gun = WEAPONS[key];
  const held = w.owned[key];
  if (!held || held.ammo <= 0 || !gun) return false;
  held.ammo -= 1;
  p.ammo = held.ammo;
  w.cooldown = gun.rate;
  const aim = state.aimAngle;
  for (let i = 0; i < gun.pellets; i += 1) {
    const angle = aim + (state.rng() - 0.5) * 2 * gun.spread;
    state.bullets.push({
      x: p.x + Math.cos(angle) * 20,
      y: p.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      life: gun.range,
      damage: gun.damage,
    });
  }
  state.muzzle = { x: p.x + Math.cos(aim) * 24, y: p.y + Math.sin(aim) * 24, angle: aim, life: 0.09 };
  if (audio && audio.shot) audio.shot();
  scarePedestrians(state.peds, p.x, p.y, 320);
  addWanted(p, 1, state.events);
  return true;
}

// Buy the gun at `index` in the shop list, or a refill box when the
// row is the ammo row. A bought gun arrives with a starter box.
export function buyWeapon(state, index, audio) {
  const p = state.player;
  const w = state.weapons;
  if (index === WEAPON_ORDER.length) {
    if (p.cash < AMMO_PRICE) return { ok: false, message: `Need $${AMMO_PRICE} for an ammo box` };
    p.cash -= AMMO_PRICE;
    w.owned[w.current].ammo += AMMO_BOX;
    p.ammo = w.owned[w.current].ammo;
    if (audio && audio.cash) audio.cash();
    return { ok: true, message: `+${AMMO_BOX} rounds for the ${WEAPONS[w.current].name}` };
  }
  const key = WEAPON_ORDER[index];
  const gun = WEAPONS[key];
  if (w.owned[key]) return { ok: false, message: `Already own the ${gun.name}` };
  const price = WEAPON_PRICES[key];
  if (p.cash < price) return { ok: false, message: `Need $${price} for the ${gun.name}` };
  p.cash -= price;
  w.owned[key] = { ammo: AMMO_BOX };
  if (audio && audio.cash) audio.cash();
  return { ok: true, message: `${gun.name} bought — press V to switch to it` };
}

// The shop menu lines the HUD draws while the store is open.
export function weaponShopLines(state) {
  const p = state.player;
  const w = state.weapons;
  const lines = ['BAY AMMO — 1-4 buy gun · 5 ammo box · N/Esc close'];
  lines.push(`Cash $${p.cash} — carrying: ${WEAPON_ORDER.filter((k) => w.owned[k]).map((k) => `${WEAPONS[k].name} (${w.owned[k].ammo})`).join(', ')}`);
  WEAPON_ORDER.forEach((key, i) => {
    const gun = WEAPONS[key];
    const owned = w.owned[key];
    const cursor = w.shopIndex === i ? '► ' : '  ';
    lines.push(`${cursor}${i + 1}. ${gun.name} — $${WEAPON_PRICES[key]}${owned ? ` · OWNED (${owned.ammo} rounds)` : ''}`);
  });
  lines.push(`  5. Ammo box (+${AMMO_BOX} for ${WEAPONS[w.current].name}) — $${AMMO_PRICE}`);
  if (w.shop.message) lines.push(w.shop.message);
  return lines;
}

// Cool the gun down, and let the player walk over a weapon pickup to
// claim the gun inside it with a starter box.
export function updateWeapons(state, dt, audio) {
  const w = state.weapons;
  if (w.cooldown > 0) w.cooldown -= dt;
  if (w.shop.messageTimer > 0) w.shop.messageTimer -= dt;
  const p = state.player;
  for (const pickup of w.pickups) {
    if (pickup.taken) {
      pickup.respawn -= dt;
      if (pickup.respawn <= 0) pickup.taken = false;
      continue;
    }
    if (Math.hypot(p.x - pickup.x, p.y - pickup.y) >= 36) continue;
    pickup.taken = true;
    pickup.respawn = 90 + state.rng() * 60;
    if (!w.owned[pickup.kind]) w.owned[pickup.kind] = { ammo: AMMO_BOX };
    else w.owned[pickup.kind].ammo += AMMO_BOX;
    p.ammo = currentAmmo(state);
    state.events.push({ type: 'pickup', weapon: pickup.kind });
    if (audio && audio.pickup) audio.pickup();
  }
}
