import { createCapability } from "./capability.js";
import { dispatchWorkflow, GitHubDispatchError } from "./github.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export function createWorker({ dispatch = dispatchWorkflow } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method !== "POST" || url.pathname !== "/run") {
        return jsonError(404);
      }

      if (!env?.FLOPPYDISK_DEV_KEY ||
          request.headers.get("X-FloppyDisk-Dev-Key") !== env.FLOPPYDISK_DEV_KEY) {
        return jsonError(401);
      }

      if (!env.GITHUB_TOKEN || !env.FLOPPYDISK_CAPABILITY_SECRET) {
        return jsonError(500);
      }

      try {
        const runId = await dispatch(env.GITHUB_TOKEN);
        const result = await createCapability(runId, env.FLOPPYDISK_CAPABILITY_SECRET);
        return new Response(JSON.stringify(result), { status: 200, headers: JSON_HEADERS });
      } catch (error) {
        if (error instanceof GitHubDispatchError) {
          console.error("github_dispatch_failed", {
            upstreamStatus: error.status,
            requestId: error.requestId,
            category: error.category,
          });
        } else {
          console.error("bridge_operation_failed", { category: error?.name ?? "unknown" });
        }
        return jsonError(502);
      }
    },
  };
}

function jsonError(status) {
  return new Response(JSON.stringify({ error: "request failed" }), {
    status,
    headers: JSON_HEADERS,
  });
}

export default createWorker();
