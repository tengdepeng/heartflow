// ============================================================
// useKnowledgeTowerUi —— 经略阁视图 UI 状态/逻辑聚合（T6 拆分）
// 设计要点：
//  - tower(useKnowledgeTower) 是数据层单例（跨实例共享、本地存储）。
//  - 本 composable 的状态（mode/form/showModal/stormItems/activeNode…）
//    为【每视图实例】级别：每次调用生成全新状态，保证测试挂载隔离
//    （原视图每个 mount 都重新初始化 mode='list'）。
//  - 视图调用一次 useKnowledgeTowerUi() 并经 provide 下发；各模式子组件
//    经 useKtUi() inject 共享同一实例 —— 既隔离于不同挂载，又在同一
//    视图内跨子组件共享（取代原视图内 16 个内联模式块的状态耦合）。
// ============================================================
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  inject,
  type InjectionKey,
} from 'vue'
import { IMPORT_SOURCE_ICONS } from './importer'
import type { ImportSource } from './importer'
import { getRelations } from './relation'
import { RELATION_TYPE_META } from './types'
import type { KnowledgeRelation } from './types'
import { useKnowledgeTower } from './knowledge-tower'
import { applyEnhancedForceLayout } from './graph-visualization'
import type { GraphNode, GraphEdge, EnhancedForceParams } from './graph-visualization'
import { CATEGORY_PALETTE } from '../../theme/categoryColors'

const tower = useKnowledgeTower()
const { nodes, importSources, starPositions, saveImportSources, saveStarPositions, saveNodes } = tower

export interface KNode {
  id: string
  title: string
  desc: string
  cat: string
  links: string[]
}

interface StarNodeData {
  id: string
  title: string
  cat: string
  desc: string
  x: number
  y: number
  vx: number
  vy: number
  fixed: boolean
}

export function useKnowledgeTowerUi() {
  const s = saveNodes

  // 数据层为模块级单例，必须在【函数体内】调用 onMounted，才能绑定到
  // 挂载该 composable 的活跃组件实例（即 KnowledgeTower 骨架）。每次骨架
  // 挂载都会从本地存储加载 nodes/importSources/starPositions，保证测试
  // 间状态隔离（与原视图 onMounted(tower.load) 行为一致）。
  onMounted(tower.load)

  const form = reactive({ title: '', desc: '', cat: 'concept' })
  function addNode() {
    if (!form.title.trim()) return
    nodes.value.unshift({
      id: `kn${Date.now()}`,
      title: form.title,
      desc: form.desc,
      cat: form.cat,
      links: [],
    })
    s()
    form.title = ''
    form.desc = ''
  }

  const mode = ref('list')
  const modes = [
    { key: 'list', label: '列表', icon: '📋' },
    { key: 'graph', label: '星图', icon: '🌟' },
    { key: '3d', label: '3D星图', icon: '🌌' },
    { key: 'outline', label: '大纲', icon: '📑' },
    { key: 'brainstorm', label: '头脑风暴', icon: '💭' },
    { key: 'timeline', label: '时间线', icon: '📅' },
    { key: 'map', label: '盲区地图', icon: '🗺' },
    { key: 'ring', label: '年轮', icon: '🌲' },
    { key: 'tree', label: '树状', icon: '🌳' },
    { key: 'network', label: '网络', icon: '🕸' },
    { key: 'gallery', label: '画廊', icon: '🖼' },
    { key: 'bookshelf', label: '书架', icon: '📚' },
    { key: 'socratic', label: '深度追问', icon: '❓' },
    { key: 'letters', label: '信笺', icon: '✉️' },
    { key: 'tapes', label: '磁带', icon: '📼' },
    { key: 'import', label: '导入来源', icon: '📥' },
  ]

  // 搜索筛选
  const searchQuery = ref('')
  const filteredNodes = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return nodes.value
    return nodes.value.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.desc.toLowerCase().includes(q) ||
        n.cat.includes(q),
    )
  })

  // AI管家
  const showSteward = ref(false)
  const stewardTips = computed(() => {
    const tips: string[] = []
    const nodeList = nodes.value
    const relList = computedRelations.value
    const catCounts = categories.map((c) => ({
      key: c.key,
      label: c.label,
      count: nodesByCat(c.key).length,
    }))
    const maxCat = catCounts.reduce((a, b) => (a.count > b.count ? a : b), catCounts[0])
    const minCat = catCounts.reduce((a, b) => (a.count < b.count ? a : b), catCounts[0])
    const emptyCats = catCounts.filter((c) => c.count === 0)
    if (nodeList.length === 0) {
      tips.push('开始创建你的第一个知识节点吧，星图将随之点亮。')
    } else {
      tips.push(`当前知识体系以「${maxCat.label}」为主，共 ${maxCat.count} 个节点。`)
      if (emptyCats.length > 0) {
        tips.push(
          `以下分类尚为空缺：${emptyCats.map((c) => c.label).join('、')}。尝试补充这些维度，让知识图谱更完整。`,
        )
      }
      if (minCat.count > 0 && minCat.count < maxCat.count * 0.3) {
        tips.push(`「${minCat.label}」领域密度较低，建议深入挖掘该方向的知识节点。`)
      }
      if (relList.length < nodeList.length * 0.5) {
        tips.push('节点之间的关联关系较少，尝试为已有节点添加关系连接，发现知识间的隐藏联系。')
      }
      if (nodeList.length >= 5) {
        tips.push('知识体量不错！定期回顾和整理，保持星图的活力。')
      }
    }
    return tips
  })

  /** 知识健康评分 (0-100) */
  const healthScore = computed(() => {
    const nodeList = nodes.value
    if (nodeList.length === 0) return 0
    const relList = computedRelations.value
    const catCounts = categories.map((c) => nodesByCat(c.key).length)
    const activeCats = catCounts.filter((c) => c > 0).length
    const totalCats = categories.length

    const densityScore = Math.min(30, (nodeList.length / 10) * 30)
    const relRatio = nodeList.length > 0 ? relList.length / nodeList.length : 0
    const relationScore = Math.min(30, relRatio * 30 * 2)
    const diversityScore = (activeCats / totalCats) * 20
    const hasDesc = nodeList.filter((n) => n.desc.trim().length > 0).length
    const depthScore = (hasDesc / nodeList.length) * 20

    return Math.round(densityScore + relationScore + diversityScore + depthScore)
  })

  const healthLevel = computed(() => {
    const sc = healthScore.value
    if (sc >= 80) return { label: '茁壮', color: '#34d399' }
    if (sc >= 60) return { label: '良好', color: '#f0c040' }
    if (sc >= 40) return { label: '初萌', color: '#f6b26b' }
    if (sc >= 20) return { label: '萌芽', color: '#b5707a' }
    return { label: '待育', color: '#ef4444' }
  })

  // 导入来源
  const showImportModal = ref(false)
  function handleImport(source: ImportSource) {
    importSources.value.unshift(source)
    saveImportSources()
    showImportModal.value = false
  }
  function deleteImportSource(id: string) {
    importSources.value = importSources.value.filter((x) => x.id !== id)
    saveImportSources()
  }

  // 信笺/磁带筛选
  const chatSources = computed(() => importSources.value.filter((x) => x.type === 'chat'))
  const callSources = computed(() => importSources.value.filter((x) => x.type === 'call'))

  function formatImportDate(iso: string): string {
    try {
      const d = new Date(iso)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`
    } catch {
      return iso.slice(0, 10)
    }
  }

  // 磁带波形路径生成（基于 source id 的伪随机波形）
  function tapeWavePath(id: string): string {
    const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const points: string[] = []
    for (let x = 0; x <= 80; x += 4) {
      const y = 10 + Math.sin((x + seed) * 0.3) * 4 + Math.cos((x + seed * 2) * 0.7) * 2
      points.push(`${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`)
    }
    return points.join(' ')
  }

  const categories = [
    { key: 'concept', label: '概念', icon: '💡' },
    { key: 'rule', label: '法则', icon: '📏' },
    { key: 'frame', label: '框架', icon: '🔲' },
    { key: 'insight', label: '直觉', icon: '✨' },
    { key: 'pitfall', label: '误区', icon: '⚠️' },
    { key: 'metaphor', label: '比喻', icon: '🎭' },
  ]
  function nodesByCat(cat: string) {
    return nodes.value.filter((n) => n.cat === cat)
  }
  function catIcon(c: string) {
    const m: Record<string, string> = {
      concept: '💡',
      rule: '📏',
      frame: '🔲',
      insight: '✨',
      pitfall: '⚠️',
      metaphor: '🎭',
    }
    return m[c] || '💡'
  }
  function catColor(c: string) {
    const m: Record<string, string> = {
      concept: CATEGORY_PALETTE[12],
      rule: CATEGORY_PALETTE[11],
      frame: CATEGORY_PALETTE[8],
      insight: CATEGORY_PALETTE[10],
      pitfall: CATEGORY_PALETTE[14],
      metaphor: CATEGORY_PALETTE[5],
    }
    return m[c] || '#555'
  }
  function catDensity(c: string) {
    const max = Math.max(1, ...categories.map((x) => nodesByCat(x.key).length))
    return Math.round((nodesByCat(c).length / max) * 100)
  }

  // ---- 星图模式 ----
  /** 将节点数据与位置合并为星图节点 */
  const starNodes = computed<StarNodeData[]>(() => {
    return nodes.value.map((n) => {
      const pos = starPositions.value[n.id]
      return {
        id: n.id,
        title: n.title,
        cat: n.cat,
        desc: n.desc,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
        vx: 0,
        vy: 0,
        fixed: pos != null,
      }
    })
  })

  /** 与当前节点列表关联的关系 */
  const computedRelations = computed<KnowledgeRelation[]>(() => {
    const nodeIds = new Set(nodes.value.map((n) => n.id))
    return getRelations().filter((r) => nodeIds.has(r.sourceId) && nodeIds.has(r.targetId))
  })

  /** 悬停的关系 id */
  const hoveredRelation = ref<string | undefined>()

  /** 按 id 查找节点 */
  function findNode(id: string) {
    return nodes.value.find((n) => n.id === id)!
  }

  /** 获取节点位置 */
  function getNodePos(id: string): { x: number; y: number } {
    return starPositions.value[id] ?? { x: 0, y: 0 }
  }

  /** 背景星点（确定性伪随机） */
  const bgStars = computed(() => {
    const stars: { key: string; cx: number; cy: number; r: number; fill: string }[] = []
    for (let i = 0; i < 60; i++) {
      const seed = i * 137.5
      const cx = Math.sin(seed) * 180
      const cy = Math.cos(seed * 0.707) * 180
      const r = 0.5 + (Math.sin(seed * 1.3) * 0.5 + 0.5) * 1.5
      const op = 0.08 + (Math.cos(seed * 0.5) * 0.5 + 0.5) * 0.12
      stars.push({ key: 'bg' + i, cx, cy, r, fill: `rgba(var(--accent-rgb), ${op.toFixed(3)})` })
    }
    return stars
  })

  /** 力导向布局模拟（委托 graph-visualization 成熟引擎，消除内联重复实现） */
  function runForceSimulation() {
    const nodeList = nodes.value
    if (nodeList.length === 0) return

    const graphNodes: GraphNode[] = nodeList.map((n, i) => {
      const pos = starPositions.value[n.id]
      const angle = (i / Math.max(1, nodeList.length)) * Math.PI * 2
      return {
        id: n.id,
        label: n.title,
        knowledgeId: n.id,
        x: pos?.x ?? Math.cos(angle) * 120,
        y: pos?.y ?? Math.sin(angle) * 120,
        radius: 12,
        color: catColor(n.cat),
        category: n.cat,
        tags: [],
        importance: 0.5,
        degree: n.links.length,
        selected: false,
        highlighted: false,
        pinned: pos != null,
      }
    })

    const graphEdges: GraphEdge[] = []
    for (const n of nodeList) {
      for (const target of n.links) {
        graphEdges.push({
          id: `e-${n.id}-${target}`,
          source: n.id,
          target,
          relationType: 'related',
          label: '',
          strength: 0.5,
          color: '#9aa7b5',
          highlighted: false,
        })
      }
    }

    const params: EnhancedForceParams = {
      width: 800,
      height: 600,
      spacing: 100,
      gravity: 0.1,
      repulsion: 5000,
      springLength: 150,
      iterations: 100,
      convergenceThreshold: 0.01,
      maxIterations: 200,
      minIterations: 10,
      adaptiveCooling: true,
    }

    const result = applyEnhancedForceLayout(graphNodes, graphEdges, params)

    // 成熟引擎输出落在 [0,width]×[0,height] 空间，而星图 SVG 的 viewBox 以原点为中心
    // (±200)。这里把结果做「居中 + 等比收放进 ±180」，避免节点飞出可视星轨（原内联模拟
    // 本就是绕原点布局，换引擎后必须补这一归位，否则布局整体偏到右下角）。
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const gn of result.nodes) {
      if (gn.x < minX) minX = gn.x
      if (gn.y < minY) minY = gn.y
      if (gn.x > maxX) maxX = gn.x
      if (gn.y > maxY) maxY = gn.y
    }
    const bw = maxX - minX || 1
    const bh = maxY - minY || 1
    const fit = Math.min(360 / bw, 360 / bh, 2)
    const ox = (minX + maxX) / 2
    const oy = (minY + maxY) / 2
    for (const gn of result.nodes) {
      if (!starPositions.value[gn.knowledgeId]) {
        starPositions.value[gn.knowledgeId] = {
          x: (gn.x - ox) * fit,
          y: (gn.y - oy) * fit,
        }
      }
    }
    saveStarPositions()
  }

  /** 监听节点数量变化，重新运行布局 */
  watch(
    () => nodes.value.length,
    () => {
      runForceSimulation()
    },
    { immediate: true },
  )

  // ---- 3D星图 ----
  const scene3dRef = ref<HTMLElement | null>(null)
  const rotX = ref(15)
  const rotY = ref(0)
  const isDragging3d = ref(false)
  const dragStart = { x: 0, y: 0 }
  const dragRot = { x: 0, y: 0 }
  let autoRotateTimer: ReturnType<typeof requestAnimationFrame> | null = null

  /** 获取节点在3D空间中的位置（基于2D位置 + 伪随机z轴） */
  const starNodes3d = computed(() => {
    return nodes.value.map((n, i) => {
      const pos = starPositions.value[n.id] ?? { x: 0, y: 0 }
      const seed = i * 47.7
      const z = (Math.sin(seed) * 0.5 + 0.5) * 80 - 40
      const maxDist = 200
      const zOp = 0.4 + (1 - Math.abs(z) / maxDist) * 0.6
      const zSc = 0.6 + (1 - Math.abs(z) / maxDist) * 0.4
      return {
        id: n.id,
        title: n.title,
        cat: n.cat,
        tx: pos.x,
        ty: pos.y,
        tz: z,
        zOp,
        zSc,
      }
    })
  })

  function getNodePos3d(id: string): { x: number; y: number } {
    const pos = starPositions.value[id] ?? { x: 0, y: 0 }
    return pos
  }

  /** 3D场景的CSS transform */
  const scene3dStyle = computed(() => ({
    transform: `rotateX(${rotX.value}deg) rotateY(${rotY.value}deg)`,
    transition: isDragging3d.value
      ? 'none'
      : 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
  }))

  /** 自动旋转 */
  function startAutoRotate() {
    stopAutoRotate()
    const step = () => {
      if (!isDragging3d.value) {
        rotY.value += 0.15
      }
      autoRotateTimer = requestAnimationFrame(step)
    }
    autoRotateTimer = requestAnimationFrame(step)
  }

  function stopAutoRotate() {
    if (autoRotateTimer !== null) {
      cancelAnimationFrame(autoRotateTimer)
      autoRotateTimer = null
    }
  }

  // 切换到3D模式时启动自动旋转，离开时停止
  watch(mode, (val) => {
    if (val === '3d') {
      startAutoRotate()
    } else {
      stopAutoRotate()
    }
  })

  // 鼠标交互
  function on3dMouseDown(e: MouseEvent) {
    isDragging3d.value = true
    dragStart.x = e.clientX
    dragStart.y = e.clientY
    dragRot.x = rotX.value
    dragRot.y = rotY.value
  }

  function on3dMouseMove(e: MouseEvent) {
    if (!isDragging3d.value) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    rotY.value = dragRot.y + dx * 0.5
    rotX.value = Math.max(-60, Math.min(60, dragRot.x - dy * 0.5))
  }

  function on3dMouseUp() {
    isDragging3d.value = false
  }

  // 触摸交互
  function on3dTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return
    isDragging3d.value = true
    dragStart.x = e.touches[0].clientX
    dragStart.y = e.touches[0].clientY
    dragRot.x = rotX.value
    dragRot.y = rotY.value
  }

  function on3dTouchMove(e: TouchEvent) {
    if (!isDragging3d.value || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - dragStart.x
    const dy = e.touches[0].clientY - dragStart.y
    rotY.value = dragRot.y + dx * 0.5
    rotX.value = Math.max(-60, Math.min(60, dragRot.x - dy * 0.5))
  }

  function on3dTouchEnd() {
    isDragging3d.value = false
  }

  // ---- 拖拽交互 ----
  const dragState = ref<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)

  function startDrag(event: MouseEvent, node: StarNodeData) {
    const svg = (event.currentTarget as SVGElement).closest('svg') as SVGSVGElement | null
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const svgPt = pt.matrixTransform(ctm.inverse())

    dragState.value = {
      nodeId: node.id,
      offsetX: svgPt.x - node.x,
      offsetY: svgPt.y - node.y,
    }

    const onMove = (e: MouseEvent) => {
      if (!dragState.value) return
      const pt2 = svg.createSVGPoint()
      pt2.x = e.clientX
      pt2.y = e.clientY
      const svgPt2 = pt2.matrixTransform(svg.getScreenCTM()!.inverse())
      starPositions.value[dragState.value.nodeId] = {
        x: Math.max(-180, Math.min(180, svgPt2.x - dragState.value.offsetX)),
        y: Math.max(-180, Math.min(180, svgPt2.y - dragState.value.offsetY)),
      }
    }

    const onUp = () => {
      dragState.value = null
      saveStarPositions()
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // 头脑风暴
  const stormItems = ref<{ id: string; text: string; x: number; y: number }[]>([])
  const stormInput = ref('')
  function addStorm() {
    if (!stormInput.value.trim()) return
    stormItems.value.push({
      id: `st${Date.now()}`,
      text: stormInput.value,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
    })
    stormInput.value = ''
  }
  function convertStormToNodes() {
    for (const item of stormItems.value) {
      nodes.value.unshift({
        id: `kn${Date.now()}`,
        title: item.text,
        desc: '',
        cat: 'concept',
        links: [],
      })
    }
    stormItems.value = []
    s()
  }

  // 时间线
  const timelineGroups = computed(() => {
    const groups: { label: string; items: KNode[] }[] = []
    const today = new Date().toISOString().slice(0, 10)
    for (const n of nodes.value) {
      const ds = n.id.startsWith('kn')
        ? new Date(parseInt(n.id.slice(2))).toISOString().slice(0, 10)
        : today
      let g = groups.find((x) => x.label === ds)
      if (!g) {
        g = { label: ds, items: [] }
        groups.push(g)
      }
      g.items.push(n)
    }
    return groups.sort((a, b) => b.label.localeCompare(a.label))
  })

  // 年轮
  const ringData = computed(() => {
    const now = new Date()
    const cy = now.getFullYear()
    const years: number[] = []
    for (let i = 4; i >= 0; i--) years.push(cy - i)
    const ym: Record<number, KNode[]> = {}
    for (const n of nodes.value) {
      if (!n.id.startsWith('kn')) continue
      const t = parseInt(n.id.slice(2))
      if (isNaN(t)) continue
      const y = new Date(t).getFullYear()
      if (!years.includes(y)) continue
      if (!ym[y]) ym[y] = []
      ym[y].push(n)
    }
    const fy = years.filter((y) => ym[y])
    return fy.map((y, idx) => {
      const r = 35 + idx * 35
      return {
        year: y,
        radius: r,
        nodes: ym[y].map((n, ni) => ({
          ...n,
          angle: (ni / ym[y].length) * Math.PI * 2 - Math.PI / 2,
          cx: 150 + Math.cos((ni / ym[y].length) * Math.PI * 2 - Math.PI / 2) * r,
          cy: 150 + Math.sin((ni / ym[y].length) * Math.PI * 2 - Math.PI / 2) * r,
        })),
      }
    })
  })

  // 追问
  const activeNode = ref<KNode | null>(null)
  const socraticAnswer = ref('')
  const socraticQuestions = [
    '这个判断的前提是什么？',
    '有哪些反例可以反驳它？',
    '这个框架在什么情况下会失效？',
    '如果教给一个新手，你会怎么比喻？',
    '这个直觉是从哪次经历中形成的？',
  ]
  function openEdit(n: KNode) {
    activeNode.value = n
    editing.value = true
    editingId.value = n.id
    form.title = n.title
    form.desc = n.desc
    form.cat = n.cat
    showModal.value = true
  }
  function openRelationEditor() {
    if (editingId.value) {
      editingNodeId.value = editingId.value
      showRelationEditor.value = true
    }
  }

  // 编辑
  const showModal = ref(false)
  const editing = ref(false)
  const editingId = ref('')
  const showRelationEditor = ref(false)
  const editingNodeId = ref('')
  function saveNode() {
    if (editing.value) {
      const n = nodes.value.find((x) => x.id === editingId.value)
      if (n) {
        n.title = form.title
        n.desc = form.desc
        n.cat = form.cat
        activeNode.value = n
      }
    } else {
      addNode()
    }
    s()
    showModal.value = false
  }
  function removeNode(id: string) {
    nodes.value = nodes.value.filter((n) => n.id !== id)
    s()
  }

  // ---- 画廊模式 (gallery) ----
  function catLabel(c: string): string {
    const m: Record<string, string> = {
      concept: '概念',
      rule: '法则',
      frame: '框架',
      insight: '直觉',
      pitfall: '误区',
      metaphor: '比喻',
    }
    return m[c] || c
  }

  // ---- 网络模式 (network) ----
  /** 网络节点位置：基于星图位置或径向布局 */
  const netNodes = computed(() => {
    return nodes.value.map((n, i) => {
      const pos = starPositions.value[n.id]
      if (pos) return { id: n.id, title: n.title, cat: n.cat, x: pos.x, y: pos.y }
      const angle = (i / nodes.value.length) * Math.PI * 2
      const radius = 60 + (nodes.value.length > 6 ? 60 : 0)
      return {
        id: n.id,
        title: n.title,
        cat: n.cat,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    })
  })

  function netNodePos(id: string): { x: number; y: number } {
    const node = netNodes.value.find((n) => n.id === id)
    return node ?? { x: 0, y: 0 }
  }

  // ---- 书架模式 (bookshelf) ----
  /** 根据描述长度计算书本高度 */
  function bookHeight(n: KNode): string {
    const base = 80
    const extra = Math.min(40, (n.desc?.length || 0) * 0.3)
    return base + extra + 'px'
  }

  /** 根据分类和索引生成书本颜色 */
  function bookColor(cat: string, idx: number): string {
    const base = catColor(cat)
    const lightness = 0.7 + (idx % 5) * 0.06
    return `linear-gradient(180deg, ${base}${Math.round(lightness * 100)
      .toString(16)
      .padStart(2, '0')}, ${base}22)`
  }

  return {
    tower,
    nodes,
    importSources,
    starPositions,
    saveImportSources,
    saveStarPositions,
    saveNodes: s,
    form,
    addNode,
    mode,
    modes,
    searchQuery,
    filteredNodes,
    showSteward,
    stewardTips,
    healthScore,
    healthLevel,
    showImportModal,
    handleImport,
    deleteImportSource,
    chatSources,
    callSources,
    formatImportDate,
    tapeWavePath,
    categories,
    nodesByCat,
    catIcon,
    catColor,
    catDensity,
    starNodes,
    computedRelations,
    hoveredRelation,
    findNode,
    getNodePos,
    bgStars,
    runForceSimulation,
    scene3dRef,
    rotX,
    rotY,
    isDragging3d,
    starNodes3d,
    getNodePos3d,
    scene3dStyle,
    startAutoRotate,
    stopAutoRotate,
    on3dMouseDown,
    on3dMouseMove,
    on3dMouseUp,
    on3dTouchStart,
    on3dTouchMove,
    on3dTouchEnd,
    dragState,
    startDrag,
    stormItems,
    stormInput,
    addStorm,
    convertStormToNodes,
    timelineGroups,
    ringData,
    activeNode,
    socraticAnswer,
    socraticQuestions,
    openEdit,
    openRelationEditor,
    showModal,
    editing,
    editingId,
    showRelationEditor,
    editingNodeId,
    saveNode,
    removeNode,
    catLabel,
    netNodes,
    netNodePos,
    bookHeight,
    bookColor,
    IMPORT_SOURCE_ICONS,
    RELATION_TYPE_META,
  }
}

export type KtUi = ReturnType<typeof useKnowledgeTowerUi>

export const KT_UI_KEY: InjectionKey<KtUi> = Symbol('kt-ui')

/** 子组件注入视图提供的 UI 实例；未提供时惰性自建（安全降级，正常总由视图 provide）。 */
export function useKtUi(): KtUi {
  const injected = inject(KT_UI_KEY, null)
  if (injected) return injected
  return useKnowledgeTowerUi()
}
