Timestamp: Wednesday, September 2, 2026 at 8:16:14 PM MDT
Location: Calgary, Alberta

# Stage

Phase 2-2 — Stage 2A Safe Trigger Seam only.

# Goal

Implement and locally prove a development-protected Cloudflare Worker `POST /run` seam that keeps the GitHub credential server-side, dispatches the existing workflow, converts GitHub's returned workflow run ID into an expiring signed FloppyDisk job capability, and returns only the small browser contract `{ jobToken, expiresAt }`.

# Baseline

- Branch: `main`.
- Starting HEAD: `03753b391bdb1ae2ce80b757e3f1f3b1f42eb913` (`docs: add Phase 2-1 web UI architecture`).
- Starting relationship: one commit ahead of `origin/main` (`904820b1bd2918d25f2e81820c741e2387c82c4d`).
- The Phase 2-1 documentation-only commit was preserved.
- Pre-existing untracked file preserved and excluded from both Stage 2A commits: `Claude and Codex Reports/Git Commit - Push Rule.md`.
- Baseline Python regression: `96 passed in 0.50s`.

# Files Added / Changed

Implementation commit `6c7f9458927325d348d680d11f0a85637b2bc9a6` adds only:

- `bridge/src/index.js`
- `bridge/src/github.js`
- `bridge/src/capability.js`
- `bridge/wrangler.toml`
- `bridge/package.json`
- `bridge/package-lock.json`
- `bridge/.gitignore`
- `bridge/test/capability.test.js`
- `bridge/test/github.test.js`
- `bridge/test/index.test.js`
- `bridge/test/scope.test.js`

# Architecture Amendments Applied

- The repository was not made public and no visibility setting was changed.
- The browser contract uses an opaque signed job capability, not a naked run ID.
- `POST /run` requires `X-FloppyDisk-Dev-Key` matching the Worker-only `FLOPPYDISK_DEV_KEY` binding.
- `github.js` exclusively owns GitHub URL, headers, authentication, API version, request body, and response-shape details.
- The route and capability implementation do not know GitHub API details.
- No frontend, Pages configuration, workflow change, persistence service, user account, or additional endpoint was added.

# Local Automated Tests

Command: `cd bridge && npm.cmd test`

Result: **10 passed, 0 failed**.

The tests prove:

1. missing development key is rejected;
2. wrong development key is rejected before dispatch;
3. the correct key reaches the injected dispatch seam;
4. dispatch targets `nowimhere3/FloppyDisk`, `extract-links.yml`, `main`, and sends `return_run_details: true`;
5. the PAT is supplied only to the server-side GitHub request;
6. raw GitHub details, URLs, failures, and stack traces are not returned;
7. the response contains `jobToken` and `expiresAt`;
8. the response does not expose `runId` as its authorization contract;
9. a valid capability verifies and identifies exactly one internal run;
10. a modified capability fails verification;
11. an expired capability fails verification; and
12. the Stage 2A diff does not modify `floppydisk/` or `.github/workflows/`.

No real secret value was used or written. Test values are explicitly fake, test-only strings. `node_modules`, `.wrangler`, `.dev.vars`, and `.env*` are ignored. Wrangler's local bundle validation also passed:

```text
wrangler 4.128.0
Total Upload: 3.95 KiB / gzip: 1.65 KiB
No bindings found.
--dry-run: exiting now.
```

# Existing Python Regression

Post-implementation command: `python -m pytest -q`

Result: **96 passed in 0.53s**.

# Cloudflare Deployment

**Not deployed.** `wrangler whoami` reported that this machine is not authenticated and instructed the operator to run `wrangler login`. A temporary preview account was deliberately not used because it cannot establish the required durable, secret-backed acceptance seam.

# GitHub Dispatch Evidence

Local mocked dispatch evidence passes and matches GitHub's current documented contract: the dispatch body contains `ref: "main"` and `return_run_details: true`, and a successful response is required to contain a usable positive `workflow_run_id`.

No hosted dispatch was attempted because Cloudflare authentication and Worker secrets are not available. Therefore a usable run ID has not yet been empirically returned to the hosted Worker. The implementation deliberately fails closed with a minimal `502` if GitHub omits or malforms `workflow_run_id`; it contains no invented correlation fallback.

# Capability Token Evidence

The capability is a compact base64url payload plus HMAC-SHA256 signature. Its signed payload contains version `v`, one decimal-string `runId`, and integer expiry `exp`. Verification checks signature integrity, version, run ID shape, and strict expiration. Tests cover valid, tampered, and expired tokens and prove recovery of exactly one run ID for later server-side use.

# Secret Handling

The implementation expects exactly three server-side Worker secrets:

- `GITHUB_TOKEN`
- `FLOPPYDISK_CAPABILITY_SECRET`
- `FLOPPYDISK_DEV_KEY`

No values were requested, displayed, logged, committed, or included in this report. The client response contains neither credentials nor GitHub/repository metadata.

# Human Actions Required

From `C:\Users\dmcal\Documents\GitHub\FloppyDisk\bridge`, the human must complete this smallest credential gate directly in a terminal:

```powershell
.\node_modules\.bin\wrangler.cmd login
.\node_modules\.bin\wrangler.cmd secret put GITHUB_TOKEN
.\node_modules\.bin\wrangler.cmd secret put FLOPPYDISK_CAPABILITY_SECRET
.\node_modules\.bin\wrangler.cmd secret put FLOPPYDISK_DEV_KEY
```

The GitHub fine-grained PAT must be limited to `nowimhere3/FloppyDisk` with Actions read/write and no Contents write permission. Enter each secret only into Wrangler's terminal prompt; do not paste any secret into chat or a report.

After those four commands succeed, Codex can deploy and perform exactly one real protected `POST /run` acceptance request. The human should not manually perform or repeat the dispatch.

# Production Changes

- New bridge code only.
- No file under `floppydisk/` changed.
- No existing Python test changed.
- `.github/workflows/extract-links.yml` did not change.
- No UI, GitHub Pages, repository visibility, or GitHub repository setting changed.
- Nothing was pushed.

# Known Unknowns

- The hosted Cloudflare deployment remains unproven until the human login/secrets gate is complete.
- GitHub's documented `workflow_run_id` response remains locally modeled but not empirically confirmed through the deployed bridge for this private repository.
- The actual repository visibility was supplied as private by the binding amendment; no visibility-changing operation was performed. No authenticated repository-administration query was needed or attempted.

# PASS / REVIEW / STOP

**REVIEW** — local Stage 2A implementation and automated proof pass, but the required hosted deployment and one real bridge-triggered workflow acceptance remain blocked at the expected human-only Cloudflare login/secret gate.

# Recommendation

Complete only the four human Wrangler login/secret commands above, then return to Codex for deployment and one hosted acceptance dispatch. Do not begin Stage 2B.
