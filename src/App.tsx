// src/App.tsx
import "./App.css";
import { useMemo, useState } from "react";
import CanvasGrid from "./ui/CanvasGrid";
import { GridState, GRID_MIN, GRID_MAX, clampInt } from "./grid/model";
import { BrushTool } from "./grid/brush";
import { generateRandomTerrain } from "./grid/generator/randomTerrain";
import { generateMaze } from "./grid/generator/maze";

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

  const [seedMode, setSeedMode] = useState<"auto" | "manual">("auto");
  const [manualSeedText, setManualSeedText] = useState("123");

  // Show the seed that was actually used most recently for each generator
  const [lastTerrainSeed, setLastTerrainSeed] = useState<number | null>(null);
  const [lastMazeSeed, setLastMazeSeed] = useState<number | null>(null);

  // Random terrain only settings
  const [blockedProb, setBlockedProb] = useState(0.12);
  const [smoothPasses, setSmoothPasses] = useState(1);

  function makeAutoSeed(): number {
    return ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
  }

  function getSeedForGeneration(): number {
    if (seedMode === "manual") {
      const parsed = Number(manualSeedText.trim());
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
      // If manual seed is invalid, fall back to auto 
      return makeAutoSeed();
    }

    // Auto mode new seed every click
    return makeAutoSeed();
  }

  function handleGenerateRandomTerrain() {
    const seed = getSeedForGeneration();

    generateRandomTerrain(grid, {
      seed,
      blockedProbability: blockedProb,
      minWeight: 0,
      maxWeight: 1000,
      smoothingPasses: smoothPasses,
    });

    setLastTerrainSeed(seed);
    bumpRender();
  }

  function handleGenerateMaze() {
    const seed = getSeedForGeneration();

    generateMaze(grid, { seed });

    setLastMazeSeed(seed);
    bumpRender();
  }


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

    <div style={{ marginTop: 12, padding: 12, border: "1px solid #ccc", borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Board generation</div>

          {/* Shared seed controls (apply to BOTH generators) */}
          <div style={{ marginBottom: 10, padding: 10, border: "1px solid #ddd", borderRadius: 6 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>
              Seed settings (used by both Random Terrain and Maze)
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="seedMode"
                  checked={seedMode === "auto"}
                  onChange={() => setSeedMode("auto")}
                />
                Auto seed (new seed every click)
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="seedMode"
                  checked={seedMode === "manual"}
                  onChange={() => setSeedMode("manual")}
                />
                Manual seed
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 6, opacity: seedMode === "manual" ? 1 : 0.6 }}>
                Seed:
                <input
                  type="text"
                  value={manualSeedText}
                  onChange={(e) => setManualSeedText(e.target.value)}
                  disabled={seedMode !== "manual"}
                  placeholder="e.g. 123"
                  style={{ width: 120 }}
                />
              </label>
            </div>

            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              In Auto mode, each button press generates a fresh seed and a new board. In Manual mode, the entered seed is reused for reproducible layouts.
            </div>
          </div>

          {/* Random terrain only settings */}
          <div style={{ marginBottom: 10, padding: 10, border: "1px solid #ddd", borderRadius: 6 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>
              Random terrain settings only
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label>
                Block density:
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={blockedProb}
                  onChange={(e) => setBlockedProb(Number(e.target.value))}
                  style={{ marginLeft: 8, width: 90 }}
                />
              </label>

              <label>
                Smooth passes:
                <input
                  type="number"
                  min={0}
                  max={3}
                  step={1}
                  value={smoothPasses}
                  onChange={(e) => setSmoothPasses(Number(e.target.value))}
                  style={{ marginLeft: 8, width: 70 }}
                />
              </label>
            </div>
          </div>

          {/* Buttons + seed outputs */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={handleGenerateRandomTerrain}>
              Generate random terrain
            </button>

            <button onClick={handleGenerateMaze}>
              Generate maze
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
            <div>
              <strong>Last random terrain seed used:</strong>{" "}
              {lastTerrainSeed !== null ? lastTerrainSeed : "none yet"}
            </div>
            <div>
              <strong>Last maze seed used:</strong>{" "}
              {lastMazeSeed !== null ? lastMazeSeed : "none yet"}
            </div>
          </div>
        </div>

    </div>
  );
}


