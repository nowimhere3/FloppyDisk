import test from "node:test";
import assert from "node:assert/strict";
import { createWorker, encodeUtf8Base64 } from "../src/index.js";
import { verifyCapability } from "../src/capability.js";
import { GitHubDispatchError } from "../src/github.js";

const ENV = {
  GITHUB_TOKEN: "test-only server GitHub token",
  FLOPPYDISK_CAPABILITY_SECRET: "test-only signing secret",
  FLOPPYDISK_DEV_KEY: "test-only development gate",
  SUBMISSION_RATE_LIMITER: { limit: async () => ({ success: true }) },
};

function request(key, body = { targets: "https://example.test/image\n" }, contentType = "application/json") {
  const headers = {};
  if (key !== undefined) headers["X-FloppyDisk-Dev-Key"] = key;
  if (contentType !== undefined) headers["Content-Type"] = contentType;
  headers["CF-Connecting-IP"] = "203.0.113.10";
  return new Request("https://worker.example/run", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("POST /run no longer requires the temporary development key", async () => {
  const worker = createWorker({ dispatch: async () => "123", countInFlight: async () => 0 });
  const response = await worker.fetch(request(), ENV);
  assert.equal(response.status, 200);
});

test("development key cannot bypass public admission checks", async () => {
  let dispatched = false;
  const worker = createWorker({ dispatch: async () => { dispatched = true; }, countInFlight: async () => 3 });
  const response = await worker.fetch(request("wrong"), ENV);
  assert.equal(response.status, 503);
  assert.equal(dispatched, false);
});

test("anonymous admitted request dispatches server-side and returns only the capability contract", async () => {
  let receivedToken;
  let receivedTargets;
  const targets = "https://例え.test/画像\n# café ☕\r\n";
  const worker = createWorker({ dispatch: async (token, targetsBase64) => {
    receivedToken = token;
    receivedTargets = targetsBase64;
    return "424242";
  }, countInFlight: async () => 0 });
  const response = await worker.fetch(request(ENV.FLOPPYDISK_DEV_KEY, { targets }), ENV);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(receivedToken, ENV.GITHUB_TOKEN);
  assert.equal(new TextDecoder().decode(Uint8Array.from(atob(receivedTargets), c => c.charCodeAt(0))), targets);
  assert.deepEqual(Object.keys(body).sort(), ["expiresAt", "jobToken"]);
  assert.equal(JSON.stringify(body).includes(ENV.GITHUB_TOKEN), false);
  assert.equal("runId" in body, false);
  assert.equal(JSON.stringify(body).includes("github.com"), false);
  assert.equal((await verifyCapability(body.jobToken, ENV.FLOPPYDISK_CAPABILITY_SECRET)).runId, "424242");
});

test("UTF-8 target text round-trips through Base64 exactly", () => {
  const targets = "first\r\n日本語 😀\nlast line without newline";
  const decoded = new TextDecoder().decode(Uint8Array.from(atob(encodeUtf8Base64(targets)), c => c.charCodeAt(0)));
  assert.equal(decoded, targets);
});

test("missing or malformed JSON input fails safely without dispatch", async () => {
  let calls = 0;
  const worker = createWorker({ dispatch: async () => { calls += 1; } });
  for (const candidate of [
    request(ENV.FLOPPYDISK_DEV_KEY, "{"),
    request(ENV.FLOPPYDISK_DEV_KEY, {}),
    request(ENV.FLOPPYDISK_DEV_KEY, { targets: 42 }),
  ]) {
    const response = await worker.fetch(candidate, ENV);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Please choose a valid text file." });
  }
  assert.equal(calls, 0);
});

test("POST /run requires application/json before public admission", async () => {
  const response = await createWorker().fetch(
    request(ENV.FLOPPYDISK_DEV_KEY, "sensitive raw target", "text/plain"), ENV,
  );
  assert.equal(response.status, 415);
  assert.equal((await response.text()).includes("sensitive raw target"), false);
});

test("raw GitHub failures and stack traces are not returned", async () => {
  const originalError = console.error;
  const diagnostics = [];
  console.error = (...values) => diagnostics.push(values);
  try {
    const worker = createWorker({
      dispatch: async () => { throw new GitHubDispatchError(403, "SAFE456", "Resource not accessible"); },
      countInFlight: async () => 0,
    });
    const response = await worker.fetch(request(ENV.FLOPPYDISK_DEV_KEY), ENV);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "request failed" });
    assert.deepEqual(diagnostics, [["github_operation_failed", {
      upstreamStatus: 403,
      requestId: "SAFE456",
      category: "Resource not accessible",
    }]]);
    assert.equal(JSON.stringify(diagnostics).includes(ENV.GITHUB_TOKEN), false);
    assert.equal(JSON.stringify(diagnostics).includes("targets_b64"), false);
  } finally {
    console.error = originalError;
  }
});
