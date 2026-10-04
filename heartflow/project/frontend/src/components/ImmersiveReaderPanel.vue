<template>
  <section
    class="ird-panel"
    :class="{ 'is-fullscreen': fullscreen }"
    :style="themeVars"
    aria-label="沉浸阅读器"
    @keydown="onKeydown"
  >
    <!-- 顶部控制条：常驻时钟 + 书名/剩余 + 电量/模式/沉浸 -->
    <div class="ird-bar">
      <div class="ird-bar-title">
        <span class="ird-clock" title="当前时间">{{ clockLabel }}</span>
        <span class="ird-title">{{ title }}</span>
        <span class="ird-remain">{{ remainingLabel }}</span>
      </div>
      <div class="ird-bar-tools">
        <span v-if="batteryLabel" class="ird-battery" title="设备电量">{{ batteryLabel }}</span>
        <div class="ird-modes" role="group" aria-label="阅读模式">
          <button
            class="ird-mode"
            :class="{ active: prefs.mode === 'paged' }"
            @click="setMode('paged')"
          >翻页</button>
          <button
            class="ird-mode"
            :class="{ active: prefs.mode === 'scroll' }"
            @click="setMode('scroll')"
          >滚动</button>
        </div>
        <button
          v-if="hasAnnotations"
          class="ird-icon-btn ird-export-btn"
          title="导出划线 / 想法（本地 Markdown）"
          @click="emit('export-annotations')"
        >导出</button>
        <button
          class="ird-icon-btn"
          :title="fullscreen ? '退出沉浸' : '沉浸全屏'"
          @click="fullscreen = !fullscreen"
        >{{ fullscreen ? '退出' : '沉浸' }}</button>
      </div>
    </div>

    <!-- 主题色盘 + 字号 / 行高 -->
    <div class="ird-settings">
      <div class="ird-themes" role="group" aria-label="背景主题">
        <button
          v-for="t in READER_THEMES"
          :key="t.id"
          class="ird-theme-swatch"
          :class="{ active: prefs.themeId === t.id }"
          :style="{ background: t.bg, borderColor: t.accent }"
          :title="t.label"
          @click="setPref('themeId', t.id)"
        ><span class="ird-theme-dot" :style="{ background: t.text }"></span></button>
      </div>
      <div class="ird-steppers">
        <div class="ird-stepper">
          <button class="ird-step" @click="bumpFont(-1)">A−</button>
          <span class="ird-step-val">{{ prefs.fontSize }}px</span>
          <button class="ird-step" @click="bumpFont(1)">A+</button>
        </div>
        <div class="ird-stepper">
          <button class="ird-step" @click="bumpLine(-0.1)">行−</button>
          <span class="ird-step-val">{{ prefs.lineHeight.toFixed(1) }}</span>
          <button class="ird-step" @click="bumpLine(0.1)">行+</button>
        </div>
        <button class="ird-reset" title="恢复默认" @click="reset">重置</button>
      </div>
    </div>

    <!-- 阅读面 -->
    <div
      ref="scrollerRef"
      class="ird-surface"
      :class="`mode-${prefs.mode}`"
      :style="{ fontSize: prefs.fontSize + 'px', lineHeight: prefs.lineHeight }"
      tabindex="0"
      @mouseup="emit('text-select')"
      @scroll="onScroll"
    >
      <!-- 翻页动画容器：翻页模式下按页重建以触发方向动画 -->
      <div class="ird-page" :class="turnClass" :key="pageKey">
        <div v-for="item in visibleParagraphs" :key="item.idx" class="ird-para-block">
          <p
            class="ird-paragraph"
            :class="{ highlighted: marks.has(item.idx) }"
            :style="marks.has(item.idx) ? { '--ird-mark': marks.get(item.idx) } : undefined"
            @click="onParagraphClick(item.idx, item.text)"
          >{{ item.text }}</p>
          <!-- 段末批注角标 + 边距想法气泡（INCR-523） -->
          <div v-if="annotFor(item.idx)" class="ird-annot">
            <button
              class="ird-annot-badge"
              :class="{ 'has-thoughts': hasThoughts(item.idx) }"
              type="button"
              :title="badgeTitle(item.idx)"
              @click="toggleAnnot(item.idx)"
            >{{ badgeLabel(item.idx) }}</button>
            <button
              v-if="bubbleText(item.idx)"
              class="ird-thought-bubble"
              type="button"
              :title="bubbleText(item.idx)"
              @click="toggleAnnot(item.idx)"
            >{{ bubbleText(item.idx) }}</button>
          </div>
          <div v-if="openAnnot === item.idx" class="ird-annot-pop">
            <div v-for="ex in annotHighlights(item.idx)" :key="ex.id" class="ird-annot-item">
              <div class="ird-annot-quote">{{ ex.text }}</div>
              <div v-if="ex.note" class="ird-annot-note">{{ ex.note }}</div>
            </div>
          </div>
        </div>
        <div v-if="!visibleParagraphs.length" class="ird-empty">暂无正文</div>
      </div>
      <!-- 翻页模式：左右点击热区（不遮挡中段摘录点击） -->
      <template v-if="prefs.mode === 'paged'">
        <button
          class="ird-hotzone ird-hotzone-prev"
          :disabled="currentPage <= 0"
          aria-label="上一页"
          title="上一页"
          @click="goPage(-1)"
        ><svg class="ird-hotzone-glyph" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
        <button
          class="ird-hotzone ird-hotzone-next"
          :disabled="currentPage >= totalPages - 1"
          aria-label="下一页"
          title="下一页"
          @click="goPage(1)"
        ><svg class="ird-hotzone-glyph" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
      </template>
    </div>

    <!-- 底部：进度 + 翻页 -->
    <div class="ird-footer">
      <div
        class="ird-progress"
        role="progressbar"
        :aria-valuenow="Math.round(progress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="ird-progress-fill" :style="{ width: progress * 100 + '%' }"></div>
      </div>
      <div class="ird-footer-row">
        <button
          v-if="prefs.mode === 'paged'"
          class="ird-nav"
          :disabled="currentPage <= 0"
          @click="goPage(-1)"
        >上一页</button>
        <span class="ird-indicator">{{ pageIndicator }}</span>
        <button
          v-if="prefs.mode === 'paged'"
          class="ird-nav"
          :disabled="currentPage >= totalPages - 1"
          @click="goPage(1)"
        >下一页</button>
      </div>
      <p v-if="prefs.mode === 'paged'" class="ird-hint">两侧点击或 ← → 翻页 · 空格下一页</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  useImmersiveReader,
  READER_THEMES,
  charsPerPageFor,
  countChars,
  paginateParagraphs,
  pageForParagraph,
  pageProgress,
  estimateRemainingMinutes,
  formatRemaining,
  clampFontSize,
  clampLineHeight,
} from '../modules/reading/immersive-reader'
import type { ReaderMode } from '../modules/reading/immersive-reader'
import type { ParagraphAnnotation } from '../modules/reading/annotation-layer'
import type { Excerpt } from '../modules/reading/reading-content'

const props = withDefaults(
  defineProps<{
    paragraphs: string[]
    /** 段落下标 → 标记色（已摘录段落高亮） */
    marks?: Map<number, string>
    /** 段落批注层：段落下标 → 划线/想法聚合（INCR-523） */
    annotations?: Map<number, ParagraphAnnotation>
    /** 打开书籍时的续读段落 */
    resumeIndex?: number
    /** 续读触发令牌：每次打开书籍自增，用于强制重新定位（同一书重复打开也生效） */
    resumeToken?: number
    title?: string
  }>(),
  {
    marks: () => new Map<number, string>(),
    annotations: () => new Map<number, ParagraphAnnotation>(),
    resumeIndex: 0,
    resumeToken: 0,
    title: '阅读',
  },
)

const emit = defineEmits<{
  (e: 'paragraph-click', idx: number, text: string): void
  (e: 'text-select'): void
  (e: 'progress', paragraphIndex: number): void
  (e: 'export-annotations'): void
}>()

const { prefs, theme, setPref, reset } = useImmersiveReader()

const fullscreen = ref(false)
const currentPage = ref(0)
const scrollerRef = ref<HTMLElement | null>(null)

// 翻页方向（驱动仿真翻页动画）
const turnDir = ref<'next' | 'prev'>('next')

// 展开的段落批注（段落下标；null 表示未展开）
const openAnnot = ref<number | null>(null)

// ---- 常驻时间 / 电量（沉浸态状态栏，电量 API 缺失则静默降级） ----
interface BatteryLike {
  level: number
  charging: boolean
  addEventListener?: (type: string, listener: () => void) => void
}
interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryLike>
}

const nowTick = ref(Date.now())
let clockTimer: number | undefined
const batteryLevel = ref<number | null>(null)
const batteryCharging = ref(false)

const themeVars = computed(() => ({
  '--ird-bg': theme.value.bg,
  '--ird-text': theme.value.text,
  '--ird-muted': theme.value.muted,
  '--ird-accent': theme.value.accent,
}))

const charsPerPage = computed(() => charsPerPageFor(prefs.value.fontSize))
const pages = computed(() => paginateParagraphs(props.paragraphs, charsPerPage.value))
const totalPages = computed(() => pages.value.length)
const progress = computed(() => pageProgress(currentPage.value, totalPages.value))
const pageInfo = computed(() => pages.value[currentPage.value] ?? null)

const visibleParagraphs = computed<{ text: string; idx: number }[]>(() => {
  if (prefs.value.mode === 'scroll') {
    return props.paragraphs.map((text, idx) => ({ text, idx }))
  }
  const p = pageInfo.value
  if (!p) return []
  const out: { text: string; idx: number }[] = []
  for (let i = p.paraStart; i < p.paraEnd; i++) out.push({ text: props.paragraphs[i], idx: i })
  return out
})

// ---- 段落批注（划线 / 想法聚合，INCR-523）----
const annotations = computed(() => props.annotations ?? new Map<number, ParagraphAnnotation>())
const hasAnnotations = computed(() => annotations.value.size > 0)

function annotFor(idx: number): ParagraphAnnotation | undefined {
  return annotations.value.get(idx)
}
function hasThoughts(idx: number): boolean {
  return (annotFor(idx)?.thoughts.length ?? 0) > 0
}
function badgeLabel(idx: number): string {
  const ann = annotFor(idx)
  if (!ann) return ''
  const parts: string[] = []
  if (ann.highlights.length) parts.push(`${ann.highlights.length} 条划线`)
  if (ann.thoughts.length) parts.push(`${ann.thoughts.length} 条想法`)
  return parts.join(' · ')
}
function badgeTitle(idx: number): string {
  return `${badgeLabel(idx)}（点击查看）`
}
function bubbleText(idx: number): string {
  const ann = annotFor(idx)
  if (!ann || !ann.thoughts.length) return ''
  return (ann.thoughts[0].note || '').trim()
}
function annotHighlights(idx: number): Excerpt[] {
  return annotFor(idx)?.highlights ?? []
}
function toggleAnnot(idx: number): void {
  openAnnot.value = openAnnot.value === idx ? null : idx
}

const totalChars = computed(() => props.paragraphs.reduce((sum, t) => sum + countChars(t), 0))
const charsBefore = computed(() => {
  const p = pageInfo.value
  if (!p) return 0
  let sum = 0
  for (let i = 0; i < p.paraStart; i++) sum += countChars(props.paragraphs[i])
  return sum
})
const remainingMinutes = computed(() =>
  estimateRemainingMinutes(totalChars.value - charsBefore.value, prefs.value.charsPerMinute),
)
const remainingLabel = computed(() => formatRemaining(remainingMinutes.value))
const pageIndicator = computed(() =>
  prefs.value.mode === 'paged'
    ? `${Math.min(currentPage.value + 1, Math.max(totalPages.value, 1))} / ${Math.max(totalPages.value, 1)}`
    : `${Math.round(progress.value * 100)}%`,
)

// 翻页容器 key：翻页模式按「页 + 字号」重建以重放动画；滚动模式保持稳定 key（避免重建丢滚动位置）
const pageKey = computed(() =>
  prefs.value.mode === 'paged'
    ? `paged:${currentPage.value}:${prefs.value.fontSize}`
    : 'scroll',
)
const turnClass = computed(() =>
  prefs.value.mode === 'paged' ? `ird-turn-${turnDir.value}` : '',
)

const clockLabel = computed(() => {
  const d = new Date(nowTick.value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
})
const batteryLabel = computed(() => {
  if (batteryLevel.value === null) return ''
  const pct = Math.round(batteryLevel.value * 100)
  return batteryCharging.value ? `充电 ${pct}%` : `${pct}%`
})

function loadBattery(): void {
  const nav = navigator as NavigatorWithBattery
  if (typeof nav.getBattery !== 'function') return
  nav
    .getBattery()
    .then((b) => {
      batteryLevel.value = typeof b.level === 'number' ? b.level : null
      batteryCharging.value = !!b.charging
      b.addEventListener?.('levelchange', () => {
        batteryLevel.value = typeof b.level === 'number' ? b.level : null
      })
      b.addEventListener?.('chargingchange', () => {
        batteryCharging.value = !!b.charging
      })
    })
    .catch(() => {
      /* 电量 API 不可用：静默降级，不显示电量 */
    })
}

// 字号变化导致总页数收缩时，夹取当前页，避免落到空白页
watch(totalPages, (n) => {
  if (currentPage.value > n - 1) currentPage.value = Math.max(0, n - 1)
})

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

function onKeydown(e: KeyboardEvent): void {
  if (isEditableTarget(e.target)) return
  if (e.key === 'Escape' && fullscreen.value) {
    fullscreen.value = false
    return
  }
  if (e.key === '=' || e.key === '+') {
    e.preventDefault()
    bumpFont(1)
    return
  }
  if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    bumpFont(-1)
    return
  }
  if (e.key === ']') {
    e.preventDefault()
    bumpLine(0.1)
    return
  }
  if (e.key === '[') {
    e.preventDefault()
    bumpLine(-0.1)
    return
  }
  // 翻页键仅在翻页模式接管；滚动模式放行默认滚动
  if (prefs.value.mode !== 'paged') return
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault()
    goPage(-1)
  } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
    e.preventDefault()
    goPage(1)
  }
}

function scrollSurfaceTop(): void {
  if (scrollerRef.value) scrollerRef.value.scrollTop = 0
}

function scrollToParagraph(idx: number): void {
  const scroller = scrollerRef.value
  if (!scroller) return
  const ps = scroller.querySelectorAll('p')
  const target = ps[idx] as HTMLElement | undefined
  if (target) scroller.scrollTop = target.offsetTop
}

function goPage(delta: number): void {
  const next = currentPage.value + delta
  if (next < 0 || next >= totalPages.value) return
  turnDir.value = delta >= 0 ? 'next' : 'prev'
  currentPage.value = next
  openAnnot.value = null
  scrollSurfaceTop()
  emit('progress', pageInfo.value?.paraStart ?? 0)
}

function setMode(mode: ReaderMode): void {
  if (mode === prefs.value.mode) return
  const anchor = pageInfo.value?.paraStart ?? 0
  turnDir.value = 'next'
  setPref('mode', mode)
  nextTick(() => {
    if (mode === 'paged') {
      currentPage.value = pageForParagraph(pages.value, anchor)
      scrollSurfaceTop()
    } else {
      scrollToParagraph(anchor)
    }
  })
}

function bumpFont(delta: number): void {
  setPref('fontSize', clampFontSize(prefs.value.fontSize + delta))
}

function bumpLine(delta: number): void {
  setPref('lineHeight', clampLineHeight(prefs.value.lineHeight + delta))
}

function onScroll(): void {
  if (prefs.value.mode !== 'scroll' || !scrollerRef.value) return
  const scroller = scrollerRef.value
  const ps = scroller.querySelectorAll('p')
  let idx = 0
  for (let i = 0; i < ps.length; i++) {
    if ((ps[i] as HTMLElement).offsetTop - scroller.scrollTop <= 4) idx = i
    else break
  }
  currentPage.value = pageForParagraph(pages.value, idx)
  emit('progress', idx)
}

function onParagraphClick(idx: number, text: string): void {
  emit('paragraph-click', idx, text)
}

function applyResume(): void {
  const idx = props.resumeIndex
  if (!idx || idx <= 0) return
  if (prefs.value.mode === 'paged') {
    currentPage.value = pageForParagraph(pages.value, idx)
    scrollSurfaceTop()
  } else {
    scrollToParagraph(idx)
  }
}

// 正文更换 → 回到首页并尝试续读定位
watch(
  () => props.paragraphs,
  () => {
    currentPage.value = 0
    nextTick(applyResume)
  },
)
watch(() => props.resumeIndex, () => nextTick(applyResume))
watch(() => props.resumeToken, () => nextTick(applyResume))
onMounted(() => {
  applyResume()
  clockTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 30_000)
  loadBattery()
})
onBeforeUnmount(() => {
  if (clockTimer !== undefined) window.clearInterval(clockTimer)
})
</script>

<style scoped>
.ird-panel {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--ird-bg, #f7f5ef);
  color: var(--ird-text, #2f2a24);
  overflow: hidden;
  transition: background 0.25s, color 0.25s;
}

.ird-panel.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 90;
  border-radius: 0;
  border: none;
}

/* ---- 顶部控制条 ---- */
.ird-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--ird-text, #2f2a24) 10%, transparent);
  flex-wrap: nowrap;
}

.ird-bar-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.ird-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ird-text, #2f2a24);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 0 1 auto;
}

.ird-clock {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  color: var(--ird-muted, #8a8375);
  white-space: nowrap;
}

.ird-remain {
  font-size: 11px;
  color: var(--ird-muted, #8a8375);
  white-space: nowrap;
}

.ird-bar-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.ird-battery {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--ird-muted, #8a8375);
  white-space: nowrap;
}

.ird-modes {
  display: flex;
  border-radius: 8px;
  padding: 2px;
  background: color-mix(in srgb, var(--ird-text, #2f2a24) 8%, transparent);
}

.ird-mode {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ird-muted, #8a8375);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ird-mode.active {
  background: var(--ird-bg, #f7f5ef);
  color: var(--ird-accent, #c46a5a);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.ird-icon-btn {
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--ird-text, #2f2a24) 16%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--ird-text, #2f2a24);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ird-icon-btn:hover {
  border-color: var(--ird-accent, #c46a5a);
  color: var(--ird-accent, #c46a5a);
}

.ird-export-btn {
  border-color: color-mix(in srgb, var(--ird-accent, #c46a5a) 40%, transparent);
  color: var(--ird-accent, #c46a5a);
}

/* ---- 设置行 ---- */
.ird-settings {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--ird-text, #2f2a24) 8%, transparent);
  flex-wrap: wrap;
}

.ird-themes {
  display: flex;
  gap: 8px;
}

.ird-theme-swatch {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}

.ird-theme-swatch:hover {
  transform: scale(1.1);
}

.ird-theme-swatch.active {
  box-shadow: 0 0 0 2px var(--ird-accent, #c46a5a);
}

.ird-theme-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ird-steppers {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ird-stepper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ird-step {
  padding: 3px 9px;
  border: 1px solid color-mix(in srgb, var(--ird-text, #2f2a24) 16%, transparent);
  border-radius: 6px;
  background: transparent;
  color: var(--ird-text, #2f2a24);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ird-step:hover {
  border-color: var(--ird-accent, #c46a5a);
  color: var(--ird-accent, #c46a5a);
}

.ird-step-val {
  font-size: 11px;
  color: var(--ird-muted, #8a8375);
  min-width: 34px;
  text-align: center;
}

.ird-reset {
  padding: 3px 10px;
  border: none;
  background: transparent;
  color: var(--ird-muted, #8a8375);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

.ird-reset:hover {
  color: var(--ird-accent, #c46a5a);
}

/* ---- 阅读面 ---- */
.ird-surface {
  position: relative;
  padding: 22px 20px;
  max-height: 62vh;
  overflow-y: auto;
  user-select: text;
  color: var(--ird-text, #2f2a24);
}

.ird-surface.mode-paged {
  overflow: hidden;
  perspective: 1400px;
}

.ird-surface:focus {
  outline: none;
}

.ird-surface:focus-visible {
  outline: 2px solid var(--ird-accent, #c46a5a);
  outline-offset: -2px;
}

/* ---- 仿真翻页动画（方向感知 slide + 轻微翻卷） ---- */
.ird-page {
  animation-duration: 0.32s;
  animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  animation-fill-mode: both;
}

.ird-page.ird-turn-next {
  animation-name: ird-turn-next;
}

.ird-page.ird-turn-prev {
  animation-name: ird-turn-prev;
}

@keyframes ird-turn-next {
  from {
    opacity: 0;
    transform: translateX(18px) rotateY(-4deg);
  }
  to {
    opacity: 1;
    transform: translateX(0) rotateY(0);
  }
}

@keyframes ird-turn-prev {
  from {
    opacity: 0;
    transform: translateX(-18px) rotateY(4deg);
  }
  to {
    opacity: 1;
    transform: translateX(0) rotateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ird-page {
    animation: none;
  }
}

/* ---- 左右点击热区（翻页模式） ---- */
.ird-hotzone {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 11%;
  min-width: 34px;
  max-width: 64px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ird-muted, #8a8375);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s, color 0.2s;
}

.ird-hotzone-prev {
  left: 0;
}

.ird-hotzone-next {
  right: 0;
}

.ird-hotzone:hover:not(:disabled) {
  opacity: 1;
  color: var(--ird-accent, #c46a5a);
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--ird-accent, #c46a5a) 12%, transparent),
    transparent
  );
}

.ird-hotzone-next:hover:not(:disabled) {
  background: linear-gradient(
    to left,
    color-mix(in srgb, var(--ird-accent, #c46a5a) 12%, transparent),
    transparent
  );
}

.ird-hotzone:disabled {
  cursor: default;
}

.ird-hotzone-glyph {
  pointer-events: none;
}

.ird-panel.is-fullscreen .ird-surface {
  flex: 1;
  max-height: none;
}

.ird-paragraph {
  margin: 0 0 1.1em 0;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.ird-paragraph:hover {
  background: color-mix(in srgb, var(--ird-accent, #c46a5a) 8%, transparent);
}

.ird-paragraph.highlighted {
  background: color-mix(in srgb, var(--ird-mark, #c46a5a) 18%, transparent);
  border-left: 3px solid var(--ird-mark, #c46a5a);
  padding-left: 5px;
}

/* ---- 段落批注（划线 / 想法，INCR-523） ---- */
.ird-para-block {
  position: relative;
}

.ird-annot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -0.6em 0 1.1em;
  padding-left: 8px;
  flex-wrap: wrap;
}

.ird-annot-badge {
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px dashed color-mix(in srgb, var(--ird-text, #2f2a24) 28%, transparent);
  background: transparent;
  color: var(--ird-muted, #8a8375);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ird-annot-badge:hover,
.ird-annot-badge.has-thoughts {
  border-style: solid;
  border-color: var(--ird-accent, #c46a5a);
  color: var(--ird-accent, #c46a5a);
}

/* 边距想法气泡：贴合右侧页边距的第一条想法预览 */
.ird-thought-bubble {
  max-width: 62%;
  padding: 3px 11px;
  border-radius: 12px 12px 12px 3px;
  border: 1px solid color-mix(in srgb, var(--ird-accent, #c46a5a) 24%, transparent);
  background: color-mix(in srgb, var(--ird-accent, #c46a5a) 10%, transparent);
  color: var(--ird-text, #2f2a24);
  font-size: 11px;
  font-family: inherit;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background 0.2s;
}

.ird-thought-bubble:hover {
  background: color-mix(in srgb, var(--ird-accent, #c46a5a) 18%, transparent);
}

.ird-annot-pop {
  margin: 0 0 1.2em 8px;
  padding: 8px 11px;
  border-radius: 8px;
  border-left: 2px solid var(--ird-accent, #c46a5a);
  background: color-mix(in srgb, var(--ird-accent, #c46a5a) 6%, transparent);
}

.ird-annot-item + .ird-annot-item {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed color-mix(in srgb, var(--ird-text, #2f2a24) 14%, transparent);
}

.ird-annot-quote {
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.82;
}

.ird-annot-note {
  margin-top: 3px;
  font-size: 12px;
  color: var(--ird-accent, #c46a5a);
}

.ird-empty {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--ird-muted, #8a8375);
}

/* ---- 底部 ---- */
.ird-footer {
  padding: 8px 14px 12px;
  border-top: 1px solid color-mix(in srgb, var(--ird-text, #2f2a24) 10%, transparent);
}

.ird-progress {
  height: 3px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--ird-text, #2f2a24) 12%, transparent);
  overflow: hidden;
}

.ird-progress-fill {
  height: 100%;
  background: var(--ird-accent, #c46a5a);
  transition: width 0.25s;
}

.ird-footer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
}

.ird-nav {
  padding: 5px 16px;
  border: 1px solid color-mix(in srgb, var(--ird-text, #2f2a24) 16%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--ird-text, #2f2a24);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ird-nav:hover:not(:disabled) {
  border-color: var(--ird-accent, #c46a5a);
  color: var(--ird-accent, #c46a5a);
}

.ird-nav:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.ird-indicator {
  font-size: 12px;
  color: var(--ird-muted, #8a8375);
  min-width: 62px;
  text-align: center;
}

.ird-hint {
  margin: 8px 0 0;
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.3px;
  color: color-mix(in srgb, var(--ird-muted, #8a8375) 78%, transparent);
}

@media (max-width: 640px) {
  .ird-surface {
    padding: 16px 14px;
    max-height: 56vh;
  }
  .ird-settings {
    gap: 8px;
  }
  .ird-step-val {
    min-width: 30px;
  }
  .ird-hotzone {
    width: 15%;
  }
}

@media (max-width: 420px) {
  .ird-remain {
    display: none;
  }
  .ird-hint {
    display: none;
  }
}
</style>
