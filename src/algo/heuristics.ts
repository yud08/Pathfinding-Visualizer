import type { GridState } from "../grid/model";
import type { MovementMode } from "./neighbours";

export type HeuristicKind = "manhattan" | "octile";

export function heuristic(
  grid: GridState,
  from: number,
  to: number,
  kind: HeuristicKind,
  movement: MovementMode
): number {
  const a = grid.coord(from);
  const b = grid.coord(to);
  const dx = Math.abs(a.col - b.col);
  const dy = Math.abs(a.row - b.row);

  if (kind === "manhattan" || movement === "4") {
    return dx + dy;
  }

  const minD = Math.min(dx, dy);
  const maxD = Math.max(dx, dy);
  return (maxD - minD) + minD * Math.SQRT2;
}