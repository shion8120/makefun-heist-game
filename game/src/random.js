// Seeded random numbers, so a heist (its keypad code, its painting colours) can be replayed from a seed.

/** A small fast generator (mulberry32): returns a function giving floats in [0, 1). */
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from min to max, both included. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** The vault's 4-digit keypad code for this heist (never starts with 0, so it reads as a number). */
export function makeVaultCode(rng) {
  let code = String(randInt(rng, 1, 9));
  for (let i = 0; i < 3; i += 1) code += String(randInt(rng, 0, 9));
  return code;
}
