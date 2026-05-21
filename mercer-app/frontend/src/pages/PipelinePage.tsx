import { useState } from 'react';
import Hero from '../components/Hero';
import { useJSON } from '../api/data';
import { Loading, ErrorState } from '../components/Skeleton';

type Pipeline = {
  refreshed_at: string;
  connectors: { name: string; source: string; mechanism: string; status: string; last_sync_minutes: number; rows_synced_24h: number; latency_target_min: number; note?: string }[];
  layers: { layer: string; name: string; tables: number; last_run_min: number; status: string; tests_passing: number; tests_total: number }[];
  recent_runs: { run_id: string; model: string; status: string; duration_s: number; rows: number; started_at: string }[];
  failure_sim: { enabled: boolean; note: string };
};

const STATUS_CHIP: Record<string, string> = {
  healthy: 'good',
  degraded: 'warn',
  failed: 'alert',
  success: 'good',
};

export default function PipelinePage() {
  const pipe = useJSON<Pipeline>('pipeline.json');
  const [simulateFailure, setSimulateFailure] = useState(false);

  if (pipe.loading) return <Loading label="Loading pipeline status…" />;
  if (pipe.error) return <ErrorState error={pipe.error} />;
  if (!pipe.data) return null;

  const connectors = pipe.data.connectors.map((c) => {
    if (simulateFailure && c.name.includes('SCADA')) {
      return { ...c, status: 'failed', last_sync_minutes: 47, note: 'Sterling Heights endpoint unreachable since 11:24 — downstream dbt test on gold.fct_oee_shift will redirect to stale-data alert.' };
    }
    return c;
  });

  return (
    <div>
      <Hero
        eyebrow={`Pipeline · Refreshed ${new Date(pipe.data.refreshed_at).toLocaleString()}`}
        title="Fivetran connectors + dbt layers"
        subtitle="Seven Fivetran connectors land OT and IT sources into Iceberg. dbt models flow bronze → silver → gold → platinum. Toggle the failure simulator to see how an OT outage propagates into a downstream data-quality alert."
        rightSlot={
          <button
            onClick={() => setSimulateFailure((v) => !v)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-bold border-2 ${
              simulateFailure
                ? 'bg-alert text-white border-alert'
                : 'bg-safety text-graphite-900 border-safety hover:bg-safety-bright'
            }`}
          >
            {simulateFailure ? '◆ Stop simulating failure' : '◆ Simulate SCADA failure'}
          </button>
        }
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="font-display text-xl mb-4">Connectors</h2>
        <div className="steel-card p-0 overflow-x-auto">
          <table className="spec-table">
            <thead>
              <tr>
                <th>Connector</th>
                <th>Source</th>
                <th>Mechanism</th>
                <th>Status</th>
                <th>Last sync</th>
                <th>Rows / 24h</th>
                <th>Target latency</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((c) => (
                <tr key={c.name}>
                  <td className="font-mono text-xs font-semibold">{c.name}</td>
                  <td className="text-sm text-graphite-700">{c.source}</td>
                  <td><span className="chip dark">{c.mechanism}</span></td>
                  <td><span className={`chip ${STATUS_CHIP[c.status] ?? 'silver'}`}>{c.status}</span></td>
                  <td className="font-mono text-xs tabular">{c.last_sync_minutes}m ago</td>
                  <td className="font-mono text-xs tabular">{c.rows_synced_24h.toLocaleString()}</td>
                  <td className="font-mono text-xs tabular">{c.latency_target_min}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(simulateFailure || connectors.some((c) => c.note)) && (
          <div className="mt-3 space-y-2">
            {connectors.filter((c) => c.note).map((c) => (
              <div key={c.name} className={`steel-card ${c.status === 'failed' ? 'alert' : 'warn'} p-3 text-sm`}>
                <span className="font-mono text-[10px] uppercase tracking-wider text-graphite-500 mr-2">{c.name}</span>
                {c.note}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <h2 className="font-display text-xl mb-4">dbt layers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {pipe.data.layers.map((l) => {
            const failing = simulateFailure && l.layer === 'gold';
            return (
              <div key={l.layer} className={`steel-card ${failing ? 'alert' : 'good'} p-4`}>
                <div className="flex items-center justify-between">
                  <span className={`chip ${l.layer === 'platinum' ? 'dark' : l.layer === 'gold' ? 'safety' : 'silver'}`}>{l.layer}</span>
                  <span className={`chip ${failing ? 'alert' : 'good'}`}>{failing ? 'stale data' : l.status}</span>
                </div>
                <div className="mt-2 font-display text-lg text-graphite-900">{l.name}</div>
                <div className="mt-3 text-sm grid grid-cols-2 gap-1">
                  <div className="font-mono text-[11px] text-graphite-500">Tables</div>
                  <div className="font-mono text-sm tabular text-right">{l.tables}</div>
                  <div className="font-mono text-[11px] text-graphite-500">Tests</div>
                  <div className="font-mono text-sm tabular text-right">{l.tests_passing}/{l.tests_total}</div>
                  <div className="font-mono text-[11px] text-graphite-500">Last run</div>
                  <div className="font-mono text-sm tabular text-right">{failing ? '47m (stale)' : `${l.last_run_min}m`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="font-display text-xl mb-4">Recent dbt runs</h2>
        <div className="steel-card p-0 overflow-x-auto">
          <table className="spec-table">
            <thead>
              <tr><th>Run ID</th><th>Model</th><th>Status</th><th>Duration</th><th>Rows</th><th>Started</th></tr>
            </thead>
            <tbody>
              {pipe.data.recent_runs.map((r) => (
                <tr key={r.run_id}>
                  <td className="font-mono text-xs">{r.run_id}</td>
                  <td className="font-mono text-xs">{r.model}</td>
                  <td><span className={`chip ${STATUS_CHIP[r.status] ?? 'silver'}`}>{r.status}</span></td>
                  <td className="font-mono text-xs tabular">{r.duration_s}s</td>
                  <td className="font-mono text-xs tabular">{r.rows.toLocaleString()}</td>
                  <td className="font-mono text-xs">{new Date(r.started_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="steel-card safety p-5">
          <div className="eyebrow mb-2">Failure simulator</div>
          <p className="text-sm text-graphite-700">{pipe.data.failure_sim.note}</p>
        </div>
      </section>
    </div>
  );
}
