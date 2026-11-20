// Seeded randomness for Solmar Bay.
//
// Every random choice in the game — the city layout, the traffic, the
// pedestrians, the side-work spots, the weather rolls — draws from a
// generator built from the run's seed. Same seed, same city: a ?seed=N
// link always opens the same streets, which is also what makes the
// screenshot staging reproducible. Nothing in the step path uses
// Math.random; only the audio noise buffer does, and it never affects
// the simulation.

const MULBERRY_STEP = 0x6d2b79f5;

// A mulberry32 stream. `seed` is taken as an unsigned 32-bit number;
// each call returns a float in [0, 1).
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + MULBERRY_STEP) | 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), 1 | mixed);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Draw one element from `list`, uniformly.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// Draw a float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Draw a whole number in [min, max], both ends possible.
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// True with probability `p` (0..1).
export function chance(rng, p) {
  return rng() < p;
}

// Draw one element, weighted by the `weight` field of each entry.
export function weightedPick(rng, entries) {
  let total = 0;
  for (const entry of entries) total += entry.weight;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

// A fresh stream derived from a seed plus a tag, so two systems that
// share a seed never share a sequence.
export function deriveRandom(seed, tag) {
  let hash = seed >>> 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = Math.imul(hash ^ tag.charCodeAt(i), 2654435761);
    hash ^= hash >>> 13;
  }
  return createRandom(hash >>> 0);
}

// Shuffle a copy of `list` in place order, using the seeded stream.
export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
