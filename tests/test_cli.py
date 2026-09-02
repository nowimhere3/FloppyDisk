from pathlib import Path
import subprocess
import sys
from unittest.mock import Mock, patch

import pytest

from floppydisk.cli import main, run_pipeline
from floppydisk.discover import DiscoveryError, DiscoveryRecord, DiscoveryResult


def result(
    status: str = "ok",
    records: tuple[DiscoveryRecord, ...] = (),
    *,
    errors: tuple[DiscoveryError, ...] = (),
    queued: int = 0,
    stderr: str = "",
) -> DiscoveryResult:
    return DiscoveryResult(
        status, records, stderr, 0, errors=errors, queued=queued  # type: ignore[arg-type]
    )


def write_targets(tmp_path: Path, content: str) -> Path:
    path = tmp_path / "targets-input.txt"
    path.write_text(content, encoding="utf-8", newline="\n")
    return path


def paths(tmp_path: Path) -> tuple[Path, Path]:
    return tmp_path / "links-output.txt", tmp_path / "diagnostics-output.txt"


@patch("floppydisk.cli.discover_target")
def test_parsing_line_numbers_and_invalid_targets_feed_discovery_once(
    discover: Mock, tmp_path: Path
) -> None:
    targets = write_targets(
        tmp_path,
        "\n# comment\nhttps://one.example/gallery\n--version\n  https://two.example/gallery  \n",
    )
    output, diagnostics = paths(tmp_path)
    discover.side_effect = [result(), result()]

    counts = run_pipeline(targets, output, diagnostics, timeout=7.5)

    assert discover.call_args_list == [
        (("https://one.example/gallery",), {"timeout": 7.5}),
        (("https://two.example/gallery",), {"timeout": 7.5}),
    ]
    assert counts.accepted_targets == 2
    assert counts.invalid_targets == 1
    text = diagnostics.read_text(encoding="utf-8")
    assert "line 4: status=invalid" in text
    assert "line 3: status=ok" in text
    assert "line 5: status=ok" in text


@patch("floppydisk.cli.discover_target")
def test_failures_are_contained_and_links_before_and_after_survive(
    discover: Mock, tmp_path: Path
) -> None:
    targets = write_targets(
        tmp_path,
        "https://one.example\nhttps://bad.example\nhttps://three.example\n",
    )
    output, diagnostics = paths(tmp_path)
    discover.side_effect = [
        result(records=(DiscoveryRecord("https://cdn.example/one.jpg", "jpg"),)),
        result("unsupported", stderr="upstream mentioned https://bad.example"),
        result(records=(DiscoveryRecord("https://cdn.example/three.png", "png"),)),
    ]

    counts = run_pipeline(targets, output, diagnostics)

    assert counts.unique_links == 2
    assert output.read_text(encoding="utf-8") == (
        "https://cdn.example/one.jpg\nhttps://cdn.example/three.png\n"
    )
    text = diagnostics.read_text(encoding="utf-8")
    assert "line 2: status=unsupported" in text
    assert "upstream mentioned https://bad.example" in text
    assert discover.call_count == 3


@patch("floppydisk.cli.discover_target")
def test_partial_extraction_error_preserves_link_and_failure_details(
    discover: Mock, tmp_path: Path
) -> None:
    targets = write_targets(tmp_path, "https://partial.example\n")
    output, diagnostics = paths(tmp_path)
    discover.return_value = result(
        "extraction-error",
        (DiscoveryRecord("https://cdn.example/recovered.jpg?token=A", "jpg"),),
        errors=(DiscoveryError("HttpError", "404 Not Found"),),
    )

    run_pipeline(targets, output, diagnostics)

    assert output.read_text(encoding="utf-8") == (
        "https://cdn.example/recovered.jpg?token=A\n"
    )
    text = diagnostics.read_text(encoding="utf-8")
    assert "line 1: status=extraction-error links=1" in text
    assert "error: HttpError: 404 Not Found" in text


@patch("floppydisk.cli.discover_target")
def test_queue_only_is_distinct_from_genuinely_empty(
    discover: Mock, tmp_path: Path
) -> None:
    targets = write_targets(tmp_path, "https://queue.example\nhttps://empty.example\n")
    output, diagnostics = paths(tmp_path)
    discover.side_effect = [result(queued=5), result()]

    counts = run_pipeline(targets, output, diagnostics)

    assert counts.queued == 5
    assert output.read_bytes() == b""
    text = diagnostics.read_text(encoding="utf-8")
    assert "line 1: status=ok links=0 excluded=0 queued=5 unresolved" in text
    assert "line 2: status=ok links=0 excluded=0 empty" in text


@pytest.mark.parametrize(
    "status", ["unsupported", "timeout", "bad-json", "invocation-error"]
)
@patch("floppydisk.cli.discover_target")
def test_each_routine_failure_status_is_contained(
    discover: Mock, status: str, tmp_path: Path
) -> None:
    targets = write_targets(tmp_path, "https://failure.example\nhttps://later.example\n")
    output, diagnostics = paths(tmp_path)
    discover.side_effect = [
        result(status),
        result(records=(DiscoveryRecord("https://cdn.example/later.jpg", "jpg"),)),
    ]

    run_pipeline(targets, output, diagnostics)

    assert output.read_text(encoding="utf-8") == "https://cdn.example/later.jpg\n"
    assert f"line 1: status={status}" in diagnostics.read_text(encoding="utf-8")
    assert discover.call_count == 2


@patch("floppydisk.cli.discover_target")
def test_real_filters_and_dedupe_preserve_exact_first_seen_urls(
    discover: Mock, tmp_path: Path
) -> None:
    targets = write_targets(tmp_path, "https://one.example\nhttps://two.example\n")
    output, diagnostics = paths(tmp_path)
    first = "https://cdn.example/image.jpg?token=A"
    second = "https://cdn.example/image.jpg?token=B"
    discover.side_effect = [
        result(
            records=(
                DiscoveryRecord(first, "jpg"),
                DiscoveryRecord("ytdl:https://video.example/a", "jpg"),
                DiscoveryRecord("https://cdn.example/video.webm", "webm"),
            )
        ),
        result(
            records=(
                DiscoveryRecord(first, "jpg"),
                DiscoveryRecord(second, "JPG"),
            )
        ),
    ]

    counts = run_pipeline(targets, output, diagnostics)

    assert output.read_text(encoding="utf-8") == f"{first}\n{second}\n"
    assert counts.excluded_records == 2
    assert counts.duplicates_removed == 1
    text = diagnostics.read_text(encoding="utf-8")
    assert "duplicates removed: 1" in text
    assert "excluded records: 2" in text


@patch("floppydisk.cli.discover_target")
def test_links_file_is_utf8_lf_terminated_and_diagnostics_are_separate(
    discover: Mock, tmp_path: Path
) -> None:
    targets = write_targets(tmp_path, "https://target.example\n")
    output, diagnostics = paths(tmp_path)
    url = "https://cdn.example/caf%C3%A9.jpg"
    discover.return_value = result(
        records=(DiscoveryRecord(url, "jpg"),), stderr="private upstream evidence"
    )

    run_pipeline(targets, output, diagnostics)

    assert output.read_bytes() == (url + "\n").encode("utf-8")
    assert b"\r\n" not in output.read_bytes()
    assert "diagnostics" not in output.read_text(encoding="utf-8")
    assert "private upstream evidence" in diagnostics.read_text(encoding="utf-8")


@patch("floppydisk.cli.discover_target")
def test_empty_result_creates_zero_byte_links_file(discover: Mock, tmp_path: Path) -> None:
    targets = write_targets(tmp_path, "https://empty.example\n")
    output, diagnostics = paths(tmp_path)
    discover.return_value = result()

    run_pipeline(targets, output, diagnostics)

    assert output.read_bytes() == b""


@patch("floppydisk.cli.discover_target")
def test_links_file_is_atomically_replaced(discover: Mock, tmp_path: Path) -> None:
    targets = write_targets(tmp_path, "https://target.example\n")
    output, diagnostics = paths(tmp_path)
    output.write_text("old content", encoding="utf-8")
    discover.return_value = result(
        records=(DiscoveryRecord("https://cdn.example/new.jpg", "jpg"),)
    )

    with patch("floppydisk.cli.os.replace", wraps=__import__("os").replace) as replace:
        run_pipeline(targets, output, diagnostics)

    assert output.read_text(encoding="utf-8") == "https://cdn.example/new.jpg\n"
    output_call = next(call for call in replace.call_args_list if call.args[1] == output)
    assert Path(output_call.args[0]).parent == output.parent
    assert list(tmp_path.glob(f".{output.name}.*")) == []


@patch("floppydisk.cli.discover_target")
def test_main_success_is_quiet_about_urls_and_upstream_stderr(
    discover: Mock, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    target_url = "https://private.example/gallery"
    media_url = "https://private-cdn.example/image.jpg"
    upstream = f"failure for {target_url}"
    targets = write_targets(tmp_path, target_url + "\n")
    output, diagnostics = paths(tmp_path)
    discover.return_value = result(
        records=(DiscoveryRecord(media_url, "jpg"),), stderr=upstream
    )

    code = main(
        ["--targets", str(targets), "--out", str(output), "--diagnostics", str(diagnostics)],
        environ={},
    )

    captured = capsys.readouterr()
    assert code == 0
    assert target_url not in captured.out + captured.err
    assert media_url not in captured.out + captured.err
    assert upstream not in captured.out + captured.err
    assert upstream in diagnostics.read_text(encoding="utf-8")


@patch("floppydisk.cli.discover_target")
def test_step_summary_is_optional_and_counts_only(
    discover: Mock, tmp_path: Path
) -> None:
    private_target = "https://private.example/gallery"
    private_media = "https://private-cdn.example/image.jpg"
    targets = write_targets(tmp_path, private_target + "\n")
    output, diagnostics = paths(tmp_path)
    summary = tmp_path / "summary.md"
    discover.return_value = result(
        records=(DiscoveryRecord(private_media, "jpg"),), queued=2
    )

    assert main(
        ["--targets", str(targets), "--out", str(output), "--diagnostics", str(diagnostics)],
        environ={},
    ) == 0
    assert not summary.exists()

    assert main(
        ["--targets", str(targets), "--out", str(output), "--diagnostics", str(diagnostics)],
        environ={"GITHUB_STEP_SUMMARY": str(summary)},
    ) == 0
    text = summary.read_text(encoding="utf-8")
    assert "Unique links: 1" in text
    assert "Queued unresolved: 2" in text
    assert private_target not in text
    assert private_media not in text


@pytest.mark.parametrize("status", ["unsupported", "extraction-error", "timeout"])
@patch("floppydisk.cli.discover_target")
def test_main_partial_or_zero_link_outcomes_exit_zero(
    discover: Mock, status: str, tmp_path: Path
) -> None:
    targets = write_targets(tmp_path, "https://evidence.example\n")
    output, diagnostics = paths(tmp_path)
    discover.return_value = result(status)

    assert main(
        ["--targets", str(targets), "--out", str(output), "--diagnostics", str(diagnostics)],
        environ={},
    ) == 0


@patch("floppydisk.cli.discover_target")
def test_main_queue_only_evidence_exits_zero(discover: Mock, tmp_path: Path) -> None:
    targets = write_targets(tmp_path, "https://queue.example\n")
    output, diagnostics = paths(tmp_path)
    discover.return_value = result(queued=3)

    assert main(
        ["--targets", str(targets), "--out", str(output), "--diagnostics", str(diagnostics)],
        environ={},
    ) == 0
    assert "queued=3 unresolved" in diagnostics.read_text(encoding="utf-8")


def test_main_unreadable_targets_file_exits_one(tmp_path: Path) -> None:
    output, diagnostics = paths(tmp_path)

    assert main(
        [
            "--targets", str(tmp_path / "missing.txt"),
            "--out", str(output),
            "--diagnostics", str(diagnostics),
        ],
        environ={},
    ) == 1


@patch("floppydisk.cli.discover_target")
def test_main_output_failure_exits_one(discover: Mock, tmp_path: Path) -> None:
    targets = write_targets(tmp_path, "https://target.example\n")
    discover.return_value = result()

    assert main(
        [
            "--targets", str(targets),
            "--out", str(tmp_path / "missing" / "links.txt"),
            "--diagnostics", str(tmp_path / "diagnostics.txt"),
        ],
        environ={},
    ) == 1


@pytest.mark.parametrize(
    "collision",
    ["out-diagnostics", "targets-out", "targets-diagnostics"],
)
@patch("floppydisk.cli.discover_target")
def test_main_rejects_path_collisions_without_discovery_or_input_damage(
    discover: Mock, collision: str, tmp_path: Path
) -> None:
    targets = write_targets(tmp_path, "https://private.example/gallery\n")
    original_targets = targets.read_bytes()
    output, diagnostics = paths(tmp_path)

    if collision == "out-diagnostics":
        output = diagnostics
    elif collision == "targets-out":
        output = targets
    else:
        diagnostics = targets

    code = main(
        ["--targets", str(targets), "--out", str(output), "--diagnostics", str(diagnostics)],
        environ={},
    )

    assert code == 1
    discover.assert_not_called()
    assert targets.read_bytes() == original_targets
    for candidate in {output, diagnostics} - {targets}:
        assert not candidate.exists()


@patch("floppydisk.cli.discover_target", side_effect=FileNotFoundError("gallery-dl"))
def test_main_missing_gallery_dl_is_fatal_without_url_leak(
    discover: Mock, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    private_target = "https://private.example/gallery"
    targets = write_targets(tmp_path, private_target + "\n")
    output, diagnostics = paths(tmp_path)

    code = main(
        ["--targets", str(targets), "--out", str(output), "--diagnostics", str(diagnostics)],
        environ={},
    )

    captured = capsys.readouterr()
    assert code == 1
    assert private_target not in captured.out + captured.err
    assert "gallery-dl executable not found" in captured.out


def test_python_module_entry_point_invokes_cli_help_without_stage_d_behavior() -> None:
    completed = subprocess.run(
        [sys.executable, "-m", "floppydisk", "--help"],
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 0
    assert "--targets" in completed.stdout
    assert "--out" in completed.stdout
    assert "--diagnostics" in completed.stdout
