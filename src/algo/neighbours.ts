import type { GridState } from "../grid/model";

export type MovementMode = "4" | "8";

export function listNeighbours(grid: GridState, index: number, mode: MovementMode): number[] {
  const { row, col } = grid.coord(index);
  const out: number[] = [];

  // 4-direction neighbours
  const dirs4 = [
    { dr: -1, dc: 0 }, // up
    { dr: 0, dc: 1 },  // right
    { dr: 1, dc: 0 },  // down
    { dr: 0, dc: -1 }, // left
  ];

  for (const d of dirs4) {
    const r = row + d.dr;
    const c = col + d.dc;
    if (!grid.inBounds(r, c)) continue;
    out.push(grid.index(r, c));
  }

  if (mode === "4") return out;

  // 8-direction with diagonals(only when enabled)
  const diags = [
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (const d of diags) {
    const r = row + d.dr;
    const c = col + d.dc;
    if (!grid.inBounds(r, c)) continue;
    out.push(grid.index(r, c));
  }

  return out;
}