# SPR Universal Connector Infrastructure

SPR's integration model is evidence-first: connectors are transport adapters, not sources of truth. Every connector eventually emits normalized observations that can be attached to a persistent Software Passport and Evidence Graph.

## Canonical flow

`External system -> Connector -> Auth boundary -> Raw observations -> Normalization -> Evidence hash -> Software identity -> Evidence graph -> Trust state -> Explanation/API`

## Non-negotiable truth rules

1. A connector may report only what its upstream system actually exposes.
2. Every normalized observation has an observed timestamp and connector identity.
3. Evidence may be stale; stale evidence is never silently presented as current.
4. Evidence hashes provide tamper-evident identity for normalized observations.
5. Unknown means unknown/not observed. The platform must not infer a positive claim merely because a connector is connected.
6. AI may summarize or translate evidence, but it cannot manufacture evidence or become an independent source of truth.
7. `planned`, `available`, `authenticated`, `degraded`, and `disabled` are distinct states. SPR must never represent a planned connector as live.

## Connector contract

The connector contract in `src/lib/connectors/types.ts` deliberately separates:

- identity and category
- authentication mechanism
- capabilities
- connection context
- observation production

This allows future OAuth, API-key, service-account, webhook, polling, and event-driven adapters to share the same normalized evidence boundary.

## Registry

`src/lib/connectors/registry.ts` is the catalog boundary. It currently defines a broad ecosystem map spanning source control, CI/CD, cloud, containers, artifacts, package ecosystems, security, identity, observability, ITSM, SaaS, data, AI, and evidence systems.

The catalog is intentionally explicit about live state. Definitions are not credentials and do not imply that an account is authenticated.

## Observation model

`src/lib/connectors/observations.ts` provides deterministic normalization and SHA-256 evidence hashing. This gives the rest of SPR one shape to consume regardless of upstream vendor API shape.

Future connector implementations should follow this sequence:

1. Authenticate through the platform's connection boundary.
2. Fetch or receive upstream data.
3. Convert upstream records to `RawObservation`.
4. Normalize through `normalizeObservation` / `normalizeObservations`.
5. Persist observations through the existing evidence/persistence layer.
6. Link observations to Software Passport identity and relationships.
7. Recompute affected Trust State and monitoring signals.

## Scale target

The architecture is designed so adding connector number 500 is an adapter/catalog operation rather than a redesign of the Passport, Evidence Graph, or Trust State layers.

The next implementation layers are connection storage, OAuth/API-key secret brokering, webhook ingestion, polling/queue execution, connector health, policy controls, tenant isolation, rate-limit handling, retry/dead-letter behavior, provenance retention, and UI surfaces for connection state and evidence lineage.
