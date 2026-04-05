/**
 * ArchViber Core Operations
 * Pure functions for manipulating architecture data.
 * No side effects, no I/O, no UI dependencies.
 */

import type {
  ArchProject,
  ArchNode,
  ArchBlock,
  ArchContainer,
  ArchEdge,
  ArchEdgeType,
  ContainerColor,
  BuildStatus,
} from './types'

// ─── ID Generation ───────────────────────────────────────

let idCounter = 0

export function generateId(prefix: string = 'node'): string {
  return `${prefix}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`
}

// ─── Validation Helpers ──────────────────────────────────

const VALID_COLORS: ContainerColor[] = ['blue', 'green', 'purple', 'amber', 'rose', 'slate']
const VALID_EDGE_TYPES: ArchEdgeType[] = ['sync', 'async', 'bidirectional']
const VALID_STATUSES: BuildStatus[] = ['idle', 'waiting', 'building', 'done', 'error', 'blocked']

export function normalizeColor(color?: string): ContainerColor {
  return VALID_COLORS.includes(color as ContainerColor) ? (color as ContainerColor) : 'blue'
}

export function normalizeEdgeType(type?: string): ArchEdgeType {
  return VALID_EDGE_TYPES.includes(type as ArchEdgeType) ? (type as ArchEdgeType) : 'sync'
}

export function normalizeStatus(status?: string): BuildStatus {
  return VALID_STATUSES.includes(status as BuildStatus) ? (status as BuildStatus) : 'idle'
}

// ─── Project Factory ─────────────────────────────────────

export function createProject(name: string): ArchProject {
  return {
    schemaVersion: 1,
    name,
    nodes: [],
    edges: [],
  }
}

// ─── Node Operations ─────────────────────────────────────

export function addContainer(
  project: ArchProject,
  name: string,
  color?: ContainerColor,
  id?: string
): ArchProject {
  const container: ArchContainer = {
    id: id ?? generateId('container'),
    type: 'container',
    name,
    color: normalizeColor(color),
  }
  return { ...project, nodes: [...project.nodes, container] }
}

export function addBlock(
  project: ArchProject,
  name: string,
  description: string = '',
  parentId?: string,
  opts?: { techStack?: string; id?: string }
): ArchProject {
  // Validate parentId exists and is a container
  if (parentId) {
    const parent = project.nodes.find(n => n.id === parentId)
    if (!parent || parent.type !== 'container') {
      throw new Error(`Parent container "${parentId}" not found`)
    }
  }

  const block: ArchBlock = {
    id: opts?.id ?? generateId('block'),
    type: 'block',
    name,
    description,
    status: 'idle',
    ...(parentId ? { parentId } : {}),
    ...(opts?.techStack ? { techStack: opts.techStack } : {}),
  }
  return { ...project, nodes: [...project.nodes, block] }
}

export function removeNode(project: ArchProject, nodeId: string): ArchProject {
  const node = project.nodes.find(n => n.id === nodeId)
  if (!node) return project

  // If removing a container, also remove its children
  const idsToRemove = new Set<string>([nodeId])
  if (node.type === 'container') {
    for (const n of project.nodes) {
      if (n.type === 'block' && n.parentId === nodeId) {
        idsToRemove.add(n.id)
      }
    }
  }

  return {
    ...project,
    nodes: project.nodes.filter(n => !idsToRemove.has(n.id)),
    edges: project.edges.filter(
      e => !idsToRemove.has(e.source) && !idsToRemove.has(e.target)
    ),
  }
}

export function updateNode(
  project: ArchProject,
  nodeId: string,
  updates: Partial<Omit<ArchBlock, 'id' | 'type'>> & Partial<Omit<ArchContainer, 'id' | 'type'>>
): ArchProject {
  return {
    ...project,
    nodes: project.nodes.map(node => {
      if (node.id !== nodeId) return node
      return { ...node, ...updates } as ArchNode
    }),
  }
}

export function moveBlock(
  project: ArchProject,
  blockId: string,
  newParentId: string | null
): ArchProject {
  if (newParentId) {
    const parent = project.nodes.find(n => n.id === newParentId)
    if (!parent || parent.type !== 'container') {
      throw new Error(`Target container "${newParentId}" not found`)
    }
  }

  return {
    ...project,
    nodes: project.nodes.map(node => {
      if (node.id !== blockId || node.type !== 'block') return node
      const { parentId, ...rest } = node
      return newParentId ? { ...rest, parentId: newParentId } : rest as ArchBlock
    }),
  }
}

// ─── Edge Operations ─────────────────────────────────────

export function addEdge(
  project: ArchProject,
  source: string,
  target: string,
  type?: ArchEdgeType,
  label?: string,
  id?: string
): ArchProject {
  // Validate source and target exist
  const sourceNode = project.nodes.find(n => n.id === source)
  const targetNode = project.nodes.find(n => n.id === target)
  if (!sourceNode) throw new Error(`Source node "${source}" not found`)
  if (!targetNode) throw new Error(`Target node "${target}" not found`)

  // No duplicate edges
  if (project.edges.some(e => e.source === source && e.target === target)) {
    throw new Error(`Edge from "${source}" to "${target}" already exists`)
  }

  const edge: ArchEdge = {
    id: id ?? generateId('edge'),
    source,
    target,
    type: normalizeEdgeType(type),
    ...(label ? { label } : {}),
  }
  return { ...project, edges: [...project.edges, edge] }
}

export function removeEdge(project: ArchProject, edgeId: string): ArchProject {
  return {
    ...project,
    edges: project.edges.filter(e => e.id !== edgeId),
  }
}

export function updateEdge(
  project: ArchProject,
  edgeId: string,
  updates: Partial<Omit<ArchEdge, 'id'>>
): ArchProject {
  return {
    ...project,
    edges: project.edges.map(edge => {
      if (edge.id !== edgeId) return edge
      return { ...edge, ...updates }
    }),
  }
}

// ─── Query Helpers ───────────────────────────────────────

export function getContainers(project: ArchProject): ArchContainer[] {
  return project.nodes.filter((n): n is ArchContainer => n.type === 'container')
}

export function getBlocks(project: ArchProject): ArchBlock[] {
  return project.nodes.filter((n): n is ArchBlock => n.type === 'block')
}

export function getBlocksInContainer(project: ArchProject, containerId: string): ArchBlock[] {
  return getBlocks(project).filter(b => b.parentId === containerId)
}

export function getOrphanBlocks(project: ArchProject): ArchBlock[] {
  const containerIds = new Set(getContainers(project).map(c => c.id))
  return getBlocks(project).filter(b => !b.parentId || !containerIds.has(b.parentId))
}

export function getNodeById(project: ArchProject, id: string): ArchNode | undefined {
  return project.nodes.find(n => n.id === id)
}

export function getEdgesForNode(project: ArchProject, nodeId: string): ArchEdge[] {
  return project.edges.filter(e => e.source === nodeId || e.target === nodeId)
}

export function findNodeByName(project: ArchProject, name: string): ArchNode | undefined {
  const lower = name.toLowerCase()
  return project.nodes.find(n => n.name.toLowerCase() === lower)
}
