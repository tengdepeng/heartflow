<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance decoration-workshop">
    <!-- 氛围背景 -->
    <div data-enter class="dw-ambient" aria-hidden="true">
      <div class="dw-glow dw-glow--top"></div>
      <div class="dw-glow dw-glow--bottom"></div>
    </div>

    <!-- 装饰性顶部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <div data-enter class="header-kicker">雕琢殿堂的每一寸肌理</div>
    <h1 class="dw-title">殿堂装修工坊</h1>

    <!-- 概览卡片 -->
    <div class="overview-cards">
      <div class="overview-card">
        <span class="overview-num">{{ toolCount }}</span>
        <span class="overview-label">装修工具</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ scenePresetCount }}</span>
        <span class="overview-label">场景预设</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ interactionRuleCount }}</span>
        <span class="overview-label">交互规则</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ carrierCount }}</span>
        <span class="overview-label">载体</span>
      </div>
    </div>

    <!-- 工具分类网格 -->
    <section data-enter class="dw-section">
      <h2 class="section-label">
        <span class="section-label-icon">🛠</span>
        装修工具集
      </h2>
      <div class="tool-grid">
        <div
          v-for="tool in tools"
          :key="tool.id"
          class="tool-card"
          @click="navTo(tool.route)"
        >
          <div class="tool-icon-wrap">
            <span class="tool-icon">{{ tool.icon }}</span>
          </div>
          <div class="tool-info">
            <h3 class="tool-name">{{ tool.name }}</h3>
            <p class="tool-desc">{{ tool.description }}</p>
          </div>
          <div class="tool-status">
            <span :class="['status-dot', tool.status === 'complete' ? 'dot-green' : 'dot-yellow']"></span>
            <span class="status-text">{{ tool.status === 'complete' ? '已就绪' : '完善中' }}</span>
          </div>
          <span class="tool-arrow">→</span>
        </div>
      </div>
    </section>

    <!-- 装修历史 -->
    <section data-enter class="dw-section" v-if="recentHistory.length > 0">
      <h2 class="section-label">
        <span class="section-label-icon">📋</span>
        最近装修记录
      </h2>
      <div class="history-list">
        <div
          v-for="item in recentHistory"
          :key="item.id"
          class="history-item"
        >
          <span class="history-icon">{{ item.icon }}</span>
          <div class="history-body">
            <span class="history-action">{{ item.action }}</span>
            <span class="history-detail">{{ item.detail }}</span>
          </div>
          <span class="history-time">{{ formatTime(item.time) }}</span>
        </div>
      </div>
    </section>

    <!-- 快捷操作 -->
    <section data-enter class="dw-section">
      <h2 class="section-label">
        <span class="section-label-icon">⚡</span>
        快捷操作
      </h2>
      <div class="quick-actions">
        <button class="quick-btn" @click="navTo('/environment-editor')">
          <span class="quick-icon">🎨</span>
          <span class="quick-label">调整环境</span>
        </button>
        <button class="quick-btn" @click="navTo('/carrier-editor')">
          <span class="quick-icon">💎</span>
          <span class="quick-label">编辑载体</span>
        </button>
        <button class="quick-btn" @click="navTo('/scene-editor')">
          <span class="quick-icon">🏞</span>
          <span class="quick-label">编辑场景</span>
        </button>
        <button class="quick-btn" @click="navTo('/space-customizer')">
          <span class="quick-icon">📐</span>
          <span class="quick-label">定制空间</span>
        </button>
        <button class="quick-btn" @click="navTo('/style-market')">
          <span class="quick-icon">🎭</span>
          <span class="quick-label">风格市场</span>
        </button>
        <button class="quick-btn" @click="navTo('/interaction-config')">
          <span class="quick-icon">🔗</span>
          <span class="quick-label">交互配置</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useScenes } from '../modules/scene'
import { useCarrier } from '../modules/carrier'
import { useInteractionConfigs } from '../modules/interaction'
import { useDecorationHistory } from '../modules/decoration-history'
import { formatDateTime as formatTime } from '../utils/time'

const { entranceRef, entranceClass } = useViewEntrance()
const router = useRouter()

// ---- 工具定义 ----
interface DecorationTool {
  id: string
  name: string
  icon: string
  description: string
  route: string
  status: 'complete' | 'wip'
  category: string
}

const tools: DecorationTool[] = [
  {
    id: 'environment',
    name: '环境编辑器',
    icon: '🎨',
    description: '调整全局环境参数：背景氛围、光色、密度、字体、过渡动画',
    route: '/environment-editor',
    status: 'complete',
    category: '基础',
  },
  {
    id: 'carrier',
    name: '载体编辑器',
    icon: '💎',
    description: '设计玉珠载体形态：圆球、结晶、火焰、种子，配光效与色彩',
    route: '/carrier-editor',
    status: 'complete',
    category: '基础',
  },
  {
    id: 'scene',
    name: '场景编辑器',
    icon: '🏞',
    description: '编排家空间的内部场景：门厅、卧室、厨房等区域可视化布局',
    route: '/scene-editor',
    status: 'complete',
    category: '空间',
  },
  {
    id: 'space-customizer',
    name: '空间定制器',
    icon: '📐',
    description: '自定义空间维度配置：布局、主题、交互行为、视觉风格',
    route: '/space-customizer',
    status: 'complete',
    category: '空间',
  },
  {
    id: 'interaction',
    name: '交互配置',
    icon: '🔗',
    description: '配置元素交互规则：手势绑定、点击行为、拖拽、悬停效果',
    route: '/interaction-config',
    status: 'wip',
    category: '交互',
  },
  {
    id: 'material',
    name: '材质工坊',
    icon: '🧱',
    description: '管理材质类型与预设：玻璃、金属、木质、石材、布艺等',
    route: '/material-workshop',
    status: 'complete',
    category: '材质',
  },
  {
    id: 'component',
    name: '组件市场',
    icon: '🧩',
    description: '浏览和安装可复用 UI 组件：卡片、面板、导航、表单等',
    route: '/component-market',
    status: 'complete',
    category: '组件',
  },
  {
    id: 'style',
    name: '风格市场',
    icon: '🎭',
    description: '浏览和切换风格包：暖琥珀、深夜食堂、水墨禅意等',
    route: '/style-market',
    status: 'complete',
    category: '风格',
  },
  {
    id: 'template',
    name: '模板市场',
    icon: '📋',
    description: '浏览和套用页面模板：仪表盘、笔记页、相册、时间线等',
    route: '/template-market',
    status: 'complete',
    category: '模板',
  },
]

const toolCount = computed(() => tools.length)

// ---- 响应式数据源（共享模块级 ref，编辑器修改后即时反映） ----
const { scenes, load: loadScenes } = useScenes()
const { carriers, load: loadCarriers } = useCarrier()
const { configs: interactionConfigs, load: loadInteractionConfigs } = useInteractionConfigs()

const scenePresetCount = computed(() => scenes.value.length)
const carrierCount = computed(() => (carriers.value?.length ?? 0))
const interactionRuleCount = computed(() =>
  interactionConfigs.value.reduce((sum, c) => sum + (c.rules?.length || 0), 0),
)

const { historyItems: recentHistory, load: loadHistory } = useDecorationHistory()

onMounted(() => {
  loadScenes()
  loadCarriers()
  loadInteractionConfigs()
  loadHistory()
})

// ---- 导航 ----
function navTo(path: string) {
  router.push(path)
}

// ---- 工具函数 ----
</script>

<style scoped>
/* =============================================
   殿堂装修工坊 · 统一入口
   雕琢殿堂的每一寸肌理
   ============================================= */

.decoration-workshop {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.decoration-workshop::before,
.decoration-workshop::after {
  content: '';
  position: absolute;
  top: 0;
  width: 40%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.decoration-workshop::before {
  left: 0;
  background: radial-gradient(ellipse 600px 80% at 0% 50%, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
}

.decoration-workshop::after {
  right: 0;
  background: radial-gradient(ellipse 600px 80% at 100% 50%, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
}

/* ---- 氛围背景 ---- */
.dw-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.dw-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(150px);
  opacity: 0.06;
}

.dw-glow--top {
  top: -200px;
  left: -100px;
  background: var(--accent);
}

.dw-glow--bottom {
  bottom: -200px;
  right: -100px;
  background: var(--accent);
}

/* ---- 装饰性顶部 ---- */
.header-ornament {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 32px 0;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent);
}

.orn-diamond {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

.header-kicker {
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.3);
  letter-spacing: 4px;
  margin-top: 10px;
}

.dw-title {
  position: relative;
  z-index: 1;
  text-align: center;
  font-family: var(--font-heading-en);
  font-size: 28px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.75);
  letter-spacing: 6px;
  margin-top: 6px;
}

/* ---- 概览卡片 ---- */
.overview-cards {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px 32px 0;
}

.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 20px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  min-width: 80px;
}

.overview-num {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.overview-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

/* ---- 内容区 ---- */
.dw-section {
  position: relative;
  z-index: 1;
  padding: 20px 32px 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 2px;
  margin-bottom: 12px;
  font-weight: 500;
}

.section-label-icon {
  font-size: 16px;
}

/* ---- 工具网格 ---- */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  cursor: pointer;
  transition: all 0.25s;
}

.tool-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--accent-rgb), 0.15);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.tool-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tool-icon {
  font-size: 20px;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.8);
  margin-bottom: 2px;
}

.tool-desc {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tool-status {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot-green { background: var(--green); }
.dot-yellow { background: var(--yellow); }

.status-text {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.3);
}

.tool-arrow {
  font-size: 16px;
  color: rgba(var(--accent-rgb), 0.2);
  flex-shrink: 0;
}

/* ---- 装修历史 ---- */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.04);
}

.history-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.history-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.history-action {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
}

.history-detail {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.25);
}

.history-time {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.2);
  flex-shrink: 0;
}

/* ---- 快捷操作 ---- */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--accent-rgb), 0.05);
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}

.quick-icon {
  font-size: 16px;
}

.quick-label {
  font-size: 13px;
}

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
  .overview-cards {
    flex-wrap: wrap;
  }
}
</style>