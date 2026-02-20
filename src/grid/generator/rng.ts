export type RNG = () => number;

// Mulberry32
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // [0,1)
  };
}

export function randInt(rng: RNG, lo: number, hi: number): number {
  // inclusive range
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
