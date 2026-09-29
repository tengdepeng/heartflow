<template>
  <div class="wcard" :class="{ 'wcard-compact': compact }">
    <!-- 番茄钟 -->
    <template v-if="instance.type === 'pomodoro'">
      <div class="wfmt-clock">{{ timerClock }}</div>
      <div class="wfmt-status">{{ timerStatus }}</div>
      <div class="wfmt-bar"><span class="wfmt-fill" :style="{ width: timerProgress + '%' }"></span></div>
      <div v-if="!compact" class="wfmt-meta">剩余 {{ timerRemain }}</div>
    </template>

    <!-- 逐日心锚 -->
    <template v-else-if="instance.type === 'daily-anchor'">
      <p v-if="!anchors.length" class="wb-note-empty">还没有心锚，去逐日心锚房间许一个吧。</p>
      <div v-for="a in anchors.slice(0, 3)" :key="a.id"
        :class="['wanc', { done: a.done }]" @click="toggleAnchor(a.id)">
        <span class="wanc-check">{{ a.done ? '✓' : '○' }}</span>
        <span class="wanc-title">{{ a.title }}</span>
        <span class="wanc-days">{{ a.daysLeft }} 天</span>
      </div>
    </template>

    <!-- 情绪速记 -->
    <template v-else-if="instance.type === 'emotion-check'">
      <div class="wemod-today">今日已记 {{ todayMoodCount }} 次</div>
      <div class="wemod-options">
        <button v-for="o in EMOTION_OPTIONS" :key="o.type" class="wemod-opt"
          @click.stop="captureMood(o)">{{ o.icon }} {{ compact ? '' : o.label }}</button>
      </div>
    </template>

    <!-- 速记便签：画布态可编辑，小窗态只读展示 -->
    <template v-else-if="instance.type === 'quick-note'">
      <template v-if="compact">
        <p class="wb-note-empty wqn-readonly">{{ noteDraft || '（空）回主窗写一条速记吧。' }}</p>
      </template>
      <template v-else>
        <textarea class="wqn-input" v-model="noteDraft" rows="3"
          placeholder="记下一闪而过的想法…" @keydown.stop></textarea>
        <div class="wqn-actions">
          <button class="wqn-btn" @click.stop="saveNote">记下</button>
          <span v-if="noteSaved" class="wqn-saved">已保存 ✓</span>
        </div>
      </template>
    </template>

    <!-- 气象心情 -->
    <template v-else-if="instance.type === 'weather'">
      <div class="wwea-main"><span class="wwea-icon">{{ season.icon }}</span></div>
      <div class="wwea-season">{{ season.label }} · {{ season.range }}</div>
      <div class="wwea-tip">{{ season.tip }}</div>
    </template>

    <!-- 每日一言 -->
    <template v-else-if="instance.type === 'quote'">
      <p class="wqt-text">「{{ quote.text }}」</p>
      <span class="wqt-author">—— {{ quote.author }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
// ============================================================
// 小组件卡片内容（首页画布 / 系统桌面小窗 / Android 七卡同源）
// 一处实现两处复用：compact=false 为首页画布（可编辑），
// compact=true 为系统小窗紧凑态（只读密度更高）。
// ============================================================
import { computed, ref } from 'vue'
import type { WidgetInstance } from '../modules/touchpoints'
import { useTimerStore } from '../stores'
import { useWishAnchor } from '../modules/wish-anchor'
import { useHappyBox } from '../modules/emotion/happy-box'
import { EMOTION_OPTIONS } from '../modules/emotion'
import type { EmotionType } from '../modules/emotion'
import { storage } from '../engine/storage'
import { composeWidgetSnapshot } from '../modules/desktop-widget/snapshot'
import { readWidgetNote, pushWidgetSnapshotNow, WIDGET_NOTE_KEY } from '../modules/desktop-widget/sync'

const props = withDefaults(
  defineProps<{ instance: WidgetInstance; compact?: boolean }>(),
  { compact: false },
)

const timer = useTimerStore()
const wishAnchor = useWishAnchor()
const happyBox = useHappyBox()

// ---- 番茄钟 ----
const timerClock = computed(() => formatClock(timer.elapsed ?? timer.session?.elapsed ?? 0))
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

// ---- 心锚 ----
const anchors = computed(() => wishAnchor.views.value.filter(v => !v.done))
function toggleAnchor(id: string) {
  wishAnchor.toggleDone(id)
  pushWidgetSnapshotNow()
}

// ---- 情绪 ----
const todayMoodCount = computed(() => happyBox.todayCount.value)
function captureMood(o: { type: EmotionType; label: string; icon: string }) {
  happyBox.capture(`${o.icon} ${o.label}心情`)
  pushWidgetSnapshotNow()
}

// ---- 便签（模块级共享草稿，编辑态落盘后同步系统小组件） ----
const noteDraft = ref<string>(readWidgetNote())
const noteSaved = ref(false)
function saveNote() {
  storage.setKV(WIDGET_NOTE_KEY, noteDraft.value.trim())
  noteSaved.value = true
  pushWidgetSnapshotNow()
  setTimeout(() => { noteSaved.value = false }, 1600)
}

// ---- 气象 / 一言（共享取词与季节推断） ----
const season = computed(() => composeWidgetSnapshot.seasonOf())
const quote = computed(() => composeWidgetSnapshot.quoteOfDay())
void props
</script>

<style scoped>
.wcard { display: flex; flex-direction: column; gap: 8px; }

/* ---- 番茄钟 ---- */
.wfmt-clock { font-size: 30px; font-weight: 600; color: #f4a88c; font-variant-numeric: tabular-nums; letter-spacing: 2px; }
.wfmt-status { font-size: 12px; color: #b6c0d8; }
.wfmt-bar { height: 6px; border-radius: 999px; background: rgba(120, 140, 200, 0.16); overflow: hidden; }
.wfmt-fill { display: block; height: 100%; background: linear-gradient(90deg, #5b7bd8, #8a6cd8); border-radius: 999px; transition: width .2s; }
.wfmt-meta { font-size: 11px; color: #7c86a0; }

/* ---- 心锚 ---- */
.wanc { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 13px; color: #c6d0e8; }
.wanc:hover { background: rgba(120, 140, 200, 0.1); }
.wanc.done { opacity: .5; text-decoration: line-through; }
.wanc-check { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(140, 160, 200, 0.35); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex: none; }
.wanc.done .wanc-check { background: #5b7bd8; border-color: #5b7bd8; }
.wanc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wanc-days { font-size: 11px; color: #7fa8d8; flex: none; }

/* ---- 情绪 ---- */
.wemod-today { font-size: 12px; color: #8a94ad; }
.wemod-options { display: flex; flex-wrap: wrap; gap: 6px; }
.wemod-opt { padding: 5px 9px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.2); background: rgba(120, 140, 200, 0.08); color: #c6d0e8; font-size: 12px; cursor: pointer; transition: all .15s; }
.wemod-opt:hover { background: rgba(90, 120, 220, 0.2); border-color: #6b86d8; }

/* ---- 便签 ---- */
.wqn-input { width: 100%; box-sizing: border-box; background: rgba(10, 16, 28, 0.5); border: 1px solid rgba(140, 160, 200, 0.18); border-radius: 8px; color: #dbe3f7; font-size: 13px; font-family: inherit; padding: 8px; resize: none; }
.wqn-input:focus { outline: none; border-color: #6b86d8; }
.wqn-actions { display: flex; align-items: center; gap: 8px; }
.wqn-btn { padding: 4px 12px; border-radius: 999px; border: none; background: linear-gradient(135deg, #5b7bd8, #7c5cd8); color: #fff; font-size: 12px; cursor: pointer; font-weight: 600; }
.wqn-saved { font-size: 11px; color: #6fd39a; }
.wqn-readonly { white-space: pre-wrap; line-height: 1.6; font-size: 12px; }

/* ---- 气象 ---- */
.wwea-main { text-align: center; }
.wwea-icon { font-size: 38px; }
.wwea-season { font-size: 15px; font-weight: 600; color: #e3e8f6; text-align: center; }
.wwea-tip { font-size: 12px; color: #7c86a0; text-align: center; }

/* ---- 一言 ---- */
.wqt-text { margin: 0; font-size: 14px; line-height: 1.7; color: #e3e8f6; font-style: italic; }
.wqt-author { align-self: flex-end; font-size: 11px; color: #7fa8d8; margin-top: 4px; }

/* ---- 紧凑态（系统桌面小窗）：同源降密度，不另写一套 ---- */
.wcard-compact { gap: 6px; }
.wcard-compact .wfmt-clock { font-size: 26px; }
.wcard-compact .wwea-icon { font-size: 30px; }
.wcard-compact .wwea-season { font-size: 13px; }
.wcard-compact .wqt-text { font-size: 13px; }
.wcard-compact .wemod-opt { padding: 3px 7px; font-size: 13px; }
.wcard-compact .wanc { padding: 4px 6px; font-size: 12px; }
</style>
