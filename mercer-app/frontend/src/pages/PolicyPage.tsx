import Hero from '../components/Hero';

export default function PolicyPage() {
  return (
    <div>
      <Hero
        eyebrow="OT / IT Policy Brief"
        title="Why manufacturing data is fragmented"
        subtitle="The plant floor and the corporate office speak different languages, run on different stacks, and were designed never to touch each other. The ISA-95 model that organized factories for forty years is now the biggest blocker to AI on the shop floor. ODI is what bridges it."
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section>
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">The ISA-95 stack</h2>
          <div className="steel-card p-0 overflow-hidden">
            <table className="spec-table">
              <thead>
                <tr><th>Level</th><th>Layer</th><th>Owner</th><th>Typical system</th></tr>
              </thead>
              <tbody>
                {LEVELS.map((l) => (
                  <tr key={l.level}>
                    <td className="font-mono text-sm font-bold tabular">L{l.level}</td>
                    <td className="font-display">{l.layer}</td>
                    <td className="text-sm">{l.owner}</td>
                    <td className="font-mono text-xs text-graphite-700">{l.systems}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-graphite-700 leading-relaxed">
            The stack was built for control isolation — keep the PLCs deterministic, the SCADA
            networks air-gapped, the MES bounded by the plant LAN. It worked. But it left every
            level with its own data store and no shared semantics. A "downtime event" in MES is
            not the same row as a "stop reason" in SCADA is not the same as a "work order" in
            ServiceNow.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">Where ODI breaks the silo</h2>
          <div className="space-y-3">
            {ANSWERS.map((a) => (
              <div key={a.q} className="steel-card safety p-5">
                <div className="font-display text-lg text-graphite-900">{a.q}</div>
                <p className="mt-2 text-sm text-graphite-700 leading-relaxed">{a.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl text-graphite-900 border-b-2 border-graphite-800 pb-2 mb-4">Governance posture</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="steel-card p-5">
              <div className="eyebrow mb-2">OT data classification</div>
              <ul className="text-sm text-graphite-700 space-y-1.5">
                <li>• Sensor raw signals: 90-day retention in bronze, then aggregate-only</li>
                <li>• PLC tags: plant-restricted, tagged with ISA-95 level in catalog</li>
                <li>• No write-back from analytics into PLC/SCADA control loops</li>
                <li>• Iceberg time-travel preserved for forensic replay</li>
              </ul>
            </div>
            <div className="steel-card p-5">
              <div className="eyebrow mb-2">IT data classification</div>
              <ul className="text-sm text-graphite-700 space-y-1.5">
                <li>• Customer pricing tagged confidential — masked in non-prod</li>
                <li>• EDI 856 ship-notice: 7-year retention for OEM audit</li>
                <li>• Workday headcount join restricted to authorized roles</li>
                <li>• Snowflake tag-based policies enforce both</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const LEVELS = [
  { level: 0, layer: 'Physical process',     owner: 'Production',  systems: 'Motors · valves · sensors' },
  { level: 1, layer: 'Sensing + actuation',  owner: 'Engineering', systems: 'PLCs · I/O modules' },
  { level: 2, layer: 'Control + monitoring', owner: 'Engineering', systems: 'SCADA (Ignition) · HMI · DCS' },
  { level: 3, layer: 'Manufacturing ops',    owner: 'Operations',  systems: 'MES (FactoryTalk) · process historian (PI)' },
  { level: 4, layer: 'Business planning',    owner: 'Corporate',   systems: 'ERP (SAP S/4HANA) · CMMS (ServiceNow) · CRM (Salesforce)' },
];

const ANSWERS = [
  {
    q: 'Q: Why can\'t the plant director answer "what caused the downtime"?',
    a: 'Because the answer lives in three systems. MES has the work-unit stop event. SCADA has the PLC fault code. ServiceNow has the work order written by the technician. Until those three rows land in the same warehouse with shared keys, "what caused it" is a phone call. ODI is the place those rows finally sit next to each other.',
  },
  {
    q: 'Q: Why is OEM Scope-3 reporting a spreadsheet today?',
    a: 'Because the part-level energy footprint requires joining the PI sensor stream (kWh by machine) to the MES work unit (which part ran on which machine) to the SAP order (which customer the part shipped to). Three systems, three different teams, three different export cadences. With ODI, it\'s a dbt model.',
  },
  {
    q: 'Q: Why don\'t predictive-maintenance models work in production?',
    a: 'Because most predictive models are trained on weekly historian exports, scored against stale dimension tables, and write recommendations into a tool the maintenance team doesn\'t use. With ODI, the model reads the same conformed sensor and asset tables the plant director sees, scores in Snowflake, and writes scored alerts back into the governed gold layer — the same rows the dashboard shows.',
  },
  {
    q: 'Q: Doesn\'t this violate OT/IT separation?',
    a: 'No. Read-only. Fivetran extracts from the historian and SCADA over a one-way DMZ tap. No write path back into control. The plant\'s deterministic real-time loop is untouched. What changes is that the second copy of that data — the one already being collected for compliance — now lands somewhere queryable instead of in a CSV nobody opens.',
  },
];
