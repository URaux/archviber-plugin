/**
 * ArchViber Core — Unit Tests
 * Uses Node.js built-in test runner (node:test + node:assert).
 * Run with: node --experimental-strip-types --test core/__tests__/core.test.ts
 *         or: npx tsx --test core/__tests__/core.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  createProject,
  addContainer,
  addBlock,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
  moveBlock,
  findNodeByName,
} from '../operations.js'

import {
  projectToJson,
  jsonToProject,
  projectToMermaid,
  projectToTree,
  projectToYaml,
} from '../serialization.js'

import { topoSort } from '../topo-sort.js'

// ─── Helpers ─────────────────────────────────────────────

function makePopulated() {
  let p = createProject('Test Project')
  p = addContainer(p, 'Frontend', 'blue', 'c-frontend')
  p = addContainer(p, 'Backend', 'green', 'c-backend')
  p = addBlock(p, 'UI', 'React app', 'c-frontend', { id: 'b-ui' })
  p = addBlock(p, 'API', 'REST API', 'c-backend', { id: 'b-api' })
  p = addBlock(p, 'DB', 'Postgres', 'c-backend', { id: 'b-db' })
  p = addEdge(p, 'b-ui', 'b-api', 'sync', 'HTTP', 'e1')
  p = addEdge(p, 'b-api', 'b-db', 'async', undefined, 'e2')
  return p
}

// ─── 1. createProject ────────────────────────────────────

describe('createProject()', () => {
  it('returns a valid project with schemaVersion 1', () => {
    const p = createProject('My App')
    assert.equal(p.schemaVersion, 1)
    assert.equal(p.name, 'My App')
    assert.deepEqual(p.nodes, [])
    assert.deepEqual(p.edges, [])
  })

  it('does not include decisions or metadata by default', () => {
    const p = createProject('Clean')
    assert.equal(p.decisions, undefined)
    assert.equal(p.metadata, undefined)
  })
})

// ─── 2. addContainer / addBlock ──────────────────────────

describe('addContainer()', () => {
  it('adds a container node with correct shape', () => {
    const p = addContainer(createProject('X'), 'Services', 'green', 'c1')
    assert.equal(p.nodes.length, 1)
    const c = p.nodes[0]
    assert.equal(c.id, 'c1')
    assert.equal(c.type, 'container')
    assert.equal(c.name, 'Services')
    assert.equal((c as any).color, 'green')
  })

  it('defaults invalid color to "blue"', () => {
    const p = addContainer(createProject('X'), 'C', 'neon' as any)
    assert.equal((p.nodes[0] as any).color, 'blue')
  })

  it('generates an id when none provided', () => {
    const p = addContainer(createProject('X'), 'Auto')
    assert.ok(p.nodes[0].id.length > 0)
  })
})

describe('addBlock()', () => {
  it('adds a block with correct shape', () => {
    let p = createProject('X')
    p = addContainer(p, 'C', 'blue', 'c1')
    p = addBlock(p, 'Auth', 'Auth service', 'c1', { id: 'b1' })
    const b = p.nodes.find(n => n.id === 'b1')!
    assert.ok(b)
    assert.equal(b.type, 'block')
    assert.equal(b.name, 'Auth')
    assert.equal((b as any).description, 'Auth service')
    assert.equal((b as any).status, 'idle')
    assert.equal((b as any).parentId, 'c1')
  })

  it('adds orphan block when parentId omitted', () => {
    const p = addBlock(createProject('X'), 'Standalone', '', undefined, { id: 'b-solo' })
    const b = p.nodes[0] as any
    assert.equal(b.parentId, undefined)
  })

  it('throws when parentId references non-existent container', () => {
    assert.throws(
      () => addBlock(createProject('X'), 'Fail', '', 'no-such-container'),
      /not found/
    )
  })

  it('throws when parentId references a block (not a container)', () => {
    let p = createProject('X')
    p = addBlock(p, 'Block1', '', undefined, { id: 'b1' })
    assert.throws(
      () => addBlock(p, 'Block2', '', 'b1'),
      /not found/
    )
  })

  it('stores optional techStack', () => {
    let p = createProject('X')
    p = addContainer(p, 'C', 'blue', 'c1')
    p = addBlock(p, 'Svc', '', 'c1', { techStack: 'Node.js', id: 'b1' })
    assert.equal((p.nodes[1] as any).techStack, 'Node.js')
  })
})

// ─── 3. removeNode ───────────────────────────────────────

describe('removeNode()', () => {
  it('removes a standalone block', () => {
    let p = makePopulated()
    p = removeNode(p, 'b-ui')
    assert.ok(!p.nodes.find(n => n.id === 'b-ui'))
  })

  it('cascades: removing a container removes its children', () => {
    let p = makePopulated()
    p = removeNode(p, 'c-backend')
    assert.ok(!p.nodes.find(n => n.id === 'c-backend'))
    assert.ok(!p.nodes.find(n => n.id === 'b-api'))
    assert.ok(!p.nodes.find(n => n.id === 'b-db'))
  })

  it('cascades: removing a container removes edges connected to its children', () => {
    let p = makePopulated()
    p = removeNode(p, 'c-backend')
    // e1 (b-ui -> b-api) and e2 (b-api -> b-db) should both be removed
    assert.ok(!p.edges.find(e => e.id === 'e1'))
    assert.ok(!p.edges.find(e => e.id === 'e2'))
  })

  it('no-ops when nodeId does not exist', () => {
    const p = makePopulated()
    const p2 = removeNode(p, 'ghost')
    assert.equal(p2.nodes.length, p.nodes.length)
  })
})

// ─── 4. updateNode ───────────────────────────────────────

describe('updateNode()', () => {
  it('applies partial updates to a block', () => {
    let p = makePopulated()
    p = updateNode(p, 'b-api', { status: 'done', summary: 'Shipped!' })
    const b = p.nodes.find(n => n.id === 'b-api') as any
    assert.equal(b.status, 'done')
    assert.equal(b.summary, 'Shipped!')
    assert.equal(b.name, 'API') // unchanged
  })

  it('applies partial updates to a container', () => {
    let p = makePopulated()
    p = updateNode(p, 'c-frontend', { name: 'Client Layer' })
    const c = p.nodes.find(n => n.id === 'c-frontend') as any
    assert.equal(c.name, 'Client Layer')
    assert.equal(c.color, 'blue') // unchanged
  })

  it('leaves other nodes unchanged', () => {
    let p = makePopulated()
    const beforeCount = p.nodes.length
    p = updateNode(p, 'b-db', { status: 'building' })
    assert.equal(p.nodes.length, beforeCount)
  })
})

// ─── 5. addEdge / removeEdge ─────────────────────────────

describe('addEdge()', () => {
  it('creates an edge with correct shape', () => {
    let p = createProject('X')
    p = addContainer(p, 'C', 'blue', 'c1')
    p = addBlock(p, 'A', '', 'c1', { id: 'b1' })
    p = addBlock(p, 'B', '', 'c1', { id: 'b2' })
    p = addEdge(p, 'b1', 'b2', 'async', 'queue', 'e1')
    assert.equal(p.edges.length, 1)
    const e = p.edges[0]
    assert.equal(e.id, 'e1')
    assert.equal(e.source, 'b1')
    assert.equal(e.target, 'b2')
    assert.equal(e.type, 'async')
    assert.equal(e.label, 'queue')
  })

  it('prevents duplicate edges (same source+target)', () => {
    let p = makePopulated()
    assert.throws(
      () => addEdge(p, 'b-ui', 'b-api', 'sync'),
      /already exists/
    )
  })

  it('throws when source node does not exist', () => {
    const p = makePopulated()
    assert.throws(
      () => addEdge(p, 'ghost', 'b-api'),
      /Source node.*not found/
    )
  })

  it('throws when target node does not exist', () => {
    const p = makePopulated()
    assert.throws(
      () => addEdge(p, 'b-ui', 'ghost'),
      /Target node.*not found/
    )
  })

  it('defaults invalid edge type to "sync"', () => {
    let p = createProject('X')
    p = addContainer(p, 'C', 'blue', 'c1')
    p = addBlock(p, 'A', '', 'c1', { id: 'b1' })
    p = addBlock(p, 'B', '', 'c1', { id: 'b2' })
    p = addEdge(p, 'b1', 'b2', 'telepathy' as any)
    assert.equal(p.edges[0].type, 'sync')
  })
})

describe('removeEdge()', () => {
  it('removes the specified edge', () => {
    let p = makePopulated()
    p = removeEdge(p, 'e1')
    assert.ok(!p.edges.find(e => e.id === 'e1'))
    assert.equal(p.edges.length, 1)
  })

  it('no-ops when edge does not exist', () => {
    const p = makePopulated()
    const p2 = removeEdge(p, 'ghost-edge')
    assert.equal(p2.edges.length, p.edges.length)
  })
})

// ─── 6. moveBlock ────────────────────────────────────────

describe('moveBlock()', () => {
  it('re-parents a block to a new container', () => {
    let p = makePopulated()
    p = moveBlock(p, 'b-ui', 'c-backend')
    const b = p.nodes.find(n => n.id === 'b-ui') as any
    assert.equal(b.parentId, 'c-backend')
  })

  it('removes parentId when new parent is null (orphan)', () => {
    let p = makePopulated()
    p = moveBlock(p, 'b-ui', null)
    const b = p.nodes.find(n => n.id === 'b-ui') as any
    assert.equal(b.parentId, undefined)
  })

  it('throws when target container does not exist', () => {
    const p = makePopulated()
    assert.throws(
      () => moveBlock(p, 'b-ui', 'no-container'),
      /not found/
    )
  })

  it('leaves edges intact after move', () => {
    let p = makePopulated()
    p = moveBlock(p, 'b-ui', 'c-backend')
    assert.equal(p.edges.length, 2) // edges unchanged
  })
})

// ─── 7. findNodeByName ───────────────────────────────────

describe('findNodeByName()', () => {
  it('finds a node by exact name', () => {
    const p = makePopulated()
    const n = findNodeByName(p, 'API')
    assert.ok(n)
    assert.equal(n!.id, 'b-api')
  })

  it('is case-insensitive', () => {
    const p = makePopulated()
    assert.ok(findNodeByName(p, 'api'))
    assert.ok(findNodeByName(p, 'API'))
    assert.ok(findNodeByName(p, 'ApI'))
  })

  it('returns undefined when no match', () => {
    const p = makePopulated()
    assert.equal(findNodeByName(p, 'Nonexistent'), undefined)
  })
})

// ─── 8. topoSort ─────────────────────────────────────────

describe('topoSort()', () => {
  it('places nodes with no dependencies in wave 0', () => {
    const ids = ['A', 'B', 'C']
    // A depends on B: edge source=A, target=B means A needs B first
    const edges = [{ source: 'A', target: 'B' }]
    const waves = topoSort(ids, edges)
    assert.ok(waves[0].includes('B'))
    assert.ok(waves[0].includes('C'))
    assert.ok(waves[1].includes('A'))
  })

  it('handles linear chain', () => {
    const ids = ['A', 'B', 'C']
    // C -> B -> A (A depends on B, B depends on C)
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ]
    const waves = topoSort(ids, edges)
    assert.equal(waves.length, 3)
    assert.deepEqual(waves[0], ['C'])
    assert.deepEqual(waves[1], ['B'])
    assert.deepEqual(waves[2], ['A'])
  })

  it('returns all nodes in some wave', () => {
    const ids = ['X', 'Y', 'Z']
    const waves = topoSort(ids, [])
    const all = waves.flat()
    assert.equal(all.length, 3)
    assert.ok(all.includes('X'))
    assert.ok(all.includes('Y'))
    assert.ok(all.includes('Z'))
  })

  it('throws on cycle detection', () => {
    const ids = ['A', 'B']
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
    ]
    assert.throws(() => topoSort(ids, edges), /[Cc]ycle/)
  })

  it('handles self-loop as a cycle', () => {
    const ids = ['A']
    const edges = [{ source: 'A', target: 'A' }]
    assert.throws(() => topoSort(ids, edges), /[Cc]ycle/)
  })

  it('uses project edges correctly with makePopulated', () => {
    // b-ui -> b-api -> b-db: so db first, then api, then ui
    const p = makePopulated()
    const blockIds = p.nodes.filter(n => n.type === 'block').map(n => n.id)
    const waves = topoSort(blockIds, p.edges.map(e => ({ source: e.source, target: e.target })))
    const all = waves.flat()
    assert.equal(all.length, blockIds.length)
    // b-db should appear before b-api, b-api before b-ui
    const dbIdx = all.indexOf('b-db')
    const apiIdx = all.indexOf('b-api')
    const uiIdx = all.indexOf('b-ui')
    assert.ok(dbIdx < apiIdx)
    assert.ok(apiIdx < uiIdx)
  })
})

// ─── 9. projectToJson / jsonToProject (round-trip) ───────

describe('projectToJson() / jsonToProject() round-trip', () => {
  it('round-trips a populated project without data loss', () => {
    const original = makePopulated()
    const json = projectToJson(original)
    const restored = jsonToProject(json)

    assert.equal(restored.schemaVersion, original.schemaVersion)
    assert.equal(restored.name, original.name)
    assert.equal(restored.nodes.length, original.nodes.length)
    assert.equal(restored.edges.length, original.edges.length)
  })

  it('produces valid JSON', () => {
    const json = projectToJson(makePopulated())
    assert.doesNotThrow(() => JSON.parse(json))
  })

  it('preserves node ids and types', () => {
    const original = makePopulated()
    const restored = jsonToProject(projectToJson(original))
    for (const node of original.nodes) {
      const rNode = restored.nodes.find(n => n.id === node.id)
      assert.ok(rNode, `node ${node.id} missing after round-trip`)
      assert.equal(rNode!.type, node.type)
    }
  })

  it('preserves edge ids, source, target, type', () => {
    const original = makePopulated()
    const restored = jsonToProject(projectToJson(original))
    for (const edge of original.edges) {
      const rEdge = restored.edges.find(e => e.id === edge.id)
      assert.ok(rEdge, `edge ${edge.id} missing after round-trip`)
      assert.equal(rEdge!.source, edge.source)
      assert.equal(rEdge!.target, edge.target)
      assert.equal(rEdge!.type, edge.type)
    }
  })

  it('returns a safe default when given empty/invalid JSON', () => {
    const p = jsonToProject('{}')
    assert.equal(p.schemaVersion, 1)
    assert.equal(p.name, 'Untitled')
  })
})

// ─── 10. projectToMermaid ────────────────────────────────

describe('projectToMermaid()', () => {
  it('starts with "graph TB"', () => {
    const mmd = projectToMermaid(makePopulated())
    assert.ok(mmd.startsWith('graph TB'))
  })

  it('includes subgraph for containers that have children', () => {
    const mmd = projectToMermaid(makePopulated())
    assert.ok(mmd.includes('subgraph'))
    assert.ok(mmd.includes('Frontend') || mmd.includes('c_frontend'))
  })

  it('uses dashed arrow for async edges', () => {
    const mmd = projectToMermaid(makePopulated())
    assert.ok(mmd.includes('-.->')  )
  })

  it('uses solid arrow for sync edges', () => {
    const mmd = projectToMermaid(makePopulated())
    assert.ok(mmd.match(/-->/))
  })

  it('uses bidirectional arrow for bidirectional edges', () => {
    let p = makePopulated()
    p = addEdge(p, 'b-db', 'b-ui', 'bidirectional', undefined, 'e-bidir')
    const mmd = projectToMermaid(p)
    assert.ok(mmd.includes('<-->'))
  })

  it('includes edge labels', () => {
    const mmd = projectToMermaid(makePopulated())
    assert.ok(mmd.includes('HTTP'))
  })

  it('includes project name comment', () => {
    const mmd = projectToMermaid(makePopulated())
    assert.ok(mmd.includes('Test Project'))
  })
})

// ─── 11. projectToTree ───────────────────────────────────

describe('projectToTree()', () => {
  it('contains container names', () => {
    const tree = projectToTree(makePopulated())
    assert.ok(tree.includes('Frontend'))
    assert.ok(tree.includes('Backend'))
  })

  it('contains block names with statuses', () => {
    const tree = projectToTree(makePopulated())
    assert.ok(tree.includes('UI'))
    assert.ok(tree.includes('API'))
    assert.ok(tree.includes('idle'))
  })

  it('first line includes project name and version', () => {
    const tree = projectToTree(makePopulated())
    const firstLine = tree.split('\n')[0]
    assert.ok(firstLine.includes('Test Project'))
    assert.ok(firstLine.includes('1'))
  })

  it('includes edges section when edges exist', () => {
    const tree = projectToTree(makePopulated())
    assert.ok(tree.includes('Edges'))
  })

  it('does not include edges section when no edges', () => {
    let p = createProject('Empty')
    p = addContainer(p, 'C', 'blue', 'c1')
    const tree = projectToTree(p)
    assert.ok(!tree.includes('Edges'))
  })
})

// ─── 12. projectToYaml ───────────────────────────────────

describe('projectToYaml()', () => {
  it('starts with "project:"', () => {
    const yaml = projectToYaml(makePopulated())
    assert.ok(yaml.startsWith('project:'))
  })

  it('includes container names', () => {
    const yaml = projectToYaml(makePopulated())
    assert.ok(yaml.includes('Frontend'))
    assert.ok(yaml.includes('Backend'))
  })

  it('includes block data', () => {
    const yaml = projectToYaml(makePopulated())
    assert.ok(yaml.includes('UI'))
    assert.ok(yaml.includes('API'))
  })

  it('includes edges section', () => {
    const yaml = projectToYaml(makePopulated())
    assert.ok(yaml.includes('edges'))
  })

  it('includes edge type values', () => {
    const yaml = projectToYaml(makePopulated())
    assert.ok(yaml.includes('sync') || yaml.includes('async'))
  })

  it('groups orphan blocks under "Ungrouped"', () => {
    let p = createProject('X')
    p = addBlock(p, 'Floater', 'no parent', undefined, { id: 'b-float' })
    const yaml = projectToYaml(p)
    assert.ok(yaml.includes('Ungrouped'))
  })

  it('includes schemaVersion', () => {
    const yaml = projectToYaml(makePopulated())
    assert.ok(yaml.includes('schemaVersion'))
  })
})

// ─── 13. Legacy migration ────────────────────────────────

describe('jsonToProject() — legacy ArchViber format migration', () => {
  const legacyJson = JSON.stringify({
    name: 'Legacy App',
    canvas: {
      nodes: [
        {
          id: 'rf-c1',
          type: 'container',
          data: { name: 'Old Container', color: 'purple' },
        },
        {
          id: 'rf-b1',
          type: 'block',
          parentId: 'rf-c1',
          data: {
            name: 'Old Block',
            description: 'Legacy description',
            status: 'done',
            techStack: 'Flask',
          },
        },
        {
          id: 'rf-b2',
          type: 'block',
          data: {
            name: 'Orphan Block',
            description: '',
            status: 'idle',
          },
        },
      ],
      edges: [
        {
          id: 'rf-e1',
          source: 'rf-b1',
          target: 'rf-b2',
          type: 'async',
          label: 'legacy event',
        },
      ],
    },
    config: { theme: 'dark' },
    history: [],
  })

  it('detects and migrates legacy format', () => {
    const p = jsonToProject(legacyJson)
    assert.equal(p.name, 'Legacy App')
    assert.equal(p.schemaVersion, 1)
  })

  it('migrates container nodes correctly', () => {
    const p = jsonToProject(legacyJson)
    const c = p.nodes.find(n => n.id === 'rf-c1')
    assert.ok(c)
    assert.equal(c!.type, 'container')
    assert.equal(c!.name, 'Old Container')
    assert.equal((c as any).color, 'purple')
  })

  it('migrates block nodes correctly', () => {
    const p = jsonToProject(legacyJson)
    const b = p.nodes.find(n => n.id === 'rf-b1')
    assert.ok(b)
    assert.equal(b!.type, 'block')
    assert.equal(b!.name, 'Old Block')
    assert.equal((b as any).parentId, 'rf-c1')
    assert.equal((b as any).status, 'done')
    assert.equal((b as any).techStack, 'Flask')
  })

  it('migrates edges correctly', () => {
    const p = jsonToProject(legacyJson)
    assert.equal(p.edges.length, 1)
    const e = p.edges[0]
    assert.equal(e.id, 'rf-e1')
    assert.equal(e.source, 'rf-b1')
    assert.equal(e.target, 'rf-b2')
    assert.equal(e.type, 'async')
    assert.equal(e.label, 'legacy event')
  })

  it('migrates orphan blocks (no parentId)', () => {
    const p = jsonToProject(legacyJson)
    const orphan = p.nodes.find(n => n.id === 'rf-b2')
    assert.ok(orphan)
    assert.equal((orphan as any).parentId, undefined)
  })

  it('normalises unknown status values in legacy nodes', () => {
    const withBadStatus = JSON.stringify({
      name: 'X',
      canvas: {
        nodes: [{ id: 'n1', type: 'block', data: { name: 'N', status: 'RUNNING' } }],
        edges: [],
      },
    })
    const p = jsonToProject(withBadStatus)
    assert.equal((p.nodes[0] as any).status, 'idle')
  })

  it('normalises unknown colors in legacy container nodes', () => {
    const withBadColor = JSON.stringify({
      name: 'X',
      canvas: {
        nodes: [{ id: 'c1', type: 'container', data: { name: 'C', color: 'rainbow' } }],
        edges: [],
      },
    })
    const p = jsonToProject(withBadColor)
    assert.equal((p.nodes[0] as any).color, 'blue')
  })
})
