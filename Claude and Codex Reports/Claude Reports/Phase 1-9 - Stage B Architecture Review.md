# Phase 1-9 — Stage B Independent Architecture Review

Timestamp: Wednesday, September 2, 2026 at 12:28 PM MDT
Location: Calgary, Alberta

---

# Stage

Phase 1-9 — Independent review of Codex's Phase 1-8 Stage B gallery-dl discovery seam. Architect / Orchestrator only. No production code, tests, or fixtures modified.

---

# Goal

Independently verify — against the repository and against real gallery-dl 1.32.10 behavior, not against Codex's report — that the discovery seam is correctly isolated, that the subprocess contract is safe and download-free, that the parser matches what gallery-dl actually emits, that fixture provenance is honestly labeled, that failures are contained and classified usefully, and that Stage A remains frozen.

Then issue **GO**, **FIX**, or **STOP**.

---

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 12:28 PM MDT
Location: Calgary, Alberta

Cross-checked two ways: system local clock and UTC (`2026-09-02 18:28Z`) converted at UTC−6 for Mountain Daylight Time. Both agree.

---

# Repository / Branch / Git Status

| Check | Result |
|---|---|
| Repository root | `C:/Users/dmcal/Documents/GitHub/FloppyDisk` — **matches expected** |
| Current branch | `Phase-0` — **matches expected** |
| HEAD | `5fa069502c325314ef2ac54b8ebe1d6640488f92` |
| Position | Ahead of `origin/Phase-0` by 5 commits (not pushed) |
| Tracked working tree | **Clean** — nothing modified, nothing staged |
| Untracked | **None** — reports are now tracked repository memory |
| `main` | Still `b5e197e Initial commit` — untouched |

```text
5fa0695  docs: add Phase 1-8 Stage B implementation report      <- HEAD
77753ad  phase 0b: isolated gallery-dl discovery seam
435adc8  docs: track operating manual and phase reports as repository memory
43e657b  fix: reject control characters in image URLs            <- Stage A frozen
7a7b9f0  phase 0a: targets parsing and strict image allowlist
b5e197e  Initial commit
```

Both Stage A commits are intact and reachable. The repository-memory commit recommended in Phase 1-4 and Phase 1-6 was performed (`435adc8`, eight report/manual files only). No unrelated work is hidden in the tree.

**Nothing was cleaned, restored, staged, stashed, or modified during this review.** The one commit I made is the authorized documentation-only commit for this report (§*Report Tracking* at the end).

---

# Inputs Reviewed

1. **`AI-Assisted Development Operating Manual.md`** — read in full earlier in this session. Verified unchanged before relying on that read: **41,204 bytes, mtime Sep 2 10:22, sha256 prefix `1eee4a7373411647`** — byte-identical. Content is in context.
2. **`Phase 1-2 - Architecture Amendment.md`** — the approved blueprint; contracts C3, C4, C7, the Stage B handoff, and the Failure Containment table applied as the standard.
3. **`Phase 1-6 - Stage A Correction Architecture Review.md`** — the frozen Stage A baseline.
4. **`Phase 1-8 - Stage B Implementation Report.md`** — read in full. Treated as **evidence, not proof** (manual §46).
5. **gallery-dl 1.32.10 itself** — `job.py` (`DataJob`), `extractor/message.py`, `option.py`, `__init__.py`; plus live execution of the real binary and direct construction of a real `DataJob`.
6. **The repository** — all three commit objects, complete diffs, every source, test, and fixture file, and direct execution of the committed code.

---

# Implementation Commit Verification

| Claim | Verification | Result |
|---|---|---|
| Commit `77753adc…` exists | `git cat-file -t` → `commit` | **CONFIRMED** |
| On `Phase-0` | `git branch --contains` → `Phase-0` only | **CONFIRMED** |
| Message `phase 0b: isolated gallery-dl discovery seam` | `git log -1 --format=%s` | **CONFIRMED** — exact |
| Parent | `435adc86…` (the repository-memory commit) | **CONFIRMED** — clean linear history |
| Exactly nine files | `git diff-tree --name-status -r` → 9 | **CONFIRMED** |

```text
A	floppydisk/discover.py
A	tests/test_discover.py
A	tests/fixtures/PROVENANCE.md
A	tests/fixtures/empty.txt
A	tests/fixtures/extraction-error-stderr.txt
A	tests/fixtures/malformed.json
A	tests/fixtures/mixed-url-records.json
A	tests/fixtures/success.json
A	tests/fixtures/unsupported-stderr.txt
```

All nine are **additions**. No Stage A file appears. No protected file appears. No Stage C/D artifact appears.

**Implementation commit verdict: CLEAN.**

---

# Report Commit Verification

Codex stated the Phase 1-8 report was committed separately but did not give the hash. I identified it independently.

**Documentation commit: `5fa069502c325314ef2ac54b8ebe1d6640488f92`**
Message: `docs: add Phase 1-8 Stage B implementation report`
Parent: `77753adc…` (the implementation commit)

Contents — exactly one file:

```text
A	Claude and Codex Reports/Codex Reports/Phase 1-8 - Stage B Implementation Report.md
```

No production code, no tests, no fixtures, no edits to previous reports, no historical rewrites. The separation of implementation history from documentation history was respected exactly (manual §56).

**Report commit verdict: CLEAN. No process defect.**

---

# Files Reviewed

Read in full, line by line:

- `floppydisk/discover.py` (130 lines)
- `tests/test_discover.py` (182 lines)
- `tests/fixtures/PROVENANCE.md`
- `tests/fixtures/success.json`
- `tests/fixtures/mixed-url-records.json`
- `tests/fixtures/malformed.json`
- `tests/fixtures/unsupported-stderr.txt`
- `tests/fixtures/extraction-error-stderr.txt`
- `tests/fixtures/empty.txt`

Plus gallery-dl 1.32.10 source and live execution.

---

# gallery-dl 1.32.10 Verification

**Installed version confirmed: `1.32.10`** via both `gallery-dl --version` and `python -m gallery_dl --version`. Codex correctly upgraded from the machine's previous 1.32.4 before capturing fixtures, exactly as the Phase 1-2 *Dependency / Version Strategy* required.

Message type constants read directly from `gallery_dl/extractor/message.py`:

```text
#  Version   = 1   (commented out / obsolete)
Directory     = 2
Url           = 3
Queue         = 6
#  Metadata  = 8   (commented out)
```

**`Message.Url == 3` is correct**, and the implementation's `item[0] != 3` selection matches real 1.32.10.

Real exit-code surface under `-j`, executed against the live 1.32.10 binary:

| Target | Exit |
|---|---|
| `https://cdn.example.com/photo.jpg` | **0** |
| `https://example.com/not-a-gallery` | **64** |
| `https://cdn.example.com/photo%2Ejpg` | **64** |

---

# Fixture Provenance Review

Codex's central provenance claim is that `success.json` was captured verbatim from 1.32.10. **I verified this directly** by re-running the documented capture command and diffing:

```text
$ gallery-dl -j -- "https://cdn.example.com/photo.jpg?token=fixture"
exit=0, stderr bytes: 0

recapture CRLF count: 29   bytes: 601
fixture   CRLF count:  0   bytes: 572
IDENTICAL after newline normalization: True
JSON semantically equal              : True
```

The only difference is CRLF → LF, which is the expected effect of `.gitattributes` `* text=auto` normalizing on commit. **The capture claim is VERIFIED — `success.json` is genuine upstream evidence.** It also confirms the capture required no live-host fetch and no media download (zero stderr, deterministic `directlink` extractor).

`unsupported-stderr.txt` contains `[gallery-dl][error] Unsupported URL 'https://unsupported.example/'`. My own live 1.32.10 run produced the identical format with a different target. Consistent with a real capture.

`PROVENANCE.md` is genuinely good practice: it names the capture version and command, and it explicitly labels `mixed-url-records.json` as *"a static schema fixture derived from the captured 1.32.10 Message.Url shape"* that *"deliberately represents … values that cannot all originate from one extractor."* It also states plainly that the extraction-error text is static. **Synthetic material does not masquerade as captured evidence.** That is exactly the discipline §8 asked me to check, and Codex met it.

`mixed-url-records.json` record shapes are structurally compatible with real `Message.Url` records (`[3, url, kwdict]`), and its `ytdl:` / `text:` / empty-extension / metadata-extension cases exercise the seam without inventing impossible structures.

**Fixture provenance verdict: HONEST AND ACCURATE — with one exception recorded under *Regressions* (B1):** `extraction-error-stderr.txt`, paired with the exit-4 test case, encodes an outcome that **cannot occur** under the approved `-j` invocation. That is not dishonest labeling — it is a synthetic fixture whose shape the real tool does not produce, which masked a real behavioral discovery.

---

# Architecture Boundary Review

I searched the **entire** production tree, not just `discover.py`:

```text
$ grep -rniE "gallery|subprocess|Popen|shell=" floppydisk/ --include="*.py"
floppydisk/discover.py: (all 13 matches)
```

Every gallery-dl reference and the only `subprocess` usage live in `discover.py`. The single match elsewhere is the word *"discovered"* in `filters.py`'s docstring — not gallery-dl knowledge.

Imports per production module:

```text
floppydisk/cli.py      : dataclasses, typing, urllib.parse
floppydisk/filters.py  : collections.abc, pathlib, urllib.parse
floppydisk/discover.py : dataclasses, json, subprocess, typing
floppydisk/__init__.py : (none)
floppydisk/__main__.py : (none)
```

| Requirement | Verdict |
|---|---|
| `discover.py` is the only gallery-dl-aware production module | **MET** |
| gallery-dl never imported | **MET** — no `import gallery_dl` anywhere |
| gallery-dl source not vendored | **MET** — tree contains no vendored code |
| Boundary remains subprocess-based | **MET** |
| Callers receive plain FloppyDisk-owned data | **MET** — frozen dataclasses only |
| Filtering still owned by `filters.py` | **MET** — see *Message.Url Ownership* |
| Orchestration deferred to Stage C | **MET** — no production module imports `discover` |

**Boundary verdict: EXEMPLARY.** This is the single most important Stage B property and it is fully satisfied.

---

# Subprocess Contract Review

```python
completed = subprocess.run(
    ["gallery-dl", "-j", "--", target],
    capture_output=True, text=True,
    timeout=timeout, check=False, shell=False,
)
```

| Requirement | Verdict |
|---|---|
| One `discover_target()` call → one invocation | **MET** — single `subprocess.run`, proven by `run.call_count == 2` over two calls |
| `-j` used | **MET** |
| `-g` not used | **MET** |
| `-i` not used | **MET** |
| `--` before the target | **MET** |
| Target is one argv element | **MET** — list form, never interpolated |
| `shell=True` not used | **MET** — explicitly `shell=False` |
| No shell string concatenation | **MET** |
| Timeout supplied | **MET** — caller-supplied, required keyword-only |
| stdout captured | **MET** |
| stderr captured | **MET** |
| `check=False` deliberate containment | **MET** — explicit, and containment is tested |
| Nothing enables media download | **MET** — see next section |

The conceptual command `gallery-dl -j -- <target>` is implemented exactly. **Subprocess contract verdict: CORRECT.**

---

# -j / No-Download Review

`-j` maps to `DataJob`, which collects and dumps metadata. I read `DataJob` in 1.32.10: it implements `handle_url`, `handle_directory`, and `handle_queue` as pure data-collection methods appending to `self.data`. There is no downloader instantiation and no file write anywhere in the class. `DownloadJob` — the only job type that downloads — is never selected by `-j`.

**Test-gap assessment (§9).** The freeze is strong. `test_invocation_is_safe_discovery_only_and_per_target` uses `run.assert_called_once_with(["gallery-dl","-j","--",target], …)` — an **exact** argv and kwargs match. Any edit that added a download flag, removed `-j`, or switched to `-g`/`-i` fails immediately. The additional `not any(option in argv for option in ("-d","--destination","--download"))` check is belt-and-braces; the exact match is the real guard.

**No meaningful gap. A future edit could not trivially turn this into a download path without failing tests.**

---

# Parser / Record-Shape Review

This is where the review found its substance.

### What the parser does

```python
for item in payload:
    if not isinstance(item, list) or not item:
        raise ValueError(...)          # -> bad-json
    if item[0] != 3:
        continue                        # non-URL messages ignored
    if len(item) < 3 or not isinstance(item[1], str) or not isinstance(item[2], dict):
        raise ValueError(...)          # -> bad-json
```

### Verified correct

- Top-level shape is a JSON array of message arrays — matches `util.dump_json(self.data, …)`. **Correct.**
- `Message.Url == 3`; URL at `item[1]`; metadata dict at `item[2]`; extension at `item[2]["extension"]`. **All match real 1.32.10 output**, confirmed against the verbatim `success.json` capture.
- Non-str extension coerced to `None`; missing key → `None`. Sensible.
- **Legitimate non-URL records are ignored safely, not treated as bad-json.** I confirmed this for `Message.Directory` (2), `Message.Queue` (6), and the error record (−1). No false `bad-json`. The parser is **not** overly strict about record *shapes*.

### FINDING B1 — the error record is silently discarded (blocking)

Reading `DataJob.run()` in 1.32.10:

```python
try:
    self.dispatch(extractor)
except exception.StopExtraction:
    pass
except Exception as exc:
    self.exception = exc
    self.data.append((-1, {
        "error"  : exc.__class__.__name__,
        "message": str(exc),
    }))
except BaseException:
    pass
...
return 0            # <-- unconditional
```

**`DataJob.run()` returns 0 unconditionally.** Extraction failures are not surfaced as exit codes at all — they are appended as a `(-1, {...})` record and the process exits 0.

I proved this with **zero network access** by constructing a real 1.32.10 `DataJob` on the deterministic `directlink` extractor and forcing the failure a real HTTP error would raise:

```text
=== DataJob.run() return code on extraction failure: 0 ===
=== emitted JSON ===
[
  [
    -1,
    { "error": "HttpError", "message": "404 Not Found" }
  ]
]
```

Fed to the committed parser:

```text
error-only payload -> ()      (zero records; discover.py returns status="ok")
mixed payload      -> (DiscoveryRecord('https://a.com/x.jpg','jpg'),)   status="ok"
```

**Consequence: an extraction failure is reported as `ok` with zero records — indistinguishable from a target that legitimately contained no images.** A partial failure is worse: some records return and the failure vanishes entirely.

Two further consequences follow:

1. **Exit 4 is not produced by `DataJob` for extraction failures.** Since `run()` always returns 0, the only nonzero exits under `-j` come from errors raised *before or around* the job — chiefly `NoExtractorError` → 64 (which I confirmed live). The `_failure_status` exit-4 branch, its parametrized test case, and `extraction-error-stderr.txt` therefore encode a path the approved invocation does not produce.
2. **This originates in my own Phase 1-2 blueprint, not in Codex's execution.** The Failure Containment table I wrote lists "Extractor error (exit 4/8/16)"; I derived those codes in Phase 1-1 from `exception.py` and the general job path, and never verified them against `DataJob` specifically. Codex implemented the approved spec faithfully. The synthetic exit-4 fixture then masked the discrepancy — which is precisely why §8's provenance discipline matters.

**Why this blocks.** Phase 1-2's Failure Containment table lists "Extractor error" and "Zero images for one target" as **distinct rows** with distinct diagnostics. More importantly, the Phase 0 PASS/FAIL gate refinement #19 requires *"Per-target failure classification is recorded … 'It didn't work' is not evidence; 'three targets returned challenge errors from a datacenter IP' is."* Producing that evidence is the **entire point of Stage D**. As implemented, a Stage D run against real targets that fail with HTTP, challenge, or auth errors would report them as `ok, 0 links` — the exact failure mode the gate was written to prevent.

### FINDING B2 — queued records are also silently dropped (recommended, same pass)

`-j` is declared `action="count"`, and `__init__.py` sets `jobtype.resolve = args.dump_json - 1`. A single `-j` therefore yields `resolve = 0` — **falsy — so `Message.Queue` records are not resolved.** (`-J` sets `resolve = 127`.)

A target that fans out — a profile or user page, explicitly named in Phase 1-2's Product Contract (*"gallery targets, profile targets"*) — emits `[6, url, kwdict]` records. Confirmed against the committed parser:

```text
queue-only payload -> ()      (zero records; status "ok")
```

So profile-style targets are a **second silent-zero path**, corrupting Stage D evidence the same way B1 does.

Like B1, this stems from my blueprint: Phase 1-2 approved `-j` without addressing resolve behavior. Codex implemented what was specified.

I am **not** recommending a switch to `-J` — that would be infrastructure ahead of evidence (manual §19), and resolving queues fans out into many more subprocess-free extractions with unknown cost. The minimal, evidence-preserving response is to make queued records **visible** rather than invisible, so Stage D can report "this target queued N items that were not resolved" instead of "0 links".

---

# Failure Classification Review

Behavior verified by inspection and probing:

| Condition | Implemented | Correct? |
|---|---|---|
| exit 0 + valid JSON | `ok` + records | **Yes** |
| exit 0 + empty/whitespace stdout | `ok`, 0 records | **Yes** |
| exit 64 | `unsupported` | **Yes** — confirmed live |
| exit 4 | `extraction-error` | Dead path — see B1 |
| timeout | `timeout`, contained, bytes stderr decoded | **Yes** |
| malformed JSON | `bad-json` | **Yes** |
| unexpected nonzero exit | `invocation-error` | **Yes** — see below |
| missing executable | `FileNotFoundError` propagates | **Yes** |
| **exit 0 + `[-1, error]` record** | **`ok`, 0 records** | **NO — B1** |
| **exit 0 + `[6, …]` queue records** | **`ok`, 0 records** | **Incomplete — B2** |

**Routine failures are properly contained** — no exception escapes for unsupported, extraction-error, timeout, bad-json, or invocation-error. Verified by tests asserting `not result.ok` with structured results rather than raises.

**`FileNotFoundError` remains deliberately fatal**, correctly distinguished from ordinary target failure and frozen by `test_missing_executable_remains_a_fatal_preflight_class`. This matches Phase 1-2's Failure Containment row ("gallery-dl missing / not executable → **Fatal** — exit 1"). Good judgment.

**On the `invocation-error` catch-all:** I assessed whether collapsing unmodeled exit codes into one contained status is consistent with the approved contract. **It is, and it should not be expanded.** Phase 1-2 required containment and per-target recording, not an exhaustive taxonomy; the raw `returncode` is preserved on the result so Stage C can report the exact number, and the captured stderr carries gallery-dl's own message. Adding branches for codes 8/16/32 would be classification without evidence that they occur — and given B1, most of them do not occur under `-j` at all. **Correct as-is.**

---

# Privacy / Stderr Review

| Requirement | Verdict |
|---|---|
| gallery-dl stderr captured | **MET** — `capture_output=True` |
| Returned/stored as data | **MET** — `DiscoveryResult.stderr` |
| `discover.py` never prints it | **MET** — no `print`, no logging, no `sys.stdout/stderr` write anywhere in the module |
| Target URLs not printed | **MET** |
| Discovered media URLs not printed | **MET** |

**This is behaviorally protected, not merely asserted.** Two tests use `capsys`:

```python
assert capsys.readouterr() == ("", "")
```

in `test_target_failures_are_contained_and_stderr_captured` (three parametrized cases) and `test_timeout_is_contained_without_printing_stderr`. The timeout test deliberately uses `stderr=b"private failure URL"` and asserts it is decoded into the result while producing no console output. That is a genuine behavioral privacy guarantee, and it satisfies Phase 1-2's *Privacy / Logging* design.

**Privacy verdict: CORRECT.**

---

# Message.Url Ownership

`discover.py` exposes records without applying product policy. Verified by the mixed-fixture test, which asserts all four records survive:

```python
DiscoveryRecord("https://images.example/media/abc?format=jpg", "jpg"),
DiscoveryRecord("https://images.example/extensionless", ""),
DiscoveryRecord("ytdl:https://video.example/watch/1", "mp4"),
DiscoveryRecord("text:caption payload", None),
```

`ytdl:` and `text:` pass straight through, and the empty extension is preserved as `""` rather than coerced. `discover.py` does **not** enforce the six-format allowlist, normalize URLs, strip queries, resolve extensionless URLs, perform HEAD requests, or absorb any `filters.py` responsibility.

**Filtering ownership is preserved exactly where Phase 1-2 placed it.** This is a genuinely well-drawn boundary — the seam reports what gallery-dl said, and the frozen Stage A filter decides what qualifies.

---

# Percent-Encoding Observation

Codex reported that under pinned 1.32.10, `https://cdn.example.com/photo%2Ejpg` is unsupported by the `directlink` extractor (exit 64) and therefore supplies no extension metadata.

**Independently confirmed** — my live run returned **exit 64** for exactly that URL.

Codex characterized it accurately and with appropriate limits, explicitly noting it *"does not establish behavior for every site-specific extractor"* and that the frozen filter was not changed. That is honest evidence reporting: Stage B observed one extractor's behavior and did not generalize.

Worth recording for continuity: in Phase 1-4 I compared FloppyDisk's filter against `gallery_dl.text.nameext_from_url`, which *does* resolve `photo%2Ejpg` to `jpg` because it calls `unquote()`. Both observations are true and not in conflict — the helper resolves it, but `directlink`'s URL **pattern** never matches, so no extractor invokes the helper for that URL. The open question is unchanged: whether any site-specific extractor supplies metadata for percent-encoded paths.

**Not solved here.** Carried forward to representative real extractor evidence. Stage A unchanged.

---

# Control-Character Observation

Codex reported that no captured 1.32.10 `Message.Url` value contained a raw newline, carriage return, or tab.

**Correctly characterized as "not observed" rather than "impossible."** The Phase 1-8 report says *"No captured 1.32.10 Message.Url value contained raw newline, carriage return, or tab characters"* and lists under Known Unknowns: *"Whether real gallery-dl Message.Url data can contain raw control characters remains unobserved."* That is the right epistemic framing and matches how I framed it in Phase 1-4.

Codex also correctly declined to manufacture such a record in the static fixtures — inventing a gallery-dl claim would have been exactly the provenance failure §8 guards against.

Stage A's frozen guard rejects all three safely regardless, and **Stage A was not altered**. Verified blob-identical below.

---

# Breadcrumb Review

`floppydisk/discover.py` lines 9–29, sited immediately above the data model and seam they govern.

**BREADCRUMBS - WAS** — *"Phase 1-1 targeted local Windows execution. Phase 1-2 moved execution to GitHub-hosted Actions, while this isolated discovery seam survived unchanged."* This is **real, verifiable project history**, not invented folklore (manual §28), and it records the genuinely useful architectural fact that the seam shape survived a runtime correction — evidence it sits at the right boundary.

**BREADCRUMBS - IS** — covers every WHY the review brief asked for: sole gallery-dl ownership; per-target invocation *"because batched exit codes, output attribution, and timeouts are ambiguous"*; `-j` over `-g` because it *"preserves extractor metadata and avoids -g fallback text"*; argv after `--` and never `-i` *"which interprets configuration-like input"*; stderr captured and never printed *"because it can contain URLs in retained CI logs"*; and the subprocess boundary, noting that *"importing or vendoring it would materially change both this architecture and its licensing analysis."* That last clause preserves the GPL reasoning from Phase 1-2 §14 exactly where a future agent might otherwise casually `import gallery_dl`.

**BREADCRUMBS - WILL BE** — records that callers receive only FloppyDisk-owned data *"so a different discovery engine, or an evidence-backed extension-resolution strategy, can replace this seam without changing them."* Protects future optionality without building it (manual §30, §44).

These explain WHY, not what changed. They are not changelog prose, and they are beside the architecture they govern.

**Breadcrumb verdict: EXCELLENT — the strongest breadcrumbs in the project so far.**

---

# Tests Inspected

I read all 13, and assessed them for co-drift risk rather than counting.

### Strong

- **`test_invocation_is_safe_discovery_only_and_per_target`** — exact `assert_called_once_with` on argv *and* kwargs, plus positional assertions that the target follows `--` and `-i` is absent. This single test freezes the entire subprocess contract.
- **`test_each_discover_call_owns_one_invocation`** — proves one-target-one-invocation via `call_count` and per-call argv, not by inspection.
- **`test_success_fixture_exposes_plain_url_and_extension_data`** — **parses the real captured fixture**, not a hand-assembled dict. This is the answer to §17's "is actual fixture parsing tested" question: yes, against verbatim upstream output.
- **`test_target_failures_are_contained_and_stderr_captured`** and **`test_timeout_is_contained_without_printing_stderr`** — assert containment, stderr capture, *and* `capsys.readouterr() == ("", "")`. Behavioral privacy proof.
- **`test_structured_records_tolerate_metadata_empty_and_pseudo_urls`** — freezes filtering-ownership separation.
- **`test_missing_executable_remains_a_fatal_preflight_class`** — freezes the deliberate fatal/routine distinction.

### Co-drift assessment

Expected values are hardcoded literals (`"gallery-dl"`, `"-j"`, `"--"`, explicit `DiscoveryRecord(...)` tuples). No test imports a constant from `discover.py` and asserts it against itself. **No co-drift risk found.**

### Gaps — both tied to the findings

1. **No test covers the real `[-1, {...}]` error record.** `test_non_url_gallery_records_are_ignored` uses `[[1,"version"],[2,{…}]]` — neither is the shape gallery-dl actually emits on failure. The one shape that carries real failure information is untested.
2. **The exit-4 parametrized case asserts a classification the approved invocation cannot produce**, and `extraction-error-stderr.txt` exists to support it. The test passes because the mock supplies exit 4 — the mock, not gallery-dl, is the only thing that ever produces it.
3. **No test covers `Message.Queue` (type 6)**, the second silent-zero path.

These are the test-side face of B1/B2, not separate findings.

---

# Independent Tests Run

Run by me, unmodified, in the repository.

```text
$ python -m pytest -p no:cacheprovider -q tests/test_discover.py
.............                                                            [100%]
13 passed in 0.04s

$ python -m pytest -p no:cacheprovider -q
...........................................................              [100%]
59 passed in 0.05s
```

---

# Exact Test Results

| Metric | Stage B only | Full suite |
|---|---|---|
| Command | `python -m pytest -p no:cacheprovider -q tests/test_discover.py` | `python -m pytest -p no:cacheprovider -q` |
| Collected | **13** | **59** |
| Passed | **13** | **59** |
| Failed | **0** | **0** |
| Errors | **0** | **0** |
| Skipped | **0** | **0** |
| Warnings | **0** | **0** |
| Duration | 0.04 s | 0.05 s |
| pytest / Python | 9.1.1 / 3.14.2 | 9.1.1 / 3.14.2 |

**Both results reproduce Codex's claims exactly.** Reconciliation confirmed: **46 frozen Stage A + 13 Stage B = 59.**

The suite passing 59/59 does **not** contradict B1 — the defect is that the tests assert a classification gallery-dl never produces, so the suite is internally consistent while diverging from real tool behavior. That divergence is only visible by testing against the tool itself, which is what this review did.

---

# Stage A Regression Verification

Stage A files compared **blob-to-blob** against the frozen Stage A baseline `43e657b`:

```text
IDENTICAL TO FROZEN BASELINE  floppydisk/filters.py
IDENTICAL TO FROZEN BASELINE  floppydisk/cli.py
IDENTICAL TO FROZEN BASELINE  tests/test_filters.py
IDENTICAL TO FROZEN BASELINE  tests/test_targets.py
```

And across the Stage B commit specifically (`435adc8 → 77753ad`), all of `filters.py`, `cli.py`, `__init__.py`, `__main__.py`, `test_filters.py`, `test_targets.py`, `README.md`, `.gitignore`, `.gitattributes` are **blob-identical**.

All 46 Stage A tests remain present and passing. **No Stage A regression is possible** — the files are byte-identical to the frozen baseline.

---

# Protected Files Verification

| Protected item | Method | Result |
|---|---|---|
| `floppydisk/filters.py` | blob identical to `43e657b` | **UNCHANGED** |
| `floppydisk/cli.py` | blob identical to `43e657b` | **UNCHANGED** |
| `floppydisk/__init__.py` / `__main__.py` | blob identical | **UNCHANGED** |
| `tests/test_filters.py` / `test_targets.py` | blob identical to `43e657b` | **UNCHANGED** |
| `README.md` | identical to **initial commit** `b5e197e` | **UNCHANGED** |
| `.gitignore` | identical to `b5e197e` | **UNCHANGED** |
| `.gitattributes` | identical to `b5e197e` | **UNCHANGED** |
| Existing reports / manual | absent from both Stage B commits | **UNCHANGED** |
| `main` | `b5e197efde55…` | **UNCHANGED** |
| `.github/` | absent | **NOT CREATED** |
| `targets.txt`, `links.txt`, `diagnostics.txt` | absent | **NOT CREATED** |
| `pyproject.toml`, `requirements.txt` | absent | **NOT CREATED** |

**Protected-file verdict: FULLY RESPECTED.**

---

# Scope / Blast Radius Review

Phase 1-2 authorized for Stage B:

```text
floppydisk/discover.py
tests/test_discover.py
tests/fixtures/**
```

Codex touched **exactly those paths** — one production module, one test module, seven fixture/provenance files. No Stage A file, no protected file, no Stage C/D artifact, no unrelated cleanup, no refactoring. The report went in its own documentation commit.

130 production lines for the seam is proportionate (manual §58).

**Scope verdict: EXACT.**

---

# Regressions

**No regressions.** Stage A is byte-identical to its frozen baseline; all 46 cases pass; 59/59 overall.

Two new findings, both discovered by testing against the real tool rather than against the fixtures.

## B1 — Extraction failures are classified as success *(blocking)*

**Evidence.** `DataJob.run()` in 1.32.10 catches `Exception`, appends `(-1, {"error": …, "message": …})`, and returns **0** unconditionally. Proven offline by running a real `DataJob` with a forced `HttpError`: return code 0, output `[[-1,{"error":"HttpError","message":"404 Not Found"}]]`.

**Behavior.** `_parse_records` skips `item[0] != 3`, so the error record is discarded and `discover_target` returns `status="ok"`, `records=()`. A partial failure loses the error entirely while returning the surviving records.

**Impact.** Phase 1-2's Failure Containment table treats "Extractor error" and "Zero images for one target" as distinct outcomes; Phase 0 gate refinement #19 requires per-target failure classification as the evidence Stage D exists to produce. As implemented, real targets failing with HTTP/challenge/auth errors would be reported as `ok, 0 links`.

**Attribution.** This originates in my Phase 1-2 blueprint's exit-code table, which I derived without verifying `DataJob` specifically. Codex implemented the approved spec faithfully; the synthetic exit-4 fixture then masked the discrepancy.

## B2 — Queued records are invisible *(recommended, same corrective pass)*

**Evidence.** `-j` is `action="count"`; `resolve = args.dump_json - 1` = 0 for a single `-j`, so `Message.Queue` (type 6) records are **not** resolved. Confirmed against the parser: a queue-only payload yields `()` and `status="ok"`.

**Impact.** Profile-style targets — explicitly in Phase 1-2's Product Contract — are a second silent-zero path that would corrupt Stage D evidence the same way.

**Deliberately not recommending `-J`.** Switching to resolve mode is infrastructure ahead of evidence (manual §19) with unknown fan-out cost. Make the situation *visible* first.

## Smallest corrective scope

**Authorized files:** `floppydisk/discover.py`, `tests/test_discover.py`, `tests/fixtures/**` (including `PROVENANCE.md`). Nothing else.

1. **Classify the error record.** When a type `-1` record is present, return a distinct failure status (recommended: reuse `extraction-error`, carrying gallery-dl's `error` class name and `message` so Stage C can report them). A record-derived failure must win over `ok` even when some URL records also parsed.
2. **Surface queued records.** Count type-6 records and expose the count on `DiscoveryResult` (recommended: a `queued: int` field) so Stage C can distinguish "queued but unresolved" from "genuinely empty". Do **not** switch to `-J`.
3. **Correct the fixtures.** Add a captured `[-1, …]` error fixture — reproducible offline exactly as I did — and a type-6 queue fixture. Remove or clearly relabel the unreachable exit-4 pairing so no fixture implies a shape `-j` cannot produce. Update `PROVENANCE.md` accordingly.
4. **Amend the corresponding tests**, including a test proving a mixed payload (URL records + an error record) does not report `ok`.

**Corrected classification table for `-j`** — supersedes the exit-code rows in Phase 1-2's Failure Containment table for this seam:

| Real 1.32.10 condition | Correct status |
|---|---|
| exit 0, type-3 records, no `-1` | `ok` |
| exit 0, no records at all | `ok` (genuinely empty) |
| exit 0, any `-1` record | **`extraction-error`** (new) |
| exit 0, only type-6 records | `ok` **with `queued > 0`** (new) |
| exit 64 | `unsupported` |
| other nonzero | `invocation-error` |
| timeout | `timeout` |
| malformed JSON | `bad-json` |
| executable missing | fatal `FileNotFoundError` |

This is a contract-detail correction inside the approved seam. **The Stage B architecture itself is unchanged** — same module boundary, same per-target subprocess, same `-j`, same plain-data return type, same callers. No re-planning pass is required.

---

# Known Unknowns

| Unknown | Status |
|---|---|
| Whether site-specific extractors supply metadata for percent-encoded path extensions | Unproven. `directlink` returns exit 64; `nameext_from_url` would resolve it. Needs representative extractor evidence. |
| Whether real `Message.Url` values can carry raw control characters | **Not observed**, not disproven. Stage A rejects them safely regardless. |
| Which real targets emit `Message.Queue` rather than `Message.Url` | Unknown until representative targets are exercised — sharpened by B2. |
| How often extraction errors occur against real targets from GitHub IPs | The central Stage D question — and the reason B1 blocks. |
| Real-world `extension == ''` frequency | Stage D evidence. |
| Signed / expiring CDN URL lifetime | Stage D evidence. |
| Cost/fan-out of `-J` resolve mode if ever adopted | Unmeasured; deliberately not adopted now. |

---

# GO / FIX / STOP Verdict

# **FIX**

The Stage B architecture is **valid and unchanged**. The seam is exactly where Phase 1-2 put it, and on nearly every axis this is the best work in the project so far: gallery-dl knowledge is confined to a single module across the whole production tree; the subprocess contract is precisely correct and strongly frozen by an exact-argv test; privacy is behaviorally proven with `capsys`, not asserted in comments; `success.json` is a **verified verbatim capture** I reproduced byte-for-byte; `PROVENANCE.md` labels synthetic material honestly; the breadcrumbs are the strongest in the repository; the blast radius was exact; every protected file is blob-identical; the documentation commit is clean; and 13/13 and 59/59 reproduce exactly.

Two defects prevent GO, both found only by testing against real gallery-dl 1.32.10 rather than against the fixtures:

- **B1 (blocking):** `DataJob` reports extraction failures as a `[-1, {...}]` record with **exit 0**, not exit 4. The parser discards it, so failures are reported as `ok` with zero records — defeating the per-target failure evidence that is the entire purpose of Stage D.
- **B2 (same pass):** plain `-j` does not resolve `Message.Queue`, so profile-style targets are a second silent-zero path.

Both trace to an unverified assumption in **my** Phase 1-2 blueprint rather than to Codex's execution, and both are correctable inside the existing seam without changing its shape, its callers, or its return type. That is a FIX, not a STOP.

Corrective scope is specified above and limited to `floppydisk/discover.py`, `tests/test_discover.py`, and `tests/fixtures/**`. All Phase 1-2 protected files and stop conditions remain in force. The next report is `Claude and Codex Reports/Codex Reports/Phase 1-10 - Stage B Correction Report.md`, and the existing Stage B commit should stand with the correction as a follow-up commit rather than an amend.

**Stage C is NOT authorized.** Per manual §11, fix the current stage; do not advance.

---

# Recommendation

Return this review to the ChatGPT + human table with three items:

1. **Approve the B1/B2 corrective pass** using the corrected classification table above as the spec. Expected size is modest — a `-1`/type-6 branch in `_parse_records`, one new `DiscoveryResult` field, two new fixtures, and amended tests. The red-before-green expectation should be stated explicitly: a test asserting that a payload containing a `-1` record does **not** report `ok` must fail against the current implementation before the fix.

2. **Note the Phase 1-2 amendment.** The Failure Containment table's exit-code rows (4/8/16) do not describe `-j` behavior. The corrected table in this report supersedes them for the discovery seam. I do not think this warrants a separate architecture pass — but the record should show the blueprint was wrong on this point, not just the implementation.

3. **Keep Stage D's evidence purpose in view when reviewing the fix.** Both findings are the same failure mode: a real problem rendered invisible as "ok, 0 links". The corrective test that matters most is the mixed payload — URL records *plus* an error record — because that is the case where a naive fix still loses the failure.

After the correction is implemented and independently re-verified, I expect Stage B to reach **GO** quickly. Nothing in the Stage C design needs to change: `DiscoveryResult` gains a field and a status route, and Stage C consumes it as already planned.

**Stage C: NOT READY.** It becomes ready once B1 is closed, B2 is addressed, and the correction is re-reviewed and approved.

---

*End of Phase 1-9 Stage B architecture review. No production code, tests, or fixtures were modified. All findings were verified by direct inspection of the repository, by executing the committed code, and by executing and reading gallery-dl 1.32.10 itself; the `DataJob` error-path proof was produced offline with no third-party network access, and the fixture re-capture used the same deterministic extractor Codex documented.*
