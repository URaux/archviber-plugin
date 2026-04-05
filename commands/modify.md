---
description: "Add, edit, or remove nodes and edges using natural language"
argument-hint: "<natural language instruction>"
allowed-tools: [Read, Write, Glob]
---

Apply a structural change to the architecture in `.archviber/architect.json` based on the user's natural language instruction.

## Steps

1. Read `.archviber/architect.json`. If it does not exist, tell the user to run `/archviber:new` first.

2. Parse the instruction from `$ARGUMENTS` and determine the operation type:

### Operation types

**Add a container**
Trigger phrases: "add a ... layer", "create a ... group", "new container"
- Create an `ArchContainer` node with `type: "container"`.
- Infer a suitable `color` from the name (e.g., "web" / "frontend" → `blue`, "api" / "backend" → `green`, "data" / "database" → `purple`, "infra" / "queue" → `amber`, "auth" → `rose`, everything else → `slate`).
- Generate an `id` from the name in `kebab-case`.

**Add a block**
Trigger phrases: "add a ...", "create a ...", "include a ..."
- Create an `ArchBlock` with `type: "block"`, `status: "idle"`.
- If a container is named (e.g., "add a Redis cache in the Data Layer"), set `parentId` to that container's `id`. Search by container name case-insensitively.
- Set `description` to a short inferred description if not provided by the user.
- Set `techStack` if the user names a technology.

**Edit a node**
Trigger phrases: "rename ...", "change ... to ...", "update the ... status", "set ... color"
- Find the node by name (case-insensitive substring match, prefer exact).
- Apply the change to the matching field(s).

**Remove a node**
Trigger phrases: "remove ...", "delete ...", "drop the ..."
- Remove the node from `nodes[]`.
- Also remove all edges where `source` or `target` matches the removed node's `id`.
- If the removed node is a container, also remove all blocks whose `parentId` matches.

**Connect two nodes (add edge)**
Trigger phrases: "connect ... to ...", "link ... with ...", "... calls ...", "... → ..."
- Create an `ArchEdge` with `id` derived from `<source-id>-<target-id>`.
- Infer `type` from context: "REST", "HTTP", "RPC", "calls" → `sync`; "event", "queue", "pub/sub", "kafka", "async" → `async`; "two-way", "bidirectional" → `bidirectional`. Default to `sync`.
- Set `label` to the protocol or description if the user provides one (e.g., "connect API Gateway to User Service with REST" → label: "REST").
- Resolve source/target by matching node names case-insensitively.

**Remove an edge**
Trigger phrases: "disconnect ... from ...", "remove the edge between ...", "unlink ..."
- Find and remove matching edge(s).

3. Apply the change to the parsed `ArchProject` object.

4. Write the updated object back to `.archviber/architect.json` (pretty-print, 2-space indent).

5. Confirm the change concisely. Examples:
   - `Added block "Redis Cache" to container "Data Layer".`
   - `Added edge: API Gateway ──sync──→ User Service (REST).`
   - `Removed "Legacy Adapter" and 2 connected edges.`
   - `Renamed "Old Name" → "New Name".`

## Examples of valid instructions

- `add a Redis cache in the Data Layer`
- `connect API Gateway to User Service with REST`
- `remove the Legacy Adapter`
- `rename Express Gateway to API Gateway`
- `set User Service status to done`
- `add a Web Layer container (blue)`
- `link Message Queue to Notification Service async`
- `add a PostgreSQL database in the Data Layer with techStack PostgreSQL`

## Error handling

- If a referenced node cannot be found, tell the user which name wasn't matched and list existing node names.
- If the instruction is ambiguous (multiple possible matches), ask for clarification.
- Never invent node IDs that conflict with existing ones.
