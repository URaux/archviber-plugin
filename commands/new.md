---
description: "Create a new architecture project in .archviber/architect.json"
argument-hint: "[project-name]"
allowed-tools: [Read, Write, Bash, Glob]
---

Create a new ArchViber architecture project in the current directory.

## Steps

1. Determine the project name:
   - If `$ARGUMENTS` is non-empty, use it as the project name.
   - Otherwise, use the current directory's base name as the project name.

2. Check if `.archviber/architect.json` already exists (use Read or Glob).
   - If it exists, stop and tell the user: "An architect.json already exists at .archviber/architect.json. Use /archviber:show to inspect it, or delete the file manually to start fresh."
   - Do NOT overwrite an existing project without explicit confirmation.

3. Create the `.archviber/` directory if it does not exist:
   ```bash
   mkdir -p .archviber
   ```

4. Write `.archviber/architect.json` with this initial content (substitute the actual project name):
   ```json
   {
     "schemaVersion": 1,
     "name": "<project-name>",
     "nodes": [],
     "edges": [],
     "decisions": []
   }
   ```

5. Confirm to the user:
   ```
   Created .archviber/architect.json for project "<project-name>".

   Next steps:
     /archviber:modify  — add containers and blocks in plain English
     /archviber:show    — view the current architecture
     /archviber:import  — reverse-engineer from the codebase
   ```
