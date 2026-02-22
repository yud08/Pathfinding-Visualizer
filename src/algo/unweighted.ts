import type { GridState } from "../grid/model";
import { listNeighbours, type MovementMode } from "./neighbours";

export type UnweightedAlgo = "BFS" | "DFS";
export type RunStepOutcome = "continue" | "found" | "no-path";

export type UnweightedOverlay = {
  visited: Uint8Array;
  frontier: Uint8Array;
  currentIndex: number | null;
  parent: Int32Array;
  finalPath: number[];
};

export type UnweightedRunner = {
  algo: UnweightedAlgo;
  startIndex: number;
  endIndex: number;
  overlay: UnweightedOverlay;
  parent: Int32Array;
  stepCount: number;
  step: () => RunStepOutcome;
};

export type UnweightedSettings = {
  movement: MovementMode; // "4" or "8"
};

function createOverlay(cellCount: number): UnweightedOverlay {
  const parent = new Int32Array(cellCount);
  parent.fill(-1);

  return {
    visited: new Uint8Array(cellCount),
    frontier: new Uint8Array(cellCount),
    currentIndex: null,
    parent,
    finalPath: [],
  };
}

function reconstructPath(parent: Int32Array, startIndex: number, endIndex: number): number[] {
  const path: number[] = [];
  let cur = endIndex;

  while (cur !== -1) {
    path.push(cur);
    if (cur === startIndex) break;
    cur = parent[cur];
  }

  if (path[path.length - 1] !== startIndex) return [];

  path.reverse();
  return path;
}

export function validateUnweightedRun(grid: GridState): string | null {
  const n = grid.cellCount();

  if (grid.startIndex < 0 || grid.startIndex >= n) return "Start cell is out of bounds.";
  if (grid.endIndex < 0 || grid.endIndex >= n) return "End cell is out of bounds.";
  if (grid.blocked[grid.startIndex]) return "Start cell is blocked.";
  if (grid.blocked[grid.endIndex]) return "End cell is blocked.";

  return null;
}

export function createUnweightedRunner(
  algo: UnweightedAlgo,
  grid: GridState,
  settings: UnweightedSettings
): UnweightedRunner {
  const validationError = validateUnweightedRun(grid);
  if (validationError) throw new Error(validationError);

  const n = grid.cellCount();
  const overlay = createOverlay(n);

  const discovered = new Uint8Array(n);

  const frontierData: number[] = [];
  let frontierHead = 0;

  const start = grid.startIndex;
  const end = grid.endIndex;

  frontierData.push(start);
  discovered[start] = 1;
  overlay.frontier[start] = 1;

  function frontierIsEmpty(): boolean {
    if (algo === "BFS") return frontierHead >= frontierData.length;
    return frontierData.length === 0;
  }

  function popFrontier(): number | null {
    if (frontierIsEmpty()) return null;

    if (algo === "BFS") {
      const value = frontierData[frontierHead++];
      if (frontierHead > 2048 && frontierHead * 2 > frontierData.length) {
        frontierData.splice(0, frontierHead);
        frontierHead = 0;
      }
      return value;
    }

    return frontierData.pop() ?? null;
  }

  function pushFrontier(index: number) {
    frontierData.push(index);
    overlay.frontier[index] = 1;
  }

  const runner: UnweightedRunner = {
    algo,
    startIndex: start,
    endIndex: end,
    overlay,
    parent: overlay.parent,
    stepCount: 0,
    step: () => {
      overlay.currentIndex = null;

      const current = popFrontier();
      if (current === null) return "no-path";

      runner.stepCount += 1;

      overlay.frontier[current] = 0;
      overlay.currentIndex = current;
      overlay.visited[current] = 1;

      if (current === end) {
        overlay.finalPath = reconstructPath(overlay.parent, start, end);
        return "found";
      }

      const neighbours = listNeighbours(grid, current, settings.movement);
      for (const nb of neighbours) {
        if (grid.blocked[nb]) continue;
        if (discovered[nb]) continue;

        discovered[nb] = 1;
        overlay.parent[nb] = current;   // <-- key fix
        pushFrontier(nb);
      }

      if (frontierIsEmpty()) return "no-path";
      return "continue";
    },
  };

  return runner;
}

