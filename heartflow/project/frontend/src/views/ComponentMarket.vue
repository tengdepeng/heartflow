<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance cm">
    <!-- Header -->
    <div data-enter class="cm-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">&#10022;</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">可视化组件 · 发现与配置</p>
      <h1 class="cm-title">组件市场</h1>
    </div>

    <!-- Overview cards -->
    <div data-enter class="cm-overview">
      <div class="cm-overview-card">
        <div class="cm-overview-value">{{ components.length }}</div>
        <div class="cm-overview-label">组件总数</div>
      </div>
      <div class="cm-overview-card">
        <div class="cm-overview-value">{{ activeCount }}</div>
        <div class="cm-overview-label">已启用</div>
      </div>
      <div class="cm-overview-card">
        <div class="cm-overview-value">{{ categories.length }}</div>
        <div class="cm-overview-label">分类数</div>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div data-enter class="cm-filter-bar">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="cm-filter-btn"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        {{ cat.icon }} {{ cat.label }}
      </button>
    </div>

    <!-- 组件网格 -->
    <div data-enter class="cm-grid">
      <article
        v-for="comp in filteredComponents"
        :key="comp.id"
        class="cm-card"
        :class="{ 'cm-card--active': comp.enabled }"
      >
        <!-- 组件预览 -->
        <div class="cm-preview" :style="{ '--preview-color': comp.color }">
          <svg viewBox="0 0 120 80" class="cm-preview-svg" :style="{ color: comp.color }">
            <!-- 折线图 -->
            <template v-if="comp.type === 'line'">
              <polyline points="10,65 30,40 50,55 70,20 90,35 110,15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />
              <circle cx="10" cy="65" r="2.5" fill="currentColor" opacity="0.6" />
              <circle cx="30" cy="40" r="2.5" fill="currentColor" opacity="0.6" />
              <circle cx="50" cy="55" r="2.5" fill="currentColor" opacity="0.6" />
              <circle cx="70" cy="20" r="2.5" fill="currentColor" opacity="0.6" />
              <circle cx="90" cy="35" r="2.5" fill="currentColor" opacity="0.6" />
              <circle cx="110" cy="15" r="2.5" fill="currentColor" opacity="0.6" />
              <path d="M10,65 L30,40 L50,55 L70,20 L90,35 L110,15 L110,80 L10,80 Z" fill="currentColor" opacity="0.06" />
            </template>
            <!-- 柱状图 -->
            <template v-else-if="comp.type === 'bar'">
              <rect x="12" y="50" width="12" height="20" rx="2" fill="currentColor" opacity="0.7" />
              <rect x="28" y="35" width="12" height="35" rx="2" fill="currentColor" opacity="0.6" />
              <rect x="44" y="45" width="12" height="25" rx="2" fill="currentColor" opacity="0.7" />
              <rect x="60" y="20" width="12" height="50" rx="2" fill="currentColor" opacity="0.5" />
              <rect x="76" y="40" width="12" height="30" rx="2" fill="currentColor" opacity="0.7" />
              <rect x="92" y="25" width="12" height="45" rx="2" fill="currentColor" opacity="0.6" />
            </template>
            <!-- 环状图 -->
            <template v-else-if="comp.type === 'ring'">
              <circle cx="60" cy="40" r="28" fill="none" stroke="currentColor" stroke-width="8" opacity="0.15" />
              <path d="M60,12 A28,28 0 1,1 35,18" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity="0.7" />
              <path d="M35,18 A28,28 0 0,1 80,15" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity="0.5" />
              <circle cx="60" cy="40" r="10" fill="currentColor" opacity="0.1" />
            </template>
            <!-- 散点图 -->
            <template v-else-if="comp.type === 'scatter'">
              <circle cx="15" cy="55" r="4" fill="currentColor" opacity="0.6" />
              <circle cx="35" cy="30" r="5" fill="currentColor" opacity="0.7" />
              <circle cx="50" cy="60" r="3" fill="currentColor" opacity="0.5" />
              <circle cx="65" cy="25" r="6" fill="currentColor" opacity="0.6" />
              <circle cx="85" cy="50" r="4" fill="currentColor" opacity="0.7" />
              <circle cx="100" cy="20" r="3" fill="currentColor" opacity="0.5" />
              <circle cx="45" cy="20" r="4" fill="currentColor" opacity="0.4" />
              <circle cx="75" cy="65" r="5" fill="currentColor" opacity="0.5" />
            </template>
            <!-- 面积图 -->
            <template v-else-if="comp.type === 'area'">
              <path d="M10,60 Q30,30 50,45 T90,25 T110,20 L110,75 L10,75 Z" fill="currentColor" opacity="0.12" />
              <path d="M10,60 Q30,30 50,45 T90,25 T110,20" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7" />
            </template>
            <!-- 热力图 -->
            <template v-else-if="comp.type === 'heatmap'">
              <rect x="10" y="15" width="22" height="18" rx="2" fill="currentColor" opacity="0.8" />
              <rect x="34" y="15" width="22" height="18" rx="2" fill="currentColor" opacity="0.4" />
              <rect x="58" y="15" width="22" height="18" rx="2" fill="currentColor" opacity="0.6" />
              <rect x="82" y="15" width="22" height="18" rx="2" fill="currentColor" opacity="0.3" />
              <rect x="10" y="36" width="22" height="18" rx="2" fill="currentColor" opacity="0.3" />
              <rect x="34" y="36" width="22" height="18" rx="2" fill="currentColor" opacity="0.7" />
              <rect x="58" y="36" width="22" height="18" rx="2" fill="currentColor" opacity="0.5" />
              <rect x="82" y="36" width="22" height="18" rx="2" fill="currentColor" opacity="0.8" />
              <rect x="10" y="57" width="22" height="18" rx="2" fill="currentColor" opacity="0.6" />
              <rect x="34" y="57" width="22" height="18" rx="2" fill="currentColor" opacity="0.4" />
              <rect x="58" y="57" width="22" height="18" rx="2" fill="currentColor" opacity="0.7" />
              <rect x="82" y="57" width="22" height="18" rx="2" fill="currentColor" opacity="0.5" />
            </template>
            <!-- 雷达图 -->
            <template v-else-if="comp.type === 'radar'">
              <polygon points="60,12 100,35 85,72 35,72 20,35" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.2" />
              <polygon points="60,18 88,38 77,65 43,65 32,38" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.15" />
              <polygon points="60,24 76,41 69,58 51,58 44,41" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.1" />
              <polygon points="60,14 92,36 80,68 40,68 28,36" fill="currentColor" opacity="0.12" />
              <polygon points="60,14 92,36 80,68 40,68 28,36" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6" />
              <circle cx="60" cy="14" r="2" fill="currentColor" />
              <circle cx="92" cy="36" r="2" fill="currentColor" />
              <circle cx="80" cy="68" r="2" fill="currentColor" />
              <circle cx="40" cy="68" r="2" fill="currentColor" />
              <circle cx="28" cy="36" r="2" fill="currentColor" />
            </template>
            <!-- 仪表盘 -->
            <template v-else-if="comp.type === 'gauge'">
              <path d="M15,70 A45,45 0 0,1 105,70" fill="none" stroke="currentColor" stroke-width="6" opacity="0.12" stroke-linecap="round" />
              <path d="M15,70 A45,45 0 0,1 85,28" fill="none" stroke="currentColor" stroke-width="6" opacity="0.6" stroke-linecap="round" />
              <line x1="60" y1="45" x2="60" y2="70" stroke="currentColor" stroke-width="2" opacity="0.7" stroke-linecap="round" />
              <circle cx="60" cy="70" r="4" fill="currentColor" opacity="0.4" />
            </template>
            <!-- 瀑布图 -->
            <template v-else-if="comp.type === 'waterfall'">
              <rect x="12" y="30" width="12" height="40" rx="2" fill="currentColor" opacity="0.7" />
              <line x1="24" y1="30" x2="28" y2="30" stroke="currentColor" stroke-width="1" opacity="0.4" />
              <rect x="28" y="45" width="12" height="25" rx="2" fill="currentColor" opacity="0.5" />
              <line x1="40" y1="45" x2="44" y2="45" stroke="currentColor" stroke-width="1" opacity="0.4" />
              <rect x="44" y="20" width="12" height="50" rx="2" fill="currentColor" opacity="0.6" />
              <line x1="56" y1="20" x2="60" y2="20" stroke="currentColor" stroke-width="1" opacity="0.4" />
              <rect x="60" y="35" width="12" height="35" rx="2" fill="currentColor" opacity="0.5" />
              <line x1="72" y1="35" x2="76" y2="35" stroke="currentColor" stroke-width="1" opacity="0.4" />
              <rect x="76" y="15" width="12" height="55" rx="2" fill="currentColor" opacity="0.7" />
              <line x1="88" y1="15" x2="92" y2="15" stroke="currentColor" stroke-width="1" opacity="0.4" />
              <rect x="92" y="40" width="12" height="30" rx="2" fill="currentColor" opacity="0.5" />
            </template>
            <!-- 箱线图 -->
            <template v-else-if="comp.type === 'boxplot'">
              <line x1="30" y1="15" x2="30" y2="70" stroke="currentColor" stroke-width="0.8" opacity="0.3" />
              <rect x="22" y="25" width="16" height="30" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1" />
              <line x1="22" y1="40" x2="38" y2="40" stroke="currentColor" stroke-width="1.2" opacity="0.6" />
              <line x1="30" y1="15" x2="30" y2="25" stroke="currentColor" stroke-width="1" opacity="0.4" />
              <line x1="30" y1="55" x2="30" y2="70" stroke="currentColor" stroke-width="1" opacity="0.4" />
              <circle cx="30" cy="12" r="2" fill="currentColor" opacity="0.5" />
              <line x1="75" y1="20" x2="75" y2="65" stroke="currentColor" stroke-width="0.8" opacity="0.3" />
              <rect x="67" y="30" width="16" height="25" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1" />
              <line x1="67" y1="42" x2="83" y2="42" stroke="currentColor" stroke-width="1.2" opacity="0.6" />
              <line x1="75" y1="20" x2="75" y2="30" stroke="currentColor" stroke-width="1" opacity="0.4" />
              <line x1="75" y1="55" x2="75" y2="65" stroke="currentColor" stroke-width="1" opacity="0.4" />
            </template>
            <!-- 默认：折线图 -->
            <template v-else>
              <polyline points="10,65 30,40 50,55 70,20 90,35 110,15" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7" />
            </template>
          </svg>
        </div>
        <!-- 组件信息 -->
        <div class="cm-card-body">
          <h3 class="cm-card-name">{{ comp.name }}</h3>
          <p class="cm-card-desc">{{ comp.description }}</p>
          <div class="cm-card-tags">
            <span class="cm-tag">{{ comp.category }}</span>
            <span class="cm-tag cm-tag--meta">{{ comp.size }}</span>
          </div>
        </div>
        <!-- 操作 -->
        <div class="cm-card-actions">
          <button
            class="cm-card-btn"
            :class="{ active: comp.enabled }"
            @click="toggleComponent(comp.id)"
          >
            {{ comp.enabled ? '已启用' : '启用' }}
          </button>
          <button class="cm-card-btn cm-card-btn--config" @click="openConfig(comp.id)">
            配置
          </button>
        </div>
      </article>
    </div>

    <!-- 配置弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="configComp" class="cm-modal-overlay" @click.self="configComp = null">
          <div class="cm-modal-card">
            <h3 class="cm-modal-title">配置 · {{ configComp.name }}</h3>
            <div class="cm-modal-config">
              <div class="cm-config-row">
                <label class="cm-config-label">组件尺寸</label>
                <select v-model="configComp.size" class="cm-config-select">
                  <option value="small">小</option>
                  <option value="medium">中</option>
                  <option value="large">大</option>
                </select>
              </div>
              <div class="cm-config-row">
                <label class="cm-config-label">显示图例</label>
                <div class="cm-config-toggle">
                  <button
                    class="cm-toggle-btn"
                    :class="{ active: configComp.showLegend }"
                    @click="configComp.showLegend = true"
                  >是</button>
                  <button
                    class="cm-toggle-btn"
                    :class="{ active: !configComp.showLegend }"
                    @click="configComp.showLegend = false"
                  >否</button>
                </div>
              </div>
              <div class="cm-config-row">
                <label class="cm-config-label">显示网格</label>
                <div class="cm-config-toggle">
                  <button
                    class="cm-toggle-btn"
                    :class="{ active: configComp.showGrid }"
                    @click="configComp.showGrid = true"
                  >是</button>
                  <button
                    class="cm-toggle-btn"
                    :class="{ active: !configComp.showGrid }"
                    @click="configComp.showGrid = false"
                  >否</button>
                </div>
              </div>
              <div class="cm-config-row">
                <label class="cm-config-label">动画效果</label>
                <div class="cm-config-toggle">
                  <button
                    class="cm-toggle-btn"
                    :class="{ active: configComp.animated }"
                    @click="configComp.animated = true"
                  >开</button>
                  <button
                    class="cm-toggle-btn"
                    :class="{ active: !configComp.animated }"
                    @click="configComp.animated = false"
                  >关</button>
                </div>
              </div>
            </div>
            <div class="cm-modal-actions">
              <button class="cm-modal-btn cm-modal-btn--primary" @click="configComp = null">
                完成
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'

// ---- 组件类型定义 ----
const { entranceRef, entranceClass } = useViewEntrance()
interface ComponentItem {
  id: string
  type: string
  name: string
  description: string
  category: string
  color: string
  size: string
  enabled: boolean
  showLegend: boolean
  showGrid: boolean
  animated: boolean
}

const categories = [
  { key: 'all', icon: '◈', label: '全部' },
  { key: 'chart', icon: '📊', label: '图表' },
  { key: 'diagram', icon: '🔷', label: '示意图' },
  { key: 'widget', icon: '🧩', label: '小部件' },
]

const activeCategory = ref('all')

// ---- 组件列表 ----
const components = ref<ComponentItem[]>([
  {
    id: 'line-chart',
    type: 'line',
    name: '折线图',
    description: '展示数据随时间或顺序的变化趋势',
    category: 'chart',
    color: '#d4a574',
    size: 'medium',
    enabled: true,
    showLegend: true,
    showGrid: true,
    animated: true,
  },
  {
    id: 'bar-chart',
    type: 'bar',
    name: '柱状图',
    description: '比较不同类别之间的数值差异',
    category: 'chart',
    color: '#e8c49a',
    size: 'medium',
    enabled: true,
    showLegend: true,
    showGrid: true,
    animated: true,
  },
  {
    id: 'ring-chart',
    type: 'ring',
    name: '环状图',
    description: '展示各部分占整体的比例关系',
    category: 'chart',
    color: '#f0d6b0',
    size: 'medium',
    enabled: false,
    showLegend: true,
    showGrid: false,
    animated: true,
  },
  {
    id: 'scatter-plot',
    type: 'scatter',
    name: '散点图',
    description: '探索两个变量之间的相关性',
    category: 'chart',
    color: '#7a9ec8',
    size: 'medium',
    enabled: false,
    showLegend: false,
    showGrid: true,
    animated: false,
  },
  {
    id: 'area-chart',
    type: 'area',
    name: '面积图',
    description: '强调数量随时间变化的幅度',
    category: 'chart',
    color: '#7aa87a',
    size: 'medium',
    enabled: false,
    showLegend: true,
    showGrid: true,
    animated: true,
  },
  {
    id: 'heatmap',
    type: 'heatmap',
    name: '热力图',
    description: '用颜色密度展示数据分布',
    category: 'diagram',
    color: '#c87a6a',
    size: 'large',
    enabled: false,
    showLegend: true,
    showGrid: false,
    animated: false,
  },
  {
    id: 'radar-chart',
    type: 'radar',
    name: '雷达图',
    description: '多维度对比不同实体的表现',
    category: 'diagram',
    color: '#a090e0',
    size: 'medium',
    enabled: false,
    showLegend: true,
    showGrid: true,
    animated: true,
  },
  {
    id: 'gauge',
    type: 'gauge',
    name: '仪表盘',
    description: '直观展示关键指标的当前状态',
    category: 'widget',
    color: '#5ab0d8',
    size: 'small',
    enabled: false,
    showLegend: false,
    showGrid: false,
    animated: true,
  },
  {
    id: 'waterfall',
    type: 'waterfall',
    name: '瀑布图',
    description: '展示数据的逐步增减变化过程',
    category: 'chart',
    color: '#b8a080',
    size: 'medium',
    enabled: false,
    showLegend: true,
    showGrid: true,
    animated: false,
  },
  {
    id: 'boxplot',
    type: 'boxplot',
    name: '箱线图',
    description: '展示数据分布的统计特征',
    category: 'diagram',
    color: '#8ab88a',
    size: 'medium',
    enabled: false,
    showLegend: false,
    showGrid: true,
    animated: false,
  },
])

// ---- 计算属性 ----
const filteredComponents = computed(() => {
  if (activeCategory.value === 'all') return components.value
  return components.value.filter(c => c.category === activeCategory.value)
})

const activeCount = computed(() => components.value.filter(c => c.enabled).length)

// ---- 方法 ----
function toggleComponent(id: string) {
  const comp = components.value.find(c => c.id === id)
  if (comp) comp.enabled = !comp.enabled
}

const configComp = ref<ComponentItem | null>(null)

function openConfig(id: string) {
  const comp = components.value.find(c => c.id === id)
  if (comp) configComp.value = { ...comp }
}
</script>

<style scoped>
/* =========================================================
   Component Market — Warm Amber Theme
   All classes use cm- prefix.
   ========================================================= */

/* === Base Container === */
.cm {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px 64px;
  min-height: 100vh;
  background: transparent;
  color: var(--text-primary);
  isolation: isolate;
}

/* Ambient glow */
.cm::before {
  content: '';
  position: fixed;
  top: -30%;
  left: 50%;
  translate: -50% 0;
  width: 700px;
  height: 700px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.07) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
}
.cm::after {
  content: '';
  position: fixed;
  bottom: -25%;
  right: -15%;
  width: 500px;
  height: 500px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* === Header === */
.cm-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}
.orn-line {
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent, #d4a574), transparent);
}
.orn-diamond {
  color: var(--accent, #d4a574);
  font-size: 14px;
  opacity: 0.7;
}
.header-kicker {
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(var(--accent-rgb), 0.55);
  margin: 0 0 10px;
  font-weight: 400;
}
.cm-title {
  font-size: 32px;
  font-weight: 300;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 6px;
}

/* === Overview Cards === */
.cm-overview {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}
.cm-overview-card {
  flex: 1;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  text-align: center;
  transition: border-color 0.25s ease, background 0.25s ease;
}
.cm-overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(255, 255, 255, 0.04);
}
.cm-overview-value {
  font-size: 24px;
  font-weight: 300;
  color: var(--accent, #d4a574);
  line-height: 1.2;
  margin-bottom: 4px;
}
.cm-overview-label {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
  letter-spacing: 1px;
}

/* === Filter Bar === */
.cm-filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
}
.cm-filter-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-surface);
  color: rgba(var(--text-primary-rgb), 0.6);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cm-filter-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}
.cm-filter-btn.active {
  border-color: var(--accent, #d4a574);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--text-primary);
}

/* === Component Grid === */
.cm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  position: relative;
  z-index: 1;
}

/* === Component Card === */
.cm-card {
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
  transition: border-color 0.25s ease, background 0.25s ease;
}
.cm-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.cm-card--active {
  border-color: var(--accent, #d4a574);
  background: rgba(var(--accent-rgb), 0.06);
}

/* === Preview === */
.cm-preview {
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cm-preview-svg {
  width: 100%;
  height: 80px;
  max-width: 200px;
}

/* === Card Body === */
.cm-card-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cm-card-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}
.cm-card-desc {
  font-size: 12px;
  color: var(--text-medium);
  margin: 0;
  line-height: 1.5;
}

/* === Tags === */
.cm-card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cm-tag {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-medium);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.cm-tag--meta {
  color: rgba(var(--accent-rgb), 0.5);
  border-color: rgba(var(--accent-rgb), 0.12);
}

/* === Card Actions === */
.cm-card-actions {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
}
.cm-card-btn {
  flex: 1;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cm-card-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(var(--accent-rgb), 0.25);
}
.cm-card-btn.active {
  border-color: var(--accent, #d4a574);
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--text-primary);
}
.cm-card-btn--config {
  border-color: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--text-primary-rgb), 0.6);
}
.cm-card-btn--config:hover {
  color: var(--text-primary);
}

/* === Modal === */
.cm-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.cm-modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-panel);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 16px;
  padding: 28px;
  max-height: 86vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
}
.cm-modal-title {
  font-size: 18px;
  font-weight: 400;
  color: var(--text-primary);
  margin: 0 0 24px;
  letter-spacing: 1px;
}
.cm-modal-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}
.cm-config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.cm-config-label {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.6);
}
.cm-config-select {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  min-width: 80px;
}
.cm-config-toggle {
  display: flex;
  gap: 4px;
}
.cm-toggle-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-dim);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cm-toggle-btn.active {
  border-color: var(--accent, #d4a574);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--text-primary);
}
.cm-modal-actions {
  display: flex;
  justify-content: flex-end;
}
.cm-modal-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cm-modal-btn--primary {
  border: 1px solid var(--accent, #d4a574);
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--text-primary);
}
.cm-modal-btn--primary:hover {
  background: rgba(var(--accent-rgb), 0.25);
}

/* === Modal Transition === */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-active .cm-modal-card {
  animation: modal-in 0.25s ease;
}
.modal-leave-active .cm-modal-card {
  animation: modal-in 0.2s ease reverse;
}
@keyframes modal-in {
  from { transform: scale(0.96) translateY(8px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

/* === Responsive === */
@media (max-width: 860px) {
  .cm { padding: 32px 20px 64px; }
  .cm-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
  .cm-title { font-size: 26px; }
}
@media (max-width: 640px) {
  .cm { padding: 24px 14px 56px; }
  .cm-grid { grid-template-columns: 1fr; }
  .cm-card-actions { flex-direction: column; }
  .cm-card-btn { width: 100%; }
}
</style>