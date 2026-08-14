# Initial Owner Bootstrap

SPR creates its first Owner only through the `bootstrap-initial-owner` Cloud Run Job. It is an operational procedure, not an HTTP endpoint.

## Controls

- `SPR_INITIAL_OWNER_EMAIL` is the exact, pre-approved Firebase email. It must be injected from Secret Manager; it is never hard-coded.
- `SPR_OWNER_BOOTSTRAP_SECRET` is a separate, high-entropy Secret Manager value. `SPR_OWNER_BOOTSTRAP_SECRET_SHA256` is its SHA-256 verifier, also injected from Secret Manager. The job compares them in constant time and never logs either value.
- The job reads the Firebase user server-side, requires that exact email and `emailVerified === true`, and uses the user’s real Firebase UID.
- PostgreSQL `pg_advisory_xact_lock` serializes the Owner-existence check, Owner record creation, and audit-ledger write. A persisted Owner blocks every later bootstrap attempt.
- Firebase Owner claims are set server-side and rolled back if the database transaction fails.

## Required preparation

1. Obtain written approval for the exact initial Owner email.
2. Have that operator complete the normal Firebase sign-in and email verification flow. The bootstrap job does not create an account or verify an email.
3. Create the three Secret Manager values using approved operator procedures: the authorized email, the high-entropy bootstrap secret, and the secret's SHA-256 verifier. Never place any of them in source control, browser code, local storage, or documentation.
4. Create a Cloud Run Job from the deployed SPR image. Give its runtime service account only the Cloud SQL and Secret Manager/Firebase permissions it needs. Mirror the service’s Cloud SQL connector and SQL environment configuration, with all sensitive values injected from Secret Manager.
5. Configure only the three bootstrap variables above as Secret Manager references, then execute the job once with a tightly authorized operator account.

The job command is `node dist/bootstrap-initial-owner.cjs`. It exits non-zero with a generic authorization failure if any prerequisite is missing, mismatched, unverified, or an Owner already exists.

## After bootstrap

The resulting Owner signs in normally and receives Firebase claims from the server. Owners can use the existing invitation and role-management routes to provision other users. Normal signup remains `Viewer`; `/api/user/onboard` cannot grant `Owner` or `Admin`.

To recover access, use an existing Owner to invite or promote another operator. If no Owner remains, use the approved incident-recovery process to review the audit ledger, revoke the old bootstrap secret, configure a new authorized email and bootstrap secret, and run a separately approved recovery procedure. Do not re-enable viewer self-promotion.
