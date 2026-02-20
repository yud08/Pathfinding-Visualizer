import { GridState, clampInt } from "../model";
import { clamp01, mulberry32, randInt } from "./rng";

export type RandomTerrainOptions = {
  seed?: number;                
  blockedProbability: number;     // 0..1
  minWeight: number;             // 0..1000
  maxWeight: number;             // 0..1000
  smoothingPasses: number;       // 0..3 recommended
};

const DEFAULTS: RandomTerrainOptions = {
  seed: undefined,
  blockedProbability: 0.12,
  minWeight: 0,
  maxWeight: 1000,
  smoothingPasses: 1,
};

function smoothOnce(grid: GridState) {
  // each cell weight moves toward average of itself and it's neighbours.
  // This makes regions/clusters and everything look smoother.
  const w = grid.width;
  const h = grid.height;

  const snapshot = new Uint16Array(grid.weights); 
  const idx = (r: number, c: number) => r * w + c;

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const i = idx(r, c);
      if (grid.blocked[i]) continue; // walls keep weight 0

      let sum = snapshot[i];
      let cnt = 1;

      if (r > 0) { sum += snapshot[idx(r - 1, c)]; cnt++; }
      if (r + 1 < h) { sum += snapshot[idx(r + 1, c)]; cnt++; }
      if (c > 0) { sum += snapshot[idx(r, c - 1)]; cnt++; }
      if (c + 1 < w) { sum += snapshot[idx(r, c + 1)]; cnt++; }

      grid.weights[i] = Math.round(sum / cnt);
    }
  }
}

export function generateRandomTerrain(grid: GridState, partial?: Partial<RandomTerrainOptions>): number[] {
  const opt: RandomTerrainOptions = { ...DEFAULTS, ...partial };

  const seed = opt.seed ?? Date.now();
  const rng = mulberry32(seed);

  const pBlock = clamp01(opt.blockedProbability);
  const minW = clampInt(opt.minWeight, 0, 1000);
  const maxW = clampInt(opt.maxWeight, 0, 1000);

  const lo = Math.min(minW, maxW);
  const hi = Math.max(minW, maxW);

  const n = grid.cellCount();
  const changed: number[] = [];

  // Fill all cells with random data
  for (let i = 0; i < n; i++) {
    const willBlock = rng() < pBlock;
    grid.setBlocked(i, willBlock);

    if (grid.blocked[i]) {
      grid.weights[i] = 0;
    } else {
      grid.setWeight(i, randInt(rng, lo, hi));
    }

    changed.push(i);
  }

  // Smoothing
  const passes = clampInt(opt.smoothingPasses, 0, 3);
  for (let k = 0; k < passes; k++) smoothOnce(grid);

  // Validation, makes sure start and end are not blocked
  grid.setBlocked(grid.startIndex, false);
  grid.setBlocked(grid.endIndex, false);
  grid.setWeight(grid.startIndex, 0);
  grid.setWeight(grid.endIndex, 0);

  return changed;
}
