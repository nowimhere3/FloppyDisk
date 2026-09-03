import test from "node:test";
import assert from "node:assert/strict";
import { createCapability } from "../src/capability.js";
import { createWorker } from "../src/index.js";

const ENV = {
  GITHUB_TOKEN: "test-only server GitHub token",
  FLOPPYDISK_CAPABILITY_SECRET: "test-only signing secret",
  FLOPPYDISK_DEV_KEY: "test-only development gate",
};

async function token(options = {}) {
  return (await createCapability("424242", ENV.FLOPPYDISK_CAPABILITY_SECRET, options)).jobToken;
}

function get(path, jobToken) {
  const headers = {};
  if (jobToken !== undefined) headers.Authorization = `Bearer ${jobToken}`;
  return new Request(`https://worker.example${path}`, { headers });
}

test("valid capability authorizes status and returns only minimal fields", async () => {
  let internalRunId;
  const worker = createWorker({ getRun: async (githubToken, runId) => {
    assert.equal(githubToken, ENV.GITHUB_TOKEN);
    internalRunId = runId;
    return { status: "in_progress", conclusion: null };
  } });
  const response = await worker.fetch(get("/status", await token()), ENV);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "in_progress", conclusion: null });
  assert.equal(internalRunId, "424242");
});

test("client runId is ignored and cannot authorize lookup", async () => {
  let internalRunId;
  const worker = createWorker({ getRun: async (_token, runId) => {
    internalRunId = runId;
    return { status: "queued", conclusion: null };
  } });
  assert.equal((await worker.fetch(get("/status?runId=999"), ENV)).status, 401);
  const response = await worker.fetch(get("/status?runId=999", await token()), ENV);
  assert.equal(response.status, 200);
  assert.equal(internalRunId, "424242");
  assert.equal(JSON.stringify(await response.json()).includes("424242"), false);
});

test("missing, malformed, tampered, and expired capabilities fail identically", async () => {
  const valid = await token({ now: 100, ttlSeconds: 60 });
  const [payload, signature] = valid.split(".");
  const changed = `${payload}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
  const credentials = [undefined, "malformed", changed, await token({ now: 100, ttlSeconds: 1 })];
  for (const credential of credentials) {
    const response = await createWorker().fetch(get("/status", credential), ENV);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "request failed" });
  }
});

test("pending result does not attempt artifact download", async () => {
  let downloads = 0;
  const worker = createWorker({
    getRun: async () => ({ status: "in_progress", conclusion: null }),
    downloadArtifact: async () => { downloads += 1; },
  });
  const response = await worker.fetch(get("/result", await token()), ENV);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Your links are not ready yet." });
  assert.equal(downloads, 0);
});

test("failed completed result does not return or download artifact contents", async () => {
  let downloads = 0;
  const worker = createWorker({
    getRun: async () => ({ status: "completed", conclusion: "failure" }),
    downloadArtifact: async () => { downloads += 1; return { zipBytes: new Uint8Array(), artifactId: "9" }; },
  });
  const response = await worker.fetch(get("/result", await token()), ENV);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "FloppyDisk could not complete this job." });
  assert.equal(downloads, 0);
});

test("missing result artifact fails with a boring client error", async () => {
  const originalError = console.error;
  console.error = () => {};
  const worker = createWorker({
    getRun: async () => ({ status: "completed", conclusion: "success" }),
    downloadArtifact: async () => { throw new Error("result artifact missing"); },
  });
  try {
    const response = await worker.fetch(get("/result", await token()), ENV);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "request failed" });
  } finally {
    console.error = originalError;
  }
});

test("successful result returns only links.txt and deletes its artifact", async () => {
  const calls = [];
  const worker = createWorker({
    getRun: async (_token, runId) => { calls.push(["status", runId]); return { status: "completed", conclusion: "success" }; },
    downloadArtifact: async (_token, runId) => { calls.push(["download", runId]); return { zipBytes: new Uint8Array([1]), artifactId: "9" }; },
    extractLinks: () => "https://images.example.test/one.jpg\n",
    deleteArtifact: async (_token, artifactId) => { calls.push(["delete", artifactId]); },
  });
  const response = await worker.fetch(get("/result", await token()), ENV);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assert.equal(await response.text(), "https://images.example.test/one.jpg\n");
  assert.deepEqual(calls, [["status", "424242"], ["download", "424242"], ["delete", "9"]]);
});

test("capability, GitHub token, and run ID never enter errors or logs", async () => {
  const jobToken = await token();
  const diagnostics = [];
  const originalError = console.error;
  console.error = (...values) => diagnostics.push(values);
  try {
    const worker = createWorker({ getRun: async () => { throw new Error("internal failure for 424242"); } });
    const response = await worker.fetch(get("/status", jobToken), ENV);
    const body = await response.text();
    assert.equal(response.status, 502);
    for (const forbidden of [jobToken, ENV.GITHUB_TOKEN, "424242"]) {
      assert.equal(body.includes(forbidden), false);
      assert.equal(JSON.stringify(diagnostics).includes(forbidden), false);
    }
  } finally {
    console.error = originalError;
  }
});
