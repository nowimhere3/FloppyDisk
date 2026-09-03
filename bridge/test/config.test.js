import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Worker configuration pins exact CORS origin and submission rate limit", () => {
  const config = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  assert.match(config, /FRONTEND_ORIGIN = "https:\/\/nowimhere3\.github\.io"/);
  assert.match(config, /name = "SUBMISSION_RATE_LIMITER"/);
  assert.match(config, /limit = 2/);
  assert.match(config, /period = 60/);
  assert.doesNotMatch(config, /FRONTEND_ORIGIN = "\*"/);
});
