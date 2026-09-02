# Phase 1-6 — Stage A Correction Independent Architecture Review

Timestamp: Wednesday, September 2, 2026 at 11:49 AM MDT
Location: Calgary, Alberta

---

# Stage

Phase 1-6 — Independent review of Codex's Phase 1-5 Stage A R1 correction. Architect / Orchestrator only. No production code, tests, commits, or pushes in this pass.

---

# Goal

Independently verify — against the repository, not against Codex's report — that the R1 control-character defect identified in Phase 1-4 is genuinely closed; that rejection was used rather than silent sanitization; that the new regression tests would actually have caught the original defect; that every previously approved Stage A contract survives unchanged; and that the correction stayed inside its authorized two-file blast radius.

Then issue **GO**, **FIX**, or **STOP**.

---

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 11:49 AM MDT
Location: Calgary, Alberta

Cross-checked two ways: system local clock and UTC (`2026-09-02 17:49Z`) converted at UTC−6 for Mountain Daylight Time. Both agree.

---

# Repository / Branch / Git Status

| Check | Result |
|---|---|
| Repository root | `C:/Users/dmcal/Documents/GitHub/FloppyDisk` — **matches expected** |
| Current branch | `Phase-0` — **matches expected** |
| HEAD | `43e657ba0493e8f66385be925193e1474211ec0c` |
| Position | Ahead of `origin/Phase-0` by **2 commits** (not pushed) |
| Tracked working tree | **Clean** — no modifications, no deletions, nothing staged |
| Untracked | `Claude and Codex Reports/` — six project-memory files, all preserved |
| `main` | Still `b5e197e Initial commit` — untouched |

Commit graph:

```text
43e657b  fix: reject control characters in image URLs      <- HEAD
7a7b9f0  phase 0a: targets parsing and strict image allowlist
b5e197e  Initial commit
```

Untracked project memory, enumerated in full (six files, all preserved unchanged):

```text
?? Claude and Codex Reports/AI-Assisted Development Operating Manual.md
?? Claude and Codex Reports/Claude Reports/PHASE-0-ARCHITECTURE.md
?? Claude and Codex Reports/Claude Reports/Phase 1-2 - Architecture Amendment.md
?? Claude and Codex Reports/Claude Reports/Phase 1-4 - Stage A Architecture Review.md
?? Claude and Codex Reports/Codex Reports/Phase 1-3 - Stage A Implementation Report.md
?? Claude and Codex Reports/Codex Reports/Phase 1-5 - Stage A Correction Report.md
```

**Nothing was cleaned, restored, stashed, staged, deleted, renamed, committed, or pushed during this review.** The red-before-green verification in §*Regression Test Review* was performed entirely in a scratchpad directory outside the repository, using read-only `git show`.

---

# Inputs Reviewed

1. **`AI-Assisted Development Operating Manual.md`** — read in full earlier in this session. Verified unchanged before relying on that read: **41,204 bytes, mtime Sep 2 10:22, sha256 prefix `1eee4a7373411647`** — byte-identical to the copy I read. Content is in context; no re-read required.
2. **`Phase 1-4 - Stage A Architecture Review.md`** — my own FIX definition, applied here as the standard.
3. **`Phase 1-5 - Stage A Correction Report.md`** — read in full. Treated as **evidence, not proof** (manual §46).
4. **`Phase 1-2 - Architecture Amendment.md`** — consulted for contracts C1, C5, C6 and the Stage A boundary.
5. **`Phase 1-3 - Stage A Implementation Report.md`** — consulted for the pre-correction baseline.
6. **The repository itself** — both commit objects, the complete correction diff, current source, and direct execution of the committed code.

---

# Commit Verification

Every claim in §3 of the review brief was checked against git directly.

| Claim | Verification | Result |
|---|---|---|
| Original commit `7a7b9f0a…` exists | `git cat-file -t` → `commit` | **CONFIRMED** |
| Correction commit `43e657ba…` exists | `git cat-file -t` → `commit` | **CONFIRMED** |
| Both on `Phase-0` | `git branch --contains` → `Phase-0` only, for both | **CONFIRMED** (neither on `main`) |
| Original message | `phase 0a: targets parsing and strict image allowlist` | **CONFIRMED** — exact |
| Correction message | `fix: reject control characters in image URLs` | **CONFIRMED** — exact |
| **Original was NOT amended** | see below | **CONFIRMED** |
| Correction is a follow-up commit | `git rev-parse 43e657ba^` → `7a7b9f0a1e97262c3b76e2ab80e8620940319a78` | **CONFIRMED** |
| Correction contains exactly two files | `git diff-tree --name-status -r` → 2 | **CONFIRMED** |

**Non-amendment proof.** The original Stage A commit object `7a7b9f0a1e97262c3b76e2ab80e8620940319a78` still resolves and is present in history with its original date (`Wed Sep 2 11:12:23 2026 -0600`) and its original parent (`b5e197e`). The correction commit's parent hash **is** `7a7b9f0a1e97262c3b76e2ab80e8620940319a78`. An amend would have replaced the original with a new hash and orphaned it; instead the chain `b5e197e → 7a7b9f0a → 43e657ba` is intact and linear. Codex's claim is accurate.

**Commit verdict: CLEAN.**

---

# Correction Diff Review

Total change, `7a7b9f0a → 43e657ba`: **2 files changed, 17 insertions(+), 1 deletion(-)**.

```text
M	floppydisk/filters.py     |  3 +++
M	tests/test_filters.py     | 15 ++++++++++++++-
```

### Production change — the entire diff

```diff
 def _http_url_path(url: str) -> str | None:
+    if any(character in url for character in "\n\r\t"):
+        return None
+
     parsed = urlsplit(url)
     if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
         return None
```

Three lines. This is the minimal correct fix, and its **placement is the critical property**: the guard sits at the very top of `_http_url_path`, executing **before `urlsplit()` is ever called**. The Phase 1-4 FIX required exactly this ordering, because the defect arose from `urlsplit` sanitizing during detection while the raw string was returned. Rejecting first removes the possibility of a sanitized representation ever qualifying.

The failure propagates correctly: `_http_url_path` returns `None` → `_resolved_extension` returns `None` at its first branch → `is_image_url` returns `False` → `filter_image_urls` omits the candidate.

**Rejection, not sanitization.** The URL is never rewritten, stripped, normalized, or re-encoded. There is no mutation path anywhere in the module — `filter_image_urls` still returns the original string object for accepted candidates. Verified empirically below.

### Test change

```diff
-def test_text_payload_cannot_inject_output_lines() -> None:
+def test_text_pseudo_scheme_with_newline_is_rejected() -> None:
     payload = "text:caption\nhttps://attacker.example/injected.jpg"
     assert filter_image_urls([(payload, "jpg")]) == []

+@pytest.mark.parametrize(
+    "url",
+    [
+        "https://example.com/harmless\nhttps://attacker.example/injected.jpg",
+        "https://example.com/a\rb.jpg",
+        "https://example.com/a\tb.jpg",
+    ],
+    ids=["newline", "carriage-return", "tab"],
+)
+def test_http_urls_with_control_characters_are_rejected(url: str) -> None:
+    assert filter_image_urls([(url, None)]) == []
```

Both halves of the Phase 1-4 FIX are addressed: the misleadingly-named test was **renamed to state what it actually proves**, and a genuine behavioral regression was added covering all three characters — including the exact dangerous two-line shape I reproduced in Phase 1-4.

**Diff verdict: MINIMAL AND CORRECT.** No refactoring, no opportunistic edits, no scope drift.

---

# R1 Behavior Verification

I executed the committed code directly rather than relying on the test suite.

### The exact dangerous shape from Phase 1-4

```text
input repr: 'https://example.com/harmless\nhttps://attacker.example/injected.jpg'
result    : []  ->  REJECTED
```

In Phase 1-4 this same input was **accepted and emitted verbatim**, which would have written two lines into `links.txt`. It is now rejected.

### All three control characters, metadata absent

| Character | Result |
|---|---|
| newline `\n` | `[]` — **REJECTED** |
| carriage return `\r` | `[]` — **REJECTED** |
| tab `\t` | `[]` — **REJECTED** |

### Metadata cannot bypass the guard — the strongest form of the check

The new tests only exercise `metadata=None`. I probed the metadata path separately, because a guard placed after metadata resolution would have left a bypass:

| Character | `metadata="jpg"` | Result |
|---|---|---|
| newline | supplied | `[]` — **REJECTED** |
| carriage return | supplied | `[]` — **REJECTED** |
| tab | supplied | `[]` — **REJECTED** |

**No bypass exists.** `_resolved_extension` calls `_http_url_path` first and returns `None` before it ever consults the metadata argument, so a supplied extension cannot rescue an unsafe URL. This is correct and is a stronger guarantee than the committed tests alone demonstrate.

### The guard set is exactly the sanitization set — no residual gap

R1 was caused by a mismatch between what `urlsplit` silently removes and what is returned. I verified the guard covers that set **exactly**:

```text
urllib.parse._UNSAFE_URL_BYTES_TO_REMOVE = ['\t', '\r', '\n']
guard set                                 = {'\t', '\r', '\n'}
EXACT MATCH: True
```

And I confirmed no other C0 control character can reopen the class:

| Character | Stripped by `urlsplit`? | Mismatch possible? |
|---|---|---|
| vertical tab `\x0b` | No | **No** |
| form feed `\x0c` | No | **No** |
| NUL `\x00` | No | **No** |

Because `urlsplit` strips only `\t`, `\r`, `\n`, and the guard rejects precisely those three, **no character remains that can be silently removed during detection while surviving into output.** The defect class is closed, not merely the three reported instances.

### Legitimate input unaffected

Eleven representative valid candidates, all still accepted (**11/11**):

```text
OK  https://example.com/image.jpg      OK  https://example.com/image.webp
OK  https://example.com/image.jpeg     OK  https://example.com/image.avif
OK  https://example.com/image.png      OK  https://cdn.example.com/photo.jpg?token=abc123&x=1
OK  https://example.com/image.gif      OK  https://i.example.com/media/abc?format=jpg&name=large  (metadata "JPG")
OK  https://example.com/PHOTO.JPG      OK  https://example.com/x.jpg#fragment
OK  https://example.com/a%20b.jpg
```

A URL containing a literal **space** is still accepted — correct, since a space is not stripped by `urlsplit` and does not terminate a line, so it neither creates a mismatch nor threatens C1.

### Output is byte-identical

```text
input : 'https://example.com/photo.jpg?token=abc123'
output: ['https://example.com/photo.jpg?token=abc123']
byte-identical to input: True
```

The query string and full URL are preserved exactly, confirming the guard introduced no normalization.

**R1 verdict: CLOSED.**

---

# Regression Test Review

### The misleading test was corrected honestly

`test_text_payload_cannot_inject_output_lines` → `test_text_pseudo_scheme_with_newline_is_rejected`. The body is unchanged, and the new name accurately describes what the assertion proves: rejection of a `text:` pseudo-scheme payload. The false assurance flagged in Phase 1-4 is gone.

### Pseudo-scheme coverage survived the rename

Verified by targeted run — four tests still cover pseudo-schemes, all passing:

```text
test_pseudo_schemes_are_rejected[ytdl:https://example.com/image.jpg]     PASSED
test_pseudo_schemes_are_rejected[text:https://example.com/image.jpg]     PASSED
test_pseudo_schemes_are_rejected[generic:https://example.com/image.jpg]  PASSED
test_text_pseudo_scheme_with_newline_is_rejected                          PASSED
```

Nothing was lost in the rename.

### The new regression tests observable behavior, not the guard

`test_http_urls_with_control_characters_are_rejected` asserts `filter_image_urls([(url, None)]) == []` — a **public-API behavioral assertion**. It does not import the guard, reference `_http_url_path`, or restate the `"\n\r\t"` literal. Production and test therefore cannot drift together: reimplementing the guard differently, or removing it, breaks the test. This satisfies the Phase 1-4 requirement that the regression test behavior rather than duplicate implementation logic.

The parametrization uses readable ids (`newline`, `carriage-return`, `tab`), so a future failure names the exact vector.

### Red-before-green — independently reproduced

Codex claims the new cases produced `3 failed, 40 passed` before the fix. I verified this myself **without altering repository history or state**, by extracting the pre-fix sources read-only via `git show` into a scratchpad directory and running the **post-fix test file** against the **pre-fix implementation**:

```text
pre-fix filters.py contains the guard?  0 occurrences  (confirmed absent)
post-fix test file has the new test?    1 occurrence   (confirmed present)

$ python -m pytest -p no:cacheprovider -q      [scratchpad, pre-fix code]
FAILED tests/test_filters.py::test_http_urls_with_control_characters_are_rejected[newline]
FAILED tests/test_filters.py::test_http_urls_with_control_characters_are_rejected[carriage-return]
FAILED tests/test_filters.py::test_http_urls_with_control_characters_are_rejected[tab]
3 failed, 40 passed in 0.07s
```

A representative failure message shows the defect exactly as Phase 1-4 described it:

```text
assert filter_image_urls([(url, None)]) == []
AssertionError: assert ['https://exa...com/a\tb.jpg'] == []
  Left contains one more item: 'https://example.com/a\tb.jpg'
```

**`3 failed, 40 passed` reproduces Codex's claim exactly.** All three new cases genuinely fail against the pre-fix implementation and pass against the post-fix one. The tests are not tautological — they demonstrably catch the original R1 defect.

The repository itself was never modified; the entire exercise ran in a temporary directory.

**Regression test verdict: HONEST AND MEANINGFUL.**

---

# Full Stage A Contract Review

I re-verified every previously approved contract by direct execution, independently of the test suite, to confirm the correction altered nothing else.

| Contract | Result |
|---|---|
| Allowlist exactly six members | **PASS** — `['avif','gif','jpeg','jpg','png','webp']` |
| `jpg` accepted | **PASS** |
| `jpeg` accepted | **PASS** |
| `png` accepted | **PASS** |
| `gif` accepted | **PASS** |
| `webp` accepted | **PASS** |
| `avif` accepted | **PASS** |
| `webm` rejected | **PASS** |
| Metadata-extension precedence (both directions) | **PASS** |
| URL-path fallback on empty/whitespace metadata | **PASS** |
| Query-string preserved in output | **PASS** |
| Pseudo-schemes rejected (`ytdl:`/`text:`/`generic:`) | **PASS** |
| Extensionless rejected | **PASS** |
| Exact-string deduplication | **PASS** |
| First-seen order preserved | **PASS** |
| Query- and case-different URLs stay distinct | **PASS** |
| Target parsing accept/reject separation | **PASS** |
| Source line-number preservation | **PASS** |

The allowlist constant is unchanged at the blob level — `filters.py` line 20 still reads exactly:

```python
IMAGE_EXTENSIONS = frozenset({"jpg", "jpeg", "png", "gif", "webp", "avif"})
```

Exactly six members. No more, no less. Still a single assignment, still a `frozenset`, still the sole authority for both detection paths — and the AST-based single-allowlist contract test continues to pass.

`floppydisk/cli.py` and `tests/test_targets.py` are **blob-identical** across the correction, so the entire target-parsing architecture is untouched by construction, not merely by observation.

**Contract verdict: FULLY PRESERVED.** No previously approved behavior changed.

---

# Breadcrumb Review

Codex added no breadcrumbs, on the grounds that the existing Stage A breadcrumbs remain correct and sufficient.

**I agree. This was the right call.**

The breadcrumbs in `filters.py` (lines 8–19) are blob-unchanged and remain accurate: the six-format list is still an explicit product-owner contract, exactly one constant still governs both detection paths, unknown extensions are still excluded rather than guessed, and `webm` still must not slip in beside `webp`. Nothing the correction did invalidates any of that.

Assessed against manual §32 and the review brief's caution against breadcrumb churn:

- **No new architectural ownership rule was introduced.** The guard does not move responsibility between modules or change who owns filtering. `filters.py` owned the accept/reject decision before and still does.
- **No contract changed.** C1, C5 and C6 are unchanged; the guard enforces the existing C1 purity requirement rather than establishing a new one.
- **The invariant is protected by a test.** Manual §60 is explicit that a breadcrumb explains WHY while a test proves the invariant holds. `test_http_urls_with_control_characters_are_rejected` is a named, behavioral, red-verified test — the strongest available protection, and it fails loudly if the guard is removed.

Demanding a breadcrumb here would be exactly the churn the brief warns against, for a three-line defect fix that changed no architectural WHY.

**One non-blocking observation, explicitly not corrective work.** The guard's *necessity* is counter-intuitive: a future reader could plausibly think "`urlsplit` already strips these, so this check is redundant" without realising the point is that detection is sanitized while the raw string is returned. The regression test catches that deletion immediately, so nothing is at risk. If Stage C's planned `cli.py` breadcrumb pass happens to be nearby, a one-line WHY comment would be a cheap courtesy. It is **not required for GO** and should not be treated as a finding.

**Breadcrumb verdict: CORRECT AS-IS.**

---

# Independent Tests Run

Run by me, in the repository, at review time, with no modifications to any test.

**Codex's exact command:**

```text
$ python -m pytest -p no:cacheprovider -q
..............................................                           [100%]
46 passed in 0.04s
```

**Targeted verification of the R1 and renamed tests:**

```text
$ python -m pytest -p no:cacheprovider -v -k "control_characters or pseudo_scheme"
collected 46 items / 39 deselected / 7 selected
... 7 PASSED (3 pseudo-scheme, 1 renamed, 3 control-character) ...
7 passed, 39 deselected in 0.02s
```

**Red-before-green run** (scratchpad, pre-fix implementation): `3 failed, 40 passed in 0.07s` — detailed in *Regression Test Review*.

---

# Exact Test Results

| Metric | Result |
|---|---|
| Command | `python -m pytest -p no:cacheprovider -q` |
| Tests collected | **46** |
| Passed | **46** |
| Failed | **0** |
| Errors | **0** |
| Skipped | **0** |
| xfail / xpass | **0** |
| Warnings | **0** |
| Duration | 0.04 s |
| pytest / Python | 9.1.1 / 3.14.2 |
| Platform | win32 |

**My independent result reproduces Codex's claim exactly: 46 passed, no discrepancy.**

The count reconciles cleanly: 43 previously approved cases + 3 new parametrized control-character cases = 46. The rename contributed no net change, since it renamed rather than added a test. No test was edited for any reason.

---

# Protected Files Verification

Verified by comparing **blob hashes** across the correction — proof of content identity, stronger than reading the diff.

| Protected item | Method | Result |
|---|---|---|
| `floppydisk/cli.py` | blob identical `7a7b9f0a` ↔ `43e657ba` | **UNCHANGED** |
| `floppydisk/__init__.py` | blob identical | **UNCHANGED** |
| `floppydisk/__main__.py` | blob identical | **UNCHANGED** |
| `tests/test_targets.py` | blob identical | **UNCHANGED** |
| `README.md` | blob identical — and identical to `b5e197e` | **UNCHANGED** |
| `.gitignore` | blob identical — and identical to `b5e197e` | **UNCHANGED** |
| `.gitattributes` | blob identical — and identical to `b5e197e` | **UNCHANGED** |
| `Claude and Codex Reports/**` | absent from correction commit file list | **UNCHANGED** |
| Operating manual | sha256 + size + mtime match my earlier read | **UNCHANGED** |
| `main` branch | `git rev-parse main` → `b5e197e…` | **UNCHANGED** |
| `.github/` | absent | **NOT CREATED** |
| `floppydisk/discover.py` | absent | **NOT CREATED** |

All three original repository files remain byte-identical to the **initial commit** — they have never been touched across the entire project.

**Protected-file verdict: FULLY RESPECTED.**

---

# Scope / Blast Radius Review

Phase 1-4 authorized exactly two files for the corrective pass:

```text
floppydisk/filters.py
tests/test_filters.py
```

Codex touched **exactly those two, and nothing else.** The correction commit contains two modifications and zero additions or deletions of other paths.

Change size: **17 insertions, 1 deletion** — three production lines and a test block. Proportionate to a defect fix (manual §58).

No later-stage artifacts exist:

```text
absent: floppydisk/discover.py   absent: .github          absent: tests/fixtures
absent: pyproject.toml           absent: requirements.txt absent: targets.txt
absent: links.txt                absent: diagnostics.txt
```

Production imports remain stdlib-pure with no seam leakage:

```text
floppydisk/cli.py:     dataclasses, typing, urllib.parse
floppydisk/filters.py: collections.abc, pathlib, urllib.parse
```

Grep across production code for `subprocess|socket|requests|urllib.request|gallery|Popen|asyncio|open(` → **no matches**.

Full tree at HEAD is still the nine Stage A files. No unrelated cleanup, no refactoring, no "while we're here" engineering (manual §18).

**Scope verdict: EXACT.**

---

# Regressions

**None.** All 43 previously approved cases still pass, plus the 3 new R1 cases, for 46 total. The 18 independent contract probes in *Full Stage A Contract Review* all pass. Two of the four production files are blob-identical, so the target-parsing architecture could not have regressed.

The Phase 1-4 defect R1 is closed and independently verified, including the metadata-bypass path the committed tests do not themselves cover, and including proof that the guard set exactly matches `urlsplit`'s sanitization set so no residual gap remains.

Codex's report is accurate in every claim I checked — commit hashes, parentage, file list, test counts, red-before-green figures, and protected files. It reported "Deviations / Surprises: None," and I found none.

---

# Known Unknowns

Carried forward unchanged, deliberately **not** addressed in this review (per §14 of the brief):

| Unknown | Status |
|---|---|
| Percent-encoded extension behavior (`photo%2Ejpg`) — gallery-dl `unquote()`s, FloppyDisk does not | Stage B, against real fixtures |
| Whether real gallery-dl `Message.Url` values ever carry raw control characters | Stage B evidence. Does not affect the pure rejection contract, which is now correct either way |
| Real-world `extension == ''` frequency | Stage D evidence |
| GitHub-hosted network behavior from datacenter IPs | Stage D evidence — the central Phase 0 question |
| Signed / expiring CDN URL lifetime | Stage D evidence |

None of these block Stage A. All belong to later evidence stages, and none expanded this review.

---

# Repository-Memory Recommendation

**Reassessed, and I still recommend it.**

Six project-memory files are now untracked — the operating manual, three Claude reports, and two Codex reports. A fresh clone of this repository still contains **zero architectural memory**: no manual, no blueprint, no review history. Manual §21, §53 and §73 all assume a new agent or environment can read the current reports *from the repository*; today they cannot.

The case has strengthened since Phase 1-4, because the history now includes a full architect → build → review → fix → re-review cycle. That cycle — particularly the R1 finding and its correction — is exactly the kind of reasoning the manual wants preserved as durable memory rather than left in an untracked folder.

Recommended shape, unchanged:

- **One commit on `Phase-0` touching only `Claude and Codex Reports/**`.**
- Message along the lines of `docs: track operating manual and phase reports as repository memory`.
- Kept entirely separate from implementation history, so Stage A's two commits remain clean and reviewable (manual §56).

I re-checked the files: the repository is private and none contain credentials or secrets, so tracking them is safe.

The sequence proposed in §13 of the brief is correct and I endorse it:

```text
Stage A GO  ->  ChatGPT + human review  ->  repository-memory commit  ->  Stage B authorization
```

**I performed no housekeeping.** Nothing was staged or committed.

If the Phase 1-1 filename question from my Phase 1-2 *Deferred Questions* (§7) is to be settled — renaming `PHASE-0-ARCHITECTURE.md` to `Phase 1-1 - Architecture Report.md` for clean chronology — that same commit is the natural place, since renaming a still-untracked file leaves no history either way. Your call; it is not required.

---

# Stage A Freeze Questions

**1. Is R1 actually closed?**
Yes. Verified by direct execution, not only by the test suite. The exact Phase 1-4 attack string is now rejected.

**2. Do newline-containing candidate URLs fail safely?**
Yes — rejected with metadata absent and with metadata supplied.

**3. Do carriage-return-containing candidate URLs fail safely?**
Yes — both paths.

**4. Do tab-containing candidate URLs fail safely?**
Yes — both paths.

**5. Was rejection used rather than silent sanitization?**
Yes. The guard returns `None` before `urlsplit` runs. No mutation, normalization, or re-encoding exists anywhere in the module; accepted URLs are returned byte-identical.

**6. Are the regression tests honest and meaningful?**
Yes. The misleading test was renamed to what it proves; the new test asserts public-API behavior without duplicating guard logic; and I independently reproduced `3 failed, 40 passed` against the pre-fix implementation, proving the tests catch the real defect.

**7. Did all original Stage A behavior survive?**
Yes. 18 independent contract probes pass; the allowlist is unchanged at blob level; `cli.py` and `test_targets.py` are blob-identical.

**8. Did your independent test run reproduce 46 passing tests?**
Yes, exactly: 46 collected, 46 passed, 0 failed, 0 warnings, 0.04 s, same command.

**9. Was the correction blast radius exactly respected?**
Yes. Exactly the two authorized files; 17 insertions, 1 deletion; no other path touched.

**10. Are the existing breadcrumbs still sufficient?**
Yes. No architectural WHY changed, and the invariant is frozen by a named behavioral test (manual §60).

**11. Is Stage A now safe to freeze?**
Yes.

**12. Is Stage B technically ready after ChatGPT + human approval?**
Yes, technically. The Phase 1-2 Stage B blueprint needs no revision — nothing in this correction touches the discovery seam design. Authorization still requires the review gate and, per the endorsed sequence, the repository-memory commit first.

---

# GO / FIX / STOP Verdict

# **GO**

R1 is closed. Stage A satisfies its full contract and may become the frozen baseline.

The correction is exemplary on every axis I can independently check: three production lines, placed correctly ahead of the sanitizing call; rejection rather than mutation; a misleading test renamed to honesty; a new behavioral regression that I verified genuinely fails against the pre-fix code; every prior contract preserved; the blast radius exactly two files; every protected file blob-identical; and the original commit properly left unamended with the fix as a follow-up.

Two things I verified beyond what the committed tests prove, both strengthening the result: metadata cannot bypass the guard, and the guard set is **exactly** `urllib.parse._UNSAFE_URL_BYTES_TO_REMOVE`, so the defect *class* is closed rather than just its three reported instances.

Codex's Phase 1-5 report was accurate in every particular I checked. No discrepancies.

**Stage B may be prepared after ChatGPT + human approval and the repository-memory housekeeping commit.** I am not authorizing or beginning it here.

---

# Recommendation

Return this review to the ChatGPT + human table with three items, in this order:

1. **Accept Stage A as the frozen baseline** at commit `43e657ba0493e8f66385be925193e1474211ec0c`. The pure core — target parsing, the strict six-format allowlist, filtering, deduplication, and ordering — is proven by 46 automated tests and independently re-verified. No further Stage A work is needed.

2. **Perform the repository-memory commit** before Stage B, as its own documentation commit touching only `Claude and Codex Reports/**`. This is the last outstanding item from Phase 1-4 and it matters more now that the repository holds a complete architect → build → review → fix → re-review cycle worth preserving.

3. **Authorize Stage B — the gallery-dl discovery seam** — using the Phase 1-2 blueprint unchanged. Its handoff (Goal, Scope, Files Allowed to Change, Protected Files, Required Behavior C3/C4/C7, fixture capture requirements, Automated Tests, Stop Conditions, Report Location, Commit Expectation) is already written and needs no revision in light of this correction.

Two reminders for the Stage B prompt, both already in the Phase 1-2 blueprint but worth surfacing because they are easy to lose: **fixtures must be captured against the pinned CI gallery-dl version, not the local 1.32.4**, and the two carried-forward unknowns (percent-encoding divergence, and whether real `Message.Url` values contain control characters) should be *observed* against real fixtures rather than pre-solved — evidence before infrastructure (manual §19).

**Stage B: READY** after ChatGPT + human approval and the repository-memory commit.

---

*End of Phase 1-6 Stage A correction architecture review. No production code, tests, commits, or pushes were made. All findings were verified by direct inspection of the repository and by executing the committed code; the test suite was run unmodified, and the red-before-green verification was performed read-only in a scratchpad directory outside the repository.*
