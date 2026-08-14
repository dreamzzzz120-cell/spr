# SPRK2 Production Trust Report

## Executive Summary

SPRK2 is now restored to production-ready database connectivity and verified end-to-end for the core authenticated health path.

- Cloud Run service: `sprk2` in `us-central1`
- Cloud SQL instance: `spr4-c2c65:us-central1:spr-server-pg` (PostgreSQL 16)
- Secret Manager secret: `sprk2-db-password` (version 6 active)
- Latest deployed Cloud Run revision: `sprk2-00011-b82`
- Verified endpoint: `https://sprk2-535878442566.us-central1.run.app/api/health`
- Verification result: `200 OK`, payload includes `"db":"connected"` and `"code":"DB_CONNECTED"`

## Architecture Overview

SPRK2 is a full-stack application with:

- Frontend assets served through Cloud Run
- Node.js/Express server runtime bundled with esbuild
- PostgreSQL database accessed through Drizzle ORM and `pg`
- Cloud Run as the runtime platform
- Google Secret Manager for production database credentials
- Cloud SQL connection through Cloud Run Cloud SQL connector

The current deployment is a single Cloud Run service backed by one active revision with traffic routed at 100%.

## Deployment Configuration

- Service name: `sprk2`
- Region: `us-central1`
- Runtime environment: `NODE_ENV=production`
- Database configuration env vars:
  - `SQL_HOST=/cloudsql/spr4-c2c65:us-central1:spr-server-pg`
  - `SQL_USER=sprapp`
  - `SQL_DB_NAME=sprdb`
  - `SQL_PASSWORD` sourced from `sprk2-db-password:latest`
- Secret access: `535878442566-compute@developer.gserviceaccount.com` granted `roles/secretmanager.secretAccessor`
- Cloud Run runtime service account currently has sufficient Cloud SQL permission via project IAM `roles/editor`.

## Database Protection

- Database user: `sprapp`
- Database password rotated and re-established in Secret Manager
- Old secret versions v1-v5 disabled after successful verification
- Active secret version: v6
- Temporary troubleshooting user `sprapp_debug` was created and removed during validation

## Secret Management

- Secret: `sprk2-db-password`
- Current state: version 6 `ENABLED`
- Old versions: v1-v5 `DISABLED`
- Secret versioning preserved for audit history
- Cloud Run uses `secretKeyRef` for `SQL_PASSWORD`, avoiding plain-text credential storage

## Authentication Model

- Cloud Run service is not publicly invocable without authentication
- Internal API security requires valid identity tokens
- Verified access using a Cloud IAM identity token from the owner account

## Security Controls Implemented

- HTTP security headers enforced in middleware
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `X-Frame-Options: SAMEORIGIN`
- CORS configured to allow only approved origins and explicit methods
- Cloud Run secret injection used for production database password
- Database connectivity verified with Cloud SQL Proxy and direct authentication
- Temporary troubleshooting artifacts cleaned up

## Database Verification Evidence

- Direct Cloud SQL authentication test performed through Cloud SQL Proxy
- Verified Cloud SQL accepted a temporary test user and then the main `sprapp` user password
- Verified `sprapp` role exists and is configured to allow login
- Confirmed production application health endpoint returns:
  - `200 OK`
  - `{"status":"ok","service":"SPR","db":"connected","code":"DB_CONNECTED"}`

## Known Limitations

- Cloud Run runtime service account currently has broad `roles/editor` permission at the project level. This is functional but not least-privilege.
- Cloud SQL public IP is enabled on the instance; production hardening should consider restricting public access and using private networking or authorized networks.
- Optional integration warnings are still present in logs for Sentry, Firebase admin credentials, Stripe, Redis, and Gemini API key. These are non-blocking for core app functionality.
- The deployment does not currently include dedicated secrets for every optional integration.

## Production Readiness Score

- Overall score: **8 / 10**

Rationale:
- Core database connectivity and application health are verified.
- Secret rotation and secret version cleanup completed.
- Security headers and Cloud Run secret injection are implemented.
- Remaining hardening opportunities: tighten IAM on the runtime service account and reduce Cloud SQL public exposure.

## Next Recommended Actions

1. Harden Cloud Run runtime SA by replacing broad `roles/editor` with least-privilege roles such as `roles/cloudsql.client` and `roles/secretmanager.secretAccessor`.
2. Restrict Cloud SQL public access and/or enable private IP connectivity.
3. Add production observability or error reporting credentials if required for full operational readiness.
4. Continue monitoring Cloud Run logs for runtime exceptions and DB reconnects.
