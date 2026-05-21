import Hero from '../components/Hero';
import { useJSON } from '../api/data';
import { Loading, ErrorState } from '../components/Skeleton';

type Iceberg = {
  catalog: string;
  database: string;
  storage: string;
  nodes: { id: string; label: string; layer: string; type: string; rows: string }[];
  edges: { from: string; to: string; via: string }[];
  consumers: { name: string; reads: string }[];
};

const LAYER_ORDER = ['source', 'bronze', 'silver', 'gold', 'platinum'];
const LAYER_LABEL: Record<string, string> = {
  source: 'Sources (operational)',
  bronze: 'Bronze · raw landing',
  silver: 'Silver · conformed',
  gold:   'Gold · business marts',
  platinum: 'Platinum · agent-facing',
};
const LAYER_ACCENT: Record<string, string> = {
  source:   '#525252',
  bronze:   '#b45309',
  silver:   '#6b7280',
  gold:     '#caa600',
  platinum: '#1f2937',
};

export default function ArchitecturePage() {
  const ice = useJSON<Iceberg>('iceberg.json');
  if (ice.loading) return <Loading label="Loading lineage…" />;
  if (ice.error) return <ErrorState error={ice.error} />;
  if (!ice.data) return null;

  const byLayer = (layer: string) => ice.data!.nodes.filter((n) => n.layer === layer);

  return (
    <div>
      <Hero
        eyebrow="Reference Architecture"
        title="ODI for the plant floor"
        subtitle="Five operational systems land into one open Iceberg lake. dbt builds the bronze → silver → gold → platinum layers. Snowflake, Athena, Tableau, Power BI, and Cortex agents all read the same governed tables."
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="Catalog" value={ice.data.catalog} mono />
          <Stat label="Database" value={ice.data.database} mono />
          <Stat label="Storage" value={ice.data.storage} mono />
          <Stat label="Tables (all layers)" value={ice.data.nodes.filter((n) => n.layer !== 'source').length.toString()} />
        </div>

        <div className="space-y-6">
          {LAYER_ORDER.map((layer) => {
            const nodes = byLayer(layer);
            if (!nodes.length) return null;
            const accent = LAYER_ACCENT[layer];
            return (
              <div key={layer} className="steel-card p-5" style={{ borderLeftColor: accent }}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="font-display text-xl text-graphite-900">{LAYER_LABEL[layer]}</h2>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-500">{nodes.length} {layer === 'source' ? 'systems' : 'tables'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {nodes.map((n) => (
                    <div key={n.id} className="border border-graphite-100 bg-white px-3 py-2">
                      <div className="font-mono text-sm font-semibold text-graphite-900 break-all">{n.label}</div>
                      <div className="flex justify-between mt-1 text-[11px] font-mono">
                        <span className="text-graphite-500">{n.type}</span>
                        <span className="text-graphite-700 tabular">{n.rows}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10">
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">Lineage edges</h2>
          <div className="steel-card p-0 overflow-hidden">
            <table className="spec-table">
              <thead>
                <tr><th>From</th><th>To</th><th>Mechanism</th></tr>
              </thead>
              <tbody>
                {ice.data.edges.map((e, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs">{labelOf(ice.data!, e.from)}</td>
                    <td className="font-mono text-xs">{labelOf(ice.data!, e.to)}</td>
                    <td>
                      <span className={`chip ${e.via === 'Fivetran' ? 'dark' : 'silver'}`}>{e.via}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">Downstream consumers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ice.data.consumers.map((c) => (
              <div key={c.name} className="steel-card good p-4">
                <div className="font-display text-lg text-graphite-900">{c.name}</div>
                <div className="font-mono text-xs text-graphite-600 mt-1">reads: {c.reads}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function labelOf(d: Iceberg, id: string) {
  return d.nodes.find((n) => n.id === id)?.label ?? id;
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="steel-card safety p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">{label}</div>
      <div className={`mt-1 text-graphite-900 ${mono ? 'font-mono text-sm break-all' : 'font-display text-2xl'}`}>{value}</div>
    </div>
  );
}
