/**
 * ArchViber Serialization
 * Convert between ArchProject and various output formats:
 * - YAML (canonical exchange format)
 * - Mermaid (diagram rendering)
 * - Tree (terminal display)
 * - JSON (file persistence)
 */

import type {
  ArchProject,
  ArchNode,
  ArchBlock,
  ArchContainer,
  ArchEdge,
  ArchEdgeType,
  ContainerColor,
  SchemaDocument,
  SerializedBlock,
  SerializedContainer,
  SerializedEdge,
} from './types'
import { normalizeColor, normalizeEdgeType, normalizeStatus } from './operations'

// ─── Project ↔ JSON (file persistence) ───────────────────

export function projectToJson(project: ArchProject): string {
  return JSON.stringify(project, null, 2)
}

export function jsonToProject(json: string): ArchProject {
  const raw = JSON.parse(json)
  return normalizeProject(raw)
}

function normalizeProject(raw: any): ArchProject {
  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: 1, name: 'Untitled', nodes: [], edges: [] }
  }

  // Handle legacy ArchViber format (canvas.nodes/canvas.edges)
  if (raw.canvas && Array.isArray(raw.canvas.nodes)) {
    return migrateLegacyProject(raw)
  }

  return {
    schemaVersion: raw.schemaVersion ?? 1,
    name: raw.name ?? 'Untitled',
    nodes: Array.isArray(raw.nodes) ? raw.nodes.map(normalizeNode).filter(Boolean) : [],
    edges: Array.isArray(raw.edges) ? raw.edges.map(normalizeEdge).filter(Boolean) : [],
    ...(raw.decisions ? { decisions: raw.decisions } : {}),
    ...(raw.metadata ? { metadata: raw.metadata } : {}),
  }
}

function normalizeNode(raw: any): ArchNode | null {
  if (!raw || typeof raw !== 'object' || !raw.id) return null

  if (raw.type === 'container') {
    return {
      id: raw.id,
      type: 'container',
      name: raw.name ?? raw.id,
      color: normalizeColor(raw.color),
      ...(raw.collapsed != null ? { collapsed: Boolean(raw.collapsed) } : {}),
    }
  }

  return {
    id: raw.id,
    type: 'block',
    name: raw.name ?? raw.id,
    description: raw.description ?? '',
    status: normalizeStatus(raw.status),
    ...(raw.parentId ? { parentId: raw.parentId } : {}),
    ...(raw.techStack ? { techStack: raw.techStack } : {}),
    ...(raw.summary ? { summary: raw.summary } : {}),
    ...(raw.errorMessage ? { errorMessage: raw.errorMessage } : {}),
  }
}

function normalizeEdge(raw: any): ArchEdge | null {
  if (!raw || typeof raw !== 'object' || !raw.source || !raw.target) return null
  return {
    id: raw.id ?? `edge-${raw.source}-${raw.target}`,
    source: raw.source,
    target: raw.target,
    type: normalizeEdgeType(raw.type),
    ...(raw.label ? { label: raw.label } : {}),
  }
}

/**
 * Migrate from ArchViber's legacy format:
 * { name, canvas: { nodes: ReactFlowNode[], edges: ReactFlowEdge[] }, config, history }
 * to the new format:
 * { schemaVersion, name, nodes: ArchNode[], edges: ArchEdge[] }
 */
function migrateLegacyProject(raw: any): ArchProject {
  const nodes: ArchNode[] = []
  const edges: ArchEdge[] = []

  for (const rfNode of raw.canvas.nodes ?? []) {
    if (rfNode.type === 'container') {
      nodes.push({
        id: rfNode.id,
        type: 'container',
        name: rfNode.data?.name ?? rfNode.id,
        color: normalizeColor(rfNode.data?.color),
        ...(rfNode.data?.collapsed != null ? { collapsed: rfNode.data.collapsed } : {}),
      })
    } else {
      nodes.push({
        id: rfNode.id,
        type: 'block',
        name: rfNode.data?.name ?? rfNode.id,
        description: rfNode.data?.description ?? '',
        status: normalizeStatus(rfNode.data?.status),
        ...(rfNode.parentId ? { parentId: rfNode.parentId } : {}),
        ...(rfNode.data?.techStack ? { techStack: rfNode.data.techStack } : {}),
        ...(rfNode.data?.summary ? { summary: rfNode.data.summary } : {}),
        ...(rfNode.data?.errorMessage ? { errorMessage: rfNode.data.errorMessage } : {}),
      })
    }
  }

  for (const rfEdge of raw.canvas.edges ?? []) {
    edges.push({
      id: rfEdge.id ?? `edge-${rfEdge.source}-${rfEdge.target}`,
      source: rfEdge.source,
      target: rfEdge.target,
      type: normalizeEdgeType(rfEdge.type),
      ...(rfEdge.label ? { label: String(rfEdge.label) } : {}),
    })
  }

  return {
    schemaVersion: 1,
    name: raw.name ?? 'Migrated Project',
    nodes,
    edges,
  }
}

// ─── Project → YAML ──────────────────────────────────────

export function projectToYaml(project: ArchProject): string {
  const containers = project.nodes.filter((n): n is ArchContainer => n.type === 'container')
  const blocks = project.nodes.filter((n): n is ArchBlock => n.type === 'block')

  const serializedContainers: SerializedContainer[] = containers.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
    blocks: blocks
      .filter(b => b.parentId === c.id)
      .map(blockToSerialized),
  }))

  // Orphan blocks
  const containerIds = new Set(containers.map(c => c.id))
  const orphans = blocks.filter(b => !b.parentId || !containerIds.has(b.parentId))
  if (orphans.length > 0) {
    serializedContainers.push({
      id: 'ungrouped',
      name: 'Ungrouped',
      color: 'slate',
      blocks: orphans.map(blockToSerialized),
    })
  }

  const doc: SchemaDocument = {
    project: project.name,
    schemaVersion: project.schemaVersion,
    containers: serializedContainers,
    edges: project.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      ...(e.label ? { label: e.label } : {}),
    })),
  }

  // Manual YAML for cleaner output (no external dependency needed for core)
  return yamlStringify(doc)
}

function blockToSerialized(block: ArchBlock): SerializedBlock {
  return {
    id: block.id,
    name: block.name,
    description: block.description,
    status: block.status,
    ...(block.techStack ? { techStack: block.techStack } : {}),
    ...(block.summary ? { summary: block.summary } : {}),
    ...(block.errorMessage ? { errorMessage: block.errorMessage } : {}),
  }
}

// ─── Project → Mermaid ───────────────────────────────────

export function projectToMermaid(project: ArchProject): string {
  const containers = project.nodes.filter((n): n is ArchContainer => n.type === 'container')
  const blocks = project.nodes.filter((n): n is ArchBlock => n.type === 'block')
  const containerIds = new Set(containers.map(c => c.id))

  const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, '_')
  const lines: string[] = ['graph TB']
  lines.push(`    %% ${project.name}`)

  for (const container of containers) {
    const children = blocks.filter(b => b.parentId === container.id)
    if (children.length === 0) {
      lines.push(`    ${safeId(container.id)}["${container.name}"]`)
    } else {
      lines.push(`    subgraph ${safeId(container.id)}["${container.name}"]`)
      for (const block of children) {
        lines.push(`        ${safeId(block.id)}["${block.name}"]`)
      }
      lines.push(`    end`)
    }
  }

  // Orphan blocks
  const orphans = blocks.filter(b => !b.parentId || !containerIds.has(b.parentId))
  for (const block of orphans) {
    lines.push(`    ${safeId(block.id)}["${block.name}"]`)
  }

  // Edges
  for (const edge of project.edges) {
    const src = safeId(edge.source)
    const tgt = safeId(edge.target)
    const label = edge.label ?? ''
    if (edge.type === 'async') {
      lines.push(label ? `    ${src} -.->|${label}| ${tgt}` : `    ${src} -.-> ${tgt}`)
    } else if (edge.type === 'bidirectional') {
      lines.push(label ? `    ${src} <-->|${label}| ${tgt}` : `    ${src} <--> ${tgt}`)
    } else {
      lines.push(label ? `    ${src} -->|${label}| ${tgt}` : `    ${src} --> ${tgt}`)
    }
  }

  return lines.join('\n')
}

// ─── Project → Tree (terminal display) ───────────────────

export function projectToTree(project: ArchProject): string {
  const containers = project.nodes.filter((n): n is ArchContainer => n.type === 'container')
  const blocks = project.nodes.filter((n): n is ArchBlock => n.type === 'block')
  const containerIds = new Set(containers.map(c => c.id))

  const lines: string[] = [`${project.name} (v${project.schemaVersion})`]

  for (let ci = 0; ci < containers.length; ci++) {
    const container = containers[ci]
    const isLastContainer = ci === containers.length - 1
    const children = blocks.filter(b => b.parentId === container.id)
    const orphans = isLastContainer
      ? blocks.filter(b => !b.parentId || !containerIds.has(b.parentId))
      : []
    const isLast = isLastContainer && orphans.length === 0

    const prefix = isLast ? '└── ' : '├── '
    const childPrefix = isLast ? '    ' : '│   '

    lines.push(`${prefix}[${container.name}] (${container.color})`)

    const allChildren = [...children]
    for (let bi = 0; bi < allChildren.length; bi++) {
      const block = allChildren[bi]
      const isLastBlock = bi === allChildren.length - 1
      const bPrefix = isLastBlock ? '└── ' : '├── '

      const decisionCount = project.decisions
        ?.filter(d => d.id.startsWith(block.id))?.length ?? 0
      const decisionTag = decisionCount > 0 ? ` ── ${decisionCount} decisions` : ''
      lines.push(`${childPrefix}${bPrefix}${block.name} ── ${block.status}${decisionTag}`)
    }

    // Orphan blocks under last container
    if (orphans.length > 0) {
      lines.push(`├── [Ungrouped]`)
      for (let oi = 0; oi < orphans.length; oi++) {
        const orphan = orphans[oi]
        const oPrefix = oi === orphans.length - 1 ? '└── ' : '├── '
        lines.push(`│   ${oPrefix}${orphan.name} ── ${orphan.status}`)
      }
    }
  }

  // Edges section
  if (project.edges.length > 0) {
    lines.push(`└── Edges:`)
    for (const edge of project.edges) {
      const sourceName = project.nodes.find(n => n.id === edge.source)?.name ?? edge.source
      const targetName = project.nodes.find(n => n.id === edge.target)?.name ?? edge.target
      const arrow = edge.type === 'async' ? '···>' : edge.type === 'bidirectional' ? '<──>' : '──>'
      const label = edge.label ? ` ("${edge.label}")` : ''
      lines.push(`    ${sourceName} ${arrow} ${targetName}${label}`)
    }
  }

  return lines.join('\n')
}

// ─── Minimal YAML Serializer ─────────────────────────────
// No dependency on 'yaml' package — keeps core zero-dep

function yamlStringify(obj: any, indent: number = 0): string {
  const pad = '  '.repeat(indent)

  if (obj === null || obj === undefined) return `${pad}null`
  if (typeof obj === 'boolean') return `${pad}${obj}`
  if (typeof obj === 'number') return `${pad}${obj}`
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes('"') || obj.includes(':') || obj.includes('#')) {
      return `${pad}"${obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }
    return `${pad}${obj}`
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${pad}[]`
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        const inner = yamlStringifyObject(item, indent + 1)
        return `${pad}- ${inner.trimStart()}`
      }
      return `${pad}- ${typeof item === 'string' ? item : JSON.stringify(item)}`
    }).join('\n')
  }

  if (typeof obj === 'object') {
    return yamlStringifyObject(obj, indent)
  }

  return `${pad}${JSON.stringify(obj)}`
}

function yamlStringifyObject(obj: Record<string, any>, indent: number): string {
  const pad = '  '.repeat(indent)
  const entries = Object.entries(obj).filter(([_, v]) => v !== undefined)

  return entries.map(([key, value]) => {
    if (value === null || typeof value !== 'object') {
      const valStr = typeof value === 'string'
        ? (value.includes(':') || value.includes('#') ? `"${value}"` : value)
        : String(value)
      return `${pad}${key}: ${valStr}`
    }
    return `${pad}${key}:\n${yamlStringify(value, indent + 1)}`
  }).join('\n')
}
