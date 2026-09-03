const DISPATCH_URL =
  "https://api.github.com/repos/nowimhere3/FloppyDisk/actions/workflows/extract-links.yml/dispatches";

export async function dispatchWorkflow(githubToken, fetchImpl = fetch) {
  const response = await fetchImpl(DISPATCH_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "User-Agent": "FloppyDisk-Trigger-Bridge",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    body: JSON.stringify({ ref: "main", return_run_details: true }),
  });

  if (!response.ok) {
    throw new GitHubDispatchError(
      response.status,
      response.headers.get("x-github-request-id"),
      await sanitizedGitHubMessage(response),
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

async function sanitizedGitHubMessage(response) {
  try {
    const body = await response.json();
    if (typeof body?.message !== "string") return "github error";
    return body.message.replace(/https?:\/\/\S+/gi, "[url removed]").slice(0, 160);
  } catch {
    return "github error";
  }
}
