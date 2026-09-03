import { STATES, transition } from "./state.js";

export const API_URL = "https://floppydisk-trigger-bridge.ddmcalorum.workers.dev";
export const POLL_INTERVAL_MS = 5000;
export const SESSION_KEY = "floppydisk-active-job";

/*
BREADCRUMBS - WAS: Early development used a temporary key and examples containing raw run IDs.
BREADCRUMBS - IS: The browser holds only a signed jobToken and sends it as Bearer authorization.
BREADCRUMBS - WILL BE: Never adopt GitHub run IDs or privileged credentials in frontend code.
*/
export async function submitTargets(targets, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targets }),
  });
  if (!response.ok) throw new Error(await safeError(response));
  const body = await response.json();
  if (typeof body?.jobToken !== "string" || typeof body?.expiresAt !== "string") throw new Error("Something went wrong. Try again.");
  return { jobToken: body.jobToken, expiresAt: body.expiresAt };
}

export async function fetchJobStatus(jobToken, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_URL}/status`, {
    headers: { Authorization: `Bearer ${jobToken}` },
  });
  if (!response.ok) throw new Error(await safeError(response));
  return response.json();
}

/*
BREADCRUMBS - WAS: links.txt was downloaded manually from a workflow artifact.
BREADCRUMBS - IS: The Worker response becomes a Blob and is downloaded without parsing or rewriting.
BREADCRUMBS - WILL BE: Presentation changes must never mutate result bytes.
*/
export async function fetchResultBlob(jobToken, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_URL}/result`, {
    headers: { Authorization: `Bearer ${jobToken}` },
  });
  if (!response.ok) throw new Error(await safeError(response));
  return response.blob();
}

export function inspectTargets(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"));
  const usable = lines.filter(line => {
    try {
      return ["http:", "https:"].includes(new URL(line).protocol);
    } catch {
      return false;
    }
  });
  if (usable.length === 0) return { error: "That file doesn't seem to contain any web addresses." };
  if (usable.length > 50) return { error: "Too many addresses. Try 50 or fewer." };
  return { count: usable.length };
}

export async function readSelectedFile(file) {
  const text = await file.text();
  const inspection = inspectTargets(text);
  if (inspection.error) throw new Error(inspection.error);
  return { file, text, filename: file.name || "selected.txt", targetCount: inspection.count };
}

/*
BREADCRUMBS - WAS: A page interruption could lose an active polling session.
BREADCRUMBS - IS: Only the active capability, expiry, and start time live in per-tab sessionStorage.
BREADCRUMBS - WILL BE: Persistent history or accounts require a new architecture decision.
*/
export function saveContinuation(storage, continuation) {
  storage.setItem(SESSION_KEY, JSON.stringify({
    jobToken: continuation.jobToken,
    expiresAt: continuation.expiresAt,
    startedAt: continuation.startedAt,
  }));
}

export function loadContinuation(storage, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(SESSION_KEY));
    if (typeof value?.jobToken !== "string" || typeof value?.startedAt !== "number" ||
        !Number.isFinite(Date.parse(value?.expiresAt)) || Date.parse(value.expiresAt) <= now) {
      storage.removeItem(SESSION_KEY);
      return null;
    }
    return value;
  } catch {
    storage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearContinuation(storage) {
  storage.removeItem(SESSION_KEY);
}

async function safeError(response) {
  try {
    const body = await response.json();
    return typeof body?.error === "string" && body.error !== "request failed"
      ? body.error
      : "Something went wrong. Try again.";
  } catch {
    return "Something went wrong. Try again.";
  }
}

/*
BREADCRUMBS - WAS: No progress interface existed.
BREADCRUMBS - IS: Lifecycle state is honest and indeterminate because the backend exposes no target progress.
BREADCRUMBS - WILL BE: Numeric progress requires a real backend progress channel, not frontend simulation.
*/
export function createApp({ document, storage, fetchImpl = fetch, clock = Date, schedule = setTimeout }) {
  let state = { name: STATES.EMPTY };
  let continuation = null;
  let selectedText = null;
  let pollTimer = null;

  const elements = {
    drop: document.querySelector("#drop-zone"),
    input: document.querySelector("#file-input"),
    choose: document.querySelector("#choose-file"),
    change: document.querySelector("#change-file"),
    start: document.querySelector("#start"),
    retry: document.querySelector("#retry"),
    another: document.querySelector("#another"),
    download: document.querySelector("#download"),
    elapsed: document.querySelector("#elapsed"),
    status: document.querySelector("#live-status"),
  };

  function setState(event) {
    state = transition(state, event);
    render();
  }

  function render() {
    for (const section of document.querySelectorAll("[data-state]")) section.hidden = section.dataset.state !== state.name;
    if (state.name === STATES.READY) {
      document.querySelector("#filename").textContent = state.filename;
      document.querySelector("#target-count").textContent = `${state.targetCount} address${state.targetCount === 1 ? "" : "es"} ready`;
      elements.status.textContent = `${state.filename} is ready.`;
    } else if (state.name === STATES.WORKING) {
      document.querySelector("#working-copy").textContent = state.phase === "queued" ? "Waiting for a turn…" : "Finding image links…";
      elements.status.textContent = document.querySelector("#working-copy").textContent;
    } else if (state.name === STATES.SUCCESS) {
      elements.status.textContent = "Your links are ready to download.";
    } else if (state.name === STATES.ERROR) {
      document.querySelector("#error-message").textContent = state.message;
      elements.status.textContent = state.message;
    }
  }

  async function acceptFile(file) {
    try {
      const selected = await readSelectedFile(file);
      selectedText = selected.text;
      setState({ type: "FILE_READY", ...selected });
    } catch (error) {
      setState({ type: "FAIL", message: error.message });
    }
  }

  async function start() {
    if (state.name !== STATES.READY) return;
    const startedAt = clock.now();
    setState({ type: "START", startedAt });
    try {
      const job = await submitTargets(selectedText, fetchImpl);
      selectedText = null;
      continuation = { ...job, startedAt };
      saveContinuation(storage, continuation);
      await poll();
    } catch (error) {
      fail(error.message);
    }
  }

  async function poll() {
    try {
      const result = await fetchJobStatus(continuation.jobToken, fetchImpl);
      if (result.status === "completed") {
        if (result.conclusion !== "success") return fail("FloppyDisk couldn't finish that job. Try again.");
        const blob = await fetchResultBlob(continuation.jobToken, fetchImpl);
        clearContinuation(storage);
        continuation = null;
        return setState({ type: "COMPLETE", result: blob });
      }
      setState({ type: "PROGRESS", phase: result.status === "queued" ? "queued" : "working" });
      pollTimer = schedule(poll, POLL_INTERVAL_MS);
    } catch (error) {
      if (clock.now() >= Date.parse(continuation.expiresAt)) return fail("This job expired. Please start again.");
      elements.status.textContent = "Connection interrupted. Checking again soon…";
      pollTimer = schedule(poll, POLL_INTERVAL_MS * 2);
    }
  }

  function fail(message) {
    clearContinuation(storage);
    continuation = null;
    setState({ type: "FAIL", message });
  }

  function reset() {
    if (pollTimer) clearTimeout(pollTimer);
    clearContinuation(storage);
    continuation = null;
    selectedText = null;
    elements.input.value = "";
    setState({ type: "RESET" });
  }

  elements.choose.addEventListener("click", () => elements.input.click());
  elements.change.addEventListener("click", () => elements.input.click());
  elements.input.addEventListener("change", () => elements.input.files[0] && acceptFile(elements.input.files[0]));
  elements.start.addEventListener("click", start);
  elements.retry.addEventListener("click", reset);
  elements.another.addEventListener("click", reset);
  elements.download.addEventListener("click", () => {
    const url = URL.createObjectURL(state.result);
    const link = document.createElement("a");
    link.href = url;
    link.download = "links.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  for (const eventName of ["dragenter", "dragover"]) elements.drop.addEventListener(eventName, event => {
    event.preventDefault();
    elements.drop.classList.add("is-dragging");
  });
  for (const eventName of ["dragleave", "drop"]) elements.drop.addEventListener(eventName, event => {
    event.preventDefault();
    elements.drop.classList.remove("is-dragging");
  });
  elements.drop.addEventListener("drop", event => event.dataTransfer.files[0] && acceptFile(event.dataTransfer.files[0]));

  const saved = loadContinuation(storage, clock.now());
  if (saved) {
    continuation = saved;
    setState({ type: "RESUME", startedAt: saved.startedAt });
    poll();
  } else {
    render();
  }
  setInterval(() => {
    if (state.name === STATES.WORKING) elements.elapsed.textContent = `${Math.max(0, Math.floor((clock.now() - state.startedAt) / 1000))}s elapsed`;
  }, 1000);

  return { getState: () => state, acceptFile, start };
}

if (typeof document !== "undefined") createApp({ document, storage: sessionStorage });
