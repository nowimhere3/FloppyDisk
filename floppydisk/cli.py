"""Command-line input and pipeline orchestration for FloppyDisk."""

import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import tempfile
from typing import Iterable, Mapping, Sequence
from urllib.parse import urlsplit

from .discover import DiscoveryResult, discover_target
from .filters import deduplicate_urls, filter_image_urls


# BREADCRUMBS - WAS
#
# Stage A gave this module only target parsing. Stage C expands it into
# orchestration after the filtering and discovery seams were separately proven
# and frozen.
#
# BREADCRUMBS - IS
#
# This module owns orchestration, output purity, diagnostics separation, and
# failure containment. links.txt carries URLs and nothing else; diagnostics
# exist specifically to keep it pure. Routine partial target failure is useful
# evidence, so surviving links remain usable. Diagnostics identify targets by
# source line number for privacy, retain errors even beside surviving records,
# and report queued work so profile fan-out is not mistaken for emptiness.
#
# BREADCRUMBS - WILL BE
#
# This exit/output boundary remains usable by GitHub Actions or a later trigger
# surface without making those callers own extraction or filtering policy.

DEFAULT_TARGET_TIMEOUT = 120.0


@dataclass(frozen=True)
class Target:
    """A validated target and its one-based source line number."""

    line_number: int
    url: str


@dataclass(frozen=True)
class RejectedTarget:
    """An invalid non-blank target retained for future diagnostics."""

    line_number: int
    value: str


@dataclass(frozen=True)
class ParsedTargets:
    """Validated and rejected target lines."""

    accepted: tuple[Target, ...]
    rejected: tuple[RejectedTarget, ...]


@dataclass(frozen=True)
class PipelineCounts:
    """Aggregate counts safe for console and CI summary output."""

    accepted_targets: int
    invalid_targets: int
    qualifying_links: int
    unique_links: int
    duplicates_removed: int
    excluded_records: int
    queued: int


def _is_http_url(value: str) -> bool:
    parsed = urlsplit(value)
    return parsed.scheme.lower() in {"http", "https"} and bool(parsed.netloc)


def parse_targets(lines: Iterable[str]) -> ParsedTargets:
    """Parse targets while retaining one-based line numbers for diagnostics."""

    accepted: list[Target] = []
    rejected: list[RejectedTarget] = []

    for line_number, raw_line in enumerate(lines, start=1):
        value = raw_line.strip()
        if not value or value.startswith("#"):
            continue

        if _is_http_url(value):
            accepted.append(Target(line_number, value))
        else:
            rejected.append(RejectedTarget(line_number, value))

    return ParsedTargets(tuple(accepted), tuple(rejected))


def _atomic_write_text(path: Path, content: str) -> None:
    """Replace a UTF-8 text file from a temporary file on the same filesystem."""

    temporary_path: Path | None = None
    try:
        descriptor, name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
        temporary_path = Path(name)
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, path)
        temporary_path = None
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def _links_content(urls: Sequence[str]) -> str:
    return "" if not urls else "\n".join(urls) + "\n"


def _target_diagnostic(line_number: int, result: DiscoveryResult, links: int, excluded: int) -> list[str]:
    details = [
        f"line {line_number}: status={result.status} links={links} excluded={excluded}"
    ]
    if result.queued:
        details[0] += f" queued={result.queued} unresolved"
    elif result.status == "ok" and not result.records:
        details[0] += " empty"

    for error in result.errors:
        details.append(f"  error: {error.name}: {error.message}")
    if result.stderr:
        details.append("  stderr:")
        details.extend(f"    {line}" for line in result.stderr.splitlines())
    return details


def _diagnostics_content(
    parsed: ParsedTargets,
    target_details: Sequence[str],
    counts: PipelineCounts,
) -> str:
    total = counts.accepted_targets + counts.invalid_targets
    lines = [
        "FloppyDisk diagnostics",
        f"targets: {total}",
        f"accepted targets: {counts.accepted_targets}",
        f"invalid targets: {counts.invalid_targets}",
        f"qualifying links: {counts.qualifying_links}",
        f"unique links: {counts.unique_links}",
        f"duplicates removed: {counts.duplicates_removed}",
        f"excluded records: {counts.excluded_records}",
        f"queued unresolved: {counts.queued}",
        "",
    ]
    lines.extend(f"line {target.line_number}: status=invalid" for target in parsed.rejected)
    lines.extend(target_details)
    return "\n".join(lines) + "\n"


def _step_summary(counts: PipelineCounts) -> str:
    return "\n".join(
        [
            "## FloppyDisk",
            "",
            f"- Accepted targets: {counts.accepted_targets}",
            f"- Invalid targets: {counts.invalid_targets}",
            f"- Unique links: {counts.unique_links}",
            f"- Duplicates removed: {counts.duplicates_removed}",
            f"- Excluded records: {counts.excluded_records}",
            f"- Queued unresolved: {counts.queued}",
            "",
        ]
    )


def run_pipeline(
    targets_path: Path,
    output_path: Path,
    diagnostics_path: Path,
    *,
    timeout: float = DEFAULT_TARGET_TIMEOUT,
    step_summary_path: Path | None = None,
) -> PipelineCounts:
    """Run the offline-testable pipeline using the frozen discovery seam."""

    resolved_paths = {
        targets_path.resolve(),
        output_path.resolve(),
        diagnostics_path.resolve(),
    }
    if len(resolved_paths) != 3:
        raise ValueError("targets, output, and diagnostics paths must be different")

    with targets_path.open("r", encoding="utf-8") as handle:
        parsed = parse_targets(handle)

    qualifying: list[str] = []
    target_details: list[str] = []
    excluded_records = 0
    queued = 0

    for target in parsed.accepted:
        result = discover_target(target.url, timeout=timeout)
        target_links = filter_image_urls(
            (record.url, record.extension) for record in result.records
        )
        qualifying.extend(target_links)
        excluded = len(result.records) - len(target_links)
        excluded_records += excluded
        queued += result.queued
        target_details.extend(
            _target_diagnostic(target.line_number, result, len(target_links), excluded)
        )

    unique_links = deduplicate_urls(qualifying)
    counts = PipelineCounts(
        accepted_targets=len(parsed.accepted),
        invalid_targets=len(parsed.rejected),
        qualifying_links=len(qualifying),
        unique_links=len(unique_links),
        duplicates_removed=len(qualifying) - len(unique_links),
        excluded_records=excluded_records,
        queued=queued,
    )

    _atomic_write_text(output_path, _links_content(unique_links))
    _atomic_write_text(
        diagnostics_path,
        _diagnostics_content(parsed, target_details, counts),
    )
    if step_summary_path is not None:
        with step_summary_path.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(_step_summary(counts))

    return counts


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Discover direct image URLs")
    parser.add_argument("--targets", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--diagnostics", type=Path, required=True)
    return parser


def main(
    argv: Sequence[str] | None = None,
    *,
    environ: Mapping[str, str] | None = None,
) -> int:
    """Run the CLI and convert fatal local pipeline failures to exit code 1."""

    args = _parser().parse_args(argv)
    environment = os.environ if environ is None else environ
    summary_value = environment.get("GITHUB_STEP_SUMMARY")
    summary_path = Path(summary_value) if summary_value else None

    try:
        counts = run_pipeline(
            args.targets,
            args.out,
            args.diagnostics,
            step_summary_path=summary_path,
        )
    except FileNotFoundError as error:
        if error.filename == "gallery-dl" or str(error) == "gallery-dl":
            print("FloppyDisk could not run: gallery-dl executable not found.")
        else:
            print("FloppyDisk could not run: a required file was unavailable.")
        return 1
    except (OSError, ValueError):
        print("FloppyDisk could not run: local input or output failure.")
        return 1

    print(
        "FloppyDisk completed: "
        f"{counts.accepted_targets} accepted, "
        f"{counts.invalid_targets} invalid, "
        f"{counts.unique_links} unique links."
    )
    return 0
