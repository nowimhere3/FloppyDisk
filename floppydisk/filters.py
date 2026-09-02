"""Pure filtering and deduplication contracts for discovered URLs."""

from collections.abc import Iterable
from pathlib import PurePosixPath
from urllib.parse import urlsplit


# BREADCRUMBS - IS
#
# These six formats are a deliberate product-owner contract, not a technical
# default. Exactly one allowlist governs metadata and URL-path detection so the
# two paths cannot drift. Unknown extensions are excluded rather than guessed;
# webm is video and must never slip in beside webp.
#
# BREADCRUMBS - WILL BE
#
# Broadening this contract requires explicit product authorization. A future
# stage may resolve unknown extensions through a separate evidence-backed
# mechanism, without changing what this allowlist means.
IMAGE_EXTENSIONS = frozenset({"jpg", "jpeg", "png", "gif", "webp", "avif"})


def _http_url_path(url: str) -> str | None:
    parsed = urlsplit(url)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
        return None
    return parsed.path


def _resolved_extension(url: str, extension: str | None) -> str | None:
    path = _http_url_path(url)
    if path is None:
        return None

    if extension is not None and extension.strip():
        return extension.strip().removeprefix(".").lower()

    suffix = PurePosixPath(path).suffix
    return suffix[1:].lower() if suffix else None


def is_image_url(url: str, extension: str | None = None) -> bool:
    """Return whether an HTTP(S) URL resolves to an approved image format."""

    return _resolved_extension(url, extension) in IMAGE_EXTENSIONS


def filter_image_urls(
    candidates: Iterable[tuple[str, str | None]],
) -> list[str]:
    """Return qualifying original URLs, preserving their full strings."""

    return [url for url, extension in candidates if is_image_url(url, extension)]


def deduplicate_urls(urls: Iterable[str]) -> list[str]:
    """Remove exact duplicates while preserving first-seen order."""

    return list(dict.fromkeys(urls))
