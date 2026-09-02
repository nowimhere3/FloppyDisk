from pathlib import Path
import subprocess
from unittest.mock import Mock, patch

import pytest

from floppydisk.discover import DiscoveryRecord, discover_target


FIXTURES = Path(__file__).with_name("fixtures")


def fixture_text(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def completed(*, returncode: int = 0, stdout: str = "", stderr: str = "") -> Mock:
    return Mock(returncode=returncode, stdout=stdout, stderr=stderr)


@patch("floppydisk.discover.subprocess.run")
def test_invocation_is_safe_discovery_only_and_per_target(run: Mock) -> None:
    run.return_value = completed(stdout="[]")
    target = "https://example.com/gallery"

    result = discover_target(target, timeout=12.5)

    assert result.ok
    run.assert_called_once_with(
        ["gallery-dl", "-j", "--", target],
        capture_output=True,
        text=True,
        timeout=12.5,
        check=False,
        shell=False,
    )
    argv = run.call_args.args[0]
    assert "-j" in argv
    assert "--" in argv
    assert argv.index(target) > argv.index("--")
    assert "-i" not in argv
    assert not any(option in argv for option in ("-d", "--destination", "--download"))


@patch("floppydisk.discover.subprocess.run")
def test_each_discover_call_owns_one_invocation(run: Mock) -> None:
    run.return_value = completed(stdout="[]")

    discover_target("https://example.com/one", timeout=1)
    discover_target("https://example.com/two", timeout=1)

    assert run.call_count == 2
    assert run.call_args_list[0].args[0][-1] == "https://example.com/one"
    assert run.call_args_list[1].args[0][-1] == "https://example.com/two"


@patch("floppydisk.discover.subprocess.run")
def test_success_fixture_exposes_plain_url_and_extension_data(run: Mock) -> None:
    run.return_value = completed(stdout=fixture_text("success.json"))

    result = discover_target("https://example.com/gallery", timeout=10)

    assert result.ok
    assert result.status == "ok"
    assert result.returncode == 0
    assert result.records == (
        DiscoveryRecord(
            "https://cdn.example.com/photo.jpg?token=fixture",
            "jpg",
        ),
    )


@patch("floppydisk.discover.subprocess.run")
def test_structured_records_tolerate_metadata_empty_and_pseudo_urls(run: Mock) -> None:
    run.return_value = completed(stdout=fixture_text("mixed-url-records.json"))

    result = discover_target("https://example.com/gallery", timeout=10)

    assert result.records == (
        DiscoveryRecord("https://images.example/media/abc?format=jpg", "jpg"),
        DiscoveryRecord("https://images.example/extensionless", ""),
        DiscoveryRecord("ytdl:https://video.example/watch/1", "mp4"),
        DiscoveryRecord("text:caption payload", None),
    )


@pytest.mark.parametrize(
    ("returncode", "expected_status", "fixture"),
    [
        (64, "unsupported", "unsupported-stderr.txt"),
        (4, "extraction-error", "extraction-error-stderr.txt"),
        (8, "invocation-error", "extraction-error-stderr.txt"),
    ],
)
@patch("floppydisk.discover.subprocess.run")
def test_target_failures_are_contained_and_stderr_captured(
    run: Mock,
    returncode: int,
    expected_status: str,
    fixture: str,
    capsys: pytest.CaptureFixture[str],
) -> None:
    stderr = fixture_text(fixture)
    run.return_value = completed(returncode=returncode, stderr=stderr)

    result = discover_target("https://example.com/failing", timeout=10)

    assert not result.ok
    assert result.status == expected_status
    assert result.records == ()
    assert result.stderr == stderr
    assert result.returncode == returncode
    assert capsys.readouterr() == ("", "")


@patch("floppydisk.discover.subprocess.run")
def test_timeout_is_contained_without_printing_stderr(
    run: Mock, capsys: pytest.CaptureFixture[str]
) -> None:
    run.side_effect = subprocess.TimeoutExpired(
        cmd=["gallery-dl"], timeout=3, stderr=b"private failure URL"
    )

    result = discover_target("https://example.com/slow", timeout=3)

    assert not result.ok
    assert result.status == "timeout"
    assert result.returncode is None
    assert result.stderr == "private failure URL"
    assert capsys.readouterr() == ("", "")


@patch("floppydisk.discover.subprocess.run")
def test_malformed_json_is_contained(run: Mock) -> None:
    run.return_value = completed(stdout=fixture_text("malformed.json"), stderr="captured")

    result = discover_target("https://example.com/gallery", timeout=10)

    assert not result.ok
    assert result.status == "bad-json"
    assert result.records == ()
    assert result.stderr == "captured"


@patch("floppydisk.discover.subprocess.run")
def test_empty_stdout_is_a_valid_zero_record_result(run: Mock) -> None:
    run.return_value = completed(stdout=fixture_text("empty.txt"))

    result = discover_target("https://example.com/gallery", timeout=10)

    assert result.ok
    assert result.records == ()
    assert result.returncode == 0


@patch("floppydisk.discover.subprocess.run")
def test_non_url_gallery_records_are_ignored(run: Mock) -> None:
    run.return_value = completed(stdout='[[1, "version"], [2, {"extension": "jpg"}]]')

    result = discover_target("https://example.com/gallery", timeout=10)

    assert result.ok
    assert result.records == ()


@patch("floppydisk.discover.subprocess.run")
def test_invalid_message_url_shape_is_bad_json_result(run: Mock) -> None:
    run.return_value = completed(stdout='[[3, 123, {"extension": "jpg"}]]')

    result = discover_target("https://example.com/gallery", timeout=10)

    assert result.status == "bad-json"
    assert result.records == ()


@patch("floppydisk.discover.subprocess.run")
def test_missing_executable_remains_a_fatal_preflight_class(run: Mock) -> None:
    run.side_effect = FileNotFoundError("gallery-dl")

    with pytest.raises(FileNotFoundError):
        discover_target("https://example.com/gallery", timeout=10)
