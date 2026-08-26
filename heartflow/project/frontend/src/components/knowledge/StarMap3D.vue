<template>
  <div
    ref="entranceRef"
    :class="['sm3d-wrap', 'view-entrance', entranceClass]"
  >
    <!-- 3D 场景容器 -->
    <div
      data-enter
      class="sm3d-scene"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <div class="sm3d-inner" :style="sceneStyle">
        <!-- 关系连线 (SVG 2D 投影) -->
        <svg
          class="sm3d-links"
          viewBox="-200 -200 400 400"
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            v-for="r in relations"
            :key="r.id"
            :x1="nodePosMap[r.sourceId]?.x ?? 0"
            :y1="nodePosMap[r.sourceId]?.y ?? 0"
            :x2="nodePosMap[r.targetId]?.x ?? 0"
            :y2="nodePosMap[r.targetId]?.y ?? 0"
            :stroke="RELATION_TYPE_META[r.type].color"
            :stroke-dasharray="r.type === 'contrast' ? '4,3' : r.type === 'causal' ? '2,3' : 'none'"
            :stroke-width="r.type === 'belongs' ? 1.8 : 1"
            opacity="0.18"
            class="sm3d-link"
          />
        </svg>

        <!-- 3D 节点 -->
        <div
          v-for="n in positionedNodes"
          :key="n.id"
          class="sm3d-node"
          :style="{
            transform: 'translate3d(' + n.px + 'px,' + n.py + 'px,' + n.pz + 'px)',
            '--node-color': catColor(n.cat),
            '--node-opacity': String(n.zOp),
            '--node-scale': String(n.zSc),
          }"
          @click="handleNodeClick(n.id)"
          :title="n.title"
        >
          <div class="sm3d-node-core" />
          <div class="sm3d-node-ring" />
          <span class="sm3d-node-label">{{ n.title.slice(0, 6) }}</span>
        </div>

        <!-- 中心光晕 -->
        <div class="sm3d-center-glow" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RELATION_TYPE_META } from '../../modules/knowledge/types'
import type { KnowledgeNode, KnowledgeRelation } from '../../modules/knowledge/types'
import { useViewEntrance } from '../../composables/useViewEntrance'
import { CATEGORY_PALETTE } from '../../theme/categoryColors'

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  nodes: KnowledgeNode[]
  relations: KnowledgeRelation[]
}>()

const emit = defineEmits<{
  selectNode: [nodeId: string]
}>()

// ============================================================
// 入场动画
// ============================================================

const { entranceRef, entranceClass } = useViewEntrance()

// ============================================================
// 分类颜色映射
// ============================================================

const CAT_COLORS: Record<string, string> = {
  concept: CATEGORY_PALETTE[12],
  rule: CATEGORY_PALETTE[11],
  frame: CATEGORY_PALETTE[8],
  insight: CATEGORY_PALETTE[10],
  pitfall: CATEGORY_PALETTE[14],
  metaphor: CATEGORY_PALETTE[5],
}

function catColor(cat: string): string {
  return CAT_COLORS[cat] ?? '#d4a574'
}

// ============================================================
// 3D 位置计算
// ============================================================

interface PositionedNode3D {
  id: string
  title: string
  cat: string
  desc: string
  px: number
  py: number
  pz: number
  zOp: number
  zSc: number
}

interface SimNode {
  id: string
  cat: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

/**
 * 根据关系类型施加不同力，计算 3D 节点位置
 */
const positionedNodes = computed<PositionedNode3D[]>(() => {
  const nodeList = props.nodes
  if (nodeList.length === 0) return []

  // 初始化模拟节点：在球面上分布
  const simNodes: SimNode[] = nodeList.map((n, i) => {
    const theta = (i / nodeList.length) * Math.PI * 2 + 0.1 * i
    const phi = Math.acos(2 * ((i + 0.5) / nodeList.length) - 1)
    const radius = 60 + (i % 5) * 12
    return {
      id: n.id,
      cat: n.cat,
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
      vx: 0,
      vy: 0,
      vz: 0,
    }
  })

  const ITERATIONS = 100
  const DAMPING = 0.85
  const CENTERING = 0.015
  const MAX_DIST = 180

  // 关系类型力参数
  const FORCE_MAP: Record<string, { attraction: number; zAlign: number; xRepel: number }> = {
    related: { attraction: 0.003, zAlign: 0, xRepel: 0 },
    causal: { attraction: 0.008, zAlign: 0, xRepel: 0 },
    belongs: { attraction: 0.002, zAlign: 0.015, xRepel: 0 },
    contrast: { attraction: 0, zAlign: 0, xRepel: 0.012 },
  }

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const cooling = 1 - iter / ITERATIONS

    // 节点间普通斥力
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i]
        const b = simNodes[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dz = b.z - a.z
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 6) dist = 6

        const repForce = 400 / (dist * dist)
        const fx = (dx / dist) * repForce
        const fy = (dy / dist) * repForce
        const fz = (dz / dist) * repForce

        a.vx -= fx; a.vy -= fy; a.vz -= fz
        b.vx += fx; b.vy += fy; b.vz += fz
      }
    }

    // 关系连线施加的力
    for (const rel of props.relations) {
      const a = simNodes.find(n => n.id === rel.sourceId)
      const b = simNodes.find(n => n.id === rel.targetId)
      if (!a || !b) continue

      const forceCfg = FORCE_MAP[rel.type] ?? FORCE_MAP.related

      const dx = b.x - a.x
      const dy = b.y - a.y
      const dz = b.z - a.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1

      // 引力 (related 弱, causal 强)
      if (forceCfg.attraction > 0) {
        const attr = forceCfg.attraction * dist * cooling
        a.vx += (dx / dist) * attr
        a.vy += (dy / dist) * attr
        a.vz += (dz / dist) * attr
        b.vx -= (dx / dist) * attr
        b.vy -= (dy / dist) * attr
        b.vz -= (dz / dist) * attr
      }

      // 垂直对齐 (belongs)
      if (forceCfg.zAlign > 0) {
        const zf = forceCfg.zAlign * dz * cooling
        a.vz += zf
        b.vz -= zf
      }

      // 同轴对立 (contrast)
      if (forceCfg.xRepel > 0) {
        const xf = forceCfg.xRepel * Math.sign(dx) * cooling
        a.vx -= xf * 10
        b.vx += xf * 10
      }
    }

    // 应用力 + 阻尼 + 向心
    for (const n of simNodes) {
      n.vx *= DAMPING
      n.vy *= DAMPING
      n.vz *= DAMPING
      n.x += n.vx
      n.y += n.vy
      n.z += n.vz
      n.x += -n.x * CENTERING * cooling
      n.y += -n.y * CENTERING * cooling
      n.z += -n.z * CENTERING * cooling
      // 钳位
      const d = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
      if (d > MAX_DIST) {
        const scale = MAX_DIST / d
        n.x *= scale
        n.y *= scale
        n.z *= scale
      }
    }
  }

  // 计算 z 深度相关的透明度和缩放
  const zValues = simNodes.map(n => n.z)
  const zMin = Math.min(...zValues)
  const zMax = Math.max(...zValues)
  const zRange = Math.max(zMax - zMin, 1)

  return simNodes.map(n => {
    const zNorm = (n.z - zMin) / zRange
    const zOp = 0.4 + zNorm * 0.6
    const zSc = 0.6 + zNorm * 0.4
    return {
      id: n.id,
      title: nodeList.find(kn => kn.id === n.id)?.title ?? '',
      cat: nodeList.find(kn => kn.id === n.id)?.cat ?? 'concept',
      desc: nodeList.find(kn => kn.id === n.id)?.desc ?? '',
      px: n.x,
      py: n.y,
      pz: n.z,
      zOp,
      zSc,
    }
  })
})

/**
 * 节点位置映射表 (2D 投影，供 SVG 连线使用)
 */
const nodePosMap = computed<Record<string, { x: number; y: number }>>(() => {
  const map: Record<string, { x: number; y: number }> = {}
  for (const n of positionedNodes.value) {
    map[n.id] = { x: n.px, y: n.py }
  }
  return map
})

// ============================================================
// 旋转交互
// ============================================================

const rotX = ref(15)
const rotY = ref(0)
const isDragging = ref(false)
const dragStart = { x: 0, y: 0 }
const dragRot = { x: 0, y: 0 }

const sceneStyle = computed(() => ({
  transform: `rotateX(${rotX.value}deg) rotateY(${rotY.value}deg)`,
  transition: isDragging.value
    ? 'none'
    : 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
}))

// ---- 自动旋转 ----

let autoRotateTimer: ReturnType<typeof requestAnimationFrame> | null = null

function startAutoRotate(): void {
  stopAutoRotate()
  const step = (): void => {
    if (!isDragging.value) {
      rotY.value += 0.12
    }
    autoRotateTimer = requestAnimationFrame(step)
  }
  autoRotateTimer = requestAnimationFrame(step)
}

function stopAutoRotate(): void {
  if (autoRotateTimer !== null) {
    cancelAnimationFrame(autoRotateTimer)
    autoRotateTimer = null
  }
}

onMounted(() => {
  startAutoRotate()
})

onUnmounted(() => {
  stopAutoRotate()
})

// ---- 指针事件 ----

function onPointerDown(e: PointerEvent): void {
  isDragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  dragRot.x = rotX.value
  dragRot.y = rotY.value
}

function onPointerMove(e: PointerEvent): void {
  if (!isDragging.value) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  rotY.value = dragRot.y + dx * 0.5
  rotX.value = Math.max(-60, Math.min(60, dragRot.x - dy * 0.5))
}

function onPointerUp(): void {
  isDragging.value = false
}

// ============================================================
// 节点点击
// ============================================================

function handleNodeClick(nodeId: string): void {
  emit('selectNode', nodeId)
}
</script>

<style scoped>
/* ============================================================
   深夜食堂 · 暖琥珀
   3D 漂浮知识星图
   ============================================================ */

.sm3d-wrap {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}

/* ---- 3D 场景容器 ---- */
.sm3d-scene {
  width: 360px;
  height: 360px;
  position: relative;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  perspective: 800px;
  perspective-origin: 50% 50%;
}

.sm3d-scene:active {
  cursor: grabbing;
}

.sm3d-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---- SVG 连线 ---- */
.sm3d-links {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: translateZ(0);
  pointer-events: none;
}

.sm3d-link {
  transition: opacity 0.3s ease;
}

.sm3d-link:hover {
  opacity: 0.5 !important;
}

/* ---- 3D 节点 ---- */
.sm3d-node {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 32px;
  height: 32px;
  margin-left: -16px;
  margin-top: -16px;
  cursor: pointer;
  transform-style: preserve-3d;
  opacity: var(--node-opacity, 0.8);
  transition: opacity 0.3s ease;
}

.sm3d-node:hover {
  opacity: 1 !important;
}

.sm3d-node:hover .sm3d-node-label {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.sm3d-node-core {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: var(--node-color, #d4a574);
  box-shadow: 0 0 8px var(--node-color, #d4a574);
  transform: scale(var(--node-scale, 1));
  transition: transform 0.2s ease;
}

.sm3d-node:hover .sm3d-node-core {
  transform: scale(1.3);
}

.sm3d-node-ring {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  border: 1.5px solid var(--node-color, #d4a574);
  opacity: 0.3;
  transform: scale(var(--node-scale, 1));
}

.sm3d-node-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  font-size: 9px;
  color: rgba(var(--text-primary-rgb), 0.6);
  white-space: nowrap;
  opacity: 0;
  transition: all 0.25s ease;
  pointer-events: none;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  font-family: var(--font-heading-en);
}

/* ---- 中心光晕 ---- */
.sm3d-center-glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 120px;
  margin-left: -60px;
  margin-top: -60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.03) 0%, transparent 70%);
  pointer-events: none;
  transform: translateZ(-60px);
}

/* ---- 入场动画 ---- */
.view-entrance > [data-enter] {
  opacity: 0;
  transform: translateY(16px) scale(0.95);
  transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.view-entrance.enter-to > [data-enter] {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>