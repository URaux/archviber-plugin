/**
 * ArchViber Core Types
 * Independent of any UI framework (React Flow, etc.)
 * These are the canonical types for architect.json
 */

// ─── Enums ───────────────────────────────────────────────

export type ArchNodeType = 'container' | 'block'
export type ArchEdgeType = 'sync' | 'async' | 'bidirectional'
export type BuildStatus = 'idle' | 'waiting' | 'building' | 'done' | 'error' | 'blocked'
export type ContainerColor = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'slate'

// ─── Node Types ──────────────────────────────────────────

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
  parentId?: string          // container ID this block belongs to
  name: string
  description: string
  status: BuildStatus
  techStack?: string
  summary?: string
  errorMessage?: string
}

export type ArchNode = ArchContainer | ArchBlock

// ─── Edge Type ───────────────────────────────────────────

export interface ArchEdge {
  id: string
  source: string             // source node ID
  target: string             // target node ID
  type: ArchEdgeType
  label?: string
}

// ─── Design Decision (Phase 4 extension point) ──────────

export interface DesignDecision {
  id: string
  title: string
  context: string            // background / problem statement
  options: string[]           // alternatives considered
  chosen: string             // final choice
  rationale: string          // why this option
  date: string               // ISO date
  status: 'active' | 'superseded' | 'deprecated'
  supersededBy?: string      // ID of replacing decision
}

// ─── Project ─────────────────────────────────────────────

export interface ArchProject {
  schemaVersion: number      // starts at 1
  name: string
  nodes: ArchNode[]
  edges: ArchEdge[]
  decisions?: DesignDecision[]  // Phase 4
  metadata?: Record<string, unknown>
}

// ─── Serialization Intermediates ─────────────────────────

export interface SerializedBlock {
  id: string
  name: string
  description: string
  status: string
  techStack?: string
  summary?: string
  errorMessage?: string
}

export interface SerializedContainer {
  id: string
  name: string
  color: string
  blocks: SerializedBlock[]
}

export interface SerializedEdge {
  id: string
  source: string
  target: string
  type: string
  label?: string
}

export interface SchemaDocument {
  project: string
  schemaVersion?: number
  containers: SerializedContainer[]
  edges: SerializedEdge[]
}
