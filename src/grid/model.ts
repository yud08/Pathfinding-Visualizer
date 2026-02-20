export const GRID_MIN = 5;
export const GRID_MAX = 500;

export function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  n = Math.floor(n);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

export class GridState {
  width: number;
  height: number;

  weights: Uint16Array;
  blocked: Uint8Array;

  startIndex: number;
  endIndex: number;

  constructor(width: number, height: number) {
    this.width = clampInt(width, GRID_MIN, GRID_MAX);
    this.height = clampInt(height, GRID_MIN, GRID_MAX);

    const n = this.width * this.height;
    this.weights = new Uint16Array(n);
    this.blocked = new Uint8Array(n);

    this.startIndex = 0;
    this.endIndex = n - 1;
  }

  cellCount() {
    return this.width * this.height;
  }

  index(row: number, col: number) {
    return row * this.width + col;
  }

  coord(index: number) {
    return { row: Math.floor(index / this.width), col: index % this.width };
  }
  inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.height && col >= 0 && col < this.width;
  }

  setWeight(index: number, w: number) {
    const i = clampInt(index, 0, this.cellCount() - 1);
    const ww = clampInt(w, 0, 1000);
    this.weights[i] = ww;
  }

  setBlocked(index: number, isBlocked: boolean) {
    if (index < 0 || index >= this.cellCount()) return;

    // prevent blocking start/end, but still allow unblocking them
    if (isBlocked && (index === this.startIndex || index === this.endIndex)) return;

    this.blocked[index] = isBlocked ? 1 : 0;
  }

  reset() {
    this.weights.fill(0);
    this.blocked.fill(0);
    this.startIndex = 0;
    this.endIndex = this.cellCount() - 1;
  }
}

