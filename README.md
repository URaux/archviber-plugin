# ArchViber Plugin

Architecture visualization plugin for [Claude Code](https://claude.ai/code) and [OpenClaw](https://github.com/nicepkg/openclaw).

Based on [ArchViber](https://github.com/URaux/ArchViber).

---

## Install / 安装

### Claude Code

```bash
claude plugin marketplace add URaux/archviber-plugin
claude plugin install archviber
```

### OpenClaw

```bash
git clone https://github.com/URaux/archviber-plugin.git
cp -r archviber-plugin/.openclaw-skill/* .openclaw/skills/archviber/
```

### Build Canvas / 构建画布 (optional)

```bash
cd archviber-plugin/web && npm install && npm run build
```

---

## Commands / 命令

| Command | Description | 说明 |
|---------|-------------|------|
| `/archviber:new [name]` | Create architecture project | 创建架构项目 |
| `/archviber:show [--mermaid]` | Display as tree or Mermaid | 树形或Mermaid图展示 |
| `/archviber:modify <instruction>` | Add/edit/remove via natural language | 自然语言增删改 |
| `/archviber:export [--format]` | Export yaml / mermaid / json / adr | 导出多种格式 |
| `/archviber:import [path]` | Reverse-engineer codebase | 从代码逆向生成架构 |
| `/archviber:decide <title>` | Record design decision (ADR) | 记录设计决策 |
| `/archviber:open` | Launch interactive canvas | 启动交互式画布 |

---

## Features / 功能

**Canvas UI / 画布**
- React Flow interactive canvas with drag & drop / 可拖拽交互式画布
- ELK.js auto-layout / 自动布局
- PNG export (auto-fitted, no whitespace) / PNG导出（自动适配，无空白）
- Design decision viewer panel / 设计决策查看面板
- Undo/redo (Ctrl+Z) / 撤销重做

**AI Agents / AI 代理**
- `arch-importer` — Scan codebase, generate architecture / 扫描代码生成架构
- `arch-reviewer` — Review architecture quality / 架构质量评审

**Data / 数据**
- Architecture stored in `.archviber/architect.json`
- Node types: `container` (logical group) + `block` (component)
- Edge types: `sync`, `async`, `bidirectional`
- Design decisions with ADR export / 设计决策 + ADR导出
- Container colors: blue (frontend), green (API), purple (services), amber (data), rose (external), slate (misc)

---

## Project Structure / 项目结构

```
archviber-plugin/
├── commands/          # 7 slash commands / 7个斜杠命令
├── agents/            # arch-reviewer, arch-importer
├── skills/            # arch-schema, arch-patterns
├── core/              # Types, CRUD, serialization, topo-sort
├── schemas/           # JSON Schema
├── scripts/serve.mjs  # Zero-dep Node.js server / 零依赖服务器
└── web/               # Vite + React Flow canvas / 画布前端
```

## License

MIT
