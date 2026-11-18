// Seeded randomness for Solmar Bay.
//
// Every random choice in the game — the city layout, the traffic, the
// pedestrians, the side-work spots — draws from a generator built from
// the run's seed. Same seed, same city: a ?seed=N link always opens the
// same streets, which is also what makes the screenshot staging
// reproducible.

// A small mulberry32 generator. `seed` is taken as an unsigned 32-bit
// number; each call returns a float in [0, 1).
export function createRandom(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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
