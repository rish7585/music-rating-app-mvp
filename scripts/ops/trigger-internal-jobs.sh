#!/usr/bin/env bash

set -euo pipefail

WORKFLOW_FILE="internal-jobs.yml"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required but not installed." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

echo "Checking for workflow: ${WORKFLOW_FILE}"
if ! gh workflow view "${WORKFLOW_FILE}" >/dev/null 2>&1; then
  echo "Workflow ${WORKFLOW_FILE} is not available on GitHub yet." >&2
  echo "Commit and push current branch, then try again." >&2
  exit 1
fi

echo "Dispatching workflow: ${WORKFLOW_FILE}"
gh workflow run "${WORKFLOW_FILE}"

echo "Fetching latest run id..."
RUN_ID="$(gh run list --workflow "${WORKFLOW_FILE}" --limit 1 --json databaseId --jq '.[0].databaseId')"

if [[ -z "${RUN_ID}" ]]; then
  echo "Workflow dispatched, but no run ID was found yet. Check GitHub Actions UI." >&2
  exit 0
fi

echo "Watching run ${RUN_ID}"
gh run watch "${RUN_ID}"

echo "Done. If successful, both internal job triggers ran."