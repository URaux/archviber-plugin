/**
 * Zustand store — canvas-only, no chat/build orchestration.
 */
import { create } from 'zustand'
import type { Edge, Node } from '@xyflow/react'
import type { ArchProject, CanvasNodeData, DesignDecision } from './types'
import { projectToRFNodes, projectToRFEdges, rfToProject } from './mapping'

const MAX_UNDO = 20

interface Snapshot {
  rfNodes: Node<CanvasNodeData>[]
  rfEdges: Edge[]
}

interface CanvasStore {
  project: ArchProject | null
  projectName: string
  schemaVersion: number
  decisions: DesignDecision[]
  rfNodes: Node<CanvasNodeData>[]
  rfEdges: Edge[]
  past: Snapshot[]
  future: Snapshot[]

  setProject: (p: ArchProject) => void
  loadFromApi: () => Promise<void>
  saveToApi: () => Promise<void>
  updateNodeData: (id: string, data: Partial<CanvasNodeData>) => void
  setCanvas: (nodes: Node<CanvasNodeData>[], edges: Edge[]) => void

  // Undo/redo
  pushSnapshot: () => void
  undo: () => void
  redo: () => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  project: null,
  projectName: 'Untitled',
  schemaVersion: 1,
  decisions: [],
  rfNodes: [],
  rfEdges: [],
  past: [],
  future: [],

  setProject(p: ArchProject) {
    const rfNodes = projectToRFNodes(p)
    const rfEdges = projectToRFEdges(p)
    set({
      project: p,
      projectName: p.name,
      schemaVersion: p.schemaVersion,
      decisions: p.decisions ?? [],
      rfNodes,
      rfEdges,
      past: [],
      future: [],
    })
  },

  async loadFromApi() {
    try {
      const res = await fetch('/api/project')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const p: ArchProject = await res.json()
      get().setProject(p)
    } catch (err) {
      console.error('[ArchViber] Failed to load project:', err)
    }
  },

  async saveToApi() {
    const { rfNodes, rfEdges, projectName, schemaVersion } = get()
    const p = rfToProject(rfNodes, rfEdges, projectName, schemaVersion)
    try {
      await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
    } catch (err) {
      console.error('[ArchViber] Failed to save project:', err)
    }
  },

  updateNodeData(id: string, data: Partial<CanvasNodeData>) {
    get().pushSnapshot()
    set((state) => ({
      rfNodes: state.rfNodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }))
  },

  setCanvas(nodes: Node<CanvasNodeData>[], edges: Edge[]) {
    set({ rfNodes: nodes, rfEdges: edges })
  },

  pushSnapshot() {
    const { rfNodes, rfEdges, past } = get()
    const snapshot: Snapshot = { rfNodes: [...rfNodes], rfEdges: [...rfEdges] }
    const newPast = [...past, snapshot].slice(-MAX_UNDO)
    set({ past: newPast, future: [] })
  },

  undo() {
    const { past, rfNodes, rfEdges, future } = get()
    if (past.length === 0) return
    const prev = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      future: [{ rfNodes, rfEdges }, ...future].slice(0, MAX_UNDO),
      rfNodes: prev.rfNodes,
      rfEdges: prev.rfEdges,
    })
  },

  redo() {
    const { past, rfNodes, rfEdges, future } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      future: future.slice(1),
      past: [...past, { rfNodes, rfEdges }].slice(-MAX_UNDO),
      rfNodes: next.rfNodes,
      rfEdges: next.rfEdges,
    })
  },
}))
