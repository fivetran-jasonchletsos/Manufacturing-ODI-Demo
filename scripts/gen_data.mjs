// Synthetic-data generator for Mercer Manufacturing ODI demo.
// Run: node scripts/gen_data.mjs
//
// Writes JSON files into mercer-app/frontend/public/data/.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'mercer-app', 'frontend', 'public', 'data');
mkdirSync(OUT, { recursive: true });

// Deterministic PRNG (Mulberry32) so the snapshot is reproducible.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const rrange = (a, b) => a + (b - a) * rand();
const rint = (a, b) => Math.floor(rrange(a, b + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const PLANTS = [
  { id: 'TOL', name: 'Toledo OH' },
  { id: 'STH', name: 'Sterling Heights MI' },
  { id: 'IND', name: 'Indianapolis IN' },
];

const LINES = {
  TOL: [
    { id: 'TOL-L1', name: 'Caliper Machining 1', product: 'Brake caliper' },
    { id: 'TOL-L2', name: 'Caliper Machining 2', product: 'Brake caliper' },
    { id: 'TOL-L3', name: 'Rotor Forging', product: 'Brake rotor' },
    { id: 'TOL-L4', name: 'Rotor Finish', product: 'Brake rotor' },
    { id: 'TOL-L5', name: 'Caliper Assembly', product: 'Brake assembly' },
    { id: 'TOL-L6', name: 'Rotor Coating', product: 'Brake rotor' },
    { id: 'TOL-L7', name: 'Inspection Cell', product: 'QA' },
    { id: 'TOL-L8', name: 'Pack Line A', product: 'Pack' },
    { id: 'TOL-L9', name: 'Pack Line B', product: 'Pack' },
  ],
  STH: [
    { id: 'STH-L1', name: 'Crimp Press 1',    product: 'Wire harness (PV)' },
    { id: 'STH-L2', name: 'Crimp Press 2',    product: 'Wire harness (PV)' },
    { id: 'STH-L3', name: 'Crimp Press 3',    product: 'Wire harness (PV)' },
    { id: 'STH-L4', name: 'Wire Cut + Strip', product: 'Wire prep' },
    { id: 'STH-L5', name: 'Connector Insert', product: 'Wire harness (PV)' },
    { id: 'STH-L6', name: 'Harness Assembly A', product: 'Wire harness (PV)' },
    { id: 'STH-L7', name: 'Harness Assembly B', product: 'Wire harness (PV)' },
    { id: 'STH-L8', name: 'Crimp Press 7',     product: 'Wire harness (PV)' },
    { id: 'STH-L9', name: 'Continuity Test',   product: 'QA' },
    { id: 'STH-L10', name: 'Pack + Ship',      product: 'Pack' },
  ],
  IND: [
    { id: 'IND-L1', name: 'Caliper Assembly', product: 'Brake assembly (LV truck)' },
    { id: 'IND-L2', name: 'Rotor Receive + Stage', product: 'Brake assembly' },
    { id: 'IND-L3', name: 'Harness Receive + Stage', product: 'Wire harness (LV truck)' },
    { id: 'IND-L4', name: 'Module Assembly 1', product: 'Brake module' },
    { id: 'IND-L5', name: 'Module Assembly 2', product: 'Brake module' },
    { id: 'IND-L6', name: 'EOL Test Cell',     product: 'QA' },
    { id: 'IND-L7', name: 'Module Pack',       product: 'Pack' },
    { id: 'IND-L8', name: 'Harness Final Test', product: 'QA' },
  ],
};

const SHIFTS = ['A', 'B', 'C']; // 6-2, 2-10, 10-6

// 90 days back from snapshot_date 2026-05-20
const END = new Date('2026-05-20T00:00:00Z');

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

// PRODUCTION / OEE — 90 days × plants × lines (daily) + 7-day × shifts breakout
const production = { schema: 'production_oee_v1', daily: [], by_shift_recent: [], by_line_summary: [] };
for (let d = 89; d >= 0; d--) {
  const date = new Date(END);
  date.setUTCDate(END.getUTCDate() - d);
  const ds = fmtDate(date);
  for (const p of PLANTS) {
    for (const line of LINES[p.id]) {
      const baseAvail = p.id === 'STH' ? 0.87 : (p.id === 'TOL' ? 0.89 : 0.88);
      const availability = clamp(baseAvail + rrange(-0.05, 0.04), 0.80, 0.94);
      const performance  = clamp(0.86 + rrange(-0.07, 0.05), 0.78, 0.92);
      const quality      = clamp(0.987 + rrange(-0.018, 0.008), 0.95, 0.995);
      // Targeted incidents
      let incident = false;
      if (p.id === 'STH' && line.id === 'STH-L8' && d < 14) incident = true; // crimp press 7 degrading
      if (p.id === 'TOL' && line.id === 'TOL-L3' && d < 7) incident = true;
      const finalAvail = incident ? availability * 0.85 : availability;
      const oee = finalAvail * performance * quality;
      production.daily.push({
        date: ds,
        plant_id: p.id,
        line_id: line.id,
        availability: round3(finalAvail),
        performance: round3(performance),
        quality: round3(quality),
        oee: round3(oee),
        good_parts: Math.max(0, Math.round(rrange(2400, 5400) * oee)),
        target_parts: rint(5400, 6600),
      });
    }
  }
}
// 7-day shift breakout — same incidents but with shift-level granularity for the recent week
for (let d = 6; d >= 0; d--) {
  const date = new Date(END);
  date.setUTCDate(END.getUTCDate() - d);
  const ds = fmtDate(date);
  for (const p of PLANTS) {
    for (const line of LINES[p.id]) {
      for (const shift of SHIFTS) {
        const shiftAdj = shift === 'A' ? 0.02 : (shift === 'C' ? -0.025 : 0);
        const baseAvail = p.id === 'STH' ? 0.87 : (p.id === 'TOL' ? 0.89 : 0.88);
        const availability = clamp(baseAvail + shiftAdj + rrange(-0.05, 0.04), 0.80, 0.94);
        const performance  = clamp(0.86 + shiftAdj + rrange(-0.07, 0.05), 0.78, 0.92);
        const quality      = clamp(0.987 + rrange(-0.018, 0.008), 0.95, 0.995);
        const oee = availability * performance * quality;
        production.by_shift_recent.push({
          date: ds,
          plant_id: p.id,
          line_id: line.id,
          shift,
          availability: round3(availability),
          performance: round3(performance),
          quality: round3(quality),
          oee: round3(oee),
        });
      }
    }
  }
}
// Per-line summary (line metadata + 30d average)
for (const p of PLANTS) {
  for (const line of LINES[p.id]) {
    const rows = production.daily.filter((r) => r.line_id === line.id).slice(-30);
    const avg = (k) => round3(rows.reduce((s, r) => s + r[k], 0) / rows.length);
    production.by_line_summary.push({
      plant_id: p.id,
      plant: p.name,
      line_id: line.id,
      line: line.name,
      product: line.product,
      oee_30d: avg('oee'),
      availability_30d: avg('availability'),
      performance_30d: avg('performance'),
      quality_30d: avg('quality'),
    });
  }
}
write('production.json', production);

// DOWNTIME — Top 10 causes per plant for last 30 days
const DOWNTIME_CATEGORIES = [
  { cat: 'Planned PM',          base: [10, 22] },
  { cat: 'Unplanned breakdown', base: [14, 38] },
  { cat: 'Changeover',          base: [8,  20] },
  { cat: 'Material shortage',   base: [4,  16] },
  { cat: 'Quality hold',        base: [2,  12] },
  { cat: 'Operator error',      base: [1,  8] },
  { cat: 'IT outage (MES/SCADA)', base: [1, 6] },
  { cat: 'Setup / first-piece', base: [3,  11] },
  { cat: 'Tooling change',      base: [3,  10] },
  { cat: 'Power / utilities',   base: [1,  6] },
];
const downtime = { schema: 'downtime_v1', window: 'last_30_days', records: [] };
for (const p of PLANTS) {
  const causes = DOWNTIME_CATEGORIES.map((c) => {
    const hours = round1(rrange(c.base[0], c.base[1]));
    const costPerHour = c.cat.includes('Unplanned') ? 8200 : c.cat.includes('IT') ? 6400 : 3800;
    return {
      plant_id: p.id,
      plant: p.name,
      category: c.cat,
      hours_lost: hours,
      events: rint(2, 18),
      est_cost_usd: Math.round(hours * costPerHour),
    };
  }).sort((a, b) => b.hours_lost - a.hours_lost);
  downtime.records.push(...causes);
}
write('downtime.json', downtime);

// QUALITY
const PART_FAMILIES = [
  { family: 'Brake caliper',   plants: ['TOL', 'IND'], ftq_target: 98.5 },
  { family: 'Brake rotor',     plants: ['TOL'],        ftq_target: 99.2 },
  { family: 'Brake assembly',  plants: ['TOL', 'IND'], ftq_target: 98.0 },
  { family: 'Wire harness PV', plants: ['STH', 'IND'], ftq_target: 99.0 },
  { family: 'Wire prep',       plants: ['STH'],        ftq_target: 99.5 },
];
const DEFECT_MODES = [
  { mode: 'Crimp height out-of-spec',  count: 412 },
  { mode: 'Bore diameter +.002in',     count: 318 },
  { mode: 'Surface finish — pitting',  count: 246 },
  { mode: 'Continuity fail (open)',    count: 187 },
  { mode: 'Connector seat — partial',  count: 102 },
];
const quality = {
  schema: 'quality_v1',
  ftq_by_family: PART_FAMILIES.map((f) => ({
    family: f.family,
    plants: f.plants,
    ftq_pct: round2(f.ftq_target - rrange(0, 1.6)),
    ftq_target_pct: f.ftq_target,
    in_spec_units: rint(180000, 720000),
    rejected_units: rint(200, 4200),
  })),
  pareto: DEFECT_MODES.map((d, i) => ({
    rank: i + 1,
    mode: d.mode,
    count: d.count,
    pct_of_total: round1((d.count / DEFECT_MODES.reduce((s, x) => s + x.count, 0)) * 100),
  })),
  ftq_trend: (() => {
    const out = [];
    for (let d = 89; d >= 0; d--) {
      const date = new Date(END);
      date.setUTCDate(END.getUTCDate() - d);
      out.push({
        date: fmtDate(date),
        ftq_pct: round2(98.4 + Math.sin(d / 12) * 0.3 + rrange(-0.18, 0.18)),
      });
    }
    return out;
  })(),
};
write('quality.json', quality);

// PREDICTIVE MAINTENANCE — eight flagged machines
const predictive = {
  schema: 'predictive_maintenance_v1',
  generated_by: 'gold.fct_predictive_alerts (dbt-wizard run-time agent model)',
  flagged: [
    {
      asset_id: 'STH-L8-CP7',  plant: 'Sterling Heights MI', line: 'Crimp Press 7',
      signal: 'Vibration RMS trending +38% over 14 days',
      sensor: 'vibration', value: 8.2, unit: 'mm/s',
      days_to_failure_p50: 7, days_to_failure_p10: 5,
      recommended_action: 'Replace main bearing during planned PM window 2026-05-25',
      cost_of_failure_usd: 184000, cost_of_pm_usd: 12500,
      confidence: 0.88,
    },
    {
      asset_id: 'TOL-L3-FRG2', plant: 'Toledo OH', line: 'Rotor Forging',
      signal: 'Hydraulic oil particle count above ISO 4406 target',
      sensor: 'oil_particles', value: 18, unit: 'ISO code',
      days_to_failure_p50: 21, days_to_failure_p10: 12,
      recommended_action: 'Schedule hydraulic flush + filter replacement next weekend',
      cost_of_failure_usd: 92000, cost_of_pm_usd: 5400,
      confidence: 0.74,
    },
    {
      asset_id: 'IND-L1-ROB4', plant: 'Indianapolis IN', line: 'Caliper Assembly',
      signal: 'Robot joint-2 temperature 12°C above baseline',
      sensor: 'temperature', value: 78, unit: '°C',
      days_to_failure_p50: 14, days_to_failure_p10: 9,
      recommended_action: 'Re-grease joint-2; inspect harmonic drive',
      cost_of_failure_usd: 56000, cost_of_pm_usd: 1800,
      confidence: 0.81,
    },
    {
      asset_id: 'STH-L4-CUT1', plant: 'Sterling Heights MI', line: 'Wire Cut + Strip',
      signal: 'Spindle current draw step-change',
      sensor: 'current', value: 22.4, unit: 'A',
      days_to_failure_p50: 18, days_to_failure_p10: 11,
      recommended_action: 'Inspect cutting head; verify blade alignment',
      cost_of_failure_usd: 38000, cost_of_pm_usd: 2200,
      confidence: 0.67,
    },
    {
      asset_id: 'TOL-L6-CTG1', plant: 'Toledo OH', line: 'Rotor Coating',
      signal: 'Booth exhaust pressure dropping 6% week-over-week',
      sensor: 'pressure', value: 0.74, unit: 'inWC',
      days_to_failure_p50: 26, days_to_failure_p10: 15,
      recommended_action: 'Replace exhaust filter; check fan VFD',
      cost_of_failure_usd: 48000, cost_of_pm_usd: 3100,
      confidence: 0.71,
    },
    {
      asset_id: 'IND-L4-CNV3', plant: 'Indianapolis IN', line: 'Module Assembly 1',
      signal: 'Conveyor motor temperature climbing',
      sensor: 'temperature', value: 71, unit: '°C',
      days_to_failure_p50: 30, days_to_failure_p10: 19,
      recommended_action: 'Inspect motor bearings; verify belt tension',
      cost_of_failure_usd: 28000, cost_of_pm_usd: 1400,
      confidence: 0.63,
    },
    {
      asset_id: 'STH-L9-TST2', plant: 'Sterling Heights MI', line: 'Continuity Test',
      signal: 'Fixture-2 false-fail rate up 9% (degraded contact)',
      sensor: 'quality_signal', value: 1.4, unit: '% FF',
      days_to_failure_p50: 12, days_to_failure_p10: 7,
      recommended_action: 'Replace pogo-pin fixture set; recalibrate',
      cost_of_failure_usd: 22000, cost_of_pm_usd: 4800,
      confidence: 0.79,
    },
    {
      asset_id: 'TOL-L1-CNC2', plant: 'Toledo OH', line: 'Caliper Machining 1',
      signal: 'Tool wear model — spindle vibration + AE drift',
      sensor: 'vibration', value: 5.1, unit: 'mm/s',
      days_to_failure_p50: 9, days_to_failure_p10: 6,
      recommended_action: 'Replace tool insert pack; inspect spindle taper',
      cost_of_failure_usd: 64000, cost_of_pm_usd: 2400,
      confidence: 0.84,
    },
  ],
};
write('predictive.json', predictive);

// SUSTAINABILITY — energy, CO2, water, waste
const sustainability = {
  schema: 'sustainability_v1',
  scope3_note: 'GM and Stellantis require Scope-3 part-level emissions data starting 2026 model year. Mercer reports per-part kgCO2e through customer portal.',
  by_plant: [
    {
      plant_id: 'TOL', plant: 'Toledo OH',
      kwh_per_part: 4.2, kwh_per_part_yoy_pct: -3.1,
      co2e_kg_per_part: 1.84, co2e_yoy_pct: -4.2,
      water_gal_per_part: 0.31, water_yoy_pct: -1.6,
      waste_tonnes_month: 142, waste_yoy_pct: -6.3,
      scope1_tonnes_co2e: 8400, scope2_tonnes_co2e: 21800, scope3_tonnes_co2e: 184200,
    },
    {
      plant_id: 'STH', plant: 'Sterling Heights MI',
      kwh_per_part: 1.8, kwh_per_part_yoy_pct: -2.4,
      co2e_kg_per_part: 0.71, co2e_yoy_pct: -3.0,
      water_gal_per_part: 0.06, water_yoy_pct: 0.4,
      waste_tonnes_month: 38, waste_yoy_pct: -2.8,
      scope1_tonnes_co2e: 1200, scope2_tonnes_co2e: 9400, scope3_tonnes_co2e: 92400,
    },
    {
      plant_id: 'IND', plant: 'Indianapolis IN',
      kwh_per_part: 2.6, kwh_per_part_yoy_pct: -1.8,
      co2e_kg_per_part: 1.12, co2e_yoy_pct: -2.4,
      water_gal_per_part: 0.12, water_yoy_pct: -0.6,
      waste_tonnes_month: 72, waste_yoy_pct: -4.1,
      scope1_tonnes_co2e: 3100, scope2_tonnes_co2e: 14600, scope3_tonnes_co2e: 128400,
    },
  ],
  monthly_co2e_trend: (() => {
    const out = [];
    for (let m = 17; m >= 0; m--) {
      const month = new Date(END);
      month.setUTCMonth(END.getUTCMonth() - m);
      const ym = month.toISOString().slice(0, 7);
      const base = 32000 - m * 180;
      out.push({
        month: ym,
        scope1: Math.round(base * 0.12 + rrange(-200, 200)),
        scope2: Math.round(base * 0.42 + rrange(-400, 400)),
        scope3: Math.round(base * 2.4 + rrange(-1200, 1200)),
      });
    }
    return out;
  })(),
};
write('sustainability.json', sustainability);

// PIPELINE STATUS — Fivetran connectors + dbt model layers
const pipeline = {
  schema: 'pipeline_v1',
  refreshed_at: '2026-05-20T11:42:00Z',
  connectors: [
    { name: 'SAP S/4HANA', source: 'Mercer ERP (production)', mechanism: 'Fivetran', status: 'healthy', last_sync_minutes: 12, rows_synced_24h: 482000, latency_target_min: 15 },
    { name: 'Rockwell FactoryTalk MES', source: 'Plant floor MES', mechanism: 'Fivetran', status: 'healthy', last_sync_minutes: 7, rows_synced_24h: 1840000, latency_target_min: 10 },
    { name: 'OSIsoft PI (Process Historian)', source: 'Sensor signals · OT', mechanism: 'Fivetran', status: 'healthy', last_sync_minutes: 4, rows_synced_24h: 24800000, latency_target_min: 5 },
    { name: 'Ignition SCADA', source: 'Line controllers · OT', mechanism: 'Fivetran', status: 'degraded', last_sync_minutes: 22, rows_synced_24h: 920000, latency_target_min: 10, note: 'Sterling Heights endpoint slow — investigating' },
    { name: 'Salesforce', source: 'Customer / RMA records', mechanism: 'Fivetran', status: 'healthy', last_sync_minutes: 18, rows_synced_24h: 14200, latency_target_min: 60 },
    { name: 'ServiceNow', source: 'Maintenance work orders', mechanism: 'Fivetran', status: 'healthy', last_sync_minutes: 9, rows_synced_24h: 8600, latency_target_min: 30 },
    { name: 'Workday', source: 'Headcount / labor', mechanism: 'Fivetran', status: 'healthy', last_sync_minutes: 240, rows_synced_24h: 1840, latency_target_min: 1440 },
  ],
  layers: [
    { layer: 'bronze', name: 'Raw landing (Iceberg)', tables: 184, last_run_min: 4, status: 'healthy', tests_passing: 312, tests_total: 312 },
    { layer: 'silver', name: 'Conformed + cleansed', tables: 76, last_run_min: 11, status: 'healthy', tests_passing: 248, tests_total: 252 },
    { layer: 'gold',   name: 'Business marts',        tables: 28, last_run_min: 14, status: 'healthy', tests_passing: 142, tests_total: 142 },
    { layer: 'platinum', name: 'Agent-facing semantic', tables: 9, last_run_min: 14, status: 'healthy', tests_passing: 58, tests_total: 58 },
  ],
  recent_runs: [
    { run_id: 'r_8842', model: 'gold.fct_oee_shift', status: 'success', duration_s: 38, rows: 24300, started_at: '2026-05-20T11:28:00Z' },
    { run_id: 'r_8841', model: 'gold.fct_downtime_events', status: 'success', duration_s: 22, rows: 8420, started_at: '2026-05-20T11:26:00Z' },
    { run_id: 'r_8840', model: 'silver.dim_asset', status: 'success', duration_s: 14, rows: 612, started_at: '2026-05-20T11:24:00Z' },
    { run_id: 'r_8839', model: 'gold.fct_predictive_alerts', status: 'success', duration_s: 52, rows: 8, started_at: '2026-05-20T11:22:00Z' },
    { run_id: 'r_8838', model: 'silver.stg_pi_signal', status: 'success', duration_s: 188, rows: 24800000, started_at: '2026-05-20T11:18:00Z' },
  ],
  failure_sim: {
    enabled: true,
    note: 'Toggle SCADA Sterling Heights endpoint to FAIL — show downstream dbt test on gold.fct_oee_shift redirect to a stale-data alert.',
  },
};
write('pipeline.json', pipeline);

// ICEBERG LINEAGE
const iceberg = {
  schema: 'iceberg_lineage_v1',
  catalog: 'snowflake_horizon',
  database: 'mercer_lake',
  storage: 's3://mercer-odi-lake/',
  nodes: [
    { id: 'sap_prod_ord',  label: 'sap.production_order',      layer: 'source', type: 'erp', rows: '32M' },
    { id: 'mes_work_unit', label: 'mes.work_unit_event',       layer: 'source', type: 'mes', rows: '1.4B' },
    { id: 'pi_signal',     label: 'pi.sensor_signal',          layer: 'source', type: 'historian', rows: '24B' },
    { id: 'scada_tag',     label: 'scada.tag_reading',         layer: 'source', type: 'scada',   rows: '8.2B' },
    { id: 'sn_workorder',  label: 'servicenow.work_order',     layer: 'source', type: 'maintenance', rows: '410K' },
    { id: 'sf_rma',        label: 'salesforce.rma',            layer: 'source', type: 'crm',     rows: '38K' },

    { id: 'br_oee_event',  label: 'bronze.oee_event_raw',      layer: 'bronze', type: 'iceberg', rows: '1.4B' },
    { id: 'br_pi_signal',  label: 'bronze.pi_signal_raw',      layer: 'bronze', type: 'iceberg', rows: '24B' },
    { id: 'br_scada_tag',  label: 'bronze.scada_tag_raw',      layer: 'bronze', type: 'iceberg', rows: '8.2B' },
    { id: 'br_wo',         label: 'bronze.work_order_raw',     layer: 'bronze', type: 'iceberg', rows: '410K' },

    { id: 'si_shift_run',  label: 'silver.shift_run_clean',    layer: 'silver', type: 'iceberg', rows: '24K' },
    { id: 'si_asset',      label: 'silver.dim_asset',          layer: 'silver', type: 'iceberg', rows: '612' },
    { id: 'si_downtime',   label: 'silver.downtime_event',     layer: 'silver', type: 'iceberg', rows: '8.4K' },
    { id: 'si_sensor',     label: 'silver.sensor_signal_5m',   layer: 'silver', type: 'iceberg', rows: '92M' },

    { id: 'go_oee',        label: 'gold.fct_oee_shift',        layer: 'gold',   type: 'iceberg', rows: '24K' },
    { id: 'go_downtime',   label: 'gold.fct_downtime_events',  layer: 'gold',   type: 'iceberg', rows: '8.4K' },
    { id: 'go_quality',    label: 'gold.fct_quality_lot',      layer: 'gold',   type: 'iceberg', rows: '184K' },
    { id: 'go_pred',       label: 'gold.fct_predictive_alerts', layer: 'gold',  type: 'iceberg', rows: '8' },
    { id: 'go_sustain',    label: 'gold.fct_energy_per_part',  layer: 'gold',   type: 'iceberg', rows: '24K' },

    { id: 'pl_ops_agent',  label: 'platinum.sem_ops_intel',    layer: 'platinum', type: 'iceberg', rows: '—' },
  ],
  edges: [
    { from: 'sap_prod_ord',  to: 'br_oee_event',  via: 'Fivetran' },
    { from: 'mes_work_unit', to: 'br_oee_event',  via: 'Fivetran' },
    { from: 'pi_signal',     to: 'br_pi_signal',  via: 'Fivetran' },
    { from: 'scada_tag',     to: 'br_scada_tag',  via: 'Fivetran' },
    { from: 'sn_workorder',  to: 'br_wo',         via: 'Fivetran' },
    { from: 'sf_rma',        to: 'br_wo',         via: 'Fivetran' },

    { from: 'br_oee_event',  to: 'si_shift_run',  via: 'dbt' },
    { from: 'br_pi_signal',  to: 'si_sensor',     via: 'dbt' },
    { from: 'br_scada_tag',  to: 'si_sensor',     via: 'dbt' },
    { from: 'br_wo',         to: 'si_downtime',   via: 'dbt' },
    { from: 'br_oee_event',  to: 'si_asset',      via: 'dbt' },

    { from: 'si_shift_run',  to: 'go_oee',        via: 'dbt' },
    { from: 'si_downtime',   to: 'go_downtime',   via: 'dbt' },
    { from: 'si_shift_run',  to: 'go_quality',    via: 'dbt' },
    { from: 'si_sensor',     to: 'go_pred',       via: 'dbt' },
    { from: 'si_shift_run',  to: 'go_sustain',    via: 'dbt' },

    { from: 'go_oee',        to: 'pl_ops_agent',  via: 'dbt' },
    { from: 'go_downtime',   to: 'pl_ops_agent',  via: 'dbt' },
    { from: 'go_pred',       to: 'pl_ops_agent',  via: 'dbt' },
  ],
  consumers: [
    { name: 'Run-time agent — Plant Ops',         reads: 'platinum.sem_ops_intel' },
    { name: 'Tableau exec dashboard',             reads: 'gold.fct_oee_shift, gold.fct_downtime_events' },
    { name: 'Power BI plant directors',           reads: 'gold.fct_oee_shift' },
    { name: 'Predictive maintenance app',         reads: 'gold.fct_predictive_alerts' },
    { name: 'GM / Stellantis Scope-3 portal export', reads: 'gold.fct_energy_per_part' },
  ],
};
write('iceberg.json', iceberg);

// HELPERS
function write(name, obj) {
  writeFileSync(join(OUT, name), JSON.stringify(obj, null, 2) + '\n');
  console.log('wrote', name);
}
function round3(x) { return Math.round(x * 1000) / 1000; }
function round2(x) { return Math.round(x * 100) / 100; }
function round1(x) { return Math.round(x * 10) / 10; }
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
