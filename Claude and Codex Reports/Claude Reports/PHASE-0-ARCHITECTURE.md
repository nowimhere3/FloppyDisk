# FloppyDisk — Phase 0 Architecture Report

**Author:** Claude Opus (Architect / Orchestrator pass)
**Date:** 2026-09-02
**Branch:** `Phase-0`
**Status:** DESIGN ONLY — no feature code written. For review by ChatGPT + product owner before Codex implements.

---

## 0. Workspace Confirmation

| Check | Result |
|---|---|
| Repository root | `C:/Users/dmcal/Documents/GitHub/FloppyDisk` — **matches expected** |
| Current branch | `Phase-0` — **matches expected** |
| `git status` | Clean. Nothing to commit, up to date with `origin/Phase-0` |
| Pre-existing dirty state | **None** |
| Commit history | Single commit `b5e197e Initial commit` |

**Tracked files (3 total):** `.gitattributes`, `.gitignore`, `README.md`

**Untracked/empty:** `Claude and Codex Reports/Claude Reports/`, `Claude and Codex Reports/Codex Reports/` (empty dirs; git does not track them)

**Baseline tests: NONE.** There is no test suite, no source code, no package, no `pyproject.toml`, no dependency manifest, and no CI. There is no CLAUDE.md or other repo instruction file. This is a genuinely empty project — nothing below is reverse-engineered from existing architecture, because none exists.

### Toolchain actually present on this machine

| Tool | State |
|---|---|
| Python | **3.14.2** at `C:\Python314` (primary); 3.13.14 also present via Store |
| pip | 25.3 |
| gallery-dl | **1.32.4** — on PATH at `/c/Python314/Scripts/gallery-dl` **and** importable as `python -m gallery_dl` |
| pytest | **NOT INSTALLED** |
| uv / ruff | **NOT INSTALLED** |

`.gitignore` is the stock GitHub Python template, which confirms the intended language is Python.

> **Prompt truncation notice:** the briefing I received was cut off mid-sentence at the end of the North Star pipeline block (`links.txt`). Any sections after that — likely covering report format, deliverable location, or constraints — never reached me. I have placed this report at the obvious location (`Claude and Codex Reports/Claude Reports/`) and made my own scope calls, all of which are listed explicitly in §7 and §8. Please re-send anything that was lost.

---

## 1. Executive Summary

The North Star pipeline is five conceptual steps, but **only one of them is genuinely hard**: the gallery-dl seam. Reading targets, filtering, deduplicating, and writing a text file are trivial. Essentially all Phase 0 architectural risk sits in how FloppyDisk invokes gallery-dl and interprets what comes back.

I investigated that seam empirically — reading gallery-dl 1.32.4's own source and running live probes — rather than assuming its contract. **Four assumptions a naive implementation would almost certainly make are false.** They are documented with evidence in §3.

The headline finding:

> **gallery-dl's exit code is a bitmask OR-ed across every input URL.** In a batch run, one unsupported target makes the entire run exit non-zero even when every other target succeeded perfectly. Any implementation that treats "non-zero exit ⇒ run failed" will throw away good output. I verified this: 2 of 3 targets succeeded, both good URLs printed cleanly to stdout, and the process still exited **64**.

The central recommendation that follows: **invoke gallery-dl once per target, not once per batch.** This single decision dissolves four separate problems at once (exit-code ambiguity, per-target attribution, JSON parseability, and blast radius) at a measured cost of ~0.48 s of process overhead per target — negligible against real network extraction time.

---

## 2. What Phase 0 Is (and Is Not)

**Phase 0 delivers:** a local, single-process, synchronous CLI that reads `targets.txt`, resolves each target through gallery-dl, keeps direct image URLs, deduplicates them, and writes `links.txt`.

**Explicit non-goals for Phase 0** (listed so reviewers can push back now rather than after implementation):

- No downloading of images. FloppyDisk emits links only.
- No concurrency / parallelism / async.
- No network calls written by us. gallery-dl owns all network I/O.
- No retry, backoff, or rate limiting.
- No resume / incremental state / caching across runs.
- No authentication, cookies, or credential handling.
- No config file. Flags and defaults only.
- No "Online"/hosted/web surface, despite the README wording (see §7, Q1).
- No packaging, publishing, or installer.
- No URL normalization beyond exact-match dedup (see §5.4 — this is a deliberate safety call).

---

## 3. Seam Investigation — Evidence

All findings below were verified against the installed gallery-dl 1.32.4, by source reading and live execution.

### 3.1 FINDING A — Exit code is a bitmask OR-ed across all targets (**critical**)

`gallery_dl/__init__.py` accumulates `retval |= status` over every input URL and returns the OR of all of them. Codes are powers of two, defined in `gallery_dl/exception.py`:

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | generic `GalleryDLException` |
| 4 | `ExtractionError` (incl. HTTP errors, not-found) |
| 8 | `ChallengeError` |
| 16 | authentication / authorization failure |
| 32 | `InputError` |
| 64 | `NoExtractorError` — unsupported URL |
| 128 | unexpected exception |

**Live proof.** Input of 3 targets (good / unsupported / good):

```
exit=64
--stdout--
https://upload.wikimedia.org/.../PNG_transparency_demonstration_1.png
https://upload.wikimedia.org/.../Cat_November_2010-1a.jpg
--stderr--
[1/3] https://upload.wikimedia.org/.../PNG_transparency_demonstration_1.png
[2/3] https://example.com/not-a-gallery
[gallery-dl][error] Unsupported URL 'https://example.com/not-a-gallery'
[3/3] https://upload.wikimedia.org/.../Cat_November_2010-1a.jpg
```

Two targets fully succeeded; stdout is clean and correct; the process still exited 64.

**Consequence:** in batch mode the exit code is unusable as a success signal, and stdout carries **no per-target boundary markers**, so a URL on stdout cannot be attributed back to the target that produced it. Per-target progress appears only on *stderr* as `[n/total]` lines — parsing those to recover attribution would be brittle and is not recommended.

### 3.2 FINDING B — `-g` output is not always one bare URL per line (**high**)

From `gallery_dl/job.py`, `UrlJob.handle_url_fallback`:

```python
def handle_url_fallback(self, url, kwdict):
    stdout_write(url + "\n")
    if "_fallback" in kwdict:
        for url in kwdict["_fallback"]:
            stdout_write(f"| {url}\n")
```

And in `__init__.py`, this fallback variant is installed **by default**:

```python
if config.get(("output",), "fallback", True):
    jobtype.handle_url = jobtype.handle_url_fallback
```

The default is `True`. So `-g` can emit continuation lines prefixed with `"| "`. A line-oriented parser that assumes every stdout line is a bare URL will ingest `| https://...` verbatim and write a corrupt entry into `links.txt`.

**Mitigation (verified working):** pass `-o output.fallback=false`, and *additionally* skip any line starting with `|` defensively.

### 3.3 FINDING C — `-g` emits pseudo-scheme URLs that are not HTTP (**high**)

Counted across the 271 bundled extractors:

- `ytdl:https://…` — **41** occurrences (video handed off to yt-dlp)
- `text:…` — **10** occurrences (raw post text, not a URL at all)
- `generic:…` — 1 occurrence

These flow straight through `-g`. A filter that only checks for an image file extension will mostly reject them by accident, but a filter that checks "does it start with http" must run *before* extension logic, and `text:` payloads can contain arbitrary text including newlines.

### 3.4 FINDING D — feeding `targets.txt` to `-i` is a config-injection surface (**medium, security-relevant**)

gallery-dl's input-file format is not a plain URL list. It interprets lines beginning with `-o`, `-G`, and similar as **configuration directives**.

**Live proof.** An input file whose first line was `-o output.fallback=false` produced exit 0 with no "Unsupported URL" error — the line was consumed as a config directive, not treated as a target.

So if `targets.txt` is ever populated from an untrusted or shared source, `-i` lets its contents reconfigure gallery-dl. Related: passing a target as a bare argv element has the same class of problem — I confirmed that a target line of `--version` passed as argv is executed as the flag (printed `1.32.4`, exit 0) rather than being rejected.

**Mitigation:** parse `targets.txt` ourselves; validate each line begins with `http://` or `https://`; pass targets after a `--` end-of-options separator (verified honored).

### 3.5 FINDING E — batch `-j` output is not valid JSON (**medium**)

`-j/--dump-json` emits one JSON array **per target**. In batch mode these are concatenated, producing a stream that `json.loads` rejects:

```
PARSES AS SINGLE JSON: NO -> JSONDecodeError Extra data: line 30 column 1
```

Per-target invocation yields exactly one valid JSON array per call, so this problem disappears entirely under the recommended design.

### 3.6 FINDING F — `-j` carries an `extension` field that `-g` throws away (**shapes the filter design**)

`-j` output for a single image:

```json
[ [ 3,
    "https://upload.wikimedia.org/.../PNG_transparency_demonstration_1.png",
    { "category": "directlink", "extension": "png",
      "filename": "PNG_transparency_demonstration_1", "query": null } ] ]
```

Entries are `[message_type, ...]`; **type `3` is `Message.Url`** — the actual downloadable URL — and it comes with resolved metadata including `extension`.

This matters because **many real CDN image URLs carry no file extension in their path** (or hide it in a query parameter). An extension-from-the-URL-string filter will silently drop valid images. gallery-dl has already done this resolution work; `-j` exposes it and `-g` discards it.

### 3.7 Measured cost of per-target invocation

| Mode | Wall time |
|---|---|
| 3 separate invocations | 1.449 s (**≈0.48 s each**) |
| 1 batch invocation of the same 3 | 0.464 s |

Fixed overhead is ~0.48 s per spawn. For a 50-target file that is ~24 s of overhead — but real gallery extraction is network-bound and takes seconds to minutes *per target*, so spawn cost is in the noise. **The trade is affordable and buys correctness.**

---

## 4. Architectural Decisions

### AD-1 — Invoke gallery-dl **once per target** (not batched)

*Rationale:* resolves Findings A, E, and blast radius simultaneously. Each call yields an unambiguous per-target exit code, natural attribution, and (with `-j`) exactly one valid JSON document. One malformed or unsupported target cannot contaminate the interpretation of any other. Measured cost is negligible (§3.7).

*Rejected alternative:* batch via `-i`. Faster, but forfeits per-target success signal and attribution, and opens the injection surface in Finding D.

### AD-2 — Use `-j` (dump-json), not `-g`

*Rationale:* Finding F. `-j` supplies the resolved `extension` metadata that makes the image filter correct rather than heuristic, and its typed entries let us select `Message.Url` (type 3) explicitly instead of pattern-matching text. It also sidesteps the `| ` fallback-prefix corruption of Finding B entirely, since that is a `UrlJob`-only behavior.

*Cost:* JSON parsing instead of line splitting — a few lines of code, and stdlib-only.

*Rejected alternative:* `-g`. Simpler-looking, but pushes complexity into a fragile text parser that must handle `| ` prefixes, pseudo-schemes, and extensionless URLs with no metadata to help.

> **Reviewer note:** AD-2 is the decision I am least certain about and the one most worth a second opinion. `-g` is the more literal reading of the North Star. My position is that `-j` is *simpler where it counts* — it moves the hard part from our fragile parser into gallery-dl's already-correct resolution — but if the product owner prefers maximal literal simplicity, `-g` plus `-o output.fallback=false` is a defensible Phase 0 with a known accuracy cost on extensionless CDN URLs.

### AD-3 — `discover.py` is the **only** module that knows gallery-dl exists

*Rationale:* this is the single most important structural boundary in the design. Every fact in §3 is a gallery-dl implementation detail. Quarantining them behind one function with a plain-Python return type means the other four pipeline stages are pure, trivially testable, and network-free — and that a future gallery-dl upgrade has exactly one place to break.

The seam signature:

```python
def discover(target: str, *, timeout: float) -> DiscoveryResult
```

returning a plain dataclass — never a subprocess object, never raw stdout.

### AD-4 — Never treat a non-zero exit as a whole-run failure

*Rationale:* Finding A. Per-target status is recorded and reported; partial success is a **normal, first-class outcome**, not an error state. FloppyDisk writes every link it successfully found even when some targets failed, and reports the failures separately.

### AD-5 — Validate targets before invocation; use `--`

*Rationale:* Finding D. Each target line must match `^https?://`; anything else is rejected as a target error without ever reaching a subprocess. Targets are passed after `--`. Defense in depth against both config injection and argv-flag confusion.

### AD-6 — Dependency-free runtime (stdlib only)

*Rationale:* gallery-dl is invoked as an **external CLI subprocess**, not imported as a library. FloppyDisk's own runtime needs only `subprocess`, `json`, `pathlib`, `argparse`, `dataclasses` — all stdlib. gallery-dl is a documented *external prerequisite*, not a pinned Python dependency.

*Why subprocess over importing `gallery_dl`:* the CLI surface (`-j`, exit codes) is gallery-dl's stable public contract; its internal Python API is not, and importing it would couple us to `job.py` internals that §3 shows are quite intricate. pytest is the only new dev dependency.

---

## 5. Proposed Structure

Deliberately small. Seven source files, each with one job.

```
floppydisk/
    __init__.py
    __main__.py       # python -m floppydisk
    cli.py            # argparse, orchestration, exit code, summary output
    targets.py        # read + validate targets.txt   -> list[str]
    discover.py       # THE SEAM. subprocess -> gallery-dl -j. Only gallery-dl-aware module.
    filters.py        # keep direct image URLs        (pure)
    dedupe.py         # order-preserving dedupe       (pure)
    writer.py         # atomic write of links.txt
tests/
    test_targets.py
    test_filters.py
    test_dedupe.py
    test_writer.py
    test_discover.py  # against captured gallery-dl fixtures — no network
    fixtures/         # real captured -j payloads
pyproject.toml        # console script + pytest config
README.md             # updated: prerequisites, usage
```

### 5.1 Data contracts

```python
@dataclass(frozen=True)
class DiscoveryResult:
    target: str
    urls: list[str]        # raw Message.Url entries, unfiltered
    exit_code: int
    ok: bool               # exit_code == 0
    error: str | None      # trimmed stderr when not ok
```

Pipeline types stay boring on purpose: `list[str]` in, `list[str]` out, for every stage after `discover`.

### 5.2 Control flow (`cli.py`)

```
read targets.txt
  -> validate each line (AD-5); collect rejects
  -> for each valid target:  discover()            [the only network step]
  -> flatten all urls
  -> filters.keep_images()
  -> dedupe.unique()
  -> writer.write_atomic(links.txt)
  -> print summary: N targets, M ok, F failed, K links written
```

### 5.3 Image filter (`filters.py`)

Applied in order:

1. Reject anything not starting with `http://` or `https://` — this drops `ytdl:`, `text:`, `generic:` (Finding C) in one check.
2. Accept if gallery-dl's `extension` metadata is in the image allowlist.
3. If metadata is absent, fall back to extension-from-path.

Image allowlist, taken from the image subset of gallery-dl's own `directlink` pattern:

```
jpg jpeg jpe png gif bmp svg webp avif heic psd
```

Deliberately **excluded** (present in gallery-dl's pattern but not images): `webm mp4 m4v mov mkv ogg ogm ogv wav mp3 opus zip rar 7z pdf swf`.

### 5.4 Dedup (`dedupe.py`)

Exact-string match, first occurrence wins, input order preserved.

**Explicitly NOT normalizing** query strings in Phase 0. Many CDNs use signed or parameterized URLs where the query is load-bearing — stripping it can both break the link and collapse two genuinely different images into one. Normalization is a Phase 1 conversation with real data behind it. Exact-match is the smallest *safe* choice.

### 5.5 Output (`writer.py`)

One URL per line, `\n`, UTF-8, trailing newline. Written to a temp file then atomically replaced, so an interrupted run cannot leave a half-written `links.txt`.

### 5.6 Exit codes (FloppyDisk's own, deliberately simple)

| Code | Meaning |
|---|---|
| 0 | all targets resolved; links written (including the legitimately-zero-links case) |
| 1 | usage / IO error (missing or unreadable `targets.txt`, unwritable output) |
| 2 | **partial success** — links written, but ≥1 target failed |

Note code 2 is *informational*, not a failure: `links.txt` is fully written. This is AD-4 made visible.

---

## 6. Test Strategy

Baseline is zero tests, so Phase 0 establishes the harness. **pytest must be installed — it currently is not.**

- **Pure modules** (`targets`, `filters`, `dedupe`, `writer`): straightforward unit tests, no mocking. This is the payoff of AD-3.
- **`discover.py`**: tested against **captured real gallery-dl `-j` payloads** committed as fixtures, with `subprocess.run` stubbed. **No test touches the network.**
- **Regression fixtures for every finding in §3** — this is the point of having done the investigation. At minimum: a `| `-prefixed line, a `ytdl:` URL, a `text:` payload, an extensionless CDN URL, an exit-64 unsupported target, and a mixed success/failure batch.
- **One opt-in live smoke test**, marked and skipped by default (`-m live`), against a stable direct-link URL.

---

## 7. Open Questions for the Product Owner

**Q1 — "Online" in the README.** The README says *"Online gallery-dl URL extractor"*, but the North Star describes a local file-in/file-out CLI. These read differently. I have designed a **local CLI** as the smallest safe Phase 0. If a hosted/web surface is actually intended, that is a materially different architecture and should be settled before Codex starts. *(Note: gallery-dl 1.32.4 does have a `--server` mode, which may be where "online" came from.)*

**Q2 — `-j` vs `-g` (AD-2).** The one decision I would most like a second opinion on. See the reviewer note in AD-2.

**Q3 — Should a failed target be fatal?** I chose no (AD-4): write every link found, report failures, exit 2. Confirm that partial success is acceptable rather than something that should halt the run.

**Q4 — Videos and archives.** `-j` will surface `mp4`, `webm`, `zip`, `pdf` from many galleries. Phase 0 filters them out as "not images". Confirm that is wanted, or whether a `--include-video` flag belongs in scope later.

**Q5 — File locations.** I assume `targets.txt` and `links.txt` live in the working directory, overridable by flag, with `links.txt` overwritten each run. Confirm overwrite (vs. append/merge) is the desired semantic.

**Q6 — Truncated briefing.** Per the notice in §0, my instructions were cut off. Please re-send anything after the North Star block.

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Exit-code bitmask misread as run failure (§3.1) | **High** | AD-4; explicit regression test |
| Fallback `\|` lines corrupt output (§3.2) | **High** | AD-2 avoids `UrlJob` entirely; defensive skip retained |
| Pseudo-scheme URLs reach `links.txt` (§3.3) | **High** | filter step 1 (§5.3) |
| Config injection via `targets.txt` (§3.4) | **Medium** | AD-5: own parser, scheme validation, `--` |
| Extensionless CDN URLs silently dropped | **Medium** | AD-2: use gallery-dl's resolved `extension` metadata |
| gallery-dl absent / not on PATH at runtime | **Medium** | preflight check in `cli.py`; clear actionable error |
| gallery-dl upgrade changes `-j` shape | **Medium** | AD-3 confines blast radius to one module; fixtures detect drift |
| A target hangs on network | **Medium** | per-invocation `timeout` in `discover()` (feasible only because of AD-1) |
| Windows path/encoding issues | **Low** | `pathlib`; explicit UTF-8 on all file I/O |

---

## 9. Recommended Implementation Order for Codex

1. `pyproject.toml` + package skeleton + pytest installed and green on an empty suite (establishes the harness that does not yet exist).
2. `targets.py` + tests (pure, no seam).
3. `filters.py`, `dedupe.py`, `writer.py` + tests (pure; the whole pipeline minus the seam, fully tested without network).
4. **Capture gallery-dl `-j` fixtures** into `tests/fixtures/`, covering every §3 finding.
5. `discover.py` against those fixtures (the seam, tested offline).
6. `cli.py` wiring + preflight check + summary output.
7. README update: prerequisites, usage, exit codes.

Steps 1–3 carry no seam risk and can proceed immediately on approval. **Step 4 is the gate** — it is where the §3 findings become executable tests, and it should not be skipped in the interest of speed.

---

*End of Phase 0 architecture report. No feature code was written in this pass. All gallery-dl behavior above was verified against version 1.32.4 as installed on this machine, by source reading and live probe.*
