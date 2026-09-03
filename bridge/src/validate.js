export const MAX_REQUEST_BYTES = 32 * 1024;
export const MAX_TARGETS = 50;

/*
BREADCRUMBS - WAS: The temporary development key protected /run while the backend seam was being proven.
BREADCRUMBS - IS: Anonymous admission is bounded before GitHub work by byte, URL-count, host, rate, and concurrency checks.
BREADCRUMBS - WILL BE: Stronger abuse controls require evidence; this boundary must stay independent of the frozen parser.
*/
export async function readAndValidateTargets(request) {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { error: "That file is too large." };
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_REQUEST_BYTES) return { error: "That file is too large." };

  if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return { error: "Please submit a JSON request.", status: 415 };
  }

  let body;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return { error: "Please choose a valid text file." };
  }
  if (typeof body?.targets !== "string") return { error: "Please choose a valid text file." };

  const targets = body.targets.split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));
  if (targets.length > MAX_TARGETS) return { error: "Please submit no more than 50 URLs." };
  if (targets.length === 0 || targets.some(target => !isSafeTarget(target))) {
    return { error: "That file contains an invalid or unsafe URL." };
  }
  return { targets: body.targets };
}

function isSafeTarget(target) {
  let url;
  try {
    url = new URL(target);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    return false;
  }
  if (hostname.includes(":") || isIPv4(hostname)) return false;
  return true;
}

function isIPv4(hostname) {
  const parts = hostname.split(".");
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
