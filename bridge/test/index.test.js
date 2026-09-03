import test from "node:test";
import assert from "node:assert/strict";
import { createWorker } from "../src/index.js";
import { verifyCapability } from "../src/capability.js";

const ENV = {
  GITHUB_TOKEN: "test-only server GitHub token",
  FLOPPYDISK_CAPABILITY_SECRET: "test-only signing secret",
  FLOPPYDISK_DEV_KEY: "test-only development gate",
};

function request(key) {
  const headers = key === undefined ? {} : { "X-FloppyDisk-Dev-Key": key };
  return new Request("https://worker.example/run", { method: "POST", headers });
}

test("POST /run rejects a missing development key", async () => {
  const response = await createWorker().fetch(request(), ENV);
  assert.equal(response.status, 401);
});

test("POST /run rejects a wrong development key without dispatching", async () => {
  let called = false;
  const worker = createWorker({ dispatch: async () => { called = true; } });
  const response = await worker.fetch(request("wrong"), ENV);
  assert.equal(response.status, 401);
  assert.equal(called, false);
});

test("correct key dispatches server-side and returns only the capability contract", async () => {
  let receivedToken;
  const worker = createWorker({ dispatch: async token => { receivedToken = token; return "424242"; } });
  const response = await worker.fetch(request(ENV.FLOPPYDISK_DEV_KEY), ENV);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(receivedToken, ENV.GITHUB_TOKEN);
  assert.deepEqual(Object.keys(body).sort(), ["expiresAt", "jobToken"]);
  assert.equal(JSON.stringify(body).includes(ENV.GITHUB_TOKEN), false);
  assert.equal("runId" in body, false);
  assert.equal(JSON.stringify(body).includes("github.com"), false);
  assert.equal((await verifyCapability(body.jobToken, ENV.FLOPPYDISK_CAPABILITY_SECRET)).runId, "424242");
});

test("raw GitHub failures and stack traces are not returned", async () => {
  const worker = createWorker({ dispatch: async () => { throw new Error("sensitive raw response"); } });
  const response = await worker.fetch(request(ENV.FLOPPYDISK_DEV_KEY), ENV);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "request failed" });
});
