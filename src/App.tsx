// src/App.tsx
import "./App.css";
import { useMemo, useState } from "react";
import CanvasGrid from "./ui/CanvasGrid";
import { GridState, GRID_MIN, GRID_MAX, clampInt } from "./grid/model";
import { BrushTool } from "./grid/brush";

function commitDim(
  raw: string,
  fallback: number,
  setNum: (n: number) => void,
  setText: (s: string) => void,
  setMsg: (s: string) => void,
  label: "Width" | "Height"
) {
  // Allow empty while typing, only clamp on commit
  if (raw.trim() === "") {
    // revert to previous valid value
    setText(String(fallback));
    setMsg("");
    return;
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) {
    setText(String(fallback));
    setMsg(`${label} must be a number`);
    return;
  }

  const c = clampInt(n, GRID_MIN, GRID_MAX);
  setNum(c);
  setText(String(c));
  setMsg(c !== n ? `${label} clamped to ${GRID_MIN}–${GRID_MAX}` : "");
}

export default function App() {
  const [w, setW] = useState(25);
  const [h, setH] = useState(25);

  const [wText, setWText] = useState("25");
  const [hText, setHText] = useState("25");

  const [msg, setMsg] = useState("");

  const [renderTick, setRenderTick] = useState(0);
  const bumpRender = () => setRenderTick((t) => t + 1);

  const [brush] = useState(() => new BrushTool());

  const [mode, setMode] = useState<"weight" | "blocked">("weight");
  const [shape, setShape] = useState<"square" | "circle">("square");
  const [brushSize, setBrushSize] = useState(1);
  const [paintWeight, setPaintWeight] = useState(500);
  const [paintBlocked, setPaintBlocked] = useState(true);

  brush.mode = mode;
  brush.shape = shape;
  brush.setSize(brushSize);
  brush.paintWeight = paintWeight;
  brush.paintBlocked = paintBlocked;


  const grid = useMemo(() => new GridState(w, h), [w, h]);

  return (
    <div style={{ padding: 16 }}>
      <h1>Pathfinding Visualiser (v0.1)</h1>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <label>
          Grid Width ({GRID_MIN}–{GRID_MAX}):
          <input
            type="text"
            inputMode="numeric"
            value={wText}
            onChange={(e) => {
              setWText(e.target.value); // allow freely 
              setMsg("");
            }}
            onBlur={() =>
              commitDim(wText, w, setW, setWText, setMsg, "Width")
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDim(wText, w, setW, setWText, setMsg, "Width");
              }
            }}
            style={{ marginLeft: 8, width: 110 }}
          />
        </label>

        <label>
          Grid Height ({GRID_MIN}–{GRID_MAX}):
          <input
            type="text"
            inputMode="numeric"
            value={hText}
            onChange={(e) => {
              setHText(e.target.value);
              setMsg("");
            }}
            onBlur={() =>
              commitDim(hText, h, setH, setHText, setMsg, "Height")
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDim(hText, h, setH, setHText, setMsg, "Height");
              }
            }}
            style={{ marginLeft: 8, width: 110 }}
          />
        </label>

        <div>
          Cells: <b>{w * h}</b>
        </div>

        {msg && <div style={{ color: "#a00000", fontWeight: 600 }}>{msg}</div>}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <label>
          Mode:
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="weight">Weight</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>

        <label>
          Shape:
          <select value={shape} onChange={(e) => setShape(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="square">Square</option>
            <option value="circle">Circle</option>
          </select>
        </label>

        <label>
          Brush size:
          <input
            type="number"
            value={brushSize}
            min={1}
            max={500}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ marginLeft: 8, width: 90 }}
          />
        </label>

        {mode === "weight" && (
          <label>
            Weight (0–1000):
            <input
              type="number"
              value={paintWeight}
              min={0}
              max={1000}
              onChange={(e) => setPaintWeight(Number(e.target.value))}
              style={{ marginLeft: 8, width: 110 }}
            />
          </label>
        )}

        {mode === "blocked" && (
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Brush type:
            <select
              value={paintBlocked ? "place" : "erase"}
              onChange={(e) => setPaintBlocked(e.target.value === "place")}
            >
              <option value="place">Place walls</option>
              <option value="erase">Erase walls</option>
            </select>
          </label>
        )}


        <button
          onClick={() => {
            grid.reset();
            bumpRender();
          }}
        >
          Reset grid
        </button>
      </div>


      <CanvasGrid
        grid={grid}
        brush={brush}
        renderTick={renderTick}
        onGridMutated={bumpRender}
      />
    </div>
  );
}
