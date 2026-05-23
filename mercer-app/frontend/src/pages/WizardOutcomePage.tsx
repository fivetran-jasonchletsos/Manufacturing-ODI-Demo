/*
 * WizardOutcomePage — Post-build outcome page for the dbt-wizard demo.
 *
 * Route: /dbt-wizard/outcome
 *
 * Shows: materialized model card, test pass summary, root-cause panel,
 * before/after lineage, without/with wizard columns, governance posture,
 * and CTAs to replay or return home.
 *
 * Ported from Healthcare-EPIC-Snowflake-Demo/ClarityOutcomePage.tsx — Vantex Manufacturing flavor.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wizardDataUrl } from '../components/wizardTypes';

interface LineageNode {
  id: string;
  name: string;
  layer: string;
  built?: boolean;
  new?: boolean;
}

interface LineageEdge {
  from: string;
  to: string;
}

interface Metric {
  label: string;
  value: string;
}

interface Column {
  label: string;
  summary: string;
  metrics: Metric[];
  narrative: string[];
}

interface GovernanceItem {
  label: string;
  value: string;
}

interface RootCause {
  headline: string;
  detail: string;
  affected_cohort: string;
  fallout_count: number;
  total_reviewed: number;
}

interface OutcomeData {
  materialized_model: string;
  row_count: number;
  tests_passed: number;
  tests_written: string;
  build_seconds: number;
  before: { nodes: LineageNode[]; edges: LineageEdge[] };
  after:  { nodes: LineageNode[]; edges: LineageEdge[] };
  root_cause: RootCause;
  without_wizard: Column;
  with_wizard:    Column;
  governance: GovernanceItem[];
  hero: { label: string; value: string; note: string };
}

const NODE_COLOR: Record<string, string> = {
  staging:      '#0073EA',
  intermediate: '#7c3aed',
  silver:       '#7c3aed',
  gold:         '#ffd60a',
  gap:          '#dc2626',
  consumer:     '#ea580c',
};

export default function WizardOutcomePage() {
  const [o, setO] = useState<OutcomeData | null>(null);

  useEffect(() => {
    fetch(wizardDataUrl('wizard_outcome.json'))
      .then(r => r.json())
      .then(setO);
  }, []);

  if (!o) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 font-mono text-sm text-[var(--steel)]">
        Loading outcome...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="chip good inline-flex items-center gap-1.5"
            style={{ fontSize: 12, padding: '4px 10px', fontWeight: 700 }}
          >
            <span className="h-2 w-2 bg-[var(--good)] animate-pulse" style={{ display: 'inline-block' }} />
            Build · Materialized
          </span>
          <span className="eyebrow">Lineage updated</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.05] text-[var(--graphite-deep)] tracking-tight">
          Before and after, on the same lake.
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-lg text-[var(--steel)]">
          The gap on the left. The asset on the right. The delta is what dbt-wizard built in{' '}
          {o.build_seconds} seconds — the same window the Director waited for an answer.
        </p>
      </header>

      {/* Root-cause panel — lead with the answer */}
      <section
        className="border p-6 mb-10 shadow-sm"
        style={{ borderLeft: '5px solid var(--safety)', borderColor: 'var(--hairline)', borderLeftColor: 'var(--safety)', background: 'rgba(255,214,10,0.04)' }}
      >
        <div className="eyebrow mb-2" style={{ color: 'var(--safety-dim)' }}>Root cause identified</div>
        <p className="font-display text-xl sm:text-2xl font-semibold leading-tight text-[var(--graphite-deep)] mb-3">
          {o.root_cause.headline}
        </p>
        <p className="text-base leading-relaxed text-[var(--steel)] mb-4">{o.root_cause.detail}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="eyebrow mb-1">Affected cohort</div>
            <div className="font-mono text-sm font-semibold text-[var(--graphite-deep)]">
              {o.root_cause.affected_cohort}
            </div>
          </div>
          <div>
            <div className="eyebrow mb-1">Defect modes explained</div>
            <div className="font-display text-3xl font-semibold" style={{ color: 'var(--safety-dim)' }}>
              {o.root_cause.fallout_count}
            </div>
            <div className="font-mono text-xs text-[var(--steel)]">
              of {o.root_cause.total_reviewed} reviewed
            </div>
          </div>
          <div>
            <div className="eyebrow mb-1">Signature</div>
            <div className="font-mono text-sm font-semibold text-[var(--graphite-deep)]">
              Vendor B · tolerance +30 µm wider · bore-diameter variance on caliper housing
            </div>
          </div>
        </div>
      </section>

      {/* Lineage comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        <LineagePanel
          title="Before · the gap"
          subtitle="No gold table tracks first-pass yield by plant, line, and shift."
          nodes={o.before.nodes}
          edges={o.before.edges}
          tone="crisis"
        />
        <LineagePanel
          title="After · the asset"
          subtitle="Materialized to Iceberg. Downstream consumers attached."
          nodes={o.after.nodes}
          edges={o.after.edges}
          tone="resolved"
        />
      </section>

      {/* Without vs. with */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        <WizardColumn data={o.without_wizard} tone="crisis" />
        <WizardColumn data={o.with_wizard}    tone="resolved" />
      </section>

      {/* Model card + test summary */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="border bg-white p-5 shadow-sm sm:col-span-2"
          style={{ borderLeft: '4px solid var(--safety)', borderColor: 'var(--hairline)', borderLeftColor: 'var(--safety)' }}>
          <div className="eyebrow mb-1">Materialized model</div>
          <div className="font-mono text-base font-semibold text-[var(--graphite-deep)] mb-1">
            {o.materialized_model}
          </div>
          <div className="font-mono text-xs text-[var(--steel)]">
            {o.row_count.toLocaleString()} rows · Iceberg v2 · Parquet · ZSTD
          </div>
        </div>
        <div className="border bg-white p-5 shadow-sm"
          style={{ borderLeft: '4px solid var(--good)', borderColor: 'var(--hairline)', borderLeftColor: 'var(--good)' }}>
          <div className="eyebrow mb-1">Tests</div>
          <div className="font-display text-3xl font-semibold" style={{ color: 'var(--good)' }}>
            {o.tests_passed} / {o.tests_passed}
          </div>
          <div className="font-mono text-xs text-[var(--steel)] mt-1">{o.tests_written}</div>
        </div>
      </section>

      {/* Governance posture */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-semibold mb-4 pb-2 border-b border-[var(--hairline)] text-[var(--graphite-deep)]">
          Governance posture on the new asset
        </h2>
        <div className="border bg-white p-5 shadow-sm" style={{ borderColor: 'var(--hairline)' }}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {o.governance.map(g => (
              <div key={g.label}>
                <div className="eyebrow mb-1">{g.label}</div>
                <div className="font-mono text-sm font-semibold text-[var(--graphite-deep)]">{g.value}</div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Hero */}
      <section
        className="border p-8 mb-10 shadow-sm"
        style={{ borderLeft: '5px solid var(--good)', borderColor: 'var(--hairline)', borderLeftColor: 'var(--good)', background: 'rgba(22,163,74,0.04)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div className="sm:col-span-1">
            <div className="eyebrow mb-2">dbt-wizard result</div>
            <div className="font-display text-6xl sm:text-7xl font-semibold tracking-tight" style={{ color: 'var(--good)' }}>
              {o.hero.value}
            </div>
            <div className="font-mono text-xs mt-2 text-[var(--steel)]">question to materialized</div>
          </div>
          <div className="sm:col-span-2">
            <div className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-[var(--graphite-deep)]">
              {o.hero.label}
            </div>
            <p className="mt-3 text-base leading-relaxed text-[var(--steel)]">{o.hero.note}</p>
          </div>
        </div>
      </section>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 border bg-white p-5 items-center justify-between shadow-sm" style={{ borderColor: 'var(--hairline)' }}>
        <div>
          <div className="font-display text-2xl font-semibold text-[var(--graphite-deep)]">Run it again?</div>
          <div className="text-sm mt-1 text-[var(--steel)]">
            The pipeline is real. The sub-agents are deterministic.
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-[var(--hairline)] bg-white text-[var(--graphite-deep)] font-semibold px-5 py-2.5 hover:bg-[var(--bone)] transition-colors"
          >
            Back to home
          </Link>
          <Link
            to="/dbt-wizard/live"
            className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 hover:opacity-95 transition-opacity"
            style={{ background: 'var(--safety)', color: 'var(--graphite-deep)' }}
          >
            Replay live build
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function WizardColumn({ data, tone }: { data: Column; tone: 'crisis' | 'resolved' }) {
  const toneColor =
    tone === 'crisis' ? 'var(--warn)' : 'var(--good)';
  const chipClass =
    tone === 'crisis' ? 'chip warn' : 'chip good';
  return (
    <div
      className="border bg-white p-6 shadow-sm"
      style={{ borderLeft: `5px solid ${toneColor}`, borderColor: 'var(--hairline)', borderLeftColor: toneColor }}
    >
      <div className={`${chipClass} mb-3 inline-flex`} style={{ fontSize: 11 }}>
        {data.label}
      </div>
      <h2 className="font-display text-xl font-semibold mb-2 text-[var(--graphite-deep)]">{data.summary}</h2>

      <dl className="space-y-2 my-5 border border-[var(--hairline)] bg-[var(--bone)] p-4">
        {data.metrics.map(m => (
          <div key={m.label} className="flex justify-between gap-3 text-sm">
            <dt className="font-mono text-xs text-[var(--steel)]">{m.label}</dt>
            <dd className="font-mono font-semibold" style={{ color: toneColor }}>{m.value}</dd>
          </div>
        ))}
      </dl>

      <div className="eyebrow mb-2">Narrative</div>
      <ol className="space-y-2 text-sm">
        {data.narrative.map((n, i) => (
          <li key={n} className="flex gap-2 text-[var(--steel)]">
            <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: toneColor }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{n}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LineagePanel({
  title,
  subtitle,
  nodes,
  edges,
  tone,
}: {
  title: string;
  subtitle: string;
  nodes: LineageNode[];
  edges: LineageEdge[];
  tone: 'crisis' | 'resolved';
}) {
  const accent =
    tone === 'crisis' ? 'var(--warn)' : 'var(--good)';
  const chipClass =
    tone === 'crisis' ? 'chip warn' : 'chip good';

  const layers = ['staging', 'intermediate', 'silver', 'gold', 'gap', 'consumer'];
  const grouped: Record<string, LineageNode[]> = {};
  for (const l of layers) grouped[l] = [];
  for (const n of nodes) {
    const key = grouped[n.layer] ? n.layer : 'staging';
    grouped[key].push(n);
  }
  const populated = layers.filter(l => grouped[l].length > 0);

  return (
    <div
      className="border bg-white p-5 shadow-sm"
      style={{ borderLeft: `4px solid ${accent}`, borderColor: 'var(--hairline)', borderLeftColor: accent }}
    >
      <div className={`${chipClass} mb-2 inline-flex`} style={{ fontSize: 11 }}>
        {title}
      </div>
      <div className="text-sm mb-4 text-[var(--steel)]">{subtitle}</div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ minHeight: 280 }}>
        {populated.map(layer => (
          <div key={layer}>
            <div
              className="eyebrow mb-2"
              style={{ color: NODE_COLOR[layer] ?? 'var(--safety)' }}
            >
              {layer}
            </div>
            <div className="space-y-1.5">
              {grouped[layer].map(n => {
                const isGap = layer === 'gap';
                const isNew = n.new;
                return (
                  <div
                    key={n.id}
                    className="border p-2.5"
                    style={{
                      borderLeft: `3px solid ${NODE_COLOR[layer] ?? 'var(--safety)'}`,
                      borderColor: 'var(--hairline)',
                      borderLeftColor: NODE_COLOR[layer] ?? 'var(--safety)',
                      background: isGap
                        ? 'rgba(220,38,38,0.06)'
                        : isNew
                        ? 'rgba(22,163,74,0.06)'
                        : 'var(--bone)',
                      borderStyle: isGap ? 'dashed' : 'solid',
                    }}
                  >
                    <div className="font-mono text-[11px]" style={{ color: NODE_COLOR[layer] ?? 'var(--safety)' }}>
                      {layer}
                    </div>
                    <div className="font-mono text-xs font-semibold mt-0.5 text-[var(--graphite-deep)]">
                      {n.name}
                    </div>
                    {isGap && (
                      <div className="font-mono text-[10px] mt-1 text-[var(--alert)]">NOT BUILT</div>
                    )}
                    {isNew && (
                      <div className="font-mono text-[10px] mt-1 text-[var(--good)]">
                        BUILT BY dbt-wizard
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-4 pt-3 border-t flex items-center gap-2 font-mono text-[10px] text-[var(--steel)]"
        style={{ borderColor: 'var(--hairline)' }}
      >
        <span>{nodes.length} nodes</span>
        <span className="text-[var(--hairline)]">·</span>
        <span>{edges.length} edges</span>
      </div>
    </div>
  );
}
