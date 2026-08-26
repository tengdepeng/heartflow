<template>
  <!-- 液态玻璃浮岛：左功能簇（左下）+ 右返回/添加簇（右下），两枚独立浮岛，不再是一条长 shelf -->
  <div class="floating-nav">
    <!-- 拖拽容器：docked 时透传、不定位；floating 时固定到自由坐标、两岛并排居中 -->
    <div
      class="floating-nav__drag"
      :class="{ 'is-floating': navFloating, 'bar-idle': barIdle }"
      :style="dragStyle"
    >
    <!-- ============ 左浮岛 · 功能类（左下角） ============ -->
    <div class="bar-cluster bar-cluster--left" :class="{ 'no-breath': !barBreathEnabled, 'bar--focus': isFocus }" :style="barStyle">
      <span class="bar-sheen-mask" aria-hidden="true"><span class="bar-sheen"></span></span>
      <!-- 拖拽手柄：拖动=自由摆放；单击=切换 docked/floating -->
      <button class="bar-grip" @pointerdown.stop.prevent="startDrag" title="拖动以自由摆放（单击切换贴边/悬浮）" aria-label="拖动导航栏">⠿</button>

      <!-- 汉堡：开/合侧栏（侧栏含全部房间树） -->
      <button class="bar-btn bar-menu" @click="$emit('toggle-sidebar')" title="空间导航" aria-label="空间导航">
        <span class="bar-menu-line"></span>
        <span class="bar-menu-line"></span>
        <span class="bar-menu-line"></span>
      </button>

      <!-- 当前房间：图标 + 名，点击回引力场 -->
      <button class="bar-room" @click="nav.goHome()" :title="`${currentRoom?.name ?? '心流工坊'} · 返回引力场`">
        <span class="bar-room-icon">{{ currentRoom?.icon ?? '✦' }}</span>
        <span class="bar-room-name">{{ currentRoom?.name ?? '心流工坊' }}</span>
      </button>

      <!-- 主链路前后切换（仅非心流页出现；心流页左岛仅 ≡ + 房间） -->
      <div v-if="!isFocus" class="bar-nav-cluster">
        <button
          class="bar-btn"
          :disabled="!nav.previousOnMainPath.value"
          @click="nav.goPreviousOnMainPath()"
          :title="nav.previousOnMainPath.value ? '← ' + nav.previousOnMainPath.value.name : '已在最前'"
        >‹</button>
        <button
          class="bar-btn"
          :disabled="!nav.nextOnMainPath.value"
          @click="nav.goNextOnMainPath()"
          :title="nav.nextOnMainPath.value ? nav.nextOnMainPath.value.name + ' →' : '已在最后'"
        >›</button>
      </div>

      <!-- 星盘入口（仅非心流页；心流页左岛保持极简 3 键） -->
      <button
        v-if="!isFocus"
        class="bar-btn bar-astro"
        @click="astrolabe.open('bar')"
        title="打开星盘 (Ctrl+K)"
        aria-label="打开星盘"
      >
        <span class="bar-astro-icon">✦</span>
      </button>

      <!-- 画布控制：仅在「首页」或「已有结晶」的语境下出现，避免常驻按键过多 -->
      <div v-if="showCanvasControls" class="bar-canvas-controls">
        <button
          class="bar-btn bar-opacity"
          :title="`画布透明度 ${canvasAlphaValue}%`"
          @click="cycleCanvasAlpha"
        >
          <span class="bar-glyph">{{ opacityGlyph }}</span>
        </button>
        <button
          class="bar-btn bar-layout"
          :class="{ 'is-pending': canvasCrystalsCount <= 1 }"
          :title="canvasLayoutMode === 'gravity' ? '切为网格布局' : '切为引力布局'"
          @click="toggleCanvasLayout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <template v-if="canvasLayoutMode === 'gravity'">
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="10" opacity="0.3" />
              <line x1="12" y1="2" x2="12" y2="7" />
              <line x1="12" y1="17" x2="12" y2="22" />
              <line x1="2" y1="12" x2="7" y2="12" />
              <line x1="17" y1="12" x2="22" y2="12" />
            </template>
            <template v-else>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </template>
          </svg>
        </button>
      </div>
    </div>

    <!-- ============ 右浮岛 · 返回添加类（右下角） ============ -->
    <div class="bar-cluster bar-cluster--right" :class="{ 'no-breath': !barBreathEnabled, 'bar--focus': isFocus }" :style="barStyle">

      <!-- 世界壳三态循环键：3D 正厅 → 2D 宅院 → 全隐藏 → 3D（写 surfaceState 单一真源） -->
      <button
        class="bar-btn bar-mode"
        :class="{ 'is-3d': is3dHighlight }"
        @click="cycleSurface"
        :title="currentMeta.tip"
        :aria-label="currentMeta.aria"
      >
        <!-- hall-3d：立体方块 -->
        <svg v-if="surfaceState === 'hall-3d'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
          <path d="M12 2.5 L20 7 V17 L12 21.5 L4 17 V7 Z" />
          <path d="M4 7 L12 11.5 L20 7 M12 11.5 V21.5" />
        </svg>
        <!-- map-2d：扁平方块 -->
        <svg v-else-if="surfaceState === 'map-2d'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
          <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
          <line x1="4.5" y1="12" x2="19.5" y2="12" opacity="0.35" />
          <line x1="12" y1="4.5" x2="12" y2="19.5" opacity="0.35" />
        </svg>
        <!-- screen：全隐藏（收合） -->
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
          <path d="M2 12 C 5 7.5 19 7.5 22 12 C 19 16.5 5 16.5 2 12 Z" opacity="0.45" />
          <path d="M4 4 L20 20" />
        </svg>
      </button>

      <!-- 返回 -->
      <button class="bar-btn bar-back" @click="nav.goBack()" title="返回上一间" aria-label="返回">
        <span class="bar-back-icon">↩</span>
      </button>

      <!-- 添加：仅非心流页出现（心流页右岛仅留返回，遵循不打断沉浸） -->
      <div v-if="!isFocus" class="bar-add-wrap">
        <button class="bar-btn bar-add" :class="{ 'is-on': showAdd }" @click="showAdd = !showAdd" title="快速新建" aria-label="快速新建">
          <span class="bar-add-icon">＋</span>
        </button>

        <!-- 添加弹层：真实可建项 -->
        <Transition name="add-pop">
          <div v-if="showAdd" class="bar-add-pop" @click.stop>
            <button class="add-item" @click="quickNote">
              <span class="add-item-ic">✎</span>
              <span class="add-item-label">便签</span>
            </button>
            <button class="add-item" @click="go('/anchor')">
              <span class="add-item-ic">⚓</span>
              <span class="add-item-label">锚点</span>
            </button>
            <button class="add-item" @click="go('/garden')">
              <span class="add-item-ic">❋</span>
              <span class="add-item-label">结晶</span>
            </button>
            <button class="add-item" @click="go('/room-manager')">
              <span class="add-item-ic">⬡</span>
              <span class="add-item-label">房间</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import { useCanvasRoom } from '../modules/canvas'
import { useAppearance } from '../modules/customization/useAppearance'
import { useConfigStore } from '../stores/config'

defineEmits<{ (e: 'toggle-sidebar'): void }>()

const router = useRouter()
const route = useRoute()
const nav = useRoomNavigation()
const { state: canvasState, canvasCrystals, toggleLayout: toggleCanvasLayout } = useCanvasRoom()
const { canvasAlpha, setCanvasAlpha, barGlassAlpha, barBreathEnabled, barBreathSpeed, navFloatPos, setNavFloatPos } = useAppearance()

// ---- 悬浮液态栏 · docked/floating 自由定位（拖拽手柄） ----
// navFloatPos 为 null = 贴底 docked；{x,y} = 自由悬浮中心（px）。状态持久化。
const navFloating = computed(() => navFloatPos.value !== null)

const dragStyle = computed<Record<string, string>>(() => {
  if (!navFloating.value || !navFloatPos.value) return {} as Record<string, string>
  return { left: `${navFloatPos.value.x}px`, top: `${navFloatPos.value.y}px` }
})

let dragMoved = false
let dragStartX = 0
let dragStartY = 0
let dragOriginX = 0
let dragOriginY = 0

function startDrag(e: PointerEvent) {
  dragMoved = false
  dragStartX = e.clientX
  dragStartY = e.clientY
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (navFloating.value && navFloatPos.value) {
    dragOriginX = navFloatPos.value.x
    dragOriginY = navFloatPos.value.y
  } else {
    dragOriginX = vw / 2
    dragOriginY = vh - 64
  }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
}
function onDragMove(e: PointerEvent) {
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true
  if (!dragMoved) return
  setNavFloatPos({ x: Math.round(dragOriginX + dx), y: Math.round(dragOriginY + dy) })
}
function onDragEnd() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  if (!dragMoved) {
    // 单击手柄：切换 docked / floating
    setNavFloatPos(navFloating.value ? null : { x: Math.round(dragOriginX), y: Math.round(dragOriginY) })
    return
  }
  const vh = window.innerHeight
  // 边缘吸附：松手靠近底部 → 回 docked 贴底
  if ((navFloatPos.value?.y ?? 0) > vh * 0.72) setNavFloatPos(null)
}

// ---- 自动收缩：空闲 N 秒后收成小条，任意活动即展开 ----
const BAR_IDLE_MS = 4500
const barIdle = ref(false)
let barIdleTimer: ReturnType<typeof setTimeout> | null = null
function pokeBar() {
  if (barIdle.value) barIdle.value = false
  if (barIdleTimer) clearTimeout(barIdleTimer)
  barIdleTimer = setTimeout(() => { barIdle.value = true }, BAR_IDLE_MS)
}
const barActivityEvs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']
onMounted(() => {
  barActivityEvs.forEach((ev) => window.addEventListener(ev, pokeBar, { passive: true }))
  pokeBar()
})
onUnmounted(() => {
  barActivityEvs.forEach((ev) => window.removeEventListener(ev, pokeBar))
  if (barIdleTimer) clearTimeout(barIdleTimer)
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
})

// ---- 世界壳三态循环键（hall-3d → map-2d → screen，常驻右浮岛任意 shell，D3） ----
// 单一真源：直接写 config.worldShell.surfaceState，受 store 深层 watch 自动持久化。
// 与 SwitchPanel / 反引号·长按触发器共用同一真源、天然同步（D2），
// 不再写废弃的 starsMode/courtyardMode 双写字段。
const configStore = useConfigStore()

// 三态循环顺序（固定，单击前进一态）
const SURFACE_CYCLE = ['hall-3d', 'map-2d', 'screen'] as const

// 当前态 / 下一态
const surfaceState = computed(
  () => configStore.config.worldShell.surfaceState ?? 'screen',
)
const cycleIndex = computed(() => {
  const i = SURFACE_CYCLE.indexOf(surfaceState.value as (typeof SURFACE_CYCLE)[number])
  return i < 0 ? 2 : i
})
const nextSurface = computed(
  () => SURFACE_CYCLE[(cycleIndex.value + 1) % 3],
)

// 图标 / 文案 / tooltip / aria 映射
const SURFACE_META: Record<string, { label: string; tip: string; aria: string }> = {
  'hall-3d': { label: '3D', tip: '3D 壳 · 点击切 2D 平面', aria: '切换为 2D' },
  'map-2d': { label: '2D', tip: '2D 壳（扁平）· 点击收起全隐藏', aria: '收起世界壳' },
  screen: { label: '收起', tip: '已收起 · 点击回 3D 壳', aria: '展开 3D 壳' },
}
const currentMeta = computed(() => SURFACE_META[surfaceState.value])

// 3D 高亮（复用既有 .is-3d 描金语言，取代旧 is3d）
const is3dHighlight = computed(() => surfaceState.value === 'hall-3d')

// 单一动作：单击前进一态（深层 watch 自动持久化，不新增 store 方法）
function cycleSurface() {
  configStore.setSurfaceState(nextSurface.value)
}

// 星盘（App 已 provide）
const astrolabe = inject<{ open: (src?: string) => void }>('astrolabe', { open: () => {} })

const currentRoom = computed(() => nav.currentRoom.value)

// 上下文判定：心流页（'/' 月下抚琴极简沉浸）= true → 仅保留极简三键
const isFocus = computed(() => route.path === '/')
// 画布控制仅在「首页（引力场，控制最直接相关）」或「已有结晶（布局切换有意义）」时出现，
// 其余页面让出常驻位，把左岛按键压到 4 个（≡ / 房间 / 前后 / 星盘），减少视觉负担。
const showCanvasControls = computed(() => isFocus.value || canvasCrystalsCount.value > 1)

// ---- 液态玻璃通透度 / 呼吸节奏：由设置（超级自定义）实时驱动 ----
// --bar-a：背景不透明度倍率（0–1，100 对应现状磨砂）；--bar-blur：模糊 px（8–20）；
// --bar-breath-dur：呼吸周期（基准 7s / 节奏倍率）。
const barStyle = computed<Record<string, string | number>>(() => {
  const g = Math.min(100, Math.max(0, barGlassAlpha.value))
  const a = g / 100
  const blur = 8 + (g / 100) * 12
  const speed = Math.min(2, Math.max(0.5, barBreathSpeed.value))
  const dur = 7 / speed
  return {
    '--bar-a': a,
    '--bar-blur': `${blur}px`,
    '--bar-breath-dur': `${dur}s`,
  }
})

// ---- 画布控制（合并自 App 原右上簇） ----
const canvasLayoutMode = computed(() => canvasState.value.layoutMode)
const canvasCrystalsCount = computed(() => canvasCrystals.value.length)
const canvasAlphaValue = computed(() => canvasAlpha.value)
const ALPHA_PRESETS = [100, 60, 35]
const opacityGlyph = computed(() => {
  const a = canvasAlpha.value
  if (a >= 90) return '◉'
  if (a >= 50) return '◐'
  return '◌'
})
function cycleCanvasAlpha() {
  const idx = ALPHA_PRESETS.indexOf(canvasAlpha.value)
  const next = ALPHA_PRESETS[(idx + 1) % ALPHA_PRESETS.length]
  setCanvasAlpha(next)
}

// ---- 添加弹层 ----
const showAdd = ref(false)
const noteBoardVisible = inject<Ref<boolean>>('noteBoardVisible', ref(false))
function quickNote() {
  noteBoardVisible.value = !noteBoardVisible.value
  showAdd.value = false
}
function go(path: string) {
  router.push(path)
  showAdd.value = false
}

// 点击外部关闭弹层
function onDocClick() {
  if (showAdd.value) showAdd.value = false
}
onMounted(() => document.addEventListener('click', onDocClick, true))
onUnmounted(() => document.removeEventListener('click', onDocClick, true))
</script>

<style scoped>
/* ============================================================
   悬浮液态玻璃 · 双浮岛（左下功能 / 右下返回添加）
   通透度与呼吸节奏由 --bar-a / --bar-blur / --bar-breath-dur 驱动（设置可调）
   ============================================================ */
.floating-nav {
  position: fixed;
  inset: 0;
  z-index: var(--z-floating, 90);
  pointer-events: none; /* 仅浮岛本身承接交互 */
  /* 触屏最小命中区令牌（iOS HIG / Android 规范） */
  --tap-target: 44px;
}

/* 拖拽容器：docked 时透传、不定位；floating 时固定到自由坐标、两岛并排居中 */
.floating-nav__drag {
  position: static;
  pointer-events: none;
}
.floating-nav__drag.is-floating {
  position: fixed;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  transform: translate(-50%, -50%);
  z-index: var(--z-floating, 90);
}
.floating-nav__drag.is-floating .bar-cluster {
  position: relative;
  bottom: auto;
  left: auto;
  right: auto;
}

/* 拖拽手柄 */
.bar-grip {
  pointer-events: auto;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  margin: 0 2px;
  color: rgba(255, 255, 255, 0.45);
  cursor: grab;
  font-size: 13px;
  letter-spacing: -2px;
  user-select: none;
  touch-action: none;
}
.bar-grip:active { cursor: grabbing; color: #f0d6b8; }
.floating-nav__drag.is-floating .bar-grip { color: rgba(255, 255, 255, 0.7); }

/* 自动收缩：空闲收成小条 */
.floating-nav__drag.bar-idle .bar-cluster {
  transform: scale(0.78);
  opacity: 0.45;
  transition: transform 0.45s ease, opacity 0.45s ease;
}
.floating-nav__drag.bar-idle .bar-cluster:hover {
  transform: scale(1);
  opacity: 1;
}

.bar-cluster {
  position: fixed;
  bottom: calc(clamp(14px, 2.4vh, 22px) + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-floating, 90);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 9px;
  border-radius: 20px;
  /* 纯液态玻璃：半透明白填充（由 --bar-a 驱动，通透度滑块真正接管底栏主体）
     + 背景模糊 + 发光描边 + 顶部镜面高光。发亮、半透，不挡内容。 */
  background: rgba(255, 255, 255, calc(0.10 * var(--bar-a, 1)));
  backdrop-filter: blur(var(--bar-blur, 20px)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--bar-blur, 20px)) saturate(180%);
  /* 折射边缘：细亮描边模拟玻璃厚度，而非磨砂毛边；描边/内高光强度亦随通透度收放 */
  border: 1px solid rgba(255, 255, 255, calc(0.30 * var(--bar-a, 1) + 0.05));
  box-shadow:
    0 14px 46px rgba(0, 0, 0, 0.30),
    0 2px 10px rgba(0, 0, 0, 0.20),
    /* 玻璃厚度：上下内高光/内暗，营造发亮玻璃壳 */
    inset 0 1px 1px rgba(255, 255, 255, calc(0.55 * var(--bar-a, 1))),
    inset 0 -1px 4px rgba(0, 0, 0, 0.20),
    inset 0 0 0 0.5px rgba(255, 255, 255, calc(0.12 * var(--bar-a, 1)));
  pointer-events: auto;
  /* 呼吸：玻璃内高光游走 + 极弱冷白微光（尺寸恒定不缩放），节奏由 --bar-breath-dur 控制。
     注意：此处不能用 overflow:hidden —— 会裁掉呼吸的外发光；扫光裁剪改由 .bar-sheen-mask 承担。 */
  animation: bar-breathe var(--bar-breath-dur, 7s) ease-in-out infinite;
}

/* 扫光裁剪遮罩：仅锁死 .bar-sheen 在浮岛圆角矩形内（满足「闪光只在悬窗内、不允许全屏出现」），
   且不影响 .bar-cluster 的呼吸外发光（外发光不被裁）。 */
.bar-sheen-mask {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}

/* 左浮岛贴左下，右浮岛贴右下 —— 两枚独立浮岛，不再是一条长 shelf */
.bar-cluster--left { left: calc(clamp(14px, 2.4vw, 22px) + env(safe-area-inset-left, 0px)); }
.bar-cluster--right { right: calc(clamp(14px, 2.4vw, 22px) + env(safe-area-inset-right, 0px)); }

/* 右岛轻错相（约 1/5.5 周期）：形成「涟漪先后传递」的连贯感，
   既不像半周期那样一边亮一边暗显得断联，也不像完全同步那样死板。 */
.bar-cluster--right { animation-delay: calc(var(--bar-breath-dur, 7s) * -0.18); }

/* 关闭呼吸：静止如镜 */
.bar-cluster.no-breath { animation: none; }

/* 克制版呼吸：外壳尺寸恒定不动（不再整体 scale 喘气），
   仅玻璃内高光明暗缓缓游走 + 极弱冷白微光，模拟光在液态玻璃里折射。 */
@keyframes bar-breathe {
  0%, 100% {
    box-shadow:
      0 14px 42px rgba(0, 0, 0, 0.30),
      0 1px 6px rgba(0, 0, 0, 0.20),
      inset 0 1px 1px rgba(255, 255, 255, calc(0.34 * var(--bar-a, 1))),
      inset 0 -2px 6px rgba(0, 0, 0, 0.30),
      0 0 0 rgba(255, 255, 255, 0);
  }
  50% {
    /* 内高光略增 + 极弱冷白外微光（取代原暖琥珀脉冲，去廉价感）；
       外发光幅度适度，恢复「两岛都在呼吸」的可见度（此前被 overflow:hidden 裁掉）。 */
    box-shadow:
      0 16px 50px rgba(0, 0, 0, 0.34),
      0 2px 10px rgba(0, 0, 0, 0.22),
      inset 0 1px 2px rgba(255, 255, 255, calc(0.58 * var(--bar-a, 1))),
      inset 0 -2px 7px rgba(0, 0, 0, 0.34),
      0 0 14px rgba(225, 235, 255, 0.12);
  }
}

/* 缓慢扫过的高光（液态流动感）：严格限定在浮岛矩形内（top/left/宽高均不溢出），
   绝不外泄到全屏 —— 满足「闪光只在悬浮窗内、不允许全屏出现」。 */
.bar-sheen {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(105deg, transparent 0%, rgba(255, 255, 255, 0.16) 45%, rgba(255, 246, 230, 0.26) 50%, rgba(255, 255, 255, 0.14) 55%, transparent 100%);
  transform: rotate(0deg);
  pointer-events: none;
  overflow: hidden;
  animation: bar-sheen calc(var(--bar-breath-dur, 7s) * 1.6) ease-in-out infinite;
}
@keyframes bar-sheen {
  0%, 100% { left: -100%; opacity: 0; }
  45% { opacity: 0.85; }
  60% { left: 100%; opacity: 0; }
}

/* ---- 通用图标按钮（玻璃质感，背景/描边/内高光均随 --bar-a 收放，通透度无死角覆盖） ---- */
.bar-btn {
  position: relative;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, calc(0.14 * var(--bar-a, 1) + 0.04));
  border-radius: 12px;
  background: rgba(255, 255, 255, calc(0.06 * var(--bar-a, 1)));
  color: rgba(255, 255, 255, 0.70);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}
.bar-btn:hover:not(:disabled) {
  color: #f0d6b8;
  border-color: rgba(212, 165, 116, 0.42);
  background: rgba(255, 255, 255, calc(0.12 * var(--bar-a, 1)));
  box-shadow: 0 0 16px rgba(212, 165, 116, 0.14);
}
.bar-btn:active:not(:disabled) { transform: scale(0.93); }
.bar-btn:disabled { opacity: 0.28; cursor: default; }

/* 汉堡 */
.bar-menu { flex-direction: column; gap: 3px; }
.bar-menu-line {
  width: 15px;
  height: 1.5px;
  border-radius: 2px;
  background: currentColor;
  transition: all 0.2s ease;
}
.bar-menu:hover .bar-menu-line { background: #f0d6b8; }

/* 当前房间 */
.bar-room {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  max-width: 168px;
  padding: 6px 10px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, calc(0.04 * var(--bar-a, 1)));
  color: rgba(255, 255, 255, 0.84);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s ease;
}
.bar-room:hover { background: rgba(255, 255, 255, calc(0.10 * var(--bar-a, 1))); }
.bar-room-icon { font-size: 15px; flex-shrink: 0; }
.bar-room-name {
  font-size: 13px;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 主链路前后簇 */
.bar-nav-cluster { display: flex; gap: 2px; }
.bar-nav-cluster .bar-btn { width: 32px; height: 38px; font-size: 20px; border-radius: 10px; }

/* 星盘 */
.bar-astro-icon { font-size: 16px; animation: bar-astro-glow 3s ease-in-out infinite; }
@keyframes bar-astro-glow {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(212, 165, 116, 0.25)); }
  50% { filter: drop-shadow(0 0 10px rgba(212, 165, 116, 0.5)); }
}

/* 画布控制（桌面专属，<1024 隐藏） */
.bar-canvas-controls { display: flex; gap: 2px; }
.bar-glyph { font-size: 15px; line-height: 1; }
.bar-layout svg { width: 16px; height: 16px; }
.bar-layout.is-pending { opacity: 0.4; }

/* 返回 */
.bar-back-icon { font-size: 17px; }

/* 2D/3D 形态切换：3D 激活时描金提示（与栏悬停同色系，区分当前态） */
.bar-mode.is-3d {
  color: #f0d6b8;
  border-color: rgba(212, 165, 116, 0.42);
  background: rgba(212, 165, 116, 0.14);
  box-shadow: 0 0 14px rgba(212, 165, 116, 0.14);
}

/* 添加 */
.bar-add-wrap { position: relative; }
.bar-add .bar-add-icon { font-size: 20px; font-weight: 300; }
.bar-add.is-on {
  color: #f0d6b8;
  border-color: rgba(212, 165, 116, 0.45);
  background: rgba(212, 165, 116, 0.16);
}

/* 添加弹层 */
.bar-add-pop {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  display: flex;
  gap: 6px;
  padding: 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, calc(0.10 * var(--bar-a, 1)));
  backdrop-filter: blur(var(--bar-blur, 20px)) saturate(170%);
  -webkit-backdrop-filter: blur(var(--bar-blur, 20px)) saturate(170%);
  border: 1px solid rgba(255, 255, 255, calc(0.30 * var(--bar-a, 1) + 0.05));
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.34), inset 0 1px 1px rgba(255, 255, 255, calc(0.45 * var(--bar-a, 1)));
  z-index: var(--z-popover);
}
.add-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 56px;
  padding: 8px 4px;
  border: 1px solid rgba(255, 255, 255, calc(0.08 * var(--bar-a, 1) + 0.03));
  border-radius: 12px;
  background: rgba(255, 255, 255, calc(0.05 * var(--bar-a, 1)));
  color: rgba(255, 255, 255, 0.70);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
}
.add-item:hover {
  color: #f0d6b8;
  border-color: rgba(212, 165, 116, 0.34);
  background: rgba(255, 255, 255, calc(0.12 * var(--bar-a, 1)));
}
.add-item-ic { font-size: 18px; line-height: 1; }
.add-item-label { font-size: 10px; letter-spacing: 1px; }

.add-pop-enter-active, .add-pop-leave-active { transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1); }
.add-pop-enter-from, .add-pop-leave-to { opacity: 0; transform: translateY(10px) scale(0.94); }

/* ---- 心流页：极简，收窄房间名 ---- */
.bar--focus .bar-room { padding: 6px 8px; max-width: 120px; }
.bar--focus .bar-room-name { font-size: 12px; }

/* ---- 平板/移动：隐藏画布控制，房间名收窄 ---- */
@media (max-width: 1023px) {
  .bar-canvas-controls { display: none; }
  .bar-room { max-width: 96px; }
  .bar-room-name { font-size: 12px; }
}

/* 窄屏（手机 <640）：统一 44px 触屏命中区 + safe-area 贴角，两浮岛贴边角避免相撞 */
@media (max-width: 639px) {
  .bar-btn { min-width: var(--tap-target, 44px); min-height: var(--tap-target, 44px); }
  .bar-nav-cluster .bar-btn { min-width: var(--tap-target, 44px); min-height: var(--tap-target, 44px); }
  .bar-cluster { padding: 7px 8px; gap: 2px; }
  .bar-room { padding: 5px 6px; max-width: 72px; }
}
</style>
