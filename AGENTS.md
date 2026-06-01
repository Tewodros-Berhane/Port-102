# AGENTS.md

## 1. Commit Rules

- Every commit must be non-empty.
- Every commit must include a real source, test, configuration, infrastructure, or tooling change.
- Do not create documentation-only commits.
- Do not stage or commit documentation and instruction-tracking files such as `AGENTS.md`, `tree.md`, or docs-only updates unless the user explicitly overrides this rule for a specific commit.
- Keep local tracking documents uncommitted by default.

## 2. Branch Rules

- Do not create or push new branches unless the user explicitly asks for a new branch.
- When the user asks to commit and push, commit on the current branch and push that branch.
