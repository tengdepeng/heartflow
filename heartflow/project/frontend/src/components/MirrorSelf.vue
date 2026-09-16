<template>
  <div class="ms-root" v-if="!isSanctuary">
    <!-- 隐藏态：仅留恢复药丸 -->
    <Transition name="ms-pill">
      <button v-if="hidden" class="ms-restore-pill" type="button" @click="restoreBead" aria-label="显示幕僚">
        <svg class="ms-pill-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" class="ms-pill-dot" />
        </svg>
        <span>幕僚</span>
      </button>
    </Transition>

    <div
      v-show="!hidden"
      class="mirror-self-wrapper"
      :class="{ 'mirror-self--embedded': embedded, 'mirror-self--hall': !!hallAnchor, 'mirror-self--home-centered': homeCentered, 'is-dragging': isDragging }"
      :style="wrapperStyle"
    >
      <!-- 常驻操作钮（ℹ/✕）已并入流星径向菜单 -->

      <!-- 载体光点 -->
      <button
        ref="orbBtn"
        class="mirror-self"
        type="button"
        :class="{ 'mirror-self--active': showDialogue }"
        aria-label="幕僚：点击对话，按住拖动，单击唤对话"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @click="onBeadClick"
      >
        <div class="ms-orb" :class="[orbState, `form-${form}`, { active: !!advisor.currentBubble || showDialogue, 'meteor-bloom': meteorOpen, 'meteor-flash': orbFlash }]" :style="orbStyle">
          <div class="ms-aura" />
          <img v-if="carrierImage" class="ms-img" :src="carrierImage" alt="" />
          <svg v-else-if="form !== 'orb'" class="ms-shape" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            <g v-if="form === 'crystal'">
              <path class="ms-shape-fill" d="M50 16 L76 40 L64 78 L36 78 L24 40 Z" />
              <path class="ms-shape-line" d="M50 16 L50 78 M24 40 L76 40" />
            </g>
            <g v-else-if="form === 'flame'">
              <path class="ms-shape-fill" d="M50 14 C68 40 84 56 50 88 C16 56 32 40 50 14 Z" />
              <path class="ms-shape-line" d="M50 34 C58 48 64 56 50 74 C36 56 42 48 50 34 Z" />
            </g>
            <g v-else-if="form === 'seed'">
              <path class="ms-shape-fill" d="M50 14 C74 36 74 66 50 88 C26 66 26 36 50 14 Z" />
              <path class="ms-shape-line" d="M50 20 L50 82" />
            </g>
          </svg>
          <!-- 净透琉璃层：触碰微光 → 下缘焦散 → 上缘高光 → 掠光 → 厚边环（自下而上叠） -->
          <div class="ms-glow" />
          <div class="ms-caustic" />
          <div class="ms-spec" />
          <div class="ms-orb-sheen" />
          <div class="ms-rim" />
        </div>

        <!-- 名称 + 时段标签 -->
        <span class="ms-name">{{ displayName }}</span>
      </button>

      <!-- 气泡文字 -->
      <Transition name="bubble">
        <div v-if="advisor.currentBubble && !showDialogue" class="ms-bubble">
          <p class="ms-text">{{ advisor.currentBubble }}</p>
        </div>
      </Transition>

      <!-- 快捷状态面板（hover） -->
      <Transition name="tooltip">
        <div v-if="showInfoSheet && !showDialogue" class="ms-tooltip">
          <div class="ms-tooltip-row">
            <span class="ms-tooltip-label">今日专注</span>
            <span class="ms-tooltip-value">{{ stats.focusCount }} 次</span>
          </div>
          <div class="ms-tooltip-row">
            <span class="ms-tooltip-label">总笔记</span>
            <span class="ms-tooltip-value">{{ stats.noteCount }}</span>
          </div>
          <div class="ms-tooltip-row" v-if="stats.pendingAnchors > 0">
            <span class="ms-tooltip-label">待办锚点</span>
            <span class="ms-tooltip-value">{{ stats.pendingAnchors }}</span>
          </div>
          <div class="ms-tooltip-row">
            <span class="ms-tooltip-label">情绪花房</span>
            <span class="ms-tooltip-value">{{ stats.emotionCount }} 朵</span>
          </div>
          <div class="ms-tooltip-row" v-if="roomNoteCount !== null">
            <span class="ms-tooltip-label">今日记录·本房</span>
            <span class="ms-room-switch">
              <button
                class="ms-room-switch-btn"
                type="button"
                aria-label="切换到上一个房间"
                @click="switchRoom(-1)"
              >‹</button>
              <span class="ms-tooltip-value">{{ roomNoteCount }} 条</span>
              <button
                class="ms-room-switch-btn"
                type="button"
                aria-label="切换到下一个房间"
                @click="switchRoom(1)"
              >›</button>
            </span>
          </div>
          <!-- 定音锤进度 -->
          <div class="ms-tooltip-divider" />
          <div class="ms-tooltip-row" v-for="p in dingyinProgressList" :key="p.label">
            <span class="ms-tooltip-label">{{ p.label }}</span>
            <span class="ms-tooltip-progress">
              <span class="ms-progress-bar">
                <span class="ms-progress-fill" :style="{ width: p.progress * 100 + '%' }" />
              </span>
              <span class="ms-progress-text">{{ p.current }}{{ p.next ? '/' + p.next : '' }}</span>
            </span>
          </div>
          <!-- M6：今日专注时段迷你时间轴（晨→夜分布） -->
          <div class="ms-tooltip-divider" />
          <div class="ms-timeline" role="img" :aria-label="timelineAria">
            <div class="ms-timeline-title">今日专注时段</div>
            <div class="ms-timeline-bar">
              <span
                v-for="b in focusTimeline"
                :key="b.label"
                class="ms-timeline-seg"
                :class="{ 'is-empty': b.count === 0 }"
                :style="{ height: (24 + b.ratio * 64) + '%' }"
                :title="`${b.label} ${b.count} 次`"
              >
                <span class="ms-timeline-count" v-if="b.count > 0">{{ b.count }}</span>
              </span>
            </div>
            <div class="ms-timeline-axis">
              <span v-for="b in focusTimeline" :key="'ax-' + b.label">{{ b.label }}</span>
            </div>
          </div>

          <!-- 手势提示 -->
          <p class="ms-swipe-hint">点珠唤起流星 · 按住拖动重定位 · 点流星触发功能</p>
        </div>
      </Transition>

      <!-- 定音锤四幕已并入流星（专注/情绪/笔记/回响） -->

      <!-- 幕僚对话面板：用 Teleport 送到 body 之外，避免被 .mirror-self-wrapper 的
           transform 创建包含块，导致 position:fixed 锚定到珠子而非视口（面板跑到屏幕顶部） -->
      <Teleport to="body">
        <MirrorDialogue :visible="showDialogue" :active-room-id="activeRoomId" @close="showDialogue = false" />
      </Teleport>

      <!-- 流星径向菜单：点珠展开，功能化作流星环向铺开（暖琥珀） -->
      <Teleport to="body">
        <div v-if="meteorOpen" class="ms-meteor-layer">
          <div class="ms-meteor-center" :style="{ left: meteorCenter.x + 'px', top: meteorCenter.y + 'px' }">
            <div class="ms-meteor-flash" />
          </div>
          <div class="ms-meteor-ring" :style="{ left: meteorCenter.x + 'px', top: meteorCenter.y + 'px' }">
            <div
              v-for="m in meteorItems"
              :key="m.key"
              class="ms-meteor"
              :class="{ fired: firedKey === m.key }"
              :style="meteorStyle(m)"
              @click.stop="onMeteorClick(m)"
              :title="m.desc"
            >
              <div class="ms-hit" />
              <div class="ms-comet">
                <svg class="ms-tails" width="200" height="200" viewBox="-100 -100 200 200" aria-hidden="true">
                  <path :d="`M0 0 Q ${m.ccx.toFixed(1)} ${m.ccy.toFixed(1)} ${m.dx.toFixed(1)} ${m.dy.toFixed(1)}`" fill="none" stroke="url(#msDustGrad)" stroke-width="2.8" stroke-linecap="round" />
                  <path :d="`M0 0 Q ${m.ccx.toFixed(1)} ${m.ccy.toFixed(1)} ${m.dx.toFixed(1)} ${m.dy.toFixed(1)}`" fill="none" stroke="url(#msIonGrad)" stroke-width="7" stroke-linecap="round" opacity="0.4" />
                  <path :d="`M0 0 L ${m.ix.toFixed(1)} ${m.iy.toFixed(1)}`" fill="none" stroke="url(#msIonGrad)" stroke-width="3.2" stroke-linecap="round" opacity="0.5" />
                  <circle class="ms-sp" :cx="m.sx1" :cy="m.sy1" r="1.2" fill="#fff" />
                  <circle class="ms-sp" :cx="m.sx2" :cy="m.sy2" r="1" fill="#ffe" />
                </svg>
                <div class="ms-head" />
              </div>
              <div class="ms-mlabel" :style="m.leftSide ? 'right:14px' : 'left:14px'">{{ m.name }}</div>
            </div>
          </div>
          <svg class="ms-meteor-defs" width="0" height="0" aria-hidden="true"><defs>
            <radialGradient id="msDustGrad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="110">
              <stop offset="0%" stop-color="#fff6e8" stop-opacity="0.85" />
              <stop offset="26%" stop-color="#f0d2a6" stop-opacity="0.5" />
              <stop offset="66%" stop-color="#d4a574" stop-opacity="0.16" />
              <stop offset="100%" stop-color="#d4a574" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="msIonGrad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="86">
              <stop offset="0%" stop-color="#e8c9a0" stop-opacity="0.42" />
              <stop offset="100%" stop-color="#d4a574" stop-opacity="0" />
            </radialGradient>
          </defs></svg>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdvisor } from '../resonance/bridges/advisor'
import { useRoomAtmosphere, ROOM_SCENES } from '../composables/useRoomAtmosphere'
import { storage } from '../engine/storage'
import { FloatAnchor, FloatPos, ZERO_SAFE, floatPosToPx, pxToFloatPos } from '../utils/float-pos'
import { HOME_ROOMS } from '../modules/home/rooms'
import { carrierIsImage } from '../types/advisor'
import type { AdvisorCarrierGeometry, AdvisorProfile } from '../types/advisor'
import MirrorDialogue from './MirrorDialogue.vue'

const router = useRouter()
const route = useRoute()
const advisor = useAdvisor()

// 主陪伴幕僚（原镜我/玉珠）：合并为一颗「幕僚」珠，在「幕僚设置」里改载体几何，珠子实时反映。
const COMPANION_ID = 'preset-jingwo'
const DISPLAY_NAME = '幕僚'

// embedded：作为幕僚坞内的内嵌面板，取消 fixed 定位、随父容器布局
// hallAnchor：门厅态（屏风契约）下，玉珠光球定位到的屏侧坐标（逻辑像素，相对视口）。
//   由 App.vue 从屏风契约矩形计算注入；为空时回落默认右下常驻位。
const props = withDefaults(defineProps<{
  embedded?: boolean
  activeRoomId?: string
  hallAnchor?: { x: number; y: number } | null
  /** 宅院壳激活时居中（中央留白给幕僚）；2D/3D 切换已移至右下浮岛按键，玉珠点击回归唤对话 */
  centered?: boolean
  /** 心流页('/')珠列顶端居中模式：珠抬至计时珠正上方，与居中计时珠形成纵向珠列（D4/D5） */
  homeCentered?: boolean
}>(), {
  embedded: false,
  activeRoomId: '',
  hallAnchor: null,
  centered: false,
  homeCentered: false,
})

// 守护岛（安全岛）隐藏整颗珠子
const isSanctuary = computed(() => route.path === '/sanctuary' || route.name === 'sanctuary')

// ---- 主陪伴幕僚载体（实时反映「幕僚设置」里的几何形态）----
const companion = computed<AdvisorProfile | undefined>(() =>
  (advisor.advisors as AdvisorProfile[]).find((a) => a.id === COMPANION_ID),
)
const carrierImage = computed<string | null>(() => {
  const c = companion.value
  if (c && c.carrier && carrierIsImage(c.carrier)) return c.carrier.imageData ?? null
  return null
})
const form = computed<AdvisorCarrierGeometry>(() => {
  const c = companion.value
  if (!c || !c.carrier || c.carrier.kind === 'user-image') return 'orb'
  return (c.carrier.geometry as AdvisorCarrierGeometry) || 'orb'
})

// ---- 载体视觉自定义（通透度 glass / 辉光 glow / 缩放 size / 色调 tint）----
// 宪法第二条超级自定义：幕僚设置里调过的透明度/辉光/缩放/色调，珠子实时反映。
const carrierVisual = computed(() => {
  const c = companion.value?.carrier
  const tint = c?.tint
  return {
    glass: typeof c?.glass === 'number' ? c.glass : 1,
    glow: typeof c?.glow === 'number' ? c.glow : 0.6,
    size: typeof c?.size === 'number' ? c.size : 1,
    tint: tint ?? '',
    tintOn: !!tint,
  }
})
const orbStyle = computed<Record<string, string>>(() => {
  const v = carrierVisual.value
  return {
    '--orb-glass': String(v.glass),
    '--orb-glow': String(v.glow),
    '--orb-size': String(v.size),
    '--orb-tint': v.tintOn ? v.tint : 'transparent',
    '--orb-tint-opacity': v.tintOn ? '0.55' : '0',
  }
})
const displayName = DISPLAY_NAME

// ---- 拖拽 + 隐藏 本地持久化（宪法第1条：本地私有）----
// 坐标存「相对比例 + 锚边 FloatPos」，跨端/旋转不丢、不被状态栏/手势条吞没（T4.1）
interface WidgetState { rx: number; ry: number; anchor: FloatAnchor; hidden: boolean }
const WIDGET_KEY = 'companion-widget'

// 兼容旧绝对坐标数据：运行时迁移一次（旧 {x,y} -> 相对 FloatPos）
function loadWidget(): WidgetState {
  const raw = storage.getKV<{ x?: number; y?: number; rx?: number; ry?: number; anchor?: FloatAnchor; hidden?: boolean }>(WIDGET_KEY, {})
  if (typeof raw?.x === 'number' && typeof raw?.y === 'number') {
    const vw = window.innerWidth || 1280
    const vh = window.innerHeight || 800
    const p = pxToFloatPos(raw.x, raw.y, 'br', vw, vh)
    return { rx: p.rx, ry: p.ry, anchor: p.anchor, hidden: !!raw.hidden }
  }
  return { rx: raw?.rx ?? 0, ry: raw?.ry ?? 0, anchor: raw?.anchor ?? 'br', hidden: !!raw?.hidden }
}
const widget = ref<WidgetState>(loadWidget())
const dragPos = ref<FloatPos | null>(null)

// 响应式视口尺寸：窗口缩放时驱动 wrapperStyle 重算，否则拖动过的珠子在缩窗后僵死不跟随
const viewport = ref({
  w: typeof window !== 'undefined' ? window.innerWidth : 1280,
  h: typeof window !== 'undefined' ? window.innerHeight : 800,
})
function onViewportResize() {
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
}
onMounted(() => window.addEventListener('resize', onViewportResize))
onUnmounted(() => window.removeEventListener('resize', onViewportResize))
// 旧绝对坐标数据：还原 dragPos（拖拽接管后才写回相对坐标）
{
  const raw = storage.getKV<{ x?: number; y?: number }>(WIDGET_KEY, {})
  if (typeof raw?.x === 'number' && typeof raw?.y === 'number') {
    const vw = window.innerWidth || 1280
    const vh = window.innerHeight || 800
    dragPos.value = pxToFloatPos(raw.x, raw.y, 'br', vw, vh)
  }
}
const hidden = ref<boolean>(!!widget.value.hidden)
function persistWidget() {
  storage.setKV(WIDGET_KEY, {
    rx: dragPos.value?.rx ?? 0,
    ry: dragPos.value?.ry ?? 0,
    anchor: dragPos.value?.anchor ?? ('br' as FloatAnchor),
    hidden: hidden.value,
  })
}
function hideBead() { hidden.value = true; persistWidget() }
function restoreBead() { hidden.value = false; persistWidget() }

// 左滑切房间：向父组件抛出新房间 id（update:activeRoomId 事件，供父组件监听以切换当前房间）
const emit = defineEmits<{ (e: 'update:activeRoomId', id: string): void }>()

const showDialogue = ref(false)
const showInfoSheet = ref(false)
function toggleInfoSheet() { showInfoSheet.value = !showInfoSheet.value }

// 手势：按住并移动 = 重定位；未移动松手 = 单击（唤对话）
let pressing = false
let moved = false
let startX = 0
let startY = 0
let pressId = -1
const isDragging = ref(false)
let suppressClick = false

function canDrag() {
  // 仅「内嵌卡片」由宿主控制位置、不允许拖动；其余页面（含宅院居中 / 门厅锚定）
  // 珠子均可像悬浮液态栏一样自由拖动——一旦拖动 dragPos 接管，离开系统定位。
  return !props.embedded
}

function onPointerDown(e: PointerEvent) {
  showInfoSheet.value = false
  if (!canDrag()) return
  pressing = true
  moved = false
  startX = e.clientX ?? 0
  startY = e.clientY ?? 0
  pressId = e.pointerId
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
}
function onPointerMove(e: PointerEvent) {
  if (!pressing || !canDrag()) return
  const dx = (e.clientX ?? 0) - startX
  const dy = (e.clientY ?? 0) - startY
  if (!moved && Math.hypot(dx, dy) < 8) return
  moved = true
  isDragging.value = true
  const w = 54
  const h = 54
  const vw = window.innerWidth
  const vh = window.innerHeight
  const x = Math.max(w / 2 + 4, Math.min(vw - w / 2 - 4, e.clientX ?? startX))
  const y = Math.max(h / 2 + 4, Math.min(vh - h / 2 - 4, e.clientY ?? startY))
  // 存相对坐标（跨端稳定），锚边默认右下；渲染时再按 safe-area clamp
  dragPos.value = pxToFloatPos(x, y, 'br', vw, vh)
}
function onPointerUp(e: PointerEvent) {
  if (!pressing) return
  pressing = false
  try { if (pressId >= 0) (e.currentTarget as HTMLElement).releasePointerCapture?.(pressId) } catch { /* noop */ }
  pressId = -1
  if (isDragging.value) {
    isDragging.value = false
    if (moved) {
      persistWidget()
      suppressClick = true
      setTimeout(() => { suppressClick = false }, 0)
      closeMeteors()   // 拖动珠体即收起径向菜单（点击仍由 onBeadClick 切换）
    }
    moved = false
    return
  }
  moved = false
}
function onPointerCancel() {
  pressing = false
  isDragging.value = false
  pressId = -1
}
function onBeadClick() {
  if (suppressClick) { suppressClick = false; return }
  toggleMeteors()
}
// 触屏不再依赖 hover 显形：状态面板改由 ℹ 按钮点击切换（T3）

// 门厅态定位：玉珠光球锚定到屏风计时器旁（固定屏位，不随背景转动）
// centered（按需启用）：玉珠居中悬浮。曾随宅院壳全局触发，实测遮挡所有页面中央内容，现仅由宿主按页显式开启
const wrapperStyle = computed(() => {
  if (props.embedded) return {}
  const base: Record<string, string> = {
    position: 'fixed',
    left: 'auto',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    transform: 'none',
    zIndex: 'var(--z-jade, 20)',
  }
  // 拖动过：自由浮动接管（D5/D6，置于 homeCentered/centered 之上）
  if (dragPos.value) {
    const px = floatPosToPx(dragPos.value, { w: 54, h: 54 }, ZERO_SAFE, viewport.value.w, viewport.value.h)
    base.left = `${px.x}px`
    base.top = `${px.y}px`
    base.right = 'auto'
    base.bottom = 'auto'
    base.transform = 'translate(-50%, -50%)'
    return base
  }
  // 心流页('/')：抬至计时珠正上方，与居中计时珠形成纵向珠列（D4/D5）
  if (props.homeCentered) {
    base.left = '50%'
    base.top = '50%'
    base.right = 'auto'
    base.bottom = 'auto'
    base.transform = 'translate(-50%, calc(-50% - var(--column-offset, 220px)))'
    return base
  }
  if (props.centered) {
    base.left = '50%'
    base.top = '50%'
    base.right = 'auto'
    base.bottom = 'auto'
    base.transform = 'translate(-50%, -50%)'
    return base
  }
  if (props.hallAnchor) {
    base.left = `${props.hallAnchor.x}px`
    base.top = `${props.hallAnchor.y}px`
    base.right = 'auto'
    base.bottom = 'auto'
    base.transform = 'translate(-50%, -50%)'
    return base
  }
  // 回落默认右下常驻位
  base.right = '32px'
  base.bottom = '80px'
  return base
})

const stats = computed(() => advisor.getQuickStats())

/** M6：今日专注时段分布（晨/午/昼/暮/夜），供长按面板迷你时间轴 */
const focusTimeline = computed(() => {
  void showInfoSheet.value // 依赖面板开关，确保每次打开时重读最新专注数据
  const today = new Date().toISOString().slice(0, 10)
  const buckets: { label: string; test: (h: number) => boolean }[] = [
    { label: '晨', test: (h) => h >= 5 && h < 12 },
    { label: '午', test: (h) => h >= 12 && h < 14 },
    { label: '昼', test: (h) => h >= 14 && h < 18 },
    { label: '暮', test: (h) => h >= 18 && h < 22 },
    { label: '夜', test: (h) => h >= 22 || h < 5 },
  ]
  const counts = buckets.map(() => 0)
  for (const s of storage.getSessions()) {
    if (s.status !== 'completed' || !s.completedAt) continue
    if (!s.completedAt.startsWith(today)) continue
    const h = new Date(s.completedAt).getHours()
    const bi = buckets.findIndex((b) => b.test(h))
    if (bi >= 0) counts[bi]++
  }
  const max = Math.max(1, ...counts)
  return buckets.map((b, i) => ({ label: b.label, count: counts[i], ratio: counts[i] / max }))
})

/** 时间轴无障碍摘要（供 role=img 的 aria-label） */
const timelineAria = computed(() =>
  '今日专注时段分布：' + focusTimeline.value.map((b) => `${b.label} ${b.count} 次`).join('，'),
)

/** M6：当前房间今日记录数（仅嵌入且有 activeRoomId 时显示） */
const roomNoteCount = computed<number | null>(() => {
  if (!props.activeRoomId) return null
  const today = new Date().toISOString().slice(0, 10)
  return storage.getNotes().filter((n) =>
    n.roomId === props.activeRoomId &&
    !n.archived &&
    !n.deletedAt &&
    (n.createdAt.startsWith(today) || n.updatedAt.startsWith(today)),
  ).length
})

const now = new Date()
const hour = now.getHours()

/** 光球状态：根据时段变换颜色 */
const orbState = computed(() => {
  if (hour >= 5 && hour < 8) return 'orb-dawn'
  if (hour >= 8 && hour < 17) return 'orb-day'
  if (hour >= 17 && hour < 20) return 'orb-dusk'
  return 'orb-night'
})

/** 定音锤进度列表 */
const dingyinProgressList = computed(() => {
  const p = advisor.getAllDingyinProgress('default')
  return [
    { label: '专注', ...p.focus_complete },
    { label: '情绪', ...p.emotion_logged },
    { label: '笔记', ...p.note_created },
  ]
})

function toggleDialogue() {
  showDialogue.value = !showDialogue.value
  if (showDialogue.value) {
    showInfoSheet.value = false
    advisor.onTap()
  }
}

/** 切房间：在当前家房间列表中循环；dir=1 下一间，dir=-1 上一间。向上转发新 id */
function switchRoom(dir: 1 | -1 = 1) {
  if (!HOME_ROOMS.length) return
  const idx = HOME_ROOMS.findIndex((r) => r.id === props.activeRoomId)
  const base = idx < 0 ? 0 : idx
  const next = HOME_ROOMS[(base + dir + HOME_ROOMS.length) % HOME_ROOMS.length]
  emit('update:activeRoomId', next.id)
}

// ================= 流星径向菜单（点珠唤起，功能化作流星环向铺开，暖琥珀） =================
interface MeteorItem {
  key: string
  name: string
  desc: string
  i: number
  cx: number
  cy: number
  dx: number
  dy: number
  ix: number
  iy: number
  ccx: number
  ccy: number
  sx1: number
  sy1: number
  sx2: number
  sy2: number
  leftSide: boolean
  bobDur: string
  bobDelay: string
  bobX: string
  bobY: string
  bobRot: string
}
const METEOR_FUNCS = [
  { key: 'dialogue', name: '对话', desc: '唤出幕僚对话' },
  { key: 'status', name: '状态', desc: '今日笔记 / 锚点 / 花房' },
  { key: 'focus', name: '专注', desc: '心流页·计时器' },
  { key: 'emotion', name: '情绪', desc: '情绪花房' },
  { key: 'note', name: '笔记', desc: '思绪书房' },
  { key: 'echo', name: '回响', desc: '共鸣图谱' },
  { key: 'room', name: '切房', desc: '切换所在房间' },
  { key: 'hide', name: '隐藏', desc: '隐藏幕僚' },
]
const METEOR_R = 88
const meteorOpen = ref(false)
const orbFlash = ref(false)
const firedKey = ref<string | null>(null)
const meteorCenter = ref({ x: 0, y: 0 })
const orbBtn = ref<HTMLElement | null>(null)
let meteorDocHandler: ((e: MouseEvent) => void) | null = null
let meteorRAF: number | null = null
// 流星展开时持续把中心同步到珠体实时位置（覆盖 resize / 拖拽 / 0.3s 定位过渡），避免流星不跟随
function trackMeteorCenter() {
  if (!meteorOpen.value) { meteorRAF = null; return }
  const r = orbBtn.value?.getBoundingClientRect()
  if (r) {
    const nx = r.left + r.width / 2
    const ny = r.top + r.height / 2
    const cur = meteorCenter.value
    // 珠体静止时不改写 ref → 不触发重渲染 → 流星空闲浮动动画不受影响
    if (Math.abs(nx - cur.x) > 0.5 || Math.abs(ny - cur.y) > 0.5) {
      meteorCenter.value = { x: nx, y: ny }
    }
  }
  meteorRAF = requestAnimationFrame(trackMeteorCenter)
}

const meteorItems = computed<MeteorItem[]>(() => {
  const N = METEOR_FUNCS.length
  const startA = -Math.PI / 2
  return METEOR_FUNCS.map((f, i) => {
    const a = startA + (Math.PI * 2 * i) / N
    const px = Math.cos(a) * METEOR_R
    const py = Math.sin(a) * METEOR_R
    const tx = Math.sin(a)
    const ty = -Math.cos(a)
    const ox = Math.cos(a)
    const oy = Math.sin(a)
    const Ld = 44
    const Li = 32
    const dx = tx * Ld
    const dy = ty * Ld
    const ix = ox * Li
    const iy = oy * Li
    const ccx = tx * Ld * 0.5 - oy * 12
    const ccy = ty * Ld * 0.5 + ox * 12
    const sx1 = tx * Ld * 0.42
    const sy1 = ty * Ld * 0.42
    const sx2 = tx * Ld * 0.72
    const sy2 = ty * Ld * 0.72
    const leftSide = Math.cos(a) < 0
    // bob 随机值放进记忆化 computed：每流星只算一次，避免每次重渲染重掷导致空闲浮动动画被重置
    const bobDur = (2.6 + Math.random() * 1.6).toFixed(2) + 's'
    const bobDelay = (Math.random() * 2).toFixed(2) + 's'
    const bobX = ((Math.random() * 2 - 1) * 4).toFixed(1) + 'px'
    const bobY = (11 + Math.random() * 5).toFixed(1) + 'px'          // 垂直摆幅 11~16px（重力浮动）
    const bobRot = ((Math.random() * 2 - 1) * 3.5).toFixed(2) + 'deg' // 钟摆倾角 ±3.5deg
    return { ...f, i, cx: px, cy: py, dx, dy, ix, iy, ccx, ccy, sx1, sy1, sx2, sy2, leftSide, bobDur, bobDelay, bobX, bobY, bobRot }
  })
})

function meteorStyle(m: MeteorItem): Record<string, string> {
  return {
    '--cx': m.cx.toFixed(1) + 'px',
    '--cy': m.cy.toFixed(1) + 'px',
    '--i': String(m.i),
    '--bobdur': m.bobDur,
    '--bobdelay': m.bobDelay,
    '--bobx': m.bobX,
    '--boby': m.bobY,
    '--bobrot': m.bobRot,
  }
}

function computeMeteorCenter() {
  const r = orbBtn.value?.getBoundingClientRect()
  if (r) meteorCenter.value = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
function closeMeteors() {
  meteorOpen.value = false
  firedKey.value = null
  if (meteorRAF !== null) { cancelAnimationFrame(meteorRAF); meteorRAF = null }
  if (meteorDocHandler) {
    document.removeEventListener('click', meteorDocHandler, true)
    meteorDocHandler = null
  }
}
function toggleMeteors() {
  if (meteorOpen.value) closeMeteors()
  else burstMeteors()
}
function burstMeteors() {
  if (meteorOpen.value) return
  computeMeteorCenter()
  showInfoSheet.value = false
  showDialogue.value = false
  meteorOpen.value = true
  if (meteorRAF === null) meteorRAF = requestAnimationFrame(trackMeteorCenter)
  setTimeout(() => {
    meteorDocHandler = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t || !t.closest) return
      if (t.closest('.mirror-self-wrapper')) return   // 点珠体：交给 onBeadClick 切换（开/收）
      if (t.closest('.ms-meteor-layer')) return        // 点流星：交给 onMeteorClick 执行动作并收起
      closeMeteors()
    }
    // 冒泡阶段注册：保证在 onBeadClick 之后执行，避免捕获阶段「先关又被 toggle 重开」的竞态
    document.addEventListener('click', meteorDocHandler, false)
  }, 0)
}
function onMeteorClick(m: MeteorItem) {
  if (firedKey.value) return
  firedKey.value = m.key
  orbFlash.value = true
  setTimeout(() => { orbFlash.value = false }, 600)
  // 状态/对话是就地面板，无需等流星飞行动画，立即执行以消除"点击后卡顿"
  const instant = m.key === 'status' || m.key === 'dialogue'
  setTimeout(() => runMeteorAction(m), instant ? 0 : 440)
}
function runMeteorAction(m: MeteorItem) {
  switch (m.key) {
    case 'dialogue':
      toggleDialogue()
      break
    case 'status':
      toggleInfoSheet()
      break
    case 'focus':
      router.push('/')
      break
    case 'note':
      router.push('/study')
      break
    case 'emotion':
      router.push('/garden')
      break
    case 'echo':
      router.push('/association-graph')
      break
    case 'room': {
      // 切家内部房间：心流页看不到场景切换，故直接跳到家视图并带 ?room= 下一间（HomeSpace 经 ROOM_ID_ALIAS→switchScene 真正切房，可见且不与 /study 等视图撞 id）
      const atmos = useRoomAtmosphere()
      const ids = ROOM_SCENES.map((s) => s.id)
      const cur = atmos.currentSceneId.value
      const idx = ids.indexOf(cur)
      const base = idx < 0 ? 0 : idx
      const next = ids[(base + 1) % ids.length]
      if (next) router.push({ path: '/home-space', query: { room: next } })
      break
    }
    case 'hide':
      hideBead()
      break
  }
  closeMeteors()
}

onUnmounted(() => {
  if (meteorDocHandler) document.removeEventListener('click', meteorDocHandler, true)
  if (meteorRAF !== null) cancelAnimationFrame(meteorRAF)
})
</script>

<style scoped>
.ms-root {
  display: contents;
}

.mirror-self-wrapper {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  right: calc(32px + env(safe-area-inset-right, 0px));
  z-index: var(--z-jade, 20);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  /* 心流页珠列纵向偏移量：幕僚珠中心相对计时珠中心上移的距离（D5，响应式覆盖见移动端媒体） */
  --column-offset: 220px;
}

/* 心流页('/')珠列顶端居中：珠抬至计时珠正上方；纵向偏移由 --column-offset 驱动（D4/D5） */
.mirror-self--home-centered {
  align-items: center;
}

/* 内嵌于幕僚坞：取消固定定位，随容器横向排布 */
.mirror-self--embedded {
  position: relative;
  bottom: auto;
  right: auto;
  inset: auto;
  align-items: center;
  flex-direction: row;
  gap: 12px;
}

/* 门厅态（屏风契约）：玉珠光球锚定到屏侧，固定屏位不随背景转动 */
.mirror-self--hall {
  position: fixed;
  align-items: center;
}

/* 内嵌时，谏言气泡与长按提示改为浮层弹出，不挤占弹性流 */
.mirror-self--embedded .ms-bubble,
.mirror-self--embedded .ms-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 2;
}

.mirror-self {
  position: relative;
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
.is-dragging .mirror-self { cursor: grabbing; }

/* ========== 载体光点（幕僚 · 净透琉璃 + 多形态） ==========
   材质：近无色玻璃球 —— 上缘锐高光 + 侧壁冷调折射 + 下缘焦散亮弧 + 厚边环定义轮廓。
   球心静默干净；被触（hover / 唤出对话）时才透出一团淡暖光（触碰微光）。
   官方抽象几何形态：玉珠 orb / 晶簇 crystal / 焰 flame / 种 seed（蓝图16「载体几何」）。
   珠子实时反映主陪伴幕僚在「幕僚设置」里设定的几何；用户导入图片则直接呈现 img。 */
.ms-orb {
  position: relative;
  width: calc(54px * var(--orb-size, 1));
  height: calc(54px * var(--orb-size, 1));
  opacity: var(--orb-glass, 1);
  border-radius: 50%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background:
    linear-gradient(178deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.07) 24%, rgba(255, 255, 255, 0) 44%),
    radial-gradient(ellipse 80% 32% at 50% 97%, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0) 74%),
    radial-gradient(circle at 74% 66%, rgba(150, 176, 216, 0.15), rgba(150, 176, 216, 0) 58%),
    radial-gradient(circle at 40% 34%, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025) 56%, rgba(255, 255, 255, 0.008) 100%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(3px) saturate(1.5) brightness(1.08);
  -webkit-backdrop-filter: blur(3px) saturate(1.5) brightness(1.08);
  box-shadow:
    inset 0 1px 1.5px rgba(255, 255, 255, 0.78),
    inset 2px 3px 7px rgba(255, 255, 255, 0.28),
    inset -3px -4px 10px rgba(142, 172, 216, 0.2),
    inset 0 -2px 5px rgba(255, 255, 255, 0.22),
    0 4px 14px rgba(4, 8, 16, 0.3),
    0 0 calc(6px + 22px * var(--orb-glow, 0.6)) var(--orb-state-glow, rgba(var(--accent-rgb), calc(0.1 + 0.32 * var(--orb-glow, 0.6))));
}

/* 色调叠加层：随载体 tint 着色（soft-light 混合，不破坏玉质高光） */
.ms-orb::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--orb-tint, transparent);
  mix-blend-mode: soft-light;
  opacity: var(--orb-tint-opacity, 0);
  pointer-events: none;
}

/* 嵌入幕僚坞时稍收，避免挤压坞身（仍随 size 变量缩放） */
.mirror-self--embedded .ms-orb {
  width: calc(46px * var(--orb-size, 1));
  height: calc(46px * var(--orb-size, 1));
}

/* 时段微差：净透琉璃本体无色，时段只改「外晕色相」。
   外晕幅度仍受载体辉光 --orb-glow 驱动（宪法第二条超级自定义） */
.orb-dawn {
  --orb-aura: rgba(255, 214, 180, 0.3);
  --orb-state-glow: rgba(255, 214, 180, calc(0.1 + 0.3 * var(--orb-glow, 0.6)));
}
.orb-day {
  --orb-aura: rgba(206, 224, 255, 0.3);
  --orb-state-glow: rgba(206, 224, 255, calc(0.12 + 0.34 * var(--orb-glow, 0.6)));
}
.orb-dusk {
  --orb-aura: rgba(var(--accent-rgb), 0.32);
  --orb-state-glow: rgba(var(--accent-rgb), calc(0.11 + 0.32 * var(--orb-glow, 0.6)));
}
.orb-night {
  --orb-aura: rgba(150, 168, 215, 0.32);
  --orb-state-glow: rgba(150, 168, 215, calc(0.1 + 0.3 * var(--orb-glow, 0.6)));
}

/* 悬停/激活：只做「珠体微放大 + 珠缘提亮」，不用 filter，避免与 backdrop-filter 打架 */
.mirror-self:hover .ms-orb,
.mirror-self--active .ms-orb {
  transform: scale(1.06);
}

.mirror-self:active .ms-orb {
  transform: scale(0.96);
}

.mirror-self:hover .ms-rim,
.mirror-self--active .ms-rim {
  box-shadow:
    inset 0 0 0 1.4px rgba(255, 255, 255, 0.38),
    inset 0 0 7px rgba(255, 255, 255, 0.24);
}

/* 用户导入图片形态 */
.ms-img {
  position: absolute;
  inset: 8%;
  width: 84%;
  height: 84%;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 16px rgba(190, 214, 245, 0.35);
}

/* 非玉珠几何形态：内嵌 SVG（晶簇 / 焰 / 种），统一玉光描边 */
.ms-shape {
  position: absolute;
  inset: 14%;
  width: 72%;
  height: 72%;
  filter: drop-shadow(0 0 6px rgba(190, 214, 245, 0.5));
}
.ms-shape-fill {
  fill: var(--orb-tint, rgba(205, 224, 248, 0.85));
  stroke: rgba(255, 255, 255, 0.55);
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.ms-shape-line {
  fill: none;
  stroke: rgba(255, 255, 255, 0.45);
  stroke-width: 1.2;
  stroke-linecap: round;
}

/* 触碰微光：球心偏下一团淡暖光。静默不可见，hover / 唤出对话时透出并随呼吸明灭。
   刻意偏下 + 大范围虚化，读作「玉中有光」，不构成瞳孔（幕僚无脸）。 */
.ms-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.45s ease;
}
.ms-glow::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    ellipse 46% 34% at 52% 63%,
    rgba(255, 238, 212, 0.44) 0%,
    rgba(255, 226, 190, 0.16) 44%,
    rgba(255, 220, 180, 0) 74%
  );
  filter: blur(2px);
  animation: ms-glow-pulse 5.4s ease-in-out infinite;
}
.mirror-self:hover .ms-glow,
.mirror-self--active .ms-glow,
.ms-orb.active .ms-glow {
  opacity: 1;
}

/* 下缘焦散亮弧：光自玻璃底缘汇聚（screen 只加光不减光） */
.ms-caustic {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  mix-blend-mode: screen;
  filter: blur(0.6px);
  background: radial-gradient(
    ellipse 54% 22% at 50% 91%,
    rgba(255, 255, 255, 0.62),
    rgba(255, 255, 255, 0) 72%
  );
}

/* 上缘锐高光 + 柔光斑：玻璃第一高光 */
.ms-spec {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background:
    radial-gradient(ellipse 24% 15% at 30% 21%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0) 72%),
    radial-gradient(ellipse 38% 20% at 34% 29%, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0) 76%);
}

/* 玻璃厚边环：利落珠缘，任何背景上都能定义轮廓（替代原 ::before 细 rim） */
.ms-rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1.4px rgba(255, 255, 255, 0.2),
    inset 0 0 5px rgba(255, 255, 255, 0.13);
}

/* 外柔光晕：净透琉璃的外晕（色相随时段 --orb-aura，幅度随载体辉光 --orb-glow） */
.ms-aura {
  position: absolute;
  inset: -40%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    var(--orb-aura, rgba(var(--accent-rgb), 0.26)),
    transparent 68%
  );
  pointer-events: none;
  animation: ms-aura-breathe 7s ease-in-out infinite;
  will-change: transform, opacity;
}

/* 游走高光 sheen：玉珠水头（9s 缓扫一次，克制） */
.ms-orb-sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
}
.ms-orb-sheen::after {
  content: '';
  position: absolute;
  top: -60%;
  left: -60%;
  width: 220%;
  height: 220%;
  background: linear-gradient(
    115deg,
    transparent 38%,
    rgba(255, 255, 255, 0.14) 50%,
    transparent 62%
  );
  transform: translateX(-32%);
  animation: ms-orb-sheen-sweep 9s ease-in-out infinite;
  will-change: transform;
}

@keyframes ms-aura-breathe {
  0%, 100% { opacity: 0.78; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.04); }
}
@keyframes ms-orb-sheen-sweep {
  0% { transform: translateX(-32%); }
  50% { transform: translateX(32%); }
  100% { transform: translateX(-32%); }
}
@keyframes ms-glow-pulse {
  0%, 100% { opacity: 0.62; }
  50% { opacity: 1; }
}

/* ========== 名称（精简：去掉时段标签；静默不显形，hover / 唤出对话时淡入） ========== */
.ms-name {
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.62);
  opacity: 0;
  transition: opacity 0.3s ease, color 0.3s ease;
}
.mirror-self:hover .ms-name,
.mirror-self:focus-visible .ms-name,
.mirror-self--active .ms-name {
  opacity: 1;
  color: rgba(255, 255, 255, 0.85);
}

/* 常驻操作钮（ℹ/✕）已并入流星径向菜单 */

/* ========== 隐藏态恢复药丸 ========== */
.ms-restore-pill {
  position: fixed;
  right: calc(32px + env(safe-area-inset-right, 0px));
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-jade, 20);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px 0 10px;
  border-radius: 18px;
  border: 1px solid rgba(205, 220, 245, 0.22);
  background: rgba(14, 16, 24, 0.82);
  backdrop-filter: blur(12px);
  color: rgba(225, 232, 248, 0.85);
  font-size: 11px;
  letter-spacing: 1px;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32), 0 0 16px rgba(170, 196, 230, 0.18);
  transition: all 0.2s ease;
}
.ms-restore-pill:hover {
  background: rgba(20, 24, 34, 0.92);
  border-color: rgba(205, 220, 245, 0.4);
  color: #fff;
}
.ms-pill-icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.6; }
.ms-pill-dot { fill: currentColor; stroke: none; }

/* 恢复药丸过渡 */
.ms-pill-enter-active, .ms-pill-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.ms-pill-enter-from, .ms-pill-leave-to { opacity: 0; transform: translateY(8px) scale(0.92); }

/* ========== 气泡 ========== */
.ms-bubble {
  background: rgba(14, 16, 24, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 12px 14px;
  max-width: 220px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
}

.ms-text {
  font-size: 13px;
  color: rgba(240, 242, 255, 0.9);
  line-height: 1.5;
  margin: 0;
}

/* ========== 工具提示面板 ========== */
.ms-tooltip {
  padding: 12px 14px;
  border-radius: 14px;
  /* 净透琉璃面板：露底透明 + 上缘反射 + 厚边环（全局「琉璃通透度」主控驱动），
     与镜我对话框 / 幕僚球同源材质，取代原先 0.92 冷黑实底。 */
  background:
    var(--glass-clear-sheen),
    rgba(26, 24, 30, var(--glass-clear-a-surface));
  border: 1px solid var(--glass-clear-rim);
  backdrop-filter: blur(14px) saturate(1.5) brightness(1.06);
  -webkit-backdrop-filter: blur(14px) saturate(1.5) brightness(1.06);
  min-width: 180px;
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, calc(var(--glass-clear-a-sheen) * 0.6));
}

/* 浮动态（非内嵌）：限制最大宽度，避免在窄屏左侧溢出视口 */
.mirror-self-wrapper:not(.mirror-self--embedded) .ms-tooltip {
  max-width: min(300px, calc(100vw - 40px));
}

.ms-tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  gap: 12px;
}

.ms-tooltip-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  flex-shrink: 0;
}

.ms-tooltip-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

.ms-tooltip-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 6px 0;
}

.ms-tooltip-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: flex-end;
}

.ms-progress-bar {
  width: 48px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.ms-progress-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.4), rgba(var(--accent-rgb), 0.7));
  transition: width 0.5s ease;
}

.ms-progress-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.52);
  min-width: 32px;
  text-align: right;
}

/* ========== M6：今日专注时段迷你时间轴 ========== */
.ms-timeline {
  margin-top: 8px;
}
.ms-timeline-title {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.ms-timeline-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 4px;
  height: 56px;
}
.ms-timeline-seg {
  position: relative;
  flex: 1;
  min-height: 6px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.85), rgba(var(--accent-rgb), 0.25));
  transition: height 0.4s ease;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.ms-timeline-seg.is-empty {
  background: rgba(255, 255, 255, 0.06);
}
.ms-timeline-count {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.85);
  transform: translateY(-12px);
  font-weight: 500;
}
.ms-timeline-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}
.ms-timeline-axis span {
  flex: 1;
  text-align: center;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
}

/* ========== 动画 ========== */
.bubble-enter-active { transition: opacity 0.4s ease-out, transform 0.4s ease-out; }
.bubble-leave-active { transition: opacity 0.6s ease-in, transform 0.6s ease-in; }
.bubble-enter-from { opacity: 0; transform: translateY(8px); }
.bubble-leave-to { opacity: 0; transform: translateY(-4px); }

/* 仅过渡合成层属性，避免 animate backdrop-filter/box-shadow 触发主线程卡顿 */
.tooltip-enter-active { transition: opacity 0.3s ease-out, transform 0.3s ease-out; }
.tooltip-leave-active { transition: opacity 0.25s ease-in, transform 0.25s ease-in; }
.tooltip-enter-from { opacity: 0; transform: translateY(6px) scale(0.96); }
.tooltip-leave-to { opacity: 0; transform: translateY(-2px) scale(0.96); }

.mirror-self:focus-visible {
  outline: none;
}

.mirror-self:focus-visible .ms-orb {
  outline: 2px solid rgba(var(--accent-rgb), 0.6);
  outline-offset: 3px;
}

/* 定音锤四幕入口已并入流星（专注/情绪/笔记/回响） */

/* ---- 移动端：避让底部安全区与幕僚坞（移至左下，避免与右下浮坞碰撞） ---- */
@media (max-width: 640px) {
  .mirror-self-wrapper:not(.mirror-self--embedded):not(.mirror-self--home-centered) {
    right: auto;
    left: calc(16px + env(safe-area-inset-left, 0px));
    bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }
  .ms-restore-pill {
    right: auto;
    left: calc(16px + env(safe-area-inset-left, 0px));
    bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }
  /* 心流页珠列：豁免左下避让，保持居中珠列；偏移压缩并把珠体微缩（D7） */
  .mirror-self--home-centered {
    --column-offset: 150px;
  }
  .mirror-self--home-centered .ms-orb {
    width: 48px;
    height: 48px;
  }
}

/* ========== M6：房间切换（键盘 / 点击 替代滑动手势） ========== */
.ms-room-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ms-room-switch-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.ms-room-switch-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.16);
  border-color: rgba(var(--accent-rgb), 0.4);
  color: var(--accent);
}
.ms-room-switch-btn:disabled { opacity: 0.3; cursor: default; }
.ms-room-switch-btn:focus-visible {
  outline: 2px solid rgba(124, 108, 240, 0.6);
  outline-offset: 2px;
}

/* ========== M6：手势提示 ========== */
.ms-swipe-hint {
  margin: 8px 0 0;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  letter-spacing: 0.5px;
}

/* ========== 流星径向菜单（点珠唤起，暖琥珀） ========== */
.ms-meteor-layer {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-jade, 20) + 5);
  pointer-events: none;
}
.ms-meteor-center {
  position: absolute;
  width: 0;
  height: 0;
  transform: translate(-50%, -50%);
}
.ms-meteor-flash {
  position: absolute;
  left: -72px;
  top: -72px;
  width: 144px;
  height: 144px;
  border-radius: 50%;
  border: 1.5px solid rgba(248, 230, 198, 0.8);
  box-shadow:
    0 0 16px 3px rgba(212, 165, 116, 0.38),
    0 0 38px 10px rgba(212, 165, 116, 0.16),
    inset 0 0 14px rgba(212, 165, 116, 0.22);
  opacity: 0.9;
  animation: ms-flash-out 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  pointer-events: none;
}
@keyframes ms-flash-out {
  0% { transform: scale(0.35); opacity: 0.95; }
  100% { transform: scale(4.6); opacity: 0; }
}
.ms-meteor-ring {
  position: absolute;
  width: 0;
  height: 0;
}
.ms-meteor {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: auto;
  cursor: pointer;
  opacity: 1;
  transform: translate(var(--cx), var(--cy)) scale(1);
  animation: ms-meteor-in 0.7s cubic-bezier(0.25, 0.8, 0.4, 1) backwards;
  animation-delay: calc(var(--i) * 42ms);
  will-change: transform, opacity;
}
.ms-hit {
  position: absolute;
  left: 0;
  top: 0;
  width: 68px;
  height: 68px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  z-index: 3;
  cursor: pointer;
}
@keyframes ms-meteor-in {
  from { opacity: 0; transform: translate(var(--cx), var(--cy)) scale(0.15) rotate(-14deg); }
  55% { opacity: 1; transform: translate(var(--cx), var(--cy)) scale(1.2) rotate(5deg); }
  to { opacity: 1; transform: translate(var(--cx), var(--cy)) scale(1) rotate(0deg); }
}
.ms-meteor.fired {
  opacity: 0;
  transform: translate(0px, 0px) scale(0.2);
  transition: transform 0.55s cubic-bezier(0.45, 0, 0.55, 1), opacity 0.5s ease 0.08s;
}
.ms-comet {
  position: absolute;
  left: 0;
  top: 0;
  /* 物理浮动：上升减速(ease-out) → 落回加速(ease-in)，模拟重力抛物线轨迹 */
  animation: ms-bob var(--bobdur, 4s) infinite;
  animation-delay: var(--bobdelay, 0s);
  will-change: transform;
  pointer-events: none; /* 可见光晕/彗尾不拦截点击，全部穿透给 .ms-hit，使整颗流星可点 */
}
@keyframes ms-bob {
  0% {
    transform: translate(0, 0) rotate(0deg);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); /* 上升：减速至顶点 */
  }
  50% {
    transform: translate(var(--bobx, 3px), calc(-1 * var(--boby, 14px))) rotate(var(--bobrot, 3deg));
    animation-timing-function: cubic-bezier(0.64, 0, 0.78, 0); /* 下落：自顶点加速 */
  }
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
}
.ms-tails {
  position: absolute;
  left: -100px;
  top: -100px;
  overflow: visible;
  filter: drop-shadow(0 0 12px rgba(212, 165, 116, 0.85));
  transition: transform 0.5s ease;
  transform-origin: 100px 100px;
  pointer-events: none;
}
.ms-meteor.fired .ms-tails { transform: scale(1.18); }
.ms-sp { animation: ms-spk 3s ease-in-out infinite; }
@keyframes ms-spk {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.95; }
}
.ms-head {
  position: absolute;
  left: -10px;
  top: -10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, #fffdf8 0%, #f6e6cf 44%, #d4a574 100%);
  box-shadow: 0 0 11px rgba(255, 255, 255, 0.95), 0 0 26px rgba(212, 165, 116, 0.82), 0 0 50px rgba(180, 130, 80, 0.48);
  animation: ms-head-pulse 3.2s ease-in-out infinite;
  transition: transform 0.25s, box-shadow 0.25s;
}
.ms-head::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212, 165, 116, 0.35), transparent 70%);
  opacity: 0;
  transform: scale(1);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}
.ms-meteor:hover .ms-head::after {
  opacity: 1;
  transform: scale(1.15);
}
@keyframes ms-head-pulse {
  0%, 100% { box-shadow: 0 0 11px rgba(255, 255, 255, 0.9), 0 0 22px rgba(212, 165, 116, 0.7), 0 0 44px rgba(180, 130, 80, 0.4); }
  50% { box-shadow: 0 0 15px rgba(255, 255, 255, 1), 0 0 34px rgba(224, 184, 130, 0.95), 0 0 62px rgba(190, 140, 90, 0.6); }
}
.ms-mlabel {
  position: absolute;
  top: -12px;
  pointer-events: auto;
  padding: 3px 12px 3px 11px;
  border-radius: 999px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text-primary, #e8e0d8);
  /* 净透琉璃小件：近无色 chip 底 + 上缘反射 + 厚边环（全局「琉璃通透度」主控驱动），
     取代原先 0.93 暖黑磨砂，与幕僚球同源材质。 */
  background:
    var(--glass-clear-sheen),
    rgba(26, 24, 30, var(--glass-clear-a-chip));
  border: 1px solid var(--glass-clear-rim);
  backdrop-filter: blur(8px) saturate(1.5) brightness(1.06);
  -webkit-backdrop-filter: blur(8px) saturate(1.5) brightness(1.06);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4), 0 0 14px rgba(212, 165, 116, 0.16), inset 0 1px 0 rgba(255, 255, 255, calc(var(--glass-clear-a-sheen) * 0.6));
  transition: color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
.ms-mlabel::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
  background: #f6e6cf;
  box-shadow: 0 0 7px rgba(212, 165, 116, 0.85);
}
.ms-meteor:hover .ms-head {
  transform: scale(1.2);
  box-shadow: 0 0 17px rgba(255, 255, 255, 1), 0 0 40px rgba(224, 184, 130, 1), 0 0 66px rgba(190, 140, 90, 0.65);
}
.ms-meteor:hover .ms-mlabel {
  color: #fff;
  border-color: rgba(224, 184, 130, 0.5);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), 0 0 18px rgba(212, 165, 116, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.16);
}
.meteor-bloom,
.meteor-flash { animation: ms-bloom 0.6s ease-out; }
@keyframes ms-bloom {
  0% { transform: scale(1); filter: brightness(1); }
  45% { transform: scale(1.12); filter: brightness(1.18) drop-shadow(0 0 14px rgba(212, 165, 116, 0.7)); }
  100% { transform: scale(1); filter: brightness(1); }
}

/* 减弱动态：关闭 idle 动画，保留交互态（hover/active 由 transform 即时响应） */
@media (prefers-reduced-motion: reduce) {
  .ms-aura,
  .ms-orb-sheen::after,
  .ms-glow::after { animation: none; }
  .ms-orb-sheen::after { transform: translateX(0); }
}
</style>
