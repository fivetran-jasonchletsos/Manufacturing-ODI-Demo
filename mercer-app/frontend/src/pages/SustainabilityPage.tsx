import Hero from '../components/Hero';
import { useJSON } from '../api/data';
import { Loading, ErrorState } from '../components/Skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

type Sustainability = {
  scope3_note: string;
  by_plant: {
    plant_id: string; plant: string;
    kwh_per_part: number; kwh_per_part_yoy_pct: number;
    co2e_kg_per_part: number; co2e_yoy_pct: number;
    water_gal_per_part: number; water_yoy_pct: number;
    waste_tonnes_month: number; waste_yoy_pct: number;
    scope1_tonnes_co2e: number; scope2_tonnes_co2e: number; scope3_tonnes_co2e: number;
  }[];
  monthly_co2e_trend: { month: string; scope1: number; scope2: number; scope3: number }[];
};

export default function SustainabilityPage() {
  const sus = useJSON<Sustainability>('sustainability.json');
  if (sus.loading) return <Loading label="Loading sustainability data…" />;
  if (sus.error) return <ErrorState error={sus.error} />;
  if (!sus.data) return null;

  const totals = sus.data.by_plant.reduce(
    (acc, p) => ({
      scope1: acc.scope1 + p.scope1_tonnes_co2e,
      scope2: acc.scope2 + p.scope2_tonnes_co2e,
      scope3: acc.scope3 + p.scope3_tonnes_co2e,
    }),
    { scope1: 0, scope2: 0, scope3: 0 }
  );

  return (
    <div>
      <Hero
        eyebrow="Scope 1 · Scope 2 · Scope 3"
        title="OEM Scope-3 reporting, automated"
        subtitle="GM and Stellantis require Vantex to report per-part embedded emissions starting with 2026 model year. With ODI, the Scope-3 export is a dbt model reading a governed energy-per-part mart — not a manual spreadsheet pulled from three different systems."
        rightSlot={
          <div className="rivet-border bg-graphite-900 px-6 py-5 text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-safety-bright">Annual CO2e</div>
            <div className="font-display text-3xl text-safety mt-1">{(((totals.scope1 + totals.scope2 + totals.scope3)) / 1e3).toFixed(0)}K t</div>
            <div className="font-mono text-[11px] text-white/60 mt-1">All scopes · 3 plants</div>
          </div>
        }
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="steel-card safety p-5 mb-6">
          <div className="eyebrow mb-2">Customer requirement</div>
          <p className="text-graphite-800">{sus.data.scope3_note}</p>
        </div>

        <h2 className="font-display text-xl mb-4">By plant — per-part footprint</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {sus.data.by_plant.map((p) => (
            <div key={p.plant_id} className="steel-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="chip dark">{p.plant_id}</span>
                <h3 className="font-display text-xl">{p.plant}</h3>
              </div>
              <div className="space-y-2">
                <Metric label="Energy / part" value={`${p.kwh_per_part} kWh`} yoy={p.kwh_per_part_yoy_pct} />
                <Metric label="CO2e / part"   value={`${p.co2e_kg_per_part} kg`} yoy={p.co2e_yoy_pct} />
                <Metric label="Water / part"  value={`${p.water_gal_per_part} gal`} yoy={p.water_yoy_pct} />
                <Metric label="Waste / month" value={`${p.waste_tonnes_month} t`} yoy={p.waste_yoy_pct} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="steel-card p-5">
            <h3 className="font-display text-lg mb-3">Scope split by plant (annual)</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={sus.data.by_plant.map((p) => ({ plant: p.plant_id, Scope1: p.scope1_tonnes_co2e, Scope2: p.scope2_tonnes_co2e, Scope3: p.scope3_tonnes_co2e }))}>
                  <XAxis dataKey="plant" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} stroke="#525252" />
                  <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#525252" />
                  <Tooltip
                    formatter={(v: number) => `${v.toLocaleString()} t CO2e`}
                    contentStyle={{ background: '#1f2937', border: '1px solid #ffd60a', borderRadius: 0, color: '#fff', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                  <Bar dataKey="Scope1" stackId="a" fill="#1f2937" />
                  <Bar dataKey="Scope2" stackId="a" fill="#525252" />
                  <Bar dataKey="Scope3" stackId="a" fill="#ffd60a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="steel-card p-5">
            <h3 className="font-display text-lg mb-3">18-month CO2e trend (all plants)</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={sus.data.monthly_co2e_trend}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} stroke="#525252" />
                  <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#525252" />
                  <Tooltip
                    formatter={(v: number) => `${v.toLocaleString()} t`}
                    contentStyle={{ background: '#1f2937', border: '1px solid #ffd60a', borderRadius: 0, color: '#fff', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                  <Area type="monotone" dataKey="scope3" stackId="1" stroke="#ffd60a" fill="#ffd60a" fillOpacity={0.7} name="Scope 3" />
                  <Area type="monotone" dataKey="scope2" stackId="1" stroke="#525252" fill="#525252" fillOpacity={0.7} name="Scope 2" />
                  <Area type="monotone" dataKey="scope1" stackId="1" stroke="#1f2937" fill="#1f2937" fillOpacity={0.9} name="Scope 1" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, yoy }: { label: string; value: string; yoy: number }) {
  const down = yoy < 0;
  return (
    <div className="flex items-baseline justify-between border-b border-graphite-100 pb-1">
      <div className="font-mono text-xs uppercase tracking-wider text-graphite-500">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg text-graphite-900 tabular">{value}</span>
        <span className={`font-mono text-[11px] tabular ${down ? 'text-green-700' : 'text-alert'}`}>
          {yoy > 0 ? '+' : ''}{yoy.toFixed(1)}% YoY
        </span>
      </div>
    </div>
  );
}
