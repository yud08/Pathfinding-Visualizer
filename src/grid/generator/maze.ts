import { GridState } from "../model";
import { mulberry32 } from "./rng";

export type MazeOptions = {
  seed?: number;
};

function shuffleInPlace<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function nearestOdd(x: number, maxExclusive: number): number {
  let v = Math.max(1, Math.min(maxExclusive - 2, x));
  if (v % 2 === 0) v = v === maxExclusive - 2 ? v - 1 : v + 1;
  return v;
}

export function generateMaze(grid: GridState, partial?: Partial<MazeOptions>): number[] {
  const seed = partial?.seed ?? Date.now();
  const rng = mulberry32(seed);

  const w = grid.width;
  const h = grid.height;
  const n = grid.cellCount();
  const changed: number[] = [];

  // Fill everything as blocked
  for (let i = 0; i < n; i++) {
    grid.blocked[i] = 1;
    grid.weights[i] = 0;
    changed.push(i);
  }

  //Choose a DFS start node on the odd lattice, near the user's start cell
  const startCoord = grid.coord(grid.startIndex);
  const sr = nearestOdd(startCoord.row, h);
  const sc = nearestOdd(startCoord.col, w);

  // stack for iterative dfs instead of implicit with call stack, less memory
  const stack: Array<{ r: number; c: number }> = [{ r: sr, c: sc }];

  const open = (r: number, c: number) => {
    grid.blocked[grid.index(r, c)] = 0;
  };

  open(sr, sc);

  // directions jump by 2 to move between nodes
  const dirs = [
    { dr: 0, dc: 2 },
    { dr: 0, dc: -2 },
    { dr: 2, dc: 0 },
    { dr: -2, dc: 0 },
  ];

  while (stack.length > 0) {
    const top = stack[stack.length - 1];

    // randomise direction order so maze differs each run
    const order = dirs.slice();
    shuffleInPlace(order, rng);

    let moved = false;

    // try to find an unvisited neighbour maze node
    for (const { dr, dc } of order) {
      const nr = top.r + dr;
      const nc = top.c + dc;

      // Keep inside interior to avoid out of bounds
      if (nr <= 0 || nr >= h - 1 || nc <= 0 || nc >= w - 1) continue;

      const ni = grid.index(nr, nc);

      // skip if visited already
      if (grid.blocked[ni] === 0) continue;

      const wr = top.r + dr / 2;
      const wc = top.c + dc / 2;

      open(wr, wc); // open wall cell
      open(nr, nc); // open neighbour node

      // unext node
      stack.push({ r: nr, c: nc });
      moved = true;
      break;
    }

    // backtrack
    if (!moved) stack.pop();
  }

  grid.setBlocked(grid.startIndex, false);
  grid.setBlocked(grid.endIndex, false);

  const neigh = [
    { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
    { dr: 0, dc: 1 }, { dr: 0, dc: -1 },
  ];

  for (const p of [grid.coord(grid.startIndex), grid.coord(grid.endIndex)]) {
    for (const { dr, dc } of neigh) {
      const rr = p.row + dr;
      const cc = p.col + dc;
      if (grid.inBounds(rr, cc)) grid.blocked[grid.index(rr, cc)] = 0;
    }
  }

  grid.setWeight(grid.startIndex, 0);
  grid.setWeight(grid.endIndex, 0);

  return changed;
}
