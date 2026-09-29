<template>
  <section class="dtp" aria-label="决策树">
    <div class="dtp-head">
      <span class="dtp-title">🌳 决策树</span>
      <span class="dtp-sub">期望值计算 · 路径分析 · 灵敏度测试</span>
    </div>

    <!-- 统计总览 -->
    <div class="dtp-stats">
      <div class="dtp-stat"><b>{{ trees.length }}</b><span>决策树</span></div>
      <div class="dtp-stat"><b>{{ totalNodes }}</b><span>总节点</span></div>
      <div class="dtp-stat dtp-stat--hot"><b>{{ bestEv }}</b><span>最高期望值</span></div>
    </div>

    <!-- 空态 -->
    <div v-if="trees.length === 0" class="dtp-empty">
      <span>🌱</span>
      <p>还没有决策树。创建一棵树，把复杂决策拆成可计算的分支。</p>
    </div>

    <!-- 创建决策树 -->
    <div class="dtp-block">
      <span class="dtp-block-label">创建决策树</span>
      <div class="dtp-create">
        <input v-model="newName" class="dtp-input" placeholder="决策主题，如「是否跳槽」" type="text" />
        <button class="dtp-btn dtp-btn--primary" @click="createBlank">＋ 空白树</button>
        <button v-if="nodes.length" class="dtp-btn" @click="createFromKnowledge">✦ 从知识节点生成</button>
      </div>
    </div>

    <!-- 决策树列表 -->
    <div v-if="trees.length" class="dtp-block">
      <span class="dtp-block-label">决策树</span>
      <div class="dtp-tree-list">
        <button
          v-for="t in trees"
          :key="t.id"
          :class="['dtp-tree-chip', { active: current?.id === t.id }]"
          @click="selectTree(t.id)"
        >
          {{ t.name }}
          <span class="dtp-tree-count">{{ t.nodes.size }} 节点</span>
        </button>
      </div>
    </div>

    <!-- 当前决策树编辑 -->
    <div v-if="current" class="dtp-block">
      <div class="dtp-tree-head">
        <span class="dtp-tree-name">{{ current.name }}</span>
        <div class="dtp-tree-actions">
          <button class="dtp-btn" @click="runStats">📊 统计</button>
          <button class="dtp-btn" @click="runReport">📄 报告</button>
          <button class="dtp-btn dtp-btn--danger" @click="removeTree(current.id)">删除</button>
        </div>
      </div>
      <p v-if="current.description" class="dtp-tree-desc">{{ current.description }}</p>

      <!-- 节点树 -->
      <div class="dtp-nodes">
        <div
          v-for="f in flatNodes"
          :key="f.node.id"
          class="dtp-node"
          :style="{ paddingLeft: (f.depth * 20) + 'px' }"
        >
          <div class="dtp-node-row" :class="'dtp-node--' + f.node.type">
            <span class="dtp-node-type" :style="{ color: typeColor(f.node.type) }">{{ typeIcon(f.node.type) }}</span>
            <span class="dtp-node-label">{{ f.node.label }}</span>
            <span v-if="f.node.type === 'outcome'" class="dtp-node-val">值 {{ f.node.value }}</span>
            <span v-if="f.node.parentId && parentType(f.node) === 'chance'" class="dtp-node-prob">
              P={{ Math.round(f.node.probability * 100) }}%
            </span>
            <span v-if="f.node.type !== 'outcome'" class="dtp-node-add" @click="startAdd(f.node.id)">＋</span>
            <span v-if="f.node.id !== current.rootId" class="dtp-node-del" @click="removeNode(f.node.id)">✕</span>
          </div>

          <!-- 内联添加子节点 -->
          <div v-if="addingTo === f.node.id" class="dtp-add-form">
            <input v-model="addLabel" class="dtp-input dtp-input--sm" placeholder="分支名称" type="text" />
            <select v-model="addType" class="dtp-select">
              <option value="decision">决策点</option>
              <option value="chance">机会点</option>
              <option value="outcome">结果</option>
            </select>
            <input v-if="addType === 'outcome'" v-model="addValue" class="dtp-input dtp-input--sm" placeholder="结果值" type="number" />
            <input v-else v-model="addProb" class="dtp-input dtp-input--sm" placeholder="概率 0-1" type="number" min="0" max="1" step="0.1" />
            <button class="dtp-btn dtp-btn--primary" @click="confirmAdd">✓</button>
            <button class="dtp-btn" @click="addingTo = null">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计结果 -->
    <div v-if="stats" class="dtp-block">
      <span class="dtp-block-label">树统计</span>
      <div class="dtp-stats-grid">
        <div class="dtp-stat-cell"><b>{{ stats.totalNodes }}</b><span>总节点</span></div>
        <div class="dtp-stat-cell"><b>{{ stats.decisionNodes }}</b><span>决策点</span></div>
        <div class="dtp-stat-cell"><b>{{ stats.chanceNodes }}</b><span>机会点</span></div>
        <div class="dtp-stat-cell"><b>{{ stats.outcomeNodes }}</b><span>结果</span></div>
        <div class="dtp-stat-cell"><b>{{ stats.maxDepth }}</b><span>最大深度</span></div>
        <div class="dtp-stat-cell"><b>{{ stats.totalPaths }}</b><span>路径数</span></div>
        <div class="dtp-stat-cell dtp-stat-cell--hot"><b>{{ stats.overallExpectedValue }}</b><span>期望值</span></div>
      </div>
      <div v-if="stats.bestPath" class="dtp-path">
        <span class="dtp-path-label">最佳路径</span>
        <p class="dtp-path-text">{{ stats.bestPath.label }}</p>
        <p class="dtp-path-meta">期望值 {{ stats.bestPath.expectedValue }} · 概率 {{ Math.round(stats.bestPath.probability * 100) }}%</p>
      </div>
      <div v-if="stats.worstPath && stats.worstPath.id !== stats.bestPath?.id" class="dtp-path dtp-path--worst">
        <span class="dtp-path-label">最差路径</span>
        <p class="dtp-path-text">{{ stats.worstPath.label }}</p>
        <p class="dtp-path-meta">期望值 {{ stats.worstPath.expectedValue }}</p>
      </div>
    </div>

    <!-- 报告 -->
    <div v-if="report" class="dtp-block">
      <span class="dtp-block-label">决策报告</span>
      <div v-if="report.recommendedPath" class="dtp-report-rec">
        <span class="dtp-report-rec-label">推荐路径</span>
        <p class="dtp-path-text">{{ report.recommendedPath.label }}</p>
      </div>
      <div v-if="report.risks.length" class="dtp-report">
        <span class="dtp-report-label dtp-report--risk">风险提示</span>
        <p v-for="(r, idx) in report.risks" :key="idx" class="dtp-report-item">{{ r }}</p>
      </div>
      <div v-if="report.recommendations.length" class="dtp-report">
        <span class="dtp-report-label dtp-report--rec">建议</span>
        <p v-for="(r, idx) in report.recommendations" :key="idx" class="dtp-report-item">{{ r }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getNodes } from '../../modules/knowledge/relation'
import { useDecisionTree } from '../../modules/knowledge'
import { getDecisionAnalysisStore } from '../../modules/knowledge'
import type { DecisionTreeNode, DecisionTreeNodeType, DecisionTreeStats, DecisionAnalysisReport } from '../../modules/knowledge'

const store = getDecisionAnalysisStore()
const api = useDecisionTree()

const trees = store.trees
const nodes = ref(getNodes())

const newName = ref('')
const currentId = ref<string | null>(null)
const current = computed(() => trees.value.find(t => t.id === currentId.value) ?? null)

const addingTo = ref<string | null>(null)
const addLabel = ref('')
const addType = ref<DecisionTreeNodeType>('outcome')
const addValue = ref('5')
const addProb = ref('0.5')

const stats = ref<DecisionTreeStats | null>(null)
const report = ref<DecisionAnalysisReport | null>(null)

const totalNodes = computed(() => trees.value.reduce((s, t) => s + t.nodes.size, 0))
const bestEv = computed(() => {
  if (trees.value.length === 0) return '—'
  let best = -Infinity
  for (const t of trees.value) {
    const v = api.calculateExpectedValue(t, t.rootId)
    if (v > best) best = v
  }
  return best === -Infinity ? '—' : String(Math.round(best * 100) / 100)
})

interface FlatNode { node: DecisionTreeNode; depth: number }
const flatNodes = computed<FlatNode[]>(() => {
  const tree = current.value
  if (!tree) return []
  const nodes = tree.nodes
  const rootId = tree.rootId
  const result: FlatNode[] = []
  function walk(id: string, depth: number) {
    const n = nodes.get(id)
    if (!n) return
    result.push({ node: n, depth })
    for (const c of n.childrenIds) walk(c, depth + 1)
  }
  walk(rootId, 0)
  return result
})

function typeColor(type: DecisionTreeNodeType) {
  const m: Record<DecisionTreeNodeType, string> = { decision: '#6b9fc4', chance: '#f0c040', outcome: '#8a9a7a' }
  return m[type]
}
function typeIcon(type: DecisionTreeNodeType) {
  const m: Record<DecisionTreeNodeType, string> = { decision: '◆', chance: '◇', outcome: '○' }
  return m[type]
}
function parentType(n: DecisionTreeNode): DecisionTreeNodeType | null {
  const t = current.value
  if (!t || !n.parentId) return null
  return t.nodes.get(n.parentId)?.type ?? null
}

function createBlank() {
  const name = newName.value.trim()
  if (!name) return
  const t = api.createTree(name)
  trees.value.push(t)
  store.saveTrees()
  currentId.value = t.id
  newName.value = ''
}

function createFromKnowledge() {
  const name = newName.value.trim() || '知识决策树'
  const t = api.buildFromKnowledge(name, nodes.value)
  trees.value.push(t)
  store.saveTrees()
  currentId.value = t.id
  newName.value = ''
}

function selectTree(id: string) {
  currentId.value = id
  stats.value = null
  report.value = null
}

function startAdd(parentId: string) {
  addingTo.value = parentId
  addLabel.value = ''
  addType.value = 'outcome'
  addValue.value = '5'
  addProb.value = '0.5'
}

function confirmAdd() {
  const t = current.value
  if (!t || !addingTo.value || !addLabel.value.trim()) return
  const opts = addType.value === 'outcome'
    ? { value: Number(addValue.value) || 0 }
    : { probability: Math.max(0, Math.min(1, Number(addProb.value) || 0)) }
  api.addChild(t, addingTo.value, addLabel.value.trim(), addType.value, opts)
  store.saveTrees()
  stats.value = null
  report.value = null
  addingTo.value = null
}

function removeNode(id: string) {
  const t = current.value
  if (!t) return
  api.removeNode(t, id)
  store.saveTrees()
  stats.value = null
  report.value = null
}

function removeTree(id: string) {
  trees.value = trees.value.filter(t => t.id !== id)
  if (currentId.value === id) currentId.value = null
  store.saveTrees()
  stats.value = null
  report.value = null
}

function runStats() {
  const t = current.value
  if (!t) return
  stats.value = api.getStats(t)
}

function runReport() {
  const t = current.value
  if (!t) return
  report.value = api.generateReport(t)
  stats.value = api.getStats(t)
}

onMounted(() => {
  store.load()
  nodes.value = getNodes()
})
</script>

<style scoped>
.dtp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.dtp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.dtp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
}
.dtp-sub {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.dtp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.dtp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.dtp-stat b {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
}
.dtp-stat span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.dtp-stat--hot b {
  color: #f0c040;
}
.dtp-block {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(18, 14, 11, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.dtp-block-label {
  display: block;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 221, 208, 0.5);
  margin-bottom: 10px;
}
.dtp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 16px;
  text-align: center;
}
.dtp-empty span {
  font-size: 28px;
}
.dtp-empty p {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
}
.dtp-create {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.dtp-input {
  flex: 1;
  min-width: 140px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-high, rgba(232, 224, 216, 0.88));
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.dtp-input:focus {
  border-color: rgba(240, 192, 64, 0.4);
}
.dtp-input--sm {
  flex: 0 1 auto;
  min-width: 90px;
  padding: 6px 8px;
}
.dtp-select {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-high, rgba(232, 224, 216, 0.88));
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.dtp-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(240, 192, 64, 0.25);
  background: transparent;
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.dtp-btn--primary {
  background: rgba(240, 192, 64, 0.12);
  border-color: rgba(240, 192, 64, 0.35);
}
.dtp-btn--primary:hover {
  background: rgba(240, 192, 64, 0.2);
}
.dtp-btn--danger {
  border-color: rgba(196, 106, 90, 0.3);
  color: #c46a5a;
}
.dtp-tree-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dtp-tree-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(232, 221, 208, 0.6);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.dtp-tree-chip.active {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
  background: rgba(240, 192, 64, 0.1);
}
.dtp-tree-count {
  font-size: 10px;
  opacity: 0.6;
  margin-left: 4px;
}
.dtp-tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.dtp-tree-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
}
.dtp-tree-actions {
  display: flex;
  gap: 6px;
}
.dtp-tree-desc {
  margin: 6px 0 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.45);
  white-space: pre-line;
}
.dtp-nodes {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dtp-node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 2px solid rgba(255, 255, 255, 0.1);
}
.dtp-node--decision { border-left-color: #6b9fc4; }
.dtp-node--chance { border-left-color: #f0c040; }
.dtp-node--outcome { border-left-color: #8a9a7a; }
.dtp-node-type {
  font-size: 12px;
}
.dtp-node-label {
  flex: 1;
  font-size: 12px;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
}
.dtp-node-val,
.dtp-node-prob {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}
.dtp-node-add,
.dtp-node-del {
  font-size: 13px;
  cursor: pointer;
  padding: 0 4px;
  color: rgba(232, 221, 208, 0.4);
}
.dtp-node-add:hover {
  color: #f0c040;
}
.dtp-node-del:hover {
  color: #c46a5a;
}
.dtp-add-form {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 4px 0 4px 20px;
  flex-wrap: wrap;
}
.dtp-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
}
.dtp-stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.dtp-stat-cell b {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
}
.dtp-stat-cell span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.dtp-stat-cell--hot b {
  color: #f0c040;
}
.dtp-path {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.08);
}
.dtp-path--worst {
  background: rgba(196, 106, 90, 0.08);
}
.dtp-path-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #8a9a7a;
  margin-bottom: 4px;
}
.dtp-path--worst .dtp-path-label {
  color: #c46a5a;
}
.dtp-path-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-high, rgba(232, 224, 216, 0.88));
  line-height: 1.5;
}
.dtp-path-meta {
  margin: 4px 0 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}
.dtp-report-rec {
  padding: 10px;
  border-radius: 10px;
  background: rgba(240, 192, 64, 0.06);
  margin-bottom: 8px;
}
.dtp-report-rec-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #f0c040;
  margin-bottom: 4px;
}
.dtp-report {
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  margin-top: 8px;
}
.dtp-report-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}
.dtp-report--risk {
  color: #c46a5a;
}
.dtp-report--rec {
  color: #8a9a7a;
}
.dtp-report-item {
  margin: 2px 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.65);
  line-height: 1.6;
}
</style>
