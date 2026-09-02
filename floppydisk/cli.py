"""Pure command-line input contracts for FloppyDisk."""

from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urlsplit


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
