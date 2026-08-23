# SPR Security Hardening Status

This file is a machine-checkable release checklist. A control is only marked complete when its code path and CI receipt exist.

## Implemented in the hardening branch

- Node 22 production and worker container baseline.
- Non-root production containers.
- Pinned Syft installer revision.
- Fail-closed shared Redis rate limiting in production.
- Exact RBAC allowlists; no implicit role hierarchy escalation.
- RBAC/rate-limit attack regression tests.
- Live unauthenticated API route attack harness.
- Production configuration fail-closed contract for HTTPS, proxy trust, Postgres, Redis, Firebase Admin, and Stripe signing.
- Migration version uniqueness/order/transaction gate.
- Duplicate migration version 0004 removed; remediation tasks moved to 0006 without rewriting existing 0005 history.
- Database migration integration test runs migrations twice and verifies key tables.
- Route security static gate.
- CodeQL security analysis.
- Private-key material CI check.
- CODEOWNERS policy for security-sensitive files.

## External controls requiring repository/deployment administration

- `main` branch protection/ruleset must require the Security Hardening checks and pull-request review.
- Production secrets must be present in the deployment secret manager.
- Production DB migration job must be executed successfully against the real database before release.
- Firebase Admin credentials, Redis, Stripe secret, and Stripe webhook secret must be validated in the real environment.
- Backup restore must be executed against the real production backup system.

No external control is represented as complete merely because configuration documentation exists.
