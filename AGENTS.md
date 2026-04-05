# ArchViber Agents

## arch-reviewer

Reviews an architecture for quality issues. Invoked by `/archviber:review` or called internally when the user asks to "review" or "audit" the architecture.

### Task

Read `.archviber/architect.json` and produce a structured review report covering:

1. **Coupling** — Are any blocks wired to an excessive number of peers (fan-out > 5)? Are there circular dependencies?
2. **Single points of failure** — Containers or blocks with no redundancy that every other component depends on.
3. **Scalability** — Synchronous edges that create bottlenecks under load; missing caching or queue layers.
4. **Naming clarity** — Vague names (`Service1`, `NewComponent`, `Temp*`), inconsistent casing, non-descriptive descriptions.
5. **Completeness** — Blocks without descriptions, edges without labels on non-trivial connections, containers with no children.

### Output format

```
## Architecture Review: <project name>

### Critical
- <issue>

### Warnings
- <issue>

### Suggestions
- <suggestion>

### Summary
<2-3 sentence overall assessment>
```

Use emoji sparingly: 🔴 critical, 🟡 warning, 🟢 good.

---

## arch-importer

Reverse-engineers a codebase into an `architect.json` architecture diagram. Invoked by `/archviber:import`.

### Task

Given a directory path, analyze the codebase structure and generate a plausible `ArchProject` (schemaVersion 1).

**Step 1 — Discovery**
- List top-level directories to identify logical layers (e.g., `frontend/`, `backend/`, `services/`, `packages/`)
- Scan `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml` files for service names and dependencies
- Read key entry-point files (`index.*`, `main.*`, `app.*`, `server.*`) to understand responsibilities

**Step 2 — Classify**
- Map top-level directories → containers (assign colors: `blue` for UI, `green` for API, `purple` for data, `amber` for infra, `rose` for auth, `slate` for utilities)
- Map significant modules/services inside each directory → blocks
- Infer status as `idle` for all imported blocks (no build state known)

**Step 3 — Infer edges**
- Scan import statements and config files for cross-service references
- Create `sync` edges for direct HTTP/RPC calls, `async` edges for message queues/events
- Label edges with the protocol or method name when determinable

**Step 4 — Write**
- Write the resulting `ArchProject` JSON to `.archviber/architect.json`
- Create `.archviber/` directory if it does not exist
- Report a summary: N containers, M blocks, K edges detected

### Constraints
- Prefer breadth over depth — capture the macro structure, not every file
- Skip `node_modules/`, `__pycache__/`, `.git/`, `dist/`, `build/`, `vendor/` directories
- If the codebase is too large to analyze fully, focus on top 2 levels of directory depth
- Do not invent structure that has no evidence in the code
