---
description: "Record a design decision linked to the architecture"
argument-hint: "<decision title or description>"
allowed-tools: [Read, Write, Glob]
---

Record an Architecture Decision Record (ADR) in `.archviber/architect.json`.

## Steps

1. Read `.archviber/architect.json`. If it does not exist, tell the user to run `/archviber:new` first.

2. Extract the decision title from `$ARGUMENTS`. If `$ARGUMENTS` is empty, ask: "What is the decision you want to record? (Provide a short title.)"

3. Gather the following fields by asking the user in a single structured prompt. Ask all questions at once to minimize round-trips:

   ```
   Recording decision: "<title>"

   Please provide the following (you can answer all at once):

   1. Context — What problem or situation prompted this decision?
   2. Options considered — What alternatives did you evaluate? (comma-separated or list)
   3. Chosen option — Which option did you choose?
   4. Rationale — Why did you choose it over the alternatives?
   ```

   If the user provides all information upfront in `$ARGUMENTS` (e.g., as a JSON blob or structured text), parse it directly without asking.

4. Construct a `DesignDecision` object:
   ```json
   {
     "id": "<kebab-case-id-from-title>",
     "title": "<title>",
     "context": "<context>",
     "options": ["<option1>", "<option2>", ...],
     "chosen": "<chosen option>",
     "rationale": "<rationale>",
     "date": "<today's ISO date YYYY-MM-DD>",
     "status": "active"
   }
   ```

5. Append the decision to `decisions[]` in the `ArchProject`. Initialize the array if it does not exist.

6. Write the updated `architect.json` back.

7. Confirm:
   ```
   Decision recorded: "<title>" (id: <id>)
   Total decisions: N
   Use /archviber:show to see the full architecture.
   ```

## ID generation

Generate the `id` as `kebab-case` from the title. If a decision with the same `id` already exists, append `-2`, `-3`, etc.

## Example

User: `/archviber:decide Use PostgreSQL over MongoDB`

Expected interaction:
1. CC recognizes the title as "Use PostgreSQL over MongoDB"
2. CC asks for context, options, chosen, rationale
3. User responds
4. CC writes the decision and confirms
