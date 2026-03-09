type Props = { onClose: () => void };

export default function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Help &amp; Feature Guide</h2>

        <h3>Grid Size</h3>
        <ul>
          <li>Use the <b>Grid Width</b> and <b>Grid Height</b> inputs to set the number of columns and rows. Valid range is 5 to 500.</li>
          <li>Press Enter or click away to apply. Changing the size clears any active algorithm run.</li>
          <li><b>Reset grid</b> clears all walls and weights and resets the board to blank.</li>
        </ul>

        <h3>Brush Tool</h3>
        <ul>
          <li><b>Mode: Weight</b> paints a traversal cost onto cells (0 = free, 1000 = very costly). Dijkstra and A* will route around high-cost cells.</li>
          <li><b>Mode: Blocked</b> places or erases solid wall cells that no algorithm can pass through.</li>
          <li><b>Shape</b> choose Square or Circle for the brush footprint.</li>
          <li><b>Brush size</b> controls how many cells are painted at once (1 to 500).</li>
          <li>Click and drag on the grid to paint.</li>
        </ul>

        <h3>Algorithms</h3>
        <ul>
          <li><b>BFS</b>(Breadth-First Search) explores cells layer by layer. Guarantees the shortest path in number of steps. Ignores cell weights.</li>
          <li><b>DFS</b>(Depth-First Search) explores one branch as deep as possible before backtracking. Does not guarantee the shortest path.</li>
          <li><b>Dijkstra</b> guarantees the minimum-cost path by using cell weights. Explores in order of cumulative cost from the start.</li>
          <li><b>A*</b> like Dijkstra but uses a heuristic estimate to focus the search toward the end cell. Faster than Dijkstra on open grids. Optimal at heuristic weight 1.</li>
        </ul>

        <h3>Heuristics(A* only)</h3>
        <ul>
          <li><b>Manhattan</b> counts horizontal and vertical steps. Best for 4-direction movement.</li>
          <li><b>Octile</b> accounts for diagonal moves costing √2. Best for 8-direction movement.</li>
          <li><b>Heuristic weight</b> multiplies the heuristic estimate. At 1 the path is optimal. Higher values explore fewer cells but may not find the shortest path.</li>
        </ul>

        <h3>Playback Controls</h3>
        <ul>
          <li><b>Visualize</b> starts the selected algorithm and plays it automatically.</li>
          <li><b>Pause</b> stops automatic playback at the current step.</li>
          <li><b>Unpause</b> resumes automatic playback.</li>
          <li><b>Step once</b> advances exactly one step at a time, useful for close inspection.</li>
          <li><b>Reset run</b> clears the current algorithm run and overlay without changing the board.</li>
          <li><b>Step delay</b> sets the time in milliseconds between automatic steps. Lower = faster.</li>
          <li><b>Movement</b> toggles between 4-directional (up/down/left/right only) and 8-directional (diagonals included) neighbour expansion.</li>
        </ul>

        <h3>Board Generation</h3>
        <ul>
          <li><b>Random terrain</b> randomly places walls and assigns weights, then smooths the result to create natural-looking regions.</li>
          <li><b>Maze</b> generates a perfect maze using depth-first search. Always has exactly one solution path.</li>
          <li><b>Auto seed</b> uses a different random seed each time so every board is unique.</li>
          <li><b>Manual seed</b> enter a number to reproduce the exact same board layout every time you generate.</li>
          <li><b>Block density</b> controls what fraction of cells are walls in random terrain (0 = none, 1 = all blocked).</li>
          <li><b>Smooth passes</b> how many times the terrain is smoothed. More passes create larger open regions.</li>
        </ul>

        <h3>Colours</h3>
        <ul>
          <li><b>Green</b> start cell</li>
          <li><b>Red</b> end cell</li>
          <li><b>Dark / black</b> wall cell</li>
          <li><b>Blue shades</b> open cells with weight (deeper blue = higher cost)</li>
          <li><b>Light blue</b> cells on the frontier (discovered but not yet settled)</li>
          <li><b>Pale blue</b> visited cells (settled by the algorithm)</li>
          <li><b>Amber</b> the cell currently being processed</li>
          <li><b>Yellow line</b> the final path found</li>
        </ul>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}