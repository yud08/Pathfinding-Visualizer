import type { GridState } from "../grid/model";
import { listNeighbours, type MovementMode } from "./neighbours";
import { heuristic, type HeuristicKind } from "./heuristics";
import { MinHeap } from "./minheap";

export type WeightedAlgo = "Dijkstra" | "A*";
export type RunStepOutcome = "continue" | "found" | "no-path";

export type WeightedSettings = {
  movement: MovementMode;
  heuristic: HeuristicKind;
  heuristicWeight: number; // only used by A*
};

export type WeightedOverlay = {
  visited: Uint8Array;
  frontier: Uint8Array;
  currentIndex: number | null;

  parent: Int32Array;
  finalPath: number[];

  gCost: Float64Array;
  hCost: Float64Array;
  fCost: Float64Array;
};

export type WeightedRunner = {
  algo: WeightedAlgo;
  startIndex: number;
  endIndex: number;
  overlay: WeightedOverlay;
  stepCount: number;
  step: () => RunStepOutcome;
};

function createOverlay(n: number): WeightedOverlay {
  const parent = new Int32Array(n);
  parent.fill(-1);

  const gCost = new Float64Array(n);
  const hCost = new Float64Array(n);
  const fCost = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    gCost[i] = Infinity;
    hCost[i] = 0;
    fCost[i] = Infinity;
  }

  return {
    visited: new Uint8Array(n),
    frontier: new Uint8Array(n),
    currentIndex: null,

    parent,
    finalPath: [],

    gCost,
    hCost,
    fCost,
  };
}

function reconstructPath(parent: Int32Array, start: number, end: number): number[] {
  const path: number[] = [];
  let cur = end;

  while (cur !== -1) {
    path.push(cur);
    if (cur === start) break;
    cur = parent[cur];
  }

  if (path[path.length - 1] !== start) return [];
  path.reverse();
  return path;
}

export function validateWeightedRun(grid: GridState): string | null {
  const n = grid.cellCount();

  if (grid.startIndex < 0 || grid.startIndex >= n) return "Start cell is out of bounds.";
  if (grid.endIndex < 0 || grid.endIndex >= n) return "End cell is out of bounds.";
  if (grid.blocked[grid.startIndex]) return "Start cell is blocked.";
  if (grid.blocked[grid.endIndex]) return "End cell is blocked.";

  return null;
}

export function validateHeuristicWeight(w: number): string | null {
  if (!Number.isFinite(w)) return "Heuristic weight must be a number.";
  if (w < 0) return "Heuristic weight must be >= 0.";
  if (w > 10) return "Heuristic weight too large (max 10).";
  return null;
}

export function createWeightedRunner(
  algo: WeightedAlgo,
  grid: GridState,
  settings: WeightedSettings
): WeightedRunner {
  const e1 = validateWeightedRun(grid);
  if (e1) throw new Error(e1);

  const e2 = validateHeuristicWeight(settings.heuristicWeight);
  if (e2) throw new Error(e2);

  const n = grid.cellCount();
  const overlay = createOverlay(n);

  const start = grid.startIndex;
  const end = grid.endIndex;

  const pq = new MinHeap();

  overlay.gCost[start] = 0;

  // Push start with correct priority
  if (algo === "A*") {
    const h = heuristic(grid, start, end, settings.heuristic, settings.movement);
    overlay.hCost[start] = h;
    overlay.fCost[start] = 0 + settings.heuristicWeight * h;
    pq.push(start, overlay.fCost[start]);
  } else {
    overlay.fCost[start] = 0;
    pq.push(start, 0);
  }

  overlay.frontier[start] = 1;

  const runner: WeightedRunner = {
    algo,
    startIndex: start,
    endIndex: end,
    overlay,
    stepCount: 0,

    step: (): RunStepOutcome => {
      overlay.currentIndex = null;

      // skip nodes already visited
      let item = pq.pop();
      while (item && overlay.visited[item.node]) item = pq.pop();
      if (!item) return "no-path";

      const current = item.node;
      runner.stepCount += 1;

      overlay.frontier[current] = 0;
      overlay.currentIndex = current;
      overlay.visited[current] = 1;

      if (current === end) {
        overlay.finalPath = reconstructPath(overlay.parent, start, end);
        return "found";
      }

      const neighbours = listNeighbours(grid, current, settings.movement);

      for (const v of neighbours) {
        if (grid.blocked[v]) continue;
        if (overlay.visited[v]) continue;

        const newG = overlay.gCost[current] + grid.weights[v];

        if (newG < overlay.gCost[v]) {
          overlay.gCost[v] = newG;
          overlay.parent[v] = current;

          if (algo === "A*") {
            const h = heuristic(grid, v, end, settings.heuristic, settings.movement);
            overlay.hCost[v] = h;
            const f = newG + settings.heuristicWeight * h;
            overlay.fCost[v] = f;
            pq.push(v, f);
          } else {
            overlay.fCost[v] = newG;
            pq.push(v, newG);
          }

          overlay.frontier[v] = 1;
        }
      }

      return "continue";
    },
  };

  return runner;
}