// Vantex Manufacturing — Open Data Infrastructure architecture page.
//
// Ported from Clarity Health's ArchitecturePage to give Manufacturing the
// same medallion / multi-engine surface (Snowflake Summit 2026 recording
// set). Tier-1 auto-parts flavor: MES + SAP S/4HANA + IIoT sensors +
// quality lab. Snowflake is the primary engine; Athena / DuckDB / Trino /
// Spark stay listed as the same open-lake reads.
//
// Iceberg table list is inlined (no extra API endpoint) so the page can
// render in the recording even if connectors are paused.

import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import { AliveMedallion, type SourceNode, type EngineNode, type ConsumerRole } from '../components/AliveMedallion';

const MFG_SOURCES: SourceNode[] = [
  { id: 'mes',     label: 'MES Production',      sub: 'SQL Server log-CDC',     logo: 'sqlserver', freshness: '38s lag',  status: 'healthy', pipelineUrl: 'https://fivetran.com/dashboard/connectors/subsisted_grease' },
  { id: 'sap',     label: 'SAP S/4HANA',          sub: 'Oracle Binary Log Reader',         logo: 'oracle',    freshness: '90s lag',  status: 'healthy', pipelineUrl: 'https://fivetran.com/dashboard/connectors/intestine_conditioning' },
  { id: 'iiot',    label: 'IIoT Sensor Stream',   sub: 'OPC UA / Kafka stream',   logo: 'hl7',       freshness: 'live',     status: 'healthy', streaming: true },
  { id: 'quality', label: 'Quality Test Data',    sub: 'Daily lab uploads',       logo: 'cms',       freshness: '6h lag',   status: 'healthy' },
];

const MFG_ENGINES: EngineNode[] = [
  { name: 'Snowflake', active: true,  logo: 'snowflake' },
  { name: 'Athena',                   logo: 'athena' },
  { name: 'DuckDB',                   logo: 'duckdb' },
  { name: 'Trino',                    logo: 'trino' },
  { name: 'Spark',                    logo: 'spark' },
];

const MFG_ROLES: ConsumerRole[] = [
  { label: 'Plant Managers', sub: 'OEE & throughput' },
  { label: 'Quality',        sub: 'defect & FPY' },
  { label: 'Maintenance',    sub: 'predictive uptime' },
  { label: 'Supply Chain',   sub: 'inventory & shortages' },
];

// ─── Types (local) ──────────────────────────────────────────────────────────

interface IcebergTable {
  database: 'bronze' | 'silver' | 'gold';
  table: string;
  source_system: string;
  rows: number;
  bytes: number;
  schema_columns: number;
  partitions: string[];
  last_updated_at: string;
}

interface QueryEngine {
  name: 'Snowflake' | 'Athena' | 'DuckDB' | 'Trino' | 'Spark';
  status: 'active' | 'available' | 'demo';
  description: string;
  sample_query: string;
}

const TABLES: IcebergTable[] = [
  { database: 'bronze', table: 'bronze.mes__production_orders',     source_system: 'sql_server · Rockwell MES',    rows: 482_220,    bytes: 318_400_000,   schema_columns: 84,  partitions: ['ingest_date'],          last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.mes__work_orders',           source_system: 'sql_server · Rockwell MES',    rows: 3_842_200,  bytes: 1_840_000_000, schema_columns: 122, partitions: ['ingest_date'],          last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.mes__machine_events',        source_system: 'sql_server · Rockwell MES',    rows: 18_142_220, bytes: 6_820_000_000, schema_columns: 38,  partitions: ['ingest_date'],          last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.sap__material_master',       source_system: 'oracle · SAP S/4HANA',          rows: 184_400,    bytes: 142_000_000,   schema_columns: 218, partitions: ['ingest_date'],          last_updated_at: '2026-05-24T07:13:00Z' },
  { database: 'bronze', table: 'bronze.sap__plant_orders',          source_system: 'oracle · SAP S/4HANA',          rows: 2_864_000,  bytes: 1_410_000_000, schema_columns: 96,  partitions: ['ingest_date'],          last_updated_at: '2026-05-24T07:13:00Z' },
  { database: 'bronze', table: 'bronze.sap__inventory_movements',   source_system: 'oracle · SAP S/4HANA',          rows: 8_642_200,  bytes: 3_120_000_000, schema_columns: 64,  partitions: ['ingest_date'],          last_updated_at: '2026-05-24T07:13:00Z' },
  { database: 'bronze', table: 'bronze.iiot__sensor_readings',      source_system: 'opc-ua · Kafka stream',         rows: 142_864_000,bytes: 18_420_000_000,schema_columns: 18,  partitions: ['ingest_date', 'plant_id'], last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.iiot__vibration_events',     source_system: 'opc-ua · Kafka stream',         rows: 4_864_000,  bytes: 1_840_000_000, schema_columns: 24,  partitions: ['ingest_date'],          last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.quality__lab_results',       source_system: 'http · Quality lab upload',     rows: 64_400,     bytes: 28_400_000,    schema_columns: 42,  partitions: [],                       last_updated_at: '2026-05-24T01:00:00Z' },

  { database: 'silver', table: 'silver.int_work_order_spine',        source_system: 'dbt · merged',                  rows: 3_842_200,  bytes: 1_240_000_000, schema_columns: 58,  partitions: ['order_date'],           last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_machine_state_minutes',   source_system: 'dbt · merged',                  rows: 18_142_220, bytes: 4_410_000_000, schema_columns: 22,  partitions: ['event_date'],           last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_sensor_aggregates_1m',    source_system: 'dbt · streaming',               rows: 32_864_000, bytes: 6_120_000_000, schema_columns: 16,  partitions: ['minute_bucket'],        last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_defect_observations',     source_system: 'dbt · merged',                  rows: 642_400,    bytes: 184_000_000,   schema_columns: 28,  partitions: ['observation_date'],     last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_inventory_balanced',      source_system: 'dbt · merged',                  rows: 4_864_000,  bytes: 1_810_000_000, schema_columns: 36,  partitions: ['snapshot_date'],        last_updated_at: '2026-05-24T07:18:00Z' },

  { database: 'gold',   table: 'gold.dim_parts',                     source_system: 'dbt mart',                      rows: 184_400,    bytes: 92_000_000,    schema_columns: 38,  partitions: [],                       last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.dim_machines',                  source_system: 'dbt mart',                      rows: 482,        bytes: 240_000,       schema_columns: 28,  partitions: [],                       last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.dim_plants',                    source_system: 'dbt mart',                      rows: 3,          bytes: 8_400,         schema_columns: 18,  partitions: [],                       last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_oee_hourly',                source_system: 'dbt mart',                      rows: 482_000,    bytes: 184_000_000,   schema_columns: 26,  partitions: ['production_hour'],      last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_defect_rate_daily',         source_system: 'dbt mart',                      rows: 18_240,     bytes: 12_400_000,    schema_columns: 22,  partitions: ['production_date'],      last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_predictive_maintenance',    source_system: 'dbt mart',                      rows: 142_400,    bytes: 86_000_000,    schema_columns: 32,  partitions: ['risk_window'],          last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_first_pass_yield',          source_system: 'dbt mart',                      rows: 184_220,    bytes: 96_000_000,    schema_columns: 24,  partitions: ['production_date'],      last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_energy_consumption',        source_system: 'dbt mart',                      rows: 482_000,    bytes: 142_000_000,   schema_columns: 18,  partitions: ['hour_bucket'],          last_updated_at: '2026-05-24T07:22:00Z' },
];

const ENGINES: QueryEngine[] = [
  {
    name: 'Snowflake',
    status: 'active',
    description: 'Primary engine for the Vantex gold layer. Reads Iceberg externals through Horizon catalog; auto-suspends between queries. Where the front end, the cost-estimator, and the dbt-wizard run-time agents all land.',
    sample_query: `SELECT
  m.plant_id, m.machine_id, m.machine_class,
  o.production_hour,
  o.availability_pct, o.performance_pct, o.quality_pct,
  o.oee_pct
FROM gold.dim_machines      m
JOIN gold.fct_oee_hourly    o USING (machine_id)
WHERE o.production_hour >= dateadd(hour, -24, current_timestamp())
  AND o.oee_pct < 0.65
ORDER BY o.oee_pct ASC
LIMIT 50;`,
  },
  {
    name: 'Athena',
    status: 'available',
    description: 'Serverless reads against the same Iceberg gold tables via Glue. Useful for plant-floor ad-hoc and IATF compliance pulls without paying for warehouse time.',
    sample_query: `SELECT plant_id, COUNT(*) AS defects_30d
FROM gold.fct_defect_rate_daily
WHERE production_date >= current_date - interval '30' day
GROUP BY plant_id
ORDER BY defects_30d DESC;`,
  },
  {
    name: 'DuckDB',
    status: 'available',
    description: 'Process engineer\'s laptop. Same Iceberg tables, queried directly from S3 with the iceberg extension. Tiny ad-hoc joins without spinning up anything.',
    sample_query: `INSTALL iceberg;
LOAD iceberg;

SELECT *
FROM iceberg_scan('s3://vantex-odi-lake/gold/fct_predictive_maintenance/')
WHERE risk_score >= 0.85
LIMIT 100;`,
  },
  {
    name: 'Trino',
    status: 'available',
    description: 'Federated engine that joins the lake to other relational sources (supplier portals, customer EDI feeds) without copying data first.',
    sample_query: `SELECT p.plant_id, AVG(o.oee_pct) AS avg_oee
FROM iceberg.gold.fct_oee_hourly o
JOIN postgres.suppliers.delivery_log d
  ON d.part_number = o.part_number
WHERE d.late_delivery_flag = TRUE
GROUP BY p.plant_id;`,
  },
  {
    name: 'Spark',
    status: 'available',
    description: 'Distributed compute for ML training on sensor histories and predictive-maintenance models. Reads the same Iceberg tables via the spark-iceberg runtime.',
    sample_query: `df = spark.read.format("iceberg")\\
  .load("bronze.iiot__sensor_readings")
df.groupBy("machine_id", "sensor_type")\\
  .agg({"value": "avg"})\\
  .show()`,
  },
];

const ENGINE_COLORS: Record<QueryEngine['name'], string> = {
  Snowflake: '#29b5e8',
  Athena:    '#ffd60a',
  DuckDB:    '#1f2937',
  Trino:     '#1d4e89',
  Spark:     '#b45309',
};

// ─── Number formatters ──────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatBytes(b: number): string {
  if (b >= 1_000_000_000) return `${(b / 1_000_000_000).toFixed(2)} GB`;
  if (b >= 1_000_000)     return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b >= 1_000)         return `${(b / 1_000).toFixed(1)} KB`;
  return `${b} B`;
}

// =============================================================================
// Page
// =============================================================================

export default function ArchitecturePage() {
  const [activeEngine, setActiveEngine] = useState<QueryEngine>(ENGINES[0]);

  const byLayer = (l: 'bronze' | 'silver' | 'gold') => TABLES.filter((t) => t.database === l);
  const layerStats = (l: 'bronze' | 'silver' | 'gold') => {
    const t = byLayer(l);
    return { tables: t.length, rows: t.reduce((s, r) => s + r.rows, 0), bytes: t.reduce((s, r) => s + r.bytes, 0) };
  };

  return (
    <div>
      <Hero
        eyebrow="Open Data Infrastructure"
        title="One lake. Every engine. The whole plant floor."
        subtitle="Vantex Manufacturing treats storage, catalog, and compute as three independently swappable layers. Iceberg is the storage spec. Snowflake Horizon + AWS Glue are the catalogs. Snowflake, Athena, DuckDB, Trino, and Spark can all read the same tables — no copy, no extract, no proprietary format between the line PLC and the plant manager."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Live throughput hero (DE: rows in motion, ticking up) ─────────── */}
      <ThroughputHero />

      {/* ── Data Flow diagram ─────────────────────────────────────────────── */}
      <section className="steel-card p-6 sm:p-8 mb-8" style={cardStyle}>
        <div className="eyebrow mb-1">Data Flow</div>
        <h2 className="font-display text-2xl text-graphite-900 mb-6">
          From four operational sources to one governed gold layer
        </h2>

        <AliveMedallion
          sources={MFG_SOURCES}
          bronze={{ ...layerStats('bronze'), trend: [180, 195, 210, 222, 240, 255, 270] }}
          silver={{ ...layerStats('silver'), trend: [120, 130, 142, 155, 168, 180, 192] }}
          gold={{   ...layerStats('gold'),   trend: [80, 88, 95, 104, 112, 124, 138] }}
          engines={MFG_ENGINES}
          roles={MFG_ROLES}
          accent="#ffd60a"
          enginesCaption="All five read the same data — no copies, no rebuilds per tool."
        />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-graphite-600">
          <LayerDetail layer="bronze" stats={layerStats('bronze')} desc="Raw rows landed by Fivetran. 1:1 with source. CDC kept current within five minutes." />
          <LayerDetail layer="silver" stats={layerStats('silver')} desc="Conformed dims and facts. Cleaned, deduped, joined to a work-order + machine spine." />
          <LayerDetail layer="gold"   stats={layerStats('gold')}   desc="Business-ready marts + the dbt semantic layer. What every plant-floor surface reads." />
        </div>
      </section>

      {/* ── Schema-evolution ticker (Iceberg's killer feature, surfaced) ──── */}
      <SchemaEvolutionTicker />

      {/* ── Cost panel (the CFO line, surfaced) ──────────────────────────── */}
      <CostPanel />

      {/* ── Failure & recovery (every DE's "what if it breaks?" answered) ── */}
      <FailureRecoveryPanel />

      {/* ── IATF 16949 / SOC 2 governance ────────────────────────────────── */}
      <DataContractsPanel />

      {/* ── Interactive lineage — click any gold model, see its upstreams ── */}
      <LineagePanel />

      {/* ── Multi-engine showcase ────────────────────────────────────────── */}
      <section className="steel-card overflow-hidden mb-8" style={cardStyle}>
        <header style={cardHeaderStyle}>
          <div className="eyebrow">Compute is a choice</div>
          <h2 className="font-display text-xl text-graphite-900 mt-0.5">
            Same Iceberg tables. Five engines. One query at a time.
          </h2>
          <p className="text-sm text-graphite-600 mt-1">
            Pick a query engine &mdash; the SQL barely changes, but the operational, cost, and
            governance profile shifts dramatically. That choice belongs to the plant, not the vendor.
          </p>
        </header>

        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {ENGINES.map((e) => (
            <button
              key={e.name}
              onClick={() => setActiveEngine(e)}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-all"
              style={
                activeEngine.name === e.name
                  ? { background: ENGINE_COLORS[e.name], borderColor: ENGINE_COLORS[e.name], color: e.name === 'Athena' ? '#1f2937' : '#ffffff' }
                  : { background: '#ffffff', color: '#4b5563', borderColor: '#d4d4d8' }
              }
            >
              {e.name}
              {e.status === 'active' && <span className="ml-1.5 text-[9px] opacity-80">● ACTIVE</span>}
              {e.status === 'demo'   && <span className="ml-1.5 text-[9px] opacity-60">DEMO</span>}
            </button>
          ))}
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-graphite-500 font-bold mb-2">Query</div>
            <pre className="p-4 text-[11.5px] leading-relaxed overflow-x-auto font-mono" style={{ background: '#1f2937', color: '#ffd60a' }}>
              <code>{activeEngine.sample_query}</code>
            </pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-graphite-500 font-bold mb-2">Why this engine</div>
            <p className="text-sm text-graphite-700 leading-relaxed">{activeEngine.description}</p>
            <div className="mt-4 pt-4 border-t border-graphite-100">
              <div className="text-[10px] uppercase tracking-wider text-graphite-500 font-bold mb-1">Status</div>
              <div className="text-sm font-semibold" style={{ color: activeEngine.status === 'active' ? '#16a34a' : '#6b7280' }}>
                {activeEngine.status === 'active' ? '● Primary engine — powers this site' : 'Compatible and ready to wire in'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Iceberg catalog ──────────────────────────────────────────────── */}
      <section className="steel-card overflow-hidden mb-8" style={cardStyle}>
        <header style={cardHeaderStyle}>
          <div className="eyebrow">Iceberg Catalog</div>
          <h2 className="font-display text-xl text-graphite-900 mt-0.5">
            Every table on the lake, registered in Snowflake Horizon + AWS Glue
          </h2>
          <p className="text-sm text-graphite-600 mt-1">
            Open metadata. Every engine reads the same schema, the same partition layout, the same
            row counts &mdash; without anyone owning the "source of truth" exclusively.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead className="border-b border-graphite-200" style={{ background: '#e8e6db' }}>
              <tr>
                <Th>Layer</Th>
                <Th>Table</Th>
                <Th>Source</Th>
                <Th align="right">Rows</Th>
                <Th align="right">Size</Th>
                <Th align="right">Columns</Th>
                <Th>Partitions</Th>
                <Th align="right">Updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-100">
              {TABLES.map((t) => (
                <tr key={`${t.database}.${t.table}`} className="hover:bg-bone-deep cursor-default">
                  <td className="px-4 py-2.5"><LayerChip layer={t.database} /></td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-graphite-900">{t.table}</td>
                  <td className="px-4 py-2.5 text-xs text-graphite-600 font-mono">{t.source_system}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-graphite-900">{formatNumber(t.rows)}</td>
                  <td className="px-4 py-2.5 text-right text-graphite-700">{formatBytes(t.bytes)}</td>
                  <td className="px-4 py-2.5 text-right text-graphite-600">{t.schema_columns}</td>
                  <td className="px-4 py-2.5 text-xs text-graphite-600 font-mono">
                    {t.partitions.length ? t.partitions.join(', ') : <span className="text-graphite-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-graphite-600 font-mono">
                    {new Date(t.last_updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Data Quality — dbt Labs ──────────────────────────────────────── */}
      <section className="steel-card overflow-hidden mb-8" style={cardStyle}>
        <header className="flex items-start justify-between gap-4" style={cardHeaderStyle}>
          <div>
            <div className="eyebrow" style={{ color: '#FF694A' }}>Data Quality · dbt Labs</div>
            <h2 className="font-display text-xl text-graphite-900 mt-0.5">
              Every table tested. Every run. Same lake.
            </h2>
            <p className="text-sm text-graphite-600 mt-1">
              Tests defined in dbt Labs run on every build, against the same Iceberg tables every
              engine reads. Failures block promotion to the next layer &mdash; bad data never
              reaches the plant-floor screen. Paired with the Great Expectations checkpoints below:
              GX runs suite-based expectations against raw landings; dbt enforces SQL-native contracts
              across bronze, silver, and gold.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0" style={{ background: '#FF694A' }}>
            dbt Labs
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-graphite-100">
          {[
            { layer: 'bronze' as const, tests: 26, passing: 26, monitors: ['freshness', 'volume', 'schema drift'],                              color: '#b45309' },
            { layer: 'silver' as const, tests: 64, passing: 63, monitors: ['nulls', 'uniqueness', 'referential', 'accepted values'],            color: '#6b7280' },
            { layer: 'gold'   as const, tests: 44, passing: 44, monitors: ['OEE bounds', 'defect-rate accepted range', 'plant reconciliation'], color: '#caa600' },
          ].map((q) => {
            const ok = q.passing === q.tests;
            return (
              <div key={q.layer} className="p-5">
                <div className="flex items-center justify-between">
                  <LayerChip layer={q.layer} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ok ? '#16a34a' : '#dc2626' }}>
                    {ok ? '● all passing' : `● ${q.tests - q.passing} warn`}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="font-display text-3xl text-graphite-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {q.passing}<span className="text-graphite-400">/{q.tests}</span>
                  </div>
                  <div className="text-xs text-graphite-600">tests · last run 12m ago</div>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-graphite-600">
                  {q.monitors.map((m) => (
                    <li key={m} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: q.color }} />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-graphite-100 flex items-center justify-between text-[11px] text-graphite-500" style={{ background: '#e8e6db' }}>
          <span className="font-mono">134 tests · 133 passing · 1 warn · 0 errors</span>
          <span className="uppercase tracking-wider font-bold">dbt build · merged into Fivetran</span>
        </div>
      </section>

      {/* ── Data Quality — Great Expectations (Fivetran-stewarded OSS) ───── */}
      <GreatExpectationsPanel />

      {/* ── Before / After — what ODI actually replaces ──────────────────── */}
      <BeforeAfterPanel />
      </div>
    </div>
  );
}

// =============================================================================
// Helpers — shared styles + sub-components
// =============================================================================

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #d4d4d8',
};

const cardHeaderStyle = {
  padding: '20px',
  borderBottom: '1px solid #e4e4e7',
};

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-graphite-500 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function LayerChip({ layer }: { layer: 'bronze' | 'silver' | 'gold' }) {
  const styles: Record<typeof layer, { bg: string; fg: string; border: string }> = {
    bronze: { bg: '#fef3c7', fg: '#92400e', border: '#b45309' },
    silver: { bg: '#f3f4f6', fg: '#374151', border: '#6b7280' },
    gold:   { bg: '#fff8d6', fg: '#6b5200', border: '#caa600' },
  };
  const s = styles[layer];
  return (
    <span className="inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 border"
          style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      {layer}
    </span>
  );
}

function LayerDetail({ layer, stats, desc }: { layer: 'bronze' | 'silver' | 'gold'; stats: { tables: number; rows: number; bytes: number }; desc: string }) {
  return (
    <div className="border border-graphite-200 p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <LayerChip layer={layer} />
        <span className="text-[10px] text-graphite-500 font-mono">{stats.tables} table{stats.tables === 1 ? '' : 's'}</span>
      </div>
      <div className="text-sm font-bold text-graphite-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatNumber(stats.rows)} rows · {formatBytes(stats.bytes)}
      </div>
      <div className="text-[11px] text-graphite-600 mt-1 leading-snug">{desc}</div>
    </div>
  );
}

// =============================================================================
// ThroughputHero — pulsing live counter "rows in motion today"
// =============================================================================
function ThroughputHero() {
  const [rowsToday, setRowsToday] = useState(142_864_017);
  // Tick up by 60–140 rows every 600ms — matches real IIoT arrival pace
  useEffect(() => {
    const id = setInterval(() => setRowsToday((n) => n + 60 + Math.floor(Math.random() * 80)), 600);
    return () => clearInterval(id);
  }, []);
  const trend = [128, 132, 136, 138, 140, 141, 142.8]; // 7-day Mrows
  return (
    <section className="mb-8 grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 sm:gap-4">
      <div className="steel-card p-5 sm:p-6 relative overflow-hidden" style={cardStyle}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(255,214,10,0.18), transparent 60%)' }} />
        <div className="relative">
          <div className="eyebrow" style={{ color: '#caa600' }}>● Live</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-graphite-500 font-bold">
            Rows in motion today
          </div>
          <div className="mt-2 font-display leading-none text-graphite-900"
               style={{ fontSize: 44, fontVariantNumeric: 'tabular-nums' }}>
            {rowsToday.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-graphite-600">across 4 sources · 22 Iceberg tables · CDC + streaming</div>
        </div>
      </div>
      <Kpi label="IIoT freshness · p50" value="38s" sub="OPC UA / Kafka source" />
      <Kpi label="Bronze → Gold lag · p99" value="6 min" sub="Within 10-min SLO" />
      <Kpi label="Connector uptime · 90d" value="99.97%" sub={
        <Sparklike values={trend} />
      } />
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="steel-card p-4 sm:p-5" style={cardStyle}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-graphite-500 font-bold">{label}</div>
      <div className="mt-1.5 font-display leading-none text-graphite-900"
           style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div className="mt-2 text-xs text-graphite-600">{sub}</div>
    </div>
  );
}

function Sparklike({ values }: { values: number[] }) {
  const max = Math.max(...values), min = Math.min(...values);
  const rng = max - min || 1;
  const w = 80, h = 18;
  const stepX = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * stepX).toFixed(1)},${(h - ((v - min) / rng) * h).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="#caa600" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// =============================================================================
// SchemaEvolutionTicker — Iceberg's killer feature, displayed as a stock-ticker
// =============================================================================
const EVO_EVENTS = [
  { ts: '2026-05-24 06:14', op: 'ADD COLUMN tool_wear_pct',            table: 'bronze.mes__machine_events',        ms: 38, models: 4 },
  { ts: '2026-05-23 22:01', op: 'RENAME COLUMN sn → serial_number',     table: 'bronze.sap__material_master',       ms: 22, models: 6 },
  { ts: '2026-05-22 14:47', op: 'WIDEN INT → BIGINT cycle_count',       table: 'silver.int_machine_state_minutes',  ms: 41, models: 2 },
  { ts: '2026-05-21 09:30', op: 'ADD COLUMN energy_kwh',                 table: 'gold.fct_oee_hourly',              ms: 19, models: 8 },
  { ts: '2026-05-20 18:09', op: 'DROP COLUMN deprecated_lot_code',       table: 'bronze.quality__lab_results',      ms: 28, models: 3 },
];
function SchemaEvolutionTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((n) => (n + 1) % EVO_EVENTS.length), 4200);
    return () => clearInterval(id);
  }, []);
  const e = EVO_EVENTS[idx];
  return (
    <section className="mb-8 steel-card p-5 overflow-hidden relative" style={{ ...cardStyle, background: 'linear-gradient(90deg, #fff 0%, #f5f5f0 100%)' }}>
      <div className="absolute top-0 right-0 bottom-0 w-1.5" style={{ background: 'linear-gradient(180deg, #ffd60a, #caa600)' }} />
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="eyebrow" style={{ color: '#caa600' }}>Iceberg · Schema evolution</div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ color: '#caa600', background: '#fff8d6', border: '1px solid #ffd60a' }}>
            ● Live feed
          </span>
        </div>
        <div className="font-mono text-[10px] text-graphite-500">last 5 schema changes</div>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="font-mono text-[11px] text-graphite-500">{e.ts}</span>
        <span className="font-mono text-[13px] font-bold text-graphite-900">{e.op}</span>
        <span className="font-mono text-[12px] text-graphite-600">on {e.table}</span>
      </div>
      <div className="mt-2 flex items-center gap-4 text-[12px] text-graphite-600 flex-wrap">
        <span><strong className="text-graphite-900">{e.ms} ms</strong> · metadata-only operation</span>
        <span>•</span>
        <span>0 data rewritten · 0 downtime</span>
        <span>•</span>
        <span><strong className="text-graphite-900">{e.models}</strong> downstream dbt models auto-revalidated</span>
      </div>
      <div className="mt-3 text-[11px] text-graphite-500 leading-relaxed">
        Apache Iceberg treats schema changes as table metadata, not file rewrites. The Modern Data Stack equivalent —
        an Oracle <code className="font-mono">ALTER TABLE ADD COLUMN</code> on an 18 M-row machine-event table — locks
        the table for ~6 minutes during the rewrite. Same change in Iceberg: <strong>milliseconds, no lock</strong>.
      </div>
    </section>
  );
}

// =============================================================================
// CostPanel — the CFO line. Storage cheap, compute the lever.
// =============================================================================
function CostPanel() {
  return (
    <section className="mb-8 steel-card overflow-hidden" style={cardStyle}>
      <header style={cardHeaderStyle}>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow" style={{ color: '#caa600' }}>FinOps</div>
            <h2 className="font-display text-xl text-graphite-900 mt-0.5">
              What this costs to run, every day
            </h2>
            <p className="text-sm text-graphite-600 mt-1 max-w-3xl">
              Storage and compute billed separately. Storage is essentially free at this scale; compute scales
              with workload because Snowflake warehouses auto-suspend when no one is reading.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-graphite-900 shrink-0" style={{ background: '#ffd60a' }}>
            −71% vs legacy
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-graphite-100">
        <CostTile label="Storage · per day"   value="$2.18"  sub="6.4 TB across bronze/silver/gold · S3 Standard-IA"  color="#16a34a" />
        <CostTile label="Compute · per day"   value="$5.42"  sub="Snowflake XS auto-suspend · dbt cloud · Athena ad-hoc" color="#caa600" />
        <CostTile label="Per-1k rows landed"  value="$0.0008" sub="All-in CDC + transform + serve"                    color="#1d4e89" />
        <CostTile label="Equivalent MDS"      value="$26.40" sub="Internal benchmark · same data, warehouse-resident" color="#dc2626" />
      </div>
      <div className="px-5 py-3 border-t border-graphite-100 flex items-center justify-between text-[11px] text-graphite-500" style={{ background: '#e8e6db' }}>
        <span>Compute curve: 64% of spend is the first-shift OEE window. Idle hours bill at zero.</span>
        <span className="uppercase tracking-wider font-bold">Cost-attribution: per-warehouse + per-dbt-model</span>
      </div>
    </section>
  );
}

function CostTile({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-graphite-500 font-bold">{label}</div>
      <div className="mt-2 font-display leading-none" style={{ fontSize: 30, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div className="mt-2 text-xs text-graphite-600 leading-snug">{sub}</div>
    </div>
  );
}

// =============================================================================
// FailureRecoveryPanel — the "what happens when it breaks" answer
// =============================================================================
function FailureRecoveryPanel() {
  return (
    <section className="mb-8 steel-card overflow-hidden" style={cardStyle}>
      <header style={cardHeaderStyle}>
        <div className="eyebrow" style={{ color: '#b45309' }}>Resilience · Recovery</div>
        <h2 className="font-display text-xl text-graphite-900 mt-0.5">
          What happens when a connector fails
        </h2>
        <p className="text-sm text-graphite-600 mt-1 max-w-3xl">
          Every Fivetran connector has automatic retry with exponential backoff; failed rows land in a
          dead-letter queue for replay; dbt builds gate gold on green silver. Below: the last 30 days.
        </p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y-0 md:divide-x divide-graphite-100">
        <RecoveryTile label="Retry policy"          big="exp 5×"  sub="2s · 8s · 30s · 2m · 8m, then DLQ" />
        <RecoveryTile label="Dead-letter · current" big="22"      sub="rows held · 18 OPC UA, 4 SAP dupe-key" color="#b45309" />
        <RecoveryTile label="MTTR · last 30d"       big="8 min"   sub="median · max 31 min during Kafka cert rotation" />
        <RecoveryTile label="Last incident"         big="3 d ago" sub="Replayed automatically in 4 min, zero data loss" color="#16a34a" />
      </div>
    </section>
  );
}

function RecoveryTile({ label, big, sub, color = '#1f2937' }: { label: string; big: string; sub: string; color?: string }) {
  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-graphite-500 font-bold">{label}</div>
      <div className="mt-1.5 font-display leading-none" style={{ fontSize: 26, color, fontVariantNumeric: 'tabular-nums' }}>
        {big}
      </div>
      <div className="mt-2 text-xs text-graphite-600 leading-snug">{sub}</div>
    </div>
  );
}

// =============================================================================
// DataContractsPanel — IATF 16949 + SOC 2 (RLS, masking, audit)
// =============================================================================
function DataContractsPanel() {
  return (
    <section className="mb-8 steel-card overflow-hidden" style={cardStyle}>
      <header className="flex items-start justify-between gap-4" style={cardHeaderStyle}>
        <div>
          <div className="eyebrow" style={{ color: '#1f2937' }}>Data Contracts · IATF 16949 + SOC 2</div>
          <h2 className="font-display text-xl text-graphite-900 mt-0.5">
            Production data never leaves the lake without a policy
          </h2>
          <p className="text-sm text-graphite-600 mt-1 max-w-3xl">
            Every column with supplier-sensitive or customer-IP data is tagged at ingest. Row-level access
            scopes by plant. Column masking on supplier pricing, customer part numbers, and recipe data.
            Every read is logged to a SOC-2-eligible audit table.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-graphite-900 shrink-0" style={{ background: '#ffd60a' }}>
          IATF · SOC 2
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-graphite-100">
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-graphite-500 font-bold mb-3">Policy coverage</div>
          <ul className="space-y-2 text-sm">
            <Policy label="Sensitive columns tagged"  value="28 columns across 11 tables" />
            <Policy label="Row-level access policy"   value="plant_id scoped per role · 3 plants" />
            <Policy label="Column masking on read"    value="supplier_price · customer_part_no · process_recipe" />
            <Policy label="Audit log destination"     value="CloudTrail → S3 (90d) → Iceberg audit table" />
            <Policy label="Traceability path"         value="gold.fct_part_genealogy supports IATF lot-trace" />
          </ul>
        </div>
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-graphite-500 font-bold mb-3">Sample contract · gold.dim_parts</div>
          <pre className="font-mono text-[11.5px] leading-relaxed overflow-x-auto p-3" style={{ background: '#1f2937', color: '#ffd60a' }}><code>{`columns:
  - name: part_number
    tests: [unique, not_null]
    meta: { traceable: true }
  - name: customer_part_no
    meta: { contains_customer_ip: true, mask_policy: "redact_full" }
  - name: supplier_price
    meta: { contains_supplier_terms: true, mask_policy: "hide_below_role" }
  - name: plant_id
    tests: [relationships: dim_plants]
    meta: { rls_partition_key: true }`}</code></pre>
        </div>
      </div>
    </section>
  );
}

function Policy({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 inline-block w-1.5 h-1.5 shrink-0" style={{ background: '#ffd60a' }} />
      <div className="flex-1">
        <span className="text-graphite-900 font-bold">{label}</span>
        <span className="text-graphite-600"> · {value}</span>
      </div>
    </li>
  );
}

// =============================================================================
// BeforeAfterPanel — 14 hops + 3 copies → 5 hops + 1 copy
// =============================================================================
// =============================================================================
// GreatExpectationsPanel — Fivetran-stewarded OSS data-quality gate
// =============================================================================
interface GxSuite {
  suite: string;
  table: string;
  layer: 'bronze' | 'silver' | 'gold';
  expectations: number;
  passing: number;
  last_run: string;
  why: string;
}

const GX_SUITES: GxSuite[] = [
  { suite: 'vantex.mes.work_orders.completeness',     table: 'bronze.mes__work_orders',        layer: 'bronze', expectations: 18, passing: 18, last_run: '07:14:08', why: 'work_order_id never null · unique within ingest_date · plant_id in ISO plant-code set · routing_id references mes__routings' },
  { suite: 'vantex.iiot.sensor_readings.ranges',      table: 'bronze.iiot__sensor_readings',   layer: 'bronze', expectations: 16, passing: 16, last_run: '07:14:11', why: 'temperature C between -40 and 250 · vibration g between 0 and 50 · machine_id resolves to dim_machines · timestamp monotonic per machine' },
  { suite: 'vantex.sap.material_master.referential',  table: 'bronze.sap__material_master',    layer: 'bronze', expectations: 14, passing: 14, last_run: '07:13:42', why: 'material_id unique · uom_code in ISO 80000 value-set · plant_code references sap__plants · bom_root flag boolean' },
  { suite: 'vantex.quality.lab_results.lots',         table: 'bronze.quality__lab_results',    layer: 'bronze', expectations: 13, passing: 12, last_run: '07:13:58', why: 'lot_number matches Vantex traceability regex · test_method in approved-method list · result_value within spec window per part · sampled_at < received_at' },
  { suite: 'vantex.silver.work_order_spine.contract', table: 'silver.int_work_order_spine',    layer: 'silver', expectations: 22, passing: 22, last_run: '07:18:21', why: 'one row per work_order_id · order_date <= completion_date · bom hierarchy depth resolves · part_number references dim_parts' },
  { suite: 'vantex.silver.machine_state.continuity',  table: 'silver.int_machine_state_minutes', layer: 'silver', expectations: 15, passing: 15, last_run: '07:18:33', why: 'no time-series gaps > 90s per machine · state_code in {RUN, IDLE, FAULT, MAINT, OFF} · plant_id non-null · OEE inputs all present' },
  { suite: 'vantex.gold.oee.bounds',                  table: 'gold.fct_oee_hourly',            layer: 'gold',   expectations: 17, passing: 17, last_run: '07:22:14', why: 'availability/performance/quality all between 0 and 1 · OEE = product within 0.1% tolerance · production_hour aligns with calendar dim · row count = machines × 24' },
  { suite: 'vantex.gold.products.output_contract',    table: 'gold.dim_parts',                 layer: 'gold',   expectations: 19, passing: 19, last_run: '07:22:27', why: 'part_number unique · iso_product_category in TS 16949 set · uom_code conformed · supersession chain acyclic · effective_date <= expiration_date' },
  { suite: 'vantex.gold.predictive.risk_distribution',table: 'gold.fct_predictive_maintenance',layer: 'gold',   expectations: 11, passing: 11, last_run: '07:22:39', why: 'risk_score between 0 and 1 · model_version pinned to release tag · machine_id resolves · risk_window in {7d, 30d, 90d}' },
];

function GreatExpectationsPanel() {
  const totals = GX_SUITES.reduce(
    (a, s) => ({ exp: a.exp + s.expectations, pass: a.pass + s.passing, suites: a.suites + 1 }),
    { exp: 0, pass: 0, suites: 0 },
  );
  const warns = totals.exp - totals.pass;

  return (
    <section className="mb-8 steel-card overflow-hidden" style={cardStyle}>
      <header className="flex items-start justify-between gap-4" style={cardHeaderStyle}>
        <div>
          <div className="eyebrow" style={{ color: '#9a3412' }}>Data Quality · Great Expectations</div>
          <h2 className="font-display text-xl text-graphite-900 mt-0.5">
            Validation runs on Bronze before anything reaches Silver.
          </h2>
          <p className="text-sm text-graphite-600 mt-1 max-w-3xl">
            Expectation suites define what "valid" looks like for each Vantex table — sensor
            ranges that match physical limits, traceability lot numbers that match the supplier
            regex, BOM references that resolve. A failed expectation blocks promotion. Same
            lake, same Iceberg snapshots, just gated.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: '#9a3412' }}>
            GX Core · OSS
          </div>
          <div className="text-[10px] text-graphite-500 font-mono">Fivetran-stewarded</div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-y-0 md:divide-x divide-graphite-100">
        <RecoveryTile label="Expectation suites"     big={String(totals.suites)} sub="across bronze · silver · gold layers" />
        <RecoveryTile label="Expectations · today"   big={`${totals.pass}/${totals.exp}`} sub={`${warns} warn · 0 errors · gates Silver promotion`} color={warns ? '#b45309' : '#16a34a'} />
        <RecoveryTile label="Checkpoint cadence"     big="every sync" sub="triggered by Fivetran sync-complete · runs before dbt build" />
        <RecoveryTile label="Failed-expectation queue" big="1 row" sub="quality lab lot-number regex mismatch · held in dlq.gx_quarantine · auto-retried after suite update" color="#b45309" />
      </div>

      <div className="overflow-x-auto border-t border-graphite-100">
        <table className="min-w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead className="border-b border-graphite-200" style={{ background: '#f5f5f0' }}>
            <tr>
              <Th>Layer</Th>
              <Th>Suite</Th>
              <Th>Table under test</Th>
              <Th align="right">Expectations</Th>
              <Th align="right">Last run</Th>
              <Th>What it asserts</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-graphite-100">
            {GX_SUITES.map((s) => {
              const ok = s.passing === s.expectations;
              return (
                <tr key={s.suite} className="hover:bg-[#f5f5f0] cursor-default">
                  <td className="px-4 py-2.5"><LayerChip layer={s.layer} /></td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-graphite-900">{s.suite}</td>
                  <td className="px-4 py-2.5 text-xs text-graphite-600 font-mono">{s.table}</td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: ok ? '#16a34a' : '#b45309' }}>
                    {s.passing}/{s.expectations}
                    {!ok && <span className="ml-1 text-[10px] uppercase tracking-wider">warn</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-graphite-600 font-mono">{s.last_run}</td>
                  <td className="px-4 py-2.5 text-xs text-graphite-700 leading-snug max-w-md">{s.why}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-graphite-100 border-t border-graphite-100">
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-graphite-500 font-bold mb-3">Sample expectation suite · vantex.iiot.sensor_readings.ranges</div>
          <pre className="font-mono text-[11.5px] leading-relaxed overflow-x-auto rounded-sm p-3" style={{ background: '#0b2545', color: '#e6e9f0' }}><code>{`# vantex_iiot_sensor_readings_ranges.yml
expectation_suite_name: vantex.iiot.sensor_readings.ranges
data_asset_name: bronze.iiot__sensor_readings

expectations:
  - expectation_type: expect_column_values_to_not_be_null
    kwargs: { column: machine_id }
  - expectation_type: expect_column_values_to_be_in_set
    kwargs:
      column: sensor_type
      value_set: [temperature, vibration, current, pressure, rpm]
  - expectation_type: expect_column_values_to_be_between
    kwargs: { column: temperature_c, min_value: -40, max_value: 250 }
  - expectation_type: expect_column_values_to_be_between
    kwargs: { column: vibration_g, min_value: 0, max_value: 50 }
  - expectation_type: expect_column_pair_values_a_to_be_less_than_b
    kwargs: { column_A: measured_at, column_B: ingested_at }
  - expectation_type: expect_table_row_count_to_be_between
    kwargs: { min_value: 12000000, max_value: 200000000 }
`}</code></pre>
        </div>
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-graphite-500 font-bold mb-3">How this fits the stack</div>
          <ul className="space-y-2.5 text-sm">
            <Policy label="Fivetran moves" value="MES, SAP S/4HANA, IIoT, and quality-lab feeds into Bronze (Iceberg)" />
            <Policy label="Great Expectations validates" value="Bronze landings against suites before Silver promotion" />
            <Policy label="dbt transforms" value="Silver + Gold marts; dbt tests assert SQL-level constraints" />
            <Policy label="Failed rows" value="route to dlq.gx_quarantine on the same lake; retried after suite update" />
            <Policy label="Open source" value="GX Core remains community-driven; Fivetran funds maintenance, ecosystem, and engineering investment" />
            <Policy label="Community" value="github.com/great-expectations/great_expectations · thousands of teams use GX outside Fivetran's customer base" />
          </ul>
          <div className="mt-4 pt-3 border-t border-graphite-100 text-[11px] text-graphite-500 leading-relaxed">
            On May 13, 2026 Fivetran announced it is becoming steward of the Great Expectations open
            source community and the GX Core project, supporting ongoing maintenance, ecosystem
            integrations, and community engagement. Same open project, backed by sustained engineering.
          </div>
        </div>
      </div>
    </section>
  );
}

function BeforeAfterPanel() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="steel-card p-6 border-l-4" style={{ ...cardStyle, borderLeftColor: '#dc2626' }}>
        <div className="eyebrow" style={{ color: '#dc2626' }}>Before · Modern Data Stack</div>
        <h3 className="mt-1 font-display text-xl text-graphite-900">14 hops · 3 copies of the bytes</h3>
        <pre className="font-mono text-[10.5px] leading-relaxed mt-4 p-3 overflow-x-auto" style={{ background: '#fef2f2', color: '#7f1d1d', border: '1px solid #fecaca' }}>{`Source → SFTP → Stitch → Snowflake (raw)
       → dbt → Snowflake (silver) → Snowflake (gold)
       → Census reverse-ETL → Hightouch → 3rd-party AI store
       → Power BI extract → plant-floor laptop`}</pre>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-graphite-500 text-xs">Copies of the data</div><div className="font-display text-2xl text-graphite-900">3</div></div>
          <div><div className="text-graphite-500 text-xs">Avg end-to-end latency</div><div className="font-display text-2xl text-graphite-900">12 hr</div></div>
          <div><div className="text-graphite-500 text-xs">Daily run-rate</div><div className="font-display text-2xl text-graphite-900">$26.40</div></div>
          <div><div className="text-graphite-500 text-xs">Schema change</div><div className="font-display text-lg text-graphite-900">6-min lock</div></div>
        </div>
      </div>
      <div className="steel-card p-6 border-l-4" style={{ ...cardStyle, borderLeftColor: '#caa600' }}>
        <div className="eyebrow" style={{ color: '#caa600' }}>After · Open Data Infrastructure</div>
        <h3 className="mt-1 font-display text-xl text-graphite-900">5 hops · 1 copy of the bytes</h3>
        <pre className="font-mono text-[10.5px] leading-relaxed mt-4 p-3 overflow-x-auto" style={{ background: '#fff8d6', color: '#6b5200', border: '1px solid #ffd60a' }}>{`Source → Fivetran CDC → Iceberg bronze
       → dbt → Iceberg silver
       → dbt → Iceberg gold
       ↳ Snowflake · Athena · DuckDB · Trino · Spark
         (all reading the same bytes, no copies)`}</pre>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-graphite-500 text-xs">Copies of the data</div><div className="font-display text-2xl" style={{ color: '#caa600' }}>1</div></div>
          <div><div className="text-graphite-500 text-xs">Avg end-to-end latency</div><div className="font-display text-2xl" style={{ color: '#caa600' }}>6 min</div></div>
          <div><div className="text-graphite-500 text-xs">Daily run-rate</div><div className="font-display text-2xl" style={{ color: '#caa600' }}>$7.60</div></div>
          <div><div className="text-graphite-500 text-xs">Schema change</div><div className="font-display text-lg" style={{ color: '#caa600' }}>milliseconds</div></div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// LineagePanel — pick any gold model, see its upstream silver + bronze.
// =============================================================================
type LineageEdge = { from: string; to: string; tests?: string[] };

const LINEAGE_MAP: Record<string, { silver: string[]; bronze: string[]; edges: LineageEdge[]; story: string }> = {
  'gold.fct_oee_hourly': {
    silver: ['silver.int_work_order_spine', 'silver.int_machine_state_minutes'],
    bronze: ['bronze.mes__production_orders', 'bronze.mes__machine_events', 'bronze.iiot__sensor_readings'],
    story:  'OEE = Availability × Performance × Quality, rolled up hourly per machine. Drives the plant-floor dashboard and the predictive-maintenance trigger.',
    edges: [
      { from: 'bronze.mes__production_orders', to: 'silver.int_work_order_spine',     tests: ['unique work_order_id'] },
      { from: 'bronze.mes__machine_events',     to: 'silver.int_machine_state_minutes',tests: ['not-null machine_id'] },
      { from: 'bronze.iiot__sensor_readings',   to: 'silver.int_machine_state_minutes',tests: ['streaming · 38s p99'] },
      { from: 'silver.int_work_order_spine',    to: 'gold.fct_oee_hourly' },
      { from: 'silver.int_machine_state_minutes', to: 'gold.fct_oee_hourly' },
    ],
  },
  'gold.fct_predictive_maintenance': {
    silver: ['silver.int_sensor_aggregates_1m', 'silver.int_machine_state_minutes'],
    bronze: ['bronze.iiot__sensor_readings', 'bronze.iiot__vibration_events', 'bronze.mes__machine_events'],
    story:  'Vibration + temperature trends rolled to 1-minute aggregates, fed into the failure-risk model. Risk score lands on the maintenance scheduler.',
    edges: [
      { from: 'bronze.iiot__sensor_readings',   to: 'silver.int_sensor_aggregates_1m' },
      { from: 'bronze.iiot__vibration_events',   to: 'silver.int_sensor_aggregates_1m' },
      { from: 'bronze.mes__machine_events',      to: 'silver.int_machine_state_minutes' },
      { from: 'silver.int_sensor_aggregates_1m', to: 'gold.fct_predictive_maintenance' },
      { from: 'silver.int_machine_state_minutes',to: 'gold.fct_predictive_maintenance' },
    ],
  },
  'gold.fct_first_pass_yield': {
    silver: ['silver.int_defect_observations', 'silver.int_work_order_spine'],
    bronze: ['bronze.quality__lab_results', 'bronze.mes__work_orders'],
    story:  'First-Pass Yield = (good parts) / (total parts produced), per part-number per day. Drives the quality scorecard.',
    edges: [
      { from: 'bronze.quality__lab_results', to: 'silver.int_defect_observations' },
      { from: 'bronze.mes__work_orders',      to: 'silver.int_work_order_spine' },
      { from: 'silver.int_defect_observations', to: 'gold.fct_first_pass_yield' },
      { from: 'silver.int_work_order_spine',    to: 'gold.fct_first_pass_yield' },
    ],
  },
  'gold.dim_parts': {
    silver: ['silver.int_work_order_spine'],
    bronze: ['bronze.sap__material_master'],
    story:  'Master part dimension. Customer-IP-tagged, masked on read by role.',
    edges: [
      { from: 'bronze.sap__material_master', to: 'silver.int_work_order_spine' },
      { from: 'silver.int_work_order_spine', to: 'gold.dim_parts' },
    ],
  },
};

function LineagePanel() {
  const goldOptions = Object.keys(LINEAGE_MAP);
  const [selected, setSelected] = useState<string>(goldOptions[0]);
  const lin = LINEAGE_MAP[selected];

  const BX = 20, MX = 320, RX = 620;
  const COL_W = 280;
  const ROW_H = 38, ROW_GAP = 8;
  const maxRows = Math.max(lin.bronze.length, lin.silver.length, 1);
  const HEIGHT = Math.max(maxRows * (ROW_H + ROW_GAP) + 40, 240);

  const bronzeY = (i: number) => 30 + i * (ROW_H + ROW_GAP);
  const silverY = (i: number) => 30 + i * (ROW_H + ROW_GAP);
  const goldY = (HEIGHT - ROW_H) / 2;

  const nodeOf = (name: string): { x: number; y: number; w: number; h: number } | null => {
    const bi = lin.bronze.indexOf(name);
    if (bi >= 0) return { x: BX, y: bronzeY(bi), w: COL_W, h: ROW_H };
    const si = lin.silver.indexOf(name);
    if (si >= 0) return { x: MX, y: silverY(si), w: COL_W, h: ROW_H };
    if (name === selected) return { x: RX, y: goldY, w: COL_W, h: ROW_H };
    return null;
  };

  return (
    <section className="mb-8 steel-card overflow-hidden" style={cardStyle}>
      <header style={cardHeaderStyle}>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow" style={{ color: '#FF694A' }}>dbt · Column-level lineage</div>
            <h2 className="font-display text-xl text-graphite-900 mt-0.5">
              Pick any gold model. See exactly where its bytes come from.
            </h2>
            <p className="text-sm text-graphite-600 mt-1 max-w-3xl">
              dbt emits lineage as a side-effect of build. Every join, every transformation, every test
              is documented automatically. Click a gold model below to trace upstream &mdash; bronze
              landings to silver intermediates to the gold mart.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0" style={{ background: '#FF694A' }}>
            dbt Labs
          </div>
        </div>
      </header>

      <div className="px-5 pt-4 flex flex-wrap gap-2">
        {goldOptions.map((g) => (
          <button
            key={g}
            onClick={() => setSelected(g)}
            className="px-3 py-2 text-[11.5px] font-mono border transition-all"
            style={
              selected === g
                ? { background: '#ffd60a', borderColor: '#caa600', color: '#1f2937' }
                : { background: '#fff', borderColor: '#d4d4d8', color: '#4b5563' }
            }
          >
            {g}
          </button>
        ))}
      </div>

      <div className="p-5">
        <p className="text-sm text-graphite-700 mb-4 italic">{lin.story}</p>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${RX + COL_W + 20} ${HEIGHT}`} className="w-full" style={{ minWidth: 880, maxHeight: 360 }}>
            <defs>
              <marker id="lin-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#FF694A" />
              </marker>
            </defs>

            <text x={BX} y={18} fontSize="10" fontWeight="700" fill="#826b3f" letterSpacing="1.6">BRONZE · raw</text>
            <text x={MX} y={18} fontSize="10" fontWeight="700" fill="#374151" letterSpacing="1.6">SILVER · conformed</text>
            <text x={RX} y={18} fontSize="10" fontWeight="700" fill="#6b5200" letterSpacing="1.6">GOLD · selected</text>

            {lin.edges.map((e, i) => {
              const a = nodeOf(e.from);
              const b = nodeOf(e.to);
              if (!a || !b) return null;
              const x1 = a.x + a.w, y1 = a.y + a.h / 2;
              const x2 = b.x,         y2 = b.y + b.h / 2;
              const mid = (x1 + x2) / 2;
              const d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke="#FF694A" strokeWidth="1.6" strokeLinecap="round" markerEnd="url(#lin-arrow)" opacity="0.75" />
                  <circle r="2.5" fill="#FF694A">
                    <animateMotion dur={`${2.0 + i * 0.18}s`} repeatCount="indefinite" path={d} />
                    <animate attributeName="opacity" values="0;1;1;0" dur={`${2.0 + i * 0.18}s`} repeatCount="indefinite" />
                  </circle>
                  {e.tests && (
                    <g transform={`translate(${mid - 38}, ${(y1 + y2) / 2 - 8})`}>
                      <rect width="76" height="14" rx="3" fill="#FF694A" />
                      <text x="38" y="10" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff" letterSpacing="0.4">
                        {e.tests[0]}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {lin.bronze.map((t, i) => (
              <g key={t} transform={`translate(${BX}, ${bronzeY(i)})`}>
                <rect width={COL_W} height={ROW_H} rx="4" fill="#fef3c7" stroke="#b45309" strokeWidth="1" />
                <text x="12" y="14" fontSize="9" fontWeight="800" fill="#826b3f" letterSpacing="1.4">BRONZE</text>
                <text x="12" y="28" fontSize="11" fontWeight="700" fill="#1f2937" fontFamily="ui-monospace, monospace">{t}</text>
              </g>
            ))}

            {lin.silver.map((t, i) => (
              <g key={t} transform={`translate(${MX}, ${silverY(i)})`}>
                <rect width={COL_W} height={ROW_H} rx="4" fill="#f3f4f6" stroke="#6b7280" strokeWidth="1" />
                <text x="12" y="14" fontSize="9" fontWeight="800" fill="#374151" letterSpacing="1.4">SILVER</text>
                <text x="12" y="28" fontSize="11" fontWeight="700" fill="#1f2937" fontFamily="ui-monospace, monospace">{t}</text>
              </g>
            ))}

            <g transform={`translate(${RX}, ${goldY})`}>
              <rect width={COL_W} height={ROW_H} rx="4" fill="#fff8d6" stroke="#caa600" strokeWidth="2" />
              <text x="12" y="14" fontSize="9" fontWeight="800" fill="#6b5200" letterSpacing="1.4">GOLD</text>
              <text x="12" y="28" fontSize="11" fontWeight="700" fill="#1f2937" fontFamily="ui-monospace, monospace">{selected}</text>
            </g>
          </svg>
        </div>

        <div className="mt-4 flex items-center gap-4 text-[11px] text-graphite-500 flex-wrap">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: '#FF694A' }} /> dbt transformation (auto-emitted)</span>
          <span>•</span>
          <span><strong className="text-graphite-900">{lin.edges.length}</strong> column-level edges traced</span>
          <span>•</span>
          <span><strong className="text-graphite-900">{lin.bronze.length + lin.silver.length + 1}</strong> dbt models in the lineage graph</span>
          <span>•</span>
          <span>Lineage runs at every build · zero manual upkeep</span>
        </div>
      </div>
    </section>
  );
}
