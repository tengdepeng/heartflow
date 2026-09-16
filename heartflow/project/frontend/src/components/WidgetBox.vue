<template>
  <div class="widget-box">
    <header class="wb-head">
      <span class="wb-title">🧩 桌面小组件</span>
      <span class="wb-sub">轻量信息盒子 · 拖动标题可移动 · 本地记忆</span>
      <div class="wb-head-actions">
        <button class="wb-btn" @click="resetLayout" title="重置默认布局">重置</button>
      </div>
    </header>

    <!-- 添加栏 -->
    <div class="wb-add">
      <span class="wb-add-label">添加小组件</span>
      <button v-for="w in widgetTypes" :key="w"
        class="wb-add-chip" :title="`添加${WIDGET_META[w].label}`"
        @click="manager.addWidget(w, manager.suggestLayout())">
        <span class="wb-add-chip-icon">{{ WIDGET_META[w].icon }}</span>
        {{ WIDGET_META[w].label }}
      </button>
    </div>

    <!-- 画布 -->
    <div ref="canvasRef" class="wb-canvas" :class="{ 'wb-canvas-empty': !enabledWidgets.length }" @click.self="deselectAll">
      <p v-if="!enabledWidgets.length" class="wb-empty">桌面还没有小组件，从上方添加一个吧。</p>

      <article v-for="w in enabledWidgets" :key="w.id"
        class="wb-item"
        :class="['wb-size-' + w.size, { 'wb-selected': selectedId === w.id }]"
        :style="{ left: w.x + '%', top: w.y + '%' }"
        @pointerdown.stop="dragStart($event, w)"
        @pointerup="maybeSelect(w.id)">
        <header class="wb-item-head">
          <span class="wb-item-icon">{{ WIDGET_META[w.type].icon }}</span>
          <span class="wb-item-title">{{ WIDGET_META[w.type].label }}</span>
          <span class="wb-item-drag">⠿</span>
        </header>

        <div class="wb-item-body">
          <!-- 番茄钟 -->
          <template v-if="w.type === 'pomodoro'">
            <div class="wfmt-clock">{{ timerClock }}</div>
            <div class="wfmt-status">{{ timerStatus }}</div>
            <div class="wfmt-bar"><span class="wfmt-fill" :style="{ width: timerProgress + '%' }"></span></div>
            <div class="wfmt-meta">剩余 {{ timerRemain }}</div>
          </template>

          <!-- 逐日心锚 -->
          <template v-else-if="w.type === 'daily-anchor'">
            <p v-if="!anchors.length" class="wb-note-empty">还没有心锚，去逐日心锚房间许一个吧。</p>
            <div v-for="a in anchors.slice(0, 3)" :key="a.id"
              :class="['wanc', { done: a.done }]" @click.stop="toggleAnchor(a.id)">
              <span class="wanc-check">{{ a.done ? '✓' : '○' }}</span>
              <span class="wanc-title">{{ a.title }}</span>
              <span class="wanc-days">{{ a.daysLeft }} 天</span>
            </div>
          </template>

          <!-- 情绪速记 -->
          <template v-else-if="w.type === 'emotion-check'">
            <div class="wemod-today">今日已记 {{ todayMoodCount }} 次</div>
            <div class="wemod-options">
              <button v-for="o in EMOTION_OPTIONS" :key="o.type" class="wemod-opt"
                @click.stop="captureMood(o)">{{ o.icon }} {{ o.label }}</button>
            </div>
          </template>

          <!-- 速记便签 -->
          <template v-else-if="w.type === 'quick-note'">
            <textarea class="wqn-input" v-model="noteDraft" rows="3"
              placeholder="记下一闪而过的想法…" @keydown.stop></textarea>
            <div class="wqn-actions">
              <button class="wqn-btn" @click.stop="saveNote">记下</button>
              <span v-if="noteSaved" class="wqn-saved">已保存 ✓</span>
            </div>
          </template>

          <!-- 气象心情 -->
          <template v-else-if="w.type === 'weather'">
            <div class="wwea-main"><span class="wwea-icon">{{ season.icon }}</span></div>
            <div class="wwea-season">{{ season.label }} · {{ season.range }}</div>
            <div class="wwea-tip">{{ season.tip }}</div>
          </template>

          <!-- 每日一言 -->
          <template v-else-if="w.type === 'quote'">
            <p class="wqt-text">「{{ quote.text }}」</p>
            <span class="wqt-author">—— {{ quote.author }}</span>
          </template>
        </div>

        <footer class="wb-item-foot" @click.stop>
          <div class="wb-size-pick">
            <button v-for="s in SIZES" :key="s.value"
              :class="['wb-size-btn', { active: w.size === s.value }]"
              @click="setSize(w, s.value)">{{ s.label }}</button>
          </div>
          <div class="wb-item-actions">
            <button class="wb-icon-btn" :disabled="!selectedId" title="上移到画布更上方"
              @click="bringTop(w)">⬆︎</button>
            <button class="wb-icon-btn" :title="w.enabled ? '隐藏' : '显示'"
              @click="manager.setWidgetEnabled(w.id, !w.enabled)">{{ w.enabled ? '👁' : '🚫' }}</button>
            <button class="wb-icon-btn wb-icon-danger" title="移除" @click="manager.removeWidget(w.id)">✕</button>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useWidgetManager, WIDGET_META } from '../modules/touchpoints'
import type { WidgetType, WidgetSize, WidgetInstance } from '../modules/touchpoints'
import { useTimerStore } from '../stores'
import { useWishAnchor } from '../modules/wish-anchor'
import { useHappyBox } from '../modules/emotion/happy-box'
import { EMOTION_OPTIONS } from '../modules/emotion'
import type { EmotionType } from '../modules/emotion'
import { storage } from '../engine/storage'

const manager = useWidgetManager()
const timer = useTimerStore()
const wishAnchor = useWishAnchor()
const happyBox = useHappyBox()

const widgetTypes: WidgetType[] = ['pomodoro', 'daily-anchor', 'emotion-check', 'quick-note', 'weather', 'quote']
const SIZES: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
]

const enabledWidgets = computed(() => manager.enabledWidgets.value)
const selectedId = ref<string | null>(null)

function deselectAll() { selectedId.value = null }
function maybeSelect(id: string) { selectedId.value = id }
function bringTop(w: WidgetInstance) {
  manager.updatePosition(w.id, w.x, Math.max(0, w.y - 15))
  selectedId.value = w.id
}
function setSize(w: WidgetInstance, size: WidgetSize) { manager.updateSize(w.id, size) }
function resetLayout() { manager.resetToDefault() }

// ---- 拖拽移动 ----
const canvasRef = ref<HTMLElement | null>(null)
let dragging: { id: string; dx: number; dy: number } | null = null

function dragStart(e: PointerEvent, w: WidgetInstance) {
  dragging = { id: w.id, dx: e.clientX, dy: e.clientY }
  selectedId.value = w.id
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
}
function onDragMove(e: PointerEvent) {
  if (!dragging || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const widget = manager.getWidget(dragging.id)
  if (!widget) return
  const nx = ((e.clientX - rect.left + (e.clientX - dragging.dx)) / rect.width) * 100
  const ny = ((e.clientY - rect.top + (e.clientY - dragging.dy)) / rect.height) * 100
  manager.updatePosition(dragging.id, clamp(nx, -5, 95), clamp(ny, -5, 90))
}
function onDragEnd() {
  dragging = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
}
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
onUnmounted(() => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
})

// ---- 番茄钟 ----
const timerClock = computed(() => {
  const el = timer.elapsed ?? timer.session?.elapsed ?? 0
  return formatClock(el)
})
const timerRemain = computed(() => {
  const planned = timer.session?.plannedDuration ?? 0
  const el = timer.elapsed ?? timer.session?.elapsed ?? 0
  return formatClock(Math.max(0, planned - el))
})
const timerProgress = computed(() => {
  const planned = timer.session?.plannedDuration ?? 1
  const el = timer.elapsed ?? timer.session?.elapsed ?? 0
  return Math.round(Math.min(100, (el / planned) * 100))
})
const timerStatus = computed(() => {
  const st = timer.session?.status
  if (timer.isRunning) return '⏳ 专注进行中'
  if (st === 'completed') return '✅ 本轮已完成'
  if (st === 'interrupted') return '⏸ 已中断'
  return '🔒 等待开始'
})
function formatClock(ms: number) {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ---- 逐日心锚 ----
const anchors = computed(() => wishAnchor.views.value.filter(v => !v.done))
function toggleAnchor(id: string) { wishAnchor.toggleDone(id) }

// ---- 情绪速记 ----
const todayMoodCount = computed(() => happyBox.todayCount.value)
function captureMood(o: { type: EmotionType; label: string; icon: string }) {
  happyBox.capture(`${o.icon} ${o.label}心情`)
}

// ---- 速记便签（本地自持，不侵入思绪书房） ----
const NOTE_KEY = 'hf:touchpoints:newnote'
const noteDraft = ref(storage.getKV<string>(NOTE_KEY, ''))
const noteSaved = ref(false)
function saveNote() {
  storage.setKV(NOTE_KEY, noteDraft.value.trim())
  noteSaved.value = true
  setTimeout(() => { noteSaved.value = false }, 1600)
}

// ---- 气象心情（本地季节推断，离线可用） ----
const season = computed(() => {
  const now = new Date()
  const m = now.getMonth() + 1
  const today = now.getDate()
  // 按春分/夏至/秋分/冬至近似划分（公历）
  let label: string, icon: string, tip: string, key: string
  if ((m >= 3 && today >= 21) || m === 4 || m === 5 || (m === 6 && today < 21)) {
    key = 'spring'; label = '春 · 生发'; icon = '🌸'; tip = '万物舒展，适合播种新的心锚'
  } else if (m === 6 || m === 7 || m === 8 || (m === 9 && today < 23)) {
    key = 'summer'; label = '夏 · 繁盛'; icon = '☀️'; tip = '精力旺盛，宜专注深耕'
  } else if (m === 9 || m === 10 || m === 11 || (m === 12 && today < 22)) {
    key = 'autumn'; label = '秋 · 收敛'; icon = '🍂'; tip = '万物归藏，适合回顾与整理'
  } else {
    key = 'winter'; label = '冬 · 贮藏'; icon = '❄️'; tip = '静以养藏，宜休憩与沉淀'
  }
  const rangeMap: Record<string, string> = {
    spring: '3月春分 → 6月夏至', summer: '6月夏至 → 9月秋分',
    autumn: '9月秋分 → 12月冬至', winter: '12月冬至 → 3月春分',
  }
  return { label, icon, tip, range: rangeMap[key] }
})

// ---- 每日一言（按日期取词） ----
const QUOTES = [
  { text: '心之所向，素履以往。', author: '《易传》' },
  { text: '不积跬步，无以至千里。', author: '荀子' },
  { text: '凡是过往，皆为序章。', author: '《暴风雨》' },
  { text: '知止而后有定，定而后能静。', author: '《大学》' },
  { text: '往者不可谏，来者犹可追。', author: '《论语》' },
  { text: 'tranquility is not absence of storm, but calm within.', author: 'Rumi' },
  { text: '慢慢来，比较快。', author: '心流旅人' },
  { text: '你的任务不是寻找爱，而是寻找并破除内心的一切阻碍。', author: 'Rumi' },
  { text: '种一棵树最好的时间是十年前，其次是现在。', author: '谚语' },
  { text: '万物皆有裂痕，那是光进来的地方。', author: 'Leonard Cohen' },
]
const quote = computed(() => {
  const day = Math.floor(Date.now() / 86400000)
  return QUOTES[day % QUOTES.length]
})
</script>

<style scoped>
.widget-box { display: flex; flex-direction: column; gap: 12px; }
.wb-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.wb-title { font-size: 17px; font-weight: 700; color: #e8ecf6; letter-spacing: 1px; }
.wb-sub { font-size: 12px; color: #8a94ad; }
.wb-head-actions { margin-left: auto; }
.wb-btn { padding: 5px 12px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.2); background: transparent; color: #b6c0d8; font-size: 12px; cursor: pointer; }
.wb-btn:hover { background: rgba(120, 140, 200, 0.12); }

.wb-add { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 12px; background: rgba(20, 26, 40, 0.5); border: 1px dashed rgba(140, 160, 200, 0.2); border-radius: 12px; }
.wb-add-label { font-size: 12px; color: #7c86a0; margin-right: 4px; }
.wb-add-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.2); background: rgba(120, 140, 200, 0.08); color: #c6d0e8; font-size: 12px; cursor: pointer; transition: all .15s; }
.wb-add-chip:hover { background: rgba(90, 120, 220, 0.22); border-color: #6b86d8; color: #fff; }
.wb-add-chip-icon { font-size: 13px; }

.wb-canvas { position: relative; min-height: 420px; background: rgba(16, 22, 36, 0.35); border: 1px solid rgba(140, 160, 200, 0.12); border-radius: 16px; padding: 0; }
.wb-canvas-empty { display: flex; align-items: center; justify-content: center; }
.wb-empty { color: #7c86a0; font-size: 13px; text-align: center; }

.wb-item { position: absolute; width: 240px; min-height: 120px; background: rgba(30, 38, 58, 0.92); border: 1px solid rgba(150, 170, 210, 0.16); border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32); cursor: grab; transition: box-shadow .15s, border-color .15s; display: flex; flex-direction: column; touch-action: none; }
.wb-item:hover { border-color: rgba(130, 160, 235, 0.45); }
.wb-item.wb-selected { border-color: #6b86d8; box-shadow: 0 0 0 2px rgba(107, 134, 216, 0.35), 0 10px 28px rgba(0, 0, 0, 0.4); }
.wb-size-large { width: min(300px, 78vw); min-height: 200px; }
.wb-size-medium { width: 260px; min-height: 150px; }

.wb-item-head { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid rgba(150, 170, 210, 0.1); user-select: none; }
.wb-item-icon { font-size: 15px; }
.wb-item-title { font-size: 13px; font-weight: 600; color: #dbe3f7; }
.wb-item-drag { margin-left: auto; color: #5f6b85; font-size: 14px; }

.wb-item-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.wb-item-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; border-top: 1px solid rgba(150, 170, 210, 0.1); }
.wb-size-pick { display: flex; gap: 4px; }
.wb-size-btn { padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(140, 160, 200, 0.18); background: transparent; color: #8a94ad; font-size: 11px; cursor: pointer; }
.wb-size-btn.active { background: #5b7bd8; border-color: #5b7bd8; color: #fff; }
.wb-item-actions { display: flex; gap: 6px; }
.wb-icon-btn { width: 24px; height: 24px; border-radius: 6px; border: 1px solid rgba(140, 160, 200, 0.18); background: transparent; color: #9fb0d4; font-size: 12px; cursor: pointer; line-height: 1; }
.wb-icon-btn:hover { background: rgba(120, 140, 200, 0.14); }
.wb-icon-danger:hover { background: rgba(220, 90, 90, 0.2); color: #ff9f9f; border-color: rgba(220, 90, 90, 0.4); }

/* 番茄钟 */
.wfmt-clock { font-size: 30px; font-weight: 600; color: #f4a88c; font-variant-numeric: tabular-nums; letter-spacing: 2px; }
.wfmt-status { font-size: 12px; color: #b6c0d8; }
.wfmt-bar { height: 6px; border-radius: 999px; background: rgba(120, 140, 200, 0.16); overflow: hidden; }
.wfmt-fill { display: block; height: 100%; background: linear-gradient(90deg, #5b7bd8, #8a6cd8); border-radius: 999px; transition: width .2s; }
.wfmt-meta { font-size: 11px; color: #7c86a0; }

/* 心锚 */
.wanc { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 13px; color: #c6d0e8; }
.wanc:hover { background: rgba(120, 140, 200, 0.1); }
.wanc.done { opacity: .5; text-decoration: line-through; }
.wanc-check { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(140, 160, 200, 0.35); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex: none; }
.wanc.done .wanc-check { background: #5b7bd8; border-color: #5b7bd8; }
.wanc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wanc-days { font-size: 11px; color: #7fa8d8; flex: none; }

/* 情绪 */
.wemod-today { font-size: 12px; color: #8a94ad; }
.wemod-options { display: flex; flex-wrap: wrap; gap: 6px; }
.wemod-opt { padding: 5px 9px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.2); background: rgba(120, 140, 200, 0.08); color: #c6d0e8; font-size: 12px; cursor: pointer; transition: all .15s; }
.wemod-opt:hover { background: rgba(90, 120, 220, 0.2); border-color: #6b86d8; }

/* 便签 */
.wqn-input { width: 100%; box-sizing: border-box; background: rgba(10, 16, 28, 0.5); border: 1px solid rgba(140, 160, 200, 0.18); border-radius: 8px; color: #dbe3f7; font-size: 13px; font-family: inherit; padding: 8px; resize: none; }
.wqn-input:focus { outline: none; border-color: #6b86d8; }
.wqn-actions { display: flex; align-items: center; gap: 8px; }
.wqn-btn { padding: 4px 12px; border-radius: 999px; border: none; background: linear-gradient(135deg, #5b7bd8, #7c5cd8); color: #fff; font-size: 12px; cursor: pointer; font-weight: 600; }
.wqn-saved { font-size: 11px; color: #6fd39a; }

/* 天气 */
.wwea-main { text-align: center; }
.wwea-icon { font-size: 38px; }
.wwea-season { font-size: 15px; font-weight: 600; color: #e3e8f6; text-align: center; }
.wwea-tip { font-size: 12px; color: #7c86a0; text-align: center; }

/* 一言 */
.wqt-text { margin: 0; font-size: 14px; line-height: 1.7; color: #e3e8f6; font-style: italic; }
.wqt-author { align-self: flex-end; font-size: 11px; color: #7fa8d8; margin-top: 4px; }

.wb-note-empty { margin: 0; font-size: 12px; color: #7c86a0; }
</style>