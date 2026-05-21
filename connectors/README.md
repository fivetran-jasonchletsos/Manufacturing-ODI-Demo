# Connectors

Seven Fivetran connectors feed Mercer's Iceberg lake. All seven are
standard Fivetran connectors — no custom Connector SDK code is required
for this build.

| Source | Connector | Cadence | Latency target |
|---|---|---|---|
| SAP S/4HANA | Fivetran SAP S/4HANA connector | 15-minute sync | 15m |
| Rockwell FactoryTalk MES | Fivetran on-prem agent (database connector) | 10-minute sync | 10m |
| OSIsoft PI (Process Historian) | Fivetran high-volume database connector | 5-minute incremental | 5m |
| Ignition SCADA | Fivetran on-prem agent (Postgres backing store) | 10-minute sync | 10m |
| ServiceNow | Fivetran ServiceNow connector | 30-minute sync | 30m |
| Salesforce | Fivetran Salesforce connector | 60-minute sync | 60m |
| Workday | Fivetran Workday connector | Daily | 1440m |

## Destination

All seven land directly into Apache Iceberg tables in the
`mercer-odi-lake` S3 bucket, cataloged in Snowflake Horizon. Bronze
schemas are auto-evolved as upstream schemas change; downstream silver
and gold dbt models opt into evolution explicitly via column-level
contracts.

## OT data path

The PI and SCADA connectors run on a Fivetran on-prem HVR agent inside
the plant DMZ. The agent has read-only access to the historian and
SCADA Postgres replica. There is no write path back into the control
network — read-only by design and audited by Mercer corporate security.

## Schedule + monitoring

Connector health is published into `gold.fct_pipeline_health` every
five minutes, joined to dbt run history, and exposed on the Pipeline
page of this demo. The Pipeline page also includes a failure-simulator
toggle that demonstrates how an OT outage propagates into a downstream
data-quality alert on `gold.fct_oee_shift`.
