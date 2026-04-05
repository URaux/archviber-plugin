/**
 * Topological sort for build wave scheduling.
 * Extracted from ArchViber — already UI-independent.
 */

import type { ArchEdge } from './types'

export interface TopoEdge {
  source: string
  target: string
}

/**
 * Sort nodes into parallel execution waves based on dependency edges.
 * Nodes with no dependencies come first; each subsequent wave depends
 * on the previous waves being complete.
 *
 * Edge convention: edge.source depends on edge.target
 * (source -> target means "source needs target to be done first")
 *
 * @throws Error if cycle detected
 */
export function topoSort(nodeIds: string[], edges: TopoEdge[]): string[][] {
  const nodeOrder = new Map(nodeIds.map((id, index) => [id, index]))
  const inDegree = new Map(nodeIds.map(id => [id, 0]))
  const adjacency = new Map(nodeIds.map(id => [id, [] as string[]]))

  for (const edge of edges) {
    if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) continue
    adjacency.get(edge.target)?.push(edge.source)
    inDegree.set(edge.source, (inDegree.get(edge.source) ?? 0) + 1)
  }

  let currentWave = nodeIds.filter(id => (inDegree.get(id) ?? 0) === 0)
  const waves: string[][] = []
  let visitedCount = 0

  while (currentWave.length > 0) {
    currentWave.sort((a, b) => (nodeOrder.get(a) ?? 0) - (nodeOrder.get(b) ?? 0))
    waves.push([...currentWave])
    visitedCount += currentWave.length

    const nextWave: string[] = []
    for (const nodeId of currentWave) {
      for (const depId of adjacency.get(nodeId) ?? []) {
        const next = (inDegree.get(depId) ?? 0) - 1
        inDegree.set(depId, next)
        if (next === 0) nextWave.push(depId)
      }
    }
    currentWave = nextWave
  }

  if (visitedCount !== nodeIds.length) {
    throw new Error('Cycle detected in dependency graph')
  }

  return waves
}

/**
 * Get all transitive downstream dependents of a node.
 * "Downstream" = nodes that depend on the given node (directly or transitively).
 */
export function getDownstreamDependents(
  nodeId: string,
  allNodeIds: string[],
  edges: TopoEdge[]
): string[] {
  const dependents = new Map<string, string[]>()
  for (const id of allNodeIds) dependents.set(id, [])
  for (const edge of edges) {
    dependents.get(edge.target)?.push(edge.source)
  }

  const visited = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const current = queue.pop()!
    for (const dep of dependents.get(current) ?? []) {
      if (!visited.has(dep)) {
        visited.add(dep)
        queue.push(dep)
      }
    }
  }
  return Array.from(visited)
}
