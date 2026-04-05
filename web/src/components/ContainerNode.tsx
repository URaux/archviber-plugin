import { useState } from 'react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { NodeResizer } from '@xyflow/react'
import { COLLAPSED_CONTAINER_HEIGHT, layoutArchitectureCanvas } from '../lib/graph-layout'
import { useCanvasStore } from '../store'
import type { CanvasNodeData, ContainerNodeData, ContainerColor } from '../types'

const CONTAINER_COLOR_STYLES: Record<ContainerColor, { background: string; border: string; title: string }> = {
  blue:   { background: 'bg-blue-50',   border: 'border-blue-300',   title: 'bg-blue-500'   },
  green:  { background: 'bg-green-50',  border: 'border-green-300',  title: 'bg-green-500'  },
  purple: { background: 'bg-purple-50', border: 'border-purple-300', title: 'bg-purple-500' },
  amber:  { background: 'bg-amber-50',  border: 'border-amber-300',  title: 'bg-amber-500'  },
  rose:   { background: 'bg-rose-50',   border: 'border-rose-300',   title: 'bg-rose-500'   },
  slate:  { background: 'bg-slate-50',  border: 'border-slate-300',  title: 'bg-slate-500'  },
}

function cloneCanvas(nodes: Node<CanvasNodeData>[], edges: Edge[]) {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data },
      ...(node.style ? { style: { ...node.style } } : {}),
    })),
    edges: edges.map((edge) => ({ ...edge })),
  }
}

export function ContainerNode({ id, data, selected }: NodeProps<Node<ContainerNodeData>>) {
  const [isUpdating, setIsUpdating] = useState(false)
  const nodeData = data as ContainerNodeData
  const colorClasses = CONTAINER_COLOR_STYLES[nodeData.color] ?? CONTAINER_COLOR_STYLES.slate

  async function handleToggleCollapse() {
    if (isUpdating) return

    const { rfNodes, rfEdges, setCanvas } = useCanvasStore.getState()
    const nextCollapsed = !nodeData.collapsed
    const canvas = cloneCanvas(rfNodes, rfEdges)

    const nextNodes = canvas.nodes.map((node) => {
      if (node.id === id && node.type === 'container') {
        return {
          ...node,
          data: { ...node.data, collapsed: nextCollapsed },
          style: {
            ...node.style,
            ...(nextCollapsed ? { height: COLLAPSED_CONTAINER_HEIGHT } : {}),
          },
        }
      }
      if (node.type === 'block' && node.parentId === id) {
        return { ...node, hidden: nextCollapsed }
      }
      return node
    })

    if (nextCollapsed) {
      setCanvas(nextNodes as Node<CanvasNodeData>[], canvas.edges)
      return
    }

    setIsUpdating(true)
    try {
      const arranged = await layoutArchitectureCanvas(nextNodes as Node<CanvasNodeData>[], canvas.edges)
      setCanvas(arranged.nodes, arranged.edges)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div
      className={`h-full w-full overflow-hidden rounded-[12px] border ${colorClasses.background} ${
        colorClasses.border
      } ${selected ? 'ring-2 ring-orange-300/70 ring-offset-2 ring-offset-transparent' : ''}`}
    >
      <NodeResizer
        isVisible={selected && !nodeData.collapsed}
        minWidth={300}
        minHeight={140}
        lineClassName="!border-orange-300/50"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-orange-400 !bg-white"
      />
      <div className="flex items-start justify-between gap-3 p-3">
        <span
          className={`inline-flex rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white ${colorClasses.title}`}
        >
          {nodeData.name || 'Container'}
        </span>
        <button
          type="button"
          className="nodrag nopan rounded-full border border-white/70 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => { void handleToggleCollapse() }}
          aria-label={nodeData.collapsed ? 'Expand' : 'Collapse'}
          disabled={isUpdating}
        >
          {nodeData.collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
    </div>
  )
}
