// Side activities — street races, courier deliveries, stunt jumps
// and hidden crates.
//
// The story missions are the spine; these are the ways to earn cash
// between jobs, and they run entirely in the open world:
//
//   RACES — two marked circuits. Drive through the green start ring
//     in a car and the clock starts; hit every checkpoint ring in
//     order before the timer runs out. Win: $300 (Bay Loop) or $500
//     (Harbour Sprint).
//   DELIVERIES — a courier depot near the harbour hands out parcels.
//     Drive into the depot ring, take the parcel, then reach the
//     drop-off before the timer ends. $120 a run, repeatable.
//   STUNT JUMPS — three ramps on the edge of the city. Cross one
//     faster than 300 and the jump pays $50 plus $10 for every second
//     of air the ramp gave you.
//   CRATES — twelve golden crates hidden around the city (behind
//     buildings, in the park, on the beach). Walk or drive over one
//     to pocket $25. The HUD counts how many you have found.
//
// Checkpoints and ramps are world coordinates picked from the road
// grid, so they land on real streets in every seeded city.

import { nearestRoadPoint } from './world.js';
import { earnCash } from './economy.js';

const RACE_DEFS = [
  { name: 'Bay Loop', reward: 300, time: 70 },
  { name: 'Harbour Sprint', reward: 500, time: 55 },
];

export function createActivities(rng, world) {
  const races = RACE_DEFS.map((def, i) => {
    const baseX = world.roadsX[1 + i];
    const baseY = world.roadsY[1];
    const stops = [
      { x: world.roadsX[4], y: world.roadsY[1] },
      { x: world.roadsX[4], y: world.roadsY[3] },
      { x: world.roadsX[1 + i], y: world.roadsY[3] },
      { x: baseX, y: baseY },
    ];
    return {
      ...def,
      id: i,
      start: { x: baseX, y: baseY },
      checkpoints: stops,
      active: false,
      at: 0,
      timer: 0,
      best: 0,
    };
  });

  const jumps = [];
  const jumpSpots = [
    { x: world.roadsX[5], y: world.roadsY[0] },
    { x: world.roadsX[0], y: world.roadsY[3] },
    { x: world.beach.x - 60, y: world.roadsY[2] },
  ];
  for (const spot of jumpSpots) {
    jumps.push({ ...spot, w: 70, h: 40, used: 0, airBest: 0 });
  }

  const collectibles = [];
  for (let i = 0; i < 12; i += 1) {
    const spot = nearestRoadPoint(world, 180 + rng() * 2000, 140 + rng() * 1500);
    collectibles.push({
      x: spot.x + (rng() < 0.5 ? -90 : 90) + (rng() - 0.5) * 40,
      y: spot.y + (rng() < 0.5 ? -90 : 90) + (rng() - 0.5) * 40,
      taken: false,
    });
  }

  const depot = nearestRoadPoint(world, world.roadsX[4], world.roadsY[3]);
  return {
    races,
    jumps,
    collectibles,
    depot: { x: depot.x, y: depot.y },
    delivery: null,
    deliveryCooldown: 4,
    racesWon: 0,
    deliveriesDone: 0,
    jumpsDone: 0,
    cratesFound: 0,
    race: null,
    airTime: 0,
    airActive: false,
    banner: '',
    bannerTimer: 0,
  };
}

// The race the player is standing in the start ring of, if any.
function raceAtStart(act, x, y) {
  return act.races.find((r) => !r.active && Math.hypot(x - r.start.x, y - r.start.y) < 60);
}

export function startRace(act, race, audio) {
  race.active = true;
  race.at = 0;
  race.timer = race.time;
  act.race = race;
  act.banner = `RACE: ${race.name} — hit every ring!`;
  act.bannerTimer = 3;
  audio.pickup();
}

export function updateActivities(state, dt, rng, audio) {
  const act = state.activities;
  const p = state.player;
  if (act.bannerTimer > 0) act.bannerTimer -= dt;

  // Hidden crates: walk or drive over one to pocket it.
  for (const crate of act.collectibles) {
    if (crate.taken) continue;
    if (Math.hypot(p.x - crate.x, p.y - crate.y) < 32) {
      crate.taken = true;
      act.cratesFound += 1;
      earnCash(state, 25);
      state.events.push({ type: 'cash', amount: 25 });
      audio.pickup();
    }
  }

  // A race starts when the player drives into its start ring.
  if (!act.race && p.car) {
    const race = raceAtStart(act, p.x, p.y);
    if (race) startRace(act, race, audio);
  }

  // The active race: checkpoints in order, against the clock.
  const race = act.race;
  if (race) {
    race.timer -= dt;
    if (race.timer <= 0) {
      race.active = false;
      act.race = null;
      act.banner = 'RACE OVER — too slow';
      act.bannerTimer = 3;
      audio.fail();
    } else {
      const next = race.checkpoints[race.at];
      if (next && Math.hypot(p.x - next.x, p.y - next.y) < 52) {
        race.at += 1;
        audio.pickup();
        if (race.at >= race.checkpoints.length) {
          earnCash(state, race.reward);
          act.racesWon += 1;
          race.best = race.time - race.timer;
          race.active = false;
          act.race = null;
          act.banner = `RACE WON  +$${race.reward}`;
          act.bannerTimer = 3.5;
          state.events.push({ type: 'cash', amount: race.reward });
          audio.cash();
        }
      }
    }
  }

  // Courier deliveries: the depot offers a parcel, the drop pays.
  act.deliveryCooldown -= dt;
  if (!act.delivery && act.deliveryCooldown <= 0 && p.car) {
    if (Math.hypot(p.x - act.depot.x, p.y - act.depot.y) < 70) {
      const dest = nearestRoadPoint(state.world, 200 + rng() * 1900, 150 + rng() * 1400);
      act.delivery = { x: dest.x, y: dest.y, timer: 60, reward: 120 };
      state.events.push({ type: 'delivery-start' });
      audio.pickup();
    }
  }
  const del = act.delivery;
  if (del) {
    del.timer -= dt;
    if (del.timer <= 0) {
      act.delivery = null;
      act.deliveryCooldown = 8;
      act.banner = 'DELIVERY LATE — parcel lost';
      act.bannerTimer = 3;
      audio.fail();
    } else if (p.car && Math.hypot(p.x - del.x, p.y - del.y) < 56) {
      // Bike courier bonus: a delivery finished on a bike pays
      // double — the depot loves a rider who threads traffic.
      const onBike = !!p.car.isBike;
      const payout = onBike ? del.reward * 2 : del.reward;
      earnCash(state, payout);
      act.deliveriesDone += 1;
      act.delivery = null;
      act.deliveryCooldown = 6;
      act.banner = onBike ? `BIKE DELIVERY  +$${payout}` : `DELIVERED  +$${payout}`;
      act.bannerTimer = 3;
      state.events.push({ type: 'cash', amount: payout });
      audio.cash();
    }
  }

  // Stunt jumps: cross a ramp fast and the air pays.
  if (p.car && Math.abs(p.car.speed) > 300) {
    for (const jump of act.jumps) {
      if (Math.abs(p.x - jump.x) > jump.w / 2 || Math.abs(p.y - jump.y) > jump.h / 2) continue;
      if (act.airActive) continue;
      act.airActive = true;
      act.airTime = 0;
      jump.used += 1;
      p.car.speed *= 1.12;
      state.particles.push({ x: p.x, y: p.y, vx: 0, vy: -60, life: 0.8, color: '#ffd23d', size: 8, kind: 'ring' });
    }
  }
  if (act.airActive) {
    act.airTime += dt;
    if (!p.car || Math.abs(p.car.speed) < 120 || act.airTime > 2.5) {
      const bonus = 50 + Math.floor(act.airTime * 10);
      earnCash(state, bonus);
      act.jumpsDone += 1;
      act.banner = `STUNT JUMP  +$${bonus}`;
      act.bannerTimer = 3;
      state.events.push({ type: 'cash', amount: bonus });
      audio.cash();
      act.airActive = false;
    }
  }
}

// One short line for the HUD activity tracker.
export function activitySummary(act) {
  const crates = act.collectibles.filter((c) => c.taken).length;
  return `Races ${act.racesWon} · Deliveries ${act.deliveriesDone} · Jumps ${act.jumpsDone} · Crates ${crates}/12`;
}
