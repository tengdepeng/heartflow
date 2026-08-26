<template>
    <!-- 3D星图模式 -->
    <div data-enter class="kt-panel kt-scene-3d-wrap">
      <div v-if="nodes.length" class="kt-scene-3d" ref="scene3dRef"
        @mousedown="on3dMouseDown" @mousemove="on3dMouseMove" @mouseup="on3dMouseUp"
        @mouseleave="on3dMouseUp"
        @touchstart.prevent="on3dTouchStart" @touchmove.prevent="on3dTouchMove" @touchend="on3dTouchEnd">
        <div class="kt-scene-3d-inner" :style="scene3dStyle">
          <!-- 3D 关系连线 -->
          <svg class="kt-scene-3d-links" viewBox="-200 -200 400 400" preserveAspectRatio="xMidYMid meet">
            <line v-for="(r, i) in computedRelations" :key="'rl3d'+i"
              :x1="getNodePos3d(r.sourceId).x" :y1="getNodePos3d(r.sourceId).y"
              :x2="getNodePos3d(r.targetId).x" :y2="getNodePos3d(r.targetId).y"
              :stroke="RELATION_TYPE_META[r.type].color"
              :stroke-dasharray="r.type==='contrast'?'4,3':r.type==='causal'?'2,3':'none'"
              :stroke-width="r.type==='belongs'?1.8:1"
              :opacity="hoveredRelation===r.id?0.6:0.18"
              class="star-link"
            />
          </svg>
          <!-- 3D 节点 -->
          <div v-for="n in starNodes3d" :key="n.id" class="kt-node-3d"
            :style="{
              transform: 'translate3d('+n.ty+'px,'+(-n.tx)+'px,'+n.tz+'px)',
              '--node-color': catColor(n.cat),
              '--node-opacity': n.zOp,
              '--node-scale': n.zSc,
            }"
            @click="openEdit(findNode(n.id))"
            :title="n.title">
            <div class="kt-node-3d-core"></div>
            <div class="kt-node-3d-ring"></div>
            <span class="kt-node-3d-label">{{ n.title.slice(0, 6) }}</span>
          </div>
          <!-- 中心光晕 -->
          <div class="kt-scene-3d-center-glow"></div>
        </div>
      </div>
      <div v-else class="kt-empty"><span>🌟</span><p>3D星图等待第一个节点</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  nodes,
  scene3dRef,
  on3dMouseDown,
  on3dMouseMove,
  on3dMouseUp,
  on3dTouchStart,
  on3dTouchMove,
  on3dTouchEnd,
  scene3dStyle,
  computedRelations,
  RELATION_TYPE_META,
  getNodePos3d,
  hoveredRelation,
  starNodes3d,
  openEdit,
  catColor,
  findNode,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
