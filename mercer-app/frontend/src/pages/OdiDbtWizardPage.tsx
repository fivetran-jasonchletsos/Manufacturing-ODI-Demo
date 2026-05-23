/*
 * OdiDbtWizardPage — dbt-wizard hub page for Vantex Manufacturing.
 *
 * Route: /dbt-wizard
 *
 * Ported from Healthcare-EPIC-Snowflake-Demo/OdiDbtWizardPage.tsx — Manufacturing flavor.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  WizardPipelineFlow,
  WizardHub,
  ModelRegistry,
  LiveBuildThumbnail,
} from '../components/WizardVisuals';

interface Pillar {
  layer: string;
  vendor: string;
  accent: string;
  what: string;
  inBuild: string;
  tag: string;
}

const PILLARS: Pillar[] = [
  {
    layer: 'Ingestion + MDLS',
    vendor: 'Fivetran',
    accent: '#0073EA',
    tag: 'connectors',
    what: '750+ managed connectors plus a custom Connector SDK for the long tail. Lands every OT and IT source into Managed Data Lake Service as Apache Iceberg, in customer-owned S3.',
    inBuild: 'Vantex runs SAP S/4HANA, Rockwell FactoryTalk MES, OSIsoft PI Process Historian, and Ignition SCADA. Fivetran\'s connectors replicate seven source tables on continuous cadence into the shared lake, in the same open format, on the same schedule.',
  },
  {
    layer: 'Open Lake',
    vendor: 'Iceberg on S3',
    accent: '#7C3AED',
    tag: 'storage',
    what: 'Open table format. Customer-owned storage. Snapshot isolation, schema evolution, time travel, multi-engine reads. The bytes belong to Vantex, not the engine.',
    inBuild: 'When dbt-wizard\'s Worker sub-agent materializes the new gold.fct_yield_by_plant_line_shift_daily table, it writes Parquet files into the shared gold S3 prefix. No second copy. No publish step. Any downstream consumer — Snowflake, plant ops dashboards, OEE weekly reports — resolves the new asset on its next read.',
  },
  {
    layer: 'Medallion + Build-time AI',
    vendor: 'dbt Labs + dbt-wizard',
    accent: '#FF694A',
    tag: 'transform',
    what: 'Bronze, silver, gold transformations with declarative SQL. Lineage, tests, freshness SLAs, semantic models. dbt-wizard adds four sub-agents that author new models into the project using the same tools an analytics engineer uses.',
    inBuild: 'The Plant Ops Director asks why first-pass yield on the brake-caliper line dropped 4.2% in Wichita while Kansas City stayed flat. No gold model covers that grain. dbt-wizard\'s Explorer runs status and search, Summary runs describe and lineage, Worker runs warehouse and dbt_show then authors the SQL, Verification writes the YAML and runs the tests. Ninety seconds end-to-end.',
  },
  {
    layer: 'Compute over Iceberg',
    vendor: 'Snowflake',
    accent: '#29B5E8',
    tag: 'engine',
    what: 'Reads Iceberg tables directly via external tables and Polaris catalog. Runs the dbt-wizard warehouse for dbt_show and the materialization step. Independently scaled micro-warehouses.',
    inBuild: 'Worker spins up an XS warehouse for the dbt_show slice, validates the proposed daily shift grain against the production-runs and supplier-lot silver tables, then materializes the new table to the gold prefix. Total compute footprint: a few seconds of XS warehouse time.',
  },
];

interface Property {
  title: string;
  claim: string;
  proof: string;
}

const PROPERTIES: Property[] = [
  {
    title: 'Speed',
    claim: 'Ninety seconds from question to production model.',
    proof: 'Manual build of the same model: three to five days. The bottleneck is not SQL — it is the round-trip from plant-ops question to backlog to scope to author to test to PR. dbt-wizard collapses every step into a single sub-agent chain. The model exists before the next morning shift briefing.',
  },
  {
    title: 'Governance',
    claim: 'Every dbt-wizard model gets tests, lineage, and ownership.',
    proof: 'The output is not a SQL snippet pasted into a notebook. It is a dbt model with a schema contract, column-level tests, a combination uniqueness test, declared upstreams, an owner tag, and an ai_built tag. The new yield table passes the same governance bar every other gold table in the medallion passes.',
  },
  {
    title: 'Reusability',
    claim: 'The new model is a first-class citizen for every downstream consumer.',
    proof: 'Downstream consumers read it on their next pass. Plant ops dashboards can pin to it. OEE weekly reports can join to it. Other dbt models can ref() it. Iceberg readers — Snowflake, Trino, Spark, DuckDB — can all query it. The model is not stuck inside the tool that built it.',
  },
  {
    title: 'Openness',
    claim: 'The model is Iceberg on S3, queryable by any engine.',
    proof: 'No lock-in on the build-time tool. No lock-in on the run-time engine. The bytes sit in Vantex\'s S3 bucket in an open table format. Swap dbt-wizard tomorrow for a different build-time agent and the materialized table still works. Swap Snowflake for Trino and the table still works.',
  },
];

const CANNED_QUESTIONS = [
  'Why did first-pass yield on the brake-caliper line drop 4.2% in Wichita this week, while Kansas City stayed flat?',
  'Which production lines carry the highest scrap rate this quarter, and how does it trend shift-over-shift?',
  'Show OEE by plant and line for the last four weeks — where are the worst throughput bottlenecks?',
];

export default function OdiDbtWizardPage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState(CANNED_QUESTIONS[0]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-3xl">
        <div className="eyebrow mb-1">Build-time AI · Manufacturing Reference</div>
        <h1 className="font-display text-[2rem] sm:text-[2.4rem] font-semibold tracking-tight text-[var(--graphite-deep)]">
          dbt-wizard: the build-time layer
        </h1>
        <p className="mt-3 text-[var(--steel)] leading-relaxed">
          Any downstream consumer can only read gold models that already exist. When the plant ops team
          asks a question the gold layer does not yet answer, dbt-wizard's four sub-agents author the
          missing model — tested, lineage-tracked, materialized — in under ninety seconds. Every
          downstream reader picks it up on its next pass.
        </p>
      </header>

      {/* Hero: the ODI pipeline with dbt-wizard at the center */}
      <section className="mb-10">
        <div className="steel-card safety p-5 sm:p-6">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <div className="eyebrow">End-to-end · build to read on the same lake</div>
            <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 10, color: 'var(--steel)' }}>
              hover any stage
            </span>
          </div>
          <WizardPipelineFlow />
          <div className="mt-6 mb-4" style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(255,214,10,0.25) 50%, transparent 100%)' }} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat big="24" small="dbt models · bronze to silver to gold" />
            <Stat big="90s"  small="dbt-wizard build · question to production model" />
            <Stat big="3–5 d" small="Manual equivalent · backlog to PR" />
          </div>
        </div>
      </section>

      <section className="mb-12 steel-card p-6 border-l-4" style={{ borderLeftColor: 'var(--safety)' }}>
        <div className="eyebrow mb-2" style={{ color: 'var(--safety-dim)' }}>The scenario that motivates this page</div>
        <p className="text-[var(--graphite)] leading-relaxed">
          The Plant Ops Director asks: "Why did first-pass yield on the brake-caliper line drop 4.2% in
          Wichita this week, while Kansas City stayed flat?" There is no{' '}
          <code className="font-mono text-[12px] bg-[var(--bone)] border border-[var(--hairline)] px-1.5 py-0.5">
            gold.fct_yield_by_plant_line_shift_daily
          </code>{' '}
          table. Plant Ops Review is in 9 hours. Without dbt-wizard, the answer is three to five days
          away. With dbt-wizard, the answer is ninety seconds away — and the model is production-grade
          by the time it exists.
        </p>
      </section>

      <section className="mb-12">
        <div className="eyebrow mb-2">Four layers. One loop.</div>
        <h2 className="font-display text-2xl font-semibold text-[var(--graphite-deep)] pb-3 mb-6 border-b-2 border-[var(--bone-deep)]">
          What each layer contributes
        </h2>
        <p className="text-sm text-[var(--steel)] mb-6 max-w-3xl">
          Each layer has a clear job. Pull dbt-wizard out and the plant ops team's question does not get
          answered in time. Pull Iceberg out and dbt-wizard's output is just text. Pull Snowflake out
          and the materialization step has no warehouse. The loop only closes when all four hold.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p, i) => (
            <div key={p.vendor} className="steel-card relative flex flex-col" style={{ minHeight: '420px', borderTop: `3px solid ${p.accent}`, borderLeft: 'none' }}>
              <div className="p-5 flex-1 flex flex-col">
                <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--steel)' }}>
                  0{i + 1} · {p.tag}
                </div>
                <div className="eyebrow mb-1">{p.layer}</div>
                <div className="font-display text-xl font-semibold mb-4" style={{ color: p.accent }}>{p.vendor}</div>

                <div className="text-[11px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--steel)' }}>What it does</div>
                <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--graphite)' }}>{p.what}</p>

                <div className="text-[11px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--steel)' }}>At Vantex</div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--steel)' }}>{p.inBuild}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12 bg-[var(--bone-deep)] border border-[var(--hairline)] p-6">
        <div className="eyebrow mb-2">The four sub-agents</div>
        <h2 className="font-display text-xl font-semibold text-[var(--graphite-deep)] mb-4">
          How dbt-wizard authors a model in under ninety seconds
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { num: '01', name: 'Explorer', tools: 'dbt status, dbt search', job: 'Maps what already exists in the project. Finds upstream tables that cover production-run grain, defect modes, supplier lots, and shift classification. Returns a list of candidate silver tables the Worker can join.' },
            { num: '02', name: 'Summary', tools: 'dbt describe, dbt lineage', job: 'Documents the schema and lineage of the candidate tables. Confirms grain, null rates, and join keys. Identifies that tolerance_actual on the supplier-lot table is the critical field before the Worker writes a single line of SQL.' },
            { num: '03', name: 'Worker', tools: 'dbt warehouse, dbt_show, file edit', job: 'Writes the SQL and runs a dbt_show slice against a live XS warehouse. Validates the proposed daily plant-line-shift grain, checks row counts, and edits the model file into the project.' },
            { num: '04', name: 'Verification', tools: 'dbt test, dbt docs generate', job: 'Writes the schema YAML, adds uniqueness on (plant_id, line_id, shift_id, production_date) and not-null tests, runs the full test suite, and confirms the materialized table is queryable. Tags the model ai_built and assigns ownership.' },
          ].map((a) => (
            <div key={a.num} className="steel-card p-4" style={{ borderTop: '3px solid var(--safety)', borderLeft: 'none' }}>
              <div className="font-mono text-xs text-[var(--steel)] mb-1">{a.num}</div>
              <div className="font-display text-lg font-semibold text-[var(--graphite-deep)] mb-1">{a.name}</div>
              <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--safety-dim)' }}>{a.tools}</div>
              <p className="text-xs text-[var(--steel)] leading-relaxed">{a.job}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hub-and-spoke radial: the four sub-agents around dbt-wizard */}
      <section className="mb-12">
        <WizardHub />
      </section>

      {/* Model registry preview: where the new model lands */}
      <section className="mb-12">
        <ModelRegistry newModelCode="gold.fct_yield_by_plant_line_shift_daily" />
      </section>

      <section className="mb-12">
        <div className="eyebrow mb-2">Four properties</div>
        <h2 className="font-display text-xl font-semibold text-[var(--graphite-deep)] pb-3 mb-6 border-b-2 border-[var(--bone-deep)]">
          What dbt-wizard gives the lake that no other build-time tool can
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PROPERTIES.map((c, i) => (
            <div key={c.title} className="steel-card p-5 border-l-4" style={{ borderLeftColor: 'var(--safety)' }}>
              <div className="flex items-baseline gap-3 mb-2">
                <div className="font-mono text-xs text-[var(--steel)]">0{i + 1}</div>
                <div className="font-display text-lg font-semibold text-[var(--graphite-deep)]">{c.title}</div>
              </div>
              <div className="text-sm font-semibold mb-2" style={{ color: 'var(--safety-dim)' }}>{c.claim}</div>
              <p className="text-sm leading-relaxed text-[var(--steel)]">{c.proof}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Try the live build */}
      <section className="mb-12 steel-card p-6 border-l-4" style={{ borderLeftColor: 'var(--safety)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 items-start mb-5">
          <div>
            <div className="eyebrow mb-2" style={{ color: 'var(--safety-dim)' }}>Try the live build</div>
            <h2 className="font-display text-xl font-semibold text-[var(--graphite-deep)] mb-3">
              Watch dbt-wizard author the model in real time
            </h2>
            <p className="text-sm text-[var(--steel)] max-w-2xl leading-relaxed">
              Select a question below or write your own, then submit to watch Explorer, Summary,
              Worker, and Verification play out — narration, SQL, YAML, lineage and all tool calls — live.
            </p>
          </div>
          <div>
            <LiveBuildThumbnail />
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {CANNED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuestion(q)}
              className="text-left px-4 py-3 text-sm border transition-colors"
              style={{
                background: question === q ? 'rgba(255,214,10,0.08)' : 'var(--bone)',
                borderColor: question === q ? 'var(--safety)' : 'var(--hairline)',
                color: question === q ? 'var(--safety-dim)' : 'var(--steel)',
              }}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="eyebrow block mb-1.5">Or write your own question</label>
          <textarea
            rows={3}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="w-full px-3 py-2 text-sm border resize-none"
            style={{
              background: '#ffffff',
              borderColor: 'var(--hairline)',
              color: 'var(--graphite)',
              outline: 'none',
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}
          />
        </div>

        <button
          type="button"
          disabled={!question.trim()}
          onClick={() => navigate('/dbt-wizard/live', { state: { question } })}
          className="inline-flex items-center gap-2 font-semibold text-sm px-5 py-2.5 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--safety)', color: 'var(--graphite-deep)' }}
        >
          Watch live build
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      <section className="p-8 bg-[var(--graphite-deep)] text-white">
        <div className="text-xs font-mono uppercase tracking-[0.18em] mb-3 opacity-70">The loop, in one sentence</div>
        <p className="font-display text-xl sm:text-2xl leading-snug mb-6">
          <span style={{ color: '#0073EA' }}>Fivetran lands it.</span>{' '}
          <span style={{ color: '#FF694A' }}>dbt governs it.</span>{' '}
          <span style={{ color: '#FF694A' }}>dbt-wizard authors it.</span>{' '}
          <span style={{ color: '#7C3AED' }}>Iceberg owns it.</span>{' '}
          <span style={{ color: '#29B5E8' }}>Snowflake reads it.</span>
        </p>
        <p className="text-sm opacity-70 max-w-2xl mb-6">
          Build-time AI on the same lake as every downstream reader. dbt-wizard authors the model.
          Any engine that speaks Iceberg reads it. No integration handoff. No second copy of the data.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/pipeline"
            className="inline-flex items-center gap-2 font-semibold text-sm px-5 py-3 shadow-lg hover:opacity-95 transition-opacity"
            style={{ background: 'var(--safety)', color: 'var(--graphite-deep)' }}
          >
            See the pipeline <span aria-hidden>→</span>
          </Link>
          <Link
            to="/architecture"
            className="inline-flex items-center gap-2 font-semibold text-sm bg-white/5 border border-white/20 px-5 py-3 hover:bg-white/10 transition-colors"
          >
            Architecture overview
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div>
      <div className="font-display font-semibold" style={{ fontSize: 30, color: 'var(--safety-dim)', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
        {big}
      </div>
      <div className="mt-1 font-mono uppercase tracking-[0.16em]" style={{ fontSize: 10.5, color: 'var(--steel)', lineHeight: 1.35 }}>
        {small}
      </div>
    </div>
  );
}
