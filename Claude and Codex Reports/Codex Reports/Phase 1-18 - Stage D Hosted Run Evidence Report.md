Timestamp: Wednesday, September 2, 2026 at 4:57:27 PM MDT
Location: Calgary, Alberta

# Stage

Phase 1-18 — Stage D Hosted Acceptance Run Evidence

# Goal

Determine whether a GitHub-hosted runner can execute the frozen FloppyDisk pipeline against the approved small public target set and preserve useful link and diagnostic artifacts without downloading media.

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 4:57:27 PM MDT  
Location: Calgary, Alberta

# Repository / Branch

Repository: `C:\Users\dmcal\Documents\GitHub\FloppyDisk`  
Branch: `main`  
Hosted run commit: `82d8c49fd478d7e91d2ffadc1d156e03990f78d2`

Before execution, `git fetch origin` completed successfully. Local `HEAD` and `origin/main` both resolved to `82d8c49fd478d7e91d2ffadc1d156e03990f78d2`, the working tree was clean, and GitHub remote metadata identified `main` as the default branch.

# Phase 1-17 Blocker Resolution

**CLOSED.** The default branch `main` contains `.github/workflows/extract-links.yml`, including the manual-only `workflow_dispatch` trigger. The complete approved Stage D workflow and `targets.txt` are byte-unchanged from implementation commit `a5dc7bc997c36718633234d6f43e7f70f129007b`. GitHub accepted the manual dispatch on `main`.

# Hosted Workflow Verification

The existing workflow was inspected before dispatch and still uses:

- `workflow_dispatch` only
- `ubuntu-latest`
- `actions/checkout@v4`
- `actions/setup-python@v5`
- Python 3.12
- `gallery-dl==1.32.10`
- `python -m floppydisk`
- `--targets targets.txt`
- `--out links.txt`
- `--diagnostics diagnostics.txt`
- `actions/upload-artifact@v4`
- `if: always()`

The three paths remain distinct. The YAML contains no media download command, `-J`, direct gallery-dl extraction logic, deliberate target URL logging, output-file `cat`, diagnostics-file `cat`, secrets, credentials, cookies, proxies, or alternate triggers.

# Local Regression Verification

- Stage D gate: `python -m pytest -p no:cacheprovider -q tests/test_workflow.py` → **8 passed in 0.07s**
- Full suite: `python -m pytest -p no:cacheprovider -q` → **96 passed in 0.69s**
- Failures: **0**
- Warnings: **0**
- Pytest used its normal temporary location; no Windows ACL workaround was required.

# Real Target Set

The approved three-target public anonymous set remained unchanged:

1. A Wikimedia-hosted direct PNG.
2. Its Wikimedia Commons file page as an extractor-backed representative path.
3. The established `example.com` unsupported probe for failure containment.

No targets were expanded, substituted, personalized, or supplied with credentials or cookies.

# Workflow Run ID

`33690188488` (run number 1, attempt 1, event `workflow_dispatch`, branch `main`).

# Workflow Conclusion

**success**

# Job Conclusion

Job `extract`, ID `100446934416`: **success**. Checkout, Python setup, pinned dependency installation, version capture, frozen pipeline execution, artifact upload, and cleanup all completed successfully.

# Runner / Python / gallery-dl Versions

- GitHub runner version: `2.337.0`
- Hosted compute region: `westus3`
- Runner OS: Ubuntu `24.04.4 LTS`
- Runner image: `ubuntu-24.04`, image version `20260831.293.1`
- Python: CPython `3.12.14`
- gallery-dl: `1.32.10`

# FloppyDisk Hosted Result

The frozen invocation completed successfully:

`python -m floppydisk --targets targets.txt --out links.txt --diagnostics diagnostics.txt`

The hosted console summary reported: **3 accepted, 0 invalid, 18 unique links**. The workflow step conclusion was `success`, establishing a successful FloppyDisk process result. Target-level unsupported behavior remained contained and did not become a pipeline failure.

# Target Outcome Summary

Using the corrected frozen Stage B/C semantics:

| Target | Outcome | Useful links | Excluded | Queued |
|---|---:|---:|---:|---:|
| Direct Wikimedia PNG (target-file line 3) | `ok` | 1 | 0 | 0 |
| Wikimedia Commons file page (line 6) | `ok` | 17 | 0 | 0 |
| Deliberate unsupported probe (line 9) | `unsupported` | 0 | 0 | 0 |

There were no `empty`, `extraction-error`, partial extraction-error, timeout, bad-JSON, invocation-error, or queued-unresolved outcomes.

# Accepted / Invalid Counts

- Accepted targets: **3**
- Invalid targets: **0**

# Unique Links

**18** qualifying unique links.

# Excluded Records

**0**

# Duplicates Removed

**0**

# Queued Unresolved

**0**

# Artifact Result

**PASS.** `actions/upload-artifact@v4` successfully uploaded both expected files under artifact name `floppydisk-results`.

- Artifact ID: `9869721892`
- Artifact ZIP size: **763 bytes**
- Artifact digest: `sha256:f701707b3fd7c0e64e7e5d3cdb4a7113afe21fe0d17d46d49907acde7692f2bf`
- `links.txt`: present, **3,311 bytes**
- `diagnostics.txt`: present, **382 bytes**
- Artifact expiry reported by GitHub: December 1, 2026

# links.txt Hosted Purity Verification

**PASS.** Byte-level inspection of the downloaded hosted artifact found:

- 18 non-empty lines
- 18 unique lines
- every line matched a single HTTP(S) URL with no whitespace
- no non-URL lines
- no headings, counts, errors, diagnostics, JSON, or explanatory text
- no interior blank lines
- final LF present
- LF line ending, not CRLF

Full hosted URLs were intentionally not reproduced in this report.

# diagnostics.txt Hosted Evidence

**PASS.** The hosted diagnostics file exists, is readable, is 382 bytes, contains 15 lines, and ends with a newline. It records the aggregate counts and the three target outcomes listed above. It preserves the unsupported-target stderr evidence without contaminating `links.txt`. The expected public probe URL is not reproduced here unnecessarily.

# Network / Site Restrictions Observed

The intentional `example.com` probe was classified `unsupported`, as designed. Both Wikimedia targets produced useful discovery evidence. No anti-bot response, datacenter-IP block, rate limit, authentication requirement, challenge page, timeout, or extractor failure was observed.

The job log also contains GitHub Actions warnings that Node.js 20-targeting action versions were forced onto Node.js 24. These warnings did not affect any step conclusion or artifact and do not indicate a FloppyDisk, gallery-dl, target, or network failure.

# No-Download Verification

The hosted command invoked only the frozen FloppyDisk boundary. The unchanged workflow contains no gallery-dl extraction command of its own and no media-download command. The frozen discovery seam uses metadata-only `-j`; neither the workflow nor hosted command uses `-J`. Uploaded evidence consists only of `links.txt` and `diagnostics.txt`; no media artifacts were produced or uploaded.

# Frozen Files Verification

The Stage D workflow and targets are unchanged from implementation commit `a5dc7bc997c36718633234d6f43e7f70f129007b`. No file under `floppydisk/`, no test, no fixture, and no workflow file changed during Phase 1-18. Phase 1-16 and Phase 1-17 remain unmodified. The Stage D implementation and Phase 1-16 report commits remain ancestors of `main`.

# Production Changes Made

**0.** No production, workflow, target, test, fixture, or configuration changes were made. This report is the only Phase 1-18 repository change.

# Known Unknowns

- Results remain one hosted run at one point in time; site and extractor behavior can change.
- Other public sites may impose anti-bot, authentication, rate-limit, or datacenter-IP restrictions not observed in this representative set.
- Signed or expiring CDN URL lifetime was not measured.
- Queue-record prevalence on other target classes remains unknown; this run produced zero queued records.
- The GitHub action runtime emitted Node 20 deprecation warnings; future action-version maintenance is separate from this frozen acceptance verdict.

# Stage D Verdict

# **PASS**

GitHub's hosted runner successfully executed the frozen FloppyDisk pipeline on `main` against representative public real targets, produced useful expected discovery evidence from two targets, contained the deliberately unsupported target without pipeline failure, and preserved pure link and diagnostic artifacts without downloading media. The central Phase 0 hosted-execution question is answered **YES**.

# Recommendation

STOP after this documentation-only evidence commit and push. Submit Stage D to Claude for independent review and a GO / FIX / STOP decision. Do not begin GitHub Pages.
