// src/App.tsx
import "./App.css";
import { useMemo, useEffect, useRef, useState } from "react";
import CanvasGrid from "./ui/CanvasGrid";
import { GridState, GRID_MIN, GRID_MAX, clampInt } from "./grid/model";
import { BrushTool } from "./grid/brush";
import { generateRandomTerrain } from "./grid/generator/randomTerrain";
import { generateMaze } from "./grid/generator/maze";
import {
  createUnweightedRunner,
  validateUnweightedRun,
  type UnweightedAlgo,
  type UnweightedOverlay,
  type UnweightedRunner,
} from "./algo/unweighted";
import type { MovementMode } from "./algo/neighbours";
import type { HeuristicKind } from "./algo/heuristics";
import type { WeightedAlgo, WeightedOverlay, WeightedRunner } from "./algo/weighted";
import { createWeightedRunner, validateWeightedRun, validateHeuristicWeight } from "./algo/weighted";
import HelpModal from "./ui/HelpModal";

type AlgoChoice = UnweightedAlgo | WeightedAlgo;

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme", theme === "light" ? "light" : ""
    );
  }, [theme]);

  const [showHelp, setShowHelp] = useState(false);

  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);

  const [compareMode, setCompareMode] = useState(false);
  const [compareAlgo, setCompareAlgo] = useState<AlgoChoice>("Dijkstra");
  const [overlayB,    setOverlayB]    = useState<(UnweightedOverlay | WeightedOverlay) | null>(null);

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

  const [viewMode, setViewMode] = useState(false);

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

  function handleCellClick(index: number) {
    if (!viewMode) return;
    setInspectedIndex(prev => prev === index ? null : index);
  }

  function renderInspector() {
    if (inspectedIndex === null) return null;
    const { row, col } = grid.coord(inspectedIndex);
    const weight = grid.weights[inspectedIndex];
    const blocked = grid.blocked[inspectedIndex] ? "Yes" : "No";

    const rows: { label: string; val: string }[] = [
      { label: "Cell",    val: `(${row}, ${col})` },
      { label: "Weight",  val: String(weight) },
      { label: "Wall",    val: blocked },
    ];

    if (algoOverlay && "gCost" in algoOverlay) {
      const g = algoOverlay.gCost[inspectedIndex];
      const h = algoOverlay.hCost[inspectedIndex];
      const f = algoOverlay.fCost[inspectedIndex];
      rows.push(
        { label: "g, shortest dist from start", val: isFinite(g) ? g.toFixed(2) : "infinity(not reached)" },
        { label: "h, heuristic dist to end",    val: isFinite(h) ? h.toFixed(2) : "infinity" },
        { label: "f = g + h, priority",         val: isFinite(f) ? f.toFixed(2) : "infinity" },
      );
    } else if (algoOverlay) {
      const visited  = algoOverlay.visited[inspectedIndex];
      const frontier = algoOverlay.frontier[inspectedIndex];
      rows.push(
        { label: "Visited",            val: visited  ? "Yes" : "No" },
        { label: "In frontier",        val: frontier ? "Yes" : "No" },
        { label: "Shortest dist from start", val: visited || frontier ? String(algoOverlay.parent[inspectedIndex] >= 0 ? "N/A" : "0(start)") : "not reached" },
      );
    }

    return (
      <div style={{ marginTop: 8, padding: 10, border: "1px solid #888", borderRadius: 6, fontSize: 12, display: "inline-block" }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Cell Inspector, click same cell again to dismiss</div>
        {rows.map(({ label, val }) => (
          <div key={label} style={{ display: "flex", gap: 16, marginBottom: 2 }}>
            <span style={{ opacity: 0.7, minWidth: 200 }}>{label}</span>
            <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>
    );
  }

  function cloneGrid(src: GridState): GridState {
    const dst = new GridState(src.width, src.height);
    dst.weights.set(src.weights);
    dst.blocked.set(src.blocked);
    dst.startIndex = src.startIndex;
    dst.endIndex   = src.endIndex;
    return dst;
  }

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
    resetAlgorithmRun("Grid changed. Algorithm run cleared.");
    const seed = getSeedForGeneration();
    setCompareMode(false);

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
    resetAlgorithmRun("Grid changed. Algorithm run cleared.");
    const seed = getSeedForGeneration();
    setCompareMode(false);

    generateMaze(grid, { seed });

    setLastMazeSeed(seed);
    bumpRender();
  }
  const [selectedAlgo, setSelectedAlgo] = useState<AlgoChoice>("BFS");

  const [movement, setMovement] = useState<MovementMode>("4");
  const [heuristicKind, setHeuristicKind] = useState<HeuristicKind>("manhattan");
  const [heuristicWeightText, setHeuristicWeightText] = useState("1");

  const [runStatus, setRunStatus] = useState<
    "idle" | "running" | "paused" | "finished" | "no-path" | "error"
  >("idle");
  const [runMessage, setRunMessage] = useState("No algorithm running.");

  const [stepDelayMs, setStepDelayMs] = useState(40);
  const [algoOverlay, setAlgoOverlay] = useState<(UnweightedOverlay | WeightedOverlay) | null>(null);

  const runnerRef = useRef<(UnweightedRunner | WeightedRunner) | null>(null);
  const timerRef = useRef<number | null>(null);

  const runnerBRef   = useRef<(UnweightedRunner | WeightedRunner) | null>(null);
  const gridBRef     = useRef<GridState | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [metricTime,    setMetricTime]    = useState<number | null>(null);
  const [metricNodes,   setMetricNodes]   = useState<number | null>(null);
  const [metricPathLen, setMetricPathLen] = useState<number | null>(null);
  const [metricCost,    setMetricCost]    = useState<number | null>(null);

  const [metricTimeB,    setMetricTimeB]    = useState<number | null>(null);
  const [metricNodesB,   setMetricNodesB]   = useState<number | null>(null);
  const [metricPathLenB, setMetricPathLenB] = useState<number | null>(null);
  const [metricCostB,    setMetricCostB]    = useState<number | null>(null);

function stopRunTimer() {
  if (timerRef.current !== null) {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

function resetAlgorithmRun(reason = "No algorithm running.") {
  stopRunTimer();
  runnerRef.current  = null;
  runnerBRef.current = null;
  setAlgoOverlay(null);
  setOverlayB(null);
  setRunStatus("idle");
  setRunMessage(reason);
  setMetricTime(null);
  setMetricNodes(null);
  setMetricPathLen(null);
  setMetricCost(null);
  setMetricTimeB(null);
  setMetricNodesB(null);
  setMetricPathLenB(null);
  setMetricCostB(null);
}


  function stepAlgorithmOnce() {
    const runner = runnerRef.current;
    if (!runner) return;

    try {
      const outcome = runner.step();
      bumpRender();

      if (outcome === "continue") {
        const isRunning = timerRef.current !== null;
        setRunStatus(isRunning ? "running" : "paused");
        setRunMessage(`${runner.algo.toUpperCase()} running... Step ${runner.stepCount}`);
      } else if (outcome === "found") {
        stopRunTimer();
        setRunStatus("finished");

        const timeTakenMs  = startTimeRef.current ? performance.now() - startTimeRef.current : 0;
        const overlay      = runner.overlay;
        const nodesVisited = Array.from(overlay.visited).reduce((s, v) => s + v, 0);
        const finalPath    = overlay.finalPath ?? [];
        const pathLen      = finalPath.length;

        let pathCost = 0;
        if ("gCost" in overlay && finalPath.length > 0) {
          pathCost = (overlay as WeightedOverlay).gCost[finalPath[finalPath.length - 1]];
        }

        setMetricTime(timeTakenMs);
        setMetricNodes(nodesVisited);
        setMetricPathLen(pathLen);
        setMetricCost(pathCost);

        setRunMessage(
          `${runner.algo.toUpperCase()} finished: end found, final path length is ${pathLen}, found in ${runner.stepCount} step(s)`
        );
      } else {
        stopRunTimer();
        setRunStatus("no-path");
        setRunMessage(`${runner.algo.toUpperCase()} stopped: no path exists (frontier empty).`);
      }
    } catch (err) {
      stopRunTimer();
      setRunStatus("error");
      setRunMessage(err instanceof Error ? err.message : "Unexpected error during run.");
    }

    // Also step runner B if in compare mode
    if (compareMode && runnerBRef.current) {
      try {
        const rb = runnerBRef.current;
        const outcome = rb.step();
        setOverlayB({ ...rb.overlay } as any);
        if (outcome !== "continue") {
          runnerBRef.current = null;
        }
        bumpRender();
      } catch (err) {
        runnerBRef.current = null;
      }
    }
  }

function initialiseAlgorithmRun(algo: AlgoChoice) {
  resetAlgorithmRun("Initialising new run...");

  // BFS / DFS
  if (algo === "BFS" || algo === "DFS") {
    const validationError = validateUnweightedRun(grid);
    if (validationError) {
      setRunStatus("error");
      setRunMessage(validationError);
      return;
    }
    try {
      const runner = createUnweightedRunner(algo, grid, { movement });
      runnerRef.current = runner;
      setAlgoOverlay(runner.overlay);
      setRunStatus("paused");
      setRunMessage(`${algo.toUpperCase()} initialised. Ready to play.`);
      bumpRender();
      return;
    } catch (err) {
      setRunStatus("error");
      setRunMessage(err instanceof Error ? err.message : "Failed to initialise run.");
      return;
    }
  }

  // Dijkstra / A*
  const gridErr = validateWeightedRun(grid);
  if (gridErr) {
    setRunStatus("error");
    setRunMessage(gridErr);
    return;
  }

  const hw = Number(heuristicWeightText.trim());
  const hwErr = validateHeuristicWeight(hw);
  if (hwErr) {
    setRunStatus("error");
    setRunMessage(hwErr);
    return;
  }

  try {
    const runner = createWeightedRunner(algo, grid, {
      movement,
      heuristic: heuristicKind,
      heuristicWeight: hw,
    });
    runnerRef.current = runner;
    setAlgoOverlay(runner.overlay);
    setRunStatus("paused");
    setRunMessage(`${algo.toUpperCase()} initialised. Ready to play.`);
    bumpRender();
    } catch (err) {
      setRunStatus("error");
      setRunMessage(err instanceof Error ? err.message : "Failed to initialise run.");
    }
  }

  function playAlgorithm() {
    if (!runnerRef.current) {
      setRunMessage("Initialise a algorithm run first.");
      return;
    }

    stopRunTimer();
    startTimeRef.current = performance.now();
    setRunStatus("running");
    setRunMessage(`${runnerRef.current.algo.toUpperCase()} running...`);

    if (compareMode && runnerBRef.current) {
      timerRef.current = window.setInterval(() => {
        const ra = runnerRef.current;
        const rb = runnerBRef.current;
        let doneA = true, doneB = true;

        if (ra) {
          const outcome = ra.step();
          setAlgoOverlay({ ...ra.overlay } as any);
          if (outcome === "continue") {
            doneA = false;
          } else {
            const ov = ra.overlay;
            const fp = ov.finalPath ?? [];
            setMetricTime(startTimeRef.current ? performance.now() - startTimeRef.current : 0);
            setMetricNodes(Array.from(ov.visited).reduce((s, v) => s + v, 0));
            setMetricPathLen(fp.length);
            setMetricCost("gCost" in ov && fp.length > 0 ? (ov as any).gCost[fp[fp.length - 1]] : 0);
            runnerRef.current = null;
          }
        }
        if (rb) {
          const outcome = rb.step();
          setOverlayB({ ...rb.overlay } as any);
          if (outcome === "continue") {
            doneB = false;
          } else {
            const ov = rb.overlay;
            const fp = ov.finalPath ?? [];
            setMetricTimeB(startTimeRef.current ? performance.now() - startTimeRef.current : 0);
            setMetricNodesB(Array.from(ov.visited).reduce((s, v) => s + v, 0));
            setMetricPathLenB(fp.length);
            setMetricCostB("gCost" in ov && fp.length > 0 ? (ov as any).gCost[fp[fp.length - 1]] : 0);
            runnerBRef.current = null;
          }
        }
        bumpRender();
        if (doneA && doneB) {
          stopRunTimer();
          setRunStatus("finished");
          setRunMessage("Compare run complete.");
        }
      }, stepDelayMs);
    } else {
      timerRef.current = window.setInterval(() => {
        stepAlgorithmOnce();
      }, stepDelayMs);
    }
  }

  function handleVisualizeCompare() {
    stopRunTimer();
  
    const gridB = cloneGrid(grid);
    gridBRef.current = gridB;
  
    initialiseAlgorithmRun(selectedAlgo);
    const ra = runnerRef.current;
    if (!ra) return;
  
    let rb: UnweightedRunner | WeightedRunner;
    try {
      if (compareAlgo === "BFS" || compareAlgo === "DFS") {
        const err = validateUnweightedRun(gridB);
        if (err) { setRunMessage(err); return; }
        rb = createUnweightedRunner(compareAlgo, gridB, { movement });
      } else {
        const err = validateWeightedRun(gridB);
        if (err) { setRunMessage(err); return; }
        const hw = Number(heuristicWeightText.trim());
        rb = createWeightedRunner(compareAlgo, gridB, {
          movement, heuristic: heuristicKind, heuristicWeight: hw,
        });
      }
    } catch (err) {
      setRunMessage(err instanceof Error ? err.message : "Failed to init compare run.");
      return;
    }
  
    runnerBRef.current = rb;
    setOverlayB(rb.overlay as any);
    setRunStatus("running");
    startTimeRef.current = performance.now();
  
    timerRef.current = window.setInterval(() => {
      const ra = runnerRef.current;
      const rb = runnerBRef.current;
      let doneA = true, doneB = true;

      if (ra) {
        const outcome = ra.step();
        setAlgoOverlay({ ...ra.overlay } as any);
        if (outcome === "continue") {
          doneA = false;
        } else {
          const ov = ra.overlay;
          const fp = ov.finalPath ?? [];
          setMetricTime(startTimeRef.current ? performance.now() - startTimeRef.current : 0);
          setMetricNodes(Array.from(ov.visited).reduce((s, v) => s + v, 0));
          setMetricPathLen(fp.length);
          setMetricCost("gCost" in ov && fp.length > 0 ? (ov as any).gCost[fp[fp.length - 1]] : 0);
          runnerRef.current = null;
        }
      }
      if (rb) {
        const outcome = rb.step();
        setOverlayB({ ...rb.overlay } as any);
        if (outcome === "continue") {
          doneB = false;
        } else {
          const ov = rb.overlay;
          const fp = ov.finalPath ?? [];
          setMetricTimeB(startTimeRef.current ? performance.now() - startTimeRef.current : 0);
          setMetricNodesB(Array.from(ov.visited).reduce((s, v) => s + v, 0));
          setMetricPathLenB(fp.length);
          setMetricCostB("gCost" in ov && fp.length > 0 ? (ov as any).gCost[fp[fp.length - 1]] : 0);
          runnerBRef.current = null;
        }
      }

      bumpRender();
      if (doneA && doneB) {
        stopRunTimer();
        setRunStatus("finished");
        setRunMessage("Compare run complete.");
      }
    }, stepDelayMs);
  }

function pauseAlgorithm() {
  stopRunTimer();
  if (runnerRef.current) {
    setRunStatus("paused");
    setRunMessage(`${runnerRef.current.algo.toUpperCase()} paused.`);
  }
}
function handleGridMutated() {
  if (runStatus !== "idle") {
    resetAlgorithmRun("Board edited. Previous algorithm run cleared.");
    setCompareMode(false);
  }
  bumpRender();
}
const didResizeMountRef = useRef(false);

useEffect(() => {
  // Skip first render 
  if (!didResizeMountRef.current) {
    didResizeMountRef.current = true;
    return;
  }

  resetAlgorithmRun("Grid resized. Algorithm run cleared.");
  setCompareMode(false);
  bumpRender();
}, [w, h]);

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", width: "100%" }}>
        <h1>Pathfinding Visualiser</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button onClick={() => setShowHelp(true)}>? Help</button>
        </div>
      </div>
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
            resetAlgorithmRun("Grid changed. Algorithm run cleared.");
            bumpRender();
          }}
        >
          Reset grid
        </button>
      </div>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ccc", borderRadius: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>
          Algorithm visualisation options
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <label>
            Algorithm:
            <select
              value={selectedAlgo}
              onChange={(e) => setSelectedAlgo(e.target.value as AlgoChoice)}
              style={{ marginLeft: 8 }}
            >
              <option value="BFS">BFS</option>
              <option value="DFS">DFS</option>
              <option value="Dijkstra">Dijkstra</option>
              <option value="A*">A*</option>
            </select>
          </label>

          <label>
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => {
                setCompareMode(e.target.checked);
                resetAlgorithmRun("Compare mode toggled.");
              }}
              style={{ marginRight: 6 }}
            />
            Compare mode
          </label>
          
          {compareMode && (
            <label>
              Algorithm B:
              <select
                value={compareAlgo}
                onChange={(e) => setCompareAlgo(e.target.value as AlgoChoice)}
                style={{ marginLeft: 8 }}
              >
                <option value="BFS">BFS</option>
                <option value="DFS">DFS</option>
                <option value="Dijkstra">Dijkstra</option>
                <option value="A*">A*</option>
              </select>
            </label>
          )}

          {/* <label>
            Movement:
            <select
              value={movement}
              onChange={(e) => setMovement(e.target.value as MovementMode)}
              style={{ marginLeft: 8 }}
            >
              <option value="4">4-direction</option>
              <option value="8">8-direction</option>
            </select>
          </label>   */}

          {selectedAlgo === "A*" && (
            <>
              <label>
                Heuristic:
                <select
                  value={heuristicKind}
                  onChange={(e) => setHeuristicKind(e.target.value as HeuristicKind)}
                  style={{ marginLeft: 8 }}
                >
                  <option value="manhattan">Manhattan</option>
                  <option value="octile">Octile</option>
                </select>
              </label>

              <label>
                Heuristic weight:
                <input
                  type="text"
                  value={heuristicWeightText}
                  onChange={(e) => setHeuristicWeightText(e.target.value)}
                  style={{ marginLeft: 8, width: 80 }}
                />
              </label>
            </>
          )}

          <label>
            Step delay (ms):
            <input
              type="number"
              min={1}
              max={1000}
              value={stepDelayMs}
              onChange={(e) => setStepDelayMs(Math.max(1, Number(e.target.value) || 1))}
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={() => {
              if (compareMode) {
                handleVisualizeCompare();
              } else {
                initialiseAlgorithmRun(selectedAlgo);
                setTimeout(() => playAlgorithm(), 0);
              }
            }}
          >
            Visualize {compareMode ? `${selectedAlgo} vs ${compareAlgo}` : selectedAlgo}
          </button>

          <button onClick={pauseAlgorithm}>Pause</button>
          <button onClick={playAlgorithm}>Unpause</button>
          <button onClick={stepAlgorithmOnce}>Step once</button>
          <button onClick={() => resetAlgorithmRun("Algorithm run reset.")}>Reset run</button>
          <button
            type="button"
            onClick={() => setMovement((prev) => (prev === "4" ? "8" : "4"))}
          >
            Movement: {movement === "4" ? "4-direction" : "8-direction"}
          </button>
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div><strong>Status:</strong> {runStatus}</div>
          <div><strong>Message:</strong> {runMessage}</div>
          <div style={{ opacity: 0.8 }}>
            Editing is disabled while the algorithm is running.
          </div>
        </div>
      </div>
    <div style={{ fontSize: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 4 }}>
      <span><span style={{ display: "inline-block", width: 15, height: 15, background: "#00a000", marginRight: 4 }} />Start</span>
      <span><span style={{ display: "inline-block", width: 15, height: 15, background: "#a00000", marginRight: 4 }} />End</span>
      <span><span style={{ display: "inline-block", width: 15, height: 15, background: "#202020", marginRight: 4 }} />Wall</span>
      <span><span style={{ display: "inline-block", width: 15, height: 15, background: "#f59e0b", marginRight: 4 }} />Current</span>
      <span><span style={{ display: "inline-block", width: 15, height: 15, background: "#38bdf8", marginRight: 4 }} />Frontier</span>
      <span><span style={{ display: "inline-block", width: 15, height: 15, background: "#93c5fd", marginRight: 4 }} />Visited</span>
      <span><span style={{ display: "inline-block", width: 15, height: 15, background: "#ffd400", marginRight: 4 }} />Path</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        Weight:
        {Array.from({ length: 8 }, (_, i) => {
          const t = 245 - Math.floor((i / 7) * 160);
          return <span key={i} style={{ display: "inline-block", width: 12, height: 12, background: `rgb(${t},${t},255)` }} />;
        })}
      </span>
      <span><span style={{ display: "inline-block", width: 12, height: 12, background: "rgba(255,100,100,0.7)", marginRight: 4 }} />Inspected</span>
    </div>
{compareMode ? (
  <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
    <div style={{ flex: 1 }}>
      <div style={{ textAlign: "center", fontWeight: 600, marginBottom: 4 }}>
        {selectedAlgo}
      </div>
      <CanvasGrid
        grid={grid}
        brush={brush}
        renderTick={renderTick}
        onGridMutated={handleGridMutated}
        overlay={algoOverlay}
        canEdit={runStatus !== "running" && !viewMode}
        onCellClick={handleCellClick}
        inspectedIndex={inspectedIndex}
      />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ textAlign: "center", fontWeight: 600, marginBottom: 4 }}>
        {compareAlgo}
      </div>
      <CanvasGrid
        grid={gridBRef.current ?? grid}
        brush={brush}
        renderTick={renderTick}
        onGridMutated={handleGridMutated}
        overlay={overlayB}
        canEdit={false}
        onCellClick={handleCellClick}
        inspectedIndex={inspectedIndex}
      />
    </div>
  </div>
    ) : (
      <CanvasGrid
        grid={grid}
        brush={brush}
        renderTick={renderTick}
        onGridMutated={handleGridMutated}
        overlay={algoOverlay}
        canEdit={runStatus !== "running" && !viewMode}
        onCellClick={handleCellClick}
        inspectedIndex={inspectedIndex}
      />
    )}

    <div>
      <label style={{ marginTop: 8, display: "block" }}>
        <input
          type="checkbox"
          checked={viewMode}
          onChange={(e) => {
            setViewMode(e.target.checked);
            if (!e.target.checked) setInspectedIndex(null);
          }}
          style={{ marginRight: 6 }}
        />
        View mode (tick to click cells to inspect, untick to paint cells)
      </label>
      {viewMode && renderInspector()}
    </div>
    
    {compareMode ? (
      <div style={{ display: "flex", gap: 32, marginTop: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { title: selectedAlgo, time: metricTime,  nodes: metricNodes,  pathLen: metricPathLen,  cost: metricCost  },
          { title: compareAlgo,  time: metricTimeB, nodes: metricNodesB, pathLen: metricPathLenB, cost: metricCostB },
        ].map(({ title, time, nodes, pathLen, cost }) => (
          <div key={title}>
            <div style={{ textAlign: "center", fontWeight: 600, marginBottom: 6 }}>{title}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { label: "Time",          val: time    !== null ? `${time.toFixed(1)} ms` : "—" },
                { label: "Nodes visited", val: nodes   !== null ? String(nodes)            : "—" },
                { label: "Path length",   val: pathLen !== null ? String(pathLen)          : "—" },
                { label: "Path cost",     val: cost    !== null ? cost.toFixed(1)          : "—" },
              ].map(({ label, val }) => (
                <div key={label} style={{
                  padding: "8px 14px",
                  border: "1px solid #888",
                  borderRadius: 6,
                  textAlign: "center",
                  minWidth: 100,
                }}>
                  <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { label: "Time",          val: metricTime    !== null ? `${metricTime.toFixed(1)} ms` : "—" },
          { label: "Nodes visited", val: metricNodes   !== null ? String(metricNodes)            : "—" },
          { label: "Path length",   val: metricPathLen !== null ? String(metricPathLen)          : "—" },
          { label: "Path cost",     val: metricCost    !== null ? metricCost.toFixed(1)          : "—" },
        ].map(({ label, val }) => (
          <div key={label} style={{
            padding: "8px 14px",
            border: "1px solid #888",
            borderRadius: 6,
            textAlign: "center",
            minWidth: 100,
          }}>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{val}</div>
          </div>
        ))}
      </div>
    )}

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
    {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}


