/**
 * ArchViber Canvas Web UI — Types
 * Mirrors archviber-plugin/core/types.ts plus React Flow mapping types.
 */

// ─── Core Enums ──────────────────────────────────────────

export type ArchNodeType = 'container' | 'block'
export type ArchEdgeType = 'sync' | 'async' | 'bidirectional'
export type BuildStatus = 'idle' | 'waiting' | 'building' | 'done' | 'error' | 'blocked'
export type ContainerColor = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'slate'

// ─── Arch Node Types ─────────────────────────────────────

export interface ArchContainer {
  id: string
  type: 'container'
  name: string
  color: ContainerColor
  collapsed?: boolean
}

export interface ArchBlock {
  id: string
  type: 'block'
  parentId?: string
  name: string
  description: string
  status: BuildStatus
  techStack?: string
  summary?: string
  errorMessage?: string
}

export type ArchNode = ArchContainer | ArchBlock

// ─── Arch Edge Type ──────────────────────────────────────

export interface ArchEdge {
  id: string
  source: string
  target: string
  type: ArchEdgeType
  label?: string
}

// ─── Design Decision ────────────────────────────────────

export interface DesignDecision {
  id: string
  title: string
  context: string
  options: string[]
  chosen: string
  rationale: string
  date: string
  status: 'active' | 'superseded' | 'deprecated'
  supersededBy?: string
}

// ─── Project ─────────────────────────────────────────────

export interface ArchProject {
  schemaVersion: number
  name: string
  nodes: ArchNode[]
  edges: ArchEdge[]
  decisions?: DesignDecision[]
  metadata?: Record<string, unknown>
}

// ─── React Flow Node Data Types ──────────────────────────

export interface ContainerNodeData extends Record<string, unknown> {
  name: string
  color: ContainerColor
  collapsed: boolean
}

export interface BlockNodeData extends Record<string, unknown> {
  name: string
  description: string
  status: BuildStatus
  techStack?: string
  summary?: string
  errorMessage?: string
}

export type CanvasNodeData = ContainerNodeData | BlockNodeData
