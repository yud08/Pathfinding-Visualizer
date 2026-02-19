// src/App.tsx
import "./App.css";
import { useMemo, useState } from "react";
import CanvasGrid from "./ui/CanvasGrid";
import { GridState, GRID_MIN, GRID_MAX, clampInt } from "./grid/model";

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

      <CanvasGrid grid={grid} />
    </div>
  );
}
