"""Isolated subprocess boundary for gallery-dl discovery."""

from dataclasses import dataclass
import json
import subprocess
from typing import Literal


# BREADCRUMBS - WAS
#
# Phase 1-1 targeted local Windows execution. Phase 1-2 moved execution to
# GitHub-hosted Actions, while this isolated discovery seam survived unchanged.
#
# BREADCRUMBS - IS
#
# This is the only production module that knows gallery-dl exists. Each target
# owns one invocation because batched exit codes, output attribution, and
# timeouts are ambiguous. Structured -j output preserves extractor metadata and
# avoids -g fallback text. Targets are argv entries after -- and never pass
# through -i, which interprets configuration-like input. Stderr is captured,
# never printed, because it can contain URLs in retained CI logs. gallery-dl
# remains an external subprocess; importing or vendoring it would materially
# change both this architecture and its licensing analysis.
#
# BREADCRUMBS - WILL BE
#
# Callers receive only FloppyDisk-owned data so a different discovery engine,
# or an evidence-backed extension-resolution strategy, can replace this seam
# without changing them.

DiscoveryStatus = Literal[
    "ok",
    "unsupported",
    "extraction-error",
    "timeout",
    "bad-json",
    "invocation-error",
]


@dataclass(frozen=True)
class DiscoveryRecord:
    """A gallery-neutral discovered URL and optional extension metadata."""

    url: str
    extension: str | None


@dataclass(frozen=True)
class DiscoveryResult:
    """Contained outcome of one target's discovery invocation."""

    status: DiscoveryStatus
    records: tuple[DiscoveryRecord, ...]
    stderr: str
    returncode: int | None

    @property
    def ok(self) -> bool:
        return self.status == "ok"


def _failure_status(returncode: int) -> DiscoveryStatus:
    if returncode == 64:
        return "unsupported"
    if returncode == 4:
        return "extraction-error"
    return "invocation-error"


def _parse_records(stdout: str) -> tuple[DiscoveryRecord, ...]:
    payload = json.loads(stdout)
    if not isinstance(payload, list):
        raise ValueError("gallery-dl output must be a JSON array")

    records: list[DiscoveryRecord] = []
    for item in payload:
        if not isinstance(item, list) or not item:
            raise ValueError("gallery-dl output contains an invalid record")
        if item[0] != 3:
            continue
        if len(item) < 3 or not isinstance(item[1], str) or not isinstance(item[2], dict):
            raise ValueError("gallery-dl Message.Url record has an invalid shape")

        extension = item[2].get("extension")
        records.append(
            DiscoveryRecord(
                url=item[1],
                extension=extension if isinstance(extension, str) else None,
            )
        )

    return tuple(records)


def discover_target(target: str, *, timeout: float) -> DiscoveryResult:
    """Discover structured URL records for exactly one target."""

    try:
        completed = subprocess.run(
            ["gallery-dl", "-j", "--", target],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            shell=False,
        )
    except subprocess.TimeoutExpired as error:
        stderr = error.stderr
        if isinstance(stderr, bytes):
            stderr = stderr.decode(errors="replace")
        return DiscoveryResult("timeout", (), stderr or "", None)

    if completed.returncode != 0:
        return DiscoveryResult(
            _failure_status(completed.returncode),
            (),
            completed.stderr,
            completed.returncode,
        )

    if not completed.stdout.strip():
        return DiscoveryResult("ok", (), completed.stderr, completed.returncode)

    try:
        records = _parse_records(completed.stdout)
    except (json.JSONDecodeError, ValueError, TypeError):
        return DiscoveryResult("bad-json", (), completed.stderr, completed.returncode)

    return DiscoveryResult("ok", records, completed.stderr, completed.returncode)
