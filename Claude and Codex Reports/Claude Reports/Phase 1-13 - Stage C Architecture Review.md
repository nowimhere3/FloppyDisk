# Phase 1-13 — Stage C Independent Architecture Review

Timestamp: Wednesday, September 2, 2026 at 1:27 PM MDT
Location: Calgary, Alberta

---

# Stage

Phase 1-13 — Independent review of Codex's Phase 1-12 Stage C pipeline orchestration and output contracts. Architect / Orchestrator only. No production code, tests, fixtures, or `.gitignore` modified.

---

# Goal

Independently verify — against the repository and by executing the committed code — that Stage C assembles the frozen seams without absorbing their responsibilities; that `links.txt` is byte-exact and pure; that partial extraction errors contribute links while remaining visibly failed; that queued work is distinguishable from emptiness; that privacy, atomic writes, and the exit contract hold; and that Stages A and B remain frozen.

Then issue **GO**, **FIX**, or **STOP**.

---

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 1:27 PM MDT
Location: Calgary, Alberta

Cross-checked two ways: system local clock and UTC (`2026-09-02 19:27Z`) converted at UTC−6 for Mountain Daylight Time. Both agree.

---

# Repository / Branch / Git Status

| Check | Result |
|---|---|
| Repository root | `C:/Users/dmcal/Documents/GitHub/FloppyDisk` — **matches expected** |
| Current branch | `Phase-0` — **matches expected** |
| HEAD (before my report commit) | `80468f8d6471ffae5bf5d932557a4d9c516e080a` |
| `git status -sb` | `## Phase-0...origin/Phase-0 [ahead 2]` |
| Tracked working tree | **Clean** |
| Untracked | **None** |
| `main` | Still `b5e197e Initial commit` — untouched |

**Stage B GO checkpoint is pushed and verified:** `origin/Phase-0 = 0972a1e3af639f22f32f40b1e14233031f6e1703`, exactly the commit I approved in Phase 1-11.

```text
80468f8  docs: add Phase 1-12 Stage C implementation report
fe4b3d6  phase 0c: pipeline orchestration and links.txt output contract
0972a1e  docs: add Phase 1-11 Stage B correction architecture review   <- pushed checkpoint
96818b9  docs: add Phase 1-10 Stage B correction report
0c7605b  fix: surface gallery-dl datajob errors and queued records     <- Stage B frozen
cc9ce82  docs: add Phase 1-9 Stage B architecture review
5fa0695  docs: add Phase 1-8 Stage B implementation report
77753ad  phase 0b: isolated gallery-dl discovery seam
435adc8  docs: track operating manual and phase reports as repository memory
43e657b  fix: reject control characters in image URLs                  <- Stage A frozen
7a7b9f0  phase 0a: targets parsing and strict image allowlist
b5e197e  Initial commit
```

Stage A and Stage B history intact; linear, no rewrites. **Nothing was cleaned, restored, stashed, staged, amended, rebased, or pushed during this review**, except the authorized Phase 1-13 report commit recorded at the end.

---

# Inputs Reviewed

1. **`AI-Assisted Development Operating Manual.md`** — read in full earlier in this session. Verified unchanged before relying on that read: **41,204 bytes, mtime Sep 2 10:22, sha256 prefix `1eee4a7373411647`** — byte-identical.
2. **`Phase 1-11 - Stage B Correction Architecture Review.md`** — the corrected `DiscoveryResult` semantics, which supersede Phase 1-2's obsolete exit-code assumptions.
3. **`Phase 1-12 - Stage C Implementation Report.md`** — read in full. Treated as **evidence, not proof** (manual §46).
4. **`Phase 1-2`** and **`Phase 1-6`** — consulted for the output contract, privacy architecture, and the frozen Stage A baseline.
5. **The repository** — both commit objects, complete diffs, all Stage C source and tests, plus **direct execution of the committed CLI** through thirteen behavioral probes.

---

# Implementation Commit Verification

| Claim | Verification | Result |
|---|---|---|
| Commit `fe4b3d6b…` exists | `git cat-file -t` → `commit` | **CONFIRMED** |
| On `Phase-0` | `git branch --contains` → `Phase-0` | **CONFIRMED** |
| Message `phase 0c: pipeline orchestration and links.txt output contract` | `git log -1 --format=%s` | **CONFIRMED** — exact |
| Parent is the pushed Stage B GO checkpoint | `parent = 0972a1e3af…` = `origin/Phase-0` | **CONFIRMED** |
| Exact changed-file list | 4 files | **CONFIRMED** |

```text
M	.gitignore
M	floppydisk/__main__.py
M	floppydisk/cli.py
A	tests/test_cli.py
```

All four are within the authorized Stage C surface. **No frozen Stage A/B path appears.** Diffstat: **608 insertions, 4 deletions** — 228 lines of `cli.py`, 371 lines of tests, plus the 7-line `__main__.py` and 6-line `.gitignore` changes.

**Implementation commit verdict: CLEAN.**

---

# Phase 1-12 Report Commit Verification

Codex stated the report was committed separately without giving the hash. I identified it independently.

**Documentation commit: `80468f8d6471ffae5bf5d932557a4d9c516e080a`**
Message: `docs: add Phase 1-12 Stage C implementation report`
Parent: `fe4b3d6b…` (the implementation commit)

Contents — exactly one file:

```text
A	Claude and Codex Reports/Codex Reports/Phase 1-12 - Stage C Implementation Report.md
```

No production code, no tests, no older report edits, no historical rewrites.

**Report commit verdict: CLEAN.**

---

# Architecture Boundary Review

`cli.py` imports exactly:

```text
argparse, dataclasses, os, pathlib, tempfile, typing, urllib.parse
from .discover import DiscoveryResult, discover_target
from .filters  import deduplicate_urls, filter_image_urls
```

Grep across `cli.py` for gallery-dl protocol knowledge — `Message|json|subprocess|import gallery|'-j'|== 3|== 6|== -1|IMAGE_EXTENSIONS|jpg|jpeg|webp|avif|allowlist` — returns **only** the two unrelated `argv` hits in `main()`'s own signature.

| Must NOT do | Verdict |
|---|---|
| Construct gallery-dl argv | **CONFIRMED ABSENT** |
| Know `Message.Url == 3` / `Queue == 6` / error `== -1` | **CONFIRMED ABSENT** |
| Parse gallery-dl JSON | **CONFIRMED ABSENT** |
| Interpret gallery-dl process codes | **CONFIRMED ABSENT** — consumes `result.status` only |
| `import gallery_dl` | **CONFIRMED ABSENT** |
| Reproduce the six-extension allowlist | **CONFIRMED ABSENT** |
| Reproduce dedupe rules | **CONFIRMED ABSENT** — no local filter/dedupe definitions |

Stage C consumes only FloppyDisk-owned fields: `status`, `records`, `errors`, `queued`, `stderr`.

**One minor observation (C4, non-blocking).** `cli.py:262` contains the literal `"gallery-dl"`:

```python
if error.filename == "gallery-dl" or str(error) == "gallery-dl":
    print("FloppyDisk could not run: gallery-dl executable not found.")
```

Strictly, the executable's name is `discover.py`'s knowledge. The consequence is nil — it only selects between two human-readable messages, and both branches return 1; if the seam ever renamed the executable, this would silently fall through to the generic message. It is neither preflight logic nor protocol knowledge. Worth tidying whenever `cli.py` is next open; **not corrective work.**

**Boundary verdict: PRESERVED.**

---

# CLI / Entry Point Review

`python -m floppydisk` is a genuine entry point. `__main__.py` is three effective lines (`from .cli import main` / `raise SystemExit(main())`). Executed directly:

```text
$ python -m floppydisk --help
usage: python.exe -m floppydisk [-h] --targets TARGETS --out OUT
                                --diagnostics DIAGNOSTICS
Discover direct image URLs
exit=0
```

All three of `--targets`, `--out`, `--diagnostics` are `required=True`. Argparse enforces them; omitting any exits 2 with usage, which is standard CLI behavior and outside the pipeline's own 0/1 contract.

**On the 120-second default timeout:** `DEFAULT_TARGET_TIMEOUT = 120.0` is a module constant passed as a keyword default to `run_pipeline`, overridable by callers (the tests use `timeout=7.5`). This is a reasonable small implementation default, not accidental infrastructure — no config file, no env var, no flag was added for it. Phase 1-2 called for a per-target timeout without specifying a value, and 120 s is a sensible starting point against a 30-minute job budget. It remains an unmeasured guess until Stage D exercises real targets, which Codex correctly lists as a known unknown. **Appropriate as-is; no configuration machinery warranted.**

**Entry point verdict: VALID.**

---

# Target Parsing Integration

`run_pipeline` opens the targets file with `encoding="utf-8"` and passes the file handle straight to `parse_targets`.

**There is no duplicate parser.** `parse_targets` lives in `cli.py` because that is where Stage A put it. I verified it is the *same frozen function*, not a reimplementation, by AST-comparing every Stage A definition between the frozen baseline `43e657b` and Stage C `fe4b3d6`:

```text
ParsedTargets     present in Stage C: True   IDENTICAL: True
RejectedTarget    present in Stage C: True   IDENTICAL: True
Target            present in Stage C: True   IDENTICAL: True
_is_http_url      present in Stage C: True   IDENTICAL: True
parse_targets     present in Stage C: True   IDENTICAL: True

New definitions added by Stage C: PipelineCounts, _atomic_write_text,
  _diagnostics_content, _links_content, _parser, _step_summary,
  _target_diagnostic, main, run_pipeline
```

Stage C is **purely additive** to the frozen Stage A surface. The 46 Stage A tests, themselves unchanged, still pass.

Behaviorally confirmed through the committed test and my own probes: UTF-8 input, blank lines skipped, `#` comments skipped, invalid targets (`--version`) never reach discovery, and one-based line numbers survive skips — diagnostics correctly attribute `line 4: status=invalid` and `line 5: status=ok` across a blank line and a comment.

**Target parsing verdict: CORRECTLY DELEGATED.**

---

# Failure Containment Review

`run_pipeline` loops over `parsed.accepted`, calls `discover_target` exactly once per target, and never branches on failure — every status flows through the same path, contributing whatever records it carries.

I executed every routine outcome end-to-end:

| Status | Exit | Later targets ran | Links from later targets |
|---|---|---|---|
| `ok` | 0 | yes | yes |
| `unsupported` | 0 | yes | yes |
| `extraction-error` | 0 | yes | yes |
| `timeout` | 0 | yes | yes |
| `bad-json` | 0 | yes | yes |
| `invocation-error` | 0 | yes | yes |
| `ok` + `queued>0` | 0 | yes | n/a |
| genuinely empty | 0 | yes | n/a |

A three-target probe (good / failing / good) produced both good links with `discover.call_count == 3`. No routine failure aborts the run.

**Failure containment verdict: CORRECT.** This is one of the principal Phase 0 contracts and it holds.

---

# Partial Extraction Review

The critical Stage C item. Probed directly against the committed code with a target returning `extraction-error` **plus** a surviving record **plus** an error, followed by a second healthy target:

```text
exit: 0

links.txt:
https://cdn.example/survivor.jpg
https://cdn.example/later.png

diagnostics.txt:
line 1: status=extraction-error links=1 excluded=0
  error: HttpError: 404 Not Found
  stderr:
    [gallery-dl][error] Unsupported URL 'https://SECRET-STDERR.example/x'
line 2: status=ok links=1 excluded=0
```

| Requirement | Verdict |
|---|---|
| Surviving qualifying links reach `links.txt` | **MET** |
| Diagnostics still report `extraction-error` | **MET** |
| Error name/message visible | **MET** — `HttpError: 404 Not Found` |
| Recovered-link count visible | **MET** — `links=1` |
| Target NOT relabeled simple success | **MET** — status is `extraction-error`, never `ok` |
| Later targets still execute | **MET** — second target ran and contributed |

This is exactly the behavior I specified in Phase 1-11's recommendation, and it is the payoff of the B1 correction: an extraction failure now produces *both* usable links and visible failure evidence.

**Partial extraction verdict: CORRECT.**

---

# Queue Review

`_target_diagnostic` distinguishes the two zero-link cases:

```python
if result.queued:
    details[0] += f" queued={result.queued} unresolved"
elif result.status == "ok" and not result.records:
    details[0] += " empty"
```

Probed with a queue-only target followed by a genuinely empty one:

```text
queued unresolved: 7

line 1: status=ok links=0 excluded=0 queued=7 unresolved
line 2: status=ok links=0 excluded=0 empty
```

| Requirement | Verdict |
|---|---|
| Queue-only diagnosed as unresolved queued work | **MET** |
| Genuinely empty distinguishable | **MET** — explicit `empty` marker |
| Aggregate queued count reported | **MET** — `queued unresolved: 7` |
| No `-J` | **MET** — Stage B unchanged, argv verified below |
| No queue resolution / subprocess fan-out | **MET** |
| No Stage B modification | **MET** — `discover.py` blob-identical |

Stage C **reports** queue evidence rather than resolving it, exactly as Phase 1-11 required. `DiscoveryResult.queued` is doing the job it was added for.

**Queue verdict: CORRECT.**

---

# Filtering / Dedupe Integration

I did not infer this from imports. I ran fifteen representative records through the committed CLI end-to-end and inspected the resulting `links.txt`:

| Input record | Survived? | Correct |
|---|---|---|
| `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif` (all six) | yes | **PASS** |
| `.webm` (video) | no | **PASS** |
| `.bmp`, `.pdf` | no | **PASS** |
| `ytdl:…`, `text:…` | no | **PASS** |
| extensionless with `extension=""` | no | **PASS** |
| `…/q.jpg?token=KEEPME&x=1` | yes, **byte-for-byte intact** | **PASS** |
| `…/media/abc?format=jpg` with metadata `jpg` | yes | **PASS** |
| URL containing a raw `\n` | **no** | **PASS** |

That last row matters for continuity: the **Stage A R1 control-character guard is still governing** through the orchestrated pipeline, so no injected second line can reach `links.txt`.

Dedupe across the complete multi-target set, probed with duplicates spanning two targets:

```text
https://cdn.example/dup.jpg
https://cdn.example/x.jpg?t=A
https://cdn.example/x.jpg?t=B
```

Exact duplicates removed across targets, first occurrence wins, first-seen order preserved, query-different URLs kept distinct, and no normalization anywhere in Stage C.

The committed `test_real_filters_and_dedupe_preserve_exact_first_seen_urls` exercises the **real** frozen `filter_image_urls` and `deduplicate_urls` (only `discover_target` is mocked), and asserts `excluded_records == 2` and `duplicates_removed == 1`.

**Filtering / dedupe verdict: CORRECTLY DELEGATED.** No duplicate policy exists in `cli.py`.

---

# links.txt Purity Review

Exercised all four required scenarios and inspected raw bytes.

**1. Normal multi-link:**
```text
b'https://cdn.example/1.jpg\nhttps://cdn.example/2.png\nhttps://cdn.example/3.webp\n'
  LF only (no CR)     : True
  trailing newline    : True
  no blank lines      : True
  every line is a URL : True
```

**2. Partial-failure:** two links present, nothing else — no error text, no status, no counts.

**3. Duplicate-containing input:** three deduplicated URLs, nothing else.

**4. Zero-result:** `size: 0` — a genuine **zero-byte file**, not a file containing an explanatory message.

| Requirement | Verdict |
|---|---|
| Only qualifying direct image URLs | **MET** |
| One URL per line | **MET** |
| UTF-8 | **MET** — committed test asserts a percent-encoded non-ASCII URL round-trips byte-exactly |
| LF-only | **MET** — `newline="\n"` on the writer; no `\r` in output on Windows |
| Trailing newline when non-empty | **MET** |
| Empty result → zero-byte file | **MET** |
| No heading / count / status / JSON / diagnostics / errors / metadata / comments / blank lines | **MET** — none observed in any scenario |

`_links_content` is a two-branch function returning `""` or `"\n".join(urls) + "\n"`; there is structurally nowhere for contamination to enter.

**links.txt purity verdict: SATISFIES THE PRODUCT CONTRACT EXACTLY.**

---

# Atomic Write Review

```python
descriptor, name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
    handle.write(content); handle.flush(); os.fsync(handle.fileno())
os.replace(temporary_path, path)
```

Verified by execution:

| Property | Result |
|---|---|
| Replaces an existing file | **PASS** — old content gone, new content exact |
| Temp created in the **destination's** directory | **PASS** — `dir == path.parent`, prefix `.links.txt.` |
| No temp left behind on success | **PASS** |
| Temp cleaned up on failure | **PASS** — forced `os.replace` to raise; directory listing unchanged |
| Destination untouched on failure | **PASS** — prior content intact |

Same-directory placement guarantees same-filesystem, which is what makes `os.replace` atomic. `fsync` before replace is the correct durability ordering. **Portability to the Stage D Ubuntu runner is fine** — `mkstemp`, `fsync`, and `os.replace` all behave identically (indeed more simply) on POSIX; the Windows-specific concern would have been `os.rename` over an existing file, which `os.replace` explicitly handles.

**One minor test gap (C5, non-blocking).** `test_links_file_is_atomically_replaced` asserts no temp remains after a **successful** run. There is no test for cleanup after a **failed** write. The production code handles it correctly — I verified empirically — but the `finally` cleanup is unfrozen. Codex's report phrase "cleanup after failure" slightly overstates what the test proves.

**Atomic write verdict: CORRECTLY IMPLEMENTED.**

---

# Multi-File Consistency Assessment

Codex disclosed that a fatal failure after one artifact is replaced can leave a new artifact beside a stale or missing companion. I reproduced it by forcing the diagnostics write to fail after `links.txt` had landed:

```text
exit: 1
links.txt was already replaced: https://cdn.example/new.jpg
diagnostics.txt exists        : False
console: FloppyDisk could not run: local input or output failure.
```

**Assessment: A — an acceptable documented limitation for Phase 0.** Reasoning:

- Each artifact is **individually atomic**. No torn, truncated, or half-written file is ever produced — the failure mode is a missing or stale *companion*, never a corrupt artifact.
- **Exit 1 signals it unambiguously.** The run is not reported as success, so neither the human nor Stage D's job status can mistake it for a completed run.
- In Stage D this surfaces as a **red job**. Artifacts from a failed job are not trustworthy input by construction, and the `if: always()` upload exists to preserve evidence, not to certify it.
- Phase 1-2 never specified cross-file transactionality, and the realistic triggers (disk exhaustion, permission loss mid-run) are rare on a fresh ephemeral runner.
- Prescribing a two-phase multi-file commit would be infrastructure ahead of evidence (manual §19), for a failure that has not been observed and whose consequence is already signalled.

Worth noting neither ordering dominates: writing diagnostics first would instead leave a **stale** `links.txt` beside fresh diagnostics, which is arguably worse because a stale links file looks valid. The current ordering at least means the primary deliverable is the one that lands.

**No FIX required on this point.** If a future stage ever wants stronger guarantees, the cheap version is to stage both temp files and perform both `os.replace` calls back to back — but that should wait for evidence that it matters.

---

# diagnostics.txt Review

Actual output from a two-target run:

```text
FloppyDisk diagnostics
targets: 2
accepted targets: 2
invalid targets: 0
qualifying links: 2
unique links: 2
duplicates removed: 0
excluded records: 0
queued unresolved: 0

line 1: status=extraction-error links=1 excluded=0
  error: HttpError: 404 Not Found
  stderr:
    [gallery-dl][error] Unsupported URL 'https://…'
line 2: status=ok links=1 excluded=0
```

| Required evidence | Present |
|---|---|
| Accepted target count | **yes** |
| Invalid target count | **yes** |
| Total qualifying output links | **yes** (`qualifying links` + `unique links`) |
| Duplicates removed | **yes** |
| Excluded record count | **yes** — aggregate and per-target |
| Queued unresolved count | **yes** — aggregate and per-target |
| Original source line numbers | **yes** — for both invalid and accepted targets |
| Per-target status | **yes** |
| Qualifying / recovered counts | **yes** — `links=N` per target |
| Extraction error name/message | **yes** |
| `unsupported` / `timeout` / `bad-json` / `invocation-error` | **yes** — all four verified by parametrized test and my probes |
| Genuinely empty | **yes** — explicit `empty` marker |
| Queued unresolved | **yes** — `queued=N unresolved` |

Output is deterministic: fixed header order, invalid targets before accepted ones, per-target details in source order. Diagnostics are written to a **separate file**; `links.txt` never receives any of this content, and the committed test asserts the string `"diagnostics"` never appears in `links.txt`.

**diagnostics.txt verdict: USEFUL, DETERMINISTIC, AND FULLY SEPARATE.**

---

# Privacy Review

Probed with three deliberately distinctive markers — a `TARGETSECRET` target URL, a `MEDIASECRET` media URL, and a `STDERRSECRET` upstream stderr string:

```text
stdout: 'FloppyDisk completed: 1 accepted, 0 invalid, 1 unique links.\n'
stderr: ''

  TARGET url NOT on console            : True
  MEDIA url  NOT on console            : True
  raw stderr NOT on console            : True
  stderr IS in diagnostics (permitted) : True
  media url in links.txt (correct)     : True
  target url NOT in diagnostics        : True
```

| Requirement | Verdict |
|---|---|
| Target identity is line number, not URL | **MET** — `line N: status=…`; even rejected targets record only the line number, never `RejectedTarget.value` |
| Structured diagnostics do not repeat target/media URLs | **MET** |
| Captured upstream stderr allowed in `diagnostics.txt` | **MET** — present, correctly indented under `stderr:` |
| That exception does not leak to console stdout | **MET** |
| …to console stderr | **MET** — stderr was empty |
| …to the step summary | **MET** — verified below |
| Fatal handling avoids target URL leakage | **MET** — verified below |

This matches the Phase 1-2 privacy architecture exactly: counts to the console, line numbers in structured diagnostics, raw upstream evidence only in the downloadable artifact. The committed `test_main_success_is_quiet_about_urls_and_upstream_stderr` freezes it behaviorally with `capsys`, not by comment.

**Privacy verdict: CORRECT.**

---

# GitHub Step Summary Review

**Absent** (`GITHUB_STEP_SUMMARY` unset): pipeline runs normally, exit 0, no summary file created.

**Present:** appended successfully:

```text
## FloppyDisk

- Accepted targets: 1
- Invalid targets: 0
- Unique links: 1
- Duplicates removed: 0
- Excluded records: 0
- Queued unresolved: 0
```

| Requirement | Verdict |
|---|---|
| Works when absent | **MET** |
| Appends when present | **MET** — opened with `"a"` |
| Counts only | **MET** |
| No target URL | **MET** |
| No media URL | **MET** |
| No raw gallery-dl stderr | **MET** |
| No GitHub library or workflow dependency | **MET** — stdlib `open()` on a path from `environ`; no workflow file created |

The environment is injected via `main(..., environ=...)`, which is why the tests can exercise both branches without touching the real process environment — a clean, dependency-free design.

**Step summary verdict: CORRECT.**

---

# Exit Contract Review

Every case executed against the committed CLI.

**Exit 0 — all confirmed:**

```text
ok                         exit=0 PASS
unsupported                exit=0 PASS
extraction-error           exit=0 PASS
timeout                    exit=0 PASS
bad-json                   exit=0 PASS
invocation-error           exit=0 PASS
ok (queued only)           exit=0 PASS
zero qualifying links      exit=0 PASS
partial target failure     exit=0 PASS
```

**Exit 1 — all confirmed:**

```text
unreadable targets input    exit=1  'a required file was unavailable.'
out == diagnostics conflict exit=1  'local input or output failure.'
gallery-dl missing          exit=1  'gallery-dl executable not found.'
output write failure        exit=1  'a required file was unavailable.'
```

Step-summary write failure is treated as fatal (it falls under the `OSError` handler) — a defensible choice, consistently applied, and disclosed.

**No exit code 2 exists.** Argparse's own usage error uses exit 2, which is standard CLI convention and outside the pipeline contract.

**The distinction is coherent:** every outcome that produced *evidence about targets* exits 0 and writes artifacts; only failures of the *local pipeline itself* exit 1. That is exactly the separation Phase 1-2 required so that Stage D can distinguish "the sites refused us" from "our code broke."

**Exit contract verdict: CORRECT.**

---

# Fatal Failure Review

Stage B deliberately leaves a missing executable as `FileNotFoundError`. Stage C converts it:

```python
except FileNotFoundError as error:
    if error.filename == "gallery-dl" or str(error) == "gallery-dl":
        print("FloppyDisk could not run: gallery-dl executable not found.")
    else:
        print("FloppyDisk could not run: a required file was unavailable.")
    return 1
```

Verified: exit 1, clear message, **no traceback on console**, **no target URL leaked**, `discover.py` unmodified. A missing *targets file* correctly takes the generic branch. No gallery-dl preflight probe was invented — the seam's own exception is simply translated.

**One observation (C3, non-blocking).** The following handler is broad:

```python
except (OSError, ValueError):
    print("FloppyDisk could not run: local input or output failure.")
    return 1
```

`OSError` is appropriate — it covers the real I/O failures. `ValueError`, however, is caught only because `run_pipeline` raises it for the path conflict. Any *other* `ValueError` — from a programming defect in orchestration, filtering, or dedupe — would be reported as "local input or output failure" with exit 1, masking a genuine bug behind an I/O-sounding message.

This is not currently reachable (no other `ValueError` is raised on this path), and a top-level CLI handler converting unexpected errors to exit 1 is defensible. The tidy fix is a small dedicated exception type for the path conflict rather than `ValueError`, which would also make the handler self-documenting. **Recommended, not required** — flagged because §21 explicitly asked whether the handler catches too broadly. It does, mildly.

**Fatal failure verdict: CORRECT, with the breadth observation above.**

---

# Output Path Conflict Review

The implementation checks one collision:

```python
if output_path.resolve() == diagnostics_path.resolve():
    raise ValueError("output and diagnostics paths must be different")
```

Confirmed working: `--out X --diagnostics X` → exit 1, nothing written.

**FINDING C1 — the targets path is not protected, and colliding with it destroys the input silently.**

Probed directly:

```text
$ main --targets collide.txt --out collide.txt --diagnostics dd.txt
  exit: 0
  targets file content AFTER run: 'https://cdn.example/z.jpg\n'
  INPUT FILE OVERWRITTEN: True
```

The targets file is read once at the start, then `links.txt` is written over the same path. The user's curated input is destroyed, and **the run reports success (exit 0)**. The same applies to `--targets X --diagnostics X`.

**Why this matters.** Everything else in this system either contains a failure and reports it, or exits 1. This is the one path that causes irreversible data loss while claiming success — the single combination the Phase 0 design consistently rejects. Stage C is the stage that owns output policy, and the implementation has already established that path conflicts are fatal; leaving the *destructive* collision unchecked is an incompleteness in its own stated policy, not a new policy I am inventing.

**Bounding the severity honestly:** this is **not reachable in the Stage D workflow**, which uses three fixed distinct paths. It requires the operator to type the same path twice. Nothing else in Stage C is affected.

**FINDING C2 — the path-conflict contract has no test at all.** No Stage C test covers `--out == --diagnostics` (the check that exists) or any targets collision (the check that does not). The existing production check could be deleted today and the suite would stay green.

Smallest corrective scope for C1 + C2, in the already-authorized Stage C files:

1. **`floppydisk/cli.py`** — extend the existing comparison so no output path may equal the resolved targets path. Roughly three lines, symmetric with the check already present.
2. **`tests/test_cli.py`** — one test freezing the conflict contract: `out == diagnostics` rejected, `targets == out` rejected, `targets == diagnostics` rejected, each exit 1, and the targets file left intact.

**Output path conflict verdict: INCOMPLETE — see FIX below.**

---

# Elevated Pytest Permission Incident Review

Codex reported an anomalous `64 passed, 21 errors` inside the elevated Git commit process, attributed to Windows blocking pytest's global temp root. I did not take this on trust — and I reproduced it.

### It reproduces in my environment, 5 for 5

```text
$ python -m pytest -p no:cacheprovider -q tests/test_cli.py
1 passed, 21 errors in 3.87s   (×5 consecutive runs, identical)
```

### Root cause, isolated

```text
_pytest/tmpdir.py:213: in getbasetemp
    basetemp = make_numbered_dir_with_cleanup(...)
E   PermissionError: [WinError 5] Access is denied:
    'C:\Users\dmcal\AppData\Local\Temp\pytest-of-dmcal'
_pytest/pathlib.py:175: PermissionError
```

The directory exists (created **Sep 2 13:08**, matching Codex's elevated commit run) but is now inaccessible from a normal context — even `icacls` cannot read it:

```text
C:\Users\dmcal\AppData\Local\Temp\pytest-of-dmcal: Access is denied.
```

The global temp root itself is writable (I created and removed a probe directory there successfully). The blockage is specific to that one pytest-owned directory.

### Four independent lines of evidence that this is environmental, not a product defect

1. **No FloppyDisk frame appears anywhere in the stack.** The failure is entirely inside `_pytest/tmpdir.py` and `_pytest/pathlib.py`.
2. **It fails at SETUP**, before any test body executes.
3. **It partitions exactly along the `tmp_path` fixture boundary.** I counted the fixture usage programmatically: **21 tests request `tmp_path`; exactly 1 does not** (`test_python_module_entry_point_…`). Predicted outcome under a broken temp root: 63 Stage A/B + 1 = **64 passed, 21 errors** — precisely Codex's reported figures. A real product or flakiness defect could not partition that cleanly along a pytest fixture boundary.
4. **The decisive control:** same tests, same code, same pytest, only the temp root changed —

```text
$ python -m pytest -p no:cacheprovider -q tests/test_cli.py --basetemp=<accessible dir>
22 passed in 0.39s
```

### Conclusion

**Category A — an elevated-process Windows temp-root artifact. No product or test defect.** Recorded as non-blocking evidence.

**One addition beyond Codex's account, worth knowing:** the artifact is **not transient**. The elevated run left behind a `pytest-of-dmcal` directory that a normal-privilege process cannot manage, so it will keep breaking local `tmp_path` runs until that directory is removed or its ACL reset from an elevated shell. Codex's post-commit reruns passed, so its context still had access; mine does not, and reproduces 100%. This is host housekeeping — **I have not touched it**, since it is outside the repository and a destructive filesystem action on the user's machine.

**Stage D is unaffected:** the GitHub Ubuntu runner starts with a fresh temp root and no elevation mismatch. The practical guidance is simply to avoid running pytest inside elevated git hook processes.

---

# .gitignore Review

```diff
-.cursorindexingignore
\ No newline at end of file
+.cursorindexingignore
+
+# FloppyDisk generated output
+links.txt
+diagnostics.txt
```

Verified programmatically that the change is strictly additive:

```text
old lines: 181   new lines: 185
old is a strict prefix of new : True
added lines: ['', '# FloppyDisk generated output', 'links.txt', 'diagnostics.txt']
any old line removed/changed  : []
```

| Requirement | Verdict |
|---|---|
| Append-only | **MET** — old content is a strict prefix of new |
| Existing entries preserved | **MET** — zero removals or modifications |
| Only necessary newline normalization | **MET** — the sole non-append artifact is terminating the previously unterminated final line, which is unavoidable when appending. Codex disclosed this. |
| No unrelated ignore pattern changed | **MET** |
| Only authorized exclusions added | **MET** — exactly `links.txt` and `diagnostics.txt` |

**.gitignore verdict: CORRECT.**

---

# Breadcrumb Review

`cli.py` lines 15–33, sited above the module's constants and orchestration.

**BREADCRUMBS - WAS** — *"Stage A gave this module only target parsing. Stage C expands it into orchestration after the filtering and discovery seams were separately proven and frozen."* Real, verifiable history, and it records the **why of the sequencing** — that orchestration deliberately came last, after its dependencies were independently proven. That is the durable lesson.

**BREADCRUMBS - IS** — covers ownership (*"orchestration, output purity, diagnostics separation, and failure containment"*), the purity rationale (*"links.txt carries URLs and nothing else; diagnostics exist specifically to keep it pure"*), partial-failure philosophy (*"Routine partial target failure is useful evidence, so surviving links remain usable"*), and all three evidence rules — line numbers for privacy, errors retained *"even beside surviving records"*, and queued work reported *"so profile fan-out is not mistaken for emptiness."*

**BREADCRUMBS - WILL BE** — *"This exit/output boundary remains usable by GitHub Actions or a later trigger surface without making those callers own extraction or filtering policy."* Protects the Stage D and future-Pages optionality without building either.

Every item the review brief asked for is present. The prose is architectural WHY, concise, and free of changelog detail — no commit references, no bug numbers, no "changed X to Y".

**Breadcrumb verdict: DURABLE AND ACCURATE.**

---

# Tests Inspected

All 22 read. Count reconciles: 17 test functions, with parametrization expanding two of them (×4 routine statuses, ×3 exit-zero statuses) to 22 cases.

### Strong

- **`test_real_filters_and_dedupe_preserve_exact_first_seen_urls`** — the integration test that matters. Only `discover_target` is mocked; the **real frozen** `filter_image_urls` and `deduplicate_urls` execute. Asserts exact output bytes, `excluded_records == 2`, `duplicates_removed == 1`, cross-target dedupe, query-distinctness, and uppercase `"JPG"` metadata.
- **`test_python_module_entry_point_…`** — spawns a real `subprocess.run([sys.executable, "-m", "floppydisk", "--help"])`. Genuine end-to-end entry-point proof, not a mock.
- **`test_main_success_is_quiet_about_urls_and_upstream_stderr`** — `capsys` with three distinct markers; proves privacy behaviorally and confirms stderr *does* reach diagnostics.
- **`test_step_summary_is_optional_and_counts_only`** — exercises both branches in one test and asserts private strings are absent.
- **`test_links_file_is_atomically_replaced`** — wraps `os.replace` to assert the temp file's parent equals the destination's parent, and globs for leftover temps.
- **`test_partial_extraction_error_preserves_link_and_failure_details`** and **`test_queue_only_is_distinct_from_genuinely_empty`** — freeze the two contracts the Stage B correction existed to enable.
- **`test_parsing_line_numbers_and_invalid_targets_feed_discovery_once`** — asserts the exact `call_args_list`, proving invalid targets never reach discovery and line numbers survive skips.

### Co-drift assessment

Expected values are hardcoded literals — exact file contents, exact diagnostic strings, exact call lists. Nothing is imported from `cli.py` and asserted against itself. `discover_target` is mocked only at its public seam; the frozen filter and dedupe run for real. **No co-drift or tautological tests found.**

### Gaps

1. **No output-path-conflict test at all** (C2) — neither the existing `out == diagnostics` check nor any targets collision.
2. **No atomic-write cleanup-after-failure test** (C5) — the success-path cleanup is covered; the `finally` branch is not.

Both are narrow and both are addressed by the corrective scope below.

---

# Independent Tests Run

Run by me, unmodified. Because of the environmental temp-root block documented above, the required commands were run both as specified and with `--basetemp` redirected to an accessible directory.

```text
$ python -m pytest -p no:cacheprovider -q tests/test_cli.py
1 passed, 21 errors            <- environmental (pytest tmp_path base dir), 5/5 reproducible

$ python -m pytest -p no:cacheprovider -q tests/test_cli.py --basetemp=<accessible>
22 passed in 0.39s

$ python -m pytest -p no:cacheprovider -q --basetemp=<accessible>
85 passed in 0.42s

$ python -m pytest -p no:cacheprovider tests/test_targets.py tests/test_filters.py
46 passed in 0.04s             <- no tmp_path, unaffected

$ python -m pytest -p no:cacheprovider tests/test_discover.py
17 passed in 0.03s             <- no tmp_path, unaffected
```

---

# Exact Test Results

| Metric | Stage C | Full suite |
|---|---|---|
| Command | `pytest -p no:cacheprovider -q tests/test_cli.py --basetemp=<accessible>` | `pytest -p no:cacheprovider -q --basetemp=<accessible>` |
| Collected | **22** | **85** |
| Passed | **22** | **85** |
| Failed | **0** | **0** |
| Errors | **0** | **0** |
| Skipped | **0** | **0** |
| Warnings | **0** | **0** |
| Duration | 0.39 s | 0.42 s |
| pytest / Python | 9.1.1 / 3.14.2 | 9.1.1 / 3.14.2 |

**Both reproduce Codex's claims exactly**, and the reconciliation holds: **46 Stage A + 17 Stage B + 22 Stage C = 85.**

The `1 passed, 21 errors` result under the default temp root is fully explained in the incident section and is not a test or product failure.

---

# Stage A/B Regression Verification

Blob comparison across the Stage C commit (`0972a1e → fe4b3d6`):

```text
UNCHANGED  floppydisk/filters.py
UNCHANGED  floppydisk/discover.py
UNCHANGED  floppydisk/__init__.py
UNCHANGED  tests/test_filters.py
UNCHANGED  tests/test_targets.py
UNCHANGED  tests/test_discover.py
UNCHANGED  tests/fixtures/**   (empty diffstat)
```

`cli.py` was legitimately modified (an authorized Stage C path), and I verified by AST comparison that **all five frozen Stage A definitions inside it are identical** and Stage C only added new ones.

Stage A: **46/46 passing.** Stage B: **17/17 passing.** No frozen contract changed.

---

# Protected Files Verification

| Protected item | Result |
|---|---|
| `floppydisk/filters.py` | **UNCHANGED** (blob) |
| `floppydisk/discover.py` | **UNCHANGED** (blob) |
| `floppydisk/__init__.py` | **UNCHANGED** (blob) |
| `tests/test_filters.py`, `test_targets.py`, `test_discover.py` | **UNCHANGED** (blob) |
| `tests/fixtures/**` | **UNCHANGED** (empty diffstat) |
| `README.md` | **UNCHANGED** — still identical to initial commit `b5e197e` |
| `.gitattributes` | **UNCHANGED** — still identical to `b5e197e` |
| Existing reports | **UNCHANGED** — absent from both Stage C commits |
| `main` | **UNCHANGED** — `b5e197efde55…` |
| `.github/` | **ABSENT** |
| `targets.txt` | **ABSENT** |
| `links.txt`, `diagnostics.txt`, `pyproject.toml`, `requirements.txt` | **ABSENT** |

No Stage D artifacts exist.

**Protected-file verdict: FULLY RESPECTED.**

---

# Scope / Blast Radius Review

Authorized: `floppydisk/cli.py`, `floppydisk/__main__.py`, `tests/test_cli.py`, and append-only `.gitignore` output exclusions, plus the separate report.

Codex touched **exactly those four paths**, with the report in its own documentation commit. No opportunistic refactor — the frozen Stage A definitions inside `cli.py` were left byte-identical rather than tidied, which is exactly the right restraint (manual §18).

Proportionality: 228 lines of orchestration for the complete pipeline plus two output contracts, and 371 lines of tests. The 1.6:1 test-to-code ratio is appropriate for the stage that owns the product's primary deliverable.

**Scope verdict: EXACT.**

---

# Regressions

**No regressions.** Stages A and B are blob-identical and fully passing; 85/85 overall.

Two new findings, both in the same narrow area:

- **C1 (blocking):** `--targets` colliding with `--out` or `--diagnostics` is unchecked. The input file is silently overwritten and the run exits **0**. Destructive and silent. Not reachable in the Stage D workflow.
- **C2 (same fix):** the output-path-conflict contract has **no test coverage at all**, so even the check that does exist is unfrozen.

Three non-blocking observations, recorded for a future pass rather than as corrective work:

- **C3:** `except (OSError, ValueError)` catches `ValueError` broadly; a programming defect would be reported as an I/O failure. Not currently reachable.
- **C4:** the `"gallery-dl"` literal in `cli.py` is a cosmetic seam leak affecting only which message is printed.
- **C5:** atomic-write cleanup-after-failure works (verified) but is untested.

Codex's Phase 1-12 report was accurate on every claim I checked — commits, parentage, file lists, counts, contracts, and the incident account — with one small overstatement: the report implies test coverage for temp "cleanup" that in fact only covers the success path.

---

# Known Unknowns

| Unknown | Status |
|---|---|
| Real GitHub-hosted network, site blocking, and anti-bot behavior | Stage D evidence — the central Phase 0 question |
| Whether the 120 s per-target timeout suits representative targets | Unmeasured implementation default; Stage D will show it |
| Real-world `extension == ''` frequency | Stage D evidence; `excluded records` now reports it |
| Which real targets emit Queue records, and at what magnitude | Stage D evidence; `queued unresolved` now reports it |
| Signed / expiring CDN URL lifetime | Stage D evidence |
| Percent-encoded extension behavior across site-specific extractors | Unresolved since Phase 1-9 |
| Whether real `Message.Url` values can carry raw control characters | Not observed; Stage A rejects them safely, verified again here through the full pipeline |
| Host housekeeping: the inaccessible `pytest-of-dmcal` temp directory | Environmental; blocks local `tmp_path` runs until reset. No Stage D impact. |

---

# GO / FIX / STOP Verdict

# **FIX**

The Stage C architecture is **valid and unchanged**, and almost all of it is GO-quality. The boundary holds completely — `cli.py` carries no gallery-dl protocol knowledge and no duplicated filter or dedupe policy, and the frozen Stage A definitions inside it are AST-identical. `links.txt` is byte-exact and pure across all four scenarios including a genuine zero-byte empty file. Partial extraction errors contribute their surviving links while remaining visibly failed, with error name, message, and recovered count in diagnostics — the payoff of the B1 correction, working end to end. Queued work is distinguishable from emptiness. Privacy holds on console, diagnostics, and step summary, proven with distinctive markers. The atomic write is correct and portable, including cleanup on failure. Every exit-code row is right, with no exit 2. Breadcrumbs are durable. Blast radius was exact, `.gitignore` is strictly append-only, protected files are blob-identical, and 22/22 and 85/85 reproduce.

I also independently confirmed the elevated-pytest incident was environmental — reproducing it, isolating it to a `PermissionError` inside pytest's own `tmpdir.py`, showing it partitions exactly along the `tmp_path` fixture boundary, and clearing it entirely with `--basetemp`. **No product defect.**

One defect prevents GO:

**C1 — a targets path colliding with an output path silently destroys the user's input file and exits 0.** The implementation already establishes that path conflicts are fatal (it rejects `out == diagnostics`); it simply does not cover the collision that actually causes data loss. **C2** compounds it: the conflict contract has no test at all, so the existing check is unfrozen. Silent, irreversible data loss reported as success is the one outcome this system's design consistently refuses everywhere else, and Stage C is the stage that owns output policy.

I am being deliberate about proportion: this is **not reachable in the Stage D workflow**, which uses three fixed distinct paths, and it requires the operator to type the same path twice. Nothing else in Stage C is affected. The corrective work is roughly three production lines and one test.

**Smallest corrective scope** — within the already-authorized Stage C surface, nothing else:

1. **`floppydisk/cli.py`** — extend the existing `resolve()` comparison so no output path may equal the resolved targets path.
2. **`tests/test_cli.py`** — one test freezing the conflict contract: `out == diagnostics`, `targets == out`, and `targets == diagnostics` each rejected with exit 1, and the targets file left intact.

Optionally in the same pass, since the files are already open: narrow the `ValueError` catch (C3) by raising a small dedicated exception for the conflict, and add the cleanup-after-failure test (C5). Neither is required.

All Phase 1-2 protected files and stop conditions remain in force. The next report is `Claude and Codex Reports/Codex Reports/Phase 1-14 - Stage C Correction Report.md`, and the existing Stage C commit should stand with the correction as a follow-up rather than an amend.

**Stage D is NOT authorized.** Per manual §11, fix the current stage; do not advance.

---

# Recommendation

Return this review to the ChatGPT + human table with four items:

1. **Approve the C1/C2 corrective pass** using the scope above. State the red-before-green expectation explicitly: a test asserting `--targets X --out X` exits 1 and leaves the targets file intact must **fail** against the current implementation before the fix.

2. **The review table may reasonably overrule me on C1.** If the product owner judges that a same-path typo is acceptable operator error given that Stage D never hits it, then documenting the limitation is a defensible alternative to fixing it. I recommend the fix because three lines is cheaper than the documentation and the failure is silent — but this is a product judgment, and the human is the final authority (manual §71). **C2 should be closed either way**, since an untested check is an unfrozen contract regardless of how C1 is resolved.

3. **Do the host housekeeping before the next local test run.** From an elevated shell, remove or reset `C:\Users\dmcal\AppData\Local\Temp\pytest-of-dmcal`, and avoid running pytest inside elevated git hook processes. Otherwise every local `tmp_path` run will keep showing `21 errors` that have nothing to do with the code. I deliberately did not touch it.

4. **Stage D remains blueprint-ready.** Nothing in this review changes the Phase 1-2 Stage D design. When it is authorized, two carry-forwards belong in its handoff: the workflow must pass three **distinct** paths (which also sidesteps C1 entirely), and the Phase 1-9 corrected classification table — not Phase 1-2's obsolete exit-code rows — is authoritative for interpreting per-target results.

After the correction is implemented and independently re-verified, I expect Stage C to reach **GO** quickly. The pipeline underneath this defect is sound, and the Phase 0 evidence chain — pure links, visible partial failures, distinguishable queued work, private diagnostics — is fully assembled and working.

**Stage D: NOT READY.** It becomes ready once C1/C2 are closed, re-reviewed, and approved.

---

*End of Phase 1-13 Stage C architecture review. No production code, tests, fixtures, or `.gitignore` were modified. All findings were verified by direct inspection of the repository and by executing the committed CLI through thirteen behavioral probes in a scratchpad outside the repository; the elevated-pytest incident was reproduced and isolated without altering the host temp directory.*
