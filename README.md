# FloppyDisk

FloppyDisk runs `gallery-dl` as an isolated discovery process and converts target
URLs into a pure `links.txt` containing qualifying direct image URLs. Detailed
run evidence is kept separately in `diagnostics.txt`.

## GitHub Actions Phase 0 run

The **Extract image links** workflow is started manually with
`workflow_dispatch`. It runs on a GitHub-hosted Ubuntu runner with Python 3.12
and the exact verified `gallery-dl==1.32.10` dependency. The user's desktop does
not need to remain online after the branch is pushed.

To run it in GitHub, open **Actions**, select **Extract image links**, choose
**Run workflow**, select the `Phase-0` branch, and confirm **Run workflow**.
When it finishes, download the `floppydisk-results` artifact containing:

- `links.txt` — qualifying image URLs only, one per line.
- `diagnostics.txt` — counts and target-level evidence.

Edit `targets.txt` to change the small public target set. Blank lines and lines
beginning with `#` are ignored; accepted targets must use HTTP or HTTPS.

## Local equivalent

With Python 3.12 and `gallery-dl==1.32.10` available:

```text
python -m floppydisk --targets targets.txt --out links.txt --diagnostics diagnostics.txt
```

This Phase 0 integration performs discovery only; it does not download media.
Third-party dependency licensing remains separate from this repository.
