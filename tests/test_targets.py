from floppydisk.cli import RejectedTarget, Target, parse_targets


def test_blank_whitespace_and_comment_lines_are_skipped() -> None:
    result = parse_targets(["", "   \t", "  # disabled target", "https://example.com"])

    assert result.accepted == (Target(4, "https://example.com"),)
    assert result.rejected == ()


def test_surrounding_whitespace_is_stripped_and_http_schemes_are_accepted() -> None:
    result = parse_targets(
        ["  http://example.com/a  ", "https://example.com/b", "HTTP://example.com/c"]
    )

    assert result.accepted == (
        Target(1, "http://example.com/a"),
        Target(2, "https://example.com/b"),
        Target(3, "HTTP://example.com/c"),
    )
    assert result.rejected == ()


def test_invalid_and_cli_like_targets_are_rejected_with_source_lines() -> None:
    result = parse_targets(
        [
            "https://valid.example/a",
            "ftp://example.com/file",
            "file:///tmp/image.jpg",
            "example.com",
            "arbitrary text",
            "--version",
            "-o output.fallback=false",
        ]
    )

    assert result.accepted == (Target(1, "https://valid.example/a"),)
    assert result.rejected == (
        RejectedTarget(2, "ftp://example.com/file"),
        RejectedTarget(3, "file:///tmp/image.jpg"),
        RejectedTarget(4, "example.com"),
        RejectedTarget(5, "arbitrary text"),
        RejectedTarget(6, "--version"),
        RejectedTarget(7, "-o output.fallback=false"),
    )
