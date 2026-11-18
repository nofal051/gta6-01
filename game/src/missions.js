// Missions and side work.
//
// The story is five jobs for Mara Voss, a fixer who runs the harbour:
// steal a car and reach the marina, pick up a package in the park,
// deliver it to the harbour against the clock, shake a police tail,
// then lift the harbour ledger from the east beach and get clear.
// Between jobs there is paid side work: taxi fares for waving locals
// and cash packages hidden around the city.
import { MISSION_REWARDS, PACKAGE_REWARD, TAXI_FARE } from './config.js';
import { nearestRoadPoint } from './world.js';

// The story chain. `time` is a countdown in seconds, only where the job
// has one. The payout lives here; config's MISSION_REWARDS mirrors it.
export const MISSION_DEFS = [
  { name: 'First Wheels', giver: 'Mara Voss', text: 'Steal a car, drive to the blue marina marker.', reward: 150 },
  { name: 'The Pickup', giver: 'Mara Voss', text: 'On foot or by car, reach the package at the park and grab it.', reward: 250 },
  { name: 'Hot Delivery', giver: 'Mara Voss', text: 'Deliver the package to the harbour before the timer runs out.', reward: 400, time: 75 },
  { name: 'Lose the Tail', giver: 'Mara Voss', text: 'The cops are onto you. Drop your wanted level to zero.', reward: 600 },
  { name: 'The Ledger', giver: 'Mara Voss', text: 'Grab the ledger at the east beach, then reach the hideout. No timer — stay alive.', reward: 1000 },
];

// One fixed destination per job, chosen from places in the city.
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
    index: 0,
    active: false,
    started: false,
    done: 0,
    target: null,
    timer: 0,
    timerMax: 0,
    text: 'Press Q to start the next job for Mara Voss.',
    banner: '',
    bannerTimer: 0,
  };
}

export function startMission(state, rng) {
  const m = state.missions;
  if (m.active || m.index >= MISSION_DEFS.length) return false;
  const def = MISSION_DEFS[m.index];
  m.active = true;
  m.started = true;
  m.target = markerFor(state, m.index, rng);
  m.timerMax = def.time || 0;
  m.timer = m.timerMax;
  m.text = `${def.name}: ${def.text}`;
  m.banner = `MISSION: ${def.name}`;
  m.bannerTimer = 3;
  if (m.index === 3) {
    // The tail job starts hot, two stars already on the player.
    state.player.wanted = Math.max(state.player.wanted, 2);
    state.player.wantedTimer = 0;
  }
  return true;
}

export function updateMissions(state, dt, rng, audio) {
  const m = state.missions;
  if (m.bannerTimer > 0) m.bannerTimer -= dt;
  if (!m.active) return;
  const p = state.player;
  const def = MISSION_DEFS[m.index];

  // A timed job fails when the clock runs out.
  if (m.timerMax > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.active = false;
      m.text = 'Mission failed — out of time. Press Q to retry.';
      m.banner = 'MISSION FAILED';
      m.bannerTimer = 3;
      audio.fail();
      return;
    }
  }
  if (!m.target) return;

  // The tail job is finished by losing the heat, not by arriving.
  if (m.index === 3) {
    if (p.wanted === 0) completeMission(state, audio);
    return;
  }
  const dist = Math.hypot(p.x - m.target.x, p.y - m.target.y);
  if (dist < 46) completeMission(state, audio);
}

export function completeMission(state, audio) {
  const m = state.missions;
  const def = MISSION_DEFS[m.index];
  state.player.cash += def.reward;
  m.done += 1;
  m.index += 1;
  m.active = false;
  m.target = null;
  m.timer = 0;
  m.banner = `MISSION COMPLETE  +$${def.reward}`;
  m.bannerTimer = 3.5;
  m.text = m.index >= MISSION_DEFS.length
    ? 'Story complete! You run Solmar Bay now. Taxi fares and packages still pay.'
    : `Job done. Press Q for the next job: ${MISSION_DEFS[m.index].name}.`;
  audio.cash();
  try {
    window.localStorage.setItem('solmarbay.missions.v1', String(m.done));
  } catch {
    // Storage may be off; the count in memory is what matters in-run.
  }
}

// --- Side work: cash packages and taxi fares ---------------------------

export function createSideWork(rng, world) {
  const packages = [];
  for (let i = 0; i < 8; i += 1) {
    const spot = nearestRoadPoint(world, 200 + rng() * 2000, 150 + rng() * 1500);
    packages.push({
      x: spot.x + (rng() < 0.5 ? -70 : 70),
      y: spot.y + (rng() < 0.5 ? -70 : 70),
      taken: false,
    });
  }
  return { packages, taxi: null, taxiTimer: 0, taxiCooldown: 6 };
}

export function updateSideWork(state, dt, rng, audio) {
  const side = state.side;
  const p = state.player;

  // Walk or drive over a cash package to pocket it.
  for (const pkg of side.packages) {
    if (pkg.taken) continue;
    if (Math.hypot(p.x - pkg.x, p.y - pkg.y) < 34) {
      pkg.taken = true;
      p.cash += PACKAGE_REWARD;
      state.events.push({ type: 'cash', amount: PACKAGE_REWARD });
      audio.pickup();
    }
  }

  // A local waves for a cab near the player, once the cooldown is over
  // and the player is in a car.
  side.taxiCooldown -= dt;
  if (!side.taxi && side.taxiCooldown <= 0 && p.car) {
    const spot = nearestRoadPoint(
      state.world,
      p.x + (rng() < 0.5 ? -300 : 300),
      p.y + (rng() < 0.5 ? -200 : 200),
    );
    side.taxi = { x: spot.x, y: spot.y, dest: null, state: 'waiting', timer: 40 };
  }

  const taxi = side.taxi;
  if (!taxi) return;
  taxi.timer -= dt;
  if (taxi.timer <= 0) {
    side.taxi = null;
    side.taxiCooldown = 10;
    return;
  }
  if (taxi.state === 'waiting') {
    // Drive up to the waving local to pick them up.
    if (p.car && Math.hypot(p.x - taxi.x, p.y - taxi.y) < 60) {
      taxi.dest = nearestRoadPoint(state.world, 200 + rng() * 1900, 150 + rng() * 1400);
      taxi.state = 'riding';
      state.events.push({ type: 'taxi-pickup' });
    }
  } else if (taxi.dest && p.car && Math.hypot(p.x - taxi.dest.x, p.y - taxi.dest.y) < 60) {
    // Drop them at the marker and get paid.
    p.cash += TAXI_FARE;
    state.events.push({ type: 'cash', amount: TAXI_FARE });
    audio.cash();
    side.taxi = null;
    side.taxiCooldown = 8;
  }
}
