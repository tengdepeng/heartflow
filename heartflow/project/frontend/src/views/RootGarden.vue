<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance root">
    <header data-enter>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="kicker">追溯「我为什么会变成今天这个样子」</p>
      <h1 class="title">根脉之庭</h1>
      <div class="overview-cards">
        <div class="overview-card">
          <span class="overview-num">{{ roots.length }}</span>
          <span class="overview-label">总记录</span>
        </div>
        <div class="overview-card">
          <span class="overview-num">{{ roots.filter(r => r.layer === 'soil').length }}</span>
          <span class="overview-label">根系</span>
        </div>
        <div class="overview-card">
          <span class="overview-num">{{ roots.filter(r => r.layer === 'branch').length }}</span>
          <span class="overview-label">枝桠</span>
        </div>
      </div>
    </header>

    <!-- 统计概览 -->
    <div data-enter class="stats-row">
      <div class="stat-item"><span class="stat-num">{{ roots.length }}</span><span class="stat-label">总记录</span></div>
      <div class="stat-item"><span class="stat-num">{{ roots.filter(r=>r.layer==='soil').length }}</span><span class="stat-label">根系</span></div>
      <div class="stat-item"><span class="stat-num">{{ roots.filter(r=>r.layer==='era').length }}</span><span class="stat-label">树干</span></div>
      <div class="stat-item"><span class="stat-num">{{ roots.filter(r=>r.layer==='branch').length }}</span><span class="stat-label">枝桠</span></div>
    </div>

    <!-- 溯源树 SVG 编织可视化 -->
    <div data-enter class="tree-viz">
      <svg viewBox="0 0 400 340" class="tree-svg" @mouseleave="hoveredRoot = null">
        <defs>
          <!-- 树干纹理渐变 -->
          <linearGradient id="trunk-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(139, 90, 43, 0.3)" />
            <stop offset="30%" stop-color="rgba(160, 110, 55, 0.4)" />
            <stop offset="50%" stop-color="rgba(180, 130, 70, 0.35)" />
            <stop offset="70%" stop-color="rgba(160, 110, 55, 0.4)" />
            <stop offset="100%" stop-color="rgba(139, 90, 43, 0.3)" />
          </linearGradient>
          <!-- 树冠光晕 -->
          <radialGradient id="crown-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(180, 220, 140, 0.12)" />
            <stop offset="70%" stop-color="rgba(140, 180, 100, 0.04)" />
            <stop offset="100%" stop-color="rgba(100, 140, 80, 0)" />
          </radialGradient>
          <!-- 根系光晕 -->
          <radialGradient id="root-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(139, 90, 43, 0.08)" />
            <stop offset="100%" stop-color="rgba(139, 90, 43, 0)" />
          </radialGradient>
        </defs>

        <!-- 树冠光晕 -->
        <ellipse cx="200" cy="65" rx="90" ry="50" fill="url(#crown-glow)">
          <animate attributeName="rx" values="85;95;85" dur="6s" repeatCount="indefinite" />
          <animate attributeName="ry" values="48;52;48" dur="6s" repeatCount="indefinite" />
        </ellipse>

        <!-- 根系光晕 -->
        <ellipse cx="200" cy="275" rx="80" ry="30" fill="url(#root-glow)">
          <animate attributeName="rx" values="75;85;75" dur="7s" repeatCount="indefinite" />
        </ellipse>

        <!-- 树干主体 -->
        <rect x="194" y="90" width="12" height="170" rx="6" fill="url(#trunk-grad)" />
        <!-- 树干纹理线 -->
        <line x1="197" y1="100" x2="197" y2="250" stroke="rgba(139,90,43,0.15)" stroke-width="0.5" />
        <line x1="200" y1="95" x2="200" y2="255" stroke="rgba(160,110,55,0.1)" stroke-width="0.5" />
        <line x1="203" y1="100" x2="203" y2="250" stroke="rgba(139,90,43,0.12)" stroke-width="0.5" />

        <!-- 年轮环 -->
        <g opacity="0.15">
          <circle cx="200" cy="140" r="14" fill="none" stroke="rgba(180,130,70,0.3)" stroke-width="0.8">
            <animate attributeName="r" values="12;16;12" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="180" r="12" fill="none" stroke="rgba(180,130,70,0.25)" stroke-width="0.6">
            <animate attributeName="r" values="10;14;10" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="220" r="10" fill="none" stroke="rgba(180,130,70,0.2)" stroke-width="0.5">
            <animate attributeName="r" values="9;12;9" dur="4.5s" repeatCount="indefinite" />
          </circle>
        </g>

        <!-- 根系层 (soil) —— 底部 -->
        <g v-for="(n, _i) in treeLayout.soil" :key="n.id">
          <!-- 根须 -->
          <path
            :d="rootTendrilPath(n.x, 260, _i)"
            fill="none"
            stroke="rgba(139,90,43,0.2)"
            stroke-width="1.2"
            stroke-linecap="round"
          />
          <path
            :d="rootTendrilPath2(n.x, 260, _i)"
            fill="none"
            stroke="rgba(139,90,43,0.12)"
            stroke-width="0.8"
            stroke-linecap="round"
          />
          <!-- 连接线 -->
          <line :x1="200" :y1="260" :x2="n.x" :y2="260" class="tree-branch" />
          <!-- 节点 -->
          <circle :cx="n.x" :cy="260" r="7" class="tree-node soil-node" @mouseenter="hoveredRoot = n">
            <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
          </circle>
          <text :x="n.x" :y="278" class="node-label" text-anchor="middle">{{ n.text }}</text>
        </g>

        <!-- 树干层 (era) —— 中部 -->
        <g v-for="(n, _i) in treeLayout.era" :key="n.id">
          <line :x1="200" :y1="170" :x2="n.x" :y2="170" class="tree-branch" />
          <circle :cx="n.x" :cy="170" r="7" class="tree-node era-node" @mouseenter="hoveredRoot = n">
            <animate attributeName="r" values="6;8;6" dur="3.5s" repeatCount="indefinite" />
          </circle>
          <text :x="n.x" :y="163" class="node-label" text-anchor="middle">{{ n.text }}</text>
        </g>

        <!-- 枝桠层 (branch) —— 顶部 -->
        <g v-for="(n, _i) in treeLayout.branch" :key="n.id">
          <!-- 主枝 -->
          <line :x1="200" :y1="90" :x2="n.x" :y2="n.y" class="tree-branch" />
          <!-- 子枝 -->
          <line v-if="n.subBranches" v-for="sb in n.subBranches"
            :x1="n.x" :y1="n.y"
            :x2="sb.x" :y2="sb.y"
            stroke="rgba(180,220,140,0.15)"
            stroke-width="0.8"
          />
          <!-- 节点 -->
          <circle :cx="n.x" :cy="n.y" r="7" class="tree-node branch-node" @mouseenter="hoveredRoot = n">
            <animate attributeName="r" values="6;8;6" dur="4s" repeatCount="indefinite" />
          </circle>
          <!-- 叶片 -->
          <ellipse v-if="n.leaves" v-for="l in n.leaves"
            :cx="l.x" :cy="l.y"
            :rx="l.rx" :ry="l.ry"
            :fill="l.fill"
            :transform="`rotate(${l.rot}, ${l.x}, ${l.y})`"
            opacity="0.25"
          />
          <text :x="n.x" :y="n.y - 11" class="node-label" text-anchor="middle">{{ n.text }}</text>
        </g>

        <!-- 层标识 -->
        <text x="8" y="280" class="layer-label">根系 · 原生土壤</text>
        <text x="8" y="174" class="layer-label">树干 · 时代与成长</text>
        <text x="8" y="84" class="layer-label">枝桠 · 分化与选择</text>
      </svg>

      <!-- 悬浮详情 -->
      <div v-if="hoveredRoot" class="tree-tooltip">
        <div class="tt-header">{{ hoveredRoot.icon }} {{ hoveredRoot.text }}</div>
        <div v-if="hoveredRoot.era" class="tt-era">{{ hoveredRoot.era }}</div>
        <div v-if="hoveredRoot.detail" class="tt-detail">{{ hoveredRoot.detail }}</div>
      </div>
    </div>

    <!-- 根系——原生土壤 -->
    <section data-enter class="tree-section">
      <h3>🌳 根系 · 原生土壤</h3>
      <p class="hint">家庭、故乡、童年——那些你最初生长的土壤</p>
      <div class="root-list">
        <div v-for="r in byLayer('soil')" :key="r.id" class="root-card" :class="{ expanded: r._expanded }" role="button" tabindex="0" :aria-label="'展开或收起根系 ' + r.text" :aria-expanded="!!r._expanded" @click="toggleExpand(r)" @keydown.enter.prevent="toggleExpand(r)" @keydown.space.prevent="toggleExpand(r)">
          <div class="root-card-header">
            <span class="root-icon">{{ r.icon }}</span>
            <div class="root-info">
              <span class="root-text">{{ r.text }}</span>
              <span class="root-date">{{ r.era || '' }}</span>
            </div>
            <button class="root-del" @click.stop="removeRoot(r.id)">×</button>
          </div>
          <div v-if="r._expanded && r.detail" class="root-detail">
            <p>{{ r.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 树干——时代与成长 -->
    <section data-enter class="tree-section">
      <h3>🪵 树干 · 时代与成长</h3>
      <p class="hint">时代背景、成长环境、迁移与变动</p>
      <div class="root-list">
        <div v-for="r in byLayer('era')" :key="r.id" class="root-card" :class="{ expanded: r._expanded }" role="button" tabindex="0" :aria-label="'展开或收起根系 ' + r.text" :aria-expanded="!!r._expanded" @click="toggleExpand(r)" @keydown.enter.prevent="toggleExpand(r)" @keydown.space.prevent="toggleExpand(r)">
          <div class="root-card-header">
            <span class="root-icon">{{ r.icon }}</span>
            <div class="root-info">
              <span class="root-text">{{ r.text }}</span>
              <span class="root-date">{{ r.era || '' }}</span>
            </div>
            <button class="root-del" @click.stop="removeRoot(r.id)">×</button>
          </div>
          <div v-if="r._expanded && r.detail" class="root-detail">
            <p>{{ r.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 枝桠——分化与选择 -->
    <section data-enter class="tree-section">
      <h3>🌿 枝桠 · 分化与选择</h3>
      <p class="hint">信念锚点、三观形成、对你影响深远的人和书</p>
      <div class="root-list">
        <div v-for="r in byLayer('branch')" :key="r.id" class="root-card" :class="{ expanded: r._expanded }" role="button" tabindex="0" :aria-label="'展开或收起根系 ' + r.text" :aria-expanded="!!r._expanded" @click="toggleExpand(r)" @keydown.enter.prevent="toggleExpand(r)" @keydown.space.prevent="toggleExpand(r)">
          <div class="root-card-header">
            <span class="root-icon">{{ r.icon }}</span>
            <div class="root-info">
              <span class="root-text">{{ r.text }}</span>
              <span class="root-date">{{ r.era || '' }}</span>
            </div>
            <button class="root-del" @click.stop="removeRoot(r.id)">×</button>
          </div>
          <div v-if="r._expanded && r.detail" class="root-detail">
            <p>{{ r.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 花园健康（来自 roots 模块） -->
    <section data-enter class="tree-section" v-if="gardenHealth">
      <h3>💚 花园健康 · {{ gardenHealth.overallLevel }}</h3>
      <div class="health-grid">
        <div class="health-stat">
          <span class="health-num" :style="{ color: gardenHealth.overallScore >= 80 ? '#34d399' : gardenHealth.overallScore >= 60 ? '#6b9fc4' : gardenHealth.overallScore >= 40 ? '#f59e0b' : '#ef4444' }">{{ gardenHealth.overallScore }}</span>
          <span class="health-label">综合评分</span>
        </div>
        <div v-for="layer in gardenHealth.byLayer" :key="layer.layer" class="health-stat">
          <span class="health-num">{{ layer.count }}</span>
          <span class="health-label">{{ layer.layer === 'soil' ? '根系' : layer.layer === 'era' ? '树干' : '枝桠' }}</span>
        </div>
      </div>
      <div v-if="gardenHealth.growthSuggestions.length" class="health-suggestions">
        <p v-for="(s, i) in gardenHealth.growthSuggestions.slice(0, 3)" :key="i" class="health-suggestion">{{ s }}</p>
      </div>
    </section>

    <!-- 衰减报告（来自 roots 模块） -->
    <section data-enter class="tree-section" v-if="decayReport">
      <h3>⚠️ 衰减警报</h3>
      <div class="decay-info">
        <div class="decay-row">
          <span class="decay-label">衰减根系</span>
          <span class="decay-value">{{ decayReport.decayedCount }}</span>
        </div>
        <div class="decay-row">
          <span class="decay-label">保护中根系</span>
          <span class="decay-value">{{ decayReport.protectedCount }}</span>
        </div>
        <div v-if="decayReport.recommendations.length" class="decay-recs">
          <p v-for="(rec, i) in decayReport.recommendations" :key="i" class="decay-rec">{{ rec }}</p>
        </div>
      </div>
    </section>

    <!-- 添加表单 -->
    <div data-enter class="add-box">
      <select v-model="form.layer" class="rt-select">
        <option value="soil">🌳 根系 · 原生土壤</option>
        <option value="era">🪵 树干 · 时代与成长</option>
        <option value="branch">🌿 枝桠 · 分化与选择</option>
      </select>
      <input v-model="form.text" placeholder="一句话描述…" class="rt-input" />
      <input v-model="form.era" placeholder="时期（如「小时候」「大学」）" class="rt-input" style="width:140px" />
      <button @click="addRoot" class="rt-btn" :disabled="!form.text">+</button>
    </div>
    <textarea v-model="form.detail" placeholder="展开详情（可选）——一个片段、一段回忆、一句话…" class="rt-textarea" rows="2" />

    <!-- 溯源树生长提示 -->
    <div data-enter v-if="!roots.length" class="empty">
      <span>🌳</span>
      <p>溯源树还在等待生长</p>
      <span class="empty-hint">在时间长廊里偶遇一段旧记忆时，来这里种下一个根系节点</span>
    </div>

    <!-- 根系可视化（roots·useRootVisualization：生命力地图 / 根脉图谱 / 标签聚类，INCR-163） -->
    <RootVisualizationPanel v-if="roots.length" />

    <!-- 根脉可视化 -->
    <VisualTreePanel :roots="roots" />

    <!-- ============================================================ -->
    <!-- 根脉叙事档案（INCR-292 补挂载孤儿组件 RootNarrativeArchivePanel：溯源叙事/时代回顾/支线故事/关键人物/时间脉络/情感曲线/温和洞察，消费 root-narrative 叙事生成函数 + root-tree weaveTraceTree，应用库内唯一，零 props 自持读桥） -->
    <!-- ============================================================ -->
    <RootNarrativeArchivePanel />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useDecayEngine } from '../modules/roots/decay-engine'
import { computeGardenHealth } from '../modules/roots/root-narrative'
import { useRootGarden } from '../modules/roots/roots-garden'
import type { Root } from '../modules/roots/roots-garden'
import VisualTreePanel from '../components/VisualTreePanel.vue'
import RootVisualizationPanel from '../components/RootVisualizationPanel.vue'
import RootNarrativeArchivePanel from '../components/RootNarrativeArchivePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const rootGarden = useRootGarden()
const roots = rootGarden.items

const form = reactive({ layer: 'soil' as 'soil' | 'era' | 'branch', text: '', era: '', detail: '' })

const hoveredRoot = ref<{
  id: string
  x: number
  y: number
  text: string
  era: string
  detail: string
  icon: string
  layer: string
} | null>(null)

const treeLayout = computed(() => {
  const yPos: Record<string, number> = { soil: 260, era: 170, branch: 80 }
  const result: Record<string, any[]> = { soil: [], era: [], branch: [] }
  for (const layer of ['soil', 'era', 'branch'] as const) {
    const nodes = byLayer(layer)
    const count = nodes.length
    if (count === 0) continue
    const positions: number[] =
      count === 1
        ? [200]
        : nodes.map((_, i) => 50 + (300 / (count - 1)) * i)
    nodes.forEach((node, i) => {
      const base = {
        id: node.id,
        x: positions[i],
        y: yPos[layer],
        text: node.text,
        era: node.era,
        detail: node.detail,
        icon: node.icon,
        layer: node.layer,
      }
      // 枝桠层添加子枝和叶片
      if (layer === 'branch') {
        const x = positions[i]
        const y = yPos[layer]
        const subBranches: { x: number; y: number }[] = []
        const leaves: { x: number; y: number; rx: number; ry: number; fill: string; rot: number }[] = []
        const leafColors = ['rgba(180,220,140,0.3)', 'rgba(160,200,120,0.25)', 'rgba(200,230,160,0.2)', 'rgba(140,180,100,0.3)']
        const seed = node.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
        // 生成 1-2 个子枝
        const subCount = (seed % 2) + 1
        for (let j = 0; j < subCount; j++) {
          const angle = (seed * (j + 1) * 37) % 360
          const rad = (angle * Math.PI) / 180
          const len = 15 + (seed % 10)
          subBranches.push({
            x: Number((x + Math.cos(rad) * len).toFixed(1)),
            y: Number((y - Math.abs(Math.sin(rad)) * len).toFixed(1)),
          })
        }
        // 生成 1-3 个叶片
        const leafCount = (seed % 3) + 1
        for (let j = 0; j < leafCount; j++) {
          const angle = (seed * (j + 2) * 53) % 360
          const rad = (angle * Math.PI) / 180
          const dist = 20 + (seed % 15)
          leaves.push({
            x: Number((x + Math.cos(rad) * dist).toFixed(1)),
            y: Number((y - Math.abs(Math.sin(rad)) * dist).toFixed(1)),
            rx: 4 + (seed % 3),
            ry: 2 + (seed % 2),
            fill: leafColors[(seed + j) % leafColors.length],
            rot: angle,
          })
        }
        result[layer].push({ ...base, subBranches, leaves })
      } else {
        result[layer].push(base)
      }
    })
  }
  return result
})

// 根须路径生成
function rootTendrilPath(x: number, y: number, seed: number): string {
  const s = (seed * 137 + 42) % 100
  const cx = x + (s - 50) * 0.2
  const endX = x + (s - 50) * 0.6
  const endY = y + 30 + (s % 20)
  const cp1x = cx
  const cp1y = y + 10
  const cp2x = endX
  const cp2y = endY - 8
  return `M${x},${y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`
}

function rootTendrilPath2(x: number, y: number, seed: number): string {
  const s = (seed * 251 + 17) % 100
  const cx = x + (s - 50) * 0.3
  const endX = x + (s - 50) * 0.5
  const endY = y + 22 + (s % 15)
  const cp1x = cx
  const cp1y = y + 8
  const cp2x = endX
  const cp2y = endY - 5
  return `M${x},${y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`
}

const icons: Record<string, string> = { soil: '🪨', era: '🪵', branch: '🌿' }

function byLayer(layer: string) {
  return roots.value.filter(r => r.layer === layer)
}

function toggleExpand(r: Root) {
  r._expanded = !r._expanded
  rootGarden.save()
}

function addRoot() {
  if (!form.text.trim()) return
  roots.value.unshift({
    id: `rt${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    layer: form.layer,
    text: form.text.trim(),
    detail: form.detail.trim(),
    era: form.era.trim(),
    icon: icons[form.layer],
    _expanded: false,
    strength: 0.5,
    connections: [],
    tags: [],
    color: '#8a9a7a',
    willId: null,
    lastUpdatedAt: new Date().toISOString(),
  })
  rootGarden.save()
  form.text = ''
  form.era = ''
  form.detail = ''
}

function removeRoot(id: string) {
  roots.value = roots.value.filter(r => r.id !== id)
  rootGarden.save()
}

onMounted(() => { rootGarden.load() })

// ============================================================
// 模块 composable 集成：衰减引擎 + 花园健康
// ============================================================

const decayEngine = useDecayEngine()

const gardenHealth = computed(() => {
  if (!roots.value.length) return null
  return computeGardenHealth(roots.value)
})

const decayReport = computed(() => {
  if (!roots.value.length) return null
  return decayEngine.runDecayCheck(roots.value)
})
</script>

<style scoped>
.root {
  max-width: 520px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100%;
  overflow-y: auto;
  background: transparent;
  position: relative;
}
.root::before,
.root::after {
  content: '';
  position: fixed;
  pointer-events: none;
  z-index: 0;
  border-radius: 50%;
}
.root::before {
  left: -200px;
  top: 5%;
  width: 400px;
  height: 600px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.06), transparent 70%);
}
.root::after {
  right: -200px;
  bottom: 5%;
  width: 400px;
  height: 600px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04), transparent 70%);
}
.root ::selection {
  background: rgba(var(--accent-rgb), 0.15);
}

/* ensure content sits above ambient glow */
header,
.stats-row,
.tree-section,
.add-box,
.rt-textarea,
.empty {
  position: relative;
  z-index: 1;
}

/* ---- header ---- */
header {
  text-align: center;
  margin-bottom: 20px;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}
.orn-line {
  width: 40px;
  height: 1px;
  background: rgba(var(--accent-rgb), 0.2);
}
.orn-diamond {
  font-size: 10px;
  color: var(--accent);
  opacity: 0.5;
}
.kicker {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  letter-spacing: 1px;
}
.title {
  font-family: var(--font-heading-zh);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-high);
  letter-spacing: 4px;
  margin: 0;
}

/* ---- overview cards ---- */
.overview-cards {
  display: flex;
  gap: 6px;
  margin-top: 16px;
}
.overview-card {
  flex: 1;
  text-align: center;
  padding: 10px 8px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.overview-num {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
}
.overview-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}

/* ---- stats ---- */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 20px;
}
.stat-item {
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.stat-num {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
}
.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
  display: block;
}

/* ---- tree sections ---- */
.tree-section {
  margin-bottom: 24px;
}
.tree-section h3 {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}
.hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.root-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.root-card {
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
}
.root-card:hover {
  background: rgba(55, 48, 40, 0.7);
}
.root-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  background: rgba(55, 48, 40, 0.7);
}
.root-card.expanded {
  background: rgba(55, 48, 40, 0.7);
}
.root-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}
.root-icon {
  font-size: 18px;
}
.root-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.root-text {
  font-size: 13px;
  color: var(--text-high);
}
.root-date {
  font-size: 11px;
  color: var(--text-secondary);
}
.root-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  opacity: 0;
  font-size: 12px;
}
.root-card:hover .root-del {
  opacity: 1;
}
.root-del:hover {
  color: #e06b6b;
}
.root-detail {
  padding: 0 12px 12px;
}
.root-detail p {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0;
  white-space: pre-line;
}

/* ---- form ---- */
.add-box {
  display: flex;
  gap: 6px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.rt-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.rt-input:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.rt-input::placeholder {
  color: var(--text-secondary);
}
.rt-select {
  padding: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.rt-select option {
  background: var(--bg-deep);
  color: var(--text-high);
}
.rt-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.rt-btn:disabled {
  opacity: 0.35;
}
.rt-textarea {
  width: 100%;
  margin-top: 6px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  line-height: 1.5;
}
.rt-textarea:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.rt-textarea::placeholder {
  color: var(--text-secondary);
}

/* ---- empty ---- */
.empty {
  text-align: center;
  padding: 60px 0;
  color: var(--text-faint);
}
.empty span {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}
.empty-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ---- 溯源树 SVG ---- */
.tree-viz {
  position: relative;
  z-index: 1;
  margin-bottom: 20px;
  border-radius: 10px;
  background: rgba(30, 26, 22, 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  padding: 4px 0 0;
}
.tree-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.tree-trunk {
  stroke: rgba(var(--accent-rgb), 0.15);
  stroke-width: 2;
  stroke-linecap: round;
}
.tree-branch {
  stroke: rgba(var(--accent-rgb), 0.10);
  stroke-width: 1;
  stroke-linecap: round;
}
.tree-node {
  cursor: pointer;
  transition: r 0.15s, opacity 0.15s;
}
.tree-node:hover {
  r: 8;
  opacity: 1;
}
.soil-node {
  fill: #b8860b;
  opacity: 0.7;
}
.era-node {
  fill: #8b7355;
  opacity: 0.7;
}
.branch-node {
  fill: #6b8e23;
  opacity: 0.7;
}
.node-label {
  fill: var(--text-secondary);
  font-size: 9px;
  font-family: inherit;
  pointer-events: none;
}
.layer-label {
  fill: var(--text-faint);
  font-size: 8px;
  font-family: inherit;
  letter-spacing: 0.5px;
  pointer-events: none;
}
.tree-tooltip {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 85%;
  background: rgba(20, 16, 11, 0.95);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  z-index: 10;
  pointer-events: none;
  animation: fade-in 0.12s ease;
}
.tt-header {
  font-size: 13px;
  color: var(--text-high);
  font-weight: 500;
}
.tt-era {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  margin-top: 2px;
}
.tt-detail {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.5;
  white-space: pre-line;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ---- 花园健康 ---- */
.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.health-stat {
  text-align: center;
  padding: 10px 6px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.health-num {
  display: block;
  font-size: 20px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.health-label {
  display: block;
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 2px;
  letter-spacing: 0.5px;
}

.health-suggestions {
  margin-top: 8px;
}

.health-suggestion {
  font-size: 11px;
  color: var(--text-dim);
  padding: 4px 0;
  margin: 0;
  line-height: 1.5;
}

/* ---- 衰减报告 ---- */
.decay-info {
  padding: 4px 0;
}

.decay-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.decay-label {
  font-size: 12px;
  color: var(--text-dim);
}

.decay-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
}

.decay-recs {
  margin-top: 8px;
}

.decay-rec {
  font-size: 11px;
  color: var(--text-dim);
  padding: 3px 0;
  margin: 0;
  line-height: 1.5;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .root { padding: 32px 20px 64px; }
  .overview-cards { gap: 8px; }
  .overview-card { padding: 12px 8px; }
  .stats-row { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .root { padding: 24px 14px 56px; }
  .overview-cards { flex-direction: column; }
  .tree-section h3 { font-size: 12px; }
}

@media (max-width: 480px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .stat-item { padding: 8px; }
  .stat-num { font-size: 18px; }
  .stat-label { font-size: 9px; }
}
</style>