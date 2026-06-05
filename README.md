# Manufacturing ODI Demo — Mercer Manufacturing

Reference build that shows how a Tier-1 auto-parts supplier can run plant
operations on Fivetran's Open Data Infrastructure. OT data from process
historians and SCADA joined to IT data from SAP, MES, and ServiceNow,
landed in an open Iceberg lake on S3, transformed by dbt, and exposed to
humans and agents through one governed semantic layer.

**Live:** https://fivetran-jasonchletsos.github.io/Manufacturing-ODI-Demo/

## The fictional company

**Mercer Manufacturing** is a Tier-1 supplier of brake systems and wire
harnesses with three plants — Toledo OH, Sterling Heights MI, Indianapolis
IN — serving GM, Ford, Stellantis, and Honda. Annual revenue ~$1.8B.
All data on this site is synthetic.

## Pages

- **Plant Floor** — KPI tiles, 30-day plant OEE trend, top 3 issues, per-plant line summary
- **Quality** — FTQ by part family, defect Pareto, downtime causes by plant
- **Predictive Maintenance** — eight machines flagged by the run-time agent with cost-of-failure vs cost-of-PM
- **Sustainability** — Scope 1/2/3, per-part energy and CO2e, OEM Scope-3 reporting angle
- **ODI Architecture** — lineage nodes by layer, edges, downstream consumers
- **Pipeline** — Fivetran connector status, dbt layers, failure simulator
- **OT/IT Policy** — ISA-95 stack, why manufacturing data is fragmented, governance posture
- **About** — the canonical ODI Story block, tech stack, data sources

## Architecture

```
SAP S/4HANA · Rockwell FactoryTalk MES · OSIsoft PI · Ignition SCADA
ServiceNow · Salesforce · Workday
              │
              ▼  Fivetran (7 connectors)
              │
   ┌──────────────────────────────────────┐
   │  S3 + Apache Iceberg v2              │
   │  bronze · silver · gold · platinum   │
   └──────────────────────────────────────┘
              │
              ▼  dbt labs + dbt-wizard (297 models, 712 tests)
              │
   ┌──────────────────────────────────────┐
   │  Snowflake · AWS Athena              │
   │  Tableau · Power BI · run-time agents │
   └──────────────────────────────────────┘
```

## Build locally

```bash
cd mercer-app/frontend
npm install
npm run dev
```

Vite serves at http://localhost:5173/Manufacturing-ODI-Demo/. To preview
at root, set `VITE_BASE=/`.

## Regenerate synthetic data

```bash
node scripts/gen_data.mjs
```

Writes the eight JSON files into `mercer-app/frontend/public/data/`.

## Deploy

Push to `main`; the `deploy.yml` workflow builds and publishes to GitHub
Pages.

---
Synthetic data only. No real OEM, supplier, or sensor data.
