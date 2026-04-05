---
description: "Display the architecture as a tree view or Mermaid diagram"
argument-hint: "[--mermaid]"
allowed-tools: [Read, Glob]
---

Read and render the architecture from `.archviber/architect.json`.

## Steps

1. Read `.archviber/architect.json`. If it does not exist, tell the user to run `/archviber:new` first.

2. Parse the JSON as an `ArchProject`.

3. Check `$ARGUMENTS`:
   - If `--mermaid` is present → render as **Mermaid graph** (see below).
   - Otherwise → render as **tree view** (default).

---

## Tree view format

```
<project name> (schemaVersion: <N>)
├── [<Container Name>] (<color>)
│   ├── <Block Name> ── <status>
│   └── <Block Name> ── <status>  ── <N> decision(s)   ← only if decisions linked
├── [<Container Name>] (<color>)
│   └── <Block Name> ── <status>
└── (uncontained blocks)
    └── <Block Name> ── <status>
└── Edges:
    <Source> ──sync──→ <Target> ("<label>")
    <Source> ──async──→ <Target> ("<label>")
    <Source> ──↔──→ <Target> ("<label>")
```

Rules:
- Group blocks under their parent container using `parentId`.
- Blocks without a `parentId` appear under "(uncontained blocks)".
- If `decisions[]` exists, count decisions per node and append `── N decision(s)` to blocks that have associated decisions. (For Phase 1, decisions are project-level, so skip this annotation unless `decisions` array is non-empty — show total count at project level instead.)
- Use box-drawing characters: `├──`, `│   `, `└──`.
- Edge arrow styles: `sync` → `──sync──→`, `async` → `──async──→`, `bidirectional` → `──↔──`.
- Omit the Edges section if `edges` is empty.
- If the project has no nodes at all, print: `(empty project — use /archviber:modify to add components)`

---

## Mermaid graph format

```
graph TD
    subgraph <ContainerIdCamelCase>["<Container Name>"]
        <blockId>["<Block Name>"]
    end
    <sourceId> -->|<label>| <targetId>
    <sourceId> -.->|<label>| <targetId>
```

Rules:
- Each container becomes a `subgraph`. Use the container's `id` (camelCase) as the subgraph identifier and `name` as the display label.
- Each block becomes a node inside its container's subgraph. Blocks without `parentId` are top-level nodes.
- Edge styles: `sync` → `-->`, `async` → `-.->`, `bidirectional` → `<-->`.
- Include the edge `label` in the pipe syntax `|label|` when present.
- Node IDs in Mermaid must be alphanumeric — replace hyphens with underscores.
- Wrap the output in a markdown code block: ` ```mermaid ... ``` `
