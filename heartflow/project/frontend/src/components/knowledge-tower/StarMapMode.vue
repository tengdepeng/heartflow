<template>
    <!-- 星图模式 (力导向布局) — 圆形塔楼房间 -->
    <div data-enter class="kt-panel">
      <div v-if="nodes.length" class="kt-star-map-wrap">
        <!-- 圆形房间框架装饰 -->
        <div class="kt-room-frame">
          <svg class="kt-room-frame-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
            <!-- 外圈圆环（塔楼石墙） -->
            <circle cx="200" cy="200" r="198" fill="none" stroke="rgba(var(--accent-rgb), 0.06)" stroke-width="1" />
            <circle cx="200" cy="200" r="192" fill="none" stroke="rgba(var(--accent-rgb), 0.04)" stroke-width="0.5" stroke-dasharray="4,6" />
            <!-- 方位标记（四正位） -->
            <text x="200" y="10" text-anchor="middle" fill="rgba(var(--accent-rgb), 0.08)" font-size="8" style="font-family: var(--font-heading-zh, 'Noto Serif SC', serif)">北</text>
            <text x="200" y="394" text-anchor="middle" fill="rgba(var(--accent-rgb), 0.08)" font-size="8" style="font-family: var(--font-heading-zh, 'Noto Serif SC', serif)">南</text>
            <text x="8" y="203" text-anchor="middle" fill="rgba(var(--accent-rgb), 0.08)" font-size="8" style="font-family: var(--font-heading-zh, 'Noto Serif SC', serif)">西</text>
            <text x="394" y="203" text-anchor="middle" fill="rgba(var(--accent-rgb), 0.08)" font-size="8" style="font-family: var(--font-heading-zh, 'Noto Serif SC', serif)">东</text>
            <!-- 内圈装饰 -->
            <circle cx="200" cy="200" r="180" fill="none" stroke="rgba(var(--accent-rgb), 0.02)" stroke-width="0.5" />
          </svg>
        </div>
        <svg class="kt-star-map" viewBox="-200 -200 400 400" preserveAspectRatio="xMidYMid meet">
          <!-- 背景星点 -->
          <g class="star-bg">
            <circle v-for="s in bgStars" :key="s.key"
              :cx="s.cx" :cy="s.cy" :r="s.r" :fill="s.fill"/>
          </g>
          <!-- 关系连线 -->
          <g class="star-links">
            <line v-for="(r, i) in computedRelations" :key="'rl'+i"
              :x1="getNodePos(r.sourceId).x" :y1="getNodePos(r.sourceId).y"
              :x2="getNodePos(r.targetId).x" :y2="getNodePos(r.targetId).y"
              :stroke="RELATION_TYPE_META[r.type].color"
              :stroke-dasharray="r.type==='contrast'?'4,3':r.type==='causal'?'2,3':'none'"
              :stroke-width="r.type==='belongs'?1.8:1"
              :opacity="hoveredRelation===r.id?0.8:0.25"
              class="star-link"
              @mouseenter="hoveredRelation=r.id"
              @mouseleave="hoveredRelation=undefined"
            />
          </g>
          <!-- 节点 -->
          <g class="star-nodes">
            <g v-for="n in starNodes" :key="n.id"
              class="star-node-group"
              :transform="'translate('+n.x+','+n.y+')'"
              @click="openEdit(findNode(n.id))"
              @mousedown.prevent="startDrag($event, n)">
              <!-- 光晕 -->
              <circle r="18" :fill="catColor(n.cat)" opacity="0.06" class="star-glow"/>
              <!-- 外圈 -->
              <circle r="10" :fill="catColor(n.cat)" opacity="0.2" stroke="rgba(232,224,216,0.1)" stroke-width="0.5"/>
              <!-- 核心 -->
              <circle r="5" :fill="catColor(n.cat)" opacity="0.8" class="star-core"/>
              <!-- 标签 -->
              <text y="18" text-anchor="middle" fill="rgba(232,224,216,0.55)" font-size="7" class="star-label">{{ n.title.slice(0, 8) }}</text>
            </g>
          </g>
        </svg>
        <!-- 图例 -->
        <div class="star-legend">
          <span v-for="(meta, type) in RELATION_TYPE_META" :key="type" class="star-legend-item">
            <span class="star-legend-line" :style="{ background: meta.color }"></span>
            <span class="star-legend-type">{{ meta.label }}</span>
          </span>
        </div>
      </div>
      <div v-else-if="!nodes.length" class="kt-empty"><span>🌟</span><p>知识星图等待第一个节点</p></div>
      <div v-else class="kt-empty"><span>🔍</span><p>未找到匹配的节点</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  nodes,
  bgStars,
  computedRelations,
  RELATION_TYPE_META,
  getNodePos,
  hoveredRelation,
  starNodes,
  openEdit,
  startDrag,
  catColor,
  findNode,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
