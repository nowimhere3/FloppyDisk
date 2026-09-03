import test from "node:test";
import assert from "node:assert/strict";
import { MAX_REQUEST_BYTES, readAndValidateTargets } from "../src/validate.js";

function body(targets) {
  return new Request("https://worker.example/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targets }),
  });
}

test("request over 32 KB is rejected before JSON processing", async () => {
  const request = new Request("https://worker.example/run", {
    method: "POST",
    body: "{".repeat(MAX_REQUEST_BYTES + 1),
  });
  assert.deepEqual(await readAndValidateTargets(request), { error: "That file is too large." });
});

test("50 targets are accepted and 51 are rejected", async () => {
  const fifty = Array.from({ length: 50 }, (_, index) => `https://host${index}.example.test/page`).join("\n");
  assert.deepEqual(await readAndValidateTargets(body(fifty)), { targets: fifty });
  const fiftyOne = `${fifty}\nhttps://host50.example.test/page`;
  assert.deepEqual(await readAndValidateTargets(body(fiftyOne)), { error: "Please submit no more than 50 URLs." });
});

test("blank and comment lines do not inflate target count", async () => {
  const targets = `${Array.from({ length: 50 }, (_, i) => `https://h${i}.example.test`).join("\n")}\n\n# comment\n  # indented`;
  assert.deepEqual(await readAndValidateTargets(body(targets)), { targets });
});

test("http and https targets are accepted", async () => {
  const targets = "http://one.example.test\nhttps://two.example.test/path";
  assert.deepEqual(await readAndValidateTargets(body(targets)), { targets });
});

for (const [label, target] of [
  ["non-http scheme", "ftp://example.test/file"],
  ["malformed URL", "not a url"],
  ["localhost", "http://localhost/path"],
  ["loopback", "http://127.0.0.1/path"],
  ["IPv6 loopback", "http://[::1]/path"],
  ["10/8", "http://10.1.2.3/path"],
  ["172.16/12", "http://172.20.1.2/path"],
  ["192.168/16", "http://192.168.1.2/path"],
  ["link-local", "http://169.254.169.254/path"],
  ["local hostname", "http://printer.local/path"],
  ["bare public IP", "https://203.0.113.8/path"],
]) {
  test(`${label} is rejected`, async () => {
    assert.deepEqual(await readAndValidateTargets(body(target)), {
      error: "That file contains an invalid or unsafe URL.",
    });
  });
}
