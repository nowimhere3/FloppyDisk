import ast
from pathlib import Path

import pytest

from floppydisk.filters import (
    IMAGE_EXTENSIONS,
    deduplicate_urls,
    filter_image_urls,
    is_image_url,
)


@pytest.mark.parametrize("extension", ["jpg", "jpeg", "png", "gif", "webp", "avif"])
def test_each_allowed_extension_is_accepted(extension: str) -> None:
    assert is_image_url(f"https://example.com/image.{extension}")


@pytest.mark.parametrize(
    "extension",
    [
        "jpe",
        "bmp",
        "svg",
        "heic",
        "psd",
        "webm",
        "mp4",
        "m4v",
        "mov",
        "mkv",
        "ogg",
        "ogm",
        "ogv",
        "wav",
        "mp3",
        "opus",
        "zip",
        "rar",
        "7z",
        "pdf",
        "swf",
    ],
)
def test_non_product_formats_are_rejected(extension: str) -> None:
    assert not is_image_url(f"https://example.com/file.{extension}")


def test_webp_is_accepted_while_webm_is_rejected() -> None:
    assert is_image_url("https://example.com/image.webp")
    assert not is_image_url("https://example.com/video.webm")


@pytest.mark.parametrize("url", ["https://example.com/PHOTO.JPG", "https://example.com/a.PNG"])
def test_path_extension_matching_is_case_insensitive(url: str) -> None:
    assert is_image_url(url)


def test_query_string_is_ignored_for_detection_but_preserved_in_output() -> None:
    url = "https://cdn.example.com/photo.jpg?token=abc123"

    assert filter_image_urls([(url, None)]) == [url]


def test_metadata_can_qualify_an_extensionless_path() -> None:
    url = "https://i.example.com/media/abc?format=jpg&name=large"

    assert filter_image_urls([(url, "JPG")]) == [url]
    assert filter_image_urls([(url, "")]) == []
    assert filter_image_urls([(url, None)]) == []


def test_nonempty_metadata_extension_takes_precedence_over_path() -> None:
    assert not is_image_url("https://example.com/image.jpg", "webm")
    assert is_image_url("https://example.com/video.webm", "png")


@pytest.mark.parametrize(
    "url",
    [
        "ytdl:https://example.com/image.jpg",
        "text:https://example.com/image.jpg",
        "generic:https://example.com/image.jpg",
    ],
)
def test_pseudo_schemes_are_rejected(url: str) -> None:
    assert not is_image_url(url, "jpg")


def test_text_pseudo_scheme_with_newline_is_rejected() -> None:
    payload = "text:caption\nhttps://attacker.example/injected.jpg"

    assert filter_image_urls([(payload, "jpg")]) == []


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/harmless\nhttps://attacker.example/injected.jpg",
        "https://example.com/a\rb.jpg",
        "https://example.com/a\tb.jpg",
    ],
    ids=["newline", "carriage-return", "tab"],
)
def test_http_urls_with_control_characters_are_rejected(url: str) -> None:
    assert filter_image_urls([(url, None)]) == []


def test_one_six_member_allowlist_constant_governs_filtering() -> None:
    source_path = Path(__file__).parents[1] / "floppydisk" / "filters.py"
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    allowlist_assignments = [
        node
        for node in tree.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "IMAGE_EXTENSIONS"
            for target in node.targets
        )
    ]

    assert len(allowlist_assignments) == 1
    assert IMAGE_EXTENSIONS == frozenset({"jpg", "jpeg", "png", "gif", "webp", "avif"})
    assert "IMAGE_EXTENSIONS" in ast.unparse(tree)


def test_exact_duplicates_are_removed_in_first_seen_order() -> None:
    assert deduplicate_urls(["b", "a", "b", "c", "a"]) == ["b", "a", "c"]


def test_query_different_and_case_different_urls_remain_distinct() -> None:
    urls = [
        "https://example.com/image.jpg?token=A",
        "https://example.com/image.jpg?token=B",
        "https://EXAMPLE.com/image.jpg?token=A",
    ]

    assert deduplicate_urls(urls) == urls
