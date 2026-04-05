import { useEffect, useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import { toPng } from 'html-to-image'
import '@xyflow/react/dist/style.css'
import { useCanvasStore } from './store'
import { ContainerNode } from './components/ContainerNode'
import { BlockNode } from './components/BlockNode'
import { SyncEdge, AsyncEdge, BidirectionalEdge } from './components/edges'
import { layoutArchitectureCanvas } from './lib/graph-layout'

const nodeTypes = { container: ContainerNode, block: BlockNode }
const edgeTypes = { sync: SyncEdge, async: AsyncEdge, bidirectional: BidirectionalEdge }

function Canvas() {
  const { rfNodes, rfEdges, loadFromApi, saveToApi, setCanvas, pushSnapshot, undo, redo, projectName } = useCanvasStore()
  const { fitView, getNodes } = useReactFlow()

  useEffect(() => {
    loadFromApi()
  }, [loadFromApi])

  // After initial load, do auto-layout then fitView
  useEffect(() => {
    if (rfNodes.length > 0) {
      layoutArchitectureCanvas(rfNodes, rfEdges).then(({ nodes, edges }) => {
        setCanvas(nodes, edges)
        setTimeout(() => fitView({ padding: 0.15 }), 100)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName]) // re-layout when project changes

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const { rfNodes } = useCanvasStore.getState()
    const updated = applyNodeChanges(changes, rfNodes) as typeof rfNodes
    useCanvasStore.setState({ rfNodes: updated })
  }, [])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const { rfEdges } = useCanvasStore.getState()
    const updated = applyEdgeChanges(changes, rfEdges)
    useCanvasStore.setState({ rfEdges: updated })
  }, [])

  const onNodeDragStop = useCallback(() => {
    pushSnapshot()
    saveToApi()
  }, [pushSnapshot, saveToApi])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveToApi()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, saveToApi])

  // Export PNG handler
  const handleExportPng = async () => {
    const nodes = getNodes()
    if (nodes.length === 0) return

    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
    if (!viewport) return

    try {
      const padding = 40
      const bounds = getNodesBounds(nodes)
      const imageWidth = bounds.width + padding * 2
      const imageHeight = bounds.height + padding * 2
      const vp = getViewportForBounds(bounds, imageWidth, imageHeight, 1, 2, padding)

      const dataUrl = await toPng(viewport, {
        backgroundColor: '#f9fafb',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        },
      })

      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${projectName}.png`
      a.click()
    } catch {
      console.error('[ArchViber] PNG export failed')
    }
  }

  // Auto-layout button handler
  const handleAutoLayout = async () => {
    pushSnapshot()
    const { nodes, edges } = await layoutArchitectureCanvas(rfNodes, rfEdges)
    setCanvas(nodes, edges)
    saveToApi()
    setTimeout(() => fitView({ padding: 0.15 }), 100)
  }

  return (
    <div className="h-screen w-screen bg-[#f9fafb] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-white/90 backdrop-blur-[18px] border-b border-slate-200/80 text-sm">
        <span className="font-bold text-base italic text-slate-800">ArchViber</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">{projectName}</span>
        <div className="flex-1" />
        <button onClick={() => { void handleAutoLayout() }} className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-600">
          Auto Layout
        </button>
        <button onClick={() => { void handleExportPng() }} className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-600">
          Export PNG
        </button>
        <button onClick={() => { void saveToApi() }} className="px-3 py-1 rounded border border-[rgba(224,122,58,0.36)] bg-gradient-to-b from-[rgba(224,122,58,0.98)] to-[rgba(201,101,45,0.98)] hover:from-[rgba(236,137,74,0.98)] hover:to-[rgba(212,109,52,0.98)] text-xs text-orange-50 shadow-[0_4px_12px_rgba(224,122,58,0.22)]">
          Save
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="rgba(203,213,225,0.9)" gap={22} size={1.1} />
          <Controls className="!bg-white/95 !border-slate-200 !text-slate-600 [&_button]:!bg-white [&_button:hover]:!bg-slate-50 [&_button]:!text-slate-500 [&_button]:!border-slate-200" />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'container') return '#e2e8f0'
              return '#cbd5e1'
            }}
            className="!bg-white/95 !border-slate-200"
            maskColor="rgba(248,250,252,0.76)"
          />
          {/* Arrow markers for edges */}
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
              <marker id="arrow-reverse" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 10 0 L 0 5 L 10 10 z" fill="#94a3b8" />
              </marker>
            </defs>
          </svg>
        </ReactFlow>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}
