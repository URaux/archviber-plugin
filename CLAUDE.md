# ArchViber Plugin

Manages software architecture diagrams stored in `.archviber/architect.json` inside the current project.

## Data File

Path: `.archviber/architect.json` (relative to project root, i.e., `$PWD/.archviber/architect.json`)

When operating on architecture data:
1. Read `.archviber/architect.json` and parse as JSON
2. Apply the requested change
3. Write the updated JSON back to the same path (pretty-print, 2-space indent)

## Schema (schemaVersion: 1)

```ts
ArchProject {
  schemaVersion: 1
  name: string
  nodes: ArchNode[]          // containers and blocks mixed
  edges: ArchEdge[]
  decisions?: DesignDecision[]
}
```

### Node types

| type | key fields |
|------|-----------|
| `container` | `id`, `type:"container"`, `name`, `color`, `collapsed?` |
| `block` | `id`, `type:"block"`, `parentId?` (container id), `name`, `description`, `status`, `techStack?`, `summary?`, `errorMessage?` |

Container colors: `blue` `green` `purple` `amber` `rose` `slate`

Block statuses: `idle` `waiting` `building` `done` `error` `blocked`

### Edge types

| type | semantics |
|------|-----------|
| `sync` | synchronous call (solid arrow →) |
| `async` | async / event-driven (dashed arrow -->) |
| `bidirectional` | two-way communication (↔) |

Edge fields: `id`, `source` (node id), `target` (node id), `type`, `label?`

### Design decisions (Phase 4)

`decisions[]` entries have: `id`, `title`, `context`, `options[]`, `chosen`, `rationale`, `date` (ISO), `status` (`active`|`superseded`|`deprecated`), `supersededBy?`

## ID generation

Generate ids as `kebab-case` derived from the name, e.g. `"API Gateway"` → `"api-gateway"`. Append `-2`, `-3` etc. to avoid collisions.

## Mutual exclusion

The Web UI (`/archviber:open`) and CC slash commands both write `architect.json`. Do NOT run CC commands while the Web UI is open — the last writer wins and changes will be lost.
