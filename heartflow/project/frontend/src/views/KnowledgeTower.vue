<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance kt">
    <!-- 氛围背景层：经略阁 · 知识星轨 -->
    <div class="kt-ambient" aria-hidden="true">
      <div class="kt-glow kt-glow--top"></div>
      <div class="kt-glow kt-glow--bot"></div>
      <!-- 经略阁 SVG 装饰 -->
      <div class="kt-svg-decor" aria-hidden="true">
        <svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ktCoreGlow" cx="50%" cy="35%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.05"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <filter id="ktStarGlow">
              <feGaussianBlur stdDeviation="1.2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <linearGradient id="ktTowerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.04"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
          </defs>

          <!-- 中心光晕 -->
          <circle cx="300" cy="240" r="250" fill="url(#ktCoreGlow)"/>

          <!-- 星座连线 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.3" class="kt-constellation">
            <line x1="80" y1="120" x2="180" y2="200"/>
            <line x1="180" y1="200" x2="120" y2="320"/>
            <line x1="120" y1="320" x2="200" y2="450"/>
            <line x1="520" y1="130" x2="420" y2="210"/>
            <line x1="420" y1="210" x2="480" y2="330"/>
            <line x1="480" y1="330" x2="400" y2="460"/>
            <line x1="300" y1="80" x2="380" y2="170"/>
            <line x1="300" y1="80" x2="220" y2="170"/>
            <line x1="380" y1="170" x2="420" y2="210"/>
            <line x1="220" y1="170" x2="180" y2="200"/>
          </g>

          <!-- 星空节点 -->
          <g fill="var(--accent)" opacity="0.05" filter="url(#ktStarGlow)" class="kt-stars">
            <circle cx="80" cy="120" r="2" class="kt-star kt-star--1"/>
            <circle cx="180" cy="200" r="1.8" class="kt-star kt-star--2"/>
            <circle cx="120" cy="320" r="1.5" class="kt-star kt-star--3"/>
            <circle cx="200" cy="450" r="2.2" class="kt-star kt-star--4"/>
            <circle cx="520" cy="130" r="1.8" class="kt-star kt-star--5"/>
            <circle cx="420" cy="210" r="2" class="kt-star kt-star--6"/>
            <circle cx="480" cy="330" r="1.5" class="kt-star kt-star--7"/>
            <circle cx="400" cy="460" r="1.8" class="kt-star kt-star--8"/>
            <circle cx="300" cy="80" r="2.5" class="kt-star kt-star--9"/>
            <circle cx="380" cy="170" r="1.3" class="kt-star kt-star--10"/>
            <circle cx="220" cy="170" r="1.3" class="kt-star kt-star--11"/>
            <circle cx="100" cy="550" r="1.8" class="kt-star kt-star--12"/>
            <circle cx="500" cy="580" r="1.5" class="kt-star kt-star--13"/>
            <circle cx="300" cy="620" r="1.6" class="kt-star kt-star--14"/>
          </g>

          <!-- 知识轨道环 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.4" fill="none" class="kt-orbits">
            <ellipse cx="300" cy="240" rx="140" ry="30">
              <animate attributeName="ry" values="28;32;28" dur="8s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="300" cy="240" rx="180" ry="40" stroke-dasharray="3,6">
              <animate attributeName="ry" values="38;42;38" dur="10s" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="7s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="300" cy="240" rx="220" ry="55" stroke-dasharray="2,8">
              <animate attributeName="ry" values="53;57;53" dur="9s" repeatCount="indefinite"/>
            </ellipse>
          </g>

          <!-- 高塔轮廓 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.5" fill="none" class="kt-tower-outline">
            <rect x="270" y="100" width="60" height="180" rx="4"/>
            <line x1="270" y1="140" x2="330" y2="140"/>
            <line x1="270" y1="180" x2="330" y2="180"/>
            <line x1="270" y1="220" x2="330" y2="220"/>
            <!-- 塔尖 -->
            <polygon points="300,70 280,100 320,100"/>
            <!-- 塔基 -->
            <rect x="250" y="275" width="100" height="12" rx="2"/>
          </g>

          <!-- 底部书页装饰 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.4" fill="none" class="kt-books">
            <rect x="140" y="660" width="40" height="6" rx="1"/>
            <rect x="145" y="654" width="38" height="6" rx="1"/>
            <rect x="420" y="670" width="36" height="5" rx="1"/>
            <rect x="425" y="665" width="34" height="5" rx="1"/>
          </g>

          <!-- 灵感碎片漂浮 -->
          <g fill="var(--accent)" opacity="0.04" class="kt-inspiration-shards">
            <rect x="340" y="140" width="4" height="4" rx="0.5" class="kt-shard kt-shard--1" transform="rotate(15 342 142)"/>
            <rect x="250" y="260" width="3" height="3" rx="0.5" class="kt-shard kt-shard--2" transform="rotate(-20 251 261)"/>
            <rect x="360" y="300" width="4" height="4" rx="0.5" class="kt-shard kt-shard--3" transform="rotate(30 362 302)"/>
            <rect x="230" y="380" width="3" height="3" rx="0.5" class="kt-shard kt-shard--4" transform="rotate(-10 231 381)"/>
            <rect x="380" y="420" width="4" height="4" rx="0.5" class="kt-shard kt-shard--5" transform="rotate(25 382 422)"/>
            <rect x="260" y="500" width="3" height="3" rx="0.5" class="kt-shard kt-shard--6" transform="rotate(-15 261 501)"/>
          </g>
        </svg>
      </div>
    </div>

    <!-- 经略阁圆形轨道装饰背景层（孤儿 KnowledgeCircle 接线 · 透明环境层，位于内容之下） -->
    <div class="kt-bg-circle">
      <KnowledgeCircle :categoriesCount="6" />
    </div>

    <!-- 内容层（位于背景之上，承载入场动画 data-enter） -->
    <div class="kt-content" data-enter>
    <!-- 装饰性头部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">知识的高塔，由你亲手搭建</p>
    <h1 class="kt-title">经略阁</h1>

    <!-- AI管家浮动按钮 -->
    <button
      class="kt-steward-btn"
      :class="{ active: showSteward }"
      @click="showSteward = !showSteward"
      title="AI管家"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span class="steward-label">AI管家</span>
    </button>

    <!-- 概览卡片 -->
    <div data-enter class="overview-cards">
      <div class="overview-card">
        <span class="overview-num">{{ nodes.length }}</span>
        <span class="overview-label">知识节点</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ categories.length }}</span>
        <span class="overview-label">分类数</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ stormItems.length }}</span>
        <span class="overview-label">灵感碎片</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ importSources.length }}</span>
        <span class="overview-label">导入来源</span>
      </div>
    </div>

    <!-- 展示模式切换 -->
    <div data-enter class="kt-tabs">
      <button v-for="m in modes" :key="m.key" :class="['kt-tab',{active:mode===m.key}]" @click="mode=m.key">{{m.icon}} {{m.label}}</button>
      <button class="kt-tab kt-import-tab" @click="showImportModal=true">📥 导入</button>
    </div>

    <!-- 搜索/筛选栏 -->
    <div data-enter class="kt-search-bar">
      <svg class="kt-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        v-model="searchQuery"
        class="kt-search-input"
        placeholder="搜索知识节点…"
        type="text"
      />
      <button
        v-if="searchQuery"
        class="kt-search-clear"
        @click="searchQuery = ''"
      >✕</button>
    </div>

    <!-- 各展示模式（子组件自带回 data-enter / .kt-panel 根，按 mode 条件挂载） -->
    <StarMapMode v-if="mode==='graph'" />
    <Scene3DMode v-if="mode==='3d'" />
    <OutlineMode v-if="mode==='outline'" />
    <BrainstormMode v-if="mode==='brainstorm'" />
    <TimelineMode v-if="mode==='timeline'" />
    <MapMode v-if="mode==='map'" />
    <RingMode v-if="mode==='ring'" />
    <TreeMode v-if="mode==='tree'" />
    <NetworkMode v-if="mode==='network'" />
    <GalleryMode v-if="mode==='gallery'" />
    <BookshelfMode v-if="mode==='bookshelf'" />
    <SocraticMode v-if="mode==='socratic'" />
    <ListMode v-if="mode==='list'" />
    <ImportSourcesMode v-if="mode==='import'" />
    <LettersMode v-if="mode==='letters'" />
    <TapesMode v-if="mode==='tapes'" />

    <!-- 导入弹窗 -->
    <ImportSourceModal v-if="showImportModal" @close="showImportModal=false" @import="handleImport" />

    <!-- 编辑弹窗（Teleport 到 body，内部自管 showModal） -->
    <NodeEditModal />

    <!-- 关系编辑弹窗 -->
    <RelationEditor
      v-if="showRelationEditor"
      :nodeId="editingNodeId"
      :nodeTitle="form.title"
      @close="showRelationEditor=false"
    />

    <!-- AI管家面板（内部自管 showSteward + Transition） -->
    <StewardPanel />

    <!-- 决策分析 -->
    <DecisionAnalysisPanel />

    <!-- 间隔复习 -->
    <FlashcardsPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { useKnowledgeTowerUi, KT_UI_KEY } from '../modules/knowledge/useKnowledgeTowerUi'
import { useViewEntrance } from '../composables/useViewEntrance'

import ImportSourceModal from '../components/ImportSourceModal.vue'
import RelationEditor from '../components/RelationEditor.vue'

import StarMapMode from '../components/knowledge-tower/StarMapMode.vue'
import Scene3DMode from '../components/knowledge-tower/Scene3DMode.vue'
import OutlineMode from '../components/knowledge-tower/OutlineMode.vue'
import BrainstormMode from '../components/knowledge-tower/BrainstormMode.vue'
import TimelineMode from '../components/knowledge-tower/TimelineMode.vue'
import MapMode from '../components/knowledge-tower/MapMode.vue'
import RingMode from '../components/knowledge-tower/RingMode.vue'
import TreeMode from '../components/knowledge-tower/TreeMode.vue'
import NetworkMode from '../components/knowledge-tower/NetworkMode.vue'
import GalleryMode from '../components/knowledge-tower/GalleryMode.vue'
import BookshelfMode from '../components/knowledge-tower/BookshelfMode.vue'
import SocraticMode from '../components/knowledge-tower/SocraticMode.vue'
import ListMode from '../components/knowledge-tower/ListMode.vue'
import ImportSourcesMode from '../components/knowledge-tower/ImportSourcesMode.vue'
import LettersMode from '../components/knowledge-tower/LettersMode.vue'
import TapesMode from '../components/knowledge-tower/TapesMode.vue'
import StewardPanel from '../components/knowledge-tower/StewardPanel.vue'
import NodeEditModal from '../components/knowledge-tower/NodeEditModal.vue'
import DecisionAnalysisPanel from '../components/DecisionAnalysisPanel.vue'
import FlashcardsPanel from '../components/FlashcardsPanel.vue'
import KnowledgeCircle from '../components/knowledge/KnowledgeCircle.vue'

// 视图级 UI 实例（每挂载实例全新状态），经 provide 下发，子面板 inject 共享同一实例。
const ui = useKnowledgeTowerUi()
provide(KT_UI_KEY, ui)
const { entranceRef, entranceClass } = useViewEntrance()

// 骨架自身仅需驱动 chrome（头部/概览/标签/搜索）与三个独立弹窗的编排。
const {
  showSteward,
  nodes,
  categories,
  stormItems,
  importSources,
  modes,
  mode,
  searchQuery,
  showImportModal,
  handleImport,
  showRelationEditor,
  editingNodeId,
  form,
} = ui
</script>

<style scoped src="../components/knowledge-tower/knowledge-shared.css"></style>

<style scoped>
/* 氛围背景层 */
.kt-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.kt-glow {
  position: absolute;
  pointer-events: none;
}
.kt-glow--top {
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 300px;
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
}
.kt-glow--bot {
  bottom: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 450px;
  height: 280px;
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
}

/* SVG 装饰层 */
.kt-svg-decor {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}
.kt-svg-decor svg {
  width: 100%;
  max-width: 600px;
  height: 100%;
  max-height: 100vh;
  opacity: 0.6;
}

/* 星空闪烁 */
.kt-star {
  animation: kt-star-twinkle 4s ease-in-out infinite;
}
.kt-star--1 { animation-delay: 0s; }
.kt-star--2 { animation-delay: -0.3s; }
.kt-star--3 { animation-delay: -0.7s; }
.kt-star--4 { animation-delay: -1.1s; }
.kt-star--5 { animation-delay: -1.5s; }
.kt-star--6 { animation-delay: -0.5s; }
.kt-star--7 { animation-delay: -0.9s; }
.kt-star--8 { animation-delay: -1.3s; }
.kt-star--9 { animation-delay: -0.2s; }
.kt-star--10 { animation-delay: -1.7s; }
.kt-star--11 { animation-delay: -1.9s; }
.kt-star--12 { animation-delay: -2.5s; }
.kt-star--13 { animation-delay: -2.8s; }
.kt-star--14 { animation-delay: -3.2s; }
@keyframes kt-star-twinkle {
  0%, 100% { opacity: 0.03; transform: scale(1); }
  50% { opacity: 0.1; transform: scale(1.6); }
}

/* 星座连线呼吸 */
.kt-constellation {
  animation: kt-const-breathe 6s ease-in-out infinite;
}
@keyframes kt-const-breathe {
  0%, 100% { opacity: 0.02; }
  50% { opacity: 0.05; }
}

/* 灵感碎片漂浮 */
.kt-shard {
  animation: kt-shard-float 7s ease-in-out infinite;
}
.kt-shard--1 { animation-delay: 0s; }
.kt-shard--2 { animation-delay: -1.5s; }
.kt-shard--3 { animation-delay: -3s; }
.kt-shard--4 { animation-delay: -4.5s; }
.kt-shard--5 { animation-delay: -2s; }
.kt-shard--6 { animation-delay: -5s; }
@keyframes kt-shard-float {
  0%, 100% { transform: translateY(0); opacity: 0.03; }
  50% { transform: translateY(-8px); opacity: 0.07; }
}

/* 孤儿 KnowledgeCircle 接线：经略阁圆形轨道装饰作透明环境背景层 */
.kt-bg-circle {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
}
.kt-content {
  position: relative;
  z-index: 1;
}
</style>
