# Stage B fixture provenance

Capture version: `gallery-dl 1.32.10`

`success.json` was captured verbatim on September 2, 2026 with:

```text
gallery-dl -j -- https://cdn.example.com/photo.jpg?token=fixture
```

The `directlink` extractor produces this metadata without fetching the example
host, so capture required no live-website dependency or media download.

`mixed-url-records.json` is a static schema fixture derived from the captured
1.32.10 Message.Url shape. It deliberately represents extractor-supplied,
empty, `ytdl:`, and `text:` values that cannot all originate from one extractor.

`datajob-error.json` records the real gallery-dl 1.32.10 DataJob error shape
verified offline in the Phase 1-9 independent review: DataJob emitted a type
`-1` record for a forced `HttpError` and returned exit 0. `mixed-error-url.json`
combines that verified error shape with a compatible Message.Url record to
freeze partial-result precedence.

`queue-records.json` is synthetic schema material, clearly labeled here rather
than presented as a live capture. Its records are structurally compatible with
gallery-dl 1.32.10 Message.Queue (`[6, url, metadata]`) and allow plain `-j`'s
unresolved queue activity to be tested without resolving or contacting targets.

The remaining `.txt` files preserve representative stdout/stderr conditions
used with mocked subprocess results. `unsupported-stderr.txt` was captured from
1.32.10 using an unsupported target.

Pinned 1.32.10 observation: a direct URL ending in `photo%2Ejpg` is unsupported
by the `directlink` extractor (exit 64), so it supplies no usable extension
metadata for that encoded-path case.
