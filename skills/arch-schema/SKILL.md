---
name: arch-schema
description: Internal knowledge about the architect.json data format used by ArchViber plugin. Auto-triggered when CC operates on .archviber/architect.json files.
user-invocable: false
---

# architect.json Schema Reference

## File Location

```
<project-root>/.archviber/architect.json
```

Validated against: `<plugin-root>/schemas/architect.schema.json`

---

## Top-Level Structure: ArchProject

```json
{
  "schemaVersion": 1,
  "name": "My System",
  "nodes": [],
  "edges": [],
  "decisions": []
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schemaVersion` | `number` | yes | Always `1` for v1; used for future migration |
| `name` | `string` | yes | Human-readable project name |
| `nodes` | `ArchNode[]` | yes | Flat array of containers and blocks mixed together |
| `edges` | `ArchEdge[]` | yes | Connections between nodes |
| `decisions` | `DesignDecision[]` | no | Phase 4 extension — design decision records |
| `metadata` | `Record<string, unknown>` | no | Arbitrary key-value pairs for tooling use |

---

## Node Types

`nodes` is a **flat array** — containers and blocks are both stored at the top level. Containment is expressed via `parentId` on blocks, not by nesting.

### Container

Represents a logical grouping (layer, service boundary, domain).

```json
{
  "id": "api-layer",
  "type": "container",
  "name": "API Layer",
  "color": "green",
  "collapsed": false
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | yes | kebab-case, unique across all nodes |
| `type` | `"container"` | yes | Literal discriminant |
| `name` | `string` | yes | Display name |
| `color` | `ContainerColor` | yes | See color table below |
| `collapsed` | `boolean` | no | UI state: whether children are hidden |

### Block

Represents a concrete component, service, or module.

```json
{
  "id": "express-gateway",
  "type": "block",
  "parentId": "api-layer",
  "name": "Express Gateway",
  "description": "Handles routing and auth middleware",
  "status": "building",
  "techStack": "Node.js / Express",
  "summary": "Routes all inbound HTTP traffic",
  "errorMessage": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | yes | kebab-case, unique across all nodes |
| `type` | `"block"` | yes | Literal discriminant |
| `parentId` | `string` | no | ID of the container this block belongs to; omit for orphan blocks |
| `name` | `string` | yes | Display name |
| `description` | `string` | yes | What this component does |
| `status` | `BuildStatus` | yes | See status table below |
| `techStack` | `string` | no | Technology or framework used |
| `summary` | `string` | no | Short one-liner for display |
| `errorMessage` | `string` | no | Set when `status` is `"error"` |

---

## Container Colors

| Color | Hex (approx) | Typical Usage |
|-------|-------------|---------------|
| `blue` | #3b82f6 | Frontend / UI layer |
| `green` | #22c55e | API / backend services |
| `purple` | #a855f7 | Internal microservices / business logic |
| `amber` | #f59e0b | Data layer (databases, caches, queues) |
| `rose` | #f43f5e | External systems / third-party integrations |
| `slate` | #64748b | Miscellaneous / infrastructure / cross-cutting |

---

## Block Statuses

| Status | Meaning |
|--------|---------|
| `idle` | Not started; default state for new components |
| `waiting` | Blocked on a dependency, not yet actionable |
| `building` | Actively under development |
| `done` | Complete and verified |
| `error` | Failed; check `errorMessage` for details |
| `blocked` | Stalled; requires external action to unblock |

---

## Edge Types

```json
{
  "id": "gateway-to-cache",
  "source": "express-gateway",
  "target": "redis-cache",
  "type": "async",
  "label": "pub/sub"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | yes | kebab-case, unique across all edges |
| `source` | `string` | yes | ID of the source node |
| `target` | `string` | yes | ID of the target node |
| `type` | `ArchEdgeType` | yes | See edge type table below |
| `label` | `string` | no | Protocol, channel name, or short description |

| Edge Type | Render | Semantics |
|-----------|--------|-----------|
| `sync` | Solid arrow `→` | Synchronous call; caller waits for response (REST, gRPC, direct function) |
| `async` | Dashed arrow `-->` | Asynchronous / event-driven; fire-and-forget or message queue |
| `bidirectional` | Double arrow `↔` | Two-way communication (WebSocket, bidirectional stream) |

---

## ID Generation Rules

- Derive from the node name in kebab-case: `"API Gateway"` → `"api-gateway"`
- Strip special characters, lowercase, replace spaces with `-`
- On collision, append `-2`, `-3`, etc.: `"auth-service-2"`
- IDs must be unique across **both** nodes and edges (separate namespaces are fine but avoid reuse)

---

## Design Decisions (Phase 4 Extension)

`decisions[]` is optional and ignored by Phase 1–3 tooling.

```json
{
  "id": "use-postgres",
  "title": "Use PostgreSQL over MongoDB",
  "context": "Need ACID transactions for financial records",
  "options": ["PostgreSQL", "MongoDB", "CockroachDB"],
  "chosen": "PostgreSQL",
  "rationale": "Team familiarity + strong ACID guarantees outweigh document flexibility needs",
  "date": "2026-04-03",
  "status": "active",
  "supersededBy": null
}
```

Decision `status` values: `active` | `superseded` | `deprecated`

---

## Full Example

```json
{
  "schemaVersion": 1,
  "name": "E-Commerce Platform",
  "nodes": [
    { "id": "web-layer", "type": "container", "name": "Web Layer", "color": "blue" },
    { "id": "react-app", "type": "block", "parentId": "web-layer", "name": "React App", "description": "Customer-facing SPA", "status": "done", "techStack": "React 18" },
    { "id": "api-layer", "type": "container", "name": "API Layer", "color": "green" },
    { "id": "express-gateway", "type": "block", "parentId": "api-layer", "name": "Express Gateway", "description": "REST API + auth middleware", "status": "building", "techStack": "Node.js / Express" },
    { "id": "data-layer", "type": "container", "name": "Data Layer", "color": "amber" },
    { "id": "postgres-db", "type": "block", "parentId": "data-layer", "name": "PostgreSQL", "description": "Primary relational database", "status": "done", "techStack": "PostgreSQL 15" }
  ],
  "edges": [
    { "id": "app-to-gateway", "source": "react-app", "target": "express-gateway", "type": "sync", "label": "REST" },
    { "id": "gateway-to-db", "source": "express-gateway", "target": "postgres-db", "type": "sync", "label": "SQL" }
  ]
}
```
