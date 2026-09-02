Timestamp: Wednesday, September 2, 2026 at 11:35 AM MDT
Location: Calgary, Alberta

# Stage

Phase 1-5 — Stage A R1 correction.

# Goal

Correct only the control-character filtering defect identified by Claude, prove the correction automatically, and stop before Stage B.

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 11:35 AM MDT
Location: Calgary, Alberta

# Repository / Branch

- Repository: `C:/Users/dmcal/Documents/GitHub/FloppyDisk`
- Branch: `Phase-0`
- Both matched the required workspace before implementation.

# Baseline

- HEAD was `7a7b9f0a1e97262c3b76e2ab80e8620940319a78`, the original Stage A commit.
- The tracked working tree was clean and the branch was one commit ahead of `origin/Phase-0`.
- Five project-memory files under `Claude and Codex Reports/` were untracked and were preserved unchanged.
- Existing Stage A result from Claude's independent review: 43 passed with zero warnings.

# Claude FIX Being Addressed

R1: raw URL strings containing `\n`, `\r`, or `\t` could pass extension detection because `urlsplit()` removed those characters before parsing, while filtering returned the original unsanitized string. The existing text-payload test exercised pseudo-scheme rejection and did not prove control-character containment.

# Files Changed

Committed correction files:

- `floppydisk/filters.py`
- `tests/test_filters.py`

This correction report is separately authorized and is not part of the implementation commit.

# What Was Fixed

- Added an early guard in `_http_url_path()` that rejects any raw candidate URL containing newline, carriage return, or tab before `urlsplit()` can sanitize it.
- Unsafe URLs are rejected rather than normalized, sanitized, mutated, or returned in altered form.
- Renamed the misleading text pseudo-scheme test to state what it actually proves.
- Added observable filtering regressions for valid-looking HTTPS candidate strings containing each prohibited control character.

# What Was Explicitly Not Changed

- The single strict six-format allow contract remained exactly `jpg`, `jpeg`, `png`, `gif`, `webp`, and `avif`.
- Metadata precedence, path fallback, query preservation, pseudo-scheme rejection, extensionless rejection, deduplication, ordering, and target parsing were unchanged.
- Existing architectural breadcrumbs were unchanged.
- No production file other than `floppydisk/filters.py` changed.
- No Stage B/C/D code, discovery seam, subprocess logic, network behavior, workflow, or packaging was added.
- The original Stage A commit was not amended.

# Tests Run

Pre-fix regression demonstration:

`python -m pytest -p no:cacheprovider -q tests/test_filters.py`

Final complete Stage A suite:

`python -m pytest -p no:cacheprovider -q`

Direct rejection probe:

`filter_image_urls()` was invoked separately with HTTPS strings containing `\n`, `\r`, and `\t`.

# Exact Test Results

Before the production fix, the newly added cases produced the intended red proof:

```text
.....................................FFF...                              [100%]
3 failed, 40 passed in 0.07s
```

Each failure showed the raw control-character URL being returned by `filter_image_urls()`.

After the fix, the complete Stage A suite produced:

```text
..............................................                           [100%]
46 passed in 0.04s
```

Zero failures and zero warnings.

The direct probe returned:

```text
[[], [], []]
```

confirming direct rejection of newline, carriage-return, and tab candidates.

# Regression Test Added

`test_http_urls_with_control_characters_are_rejected` is parametrized over three observable raw HTTPS candidates:

- A newline string with the dangerous two-line shape `https://example.com/harmless\nhttps://attacker.example/injected.jpg`.
- A carriage return embedded before a `.jpg` suffix.
- A tab embedded before a `.jpg` suffix.

The cases failed against the pre-fix implementation and pass after the guard.

# Regressions

None observed. All 43 prior Stage A cases and the three new R1 cases pass.

# Known Unknowns

- Whether a real gallery-dl record ever carries these raw control characters remains a Stage B evidence question and does not affect the pure rejection contract.
- The previously documented percent-encoded-extension behavior remains outside this correction.
- No human testing was required or requested.

# Breadcrumbs Added

None — existing Stage A architectural breadcrumbs remain correct and sufficient.

# Protected Files Verification

- The correction commit contains exactly `floppydisk/filters.py` and `tests/test_filters.py`.
- `floppydisk/cli.py`, `floppydisk/__init__.py`, and `floppydisk/__main__.py` were untouched.
- README, `.gitignore`, and `.gitattributes` were untouched.
- Existing manual, Claude reports, and Codex reports were untouched.
- `main`, `.github/`, `discover.py`, and all future-stage files were untouched or remain absent.

# Git Status

After the correction commit and before creating this report, the tracked working tree was clean and `Phase-0` was two commits ahead of `origin/Phase-0`. Git status listed only the five preserved untracked project-memory files. After this report, this new authorized untracked report is the sixth project-memory file.

No push was performed.

# Commit

- Commit: `43e657ba0493e8f66385be925193e1474211ec0c`
- Message: `fix: reject control characters in image URLs`
- Branch: `Phase-0`
- Scope: exactly the two authorized correction files.

# Deviations / Surprises

None. The new tests reproduced Claude's R1 finding exactly, and the minimal early guard corrected all three cases without altering architecture or other contracts.

# Recommendation

Correction verdict: **PASS**. Stage A is ready for Claude independent re-review. Stage B remains unauthorized until that review returns GO.
