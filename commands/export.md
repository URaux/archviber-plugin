---
description: "Export architecture to yaml, mermaid, json, or adr"
argument-hint: "[--format yaml|mermaid|json|adr]"
allowed-tools: [Read, Write, Glob]
---

Export the architecture from `.archviber/architect.json` in the requested format.

## Steps

1. Read `.archviber/architect.json`. If it does not exist, tell the user to run `/archviber:new` first.

2. Parse `$ARGUMENTS` for `--format <value>`. Valid values: `yaml`, `mermaid`, `json`, `adr`. Default: `yaml`.

3. Render the output in the chosen format (see below).

4. Write the output to a file AND print it inline:
   - `yaml` → `.archviber/architect.yaml`
   - `mermaid` → `.archviber/architect.md` (wrapped in a mermaid code block)
   - `json` → `.archviber/architect.export.json` (same as source but re-pretty-printed)
   - `adr` → `.archviber/decisions/` directory (one `.md` file per decision)

5. Report: `Exported to .archviber/architect.<ext>` (or `Exported N ADR files to .archviber/decisions/` for adr format) and print the content inline.

---

## YAML format

Convert the `ArchProject` to YAML. Use this structure:

```yaml
project: <name>
schemaVersion: 1
containers:
  - id: <id>
    name: <name>
    color: <color>
    blocks:
      - id: <id>
        name: <name>
        description: <description>
        status: <status>
        techStack: <techStack>   # omit if absent
edges:
  - id: <id>
    source: <source-id>
    target: <target-id>
    type: <type>
    label: <label>               # omit if absent
decisions:                       # omit section if empty
  - id: <id>
    title: <title>
    ...
```

Group blocks under their parent container. List uncontained blocks under a special container entry with `id: "(uncontained)"` only if any exist.

---

## Mermaid format

Follow the same rules as `/archviber:show --mermaid`:
- `graph TD` layout
- Containers → `subgraph`
- `sync` → `-->`, `async` → `-.->`, `bidirectional` → `<-->`
- Labels in `|label|` syntax
- Wrap in ` ```mermaid ``` `

---

## JSON format

Output the raw `ArchProject` object as pretty-printed JSON (2-space indent). This is the canonical format — use it for backups or interoperability.

---

## ADR format (Architecture Decision Records)

Export each entry in `decisions[]` as an individual Markdown file following the standard ADR format.

If `decisions[]` is empty or absent, report: `No decisions recorded. Use /archviber:decide to add one.`

For each decision, create `.archviber/decisions/NNNN-<id>.md` where `NNNN` is a zero-padded sequence number (0001, 0002, ...):

```markdown
# <sequence>. <title>

Date: <date>

## Status

<status>
<!-- If superseded: "Superseded by [ADR NNNN](NNNN-<supersededBy>.md)" -->

## Context

<context>

## Options Considered

1. <option1>
2. <option2>
...

## Decision

We chose **<chosen>**.

## Rationale

<rationale>
```

After writing all files, print a summary table:

```
Exported N ADR files to .archviber/decisions/

| # | Title | Status | Date |
|---|-------|--------|------|
| 0001 | <title> | active | 2026-01-15 |
| 0002 | <title> | superseded | 2026-02-01 |
```
