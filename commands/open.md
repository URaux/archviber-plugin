---
description: "Start the ArchViber canvas web UI in the browser"
allowed-tools: [Read, Bash]
---

Launch the ArchViber canvas web UI as a local server and open it in the browser.

## Steps

1. Warn the user before starting:
   ```
   ⚠ Mutual exclusion: While the web UI is open, do NOT use other /archviber commands.
   Both the web UI and CC slash commands write to .archviber/architect.json — simultaneous
   edits will cause data loss (last writer wins). Close the web UI tab before resuming
   CC commands.
   ```

2. Check if `.archviber/architect.json` exists (use Read).
   - If it does not exist, tell the user: "No architect.json found. Run /archviber:new first to create a project."
   - Stop if missing.

3. Locate the plugin root. The serve script is at:
   `${CLAUDE_PLUGIN_ROOT}/scripts/serve.mjs`

4. Start the server by running:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/serve.mjs"
   ```
   Run this in the background so CC is not blocked.

5. Wait ~1 second for the server to bind, then open the browser:
   - On Windows: `start http://localhost:3847`
   - On macOS: `open http://localhost:3847`
   - On Linux: `xdg-open http://localhost:3847`

6. Report to the user:
   ```
   ArchViber canvas started at http://localhost:3847
   Serving .archviber/architect.json from the current directory.

   When you're done editing in the browser:
     1. Save your changes in the web UI
     2. Close the browser tab
     3. Resume /archviber commands here
   ```

## Notes

- Default port is 3847. If the port is already in use, `serve.mjs` will report the error — tell the user to check for existing instances.
- The web UI reads from and writes to the `architect.json` in the directory where CC is running (the project root), not the plugin directory.
- `CLAUDE_PLUGIN_ROOT` is the absolute path to the `archviber-plugin/` directory, automatically set by CC when this plugin is active.
