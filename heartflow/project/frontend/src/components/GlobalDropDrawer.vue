<template>
  <!-- 全局下拉抽屉：顶部左右各一个把手，任意一侧向下拉（或点击）都能唤出同一个面板。
       内容完全交给调用方的默认插槽决定；z-index / 配色统一消费项目令牌。
       与幕僚珠的流星径向菜单并存互不冲突：把手只占顶部极窄一条，且仅在把手本体接收指针事件。 -->
  <Teleport to="body">
    <button
      v-for="s in SIDES"
      :key="s"
      class="gdd-grip"
      :class="[`gdd-grip--${s}`, { 'is-hidden': open && openSide !== s }]"
      type="button"
      :aria-label="`下拉${label}（${s === 'left' ? '左' : '右'}侧把手）`"
      :aria-expanded="open"
      @pointerdown="onGripDown($event, s)"
      @pointermove="onGripMove"
      @pointerup="onGripUp"
      @pointercancel="onGripUp"
      @click="onGripClick(s)"
    >
      <span class="gdd-grip-bar" aria-hidden="true" />
    </button>

    <!-- 遮罩：仅展开后存在，点击即关（层级低于面板、高于页面内容） -->
    <div v-if="open" class="gdd-mask" @click="close(true)" />

    <Transition name="gdd">
      <div
        v-if="open"
        ref="panelRef"
        class="gdd-panel hf-glass"
        :class="`gdd-panel--${openSide}`"
        :style="{ width }"
        role="dialog"
        :aria-label="label"
        aria-modal="true"
        tabindex="-1"
      >
        <header class="gdd-head">
          <slot name="title">
            <span class="gdd-title">{{ label }}</span>
          </slot>
          <button class="gdd-close" type="button" :aria-label="`关闭${label}`" @click="close(true)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div class="gdd-body">
          <!-- 通用插槽：内容由调用方决定；缺省时给中性占位说明，不填任何演示数据 -->
          <slot>
            <p class="gdd-empty">此处内容由调用方通过默认插槽提供</p>
          </slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

type Side = 'left' | 'right'
const SIDES: readonly Side[] = ['left', 'right']

const props = withDefaults(
  defineProps<{
    /** 面板无障碍名称，同时用作缺省标题 */
    label?: string
    /** 面板宽度（任意 CSS 长度） */
    width?: string
    /** 下拉判定阈值（px）：超过即展开，否则回弹关闭 */
    threshold?: number
  }>(),
  { label: '下拉面板', width: 'min(420px, 92vw)', threshold: 80 },
)
const emit = defineEmits<{ (e: 'open'): void; (e: 'close'): void }>()

const open = ref(false)
const openSide = ref<Side>('left')
const panelRef = ref<HTMLElement | null>(null)

// ---- 拖拽状态（非响应式：每帧变化不放进 ref，避免无谓的组件更新） ----
let dragging: Side | null = null
let startY = 0
let startT = 0
let dy = 0
let moved = false
let raf = 0
let pointerId = -1
let suppressClick = false

function setOpen(next: boolean, side: Side) {
  openSide.value = side
  open.value = next
  // 分两路调用：联合类型的事件名不匹配 emit 的重载签名（TS2769）
  if (next) emit('open')
  else emit('close')
}

function close(restoreFocus = false) {
  if (!open.value) return
  setOpen(false, openSide.value)
  // 焦点回到触发侧把手，避免焦点丢失到 body
  if (restoreFocus) {
    const el = document.querySelector<HTMLElement>(`.gdd-grip--${openSide.value}`)
    el?.focus?.()
  }
}

/** 拖拽中直接改 inline transform：绕过响应式，且由 rAF 节流 */
function applyDrag(px: number) {
  const el = panelRef.value
  if (!el) return
  el.style.transition = 'none'
  el.style.transform = `translateY(calc(-100% + ${Math.max(0, px)}px))`
}
function clearDrag() {
  const el = panelRef.value
  if (!el) return
  el.style.transition = ''
  el.style.transform = ''
}

function onGripDown(e: PointerEvent, side: Side) {
  dragging = side
  startY = e.clientY
  startT = Date.now()
  dy = 0
  moved = false
  pointerId = e.pointerId
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* 捕获失败不影响点击兜底 */ }
}

function onGripMove(e: PointerEvent) {
  if (!dragging) return
  dy = e.clientY - startY
  if (!moved && Math.abs(dy) < 6) return
  moved = true
  // 首次越阈值就把面板挂出来跟手；rAF 节流，避免 pointermove 高频重排
  if (!open.value) setOpen(true, dragging)
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    applyDrag(dy)
  })
}

function onGripUp() {
  if (!dragging) return
  const side = dragging
  dragging = null
  try {
    const el = document.querySelector<HTMLElement>(`.gdd-grip--${side}`)
    if (el && pointerId >= 0) el.releasePointerCapture?.(pointerId)
  } catch { /* noop */ }
  pointerId = -1
  if (raf) { cancelAnimationFrame(raf); raf = 0 }

  const dur = Date.now() - startT
  const velocity = dur > 0 ? dy / dur : 0 // px/ms
  clearDrag()
  // 判定：拖过阈值 或 快速下甩
  if (moved && (dy >= props.threshold || velocity > 0.5)) {
    setOpen(true, side)
    suppressClick = true // 拖完那一次 click 不再当作开关，避免刚展开就被收起
  } else if (moved) {
    close(side === openSide.value)
  }
  dy = 0
}

function onGripClick(side: Side) {
  if (suppressClick) { suppressClick = false; return }
  if (open.value && openSide.value === side) close(true)
  else setOpen(true, side)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) { e.preventDefault(); close(true) }
}

// 键盘监听按需注册（菜单关闭时不占用每次按键）
watch(open, (on) => {
  if (on) {
    window.addEventListener('keydown', onKey)
    nextTick(() => panelRef.value?.focus?.())
  } else {
    window.removeEventListener('keydown', onKey)
  }
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (raf) cancelAnimationFrame(raf)
})

defineExpose({ open: () => setOpen(true, 'left'), close: () => close() })
</script>

<style scoped>
/* ---------- 把手：顶部左右各一枚细胶囊 ----------
   视觉保持纤细（4px）不压画面，但触控区撑到 28px 以满足 WCAG 2.2 SC 2.5.8（≥24×24） */
.gdd-grip {
  position: fixed;
  top: 0;
  width: 104px;
  height: 28px;
  padding: 8px 0 0;
  border: 0;
  background: transparent;
  cursor: grab;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: var(--z-floating);
  touch-action: none; /* 拖把手时不带动页面滚动 */
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.24s ease, transform 0.24s ease;
}
.gdd-grip:active { cursor: grabbing; }
.gdd-grip--left { left: 12px; }
.gdd-grip--right { right: 12px; }
/* 展开时对应侧把手：轻微上移 + 淡出，避免生硬消失 */
.gdd-grip.is-hidden { opacity: 0; transform: translateY(-6px); pointer-events: none; }

.gdd-grip-bar {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  /* 细而不扁：垂直渐变给一点厚度感，全部走 accent 令牌（外观仍由主题决定） */
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--accent) 78%, transparent) 0%,
    color-mix(in srgb, var(--accent) 34%, transparent) 100%
  );
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.28);
  transition: width 0.24s cubic-bezier(0.22, 1, 0.36, 1), background 0.24s, box-shadow 0.24s, transform 0.24s;
}
.gdd-grip:hover .gdd-grip-bar,
.gdd-grip:focus-visible .gdd-grip-bar {
  width: 64px;
  background: linear-gradient(180deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 55%, transparent) 100%);
  box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.42);
}
.gdd-grip:active .gdd-grip-bar { transform: scaleX(0.88); } /* 按压反馈：只动 transform */
.gdd-grip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 10px; }

/* ---------- 遮罩：自上而下分层渐变，暗示面板从顶部降下（不做全屏 blur，省一层重绘） ---------- */
.gdd-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer-backdrop);
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.58) 0%,
    rgba(0, 0, 0, 0.34) 45%,
    rgba(0, 0, 0, 0.28) 100%
  );
  animation: gdd-mask-in 0.24s ease-out;
}

/* ---------- 面板：玻璃质感沿用 .hf-glass 基类，此处只补布局 / 边缘质感 / 入场形式 ---------- */
.gdd-panel {
  position: fixed;
  top: 0;
  z-index: var(--z-floating);
  max-height: min(78vh, 720px);
  display: flex;
  flex-direction: column;
  border-radius: 0 0 var(--glass-radius) var(--glass-radius);
  border-top: 0; /* 让位给顶部 accent 发丝线 */
  overflow: hidden;
}
/* 顶部发丝线：品牌辨识 + 视觉上钉住「从顶部来」的方向感（伪元素避免与基类 border 打架） */
.gdd-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--accent) 65%, transparent) 22%,
    var(--accent) 50%,
    color-mix(in srgb, var(--accent) 65%, transparent) 78%,
    transparent 100%
  );
  pointer-events: none;
}
.gdd-panel--left { left: 0; }
.gdd-panel--right { right: 0; }

.gdd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  /* 8px 基线；顶部额外让出刘海安全区，避免内容被挖孔遮住 */
  padding: max(16px, env(safe-area-inset-top, 0px)) 16px 12px;
  border-bottom: 1px solid var(--glass-border-faint);
}
.gdd-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.6px;
  line-height: 1.4;
}
.gdd-close {
  flex: none;
  width: 32px; /* ≥24px 触控目标 */
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid var(--glass-border-faint);
  border-radius: var(--glass-radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s, transform 0.2s;
}
.gdd-close:hover {
  color: var(--text-primary);
  border-color: var(--glass-border-strong);
  background: var(--glass-surface);
}
.gdd-close:active { transform: scale(0.94); }
.gdd-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.gdd-close svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; fill: none; }

.gdd-body {
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain; /* 滚到底不把页面一起带着滚 */
}
/* 占位文案用 --text-secondary（≈4.9:1 达标），不用 --text-muted（≈2.5:1 不合格） */
.gdd-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* 细滚动条：与玻璃面板同调，不抢视觉 */
.gdd-body::-webkit-scrollbar { width: 6px; }
.gdd-body::-webkit-scrollbar-track { background: transparent; }
.gdd-body::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 999px; }
.gdd-body::-webkit-scrollbar-thumb:hover { background: var(--glass-border-strong); }

/* ---------- 入场/退场：sheet 风格缓动，末段明显减速，落地更稳 ---------- */
.gdd-enter-active { animation: gdd-in 0.34s cubic-bezier(0.32, 0.72, 0, 1); }
.gdd-leave-active { animation: gdd-in 0.24s cubic-bezier(0.4, 0, 1, 1) reverse; }
@keyframes gdd-in {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes gdd-mask-in { from { opacity: 0; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .gdd-enter-active, .gdd-leave-active, .gdd-mask { animation: none !important; }
  .gdd-grip, .gdd-grip-bar, .gdd-close { transition: none; }
}
</style>
