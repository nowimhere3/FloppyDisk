Timestamp: 2026-09-02 15:16:01 MDT
Location: Calgary, Alberta

# Stage

Phase 1-16 — Stage D: GitHub Actions Hosted Execution + First Real Run (pre-run implementation record)

# Goal

Run the frozen FloppyDisk pipeline on a manually triggered GitHub-hosted runner and preserve its output as a downloadable artifact without requiring the user's Windows desktop to remain online.

# Timestamp / Location

Timestamp: 2026-09-02 15:16:01 MDT  
Location: Calgary, Alberta

# Repository / Branch

Repository: `C:\Users\dmcal\Documents\GitHub\FloppyDisk`  
Branch: `Phase-0`

# Baseline

The tracked working tree was clean. Local `HEAD` and `origin/Phase-0` both resolved to `db93797a8cdcc6aaa5f75a2b9fc67b1178afb8f5`. The frozen suite passed with 88 tests, zero failures, and zero warnings.

# Files Changed

- `.github/workflows/extract-links.yml`
- `targets.txt`
- `README.md`
- `tests/test_workflow.py`

# Workflow Trigger

Manual `workflow_dispatch` only. No push, pull-request, or schedule trigger was introduced.

# Runner / Python Version

The workflow uses `ubuntu-latest`, `actions/checkout@v4`, and `actions/setup-python@v5` with Python 3.12. The job timeout is 30 minutes.

# gallery-dl Pin

The workflow installs exactly `gallery-dl==1.32.10` and records `gallery-dl --version` as hosted workflow evidence.

# Hosted Invocation

The workflow invokes the frozen product boundary from the repository root:

`python -m floppydisk --targets targets.txt --out links.txt --diagnostics diagnostics.txt`

No gallery-dl extraction, filtering, deduplication, or diagnostics logic was reproduced in YAML.

# Distinct Path Contract

The workflow supplies three distinct paths: `targets.txt`, `links.txt`, and `diagnostics.txt`.

# Artifact Contract

`actions/upload-artifact@v4` uploads `links.txt` and `diagnostics.txt` as `floppydisk-results`. The upload step uses `if: always()` and warns rather than concealing missing files after a pipeline-fatal failure.

# Logging / Privacy Contract

The workflow does not print or `cat` the targets, links, or diagnostics files. It relies on the frozen counts-only `GITHUB_STEP_SUMMARY` behavior in the Python CLI. No secrets, credentials, cookies, proxies, or authentication configuration were added.

# Failure Containment

The workflow does not reinterpret target-level outcomes. The frozen CLI keeps evidence-bearing target failures at exit 0 and reserves exit 1 for pipeline-fatal failures. Artifact upload remains eligible after failure so any generated evidence can be retained.

# No-Download Verification

The workflow invokes only the frozen Python pipeline. Static tests verify that YAML does not invoke gallery-dl extraction directly; the frozen discovery seam continues to use metadata-only `-j` behavior.

# Real Target Set

The starter set is deliberately small and public: one Wikimedia-hosted direct PNG, the corresponding Wikimedia Commons file page as an extractor-backed path, and the project's established unsupported `example.com` probe. The set uses no credentials or private/personal targets.

# Local Tests Run

- `python -m pytest -p no:cacheprovider -q tests/test_workflow.py`
- `python -m pytest -p no:cacheprovider -q`
- `git diff --check`
- Static inspection of triggers, action versions, dependency pin, invocation paths, artifact behavior, logging commands, and credential-related text

# Exact Local Results

- Stage D workflow tests: `8 passed in 0.03s`
- Complete suite: `96 passed in 0.49s`
- Failures: 0
- Warnings: 0

The first test run exposed two incorrect new test assertions (a version command was mistaken for extraction and the frozen parser's empty tuple was compared with a list). The assertions were corrected without changing product or workflow behavior, after which both suites passed.

# Protected Files Verification

No file under `floppydisk/` changed. No frozen Stage A, Stage B, or Stage C test or fixture changed. No existing report changed. No main-branch action occurred.

# Known Unknowns

- The actual GitHub-hosted installation and reported versions remain to be observed.
- Wikimedia and unsupported-target outcomes from a GitHub datacenter IP remain to be observed.
- Artifact contents, output sizes, and hosted links purity remain to be inspected after the first run.
- No local standalone YAML parser/actionlint executable was available; workflow shape was verified by eight repository tests and will receive GitHub's server-side validation when pushed.

# Implementation Commit

`a5dc7bc997c36718633234d6f43e7f70f129007b` — `phase 0d: add GitHub Actions hosted extraction workflow`

# Hosted Run Plan

Commit this report separately, push only `Phase-0`, manually dispatch **Extract image links**, wait for completion, inspect the run and downloaded artifact, and record the evidence in the next sequential Codex report without rewriting this record.

# Recommendation

Proceed to the authorized first hosted Phase 0 run. Do not begin GitHub Pages work.
