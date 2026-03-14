import { GridState } from "../grid/model";
import type { UnweightedOverlay } from "../algo/unweighted";
import type { WeightedOverlay } from "../algo/weighted";

type DrawGridOptions = {
  overlay?: (UnweightedOverlay | WeightedOverlay) | null;
  inspectedIndex?: number | null;
};

function weightToColor(w: number): string {
  const t = 245 - Math.floor((w / 1000) * 160);
  return `rgb(${t},${t},255)`;
}

function drawFinalPathLine(
  ctx: CanvasRenderingContext2D,
  xBound: number[],
  yBound: number[],
  grid: GridState,
  path: number[]
) {
  if (path.length < 2) return;

  const cellW = xBound[1] - xBound[0];
  const cellH = yBound[1] - yBound[0];
  const lw = Math.max(2, Math.min(cellW, cellH) * 0.35);

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();

  for (let k = 0; k < path.length; k++) {
    const idx = path[k];
    const r = Math.floor(idx / grid.width);
    const c = idx % grid.width;

    // centre of this cell
    const cx = (xBound[c] + xBound[c + 1]) / 2;
    const cy = (yBound[r] + yBound[r + 1]) / 2;

    if (k === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }

  // outline for contrast
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = lw * 1.4;
  ctx.stroke();

  // yellow path
  ctx.strokeStyle = "#ffd400";
  ctx.lineWidth = lw;
  ctx.stroke();

  ctx.restore();
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  grid: GridState,
  options: DrawGridOptions = {}
) {
  const { overlay = null, inspectedIndex = null } = options;

  // recompute integer pixel boundaries to avoid fractional seams 
  const xBound: number[] = new Array(grid.width + 1);
  const yBound: number[] = new Array(grid.height + 1);

  for (let c = 0; c <= grid.width; c++) {
    xBound[c] = Math.round((c * canvasW) / grid.width);
  }
  for (let r = 0; r <= grid.height; r++) {
    yBound[r] = Math.round((r * canvasH) / grid.height);
  }

  // Draw cells using integer rectangles
  for (let r = 0; r < grid.height; r++) {
    const y0 = yBound[r];
    const y1 = yBound[r + 1];
    const h = y1 - y0;

    for (let c = 0; c < grid.width; c++) {
      const x0 = xBound[c];
      const x1 = xBound[c + 1];
      const w = x1 - x0;

      const i = r * grid.width + c;

      if (i === grid.startIndex) ctx.fillStyle = "#00a000";
      else if (i === grid.endIndex) ctx.fillStyle = "#a00000";
      else if (grid.blocked[i]) ctx.fillStyle = "#202020";
      else ctx.fillStyle = weightToColor(grid.weights[i]);
      if (overlay && !(i === grid.startIndex || i === grid.endIndex)) {
        if (overlay.currentIndex === i) {
          ctx.fillStyle = "#f59e0b"; // current (orange)
        } else if (overlay.frontier[i]) {
          ctx.fillStyle = "#38bdf8"; // frontier (blue)
        } else if (overlay.visited[i]) {
          ctx.fillStyle = "#93c5fd"; // visited (light blue)
        }
      }
      ctx.fillRect(x0, y0, w, h);

      // inspected cell highlight
      if (i === inspectedIndex) {
        ctx.fillStyle = "rgba(255, 100, 100, 0.45)";
        ctx.fillRect(x0, y0, w, h);
      }
    }
  }

  if (overlay && overlay.finalPath && overlay.finalPath.length > 0) {
    drawFinalPathLine(ctx, xBound, yBound, grid, overlay.finalPath);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  
  // The +0.5 helps lines look better with integer coordinates
  for (let c = 0; c <= grid.width; c++) {
    const x = xBound[c] + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasH);
  }
  for (let r = 0; r <= grid.height; r++) {
    const y = yBound[r] + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(canvasW, y);
  }

  
  ctx.stroke();
}
