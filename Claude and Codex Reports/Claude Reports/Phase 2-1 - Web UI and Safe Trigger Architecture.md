Timestamp: Wednesday, September 2, 2026 at 5:19:33 PM MDT
Location: Calgary, Alberta

# Phase

Phase 2 — Phase 2-1 — User-Facing Web UI and Safe Trigger Architecture (architecture only; no implementation)

---

# Goal

Design the smallest architecture that lets an anonymous, non-technical person open a web page, hand FloppyDisk a `.txt` file of target URLs, wait, and download `links.txt` — **without any privileged credential ever being delivered to the browser**, and **without modifying the frozen Phase 0 extraction contracts**.

This report answers one central question and several supporting ones:

- Can GitHub Pages alone do this safely? (**No.**)
- What is the smallest safe bridge? (**One stateless serverless function.**)
- How does the `.txt` reach the runner? (**Base64 `workflow_dispatch` input.**)
- How does `links.txt` reach the user? (**Bridge fetches and unzips the Actions artifact and returns plain text.**)
- What is the minimum abuse boundary before public launch?
- What is unavoidably exposed?

---

# Current Proven Baseline

Phase 0 is complete and its hosted acceptance run passed (Phase 1-18, run `33690188488`, conclusion `success`).

Proven, frozen, and treated as authoritative in this report:

```text
targets.txt (committed)
  → workflow_dispatch (manual, by a repo collaborator)
  → ubuntu-latest / Python 3.12 / gallery-dl==1.32.10
  → python -m floppydisk --targets targets.txt --out links.txt --diagnostics diagnostics.txt
  → actions/upload-artifact@v4 (name: floppydisk-results)
  → human downloads a .zip from the Actions UI
```

Verified properties of the frozen boundary (read directly from `floppydisk/cli.py`, `floppydisk/discover.py`, `.github/workflows/extract-links.yml`):

| Property | Current state |
|---|---|
| CLI contract | `--targets <path> --out <path> --diagnostics <path>`, three distinct paths |
| Input shape | An ordinary UTF-8 text file; blank lines and `#` comments ignored; accepted lines must be `http`/`https` |
| `links.txt` | Qualifying unique image URLs only, one per line, LF, trailing newline, nothing else |
| `diagnostics.txt` | Counts block, then per-target `line N: status=... links=... excluded=...`, plus captured `stderr` |
| Privacy | Target URLs are never printed to stdout or the step summary; `stderr` is captured, never printed |
| Failure containment | Target-level failure stays exit `0`; exit `1` is reserved for pipeline-fatal local failures |
| Media | Discovery only (`gallery-dl -j`); nothing is downloaded |
| Trigger | `workflow_dispatch` only; `permissions: contents: read` |

**Phase 2 consumes this machine. It does not absorb, duplicate, or re-implement any part of it.**

The single meaningful mismatch between Phase 0 and a web product is that the pipeline reads a *committed* file. Phase 2 replaces only the transport that produces that file on the runner. The frozen parser still receives an ordinary text file at its boundary.

---

# User Experience North Star

> **The machine thinks harder so the human thinks less.**

The target user does not know, and must never need to know, what GitHub, a repository, a branch, Actions, a workflow, a commit, an artifact, `gallery-dl`, Python, or diagnostics are.

The whole product is five beats:

```text
1. Open FloppyDisk
2. Drop or choose a .txt file
3. Press one obvious button
4. Wait
5. Download links.txt
```

Everything in the architecture below exists to protect those five beats. Any design that leaks a sixth beat into the user's head ("now go to GitHub and find your run") has failed, regardless of how elegant it is internally.

---

# Hard Security Constraint

> **No privileged GitHub credential may ever be shipped to the browser.**

This includes a PAT, a fine-grained PAT, a classic token, a GitHub App private key, an installation token, an Actions token, a repository secret, or anything else that can start a workflow or read a repository.

This is not negotiable and not mitigable by obfuscation, minification, splitting the token across files, fetching it at runtime from the same static host, or "only power users would look." A static asset served to the browser is public by definition.

**Verified platform facts that make this constraint binding:**

| Fact | Source |
|---|---|
| `POST /repos/{owner}/{repo}/actions/workflows/{id}/dispatches` **requires authentication**; it does not work anonymously | GitHub REST docs, Actions → Workflows |
| Dispatch requires the fine-grained **Actions: write** repository permission | GitHub REST docs, fine-grained PAT permissions |
| Artifact download requires **Actions: read** — a token is required **even for a public repository** | GitHub REST docs, Actions → Artifacts |
| GitHub Pages "does not support server-side languages such as PHP, Ruby, or Python" and "publishes any static files" | GitHub Pages docs |

Therefore: **a purely static site cannot start a FloppyDisk run.** Something with a server-side identity must exist. The only remaining architectural question is how small that something can be.

---

# GitHub Pages Assessment

## Verdict: **YES — WITH A SMALL SERVER-SIDE BRIDGE**

GitHub Pages remains the frontend host. It cannot be the whole product.

**Why Pages stays:**

- The MVP frontend is one HTML page, one stylesheet, one small script. Pages serves that for free, with TLS, from the repository the human already owns.
- Deployment is "push to `main`." No build pipeline, no second dashboard, no new account for the part of the system that changes most often (copy, layout, wording).
- It keeps the product's public face in the same repository as its architectural memory.

**Why Pages is not sufficient:**

- It cannot hold a secret.
- It cannot call the dispatch endpoint, because that endpoint refuses anonymous requests.
- It cannot download an artifact, because that endpoint requires a token even on a public repository.

**Why not migrate the frontend elsewhere (e.g. serve the static page from the bridge itself):**

Serving the page from the same origin as the bridge would remove CORS configuration and collapse two deploys into one. That is a real, modest advantage. It is not enough to justify moving today, because:

- The frontend is a handful of static files; moving it later is under an hour of work.
- CORS on the bridge is three response headers, and pinning `Access-Control-Allow-Origin` to the exact Pages origin is *useful* anyway (see Abuse Guardrails).
- Keeping the human's deploy story as "push to `main`" is worth more than saving one preflight request.

This is deliberately a **reversible** decision. If Stage 2E finds CORS or the two-deploy story genuinely painful, collapsing the frontend onto the bridge origin is a cheap correction, not a rewrite.

---

# Candidate Architectures

Four realistic shapes were considered. One is disqualified outright, one collapses on contact with the product requirement, one is the recommendation, and one is the eventual scaling answer that is wrong for the MVP.

## Candidate A — GitHub Pages alone, token in browser

**Shape:** Static page holds a PAT and calls the GitHub API directly.

| Dimension | Assessment |
|---|---|
| Security | **Fails the hard constraint.** The token is public the moment the page is served. Anyone can dispatch workflows, read the repository, and (with `Actions: write`) delete artifacts and cancel runs. |
| Complexity | Lowest |
| Anonymous suitability | Good, briefly, until the token is scraped |
| Input transport | Workflow input |
| Output retrieval | Impossible to keep private; the token also lets anyone read every other user's results |
| Cost/abuse | Unbounded |
| Major drawback | It is not a candidate. It is listed only so the record shows it was considered and rejected on the stated rule. |

**REJECTED.**

## Candidate B — GitHub Pages + the user's own GitHub identity (OAuth device flow)

**Shape:** The user signs in to GitHub in the browser; the page dispatches the workflow using the user's own token.

| Dimension | Assessment |
|---|---|
| Security | No *shipped* secret, so it clears the hard rule. But every user now holds a GitHub token in their browser. |
| Complexity | Moderate (device-flow polling UI) |
| Anonymous suitability | **None.** Requires a GitHub account, an authorization screen, and a device code. |
| Input transport | Workflow input |
| Output retrieval | Artifact download with the user's token |
| Cost/abuse | Naturally attributed, which is genuinely attractive |
| Major drawback | **Fatal:** `Actions: write` on *our* repository cannot be granted to a stranger. Every user would have to fork the repository and run their own copy. That is the exact opposite of the product. |

**REJECTED.** It fails the Dad Test on beat one and the permission model on beat two.

## Candidate C — GitHub Pages + one tiny stateless serverless bridge  ← **RECOMMENDED**

**Shape:** Static Pages frontend → a single small serverless function holding a scoped credential → the frozen `workflow_dispatch` workflow → artifact → back through the bridge as plain text.

| Dimension | Assessment |
|---|---|
| Security | Credential lives only in the bridge's server-side environment. Browser holds nothing privileged. The bridge exposes exactly three narrow operations and never proxies arbitrary GitHub calls. |
| Complexity | One small module set of roughly 200–300 lines, no framework, no build step beyond `wrangler deploy`. |
| Anonymous suitability | **Full.** No account, no login, no GitHub knowledge. |
| Input transport | Base64 `workflow_dispatch` input (65,535-character documented ceiling) |
| Output retrieval | Bridge downloads the artifact zip with its token, extracts `links.txt`, returns `text/plain` |
| Cost/abuse | Public repo ⇒ Actions minutes are free. Cloudflare Workers free tier is 100,000 requests/day. Guardrails are enforceable at the bridge without any datastore. |
| Major drawback | Introduces a second hosting account and one long-lived server-side secret that must be rotated. This is the irreducible cost of not putting a secret in the browser. |

**RECOMMENDED.**

## Candidate D — Replace Actions with a real hosted backend that runs `gallery-dl`

**Shape:** A container host (Fly.io, Cloud Run, Render, Cloudflare Containers) runs Python + `gallery-dl` directly, with its own queue and job store.

| Dimension | Assessment |
|---|---|
| Security | Sound |
| Complexity | **High.** Container image, deploy pipeline, job queue, job state, concurrency control, log hygiene, monitoring, and a bill. |
| Anonymous suitability | Full |
| Input transport | Direct upload |
| Output retrieval | Direct download; genuinely better UX (real progress, no zip, no artifact retention question) |
| Cost/abuse | Real, recurring, and scales with strangers' usage |
| Major drawback | Trips four stated stop conditions at once: major backend infrastructure, persistent storage, queue service, paid cloud architecture. |

**REJECTED for Phase 2**, and explicitly noted as the correct destination *if and when* traction justifies it. The recommended architecture deliberately keeps that door open: the frontend talks to three narrow HTTP endpoints, so re-pointing them at a real backend later changes the bridge and nothing else.

---

# Recommended Architecture

```text
┌──────────────────────────────┐
│  GitHub Pages (static)       │   no credentials, ever
│  index.html + app.js + css   │
└───────────────┬──────────────┘
                │  HTTPS, JSON, CORS-pinned
                │  POST /run   { targets: "<raw .txt text>" }
                │  GET  /status/{runId}
                │  GET  /result/{runId}
                ▼
┌──────────────────────────────┐
│  Bridge (Cloudflare Worker)  │   holds the ONLY credential
│  stateless, no database      │   fine-grained PAT, Actions: read+write,
│  ~200-300 lines              │   scoped to this ONE repository
└───────────────┬──────────────┘
                │  authenticated GitHub REST
                ▼
┌──────────────────────────────┐
│  FloppyDisk repository       │
│  .github/workflows/          │
│    extract-links.yml         │   workflow_dispatch + targets_b64 input
└───────────────┬──────────────┘
                ▼
┌──────────────────────────────┐
│  GitHub-hosted runner        │
│  decode input → targets.txt  │   ephemeral; never committed
│  python -m floppydisk  ◄─────┼── FROZEN, UNCHANGED
│  → links.txt, diagnostics.txt│
│  → upload-artifact           │   retention-days: 1
└──────────────────────────────┘
```

**The three properties that make this the right answer:**

1. **The browser holds nothing.** It sends text and receives text.
2. **The bridge is stateless.** No database, no session store, no user records. Every piece of state it needs (does this run exist, is it finished, what did it produce) is already held by GitHub and is fetched on demand.
3. **The frozen pipeline is untouched.** Not one line under `floppydisk/` changes. The workflow gains an input and a decode step; the invocation line is byte-identical.

**Bridge credential — recommendation and reasoning:**

Use a **fine-grained personal access token**, scoped to the single FloppyDisk repository, with exactly one permission: **Actions: Read and write**. Nothing else. Not `contents: write`, not organization scope.

A GitHub App is the more sophisticated option: installation tokens are short-lived, individually revocable, and rate-limited more generously. It is also ~40 more lines of RS256 JWT signing in the Worker, and the App's private key is still a long-lived secret in the same place the PAT would have been — so the blast-radius class is identical at MVP scale.

**Decision:** fine-grained PAT for Phase 2, with all credential handling isolated behind a single `getToken()` function in the bridge so that swapping to a GitHub App is a contained, one-function change. This is protecting future optionality without building the future.

The PAT's expiry is a recurring human chore. That is a real, accepted cost, and it should be recorded with its expiry date so it does not become a mystery outage in eleven months.

---

# Browser → Backend Trigger Flow

```text
User presses "Find Image Links"
   │
   │  POST https://<bridge>/run
   │  Content-Type: application/json
   │  { "targets": "<the raw text of the user's file>" }
   ▼
Bridge validates (see Abuse Guardrails):
   • body ≤ 32 KB
   • parses to ≤ 50 accepted http(s) URLs
   • no private / loopback / link-local / cloud-metadata hosts
   • per-IP rate limit not exceeded
   • fewer than 3 FloppyDisk runs currently queued or in progress
   │
   ▼
Bridge base64-encodes the raw text and calls:
   POST /repos/{owner}/{repo}/actions/workflows/extract-links.yml/dispatches
   Authorization: Bearer <server-side PAT>
   {
     "ref": "main",
     "inputs": { "targets_b64": "<base64>" },
     "return_run_details": true
   }
   │
   ▼
GitHub returns 200 OK with the run's identity
   │
   ▼
Bridge returns to the browser:  { "runId": 33690188488 }
```

**The `return_run_details` finding is the single most important research result in this report.**

As of the **February 19, 2026** GitHub changelog, the dispatch endpoint accepts an optional boolean `return_run_details`, and "will return a `200 OK` response containing the workflow ID, API URL, and workflow URL." Without it, the endpoint still returns the legacy `204 No Content`.

This matters because the historical way to correlate a dispatch with its run was an ugly workaround: embed a random nonce in the workflow's `run-name`, then poll the runs list looking for a name match. On a public repository that nonce would appear in the **public** run list — meaning a stranger could read a run name off the Actions page and use it to ask our bridge for someone else's results.

`return_run_details` eliminates that entire class of problem. The run id is learned privately, at dispatch time, by the only party that has a token.

**Contingency:** the changelog wording says "workflow ID" while the headline says "run IDs." Stage 2A must empirically confirm that the returned identifier is the **run** id usable at `GET /repos/{o}/{r}/actions/runs/{id}`. If it is not, the fallback is the `run-name` correlation described above, but with a **SHA-256 hash** of the client's token placed in the run name rather than the token itself, so the public value is not the value that authorizes retrieval. This is recorded as a Known Unknown with a defined answer either way.

**What the browser never learns:** the repository owner, the repository name, the workflow file name, the branch, or any GitHub URL. The bridge's response contains an opaque run id and nothing else. Even that leaks less than it appears — without a token, the run id is not actionable against GitHub.

---

# .txt Input Transport

## Decision: base64-encoded `workflow_dispatch` input

**Verified constraints:**

| Constraint | Documented value |
|---|---|
| `workflow_dispatch` `inputs` — max top-level properties | 25 |
| `workflow_dispatch` `inputs` — max payload | **65,535 characters** |
| `repository_dispatch` `client_payload` — max top-level properties | 10 |
| `repository_dispatch` `client_payload` — max payload | 65,535 characters |

Base64 expands by 4/3, so the 65,535-character ceiling holds roughly **48 KB of raw target text** — on the order of 700–800 typical URLs. The MVP cap is **50 URLs (~4 KB)**. There is roughly an order of magnitude of headroom between the product limit and the platform limit, which is exactly the margin an MVP should have.

## Why this beats the alternatives

| Alternative | Why rejected |
|---|---|
| **Commit `targets.txt` via the Contents API** | Requires `contents: write` (a much larger blast radius than `actions: write`), writes every stranger's browsing intent into permanent, public git history, creates commit churn, and serialises concurrent runs onto one file. Categorically worse on privacy, security, and correctness. |
| **Bridge stores the payload; workflow fetches it** | Requires a datastore (stop condition), a second authenticated endpoint, and an inbound credential on the runner. Strictly more moving parts for no gain, given 48 KB fits in the input. |
| **`repository_dispatch` instead of `workflow_dispatch`** | Same payload ceiling, fewer top-level properties, no `return_run_details` equivalent, and it dispatches by event type rather than by workflow file — less precise for no benefit. |
| **Raw (non-base64) text in the input** | JSON tolerates newlines, so this would technically work — but see the injection note below. Base64 is chosen deliberately. |

## The one thing that must not be done wrong

The decoded value is **untrusted input from an anonymous stranger** being handed to a shell on a runner that has a `GITHUB_TOKEN`. Interpolating it directly into a `run:` step —

```yaml
run: echo "${{ inputs.targets_b64 }}" | base64 -d > targets.txt    # ← NEVER
```

— is the classic GitHub Actions script-injection vulnerability. `${{ }}` is substituted into the script *before* the shell runs, so a crafted payload becomes executable code with the job's privileges.

The required shape passes the value through the environment, where the shell treats it as data:

```yaml
- name: Materialize targets
  env:
    TARGETS_B64: ${{ inputs.targets_b64 }}
  run: printf '%s' "$TARGETS_B64" | base64 -d > targets.txt
```

Base64 also guarantees the payload contains only `A–Z a–z 0–9 + / =`, which removes newline, quote, and backtick handling from the problem entirely. **This is why base64 rather than raw text.**

Stage 2B must add a static test to `tests/test_workflow.py` asserting that no `run:` step interpolates `${{ inputs.* }}` directly, and that the decode step uses `env:` indirection. That test is the durable memory for this decision.

## What the frozen parser sees

Nothing changes. After decoding, `targets.txt` on the runner is an ordinary UTF-8 text file, and `parse_targets` receives it exactly as it does today — blank lines and `#` comments ignored, `http`/`https` required, one-based line numbers preserved for diagnostics.

---

# Hosted Processing Flow

The workflow gains an input and a decode step. **The invocation line is unchanged.**

```text
workflow_dispatch:
  inputs:
    targets_b64:   (string, required)

jobs.extract:
  1. Check out repository            (actions/checkout@v4)         — unchanged
  2. Set up Python 3.12              (actions/setup-python@v5)     — unchanged
  3. Install gallery-dl==1.32.10                                    — unchanged
  4. Record gallery-dl version                                      — unchanged
  5. Materialize targets.txt from targets_b64 via env indirection   — NEW
  6. python -m floppydisk \
       --targets targets.txt --out links.txt --diagnostics diagnostics.txt
                                                                    — BYTE-IDENTICAL
  7. Upload floppydisk-results artifact, if: always()
     + retention-days: 1                                            — CHANGED (privacy)
```

**Everything preserved:**

- `permissions: contents: read` — the job never needs write access to anything.
- No `cat`, no `echo` of targets, links, or diagnostics. This rule was a good practice in Phase 0; on a public repository serving strangers it becomes **load-bearing**, because run logs are world-readable.
- Failure containment: target-level failure remains exit `0`. The bridge must therefore treat run `conclusion: success` as "the pipeline ran," not as "every target worked," and derive partial-failure messaging from `diagnostics.txt`.
- No media downloads, no `-J`, no direct `gallery-dl` invocation in YAML.

**Timeout:** `timeout-minutes: 30` should drop to **15** for web-triggered runs. Thirty minutes of a stranger's job occupying a concurrency slot is more patience than the product needs, and no realistic 50-URL run approaches it.

**Progress reporting — an honest negative result.**

The prompt asks for "3 / 20 targets processed" *only if the backend can actually provide it without excessive complexity*. It cannot, cheaply:

- The frozen CLI writes `diagnostics.txt` **once, at the end**, via `_atomic_write_text`. There is no incremental progress file, and creating one would modify a frozen contract.
- Actions exposes no mid-job progress API. The only mid-run signal is the log stream, which is heavy to poll, and which we have deliberately kept free of target information — scraping it for progress would create pressure to log the very thing privacy requires us not to log.

**Decision: no numeric progress in the MVP.** The processing state shows an indeterminate indicator plus honest elapsed time. This is recorded as a deliberate, evidence-based omission rather than an oversight. If real runs prove slow enough that users abandon them, the correct fix is a small, additive progress channel designed in its own stage — not a hurried log-scraper bolted on now.

---

# Result / links.txt Retrieval Flow

```text
Browser polls every 3s:  GET /status/{runId}
   │
   ▼
Bridge → GET /repos/{o}/{r}/actions/runs/{runId}
   • response cached ~5s in the Worker Cache API (no datastore) to protect the API budget
   • bridge returns ONLY: { state: "waiting" | "working" | "done" | "failed" }
   │
   ▼
When state === "done":  GET /result/{runId}
   │
   ▼
Bridge:
   1. GET /repos/{o}/{r}/actions/runs/{runId}/artifacts
   2. GET /repos/{o}/{r}/actions/artifacts/{id}/zip   → 302, 1-minute signed URL
   3. follow redirect, read the zip bytes
   4. extract links.txt (and diagnostics.txt) in memory
   5. count links; scan diagnostics for `status=` values that are not `ok`
   6. respond:
      {
        "links": "<the exact bytes of links.txt>",
        "count": 143,
        "problemTargets": 2
      }
   7. DELETE /repos/{o}/{r}/actions/artifacts/{id}      ← privacy, see below
   │
   ▼
Browser builds a Blob from `links` and triggers a download named links.txt
```

## Why the bridge unzips instead of handing over the signed URL

The artifact download endpoint returns "a redirect URL to download an archive… This URL expires after 1 minute." Handing that URL to the browser is tempting — it is pre-authenticated, so the browser needs no token.

It is rejected because **it gives the user a `.zip`.** The prompt is explicit that a normal user should not have to "unzip it manually." Delivering a zip that contains an unexplained `diagnostics.txt` alongside `links.txt` is precisely the sixth beat the North Star forbids.

Unzipping in the Worker is a small, bounded piece of work: the artifact from the Phase 0 acceptance run was **763 bytes**. Two viable implementations, both fine on the free tier's 10 ms CPU budget:

- `fflate` (~30 KB, well-tested), or
- ~60 lines reading the zip central directory and using the runtime's native `DecompressionStream('deflate-raw')`, with no dependency at all.

Stage 2C picks one against a committed fixture zip. This is the only genuinely fiddly code in the entire bridge, and it is fully testable offline.

## `links.txt` contract preservation

The bridge returns the **exact bytes** of `links.txt` — no re-sorting, no re-filtering, no re-deduplication, no trailing-newline normalisation, no header. The frozen purity contract verified byte-for-byte in Phase 1-18 (18 lines, 18 unique, LF endings, trailing LF, no non-URL content) must survive the round trip unchanged, and Stage 2C must assert it.

The only derived values the bridge computes are `count` (lines in `links.txt`) and `problemTargets` (non-`ok` `status=` values in `diagnostics.txt`), both used solely for human-readable copy.

**Coupling note, stated plainly:** `problemTargets` is the one place where the bridge knows something about the diagnostics *format*. It is one regex, the format is frozen and already covered by the existing test suite, and it is confined to a single bridge function. The cleaner long-term answer is a small machine-readable summary emitted by the frozen CLI — but that would change a Phase 0 contract, so it is **not** proposed now. Recorded as a future decision point.

## Raw diagnostics are never shown by default

"View details" renders a humanized summary — how many targets were read, how many could not be read — not the diagnostics file. `diagnostics.txt` can contain captured `stderr`, and `stderr` can contain target URLs (as the `discover.py` breadcrumb states explicitly). It stays server-side.

---

# Privacy Model

Target URLs carry browsing intent even when every individual URL is public. Phase 0 already treats them as sensitive. Phase 2 must not quietly regress that.

## Exposure map

| Stage | What is exposed | To whom | Assessment |
|---|---|---|---|
| Browser | File is read locally via the File API | Nobody | Clean |
| Bridge request | Raw target text over TLS | Cloudflare edge | Acceptable. **The Worker must never log the request body.** Edge logs record IP/path/status, not body, by default. |
| Bridge memory | Raw text, transiently | Nobody | Clean — stateless, no writes |
| Dispatch payload | Base64 targets in the `workflow_dispatch` event | GitHub; repo admins | **Unavoidable.** Mitigated by a verified fact: dispatch inputs are **not** displayed in the run UI (GitHub community discussion #49648 is still an open backlog feature request) and are **not** returned by `GET /actions/runs/{id}` (discussion #73223). So they are not publicly enumerable — but they are stored by GitHub and are not hidden from GitHub or from repository admins. |
| Runner filesystem | `targets.txt` in plaintext | The ephemeral runner | Acceptable — destroyed with the runner, never committed |
| Run logs | Counts only | **World** (public repo) | Depends entirely on preserving the no-echo rule. Must be test-enforced. |
| Step summary | Counts only, per the frozen CLI | **World** | Clean by existing design |
| Artifact | `links.txt` **and** `diagnostics.txt` | Anyone with any token who knows the run id | **The largest new exposure. See below.** |
| Run metadata | Timestamp, duration, conclusion | **World** | Acceptable — reveals that *a* run happened, not what it contained |

## The artifact exposure — the most important privacy finding in this report

On a **public** repository, workflow artifacts are downloadable by anyone holding any GitHub token who knows the run id. Run ids are visible on the public Actions page. Therefore, by default, **every user's results — including a `diagnostics.txt` that may contain their target URLs in captured `stderr` — would be effectively public for the full artifact retention period (90 days by default; the Phase 0 artifact was set to expire December 1, 2026).**

That is unacceptable for a product handling strangers' browsing intent.

**Two cheap mitigations, both recommended, applied together:**

1. **`retention-days: 1`** on the upload step. Bounds worst-case exposure from ~90 days to ~24 hours.
2. **Bridge deletes the artifact immediately after a successful `/result` fetch** via `DELETE /repos/{o}/{r}/actions/artifacts/{id}`. The bridge already holds `Actions: write`, so this costs one API call and no new permission. Typical exposure collapses from days to the tens of seconds between upload and download.

**The alternative is a private repository**, which removes public artifact and log visibility entirely — but Actions minutes stop being free (see Abuse / Cost Guardrails). That is a genuine product trade-off and it is **the human's call**, not the architecture's. The recommendation is: **public repository + `retention-days: 1` + post-download delete** for the MVP, revisited if real usage shows the exposure window matters more than the cost.

## Stated honestly

FloppyDisk should not claim the service is private or zero-knowledge. What is defensible, and what the interface may say, is narrower and true: *your links are not published, they are deleted after you download them, and they are never written into the project's history.*

---

# Abuse / Cost Guardrails

## What is actually at risk

**Not GitHub billing.** GitHub documents that "GitHub Actions usage is free for self-hosted runners and for public repositories that use standard GitHub-hosted runners." A public FloppyDisk repository on standard `ubuntu-latest` runners costs **nothing in minutes**, no matter how many strangers use it. Cloudflare Workers' free tier is 100,000 requests/day, which at ~25 polls per run supports thousands of runs daily.

**The MVP's realistic cost is approximately zero.** The risks are elsewhere:

| Risk | Reality |
|---|---|
| **Concurrency starvation** | Free-plan accounts get **20 concurrent jobs**. A burst queues everyone behind it, and the product feels broken. |
| **Hammering third-party sites** | Strangers pointing FloppyDisk at one site repeatedly, from GitHub datacenter IPs, is a reputational and terms-of-service problem for the human, not a billing one. This is the risk that actually matters. |
| **SSRF-flavoured targets** | `gallery-dl` fetching `127.0.0.1`, `10.x`, or `169.254.169.254` from inside a runner. |
| **GitHub API budget** | A fine-grained PAT gets 5,000 requests/hour. Naive per-second polling would exhaust it long before Actions minutes became a question. |
| **Queue limits** | 1,500 events / 10s / repository — orders of magnitude above anything the MVP will produce. Not a concern. |

## The minimum guardrail set — five rules, no database

1. **Request size cap:** reject bodies over **32 KB** before parsing anything.
2. **URL count cap:** reject submissions parsing to more than **50** accepted URLs. Well under the ~700-URL platform ceiling; enough for a real first use; small enough to bound the load placed on any target site.
3. **Target sanity check:** `http`/`https` only; reject loopback, private ranges (`10/8`, `172.16/12`, `192.168/16`), link-local `169.254/16` (which covers cloud metadata endpoints), `.local`, and bare IPs. Cheap, stateless, and closes the SSRF-flavoured hole.
4. **Per-IP rate limit:** the Cloudflare Workers Rate Limiting binding, which requires no KV and no Durable Object — "the underlying counters are cached on the same machine that your Worker runs in." Its `period` must be **10 or 60 seconds**, so the expressible rule is per-minute: **2 submissions per IP per 60 s.** A per-hour cap is *not* expressible without storage, and is deliberately not built (see Known Unknowns).
5. **Global in-flight cap:** before dispatching, the bridge asks GitHub how many FloppyDisk runs are `queued` or `in_progress`. If **3 or more**, refuse with a friendly "FloppyDisk is busy — try again in a moment." One API call, **no storage**, and it keeps us at 15% of the concurrency ceiling while bounding the total load aimed at any target site.

Guardrail 5 is the elegant one: the concurrency state we need is already authoritatively held by GitHub. Duplicating it in a datastore would be inventing infrastructure to track something we can simply ask about.

## Supporting measures

- `Access-Control-Allow-Origin` pinned to the exact Pages origin. Not a security boundary — `curl` ignores CORS — but it stops casual embedding of the bridge in other people's pages.
- `timeout-minutes: 15` bounds any single job's hold on a concurrency slot.
- Bridge polling floor of 5 s with Cache API responses, protecting the 5,000/hour API budget.

## Explicitly not built

No accounts, no login, no CAPTCHA, no email verification, no per-user quotas, no ban list, no database. Every one of those was considered and rejected as speculative infrastructure. **Cloudflare Turnstile is named as the designated first escalation** — it is a drop-in, privacy-respecting, no-account challenge — but it is added only if evidence of abuse appears, not before.

---

# Desktop / Mobile UX

One responsive page, one primary action, no layout that only works in one form factor.

| | Desktop | Mobile |
|---|---|---|
| File input | Drag-and-drop **plus** a visible "Choose .txt file" button | "Choose .txt file" button (the OS picker) |
| Primary action | One large button | Same button, full-width, thumb-reachable near the bottom |
| Result | Download link | Same; downloads to the device's Downloads |

**Non-negotiables:**

- **The file picker is the required path; drag-and-drop is an enhancement.** Mobile browsers have no drag-and-drop, and a drop zone that is *only* a drop zone is invisible to half the users. The visible button must always be present, and the drop zone must be a labelled enhancement wrapped around it, never a replacement for it.
- Everything works with a single tap or click. No hover-only affordances.
- The processing state must survive a phone locking and being woken — polling resumes rather than losing the run. (Holding the run id in `sessionStorage` is enough; this is a per-viewer convenience, not shared state.)
- Minimum tap target 44 px; text at least 16 px to prevent iOS zoom-on-focus.

**Known mobile friction, stated up front:** on iOS, "a `.txt` file" is not always where a user expects it, and some browsers hand back an unhelpful MIME type. The file input must accept `.txt` **and** validate by *reading and parsing* the content rather than by trusting `file.type`. If parsing finds no usable URLs, the copy should say so in human terms — "That file doesn't seem to have any web addresses in it" — never "invalid MIME type."

---

# MVP Screen States

One screen. Five states. No navigation, no settings, no dashboard.

## 1. EMPTY

```text
        ╭───────────────────────────────╮
        │                               │
        │        💾  FloppyDisk         │
        │                               │
        │   Find image links in a list  │
        │        of web addresses       │
        │                               │
        │   ┌───────────────────────┐   │
        │   │ Drop a .txt file here │   │
        │   │           or          │   │
        │   │ [  Choose .txt file  ]│   │
        │   └───────────────────────┘   │
        │                               │
        ╰───────────────────────────────╯
```

One action. No explanation of what a target is, what a run is, or where anything happens.

## 2. READY

```text
        📄  my-links.txt
            12 web addresses found

        [   Find Image Links   ]

        Choose a different file
```

Showing the parsed count *before* submitting is doing real work for the user: it confirms the file was understood, and it catches an empty or wrong file before anything is dispatched. The count comes from parsing in the browser using the same rules as the frozen parser (skip blanks, skip `#`, require `http`/`https`).

## 3. PROCESSING

```text
        💾  Finding image links…

            ▓▓▓▓▓▓░░░░░░░░░░

            This usually takes a minute.
            (0:34)
```

Indeterminate, with honest elapsed time and an honest expectation. **No fake percentage.** No "3 / 20," because the backend cannot truthfully provide it (see Hosted Processing Flow). Inventing a progress bar that does not correspond to progress is a small lie that the product does not need to tell.

## 4. SUCCESS

```text
        ✅  143 image links found

        [   Download links.txt   ]

        View details       Start over
```

One number, one button. "View details" is a disclosure that expands to a plain-language summary — *"We read 12 addresses and found images on all 12"* — not a diagnostics dump.

## 5. PARTIAL / FAILURE

```text
        ⚠️  Some sites could not be read

            We found 87 image links from 10 of your
            12 addresses. The other 2 could not be read.

        [   Download links.txt   ]

        View details       Start over
```

Total failure gets its own copy, and it still never blames the user or mentions machinery:

```text
        😕  FloppyDisk could not finish

            Something went wrong on our side.
            Nothing was saved. Please try again.

        [   Try again   ]
```

**Copy rules, binding on the builder:** never show the words workflow, dispatch, artifact, runner, API, token, HTTP status, gallery-dl, Python, exit code, or diagnostics. Never show a raw error object. Every failure message says what happened in ordinary words and what the user can do next.

**The "busy" case** deserves its own gentle message rather than an error: *"FloppyDisk is busy right now — please try again in a minute."*

---

# Visual / Product Direction

Not implemented in this stage; the philosophy is fixed here so Stage 2E has a standard to be judged against.

FloppyDisk should feel **tiny, obvious, friendly, fast, focused, and slightly playful** — never corporate, never developer-oriented.

- **One screen.** No navigation, no tabs, no settings, no account menu.
- **Retro-computing personality, held lightly.** The name earns a floppy mark, a mono accent face, and a chunky button. It does not earn a fake CRT bezel, scanlines, a boot sequence, or a beep. The retro is seasoning, not the meal — because every novelty flourish costs the user a moment of "wait, is this a real tool?"
- **Large type, generous whitespace, one accent colour.** The primary button should be the most visually prominent element on the page at every state.
- **No spinner theatre.** One honest indeterminate indicator.
- **The interface names intentions, not implementation.** "Find Image Links," not "Run extraction pipeline."

---

# Files / Components Likely Required

## New — static frontend (GitHub Pages)

```text
docs/index.html          one page, five states
docs/app.js              state machine, file parsing, polling, blob download
docs/style.css           small, self-contained, no framework
docs/floppy.svg          favicon / mark
```

**Note on the folder name:** GitHub Pages "deploy from a branch" only publishes from the repository root or `/docs`. Since the root is the Python package's home, `/docs` is the pragmatic choice — but this repository already keeps its written documentation in `Claude and Codex Reports/`, so `docs/` meaning "the website" is mildly confusing. It needs one clarifying line in the README. If the human prefers, the alternative is Pages-via-Actions publishing from a `web/` folder, which costs one more workflow file. **Small open choice, flagged for the review table.**

## New — bridge (separate deploy, source lives in this repository)

```text
bridge/src/index.js      router: POST /run, GET /status/:id, GET /result/:id
bridge/src/github.js     the ONLY module that knows GitHub exists (mirrors the
                         discover.py pattern: one owner for the external seam)
bridge/src/validate.js   size, count, scheme, and host checks
bridge/src/unzip.js      artifact zip → { links, diagnostics }
bridge/wrangler.toml     config; secrets are set via `wrangler secret put`, never committed
bridge/test/*.test.js    offline tests with a mocked GitHub API
```

The `github.js` boundary is deliberate and mirrors the architecture the project already trusts: `discover.py` is "the only production module that knows gallery-dl exists." `github.js` should be the only bridge module that knows GitHub exists. That single seam is what makes Candidate D reachable later without touching the frontend.

## Modified

```text
.github/workflows/extract-links.yml
  + inputs.targets_b64
  + env-indirect decode step
  + retention-days: 1
  ~ timeout-minutes: 30 → 15
  = invocation line unchanged

tests/test_workflow.py
  + assert no direct ${{ inputs.* }} interpolation inside any run:
  + assert the decode step uses env: indirection
  + assert retention-days is present
  + assert the frozen invocation line is unchanged
  + preserve all existing no-echo / no-download assertions

README.md
  + what the web version is, where the bridge lives, and the PAT rotation date
```

## Explicitly NOT created

No database, no schema, no queue, no session store, no user table, no auth service, no Docker image, no `requirements.txt` change, no new Python dependency, no framework, no bundler, no CI for the frontend beyond Pages.

---

# Frozen Phase 0 Components

**Protected — modification signals the architecture is wrong and requires a STOP:**

```text
floppydisk/__init__.py
floppydisk/__main__.py
floppydisk/cli.py
floppydisk/discover.py
floppydisk/filters.py
tests/test_cli.py
tests/test_discover.py
tests/test_filters.py
tests/test_targets.py
tests/fixtures/
```

**Frozen contracts that must remain true at the end of Phase 2:**

1. `python -m floppydisk --targets <path> --out <path> --diagnostics <path>` — unchanged, three distinct paths.
2. `links.txt` contains only qualifying unique image URLs, one per line, LF, trailing newline — verified byte-for-byte after the round trip.
3. `diagnostics.txt` remains a separate file and is never merged into `links.txt`.
4. `gallery-dl==1.32.10` remains an external, pinned subprocess dependency; never vendored, never imported.
5. No media is downloaded; discovery uses `-j`, never `-J`.
6. Target-level failure is contained at exit `0`; exit `1` remains reserved for pipeline-fatal local failure.
7. Target URLs never appear in stdout, the step summary, or run logs.
8. Diagnostics identify targets by source line number.

The workflow YAML is **not** frozen — it is the orchestration layer, and adapting it is precisely the authorised Phase 2 work. But the line that invokes the frozen boundary is frozen within it.

---

# Phase 2 Implementation Stages

Five stages. Each answers exactly one meaningful uncertainty, and each is independently reversible.

## Stage 2A — Prove the safe trigger seam

**Uncertainty:** *Can an anonymous browser start a real FloppyDisk run through a credential-free path, and can the bridge learn the run id?*

- Create the fine-grained PAT (repo-scoped, `Actions: Read and write`, nothing else). **Human step.**
- Create the Cloudflare account and deploy a minimal Worker. **Human step** (`wrangler login`).
- Implement `POST /run` that ignores its body and dispatches the **existing, unmodified** workflow with `return_run_details: true`.
- **Empirically confirm** the returned identifier is a run id usable at `GET /actions/runs/{id}`. If not, implement the hashed-`run-name` fallback and record it.

**Gate:** a `curl` with no credentials starts a real run; the response contains a usable run id; the deployed frontend bundle contains no token (assert by scanning the built assets).

**Reversible by:** deleting the Worker and revoking the PAT. Nothing in the repository changes.

## Stage 2B — Prove the input transport

**Uncertainty:** *Does an uploaded `.txt` reach the frozen parser byte-identically and safely?*

- Add `targets_b64` input and the env-indirect decode step to the workflow.
- Bridge base64-encodes the submitted text and sends it.
- Add the static injection-safety tests to `tests/test_workflow.py`.
- One live hosted run using a submitted file whose content differs from the committed `targets.txt`, proving the input — not the committed file — drove the run.

**Gate:** full pytest suite passes (96 + new); the hosted run's counts match the submitted file, not the committed one; no `${{ inputs.* }}` appears inside any `run:`.

**Reversible by:** reverting one workflow commit.

## Stage 2C — Prove result retrieval

**Uncertainty:** *Can the browser obtain `links.txt` without touching GitHub, with the frozen purity contract intact?*

- Implement `GET /status/:id` and `GET /result/:id`, including zip extraction against a committed fixture.
- Add `retention-days: 1`; implement post-download artifact deletion.
- Verify the returned bytes are byte-identical to the artifact's `links.txt`.

**Gate:** an end-to-end `curl` sequence — dispatch, poll, retrieve — yields pure `links.txt` text with no zip and no GitHub interaction; the artifact is gone afterwards.

**Reversible by:** removing two endpoints.

## Stage 2D — Guardrails before any public exposure

**Uncertainty:** *Is the endpoint safe to hand to strangers?*

- Size cap, URL cap, scheme and host validation, per-IP rate limit, global in-flight cap, CORS pinning, `timeout-minutes: 15`.
- Offline tests for every rejection path.

**Gate:** every guardrail has a test proving it rejects; each returns friendly human copy, not a status code.

**LAUNCH GATE: the site URL must not be shared publicly until 2D is complete.** 2A–2C are usable by the human alone; only 2D makes the seam safe for strangers.

## Stage 2E — The UI

**Uncertainty:** *Does the five-beat experience actually work for a real person on a real device?*

- Build the five states, desktop and mobile, and publish to Pages.
- Copy review against the Dad Test.
- The three human tests below.

**Gate:** a person who has never seen FloppyDisk completes the flow without being told what to do.

**Why this order:** each stage removes the largest remaining unknown at the time it runs. Building the UI first would risk polishing a screen for a seam that turns out to be impossible. Stage 2A is deliberately first because it is where the whole architecture would fail if it were going to fail.

---

# Automated Test Strategy

**Repository (pytest, extends the existing 96):**

- Workflow static contract: no direct `${{ inputs.* }}` in any `run:`; decode step uses `env:`; `retention-days` present; frozen invocation line byte-unchanged; existing no-echo and no-download assertions preserved.
- Base64 round-trip modelled in Python: arbitrary targets text → encode → decode → `parse_targets` produces identical accepted/rejected tuples.
- The frozen suite must continue to pass unchanged. Any change to a `floppydisk/` test is a STOP.

**Bridge (offline, mocked GitHub API):**

- Validation: oversize body, 51 URLs, `ftp://`, `file://`, `127.0.0.1`, `10.0.0.1`, `169.254.169.254`, empty file, file with only comments — each rejected with the right friendly message.
- Dispatch: correct endpoint, correct `ref`, `return_run_details: true`, base64 correctness, and **no token in any response body or header returned to the client**.
- Status mapping: every GitHub `status`/`conclusion` combination maps to exactly one of the four client states.
- Zip extraction against a committed fixture: `links.txt` bytes identical, `diagnostics.txt` parsed for non-`ok` counts.
- In-flight cap: with 3 mocked runs in progress, `/run` refuses.
- Artifact deletion is called after a successful `/result`.

**Frontend:**

- The state machine as a pure, importable module — every transition tested headlessly, with no DOM.
- Browser-side target parsing matches the frozen Python parser's rules on a shared fixture (blank lines, `#` comments, non-URL lines, whitespace).
- Deployed-asset scan asserting no token-shaped string ships to the browser. This one should be a permanent test, not a one-off check.

---

# Minimal Human Tests

Three. Everything else above is automated.

1. **Mobile file picker (iOS and Android).** Choose a `.txt` file and complete the flow to a downloaded `links.txt`. Automation cannot reproduce a real OS file picker or a real mobile download.
2. **Desktop drag-and-drop.** Drop a `.txt` onto the drop zone and confirm it is accepted. Synthetic drop events do not prove real OS drag behaviour.
3. **The Dad Test.** One person who has not seen FloppyDisk, given no instructions, reaches a downloaded `links.txt`. This is the only test that can falsify the North Star, and no machine can run it.

Everything else — validation, guardrails, byte purity, state transitions, injection safety, artifact deletion — is machine-provable and must be machine-proved.

---

# Known Unknowns

1. **`return_run_details` return shape.** The changelog headline says "run IDs" while the body says "workflow ID, API URL, and workflow URL." Stage 2A resolves this empirically. Fallback (hashed `run-name` correlation) is designed and costed.
2. **Real-world run duration.** Phase 0 ran three targets. Fifty targets at up to 120 s each could, worst case, exceed the patience of the processing screen. If evidence shows this, the answers are a lower URL cap or a designed progress channel — not a fake progress bar.
3. **Target-site behaviour at web scale.** Phase 0 saw no anti-bot response, rate limit, or datacenter-IP block against Wikimedia. Strangers' targets will be far more varied. Failure containment already handles this per target; what is unknown is the *rate* of failure and whether the partial-failure copy is honest enough.
4. **Sustained low-rate abuse.** The Workers rate-limit binding supports only 10 s and 60 s periods, so a per-hour cap is not expressible without storage and is deliberately not built. One IP submitting once per minute indefinitely is currently unbounded. Evidence first; Turnstile or a KV counter second.
5. **PAT lifetime and rotation.** Fine-grained PATs expire. The expiry date must be recorded in the README, or this becomes an unexplained outage months from now.
6. **Artifact deletion timing.** If a user never fetches `/result`, the artifact survives until `retention-days` expires. Bounded at ~24 hours, but not zero.
7. **Cold-start latency.** Unmeasured, expected to be negligible against a multi-second workflow, but unverified.
8. **Concurrency ceiling in practice.** The 20-job free limit is documented; how the in-flight cap of 3 *feels* to a queued user is unknown until real traffic exists.

---

# Stop Conditions

The builder must **STOP and report** — not improvise — if any of the following becomes necessary:

1. Any credential, token, key, or secret would need to reach the browser.
2. Any file under `floppydisk/` must change.
3. Any frozen Phase 0 contract must change (CLI arguments, `links.txt` purity, diagnostics separation, `-j` discovery, failure containment, no-download).
4. The design begins to require a database, KV namespace, Durable Object, queue, or any persistent storage.
5. User accounts, login, or authentication become necessary before the MVP works.
6. Any container, VM, always-on server, or paid cloud service becomes necessary.
7. Browser automation or a headless browser becomes necessary.
8. Media downloading becomes necessary.
9. The bridge grows beyond the three narrow endpoints, or begins proxying arbitrary GitHub API calls.
10. The workflow needs `contents: write`, or any permission beyond `contents: read`.
11. Target URLs must be logged, echoed, or committed to make anything work.
12. `return_run_details` proves unusable **and** the `run-name` fallback also fails.
13. The repository must become private (this is a cost decision for the human, not a builder decision).

Stop conditions 1, 2, 3, and 11 are architectural alarms: hitting one means this blueprint is wrong, not that the implementation needs a workaround.

---

# Builder Handoff Recommendation

**Stage 2A should go to Codex** as a narrow implementation handoff. It is small, its gate is unambiguous, and it touches no repository production code — the entire stage lives in a new `bridge/` directory plus a Cloudflare deploy.

**Two prerequisites are genuinely human and cannot be automated:**

1. Creating the fine-grained PAT (repo-scoped, `Actions: Read and write` only) and recording its expiry date.
2. Creating the Cloudflare account and running `wrangler login`.

These should happen **before** the Stage 2A handoff is issued, so the builder is not blocked mid-stage. The PAT must be delivered to the Worker via `wrangler secret put` and must never appear in the repository, in a report, or in a chat message.

**Stage 2E (the UI) is the one stage where Claude implementing directly may be justified**, because copy, state, and layout are inseparable from the UX judgment this report exists to protect — but that is a decision for the review table, not a claim staked now.

**Recommended sequencing at the review table:** approve Stages 2A–2C as a block (they answer the three architectural questions and are individually reversible), and hold 2D and 2E for a second review once the seam is proven. There is no value in debating button copy before we know the trigger works.

---

# Recommendation

Adopt **Candidate C**: GitHub Pages frontend + one tiny stateless serverless bridge + the frozen Actions pipeline.

The evidence supports it plainly:

- A static site **cannot** start a workflow — GitHub's dispatch endpoint refuses anonymous requests, and its artifact endpoint requires a token even for public repositories. A server-side identity is therefore mandatory, and the only real question was how small it could be. The answer is: about 250 lines, three endpoints, one secret, no database.
- The `.txt` fits comfortably inside a `workflow_dispatch` input — 65,535 characters against a 4 KB MVP payload — so no repository writes, no storage, and no new persistence are needed for input transport.
- The February 2026 `return_run_details` addition removes the run-correlation problem that would otherwise have forced a public nonce onto a public Actions page. This is exactly the kind of assumption Phase 0 could not have known, and it makes the architecture materially cleaner than it would have been six months ago.
- A public repository makes Actions minutes free, so the MVP's marginal cost is effectively zero — which correctly relocates the guardrail conversation away from billing and toward the risk that actually matters: the load FloppyDisk places on strangers' target sites.
- The frozen Phase 0 machine is consumed exactly as built. Not one line under `floppydisk/` changes.

**The one finding that most deserves the review table's attention** is the artifact exposure: on a public repository, results — including a `diagnostics.txt` that can contain target URLs — are reachable by anyone with a token who knows the run id. The proposed mitigation (`retention-days: 1` plus immediate post-download deletion) is cheap and effective, but it is a mitigation, not elimination. The alternative, a private repository, costs Actions minutes. That trade-off is a product decision and is put to the human deliberately.

**No implementation was performed. This report is the only change in this commit.**

**READY FOR CHATGPT + HUMAN ARCHITECTURE REVIEW: YES**
