import { GridState } from "../grid/model";

export type RenderOptions = {
  showGridLines?: boolean;
};

function weightToColor(w: number): string {
  const t = 245 - Math.floor((w / 1000) * 160);
  return `rgb(${t},${t},255)`;
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  grid: GridState,
  opts: RenderOptions = {}
) {
  ctx.clearRect(0, 0, canvasW, canvasH);

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

      ctx.fillRect(x0, y0, w, h);
    }
  }
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  const showGridLines = !!opts.showGridLines;
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
