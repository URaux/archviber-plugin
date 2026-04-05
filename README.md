# ArchViber Plugin

Architecture visualization plugin for [Claude Code](https://claude.ai/code) and [OpenClaw](https://github.com/nicepkg/openclaw). Manage software architecture diagrams with slash commands and an interactive canvas UI.

> Based on [ArchViber](https://github.com/URaux/ArchViber) — the original visual architecture editor.

## What it does

- **Text-driven architecture management** via slash commands in Claude Code / OpenClaw
- **Interactive canvas** with React Flow — auto-layout, drag & drop, zoom, PNG export
- **7 commands**: create, view, modify, export, import, decide, open canvas
- **AI agents**: reverse-engineer codebase into architecture, review architecture quality
- **Design decision records**: capture the "why" behind architectural choices, export as ADR

## Install

### Claude Code

```bash
# Clone the plugin
git clone https://github.com/URaux/archviber-plugin.git

# Register as local plugin (in Claude Code settings)
# Add to ~/.claude/settings.json:
{
  "enabledPlugins": {
    "archviber@local": true
  }
}

# Add to ~/.claude/plugins/installed_plugins.json:
{
  "archviber@local": {
    "type": "local",
    "path": "/path/to/archviber-plugin"
  }
}

# Build the canvas UI (optional, for /archviber:open)
cd archviber-plugin/web
npm install
npm run build
```

### OpenClaw

Copy the skill directory into your OpenClaw project:

```bash
cp -r archviber-plugin/skills/arch-schema .openclaw/skills/archviber/
# Or use the pre-packaged OpenClaw skill:
mkdir -p .openclaw/skills/archviber
cp archviber-plugin/commands/* .openclaw/skills/archviber/  # adapt to SKILL.md format
cp -r archviber-plugin/scripts .openclaw/skills/archviber/
cp -r archviber-plugin/web/dist .openclaw/skills/archviber/web/dist
```

See the [OpenClaw docs](https://github.com/nicepkg/openclaw) for skill installation details.

## Commands

| Command | Description |
|---------|-------------|
| `/archviber:new [name]` | Create a new architecture project |
| `/archviber:show [--mermaid]` | Display architecture as tree or Mermaid diagram |
| `/archviber:modify <instruction>` | Add/edit/remove nodes and edges via natural language |
| `/archviber:export [--format yaml\|mermaid\|json\|adr]` | Export architecture |
| `/archviber:import [path]` | Reverse-engineer codebase into architecture |
| `/archviber:decide <title>` | Record a design decision (ADR) |
| `/archviber:open` | Launch interactive canvas at localhost:3333 |

## Architecture Data

Data is stored in `.archviber/architect.json` in your project root.

```
.archviber/
└── architect.json    # Architecture data (schemaVersion: 1)
```

**Node types**: `container` (logical group) and `block` (component)

**Edge types**: `sync` (REST, gRPC), `async` (queue, webhook), `bidirectional` (WebSocket)

**Container colors**: blue (frontend), green (API), purple (services), amber (data), rose (external), slate (misc)

## Canvas UI

The interactive canvas is built with Vite + React + [React Flow](https://reactflow.dev/) + [ELK.js](https://www.eclipse.org/elk/) auto-layout.

Features:
- Drag & drop nodes, resize containers
- Auto-layout with ELK.js hierarchical algorithm
- PNG export (auto-fitted, no whitespace)
- Design decision viewer panel
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Auto-save on changes

## Project Structure

```
archviber-plugin/
├── CLAUDE.md              # Plugin instructions for Claude Code
├── AGENTS.md              # Subagent definitions
├── commands/              # 7 slash commands
├── agents/                # arch-reviewer, arch-importer
├── skills/                # Internal knowledge (arch-schema, arch-patterns)
├── core/                  # Data layer (types, CRUD, serialization, topo-sort)
├── schemas/               # JSON Schema for architect.json
├── scripts/serve.mjs      # Zero-dep Node.js server
└── web/                   # Vite + React Flow canvas app
```

## License

MIT
