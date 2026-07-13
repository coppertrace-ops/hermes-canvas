# OpenLineage + Marquez + W3C PROV — data/agent lineage

- URLs: https://openlineage.io/docs/ , https://openlineage.io/getting-started/ , https://www.w3.org/TR/prov-dm/ (referenced)
- Accessed: 2026-07-13
- Confidence: High (official docs)

## What it is
OpenLineage: "an open framework for data lineage collection and analysis" with "an extensible specification that systems can use to interoperate with lineage metadata." Core entities: **Dataset, Job, Run**, enriched by **facets** ("user-defined metadata ... an atomic piece of metadata attached to one of the core entities"). "The specification is defined using OpenAPI and allows extension through custom facets."

## Append-only event model / provenance
"At the core of OpenLineage is the event, a JSON document that represents what a pipeline/job did at a specific moment." Tools (Airflow, Spark, Flink, dbt) "emit structured lineage events as pipelines run." Marquez is "the reference implementation ... to collect, aggregate, and visualize a data ecosystem's metadata" — the run dashboard for lineage.

## W3C PROV linkage
"W3C PROV-DM defines general provenance concepts such as entities, activities, agents, generation, usage, derivation." OpenLineage is a practical event-driven implementation over these concepts.

## Agent relevance
Model is dataset/pipeline-centric, not agent-run-centric. Emits provenance events but assumes cooperating instrumented tools (not a tamper-evident independent verifier). Buyer: data engineering / governance.

## Deploy
OSS (Marquez self-host); many managed catalogs (Atlan, DataHub, etc.) ingest OpenLineage. Devops/data-plumbing, not human-legible agent UI.
