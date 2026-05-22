import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import { buildGraph, familyColor, relatedFor, type GraphNode, type GraphEdge } from '../lib/related';
import { PARTS } from '../lib/parts';

// ---------------------------------------------------------------------------
// Force simulation — no external dependency
// ---------------------------------------------------------------------------
type Vec2 = { x: number; y: number };

function runSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  onTick: (pos: Vec2[]) => void,
  onDone: (pos: Vec2[]) => void,
): () => void {
  const n = nodes.length;
  const pos: Vec2[] = nodes.map(() => ({
    x: width / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.5,
    y: height / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.5,
  }));
  const vel: Vec2[] = nodes.map(() => ({ x: 0, y: 0 }));

  const idToIdx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const adjMap = new Map<string, { target: number; score: number }[]>();
  for (const e of edges) {
    const si = idToIdx.get(e.source);
    const ti = idToIdx.get(e.target);
    if (si == null || ti == null) continue;
    if (!adjMap.has(e.source)) adjMap.set(e.source, []);
    if (!adjMap.has(e.target)) adjMap.set(e.target, []);
    adjMap.get(e.source)!.push({ target: ti, score: e.score });
    adjMap.get(e.target)!.push({ target: si, score: e.score });
  }

  const REPEL    = 4000;
  const SPRING_K = 0.05;
  const REST_LEN = 120;
  const CENTER_G = 0.012;
  const DAMP     = 0.80;

  let alpha = 1.0;
  let frame = 0;
  let rafId: number;

  function tick() {
    alpha *= 0.991;
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < n; i++) {
      let fx = 0;
      let fy = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist2 = dx * dx + dy * dy + 1;
        const dist  = Math.sqrt(dist2);
        const str   = REPEL / dist2;
        fx += (dx / dist) * str;
        fy += (dy / dist) * str;
      }

      const nbrs = adjMap.get(nodes[i].id) ?? [];
      for (const { target: j, score } of nbrs) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const stretch = dist - REST_LEN * (1 - score * 0.35);
        fx += (dx / dist) * SPRING_K * stretch;
        fy += (dy / dist) * SPRING_K * stretch;
      }

      fx += (cx - pos[i].x) * CENTER_G;
      fy += (cy - pos[i].y) * CENTER_G;

      vel[i].x = (vel[i].x + fx * alpha) * DAMP;
      vel[i].y = (vel[i].y + fy * alpha) * DAMP;
      pos[i].x = Math.max(30, Math.min(width  - 30, pos[i].x + vel[i].x));
      pos[i].y = Math.max(30, Math.min(height - 30, pos[i].y + vel[i].y));
    }

    frame++;
    if (frame % 4 === 0) onTick([...pos.map((p) => ({ ...p }))]);

    if (alpha > 0.01 && frame < 800) {
      rafId = requestAnimationFrame(tick);
    } else {
      onDone([...pos.map((p) => ({ ...p }))]);
    }
  }

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------
const NODE_R     = 10;
const NODE_R_SEL = 15;
const NODE_R_HOV = 13;

function drawGraph(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Vec2[],
  idToIdx: Map<string, number>,
  selectedId: string | null,
  hoveredId: string | null,
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, W, H);

  // Edges
  for (const e of edges) {
    const si = idToIdx.get(e.source);
    const ti = idToIdx.get(e.target);
    if (si == null || ti == null) continue;
    const sp = positions[si];
    const tp = positions[ti];
    if (!sp || !tp) continue;

    const highlight =
      e.source === selectedId || e.target === selectedId ||
      e.source === hoveredId  || e.target === hoveredId;

    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(tp.x, tp.y);
    if (highlight) {
      ctx.strokeStyle = `rgba(255,214,10,${0.25 + e.score * 0.45})`;
      ctx.lineWidth   = 1.5 + e.score * 2;
    } else {
      ctx.strokeStyle = `rgba(245,245,240,${0.03 + e.score * 0.07})`;
      ctx.lineWidth   = 0.5 + e.score;
    }
    ctx.stroke();
  }

  // Nodes — specials on top
  const specials = new Set([selectedId, hoveredId].filter(Boolean));

  const drawNode = (node: GraphNode, i: number) => {
    const p = positions[i];
    if (!p) return;

    const isSel = node.id === selectedId;
    const isHov = node.id === hoveredId;
    const r     = isSel ? NODE_R_SEL : isHov ? NODE_R_HOV : NODE_R;
    const color = familyColor(node.family);

    if (isSel) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,214,10,0.18)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = isSel
      ? '#ffd60a'
      : isHov
      ? 'rgba(245,245,240,0.75)'
      : 'rgba(245,245,240,0.18)';
    ctx.lineWidth = isSel ? 2.5 : 1;
    ctx.stroke();

    if (isSel || isHov) {
      const label = node.name.length > 30 ? node.name.slice(0, 28) + '…' : node.name;
      ctx.font      = `700 11px 'JetBrains Mono', monospace`;
      ctx.fillStyle = isSel ? '#ffd60a' : '#f5f5f0';
      ctx.textAlign = 'center';
      ctx.fillText(label, p.x, p.y + r + 14);
      ctx.font      = `10px 'JetBrains Mono', monospace`;
      ctx.fillStyle = 'rgba(245,245,240,0.45)';
      ctx.fillText(node.sku, p.x, p.y + r + 26);
    }
  };

  nodes.forEach((node, i) => { if (!specials.has(node.id)) drawNode(node, i); });
  nodes.forEach((node, i) => { if (specials.has(node.id))  drawNode(node, i); });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function RelatedPartsPage() {
  const navigate  = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef    = useRef<Vec2[]>([]);
  const rafRef    = useRef<number>(0);
  const dragging  = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  const [positions, setPositions] = useState<Vec2[]>([]);
  const [simDone,   setSimDone]   = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [size, setSize] = useState({ w: 900, h: 640 });

  const { nodes, edges } = useMemo(() => buildGraph(), []);
  const idToIdx = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);

  // Responsive canvas size
  useEffect(() => {
    function measure() {
      const el = canvasRef.current?.parentElement;
      if (el) setSize({ w: el.clientWidth, h: Math.min(el.clientWidth * 0.68, 640) });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Run simulation
  useEffect(() => {
    if (size.w < 100) return;
    setSimDone(false);
    const cleanup = runSimulation(
      nodes, edges, size.w, size.h,
      (pos) => { posRef.current = pos; setPositions([...pos]); },
      (pos) => { posRef.current = pos; setPositions([...pos]); setSimDone(true); },
    );
    return cleanup;
  }, [nodes, edges, size.w, size.h]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || posRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    canvas.width  = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width  = `${size.w}px`;
    canvas.style.height = `${size.h}px`;

    cancelAnimationFrame(rafRef.current);

    function frame() {
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const lw = size.w;
      const lh = size.h;

      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, lw, lh);

      ctx.translate(transform.x + lw / 2, transform.y + lh / 2);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(-lw / 2, -lh / 2);

      drawGraph(ctx, nodes, edges, posRef.current, idToIdx, selectedId, hoveredId);
      ctx.restore();

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [positions, selectedId, hoveredId, transform, size, nodes, edges, idToIdx]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number, canvas: HTMLCanvasElement): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const lx   = clientX - rect.left;
      const ly   = clientY - rect.top;
      const cx   = size.w / 2;
      const cy   = size.h / 2;
      return {
        x: (lx - cx - transform.x) / transform.scale + cx,
        y: (ly - cy - transform.y) / transform.scale + cy,
      };
    },
    [size, transform],
  );

  function nearestNode(cx: number, cy: number): GraphNode | null {
    let best: GraphNode | null = null;
    let bestDist = 28;
    posRef.current.forEach((p, i) => {
      if (!p) return;
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < bestDist) { bestDist = d; best = nodes[i]; }
    });
    return best;
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (dragging.current) {
      setTransform((t) => ({
        ...t,
        x: dragging.current!.tx + (e.clientX - dragging.current!.startX),
        y: dragging.current!.ty + (e.clientY - dragging.current!.startY),
      }));
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = toCanvas(e.clientX, e.clientY, canvas);
    const node = nearestNode(x, y);
    setHoveredId(node?.id ?? null);
    canvas.style.cursor = node ? 'pointer' : 'grab';
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    dragging.current = { startX: e.clientX, startY: e.clientY, tx: transform.x, ty: transform.y };
  }

  function onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    const moved = dragging.current
      ? Math.hypot(e.clientX - dragging.current.startX, e.clientY - dragging.current.startY) > 4
      : false;
    dragging.current = null;
    if (!moved) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = toCanvas(e.clientX, e.clientY, canvas);
      const node = nearestNode(x, y);
      setSelectedId(node?.id ?? null);
    }
  }

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.3, Math.min(5, t.scale * factor)),
    }));
  }

  const selectedPart      = selectedId ? PARTS.find((p) => p.sku === selectedId) : null;
  const selectedNeighbors = selectedId ? relatedFor(selectedId) : [];

  const FAMILY_LEGEND = [
    ['Brake caliper',   '#ffd60a'],
    ['Brake rotor',     '#ea580c'],
    ['Brake assembly',  '#dc2626'],
    ['Wire harness PV', '#0369a1'],
    ['Wire prep',       '#0891b2'],
  ] as const;

  return (
    <div>
      <Hero
        eyebrow="Part Catalog · Related Parts Network"
        title="Part similarity graph"
        subtitle="Every SKU is a node. Edges connect the most similar parts by commodity family, supplier tier, material, defect-mode signature, and BOM neighborhood. Drag to pan, scroll to zoom, click any part."
        rightSlot={
          <div className="rivet-border bg-graphite-900 px-6 py-5 text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-safety-bright">Catalog size</div>
            <div className="font-display text-3xl text-safety mt-1">{nodes.length} parts</div>
            <div className="font-mono text-[11px] text-white/60 mt-1">{edges.length} similarity edges</div>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row">
        {/* Canvas */}
        <div className="flex-1 min-w-0 relative bg-graphite-900" style={{ minHeight: `${size.h}px` }}>
          <canvas
            ref={canvasRef}
            onMouseMove={onMouseMove}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { setHoveredId(null); dragging.current = null; }}
            onWheel={onWheel}
            style={{ display: 'block', cursor: 'grab', userSelect: 'none' }}
          />
          {!simDone && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-safety-bright/50 animate-pulse">
                Calculating similarity graph…
              </p>
            </div>
          )}
          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-x-4 gap-y-1 max-w-sm">
            {FAMILY_LEGEND.map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="inline-block" style={{ width: 9, height: 9, background: color }} />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">{label}</span>
              </span>
            ))}
          </div>
          <div className="absolute top-4 right-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
            Drag · scroll · click
          </div>
        </div>

        {/* Side panel */}
        <aside
          className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-graphite-700 bg-white flex-none overflow-y-auto"
          style={{ maxHeight: `${size.h + 100}px` }}
        >
          {selectedPart ? (
            <div className="p-5">
              {/* Part header */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="h-10 w-10 flex-none flex items-center justify-center font-mono text-[10px] font-bold uppercase text-white"
                  style={{ background: familyColor(selectedPart.family) }}
                >
                  {selectedPart.family.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-base text-graphite-900 leading-tight">{selectedPart.name}</h2>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-graphite-500 mt-0.5">
                    {selectedPart.sku}
                  </p>
                </div>
              </div>

              {/* Attributes */}
              <div className="space-y-1 text-xs mb-4">
                <div className="flex justify-between border-b border-graphite-100 pb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">Family</span>
                  <span className="font-semibold text-graphite-800">{selectedPart.family}</span>
                </div>
                <div className="flex justify-between border-b border-graphite-100 pb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">Material</span>
                  <span className="text-graphite-700 text-right max-w-[60%]">{selectedPart.material}</span>
                </div>
                <div className="flex justify-between border-b border-graphite-100 pb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">Supplier</span>
                  <span className="text-graphite-700">{selectedPart.supplier}</span>
                </div>
                <div className="flex justify-between border-b border-graphite-100 pb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">Tier</span>
                  <span className={`chip ${selectedPart.supplier_tier === 'Tier-1' ? 'good' : 'warn'}`}>
                    {selectedPart.supplier_tier}
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">Plants</span>
                  <span className="flex gap-1">
                    {selectedPart.plants.map((pl) => (
                      <span key={pl} className="chip dark">{pl}</span>
                    ))}
                  </span>
                </div>
              </div>

              {/* Defect modes */}
              {selectedPart.defect_modes.length > 0 && (
                <div className="mb-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-graphite-400 mb-1.5">Defect modes</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPart.defect_modes.map((d) => (
                      <span key={d} className="chip alert text-[9px]">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              <Link
                to={`/parts/${selectedPart.sku}`}
                className="inline-block font-mono text-[9px] uppercase tracking-[0.25em] border border-safety/50 bg-safety/10 px-3 py-1.5 text-safety-dim hover:bg-safety hover:text-graphite-900 transition mb-5"
              >
                View part detail →
              </Link>

              {/* Neighbors */}
              <div className="border-t border-graphite-100 pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-graphite-400 mb-2">
                  Top {selectedNeighbors.length} related parts
                </p>
                <ol className="space-y-1">
                  {selectedNeighbors.map((nb) => (
                    <li key={nb.sku}>
                      <button
                        onClick={() => setSelectedId(nb.sku)}
                        className="w-full text-left px-2 py-1.5 border-l-2 border-graphite-100 hover:border-safety hover:bg-bone transition"
                      >
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="font-display text-sm text-graphite-800 truncate">{nb.part.name}</span>
                          <span className="font-mono text-[9px] text-safety-dim flex-none">{Math.round(nb.score * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-400 truncate">{nb.sku}</span>
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-500 truncate mt-0.5">
                          {nb.why}
                        </div>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-5 border-t border-graphite-100 pt-4">
                <p className="text-[11px] leading-relaxed text-graphite-400">
                  Similarity computed from <span className="font-mono text-safety-dim">weighted Jaccard</span> across
                  commodity family, supplier tier, material group, defect-mode signature, and BOM neighborhood.
                  Top-8 neighbors per part, undirected union.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-graphite-400">
                Click any node to explore
              </p>
              <p className="text-sm text-graphite-600 leading-relaxed">
                Each node is a part SKU. Edges connect similar parts by commodity family,
                supplier tier, material, defect modes, and BOM adjacency. Clusters reveal
                shared procurement, process, and quality risk.
              </p>
              <div className="mt-3 space-y-1">
                {PARTS.map((p) => (
                  <button
                    key={p.sku}
                    onClick={() => setSelectedId(p.sku)}
                    className="w-full text-left px-2 py-1.5 border border-graphite-100 hover:border-safety hover:bg-bone transition flex items-center gap-2"
                  >
                    <span
                      className="h-2.5 w-2.5 flex-none"
                      style={{ background: familyColor(p.family) }}
                    />
                    <span className="font-mono text-[10px] text-graphite-500 w-16 flex-none">{p.sku}</span>
                    <span className="text-sm text-graphite-800 truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Part index grid below the canvas */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-2xl">Parts catalog</h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-graphite-500">{PARTS.length} SKUs</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PARTS.map((p) => (
            <Link
              key={p.sku}
              to={`/parts/${p.sku}`}
              className="steel-card p-4 hover:border-l-safety transition block"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="h-3 w-3 flex-none"
                  style={{ background: familyColor(p.family) }}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-graphite-500">{p.sku}</span>
                <span className={`chip ${p.supplier_tier === 'Tier-1' ? 'good' : 'warn'} ml-auto`}>
                  {p.supplier_tier}
                </span>
              </div>
              <div className="font-display text-base text-graphite-900 leading-tight">{p.name}</div>
              <div className="font-mono text-[10px] text-graphite-500 mt-1 uppercase tracking-wider">
                {p.family} · {p.plants.join(', ')}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
