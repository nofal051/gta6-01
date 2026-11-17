// Missions and side work in Solmar Bay. A five-mission story chain for
// Mara Voss, a fixer who runs the harbour: learn to drive, pick up a
// package, deliver it against the clock, lose a police tail, then the
// finale — lift the harbour ledger and get clear. Plus taxi fares (pick up
// a waving local, drop them at the marker) and cash packages scattered
// around the city.
import { MISSION_REWARDS, PACKAGE_REWARD, TAXI_FARE } from './config.js';
import { nearestRoadPoint } from './world.js';

export const MISSION_DEFS = [
  { name: 'First Wheels', giver: 'Mara Voss', text: 'Steal a car, drive to the blue marina marker.', reward: 150 },
  { name: 'The Pickup', giver: 'Mara Voss', text: 'On foot or by car, reach the package at the park and grab it.', reward: 250 },
  { name: 'Hot Delivery', giver: 'Mara Voss', text: 'Deliver the package to the harbour before the timer runs out.', reward: 400, time: 75 },
  { name: 'Lose the Tail', giver: 'Mara Voss', text: 'The cops are onto you. Drop your wanted level to zero.', reward: 600 },
  { name: 'The Ledger', giver: 'Mara Voss', text: 'Grab the ledger at the east beach, then reach the hideout. No timer — stay alive.', reward: 1000 },
];

function markerFor(state, index, rng) {
  const w = state.world;
  const spots = [
    { x: w.roadsX[5], y: w.roadsY[3] },
    { x: w.park.x + w.park.w / 2, y: w.park.y + w.park.h / 2 },
    { x: w.roadsX[1], y: w.roadsY[0] },
    { x: w.roadsX[3], y: w.roadsY[2] },
    { x: w.beach.x + 40, y: w.roadsY[2] },
  ];
  return spots[index % spots.length];
}

export function createMissions(rng) {
  return {
    index: 0, active: false, started: false, done: 0,
    target: null, timer: 0, timerMax: 0, text: 'Press Q to start the next job for Mara Voss.',
    banner: '', bannerTimer: 0,
  };
}

export function startMission(state, rng) {
  const m = state.missions;
  if (m.active || m.index >= MISSION_DEFS.length) return false;
  const def = MISSION_DEFS[m.index];
  m.active = true; m.started = true;
  m.target = markerFor(state, m.index, rng);
  m.timerMax = def.time || 0; m.timer = m.timerMax;
  m.text = `${def.name}: ${def.text}`;
  m.banner = `MISSION: ${def.name}`; m.bannerTimer = 3;
  if (m.index === 3) {
    // The chase mission starts hot.
    state.player.wanted = Math.max(state.player.wanted, 2);
    state.player.wantedTimer = 0;
  }
  return true;
}

export function updateMissions(state, dt, rng, audio) {
  const m = state.missions;
  if (m.bannerTimer > 0) m.bannerTimer -= dt;
  const p = state.player;
  if (!m.active) return;
  const def = MISSION_DEFS[m.index];
  if (m.timerMax > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.active = false; m.text = 'Mission failed — out of time. Press Q to retry.';
      m.banner = 'MISSION FAILED'; m.bannerTimer = 3; audio.fail();
      return;
    }
  }
  if (!m.target) return;
  const dist = Math.hypot(p.x - m.target.x, p.y - m.target.y);
  const reach = m.index === 3 ? 0 : 46; // mission 4 completes by losing heat, not by arriving
  if (m.index === 3) {
    if (p.wanted === 0) completeMission(state, audio);
    return;
  }
  if (dist < reach) completeMission(state, audio);
}

export function completeMission(state, audio) {
  const m = state.missions;
  const def = MISSION_DEFS[m.index];
  state.player.cash += def.reward;
  m.done += 1; m.index += 1; m.active = false; m.target = null; m.timer = 0;
  m.banner = `MISSION COMPLETE  +$${def.reward}`; m.bannerTimer = 3.5;
  m.text = m.index >= MISSION_DEFS.length
    ? 'Story complete! You run Solmar Bay now. Taxi fares and packages still pay.'
    : `Job done. Press Q for the next job: ${MISSION_DEFS[m.index].name}.`;
  audio.cash();
  try { window.localStorage.setItem('solmarbay.missions.v1', String(m.done)); } catch { /* ignore */ }
}

// --- Side work: taxi fares and cash packages -----------------------------
export function createSideWork(rng, world) {
  const packages = [];
  for (let i = 0; i < 8; i += 1) {
    const spot = nearestRoadPoint(world, 200 + rng() * 2000, 150 + rng() * 1500);
    packages.push({ x: spot.x + (rng() < 0.5 ? -70 : 70), y: spot.y + (rng() < 0.5 ? -70 : 70), taken: false });
  }
  return { packages, taxi: null, taxiTimer: 0, taxiCooldown: 6 };
}

export function updateSideWork(state, dt, rng, audio) {
  const side = state.side;
  const p = state.player;
  for (const pkg of side.packages) {
    if (!pkg.taken && Math.hypot(p.x - pkg.x, p.y - pkg.y) < 34) {
      pkg.taken = true; p.cash += PACKAGE_REWARD;
      state.events.push({ type: 'cash', amount: PACKAGE_REWARD });
      audio.pickup();
    }
  }
  side.taxiCooldown -= dt;
  if (!side.taxi && side.taxiCooldown <= 0 && p.car) {
    // A local waves for a cab near the player.
    const spot = nearestRoadPoint(state.world, p.x + (rng() < 0.5 ? -300 : 300), p.y + (rng() < 0.5 ? -200 : 200));
    side.taxi = { x: spot.x, y: spot.y, dest: null, state: 'waiting', timer: 40 };
  }
  const taxi = side.taxi;
  if (!taxi) return;
  taxi.timer -= dt;
  if (taxi.timer <= 0) { side.taxi = null; side.taxiCooldown = 10; return; }
  if (taxi.state === 'waiting') {
    if (p.car && Math.hypot(p.x - taxi.x, p.y - taxi.y) < 60) {
      const dest = nearestRoadPoint(state.world, 200 + rng() * 1900, 150 + rng() * 1400);
      taxi.dest = dest; taxi.state = 'riding';
      state.events.push({ type: 'taxi-pickup' });
    }
  } else if (taxi.dest && p.car && Math.hypot(p.x - taxi.dest.x, p.y - taxi.dest.y) < 60) {
    p.cash += TAXI_FARE;
    state.events.push({ type: 'cash', amount: TAXI_FARE });
    audio.cash();
    side.taxi = null; side.taxiCooldown = 8;
  }
}
