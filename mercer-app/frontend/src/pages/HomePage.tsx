import { Link } from 'react-router-dom';
import { useJSON } from '../api/data';
import Hero from '../components/Hero';
import { Loading, ErrorState } from '../components/Skeleton';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

type Summary = {
  generated_at: string;
  snapshot_date: string;
  company: { name: string; tier: string; annual_revenue_usd: number; headcount: number; customers: string[]; products: string[] };
  kpis: { label: string; value: number; unit: string; delta: string | null }[];
  plants: { id: string; name: string; lines: number; headcount: number; product_focus: string }[];
  top_issues: { rank: number; plant: string; issue: string; severity: string; owner: string }[];
};

type Production = {
  daily: { date: string; plant_id: string; line_id: string; oee: number }[];
  by_line_summary: { plant_id: string; plant: string; line_id: string; line: string; product: string; oee_30d: number; availability_30d: number; performance_30d: number; quality_30d: number }[];
};

export default function HomePage() {
  const summary = useJSON<Summary>('summary.json');
  const production = useJSON<Production>('production.json');

  if (summary.loading || production.loading) return <Loading label="Loading plant snapshot…" />;
  if (summary.error) return <ErrorState error={summary.error} />;
  if (production.error) return <ErrorState error={production.error} />;
  if (!summary.data || !production.data) return null;

  const { company, kpis, plants, top_issues } = summary.data;

  // 30-day plant OEE trend
  const plantTrend = aggregatePlantOEE(production.data.daily);

  return (
    <div>
      <Hero
        eyebrow={`Plant Operations · Snapshot ${summary.data.snapshot_date}`}
        title="Three plants, one signal"
        subtitle="Mercer Manufacturing ships brake systems and wire harnesses to GM, Ford, Stellantis, and Honda. This portal unifies SAP, MES, process historian, and SCADA into one governed semantic layer — plant directors and agents read the same gold tables."
        rightSlot={
          <div className="rivet-border bg-graphite-900 px-6 py-5 text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-safety-bright">Annual revenue</div>
            <div className="font-display text-3xl text-safety mt-1">${(company.annual_revenue_usd / 1e9).toFixed(2)}B</div>
            <div className="font-mono text-[11px] text-white/60 mt-1">{company.headcount.toLocaleString()} employees · {company.customers.join(', ')}</div>
          </div>
        }
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="kpi-tile">
              <div className="kpi-tile-label">{k.label}</div>
              <div className="kpi-tile-value">
                {formatKpi(k.value, k.unit)}
              </div>
              {k.delta && (
                <div className={`kpi-tile-delta ${k.delta.startsWith('+') ? 'text-green-700' : 'text-alert'}`}>
                  {k.delta}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 steel-card safety p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-xl">Plant OEE — last 30 days</h2>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-500">target 75%</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={plantTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#525252" />
                <YAxis domain={[0.55, 0.85]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#525252" />
                <Tooltip
                  formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                  contentStyle={{ background: '#1f2937', border: '1px solid #ffd60a', borderRadius: 0, color: '#fff', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                />
                <ReferenceLine y={0.75} stroke="#ffd60a" strokeDasharray="4 4" label={{ value: 'Target', fill: '#caa600', fontSize: 11, position: 'right' }} />
                <Line type="monotone" dataKey="TOL" stroke="#1f2937" strokeWidth={2.5} dot={false} name="Toledo OH" />
                <Line type="monotone" dataKey="STH" stroke="#dc2626" strokeWidth={2.5} dot={false} name="Sterling Heights MI" />
                <Line type="monotone" dataKey="IND" stroke="#0369a1" strokeWidth={2.5} dot={false} name="Indianapolis IN" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Legend swatch="#1f2937" label="Toledo OH" />
            <Legend swatch="#dc2626" label="Sterling Heights MI" />
            <Legend swatch="#0369a1" label="Indianapolis IN" />
          </div>
        </div>

        <div className="steel-card alert p-5">
          <h2 className="font-display text-xl mb-3">Top 3 issues</h2>
          <ul className="space-y-3">
            {top_issues.map((it) => (
              <li key={it.rank} className="border-l-2 border-graphite-200 pl-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-graphite-500">#{it.rank}</span>
                  <span className={`chip ${it.severity === 'critical' ? 'alert' : 'warn'}`}>{it.severity}</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-graphite-800">{it.issue}</div>
                <div className="font-mono text-[11px] text-graphite-500 mt-1">{it.plant} · owner: {it.owner}</div>
              </li>
            ))}
          </ul>
          <Link to="/predictive" className="mt-4 inline-block font-mono text-xs uppercase tracking-wider text-safety-dim hover:text-graphite-800">
            View predictive maintenance →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl">Plants</h2>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-graphite-500">{plants.length} sites · {plants.reduce((s, p) => s + p.lines, 0)} lines · {plants.reduce((s, p) => s + p.headcount, 0).toLocaleString()} employees</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plants.map((p) => {
            const lines30d = production.data!.by_line_summary.filter((l) => l.plant_id === p.id);
            const plantOEE = lines30d.length ? lines30d.reduce((s, l) => s + l.oee_30d, 0) / lines30d.length : 0;
            return (
              <div key={p.id} className="steel-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="chip dark">{p.id}</span>
                  <h3 className="font-display text-xl">{p.name}</h3>
                </div>
                <div className="text-sm text-graphite-600 mb-3">{p.product_focus}</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Mini label="OEE 30d" value={`${(plantOEE * 100).toFixed(1)}%`} />
                  <Mini label="Lines" value={p.lines} />
                  <Mini label="Headcount" value={p.headcount.toLocaleString()} />
                </div>
                <div className="space-y-1">
                  {lines30d.slice(0, 4).map((l) => (
                    <div key={l.line_id} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-graphite-700 truncate">{l.line}</span>
                      <span className={`tabular ${l.oee_30d < 0.65 ? 'text-alert' : l.oee_30d < 0.72 ? 'text-orange-700' : 'text-green-700'} font-bold`}>
                        {(l.oee_30d * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {lines30d.length > 4 && (
                    <div className="text-[11px] text-graphite-400 font-mono">+ {lines30d.length - 4} more lines</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-graphite-700">
      <span className="h-3 w-3" style={{ background: swatch }} /> {label}
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bone border border-graphite-100 px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-graphite-500">{label}</div>
      <div className="font-display text-base text-graphite-800">{value}</div>
    </div>
  );
}

function formatKpi(value: number, unit: string) {
  if (unit === 'units') {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  }
  if (unit === '%') return `${value}%`;
  return value.toString();
}

function aggregatePlantOEE(daily: Production['daily']) {
  // Group by date+plant_id, average across lines
  const last30 = new Set<string>();
  const sortedDates = [...new Set(daily.map((d) => d.date))].sort();
  sortedDates.slice(-30).forEach((d) => last30.add(d));

  const byKey = new Map<string, { sum: number; count: number }>();
  for (const r of daily) {
    if (!last30.has(r.date)) continue;
    const key = `${r.date}|${r.plant_id}`;
    const cur = byKey.get(key) ?? { sum: 0, count: 0 };
    cur.sum += r.oee;
    cur.count += 1;
    byKey.set(key, cur);
  }

  const out: Record<string, any> = {};
  for (const [key, v] of byKey) {
    const [date, plant] = key.split('|');
    if (!out[date]) out[date] = { date: date.slice(5) };
    out[date][plant] = v.sum / v.count;
  }
  return Object.values(out).sort((a: any, b: any) => a.date.localeCompare(b.date));
}
