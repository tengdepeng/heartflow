<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance ag">
    <!-- 统一房间头 + 统一内容区（RoomLayout） -->
    <RoomLayout title="共鸣图谱" kicker="我的记录如何彼此相连" align="center" data-enter>

    <!-- 概览 -->
    <div data-enter class="ag-overview">
      <div class="ag-ov-card">
        <span class="ag-ov-num">{{ filteredNodes.length }}</span>
        <span class="ag-ov-label">记录节点</span>
      </div>
      <div class="ag-ov-card">
        <span class="ag-ov-num">{{ filteredLinks.length }}</span>
        <span class="ag-ov-label">关联连线</span>
      </div>
      <div class="ag-ov-card">
        <span class="ag-ov-num">{{ filteredDomainCount }}</span>
        <span class="ag-ov-label">涉域</span>
      </div>
      <div class="ag-ov-card">
        <span class="ag-ov-num">{{ clusterCount }}</span>
        <span class="ag-ov-label">社区</span>
      </div>
    </div>

    <!-- 已知边界声明（合规可见化） -->
    <div data-enter class="ag-boundary-note">
      <span class="ag-boundary-icon">⚠</span>
      <span>语义关联＝<b>已知边界（本地启发式）</b>：基于共享标签 / 时间邻近 / 因果顺序三类轻量规则在本地计算，未使用任何 AI 或向量模型，关联结果仅供参考，不构成语义确证。</span>
    </div>

    <div data-enter v-if="graph.nodes.length" class="ag-main">
      <!-- 图例 + 筛选控件 -->
      <div class="ag-controls">
        <div class="ag-legend">
          <div class="ag-legend-group">
            <span class="ag-legend-title">连线类型</span>
            <span class="ag-legend-item" v-for="lt in LINK_LEGEND" :key="lt.type">
              <span class="ag-legend-line" :style="{ background: lt.color }"></span>{{ lt.label }}
            </span>
          </div>
          <div class="ag-legend-group">
            <span class="ag-legend-title">领域</span>
            <span class="ag-legend-item" v-for="d in DOMAIN_ORDER" :key="d" v-show="domainSet.has(d)">
              <span class="ag-legend-dot" :style="{ background: domainColor(d) }"></span>{{ domainLabel(d) }}
            </span>
          </div>
        </div>
        <div class="ag-filters">
          <label class="ag-filter">
            时间窗
            <select v-model.number="timeWindowDays" class="ag-select">
              <option :value="0">全部</option>
              <option :value="7">近 7 天</option>
              <option :value="30">近 30 天</option>
              <option :value="90">近 90 天</option>
              <option :value="365">近 1 年</option>
            </select>
          </label>
          <label class="ag-filter">
            关联强度 ≥ {{ strengthMin.toFixed(1) }}
            <input v-model.number="strengthMin" type="range" min="0" max="1" step="0.1" class="ag-range" />
          </label>
          <button class="ag-reset-zoom" @click="resetView" title="重置缩放/平移">⤢ 复位</button>
        </div>
      </div>

      <!-- 图谱画布（缩放/平移作用于 viewBox） -->
      <div class="ag-canvas-wrap" ref="canvasWrap" @wheel.prevent="onWheel" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointerleave="onPointerUp">
        <svg
          class="ag-canvas"
          :viewBox="viewBox"
          preserveAspectRatio="xMidYMid meet"
          @click="onCanvasClick"
        >
          <!-- 连线 -->
          <g class="ag-edges">
            <line
              v-for="e in visibleEdges"
              :key="e.id"
              :x1="nodePos(e.source).x"
              :y1="nodePos(e.source).y"
              :x2="nodePos(e.target).x"
              :y2="nodePos(e.target).y"
              :stroke="linkColor(e.linkType)"
              :stroke-width="0.8 + e.strength * 2.2"
              :stroke-opacity="selectedKey && !isIncident(e) ? 0.12 : 0.5"
              :class="{ 'ag-edge-hi': selectedKey && isIncident(e) }"
            />
          </g>
          <!-- 节点 -->
          <g class="ag-nodes">
            <g
              v-for="n in visibleNodes"
              :key="n.key"
              class="ag-node"
              :class="{
                'ag-node-sel': n.key === selectedKey,
                'ag-node-dim': selectedKey && !isNeighbor(n.key),
                'ag-node-cluster': clusterCount > 1,
              }"
              :transform="`translate(${nodePos(n.key).x},${nodePos(n.key).y})`"
              @pointerdown.stop="onNodePointerDown($event, n.key)"
              @click.stop="onNodeClick(n.key)"
            >
              <circle
                v-if="clusterCount > 1"
                :r="nodeRadius(n) + 3.5"
                :fill="'none'"
                :stroke="clusterColor(clusters[n.key])"
                :stroke-width="1.5"
                :stroke-opacity="0.85"
                class="ag-cluster-ring"
              />
              <circle
                :r="nodeRadius(n)"
                :fill="domainColor(n.domain)"
                :fill-opacity="selectedKey && !isNeighbor(n.key) ? 0.25 : 0.85"
                :stroke="n.key === selectedKey ? 'var(--text-primary)' : 'rgba(255,255,255,0.25)'"
                :stroke-width="n.key === selectedKey ? 2 : 0.8"
              />
              <text
                class="ag-node-label"
                :y="nodeRadius(n) + 11"
                text-anchor="middle"
              >{{ truncate(n.label) }}</text>
            </g>
          </g>
        </svg>

        <div class="ag-zoom-hint" v-if="zoomLevel !== 1">缩放 {{ zoomLevel.toFixed(2) }}×</div>

        <!-- 节点详情（含真实记录下钻） -->
        <transition name="ag-detail-fade">
          <aside v-if="selected" class="ag-detail">
            <button class="ag-detail-close" @click="selectedKey = ''" title="关闭">×</button>
            <h3 class="ag-detail-title">{{ selected.label }}</h3>
            <span class="ag-detail-domain" :style="{ color: domainColor(selected.domain) }">{{ domainLabel(selected.domain) }}</span>
            <div class="ag-detail-raw" v-if="selected.record">
              <p class="ag-detail-sub">记录详情</p>
              <dl class="ag-raw-list">
                <template v-for="kv in selected.fields" :key="kv.k">
                  <dt>{{ kv.k }}</dt><dd>{{ kv.v }}</dd>
                </template>
              </dl>
            </div>
            <div class="ag-detail-links">
              <p class="ag-detail-sub">关联（{{ incidentLinks.length }}）</p>
              <ul>
                <li v-for="l in incidentLinks" :key="l.id">
                  <span class="ag-detail-link-type" :style="{ color: linkColor(l.linkType) }">{{ linkLabel(l.linkType) }}</span>
                  <span class="ag-detail-link-reason">{{ l.reason }}</span>
                </li>
              </ul>
              <p v-if="!incidentLinks.length" class="ag-detail-empty">暂无关联（孤立节点）</p>
            </div>
          </aside>
        </transition>
      </div>
    </div>

    <EmptyState v-else icon="🕸" title="暂无可关联的跨域记录。当你在不同空间留下笔记、情绪、锚点或结晶时，它们之间的联系会在此显现。" :glow="false" cta-label="" />

    <!-- 关联档案（INCR-285 补挂载孤儿组件 AssociationArchivePanel：健康圆环/概览/类型分布/域对分布/温和洞察，消费 association-archive-analytics 纯函数，引擎应用内唯一） -->
    <AssociationArchivePanel v-if="graph.nodes.length" :graph="graph" />

    <!-- 返回 -->
    <div data-enter class="ag-back-row">
      <button class="ag-back-btn" @click="$router.back()">← 返回</button>
    </div>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  computeAssociationGraph, fetchRecord,
  type CrossDomainLink, type DomainKey, type LinkType,
} from '../modules/association'
import { computeLayout, type GraphLayout } from '../modules/association/layout'
import AssociationArchivePanel from '../components/AssociationArchivePanel.vue'
import EmptyState from '../components/EmptyState.vue'
import RoomLayout from '../components/RoomLayout.vue'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceRef, entranceClass } = useViewEntrance()
const $router = useRouter()

// ---- 数据（纯本地计算，零外网） ----
const rawGraph = ref(computeAssociationGraph())
const graph = computed(() => rawGraph.value)
const layout = computed<GraphLayout>(() =>
  computeLayout(rawGraph.value, { width: 820, height: 600, iterations: 220 }),
)
const BASE_W = 820
const BASE_H = 600

// 用户拖拽重定位的坐标覆盖（零依赖，仅在内存，不持久化）
const dragPos = reactive<Record<string, { x: number; y: number }>>({})

// 连通分量聚类（仅在可见边上的图做并查集），用于社区高亮
const clusters = computed<Record<string, number>>(() => {
  const parent: Record<string, string> = {}
  const find = (x: string): string => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] }
    return x
  }
  const union = (a: string, b: string) => { parent[find(a)] = find(b) }
  for (const n of graph.value.nodes) parent[`${n.domain}:${n.id}`] = `${n.domain}:${n.id}`
  for (const e of visibleEdges.value) {
    union(e.source, e.target)
  }
  const comp: Record<string, number> = {}
  let idx = 0
  const seen = new Map<string, number>()
  for (const n of graph.value.nodes) {
    const k = `${n.domain}:${n.id}`
    const root = find(k)
    if (!seen.has(root)) { seen.set(root, idx++); }
    comp[k] = seen.get(root)!
  }
  return comp
})
const clusterCount = computed(() => new Set(Object.values(clusters.value)).size)

interface GraphNodeLite { domain: DomainKey; id: string; label: string; ts: number }
interface VisibleEdge { id: string; source: string; target: string; linkType: string; strength: number }

// ---- 筛选状态 ----
const timeWindowDays = ref(0) // 0 = 全部
const strengthMin = ref(0)

const timeBound = computed(() => {
  if (!timeWindowDays.value) return 0
  return Date.now() - timeWindowDays.value * 24 * 3600 * 1000
})

// 经时间窗过滤后的节点（按归一化 ts）
const filteredNodes = computed<GraphNodeLite[]>(() => {
  if (!timeBound.value) return graph.value.nodes
  return graph.value.nodes.filter(n => n.ts >= timeBound.value)
})
const filteredNodeKeys = computed(() => new Set(filteredNodes.value.map(n => `${n.domain}:${n.id}`)))

// 经强度阈值过滤后的连线
const filteredLinks = computed<CrossDomainLink[]>(() =>
  graph.value.links.filter(l => l.strength >= strengthMin.value),
)

// 仅两端都在过滤后节点集合中、且通过强度阈值的边（重投影为 source/target 键）
const visibleEdges = computed<VisibleEdge[]>(() =>
  filteredLinks.value
    .filter(l =>
      filteredNodeKeys.value.has(`${l.sourceDomain}:${l.sourceId}`) &&
      filteredNodeKeys.value.has(`${l.targetDomain}:${l.targetId}`),
    )
    .map(l => ({
      id: l.id,
      source: `${l.sourceDomain}:${l.sourceId}`,
      target: `${l.targetDomain}:${l.targetId}`,
      linkType: l.linkType,
      strength: l.strength,
    })),
)
const visibleNodeKeys = computed(() => {
  const s = new Set<string>()
  for (const n of filteredNodes.value) s.add(`${n.domain}:${n.id}`)
  // 仍显示孤立节点（即使当前无可见边）
  return s
})
const visibleNodes = computed(() => layout.value.nodes.filter(n => visibleNodeKeys.value.has(n.key)))

const domainSet = computed(() => new Set(filteredNodes.value.map(n => n.domain)))
const filteredDomainCount = computed(() => domainSet.value.size)

const incidentLinks = computed<CrossDomainLink[]>(() =>
  graph.value.links.filter(l =>
    `${l.sourceDomain}:${l.sourceId}` === selectedKey.value ||
    `${l.targetDomain}:${l.targetId}` === selectedKey.value,
  ),
)

// ---- 选中 + 真实记录下钻 ----
const selectedKey = ref('')
const selected = computed(() => {
  if (!selectedKey.value) return null
  const n = layout.value.nodes.find(x => x.key === selectedKey.value)
  if (!n) return null
  const [domain, id] = [n.domain as DomainKey, n.id]
  const record = fetchRecord(domain, id)
  const fields = record ? extractFields(domain, record) : []
  return { label: n.label, domain, record, fields }
})

function extractFields(domain: DomainKey, r: any): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = []
  const push = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === '') return
    out.push({ k, v: String(v) })
  }
  switch (domain) {
    case 'note': push('标题', r.title); push('内容', r.content); push('标签', (r.tags || []).join('、')); break
    case 'emotion': push('类型', r.type); push('记录', r.note); break
    case 'crystal': push('洞见', r.insight); break
    case 'anchor': push('心锚', r.text); break
    case 'session': push('标题', r.title); push('时长(分)', r.duration); break
    case 'goal': push('目标', r.title); push('层级', r.tier); break
    case 'relation': push('关系', r.name); push('类型', r.relation); break
    case 'ledger': push('分类', r.category); push('备注', r.note); break
    case 'carrier': push('名称', r.name); push('类型', r.type); break
    case 'advisor': push('名称', r.name); push('性格', r.personality); break
  }
  if (r.createdAt) push('创建于', new Date(r.createdAt).toLocaleDateString())
  return out.slice(0, 6)
}

// ---- 缩放 / 平移（作用于 viewBox，零依赖） ----
interface ViewBoxState { x: number; y: number; w: number; h: number }
const view = ref<ViewBoxState>({ x: 0, y: 0, w: BASE_W, h: BASE_H })
const zoomLevel = computed(() => BASE_W / view.value.w)
const viewBox = computed(() => `${view.value.x} ${view.value.y} ${view.value.w} ${view.value.h}`)

function clampView() {
  const v = view.value
  v.w = Math.max(120, Math.min(BASE_W, v.w))
  v.h = v.w * (BASE_H / BASE_W)
  v.x = Math.max(-BASE_W * 0.5, Math.min(BASE_W * 0.5, v.x))
  v.y = Math.max(-BASE_H * 0.5, Math.min(BASE_H * 0.5, v.y))
}
function resetView() {
  view.value = { x: 0, y: 0, w: BASE_W, h: BASE_H }
}
function onWheel(e: WheelEvent) {
  const factor = e.deltaY > 0 ? 1.1 : 0.9
  const v = view.value
  const cx = v.x + v.w / 2
  const cy = v.y + v.h / 2
  const nw = Math.max(120, Math.min(BASE_W, v.w * factor))
  v.w = nw
  v.h = nw * (BASE_H / BASE_W)
  v.x = cx - v.w / 2
  v.y = cy - v.h / 2
  clampView()
}
let dragging = false
let dragStart = { x: 0, y: 0, vx: 0, vy: 0 }
// 节点拖拽重定位状态（零依赖）
let nodeDrag: { key: string; sx: number; sy: number; ox: number; oy: number } | null = null
let nodeMoved = false
const canvasWrap = ref<HTMLElement | null>(null)
function onPointerDown(e: PointerEvent) {
  dragging = true
  dragStart = { x: e.clientX, y: e.clientY, vx: view.value.x, vy: view.value.y }
}
// 节点层 pointerdown：开始拖拽（阻止冒泡以免触发画布平移）
function onNodePointerDown(e: PointerEvent, key: string) {
  e.stopPropagation()
  const p = nodePos(key)
  nodeDrag = { key, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y }
  nodeMoved = false
}
// 节点层 click：拖拽未发生才算点击选中
function onNodeClick(key: string) {
  if (nodeMoved) { nodeMoved = false; return }
  selectedKey.value = selectedKey.value === key ? '' : key
}
function onPointerMove(e: PointerEvent) {
  // 优先处理节点拖拽重定位（零依赖，仅内存）
  if (nodeDrag) {
    const el = canvasWrap.value
    if (!el) return
    const scale = view.value.w / el.clientWidth
    const dx = (e.clientX - nodeDrag.sx) * scale
    const dy = (e.clientY - nodeDrag.sy) * scale
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) nodeMoved = true
    dragPos[nodeDrag.key] = { x: nodeDrag.ox + dx, y: nodeDrag.oy + dy }
    return
  }
  if (!dragging) return
  const el = canvasWrap.value
  if (!el) return
  // 屏幕像素 → viewBox 单位
  const scale = view.value.w / el.clientWidth
  const dx = (e.clientX - dragStart.x) * scale
  const dy = (e.clientY - dragStart.y) * scale
  view.value.x = dragStart.vx - dx
  view.value.y = dragStart.vy - dy
  clampView()
}
function onPointerUp() {
  nodeDrag = null
  dragging = false
}
function onCanvasClick() {
  if (dragging || nodeDrag) return
  selectedKey.value = ''
}

// ---- 交互 ----
function isIncident(e: { source: string; target: string }): boolean {
  return e.source === selectedKey.value || e.target === selectedKey.value
}
function isNeighbor(key: string): boolean {
  if (key === selectedKey.value) return true
  return graph.value.links.some(l =>
    (l.sourceDomain + ':' + l.sourceId === selectedKey.value && l.targetDomain + ':' + l.targetId === key) ||
    (l.targetDomain + ':' + l.targetId === selectedKey.value && l.sourceDomain + ':' + l.sourceId === key),
  )
}
const nodeMap = computed(() => {
  const m = new Map<string, { x: number; y: number }>()
  for (const n of layout.value.nodes) m.set(n.key, { x: n.x, y: n.y })
  return m
})
// 节点坐标：拖拽覆盖优先，否则取 layout 坐标
function nodePos(key: string): { x: number; y: number } {
  const d = dragPos[key]
  if (d) return d
  return nodeMap.value.get(key) ?? { x: 0, y: 0 }
}
function nodeRadius(n: { degree: number }): number {
  return 6 + Math.min(n.degree, 8) * 1.6
}
function truncate(s: string): string {
  return s.length > 8 ? s.slice(0, 7) + '…' : s
}

// ---- 领域配色 / 标签 ----
const DOMAIN_ORDER: DomainKey[] = [
  'session', 'crystal', 'note', 'anchor', 'relation', 'goal',
  'emotion', 'ledger', 'carrier', 'advisor',
]
const DOMAIN_COLORS: Record<DomainKey, string> = {
  session: '#8a9a7a',
  crystal: '#6b9fc4',
  note: '#a07c8c',
  anchor: '#d9a05b',
  relation: '#b07cc4',
  goal: '#5ab8a0',
  emotion: '#d98c7a',
  ledger: '#7c8aa0',
  carrier: '#c4a05b',
  advisor: '#9a7cc4',
}
const DOMAIN_LABELS: Record<DomainKey, string> = {
  session: '专注', crystal: '结晶', note: '笔记', anchor: '心锚',
  relation: '关系', goal: '目标', emotion: '情绪', ledger: '账本',
  carrier: '载体', advisor: '幕僚',
}
function domainColor(d: string): string {
  return (DOMAIN_COLORS as Record<string, string>)[d] ?? '#999'
}
function domainLabel(d: string): string {
  return (DOMAIN_LABELS as Record<string, string>)[d] ?? d
}

// ---- 连线类型 ----
const LINK_LEGEND: { type: LinkType; label: string; color: string }[] = [
  { type: 'shared-tag', label: '共享标签', color: '#6b9fc4' },
  { type: 'temporal-proximity', label: '时间邻近', color: '#d9a05b' },
  { type: 'causal-order', label: '因果顺序', color: '#5ab8a0' },
]
const LINK_COLORS: Record<string, string> = Object.fromEntries(LINK_LEGEND.map(l => [l.type, l.color]))
const LINK_LABELS: Record<string, string> = Object.fromEntries(LINK_LEGEND.map(l => [l.type, l.label]))
function linkColor(t: string): string {
  return LINK_COLORS[t] ?? '#888'
}
function linkLabel(t: string): string {
  return LINK_LABELS[t] ?? t
}

// 聚类社区配色（按连通分量序号散列到柔和的 HSL 色相，零依赖）
const CLUSTER_PALETTE = ['#6b9fc4', '#d9a05b', '#5ab8a0', '#b07cc4', '#d98c7a', '#a07c8c', '#7c8aa0', '#9a7cc4', '#8a9a7a', '#c4a05b']
function clusterColor(idx: number): string {
  if (idx < 0) return '#999'
  return CLUSTER_PALETTE[idx % CLUSTER_PALETTE.length]
}

onMounted(() => { /* 图数据在 setup 已计算；如需实时刷新可在此重算 */ })
</script>

<style scoped>
.ag {
  max-width: 960px;
  margin: 0 auto;
  /* 左右/顶部内边距交给 RoomLayout 统一内容区，根仅保留底部浮层避让 */
  padding: 0 0 80px;
  min-height: 100%;
  color: var(--text-primary, #e8e0d8);
}
.ag-overview {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.ag-ov-card {
  flex: 1;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ag-ov-num {
  font-size: 22px;
  font-weight: 500;
  color: var(--accent);
}
.ag-ov-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb), 0.4);
}
.ag-boundary-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(var(--accent-rgb), 0.6);
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px dashed rgba(var(--accent-rgb), 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 18px;
}
.ag-boundary-note b {
  color: var(--accent);
}
.ag-boundary-icon {
  flex: 0 0 auto;
}
.ag-main {
  position: relative;
}
.ag-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 12px;
}
.ag-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 12px;
}
.ag-legend-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.ag-legend-title {
  color: rgba(var(--accent-rgb), 0.45);
  margin-right: 2px;
}
.ag-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgba(var(--text-primary), 0.8);
}
.ag-legend-line {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.ag-legend-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.ag-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: rgba(var(--text-primary), 0.8);
}
.ag-filter {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}
.ag-select {
  padding: 5px 8px;
  border-radius: 7px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 12px;
}
.ag-range {
  width: 120px;
  accent-color: var(--accent);
}
.ag-reset-zoom {
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.6);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}
.ag-reset-zoom:hover {
  background: rgba(var(--accent-rgb), 0.06);
}
.ag-canvas-wrap {
  position: relative;
  border-radius: 16px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
  touch-action: none;
}
.ag-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 820 / 600;
  cursor: grab;
}
.ag-canvas:active {
  cursor: grabbing;
}
.ag-zoom-hint {
  position: absolute;
  bottom: 10px;
  left: 12px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  pointer-events: none;
}
.ag-node {
  cursor: grab;
}
.ag-node:active {
  cursor: grabbing;
}
.ag-node-label {
  font-size: 9px;
  fill: rgba(var(--text-primary), 0.72);
  pointer-events: none;
}
.ag-node-dim {
  opacity: 0.4;
}
.ag-cluster-ring {
  pointer-events: none;
}
.ag-edge-hi {
  stroke-opacity: 0.9 !important;
}
.ag-detail {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 240px;
  max-height: calc(100% - 24px);
  overflow-y: auto;
  background: var(--bg-surface-alt, #0f0c09));
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}
.ag-detail-close {
  position: absolute;
  top: 6px;
  right: 8px;
  border: none;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 16px;
  cursor: pointer;
}
.ag-detail-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}
.ag-detail-domain {
  font-size: 11px;
}
.ag-detail-raw {
  margin-top: 12px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.1);
  padding-top: 10px;
}
.ag-raw-list {
  margin: 6px 0 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 8px;
}
.ag-raw-list dt {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  white-space: nowrap;
}
.ag-raw-list dd {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(var(--text-primary), 0.82);
  word-break: break-word;
}
.ag-detail-sub {
  margin: 12px 0 6px;
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb), 0.45);
}
.ag-detail-links ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ag-detail-links li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ag-detail-link-type {
  font-size: 11px;
  font-weight: 600;
}
.ag-detail-link-reason {
  font-size: 11px;
  line-height: 1.5;
  color: rgba(var(--text-primary), 0.7);
}
.ag-detail-empty {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.4);
}
.ag-back-row {
  margin-top: 24px;
}
.ag-back-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.6);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}
.ag-back-btn:hover {
  background: rgba(var(--accent-rgb), 0.06);
}
.ag-detail-fade-enter-active,
.ag-detail-fade-leave-active {
  transition: opacity 0.18s ease;
}
.ag-detail-fade-enter-from,
.ag-detail-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .ag { padding: 0 0 56px; }
  .ag-detail { width: 200px; }
  .ag-controls { flex-direction: column; align-items: flex-start; }
}
</style>
