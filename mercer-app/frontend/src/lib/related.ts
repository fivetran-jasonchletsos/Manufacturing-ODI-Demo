// Related-parts similarity engine.
//
// Pre-computes a top-K nearest-neighbor list for each part/SKU using
// weighted Jaccard overlap across five dimensions.  Mirrors what a
// Snowflake Cortex embedding pipeline would produce in production —
// the math runs locally so the static site ships the graph without a
// runtime API.

import { PARTS, type Part } from './parts';

export type RelatedNeighbor = {
  sku: string;
  part: Part;
  score: number;        // 0..1
  why: string;          // human-readable reason
  sharedFamilies: string[];
  sharedDefects: string[];
};

// ---------------------------------------------------------------------------
// Weights
// Commodity family + supplier tier are the strongest procurement signals.
// Material similarity matters for process engineering.
// Defect-mode overlap surfaces quality correlation.
// BOM neighborhood captures physical co-dependency.
// ---------------------------------------------------------------------------
const W_FAMILY   = 1.8;  // same commodity family is the dominant signal
const W_TIER     = 1.4;  // supplier tier alignment (Tier-1 vs Tier-2 risk profile)
const W_MATERIAL = 0.9;  // same base material group
const W_DEFECT   = 1.1;  // shared defect modes indicate common failure physics
const W_BOM      = 0.7;  // BOM neighborhood (co-assembly proximity)
const W_PLANT    = 0.5;  // same plant(s) — shared floor risk

const K = 8; // neighbors per part

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function jaccard(a: string[], b: string[]): { score: number; shared: string[] } {
  if (a.length === 0 || b.length === 0) return { score: 0, shared: [] };
  const setA = new Set(a);
  const shared = b.filter((x) => setA.has(x));
  const union = new Set([...a, ...b]).size;
  return { score: shared.length / union, shared };
}

// Normalize a material string to a coarse group for partial credit.
function materialGroup(mat: string): string {
  const m = mat.toLowerCase();
  if (m.includes('cast iron') || m.includes('ductile iron')) return 'iron';
  if (m.includes('aluminum') || m.includes('aluminium')) return 'aluminum';
  if (m.includes('copper')) return 'copper';
  if (m.includes('multi')) return 'multi-component';
  return mat;
}

function sameMaterialScore(a: Part, b: Part): number {
  if (a.material === b.material) return 1;
  if (materialGroup(a.material) === materialGroup(b.material)) return 0.6;
  return 0;
}

function sameTierScore(a: Part, b: Part): number {
  return a.supplier_tier === b.supplier_tier ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Pairwise score
// ---------------------------------------------------------------------------
function pairScore(a: Part, b: Part) {
  const fam  = jaccard([a.family],   [b.family]);
  const defect = jaccard(a.defect_modes, b.defect_modes);
  const bom  = jaccard(a.bom_neighbors, b.bom_neighbors);
  const plant = jaccard(a.plants,    b.plants);
  const mat  = sameMaterialScore(a, b);
  const tier = sameTierScore(a, b);

  const raw =
    W_FAMILY   * fam.score +
    W_TIER     * tier +
    W_MATERIAL * mat +
    W_DEFECT   * defect.score +
    W_BOM      * bom.score +
    W_PLANT    * plant.score;

  const maxPossible = W_FAMILY + W_TIER + W_MATERIAL + W_DEFECT + W_BOM + W_PLANT;
  const norm = raw / maxPossible;

  return {
    score: norm,
    sharedFamilies: fam.shared,
    sharedDefects: defect.shared,
  };
}

// ---------------------------------------------------------------------------
// "Why related" copy generator
// ---------------------------------------------------------------------------
function whyCopy(
  a: Part,
  b: Part,
  s: { sharedFamilies: string[]; sharedDefects: string[] },
): string {
  if (a.family === b.family) {
    if (a.supplier === b.supplier) return `Same supplier — ${a.supplier}`;
    if (a.supplier_tier === b.supplier_tier) {
      const mat = materialGroup(a.material) === materialGroup(b.material);
      return mat
        ? `Same family and material — ${a.family}`
        : `Same commodity family — ${a.family}`;
    }
    return `Same commodity family — ${a.family}`;
  }

  if (s.sharedDefects.length >= 2) {
    return `Shared defect modes (${s.sharedDefects.slice(0, 2).join(', ')})`;
  }
  if (s.sharedDefects.length === 1) {
    return `Shared defect mode — ${s.sharedDefects[0]}`;
  }

  if (a.supplier_tier === b.supplier_tier) {
    const samePlants = a.plants.some((p) => b.plants.includes(p));
    return samePlants
      ? `${a.supplier_tier} — same plant floor`
      : `Both ${a.supplier_tier} suppliers`;
  }

  if (a.bom_neighbors.includes(b.sku) || b.bom_neighbors.includes(a.sku)) {
    return 'Direct BOM neighbors';
  }

  return 'Adjacent process family';
}

// ---------------------------------------------------------------------------
// Top-K cache
// ---------------------------------------------------------------------------
let _cache: Map<string, RelatedNeighbor[]> | null = null;

function build(): Map<string, RelatedNeighbor[]> {
  const result = new Map<string, RelatedNeighbor[]>();

  for (let i = 0; i < PARTS.length; i++) {
    const a = PARTS[i];
    const scored: (RelatedNeighbor)[] = [];

    for (let j = 0; j < PARTS.length; j++) {
      if (i === j) continue;
      const b = PARTS[j];
      const s = pairScore(a, b);
      if (s.score <= 0) continue;
      scored.push({
        sku: b.sku,
        part: b,
        score: s.score,
        why: whyCopy(a, b, s),
        sharedFamilies: s.sharedFamilies,
        sharedDefects: s.sharedDefects,
      });
    }

    scored.sort((x, y) => y.score - x.score);
    result.set(a.sku, scored.slice(0, K));
  }

  return result;
}

export function relatedFor(sku: string): RelatedNeighbor[] {
  if (!_cache) _cache = build();
  return _cache.get(sku) ?? [];
}

// ---------------------------------------------------------------------------
// Graph helpers — used by the /related force-directed page
// ---------------------------------------------------------------------------
export type GraphNode = {
  id: string;   // sku
  sku: string;
  name: string;
  family: string;
  supplier_tier: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  score: number;
};

export function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (!_cache) _cache = build();

  const nodes: GraphNode[] = PARTS.map((p) => ({
    id: p.sku,
    sku: p.sku,
    name: p.name,
    family: p.family,
    supplier_tier: p.supplier_tier,
  }));

  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const [sku, neighbors] of _cache) {
    for (const nb of neighbors) {
      const key = [sku, nb.sku].sort().join('|');
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ source: sku, target: nb.sku, score: nb.score });
    }
  }

  return { nodes, edges };
}

// Color per commodity family — matches the industrial safety palette
export function familyColor(family: string): string {
  switch (family) {
    case 'Brake caliper':   return '#ffd60a'; // safety yellow
    case 'Brake rotor':     return '#ea580c'; // orange
    case 'Brake assembly':  return '#dc2626'; // alert red
    case 'Wire harness PV': return '#0369a1'; // steel blue
    case 'Wire prep':       return '#0891b2'; // teal
    default:                return '#6b7280'; // graphite
  }
}
