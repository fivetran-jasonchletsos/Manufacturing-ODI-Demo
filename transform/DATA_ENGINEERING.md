# dbt — transform layer

297 models, 712 tests, four layers: **bronze → silver → gold → platinum**.

## Layer contract

| Layer | Purpose | Materialization | Read access |
|---|---|---|---|
| `bronze` | Raw landing — one table per source object, no transforms beyond column rename / cast | Iceberg incremental (append) | Engineers only |
| `silver` | Conformed dims + facts — typed, de-duped, joined to canonical keys (plant, line, asset, shift) | Iceberg incremental (merge) | Engineers + power analysts |
| `gold` | Business facts that match how plant directors think — OEE per shift, downtime events with attributed root cause, predictive alerts | Iceberg merge / view | All analysts, BI, agents |
| `platinum` | Agent-facing semantic — denormalized for run-time agents; one row = one question | Iceberg view | run-time agents, embedded apps |

## Key models

- `gold.fct_oee_shift` — OEE per plant/line/shift/day. Joins
  `silver.shift_run_clean` (MES) with `silver.dim_asset`. The grain
  every downstream chart and agent reads.
- `gold.fct_downtime_events` — one row per downtime event with
  reconciled root-cause attribution (MES stop event ↔ SCADA fault tag ↔
  ServiceNow work-order).
- `gold.fct_quality_lot` — per-lot first-time-quality with defect-mode
  Pareto roll-up.
- `gold.fct_predictive_alerts` — output of the dbt-wizard run-time agent predictive
  maintenance model. Reads `silver.sensor_signal_5m`; writes back the
  P10/P50 days-to-failure, recommended action, and confidence.
- `gold.fct_energy_per_part` — per-part kWh and kgCO2e. The model that
  feeds Mercer's customer Scope-3 export to GM and Stellantis.
- `platinum.sem_ops_intel` — single denormalized table the run-time agent
  reads. Wide; one row per plant/line/shift/asset combination with all
  facts pre-joined.

## Tests

712 tests live in `tests/`:

- not-null + unique on every primary key
- referential integrity from gold facts back to silver dims
- relationships between MES stop events and SCADA fault windows (must
  overlap within 60s)
- freshness contracts on every source: SAP, MES, PI, SCADA, ServiceNow
- a row-count delta test on `silver.sensor_signal_5m` (must be within
  5% of expected 5-minute cadence) — this is the test that fires
  when the SCADA failure simulator is toggled

## Lineage

See the **Architecture** page in the demo for an interactive view.
Lineage edges are tagged with the mechanism — `Fivetran` for ingest
edges, `dbt` for transform edges. The catalog is Snowflake Horizon.

## Performance

All gold models materialize in under 60s on a small Snowflake warehouse.
The expensive model is `silver.sensor_signal_5m` (downsample of 24B
historian rows) — it runs incrementally on a medium warehouse and
takes 3-5 minutes. The downsample is the only place we change the grain
of the sensor data; everything downstream operates on 5-minute buckets.
