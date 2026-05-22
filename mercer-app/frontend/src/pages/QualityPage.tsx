import Hero from '../components/Hero';
import { useJSON } from '../api/data';
import { Loading, ErrorState } from '../components/Skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line, Cell } from 'recharts';

type Quality = {
  ftq_by_family: { family: string; plants: string[]; ftq_pct: number; ftq_target_pct: number; in_spec_units: number; rejected_units: number }[];
  pareto: { rank: number; mode: string; count: number; pct_of_total: number }[];
  ftq_trend: { date: string; ftq_pct: number }[];
};

type Downtime = {
  records: { plant_id: string; plant: string; category: string; hours_lost: number; events: number; est_cost_usd: number }[];
};

export default function QualityPage() {
  const q = useJSON<Quality>('quality.json');
  const d = useJSON<Downtime>('downtime.json');

  if (q.loading || d.loading) return <Loading label="Loading quality + downtime…" />;
  if (q.error) return <ErrorState error={q.error} />;
  if (d.error) return <ErrorState error={d.error} />;
  if (!q.data || !d.data) return null;

  const downtimeByPlant = ['TOL', 'STH', 'IND'].map((pid) => ({
    plant_id: pid,
    plant: d.data!.records.find((r) => r.plant_id === pid)!.plant,
    records: d.data!.records.filter((r) => r.plant_id === pid).slice(0, 7),
    total_hours: d.data!.records.filter((r) => r.plant_id === pid).reduce((s, r) => s + r.hours_lost, 0),
    total_cost: d.data!.records.filter((r) => r.plant_id === pid).reduce((s, r) => s + r.est_cost_usd, 0),
  }));

  return (
    <div>
      <Hero
        eyebrow="Quality + Downtime"
        title="Where the parts go wrong"
        subtitle="First-time quality (FTQ) by part family, the Pareto of defect modes across the last 30 days, and the top downtime causes by plant — all from the same governed data layer."
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="font-display text-xl mb-4">First-time quality by part family</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {q.data.ftq_by_family.map((f) => {
            const off = f.ftq_pct < f.ftq_target_pct;
            return (
              <div key={f.family} className={`steel-card ${off ? 'alert' : 'good'} p-5`}>
                <div className="font-display text-lg text-graphite-900">{f.family}</div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-graphite-500 mb-3">{f.plants.join(' · ')}</div>
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="font-display text-3xl text-graphite-900 tabular">{f.ftq_pct}%</div>
                  <div className="font-mono text-xs text-graphite-500">target {f.ftq_target_pct}%</div>
                </div>
                <div className={`font-mono text-xs ${off ? 'text-alert' : 'text-green-700'}`}>
                  {off ? '↓' : '↑'} {Math.abs(f.ftq_pct - f.ftq_target_pct).toFixed(2)}pp vs target
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="border border-graphite-100 px-2 py-1">
                    <div className="font-mono text-[10px] text-graphite-500 uppercase">In-spec</div>
                    <div className="font-display tabular">{(f.in_spec_units / 1e3).toFixed(0)}K</div>
                  </div>
                  <div className="border border-graphite-100 px-2 py-1">
                    <div className="font-mono text-[10px] text-graphite-500 uppercase">Rejected</div>
                    <div className="font-display tabular text-alert">{f.rejected_units.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="steel-card p-5">
            <h3 className="font-display text-lg mb-3">Defect Pareto · last 30 days</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={q.data.pareto} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#525252" />
                  <YAxis type="category" dataKey="mode" tick={{ fontSize: 11, fontFamily: 'Inter' }} stroke="#525252" width={180} />
                  <Tooltip
                    formatter={(v: number) => v.toLocaleString()}
                    contentStyle={{ background: '#1f2937', border: '1px solid #ffd60a', borderRadius: 0, color: '#fff', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#ffd60a">
                    {q.data.pareto.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#dc2626' : i === 1 ? '#ea580c' : '#ffd60a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-graphite-600 font-mono">
              Top 2 modes account for {(q.data.pareto[0].pct_of_total + q.data.pareto[1].pct_of_total).toFixed(1)}% of all defects.
            </div>
          </div>

          <div className="steel-card p-5">
            <h3 className="font-display text-lg mb-3">FTQ trend · last 90 days</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={q.data.ftq_trend}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} stroke="#525252" interval={9} />
                  <YAxis domain={[97.5, 99.5]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#525252" />
                  <Tooltip
                    formatter={(v: number) => `${v.toFixed(2)}%`}
                    contentStyle={{ background: '#1f2937', border: '1px solid #ffd60a', borderRadius: 0, color: '#fff', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                  />
                  <ReferenceLine y={98.5} stroke="#ffd60a" strokeDasharray="4 4" label={{ value: 'Target 98.5%', fill: '#caa600', fontSize: 11, position: 'right' }} />
                  <Line type="monotone" dataKey="ftq_pct" stroke="#1f2937" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <h2 className="font-display text-xl mb-4">Top downtime causes · last 30 days</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {downtimeByPlant.map((p) => (
            <div key={p.plant_id} className="steel-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="chip dark">{p.plant_id}</span>
                  <h3 className="font-display text-lg">{p.plant}</h3>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl text-alert tabular">{p.total_hours.toFixed(0)}h</div>
                  <div className="font-mono text-[10px] text-graphite-500 uppercase">${(p.total_cost / 1e3).toFixed(0)}K cost</div>
                </div>
              </div>
              <table className="spec-table">
                <thead><tr><th>Cause</th><th className="text-right">Hours</th><th className="text-right">Events</th></tr></thead>
                <tbody>
                  {p.records.map((r) => (
                    <tr key={r.category}>
                      <td className="text-xs">{r.category}</td>
                      <td className="text-right font-mono text-xs tabular">{r.hours_lost.toFixed(1)}</td>
                      <td className="text-right font-mono text-xs tabular">{r.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
