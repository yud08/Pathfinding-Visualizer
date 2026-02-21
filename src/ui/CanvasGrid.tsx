import { useEffect, useRef } from "react";
import { GridState } from "../grid/model";
import { drawGrid } from "../render/canvasRenderer";
import { BrushTool } from "../grid/brush";
import type { UnweightedOverlay } from "../algo/unweighted";

type Props = {
  grid: GridState;
  brush: BrushTool;
  renderTick: number;           // tells useEffect to redraw
  onGridMutated: () => void;    // lets App increment renderTick
  overlay?: UnweightedOverlay | null;
  canEdit?: boolean;
};

export default function CanvasGrid({
  grid,
  brush,
  renderTick,
  onGridMutated,
  overlay = null,
  canEdit = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawGrid(ctx, canvas.width, canvas.height, grid, {
      showGridLines: true,
      overlay,
    });

  }, [grid, renderTick, overlay]);

  return (
    <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        style={{ border: "1px solid #888", background: "white", touchAction: "none" }}
        onPointerDown={(e) => {
          if (!canEdit) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          paintingRef.current = true;

          const idx = indexFromEvent(e, grid, canvas);
          if (idx === null) return;

          brush.apply(grid, idx);
          onGridMutated();
        }}
        onPointerMove={(e) => {
          if (!canEdit) return;
          if (!paintingRef.current) return;
          const canvas = canvasRef.current;
          if (!canvas) return;

          const idx = indexFromEvent(e, grid, canvas);
          if (idx === null) return;

          brush.apply(grid, idx);
          onGridMutated();
        }}
        onPointerUp={() => {
          paintingRef.current = false;
        }}
        onPointerLeave={() => {
          paintingRef.current = false;
        }}
      />
    </div>
  );
  
  function indexFromEvent(e: React.PointerEvent<HTMLCanvasElement>, grid: GridState, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const col = Math.floor((x / canvas.width) * grid.width);
    const row = Math.floor((y / canvas.height) * grid.height);

    if (!grid.inBounds(row, col)) return null;
    return grid.index(row, col);
  }

}
