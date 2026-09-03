import { createCapability } from "./capability.js";
import { verifyCapability } from "./capability.js";
import { extractLinksText } from "./artifact.js";
import {
  countInFlightRuns,
  deleteResultArtifact,
  dispatchWorkflow,
  downloadResultArtifact,
  getWorkflowRun,
  GitHubDispatchError,
} from "./github.js";
import { readAndValidateTargets } from "./validate.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export function createWorker({
  dispatch = dispatchWorkflow,
  getRun = getWorkflowRun,
  downloadArtifact = downloadResultArtifact,
  deleteArtifact = deleteResultArtifact,
  extractLinks = extractLinksText,
  countInFlight = countInFlightRuns,
  statusCache = globalThis.caches?.default,
} = {}) {
  return {
    async fetch(request, env) {
      const response = await route(request, env, {
        dispatch, getRun, downloadArtifact, deleteArtifact, extractLinks, countInFlight, statusCache,
      });
      return withCors(response, request, env.FRONTEND_ORIGIN);
    },
  };
}

async function route(request, env, operations) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return preflight(request, env.FRONTEND_ORIGIN);
  if (!env?.GITHUB_TOKEN || !env.FLOPPYDISK_CAPABILITY_SECRET) return jsonError(500);
  try {
    if (request.method === "POST" && url.pathname === "/run") {
      return await handleRun(request, env, operations);
    }
    if (request.method === "GET" && (url.pathname === "/status" || url.pathname === "/result")) {
      return await handleJobRequest(request, url.pathname, env, operations);
    }
    return jsonError(404);
  } catch (error) {
    logSafeError(error);
    return jsonError(502);
  }
}

async function handleRun(request, env, { dispatch, countInFlight }) {
  const validation = await readAndValidateTargets(request);
  if (validation.error) return jsonError(validation.status ?? 400, validation.error);

  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp || !env.SUBMISSION_RATE_LIMITER) return jsonError(503, "FloppyDisk is unavailable. Try again soon.");
  const admission = await env.SUBMISSION_RATE_LIMITER.limit({ key: clientIp });
  if (!admission.success) return jsonError(429, "You've submitted too recently. Try again in a minute.");

  if (await countInFlight(env.GITHUB_TOKEN) >= 3) {
    return jsonError(503, "FloppyDisk is busy. Try again in a moment.");
  }
  const runId = await dispatch(env.GITHUB_TOKEN, encodeUtf8Base64(validation.targets));
  return jsonResponse(await createCapability(runId, env.FLOPPYDISK_CAPABILITY_SECRET));
}

async function handleJobRequest(request, pathname, env, operations) {
  const capability = await authorizedCapability(request, env.FLOPPYDISK_CAPABILITY_SECRET);
  if (!capability) return jsonError(401);
  const state = pathname === "/status"
    ? await cachedStatus(env.GITHUB_TOKEN, capability.runId, operations.getRun, operations.statusCache)
    : await operations.getRun(env.GITHUB_TOKEN, capability.runId);
  if (pathname === "/status") {
    return jsonResponse(state, 200, { "Cache-Control": "private, max-age=5" });
  }
  if (state.status !== "completed") return jsonError(409, "Your links are not ready yet.");
  if (state.conclusion !== "success") return jsonError(409, "FloppyDisk could not complete this job.");
  const artifact = await operations.downloadArtifact(env.GITHUB_TOKEN, capability.runId);
  const links = operations.extractLinks(artifact.zipBytes);
  await operations.deleteArtifact(env.GITHUB_TOKEN, artifact.artifactId);
  return new Response(links, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function cachedStatus(githubToken, runId, getRun, cache) {
  if (!cache) return getRun(githubToken, runId);
  const key = new Request(`https://status-cache.floppydisk.invalid/${runId}`);
  const cached = await cache.match(key);
  if (cached) return cached.json();
  const state = await getRun(githubToken, runId);
  await cache.put(key, jsonResponse(state, 200, { "Cache-Control": "max-age=5" }));
  return state;
}

async function authorizedCapability(request, secret) {
  const match = /^Bearer ([^\s]+)$/.exec(request.headers.get("Authorization") ?? "");
  return match ? verifyCapability(match[1], secret) : null;
}

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), { status, headers: { ...JSON_HEADERS, ...headers } });
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

function preflight(request, allowedOrigin) {
  const origin = request.headers.get("Origin");
  const method = request.headers.get("Access-Control-Request-Method");
  const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") ?? "")
    .toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
  const allowedHeaders = new Set(["authorization", "content-type"]);
  if (origin !== allowedOrigin || !["GET", "POST"].includes(method) ||
      requestedHeaders.some(header => !allowedHeaders.has(header))) {
    return jsonError(403, "This website is not allowed to use FloppyDisk.");
  }
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  } });
}

function withCors(response, request, allowedOrigin) {
  if (request.headers.get("Origin") === allowedOrigin && !response.headers.has("Access-Control-Allow-Origin")) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.append("Vary", "Origin");
  }
  return response;
}

function logSafeError(error) {
  if (error instanceof GitHubDispatchError) {
    console.error("github_operation_failed", {
      upstreamStatus: error.status,
      requestId: error.requestId,
      category: error.category,
    });
  } else {
    console.error("bridge_operation_failed", { category: error?.name ?? "unknown" });
  }
}

export default createWorker();
