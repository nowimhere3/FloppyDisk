# Phase 1-2 — Architecture Amendment

Timestamp: Wednesday, September 2, 2026 at 10:32 AM MDT
Location: Calgary, Alberta

---

# Stage

Phase 1-2 — Architecture correction pass. Architect / Orchestrator only. No production code, no workflow file, no tests written in this pass.

---

# Goal

Correct the Phase 1-1 architecture, which designed FloppyDisk as a local Windows CLI because the originating briefing was truncated before the GitHub Actions requirement arrived.

This report re-targets Phase 0 at **GitHub-hosted execution**, applies the strict six-format image allowlist, resolves the `-j` vs `-g` question against the new execution model, designs the Actions workflow, and produces a staged Codex handoff.

It preserves the empirical gallery-dl findings from Phase 1-1 rather than re-deriving them, and **corrects one Phase 1-1 claim that this pass proved was overstated** (see *Correction to Phase 1-1* below).

---

# Timestamp / Location

Timestamp: Wednesday, September 2, 2026 at 10:32 AM MDT
Location: Calgary, Alberta

Verified two ways: system local clock, and UTC (`2026-09-02 16:32Z`) converted at UTC−6 for Mountain Daylight Time. Both agree.

---

# Repository / Branch / Git Status

| Check | Result |
|---|---|
| Repository root | `C:/Users/dmcal/Documents/GitHub/FloppyDisk` — **matches expected** |
| Current branch | `Phase-0` — **matches expected** |
| Remote | `https://github.com/nowimhere3/FloppyDisk.git` |
| Branches | `Phase-0` (current), `main`, `origin/HEAD → origin/main` |
| `git status` | Untracked: `Claude and Codex Reports/`. No tracked modifications, no deletions. |
| Pre-existing dirty state | The untracked `Claude and Codex Reports/` directory — this is the operating manual plus my Phase 1-1 report. **Not mine to commit or clean.** Preserved as-is. |

Tracked files remain the original three: `.gitattributes`, `.gitignore`, `README.md`. Commit history is still the single `b5e197e Initial commit`.

---

# Baseline

**Test baseline: NONE.** No test suite, no `pyproject.toml`, no `requirements.txt`, no CI, no `.github/` directory.

**Code baseline: NONE.** No `.py` files anywhere in the repository.

**Breadcrumb baseline: NONE.** Grep for `BREADCRUMBS` across the repository returns nothing outside the operating manual itself.

**Codex report baseline: NONE.** `Claude and Codex Reports/Codex Reports/` is empty. No implementation has occurred.

**Newest Claude report:** `Claude and Codex Reports/Claude Reports/PHASE-0-ARCHITECTURE.md` — the Phase 1-1 architecture, read and carried forward here.

**PRE-EXISTING FAILURES: none.** There is nothing to fail. Any test failure that appears during Phase 0 implementation is by definition a NEW REGRESSION, not inherited.

**Toolchain on the development machine:** Python 3.14.2, pip 25.3, gallery-dl **1.32.4**, pytest **NOT INSTALLED**, no uv, no ruff.

> Note the local gallery-dl (1.32.4, released 2026-06-22) is **six releases behind** the current PyPI release (1.32.10, released 2026-08-29). This local/CI version skew is addressed in *Dependency / Version Strategy* and matters for fixture capture.

---

# Review Finding Being Corrected

**Verdict received: AMEND.**

Phase 1-1 designed a local Windows CLI whose acceptance gate was local execution. That was wrong — not because the local design was internally unsound, but because it targeted the wrong runtime. The truncated briefing omitted the foundational requirement.

**The correction:** Phase 0's execution home is a **GitHub-hosted runner**, triggered manually via `workflow_dispatch`. The user's Windows desktop must not need to remain online after a push. The acceptance gate is a **downloadable `links.txt` artifact produced by GitHub infrastructure**, not a local run.

Four consequences ripple out of this, and they are the substance of this amendment:

1. **gallery-dl stops being an external prerequisite and becomes something the workflow must provision** on an ephemeral runner. This creates a version-strategy decision that did not exist in Phase 1-1.
2. **Logging becomes a privacy surface.** On a local machine, output goes to the user's own terminal. On Actions, it goes into retained run logs.
3. **The network environment changes identity.** Extraction now originates from datacenter IP ranges, not a residential connection. This is the single largest unknown in Phase 0 and is precisely what the real run exists to measure.
4. **The image allowlist tightens.** The product owner has specified exactly six formats. Phase 1-1 proposed ten. That is corrected below.

Phase 1-1's *investigative* findings are unaffected by the runtime change — gallery-dl behaves the same way on Ubuntu as on Windows. They are preserved.

---

# Preserved Findings From Phase 1-1

These were established empirically against gallery-dl 1.32.4 and are carried forward **without re-investigation**. They remain the evidentiary foundation of the design.

### P1 — Exit code is a bitmask OR-ed across all input URLs *(critical)*

`gallery_dl/__init__.py` accumulates `retval |= status` across every input URL. Codes from `gallery_dl/exception.py`: `0` success, `1` generic, `4` extraction error, `8` challenge, `16` auth, `32` input error, `64` unsupported URL, `128` unexpected.

Proven live: 3 targets (good / unsupported / good) → **exit 64**, with both good URLs printed cleanly. A run that treats non-zero as "failed" discards valid output.

### P2 — `-g` output is not reliably one bare URL per line

`UrlJob.handle_url_fallback` writes continuation lines prefixed `"| "`, and it is installed **by default** (`config.get(("output",), "fallback", True)` — default `True`).

### P3 — Pseudo-scheme URLs are emitted

Across 271 bundled extractors: `ytdl:` (41 occurrences), `text:` (10), `generic:` (1). `text:` payloads are arbitrary post text, not URLs.

### P4 — Feeding `targets.txt` to `-i` is a config-injection surface

Proven live: an input file beginning `-o output.fallback=false` had that line consumed as a **configuration directive**, exit 0, no "unsupported URL" error. Separately, a bare argv target of `--version` executed as the flag.

### P5 — `--` end-of-options is honored

Verified. Combined with scheme validation, this closes the argv-flag confusion in P4.

### P6 — Batch `-j` output is not valid JSON

Concatenated per-target arrays: `JSONDecodeError: Extra data: line 30 column 1`. Dissolves under per-target invocation.

### P7 — Per-target invocation is affordable

Measured: 3 separate invocations 1.449 s (~0.48 s each) vs 0.464 s batched. ~0.48 s fixed overhead per spawn, negligible against network-bound extraction.

### P8 — `-j` exposes resolved `extension` metadata that `-g` discards

`-j` entries are `[message_type, ...]` with **type `3` = `Message.Url`**, carrying resolved metadata including `extension`.

### P9 — Order-preserving exact-string deduplication

Retained. Query strings are load-bearing on signed CDN URLs; normalization is deferred, not adopted.

### P10 — Isolating gallery-dl behind a single architectural seam

Retained and reinforced. It is now the primary structural justification for keeping more than one source file.

---

# Correction to Phase 1-1

One Phase 1-1 claim was overstated, and because the amendment briefing quoted it back to me (§6: *"can retain valid image URLs whose path lacks an obvious extension"*), correcting it explicitly matters more than usual — the claim has already propagated into the review.

**What I claimed:** `-j` can retain valid image URLs whose path lacks an obvious extension.

**What this pass proved:** that is true only sometimes, and the mechanism is different from what I implied.

`gallery_dl/text.py`:

```python
def nameext_from_url(url, data=None):
    filename = unquote(filename_from_url(url))
    name, _, ext = filename.rpartition(".")
    if name and len(ext) <= 16:
        data["filename"] = name
        data["extension"] = ext.lower()
    else:
        data["filename"] = filename
        data["extension"] = ""          # <-- empty string, not a missing key
```

Executed directly:

| URL | resolved `extension` |
|---|---|
| `https://cdn.example.com/photo.jpg?token=abc123` | `'jpg'` |
| `https://cdn.example.com/PHOTO.JPG` | `'jpg'` (lowercased) |
| `https://cdn.example.com/image` | `''` |
| `https://cdn.example.com/img/9f8a7b6c5d` | `''` |
| `https://i.example.com/abc?format=jpg&name=large` | `''` |

And critically, in `gallery_dl/downloader/http.py`:

```
265:  # set missing filename extension from MIME type
266:  if not pathfmt.extension:
267:      pathfmt.set_extension(self._find_extension(response))
```

**gallery-dl resolves a missing extension from the HTTP `Content-Type` header and the file signature — at download time.** Phase 0 explicitly does not download. That resolution therefore never runs.

**The honest conclusion:** where the URL path carries no extension and the extractor does not supply one, **neither `-g` nor `-j` can determine the image format without fetching the resource.** `extension` is `""` and no non-downloading path resolves it.

**However — the argument for `-j` survives, on better evidence than I originally gave.** Extractors can and do supply `extension` explicitly where the path lacks one. `gallery_dl/extractor/twitter.py`:

```
151:  if "extension" not in file:
152:      text.nameext_from_url(url, file)
...
1336:  "extension": self.fmt,        # taken from the ?format= parameter
```

So for the extremely common `pbs.twimg.com/media/XXXX?format=jpg&name=large` shape, `-j` returns `extension='jpg'` **because the extractor knows**, while a URL-path parser — exactly what we would be forced to write against `-g` output — returns `''` and would silently discard a valid JPEG.

That is the real case for `-j`: not that it magically resolves extensionless URLs, but that it **surfaces the extractor's own knowledge**, which is strictly more information than the URL string contains, and which `-g` throws away.

**Consequence for the strict allowlist:** a URL whose extension resolves to `''` fails the six-format allowlist and is **excluded**. Given the product owner's explicit instruction not to broaden the list, exclusion is the correct conservative behavior — but it is a real, silent data-loss path. It must be **counted and reported in diagnostics** so the human can see how often it happens, and it becomes a Phase 1 decision point (see *Future Decision Points*).

---

# Revised Architecture

```text
targets.txt  (committed to the repository)
        │
        │  human edits, commits, pushes
        ▼
GitHub repository (private)
        │
        │  human clicks "Run workflow"  (workflow_dispatch)
        ▼
GitHub-hosted runner (ubuntu-latest, ephemeral)
        │
        ├─ actions/checkout
        ├─ actions/setup-python  (pinned)
        ├─ pip install gallery-dl (pinned)
        │
        ▼
   python -m floppydisk
        │
        ├── read + validate targets.txt        [ours, no network]
        │        blank lines skipped, comments skipped,
        │        non-http(s) rejected before any subprocess
        │
        ├── FOR EACH valid target:             [THE SEAM — discover.py]
        │        one gallery-dl -j invocation
        │        argv, after --, with timeout
        │        → DiscoveryResult (plain data)
        │
        ├── filter: Message.Url (type 3)       [pure]
        │        http(s) only  → drops ytdl:/text:/generic:
        │        extension ∈ {jpg,jpeg,png,gif,webp,avif}
        │
        ├── dedupe: exact string, first-seen   [pure]
        │
        ├── write links.txt                    [URLs only, nothing else]
        └── write diagnostics.txt              [counts + line numbers]
        │
        ▼
actions/upload-artifact  (if: always())
        │
        ▼
human downloads links.txt
```

The user's Windows machine participates only up to the push. Everything from `workflow_dispatch` onward is GitHub infrastructure.

**A local CLI still exists** — it is the same `python -m floppydisk` entry point — but purely because it is the cleanest implementation and test seam. It is explicitly **not** the acceptance gate.

---

# GitHub Actions Flow

**File:** `.github/workflows/extract-links.yml`

| Concern | Decision | Reason |
|---|---|---|
| Filename / location | `.github/workflows/extract-links.yml` | Required location. Name states the action, not the tool. |
| Trigger | `workflow_dispatch` **only** | Manual, per the brief. Deliberately **not** `on: push` — pushing targets should not silently spend runner minutes or fire unintended extractions. |
| Runner | `ubuntu-latest` | Cheapest, fastest, best gallery-dl support. |
| Permissions | `permissions: { contents: read }` | Least privilege. Artifact upload uses the job's runtime token and does **not** require write. |
| Job timeout | `timeout-minutes: 30` | Bounds a hung run. Distinct from the per-target subprocess timeout. |
| Checkout | `actions/checkout@v4` | Brings `targets.txt` onto the runner. |
| Python | `actions/setup-python@v5`, `python-version: "3.12"` | Pinned, not `3.x`. gallery-dl requires `>=3.8`. 3.12 is well-supported and avoids 3.14 novelty on CI. |
| gallery-dl install | `pip install gallery-dl==<pinned>` | See *Dependency / Version Strategy*. |
| Version recording | Run `gallery-dl --version` into diagnostics | Every artifact is traceable to an exact extractor version. Essential for interpreting failures. |
| targets.txt consumption | Read from the checked-out repo root; path overridable by a `workflow_dispatch` input defaulting to `targets.txt` | Simple, no upload UX. |
| Execution | `python -m floppydisk --targets targets.txt --out links.txt --diagnostics diagnostics.txt` | Explicit paths; no hidden defaults in CI. |
| Artifact upload | `actions/upload-artifact@v4`, `if: always()` | **`if: always()` is essential** — partial success and even most failures must still deliver `links.txt`. |
| Artifact name | `floppydisk-links` | Distinct, greppable. |
| Artifact contents | `links.txt` **and** `diagnostics.txt` | Same artifact, separate files. Keeps `links.txt` pure while diagnostics stay downloadable rather than logged. |
| Retention | Leave at repository default | No evidence yet justifying a custom value. Revisit if signed-URL expiry proves short. |
| Step summary | Aggregate **counts only** to `$GITHUB_STEP_SUMMARY` | At-a-glance result without putting URLs in logs. |

### Job behavior by outcome

| Outcome | Job result | `links.txt` uploaded? |
|---|---|---|
| All targets succeeded, links found | success | yes |
| **Partial** — some targets failed, some links found | **success** (counts + failures in diagnostics) | **yes** |
| All targets failed to extract | success, with a clear warning annotation | yes (empty) |
| Zero qualifying image links found | success, with a clear warning annotation | yes (empty) |
| Cannot read `targets.txt` / cannot write output | **failure** | n/a |
| Runner/install/infrastructure failure | failure | best-effort via `if: always()` |

The reasoning behind "all targets failed → job still succeeds": in Phase 0 that outcome is **evidence, not malfunction**. It most likely means GitHub's IP ranges are blocked by the target sites — which is exactly the finding the real run exists to produce. Failing the job would frame a successful experiment as a broken pipeline and obscure the distinction between "our code is broken" and "the network refused us." Only a genuine pipeline fault turns the job red.

---

# Recommended File Tree

Phase 1-1 proposed eight source files plus `pyproject.toml`. That is disproportionate here. This tree is **five source files and no packaging machinery**:

```text
.github/
    workflows/
        extract-links.yml
floppydisk/
    __init__.py          # empty or version string
    __main__.py          # 2 lines: python -m floppydisk entry point
    cli.py               # argparse, targets parsing/validation,
                         #   orchestration, links.txt + diagnostics writing
    discover.py          # THE SEAM — the only gallery-dl-aware module
    filters.py           # six-format allowlist + exact dedupe (pure)
tests/
    test_filters.py
    test_targets.py
    test_discover.py
    test_workflow.py     # static YAML contract checks
    fixtures/            # captured gallery-dl -j payloads
targets.txt
links.txt                # produced, gitignored
README.md
```

### What was cut from Phase 1-1, and why

- **`pyproject.toml` — removed.** Phase 0 never installs itself. The workflow runs `python -m floppydisk` from the repo root. Packaging is machinery without a current job.
- **`targets.py` — folded into `cli.py`.** Parsing is roughly fifteen lines. It remains independently testable as `cli.parse_targets()`, so no testability is lost.
- **`dedupe.py` — folded into `filters.py`.** Both are pure `list[str] → list[str]` transforms over the same data with no other collaborators.
- **`writer.py` — folded into `cli.py`.** Writing two text files does not warrant a module.

### What was deliberately kept separate, and why

- **`discover.py` stays isolated.** This is the whole architectural point. Every finding in *Preserved Findings* is a gallery-dl implementation detail; confining them to one module keeps the other stages pure, offline-testable, and gives a future gallery-dl upgrade exactly one place to break.
- **`filters.py` stays isolated.** The six-format allowlist is a **product contract**, not an implementation detail. It is the single thing most likely to be silently broadened by a well-meaning future edit. It deserves its own file and its own test file so that widening it is a visible, deliberate act.

---

# Files Allowed to Change

Across the whole of Phase 0 implementation:

```text
.github/workflows/extract-links.yml     (new)
floppydisk/__init__.py                  (new)
floppydisk/__main__.py                  (new)
floppydisk/cli.py                       (new)
floppydisk/discover.py                  (new)
floppydisk/filters.py                   (new)
tests/**                                (new)
targets.txt                             (new)
.gitignore                              (append links.txt, diagnostics.txt)
README.md                               (update: purpose, prerequisites, usage, GPL note)
```

Per-stage subsets are enumerated in *Implementation Stages*.

---

# Protected Files / Systems

Modification of any of these signals that the architecture may be wrong. **Codex must STOP and report rather than change them.**

| Protected | Why |
|---|---|
| `Claude and Codex Reports/**` | Architectural memory. Reports are append-only; never edit or delete an existing report. |
| `Claude and Codex Reports/AI-Assisted Development Operating Manual.md` | Governs the process itself. |
| `PHASE-0-ARCHITECTURE.md` (Phase 1-1) | Historical record. Do not overwrite, rename, or "tidy". |
| `.gitattributes` | Line-ending normalization. Changing it can silently rewrite every file. |
| `main` branch | All Phase 0 work stays on `Phase-0`. |
| `.gitignore` — existing lines | Appending is allowed; **modifying or removing existing entries is not**. |

**Additional architectural alarms.** If implementation requires any of the following, the approved architecture is wrong — STOP:

- gallery-dl needs to be **imported** rather than invoked as a subprocess.
- Any module other than `discover.py` needs to know gallery-dl exists.
- `links.txt` needs to carry anything other than URLs.
- The six-format allowlist needs to be broadened to make a real target work.
- The workflow needs `contents: write` or any elevated permission.
- Any credential, cookie, token, or secret becomes necessary.

---

# Required Behavior / Contracts

### C1 — `links.txt` purity *(the primary product contract)*

`links.txt` contains **only** direct image URLs, one per line, UTF-8, `\n` terminated, with a trailing newline.

No headings. No metadata. No JSON. No titles. No status messages. No errors. No diagnostics. No comments. No blank lines. No counts. Nothing else, ever. An empty result is an empty file — not a file containing an explanatory message.

### C2 — targets parsing

- Strip surrounding whitespace per line.
- Skip blank / whitespace-only lines.
- Skip comment lines beginning with `#` (worthwhile: lets the human annotate and temporarily disable targets, which is the realistic editing workflow).
- Accept a target only if it begins with `http://` or `https://` (case-insensitive).
- Anything else is **rejected before any subprocess is created**, and recorded in diagnostics by **line number**.

### C3 — invocation safety

Targets are passed as argv **after `--`**. `targets.txt` is **never** handed to gallery-dl's `-i` / input-file parser (P4). Every invocation carries an explicit timeout.

### C4 — discovery is read-only

The invocation must never download media. `-j` (DataJob) collects metadata and does not download; no download-capable invocation form may be constructed. A test must assert this on the constructed argv.

### C5 — filtering, in order

1. Keep only `Message.Url` entries (`message_type == 3`).
2. Keep only URLs beginning `http://` or `https://` — this drops `ytdl:`, `text:`, `generic:` (P3) in one check.
3. Resolve extension: prefer gallery-dl's `extension` metadata; if absent or empty, fall back to the URL path (query string stripped first).
4. Lowercase, then require membership in the six-format allowlist.
5. Anything else — including `extension == ""` — is excluded and counted.

### C6 — deduplication

Exact string match, first occurrence wins, input order preserved. No normalization: query strings are preserved and significant (P9).

### C7 — failure containment

One failing target never aborts the run. Every target produces a recorded outcome. All links discovered from successful targets are written regardless of what other targets did.

### C8 — process exit codes

| Code | Meaning |
|---|---|
| `0` | The pipeline ran. Full **or** partial success, including zero links found. |
| `1` | The pipeline could not run — `targets.txt` unreadable, output unwritable, gallery-dl absent. |

> **Deliberate simplification from Phase 1-1**, which proposed a third code (`2`) for partial success. Under GitHub Actions a non-zero exit turns the job red, which would misrepresent partial success — a normal, expected outcome — as failure. Partial success is now reported through **diagnostics and step-summary counts**, not through the exit code. Recorded here so the change is visible rather than silent.

### C9 — diagnostics separation

Diagnostics go to `diagnostics.txt` and the step summary. **Never** to `links.txt`. Diagnostics reference targets by **line number**, not URL (see *Privacy / Logging*).

---

# Explicit Non-Goals

Must **not** be implemented in Phase 0:

- Downloading any image or media file.
- GitHub Pages, any web UI, any browser-facing surface.
- Any upload UX beyond editing `targets.txt` in the repository.
- Authentication, cookies, credentials, secrets, API keys.
- Anti-bot / challenge-solving / CAPTCHA handling / IP rotation / proxying.
- Retry, backoff, or rate limiting.
- Concurrency or parallel extraction.
- Resume, incremental state, or caching across runs.
- URL normalization or fuzzy/near-duplicate detection.
- Any image format outside the six-format allowlist.
- Video, archive, or PDF output.
- A configuration file.
- Packaging, publishing, installers, or `pyproject.toml`.
- Scheduled (`on: schedule`) or push-triggered runs.
- Any network call written by us — gallery-dl owns all network I/O.
- Editing, renaming, or deleting existing reports.

---

# Strict Image Allowlist

**Exactly six formats. This is a product contract, not a default.**

```text
jpg
jpeg
png
gif
webp
avif
```

Comparison is case-insensitive via lowercasing (gallery-dl already lowercases in `nameext_from_url`, but our filter must not depend on that — verified `PHOTO.JPG → 'jpg'`, and we lowercase defensively anyway).

**The same six-item list governs both paths** — extension-from-metadata and the URL-path fallback. There must be exactly **one** allowlist constant in `filters.py`, referenced by both. Two divergent lists is precisely how this contract rots.

**Explicitly excluded**, confirmed recognizable by gallery-dl and therefore genuinely capable of appearing:

- `jpe`, `bmp`, `svg`, `heic`, `psd` — Phase 1-1 wrongly proposed including these. Corrected.
- `webm` — verified: gallery-dl resolves `b.webm → 'webm'`. It is one character from `webp` and is **video**. A test must prove `webm` is rejected while `webp` is accepted; this is the likeliest accidental-inclusion bug in the whole design.
- `mp4`, `m4v`, `mov`, `mkv`, `ogg`, `ogm`, `ogv`, `wav`, `mp3`, `opus`, `zip`, `rar`, `7z`, `pdf`, `swf`.

**Query-string URLs must still qualify.** Verified: `https://cdn.example.com/photo.jpg?token=abc123` → `extension='jpg'`, with `query='token=abc123'` preserved separately and the **full URL including the query** emitted. The query must be stripped **only** for extension detection, never from the URL written to `links.txt` — signed CDN URLs stop working without it.

**Extensionless URLs are excluded.** Per *Correction to Phase 1-1*, `extension == ''` cannot be resolved without downloading. Under a strict allowlist, exclusion is correct — but it must be **counted and surfaced** in diagnostics so the human can see the magnitude of what is being dropped.

---

# gallery-dl Integration Decision

## Recommendation: `-j` (dump-json), confidently.

Re-evaluated specifically under the GitHub Actions model, as instructed. The recommendation holds, and the GitHub context **strengthens** it — for reasons that did not exist in Phase 1-1.

### Why `-j`

1. **It surfaces the extractor's own extension knowledge.** The decisive evidence is `twitter.py:1336` setting `"extension": self.fmt` from the `?format=` parameter. For `pbs.twimg.com/media/XXXX?format=jpg&name=large` — an extremely common real-world shape — `-j` yields `'jpg'` while pure URL-path parsing yields `''`. Against `-g` we would be *forced* to write that path parser, and it would silently discard valid JPEGs. This is `-j`'s real advantage, stated more precisely than in Phase 1-1.

2. **It eliminates the `| ` corruption class entirely.** The fallback prefix (P2) is a `UrlJob` behavior. `-j` uses `DataJob`, so the failure mode does not exist rather than being mitigated by a flag we must remember to pass.

3. **Typed records instead of text sniffing.** Selecting `message_type == 3` is explicit. Distinguishing a URL from a `text:` payload containing newlines is guesswork in line-oriented output.

4. **Structured data suits a headless runner.** Under Actions no human watches a stream. Machine-readable output that we parse once and turn into counts is a better fit than text designed for terminal reading.

5. **Privacy — new, and specific to Actions.** Verified this pass: a per-target `-j` invocation on success writes **732 bytes to stdout and 0 bytes to stderr**. Zero. The `[n/total]` progress lines seen in Phase 1-1 appear only in `-i` batch mode. So per-target `-j` is naturally silent, and everything reaching the log is something we chose to print. This did not matter on a local terminal; it matters a great deal in retained CI logs.

### Cost

JSON parsing rather than line splitting, and `-j` buffers a whole target's records in memory before emitting. Both are acceptable at Phase 0 scale. Batch `-j` is not valid JSON (P6) — irrelevant here, since per-target invocation yields exactly one valid array per call.

### On the original `-g` idea

The product requirement is *"discover direct image URLs without downloading media."* `-j` satisfies it exactly. The brief confirms literal `-g` is not required. `-g` remains a viable fallback (`-g -o output.fallback=false`) at a measurable accuracy cost on extension-supplied-by-extractor URLs — if the review prefers it, say so and I will amend, but the evidence supports `-j`.

**Confidence: high.** Higher than in Phase 1-1, because the mechanism is now identified precisely rather than assumed.

---

# Per-Target Invocation Decision

## Recommendation: preserved — one target, one invocation.

No new evidence contradicts it. New evidence **reinforces** it. Four independent problems collapse into this single decision:

1. **Unambiguous status (P1).** Batched, the bitmask exit code cannot distinguish "one unsupported target" from "everything failed." Per-target, each exit code describes exactly one target.
2. **Attribution.** Batched stdout carries no per-target boundary; a URL cannot be traced to its source. Per-target, attribution is structural.
3. **Valid JSON (P6).** One invocation, one valid array.
4. **Meaningful timeouts.** A per-target timeout is only definable if the target owns the process. Batched, a single hung target consumes the entire job budget with no way to attribute or bound it. **On a metered runner this matters more than it did locally.**

Plus the **privacy** finding above: per-target invocation is the quiet path; `-i` batch mode is the one that prints `[n/total] <url>` progress lines to stderr.

And it avoids `-i` entirely, closing the config-injection surface (P4).

**Cost:** ~0.48 s per spawn (P7). For 50 targets, ~24 s of overhead inside a 30-minute job budget, against network extraction measured in seconds-to-minutes per target. Negligible.

---

# Dependency / Version Strategy

Phase 1-1 treated gallery-dl as a pre-installed local prerequisite. On an ephemeral runner the workflow must provision it, so a version policy is now required.

### Evidence gathered this pass

Queried PyPI directly:

- **Latest release: `1.32.10`** (2026-08-29). **Locally installed: `1.32.4`** (2026-06-22).
- **198 total releases.**
- Gaps between the last twelve releases, in days: `36, 8, 33, 7, 8, 8, 11, 6, 7, 7, 27` — **median ≈ 8 days**.
- `requires_python: >=3.8`. License: **GPL-2.0-only**.

An ~8-day cadence is characteristic of a project whose releases are driven by **extractor repairs for upstream site changes**. That cuts both ways and defines the whole tradeoff.

### The tradeoff

| Strategy | For | Against |
|---|---|---|
| **Exact pin** (`==1.32.10`) | Reproducible; a failure is attributable; fixtures stay valid | Goes stale in ~8 days; a site that upstream already fixed still fails for us |
| **Constrained** (`~=1.32.4`) | Some fixes flow in automatically | Reproducibility is now probabilistic; two identical runs can differ |
| **Latest** (unpinned) | Freshest extractors, best raw success odds | A failed run is uninterpretable — site block? runner IP? new gallery-dl regression? And fixtures drift silently |

### Recommendation: exact pin, plus recorded version

Pin exactly in the workflow, set to the newest release at implementation time (`1.32.10` or newer), **and write the resolved `gallery-dl --version` into `diagnostics.txt` on every run.**

The reasoning is specific to what Phase 0 *is*. Phase 0 is an **experiment whose output is evidence** about whether anonymous extraction works from GitHub infrastructure. An unpinned dependency makes a failed run ambiguous across three explanations at once, which destroys the experiment's value. Reproducibility beats freshness here — and "pin **and record**" means any future failure can be attributed to an exact version rather than guessed at.

Extractor staleness is real but is a **Phase 1 operational concern**, and its remedy is a one-line version bump, deliberately taken. Adding dependency-management machinery (Dependabot, lockfiles, renovate) now would be infrastructure ahead of evidence — explicitly against operating manual §19.

### Local / CI version skew — a concrete instruction

The dev machine has `1.32.4`; CI will run the pinned newer version. **Test fixtures must be captured against the pinned CI version, not the local install.** Simplest correct approach: have Codex `pip install gallery-dl==<pinned>` locally before capturing fixtures, and record the capture version inside each fixture file.

**No `requirements.txt` for Phase 0.** One pinned `pip install` line in the workflow is the entire dependency surface. A manifest for a single dependency is machinery without a job. FloppyDisk's own runtime is stdlib-only: `subprocess`, `json`, `pathlib`, `argparse`, `dataclasses`. pytest is the only dev dependency.

---

# Privacy / Logging

The repository begins **private**, and target/extracted URLs are not things to spray through retained CI logs.

### Finding: the quiet path is already the recommended path

Verified this pass — per-target `-j` on success:

```text
exit=0
stdout bytes: 732    stderr bytes: 0
--stderr content--
(end)
```

**Zero stderr on success.** gallery-dl is silent by default under per-target `-j`. The `[n/total] <url>` progress lines from Phase 1-1 are an artifact of `-i` batch mode, which we are not using. So no `-q` flag is needed to achieve quiet — quiet is the default, and **everything that reaches the log is something our code chose to print.**

### Finding: gallery-dl's *error* output does contain URLs

On failure, stderr carries e.g. `[gallery-dl][error] Unsupported URL 'https://…'`. This is genuinely useful for diagnosis and must not simply be discarded — but it must not be echoed raw into the run log either.

### Design

| Channel | Contents | Contains URLs? |
|---|---|---|
| **Console / run log** | Aggregate counts and target **line numbers** only | **No** |
| **Step summary** | Counts only: targets processed / succeeded / failed / links found / excluded-by-type / excluded-unknown-extension / duplicates removed | **No** |
| **`diagnostics.txt`** (artifact) | Per-target line number, outcome, captured gallery-dl stderr | Yes — but downloaded, not logged |
| **`links.txt`** (artifact) | URLs only | Yes, by definition |

Rules for implementation:

- Our code must **never** print a target URL or an extracted URL to stdout/stderr.
- gallery-dl stderr is **captured into a variable**, written to `diagnostics.txt`, never echoed.
- Diagnostics identify targets by **`targets.txt` line number** — enough to diagnose (the human holds the file) without reproducing the URL.
- Failure diagnosis is preserved: line number + outcome classification (`unsupported` / `extraction error` / `timeout` / `invocation failure`) + captured stderr in the downloadable artifact.

No credentials are required in Phase 0, so there is no secret-masking problem to solve.

---

# Failure Containment

Principle: **one bad target → record → continue.**

| Condition | Behavior | Diagnostics |
|---|---|---|
| Blank / whitespace-only line | Skipped silently, not counted as a target | none |
| Comment line (`#`) | Skipped silently | none |
| Malformed / non-http(s) target | Rejected **before** any subprocess | line number + `invalid` |
| Unsupported target (exit 64) | Recorded, continue | line number + `unsupported` |
| Extractor error (exit 4/8/16) | Recorded, continue | line number + code + captured stderr |
| Network error | Recorded, continue | line number + captured stderr |
| Target timeout | Subprocess killed, recorded, continue | line number + `timeout` + elapsed |
| gallery-dl missing / not executable | **Fatal** — exit 1 | preflight message |
| Malformed JSON from gallery-dl | Recorded as invocation failure, continue | line number + `bad-json` |
| Pseudo-scheme URL (`ytdl:`/`text:`/`generic:`) | Excluded by filter | counted by class |
| Video / archive / PDF result | Excluded by allowlist | counted by class |
| Unknown extension (`''`) | Excluded by allowlist | **counted separately** — the silent-loss channel |
| Duplicate URL | Removed, first-seen kept | count only |
| Zero images for one target | Normal; recorded | line number + `0 links` |
| Zero images for entire run | Normal; empty `links.txt` still written and uploaded | warning annotation + counts |
| Some succeed, some fail | **Normal.** All discovered links written | per-target outcomes |

`links.txt` stays clean in every one of these cases (C1). Diagnostics never leak into it (C9).

---

# GitHub Runner Risks

These are **known unknowns to be measured, not problems to solve in Phase 0**. The real GitHub-hosted run exists precisely to convert these from speculation into evidence. Operating manual §19: evidence before infrastructure.

| Risk | Why it plausibly bites on a runner | Phase 0 response |
|---|---|---|
| **Datacenter IP blocking** | Many image hosts treat Azure/GitHub ranges as abusive and block or degrade them. This is the **single largest Phase 0 unknown.** | Measure. Record per-target outcome. Do not build proxying. |
| **Anti-bot / challenge pages** | Cloudflare and similar challenge datacenter IPs far more aggressively than residential ones. Surfaces as `ChallengeError` (exit 8). | Measure. Do not attempt to solve. |
| **Anonymous extraction availability** | Some sites only serve galleries to logged-in sessions. | Measure. No credentials in Phase 0. |
| **Rate limits** | A runner issues requests faster and from a shared IP. | Measure. No backoff in Phase 0. |
| **Geographic behavior** | Runner region is not the user's region; geo-gated or region-varying content may differ. | Record. |
| **Signed / expiring CDN URLs** | **Product-relevant, not just operational.** If extracted URLs carry short-lived tokens, `links.txt` has a shelf life and may be stale before the human uses it. | **Explicitly check during the first real run.** Flagged under *Evidence Needed*. |
| **Extractor network timeouts** | Runner egress differs from residential. | Per-target timeout contains it. |
| **Cookies required** | Some extractors need a cookie jar. | Out of scope. Record which targets need it. |
| **Authentication / API credentials** | Some extractors need keys. | Out of scope. Record. |

If some sites block GitHub runners, that is a **successful Phase 0** — it produces the evidence that shapes the next architectural decision. Designing around a block that has not been demonstrated would be building infrastructure for a hypothetical.

---

# GPL / Licensing

Practical and proportional. **Not legal advice.**

**Confirmed this pass:** gallery-dl's PyPI metadata declares **`GPL-2.0-only`**.

The architecture is:

- FloppyDisk **installs** upstream gallery-dl from PyPI at runtime, on an ephemeral runner.
- FloppyDisk **invokes** it as a separate process over its CLI.
- FloppyDisk **does not** copy, vendor, or modify gallery-dl source.
- FloppyDisk **does not** link against it — no `import gallery_dl` in production code.
- FloppyDisk **does not redistribute** gallery-dl. pip fetches it from PyPI at run time.

**Practical position.** Invoking a separate program as a subprocess across a CLI boundary is the arm's-length arrangement generally understood *not* to make the calling program a derivative work. FloppyDisk's own orchestration and filtering code is independently authored and may carry whatever license the owner chooses. Because we never distribute gallery-dl binaries or source, the GPL's source-availability obligations are not triggered on us — the user's runner obtains it directly from the upstream distributor.

**What to do at this phase — three small things:**

1. Add a `LICENSE` file stating FloppyDisk's own license (owner's choice).
2. Add a short README note: FloppyDisk requires gallery-dl, which is **GPL-2.0-only**, is **installed separately at runtime**, is **not bundled**, and lives at `https://github.com/mikf/gallery-dl`.
3. **Do not vendor gallery-dl source into this repository.** Keep the subprocess boundary — it is what keeps this analysis simple, and it is now an architectural constraint, not merely a style preference.

**Revisit only if** FloppyDisk ever bundles gallery-dl into a distributed artifact (PyInstaller executable, Docker image, vendored source), or ever imports it as a library. Either would change the analysis materially and deserves its own decision. This is recorded as a breadcrumb-worthy constraint on the seam.

---

# Automated Tests

Per operating manual §12 and §66 — automate everything reasonably automatable. **No normal test may touch a live website.**

### Targets parsing (`test_targets.py`)
- Blank and whitespace-only lines skipped.
- `#` comment lines skipped.
- Leading/trailing whitespace stripped.
- `http://` and `https://` accepted; `HTTP://` accepted (case-insensitive).
- Rejected: `ftp://…`, `file:///…`, bare `example.com`, empty string.
- **Injection defense:** a line `-o output.fallback=false` is **rejected as a target** and never reaches a subprocess (P4).
- **Flag defense:** a line `--version` is rejected (P4).
- Rejections are recorded with correct line numbers.

### Filters — the six-format allowlist (`test_filters.py`)
- Each of `jpg, jpeg, png, gif, webp, avif` **accepted**.
- Each of `jpe, bmp, svg, heic, psd` **rejected** (Phase 1-1 over-inclusion, now corrected).
- **`webm` rejected while `webp` accepted** — the one-character adjacency; highest-value single test in the suite.
- `mp4, mov, mkv, mp3, zip, rar, 7z, pdf, swf` rejected.
- Uppercase `.JPG` / `.PNG` accepted (case-insensitive).
- Query-string URL `photo.jpg?token=abc123` accepted, **and the full URL including the query is preserved** in output.
- Extension-in-query-only (`?format=jpg`) with **metadata supplying** `extension='jpg'` → accepted (the Twitter case).
- Extension-in-query-only with **no metadata** → `''` → rejected, and counted in the unknown-extension bucket.
- Pseudo-schemes `ytdl:`, `text:`, `generic:` rejected.
- A `text:` payload containing embedded newlines cannot inject extra lines into output.
- Metadata extension takes precedence over path extension when they disagree.
- **Contract test: exactly one allowlist constant exists and has exactly six members.**

### Dedupe (in `test_filters.py`)
- Exact duplicates removed.
- **First-seen order preserved** (freeze this contract per manual §60).
- URLs differing only by query string are **not** collapsed.
- Case-differing URLs are **not** collapsed (URLs are case-sensitive after the host).

### Discovery seam (`test_discover.py`) — `subprocess` stubbed, fixtures only
- Parses a captured single-target `-j` payload correctly.
- Selects only `message_type == 3` records.
- **Correct argv construction:** contains `-j`; contains `--`; the target appears **after** `--`; contains no download-capable form (C4).
- Exit `0` → `ok=True`.
- Exit `64` → `ok=False`, classified `unsupported`, **no exception raised**, run continues (P1).
- Exit `4` → classified extraction error, continues.
- Timeout → subprocess killed, classified `timeout`, continues.
- Malformed JSON on stdout → classified `bad-json`, continues.
- Empty stdout → zero URLs, not an error.
- **stderr is captured and never printed** (privacy).
- gallery-dl absent → preflight fails cleanly with exit 1.

### Orchestration / output
- `links.txt` contains only URLs — assert every line matches `^https?://` and the file has no blank lines, no headers, no diagnostics.
- Zero results → **empty file**, not a file with a message.
- Trailing newline present; UTF-8; `\n` line endings.
- Partial failure: 3 targets where the middle one fails → links from targets 1 and 3 both present (C7).
- Diagnostics contain **no full target URLs** — assert line-number references only.
- Exit `0` on partial success; exit `1` only on unreadable input / unwritable output (C8).

### Workflow static contract (`test_workflow.py`)
Parse the YAML and assert:
- `workflow_dispatch` present; **`push` and `schedule` absent**.
- `permissions.contents == "read"`, and no write permission anywhere.
- `timeout-minutes` present on the job.
- gallery-dl install line uses an **exact `==` pin**.
- Python version is **pinned**, not `3.x`.
- Upload step has **`if: always()`**.
- Upload path includes `links.txt`.

That last group is cheap and catches the highest-consequence regressions — an accidental `on: push`, a silently unpinned dependency, or a lost `if: always()` that drops the artifact exactly when it is most needed.

---

# Human Tests

Deliberately minimal, per manual §12–14. Everything above is automated; only what genuinely cannot be automated locally remains.

**The entire human test is the real GitHub-hosted run:**

1. Put a few representative real targets into `targets.txt`.
2. Commit and push.
3. Open the Actions tab and click **Run workflow**.
4. Download the `floppydisk-links` artifact.
5. Confirm expected image URLs are present and unwanted media types are absent.

That is the whole list. It is justified because it verifies exactly the conditions local fixtures cannot: **real network egress from GitHub datacenter IPs against real sites** — the one thing Phase 0 exists to learn (see *GitHub Runner Risks*).

While inspecting the artifact, the human is additionally asked to note two things that only a human can judge cheaply:

- Whether any downloaded URL has already **expired** when opened (the signed-URL shelf-life question).
- Whether the `diagnostics.txt` unknown-extension count looks alarmingly high, which would promote the extensionless-URL decision from "deferred" to "urgent."

No twenty-step manual QA checklist. No asking the human to verify things a test can prove.

---

# Stop Conditions

Codex must **STOP and report** rather than improvise if:

1. Any **Protected File** appears to require modification.
2. A module other than `discover.py` needs to know gallery-dl exists.
3. gallery-dl must be **imported** rather than subprocessed.
4. Making a real target work requires **broadening the six-format allowlist**.
5. `links.txt` seems to require anything other than URLs.
6. The workflow requires **elevated permissions** beyond `contents: read`.
7. Any **credential, cookie, token, or secret** becomes necessary.
8. The per-target invocation model proves unworkable in practice.
9. Actual gallery-dl `-j` output **contradicts the captured fixtures** or this report's description of it.
10. Implementing a stage requires files outside its **Files Allowed to Change** list.
11. Making tests pass appears to require weakening an assertion rather than fixing code.
12. The pinned gallery-dl version cannot be installed on the runner.

Manual §72: do not quietly redesign. New evidence contradicting the blueprint is valuable information — report it and wait for an architecture decision.

---

# Known Unknowns

| Unknown | Status |
|---|---|
| Do target sites serve GitHub datacenter IPs anonymously? | **The central Phase 0 question.** Unmeasured until the real run. |
| What fraction of real extracted URLs have `extension == ''`? | Unknown. Determines whether the strict allowlist silently loses meaningful data. Diagnostics will count it. |
| Are extracted CDN URLs signed/expiring, and if so how long do they live? | Unknown. Affects whether `links.txt` is durable or perishable — a **product** question, not just technical. |
| Which representative targets will the owner actually use? | Not yet specified. Shapes what the first real run proves. |
| How large can a single target's `-j` payload get? | Unknown. `-j` buffers per target. Probably fine; unmeasured. |
| Will the 30-minute job timeout suffice for realistic target counts? | Estimated, not measured. |
| Does gallery-dl `1.32.10` behave identically to the locally-verified `1.32.4`? | Assumed compatible within the same minor line; **fixtures must be captured against the pinned version** to confirm. |
| Are there extractors that emit `Message.Url` records lacking an `extension` key entirely (vs. empty)? | Filter must tolerate both; not exhaustively surveyed across 271 extractors. |

---

# Deferred Questions

1. **Extensionless URL resolution.** A `HEAD` request reading `Content-Type` would resolve them without downloading the body. **Deferred** — it is new network infrastructure, and manual §19 says measure the problem first. Revisit if diagnostics show a high unknown-extension count.
2. **URL normalization for dedup.** Deferred; needs real data (P9).
3. **Video / archive support.** Out of scope; would need explicit authorization and a widened allowlist.
4. **`--range` capping per target.** Could bound runaway galleries. No evidence it is needed.
5. **Concurrency.** Only if the job timeout proves binding.
6. **Dependency automation (Dependabot/renovate).** Deferred; one pinned line does not warrant it.
7. **Report filename convention.** My Phase 1-1 report is `PHASE-0-ARCHITECTURE.md`, which predates my knowledge of the numbering convention and does not match it — it is logically "Phase 1-1". Manual §24 says preserve historical report names rather than renaming, so **I have not renamed it.** If you would prefer it renamed to `Phase 1-1 - Architecture Report.md` for clean chronology, say so and I will do it as an explicit, isolated action.

---

# Evidence Needed

Ordered by how much each would change subsequent architecture:

1. **Does anonymous extraction work from GitHub runners, per site?** — the gating evidence for everything after Phase 0.
2. **Unknown-extension rate on real targets** — decides whether HEAD-probing gets promoted from deferred.
3. **Signed-URL lifetime** — decides whether `links.txt` is a durable artifact or a perishable one, which is a product-shaping fact.
4. **Realistic run duration for a representative `targets.txt`** — validates the timeout budget.
5. **Which failure classes actually occur** (`unsupported` vs `challenge` vs `auth` vs `timeout`) — determines what, if anything, Phase 1 should address.
6. **Whether the pinned CI gallery-dl matches locally-captured fixtures** — validates the whole offline test strategy.

---

# Future Decision Points

- **If most sites block GitHub IPs** → decide between self-hosted runners, a different execution home, or accepting a narrower supported-site set. Do not pre-build any of these.
- **If the unknown-extension rate is high** → decide on HEAD-probing (and accept its network cost), or accept the loss.
- **If URLs expire quickly** → `links.txt` may need to become a trigger for immediate downstream use rather than a stored artifact. Product-level implication.
- **If gallery-dl staleness causes failures** → decide on a bump cadence; possibly automate then.
- **GitHub Pages (future phase, do not build).** One constraint recorded now so the option is not accidentally destroyed: **a public/static Pages app must never embed a privileged GitHub PAT or equivalent secret in browser JavaScript to trigger Actions.** Any future trigger mechanism needs a server-side or GitHub-App-mediated exchange. Recording this protects optionality without building it (manual §44).

---

# Breadcrumb Plan

Three tiers per manual §27–32. Breadcrumbs preserve **architecture and WHY**, never changelog trivia.

Note on `WAS`: FloppyDisk is new, so most `WAS` sections would be empty — and manual §28 forbids inventing folklore. **One genuine piece of history now exists**, though: the Phase 1-1 → Phase 1-2 correction. That is verifiable in the report folder and is legitimate `WAS` material. Elsewhere, `WAS` should be **omitted** rather than fabricated.

### `floppydisk/discover.py` — the seam *(most important)*

- **WAS** — Phase 1-1 designed this as a local Windows CLI; Phase 1-2 corrected the execution home to a GitHub-hosted runner. The seam shape survived the correction unchanged, which is the evidence it is at the right boundary.
- **IS** — This module is the **only** place that knows gallery-dl exists. It invokes gallery-dl once per target as a subprocess and returns plain data. Record the four WHYs future agents would otherwise undo: (1) per-target, because the exit code is a bitmask OR-ed across all inputs, so batching makes status unattributable; (2) `-j` not `-g`, because `-g`'s fallback lines are prefixed `| ` and it discards extractor-supplied extension metadata; (3) targets pass via argv after `--` and never through `-i`, because `-i` interprets `-o`-style lines as configuration directives; (4) stderr is captured, never printed, because it contains URLs and this runs in retained CI logs.
- **WILL BE** — This boundary intentionally permits a different discovery engine, or extension resolution via HEAD probing, without any caller changing. It also intentionally keeps gallery-dl at arm's length as a **separate process**, which is what keeps the GPL analysis simple — importing or vendoring it would change that.

### `floppydisk/filters.py` — the product contract

- **IS** — The six-format allowlist is a **product contract deliberately chosen by the owner**, not a technical default. One constant serves both the metadata path and the URL-path fallback, because two lists would drift. `extension == ''` means *unknown*, and unknown is excluded on purpose — gallery-dl only resolves a missing extension from `Content-Type` at download time, and Phase 0 does not download. Note explicitly that `webm` is video and must never be admitted by proximity to `webp`.
- **WILL BE** — Broadening this list is a product decision requiring explicit authorization, not a bug fix. Resolving unknown extensions via HEAD requests is deliberately left open.

### `floppydisk/cli.py` — output and containment contracts

- **IS** — `links.txt` carries URLs and nothing else, ever; diagnostics exist to keep it that way. Partial success is a **normal outcome**, not an error, which is why the process exits 0 when some targets fail. Diagnostics reference targets by line number rather than URL because this runs in CI logs on a private repository.
- **WILL BE** — The exit-code contract intentionally leaves room for a `--strict` mode if a future caller needs failure to be fatal.

### `.github/workflows/extract-links.yml`

- **IS** — Manual dispatch only: pushing targets must never silently spend runner minutes or fire unintended extractions. `contents: read` is sufficient — artifact upload does not need write. `if: always()` on upload is deliberate: partial success must still deliver `links.txt`, which is exactly when the artifact matters most. The gallery-dl pin is exact so a failed run is attributable to a known version rather than ambiguous across site/IP/version.
- **WILL BE** — A future Pages trigger must not embed a privileged token in browser JavaScript.

**The Codex implementation report MUST contain a `# Breadcrumbs Added` section.**

---

# Implementation Stages

Four reversible stages (manual §43). Stages A–C are fully provable offline; Stage D is where real-world evidence arrives. **Codex stops at each stage boundary.**

---

## Stage A — Pure core

**Goal** — Prove targets parsing and the strict six-format allowlist, with no gallery-dl and no network anywhere.

**Scope** — Package skeleton, `filters.py`, targets parsing inside `cli.py`, and their tests. pytest installed and green.

**Files Allowed to Change**
```text
floppydisk/__init__.py, floppydisk/__main__.py
floppydisk/cli.py            (parse_targets only)
floppydisk/filters.py
tests/test_targets.py, tests/test_filters.py
.gitignore                   (append only)
```

**Protected** — everything in *Protected Files / Systems*; also `discover.py` and the workflow must not exist yet.

**Required Behavior** — C2, C5, C6. Exactly one six-member allowlist constant.

**Explicit Non-Goals** — no subprocess, no gallery-dl, no workflow, no network, no `pyproject.toml`.

**Automated Tests** — the *Targets parsing*, *Filters*, and *Dedupe* groups above. All must pass.

**Human Tests** — none.

**Stop Conditions** — global list; especially #4 (allowlist pressure).

**Report** — `Claude and Codex Reports/Codex Reports/Phase 1-3 - Stage A Implementation Report.md`

**Commit** — one commit on `Phase-0` after tests pass. Message: `phase 0a: targets parsing and strict image allowlist`.

---

## Stage B — The gallery-dl seam

**Goal** — Prove `discover.py` correctly invokes gallery-dl and interprets every failure mode, entirely offline.

**Scope** — `discover.py` plus captured fixtures.

**Files Allowed to Change**
```text
floppydisk/discover.py
tests/test_discover.py
tests/fixtures/**
```

**Protected** — `filters.py` (Stage A contract is frozen); all global protected files.

**Required Behavior** — C3, C4, C7. Per-target invocation; argv after `--`; timeout on every call; stderr captured never printed; every exit code classified, none raised.

**Fixture capture** — install the **pinned** gallery-dl version locally first (not the machine's `1.32.4`); record the capture version inside each fixture. Fixtures must cover: a successful single-target payload; a `ytdl:` record; a `text:` record; an extensionless record (`extension: ""`); a metadata-supplied extension (the `?format=jpg` Twitter shape); exit 64 unsupported; exit 4 extraction error; malformed JSON; empty stdout.

**Explicit Non-Goals** — no live network in tests; no orchestration; no workflow; no retry logic.

**Automated Tests** — the *Discovery seam* group. All must pass. Stage A tests must still pass.

**Human Tests** — none.

**Stop Conditions** — global; especially #9 (real output contradicts fixtures) and #2/#3 (seam leaking).

**Report** — `Claude and Codex Reports/Codex Reports/Phase 1-4 - Stage B Implementation Report.md`

**Commit** — `phase 0b: isolated gallery-dl discovery seam`.

---

## Stage C — Orchestration and output

**Goal** — Assemble the full pipeline and prove the `links.txt` purity and partial-success contracts end-to-end, still offline.

**Scope** — `cli.py` orchestration, diagnostics, output writing, preflight check.

**Files Allowed to Change**
```text
floppydisk/cli.py
floppydisk/__main__.py
tests/test_cli.py
.gitignore                   (append links.txt, diagnostics.txt)
```

**Protected** — `discover.py` and `filters.py` contracts are frozen; all global protected files.

**Required Behavior** — C1, C7, C8, C9. Atomic write of `links.txt`. Preflight that gallery-dl exists. Counts to step summary. No URL ever printed to stdout/stderr by our code.

**Explicit Non-Goals** — no workflow yet; no live network; no concurrency.

**Automated Tests** — the *Orchestration / output* group, with `discover` stubbed. Full end-to-end on fixtures including the 3-target partial-failure case. Stage A and B tests still pass.

**Human Tests** — none.

**Stop Conditions** — global; especially #5 (`links.txt` purity pressure).

**Report** — `Claude and Codex Reports/Codex Reports/Phase 1-5 - Stage C Implementation Report.md`

**Commit** — `phase 0c: pipeline orchestration and links.txt output contract`.

---

## Stage D — GitHub Actions execution *(the acceptance gate)*

**Goal** — Produce a downloadable `links.txt` artifact from a GitHub-hosted runner using representative real targets. **This stage generates the Phase 0 evidence.**

**Scope** — The workflow file, a starter `targets.txt`, README update, workflow static tests.

**Files Allowed to Change**
```text
.github/workflows/extract-links.yml
targets.txt
tests/test_workflow.py
README.md
LICENSE                      (new, if the owner supplies a choice)
```

**Protected** — all Python source contracts from Stages A–C; all global protected files.

**Required Behavior** — the full *GitHub Actions Flow* table, including `workflow_dispatch` only, `contents: read`, exact gallery-dl pin, `if: always()` upload, counts-only step summary.

**Explicit Non-Goals** — no Pages, no secrets, no scheduled triggers, no anti-bot handling, no retry.

**Automated Tests** — the *Workflow static contract* group. All prior tests still pass.

**Human Tests** — the five-step run listed under *Human Tests*, plus the two observations (URL expiry, unknown-extension count).

**Stop Conditions** — global; especially #6 (elevated permissions), #7 (credentials), #12 (pin uninstallable). **Also: if the first real run produces zero links across all targets, STOP and report the evidence — do not begin building workarounds.**

**Report** — `Claude and Codex Reports/Codex Reports/Phase 1-6 - Stage D Implementation Report.md`, and it must record the **actual observed per-target outcomes** from the real run — that record is the deliverable of this stage as much as the code is.

**Commit** — `phase 0d: github actions workflow and artifact upload`.

---

# Phase 0 PASS / FAIL Gate

Phase 0 **PASSES** only when all of the following are demonstrated:

**Execution model**
1. FloppyDisk runs on a GitHub-hosted runner, triggered manually via `workflow_dispatch`.
2. The user's Windows machine takes no part after the push.
3. The workflow provisions gallery-dl itself at a pinned version, and that version is recorded in diagnostics.

**Pipeline**
4. `targets.txt` is consumed from the repository; blank/comment lines skipped; malformed targets rejected before any subprocess.
5. gallery-dl performs discovery only — **no image or media file is downloaded**.
6. Direct image URLs are extracted from representative real targets.
7. Only `jpg, jpeg, png, gif, webp, avif` survive — verified against a real artifact, not only unit tests.
8. Query-string image URLs qualify, with the **query preserved** in the written URL.
9. Video, archive, PDF, and pseudo-scheme results are absent from `links.txt`.
10. Duplicates are removed; first-seen order preserved.
11. A failing target does not prevent other targets' links from being written.

**Output**
12. `links.txt` contains **only** URLs — no headings, metadata, JSON, errors, or diagnostics.
13. `links.txt` is uploaded as a downloadable Actions artifact, including on partial success.
14. Diagnostics are downloadable and separate, and contain no full target URLs in the run log.

**Evidence**
15. Representative real targets have actually been exercised from GitHub infrastructure.
16. The human has downloaded and inspected the artifact.
17. Per-target outcomes are recorded in the Stage D report — **including failures**.

### Refinements to the gate

Two additions, because Phase 0's purpose is evidence:

18. **The unknown-extension count is recorded.** Without it we cannot tell whether the strict allowlist is quietly discarding a large share of real images.
19. **Per-target failure classification is recorded** (`unsupported` / `challenge` / `auth` / `timeout` / `network`). "It didn't work" is not evidence; "three targets returned challenge errors from a datacenter IP" is.

### Explicitly NOT failure conditions

- **Some targets fail while others succeed.** Partial success is a designed, acceptable outcome.
- **A site blocks GitHub's IP ranges.** That is a *finding*, and arguably the most valuable one Phase 0 can produce. It fails the target, not the phase — provided the pipeline demonstrably worked for others.

**Phase 0 FAILS if:** the workflow cannot run; `links.txt` is contaminated with non-URL content; disallowed formats appear in output; media is downloaded; one target's failure destroys the whole run; or the artifact cannot be downloaded.

**The ambiguous case, stated plainly:** if **every** target fails, the pipeline is unproven end-to-end even though it may be correct. That is **STOP, not FAIL** — report the evidence, then decide whether to retest with different targets or reconsider the execution home. Do not start building workarounds.

---

# Recommendation

**Verdict: FEASIBLE WITH CONSTRAINTS.**

The architecture is sound and the GitHub-hosted model is the right correction. The constraints are honest ones, and two are worth the review table's attention:

1. **Whether target sites serve GitHub datacenter IPs anonymously is genuinely unknown**, and no amount of design resolves it. Phase 0 is correctly shaped as the experiment that answers it — which is why "all targets blocked" is defined as STOP-with-evidence rather than FAIL.

2. **The strict six-format allowlist will silently exclude extensionless URLs.** This follows directly from the corrected finding that gallery-dl only resolves missing extensions at download time, and Phase 0 does not download. It is the right conservative behavior under the owner's explicit instruction, but it must be **counted and surfaced** so the loss is visible rather than invisible.

My recommendations, held with the confidence each deserves:

- **`-j`, confidently** — on better evidence than Phase 1-1 offered, and with the overstated claim corrected.
- **Per-target invocation, preserved** — now reinforced by the timeout and privacy findings.
- **Five source files, no `pyproject.toml`** — down from Phase 1-1's eight-plus-packaging, while keeping the two boundaries that carry real architectural weight.
- **Exact version pin, plus recorded version** — because Phase 0's product is interpretable evidence.

The disciplined next step is the review gate, not implementation. Per manual §7 and §75, I stop here.

**Status: READY for ChatGPT + human review.**

---

*End of Phase 1-2 architecture amendment. No production code, no workflow file, and no tests were written in this pass. All gallery-dl behavior cited was verified against version 1.32.4 as installed locally, by source reading and live execution; PyPI release and licensing data were queried directly from the package index on 2026-09-02.*
