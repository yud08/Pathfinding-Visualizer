import { GridState, clampInt } from "./model";

export type BrushShape = "square" | "circle";
export type BrushMode = "weight" | "blocked";

export class BrushTool {
  size: number;               // 1..500 (diameter-like)
  shape: BrushShape;
  mode: BrushMode;
  paintWeight: number;        // 0..1000
  paintBlocked: boolean;      // true => block, false => unblock

  constructor() {
    this.size = 1;
    this.shape = "square";
    this.mode = "weight";
    this.paintWeight = 0;
    this.paintBlocked = true;
  }

  setSize(n: number) {
    this.size = clampInt(n, 1, 500);
  }

  footprint(centerRow: number, centerCol: number, grid: GridState): number[] {
    const r = Math.max(0, Math.floor((this.size - 1) / 2));
    const out: number[] = [];

    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        const rr = centerRow + dr;
        const cc = centerCol + dc;
        if (!grid.inBounds(rr, cc)) continue;

        if (this.shape === "circle") {
          if (dr * dr + dc * dc > r * r) continue;
        }
        out.push(grid.index(rr, cc));
      }
    }
    return out;
  }

  apply(grid: GridState, centerIndex: number): number[] {
    const { row, col } = grid.coord(centerIndex);
    const cells = this.footprint(row, col, grid);

    if (this.mode === "weight") {
      for (const i of cells) grid.setWeight(i, this.paintWeight);
    } else {
      for (const i of cells) grid.setBlocked(i, this.paintBlocked);
    }
    return cells;
  }
}
