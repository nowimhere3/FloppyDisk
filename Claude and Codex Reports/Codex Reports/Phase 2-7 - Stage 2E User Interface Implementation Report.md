# Stage

Phase 2-7 — Stage 2E User Interface

Report timestamp: Thursday, September 3, 2026 at 12:07:41 AM MDT (Calgary)

# Starting State

Stage 2D was approved, pushed, and frozen. Work began on `main` at `b4c85e7e88c0117887de13c4785f819895f9d343`, matching `origin/main`. Existing Human Phase 1 report-folder moves and `Claude and Codex Reports/Git Commit - Push Rule.md` were preserved and excluded from all Stage 2E commits.

# Stage 2D Hosted Acceptance

The verified anonymous hosted flow used no development key. GitHub Actions run `33720856531` at head `b4c85e7e88c0117887de13c4785f819895f9d343` completed successfully. Status progressed from queued to in progress to completed/success. `GET /result` returned HTTP 200 with `text/plain; charset=utf-8` and the expected Wikimedia link. Submitted-target materialization, the frozen pipeline, and artifact upload succeeded; artifact count was zero after retrieval. Exact-origin CORS admitted `https://nowimhere3.github.io`.

This acceptance was recorded in the Phase 2-6 report in documentation-only commit `653d306a2a0bfe99f13e1053b01c35e2ecdfca01`. Stage 2D remains PASS / APPROVED / FROZEN.

# Files Changed

- `docs/index.html` — semantic one-screen application shell.
- `docs/app.js` — backend integration, file handling, polling, resume, and download behavior.
- `docs/state.js` — explicit five-state reducer.
- `docs/style.css` — responsive phosphor-green presentation and accessibility states.
- `docs/floppy.svg` — small decorative floppy mark.
- `docs/package.json` — dependency-free frontend test command.
- `docs/test/frontend.test.mjs` — focused static and behavioral tests.

No bridge, workflow, or frozen Python file changed.

# Five-State UX

One reducer owns `empty`, `ready`, `working`, `success`, and `error`. Selecting a valid file enters ready state, but submission begins only after the explicit **Find Image Links** action. Working state is indeterminate. Success offers **Download links.txt** and **Start another**. Errors remain on the same screen with one clear reset action.

# Visual Direction

The interface is a single focused panel using the approved `#03140a`, `#0a5c22`, `#00b52a`, and `#00ff00` palette. The brightest phosphor green is reserved for the primary action and activity signal. Typography, spacing, and the floppy mark add restrained retro character without exposing implementation concepts.

# File Picker

A real `.txt` file input remains the primary path and is activated by a visible button. Validation reads file contents rather than trusting MIME metadata. Blank and comment lines are ignored for the local count; no usable HTTP(S)-looking line and more than 50 usable lines receive early friendly feedback. The Worker remains authoritative.

# Drag and Drop

Desktop drag-and-drop feeds the same file-reading path and visibly highlights the drop surface. It supplements rather than replaces the file picker.

# Mobile

The layout narrows without horizontal viewport units, primary controls become full width, control text remains at least 16px, and tap controls have a minimum 48px height. The picker path requires no drag interaction. Result download uses the browser's native Blob download behavior.

# Session Resume

Only the active `jobToken`, `expiresAt`, and `startedAt` are stored in per-tab `sessionStorage`. An unexpired job resumes status polling on load. Missing, malformed, expired, or terminal continuation state is removed. Targets, results, histories, and profiles are not persisted.

# Backend Integration

The frontend posts `{ "targets": "<raw text>" }` to the fixed Worker `/run` endpoint. It sends neither a development key nor a run ID. The returned capability is used only as Bearer authorization for fixed `/status` and `/result` requests, never in URLs, visible UI, console output, or `localStorage`. POST submission is never automatically retried.

Status polling runs no faster than five seconds. A transient status-network failure backs off to ten seconds. Lifecycle states remain queued or indeterminate working; no numeric progress is invented.

# Result Byte Purity

The result response is accepted directly as a Blob and downloaded as `links.txt`. The frontend does not decode, split, trim, sort, filter, deduplicate, normalize, or rebuild the result.

# Error UX

Safe Worker messages are presented when available. Generic upstream failure text, malformed responses, and network failures become concise recovery copy. Workflow failure and expiry have distinct user-facing explanations. No status-code, GitHub, workflow-run, artifact, capability, token, or repository vocabulary appears in visible UI.

# Accessibility

The page uses semantic headings and real buttons, exposes a polite live status region, has visible keyboard focus, keeps decorative artwork out of accessible naming, uses text in addition to color, provides large targets and readable type, and disables meaningful animation under `prefers-reduced-motion`.

# Breadcrumbs

Concise WAS / IS / WILL BE breadcrumbs protect the architecture-critical decisions for state ownership, signed-capability authorization, byte-pure downloads, honest indeterminate progress, and minimal per-tab session resume.

# Automated Tests

- Frontend/static suite: **10 passed** (`npm.cmd test` in `docs`).
- Complete bridge suite: **55 passed**.
- Full Python/workflow regression: **99 passed**.
- `npm audit --audit-level=high`: **0 vulnerabilities**.
- Wrangler deployment dry run: bundle completed successfully (28.21 KiB raw / 8.74 KiB gzip); no deployment occurred. Wrangler could not write its optional user-profile debug log inside the restricted environment, but returned exit code 0 after completing the dry run.
- `git diff --check`: clean for Stage 2E work.
- Static inspection confirmed relative assets, no analytics or external runtime dependency, no embedded credential signature/value, no development-key header, no raw run-ID contract, and no result-byte rewriting.

# Frozen Boundary

No file under `floppydisk/`, no Phase 0 test/fixture, no bridge file, and no workflow file changed. The repository visibility was not changed. Human report-folder housekeeping and the untracked push-rule file remain untouched and outside the commits.

# Implementation Commit

`5019802499fdf0745c405816ba73715c0d502f56` — `feat: add Stage 2E user interface`

# Pages Readiness

The dependency-free site is ready to serve from `main` / `/docs` at the repository Pages path. Assets use relative URLs and the frontend is compatible with `https://nowimhere3.github.io/FloppyDisk/`. No Pages setting, deployment, repository visibility, or alternate host was changed. If the private repository's GitHub plan cannot publish Pages, hosting remains a Human product decision.

After final hosted verification, the now-unused development secret may optionally be removed by the Human with:

```powershell
cd C:\Users\dmcal\Documents\GitHub\FloppyDisk\bridge
.\node_modules\.bin\wrangler.cmd secret delete FLOPPYDISK_DEV_KEY
```

`GITHUB_TOKEN` and `FLOPPYDISK_CAPABILITY_SECRET` must remain untouched.

# Human Tests Remaining

Only after the Pages build exists:

1. Mobile file picker: choose a real `.txt`, run, and download `links.txt`.
2. Desktop drag and drop: drop a real `.txt` from the operating system.
3. Dad test: an unbriefed person reaches a downloaded `links.txt`.

# Hosted Acceptance Status

Not run. Per the Stage 2E boundary, Codex did not push, enable Pages, change visibility, or perform hosted UI tests.

# READY FOR HUMAN PUSH / PAGES ENABLE

**YES.** Push the three Stage 2E commits, then enable GitHub Pages from `main` / `/docs`. After the Pages build exists, perform only the three Human tests above.
