import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPABILITY_TTL_SECONDS, createCapability, verifyCapability } from "../src/capability.js";

const SECRET = "test-only capability key with no production value";

test("capability lifetime safely exceeds the workflow timeout", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/extract-links.yml", import.meta.url), "utf8");
  const timeoutMinutes = Number(/timeout-minutes:\s*(\d+)/.exec(workflow)?.[1]);
  assert.equal(CAPABILITY_TTL_SECONDS, 30 * 60);
  assert.equal(timeoutMinutes, 15);
  assert.ok(CAPABILITY_TTL_SECONDS >= (timeoutMinutes + 15) * 60);
});

test("valid capability verifies and identifies exactly one run", async () => {
  const { jobToken } = await createCapability("123456789", SECRET, { now: 100, ttlSeconds: 60 });
  const payload = await verifyCapability(jobToken, SECRET, { now: 159 });
  assert.deepEqual(payload, { v: 1, runId: "123456789", exp: 160 });
});

test("modified capability fails", async () => {
  const { jobToken } = await createCapability("123", SECRET, { now: 100 });
  const [payload, signature] = jobToken.split(".");
  const changed = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}.${signature}`;
  assert.equal(await verifyCapability(changed, SECRET, { now: 101 }), null);
});

test("expired capability fails", async () => {
  const { jobToken } = await createCapability("123", SECRET, { now: 100, ttlSeconds: 60 });
  assert.equal(await verifyCapability(jobToken, SECRET, { now: 160 }), null);
});
