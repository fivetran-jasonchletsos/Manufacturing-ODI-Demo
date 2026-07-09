import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import { useJSON } from '../api/data';
import { Loading, ErrorState } from '../components/Skeleton';

type Predictive = {
  generated_by: string;
  flagged: {
    asset_id: string; plant: string; line: string;
    signal: string; sensor: string; value: number; unit: string;
    days_to_failure_p50: number; days_to_failure_p10: number;
    recommended_action: string;
    cost_of_failure_usd: number; cost_of_pm_usd: number;
    confidence: number;
  }[];
};

const SENSOR_LABEL: Record<string, string> = {
  vibration: 'Vibration RMS',
  temperature: 'Temperature',
  oil_particles: 'Oil particle count',
  current: 'Spindle current',
  pressure: 'Exhaust pressure',
  quality_signal: 'Quality signal',
};

export default function PredictivePage() {
  const pred = useJSON<Predictive>('predictive.json');
  if (pred.loading) return <Loading label="Loading predictive alerts…" />;
  if (pred.error) return <ErrorState error={pred.error} />;
  if (!pred.data) return null;

  const totalAvoidance = pred.data.flagged.reduce((s, f) => s + (f.cost_of_failure_usd - f.cost_of_pm_usd), 0);

  return (
    <div>
      <Hero
        eyebrow="Predictive Maintenance · Agent-Generated"
        title="Eight machines flagged"
        subtitle="A predictive-maintenance agent reads the sensor signal and asset dimension tables every fifteen minutes, scores each asset, and writes scored alerts to the gold layer. These are the eight assets above threshold right now."
        rightSlot={
          <div className="rivet-border bg-graphite-900 px-6 py-5 text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-safety-bright">Failure cost avoided</div>
            <div className="font-display text-3xl text-safety mt-1">${(totalAvoidance / 1e3).toFixed(0)}K</div>
            <div className="font-mono text-[11px] text-white/60 mt-1">if all PMs executed</div>
          </div>
        }
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="steel-card safety p-4 mb-6">
          <div className="eyebrow mb-1">Model source</div>
          <div className="font-mono text-sm text-graphite-800">{pred.data.generated_by}</div>
          <div className="text-xs text-graphite-600 mt-2">
            The agent reads the same gold tables that humans see — no shadow pipeline, no
            export, no separate semantic layer. When the plant director asks "why is crimp
            press 7 flagged?", the answer cites the same rows the model used.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pred.data.flagged.map((f) => {
            const urgency = f.days_to_failure_p10 <= 7 ? 'alert' : f.days_to_failure_p10 <= 14 ? 'warn' : 'safety';
            const roi = (f.cost_of_failure_usd - f.cost_of_pm_usd) / f.cost_of_pm_usd;
            return (
              <div key={f.asset_id} className={`steel-card ${urgency} p-5`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-graphite-500">{f.plant} · {f.line}</div>
                    <div className="font-display text-xl text-graphite-900 mt-1">{f.asset_id}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`chip ${urgency}`}>{f.days_to_failure_p10}–{f.days_to_failure_p50} d to fail</span>
                    <div className="font-mono text-[10px] text-graphite-500 mt-1 uppercase tracking-wider">conf {(f.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>

                <div className="border border-graphite-100 bg-bone px-3 py-2 mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">{SENSOR_LABEL[f.sensor] ?? f.sensor}</div>
                  <div className="font-display text-2xl text-graphite-900 mt-1 tabular">
                    {f.value} <span className="text-base text-graphite-500">{f.unit}</span>
                  </div>
                  <div className="text-xs text-graphite-700 mt-1">{f.signal}</div>
                </div>

                <div className="text-sm text-graphite-800 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-safety-dim font-bold">Recommended action ·</span>{' '}
                  {f.recommended_action}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-graphite-50 border border-graphite-100 px-2 py-1.5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">Cost of failure</div>
                    <div className="font-display text-base text-alert tabular">${(f.cost_of_failure_usd / 1e3).toFixed(0)}K</div>
                  </div>
                  <div className="bg-graphite-50 border border-graphite-100 px-2 py-1.5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">Cost of PM</div>
                    <div className="font-display text-base text-green-700 tabular">${(f.cost_of_pm_usd / 1e3).toFixed(1)}K</div>
                  </div>
                  <div className="bg-graphite-50 border border-graphite-100 px-2 py-1.5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-graphite-500">ROI on PM</div>
                    <div className="font-display text-base text-graphite-900 tabular">{roi.toFixed(0)}×</div>
                  </div>
                </div>

                {f.asset_id === 'STH-L8-CP7' && (
                  <Link
                    to="/activations-live"
                    className="mt-3 inline-flex items-center gap-1.5 border border-safety/50 bg-safety/10 px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-safety-dim hover:bg-safety/20 transition-colors"
                  >
                    Trigger NewCo Activation &rarr; dispatch Maximo work order
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
