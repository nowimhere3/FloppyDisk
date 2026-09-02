# Phase 1-11 — Stage B Correction Independent Architecture Review

Timestamp: Wednesday, September 2, 2026 at 12:48 PM MDT
Location: Calgary, Alberta

---

# Stage

Phase 1-11 — Independent review of Codex's Phase 1-10 Stage B B1/B2 correction. Architect / Orchestrator only. No production code, tests, or fixtures modified.

---

# Goal

Independently verify — against the repository and against real gallery-dl 1.32.10 behavior — that B1 (DataJob type `-1` error records invisible behind exit 0) and B2 (unresolved type-6 Queue records indistinguishable from empty output) are closed; that the approved subprocess seam is unchanged and did not gain queue resolution; that the disproven exit-4 assumption was removed; that fixture provenance remains honest; and that Stage A remains frozen.

Then issue **GO**, **FIX**, or **STOP**, and state whether the repository is safe to checkpoint-push.

---

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 12:48 PM MDT
Location: Calgary, Alberta

Cross-checked two ways: system local clock and UTC (`2026-09-02 18:48Z`) converted at UTC−6 for Mountain Daylight Time. Both agree.

---

# Repository / Branch / Git Status

| Check | Result |
|---|---|
| Repository root | `C:/Users/dmcal/Documents/GitHub/FloppyDisk` — **matches expected** |
| Current branch | `Phase-0` — **matches expected** |
| HEAD (before my report commit) | `96818b96eb5c87126d519bf90a185d20d80e6fc1` |
| Position | Ahead of `origin/Phase-0` by 8 commits (not pushed) |
| Tracked working tree | **Clean** |
| Untracked | **None** |
| `main` | Still `b5e197e Initial commit` — untouched |

```text
96818b9  docs: add Phase 1-10 Stage B correction report
0c7605b  fix: surface gallery-dl datajob errors and queued records
cc9ce82  docs: add Phase 1-9 Stage B architecture review
5fa0695  docs: add Phase 1-8 Stage B implementation report
77753ad  phase 0b: isolated gallery-dl discovery seam          <- original Stage B, intact
435adc8  docs: track operating manual and phase reports as repository memory
43e657b  fix: reject control characters in image URLs           <- Stage A frozen
7a7b9f0  phase 0a: targets parsing and strict image allowlist
b5e197e  Initial commit
```

Stage A history intact. Original Stage B commit intact. Phase 1-9 review commit present. Phase 1-10 implementation and report commits present. Linear history, no rewrites.

**Nothing was cleaned, restored, staged, stashed, or modified during this review**, except the separately authorized Phase 1-11 report commit recorded at the end.

---

# Inputs Reviewed

1. **`AI-Assisted Development Operating Manual.md`** — read in full earlier in this session. Verified unchanged before relying on that read: **41,204 bytes, mtime Sep 2 10:22, sha256 prefix `1eee4a7373411647`** — byte-identical. Content is in context.
2. **`Phase 1-9 - Stage B Architecture Review.md`** — my own FIX definition and corrected classification table, applied here as the standard.
3. **`Phase 1-10 - Stage B Correction Report.md`** — read in full. Treated as **evidence, not proof** (manual §46).
4. **`Phase 1-2 - Architecture Amendment.md`** and **`Phase 1-6`** — consulted for the approved seam contract and the frozen Stage A baseline.
5. **gallery-dl 1.32.10 itself** — re-ran the offline `DataJob` error proof to re-derive the authoritative record shape.
6. **The repository** — both new commit objects, complete diffs, all source, tests, and fixtures, plus direct execution of the committed code.

---

# Implementation Correction Commit Verification

| Claim | Verification | Result |
|---|---|---|
| Commit `0c7605bf…` exists | `git cat-file -t` → `commit` | **CONFIRMED** |
| On `Phase-0` | `git branch --contains` → `Phase-0` only | **CONFIRMED** |
| Message `fix: surface gallery-dl datajob errors and queued records` | `git log -1 --format=%s` | **CONFIRMED** — exact |
| Parent | `cc9ce82…` (my Phase 1-9 review commit) | **CONFIRMED** |
| **Original Stage B `77753adc…` NOT amended** | object still resolves; still an ancestor of HEAD; original date `12:19:14` preserved | **CONFIRMED** |
| Correction is a follow-up commit | linear chain `77753ad → 5fa0695 → cc9ce82 → 0c7605b` | **CONFIRMED** |
| Only authorized paths changed | see below | **CONFIRMED** |

```text
M	floppydisk/discover.py
M	tests/test_discover.py
M	tests/fixtures/PROVENANCE.md
A	tests/fixtures/datajob-error.json
A	tests/fixtures/mixed-error-url.json
A	tests/fixtures/queue-records.json
D	tests/fixtures/extraction-error-stderr.txt
```

Seven paths, all within the authorized set (`floppydisk/discover.py`, `tests/test_discover.py`, `tests/fixtures/**`). **No Stage A source or test file appears.** No protected file appears. No Stage C/D artifact appears.

Change size: **131 insertions, 12 deletions** — 52 lines of production change. Proportionate.

**Implementation commit verdict: CLEAN.**

---

# Phase 1-10 Report Commit Verification

Codex stated the report was committed separately but did not give the hash. I identified it independently.

**Documentation commit: `96818b96eb5c87126d519bf90a185d20d80e6fc1`**
Message: `docs: add Phase 1-10 Stage B correction report`
Parent: `0c7605bf…` (the correction commit)

Contents — exactly one file:

```text
A	Claude and Codex Reports/Codex Reports/Phase 1-10 - Stage B Correction Report.md
```

No production files, no tests, no fixtures, no edits to older reports, no historical rewrites. Implementation and documentation history remain properly separated (manual §56).

**Report commit verdict: CLEAN.**

---

# B1 Verification

### The production change

```python
if item[0] == -1:
    if len(item) < 2 or not isinstance(item[1], dict):
        raise ValueError("gallery-dl DataJob error record has an invalid shape")
    name = item[1].get("error")
    message = item[1].get("message")
    if not isinstance(name, str) or not isinstance(message, str):
        raise ValueError("gallery-dl DataJob error details are invalid")
    errors.append(DiscoveryError(name, message))
    continue
...
status: DiscoveryStatus = "extraction-error" if errors else "ok"
```

### Independent verification against the real tool

I re-derived the authoritative shape offline against gallery-dl 1.32.10 — building a real `DataJob` and forcing an `HttpError` — then compared it to the committed fixture:

```text
exit code   : 0
real shape  : [[-1, {"error": "HttpError", "message": "404 Not Found"}]]
fixture     : [[-1, {"error": "HttpError", "message": "404 Not Found"}]]

FIXTURE MATCHES REAL 1.32.10 SHAPE: True
```

Behavior through the committed parser:

```text
records: ()   errors: (DiscoveryError(name='HttpError', message='404 Not Found'),)   queued: 0
```

End-to-end through `discover_target` with a mocked exit-0 subprocess: **`status == "extraction-error"`, `ok is False`.**

| Requirement | Verdict |
|---|---|
| Type `-1` records detected | **MET** |
| exit 0 + any `-1` → `extraction-error` | **MET** |
| Error info preserved as plain FloppyDisk data | **MET** — `DiscoveryError(name, message)`, frozen, two `str` fields |
| Representation small, plain, sufficient | **MET** — no gallery-dl types, carries the exception class name and message Stage C needs to report |

**B1 verdict: CLOSED.** Exit code 0 no longer implies extraction success.

---

# Mixed Error + URL Verification

This was the highest-value regression I specified in Phase 1-9, because a naive fix still loses the failure when some URLs parse successfully. Probed directly against the committed code:

```text
mixed-error-url.json ->
  status  : extraction-error
  ok      : False
  records : (DiscoveryRecord(url='https://cdn.example.com/surviving.jpg', extension='jpg'),)
  errors  : (DiscoveryError(name='HttpError', message='404 Not Found'),)
```

| Requirement | Verdict |
|---|---|
| Does **not** report simple `ok` | **MET** |
| Valid discovered records remain available | **MET** — the surviving URL record is preserved, not discarded |
| Status visibly reflects `extraction-error` | **MET** |
| Failure not lost because some URLs were discovered | **MET** |

The implementation returns `DiscoveryResult(status, records, …)` — records are passed through unchanged while the error drives the status. **Partial-result evidence is preserved for Stage C exactly as intended.**

**Mixed precedence verdict: CORRECT.**

---

# B2 / Queue Verification

### The production change

```python
if item[0] == 6:
    if len(item) < 3 or not isinstance(item[1], str) or not isinstance(item[2], dict):
        raise ValueError("gallery-dl Message.Queue record has an invalid shape")
    queued += 1
    continue
```

The `[6, url, kwdict]` shape matches `DataJob.handle_queue`, which emits `(Message.Queue, url, kwdict)`.

### Independent probes

| Case | Result | Verdict |
|---|---|---|
| One queue record | `queued == 1` | **MET** |
| Two queue records (fixture) | `queued == 2`, `records == ()` | **MET** |
| Three queue records | `queued == 3` | **MET** |
| Queue-only payload | `status == "ok"`, `records == ()`, `queued == 2` | **MET** |
| Genuinely empty payload | `status == "ok"`, `records == ()`, `queued == 0` | **MET** |

Side by side, the distinction Stage C needs is now available:

```text
queue-only : status=ok  records=0  queued=2
empty      : status=ok  records=0  queued=0
DISTINGUISHABLE: PASS
```

**B2 verdict: ADDRESSED.** Queue activity is visible and countable without being resolved.

---

# Subprocess Contract Verification

Verified by executing the committed code with a mocked subprocess and inspecting the actual call:

```text
argv  : ['gallery-dl', '-j', '--', 'https://t.example/x']
kwargs: {'capture_output': True, 'text': True, 'timeout': 7.5, 'check': False, 'shell': False}
```

| Requirement | Verdict |
|---|---|
| argv still exactly `gallery-dl -j -- <target>` | **MET** |
| No `-J` | **MET** |
| No `-i` | **MET** |
| No `-g` | **MET** |
| One invocation per `discover_target` call | **MET** |
| `shell=False` | **MET** |
| Timeout retained | **MET** — caller-supplied, passed through |
| stdout/stderr captured | **MET** |

**Critically — no queue fan-out.** I fed a two-queue payload through `discover_target` and counted invocations:

```text
invocations for a 2-queue payload: 1  (must be 1)  PASS
queued reported: 2
```

The correction makes queue activity **visible, not resolved** — exactly as specified. The `git diff` confirms `subprocess.run` was not touched at all; the only production changes are in the data model and `_parse_records`.

**Subprocess contract verdict: UNCHANGED AND CORRECT.**

---

# Corrected Failure Classification Review

`_failure_status` diff confirms the disproven special case was removed:

```diff
 def _failure_status(returncode: int) -> DiscoveryStatus:
     if returncode == 64:
         return "unsupported"
-    if returncode == 4:
-        return "extraction-error"
     return "invocation-error"
```

Every row of the Phase 1-9 corrected table verified end-to-end against the committed code:

| Condition | Required | Observed | Verdict |
|---|---|---|---|
| exit 0 + type-3, no `-1` | `ok` | `ok` | **PASS** |
| exit 0 + nothing of interest | `ok` (genuinely empty) | `ok` | **PASS** |
| exit 0 + any `-1` | `extraction-error` | `extraction-error` | **PASS** |
| exit 0 + mixed URL + `-1` | `extraction-error` | `extraction-error` | **PASS** |
| exit 0 + type-6 queue only | `ok` with `queued > 0` | `ok`, `queued=2` | **PASS** |
| exit 64 | `unsupported` | `unsupported` | **PASS** |
| **exit 4** | `invocation-error` | `invocation-error` | **PASS — old assumption removed** |
| exit 8 | `invocation-error` | `invocation-error` | **PASS** |
| timeout | `timeout` | `timeout` | **PASS** |
| malformed JSON | `bad-json` | `bad-json` | **PASS** |
| missing executable | fatal `FileNotFoundError` | raises | **PASS** |

**Classification verdict: MATCHES THE CORRECTED TABLE EXACTLY.**

---

# Fixture / Provenance Review

### Added

**`datajob-error.json`** — `[[-1, {"error": "HttpError", "message": "404 Not Found"}]]`. **I verified this is JSON-identical to real gallery-dl 1.32.10 DataJob output** by regenerating it offline. `PROVENANCE.md` attributes it correctly: *"records the real gallery-dl 1.32.10 DataJob error shape verified offline in the Phase 1-9 independent review."* That wording is accurate — it describes a shape verified by the review rather than claiming a fresh verbatim capture, which is the honest framing.

**`mixed-error-url.json`** — one type-3 record plus the verified error record. Correctly freezes URL/error coexistence.

**`queue-records.json`** — two `[6, url, {"_extractor": …}]` records. Structurally valid against `handle_queue`'s emission shape.

### Removed

**`extraction-error-stderr.txt`** — deleted, along with the `PROVENANCE.md` sentence that described it. The misleading exit-4 assumption is gone from both the fixtures and the provenance narrative.

### Provenance honesty

`PROVENANCE.md` explicitly labels the synthetic material:

> `queue-records.json` is synthetic schema material, **clearly labeled here rather than presented as a live capture**. Its records are structurally compatible with gallery-dl 1.32.10 Message.Queue (`[6, url, metadata]`)…

**No synthetic fixture masquerades as observed upstream evidence.** The document now distinguishes three tiers cleanly: verbatim capture (`success.json`, `unsupported-stderr.txt`), verified-shape reconstruction (`datajob-error.json`, `mixed-error-url.json`), and declared-synthetic schema material (`mixed-url-records.json`, `queue-records.json`).

**Fixture / provenance verdict: ACCURATE AND HONEST.** This directly resolves the one provenance defect from Phase 1-9.

---

# Red-Before-Green Review

Codex claims the two B1 tests produced `2 failed, 15 deselected` before the production change, both failing at `assert not result.ok`.

**I reproduced this independently and without altering git history**, by extracting the pre-correction `discover.py` read-only from `cc9ce82` into a scratchpad and running the post-correction test file against it:

```text
pre-fix discover.py has DiscoveryError?  0   (confirmed absent)
pre-fix discover.py has queued?          0   (confirmed absent)

$ python -m pytest -p no:cacheprovider -q -k "datajob_error"
>       assert not result.ok
E       AssertionError: assert not True
E        +  where True = DiscoveryResult(status='ok',
E              records=(DiscoveryRecord(url='https://cdn.example.com/surviving.jpg', extension='jpg'),),
E              stderr='', returncode=0).ok

FAILED tests/test_discover.py::test_datajob_error_record_wins_over_exit_zero
FAILED tests/test_discover.py::test_datajob_error_wins_while_valid_url_records_survive
2 failed, 15 deselected in 0.08s
```

**`2 failed, 15 deselected` matches Codex's claim exactly**, including the failure site and the reason. The failure output even displays the Phase 1-9 defect verbatim: the mixed payload returning `status='ok'` while carrying a surviving URL record.

I went further than Codex reported and checked the B2 tests too:

```text
$ python -m pytest -p no:cacheprovider -q -k "queue"     [pre-fix code]
E       AttributeError: 'DiscoveryResult' object has no attribute 'queued'
FAILED test_one_queue_record_is_visible_without_resolution
FAILED test_multiple_queue_records_are_distinct_from_empty_output
2 failed, 15 deselected

$ python -m pytest -p no:cacheprovider -q                 [whole file, pre-fix code]
5 failed, 12 passed in 0.09s
```

All **four** new tests fail against the pre-correction implementation, plus the reclassified exit-4 case — five failures total, and all pass after the fix. **The tests are behavioral, not tautological.**

**Red-before-green verdict: INDEPENDENTLY CONFIRMED.**

---

# Discovery Data Model Review

```python
@dataclass(frozen=True)
class DiscoveryRecord:
    url: str
    extension: str | None

@dataclass(frozen=True)
class DiscoveryError:
    name: str
    message: str

@dataclass(frozen=True)
class DiscoveryResult:
    status: DiscoveryStatus
    records: tuple[DiscoveryRecord, ...]
    stderr: str
    returncode: int | None
    errors: tuple[DiscoveryError, ...] = ()
    queued: int = 0

    @property
    def ok(self) -> bool:
        return self.status == "ok"
```

| Requirement | Verdict |
|---|---|
| Proportionate and plain | **MET** — three small frozen dataclasses, stdlib types only |
| No gallery-dl classes leaked | **MET** — `str`, `int`, `tuple`, `None` |
| No Stage C policy leaked in | **MET** — no thresholds, no formatting, no output decisions |
| Exposes status | **MET** |
| Exposes records | **MET** |
| Exposes errors | **MET** — new |
| Exposes queued count | **MET** — new |
| Exposes stderr | **MET** |
| Exposes return code | **MET** |
| `ok` consistent with corrected semantics | **MET** — `status == "ok"`, so `extraction-error` is correctly not ok |

The new fields carry defaults (`errors=()`, `queued=0`), so the existing positional constructions in the failure and timeout branches remain valid without change — a tidy, low-churn addition.

**Data model verdict: PROPORTIONATE AND SUFFICIENT FOR STAGE C.**

*Carry-forward for Stage C (not a defect):* a queue-only result is correctly `ok` with `queued > 0`. Stage C's diagnostics must therefore consult `queued` before reporting "0 links", or a queued profile target will read as an empty one. The data is now available; using it is Stage C's responsibility, and it belongs in the Stage C handoff.

---

# Filtering Ownership

Grep across `discover.py` for `IMAGE_EXTENSIONS|jpg|jpeg|webp|avif|allowlist|urlsplit|unquote|normali|HEAD|requests|filters` returns **nothing**.

`discover.py` still does not enforce the six-format allowlist, normalize URLs, strip query strings, resolve extensions over the network, perform HEAD requests, or import any `filters.py` policy. Type-3 records remain raw discovery data — `ytdl:` and `text:` URLs and empty extensions still pass through untouched, as frozen by `test_structured_records_tolerate_metadata_empty_and_pseudo_urls`.

Boundary re-verified across the whole production tree: gallery-dl knowledge and `subprocess` remain **confined to `discover.py`**. Imports are `dataclasses`, `json`, `subprocess`, `typing`.

**Filtering ownership verdict: PRESERVED — filtering remains Stage A's.**

---

# Breadcrumb Review

The update is minimal and additive — two sentences, no restructuring:

**`BREADCRUMBS - WAS`** gained:
> *"Phase 1-9 then disproved the assumption that -j extraction failures use a nonzero exit: DataJob emits type -1 error records while returning zero."*

This is **real, verifiable project history** (manual §28) and records precisely the assumption a future agent might otherwise re-introduce.

**`BREADCRUMBS - IS`** gained:
> *"DataJob error records are inspected because exit zero does not prove success, and unresolved plain -j Queue records are counted rather than mistaken for empty output."*

Both new clauses state durable architectural **WHY**, not what changed in a commit. All pre-existing seam reasoning — sole gallery-dl ownership, per-target invocation, `-j` over `-g`, argv after `--`, no `-i`, stderr capture, the subprocess boundary and its licensing implication — is intact and unedited. `BREADCRUMBS - WILL BE` is unchanged.

The breadcrumb remains concise architectural memory and has **not** turned into a bug diary.

**Breadcrumb verdict: CORRECT.**

---

# Tests Inspected

All 17 read, including the four new cases.

### New tests

- **`test_datajob_error_record_wins_over_exit_zero`** — parses the real error fixture; asserts `not ok`, `extraction-error`, exact error name/message, and no records.
- **`test_datajob_error_wins_while_valid_url_records_survive`** — **the key regression.** Asserts `not ok`, `extraction-error`, the error preserved, **and** the surviving `DiscoveryRecord`. This is the test that prevents a naive future "fix" from discarding partial results or losing the failure.
- **`test_one_queue_record_is_visible_without_resolution`** — asserts `queued == 1`, and re-asserts the **exact argv** plus `"-J" not in argv` inside the queue test itself. Good placement: the no-resolution guarantee is frozen at the point of temptation.
- **`test_multiple_queue_records_are_distinct_from_empty_output`** — runs both payloads in one test and asserts `queued == 2` vs `queued == 0` with identical `ok`/`records`. Freezes the distinction directly rather than in two separable tests.

### Coverage against the brief

Real `-1` error, mixed URL + error, queue count, multiple queues, queue-only vs empty, existing `Message.Url` behavior, invocation argv, one invocation per target, `-j` retained, no `-J`, no `-i`, timeout, stderr privacy (`capsys` on two tests), malformed JSON, unsupported, invocation-error, fatal `FileNotFoundError` — **all covered.**

### Co-drift assessment

Expected values are hardcoded literals: `"HttpError"`, `"404 Not Found"`, `2`, `0`, `["gallery-dl","-j","--", …]`, explicit `DiscoveryRecord(...)`. No test imports a constant from `discover.py` and asserts it against itself. The error/mixed/queue tests parse **fixture files**, not hand-assembled dicts, so they exercise real parsing. **No co-drift risk found.**

The exit-4 parametrized case was correctly updated from `extraction-error` to `invocation-error` and repointed to `unsupported-stderr.txt`, since the misleading fixture was deleted.

---

# Independent Tests Run

Run by me, unmodified, in the repository.

```text
$ python -m pytest -p no:cacheprovider -q tests/test_discover.py
.................                                                        [100%]
17 passed in 0.03s

$ python -m pytest -p no:cacheprovider -q
...............................................................          [100%]
63 passed in 0.06s
```

Plus a Stage-A-only run to confirm the frozen baseline:

```text
$ python -m pytest -p no:cacheprovider -q tests/test_filters.py tests/test_targets.py
46 passed in 0.04s
```

---

# Exact Test Results

| Metric | Stage B only | Full suite |
|---|---|---|
| Command | `python -m pytest -p no:cacheprovider -q tests/test_discover.py` | `python -m pytest -p no:cacheprovider -q` |
| Collected | **17** | **63** |
| Passed | **17** | **63** |
| Failed | **0** | **0** |
| Errors | **0** | **0** |
| Skipped | **0** | **0** |
| Warnings | **0** | **0** |
| Duration | 0.03 s | 0.06 s |
| pytest / Python | 9.1.1 / 3.14.2 | 9.1.1 / 3.14.2 |

**Both results reproduce Codex's claims exactly.** Reconciliation confirmed: **46 Stage A + 17 Stage B = 63**, and the Stage B count rises from 13 to 17 by exactly the four new cases.

---

# Stage A Regression Verification

Stage A files compared **blob-to-blob** against the frozen Stage A baseline `43e657b`:

```text
IDENTICAL TO FROZEN  floppydisk/filters.py
IDENTICAL TO FROZEN  floppydisk/cli.py
IDENTICAL TO FROZEN  floppydisk/__init__.py
IDENTICAL TO FROZEN  floppydisk/__main__.py
IDENTICAL TO FROZEN  tests/test_filters.py
IDENTICAL TO FROZEN  tests/test_targets.py
```

All 46 Stage A tests pass. **No Stage A regression is possible** — the files are byte-identical to the frozen baseline. No Stage A contract changed.

---

# Protected Files Verification

| Protected item | Method | Result |
|---|---|---|
| `floppydisk/filters.py` | blob identical to `43e657b` and across the correction | **UNCHANGED** |
| `floppydisk/cli.py` | blob identical | **UNCHANGED** |
| `floppydisk/__init__.py` / `__main__.py` | blob identical | **UNCHANGED** |
| `tests/test_filters.py` / `test_targets.py` | blob identical | **UNCHANGED** |
| `README.md` | identical to **initial commit** `b5e197e` | **UNCHANGED** |
| `.gitignore` | identical to `b5e197e` | **UNCHANGED** |
| `.gitattributes` | identical to `b5e197e` | **UNCHANGED** |
| Older reports | absent from both new commits | **UNCHANGED** |
| `main` | `b5e197efde55…` | **UNCHANGED** |
| `.github/` | absent | **NOT CREATED** |
| `targets.txt`, `links.txt`, `diagnostics.txt` | absent | **NOT CREATED** |
| `pyproject.toml`, `requirements.txt` | absent | **NOT CREATED** |

**Protected-file verdict: FULLY RESPECTED.**

---

# Scope / Blast Radius Review

Phase 1-9 authorized exactly `floppydisk/discover.py`, `tests/test_discover.py`, and `tests/fixtures/**`. Codex touched **exactly those**, across seven paths, with the report in its own documentation commit.

52 production lines changed for a two-defect correction; no refactoring, no opportunistic edits, no Stage C anticipation. `subprocess.run` was not touched at all — the change is confined to the data model and record parsing, which is the narrowest possible surface for this fix.

**Scope verdict: EXACT.**

---

# Regressions

**None.** Stage A byte-identical to its frozen baseline; 46/46 Stage A, 17/17 Stage B, 63/63 total.

Both Phase 1-9 findings are resolved, and I found **no new defects** in this pass. Every claim in Codex's Phase 1-10 report that I checked — commit hashes and parentage, non-amendment, file list, fixture shapes, red-before-green figures, classification behavior, test counts, protected files — verified accurate.

---

# Known Unknowns

Carried forward unchanged; none block Stage B.

| Unknown | Status |
|---|---|
| Which representative real targets emit Queue records, and the magnitude of unresolved work | Stage D evidence — now *measurable*, since `queued` is surfaced |
| Frequency and classes of real DataJob error records from GitHub-hosted runs | Stage D evidence — now *visible*, since errors are classified |
| Percent-encoded extension behavior across site-specific extractors | Unresolved; `directlink` returns exit 64 |
| Whether real `Message.Url` values can carry raw control characters | **Not observed**, not disproven; Stage A rejects them safely |
| Real-world `extension == ''` frequency | Stage D evidence |
| Signed / expiring CDN URL lifetime | Stage D evidence |
| Cost and fan-out of `-J` resolve mode | Deliberately unmeasured and out of scope |

Worth noting: the two findings this correction closed were precisely the ones that would have rendered the first four unknowns *unmeasurable* in Stage D. The evidence pipeline the Phase 0 gate depends on is now intact.

---

# GO / FIX / STOP Verdict

# **GO**

B1 and B2 are correctly resolved. Stage B satisfies its contract and may become the frozen baseline.

The correction is precise on every axis I could independently check. The `-1` error record is detected and converted to plain `DiscoveryError` data, verified against a fixture I confirmed **JSON-identical to real gallery-dl 1.32.10 output**. The mixed URL-plus-error case — the regression I flagged as highest-value because a naive fix loses it — reports `extraction-error` while preserving the surviving record. Queue records are counted, making queue-only distinguishable from genuinely empty, **without** `-J`, without resolution, and without fan-out: a two-queue payload still costs exactly one invocation. The disproven exit-4 special case is gone. The misleading fixture is deleted and its provenance sentence with it, and the new synthetic fixture is explicitly labeled as synthetic. The breadcrumb update is two sentences of durable WHY, not a bug diary. The blast radius was exact, every protected file is blob-identical, Stage A is byte-identical to its frozen baseline, the original Stage B commit was not amended, and the documentation commit is clean.

I independently reproduced the red-before-green claim — `2 failed, 15 deselected`, same failure site, same reason — and extended it to show all four new tests fail against the pre-correction code. The tests are behavioral, not tautological.

**Stage C may be prepared after ChatGPT + human review.**

---

# Checkpoint Push Recommendation

**Yes — the repository is safe to checkpoint with `git push origin Phase-0`, once the ChatGPT + human review gate approves.**

Basis:

- Working tree is clean; nothing uncommitted or stashed.
- All 63 tests pass, zero warnings — this is a coherent passing stage, which is what manual §57 requires before establishing a baseline.
- Stage A and Stage B are both at reviewed, GO-quality states.
- History is linear with no rewrites; every commit is coherent and separately reviewable, with implementation and documentation properly split.
- `main` is untouched; the push targets `Phase-0` only.
- Reports contain no credentials or secrets — I checked when recommending the repository-memory commit, and the material added since is review and implementation prose.
- **No `.github/workflows/` file exists yet**, so this push cannot trigger an Actions run or consume runner minutes. Nothing executes as a side effect.

**I have not pushed, and will not.** The push is the human's action after the review gate.

---

# Recommendation

Return this review to the ChatGPT + human table with three items:

1. **Accept Stage B as the frozen baseline** at correction commit `0c7605bf8429195ab125e78db683c683d0b1cfa6`. The discovery seam — isolation, subprocess contract, no-download guarantee, failure classification, privacy, and queue visibility — is proven by 17 automated tests and independently re-verified against real gallery-dl 1.32.10.

2. **Approve the checkpoint push** of `Phase-0` per the section above.

3. **Authorize Stage C — orchestration** — using the Phase 1-2 blueprint, with one addition to its handoff that this correction makes necessary: Stage C's diagnostics must consult `DiscoveryResult.queued` and `DiscoveryResult.errors`, not just `records`. Concretely, a target should be reported as *extraction-error with N surviving links* when errors are present, and as *queued: N unresolved* rather than *0 links* when `queued > 0`. That is the whole point of this correction — the data now exists, and Stage C is where it becomes the per-target evidence the Phase 0 gate requires.

One carry-forward worth stating plainly for the Stage C prompt: Phase 1-2's *Failure Containment* table predates the corrected classification. The table in my Phase 1-9 report, re-verified row-by-row here, is authoritative for the discovery seam and should be quoted into the Stage C handoff rather than the original.

**Stage C: READY** after ChatGPT + human review.

---

*End of Phase 1-11 Stage B correction architecture review. No production code, tests, or fixtures were modified. All findings were verified by direct inspection of the repository, by executing the committed code, and by re-deriving gallery-dl 1.32.10's DataJob error shape offline; the red-before-green reproduction used read-only `git show` extraction into a scratchpad outside the repository, and git history was not altered.*
