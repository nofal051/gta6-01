// Deterministic randomness. A mulberry32 generator seeded per run, so a
// ?seed=N game builds the same city, the same traffic and the same
// screenshot staging every time it is played.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one element of a list at random.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// An integer in [min, max], both ends included.
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
