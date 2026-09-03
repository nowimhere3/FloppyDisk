Timestamp: Wednesday, September 2, 2026 at 10:47:30 PM MDT
Location: Calgary, Alberta

# Stage

Phase 2 — Phase 2-3 — Stage 2A Independent Code / Security Review (review only; no implementation)

This report is the architect's independent second key on Codex's Stage 2A work, per Operating Manual §46 ("Builder Reports Are Evidence, Not Proof"). It is not a re-design of Phase 2 and it is not Stage 2B.

---

# Review Scope

**What was inspected directly:**

- `git status`, current branch, and local `HEAD` vs `origin/main`
- The full Stage 2A commit range `03753b3..HEAD`, commit by commit
- `bridge/src/index.js`, `bridge/src/github.js`, `bridge/src/capability.js`
- `bridge/wrangler.toml`, `bridge/package.json`, `bridge/.gitignore`
- `bridge/test/capability.test.js`, `github.test.js`, `index.test.js`, `scope.test.js`
- `.github/workflows/extract-links.yml` (to confirm it is untouched and to confirm what Stage 2A actually dispatched)
- `floppydisk/` breadcrumb convention, for comparison against the new module set
- `README.md`, for the PAT-rotation record Phase 2-1 required

**Documents read in full before inspection:**

- `AI-Assisted Development Operating Manual.md`
- `Claude Reports/Phase 2-1 - Web UI and Safe Trigger Architecture.md`
- `Codex Reports/Phase 2-2 - Stage 2A Safe Trigger Implementation Report.md` (including all seven appended follow-ups)

**Repository state at review time:**

```text
branch:        main
HEAD:          c221de12ea8fa8d4469fe28da1e559101ef1b532
origin/main:   c221de12ea8fa8d4469fe28da1e559101ef1b532   (in sync)
working tree:  clean except one pre-existing untracked file,
               "Claude and Codex Reports/Git Commit - Push Rule.md"
```

That untracked file predates Stage 2A, was correctly preserved and excluded by Codex across all eight commits, and is left untouched by this review (Operating Manual §17).

No secret value was read, printed, compared, rotated, or inspected during this review.

---

# Proven Baseline

The hosted result supplied with this review is treated as established fact, not re-litigated:

```text
client_status        = 200
response_fields      = expiresAt, jobToken
jobToken_present     = True
expiresAt_present    = True
internal run ID      = 33714115213   (recovered from the signed capability)
```

Independently verified for that exact run: repository `nowimhere3/FloppyDisk`, branch `main`, extract job SUCCESS, Python 3.12 SUCCESS, gallery-dl install SUCCESS, frozen FloppyDisk pipeline SUCCESS, artifact upload SUCCESS, `floppydisk-results` artifact present, repository still PRIVATE.

**What that proof does and does not establish.** It establishes that the seam *functions* end to end: an external protected request reaches the Worker, the Worker authenticates to GitHub server-side, dispatches the real workflow on `main`, receives a usable run ID, and returns only an opaque signed capability. It does not by itself establish that the code is safe, minimal, or correctly bounded. That is what the rest of this report examines.

**On the earlier 401s.** The diagnostic noise recorded in the Codex follow-ups is a dev-key synchronization problem between a Windows execution context and the deployed Worker binding, resolved by generating one fresh key in one process and writing that same in-memory value to both sides. I inspected the gate logic on its own merits and found it correct and fail-closed (see **Development Gate**). Those 401s were the gate working, not the gate failing. They are **not** treated as a current product defect.

**On the earlier 502.** Never root-caused, and correctly not assigned a speculative cause by Codex. The final acceptance passed with no bridge, PAT, GitHub API, workflow, or frozen-engine correction between the failure and the success — which is consistent with the same dev-key/credential-state confusion, but is not proven. I record it as an accepted unexplained transient, not a finding. Recommending a code change to fix an undiagnosed one-time failure would violate §19, Evidence Before Infrastructure.

---

# Code Reviewed

The entire Stage 2A runtime is 162 lines across three files, with **zero runtime dependencies**. `wrangler` is a devDependency only; nothing from `node_modules` is bundled into the Worker.

| File | Lines | Responsibility |
|---|---|---|
| `bridge/src/index.js` | 50 | Route, gate, orchestrate, sanitize |
| `bridge/src/github.js` | 55 | The only module that knows GitHub exists |
| `bridge/src/capability.js` | 59 | Mint and verify the signed job capability |

The `github.js` seam deliberately mirrors `discover.py` — "the only production module that knows gallery-dl exists" — which is the boundary Phase 2-1 asked for and the architecture this project already trusts. That mirroring is real, not nominal: I confirmed by enumeration that **exactly one** outbound URL exists in the entire bridge, and it is a hard-coded constant.

```text
bridge/src/github.js:2
  https://api.github.com/repos/nowimhere3/FloppyDisk/actions/workflows/extract-links.yml/dispatches
```

There is no URL construction from request data, no path parameter, no repository or workflow name taken from input, and therefore no arbitrary-GitHub-proxy surface. Stop condition 9 of Phase 2-1 ("the bridge begins proxying arbitrary GitHub API calls") is structurally impossible in this implementation, not merely unexercised.

---

# Credential Boundary

**Verdict: PASS.**

| Requirement | Evidence |
|---|---|
| Token never reaches the client | `index.js:26` returns only the object from `createCapability`, which is `{ jobToken, expiresAt }` (`capability.js:12-15`). `index.test.js:38` asserts the response key set is *exactly* `["expiresAt","jobToken"]`, and `:39` asserts the serialized body does not contain the token. |
| Token never reaches the client on the error path | Every failure returns the identical constant `{"error":"request failed"}` (`index.js:43-48`). There is one error body in the whole bridge and it is a literal. |
| Token never appears in logs | The only two log statements are `index.js:29` and `index.js:35`. Neither receives the token, the env, the request, or the error object. `github.test.js:35` additionally asserts the serialized `GitHubDispatchError` contains no token. |
| Token used only in the server-side request | `github.js:9`, `Authorization: Bearer ${githubToken}` — the sole use in the codebase. `index.test.js:37` asserts the value handed to the dispatch seam is `env.GITHUB_TOKEN`. |
| No credential in the repository | `git grep` for `ghp_`, `github_pat_`, `ghs_`, PEM headers, and any 40+ character token-shaped run across the tracked `bridge/` tree returns nothing. `bridge/.gitignore` excludes `node_modules/`, `.wrangler/`, `.dev.vars`, `.env*`. `wrangler.toml` contains a comment naming the three secrets and no values. |

**Advisory (not a defect):** `index.js:24` reads `env.GITHUB_TOKEN` and passes it into `dispatch()`. Phase 2-1 asked that "all credential handling [be] isolated behind a single `getToken()` function in the bridge so that swapping to a GitHub App is a contained, one-function change." As written, the router knows a GitHub credential exists and knows its binding name. This is a purity gap, not a security gap — the token still never leaves the server and never enters a response or a log. Recorded as Finding 4.

---

# Development Gate

**Verdict: PASS. The gate fails closed, and it fails closed in the correct order.**

```js
// index.js:14-21
if (!env?.FLOPPYDISK_DEV_KEY ||
    request.headers.get("X-FloppyDisk-Dev-Key") !== env.FLOPPYDISK_DEV_KEY) {
  return jsonError(401);
}

if (!env.GITHUB_TOKEN || !env.FLOPPYDISK_CAPABILITY_SECRET) {
  return jsonError(500);
}
```

Four properties worth stating explicitly, because each is load-bearing:

1. **No anonymous fallback exists.** There is no unauthenticated branch, no bypass flag, no `if (env.DEV)` escape, and no default key. I searched for one; there is none.
2. **A missing binding denies rather than admits.** `!env?.FLOPPYDISK_DEV_KEY` short-circuits to 401. A misconfigured or freshly created Worker with no secrets set rejects every request. This is the correct direction of failure and is the single most important line in the gate.
3. **The gate precedes everything.** The body is never read — in fact Stage 2A never reads the request body at all. No GitHub call, no capability minting, and no configuration probing happens before authentication. `index.test.js:23-29` proves the dispatch seam is not entered on a wrong key.
4. **The 401 is indistinguishable across causes.** A missing header, a wrong key, and an unconfigured binding all return the same status and the same body. An unauthenticated caller cannot use the response to learn the Worker's configuration state. The 500 configuration branch is only reachable *after* authentication — correct ordering.

**Advisory:** the comparison at `index.js:15` uses JavaScript `!==`, which is not constant-time. A constant-time comparator (`equalBytes`) already exists in `capability.js:41`. Practical remote exploitation across the public internet against a Worker is impractical — network jitter dominates the signal by orders of magnitude — and this gate is explicitly temporary. It is recorded as Finding 3 rather than a defect, and the correction is three lines if the gate ever outlives Stage 2D.

---

# Capability Security

**Verdict: PASS. This is the strongest part of the implementation.**

| Phase 2-1 requirement | Implementation | Evidence |
|---|---|---|
| HMAC-SHA256 or equivalent | `crypto.subtle` HMAC / SHA-256, Web Crypto, no library | `capability.js:34-39` |
| Versioned | `v: 1` in the signed payload, checked on verify | `capability.js:1, 9, 26` |
| One run identity | Payload carries exactly one `runId` string | `capability.js:9` |
| Expiry enforced | `payload.exp <= now` rejects; 15-minute default TTL | `capability.js:2, 25-27` |
| Tampering rejected | Signature recomputed and compared before the payload is parsed | `capability.js:22-24` |
| Raw run ID is not the browser contract | Client receives `jobToken` only; `index.test.js:40` asserts `"runId" in body === false` | `capability.js:12-15` |
| No unnecessary data inside | Payload is exactly `{v, runId, exp}` — nothing else | `capability.js:9` |

Four details that show real care and deserve to be named:

- **Signature is verified before the payload is parsed** (`:23` precedes `:24`). Untrusted JSON never reaches `JSON.parse` unless it is already authenticated. This is the correct ordering and the one most commonly got wrong.
- **The comparison is constant-time.** `equalBytes` (`:41-46`) accumulates XOR differences across the full length rather than short-circuiting. It returns early only on a length mismatch, which leaks nothing secret.
- **The signature is decoded before comparison** (`:23`), so base64url encoding variants of a correct signature cannot be used to bypass the byte comparison, and a malformed signature throws inside `fromBase64Url` (`:55`) and is caught into a `null` return (`:29`).
- **Token shape is strictly bounded.** Exactly two dot-separated segments are accepted (`:21`, `extra !== undefined`), and `runId` must match `/^[1-9][0-9]*$/` (`:26`) even after the signature verifies — defense in depth against a capability minted from a malformed identifier.

`verifyCapability` is currently exercised only by tests; no production route consumes it yet because `/status` and `/result` are Stage 2C. That is correct scope discipline, not dead code left by accident — the verifier is the half of the contract Stage 2C will need, and freezing it now with tests is the right sequencing.

**One forward defect worth catching before it bites, recorded as Finding 2:** the capability TTL is 15 minutes (`capability.js:2`), and Phase 2-1 specifies dropping the workflow to `timeout-minutes: 15`. Those two numbers are equal, which means a run that approaches its own timeout produces a job token that expires at or before the moment results become fetchable. This is invisible in Stage 2A because nothing redeems the token yet. It becomes a real, user-visible bug the moment Stage 2C exists.

---

# GitHub Dispatch Boundary

**Verdict: PASS.**

```js
// github.js:5-15
fetchImpl(DISPATCH_URL, {
  method: "POST",
  headers: { Accept, Authorization, Content-Type, User-Agent, X-GitHub-Api-Version },
  body: JSON.stringify({ ref: "main", return_run_details: true }),
})
```

| Requirement | Result |
|---|---|
| Correct repository | `nowimhere3/FloppyDisk`, hard-coded constant, `github.js:2` |
| Correct workflow | `extract-links.yml`, same constant |
| Ref `main` | `github.js:14`; asserted by `github.test.js:13` |
| `return_run_details: true` | `github.js:14`; asserted by `github.test.js:13` (exact body `deepEqual`) |
| Usable run ID required | `isUsableRunId` (`github.js:32-35`) requires a positive safe integer or a positive decimal string; anything else throws |
| Failure closes safely | Both the `!response.ok` path (`:17`) and the missing-run-ID path (`:26`) throw `GitHubDispatchError`, caught at `index.js:28`, returning a bare 502 |
| No invented correlation | There is no `run-name` nonce, no runs-list polling, no timestamp heuristic, no retry loop, and no fallback identifier anywhere in the bridge |

The last row is the one Phase 2-1 cared about most, and Codex honored it exactly. Phase 2-1 Known Unknown 1 asked Stage 2A to empirically confirm that `return_run_details` yields a **run** id usable at `GET /actions/runs/{id}`. The hosted proof resolves it: the value recovered from the capability, `33714115213`, is the run that was independently verified as a real successful workflow run. **Known Unknown 1 is closed, empirically, in the affirmative.** The designed `run-name` fallback is not needed and correctly was not built.

The dispatch sends **no inputs**, which matches the current unmodified workflow (`on: workflow_dispatch:` with no `inputs:` block, `.github/workflows/extract-links.yml:4-5`). Stage 2A dispatched the real Phase 0 machine as-is and did not quietly begin the Stage 2B transport. That is exactly the stage boundary Phase 2-1 drew.

---

# Error / Logging Safety

**Verdict: PASS, and the diagnostic logging should be RETAINED as-is.**

**What the client can ever receive.** Four statuses (404, 401, 500, 502) and one constant body, `{"error":"request failed"}`. There is exactly one error-body literal in the codebase (`index.js:44`), so there is no path by which a message, stack, URL, upstream body, run ID, or header can reach the client. The status code alone distinguishes cases, which is a small and acceptable disclosure.

**What the Worker logs.** Two statements, both structured, both hand-built:

```js
console.error("github_dispatch_failed", { upstreamStatus, requestId, category });
console.error("bridge_operation_failed", { category: error?.name ?? "unknown" });
```

Checked against the prompt's hardening question, item by item:

| Could it leak? | Answer |
|---|---|
| Secrets | No. Neither `env` nor any secret is in scope at either call site; only three scalars are passed. |
| Request bodies | No. The body is never read in Stage 2A. |
| Auth headers | No. Headers are never logged, and the error object itself is never logged — only three named fields plucked from it. |
| Target URLs | No. No target URLs exist yet, and `sanitizedGitHubMessage` strips URLs (`github.js:51`) before truncating to 160 characters. Strip-then-truncate is the correct order. |
| Raw GitHub responses | No. The upstream body is never logged; only `status`, `x-github-request-id`, and the sanitized 160-character message survive. |
| Stack traces | No. The second branch logs `error.name` only, never `error.stack` or `error.message`. |

**The strongest evidence here is a test, not an argument.** `index.test.js:56-60` asserts `deepEqual` on the *entire* captured log call — the exact event name and the exact three-key object. Any future edit that adds a field to that log breaks a test. The safe log shape is frozen, not merely currently correct. That is precisely the durable memory Operating Manual §60 asks for.

**Recommendation: retain.** The prompt asks whether the temporary diagnostics should be reduced before Stage 2B. They should not. They are provably non-sensitive, shape-frozen by a test, and they are the only observability the bridge has — removing them would recreate exactly the blind spot that made the original 502 undiagnosable and cost this stage five extra hosted requests. Reducing them now would be trading proven value for an unproven concern.

**One forward guard for Stage 2B, recorded as Finding 8.** `sanitizedGitHubMessage` strips URLs and caps length, but it does not otherwise constrain content GitHub chose to echo. Today the request body is `{ref, return_run_details}` and contains nothing sensitive. Stage 2B will add `targets_b64`, at which point a GitHub validation error that echoes input could in principle place payload-derived text into `category`. The 160-character cap bounds this heavily and the destination is a Cloudflare log rather than the client, so the residual risk is small — but Stage 2B should confirm it explicitly rather than inherit the assumption.

---

# Test Evidence

Both suites were re-run by me from a clean tree. Counts confirmed against the Codex report (Operating Manual §46).

**Bridge — 11 passed, 0 failed** (`npm test`, `node --test`):

```text
✔ valid capability verifies and identifies exactly one run
✔ modified capability fails
✔ expired capability fails
✔ dispatch targets the fixed workflow and keeps the PAT in the server request
✔ dispatch refuses a successful response without a usable workflow run id
✔ dispatch failure retains only sanitized upstream diagnostics
✔ POST /run rejects a missing development key
✔ POST /run rejects a wrong development key without dispatching
✔ correct key dispatches server-side and returns only the capability contract
✔ raw GitHub failures and stack traces are not returned
✔ Stage 2A does not modify frozen Python or workflow files
ℹ tests 11   ℹ pass 11   ℹ fail 0
```

**Python regression — 96 passed in 0.53s**, matching the Codex baseline exactly.

> **Environment note, recorded so it is not later mistaken for a regression.** My first `python -m pytest -q` produced `72 passed, 24 errors`. Every error was `PermissionError: [WinError 5] Access is denied: 'C:\Users\dmcal\AppData\Local\Temp\pytest-of-dmcal'` raised in `_pytest/tmpdir.py` during fixture *setup* — this review session's sandbox denies writes to that temp path. Re-running with `--basetemp` pointed at a writable directory produced **96 passed**. This is a reviewer-environment artifact with no relationship to Stage 2A. Per §16, it is a pre-existing environmental condition, not a new regression.

**Do the 11 tests actually cover the critical security behavior?** Mostly yes, and the coverage is well-aimed rather than padded. The tests that matter most are the ones asserting *negatives*: the exact response key set, the absence of `runId`, the absence of the token in the body, the absence of `github.com` in the body, the exact log shape, and non-entry into dispatch on a bad key. Those are the assertions that would actually catch a future regression, and they exist.

**Three gaps, recorded as Finding 7.** None is currently exploitable; each is a claimed property that no test defends:

1. **Fail-closed on a missing `FLOPPYDISK_DEV_KEY` binding is untested.** Both 401 tests pass a fully populated `ENV`. The `!env?.FLOPPYDISK_DEV_KEY` short-circuit — the single most important line in the gate — has no test. Deleting it would break no test today.
2. **The 500 configuration branch is untested.** No test drives a missing `GITHUB_TOKEN` or `FLOPPYDISK_CAPABILITY_SECRET`.
3. **Routing is untested.** No test asserts that `GET /run`, `POST /`, or any other path returns 404 without touching the gate.

All three are single-assertion additions against the existing `createWorker` harness.

---

# Frozen Boundary Verification

**Verdict: PASS. Verified independently of the builder's own scope test.**

I enumerated every file touched across the whole Stage 2A range rather than trusting `scope.test.js`:

```text
$ git diff --name-status 03753b3 HEAD
A  Claude and Codex Reports/Codex Reports/Phase 2-2 - Stage 2A Safe Trigger Implementation Report.md
A  bridge/.gitignore          A  bridge/package-lock.json    A  bridge/package.json
A  bridge/src/capability.js   A  bridge/src/github.js        A  bridge/src/index.js
A  bridge/test/capability.test.js   A  bridge/test/github.test.js
A  bridge/test/index.test.js        A  bridge/test/scope.test.js
A  bridge/wrangler.toml
```

Twelve files, all additions, all under `bridge/` except one report. Confirmed per-commit across all eight commits — the two code commits (`6c7f945`, `14d46c5`) touch only `bridge/`, and the remaining six touch only the report.

| Protected item | Status |
|---|---|
| `floppydisk/__init__.py`, `__main__.py`, `cli.py`, `discover.py`, `filters.py` | Untouched |
| `tests/test_cli.py`, `test_discover.py`, `test_filters.py`, `test_targets.py`, `tests/fixtures/` | Untouched |
| `.github/workflows/extract-links.yml` | Untouched — last modified by `a5dc7bc` (Phase 0d) |
| Repository visibility | No visibility-changing call exists anywhere in the bridge; remains PRIVATE |
| Database / KV / Durable Object / queue | None. `wrangler.toml` declares no bindings; `wrangler --dry-run` reported "No bindings found." |
| Accounts / login / frontend / Pages | None created |
| Runtime dependencies | Zero. `wrangler` is a devDependency; nothing is bundled |

Phase 2-1's thirteen stop conditions were checked individually. **None was hit.** Conditions 1, 2, 3, and 11 — the four architectural alarms — are all clean, and conditions 4 (persistence) and 9 (arbitrary GitHub proxying) are structurally precluded by the implementation rather than merely avoided.

**Deviation from Phase 2-1, correctly applied and worth recording:** Phase 2-1 recommended a **public** repository (free Actions minutes) with `retention-days: 1` plus post-download artifact deletion, and explicitly referred the trade-off to the human as a product decision. The human chose **private**. That decision removes the report's largest stated privacy exposure — public artifact and log readability — at the cost of Actions minutes. Codex correctly did not change visibility on its own initiative. Phase 2-1's privacy section should be read as partly superseded: the artifact exposure it flagged as "the most important privacy finding in this report" is materially reduced by the private-repository choice. Stage 2C's `retention-days` and post-download deletion remain worth doing as defense in depth, but they are no longer mitigating a public exposure.

---

# Findings

None of the following blocks Stage 2A. They are ordered by when they need to be dealt with.

### Finding 1 — `scope.test.js` asserts less than it claims, and will misfire during Stage 2B
**Severity: Medium (forward-blocking). Address as the first action of Stage 2B, before the workflow edit.**

`bridge/test/scope.test.js:6` runs:

```js
git diff --name-only HEAD -- floppydisk .github/workflows
```

`git diff HEAD` compares the **working tree** to HEAD. Now that Stage 2A is committed, this test asserts only "there are currently no uncommitted changes under those paths." It cannot fail because a Stage 2A *commit* touched a frozen file — which is what the Codex report's test claim 12 ("the Stage 2A diff does not modify `floppydisk/` or `.github/workflows/`") states. That property is true — I verified it above with `git diff-tree` — but this test is not what proves it. It also ignores untracked files, so a newly added file under `floppydisk/` would pass unnoticed.

The forward hazard is the more urgent half. **Stage 2B is explicitly authorized to modify `.github/workflows/extract-links.yml`** (add `targets_b64`, add the env-indirect decode step). During that work this test will fail on every uncommitted edit and pass again once committed, reporting a scope violation for work that is squarely in scope. That is a test that trains its reader to ignore it.

**Smallest correction:** compare against the Phase 2-1 baseline commit rather than the working tree, and narrow the path set to what is genuinely frozen — `floppydisk/` and the four frozen test files. The workflow YAML is orchestration and Phase 2-1 states plainly it is *not* frozen; it does not belong in this assertion at all. Roughly:

```js
git diff --name-only 03753b3 HEAD -- floppydisk tests/test_cli.py tests/test_discover.py \
                                     tests/test_filters.py tests/test_targets.py tests/fixtures
```

Stage 2B's own workflow-safety assertions (no direct `${{ inputs.* }}` inside any `run:`, `env:` indirection present, invocation line byte-identical) are the correct guard for the YAML, and Phase 2-1 already specifies them for `tests/test_workflow.py`.

### Finding 2 — Capability TTL equals the planned workflow timeout
**Severity: Medium (forward). Resolve during Stage 2C.**

`capability.js:2` sets a 15-minute TTL. Phase 2-1 specifies `timeout-minutes: 15`. A run that uses most of its budget yields a token that expires at or before the moment `/result` becomes useful, and the user sees an unexplained failure at the exact moment their job succeeded. Invisible today because nothing redeems the token.

**Smallest correction:** make the capability TTL exceed the workflow timeout by a retrieval margin — a 30-minute TTL against a 15-minute workflow timeout is ample — and add a test asserting `TTL > workflow timeout`. Better still, freeze the relationship in a comment beside the constant so the two numbers are never drifted apart independently.

### Finding 3 — Development-gate comparison is not constant-time
**Severity: Low (advisory).**

`index.js:15` uses `!==` on the header value. A constant-time comparator, `equalBytes`, already exists at `capability.js:41` and is used correctly for the capability signature. Practical remote exploitation is impractical, and the gate is temporary by design.

**Smallest correction, if the gate outlives Stage 2D:** compare `TextEncoder`-encoded bytes via `equalBytes`. Three lines, no new dependency.

### Finding 4 — The router touches the GitHub credential
**Severity: Low (advisory).**

`index.js:24` reads `env.GITHUB_TOKEN` and passes it into `dispatch()`. Phase 2-1 asked for a single `getToken()` owner so that a future GitHub App swap is a one-function change. No security property is affected — the token never leaves the server.

**Smallest correction:** have `dispatchWorkflow` accept `env` and read `env.GITHUB_TOKEN` itself, keeping the injectable `fetchImpl` seam for tests. `github.js` then owns the credential's binding name along with every other GitHub detail, which is what "one owner per responsibility" (§41) asks for.

### Finding 5 — `bridge/` has no breadcrumbs
**Severity: Low, but it is a direct deviation from the Operating Manual.**

Operating Manual §27–32 require WAS / IS / WILL BE breadcrumbs beside code carrying important architectural decisions, and `floppydisk/cli.py`, `discover.py`, and `filters.py` all follow that convention rigorously. The entire `bridge/` module set has **zero** breadcrumbs — the only comment in the runtime is the secrets note in `wrangler.toml`.

Three decisions in this stage are exactly what §32 says breadcrumbs are for, and none of them is recoverable from the code alone:

- `github.js` is the sole owner of GitHub knowledge, deliberately mirroring `discover.py`'s gallery-dl ownership. Without a breadcrumb, a future agent will "helpfully" add a second GitHub call from `index.js`.
- The browser contract is an opaque signed capability rather than the raw run ID, because on a repository whose run IDs are enumerable a naked run ID would be an authorization contract anyone could guess.
- The dev gate is temporary and fails closed on a missing binding **on purpose**; that short-circuit looks like defensive noise and would be an attractive "simplification."

Stage 2A's architecture is now stable and hosted-proven, which per §33 is precisely the moment reasoning should graduate from a report into the code.

**Smallest correction:** three short breadcrumb blocks, one per source file. This is documentation-only and touches no logic.

### Finding 6 — The PAT expiry date is recorded nowhere
**Severity: Low, but it has a defined future cost.**

Phase 2-1 Known Unknown 5 warned that an unrecorded fine-grained PAT expiry "becomes an unexplained outage months from now," and asked for it in the README. `README.md` contains no reference to the bridge, Cloudflare, the Worker URL, or any token expiry. Stage 2A is the stage that created the PAT, so the obligation is now due.

**Smallest correction:** one README line — what the bridge is, where it is deployed, and the PAT's expiry date. The date itself is a human input; no secret value is involved in recording it.

### Finding 7 — Three claimed security properties have no test
**Severity: Low.**

As detailed in **Test Evidence**: fail-closed on a missing `FLOPPYDISK_DEV_KEY` binding, the 500 branch for missing `GITHUB_TOKEN` / `FLOPPYDISK_CAPABILITY_SECRET`, and 404 routing. Each is one assertion against the existing `createWorker` harness. The first is the one that matters — it defends the gate's most important line.

### Finding 8 — Confirm the sanitizer's bound once Stage 2B sends a payload
**Severity: Low (forward). Verify during Stage 2B.**

`sanitizedGitHubMessage` (`github.js:47-54`) strips URLs and caps at 160 characters but does not otherwise constrain echoed content. Today the request body carries nothing sensitive. Once `targets_b64` is sent, Stage 2B should confirm no upstream error path can place payload-derived text into `category`. Residual risk is small — bounded length, log-only destination — but it should be checked rather than assumed.

---

# GO / FIX / STOP

## **GO**

**Stage 2A is architecturally and security-wise acceptable, and Stage 2A is frozen.**

The stage's contract was to answer one question: *can an anonymous browser start a real FloppyDisk run through a credential-free path, and can the bridge learn the run id?* It answers yes, empirically, with the hosted run independently verified, and it answers it without spending a single line on anything else.

The security properties this review set out to establish all hold, and they hold structurally rather than incidentally:

- The GitHub credential exists in exactly one expression in the codebase and cannot reach the client on any path, success or failure, because there is exactly one error body and it is a literal.
- Exactly one outbound URL exists, and it is a hard-coded constant — arbitrary GitHub proxying is impossible, not merely absent.
- Every gate fails closed, in the correct order, with no anonymous fallback and no configuration disclosure to unauthenticated callers.
- The capability is a properly constructed signed token: HMAC-SHA256, versioned, one run identity, expiry enforced, constant-time comparison, signature verified before the payload is parsed, and a minimal payload of exactly three fields.
- Client-visible errors carry no information at all, and the safe log shape is frozen by a `deepEqual` test rather than by good intentions.
- Scope is clean under independent inspection: twelve added files, all under `bridge/` except one report, no frozen file touched, no workflow change, no persistence, no accounts, no frontend, repository still private, and none of Phase 2-1's thirteen stop conditions hit.
- Both suites re-run and match the reported counts: bridge 11/11, Python 96/96.

Two things also deserve to be said plainly, because a review that only lists faults is not an honest one. First, Codex handled the diagnostic sequence correctly under pressure: it refused to invent a correlation fallback, refused to rotate secrets on suspicion, refused to apply a speculative fix to an undiagnosed 502, and stopped and reported at each boundary instead of improvising. That is exactly the behavior §72 asks for, and it is the reason this stage is reviewable at all. Second, the one substantive amendment Codex made to the approved design — replacing the raw run ID in the browser contract with an opaque signed capability — is a genuine improvement over Phase 2-1 and was declared rather than smuggled in.

The eight findings are quality and forward-hazard items. None is a defect in Stage 2A's proven behavior, and none of them would be made cheaper by holding the stage open. Findings 1 and 2 are the two that must not be forgotten, and both are naturally addressed inside the stages that will trip over them.

**This is not FIX**, because no defect exists in what Stage 2A delivered. **This is not STOP**, because no evidence undermines a Phase 2-1 architectural assumption — the one assumption most at risk, `return_run_details` returning a usable run ID, was empirically confirmed, closing Known Unknown 1 and retiring the `run-name` fallback entirely.

---

# Stage 2B Readiness

**Codex may begin the already-approved Stage 2B plan under the Phase 2-1 architecture.**

```text
user target text
  → bridge
  → base64 workflow_dispatch input
  → safely materialized targets.txt
  → unchanged frozen FloppyDisk CLI
```

The seam Stage 2B builds on is proven and stable. The credential boundary, the gate, the dispatch owner, and the capability are all in the right shape to receive a payload without restructuring: Stage 2B adds a body to a request that currently has none, and an input to a dispatch body that currently carries two fields. Nothing in Stage 2A has to be undone.

**Three carry-in items, in priority order:**

1. **Fix `scope.test.js` first, before the workflow edit** (Finding 1). Left as-is it will report a scope violation for authorized work, which is worse than having no test. This is the one item that genuinely needs to happen at the start of Stage 2B rather than during it.
2. **Verify Finding 8** — that no upstream error path can echo `targets_b64`-derived content into the sanitized log category — while the input transport is fresh.
3. **Retain the diagnostic logging unchanged.** It is provably non-sensitive, its shape is test-frozen, and it is the bridge's only observability. Stage 2B involves a new failure surface — base64 decode, workflow input validation, script-injection safety — and removing the one instrument that can explain an upstream failure would recreate the blind spot that made the original 502 undiagnosable.

**Not blocking, best done whenever convenient:** Findings 3 through 7 — the constant-time gate comparison, the `getToken()` isolation, the three `bridge/` breadcrumbs, the README PAT-expiry line, and the three missing fail-closed tests. Finding 5 in particular is cheap now and gets more expensive the further the reasoning drifts from the code that embodies it.

**Unchanged from Phase 2-1 and still binding on Stage 2B:** the decoded input must reach the shell through `env:` indirection and never through `${{ inputs.* }}` interpolation inside a `run:` step; the frozen invocation line must remain byte-identical; and the LAUNCH GATE stands — the site URL is not shared publicly until Stage 2D's guardrails are complete.

**Do not begin Stage 2C, 2D, or 2E on the strength of this review.** Stage 2B only.

---

**No implementation was performed. This review changed no code, no test, no workflow, and no configuration. This report is the only change in this commit. Nothing was pushed.**
