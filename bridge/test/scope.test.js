import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("Stage 2A does not modify frozen Python or workflow files", () => {
  const output = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "floppydisk", ".github/workflows"], {
    cwd: new URL("../..", import.meta.url), encoding: "utf8",
  });
  assert.equal(output, "");
});
