import { useEffect, useRef } from "react";
import { GridState } from "../grid/model";
import { drawGrid } from "../render/canvasRenderer";

type Props = { grid: GridState };

export default function CanvasGrid({ grid }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawGrid(ctx, canvas.width, canvas.height, grid, {
      showGridLines: true,
    });

  }, [grid]);

  return (
    <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
      <canvas ref={canvasRef} width={800} height={800} style={{ border: "1px solid #888" }} />
    </div>
  );
}
