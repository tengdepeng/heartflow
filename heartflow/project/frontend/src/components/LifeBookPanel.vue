<template>
  <section class="lb" aria-label="人生之书">
    <div class="lb-head">
      <span class="lb-title">📖 人生之书</span>
      <span class="lb-sub">你的阅读人生，在呼吸之间缓缓成形</span>
    </div>

    <div class="lb-body">
      <!-- 呼吸之书 -->
      <div class="lb-book-wrap">
        <div
          class="lb-book"
          :style="{ '--breath-dur': lifeBook.breath.durationSec + 's', '--breath-depth': lifeBook.breath.depth }"
        >
          <div class="lb-book-core"></div>
          <div class="lb-book-ring"></div>
        </div>
        <div class="lb-vitality">
          <span class="lb-vit-num">{{ Math.round(lifeBook.vitality * 100) }}</span>
          <span class="lb-vit-unit">生命度</span>
        </div>
        <p class="lb-caption">{{ caption }}</p>
      </div>

      <!-- 8 维剖面（雷达） -->
      <div class="lb-radar-wrap">
        <h4 class="lb-h">8 维剖面</h4>
        <svg class="lb-radar" :viewBox="`0 0 ${SIZE} ${SIZE}`" role="img" aria-label="阅读人生八维剖面">
          <!-- 网格环 -->
          <polygon
            v-for="ring in radarRings"
            :key="ring"
            class="lb-ring"
            :points="ring"
          />
          <!-- 轴线 -->
          <line
            v-for="(ax, i) in radarAxes"
            :key="'ax' + i"
            class="lb-axis"
            :x1="C" :y1="C" :x2="ax.x" :y2="ax.y"
          />
          <!-- 数据多边形 -->
          <polygon class="lb-shape" :points="radarPolygon" />
          <!-- 维标签 -->
          <text
            v-for="(ax, i) in radarAxes"
            :key="'lb' + i"
            class="lb-axis-label"
            :x="ax.lx" :y="ax.ly"
            :text-anchor="ax.lx < C - 4 ? 'end' : ax.lx > C + 4 ? 'start' : 'middle'"
            :dominant-baseline="ax.ly < C - 4 ? 'auto' : 'hanging'"
          >{{ ax.label }}</text>
        </svg>
      </div>
    </div>

    <!-- 正 / 侧 / 横 三维投影 -->
    <div class="lb-proj">
      <div class="lb-proj-col">
        <h4 class="lb-h">正 · 时间轴（近 6 月分钟）</h4>
        <div class="lb-bars">
          <div v-for="p in lifeBook.frontal" :key="p.label" class="lb-bar-row">
            <span class="lb-bar-label">{{ p.label }}</span>
            <span class="lb-bar-track"><i class="lb-bar-fill" :style="{ width: pct(p, lifeBook.frontal) }"></i></span>
            <span class="lb-bar-val">{{ p.value }}</span>
          </div>
          <p v-if="!lifeBook.frontal.some(p => p.value)" class="lb-empty">尚无阅读会话</p>
        </div>
      </div>

      <div class="lb-proj-col">
        <h4 class="lb-h">侧 · 类型轴（标签书目数）</h4>
        <div class="lb-bars">
          <div v-for="p in lifeBook.lateral" :key="p.label" class="lb-bar-row">
            <span class="lb-bar-label">{{ p.label }}</span>
            <span class="lb-bar-track"><i class="lb-bar-fill" :style="{ width: pct(p, lifeBook.lateral) }"></i></span>
            <span class="lb-bar-val">{{ p.value }}</span>
          </div>
          <p v-if="!lifeBook.lateral.length" class="lb-empty">尚无标签</p>
        </div>
      </div>

      <div class="lb-proj-col">
        <h4 class="lb-h">横 · 广度轴（阅读疆域）</h4>
        <div class="lb-bars">
          <div v-for="p in lifeBook.horizontal" :key="p.label" class="lb-bar-row">
            <span class="lb-bar-label">{{ p.label }}</span>
            <span class="lb-bar-track"><i class="lb-bar-fill" :style="{ width: pct(p, lifeBook.horizontal) }"></i></span>
            <span class="lb-bar-val">{{ p.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 概览 -->
    <div class="lb-summary">
      <div class="lb-sum"><span class="lb-sum-num">{{ lifeBook.summary.totalBooks }}</span><span class="lb-sum-label">藏书</span></div>
      <div class="lb-sum"><span class="lb-sum-num">{{ lifeBook.summary.totalWords.toLocaleString() }}</span><span class="lb-sum-label">累计字数</span></div>
      <div class="lb-sum"><span class="lb-sum-num">{{ lifeBook.summary.totalMinutes }}</span><span class="lb-sum-label">专注分钟</span></div>
      <div class="lb-sum"><span class="lb-sum-num">{{ lifeBook.summary.streak }}</span><span class="lb-sum-label">连续天数</span></div>
      <div class="lb-sum"><span class="lb-sum-num">{{ lifeBook.summary.avgWPM }}</span><span class="lb-sum-label">均速字/分</span></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLifeBook } from '../modules/reading'
import type { LifeBookPoint, LifeDimKey } from '../modules/reading'

const { lifeBook: lifeBookRef } = useLifeBook()
// 模板里用 lifeBook 这个名字（ref 自动解包）
const lifeBook = lifeBookRef

const DIM_ORDER: LifeDimKey[] = ['emotion', 'body', 'focus', 'social', 'knowledge', 'activity', 'cognition', 'words']
const DIM_LABEL: Record<LifeDimKey, string> = {
  emotion: '情绪', body: '身体', focus: '专注', social: '社交',
  knowledge: '知识', activity: '活动', cognition: '认知', words: '文字',
}

const SIZE = 200
const C = SIZE / 2
const R = 78

const radarAxes = computed(() =>
  DIM_ORDER.map((k, i) => {
    const ang = ((-90 + i * 45) * Math.PI) / 180
    return {
      key: k,
      x: C + Math.cos(ang) * R,
      y: C + Math.sin(ang) * R,
      lx: C + Math.cos(ang) * (R + 16),
      ly: C + Math.sin(ang) * (R + 16),
      label: DIM_LABEL[k],
    }
  }),
)

const radarPolygon = computed(() => {
  const d = lifeBook.value.dimensions
  return DIM_ORDER.map((k, i) => {
    const ang = ((-90 + i * 45) * Math.PI) / 180
    const r = R * (d[k] || 0)
    return `${C + Math.cos(ang) * r},${C + Math.sin(ang) * r}`
  }).join(' ')
})

const radarRings = computed(() =>
  [0.25, 0.5, 0.75, 1].map((f) =>
    DIM_ORDER.map((_k, i) => {
      const ang = ((-90 + i * 45) * Math.PI) / 180
      return `${C + Math.cos(ang) * R * f},${C + Math.sin(ang) * R * f}`
    }).join(' '),
  ),
)

const CAPTIONS = [
  '书页未启，静待第一缕墨香。',
  '初读几行，呼吸尚浅。',
  '渐入佳境，书与人慢慢同频。',
  '书海泛舟，生命随字句起伏。',
  '万卷在胸，呼吸已自成节律。',
]
const caption = computed(() => {
  const v = lifeBook.value.vitality
  const idx = Math.min(CAPTIONS.length - 1, Math.floor(v * CAPTIONS.length))
  return CAPTIONS[idx]
})

function pct(p: LifeBookPoint, list: LifeBookPoint[]): string {
  const max = Math.max(1, ...list.map(x => x.value))
  return `${Math.round((p.value / max) * 100)}%`
}
</script>

<style scoped>
.lb {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.lb-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.lb-title { font-size: 16px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.85); letter-spacing: 1px; }
.lb-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); letter-spacing: 0.5px; }

.lb-body { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }

/* 呼吸之书 */
.lb-book-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 0 0 160px; }
.lb-book {
  position: relative;
  width: 120px;
  height: 120px;
  display: grid;
  place-items: center;
  animation: lb-breathe var(--breath-dur, 8s) ease-in-out infinite;
  transform-origin: center;
}
.lb-book-core {
  width: 64px;
  height: 84px;
  border-radius: 8px;
  background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.85), rgba(var(--accent-rgb), 0.45));
  box-shadow: 0 0 26px rgba(var(--accent-rgb), 0.45), inset 0 0 18px rgba(255, 255, 255, 0.25);
}
.lb-book-ring {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.2);
}
@keyframes lb-breathe {
  0%, 100% { transform: scale(calc(1 - var(--breath-depth, 0.04))); }
  50% { transform: scale(calc(1 + var(--breath-depth, 0.04))); }
}
.lb-vitality { display: flex; align-items: baseline; gap: 4px; }
.lb-vit-num { font-size: 22px; font-weight: 500; color: var(--accent); }
.lb-vit-unit { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); }
.lb-caption { margin: 0; font-size: 11px; color: rgba(var(--text-primary-rgb), 0.4); text-align: center; line-height: 1.5; max-width: 160px; }

/* 雷达 */
.lb-radar-wrap { flex: 1 1 200px; min-width: 200px; }
.lb-h { margin: 0 0 8px; font-size: 13px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.lb-radar { width: 100%; max-width: 240px; display: block; margin: 0 auto; }
.lb-ring { fill: none; stroke: rgba(var(--accent-rgb), 0.12); stroke-width: 1; }
.lb-axis { stroke: rgba(var(--accent-rgb), 0.18); stroke-width: 1; }
.lb-shape { fill: rgba(var(--accent-rgb), 0.22); stroke: var(--accent); stroke-width: 1.5; }
.lb-axis-label { font-size: 9px; fill: rgba(var(--text-primary-rgb), 0.55); }

/* 三维投影 */
.lb-proj { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.lb-proj-col { display: flex; flex-direction: column; gap: 6px; }
.lb-bars { display: flex; flex-direction: column; gap: 5px; }
.lb-bar-row { display: grid; grid-template-columns: 36px 1fr 28px; align-items: center; gap: 6px; }
.lb-bar-label { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.6); white-space: nowrap; }
.lb-bar-track { height: 8px; border-radius: 4px; background: rgba(var(--accent-rgb), 0.1); overflow: hidden; }
.lb-bar-fill { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent)); transition: width 0.4s; }
.lb-bar-val { font-size: 10px; color: rgba(var(--text-primary-rgb), 0.5); text-align: right; }
.lb-empty { margin: 4px 0; font-size: 11px; color: rgba(var(--text-primary-rgb), 0.35); }

/* 概览 */
.lb-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.lb-sum { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; background: rgba(var(--bg-card-rgb), 0.5); border: 1px solid rgba(var(--accent-rgb), 0.06); }
.lb-sum-num { font-size: 15px; font-weight: 500; color: var(--accent); }
.lb-sum-label { font-size: 10px; color: rgba(var(--accent-rgb), 0.45); }

@media (max-width: 640px) {
  .lb-proj { grid-template-columns: 1fr; }
  .lb-summary { grid-template-columns: repeat(3, 1fr); }
  .lb-body { justify-content: center; }
}
@media (max-width: 480px) {
  .lb-summary { grid-template-columns: repeat(2, 1fr); }
}
</style>
