// The garage — where earned cash becomes a faster, tougher car.
//
// One garage sits in the city, marked on the map and in the world: a
// low workshop building with a forecourt. Drive a car into the
// forecourt and stop, and the garage menu opens. While it is open the
// car is parked and the world keeps moving around you, so the menu is
// a risk as well as a shop: the police do not wait.
//
//   ENGINE — three levels. Each level adds acceleration and top
//     speed to every car the player drives from then on.
//   ARMOR — two levels. Each level cuts the damage the player takes
//     in crashes and police beatings.
//   PAINT — four colours. Pure style, but the car the player drives
//     wears it, and the minimap dot changes with it.
//
// Upgrades live on the player (player.upgrades), not on one car, so
// stealing a new car never loses them. Paint applies to the car being
// driven the moment it is bought.

import { ROAD } from './config.js';

export const ENGINE_PRICES = [200, 450, 800];
export const ARMOR_PRICES = [300, 600];
export const PAINT_JOBS = [
  { name: 'Sunset Red', color: '#d94f3d', price: 80 },
  { name: 'Bay Blue', color: '#3d7fd9', price: 80 },
  { name: 'Gold Rush', color: '#e8c93a', price: 120 },
  { name: 'Midnight', color: '#2e2e34', price: 120 },
];

export function createGarage(world) {
  // The workshop block: two roads over, one road down from the spawn.
  const x = world.roadsX[2] + ROAD / 2 + 24;
  const y = world.roadsY[1] + ROAD / 2 + 24;
  return {
    x,
    y,
    w: 150,
    h: 110,
    menuOpen: false,
    // Set when the player closes the shop with Esc; cleared on leaving.
    dismissed: false,
    // Which paint row the menu cursor sits on.
    paintIndex: 0,
    // Last purchase message, shown in the menu.
    message: '',
    messageTimer: 0,
  };
}

// Driving multipliers for an engine level. Level 0 is a stock car.
export function upgradeStats(upgrades) {
  const engine = upgrades.engine || 0;
  const armor = upgrades.armor || 0;
  return {
    accelMul: 1 + engine * 0.22,
    topMul: 1 + engine * 0.16,
    brakeMul: 1 + engine * 0.08,
    // Each armor level soaks up a quarter of incoming damage.
    damageTaken: Math.max(0.5, 1 - armor * 0.25),
    engine,
    armor,
    paint: upgrades.paint || null,
  };
}

export function enginePrice(upgrades) {
  const level = upgrades.engine || 0;
  return level >= ENGINE_PRICES.length ? null : ENGINE_PRICES[level];
}

export function armorPrice(upgrades) {
  const level = upgrades.armor || 0;
  return level >= ARMOR_PRICES.length ? null : ARMOR_PRICES[level];
}

// Is the player's car parked inside the forecourt?
export function carInGarage(garage, car) {
  if (!car) return false;
  return (
    car.x > garage.x - 10 &&
    car.x < garage.x + garage.w + 10 &&
    car.y > garage.y - 10 &&
    car.y < garage.y + garage.h + 10
  );
}

// Buy one upgrade. `kind` is 'engine', 'armor' or 'paint' (with an
// index for paint). Returns { ok, message }.
export function buyUpgrade(state, kind, paintIndex, audio) {
  const p = state.player;
  const up = p.upgrades;
  if (kind === 'engine') {
    const price = enginePrice(up);
    if (price === null) return { ok: false, message: 'Engine already maxed' };
    if (p.cash < price) return { ok: false, message: `Need $${price} for Engine Lv${up.engine + 1}` };
    p.cash -= price;
    up.engine += 1;
    audio.cash();
    return { ok: true, message: `Engine Lv${up.engine} fitted — faster car!` };
  }
  if (kind === 'armor') {
    const price = armorPrice(up);
    if (price === null) return { ok: false, message: 'Armor already maxed' };
    if (p.cash < price) return { ok: false, message: `Need $${price} for Armor Lv${up.armor + 1}` };
    p.cash -= price;
    up.armor += 1;
    audio.cash();
    return { ok: true, message: `Armor Lv${up.armor} fitted — tougher car!` };
  }
  const job = PAINT_JOBS[paintIndex % PAINT_JOBS.length];
  if (!job) return { ok: false, message: 'No such paint' };
  if (p.cash < job.price) return { ok: false, message: `Need $${job.price} for ${job.name}` };
  p.cash -= job.price;
  up.paint = job.color;
  if (p.car) p.car.color = job.color;
  audio.cash();
  return { ok: true, message: `${job.name} paint applied` };
}

// The menu lines the HUD draws while the garage is open.
export function garageMenuLines(state) {
  const p = state.player;
  const up = p.upgrades;
  const engine = enginePrice(up);
  const armor = armorPrice(up);
  const paint = PAINT_JOBS[state.garage.paintIndex % PAINT_JOBS.length];
  return [
    'SOLMAR GARAGE — 1 engine · 2 armor · 3 paint · Esc close',
    `Cash $${p.cash} — Engine Lv${up.engine} ${engine === null ? '(MAX)' : `next $${engine}`}`,
    `Armor Lv${up.armor} ${armor === null ? '(MAX)' : `next $${armor}`} — Paint: ${paint.name} $${paint.price}`,
    state.garage.message,
  ];
}
