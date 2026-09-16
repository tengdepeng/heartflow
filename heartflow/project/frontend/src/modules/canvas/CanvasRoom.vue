<template>
  <div
    ref="containerRef"
    class="canvas-room"
      :class="[
        `canvas-room--${renderMode}`,
        { 'canvas-room--grid': state.layoutMode === 'grid' },
        { 'is-rearranging': rearranging },
      ]"
    :style="canvasRoomRootStyle"
  >
    <!-- 世界壳背景层 — 宅院/星辰/海天等场景策略绘制（里程碑B）。
         Teleport 到 body + fixed 全屏 + z:3，确保真机下浮在 main-content(z:1) 之上可见。
         原 canvas-room 容器有 transform: scale() 创建 stacking context，
         壳 canvas 留在容器内会被 DOM 后续的 main-content 压住，用户完全看不到院子。
         2D 壳（宅院剪影/星辰）依赖此 canvas 的 2D ctx 绘制，Teleport 后 ref 仍有效。 -->
    <Teleport to="body">
      <canvas
        ref="shellCanvasRef"
        class="shell-layer"
      />
    </Teleport>

    <!-- 空间递进命中层（底层氛围壳）：底壳已不渲染（hitLayerEnabled 恒为 false），此层不再启用；
         空间递进导航改由中层 SurfaceStage 的 .shell-hit-layer 承担（hall-3d / map-2d 态）。 -->
    <Teleport to="body">
      <div
        v-if="hitLayerEnabled"
        ref="hitLayerRef"
        class="shell-hit-layer"
        @click="onShellHit"
        @pointermove="onShellHover"
        @pointerleave="onShellHoverLeave"
      />
    </Teleport>

    <!-- 2D/3D 形态切换入口：已移至悬浮液态栏「右下浮岛」的 2D/3D 按键（FloatingNavBar），此处不再渲染 -->

    <!-- 粒子背景 — 整合自 CanvasParticles（宅院壳激活时降级为关闭，介质呼吸由壳描边承担） -->
    <canvas
      v-if="particlesEnabled"
      ref="particleCanvasRef"
      class="particle-layer"
      :style="{ opacity: particleOpacity }"
    />

    <!-- 玉珠载体 — 仅在 full 模式显示 -->
    <template v-if="renderMode === 'full'">
        <!-- 结晶计数 -->
        <div class="crystal-count">
          {{ canvasCrystals.length }} 颗结晶
        </div>

        <!-- 空状态（仅全强度下展示引导；环境级画布作为房间氛围背景，不遮挡内容页） -->
      <div v-if="canvasCrystals.length === 0 && props.intensity >= 0.5" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <polygon points="24,4 44,24 24,44 4,24" />
        </svg>
        <p>尚未收集到任何结晶</p>
        <p class="empty-hint">完成专注后，结晶将在此显现</p>
        <p v-if="state.layoutMode === 'grid'" class="empty-hint layout-hint">网格模式已切换 — 暂无结晶可排列</p>
      </div>
    </template>

    <!-- 结晶列表 — 两种模式均保留，但 ambient 降低透明度 -->
    <div
      v-for="cc in canvasCrystals"
      :key="cc.crystal.id"
      class="crystal-node"
      :class="{
        'crystal-node--selected': state.selectedCrystalId === cc.crystal.id,
        'crystal-node--ambient': renderMode === 'ambient' || intensity < 0.5,
      }"
      :style="crystalNodeStyle(cc, renderMode)"
      @click="interactionEnabled && selectCrystal(cc.crystal.id)"
    >
      <div class="crystal-float">
      <svg viewBox="0 0 48 48" class="crystal-shape" :class="`crystal-style-${crystalStyle}`">
        <defs>
          <radialGradient v-if="crystalStyle !== 'glass'" :id="gradId(cc)" cx="38%" cy="30%" r="82%">
            <stop offset="0%" :stop-color="shadeColor(cc.crystal.color, 0.5)" />
            <stop offset="52%" :stop-color="cc.crystal.color" />
            <stop offset="100%" :stop-color="shadeColor(cc.crystal.color, -0.38)" />
          </radialGradient>
          <linearGradient v-if="crystalStyle !== 'glass'" :id="sheenId(cc)" x1="18%" y1="8%" x2="92%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" />
            <stop offset="42%" stop-color="#ffffff" stop-opacity="0.08" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </linearGradient>
          <radialGradient v-if="crystalStyle === 'glass'" :id="glassId(cc)" cx="38%" cy="30%" r="78%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
            <stop offset="46%" :stop-color="shadeColor(cc.crystal.color, 0.28)" />
            <stop offset="100%" :stop-color="shadeColor(cc.crystal.color, -0.32)" />
          </radialGradient>
          <linearGradient v-if="crystalStyle === 'prism'" :id="prismId(cc)" x1="6%" y1="4%" x2="94%" y2="96%">
            <stop offset="0%" stop-color="#79f6c8" />
            <stop offset="48%" stop-color="#6ab8ff" />
            <stop offset="100%" stop-color="#e79bff" />
          </linearGradient>
        </defs>

        <!-- 玻璃光球 + 辉光 -->
        <g v-if="crystalStyle === 'glass'">
          <circle cx="24" cy="24" r="16" :fill="`url(#${glassId(cc)})`" :opacity="strong ? 0.98 : 0.5" />
          <circle cx="24" cy="24" r="16" fill="none" :stroke="shadeColor(cc.crystal.color, 0.35)" stroke-width="0.9" :opacity="strong ? 0.7 : 0.4" />
          <circle cx="19" cy="19" r="3.2" fill="#ffffff" :fill-opacity="strong ? 0.9 : 0.5" />
        </g>

        <!-- 极简线晶（仅描边） -->
        <g v-else-if="crystalStyle === 'line'">
          <polygon :points="shapePoints(cc.crystal.shape)" fill="none" :stroke="cc.crystal.color" :stroke-width="strong ? 1.5 : 0.9" :opacity="strong ? 0.95 : 0.5" stroke-linejoin="round" />
          <polygon :points="shapePoints(cc.crystal.shape)" fill="none" :stroke="shadeColor(cc.crystal.color, 0.45)" :stroke-width="0.5" :opacity="strong ? 0.5 : 0.3" stroke-linejoin="round" />
        </g>

        <!-- 极光棱镜 -->
        <g v-else-if="crystalStyle === 'prism'">
          <polygon :points="shapePoints(cc.crystal.shape)" :fill="`url(#${prismId(cc)})`" :opacity="strong ? 0.94 : 0.5" />
          <polygon :points="shapePoints(cc.crystal.shape)" :fill="`url(#${sheenId(cc)})`" :opacity="strong ? 0.85 : 0.4" />
          <circle :cx="topVertex(cc.crystal.shape).x" :cy="topVertex(cc.crystal.shape).y" r="1.7" fill="#ffffff" :fill-opacity="strong ? 0.9 : 0.45" />
        </g>

        <!-- 真实切面宝石（默认） -->
        <g v-else>
          <polygon :points="shapePoints(cc.crystal.shape)" :fill="`url(#${gradId(cc)})`" :stroke="shadeColor(cc.crystal.color, 0.32)" :stroke-width="strong ? 1.3 : 0.7" :opacity="strong ? 0.97 : 0.42" />
          <polygon :points="shapePoints(cc.crystal.shape)" :fill="`url(#${sheenId(cc)})`" :opacity="strong ? 0.9 : 0.38" />
          <circle :cx="topVertex(cc.crystal.shape).x" :cy="topVertex(cc.crystal.shape).y" r="1.7" fill="#ffffff" :fill-opacity="strong ? 0.85 : 0.4" />
        </g>
      </svg>
      </div>
    </div>

    <!-- 结晶详情弹窗 — 仅在 full 模式显示 -->
    <CrystalDetail
      v-if="renderMode === 'full'"
      :crystal="selectedCrystal"
      :session="selectedSession"
      @close="selectCrystal(null)"
    />

    <!-- ============================================================ -->
    <!-- 新组件集成 — 基于 intensity 的渲染控制                       -->
    <!-- ============================================================ -->

    <!-- 玉珠载体 — intensity > 0.3 时始终可见 -->
    <CanvasCarrier v-if="intensity > 0.3" />

    <!-- 结晶着陆动画 — 专注完成时触发 -->
    <CrystalLanding
      v-if="showCrystalLanding"
      :crystal-color="landingCrystalColor"
      :crystal-shape="landingCrystalShape"
      :intensity="landingIntensity"
      :landing-x="landingX"
      :landing-y="landingY"
      @animation-done="onCrystalLandingDone"
    />

    <!-- 浮动便签层（INCR-302 补挂载孤儿组件 CanvasNotes：App.vue 注释「浮动便签本身由
         CanvasRoom 内的 CanvasNotes 渲染」为设计宿主，实现遗漏；emit('edit') 由
         NoteLayer 全局编辑器承接；ambient 模式降透明度不参与交互；
         环境级强度（非首页/安全岛路由）同样视作 ambient，避免空态提示遮挡内容页） -->
    <CanvasNotes :ambient="renderMode === 'ambient' || props.intensity < 0.5" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCanvasRoom } from './index'
import type { CrystalShape } from '../../types'
import type { CanvasCrystal } from './types'
import CrystalDetail from '../../components/CrystalDetail.vue'
import CanvasCarrier from './components/CanvasCarrier.vue'
import CrystalLanding from './components/CrystalLanding.vue'
import CanvasNotes from '../../components/CanvasNotes.vue'
import { useCanvasBreathing } from './composables/useCanvasBreathing'
import { useRuntimeState } from '../../resonance/bridges/runtime'
import { useTimer } from '../../resonance/bridges/timer'
import { getEffectMultiplier } from '../../engine/constitution-effect'
import { useAdaptiveQuality } from '../../modules/adaptive'
import { useConfigStore } from '../../stores/config'
import { useAppearance } from '../../modules/customization/useAppearance'
import { createShell } from '../../modules/world-shell'
import { getRoomsBySlot } from '../../engine/room-graph'
import { setScreenRect, resetScreenRect } from '../../modules/world-shell/screenContract'

const props = withDefaults(defineProps<{
  renderMode?: 'full' | 'ambient'
  intensity?: number
}>(), {
  renderMode: 'full',
  intensity: 1,
})

const {
  state,
  canvasCrystals,
  selectedCrystal,
  selectedSession,
  rearranging,
  setCanvasSize,
  selectCrystal,
} = useCanvasRoom()

const router = useRouter()

// ---- 结晶渲染风格（宪法第二条超级自定义 · facet/glass/line/prism，设置可切换） ----
const { crystalStyle } = useAppearance()
const strong = computed(() => props.renderMode === 'full' && props.intensity >= 0.5)

// ---- 世界壳（里程碑B）----
const configStore = useConfigStore()
const activeShell = computed(() => configStore.config.worldShell.activeShell)
const starsMode = computed(() => configStore.config.worldShell.shellConfig.starsMode ?? '2d')
const courtyardMode = computed(
  () => configStore.config.worldShell.shellConfig.courtyardMode ?? '2d',
)
// 中层交互面状态（整屏互斥）：hall-3d / map-2d 由中层 SurfaceStage 整屏接管世界；
// screen（屏风功能面 = 全隐藏）中层与底层氛围壳一并收起，仅留内容与画布粒子。
const surfaceState = computed(() => configStore.config.worldShell.surfaceState ?? 'screen')

// 各壳的 2D / 3D 形态统一为一个「有效壳种类」：
// activeShell==='stars'    且 starsMode==='3d'    → 'stars-3d'
// activeShell==='courtyard' 且 courtyardMode==='3d' → 'courtyard-3d'
// 2D 壳一字不改，切换只改 mode 落盘字段，互不影响。
const effectiveShell = computed(() => {
  if (activeShell.value === 'stars' && starsMode.value === '3d') return 'stars-3d'
  if (activeShell.value === 'courtyard' && courtyardMode.value === '3d') return 'courtyard-3d'
  return activeShell.value
})

// 粒子降级：仅星辰壳启用粒子（介质呼吸）；宅院由壳描边承担，纯色/视频/自定义为克制底，均关闭
const particlesEnabled = computed(() => activeShell.value === 'stars')

const shellCanvasRef = ref<HTMLCanvasElement | null>(null)
const hitLayerRef = ref<HTMLElement | null>(null)
let shellInstance: ReturnType<typeof createShell> = null
let shellRafId = 0

// 空间递进命中层（底层氛围壳）：底层氛围壳已不渲染（screen 收起 / 中层 SurfaceStage 接管），
// 故此层不再启用，避免以 pointer-events:auto + z:5 在全隐藏态遮挡内容点击（shellInstance 为 null 时点击无导航收益）。
// 空间递进导航改由中层 SurfaceStage 的 .shell-hit-layer 承担（hall-3d / map-2d 态）。
const hitLayerEnabled = computed(() => false)

// 命中层激活（home 引力场 + 全模式 + 宅院/星辰壳）时，整层画布容器抬到命中层(z:5)之上：
//  - z-index:6 使结晶节点（容器内 z:2，交互态 pointer-events:auto）真实可点，不再被全屏命中层吞掉；
//  - 容器 pointer-events:none，使空白处点击穿透到命中层继续做「点墨点/建筑进房间」空间递进导航。
// 非 home（命中层关闭）保持原逻辑：full→auto / ambient→none，z-index 回落到 App.vue 的 :deep 0
// （低于 main-content z:1），结晶作为极淡背景衬于内容之下，不干扰房间内交互。
const canvasRoomRootStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    pointerEvents: props.renderMode === 'full' ? 'auto' : 'none',
  }
  if (hitLayerEnabled.value) {
    style.pointerEvents = 'none'
    style.zIndex = '6'
  }
  return style
})

/** 将命中层指针事件坐标换算为 canvas 逻辑坐标（CSS 像素 = 逻辑像素，DPR 已内部处理） */
function toLogicalCoords(e: MouseEvent | PointerEvent): { x: number; y: number } {
  const el = hitLayerRef.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

/** 点击命中层 → 命中检测 → 跳转房间路由（空间递进：点墨点进该房间，点 zone 空白进 slot 默认房间） */
function onShellHit(e: MouseEvent) {
  if (!shellInstance) return
  const hitTest = shellInstance.hitTest
  if (!hitTest) return // 星辰/stars 等未实现点击进入
  const { x, y } = toLogicalCoords(e)
  const hit = hitTest.call(shellInstance, x, y)
  if (!hit) return
  if (hit.roomPath) {
    router.push(hit.roomPath)
    return
  }
  // 命中 zone 空白：进该 slot 下第一个房间的 path（合理默认）
  const rooms = getRoomsBySlot(hit.slot)
  if (rooms.length > 0 && rooms[0].path) {
    router.push(rooms[0].path)
  }
}

/** 悬停命中层 → 设 hover 高亮（描金加亮 / 墨点放大） */
function onShellHover(e: PointerEvent) {
  if (!shellInstance) return
  const setHover = shellInstance.setHover
  if (!setHover || !shellInstance.hitTest) return
  const { x, y } = toLogicalCoords(e)
  const hit = shellInstance.hitTest.call(shellInstance, x, y)
  setHover.call(shellInstance, hit ? hit.slot : null, hit?.roomId ?? null)
}

function onShellHoverLeave() {
  if (!shellInstance) return
  shellInstance.setHover?.call(shellInstance, null, null)
}

// 2D ↔ 3D 形态切换：移除 V 键与本地切换函数，改由悬浮液态栏「右下浮岛」的 2D/3D 按键统一触发
// （FloatingNavBar 内写回 config.worldShell.shellConfig 落盘）。仅星辰/宅院壳有 2D/3D 概念，
// 纯色/视频/自定义壳无此概念，按钮自动隐藏。

// 注：画布控制簇（透明度循环 + 布局切换）已移至 App.vue 全局浮层，
// 以脱离本背景画布层（z-index:0）的层叠上下文，避免被 main-content(z-index:1) 截获点击。

const containerRef = ref<HTMLElement | null>(null)
const particleCanvasRef = ref<HTMLCanvasElement | null>(null)

// ---- 呼吸效果 ----
const { isSanctuaryActive } = useRuntimeState()
const { particleSpeed } = useCanvasBreathing(
  computed(() => props.intensity),
  isSanctuaryActive,
  containerRef
)

// ---- 运行时状态 ----
const timer = useTimer()

// 性能自适应：低端设备降低粒子密度（M2）
const quality = useAdaptiveQuality()

// ---- 基于 intensity 的计算属性 ----
const canvasOpacity = computed(() => {
  if (props.intensity < 0.3) return 0.15
  if (props.intensity < 0.5) return 0.4 + props.intensity * 0.6
  return 1
})

// 粒子整体透明度 = 路由强度透明度 × 全局画布透明度（--canvas-alpha，0–1，设置页可调）
const particleOpacity = computed(() => `calc(${canvasOpacity.value} * var(--canvas-alpha, 1))`)

const interactionEnabled = computed(() => {
  return props.intensity >= 0.5 && props.renderMode === 'full'
})

// 宪法软效果：ui:particle-density（reduce 值作为密度倍率，默认 1）。
// 例如 elastic-inner-peace 设为 0.4 → 粒子数降至 40%。
// 再乘以性能自适应档（低端设备 particleScale<1 进一步降密度）。
const particleDensityFactor = computed(
  () => getEffectMultiplier('ui:particle-density') * quality.profile.value.particleScale,
)

const effectiveParticleCount = computed(() => {
  const base = props.renderMode === 'full' ? 90 : 20
  const scaledBase = Math.max(1, Math.floor(base * particleDensityFactor.value))
  if (props.intensity < 0.3) return Math.max(5, Math.floor(scaledBase * 0.15))
  if (props.intensity < 0.5) return Math.floor(scaledBase * (0.3 + props.intensity * 0.7))
  return scaledBase
})

// ---- 结晶着陆动画状态 ----
const showCrystalLanding = ref(false)
const landingX = ref(50)
const landingY = ref(30)
const landingCrystalColor = ref('#d4a574')
const landingCrystalShape = ref<CrystalShape>('dodecahedron')
const landingIntensity = ref(0.7)

// 检测专注完成，触发结晶着陆动画
watch(() => timer.isCompleted, (completed) => {
  if (completed && props.intensity > 0.5) {
    showCrystalLanding.value = true
    landingX.value = 30 + Math.random() * 40
    landingY.value = 20 + Math.random() * 40
    landingCrystalColor.value = '#d4a574'
    const shapes: CrystalShape[] = ['sphere', 'dodecahedron', 'octahedron', 'tetrahedron', 'irregular']
    landingCrystalShape.value = shapes[Math.floor(Math.random() * shapes.length)]
    landingIntensity.value = 0.5 + Math.random() * 0.4
  }
})

function onCrystalLandingDone() {
  showCrystalLanding.value = false
}

/** 计算结晶样式 */
function crystalNodeStyle(cc: { x: number; y: number; scale: number; opacity: number; floatPhase: number }, mode: 'full' | 'ambient') {
  // 静态定位只设一次（left/top 为布局属性，禁止每帧写，否则触发持续 reflow；
  // 浮动改走内层 .crystal-float 的 --float-y，transform 合成零布局）
  return {
    left: `${cc.x}px`,
    top: `${cc.y}px`,
    '--crystal-scale': mode === 'full' ? cc.scale : cc.scale * 0.6,
    opacity: mode === 'full' ? cc.opacity * props.intensity : cc.opacity * 0.4 * props.intensity,
    pointerEvents: (interactionEnabled.value ? 'auto' : 'none') as 'auto' | 'none',
  }
}

/** 结晶 SVG 多边形顶点 */
function shapePoints(shape: CrystalShape): string {
  const map: Record<CrystalShape, string> = {
    sphere: '24,6 40,18 36,38 12,38 8,18',
    tetrahedron: '24,4 44,36 4,36',
    octahedron: '24,4 44,24 24,44 4,24',
    dodecahedron: '24,2 42,14 38,36 10,36 6,14',
    irregular: '24,4 38,12 44,28 32,44 16,40 6,28 8,12',
  }
  return map[shape] ?? '24,4 44,24 24,44 4,24'
}

/** 每颗结晶的径向渐变唯一 id（宝石本体明暗） */
function gradId(cc: CanvasCrystal): string {
  return `crystal-grad-${cc.crystal.id}`
}

/** 每颗结晶的玻璃光泽渐变唯一 id（高光层） */
function sheenId(cc: CanvasCrystal): string {
  return `crystal-sheen-${cc.crystal.id}`
}

/** 每颗结晶的玻璃光球渐变唯一 id（glass 风格） */
function glassId(cc: CanvasCrystal): string {
  return `crystal-glass-${cc.crystal.id}`
}

/** 每颗结晶的极光棱镜渐变唯一 id（prism 风格） */
function prismId(cc: CanvasCrystal): string {
  return `crystal-prism-${cc.crystal.id}`
}

/**
 * 颜色明暗调整：amt ∈ [-1,1]
 *  - amt > 0 → 朝白色提亮（高光/亮部）
 *  - amt < 0 → 朝黑色压暗（暗部/描边）
 * 非 #rrggbb 输入原样返回，避免误伤主题色。
 */
function shadeColor(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const num = parseInt(m[1], 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  const target = amt < 0 ? 0 : 255
  const p = Math.min(1, Math.abs(amt))
  r = Math.round((target - r) * p) + r
  g = Math.round((target - g) * p) + g
  b = Math.round((target - b) * p) + b
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/** 取形状最高顶点（最小 y），用于顶部星火定位 */
function topVertex(shape: CrystalShape): { x: number; y: number } {
  const pts = shapePoints(shape)
    .trim()
    .split(/\s+/)
    .map((p) => {
      const [x, y] = p.split(',').map(Number)
      return { x, y }
    })
  return pts.reduce((min, p) => (p.y < min.y ? p : min), pts[0])
}

// ---- 尺寸更新 ----
function updateSize() {
  if (containerRef.value) {
    const w = containerRef.value.clientWidth
    const h = containerRef.value.clientHeight
    setCanvasSize(w, h)
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateSize()
  resizeObserver = new ResizeObserver(updateSize)
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// ============================================================
// 粒子系统 — 整合自 CanvasParticles
// ============================================================

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  alphaSpeed: number
  hue: number
}

const THEME_COLORS: Record<string, { hue: number; sat: number; light: number }> = {
  default: { hue: 250, sat: 70, light: 60 },
  aurora:  { hue: 180, sat: 80, light: 65 },
  ice:     { hue: 210, sat: 50, light: 75 },
  warm:    { hue: 30,  sat: 50, light: 55 },
}

let particles: Particle[] = []
let particleAnimId = 0
let mouseX = -9999
let mouseY = -9999

function initParticles(w: number, h: number, count: number): Particle[] {
  const theme = THEME_COLORS['default']
  const speed = particleSpeed.value
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * speed,
    vy: (Math.random() - 0.5) * speed,
    size: 1.5 + Math.random() * 3,
    alpha: 0.2 + Math.random() * 0.5,
    alphaSpeed: 0.002 + Math.random() * 0.008,
    hue: theme.hue + (Math.random() - 0.5) * 30,
  }))
}

function drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, isAmbient: boolean) {
  ctx.clearRect(0, 0, w, h)
  const theme = THEME_COLORS['default']
  const connectionDist = isAmbient ? 0 : 80
  const mouseDist = isAmbient ? 0 : 150
  const intensityFactor = props.intensity
  // 性能自适应（M2）：低端设备关闭非必要辉光连线 + 呼吸动画，并整体缩放特效强度
  const q = quality.profile.value

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]

    // Move
    p.x += p.vx
    p.y += p.vy

    // Wrap
    if (p.x < 0) p.x = w
    if (p.x > w) p.x = 0
    if (p.y < 0) p.y = h
    if (p.y > h) p.y = 0

    // Breath alpha — 性能自适应：低端设备关闭非必要呼吸动画（M2）
    if (q.animationEnabled) {
      p.alpha += p.alphaSpeed
      if (p.alpha > 0.7 || p.alpha < 0.15) p.alphaSpeed *= -1
    }

    // Draw particle — intensity 影响透明度
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${p.hue}, ${theme.sat}%, ${theme.light}%, ${(isAmbient ? p.alpha * 0.3 : p.alpha) * intensityFactor})`
    ctx.fill()

    // Mouse connection — 仅当 interactionEnabled；性能自适应门控（M2）
    if (q.animationEnabled && mouseDist > 0 && props.intensity >= 0.5) {
      const dx = p.x - mouseX
      const dy = p.y - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < mouseDist) {
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(mouseX, mouseY)
        ctx.strokeStyle = `hsla(${theme.hue}, ${theme.sat}%, ${theme.light}%, ${(1 - dist / mouseDist) * 0.3 * intensityFactor * q.effectScale})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }

  }

  // Inter-particle connection — 空间哈希（格子）+ 3x3 邻域扫描，将 O(n²) 距离检查降为近邻查询。
  // 性能自适应：仅当 animationEnabled 启用辉光，且整体强度乘以 effectScale（M2）。
  if (q.animationEnabled && connectionDist > 0 && props.intensity >= 0.5) {
    const CELL = 100
    const cols = Math.ceil(w / CELL)
    const buckets = new Map<number, number[]>()
    for (let gi = 0; gi < particles.length; gi++) {
      const gp = particles[gi]
      const key = Math.floor(gp.y / CELL) * cols + Math.floor(gp.x / CELL)
      const b = buckets.get(key)
      if (b) b.push(gi)
      else buckets.set(key, [gi])
    }
    const drawn = new Map<number, boolean>()
    for (let ci = 0; ci < particles.length; ci++) {
      const cp = particles[ci]
      const cx = Math.floor(cp.x / CELL)
      const cy = Math.floor(cp.y / CELL)
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          const bucket = buckets.get(gy * cols + gx)
          if (!bucket) continue
          for (let k = 0; k < bucket.length; k++) {
            const j = bucket[k]
            if (j === ci) continue
            const a = Math.min(ci, j)
            const pk = a * 10000 + Math.max(ci, j)
            if (drawn.has(pk)) continue
            const p2 = particles[j]
            const dx2 = cp.x - p2.x
            const dy2 = cp.y - p2.y
            if (dx2 > connectionDist || dx2 < -connectionDist || dy2 > connectionDist || dy2 < -connectionDist) continue
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
            if (dist2 < connectionDist) {
              ctx.beginPath()
              ctx.moveTo(cp.x, cp.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.strokeStyle = `hsla(${theme.hue}, ${theme.sat}%, ${theme.light}%, ${(1 - dist2 / connectionDist) * 0.12 * intensityFactor * q.effectScale})`
              ctx.lineWidth = 0.3
              ctx.stroke()
              drawn.set(pk, true)
            }
          }
        }
      }
    }
  }
}

let lastParticleFrame = 0

function particleLoop(timestamp: number) {
  const canvas = particleCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const isAmbient = props.renderMode === 'ambient' || props.intensity < 0.5

  // intensity 越低，帧率越低（节省性能）
  const frameInterval = isAmbient ? 83 : Math.max(16, Math.floor(83 - (83 - 16) * props.intensity))
  if (timestamp - lastParticleFrame < frameInterval) {
    particleAnimId = requestAnimationFrame(particleLoop)
    return
  }
  lastParticleFrame = timestamp

  const w = canvas.width
  const h = canvas.height
  drawParticles(ctx, w, h, isAmbient)
  particleAnimId = requestAnimationFrame(particleLoop)
}

function initParticleCanvas() {
  const canvas = particleCanvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  canvas.width = parent.clientWidth
  canvas.height = parent.clientHeight
  const w = canvas.width
  const h = canvas.height
  particles = initParticles(w, h, effectiveParticleCount.value)
}

function onMouseMove(e: MouseEvent) {
  if (!interactionEnabled.value) return
  const canvas = particleCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top
}

function onMouseLeave() {
  mouseX = -9999
  mouseY = -9999
}

function onParticleResize() {
  initParticleCanvas()
}

// ============================================================
// 世界壳渲染 — 里程碑B
// ============================================================

function disposeShell() {
  if (shellRafId) {
    cancelAnimationFrame(shellRafId)
    shellRafId = 0
  }
  shellInstance?.destroy()
  shellInstance = null
}

function initShell() {
  // 三层架构：底层氛围壳（世界壳背景 stars/courtyard）随「全隐藏(screen)」需求收敛——
  //   · screen 态：中层 SurfaceStage 交互面收起，底层氛围壳也一并收起（壳收起，仅留内容与画布粒子）；
  //   · hall-3d / map-2d：由中层 SurfaceStage 整屏接管（courtyard-3d / courtyard 2D 世界壳独立渲染），
  //     底层氛围壳退出绘制，避免与中层世界壳双层叠加。
  // 故底层氛围壳在三种态下均不渲染，仅作透明退场；空间递进导航交由中层 SurfaceStage 命中层。
  disposeShell()
  const canvas = shellCanvasRef.value
  if (canvas) canvas.style.display = 'none'
  // 不布局世界壳背景：重置屏风契约，门厅覆盖层（计时器+玉珠）回落视口中心兜底（与 stars 无屏位同路）
  resetScreenRect()
}

function onShellResize() {
  initShell()
}

// 壳实例重建后同步最新屏风矩形到契约（initShell 已写入，这里兜底尺寸变化）
function syncScreenRect() {
  if (!shellInstance) return
  const getScreenRect = shellInstance.getScreenRect
  if (getScreenRect) {
    setScreenRect(getScreenRect.call(shellInstance), activeShell.value)
  }
}
watch([() => props.intensity, isSanctuaryActive], () => {
  syncScreenRect()
})

// 监听 shell 切换 / 各壳 2D↔3D 形态切换：重建壳实例
watch([activeShell, starsMode, courtyardMode], () => {
  initShell()
})

// 监听中层交互面状态：进入/离开 'screen' 时挂载或卸载底层氛围壳（互不干扰）
watch(surfaceState, () => {
  initShell()
})

// 监听 intensity / 静谧态变化：透传上下文（不重建）
watch([() => props.intensity, isSanctuaryActive], ([intensity, sanctuary]) => {
  shellInstance?.updateContext({
    intensity: intensity as number,
    sanctuary: sanctuary as boolean,
  })
})

// 监听宅院 3D 漫游参数（courtyard3d）变化：实时回写 OrbitControls（宪法「不写死」），无需重建
watch(
  () => configStore.config.worldShell.shellConfig.courtyard3d,
  () => {
    if (effectiveShell.value === 'courtyard-3d') {
      shellInstance?.updateContext({ config: { ...configStore.config.worldShell.shellConfig } })
    }
  },
  { deep: true },
)

// 监听粒子降级开关：宅院激活时粒子关闭，仅壳渲染
watch(particlesEnabled, () => {
  // 粒子 canvas 由 v-if 控制挂载/卸载，nextTick 后尺寸需重算
  if (particlesEnabled.value) {
    requestAnimationFrame(() => initParticleCanvas())
  }
})

// 监听 intensity 变化，重新初始化粒子
watch(() => props.intensity, () => {
  initParticleCanvas()
})

// 监听 renderMode 变化，重新初始化粒子
watch(() => props.renderMode, () => {
  initParticleCanvas()
})

// 页面隐藏时暂停粒子循环，可见时恢复（与 useCanvasBreathing 的 rAF 统一门控）
function onVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(particleAnimId)
    particleAnimId = 0
  } else {
    lastParticleFrame = 0
    particleAnimId = requestAnimationFrame(particleLoop)
  }
}

onMounted(() => {
  initShell()
  initParticleCanvas()
  particleAnimId = requestAnimationFrame(particleLoop)

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('resize', onParticleResize)
  window.addEventListener('resize', onShellResize)
  const canvas = particleCanvasRef.value
  if (canvas) {
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(particleAnimId)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('resize', onParticleResize)
  window.removeEventListener('resize', onShellResize)
  const canvas = particleCanvasRef.value
  if (canvas) {
    canvas.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mouseleave', onMouseLeave)
  }
  disposeShell()
})

// ============================================================
// 结晶浮动动画 — 根据 renderMode 调度
// ============================================================
let floatAnimId = 0
let lastFloatUpdate = 0

function floatLoop(timestamp: number) {
  const interval = props.renderMode === 'full' ? 50 : 100
  if (timestamp - lastFloatUpdate > interval) {
    lastFloatUpdate = timestamp
    if (containerRef.value) {
      const crystals = containerRef.value.querySelectorAll('.crystal-node') as NodeListOf<HTMLElement>
      canvasCrystals.value.forEach((cc, i) => {
        const el = crystals[i]
        if (el) {
          const amplitude = props.renderMode === 'full' ? 6 : 3
          const floatY = Math.sin(timestamp / 2000 + cc.floatPhase) * amplitude
          // 只更新 transform 合成用的 CSS 变量，不触发布局
          el.style.setProperty('--float-y', `${floatY}px`)
        }
      })
    }
  }
  floatAnimId = requestAnimationFrame(floatLoop)
}

onMounted(() => {
  floatAnimId = requestAnimationFrame(floatLoop)
})

onUnmounted(() => {
  cancelAnimationFrame(floatAnimId)
})
</script>

<style scoped>
.canvas-room {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  overflow: hidden;
  border-radius: 16px;
  background: radial-gradient(ellipse at 50% 48%, rgba(255,255,255,0.02) 0%, transparent 70%);
  /* 呼吸效果 CSS 变量（scale() 创建 stacking context，但 3D 切换按钮已 Teleport 出 body
     不再受困于本容器） */
  transform: scale(var(--breathing-scale, 1));
  opacity: var(--breathing-opacity, 1);
  transition: opacity 0.3s ease;
  /* 辉光效果 */
  box-shadow:
    inset 0 0 60px color-mix(in srgb, var(--glow-color, #d4a574) calc(var(--glow-opacity, 0) * 30%), transparent),
    inset 0 0 120px color-mix(in srgb, var(--glow-color, #d4a574) calc(var(--glow-opacity, 0) * 15%), transparent);
}

/* 粒子背景层 — 永远存在 */
.particle-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: var(--z-base, 0);
  transition: opacity 0.5s ease;
}

/* 世界壳背景层 — 宅院/星辰/海天等场景策略绘制（里程碑B）。
   Teleport 到 body 后 fixed 全屏 + z:3（main 之上的安全岛层，
   低于 nav-bar(40)/玉珠(20/24)/悬岛(更高)，高于 main-content(1)/夜静遮罩(60) 不冲突） */
.shell-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 3;
}

/* 空间递进命中层 — 底层氛围壳已不渲染（hitLayerEnabled 恒为 false），此层不再启用；
   空间递进导航改由中层 SurfaceStage 的 .shell-hit-layer 承担（hall-3d / map-2d 态）。
   原设计：Teleport 到 body 后 fixed 全屏 z:5，确保真机点院子/星体进房间。 */
.shell-hit-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: auto;
  z-index: 5;
  cursor: pointer;
}

/* 2D/3D 切换按钮已移除（改由全局 V 键触发），相关样式一并删除 */

/* 环境模式（非 home 路由） */
.canvas-room--ambient {
  min-height: 0;
  border-radius: 0;
  background: transparent;
}

/* 网格布局模式 */
.canvas-room--grid {
  background: radial-gradient(ellipse at 50% 48%, var(--bg-surface) 0%, transparent 70%);
}
.canvas-room--grid .crystal-node {
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.6s ease,
              left 0.8s ease,
              top 0.8s ease;
}
.canvas-room--grid .empty-hint.layout-hint {
  opacity: 0.5;
  font-style: italic;
}

/* 切换布局时的结晶重排脉冲（脉冲触发状态由 App.vue 控制簇经画布 store 共享） */
.canvas-room.is-rearranging .crystal-node {
  animation: crystal-pulse 0.7s ease;
}
@keyframes crystal-pulse {
  0% { transform: translate(-50%, -50%) scale(1); filter: drop-shadow(0 0 6px currentColor); }
  40% { transform: translate(-50%, -50%) scale(1.28); filter: drop-shadow(0 0 16px currentColor); }
  100% { transform: translate(-50%, -50%) scale(1); filter: drop-shadow(0 0 6px currentColor); }
}

/* 结晶计数 */
.crystal-count {
  position: absolute;
  top: 14px;
  left: 16px;
  font-size: 13px;
  opacity: 0.35;
  z-index: 10;
  user-select: none;
}

/* 空状态 */
.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255,255,255,0.3);
  user-select: none;
}
.empty-state p {
  margin: 0;
  font-size: 14px;
}
.empty-hint {
  font-size: 12px;
  opacity: 0.6;
}

/* 结晶节点 */
.crystal-node {
  position: absolute;
  width: 40px;
  height: 40px;
  cursor: pointer;
  z-index: 2;
  /* 居中 + 缩放放外层，保留 0.6s 缓动（入场/模式切换原样）；浮动交由内层 .crystal-float */
  transform: translate(-50%, -50%) scale(var(--crystal-scale, 1));
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease;
  will-change: transform;
}
.crystal-float {
  width: 100%;
  height: 100%;
  /* 每帧浮动走 transform 合成，零布局；无 transition 保持修改前一致的即时浮动观感 */
  transform: translateY(var(--float-y, 0px));
  will-change: transform;
}
.crystal-node:hover {
  filter: brightness(1.3) drop-shadow(0 0 12px currentColor);
  z-index: 5;
}
.crystal-node--selected {
  z-index: 6;
  filter: brightness(1.5) drop-shadow(0 0 20px currentColor);
}
.crystal-node--selected .crystal-shape polygon {
  stroke-width: 2;
}

/* 环境模式下的结晶节点 — 低密度、不可交互 */
.crystal-node--ambient {
  cursor: default;
  pointer-events: none;
}
.crystal-node--ambient:hover {
  filter: none;
  z-index: auto;
}

.crystal-shape {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 0 6px currentColor);
}

/* 结晶风格辉光（宪法第二条超级自定义） */
.crystal-shape.crystal-style-glass {
  filter: drop-shadow(0 0 16px currentColor) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
}
.crystal-shape.crystal-style-prism {
  filter: drop-shadow(0 0 13px #8be0ff);
}
.crystal-shape.crystal-style-line {
  filter: drop-shadow(0 0 5px currentColor);
}
</style>