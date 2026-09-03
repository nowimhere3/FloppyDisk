import test from "node:test";
import assert from "node:assert/strict";
import { createCapability } from "../src/capability.js";
import { createWorker } from "../src/index.js";

const ORIGIN = "https://nowimhere3.github.io";
const ENV = {
  GITHUB_TOKEN: "test-only token",
  FLOPPYDISK_CAPABILITY_SECRET: "test-only signing secret",
  FRONTEND_ORIGIN: ORIGIN,
};

function runRequest({ origin, devKey } = {}) {
  const headers = { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.20" };
  if (origin) headers.Origin = origin;
  if (devKey) headers["X-FloppyDisk-Dev-Key"] = devKey;
  return new Request("https://worker.example/run", {
    method: "POST", headers, body: JSON.stringify({ targets: "https://safe.example.test/page" }),
  });
}

test("rate limiter allows two submissions and rejects the third without dispatch", async () => {
  let attempts = 0;
  let dispatches = 0;
  const env = { ...ENV, SUBMISSION_RATE_LIMITER: { limit: async () => ({ success: ++attempts <= 2 }) } };
  const worker = createWorker({ countInFlight: async () => 0, dispatch: async () => String(100 + ++dispatches) });
  assert.equal((await worker.fetch(runRequest(), env)).status, 200);
  assert.equal((await worker.fetch(runRequest(), env)).status, 200);
  const response = await worker.fetch(runRequest(), env);
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "You've submitted too recently. Try again in a minute." });
  assert.equal(dispatches, 2);
});

test("oversize public request is rejected before rate limit, concurrency, or dispatch", async () => {
  let expensiveCalls = 0;
  const env = { ...ENV, SUBMISSION_RATE_LIMITER: { limit: async () => { expensiveCalls += 1; } } };
  const worker = createWorker({
    countInFlight: async () => { expensiveCalls += 1; },
    dispatch: async () => { expensiveCalls += 1; },
  });
  const response = await worker.fetch(new Request("https://worker.example/run", {
    method: "POST",
    headers: { "Content-Type": "text/plain", "CF-Connecting-IP": "203.0.113.20" },
    body: "x".repeat(32 * 1024 + 1),
  }), env);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "That file is too large." });
  assert.equal(expensiveCalls, 0);
});

test("in-flight counts below three dispatch while three or more return busy", async () => {
  for (const count of [0, 1, 2, 3, 4]) {
    let dispatches = 0;
    const env = { ...ENV, SUBMISSION_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const worker = createWorker({ countInFlight: async () => count, dispatch: async () => String(++dispatches) });
    const response = await worker.fetch(runRequest(), env);
    assert.equal(response.status, count < 3 ? 200 : 503);
    assert.equal(dispatches, count < 3 ? 1 : 0);
    if (count >= 3) assert.deepEqual(await response.json(), { error: "FloppyDisk is busy. Try again in a moment." });
  }
});

test("a development key cannot bypass rate or concurrency guardrails", async () => {
  let dispatches = 0;
  const env = { ...ENV, SUBMISSION_RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const worker = createWorker({ dispatch: async () => { dispatches += 1; } });
  assert.equal((await worker.fetch(runRequest({ devKey: "obsolete-secret" }), env)).status, 429);
  assert.equal(dispatches, 0);
});

test("rate limiting uses Cloudflare's canonical IP rather than X-Forwarded-For", async () => {
  let key;
  const env = { ...ENV, SUBMISSION_RATE_LIMITER: { limit: async input => { key = input.key; return { success: false }; } } };
  const request = runRequest();
  request.headers.set("X-Forwarded-For", "198.51.100.99");
  await createWorker().fetch(request, env);
  assert.equal(key, "203.0.113.20");
});

test("CORS permits only the configured exact origin", async () => {
  const worker = createWorker();
  const allowed = await worker.fetch(new Request("https://worker.example/status", { headers: { Origin: ORIGIN } }), ENV);
  const denied = await worker.fetch(new Request("https://worker.example/status", { headers: { Origin: "https://evil.example" } }), ENV);
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.equal(denied.headers.has("Access-Control-Allow-Origin"), false);
  assert.equal(allowed.headers.has("Access-Control-Allow-Credentials"), false);
});

test("OPTIONS preflight is exact and minimal", async () => {
  const worker = createWorker();
  const request = new Request("https://worker.example/run", { method: "OPTIONS", headers: {
    Origin: ORIGIN,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type, authorization",
  } });
  const response = await worker.fetch(request, ENV);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET, POST");
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
  assert.equal(response.headers.has("Access-Control-Allow-Credentials"), false);
  assert.equal(response.headers.get("Vary"), "Origin");
  const wrongOrigin = new Request(request, { headers: { ...Object.fromEntries(request.headers), Origin: "https://evil.example" } });
  assert.equal((await worker.fetch(wrongOrigin, ENV)).status, 403);
});

test("status cache prevents GitHub polling inside five seconds", async () => {
  const entries = new Map();
  const cache = {
    match: async key => entries.get(key.url)?.clone(),
    put: async (key, value) => entries.set(key.url, value.clone()),
  };
  let calls = 0;
  const jobToken = (await createCapability("42", ENV.FLOPPYDISK_CAPABILITY_SECRET)).jobToken;
  const worker = createWorker({ statusCache: cache, getRun: async () => {
    calls += 1;
    return { status: "in_progress", conclusion: null };
  } });
  const request = () => new Request("https://worker.example/status", { headers: { Authorization: `Bearer ${jobToken}` } });
  assert.equal((await worker.fetch(request(), ENV)).status, 200);
  assert.equal((await worker.fetch(request(), ENV)).status, 200);
  assert.equal(calls, 1);
});
