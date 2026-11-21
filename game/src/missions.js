// Missions and side work — three story arcs, fourteen jobs.
//
// Arc one is Mara Voss, a fixer who runs the harbour: steal a car and
// reach the marina, pick up a package in the park, deliver it to the
// harbour against the clock, shake a police tail, then lift the harbour
// ledger from the east beach and get clear.
//
// Arc two is Ilsa Crane, who runs the airfield and wants the harbour
// for herself: run a parcel to the airfield, lift a manifest from the
// port, outrun the harbour crew's interceptors, silence the informant
// at the beach, then take the harbour ledger's sister book from the
// port and become the one who runs Solmar Bay.
//
// Arc three is Dario Salas, the boardwalk bookie: collect his cut on
// the boards in two stages, run a package from the pier to the
// dealership, steal a bike for a getaway ride to the pier, then take
// his ledger from the port and finish as king of the boardwalk.
//
// Between jobs there is paid side work: taxi fares for waving locals
// and cash packages hidden around the city. The bigger side systems —
// races, courier deliveries, stunt jumps and hidden crates — live in
// activities.js and pay through the same cash counter.
import { MISSION_REWARDS, PACKAGE_REWARD, TAXI_FARE } from './config.js';
import { nearestRoadPoint } from './world.js';
import { ensureBikeNearby } from './bikes.js';
import { earnCash } from './economy.js';
import { pushPhoneMessage } from './phone.js';

// What the giver texts you after each job lands. The phone's inbox
// tab keeps them, so the story has a paper trail.
const MISSION_TEXTS = [
  'Nice wheels. You drive like you mean it.',
  'Package safe. You are quicker than you look.',
  'Delivered hot. The harbour notices that.',
  'Clean. The cops are still looking for a ghost.',
  'The ledger is mine now. One more thing — Ilsa is watching you.',
  'Parcel in. The airfield runs on time because of you.',
  'Manifest read. The port has no secrets from me now.',
  'They never even saw you. Beautiful.',
  'The informant sang, then he ran. You caught him anyway.',
  'The harbour is mine. You did that. Remember who paid you.',
  'Debt collected. The boardwalk pays its bookie.',
  'Package delivered. The boards are yours tonight.',
  'That bike ride? The whole pier saw it. Superb.',
  'The boardwalk is ours. You run Solmar Bay now — all of it.',
];

// The story chain. `time` is a countdown in seconds, only where the job
// has one. The payout lives here; config's MISSION_REWARDS mirrors it.
export const MISSION_DEFS = [
  { name: 'First Wheels', giver: 'Mara Voss', text: 'Steal a car, drive to the blue marina marker.', reward: 150 },
  { name: 'The Pickup', giver: 'Mara Voss', text: 'On foot or by car, reach the package at the park and grab it.', reward: 250 },
  { name: 'Hot Delivery', giver: 'Mara Voss', text: 'Deliver the package to the harbour before the timer runs out.', reward: 400, time: 75 },
  { name: 'Lose the Tail', giver: 'Mara Voss', text: 'The cops are onto you. Drop your wanted level to zero.', reward: 600 },
  { name: 'The Ledger', giver: 'Mara Voss', text: 'Grab the ledger at the east beach, then reach the hideout. No timer — stay alive.', reward: 1000 },
  { name: 'Airfield Run', giver: 'Ilsa Crane', text: 'Ilsa needs a parcel at the airfield. Drive it there, fast and quiet.', reward: 350, time: 90 },
  { name: 'Port Manifest', giver: 'Ilsa Crane', text: 'Lift the manifest from the port containers. Watch the cranes — and the cops.', reward: 500 },
  { name: 'Interceptors', giver: 'Ilsa Crane', text: 'The harbour crew sent interceptors. Lose a 3-star tail to finish.', reward: 700 },
  { name: 'The Informant', giver: 'Ilsa Crane', text: 'Meet the informant on the beach. He talks, then he runs — catch him.', reward: 900, time: 120 },
  { name: 'King of the Bay', giver: 'Ilsa Crane', text: 'Take the sister ledger from the port and reach the hideout. The whole city is watching.', reward: 1500 },
  // Arc three is Dario Salas, the boardwalk bookie. He bankrolled
  // half the city and now he wants it back — in cash, in muscle, and
  // in one very fast bike ride down the boards.
  { name: 'Beachfront Debt', giver: 'Dario Salas', text: 'Dario needs his cut. Collect the cash drop on the boardwalk, then bring it to his stall.', reward: 800, time: 100 },
  { name: 'Boardwalk Run', giver: 'Dario Salas', text: 'Run a package from the pier to the dealership — the cops watch the boards, so stay quick.', reward: 1100, time: 90 },
  { name: 'The Getaway Bike', giver: 'Dario Salas', text: 'Dario\'s rider is down. Steal a bike, ride it to the pier, and lose the heat on the way.', reward: 1300 },
  { name: 'King of the Boardwalk', giver: 'Dario Salas', text: 'Take Dario\'s ledger from the port, then reach the boardwalk. Three stars will be on you.', reward: 2000 },
];

// One fixed destination per job, chosen from places in the city.
// Jobs 6–10 use the new districts: the airfield and the port.
function markerFor(state, index) {
  const w = state.world;
  const spots = [
    { x: w.roadsX[5], y: w.roadsY[3] },
    { x: w.park.x + w.park.w / 2, y: w.park.y + w.park.h / 2 },
    { x: w.roadsX[1], y: w.roadsY[0] },
    { x: w.roadsX[3], y: w.roadsY[2] },
    { x: w.beach.x + 40, y: w.roadsY[2] },
    { x: w.airport.x + w.airport.w / 2, y: w.airport.y + w.airport.h / 2 },
    { x: w.port.x + 60, y: w.port.y + 120 },
    { x: w.roadsX[2], y: w.roadsY[0] },
    { x: w.beach.x + 40, y: w.roadsY[4] },
    { x: w.port.x + w.port.w - 40, y: w.port.y + w.port.h - 60 },
    // Jobs 11–14 use the new boardwalk district and the dealership.
    { x: w.boardwalk.x + w.boardwalk.w / 2, y: w.boardwalk.y + 300 },
    { x: state.economy.dealer.x + state.economy.dealer.w / 2, y: state.economy.dealer.y + state.economy.dealer.h / 2 },
    { x: w.boardwalk.pier.x + 40, y: w.boardwalk.pier.y },
    { x: w.boardwalk.x + w.boardwalk.w / 2, y: w.boardwalk.y + 1200 },
  ];
  return spots[index % spots.length];
}

export function createMissions() {
  return {
    index: 0,
    active: false,
    started: false,
    done: 0,
    target: null,
    timer: 0,
    timerMax: 0,
    // Two-stage jobs (arc three's first) use this: stage 0 is the
    // pickup, stage 1 is the delivery. Single-stage jobs stay at 0.
    stage: 0,
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
  m.stage = 0;
  m.target = markerFor(state, m.index);
  m.timerMax = def.time || 0;
  m.timer = m.timerMax;
  m.text = `${def.name} (${def.giver}): ${def.text}`;
  m.banner = `MISSION: ${def.name}`;
  m.bannerTimer = 3;
  // The tail jobs start hot: two stars for job 4, three for job 8.
  if (m.index === 3) {
    state.player.wanted = Math.max(state.player.wanted, 2);
    state.player.wantedTimer = 0;
  }
  if (m.index === 7) {
    state.player.wanted = Math.max(state.player.wanted, 3);
    state.player.wantedTimer = 0;
  }
  // Arc three: the getaway job parks a bike in reach, and the final
  // job starts with the whole city watching — three stars.
  if (m.index === 12) {
    ensureBikeNearby(state);
    m.text = `${def.name} (${def.giver}): ${def.text} (You need to be ON A BIKE.)`;
  }
  if (m.index === 13) {
    state.player.wanted = Math.max(state.player.wanted, 3);
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

  // The tail jobs are finished by losing the heat, not by arriving.
  if (m.index === 3 || m.index === 7) {
    if (p.wanted === 0) completeMission(state, audio);
    return;
  }
  const dist = Math.hypot(p.x - m.target.x, p.y - m.target.y);
  // The getaway job only counts when the player arrives on a bike.
  if (m.index === 12 && (!p.car || !p.car.isBike)) return;
  // Beachfront Debt is two stages: collect the cash on the
  // boardwalk, then carry it to Dario's stall at the far end.
  if (m.index === 10 && m.stage === 0) {
    if (dist < 46) {
      m.stage = 1;
      const stall = state.world.boardwalk.stalls[4];
      m.target = { x: stall.x + stall.w / 2, y: stall.y + stall.h / 2 };
      m.text = 'Beachfront Debt (Dario Salas): Cash collected — take it to Dario\'s bait stall at the far end of the boardwalk.';
      m.banner = 'CASH COLLECTED — DELIVER IT';
      m.bannerTimer = 3;
      audio.cash();
    }
    return;
  }
  if (dist < 46) completeMission(state, audio);
}

export function completeMission(state, audio) {
  const m = state.missions;
  const def = MISSION_DEFS[m.index];
  earnCash(state, def.reward);
  m.done += 1;
  m.index += 1;
  m.active = false;
  m.stage = 0;
  m.target = null;
  m.timer = 0;
  m.banner = `MISSION COMPLETE  +$${def.reward}`;
  m.bannerTimer = 3.5;
  pushPhoneMessage(state, def.giver, MISSION_TEXTS[m.index] || 'Job done. Well driven.');
  if (m.index === 5) {
    m.text = 'Arc one done — Mara is paid. Ilsa Crane is waiting at the airfield. Press Q.';
  } else if (m.index === 10) {
    m.text = 'Arc two done — Ilsa runs the harbour. Dario Salas is waiting on the boardwalk. Press Q.';
  } else if (m.index >= MISSION_DEFS.length) {
    m.text = 'Story complete! You run Solmar Bay now. Races, deliveries and crates still pay.';
  } else {
    m.text = `Job done. Press Q for the next job: ${MISSION_DEFS[m.index].name}.`;
  }
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
      earnCash(state, PACKAGE_REWARD);
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
    earnCash(state, TAXI_FARE);
    state.events.push({ type: 'cash', amount: TAXI_FARE });
    audio.cash();
    side.taxi = null;
    side.taxiCooldown = 8;
  }
}
