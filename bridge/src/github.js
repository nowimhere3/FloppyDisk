const DISPATCH_URL =
  "https://api.github.com/repos/nowimhere3/FloppyDisk/actions/workflows/extract-links.yml/dispatches";

export async function dispatchWorkflow(githubToken, targetsBase64, fetchImpl = fetch) {
  const response = await fetchImpl(DISPATCH_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "User-Agent": "FloppyDisk-Trigger-Bridge",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    body: JSON.stringify({
      ref: "main",
      return_run_details: true,
      inputs: { targets_b64: targetsBase64 },
    }),
  });

  if (!response.ok) {
    throw new GitHubDispatchError(
      response.status,
      response.headers.get("x-github-request-id"),
      sanitizedGitHubCategory(response.status),
    );
  }

  const details = await response.json();
  if (!isUsableRunId(details?.workflow_run_id)) {
    throw new GitHubDispatchError(response.status, response.headers.get("x-github-request-id"), "missing workflow run id");
  }
  return String(details.workflow_run_id);
}

function isUsableRunId(value) {
  return (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ||
    (typeof value === "string" && /^[1-9][0-9]*$/.test(value));
}

export class GitHubDispatchError extends Error {
  constructor(status, requestId = null, category = "dispatch failed") {
    super(category);
    this.name = "GitHubDispatchError";
    this.status = status;
    this.requestId = requestId;
    this.category = category;
  }
}

function sanitizedGitHubCategory(status) {
  if (status === 401) return "github authentication failed";
  if (status === 403) return "github access denied";
  if (status === 404) return "github resource not found";
  if (status === 422) return "github validation failed";
  if (status >= 500) return "github server error";
  return "github request failed";
}
