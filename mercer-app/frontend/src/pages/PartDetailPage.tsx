import { Link, useParams } from 'react-router-dom';
import Hero from '../components/Hero';
import { partBySku, PARTS } from '../lib/parts';
import { relatedFor, familyColor } from '../lib/related';
import NotFoundPage from './NotFoundPage';

export default function PartDetailPage() {
  const { sku = '' } = useParams<{ sku: string }>();
  const part = partBySku(sku);

  if (!part) return <NotFoundPage />;

  const neighbors = relatedFor(sku);

  // Siblings: other parts in the same commodity family
  const siblings = PARTS.filter((p) => p.family === part.family && p.sku !== part.sku);

  return (
    <div>
      <Hero
        eyebrow={`Part Detail · ${part.family}`}
        title={part.name}
        subtitle={`${part.sku} · ${part.material} · ${part.supplier_tier} — ${part.supplier} · Plants: ${part.plants.join(', ')}`}
        rightSlot={
          <div
            className="rivet-border px-6 py-5 text-right"
            style={{ background: familyColor(part.family) }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-800">Commodity family</div>
            <div className="font-display text-2xl text-graphite-900 mt-1">{part.family}</div>
            <div className="font-mono text-[11px] text-graphite-700 mt-1">{part.lines.length} production lines</div>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: part spec */}
        <div className="lg:col-span-2 space-y-6">

          {/* Spec table */}
          <div className="steel-card p-5">
            <h2 className="font-display text-xl mb-4">Part specification</h2>
            <table className="spec-table">
              <tbody>
                <tr>
                  <td className="font-mono text-[11px] uppercase tracking-wider text-graphite-500 w-36">SKU</td>
                  <td className="font-mono font-bold">{part.sku}</td>
                </tr>
                <tr>
                  <td className="font-mono text-[11px] uppercase tracking-wider text-graphite-500">Name</td>
                  <td className="font-semibold">{part.name}</td>
                </tr>
                <tr>
                  <td className="font-mono text-[11px] uppercase tracking-wider text-graphite-500">Family</td>
                  <td>
                    <span className="font-semibold">{part.family}</span>
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-[11px] uppercase tracking-wider text-graphite-500">Material</td>
                  <td>{part.material}</td>
                </tr>
                <tr>
                  <td className="font-mono text-[11px] uppercase tracking-wider text-graphite-500">Supplier</td>
                  <td>{part.supplier}</td>
                </tr>
                <tr>
                  <td className="font-mono text-[11px] uppercase tracking-wider text-graphite-500">Tier</td>
                  <td>
                    <span className={`chip ${part.supplier_tier === 'Tier-1' ? 'good' : 'warn'}`}>
                      {part.supplier_tier}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-[11px] uppercase tracking-wider text-graphite-500">Plants</td>
                  <td className="flex gap-1 flex-wrap">{part.plants.map((pl) => <span key={pl} className="chip dark">{pl}</span>)}</td>
                </tr>
                <tr>
                  <td className="font-mono text-[11px] uppercase tracking-wider text-graphite-500">Lines</td>
                  <td className="font-mono text-xs text-graphite-700">{part.lines.join(', ')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Defect modes */}
          <div className="steel-card alert p-5">
            <h2 className="font-display text-xl mb-3">Known defect modes</h2>
            {part.defect_modes.length === 0 ? (
              <p className="text-sm text-graphite-500">No defect modes recorded.</p>
            ) : (
              <ul className="space-y-2">
                {part.defect_modes.map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <span className="h-2 w-2 flex-none bg-alert" />
                    <span className="text-sm text-graphite-800">{d}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* BOM neighborhood */}
          <div className="steel-card safety p-5">
            <h2 className="font-display text-xl mb-3">BOM neighbors</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {part.bom_neighbors.map((sku) => {
                const nbPart = partBySku(sku);
                return nbPart ? (
                  <Link
                    key={sku}
                    to={`/parts/${sku}`}
                    className="border border-graphite-100 bg-bone px-3 py-2 hover:border-safety hover:bg-safety/5 transition"
                  >
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-400">{sku}</div>
                    <div className="text-sm font-semibold text-graphite-800 mt-0.5 leading-tight truncate">{nbPart.name}</div>
                    <div className="font-mono text-[9px] text-graphite-500 mt-0.5 uppercase">{nbPart.family}</div>
                  </Link>
                ) : (
                  <div key={sku} className="border border-graphite-100 bg-bone px-3 py-2 opacity-50">
                    <div className="font-mono text-[9px] text-graphite-400">{sku}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Family siblings */}
          {siblings.length > 0 && (
            <div className="steel-card p-5">
              <h2 className="font-display text-xl mb-3">Other parts in this family</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {siblings.map((s) => (
                  <Link
                    key={s.sku}
                    to={`/parts/${s.sku}`}
                    className="flex items-center gap-3 border border-graphite-100 bg-bone px-3 py-2 hover:border-safety hover:bg-safety/5 transition"
                  >
                    <span
                      className="h-3 w-3 flex-none"
                      style={{ background: familyColor(s.family) }}
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-[9px] text-graphite-400 uppercase">{s.sku}</div>
                      <div className="text-sm font-semibold text-graphite-800 truncate">{s.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Related Parts panel */}
        <aside className="lg:col-span-1">
          <div className="steel-card p-5 sticky top-24">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-xl">Related parts</h2>
              <Link
                to="/related"
                className="font-mono text-[9px] uppercase tracking-[0.2em] text-safety-dim hover:text-graphite-800 transition"
              >
                Full graph →
              </Link>
            </div>
            <p className="text-xs text-graphite-500 mb-4 leading-relaxed">
              Top-8 by weighted similarity across commodity family, supplier tier,
              material, defect-mode signature, and BOM neighborhood.
            </p>
            <ol className="space-y-1">
              {neighbors.map((nb, idx) => (
                <li key={nb.sku}>
                  <Link
                    to={`/parts/${nb.sku}`}
                    className="block w-full text-left px-2 py-2 border-l-2 border-graphite-100 hover:border-safety hover:bg-bone transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-graphite-400 flex-none">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="h-2 w-2 flex-none"
                          style={{ background: familyColor(nb.part.family) }}
                        />
                        <span className="font-display text-sm text-graphite-800 truncate">{nb.part.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-safety-dim flex-none font-bold">
                        {Math.round(nb.score * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 pl-7">
                      <span className="font-mono text-[9px] text-graphite-400 uppercase">{nb.sku}</span>
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-500 truncate mt-0.5 pl-7">
                      {nb.why}
                    </div>
                    {nb.sharedDefects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 pl-7">
                        {nb.sharedDefects.map((d) => (
                          <span key={d} className="chip alert text-[8px] py-0">{d}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ol>

            <div className="mt-5 border-t border-graphite-100 pt-4">
              <p className="text-[11px] leading-relaxed text-graphite-400">
                Similarity computed from{' '}
                <span className="font-mono text-safety-dim">weighted Jaccard</span>.
                Weights: family 1.8, tier 1.4, defect modes 1.1, material 0.9, BOM 0.7, plant 0.5.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
