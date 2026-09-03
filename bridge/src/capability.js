const VERSION = 1;
const DEFAULT_TTL_SECONDS = 15 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function createCapability(runId, secret, options = {}) {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const payload = { v: VERSION, runId: String(runId), exp: now + ttlSeconds };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, secret);
  return {
    jobToken: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export async function verifyCapability(jobToken, secret, options = {}) {
  try {
    const [encodedPayload, signature, extra] = String(jobToken).split(".");
    if (!encodedPayload || !signature || extra !== undefined) return null;
    const expected = await sign(encodedPayload, secret);
    if (!equalBytes(fromBase64Url(signature), fromBase64Url(expected))) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload)));
    const now = options.now ?? Math.floor(Date.now() / 1000);
    if (payload.v !== VERSION || !/^[1-9][0-9]*$/.test(payload.runId) ||
        !Number.isInteger(payload.exp) || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid base64url");
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}
