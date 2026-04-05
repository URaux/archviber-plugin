/**
 * Converts between ArchProject (canonical JSON) and React Flow node/edge format.
 */
import type { Edge, Node } from '@xyflow/react'
import type {
  ArchProject,
  ArchEdge,
  ArchBlock,
  ArchContainer,
  CanvasNodeData,
  ContainerNodeData,
  BlockNodeData,
} from './types'

// Default dimensions — matches ArchViber constants
const CONTAINER_MIN_WIDTH = 400
const CONTAINER_MIN_HEIGHT = 180
const BLOCK_WIDTH = 200
const BLOCK_HEIGHT = 100

export function projectToRFNodes(project: ArchProject): Node<CanvasNodeData>[] {
  const nodes: Node<CanvasNodeData>[] = []
  let containerX = 0

  for (const archNode of project.nodes) {
    if (archNode.type === 'container') {
      const c = archNode as ArchContainer
      const containerData: ContainerNodeData = {
        name: c.name,
        color: c.color,
        collapsed: c.collapsed ?? false,
      }
      nodes.push({
        id: c.id,
        type: 'container',
        position: { x: containerX, y: 0 },
        data: containerData,
        style: { width: CONTAINER_MIN_WIDTH, height: CONTAINER_MIN_HEIGHT },
      })
      containerX += CONTAINER_MIN_WIDTH + 80
    }
  }

  // Now add blocks — place relative to their parent containers
  const blockCountByContainer: Record<string, number> = {}
  for (const archNode of project.nodes) {
    if (archNode.type === 'block') {
      const b = archNode as ArchBlock
      const parentId = b.parentId
      const count = blockCountByContainer[parentId ?? '__orphan'] ?? 0
      blockCountByContainer[parentId ?? '__orphan'] = count + 1

      const blockData: BlockNodeData = {
        name: b.name,
        description: b.description,
        status: b.status,
        techStack: b.techStack,
        summary: b.summary,
        errorMessage: b.errorMessage,
      }

      const blockNode: Node<CanvasNodeData> = {
        id: b.id,
        type: 'block',
        position: {
          x: 30 + (count % 2) * (BLOCK_WIDTH + 20),
          y: 60 + Math.floor(count / 2) * (BLOCK_HEIGHT + 20),
        },
        data: blockData,
        extent: parentId ? 'parent' : undefined,
      }

      if (parentId) {
        blockNode.parentId = parentId
      }

      nodes.push(blockNode)
    }
  }

  return nodes
}

export function projectToRFEdges(project: ArchProject): Edge[] {
  return project.edges.map((e: ArchEdge): Edge => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type, // 'sync' | 'async' | 'bidirectional'
    label: e.label,
    data: {},
  }))
}

export function rfToProject(
  rfNodes: Node<CanvasNodeData>[],
  rfEdges: Edge[],
  projectName: string,
  schemaVersion: number
): ArchProject {
  const archNodes: ArchProject['nodes'] = []

  for (const node of rfNodes) {
    if (node.type === 'container') {
      const d = node.data as ContainerNodeData
      archNodes.push({
        id: node.id,
        type: 'container',
        name: d.name,
        color: d.color,
        collapsed: d.collapsed,
      })
    } else if (node.type === 'block') {
      const d = node.data as BlockNodeData
      archNodes.push({
        id: node.id,
        type: 'block',
        parentId: node.parentId,
        name: d.name,
        description: d.description,
        status: d.status,
        techStack: d.techStack,
        summary: d.summary,
        errorMessage: d.errorMessage,
      })
    }
  }

  const archEdges: ArchProject['edges'] = rfEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: (e.type ?? 'sync') as 'sync' | 'async' | 'bidirectional',
    label: typeof e.label === 'string' ? e.label : undefined,
  }))

  return {
    schemaVersion,
    name: projectName,
    nodes: archNodes,
    edges: archEdges,
  }
}
