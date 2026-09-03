import test from "node:test";
import assert from "node:assert/strict";
import { dispatchWorkflow, GitHubDispatchError } from "../src/github.js";

test("dispatch targets the fixed workflow and keeps the PAT in the server request", async () => {
  const token = "test-only GitHub credential";
  const targetsBase64 = "dGVzdC1vbmx5IHRhcmdldHM=";
  let call;
  const runId = await dispatchWorkflow(token, targetsBase64, async (url, options) => {
    call = { url, options };
    return Response.json({ workflow_run_id: 987, run_url: "private", html_url: "private" });
  });
  assert.equal(call.url, "https://api.github.com/repos/nowimhere3/FloppyDisk/actions/workflows/extract-links.yml/dispatches");
  assert.deepEqual(JSON.parse(call.options.body), {
    ref: "main",
    return_run_details: true,
    inputs: { targets_b64: targetsBase64 },
  });
  assert.equal(call.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(runId, "987");
});

test("dispatch refuses a successful response without a usable workflow run id", async () => {
  await assert.rejects(
    dispatchWorkflow("token", "dGVzdA==", async () => Response.json({ run_url: "private" })),
    GitHubDispatchError,
  );
});

test("dispatch failure cannot copy payload-derived content into diagnostics", async () => {
  const payload = "c2Vuc2l0aXZlLXRhcmdldC1wYXlsb2Fk";
  await assert.rejects(
    dispatchWorkflow("token", payload, async () => new Response(
      JSON.stringify({ message: `Validation failed for targets_b64 ${payload}` }),
      { status: 422, headers: { "x-github-request-id": "SAFE123" } },
    )),
    error => {
      assert.equal(error.status, 422);
      assert.equal(error.requestId, "SAFE123");
      assert.equal(error.category, "github validation failed");
      assert.equal(JSON.stringify(error).includes("token"), false);
      assert.equal(JSON.stringify(error).includes(payload), false);
      assert.equal(JSON.stringify(error).includes("targets_b64"), false);
      return true;
    },
  );
});
