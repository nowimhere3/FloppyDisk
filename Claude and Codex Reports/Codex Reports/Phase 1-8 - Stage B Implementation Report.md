Timestamp: Wednesday, September 2, 2026 at 12:19 PM MDT
Location: Calgary, Alberta

# Stage

Phase 1-8 — Stage B: gallery-dl discovery seam.

# Goal

Create and automatically prove the single external-process boundary between one target URL and plain FloppyDisk-owned discovery data, without beginning orchestration or workflow work.

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 12:19 PM MDT
Location: Calgary, Alberta

# Repository / Branch

- Repository: `C:/Users/dmcal/Documents/GitHub/FloppyDisk`
- Branch: `Phase-0`

# Baseline

- Tracked tree clean; reports tracked; branch three commits ahead of origin.
- Stage A frozen at correction commit `43e657ba0493e8f66385be925193e1474211ec0c`.
- Existing suite: 46 tests passed in 0.05 seconds with zero warnings.
- Locally installed gallery-dl was 1.32.4 and therefore was not used for fixtures.

# Files Changed

Implementation commit:

- `floppydisk/discover.py`
- `tests/test_discover.py`
- Seven files under `tests/fixtures/`

This report is tracked separately in its documentation-only commit.

# gallery-dl Version

gallery-dl `1.32.10`, installed exactly as required and verified with `gallery-dl --version`.

# Fixture Provenance

Seven fixture/provenance files were added. `success.json` was captured verbatim from gallery-dl 1.32.10 using `-j` against its deterministic `directlink` extractor and an `example.com` `.jpg` URL. That extractor emits metadata without fetching the example host, so no live website or media download was used.

`mixed-url-records.json` is a static schema fixture derived from the captured 1.32.10 Message.Url shape, combining metadata-supplied, empty-extension, `ytdl:`, and `text:` cases that cannot originate from one extractor. Malformed, empty, unsupported-stderr, and extraction-error-stderr conditions are represented by separate static files. `PROVENANCE.md` records these distinctions and the capture command/version.

# What Was Implemented

- A frozen `DiscoveryRecord` containing a URL and optional extension string.
- A frozen `DiscoveryResult` containing status, records, captured stderr, return code, and an `ok` property.
- One `subprocess.run` invocation per `discover_target()` call.
- Type-3 Message.Url selection from one JSON array while ignoring non-URL messages.
- Plain-data preservation for extractor metadata, empty extensions, and pseudo-scheme URLs so the frozen Stage A filter remains the filtering owner.
- Structured containment of successful, unsupported, extraction-error, timeout, malformed JSON, empty-output, and other invocation-error outcomes.
- Missing executable remains a fatal/preflight `FileNotFoundError` class for later orchestration.

# What Was Explicitly Not Implemented

- No Stage C orchestration, argparse completion, target-file handling, output writing, or diagnostics writing.
- No Stage D workflow, GitHub Actions, artifact upload, or real hosted acceptance.
- No image filtering, allowlist change, URL normalization, HEAD probing, retries, concurrency, authentication, cookies, proxying, packaging, or dependency automation.
- No gallery-dl import or vendoring.

# Subprocess / Invocation Contract

Each call invokes exactly:

```text
gallery-dl -j -- <target>
```

The implementation uses an argv list, `shell=False`, `capture_output=True`, text mode, `check=False`, and a caller-supplied timeout. It never uses `-i`, batching, `-g`, shell concatenation, or a download-capable option. Stderr is returned as data and never printed.

# Failure Classification

- Exit 0 with valid JSON: `ok` with parsed records.
- Exit 0 with empty/whitespace stdout: `ok` with zero records.
- Exit 64: `unsupported`.
- Exit 4: `extraction-error`.
- Timeout: `timeout`, contained without raising.
- Malformed JSON or invalid record shape: `bad-json`.
- Other nonzero exit: `invocation-error`.
- Missing executable: deliberately propagates `FileNotFoundError` as the fatal preflight class.

# Tests Run

Stage B only:

`python -m pytest -p no:cacheprovider -q tests/test_discover.py`

Full suite:

`python -m pytest -p no:cacheprovider -q`

# Exact Test Results

Stage B:

```text
.............                                                            [100%]
13 passed in 0.04s
```

Full suite:

```text
...........................................................              [100%]
59 passed in 0.08s
```

Both runs had zero failures and zero warnings. Normal tests use mocks and static fixtures; they require no live website.

# Stage A Regression Result

All 46 frozen Stage A cases remain present and passing. No Stage A source or test file changed.

# Percent-Encoding Observation

With pinned 1.32.10, `gallery-dl -j -- https://cdn.example.com/photo%2Ejpg` is unsupported by the direct-link extractor and exits 64, so that extractor supplies no usable extension metadata for the encoded-dot case. This does not establish behavior for every site-specific extractor. The frozen filter was not changed; evidence from later representative extractor fixtures remains needed.

# Control-Character Observation

No captured 1.32.10 Message.Url value contained raw newline, carriage return, or tab characters. Static fixtures did not manufacture such a gallery-dl claim. The frozen Stage A filter already rejects all three safely and was not changed.

# Regressions

None observed. The full 59-test suite passes.

# Known Unknowns

- Whether site-specific extractors supply metadata for percent-encoded path extensions remains unproven.
- Whether real gallery-dl Message.Url data can contain raw control characters remains unobserved.
- Real network behavior, unknown-extension frequency, and expiring URL behavior remain Stage D evidence.
- Exit codes other than the specifically approved 64 and 4 cases currently share the contained `invocation-error` classification; later orchestration may classify additional documented bit values without changing this seam's containment contract.

# Breadcrumbs Added

`floppydisk/discover.py` contains `BREADCRUMBS - WAS`, `BREADCRUMBS - IS`, and `BREADCRUMBS - WILL BE` beside the seam. They preserve the runtime correction history; why invocation is per-target, uses `-j`, passes argv after `--`, avoids `-i`, captures stderr, and keeps gallery-dl external; and why callers receive discovery-neutral data that permits a future engine or evidence-backed extension strategy. They also record that importing or vendoring gallery-dl would materially change the architecture/licensing analysis.

# Protected Files Verification

- Stage A production and test files: unchanged.
- README, `.gitignore`, `.gitattributes`, existing reports, and `main`: unchanged.
- `.github/`, `targets.txt`, and Stage C/D artifacts: absent.
- Search across production source found gallery-dl knowledge only in `floppydisk/discover.py`.
- Implementation commit contains exactly the authorized discovery, test, and fixture paths.

# Git Status

After the implementation commit and before this report, the tracked tree was clean and `Phase-0` was four commits ahead of `origin/Phase-0`. No push was performed.

# Implementation Commit

- Commit: `77753adc7a921ebd262183b0b9f9e9c8eec649b3`
- Message: `phase 0b: isolated gallery-dl discovery seam`
- Nine files: one production module, one test module, and seven fixture/provenance files.

# Deviations / Surprises

- The installed 1.32.4 package was upgraded to the mandated 1.32.10 before fixture investigation.
- A deterministic direct-link `-j` capture was possible without live-site network access.
- Pinned 1.32.10's direct-link extractor does not recognize an encoded-dot path ending in `photo%2Ejpg`; it returns unsupported rather than metadata.

# Recommendation

Stage B verdict: **PASS**. Stop before Stage C and send the implementation plus this separately tracked report for Claude independent review.
