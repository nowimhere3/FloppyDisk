import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  API_URL, POLL_INTERVAL_MS, SESSION_KEY, fetchJobStatus, fetchResultBlob,
  inspectTargets, loadContinuation, readSelectedFile, saveContinuation, submitTargets,
} from "../app.js";
import { STATES, transition } from "../state.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("page keeps a visible file-picker path alongside drag and drop", () => {
  assert.match(html, /<input[^>]+type="file"[^>]+accept="\.txt,text\/plain"/);
  assert.match(html, /id="choose-file"/);
  assert.match(appSource, /addEventListener\("drop"/);
});

test("pure state machine owns empty, ready, working, success, and error", () => {
  const empty = { name: STATES.EMPTY };
  const ready = transition(empty, { type: "FILE_READY", file: {}, filename: "pages.txt", targetCount: 2 });
  assert.equal(ready.name, STATES.READY);
  assert.equal(transition(empty, { type: "START", startedAt: 1 }).name, STATES.EMPTY);
  const working = transition(ready, { type: "START", startedAt: 1 });
  assert.equal(working.name, STATES.WORKING);
  assert.equal(transition(working, { type: "COMPLETE", result: new Blob() }).name, STATES.SUCCESS);
  assert.equal(transition(working, { type: "FAIL", message: "Try again" }).name, STATES.ERROR);
});

test("POST uses exact URL and JSON contract with no dev key, run ID, or automatic retry", async () => {
  const calls = [];
  const result = await submitTargets("https://example.test\n", async (url, options) => {
    calls.push({ url, options });
    return Response.json({ jobToken: "signed-capability", expiresAt: "2099-01-01T00:00:00.000Z" });
  });
  assert.deepEqual(result, { jobToken: "signed-capability", expiresAt: "2099-01-01T00:00:00.000Z" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${API_URL}/run`);
  assert.deepEqual(JSON.parse(calls[0].options.body), { targets: "https://example.test\n" });
  assert.deepEqual(calls[0].options.headers, { "Content-Type": "application/json" });
  assert.equal(JSON.stringify(calls).includes("runId"), false);
  assert.equal(JSON.stringify(calls).includes("X-FloppyDisk-Dev-Key"), false);
});

test("jobToken appears only as Bearer authorization and never in request URLs", async () => {
  const calls = [];
  const fetchMock = async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/status")
      ? Response.json({ status: "in_progress", conclusion: null })
      : new Response(new Uint8Array([65, 10]), { headers: { "Content-Type": "text/plain" } });
  };
  await fetchJobStatus("secret-job-token", fetchMock);
  await fetchResultBlob("secret-job-token", fetchMock);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => !call.url.includes("secret-job-token")));
  assert.ok(calls.every(call => call.options.headers.Authorization === "Bearer secret-job-token"));
});

test("result bytes stay byte-identical and download name is links.txt", async () => {
  const expected = new Uint8Array([0x61, 0x0d, 0x0a, 0xff, 0x0a]);
  const blob = await fetchResultBlob("token", async () => new Response(expected));
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), expected);
  assert.match(appSource, /link\.download = "links\.txt"/);
  assert.doesNotMatch(appSource, /fetchResultBlob[\s\S]{0,500}\.text\(\)/);
});

test("file validation reads content without trusting MIME and enforces the 50 boundary", async () => {
  let reads = 0;
  const file = { name: "pages.txt", type: "", text: async () => { reads += 1; return "https://example.test"; } };
  assert.equal((await readSelectedFile(file)).targetCount, 1);
  assert.equal(reads, 1);
  const fifty = Array.from({ length: 50 }, (_, i) => `https://h${i}.example.test`).join("\n");
  assert.equal(inspectTargets(`${fifty}\n\n# comment`).count, 50);
  assert.match(inspectTargets(`${fifty}\nhttps://extra.example.test`).error, /50 or fewer/);
});

test("session resume stores only minimal per-tab state and clears expired data", () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) };
  const active = { jobToken: "capability", expiresAt: "2099-01-01T00:00:00.000Z", startedAt: 10 };
  saveContinuation(storage, active);
  assert.deepEqual(Object.keys(JSON.parse(values.get(SESSION_KEY))).sort(), ["expiresAt", "jobToken", "startedAt"]);
  assert.deepEqual(loadContinuation(storage, 20), active);
  values.set(SESSION_KEY, JSON.stringify({ ...active, expiresAt: "2000-01-01T00:00:00.000Z" }));
  assert.equal(loadContinuation(storage, Date.now()), null);
  assert.equal(values.has(SESSION_KEY), false);
  assert.doesNotMatch(appSource, /localStorage/);
});

test("working UI is honest, polls no faster than five seconds, and has safe error copy", () => {
  assert.ok(POLL_INTERVAL_MS >= 5000);
  assert.doesNotMatch(html + appSource, /\b\d{1,3}%\b|progressbar|processed \/|\/ 50 processed/i);
  assert.match(html, /Finding image links/);
  assert.match(html, /Try again/);
  assert.doesNotMatch(html, /GitHub|Cloudflare|workflow|artifact|capability|run ID/i);
});

test("mobile and accessibility contracts are present", () => {
  assert.match(html, /name="viewport"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /<button/g);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /@media \(max-width: 440px\)/);
  assert.match(css, /width:\s*min\(100% - 20px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /100vw/);
});

test("docs ship no analytics, external runtime, dev key, or privileged credential signature", () => {
  const files = readdirSync(new URL("..", import.meta.url), { recursive: true })
    .filter(name => /\.(?:html|js|css|svg|json)$/.test(name) && !name.includes("test"));
  const shipped = files.map(name => readFileSync(new URL(`../${name}`, import.meta.url))).join("\n");
  assert.doesNotMatch(shipped, /google-analytics|gtag\(|segment|mixpanel|plausible|hotjar/i);
  assert.doesNotMatch(shipped, /X-FloppyDisk-Dev-Key|github_pat_|ghp_|ghs_|GITHUB_TOKEN|FLOPPYDISK_CAPABILITY_SECRET/);
  assert.doesNotMatch(html, /(?:<script[^>]+src|<link[^>]+href)="https?:\/\//);
});
