from pathlib import Path
import re


ROOT = Path(__file__).parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "extract-links.yml"
TARGETS = ROOT / "targets.txt"


def workflow_text() -> str:
    return WORKFLOW.read_text(encoding="utf-8")


def test_workflow_has_manual_trigger_only():
    text = workflow_text()

    assert re.search(r"(?m)^on:\s*$", text)
    assert re.search(r"(?m)^  workflow_dispatch:\s*$", text)
    assert not re.search(r"(?m)^  (push|pull_request|schedule):", text)


def test_workflow_uses_approved_hosted_runtime():
    text = workflow_text()

    assert "runs-on: ubuntu-latest" in text
    assert "timeout-minutes: 30" in text
    assert "uses: actions/checkout@v4" in text
    assert "uses: actions/setup-python@v5" in text
    assert 'python-version: "3.12"' in text
    assert re.search(r"(?m)^permissions:\s*\n  contents: read\s*$", text)


def test_workflow_installs_exact_gallery_dl_pin():
    text = workflow_text()

    assert "python -m pip install gallery-dl==1.32.10" in text
    assert "gallery-dl --version" in text
    assert "gallery-dl>=" not in text


def test_workflow_invokes_frozen_cli_with_distinct_paths():
    text = workflow_text()

    assert "python -m floppydisk" in text
    assert "--targets targets.txt" in text
    assert "--out links.txt" in text
    assert "--diagnostics diagnostics.txt" in text
    assert len({"targets.txt", "links.txt", "diagnostics.txt"}) == 3


def test_workflow_does_not_reimplement_product_logic():
    text = workflow_text()

    assert "gallery-dl -j" not in text
    assert "gallery-dl -g" not in text
    assert "grep " not in text
    assert "sort " not in text
    assert "uniq " not in text
    assert "cat targets.txt" not in text
    assert "cat links.txt" not in text
    assert "cat diagnostics.txt" not in text


def test_artifact_upload_is_modern_and_evidence_preserving():
    text = workflow_text()

    assert "if: always()" in text
    assert "uses: actions/upload-artifact@v4" in text
    assert "name: floppydisk-results" in text
    assert re.search(r"(?m)^            links\.txt$", text)
    assert re.search(r"(?m)^            diagnostics\.txt$", text)


def test_starter_targets_are_small_public_and_parseable():
    from floppydisk.cli import parse_targets

    parsed = parse_targets(TARGETS.read_text(encoding="utf-8").splitlines())

    assert len(parsed.accepted) == 3
    assert parsed.rejected == ()
    assert all(target.url.startswith("https://") for target in parsed.accepted)


def test_workflow_contains_no_secret_or_credential_configuration():
    text = workflow_text().lower()

    assert "secrets." not in text
    assert "cookie" not in text
    assert "token:" not in text
    assert "proxy" not in text
