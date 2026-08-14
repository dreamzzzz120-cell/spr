# Software Passport Registry (SPR) — Quality & Security Guidelines

**SPR — No Fake Data / No Fake Security Rules**

1. **No client-only trust boundaries for security state.** Any check that decides "is this user verified/authenticated/authorized" must be enforced server-side, at time of use. If it can be true, be told to skip it, or be true in the browser and false in prod, it's fake.

2. **No invented crypto values.** Never generate a hash, signature, secret, or token client-side and present it as if it came from a real computation over real data. If the real thing (e.g. SHA-256 of an uploaded file) isn't available yet, the field is empty/null/"pending" — not a plausible-looking fake.

3. **Do not accept self-reported VERIFIED evidence without independent hash validation.** Status claims like `VERIFIED` or `PARTIALLY_VERIFIED` must be backed by an actual server-side payload integrity check and a persisted evidence status field; otherwise the evidence is treated as unverified or failed.

4. **No canned strings presented as AI/system output.** If a summary, score, or analysis wasn't produced by an actual model call or real computation, it doesn't get written into a field the UI displays as if it were. Empty or "pending analysis" beats a fabricated sentence every time.

4. **No silent catches on security- or trust-critical paths.** Auth, RBAC, billing, and integrity checks that fail must fail loud — visible in logs an operator will actually see, and defaulting to deny/pending, not fallback-to-success or fallback-to-default-role.

5. **Heuristics must be labeled as heuristics.** Regex/keyword matching, fuzzy classification, or any guess-based logic gets UI copy that says "heuristic" / "unverified match" — never phrased as if it were a verified scan/attestation/parse result.

6. **One fake fixed ≠ done — check for the same pattern elsewhere.** Before closing out a fix, grep the codebase for the same anti-pattern (`Math.random()`, `crypto.getRandomValues()` used for fake data, hardcoded "success" strings, client-only security checks) in adjacent files. Report what else was found, even if not asked.

7. **State what's real vs. simulated in every completion summary.** Every "fixed" or "built" summary must explicitly say which parts are now backed by real server-side logic vs. still stubbed/pending — no summary gets to just say "resolved" without that distinction.

---

**SPR — Verification-Before-Claims Rule**

1. **"Real" requires a receipt, not a description.** Any status table, summary, or checklist item marked "Real" / "Verified" / "Fixed" must be accompanied by the actual code (function name + file path, or pasted snippet) that proves it — not a paraphrase of what it's supposed to do. If the code can't be shown, the item is marked "Unverified" or "Not yet implemented," full stop.

2. **No reclassifying a known gap as a feature.** If something was previously identified as a problem (a silent fallback, a client-only check, a fake value), it cannot later be described in positive/graceful language ("handles gracefully," "proceeds cleanly") unless the underlying behavior actually changed to meet the rule it violated. Same behavior + nicer words = still a violation.

3. **Every "Real vs Simulated" table must be independently checkable.** Each row needs either a diff, a file path + line reference, or a command to run that confirms the claim. A table with no way to verify its own claims is itself an instance of the problem this policy exists to prevent.

4. **When a requested fix wasn't done, say so explicitly — don't fold it into an unrelated summary.** If a fix from a prior prompt was skipped, deferred, or partially done, the next summary must open with that gap named, not bury it inside a table row that implies completion.

5. **Silent-failure fixes must show the new failure path, not just the removal of the old one.** "Fixed the silent catch" is not sufficient — show what happens now on failure: what gets logged, where, and what state the system defaults to (deny/pending). If that path isn't shown, the fix isn't confirmed.

6. **Ygh (or Claude) can demand receipts at any time, and "I already did that" is not an answer.** If asked to show the code behind a claim, the only acceptable responses are: the code, or an admission that it doesn't exist yet.

---

**SPR — No Narrated Fiction In-App Rule**

1. **The app must never describe its own internals in copy that isn't true.** Any string rendered to a user — log line, toast, animated status message, progress step, tooltip — that claims a specific technical event occurred ("Handshaking with FIPS cryptographic vault," "RBAC permission gates established," "Isolated cloud registry initialized") must correspond to a real, traceable operation. If no such operation exists, the copy doesn't get written — not even as flavor text, not even temporarily.

2. **Generic progress language is fine; specific false claims are not.** "Setting up your workspace..." is acceptable while work happens. "Handshaking with FIPS cryptographic vault" is not acceptable unless there is an actual FIPS-validated cryptographic handshake occurring at that exact step. When in doubt, make the copy vaguer, not more impressive.

3. **Animated/staged UI sequences are held to the same standard as data.** A step-by-step "setup log" animation is itself a claim about what the system is doing. Each line must map to a real backend call or process, in the actual order it happens — not a pre-written script that plays regardless of what's really occurring server-side.

4. **This applies retroactively.** Any existing in-app copy, log animation, or status message must be audited against this rule the same way fake data was audited — grep for dramatic/technical-sounding strings in UI components and verify each one against real behavior. Report anything found, even if not asked.

5. **Marketing tone is allowed; false specificity is not.** "Registry secured" is a vibe. "FIPS cryptographic vault handshake complete" is a factual claim about a specific security standard being met. The former is fine as UI polish; the latter is a lie unless it's literally true.
