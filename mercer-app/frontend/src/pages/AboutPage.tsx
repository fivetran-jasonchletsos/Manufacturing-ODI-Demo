import Hero from '../components/Hero';

export default function AboutPage() {
  return (
    <div>
      <Hero
        eyebrow="ODI Reference Build · Manufacturing"
        title="About Vantex Manufacturing"
        subtitle="A reference build that demonstrates how a Tier-1 auto-parts supplier can run plant operations on Fivetran's Open Data Infrastructure — OT data from process historians and SCADA joined to IT data from SAP and ServiceNow, landed in an open Iceberg lake, transformed by dbt, and exposed to humans and agents through one governed semantic layer."
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Canonical ODI Story block — kept consistent across all ODI demos. */}
        <section className="steel-card safety p-6 mb-10">
          <div className="eyebrow mb-2">The ODI Story</div>
          <h2 className="font-display text-2xl text-graphite-900">
            Data infrastructure for agents you trust.
          </h2>
          <p className="mt-3 text-graphite-700 leading-relaxed">
            <em>"MDS was optimized for humans. ODI is designed for a future with humans and
            production agents at scale."</em> This demo is one instance of that architecture:
            Fivetran's 750+ connectors and Managed Data Lake Service (MDLS) land data into open
            table formats; dbt transformations build the governed semantic layer; multiple compute
            engines and AI agents read the same gold tables.
          </p>
          <a
            href="https://fivetran-jasonchletsos.github.io/Fivetran-Demo-Repository/story/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider font-bold text-safety-dim hover:text-graphite-900"
          >
            Read the full ODI Story →
          </a>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">What this demo shows</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="steel-card p-5">
                <div className="chip dark inline-flex mb-3">{p.tag}</div>
                <h3 className="font-display text-lg text-graphite-900">{p.title}</h3>
                <p className="mt-2 text-sm text-graphite-700 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">Why manufacturing is hard</h2>
          <div className="steel-card p-6">
            <p className="text-graphite-700 leading-relaxed">
              A Tier-1 plant generates data in five places that don't talk to each other: SAP holds
              the order; the MES holds the work unit; the process historian (OSIsoft PI) holds the
              sensor stream; SCADA holds the line-controller state; the CMMS (ServiceNow) holds the
              maintenance work order. The ISA-95 stack was designed to keep them separate. ODI is
              what bridges them — Fivetran lands all five into Iceberg in the same warehouse, and dbt
              joins them into a single OEE / downtime / quality / predictive grain that a plant
              director and an agent can both read.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-graphite-50 border border-graphite-100 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-graphite-500 mb-1">Before ODI</div>
                <ul className="space-y-1 text-graphite-700">
                  <li>• Plant director opens five tools to diagnose one downtime event</li>
                  <li>• Predictive models retrained quarterly on stale exports</li>
                  <li>• Scope-3 reporting is a manual spreadsheet exercise per customer</li>
                  <li>• OT data never leaves the plant — only weekly summaries reach corporate</li>
                </ul>
              </div>
              <div className="bg-bone border-2 border-safety p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-safety-dim mb-1">With ODI</div>
                <ul className="space-y-1 text-graphite-700">
                  <li>• One semantic layer for OEE · downtime · quality · sensors · work orders</li>
                  <li>• Sensor stream lands in Iceberg every five minutes</li>
                  <li>• Cortex agents read gold tables — same numbers as the dashboard</li>
                  <li>• Customer Scope-3 export is a dbt model, not a spreadsheet</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">Tech stack</h2>
          <div className="steel-card p-5">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {STACK.map((s) => (
                <li key={s.name} className="flex items-start gap-3">
                  <div className="chip silver shrink-0 mt-0.5">{s.layer}</div>
                  <div className="min-w-0">
                    <div className="font-display text-base text-graphite-900">{s.name}</div>
                    <div className="text-xs text-graphite-600">{s.note}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">Data sources</h2>
          <div className="space-y-3">
            {DATA_SOURCES.map((s) => (
              <article key={s.title} className="steel-card p-5">
                <div className="flex items-start gap-3">
                  <span className="chip dark shrink-0">Source</span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg text-graphite-900">{s.title}</h3>
                    <p className="mt-1 text-sm text-graphite-700 leading-relaxed">{s.description}</p>
                    <div className="mt-2 text-xs text-graphite-500">
                      <span className="font-mono font-bold uppercase tracking-wider text-[10px]">Provides:</span> {s.provides}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-graphite-800 text-white p-6">
          <div className="eyebrow text-safety-bright mb-2">Disclaimer</div>
          <p className="text-white/80 leading-relaxed text-sm">
            <strong className="text-safety">All data shown is synthetic.</strong>{' '}
            Vantex Manufacturing is a fictional Tier-1 auto-parts supplier modeled on the
            structure of real-world brake-and-harness vendors. No real OEM, supplier, plant,
            or sensor data is included. This site exists to demonstrate the Fivetran ODI
            architecture pattern.
          </p>
        </section>
      </div>
    </div>
  );
}

const PILLARS = [
  {
    tag: 'Pillar 1',
    title: 'Customer-owned storage',
    body: 'Every byte of OT and IT data lands in Vantex\'s S3 bucket as Apache Iceberg tables. Fivetran writes; Vantex reads with Snowflake, Athena, Spark — or anything else.',
  },
  {
    tag: 'Pillar 2',
    title: 'Open table format',
    body: 'Iceberg v2 gives Vantex ACID transactions on streaming sensor data, schema evolution across MES versions, and time-travel for any historian replay.',
  },
  {
    tag: 'Pillar 3',
    title: 'Agents read gold tables',
    body: 'Snowflake Cortex agents and predictive-maintenance models read the same gold tables the plant director sees. One semantic layer for humans and agents.',
  },
];

const STACK = [
  { layer: 'Ingest',    name: 'Fivetran',                       note: 'SAP S/4HANA · Rockwell FactoryTalk MES · OSIsoft PI · Ignition SCADA · ServiceNow · Salesforce · Workday' },
  { layer: 'Storage',   name: 'Amazon S3',                      note: 'mercer-odi-lake bucket — bronze · silver · gold · platinum prefixes' },
  { layer: 'Format',    name: 'Apache Iceberg v2',              note: 'Parquet + ZSTD compression, partitioned by plant + date' },
  { layer: 'Catalog',   name: 'Snowflake Horizon',              note: 'Iceberg REST catalog + tag-based access control by plant' },
  { layer: 'Transform', name: 'dbt-snowflake',                  note: 'Bronze → silver → gold → platinum · 297 models · 712 tests' },
  { layer: 'Query',     name: 'Snowflake + AWS Athena',         note: 'Both engines read the same Iceberg tables — no replication' },
  { layer: 'Agents',    name: 'Snowflake Cortex Agents',        note: 'Read platinum.sem_ops_intel · same SQL plant directors run' },
  { layer: 'Frontend',  name: 'React 18 + Vite + Tailwind 3',   note: 'Static SPA on GitHub Pages · reads JSON snapshot · Recharts' },
];

const DATA_SOURCES = [
  {
    title: 'SAP S/4HANA',
    description: 'Vantex\'s ERP of record. Holds the production order, BOM, customer master, and the EDI 856 ship-notice stream back to GM, Ford, Stellantis, and Honda.',
    provides: 'Production orders · BOMs · shipments · customer pricing',
  },
  {
    title: 'Rockwell FactoryTalk MES',
    description: 'The plant-floor manufacturing execution system. Each work unit emits a start / stop / scrap event tied to the SAP order and the machine asset.',
    provides: 'Work unit events · scrap · operator stamps · order-to-asset link',
  },
  {
    title: 'OSIsoft PI (Process Historian)',
    description: 'High-frequency sensor data: vibration, temperature, hydraulic pressure, spindle current, oil particle counts. The data physics behind every part that comes off the line.',
    provides: 'Sensor signals · 5-min downsampled to silver · raw retained 90d',
  },
  {
    title: 'Ignition SCADA',
    description: 'Line-controller telemetry. PLC tags, alarms, and state machine transitions for every conveyor, robot, press, and test cell.',
    provides: 'PLC tag readings · alarm log · line-state transitions',
  },
  {
    title: 'ServiceNow',
    description: 'Maintenance management. Every PM, every breakdown, every parts requisition. The CMMS join that turns sensor anomalies into work orders.',
    provides: 'Work orders · downtime root cause · spare-parts consumption',
  },
];
