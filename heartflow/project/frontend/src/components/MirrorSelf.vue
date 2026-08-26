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
      <!-- 常驻操作钮（触屏可点，不再依赖 hover 显形）：ℹ 状态 / ✕ 隐藏 -->
      <div class="ms-actions">
        <button class="ms-info-btn" type="button" @click.stop="toggleInfoSheet" :aria-expanded="showInfoSheet" :title="showInfoSheet ? '收起状态' : '查看状态'" aria-label="查看幕僚状态">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="11" x2="12" y2="16.5" />
            <circle cx="12" cy="8" r="0.7" class="ms-info-dot" />
          </svg>
        </button>
        <button class="ms-hide-btn" type="button" @click.stop="hideBead" aria-label="隐藏幕僚" title="隐藏幕僚">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- 载体光点 -->
      <button
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
        <div class="ms-orb" :class="[orbState, `mood-${orbMood}`, `form-${form}`, { active: !!advisor.currentBubble || showDialogue }]">
          <div class="ms-aura" />
          <div class="ms-ring" />
          <img v-if="carrierImage" class="ms-img" :src="carrierImage" alt="" />
          <div v-else-if="form === 'orb'" class="ms-core" />
          <svg v-else class="ms-shape" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
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
        </div>

        <!-- 名称 + 时段标签 -->
        <span class="ms-name">{{ displayName }}</span>
        <span class="ms-time-badge">{{ timeLabel }}</span>
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
          <p class="ms-swipe-hint">点 ⓘ 看状态 · 按住拖动重定位 · 单击唤对话</p>
        </div>
      </Transition>

      <!-- 定音锤四幕入口 -->
      <button
        v-if="!showDialogue"
        class="dingyin-entry-btn"
        @click="openFourActs"
        title="定音锤四幕"
      >
        <svg class="dingyin-entry-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M9 3v5h5" />
        </svg>
        <span class="dingyin-entry-label">四幕</span>
      </button>

      <!-- 幕僚对话面板 -->
      <MirrorDialogue :visible="showDialogue" :active-room-id="activeRoomId" @close="showDialogue = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdvisor } from '../resonance/bridges/advisor'
import { useTimer } from '../resonance/bridges/timer'
import { storage } from '../engine/storage'
import { FloatAnchor, FloatPos, ZERO_SAFE, floatPosToPx, pxToFloatPos } from '../utils/float-pos'
import { HOME_ROOMS } from '../modules/home/rooms'
import { carrierIsImage } from '../types/advisor'
import type { AdvisorCarrierGeometry, AdvisorProfile } from '../types/advisor'
import MirrorDialogue from './MirrorDialogue.vue'

const router = useRouter()
const route = useRoute()
const advisor = useAdvisor()
const timer = useTimer()

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

// 左滑切房间：向上转发新房间 id（Home 经 AdvisorDock v-model 接住并切换当前房间）
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
  toggleDialogue()
}
// 触屏不再依赖 hover 显形：状态面板改由 ℹ 按钮点击切换（T3）

// 门厅态定位：玉珠光球锚定到屏风计时器旁（固定屏位，不随背景转动）
// centered（宅院壳激活）：玉珠居中悬浮（中央留白给幕僚）
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
    const px = floatPosToPx(dragPos.value, { w: 54, h: 54 }, ZERO_SAFE, window.innerWidth, window.innerHeight)
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

/** 时段标签 */
const timeLabel = computed(() => {
  if (hour >= 5 && hour < 12) return '晨'
  if (hour >= 12 && hour < 14) return '午'
  if (hour >= 14 && hour < 18) return '昼'
  if (hour >= 18 && hour < 22) return '暮'
  return '夜'
})

/** 光球状态：根据时段变换颜色 */
const orbState = computed(() => {
  if (hour >= 5 && hour < 8) return 'orb-dawn'
  if (hour >= 8 && hour < 17) return 'orb-day'
  if (hour >= 17 && hour < 20) return 'orb-dusk'
  return 'orb-night'
})

/** 玉珠生命态拟态（M5）：专注→稳定微光 / 忙碌→核心加速搏动 / 安睡→灰度下沉 / 常态→呼吸 */
const orbMood = computed<'idle' | 'focus' | 'busy' | 'asleep'>(() => {
  if (timer.isFocusing) return 'focus'
  if (showDialogue.value || advisor.currentBubble) return 'busy'
  if (hour >= 22 || hour < 6) return 'asleep'
  return 'idle'
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

function openFourActs() {
  router.push('/dingyin-four-acts')
}
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

/* ========== 载体光点（幕僚 · 玉珠拟态 + 多形态） ==========
   官方抽象几何形态：玉珠 orb / 晶簇 crystal / 焰 flame / 种 seed（蓝图16「载体几何」）。
   珠子实时反映主陪伴幕僚在「幕僚设置」里设定的几何；用户导入图片则直接呈现 img。 */
.ms-orb {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  transition: transform 0.3s ease, filter 0.3s ease, box-shadow 0.3s ease;
  background:
    radial-gradient(circle at 38% 32%, rgba(255, 255, 255, 0.55), rgba(210, 224, 245, 0.12) 46%, rgba(150, 172, 210, 0.05) 70%),
    radial-gradient(circle at 50% 60%, rgba(170, 196, 230, 0.18), transparent 72%);
  border: 1px solid rgba(205, 220, 245, 0.28);
  box-shadow:
    inset 0 1px 6px rgba(255, 255, 255, 0.35),
    inset 0 -6px 12px rgba(90, 120, 170, 0.18),
    0 0 18px rgba(170, 196, 230, 0.22);
  backdrop-filter: blur(10px);
}

/* 嵌入幕僚坞时稍收，避免挤压坞身 */
.mirror-self--embedded .ms-orb {
  width: 46px;
  height: 46px;
}

/* 时段微差：仅以极淡外晕色相区分晨/昼/暮/夜，保持玉质统一不脏 */
.orb-dawn { box-shadow: inset 0 1px 6px rgba(255, 255, 255, 0.35), inset 0 -6px 12px rgba(220, 175, 120, 0.16), 0 0 18px rgba(255, 205, 150, 0.2); }
.orb-day { box-shadow: inset 0 1px 6px rgba(255, 255, 255, 0.4), inset 0 -6px 12px rgba(120, 160, 210, 0.16), 0 0 18px rgba(190, 215, 245, 0.22); }
.orb-dusk { box-shadow: inset 0 1px 6px rgba(255, 255, 255, 0.32), inset 0 -6px 12px rgba(200, 130, 90, 0.16), 0 0 18px rgba(255, 170, 120, 0.2); }
.orb-night { box-shadow: inset 0 1px 6px rgba(220, 230, 255, 0.3), inset 0 -6px 12px rgba(90, 110, 180, 0.2), 0 0 18px rgba(150, 170, 230, 0.26); }

.mirror-self:hover .ms-orb {
  transform: scale(1.08);
  filter: brightness(1.08);
}

.mirror-self:active .ms-orb {
  transform: scale(0.96);
}

.mirror-self--active .ms-orb {
  transform: scale(1.05);
  filter: brightness(1.12);
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
  fill: rgba(205, 224, 248, 0.85);
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

/* 清透玉白核：取代原棕色脏渐变（玉珠态） */
.ms-core {
  position: absolute;
  inset: 29%;
  border-radius: 50%;
  background: radial-gradient(circle at 44% 38%, rgba(255, 255, 255, 0.92), rgba(200, 220, 245, 0.5) 60%, rgba(150, 175, 215, 0.25));
  animation: core-breathe 4.4s ease-in-out infinite;
  box-shadow: 0 0 14px rgba(205, 222, 248, 0.5);
}

@keyframes core-breathe {
  0%, 100% { transform: scale(0.86); opacity: 0.85; }
  50% { transform: scale(1.12); opacity: 1; }
}

/* 外柔光晕：极淡月华 */
.ms-aura {
  position: absolute;
  inset: -42%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(185, 208, 240, 0.1), transparent 68%);
  animation: aura-pulse 6s ease-in-out infinite;
  pointer-events: none;
}

/* 内描金细环：玉珠轮廓微光 */
.ms-ring {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 0 8px rgba(200, 220, 250, 0.12) inset;
}

@keyframes aura-pulse {
  0%, 100% { transform: scale(0.78); opacity: 0.4; }
  50% { transform: scale(1.15); opacity: 0.72; }
}

/* ========== 玉珠生命态拟态（M5） ========== */
/* 专注：稳定冷光，核心缓慢而明亮地呼吸 */
.mood-focus .ms-core {
  animation: core-steady 3.8s ease-in-out infinite;
  background: radial-gradient(circle at 44% 38%, rgba(235, 244, 255, 0.95), rgba(160, 196, 238, 0.55) 60%, rgba(120, 160, 220, 0.3));
  box-shadow: 0 0 22px rgba(165, 205, 255, 0.45);
}
.mood-focus .ms-shape-fill { fill: rgba(235, 244, 255, 0.95); }
.mood-focus .ms-aura {
  animation: aura-pulse 8s ease-in-out infinite;
  opacity: 0.6;
}
@keyframes core-steady {
  0%, 100% { transform: scale(0.92); }
  50% { transform: scale(1.08); }
}

/* 忙碌：核心加速搏动，暖玉光 */
.mood-busy .ms-core {
  animation: core-breathe 1.7s ease-in-out infinite;
  background: radial-gradient(circle at 44% 38%, rgba(255, 246, 230, 0.95), rgba(240, 200, 155, 0.55) 60%, rgba(210, 160, 110, 0.3));
  box-shadow: 0 0 22px rgba(255, 205, 155, 0.42);
}
.mood-busy .ms-shape-fill { fill: rgba(255, 246, 230, 0.95); }
.mood-busy .ms-aura {
  animation: aura-pulse 3s ease-in-out infinite;
}

/* 安睡：灰度下沉，缓慢沉降，冷月光 */
.mood-asleep {
  filter: grayscale(0.55) brightness(0.72);
}
.mood-asleep .ms-core {
  animation: core-sink 6.5s ease-in-out infinite;
  background: radial-gradient(circle at 44% 38%, rgba(225, 232, 248, 0.8), rgba(160, 178, 215, 0.45) 60%, rgba(120, 140, 185, 0.25));
  box-shadow: 0 0 12px rgba(160, 175, 215, 0.3);
}
.mood-asleep .ms-shape { filter: grayscale(0.55) brightness(0.72) drop-shadow(0 0 6px rgba(190, 214, 245, 0.5)); }
.mood-asleep .ms-aura {
  animation: aura-pulse 10s ease-in-out infinite;
  opacity: 0.3;
}
@keyframes core-sink {
  0%, 100% { transform: translateY(0) scale(0.84); }
  50% { transform: translateY(2px) scale(0.88); }
}

@media (prefers-reduced-motion: reduce) {
  .mood-focus .ms-core,
  .mood-busy .ms-core,
  .mood-asleep .ms-core,
  .mood-focus .ms-aura,
  .mood-busy .ms-aura,
  .mood-asleep .ms-aura,
  .ms-core,
  .ms-aura { animation: none; }
}

/* ========== 名称 + 时段标签 ========== */
.ms-name {
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.55);
  transition: color 0.3s;
}
.mirror-self:hover .ms-name {
  color: rgba(255, 255, 255, 0.8);
}
.ms-time-badge {
  font-size: 8px;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.25);
  transition: color 0.3s;
}
.mirror-self:hover .ms-time-badge {
  color: rgba(255, 255, 255, 0.5);
}

/* ========== 常驻操作钮（ℹ 状态 / ✕ 隐藏，触屏可点） ========== */
.ms-actions {
  position: absolute;
  top: -8px;
  right: -6px;
  display: flex;
  gap: 4px;
  z-index: 3;
}
.ms-info-btn,
.ms-hide-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(14, 16, 24, 0.9);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.ms-info-btn:hover,
.ms-hide-btn:hover,
.ms-info-btn:focus-visible,
.ms-hide-btn:focus-visible {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(20, 24, 34, 0.95);
}
.ms-info-btn svg,
.ms-hide-btn svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.ms-info-dot { fill: currentColor; stroke: none; }
/* 展开态高亮 ℹ 按钮 */
.ms-info-btn[aria-expanded='true'] { color: var(--accent, #fff); border-color: rgba(var(--accent-rgb), 0.5); }
.mirror-self--embedded .ms-actions { display: none; }

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
  background: rgba(14, 16, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
  min-width: 180px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
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
  color: rgba(255, 255, 255, 0.35);
  min-width: 32px;
  text-align: right;
}

/* ========== M6：今日专注时段迷你时间轴 ========== */
.ms-timeline {
  margin-top: 8px;
}
.ms-timeline-title {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
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
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5px;
}

/* ========== 动画 ========== */
.bubble-enter-active { transition: all 0.4s ease-out; }
.bubble-leave-active { transition: all 0.6s ease-in; }
.bubble-enter-from { opacity: 0; transform: translateY(8px); }
.bubble-leave-to { opacity: 0; transform: translateY(-4px); }

.tooltip-enter-active { transition: all 0.3s ease-out; }
.tooltip-leave-active { transition: all 0.25s ease-in; }
.tooltip-enter-from { opacity: 0; transform: translateY(6px) scale(0.96); }
.tooltip-leave-to { opacity: 0; transform: translateY(-2px) scale(0.96); }

.mirror-self:focus-visible {
  outline: none;
}

.mirror-self:focus-visible .ms-orb {
  box-shadow: 0 0 0 4px rgba(124, 108, 240, 0.18), 0 0 0 1px rgba(124, 108, 240, 0.3) inset;
}

/* ========== 定音锤四幕入口 ========== */
.dingyin-entry-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 20px;
  background: rgba(var(--accent-rgb), 0.04);
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 10px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}
.dingyin-entry-btn:hover {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}
.dingyin-entry-icon { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linejoin: round; }
.dingyin-entry-label { font-weight: 500; }
.dingyin-entry-btn:focus-visible {
  outline: 2px solid rgba(124, 108, 240, 0.6);
  outline-offset: 2px;
}

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
  color: rgba(255, 255, 255, 0.32);
  text-align: center;
  letter-spacing: 0.5px;
}
</style>
