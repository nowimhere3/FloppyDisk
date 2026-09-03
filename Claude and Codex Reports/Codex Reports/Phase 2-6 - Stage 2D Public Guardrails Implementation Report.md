Timestamp: Wednesday, September 2, 2026 at 11:49:06 PM MDT
Location: Calgary, Alberta

# Stage

Phase 2-6 — Stage 2D Public Guardrails implementation only.

# Starting State

- Branch: `main`.
- Starting HEAD and `origin/main`: `f8d66a6ef95ab30aaaed2ed48662ac71394c73e2`.
- Stage 2C was accepted as PASS and frozen.
- Human Phase 1 report-folder moves and `Claude and Codex Reports/Git Commit - Push Rule.md` remained uncommitted, untouched, and excluded from Stage 2D commits.

# Stage 2C Hosted Acceptance

The supplied Stage 2C acceptance was recorded first in documentation-only commit `6ea7c7ea11f51318f2a2071826c1bf9c17ae8ab9`. GitHub Actions run `33719374135` at head `f8d66a6ef95ab30aaaed2ed48662ac71394c73e2` succeeded. Capability-authorized retrieval returned pure `links.txt` as `text/plain; charset=utf-8`, and the independently checked run had zero artifacts remaining after retrieval.

# Files Changed

Implementation commit `d2e7bf7a03ec511f79c5d5de5febef60ad73a9a8` changes only:

- `bridge/src/github.js`
- `bridge/src/index.js`
- `bridge/src/validate.js`
- `bridge/test/config.test.js`
- `bridge/test/github.test.js`
- `bridge/test/guardrails.test.js`
- `bridge/test/index.test.js`
- `bridge/test/status-result.test.js`
- `bridge/test/validate.test.js`
- `bridge/wrangler.toml`

# Dev Gate Retirement

The anonymous product routes no longer inspect or require `X-FloppyDisk-Dev-Key`. No hidden bypass or privileged route remains. A supplied legacy development header receives exactly the same validation, rate, and concurrency checks as every other request.

`FLOPPYDISK_DEV_KEY` is no longer a production binding. Its deployed secret may be removed by the Human only after hosted acceptance:

```powershell
.\node_modules\.bin\wrangler.cmd secret delete FLOPPYDISK_DEV_KEY
```

# Request Size Guard

`POST /run` reads the incoming body bytes once and rejects more than 32 KiB before content-type validation, UTF-8 decoding, JSON parsing, target parsing, rate admission, GitHub concurrency queries, or dispatch. Declared `Content-Length` is used as an early rejection but actual byte length is always enforced. Responses never echo submitted content.

# Target Validation

The public admission parser mirrors the frozen newline-oriented contract without modifying it: trimmed blank lines and `#` comments do not count; actual target lines must be valid HTTP/HTTPS URLs; 50 are allowed and 51 are rejected.

It deterministically rejects malformed URLs, non-HTTP(S) schemes, `localhost` and subdomains, IPv4 and IPv6 literals, loopback, private IPv4 ranges, link-local IPv4, `.local` names, and bare public IPs. No DNS-resolution or speculative infrastructure was introduced.

# Rate Limit

`wrangler.toml` declares Cloudflare Workers Rate Limiting binding `SUBMISSION_RATE_LIMITER` with limit 2 and period 60 seconds. It applies only after a request is valid and only to `POST /run`. The key is Cloudflare's canonical `CF-Connecting-IP`; caller-controlled `X-Forwarded-For` is ignored. A limited request returns HTTP 429 with friendly copy and never queries concurrency or dispatches.

The binding is Cloudflare's approved eventually consistent, location-scoped rate limiter; no KV, Durable Object, database, or custom counter exists.

# Global In-Flight Cap

Before dispatch, the fixed GitHub boundary queries only `extract-links.yml` workflow-dispatch runs with status `queued` and `in_progress`. Counts 0–2 permit dispatch; a combined count of 3 or more returns a friendly busy response without dispatch. GitHub remains authoritative and no concurrency state is stored locally.

# CORS

The configured frontend origin is exactly `https://nowimhere3.github.io`; wildcard CORS and credentials are absent. Actual responses receive CORS only for that exact origin. Minimal preflight permits `GET`, `POST`, `Authorization`, and `Content-Type`, with a 10-minute preflight cache. Other origins receive no permissive CORS headers.

CORS is treated only as an embedding control, not an authentication boundary.

# Polling Protection

`GET /status` remains capability-authorized and uses the Cloudflare Cache API for five-second run-state caching keyed solely by the verified internal run ID. Client responses also specify `private, max-age=5`. Repeated polling inside the floor reuses state instead of calling GitHub. `/result` deliberately checks live state so cached incompletion cannot hide a completed result.

# Friendly Error Contract

Public rejection copy now distinguishes oversized files, malformed requests, too many URLs, invalid/unsafe targets, rate exhaustion, global busy state, not-ready jobs, and failed jobs. Copy is short and contains no request payload, run ID, artifact ID, repository detail, GitHub body, stack trace, or secret.

# Security / Logging

- `jobToken` remains mandatory for `/status` and `/result`.
- Client raw run IDs cannot authorize or select jobs.
- GitHub PAT and capability secret remain server-side only.
- No body, target, encoded input, link result, token, authorization header, decoded capability, raw run ID, artifact bytes, or raw GitHub body is logged.
- Logs remain limited to numeric upstream status, GitHub request ID, fixed sanitized category, or generic exception class.
- Admission/security ownership is documented beside `validate.js` with concise WAS / IS / WILL BE breadcrumbs.

# Tests

Final automated results:

- Bridge: **55 passed, 0 failed**.
- Python/workflow: **99 passed in 0.50s**.
- npm audit: **0 vulnerabilities**.
- Wrangler dry-run: **PASS**, 28.16 KiB upload / 8.72 KiB gzip.
- Wrangler confirmed `SUBMISSION_RATE_LIMITER (2 requests/60s)` and exact `FRONTEND_ORIGIN` bindings.
- Diff whitespace check: **PASS**.
- Credential/private-key signature scan: **PASS**.

Tests cover all specified size, count, parsing, URL-safety, rate, concurrency, CORS, preflight, capability, raw-run-ID, dev-gate retirement, polling cache, Stage 2B transport, Stage 2C retrieval/deletion, and frozen-boundary behaviors.

# Frozen Boundary

No file under `floppydisk/`, frozen Python test, or fixture changed from the Phase 2 baseline. The workflow YAML and frozen CLI invocation were unchanged in Stage 2D; timeout remains 15 minutes and retention remains one day.

No account, login, CAPTCHA, Turnstile, per-user quota, ban list, analytics platform, KV, Durable Object, database, queue, public frontend, or Stage 2E work was added.

# Implementation Commit

```text
d2e7bf7a03ec511f79c5d5de5febef60ad73a9a8
feat: add Stage 2D public guardrails
```

# Hosted Acceptance Status

**Not run.** Nothing was pushed or deployed and no public hosted test was performed. Hosted acceptance requires this commit on GitHub `main` and the matching Worker deployment. The old development-key secret must remain until the Human approves cleanup after acceptance.

# READY FOR HUMAN PUSH / DEPLOY

**YES.** Minimum Human commands, not executed by Codex:

```powershell
cd C:\Users\dmcal\Documents\GitHub\FloppyDisk
git push origin main
cd bridge
.\node_modules\.bin\wrangler.cmd deploy
```

After push/deploy, perform the separately approved hosted guardrail acceptance. Do not begin Stage 2E.
