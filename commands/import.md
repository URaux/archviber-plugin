---
description: "Reverse-engineer codebase structure into architect.json"
argument-hint: "[path]"
allowed-tools: [Read, Write, Bash, Glob, Grep]
---

Scan a codebase and generate `.archviber/architect.json` from the directory structure, package manifests, and import patterns.

## Steps

1. Determine the target path:
   - If `$ARGUMENTS` is non-empty, use it as the scan root.
   - Otherwise, use the current directory (`.`).

2. Check if `.archviber/architect.json` already exists.
   - If it exists, warn the user: "This will overwrite the existing architect.json. Proceeding."
   - Continue regardless (no blocking prompt — the user invoked the command intentionally).

3. Delegate to the `arch-importer` agent (defined in `AGENTS.md`) with the resolved path.

   The agent will:
   - Discover top-level directory structure (skip `node_modules`, `.git`, `dist`, `build`, `vendor`, `__pycache__`, `.next`, `coverage`)
   - Read package manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`) to identify service names and tech stacks
   - Read entry-point files (`index.*`, `main.*`, `app.*`, `server.*`) to understand responsibilities
   - Classify directories into containers with appropriate colors
   - Infer edges from import statements, config references, and environment variables
   - Write `.archviber/architect.json`

4. After the agent completes, read the written file and run `/archviber:show` output so the user sees the result immediately.

5. Report summary: `Imported: N containers, M blocks, K edges.`

## Color assignment heuristic

| Directory pattern | Color |
|-------------------|-------|
| `frontend`, `web`, `ui`, `client`, `app` | `blue` |
| `backend`, `api`, `server`, `gateway`, `service*` | `green` |
| `db`, `data`, `database`, `store`, `cache` | `purple` |
| `infra`, `queue`, `worker`, `jobs`, `messaging` | `amber` |
| `auth`, `security`, `identity` | `rose` |
| everything else (`shared`, `utils`, `lib`, `scripts`) | `slate` |

## Constraints

- Do not invent nodes without evidence in the codebase.
- Prefer breadth over depth — capture macro structure (top 2 directory levels).
- Set all block statuses to `idle` (no build state is known from static analysis).
- If the path does not exist, report an error and stop.
