# SPR PostgreSQL restore procedure

Status: documented procedure only. A production restore test must be recorded separately before recovery can be described as verified.

1. Open a release incident and record the affected Railway deployment, Neon project, database, and desired recovery point.
2. Put mutation traffic into maintenance mode. Keep read-only health and incident-status endpoints available.
3. In Neon, create an isolated recovery branch from the selected point in time. Do not overwrite the production branch.
4. Obtain a short-lived connection string for the isolated recovery branch through the approved secret manager. Never paste it into source, logs, tickets, or command history.
5. Run schema checks and the SPR read-only smoke suite against the recovery branch.
6. Compare tenant, passport, evidence, audit-chain, repository-source, job, and finding counts with the incident record. Sample evidence payload digests without changing verification state.
7. Have a second authorized operator review the recovery evidence and approve promotion.
8. Update the runtime database secret to the approved recovery branch, redeploy API and worker, and run `/api/health`, authentication, tenant-isolation, queue, and evidence-read checks.
9. Re-enable mutations only after the checks succeed. Record exact timestamps, operators, branch identifiers, deployment IDs, and command outputs in the incident.
10. Retain the former production branch until the incident retention period expires.

Never claim recovery is verified from this document alone. A restore exercise requires an isolated database restore and recorded observations.
