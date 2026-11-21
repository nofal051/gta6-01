// Fishing off the pier — a quiet way to earn on the boardwalk.
//
// Stand on the pier at the end of the boardwalk, on foot, and press
// J to cast. The line goes out, the bobber bobs, and after a while
// something tugs: a short bite window opens, and pressing J again
// inside it reels the catch in. Miss the window and the fish gets
// away; reel too early and the line comes back empty.
//
// Catches are small fish worth a little cash, a rare golden koi
// worth a lot, and — once in a while — an old boot worth nothing at
// all, which the game tells you about because a boot is funny. The
// pier is the only place fishing works: the cast checks that the
// player is standing on the pier rect, so you cannot fish from the
// middle of a road.
//
// Fishing is deliberately slow money. A mission pays hundreds; a
// fish pays tens. It is for the player who wants the boardwalk to
// feel like a place to be, not just a place to drive through.
import { earnCash } from './economy.js';

const FISH = [
  { name: 'Mackerel', value: 15, weight: 0.45 },
  { name: 'Sardine', value: 10, weight: 0.25 },
  { name: 'Sea Bass', value: 35, weight: 0.18 },
  { name: 'Golden Koi', value: 150, weight: 0.05 },
  { name: 'Old Boot', value: 0, weight: 0.07 },
];

// Is the player standing on the pier, on foot, ready to fish?
export function onPier(state) {
  const p = state.player;
  if (!p.onFoot) return false;
  const pier = state.world.boardwalk.pier;
  return (
    p.x > pier.x - 10 &&
    p.x < pier.x + pier.w + 10 &&
    p.y > pier.y - 14 &&
    p.y < pier.y + pier.h + 14
  );
}

export function createFishing() {
  return {
    // 'idle' | 'waiting' | 'bite' | 'caught'
    state: 'idle',
    // Where the bobber sits in the water.
    bobber: { x: 0, y: 0 },
    // Time until the bite, then the bite window itself.
    waitTimer: 0,
    biteTimer: 0,
    // Last catch, for the HUD line and the phone stats tab.
    lastCatch: '',
    lastValue: 0,
    // Lifetime totals.
    caught: 0,
    earned: 0,
    best: '',
  };
}

// Pick a catch from the weighted table.
export function rollCatch(rng) {
  let roll = rng();
  for (const fish of FISH) {
    if (roll < fish.weight) return fish;
    roll -= fish.weight;
  }
  return FISH[0];
}

// Cast, or reel in, depending on what the rod is doing. Returns a
// message for the status line, or null when nothing happened.
export function castOrReel(state, audio) {
  const rod = state.fishing;
  const p = state.player;
  if (rod.state === 'idle') {
    if (!onPier(state)) return null;
    rod.state = 'waiting';
    rod.waitTimer = 3 + state.rng() * 6;
    rod.bobber = { x: p.x + 40, y: p.y + 30 };
    if (audio && audio.pickup) audio.pickup();
    return 'Line cast — wait for a tug…';
  }
  if (rod.state === 'bite') {
    // Reeled in on time: the catch pays out.
    const fish = rollCatch(state.rng);
    rod.state = 'caught';
    rod.lastCatch = fish.name;
    rod.lastValue = fish.value;
    rod.caught += 1;
    if (fish.value > 0) {
      earnCash(state, fish.value);
      rod.earned += fish.value;
      if (fish.name === 'Golden Koi') rod.best = 'Golden Koi';
    }
    if (audio && audio.cash) audio.cash();
    return fish.value > 0 ? `Caught a ${fish.name} — sold for $${fish.value}!` : 'Caught an old boot. The sea gives, the sea takes.';
  }
  // Reeled in too early: the line comes back empty.
  if (rod.state === 'waiting') {
    rod.state = 'idle';
    return 'Reeled in too early — nothing biting yet.';
  }
  return null;
}

// The rod's timers: the wait until a bite, the short bite window,
// and the pause after a catch before the rod is ready again.
export function updateFishing(state, dt, audio) {
  const rod = state.fishing;
  if (rod.state === 'waiting') {
    rod.waitTimer -= dt;
    // The bobber bobs while the player waits.
    rod.bobber.y += Math.sin(state.time * 3) * 2 * dt;
    if (rod.waitTimer <= 0) {
      rod.state = 'bite';
      rod.biteTimer = 2.2;
      if (audio && audio.pickup) audio.pickup();
    }
  } else if (rod.state === 'bite') {
    rod.biteTimer -= dt;
    if (rod.biteTimer <= 0) {
      rod.state = 'idle';
      rod.lastCatch = 'The fish got away…';
      rod.lastValue = 0;
    }
  } else if (rod.state === 'caught') {
    rod.biteTimer -= dt;
    if (rod.biteTimer <= 0) {
      rod.state = 'idle';
    }
  }
  if (rod.state === 'caught' && rod.biteTimer <= 0) rod.state = 'idle';
}

// One line for the HUD while the rod is out, so the player knows
// whether to wait, reel, or cast again.
export function fishingStatus(state) {
  const rod = state.fishing;
  if (rod.state === 'waiting') return 'FISHING — waiting for a tug… (J to reel in early)';
  if (rod.state === 'bite') return 'BITE! Press J NOW to reel it in!';
  if (rod.state === 'caught') return rod.lastValue > 0 ? `Caught ${rod.lastCatch} (+$${rod.lastValue})` : `Caught ${rod.lastCatch}`;
  if (rod.lastCatch) return `Fishing: ${rod.lastCatch} · ${rod.caught} caught · $${rod.earned} earned`;
  return '';
}
