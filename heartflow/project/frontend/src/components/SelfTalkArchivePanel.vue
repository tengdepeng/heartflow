<template>
  <section v-if="hasData" class="stalk-panel">
    <header class="stalk-head">
      <span class="stalk-title">🪞 自我对话档案</span>
      <span class="stalk-health" :class="healthTone">{{ health?.label }}</span>
    </header>

    <!-- 健康分数 -->
    <div class="stalk-score" v-if="health">
      <div class="stalk-score-bar"><span class="stalk-score-fill" :style="{ width: `${health.score}%` }"></span></div>
      <span class="stalk-score-num">{{ health.score }}/100</span>
    </div>

    <!-- 概览 -->
    <div class="stalk-overview">
      <div class="stalk-ov-item"><b>{{ ov.total }}</b><span>条对话</span></div>
      <div class="stalk-ov-item"><b>{{ ov.totalWords }}</b><span>字沉淀</span></div>
      <div class="stalk-ov-item"><b>{{ ov.recent7 }}</b><span>近7天</span></div>
      <div class="stalk-ov-item"><b>{{ ov.sourceCount }}</b><span>来源房间</span></div>
      <div class="stalk-ov-item"><b>{{ ov.richCount }}</b><span>长对话</span></div>
    </div>

    <!-- 节律条 -->
    <div class="stalk-block">
      <h5 class="stalk-block-title">近 14 天留声</h5>
      <div class="stalk-bars">
        <div v-for="d in daily" :key="d.date" class="stalk-bar-col" :title="`${d.date} · ${d.count} 条`">
          <span class="stalk-bar-fill" :style="{ height: `${barHeight(d.count)}%` }"></span>
          <span class="stalk-bar-date">{{ d.date }}</span>
        </div>
      </div>
      <div class="stalk-rhythm" v-if="rhythm">
        <span v-if="rhythm.streakDays">连续 {{ rhythm.streakDays }} 天留声</span>
        <span v-if="rhythm.lastGapDays">距上次 {{ rhythm.lastGapDays }} 天</span>
        <span v-if="rhythm.peakSlot">常于「{{ rhythm.peakSlot }}」留声</span>
      </div>
    </div>

    <!-- 来源分布 -->
    <div class="stalk-block" v-if="sources.length">
      <h5 class="stalk-block-title">来自哪里的自己</h5>
      <div class="stalk-sources">
        <div v-for="s in sources" :key="s.key" class="stalk-source">
          <span class="stalk-source-label">{{ s.label }}</span>
          <div class="stalk-source-track"><span class="stalk-source-fill" :style="{ width: `${s.pct}%` }"></span></div>
          <span class="stalk-source-pct">{{ s.count }} · {{ s.pct }}%</span>
        </div>
      </div>
    </div>

    <!-- 回看建议 -->
    <div class="stalk-block" v-if="insights.length">
      <h5 class="stalk-block-title">温和回看</h5>
      <p v-for="(i, idx) in insights" :key="idx" class="stalk-insight">· {{ i }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SelfTalk } from '../modules/self'
import {
  selfTalkOverview,
  selfTalkDailyRows,
  selfTalkSourceRows,
  selfTalkRhythm,
  selfTalkHealth,
  selfTalkInsights,
  type SelfTalkSourceRow,
} from '../modules/self/self-talk-analytics'

const props = defineProps<{ talks: SelfTalk[] }>()

const now = new Date()
const hasData = computed(() => props.talks.length > 0)
const ov = computed(() => selfTalkOverview(props.talks, now))
const daily = computed(() => selfTalkDailyRows(props.talks, now, 14))
const sources = computed<SelfTalkSourceRow[]>(() => selfTalkSourceRows(props.talks))
const rhythm = computed(() => selfTalkRhythm(props.talks, now))
const health = computed(() => selfTalkHealth(props.talks, now))
const insights = computed(() => selfTalkInsights(props.talks, now, 4))

const healthTone = computed(() =>
  (health.value?.score ?? 0) >= 70 ? 'good' : (health.value?.score ?? 0) >= 45 ? 'mid' : 'low',
)

function barHeight(count: number): number {
  const max = Math.max(1, ...daily.value.map((d) => d.count))
  return Math.round((count / max) * 100)
}
</script>

<style scoped>
.stalk-panel {
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.stalk-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.stalk-title { font-size: 14px; letter-spacing: 2px; color: rgba(var(--accent-rgb), 0.75); }
.stalk-health { font-size: 12px; padding: 2px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); }
.stalk-health.good { color: #8a9a7a; }
.stalk-health.mid { color: #f0c040; }
.stalk-health.low { color: #c46a5a; }

.stalk-score { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.stalk-score-bar { flex: 1; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; }
.stalk-score-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #8a9a7a, #b89a6a); transition: width 0.4s; }
.stalk-score-num { font-size: 12px; opacity: 0.6; width: 56px; text-align: right; }

.stalk-overview { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.stalk-ov-item { flex: 1; min-width: 70px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.stalk-ov-item b { font-size: 16px; color: #e8dcc8; }
.stalk-ov-item span { font-size: 11px; opacity: 0.55; }

.stalk-block { margin-top: 12px; }
.stalk-block-title { margin: 0 0 8px; font-size: 12px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.6); }

.stalk-bars { display: flex; align-items: flex-end; gap: 4px; height: 56px; }
.stalk-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; height: 100%; }
.stalk-bar-fill { display: block; width: 100%; min-height: 2px; border-radius: 2px 2px 0 0; background: rgba(var(--accent-rgb), 0.45); }
.stalk-bar-date { font-size: 9px; opacity: 0.4; }
.stalk-rhythm { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; font-size: 11px; opacity: 0.6; }

.stalk-sources { display: flex; flex-direction: column; gap: 6px; }
.stalk-source { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.stalk-source-label { width: 84px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stalk-source-track { flex: 1; height: 5px; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; }
.stalk-source-fill { display: block; height: 100%; border-radius: 999px; background: rgba(var(--accent-rgb), 0.45); }
.stalk-source-pct { width: 64px; text-align: right; opacity: 0.55; }

.stalk-insight { margin: 4px 0; font-size: 12px; line-height: 1.7; opacity: 0.75; }
</style>