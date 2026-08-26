<template>
    <!-- 网络模式 -->
    <div data-enter class="kt-panel">
      <div v-if="nodes.length && computedRelations.length" class="kt-net-wrap">
        <div class="kt-net-legend">
          <span class="kt-net-legend-icon">🕸</span>
          <span>知识网络 · {{ nodes.length }} 节点 · {{ computedRelations.length }} 关联</span>
        </div>
        <svg class="kt-net-svg" viewBox="-180 -180 360 360" preserveAspectRatio="xMidYMid meet">
          <!-- 背景网格 -->
          <g opacity="0.03">
            <line v-for="i in 8" :key="'gx'+i" :x1="i * 45 - 180" y1="-180" :x2="i * 45 - 180" y2="180" stroke="rgba(var(--accent-rgb), 0.5)" stroke-width="0.5" />
            <line v-for="i in 8" :key="'gy'+i" x1="-180" :y1="i * 45 - 180" x2="180" :y2="i * 45 - 180" stroke="rgba(var(--accent-rgb), 0.5)" stroke-width="0.5" />
          </g>
          <!-- 关系连线 -->
          <g class="net-links">
            <line v-for="(r, i) in computedRelations" :key="'nl'+i"
              :x1="netNodePos(r.sourceId).x" :y1="netNodePos(r.sourceId).y"
              :x2="netNodePos(r.targetId).x" :y2="netNodePos(r.targetId).y"
              :stroke="RELATION_TYPE_META[r.type].color"
              :stroke-dasharray="r.type==='contrast'?'4,3':r.type==='causal'?'2,3':'none'"
              stroke-width="1.2"
              opacity="0.2"
              class="net-link"
            />
          </g>
          <!-- 节点 -->
          <g class="net-nodes">
            <g v-for="(n, _i) in netNodes" :key="n.id"
              class="net-node-group"
              :transform="'translate('+n.x+','+n.y+')'"
              @click="openEdit(findNode(n.id))">
              <circle r="14" :fill="catColor(n.cat)" opacity="0.06" class="net-glow"/>
              <circle r="7" :fill="catColor(n.cat)" opacity="0.4" stroke="rgba(232,224,216,0.1)" stroke-width="0.5"/>
              <circle r="3.5" :fill="catColor(n.cat)" opacity="0.8" class="net-core"/>
              <text y="14" text-anchor="middle" fill="rgba(232,224,216,0.5)" font-size="6" class="net-label">{{ n.title.slice(0, 6) }}</text>
            </g>
          </g>
        </svg>
        <div class="net-legend-row">
          <span v-for="(meta, type) in RELATION_TYPE_META" :key="type" class="net-legend-item">
            <span class="net-legend-line" :style="{ background: meta.color }"></span>
            <span>{{ meta.label }}</span>
          </span>
        </div>
      </div>
      <div v-else-if="nodes.length && !computedRelations.length" class="kt-empty">
        <span>🕸</span><p>还没有关联关系</p>
        <p class="kt-empty-hint">点击节点编辑，为知识节点添加关系连接，网络将自动绘制</p>
      </div>
      <div v-else class="kt-empty"><span>🕸</span><p>知识网络等待第一个节点</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  nodes,
  computedRelations,
  RELATION_TYPE_META,
  netNodes,
  netNodePos,
  openEdit,
  catColor,
  findNode,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
