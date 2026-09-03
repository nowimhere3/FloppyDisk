import test from "node:test";
import assert from "node:assert/strict";
import { dispatchWorkflow, GitHubDispatchError } from "../src/github.js";

test("dispatch targets the fixed workflow and keeps the PAT in the server request", async () => {
  const token = "test-only GitHub credential";
  let call;
  const runId = await dispatchWorkflow(token, async (url, options) => {
    call = { url, options };
    return Response.json({ workflow_run_id: 987, run_url: "private", html_url: "private" });
  });
  assert.equal(call.url, "https://api.github.com/repos/nowimhere3/FloppyDisk/actions/workflows/extract-links.yml/dispatches");
  assert.deepEqual(JSON.parse(call.options.body), { ref: "main", return_run_details: true });
  assert.equal(call.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(runId, "987");
});

test("dispatch refuses a successful response without a usable workflow run id", async () => {
  await assert.rejects(
    dispatchWorkflow("token", async () => Response.json({ run_url: "private" })),
    GitHubDispatchError,
  );
});
