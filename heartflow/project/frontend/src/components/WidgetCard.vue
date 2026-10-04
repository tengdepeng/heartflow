<template>
  <div class="wcard" :class="{ 'wcard-compact': compact }" :style="themeVars">
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

    <!-- 四象限任务：复用 modules/tasks 的 quadrant-board 引擎（与自律工坊同源） -->
    <template v-else-if="instance.type === 'quadrant'">
      <p v-if="!quadrantTotal" class="wb-note-empty">任务池还空着，去自律工坊记下第一件要事。</p>
      <div v-else class="wqd-grid">
        <div v-for="col in quadrantBoard" :key="col.quadrant"
          class="wqd-cell" :style="{ '--wqd-c': col.color }"
          :title="`${col.label}：${col.stats.active} 件待推进 / 共 ${col.stats.total} 件`">
          <span class="wqd-label">{{ compact ? shortQuadrant(col.label) : col.label }}</span>
          <span class="wqd-count">{{ col.stats.active }}</span>
        </div>
      </div>
    </template>

    <!-- 月历：整月 + 今日高亮 + 有纪录日标点（数据源 activityMarks 同源三端） -->
    <template v-else-if="instance.type === 'calendar'">
      <WidgetMiniCalendar variant="calendar" :marks="marks" :compact="compact" />
    </template>

    <!-- 日历热力图：滚动 N 周活跃度（GitHub 式格阵） -->
    <template v-else-if="instance.type === 'calendar-heatmap'">
      <WidgetMiniCalendar variant="heatmap" :marks="marks" :weeks="6" :compact="compact" />
    </template>

    <!-- 翻页时钟：复用 flip-clock 显示偏好，每秒翻页 -->
    <template v-else-if="instance.type === 'flip-clock'">
      <WidgetFlipClock />
    </template>

    <!-- 人生刻度：复用时间长廊·生命刻度（进度 + 剩余时光） -->
    <template v-else-if="instance.type === 'life-scale'">
      <div class="wls-row">
        <span class="wls-pct">{{ lifeOverview.progress }}%</span>
        <span class="wls-years">已历 {{ lifeOverview.elapsed.years }} 年</span>
      </div>
      <div class="wls-bar"><span class="wls-fill" :style="{ width: lifeOverview.progress + '%' }" /></div>
      <div class="wls-remain">剩余 {{ lifeOverview.remaining }}</div>
    </template>

    <!-- 电子水族箱：复用情绪花房·水族箱（游鱼 + 投食） -->
    <template v-else-if="instance.type === 'aquarium'">
      <div class="waq-tank">
        <span v-if="!aquariumFish.length" class="waq-empty">鱼缸还空着，去情绪花房放养一尾。</span>
        <span
          v-for="(f, i) in aquariumFish.slice(0, 6)"
          :key="f.id"
          class="waq-fish"
          :style="{ '--waq-c': speciesById(f.speciesId).color, animationDelay: (i * 900) + 'ms' }"
        >🐟</span>
      </div>
      <div class="waq-foot">
        <span class="waq-count">🐟 {{ aquariumCount }} 尾</span>
        <button class="waq-feed" type="button" @click.stop="feedFish">投食</button>
      </div>
    </template>

    <!-- 喝水打卡：每日计数 + 目标进度 + 一键 +1 -->
    <template v-else-if="instance.type === 'water-drink'">
      <div class="wwd-row">
        <span class="wwd-num">{{ waterCups }}</span>
        <span class="wwd-target">/ {{ waterTarget }} 杯</span>
      </div>
      <div class="wwd-bar"><span class="wwd-fill" :style="{ width: waterProgress + '%' }" /></div>
      <div class="wwd-actions">
        <button class="wwd-btn" type="button" @click.stop="drinkWater">+1 杯</button>
        <button class="wwd-btn wwd-undo" type="button" @click.stop="undoWater">撤销</button>
      </div>
    </template>

    <!-- 摩天轮：纯 CSS 缓转动画组件 -->
    <template v-else-if="instance.type === 'ferris-wheel'">
      <div class="wfw-stage">
        <div class="wfw-wheel">
          <span
            v-for="(c, i) in FERRIS_CABINS"
            :key="i"
            class="wfw-cabin"
            :style="{ transform: `rotate(${i * 45}deg) translateY(-32px)` }"
          >{{ c }}</span>
          <span class="wfw-hub" />
        </div>
      </div>
      <div class="wfw-caption">摩天轮 · 缓缓转动</div>
    </template>

    <!-- 水晶球：纯 CSS 灵光流转动画组件 -->
    <template v-else-if="instance.type === 'crystal-ball'">
      <div class="wcb-stage">
        <div class="wcb-ball"><span class="wcb-shine" /><span class="wcb-base" /></div>
      </div>
      <div class="wcb-caption">水晶球 · 灵光流转</div>
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
import { useTaskManager, buildQuadrantBoard } from '../modules/tasks'
import { activityMarks } from '../modules/touchpoints/widget-calendar'
import { widgetThemeVars } from '../modules/touchpoints'
import { useLifeEpoch } from '../modules/life-epoch'
import { useAquarium, speciesById } from '../modules/aquarium'
import { useWaterDrink } from '../modules/water-drink'
import WidgetMiniCalendar from './WidgetMiniCalendar.vue'
import WidgetFlipClock from './WidgetFlipClock.vue'

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

// ---- 四象限（复用自律工坊同一任务池与 quadrant-board 引擎，不另造数据） ----
const taskManager = useTaskManager()
const quadrantBoard = computed(() => buildQuadrantBoard(taskManager.tasks.value))
const quadrantTotal = computed(() => quadrantBoard.value.reduce((s, c) => s + c.stats.total, 0))
/** 紧凑态缩短象限名，避免小窗 / Android 卡内换行 */
function shortQuadrant(label: string): string {
  return label.replace('且', '').slice(0, 6)
}

// ---- 日历（月历 / 热力图）数据源：专注 + 速记，本地离线 ----
const marks = computed(() => activityMarks())

// ---- 人生刻度（复用时间长廊·生命刻度，不另造数据） ----
const { overview: lifeOverview } = useLifeEpoch()

// ---- 电子水族箱（复用情绪花房·水族箱，投食同源） ----
const aquarium = useAquarium()
const aquariumFish = aquarium.fish
const aquariumCount = aquarium.fishCount
function feedFish() {
  aquarium.feed()
}

// ---- 喝水打卡（本地自持计数，一键 +1 / 撤销） ----
const waterDrink = useWaterDrink()
const waterCups = waterDrink.cups
const waterTarget = waterDrink.target
const waterProgress = waterDrink.progress
function drinkWater() {
  waterDrink.addCup()
}
function undoWater() {
  waterDrink.removeCup()
}

// ---- 摩天轮舱位（纯装饰动画） ----
const FERRIS_CABINS = ['🎡', '✨', '🎠', '⭐', '🌙', '🍀', '🎐', '💫']

// ---- 外观主题：展开成卡片外壳 CSS 变量（accent/radius/alpha/bg 同源生效） ----
const themeVars = computed(() => widgetThemeVars(props.instance.theme))
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

/* ---- 四象限 ---- */
.wqd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.wqd-cell { display: flex; align-items: baseline; justify-content: space-between; gap: 4px; padding: 5px 7px; border-radius: 8px; background: rgba(120, 140, 200, 0.1); border-left: 2px solid var(--wqd-c, #7fa8d8); font-size: 12px; color: #c6d0e8; }
.wqd-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wqd-count { font-weight: 600; color: var(--wqd-c, #7fa8d8); flex: none; }

/* ---- 人生刻度 ---- */
.wls-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.wls-pct { font-size: 24px; font-weight: 700; color: var(--ww-accent, #d4a15a); font-variant-numeric: tabular-nums; }
.wls-years { font-size: 11px; color: #8a94ad; }
.wls-bar { height: 8px; border-radius: 999px; background: rgba(120, 140, 200, 0.16); overflow: hidden; }
.wls-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--ww-accent, #d4a15a), #c46a5a); transition: width .3s ease; }
.wls-remain { font-size: 11px; color: #7c86a0; }

/* ---- 电子水族箱 ---- */
.waq-tank { position: relative; display: flex; align-items: center; justify-content: center; gap: 10px; height: 62px; border-radius: 10px; background: linear-gradient(180deg, rgba(90, 169, 201, 0.16), rgba(40, 80, 120, 0.22)); overflow: hidden; }
.waq-empty { font-size: 11px; color: #7c86a0; padding: 0 10px; text-align: center; }
.waq-fish { font-size: 20px; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3)); animation: waq-swim 4s ease-in-out infinite; }
@keyframes waq-swim {
  0%, 100% { transform: translateX(-7px) translateY(2px) scaleX(1); }
  50% { transform: translateX(7px) translateY(-2px) scaleX(-1); }
}
.waq-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.waq-count { font-size: 12px; color: #9fb8d8; }
.waq-feed { padding: 4px 12px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.28); background: rgba(120, 140, 200, 0.12); color: #c6d0e8; font-size: 12px; font-family: inherit; cursor: pointer; }
.waq-feed:hover { background: rgba(90, 120, 220, 0.22); border-color: #6b86d8; color: #fff; }

/* ---- 喝水打卡 ---- */
.wwd-row { display: flex; align-items: baseline; gap: 4px; }
.wwd-num { font-size: 26px; font-weight: 700; color: #6bb8d8; font-variant-numeric: tabular-nums; }
.wwd-target { font-size: 12px; color: #8a94ad; }
.wwd-bar { height: 8px; border-radius: 999px; background: rgba(90, 150, 200, 0.16); overflow: hidden; }
.wwd-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #5ab8d8, #6b9fc4); transition: width .25s ease; }
.wwd-actions { display: flex; gap: 8px; }
.wwd-btn { padding: 4px 12px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.24); background: rgba(90, 160, 200, 0.14); color: #c6d0e8; font-size: 12px; font-family: inherit; cursor: pointer; }
.wwd-btn:hover { background: rgba(90, 160, 200, 0.26); color: #fff; }
.wwd-undo { background: transparent; color: #8a94ad; }

/* ---- 摩天轮 ---- */
.wfw-stage { display: flex; align-items: center; justify-content: center; height: 88px; }
.wfw-wheel { position: relative; width: 78px; height: 78px; border-radius: 50%; border: 2px dashed rgba(200, 170, 120, 0.35); animation: wfw-spin 24s linear infinite; }
.wfw-cabin { position: absolute; left: 50%; top: 50%; margin: -9px 0 0 -9px; font-size: 14px; }
.wfw-hub { position: absolute; left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: var(--ww-accent, #d4a15a); box-shadow: 0 0 10px rgba(212, 161, 90, 0.5); }
@keyframes wfw-spin { to { transform: rotate(360deg); } }
.wfw-caption { font-size: 11px; color: #8a94ad; text-align: center; }

/* ---- 水晶球 ---- */
.wcb-stage { display: flex; align-items: center; justify-content: center; height: 88px; }
.wcb-ball { position: relative; width: 62px; height: 62px; border-radius: 50%; background: radial-gradient(circle at 34% 30%, rgba(200, 220, 255, 0.9), rgba(120, 150, 220, 0.5) 45%, rgba(60, 80, 140, 0.7)); box-shadow: inset 0 0 14px rgba(255, 255, 255, 0.35), 0 6px 16px rgba(0, 0, 0, 0.35); overflow: hidden; }
.wcb-shine { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.55) 50%, transparent 60%); animation: wcb-shimmer 3.6s ease-in-out infinite; }
.wcb-base { position: absolute; left: 50%; bottom: -8px; width: 34px; height: 12px; margin-left: -17px; border-radius: 0 0 8px 8px; background: linear-gradient(180deg, #6b5a3a, #3f3524); }
@keyframes wcb-shimmer {
  0%, 100% { transform: translateX(-40%); opacity: 0.4; }
  50% { transform: translateX(40%); opacity: 0.9; }
}
.wcb-caption { font-size: 11px; color: #8a94ad; text-align: center; }

/* ---- 紧凑态（系统桌面小窗）：同源降密度，不另写一套 ---- */
.wcard-compact { gap: 6px; }
.wcard-compact .wfmt-clock { font-size: 26px; }
.wcard-compact .wwea-icon { font-size: 30px; }
.wcard-compact .wwea-season { font-size: 13px; }
.wcard-compact .wqt-text { font-size: 13px; }
.wcard-compact .wemod-opt { padding: 3px 7px; font-size: 13px; }
.wcard-compact .wanc { padding: 4px 6px; font-size: 12px; }
.wcard-compact .wqd-cell { padding: 3px 5px; font-size: 11px; }
</style>
