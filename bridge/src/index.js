import { createCapability } from "./capability.js";
import { verifyCapability } from "./capability.js";
import { extractLinksText } from "./artifact.js";
import {
  deleteResultArtifact,
  dispatchWorkflow,
  downloadResultArtifact,
  getWorkflowRun,
  GitHubDispatchError,
} from "./github.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export function createWorker({
  dispatch = dispatchWorkflow,
  getRun = getWorkflowRun,
  downloadArtifact = downloadResultArtifact,
  deleteArtifact = deleteResultArtifact,
  extractLinks = extractLinksText,
} = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (!env?.FLOPPYDISK_DEV_KEY ||
          request.headers.get("X-FloppyDisk-Dev-Key") !== env.FLOPPYDISK_DEV_KEY) {
        return jsonError(401);
      }

      if (!env.GITHUB_TOKEN || !env.FLOPPYDISK_CAPABILITY_SECRET) {
        return jsonError(500);
      }

      try {
        if (request.method === "POST" && url.pathname === "/run") {
          return await handleRun(request, env, dispatch);
        }
        if (request.method === "GET" && (url.pathname === "/status" || url.pathname === "/result")) {
          const capability = await authorizedCapability(request, env.FLOPPYDISK_CAPABILITY_SECRET);
          if (!capability) return jsonError(401);
          const state = await getRun(env.GITHUB_TOKEN, capability.runId);
          if (url.pathname === "/status") {
            return jsonResponse(state);
          }
          if (state.status !== "completed") return jsonError(409, "not ready");
          if (state.conclusion !== "success") return jsonError(409, "job failed");
          const artifact = await downloadArtifact(env.GITHUB_TOKEN, capability.runId);
          const links = extractLinks(artifact.zipBytes);
          await deleteArtifact(env.GITHUB_TOKEN, artifact.artifactId);
          return new Response(links, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
        return jsonError(404);
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

async function handleRun(request, env, dispatch) {
  if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return jsonError(415);
  }
  let targets;
  try {
    const body = await request.json();
    if (typeof body?.targets !== "string") return jsonError(400);
    targets = body.targets;
  } catch {
    return jsonError(400);
  }
  const runId = await dispatch(env.GITHUB_TOKEN, encodeUtf8Base64(targets));
  return jsonResponse(await createCapability(runId, env.FLOPPYDISK_CAPABILITY_SECRET));
}

async function authorizedCapability(request, secret) {
  const match = /^Bearer ([^\s]+)$/.exec(request.headers.get("Authorization") ?? "");
  return match ? verifyCapability(match[1], secret) : null;
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

export function encodeUtf8Base64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function jsonError(status, error = "request failed") {
  return jsonResponse({ error }, status);
}

export default createWorker();
