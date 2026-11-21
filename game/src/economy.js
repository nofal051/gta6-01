// The money system — cash in, cash out, and the dealership.
//
// Cash already flowed through the game (missions, taxi fares, street
// packages), but it had nowhere big to go except the garage. The
// dealership is the other end of the economy: a forecourt on the
// south-east side of the city where earned cash buys a car outright.
// A bought car is yours — it parks on the forecourt, it is listed in
// your owned garage, and it comes back from a save. The dealership
// also sells the same engine, armor and paint the garage sells, for
// the driver who would rather shop than wrench.
//
// The second half of the economy is the street itself: cash drops.
// Small bundles of banknotes spawn around the city (near the
// boardwalk, the park, the port) and respawn on a slow timer, so a
// broke driver can always earn their way back to a car. Picking one
// up pays straight into the same cash counter the HUD shows.
import { DEALER_CARS } from './config.js';
import { buyUpgrade } from './garage.js';
import { makeCar } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

// The forecourt: a block south-east of the spawn, big enough to hold
// the showroom and the cars parked outside it.
export function createEconomy(world, rng) {
  const dealer = {
    x: world.roadsX[4] + 48,
    y: world.roadsY[3] + 48,
    w: 190,
    h: 130,
    menuOpen: false,
    dismissed: false,
    // Which catalogue row the menu cursor sits on.
    selected: 0,
    message: '',
    messageTimer: 0,
  };
  // Six cash drops scattered around the city to start with.
  const drops = [];
  for (let i = 0; i < 6; i += 1) {
    const spot = nearestRoadPoint(world, 200 + rng() * 2000, 150 + rng() * 1500);
    drops.push({
      x: spot.x + (rng() < 0.5 ? -80 : 80),
      y: spot.y + (rng() < 0.5 ? -80 : 80),
      amount: 20 + Math.floor(rng() * 4) * 10,
      taken: false,
      respawn: 0,
    });
  }
  return {
    dealer,
    drops,
    // Cars bought here, kept as { kind, name, color, id }.
    owned: [],
    // Total cash ever earned, for the phone's stats tab.
    earned: 0,
    // Total cash ever spent, same reason.
    spent: 0,
    dropTimer: 45,
    // One catalogue car is on special every run, picked from the
    // seed: 20% off, same car all run, so a player can plan around it.
    dealIndex: Math.floor(rng() * DEALER_CARS.length),
    // Dario's loan: borrow $500 from the boardwalk bookie, pay back
    // $650. One loan at a time, and the bookie remembers.
    debt: 0,
  };
}

// The price of a catalogue car, with the deal-of-the-day applied.
export function dealerPrice(economy, index) {
  const item = DEALER_CARS[index % DEALER_CARS.length];
  if (!item) return 0;
  return index === economy.dealIndex ? Math.round(item.price * 0.8) : item.price;
}

// Is the player (on foot or in a car) close enough to the showroom
// door to shop? The menu opens on B, not on proximity alone, so the
// player is never trapped in a shop they did not ask for.
export function nearDealer(economy, player) {
  const d = economy.dealer;
  return (
    player.x > d.x - 60 &&
    player.x < d.x + d.w + 60 &&
    player.y > d.y - 60 &&
    player.y < d.y + d.h + 60
  );
}

// Pay `amount` out of the player's cash. Returns false when broke.
export function spendCash(state, amount) {
  if (state.player.cash < amount) return false;
  state.player.cash -= amount;
  state.economy.spent += amount;
  return true;
}

// Cash in: one place for every payout, so the lifetime total stays
// honest even when the money arrives from a mission, a fare or a drop.
export function earnCash(state, amount) {
  state.player.cash += amount;
  state.economy.earned += amount;
  return state.player.cash;
}

// Buy the catalogue car at `index`. The car is built on the
// forecourt, added to the owned list, and the player keeps whatever
// they were driving — the new car waits by the showroom door.
export function buyDealerCar(state, index, audio) {
  const p = state.player;
  const item = DEALER_CARS[index % DEALER_CARS.length];
  if (!item) return { ok: false, message: 'No such car' };
  const price = dealerPrice(state.economy, index);
  if (p.cash < price) return { ok: false, message: `Need $${price} for the ${item.name}` };
  p.cash -= price;
  state.economy.spent += price;
  const d = state.economy.dealer;
  const car = makeCar(state.cars.length + 1, d.x + d.w / 2, d.y + d.h + 34, 0, {
    rng: state.rng,
    parked: true,
    kind: item.kind,
  });
  car.name = item.name;
  state.cars.push(car);
  state.economy.owned.push({ kind: item.kind, name: item.name, color: car.color, id: car.id });
  if (audio && audio.cash) audio.cash();
  return { ok: true, message: `${item.name} is yours — parked outside!` };
}

// One catalogue row for the HUD: name, kind, price, and whether the
// player already owns one of them.
export function dealerMenuLines(state) {
  const p = state.player;
  const d = state.economy.dealer;
  const lines = ['SOLMAR MOTORS — 1-4 buy car · 5 engine · 6 armor · 7 paint · 8 sell · 9 loan · B/Esc close'];
  lines.push(`Cash $${p.cash} — owned: ${state.economy.owned.length ? state.economy.owned.map((o) => o.name).join(', ') : 'none yet'}`);
  DEALER_CARS.forEach((item, i) => {
    const owned = state.economy.owned.some((o) => o.name === item.name);
    const cursor = d.selected === i ? '► ' : '  ';
    const price = dealerPrice(state.economy, i);
    const deal = i === state.economy.dealIndex ? ' · DEAL -20%' : '';
    lines.push(`${cursor}${i + 1}. ${item.name} (${item.kind}) — $${price}${deal}${owned ? ' · OWNED' : ''}`);
  });
  lines.push('8. Sell your oldest car back for half its price');
  lines.push(state.economy.debt > 0
    ? `9. Repay Dario's loan — $${state.economy.debt} owed`
    : '9. Borrow $500 from Dario (repay $650)');
  if (d.message) lines.push(d.message);
  return lines;
}

// Borrow $500 from Dario. Only one loan at a time, and only when the
// player owes nothing — the bookie does not lend to a debtor.
export function borrowLoan(state, audio) {
  const eco = state.economy;
  if (eco.debt > 0) return { ok: false, message: `Dario: "Pay the $${eco.debt} you owe first."` };
  eco.debt = 650;
  earnCash(state, 500);
  if (audio && audio.cash) audio.cash();
  return { ok: true, message: 'Dario lent you $500. He will collect $650.' };
}

// Pay the loan back in full. Partial payments are not a thing with
// Dario — it is all of it, or none of it.
export function repayLoan(state, audio) {
  const eco = state.economy;
  if (eco.debt <= 0) return { ok: false, message: 'You owe Dario nothing.' };
  if (state.player.cash < eco.debt) return { ok: false, message: `Need $${eco.debt} to settle with Dario` };
  state.player.cash -= eco.debt;
  eco.spent += eco.debt;
  eco.debt = 0;
  if (audio && audio.cash) audio.cash();
  return { ok: true, message: 'Loan settled. Dario nods — clean slate.' };
}

// Sell the oldest owned car back to the dealership for half what it
// cost. The car is removed from the world as well as from the owned
// list, so a sold car cannot be stolen back off the forecourt.
export function sellOldestCar(state, audio) {
  const eco = state.economy;
  const owned = eco.owned[0];
  if (!owned) return { ok: false, message: 'You own no car to sell' };
  const item = DEALER_CARS.find((c) => c.name === owned.name);
  const refund = Math.round(((item ? item.price : 400) * 0.5));
  eco.owned.shift();
  const at = state.cars.findIndex((c) => c.id === owned.id);
  if (at >= 0) state.cars.splice(at, 1);
  earnCash(state, refund);
  if (audio && audio.cash) audio.cash();
  return { ok: true, message: `Sold the ${owned.name} for $${refund}` };
}

// Walk over a cash drop to pocket it. Taken drops come back after
// `dropTimer` seconds, at a fresh spot, so the streets keep paying.
export function updateEconomy(state, dt, audio) {
  const eco = state.economy;
  const p = state.player;
  for (const drop of eco.drops) {
    if (drop.taken) {
      drop.respawn -= dt;
      if (drop.respawn <= 0) {
        const spot = nearestRoadPoint(state.world, 200 + state.rng() * 2000, 150 + state.rng() * 1500);
        drop.x = spot.x;
        drop.y = spot.y;
        drop.amount = 20 + Math.floor(state.rng() * 4) * 10;
        drop.taken = false;
      }
      continue;
    }
    if (Math.hypot(p.x - drop.x, p.y - drop.y) < 34) {
      drop.taken = true;
      drop.respawn = 45 + state.rng() * 30;
      earnCash(state, drop.amount);
      state.events.push({ type: 'cash', amount: drop.amount });
      if (audio && audio.pickup) audio.pickup();
    }
  }
  if (eco.dealer.messageTimer > 0) eco.dealer.messageTimer -= dt;
}

// The dealership also sells upgrades: 5 engine, 6 armor, 7 paint.
// These are the garage's own upgrade functions, so a level bought
// here and a level bought at the garage are the same level.
export function buyDealerUpgrade(state, kind, audio) {
  if (kind === 'paint') {
    const result = buyUpgrade(state, 'paint', state.garage.paintIndex, audio);
    state.garage.paintIndex += 1;
    return result;
  }
  return buyUpgrade(state, kind, 0, audio);
}
