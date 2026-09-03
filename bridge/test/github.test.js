import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteResultArtifact,
  dispatchWorkflow,
  downloadResultArtifact,
  getWorkflowRun,
  GitHubDispatchError,
} from "../src/github.js";

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

test("status lookup returns only normalized state from the fixed run endpoint", async () => {
  let call;
  const result = await getWorkflowRun("token", "42", async (url, options) => {
    call = { url, options };
    return Response.json({ status: "completed", conclusion: "success", html_url: "private", id: 42 });
  });
  assert.equal(call.url, "https://api.github.com/repos/nowimhere3/FloppyDisk/actions/runs/42");
  assert.equal(call.options.headers.Authorization, "Bearer token");
  assert.deepEqual(result, { status: "completed", conclusion: "success" });
});

test("pre-run GitHub states normalize to queued", async () => {
  for (const status of ["requested", "waiting", "pending", "queued"]) {
    const result = await getWorkflowRun("token", "42", async () => Response.json({ status }));
    assert.deepEqual(result, { status: "queued", conclusion: null });
  }
});

test("artifact lookup selects exactly floppydisk-results and downloads by internal id", async () => {
  const calls = [];
  const result = await downloadResultArtifact("token", "42", async (url) => {
    calls.push(url);
    if (url.endsWith("/artifacts?per_page=100")) {
      return Response.json({ artifacts: [
        { id: 8, name: "other" },
        { id: 9, name: "floppydisk-results", expired: false },
      ] });
    }
    return new Response(new Uint8Array([1, 2, 3]));
  });
  assert.deepEqual(calls, [
    "https://api.github.com/repos/nowimhere3/FloppyDisk/actions/runs/42/artifacts?per_page=100",
    "https://api.github.com/repos/nowimhere3/FloppyDisk/actions/artifacts/9/zip",
  ]);
  assert.equal(result.artifactId, "9");
  assert.deepEqual(new Uint8Array(result.zipBytes), new Uint8Array([1, 2, 3]));
});

test("missing expected artifact fails safely before download", async () => {
  let calls = 0;
  await assert.rejects(
    downloadResultArtifact("token", "42", async () => {
      calls += 1;
      return Response.json({ artifacts: [{ id: 8, name: "other" }] });
    }),
    /result artifact missing/,
  );
  assert.equal(calls, 1);
});

test("artifact deletion uses only the fixed artifact endpoint", async () => {
  let call;
  await deleteResultArtifact("token", "9", async (url, options) => {
    call = { url, options };
    return new Response(null, { status: 204 });
  });
  assert.equal(call.url, "https://api.github.com/repos/nowimhere3/FloppyDisk/actions/artifacts/9");
  assert.equal(call.options.method, "DELETE");
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
