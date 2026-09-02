Timestamp: Wednesday, September 2, 2026 at 12:38 PM MDT
Location: Calgary, Alberta

# Stage

Phase 1-10 — Stage B B1/B2 correction.

# Goal

Surface real gallery-dl DataJob type-`-1` errors and unresolved type-6 Queue activity in plain discovery results without changing the approved subprocess seam or beginning Stage C.

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 12:38 PM MDT
Location: Calgary, Alberta

# Repository / Branch

- Repository: `C:/Users/dmcal/Documents/GitHub/FloppyDisk`
- Branch: `Phase-0`

# Baseline

- Tracked tree clean; branch six commits ahead of origin because the Phase 1-9 review was already tracked.
- gallery-dl version: 1.32.10.
- Existing suite: 59 passed in 0.06 seconds with zero warnings.
- Original Stage B implementation commit `77753adc7a921ebd262183b0b9f9e9c8eec649b3` present and unmodified.

# Claude FIX Being Addressed

- B1: DataJob can emit type-`-1` extraction-error records while exiting 0; the seam discarded them and falsely returned `ok`.
- B2: plain `-j` emits unresolved type-6 Queue records; the seam discarded them and made queued work indistinguishable from genuinely empty output.

# Real DataJob Behavior

The authoritative Phase 1-9 offline proof against gallery-dl 1.32.10 produced `[[-1, {"error": "HttpError", "message": "404 Not Found"}]]` with process exit 0. Therefore an exit code of zero is not sufficient evidence of extraction success under DataJob; the JSON record stream must be inspected.

# Files Changed

- `floppydisk/discover.py`
- `tests/test_discover.py`
- `tests/fixtures/PROVENANCE.md`
- Added `tests/fixtures/datajob-error.json`
- Added `tests/fixtures/mixed-error-url.json`
- Added `tests/fixtures/queue-records.json`
- Removed the misleading `tests/fixtures/extraction-error-stderr.txt`

This report is tracked in a separate documentation-only commit.

# DiscoveryResult Changes

- Added frozen plain `DiscoveryError(name, message)` data.
- Added `errors: tuple[DiscoveryError, ...]` to `DiscoveryResult`.
- Added `queued: int` to `DiscoveryResult`, defaulting to zero.
- Existing result fields and the `ok` property remain intact.

# Error-Record Handling

Type-`-1` records are validated and converted to FloppyDisk-owned error name/message data. Any such record makes the result status `extraction-error`, even when the process exits 0 and even when valid type-3 URL records are also present. Valid URL records remain available for later partial-result orchestration while failure classification wins.

The disproven special classification of process exit 4 as an extraction error was removed. Exit 64 remains `unsupported`; all other nonzero exits, including 4 and 8, are contained as `invocation-error` under the corrected authoritative table.

# Queue Handling

Each structurally valid type-6 record increments `DiscoveryResult.queued`. Queue records are not resolved, no additional invocation occurs, and the command remains plain `-j`. Queue-only output returns `ok` with `records == ()` and `queued > 0`; truly empty output returns `ok` with `records == ()` and `queued == 0`.

# Fixture / Provenance Changes

`datajob-error.json` preserves the real 1.32.10 DataJob error shape verified offline in Phase 1-9. `mixed-error-url.json` combines that verified shape with a compatible URL record to freeze error precedence while preserving partial records. `queue-records.json` is explicitly labeled synthetic schema material compatible with gallery-dl 1.32.10 Message.Queue. Provenance documentation was updated accordingly. The old synthetic stderr fixture implying exit-4 extraction behavior was removed.

# Red-Before-Green Evidence

Before production code changed, the two B1 tests were run against the existing seam:

```text
FF                                                                       [100%]
2 failed, 15 deselected in 0.06s
```

Both failures occurred at `assert not result.ok`; the current implementation returned `status='ok'` for both the error-only and mixed URL-plus-error payloads. After the fix, both pass.

# What Was Explicitly Not Changed

- Exact `gallery-dl -j -- <target>` argv and one-invocation-per-target model.
- `shell=False`, timeout, stdout/stderr capture, privacy behavior, and fatal `FileNotFoundError` behavior.
- Message.Url URL/extension preservation and filtering ownership.
- No `-J`, queue resolution, subprocess fan-out, gallery-dl import, Stage C orchestration, or Stage A changes.
- No allowlist, URL normalization, workflow, or output-writing changes.

# Tests Run

- `python -m pytest -p no:cacheprovider -q tests/test_discover.py`
- `python -m pytest -p no:cacheprovider -q`
- A direct mocked mixed-payload probe confirmed simultaneous error, URL, and queue preservation.

# Exact Test Results

Stage B:

```text
.................                                                        [100%]
17 passed in 0.04s
```

Full suite:

```text
...............................................................          [100%]
63 passed in 0.07s
```

Zero failures and zero warnings.

# Stage A Regression Result

All 46 frozen Stage A tests remain passing and no Stage A file changed. Total reconciliation: 46 Stage A + 17 Stage B = 63.

# Breadcrumbs Added

The existing `discover.py` breadcrumb was minimally updated:

- `BREADCRUMBS - WAS` now records the disproven Phase 1-2 assumption: DataJob type-`-1` errors can accompany exit zero.
- `BREADCRUMBS - IS` now records the durable rules that error records must be inspected because exit zero does not prove success, and unresolved plain-`-j` Queue records are counted rather than mistaken for empty output.

No breadcrumbs were added elsewhere.

# Protected Files Verification

- Frozen Stage A source/tests, README, `.gitignore`, `.gitattributes`, `.github/`, and `main`: untouched.
- Existing reports: untouched.
- Original Stage B implementation commit remains a reachable historical commit and was not amended.
- Correction commit contains only `discover.py`, `test_discover.py`, and fixture/provenance paths.

# Regressions

None observed. All 63 tests pass.

# Known Unknowns

- Which representative real targets emit Queue records and the magnitude of unresolved work remain later evidence.
- Frequency and classes of real DataJob error records on GitHub-hosted runs remain Stage D evidence.
- Percent-encoded extension and raw control-character observations remain unchanged.
- Queue resolution cost under `-J` remains deliberately unmeasured and out of scope.

# Git Status

After the implementation commit and before this report, the tracked tree was clean and `Phase-0` was seven commits ahead of `origin/Phase-0`. No push was performed.

# Implementation Commit

- Commit: `0c7605bf8429195ab125e78db683c683d0b1cfa6`
- Message: `fix: surface gallery-dl datajob errors and queued records`
- Parent: tracked Phase 1-9 review commit `cc9ce82cc9a5fddc78391170c29b2f8e741b0809`.

# Recommendation

Correction verdict: **PASS**. Send Stage B for Claude independent re-review and do not begin Stage C until that review returns GO.
