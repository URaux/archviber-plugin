#!/usr/bin/env node
/**
 * ArchViber Canvas — serve.mjs
 * Serves the Vite-built web UI from ../web/dist/ and a file-backed JSON API.
 * Falls back to an inline HTML tree view when web/dist/ doesn't exist yet.
 * Zero dependencies: only Node.js built-in modules.
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// ─── Paths ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = 3333
const HOST = '127.0.0.1'
const STATIC_DIR = join(__dirname, '..', 'web', 'dist')
const DATA_PATH = join(process.cwd(), '.archviber', 'architect.json')

// ─── MIME types ───────────────────────────────────────────────────────────────

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
}

// ─── CORS headers ─────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  // Allow any localhost origin (covers Vite dev proxy on any port)
  const allowed =
    origin && /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ? origin
      : 'http://localhost:3333'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

// ─── Body reader ──────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

// ─── JSON response helpers ────────────────────────────────────────────────────

function sendJson(res, status, body, origin) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...corsHeaders(origin),
  })
  res.end(payload)
}

// ─── API handlers ─────────────────────────────────────────────────────────────

function handleGetProject(res, origin) {
  if (!fs.existsSync(DATA_PATH)) {
    return sendJson(res, 404, { error: 'No project found' }, origin)
  }
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8')
    const project = JSON.parse(raw)
    sendJson(res, 200, project, origin)
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to read project', detail: err.message }, origin)
  }
}

async function handlePostProject(req, res, origin) {
  let body
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' }, origin)
  }

  const { schemaVersion, name, nodes, edges } = body
  if (schemaVersion === undefined || name === undefined || !Array.isArray(nodes) || !Array.isArray(edges)) {
    return sendJson(res, 422, { error: 'Body must have schemaVersion, name, nodes[], edges[]' }, origin)
  }

  try {
    const dir = path.dirname(DATA_PATH)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DATA_PATH, JSON.stringify(body, null, 2), 'utf-8')
    sendJson(res, 200, { ok: true }, origin)
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to write project', detail: err.message }, origin)
  }
}

// ─── Static file server ───────────────────────────────────────────────────────

function serveStatic(urlPath, res, origin) {
  // Normalise path and prevent directory traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(STATIC_DIR, safePath === '/' ? 'index.html' : safePath)

  // Try to serve the file; fallback to index.html for SPA routing
  const tryServe = (fp, fallback) => {
    fs.stat(fp, (err, stat) => {
      if (err || stat.isDirectory()) {
        if (fallback) {
          // SPA fallback: serve index.html
          return tryServe(join(STATIC_DIR, 'index.html'), false)
        }
        res.writeHead(404, corsHeaders(origin))
        return res.end('404 Not Found')
      }
      const ext = path.extname(fp).toLowerCase()
      const mime = MIME[ext] || 'application/octet-stream'
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
        ...corsHeaders(origin),
      })
      fs.createReadStream(fp).pipe(res)
    })
  }

  tryServe(filePath, true)
}

// ─── Fallback HTML (Phase 2 not built yet) ───────────────────────────────────

function escHtml(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generateFallbackHtml(project) {
  const projectName = project ? escHtml(project.name) : 'ArchViber Canvas'
  const treeHtml = renderTree(project)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} — ArchViber</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: #f8fafc;
      color: #1e293b;
      min-height: 100vh;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      color: #f1f5f9;
    }
    .toolbar .logo { font-weight: 700; font-size: 1rem; font-style: italic; }
    .toolbar .sep { color: #475569; }
    .toolbar .project-name { color: #94a3b8; font-size: 0.9rem; }
    .toolbar .spacer { flex: 1; }
    .toolbar .badge-mode {
      font-size: 0.7rem;
      padding: 3px 10px;
      border-radius: 4px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
    }
    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 20px 60px;
    }
    h2 { font-size: 1rem; color: #64748b; font-weight: 400; margin-bottom: 20px; }
    h2 strong { color: #0f172a; font-weight: 600; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .container-card {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      background: #fff;
    }
    .container-header {
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .container-header .name {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #fff;
      padding: 3px 10px;
      border-radius: 6px;
    }
    .container-body { padding: 4px 12px 12px; }
    .block-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      margin: 4px 0;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      transition: box-shadow 0.15s;
    }
    .block-card:hover { box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .block-info { flex: 1; min-width: 0; }
    .block-name { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
    .block-desc { font-size: 0.78rem; color: #94a3b8; margin-top: 2px; }
    .block-tech {
      display: inline-block;
      margin-top: 5px;
      font-size: 0.68rem;
      padding: 2px 8px;
      border-radius: 99px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
    }
    .status-dot {
      flex-shrink: 0;
      width: 10px; height: 10px;
      border-radius: 50%;
      margin-top: 5px;
    }
    .status-dot.idle { background: #cbd5e1; }
    .status-dot.waiting { background: #c4b5fd; }
    .status-dot.building { background: #fbbf24; animation: pulse 1.5s ease-in-out infinite; }
    .status-dot.done { background: #4ade80; }
    .status-dot.error { background: #f87171; }
    .status-dot.blocked { background: #cbd5e1; border: 2px solid #f87171; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .edges-section {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .edges-title {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .edge-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      font-size: 0.82rem;
      color: #475569;
    }
    .edge-node {
      font-weight: 500;
      color: #0f172a;
    }
    .edge-arrow { color: #94a3b8; font-family: monospace; }
    .edge-arrow.async { color: #f59e0b; }
    .edge-label {
      font-size: 0.72rem;
      color: #94a3b8;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .empty {
      text-align: center;
      padding: 60px 20px;
      color: #94a3b8;
    }
    .empty code {
      font-size: 0.85rem;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #475569;
    }
    /* Container color tints */
    .c-blue { background: #eff6ff; border-color: #bfdbfe; }
    .c-blue .name { background: #3b82f6; }
    .c-green { background: #f0fdf4; border-color: #bbf7d0; }
    .c-green .name { background: #22c55e; }
    .c-purple { background: #faf5ff; border-color: #e9d5ff; }
    .c-purple .name { background: #a855f7; }
    .c-amber { background: #fffbeb; border-color: #fde68a; }
    .c-amber .name { background: #f59e0b; }
    .c-rose { background: #fff1f2; border-color: #fecdd3; }
    .c-rose .name { background: #f43f5e; }
    .c-slate { background: #f8fafc; border-color: #e2e8f0; }
    .c-slate .name { background: #64748b; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="logo">ArchViber</span>
    <span class="sep">|</span>
    <span class="project-name">${projectName}</span>
    <span class="spacer"></span>
    <span class="badge-mode">Read-only view</span>
  </div>
  <main>
    ${treeHtml}
  </main>
</body>
</html>`
}

function renderTree(project) {
  if (!project) {
    return '<p class="empty">No <code>.archviber/architect.json</code> found.<br>Run <code>/archviber:new</code> in Claude Code to create a project.</p>'
  }

  const { name, schemaVersion, nodes = [], edges = [] } = project
  const containers = nodes.filter(n => n.type === 'container')
  const blocks = nodes.filter(n => n.type === 'block')
  const orphans = blocks.filter(b => !b.parentId)

  function renderBlock(block) {
    let h = `<div class="block-card">`
    h += `<div class="status-dot ${block.status || 'idle'}"></div>`
    h += `<div class="block-info">`
    h += `<div class="block-name">${escHtml(block.name)}</div>`
    if (block.description) h += `<div class="block-desc">${escHtml(block.description)}</div>`
    if (block.techStack) h += `<span class="block-tech">${escHtml(block.techStack)}</span>`
    h += `</div></div>`
    return h
  }

  let html = `<h2><strong>${escHtml(name)}</strong> &mdash; v${schemaVersion}</h2>\n`
  html += `<div class="grid">\n`

  for (const container of containers) {
    const children = blocks.filter(b => b.parentId === container.id)
    const color = container.color || 'slate'
    html += `<div class="container-card c-${color}">\n`
    html += `  <div class="container-header"><span class="name">${escHtml(container.name)}</span></div>\n`
    html += `  <div class="container-body">\n`
    for (const block of children) {
      html += `    ${renderBlock(block)}\n`
    }
    if (children.length === 0) {
      html += `    <div class="block-desc" style="padding:8px;text-align:center">No blocks</div>\n`
    }
    html += `  </div>\n</div>\n`
  }

  if (orphans.length > 0) {
    html += `<div class="container-card c-slate">\n`
    html += `  <div class="container-header"><span class="name">Orphan Blocks</span></div>\n`
    html += `  <div class="container-body">\n`
    for (const block of orphans) {
      html += `    ${renderBlock(block)}\n`
    }
    html += `  </div>\n</div>\n`
  }

  html += `</div>\n`

  if (edges.length > 0) {
    html += `<div class="edges-section">\n`
    html += `  <div class="edges-title">Connections (${edges.length})</div>\n`
    for (const edge of edges) {
      const arrowSymbol = edge.type === 'sync' ? '→' : edge.type === 'async' ? '⇢' : '↔'
      const arrowClass = edge.type === 'async' ? 'edge-arrow async' : 'edge-arrow'
      const label = edge.label ? ` <span class="edge-label">${escHtml(edge.label)}</span>` : ''
      html += `  <div class="edge-row">`
      html += `<span class="edge-node">${escHtml(edge.source)}</span> `
      html += `<span class="${arrowClass}">${arrowSymbol}</span> `
      html += `<span class="edge-node">${escHtml(edge.target)}</span>`
      html += `${label}</div>\n`
    }
    html += `</div>\n`
  }

  return html
}

// ─── Static dir existence check ───────────────────────────────────────────────

function staticDirExists() {
  try {
    return fs.statSync(STATIC_DIR).isDirectory()
  } catch {
    return false
  }
}

// ─── Request router ───────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const origin = req.headers.origin || ''
  const method = req.method.toUpperCase()
  const url = new URL(req.url, `http://${HOST}:${PORT}`)
  const pathname = url.pathname

  // Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin))
    return res.end()
  }

  // ── API routes ──────────────────────────────────────────────────────────────

  if (pathname === '/api/health') {
    return sendJson(res, 200, { ok: true }, origin)
  }

  if (pathname === '/api/project') {
    if (method === 'GET') return handleGetProject(res, origin)
    if (method === 'POST') return handlePostProject(req, res, origin)
    res.writeHead(405, { Allow: 'GET, POST', ...corsHeaders(origin) })
    return res.end('Method Not Allowed')
  }

  if (pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: 'Unknown API endpoint' }, origin)
  }

  // ── Static / fallback ───────────────────────────────────────────────────────

  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, corsHeaders(origin))
    return res.end('Method Not Allowed')
  }

  if (staticDirExists()) {
    return serveStatic(pathname, res, origin)
  }

  // Fallback: inline HTML tree view (web/dist not built yet)
  let project = null
  try {
    if (fs.existsSync(DATA_PATH)) {
      project = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    }
  } catch { /* serve empty state */ }

  const html = generateFallbackHtml(project)
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...corsHeaders(origin),
  })
  res.end(html)
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('Unhandled error:', err)
    try {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Internal Server Error')
    } catch { /* response already sent */ }
  })
})

server.listen(PORT, HOST, () => {
  const hasStatic = staticDirExists()
  console.log(`ArchViber canvas  →  http://localhost:${PORT}`)
  console.log(`Data file         →  ${DATA_PATH}`)
  console.log(`Static files      →  ${hasStatic ? STATIC_DIR : '(not built — using fallback HTML)'}`)
  console.log('Press Ctrl+C to stop.')
})

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down...`)
  server.close(() => {
    console.log('Server closed.')
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 3000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
