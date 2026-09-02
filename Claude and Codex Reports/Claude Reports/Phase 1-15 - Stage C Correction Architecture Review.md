# Phase 1-15 — Stage C Correction Independent Architecture Review

Timestamp: Wednesday, September 2, 2026 at 3:00 PM MDT
Location: Calgary, Alberta

---

# Stage

Phase 1-15 — Independent review of Codex's Phase 1-14 Stage C C1/C2 path-conflict correction. Architect / Orchestrator only. No production code, tests, or `.gitignore` modified.

---

# Goal

Independently verify that the destructive path-collision defect (C1) is closed for all three collision forms, that the previously untested conflict contract (C2) is now behaviorally frozen, that the new tests genuinely fail against the pre-correction implementation, and that no other Stage C behavior was altered.

Then issue **GO**, **FIX**, or **STOP**, and state whether the branch is safe to checkpoint-push.

---

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 3:00 PM MDT
Location: Calgary, Alberta

Cross-checked two ways: system local clock and UTC (`2026-09-02 21:00Z`) converted at UTC−6 for Mountain Daylight Time. Both agree.

---

# Repository / Branch / Git Status

| Check | Result |
|---|---|
| Repository root | `C:/Users/dmcal/Documents/GitHub/FloppyDisk` — **matches expected** |
| Current branch | `Phase-0` — **matches expected** |
| HEAD (before my report commit) | `7764898040b4baf84945ae414d6e01056205585f` |
| `git status -sb` | `## Phase-0...origin/Phase-0 [ahead 5]` |
| Tracked working tree | **Clean** |
| Untracked | **None** |
| `main` | Still `b5e197e Initial commit` — untouched |

```text
7764898  docs: add Phase 1-14 Stage C correction report
355883e  fix: reject destructive Stage C path conflicts
f040d85  docs: add Phase 1-13 Stage C architecture review          <- intact
80468f8  docs: add Phase 1-12 Stage C implementation report
fe4b3d6  phase 0c: pipeline orchestration and links.txt output contract  <- intact, not amended
0972a1e  docs: add Phase 1-11 Stage B correction architecture review     <- pushed checkpoint
96818b9  docs: add Phase 1-10 Stage B correction report
0c7605b  fix: surface gallery-dl datajob errors and queued records       <- Stage B frozen
```

Original Stage C implementation commit and my Phase 1-13 review commit are both intact and ancestors of HEAD. The Phase 1-14 correction is a follow-up commit, and its report is separate. **No Stage D work exists** — `.github/`, `targets.txt`, `links.txt`, `diagnostics.txt` all absent.

**Nothing was cleaned, restored, stashed, staged, amended, rebased, or pushed during this review**, except the authorized Phase 1-15 report commit recorded at the end.

---

# Inputs Reviewed

1. **`AI-Assisted Development Operating Manual.md`** — read in full earlier in this session. Verified unchanged before relying on that read: **41,204 bytes, mtime Sep 2 10:22, sha256 prefix `1eee4a7373411647`** — byte-identical.
2. **`Phase 1-13 - Stage C Architecture Review.md`** — my own C1/C2 FIX definition, applied here as the standard.
3. **`Phase 1-14 - Stage C Correction Report.md`** — read in full. Treated as **evidence, not proof** (manual §46).
4. **`Phase 1-12`** and **`Phase 1-11`** — consulted for the Stage C baseline and corrected `DiscoveryResult` semantics.
5. **The repository** — both new commit objects, complete diffs, and **direct execution of the committed CLI** across collision probes, a full Stage C contract regression sweep, and a read-only red-before-green reproduction.

---

# Correction Commit Verification

| Claim | Verification | Result |
|---|---|---|
| Commit `355883e5…` exists | `git cat-file -t` → `commit` | **CONFIRMED** |
| On `Phase-0` | `git branch --contains` → `Phase-0` | **CONFIRMED** |
| Message `fix: reject destructive Stage C path conflicts` | `git log -1 --format=%s` | **CONFIRMED** — exact |
| Parent | `f040d853058e…` — my Phase 1-13 review commit | **CONFIRMED** |
| **Original Stage C `fe4b3d6b…` NOT amended** | object resolves, original date `13:02:26` preserved, still an ancestor of HEAD | **CONFIRMED** |
| Only two authorized files changed | see below | **CONFIRMED** |

```text
M	floppydisk/cli.py
M	tests/test_cli.py
```

Diffstat: **38 insertions, 2 deletions** — 9 lines in `cli.py`, 31 in tests. No other path appears; no report file appears in the implementation commit.

**Correction commit verdict: CLEAN.**

---

# Phase 1-14 Report Commit Verification

Codex stated the report was committed separately without giving the hash. I identified it independently.

**Documentation commit: `7764898040b4baf84945ae414d6e01056205585f`**
Message: `docs: add Phase 1-14 Stage C correction report`
Parent: `355883e5…` (the correction commit)

Contents — exactly one file:

```text
A	Claude and Codex Reports/Codex Reports/Phase 1-14 - Stage C Correction Report.md
```

No production code, no tests, no older report edits, no historical rewrites.

**Report commit verdict: CLEAN.**

---

# C1 Verification

### The production change — the entire diff

```diff
-    if output_path.resolve() == diagnostics_path.resolve():
-        raise ValueError("output and diagnostics paths must be different")
+    resolved_paths = {
+        targets_path.resolve(),
+        output_path.resolve(),
+        diagnostics_path.resolve(),
+    }
+    if len(resolved_paths) != 3:
+        raise ValueError("targets, output, and diagnostics paths must be different")
```

A set of three resolved paths; fewer than three distinct members means some pair collides. One comparison covers all three pairwise collisions — simpler than three explicit checks, and it cannot be partially extended by accident.

### `--targets X --out X` — the Phase 1-13 blocking defect

Probed directly against the committed correction, with a distinctive `TARGETSECRET` target URL:

```text
--- C1a: --targets X --out X ---
  exit 1                       : PASS (got 1)
  discover_target NOT called   : PASS (0 calls)
  targets byte-for-byte intact : PASS
  no destructive/stray output  : PASS (stray=[])
  no target URL on console     : PASS
  concise fatal message        : 'FloppyDisk could not run: local input or output failure.'
  no traceback                 : PASS
```

In Phase 1-13 this exact invocation returned **exit 0** and left `targets.txt` containing the discovered link. Every required property now holds.

**C1 verdict: CLOSED.**

---

# Targets / Diagnostics Collision Verification

```text
--- C1b: --targets X --diagnostics X ---
  exit 1                       : PASS (got 1)
  discover_target NOT called   : PASS (0 calls)
  targets byte-for-byte intact : PASS
  no destructive/stray output  : PASS (stray=[])
  no target URL on console     : PASS
  concise fatal message        : 'FloppyDisk could not run: local input or output failure.'
  no traceback                 : PASS
```

Behaviour is **exactly symmetric** with the targets/out case — as it must be, since both are handled by the same set-uniqueness check rather than by separate branches that could drift apart.

**Targets/diagnostics verdict: CLOSED.**

---

# Output / Diagnostics Collision Verification

The pre-existing rule, checked for regression:

```text
--- prior rule: --out X --diagnostics X ---
  exit 1                       : PASS (got 1)
  discover_target NOT called   : PASS (0 calls)
  targets byte-for-byte intact : PASS
  no destructive/stray output  : PASS (stray=[])
  no target URL on console     : PASS
  concise fatal message        : 'FloppyDisk could not run: local input or output failure.'
  no traceback                 : PASS
```

The original rule survives the rewrite intact — and it is now **stronger** than before, because it additionally guarantees discovery is skipped and the targets file is preserved, properties the old pairwise check happened to have but never proved.

**Output/diagnostics verdict: NO REGRESSION.**

---

# Path Validation Review

| Requirement | Verdict |
|---|---|
| Comparison happens **before discovery** | **MET** — the check precedes the loop; `discover_target` recorded 0 calls in all three probes |
| Comparison happens **before destructive writes** | **MET** — the check precedes `targets_path.open()` and both `_atomic_write_text` calls; no stray artifact was created in any probe |
| **Resolved** paths compared | **MET** — `.resolve()` on all three, so equivalent spellings of the same destination collapse |
| No broader filesystem policy introduced | **MET** — no permission checks, no directory policy, no path-shape rules; only same-destination equality |
| Minimal and proportionate | **MET** — nine lines in one function |

The check now precedes reading input as well as writing it, which is a real improvement over the original placement: the old rule ran before writes but the collision it missed was precisely the one that destroyed the input.

Two small notes, neither a concern:

- `Path.resolve()` is non-strict by default, so it works on paths that do not yet exist — necessary, since `--out` and `--diagnostics` normally do not. A missing **targets** file still reaches `open()` and raises `FileNotFoundError`, which I confirmed still exits 1.
- The exception message changed from *"output and diagnostics paths must be different"* to *"targets, output, and diagnostics paths must be different"*, but it is never user-visible: `main()` catches the `ValueError` and prints its own concise message. No console-facing change.

**Path validation verdict: CORRECT, MINIMAL, WELL-PLACED.**

---

# Red-Before-Green Review

Codex reports `2 failed, 1 passed, 22 deselected` before the production change. I reproduced this **without altering git history**, extracting the pre-correction `cli.py` read-only from `f040d85` into a scratchpad and running the **post-correction** test file against it:

```text
pre-fix cli.py has 3-path check?    0   (confirmed absent)
post-fix tests have collision test? 1   (confirmed present)

$ python -m pytest -p no:cacheprovider -q tests/test_cli.py -k "path_collisions"
>       assert code == 1
E       assert 0 == 1
---------------------------- Captured stdout call -----------------------------
FloppyDisk completed: 1 accepted, 0 invalid, 0 unique links.

FAILED …test_main_rejects_path_collisions…[targets-out]
FAILED …test_main_rejects_path_collisions…[targets-diagnostics]
2 failed, 1 passed, 22 deselected in 0.12s
```

**Matches Codex's claim exactly** — the same counts, the same two failing parameters, the same assertion site, and the same reason. The captured stdout is the Phase 1-13 defect verbatim: the pre-fix CLI reporting *"FloppyDisk completed"* on an invocation that was overwriting its own input. The `out-diagnostics` case passed, correctly reflecting that the pre-existing rule already worked.

**Red-before-green verdict: INDEPENDENTLY CONFIRMED.** The new tests genuinely detect the old defect.

---

# C2 Test Review

```python
@pytest.mark.parametrize("collision", ["out-diagnostics", "targets-out", "targets-diagnostics"])
@patch("floppydisk.cli.discover_target")
def test_main_rejects_path_collisions_without_discovery_or_input_damage(...):
    ...
    assert code == 1
    discover.assert_not_called()
    assert targets.read_bytes() == original_targets
    for candidate in {output, diagnostics} - {targets}:
        assert not candidate.exists()
```

| Requirement | Verdict |
|---|---|
| All three cases behaviorally frozen | **MET** — parametrized over `out-diagnostics`, `targets-out`, `targets-diagnostics` |
| Asserts exit 1 | **MET** |
| Asserts `discover_target` not called | **MET** — `discover.assert_not_called()` |
| Asserts targets input preserved | **MET** — `read_bytes()` comparison, byte-for-byte, not text |
| Asserts no unexpected artifact produced | **MET** — the set-difference loop checks only the genuinely distinct paths, correctly excluding `targets` (which legitimately exists) |
| Operates through the public CLI | **MET** — calls `main(argv, environ=...)`, not `run_pipeline` and not an internal helper |

**Co-drift assessment:** expected values are hardcoded literals (`1`, byte content captured before the call, `assert_not_called`). Nothing is imported from `cli.py` and asserted against itself; the test never references `resolved_paths` or the exception message, so a reimplementation using a different mechanism would still be caught. Verified non-tautological by the red run above.

One design note worth crediting: asserting `read_bytes()` rather than `read_text()` freezes the preservation guarantee at the byte level, which is the right granularity for a data-loss regression.

**C2 verdict: MEANINGFUL AND BEHAVIORAL.**

---

# Stage C Contract Regression Review

I verified structurally that nothing else could have changed, then confirmed behaviorally that nothing did.

**Structural — AST comparison of `cli.py` across the correction:**

```text
definitions before: 14   after: 14
  CHANGED: run_pipeline
added: none   removed: none
ONLY run_pipeline changed: True
```

**Behavioral — regression sweep against the committed post-correction code:**

```text
normal 3-distinct-path run    : PASS
links.txt purity (LF, no CR)  : PASS
partial-error links survive   : PASS
partial-error still visible   : PASS
later target still ran        : PASS
queue vs empty distinguish    : PASS
zero-byte links on empty      : PASS
filter+dedupe still frozen    : PASS
console privacy               : PASS
stderr still in diagnostics   : PASS
step summary counts-only      : PASS
routine failures still exit 0 : PASS
missing targets still exit 1  : PASS
```

| Contract | Verdict |
|---|---|
| `python -m floppydisk` entry point | **UNCHANGED** — `__main__.py` blob-identical |
| Target parsing | **UNCHANGED** — `parse_targets` AST-identical |
| Discovery orchestration | **UNCHANGED** |
| Partial extraction-error surviving links | **UNCHANGED** |
| Queue-only diagnostics | **UNCHANGED** |
| Filtering | **UNCHANGED** — `filters.py` blob-identical |
| Dedupe | **UNCHANGED** |
| `links.txt` purity | **UNCHANGED** |
| Diagnostics format | **UNCHANGED** |
| Atomic writes | **UNCHANGED** — `_atomic_write_text` AST-identical |
| Console privacy | **UNCHANGED** |
| Step-summary behavior | **UNCHANGED** |
| Exit policy except newly rejected collisions | **UNCHANGED** — all five routine statuses still exit 0; missing targets still exits 1 |

**No Stage C redesign occurred.**

---

# C3/C4/C5 Status

Phase 1-13 classified three observations as explicitly non-blocking. Codex deliberately left them alone, which was correct — addressing them would have exceeded the authorized corrective scope.

| Observation | Present state |
|---|---|
| **C3** — broad `except (OSError, ValueError)` | **UNCHANGED** — still one occurrence, exactly as before |
| **C4** — cosmetic `"gallery-dl"` literal in `cli.py` | **UNCHANGED** — still one occurrence |
| **C5** — atomic-write failure-cleanup branch lacks direct test coverage | **UNCHANGED** — still no such test |

**No new evidence of a present correctness defect** emerged for any of the three during this review. C3 remains unreachable (no other `ValueError` is raised on that path), C4 remains message-selection only, and C5's production behavior remains correct — I verified the `finally` cleanup empirically in Phase 1-13.

They stay **non-blocking observations**, not findings. Not converted, not implemented.

---

# Pytest Temp-Root Review

Codex reports the default temp root was accessible during Phase 1-14, that no `--basetemp` was needed, and that no host workaround was performed.

**In my context the artifact persists.** Running the required commands normally, exactly as specified:

```text
$ python -m pytest -p no:cacheprovider -q tests/test_cli.py
1 passed, 24 errors in 4.25s

$ python -m pytest -p no:cacheprovider -q
64 passed, 24 errors in 4.36s
```

Same root cause as Phase 1-13 — the failure chain is entirely inside pytest's own fixture machinery (`_pytest/tmpdir.py` → `_ensure_relative_to_basetemp` → `getbasetemp`), and the directory remains unreadable even to `icacls`:

```text
C:\Users\dmcal\AppData\Local\Temp\pytest-of-dmcal: Access is denied.
```

Its mtime is now **14:52**, two minutes after Codex's 14:50 correction commit — so Codex's run did successfully use and touch that directory, while my process still cannot. Both accounts are accurate; the access differs by process context, not by code.

**The fixture-boundary reconciliation is exact again**, and it tracks the suite's growth:

```text
Stage C tests using tmp_path : 24
Stage C tests NOT using it   : 1
predicted under broken root  : 64 passed, 24 errors
observed                     : 64 passed, 24 errors
```

Phase 1-13 saw 21 errors when Stage C had 21 `tmp_path` tests; it now shows 24 with 24 such tests. A product or flakiness defect would not track a pytest fixture count so precisely.

**Decisive control** — same tests, same code, only the temp root changed:

```text
$ pytest -q tests/test_cli.py --basetemp=<accessible>   →  25 passed
$ pytest -q                  --basetemp=<accessible>   →  88 passed
```

**Verdict: environmental, unchanged from Phase 1-13. Not a product or test defect, and no product code was touched because of it.**

Correcting one point for the record: the temp-root problem has **not** disappeared. It is context-dependent — accessible to Codex's process, not to mine. It remains host housekeeping (remove or reset that directory from an elevated shell), it has no Stage D impact since the Ubuntu runner starts with a fresh temp root, and I have deliberately not touched it.

---

# Tests Inspected

The correction adds exactly one parametrized test, reviewed in full above. I also re-read the surrounding Stage C suite to confirm the addition did not disturb it: the new test is inserted between `test_main_output_failure_exits_one` and `test_main_missing_gallery_dl_is_fatal_without_url_leak`, with no edits to either neighbour and no changes anywhere else in the file (the diff is purely a 31-line insertion).

Stage C test count moves from 22 to 25 — exactly the three parametrized collision cases, no more.

---

# Independent Tests Run

Run by me, unmodified. Per §13 the required commands were run **normally first**, then repeated with an accessible basetemp because of the documented host artifact.

```text
$ python -m pytest -p no:cacheprovider -q tests/test_cli.py
1 passed, 24 errors in 4.25s          <- environmental (host temp-root ACL)

$ python -m pytest -p no:cacheprovider -q
64 passed, 24 errors in 4.36s         <- environmental, same cause

$ python -m pytest -p no:cacheprovider -q tests/test_cli.py --basetemp=<accessible>
25 passed in 0.38s

$ python -m pytest -p no:cacheprovider -q --basetemp=<accessible>
88 passed in 0.43s

$ python -m pytest -p no:cacheprovider -q tests/test_targets.py tests/test_filters.py --basetemp=<accessible>
46 passed in 0.04s

$ python -m pytest -p no:cacheprovider -q tests/test_discover.py --basetemp=<accessible>
17 passed in 0.03s
```

---

# Exact Test Results

| Metric | Stage C | Full suite |
|---|---|---|
| Command | `pytest -p no:cacheprovider -q tests/test_cli.py --basetemp=<accessible>` | `pytest -p no:cacheprovider -q --basetemp=<accessible>` |
| Collected | **25** | **88** |
| Passed | **25** | **88** |
| Failed | **0** | **0** |
| Errors | **0** | **0** |
| Skipped | **0** | **0** |
| Warnings | **0** | **0** |
| Duration | 0.38 s | 0.43 s |
| pytest / Python | 9.1.1 / 3.14.2 | 9.1.1 / 3.14.2 |

**Both reproduce Codex's claims exactly**, and the reconciliation holds: **46 Stage A + 17 Stage B + 25 Stage C = 88**, with Stage C growing by exactly the three new collision cases.

---

# Stage A/B Regression Verification

Blob comparison against the **frozen baselines**, not merely against the previous commit:

```text
IDENTICAL to Stage A frozen 43e657b:  floppydisk/filters.py
IDENTICAL to Stage A frozen 43e657b:  tests/test_filters.py
IDENTICAL to Stage A frozen 43e657b:  tests/test_targets.py
IDENTICAL to Stage B frozen 0c7605b:  floppydisk/discover.py
IDENTICAL to Stage B frozen 0c7605b:  tests/test_discover.py
```

`tests/fixtures/**` diffstat across the correction is empty.

Stage A: **46/46 passing.** Stage B: **17/17 passing.** No Stage A or Stage B contract changed — the files are byte-identical to the commits I approved in Phase 1-6 and Phase 1-11.

---

# Protected Files Verification

| Protected item | Result |
|---|---|
| `floppydisk/filters.py` | **UNCHANGED** (blob) |
| `floppydisk/discover.py` | **UNCHANGED** (blob) |
| `floppydisk/__init__.py` | **UNCHANGED** (blob) |
| `floppydisk/__main__.py` | **UNCHANGED** (blob) |
| `tests/test_filters.py`, `test_targets.py`, `test_discover.py` | **UNCHANGED** (blob) |
| `tests/fixtures/**` | **UNCHANGED** (empty diffstat) |
| `.gitignore` | **UNCHANGED** |
| `README.md` | **UNCHANGED** |
| `.gitattributes` | **UNCHANGED** |
| Existing reports | **UNCHANGED** — absent from the correction commit |
| `main` | **UNCHANGED** — `b5e197efde55…` |
| `.github/` | **ABSENT** |
| `targets.txt`, `links.txt`, `diagnostics.txt` | **ABSENT** |

No Stage D artifact exists.

**Protected-file verdict: FULLY RESPECTED.**

---

# Scope / Blast Radius Review

Phase 1-13 authorized exactly `floppydisk/cli.py` and `tests/test_cli.py`. Codex touched **exactly those two**, with the report in its own documentation commit.

Change size: **38 insertions, 2 deletions** — nine production lines confined to a single function, plus one parametrized test. AST comparison confirms **only `run_pipeline` changed**; the other thirteen definitions in `cli.py` are untouched.

Codex also correctly declined the invitation to tidy C3/C4/C5 while the file was open — exactly the restraint manual §18 asks for.

**Scope verdict: EXACT.**

---

# Breadcrumb Review

Codex reports no breadcrumb changes. **Verified byte-identical:** all 19 comment lines in `cli.py`, including the full `BREADCRUMBS - WAS` / `IS` / `WILL BE` block, are unchanged across the correction.

This was the right call. The path-collision fix is a narrow implementation safety check that introduced no new architectural ownership, changed no contract, and moved no responsibility between modules. The existing breadcrumbs remain accurate — `cli.py` still owns *"orchestration, output purity, diagnostics separation, and failure containment"*, and rejecting a destructive path collision is that same ownership being exercised, not a new principle.

Manual §60 also applies: the invariant is now frozen by a named behavioral test, which is the stronger protection. Expanding the breadcrumb for a nine-line safety check would be the churn Phase 1-13 and the review brief both cautioned against.

**Breadcrumb verdict: CORRECT AS-IS.**

---

# Regressions

**None.** Stage A and Stage B are byte-identical to their frozen baselines and fully passing. All thirteen Stage C contracts verified behaviorally intact. 88/88 overall.

**No new findings.** Every claim in Codex's Phase 1-14 report that I checked verified accurate — commit hashes and parentage, non-amendment, the two-file list, the red-before-green counts and failure reason, the collision behavior, the test counts, breadcrumb non-change, and the deliberate non-treatment of C3–C5.

One point of the report deserves a correction rather than a challenge: Codex wrote that the default pytest temp root *"was accessible in this pass."* That is true of Codex's process context but not of mine, where the artifact reproduces exactly as in Phase 1-13. Nothing about the code is implicated either way — see *Pytest Temp-Root Review*.

---

# Known Unknowns

Unchanged from Phase 1-13; none block Stage C.

| Unknown | Status |
|---|---|
| Real GitHub-hosted network, site blocking, and anti-bot behavior | Stage D evidence — the central Phase 0 question |
| Whether the 120 s per-target timeout suits representative targets | Unmeasured implementation default |
| Real-world `extension == ''` frequency | Stage D evidence; `excluded records` reports it |
| Which real targets emit Queue records, and at what magnitude | Stage D evidence; `queued unresolved` reports it |
| Signed / expiring CDN URL lifetime | Stage D evidence |
| Percent-encoded extension behavior across site-specific extractors | Unresolved since Phase 1-9 |
| Whether real `Message.Url` values can carry raw control characters | Not observed; Stage A rejects them safely |
| Host housekeeping: inaccessible `pytest-of-dmcal` temp directory | Environmental, context-dependent; no Stage D impact |
| Multi-file consistency after a mid-run fatal write failure | Accepted documented limitation (Phase 1-13, category A) |

---

# GO / FIX / STOP Verdict

# **GO**

C1 and C2 are closed. Stage C satisfies its contract and may become the frozen baseline.

The correction is precise and minimal. Nine production lines replace a pairwise comparison with a three-path resolved-destination set, placed **before** the input is read and before discovery runs — which is exactly the placement the defect demanded, since the collision that caused data loss was the one that destroyed the input. All three collision forms now exit 1 with zero `discover_target` calls, the targets file byte-for-byte intact, no stray artifact, no target-URL leak, no traceback, and the existing concise fatal message. The previously working `out == diagnostics` rule survives and is now provably stronger than before.

C2 is closed by a parametrized public-CLI test covering all three cases with four assertions each, which I confirmed genuinely detects the old defect: run against the pre-correction `cli.py` extracted read-only from history, it reproduces Codex's `2 failed, 1 passed, 22 deselected` exactly, failing at `assert code == 1` with the pre-fix CLI printing "FloppyDisk completed" on an invocation that was overwriting its own input.

Nothing else moved. AST comparison shows **only `run_pipeline` changed** among fourteen definitions; breadcrumbs are byte-identical; C3/C4/C5 were correctly left alone; every protected file is blob-identical; Stage A and Stage B match their frozen baselines exactly; and a thirteen-point behavioral sweep confirms purity, partial-error recovery, queue visibility, filtering, dedupe, privacy, step summary, atomic writes, and the exit contract all intact. 25/25 and 88/88 reproduce.

The `1 passed, 24 errors` result under the default temp root is the same host ACL artifact documented in Phase 1-13 — reproduced, re-isolated to pytest's own fixture machinery, matched exactly to the `tmp_path` fixture count, and cleared entirely by redirecting `--basetemp`. **Not a product defect.**

**Stage D may be prepared after ChatGPT + human review.** I am not authorizing or beginning it here.

---

# Checkpoint Push Recommendation

**Yes — the repository is safe to checkpoint with `git push origin Phase-0`, once the ChatGPT + human review gate approves.**

Basis:

- Working tree clean; nothing uncommitted or stashed.
- All 88 tests pass with zero warnings — a coherent passing stage, which is what manual §57 requires before establishing a baseline.
- Stages A, B, and C are all at reviewed, GO-quality states, each frozen by an independent review.
- History is linear with no rewrites; implementation and documentation commits are cleanly separated and individually reviewable.
- `main` is untouched; the push targets `Phase-0` only.
- Reports contain no credentials or secrets.
- **No `.github/workflows/` file exists yet**, so this push cannot trigger an Actions run or consume runner minutes. Nothing executes as a side effect.

**I have not pushed, and will not.** The push is the human's action after the review gate.

---

# Recommendation

Return this review to the ChatGPT + human table with three items:

1. **Accept Stage C as the frozen baseline** at correction commit `355883e5a7f556399f53cf353ae8478fec5f39fe`. The complete offline pipeline — target parsing, discovery orchestration, filtering, dedupe, pure `links.txt`, separate diagnostics, atomic writes, privacy, and the exit contract — is proven by 25 automated tests and independently re-verified.

2. **Approve the checkpoint push** of `Phase-0` per the section above.

3. **Authorize Stage D — the GitHub Actions workflow and first real hosted run** — using the Phase 1-2 blueprint. Its handoff is already written; three carry-forwards belong in the prompt:

   - The workflow must pass **three distinct paths** (`targets.txt`, `links.txt`, `diagnostics.txt`), which the new check now enforces rather than merely assumes.
   - The **Phase 1-9 corrected classification table** — not Phase 1-2's obsolete exit-code rows — is authoritative for interpreting per-target results.
   - Stage D's diagnostics and step summary should surface `queued` and `errors` alongside link counts, since those are the per-target evidence the Phase 0 acceptance gate requires.

One housekeeping note unrelated to the code: the `pytest-of-dmcal` temp directory remains inaccessible to at least some local process contexts. Removing or resetting it from an elevated shell will stop local runs from showing `24 errors` that have nothing to do with FloppyDisk. It has no effect on Stage D.

**Stage D: READY** after ChatGPT + human review.

---

*End of Phase 1-15 Stage C correction architecture review. No production code, tests, or `.gitignore` were modified. All findings were verified by direct inspection of the repository and by executing the committed CLI; the red-before-green reproduction used read-only `git show` extraction into a scratchpad outside the repository, and neither git history nor the host temp directory was altered.*
