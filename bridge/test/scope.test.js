import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const FROZEN_PATHS = [
  "floppydisk",
  "tests/test_cli.py",
  "tests/test_discover.py",
  "tests/test_filters.py",
  "tests/test_targets.py",
  "tests/fixtures",
];

test("Phase 2 does not modify the frozen Phase 0 boundary", () => {
  const cwd = new URL("../..", import.meta.url);
  const changed = execFileSync("git", ["diff", "--name-only", "03753b3", "--", ...FROZEN_PATHS], {
    cwd, encoding: "utf8",
  });
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "--", ...FROZEN_PATHS], {
    cwd: new URL("../..", import.meta.url), encoding: "utf8",
  });
  assert.equal(changed, "");
  assert.equal(untracked, "");
});
