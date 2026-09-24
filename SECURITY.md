# Security Policy

## Reporting a vulnerability

Please do not disclose suspected security vulnerabilities in a public GitHub issue.

Report security issues privately to the repository owner/maintainer through GitHub's private vulnerability reporting mechanism, or use the security contact published by the SPR operator.

Include, when possible:
- affected URL, endpoint, package, or component;
- reproduction steps or a minimal proof of concept;
- impact and affected tenant/data scope;
- relevant logs, request IDs, or timestamps;
- suggested mitigation.

Do not include secrets, credentials, personal information, or customer data in a report.

## Security response principles

SPR treats authentication, authorization, tenant isolation, evidence integrity, billing integrity, secret exposure, supply-chain compromise, and data-loss risks as security-sensitive.

A security fix is not considered complete until it is tested, reviewed, and covered by an appropriate automated regression check where practical.

## Supported versions

The `main` branch is the source of truth for the current production release line. Older releases may not receive security fixes unless explicitly maintained.
