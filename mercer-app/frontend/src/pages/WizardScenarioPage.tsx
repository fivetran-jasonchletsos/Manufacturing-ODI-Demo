/*
 * WizardScenarioPage — Scenario framing page for the dbt-wizard demo.
 *
 * Route: /dbt-wizard/scenario
 *
 * Shows the Plant Ops Director's question, a T-minus countdown to the Plant Ops Review,
 * 4-tile KPI grid, upstream-model panel, state-of-world detail,
 * 6-step build path, and a CTA to launch the Live Build.
 *
 * Ported from Healthcare-EPIC-Snowflake-Demo/ClarityScenarioPage.tsx — Vantex Manufacturing flavor.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wizardDataUrl } from '../components/wizardTypes';

interface UpstreamModel {
  model: string;
  layer: string;
  grain: string;
  description: string;
}

interface ScenarioData {
  company: string;
  request_id: string;
  requested_by: string;
  timezone_label: string;
  question: string;
  metric_label: string;
  metric_code: string;
  sop_meeting_label: string;
  plant_system: string;
  product_line: string;
  target_schema: string;
  target_model: string;
  target_grain: string;
  prior_crisis_id: string;
  upstream_models: UpstreamModel[];
  manual_time_days: string;
  build_room_seconds: number;
}

function formatCountdown(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `T-${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WizardScenarioPage() {
  const [s, setS] = useState<ScenarioData | null>(null);
  const [tMinus, setTMinus] = useState('T-09:00:00');

  useEffect(() => {
    fetch(wizardDataUrl('wizard_scenario.json'))
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load wizard_scenario.json: ${r.status}`);
        return r.json();
      })
      .then(setS)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let remaining = 9 * 3600; // 9-hour countdown to Plant Ops Review
    const id = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      setTMinus(formatCountdown(remaining));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!s) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 font-mono text-sm text-[var(--steel)]">
        Loading scenario...
      </div>
    );
  }

  const LAYER_COLOR: Record<string, string> = {
    staging:      '#0073EA',
    intermediate: '#7c3aed',
    silver:       '#7c3aed',
    gold:         '#ffd60a',
    gap:          '#dc2626',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span
            className="chip alert inline-flex items-center gap-1.5"
            style={{ fontSize: 12, padding: '4px 10px', fontWeight: 700 }}
          >
            <span className="h-2 w-2 bg-[var(--alert)] animate-pulse" style={{ display: 'inline-block' }} />
            Gap · Active
          </span>
          <span className="eyebrow">{s.request_id}</span>
          <span className="eyebrow">Follows {s.prior_crisis_id}</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.05] text-[var(--graphite-deep)] tracking-tight">
          {s.timezone_label}.{' '}
          <span style={{ color: 'var(--safety-dim)' }}>{s.requested_by}.</span>
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-lg text-[var(--steel)]">
          No <span className="font-mono text-sm">gold.fct_yield_by_plant_line_shift_daily</span> exists.
          The {s.product_line} yield gap is unresolved.
          Plant Ops Review in 9 hours. Manual build ETA: {s.manual_time_days}.
          dbt-wizard ETA: {s.build_room_seconds} seconds.
        </p>

        {/* Director question highlight */}
        <div
          className="mt-5 border p-5"
          style={{ borderLeft: '4px solid var(--safety)', borderColor: 'var(--hairline)', borderLeftColor: 'var(--safety)', background: 'rgba(255,214,10,0.05)' }}
        >
          <div className="eyebrow mb-2">The Plant Ops Director's question</div>
          <p className="font-display text-2xl font-semibold leading-tight text-[var(--graphite-deep)]">
            "{s.question}"
          </p>
        </div>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <KpiTile
          label="Plant Ops Review"
          value={tMinus}
          unit={s.sop_meeting_label}
          tone="var(--safety-dim)"
        />
        <KpiTile
          label="Metric requested"
          value="NEW"
          unit={s.metric_label}
          tone="var(--safety-dim)"
        />
        <KpiTile
          label="Manual ETA"
          value={s.manual_time_days}
          unit="data engineering"
          tone="var(--warn)"
        />
        <KpiTile
          label="dbt-wizard ETA"
          value={`${s.build_room_seconds}s`}
          unit="four sub-agents"
          tone="var(--good)"
        />
      </div>

      {/* At-risk callout */}
      <div
        className="mb-8 border p-4 flex items-center gap-4"
        style={{ borderLeft: '4px solid var(--alert)', borderColor: 'var(--hairline)', borderLeftColor: 'var(--alert)', background: 'rgba(220,38,38,0.04)' }}
      >
        <div>
          <div className="eyebrow mb-1" style={{ color: 'var(--alert)' }}>Revenue at risk</div>
          <div className="font-display text-2xl font-semibold text-[var(--graphite-deep)]">$1.8M scrap + rework / mo</div>
          <p className="text-sm text-[var(--steel)] mt-1">
            At the current 4.2% yield gap on the Wichita BRK-CAL line, running to end of month without root cause identified.
          </p>
        </div>
      </div>

      {/* Upstream models + state of world */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <div className="lg:col-span-2 border bg-white p-5 relative overflow-hidden shadow-sm" style={{ borderColor: 'var(--hairline)' }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="eyebrow">Upstream models available</div>
              <div className="font-display text-xl font-semibold mt-1 text-[var(--graphite-deep)]">
                Four signals. Already in the lake.
              </div>
            </div>
            <span className="chip good" style={{ fontSize: 11 }}>
              4 of 4
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {s.upstream_models.map(u => (
              <div
                key={u.model}
                className="border bg-[var(--bone)] p-4 relative"
                style={{ borderColor: 'var(--hairline)' }}
              >
                <div
                  className="absolute top-0 left-0 h-full w-1"
                  style={{ background: LAYER_COLOR[u.layer] ?? 'var(--safety)' }}
                />
                <div className="font-mono text-xs pl-1" style={{ color: LAYER_COLOR[u.layer] ?? 'var(--safety)' }}>
                  {u.layer}
                </div>
                <div className="font-mono text-sm font-semibold mt-1 pl-1 text-[var(--graphite-deep)]">{u.model}</div>
                <div className="font-mono text-[11px] mt-1 pl-1 text-[var(--steel)]">grain · {u.grain}</div>
                <p className="text-xs mt-2 pl-1 leading-relaxed text-[var(--steel)]">{u.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border bg-white p-5 shadow-sm" style={{ borderColor: 'var(--hairline)' }}>
          <div className="eyebrow mb-3">State of the world</div>
          <dl className="space-y-3 text-sm">
            <Row k="Question requested by" v={s.requested_by} />
            <Row k="Requested at" v={<span className="font-mono">{s.timezone_label}</span>} />
            <Row k="Plant system" v={s.plant_system} />
            <Row k="Product line" v={s.product_line} />
            <Row k="Target schema" v={<span className="font-mono">{s.target_schema}</span>} />
            <Row k="Target model" v={<span className="font-mono text-xs">{s.target_model}</span>} />
            <Row k="Target grain" v={<span className="font-mono text-xs">{s.target_grain}</span>} />
            <Row k="Lookback window" v={<span className="font-mono">trailing 26 days</span>} />
            <Row k="Prior incident" v={<span className="font-mono">{s.prior_crisis_id}</span>} />
            <Row
              k="Review next"
              v={
                <span className="font-mono" style={{ color: 'var(--safety-dim)' }}>
                  {s.sop_meeting_label}
                </span>
              }
            />
          </dl>
        </div>
      </div>

      {/* 6-step build path */}
      <div
        className="border bg-white p-5 mb-8 shadow-sm"
        style={{ borderLeft: '4px solid var(--safety)', borderColor: 'var(--hairline)', borderLeftColor: 'var(--safety)' }}
      >
        <div className="eyebrow mb-2" style={{ color: 'var(--safety-dim)' }}>The path through six steps</div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: step.color }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="font-semibold text-[var(--graphite-deep)]">{step.title}</div>
                <div className="text-xs font-mono text-[var(--steel)]">
                  {step.who} · {step.tools}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border bg-white p-5 shadow-sm" style={{ borderColor: 'var(--hairline)' }}>
        <div>
          <div className="font-display text-2xl font-semibold text-[var(--graphite-deep)]">
            Ready to open the Live Build?
          </div>
          <div className="text-sm mt-1 text-[var(--steel)]">
            Four sub-agents will be paged. The new model gets written character-by-character on screen.
          </div>
        </div>
        <Link
          to="/dbt-wizard/live"
          state={{ question: s.question }}
          className="inline-flex items-center gap-2 text-[var(--graphite-deep)] font-semibold px-6 py-4 whitespace-nowrap hover:opacity-95 transition-opacity"
          style={{ background: 'var(--safety)' }}
        >
          Open the Live Build
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'Discovery',            who: 'Explorer',     tools: 'status, search',          color: 'var(--safety-dim)' },
  { title: 'Schema Understanding', who: 'Summary',      tools: 'describe, lineage',        color: '#7c3aed' },
  { title: 'Data Inspection',      who: 'Worker',       tools: 'warehouse, dbt_show',      color: 'var(--warn)' },
  { title: 'Model Creation',       who: 'Worker',       tools: 'file edits, model gen',    color: 'var(--warn)' },
  { title: 'Test Authoring',       who: 'Verification', tools: 'describe, dbt_show',       color: 'var(--good)' },
  { title: 'Materialization',      who: 'Worker + Ver', tools: 'dbt_run, lineage',         color: 'var(--good)' },
];

function KpiTile({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <div
      className="border bg-white p-5 shadow-sm relative overflow-hidden"
      style={{ borderLeft: `4px solid ${tone}`, borderColor: 'var(--hairline)', borderLeftColor: tone }}
    >
      <div className="eyebrow mb-2">{label}</div>
      <div
        className="font-display text-3xl font-semibold tracking-tight tabular"
        style={{ color: tone }}
      >
        {value}
      </div>
      <div className="text-xs mt-2 font-mono text-[var(--steel)]">{unit}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="font-mono text-xs text-[var(--steel)]">{k}</dt>
      <dd className="text-right text-[var(--graphite-deep)]">{v}</dd>
    </div>
  );
}
