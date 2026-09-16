<template>
  <section data-enter class="march-panel">
    <header class="march-head">
      <span class="march-title">🧠 记忆档案</span>
      <div class="march-tabs">
        <button :class="['march-tab', { on: tab === 'recite' }]" @click="tab = 'recite'">背诵</button>
        <button :class="['march-tab', { on: tab === 'mastery' }]" @click="tab = 'mastery'">掌握</button>
      </div>
    </header>

    <!-- 背诵档案 -->
    <template v-if="tab === 'recite'">
      <p v-if="!reciteCards.length" class="march-empty">{{ reciteInsight[0] }}</p>
      <template v-else>
        <div class="march-summary">
          <div class="march-chip"><b>{{ ro.total }}</b><span>卡片</span></div>
          <div class="march-chip"><b>{{ ro.mastered }}</b><span>全遮盖</span></div>
          <div class="march-chip"><b>{{ ro.untouched }}</b><span>未启</span></div>
          <div class="march-chip"><b>{{ ro.avgBestAccuracy }}%</b><span>均准</span></div>
          <div class="march-chip"><b>{{ ro.masteryRate }}%</b><span>掌握率</span></div>
        </div>
        <!-- 进度分布 -->
        <div class="march-block">
          <h5 class="march-block-title">遮盖档位分布</h5>
          <div class="march-dist">
            <div v-for="s in reciteSteps" :key="s.stepIndex" class="march-dist-col">
              <span class="march-dist-count">{{ s.count }}</span>
              <span class="march-dist-fill" :style="{ height: `${distHeight(s.count, 'recite')}%` }"></span>
              <span class="march-dist-label">{{ s.label }}</span>
            </div>
          </div>
        </div>
        <div class="march-block">
          <h5 class="march-block-title">节奏</h5>
          <p class="march-line">练过 {{ rhythm.practicedCards }} 张 · 均 {{ rhythm.avgAttemptsPerCard }} 遍 · 达标率 {{ rhythm.passRate }}%</p>
          <p v-if="rhythm.weakTokens.length" class="march-line">易错：<span v-for="w in rhythm.weakTokens.slice(0, 3)" :key="w.token" class="march-token">「{{ w.token }}」</span></p>
        </div>
        <div class="march-block" v-if="reciteInsight.length">
          <h5 class="march-block-title">温和回看</h5>
          <p v-for="(i, idx) in reciteInsight" :key="idx" class="march-insight">· {{ i }}</p>
        </div>
      </template>
    </template>

    <!-- 掌握度档案 -->
    <template v-else>
      <p v-if="!masteryItems.length" class="march-empty">{{ masteryObserve[0] }}</p>
      <template v-else>
        <div class="march-summary">
          <div class="march-chip"><b>{{ mo.total }}</b><span>知识点</span></div>
          <div class="march-chip"><b>{{ mo.mastered }}</b><span>通晓</span></div>
          <div class="march-chip"><b>{{ mo.learning }}</b><span>练习中</span></div>
          <div class="march-chip"><b>{{ mo.fresh }}</b><span>待学</span></div>
          <div class="march-chip"><b>{{ mo.avgConfidence }}</b><span>均掌握</span></div>
        </div>
        <!-- 三态分布 -->
        <div class="march-block">
          <h5 class="march-block-title">状态分布</h5>
          <div class="march-states">
            <div v-for="s in masteryStates" :key="s.state" class="march-state">
              <span class="march-state-icon" :style="{ color: s.color }">{{ s.icon }}</span>
              <span class="march-state-count">{{ s.count }}</span>
              <span class="march-state-label">{{ s.label }}</span>
            </div>
          </div>
        </div>
        <div class="march-block">
          <h5 class="march-block-title">节奏</h5>
          <p class="march-line">近7天 {{ mrhythm.weeklyAttempts }} 次 · 近30天 {{ mrhythm.monthlyAttempts }} 次 · 连续 {{ mrhythm.streakDays }} 天</p>
        </div>
        <div class="march-block" v-if="weak.length">
          <h5 class="march-block-title">最该回炉</h5>
          <p class="march-line"><span v-for="w in weak.slice(0, 4)" :key="w.item.id" class="march-token">{{ w.stateLabel }}·{{ w.item.topic }}</span></p>
        </div>
        <div class="march-block" v-if="masteryObserve.length">
          <h5 class="march-block-title">温和回看</h5>
          <p v-for="(i, idx) in masteryObserve" :key="idx" class="march-insight">· {{ i }}</p>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecite } from '../modules/recite'
import { useMastery } from '../modules/mastery'
import {
  reciteOverview,
  reciteStepDistribution,
  reciteRhythm,
  reciteInsights,
} from '../modules/recite/recite-analytics'
import {
  masteryOverview,
  masteryStateDistribution,
  weakList,
  masteryRhythm,
  masteryInsights,
} from '../modules/mastery/mastery-analytics'

const tab = ref<'recite' | 'mastery'>('recite')

// 与工具面板一致：自持实例读持久化档案
const recite = useRecite()
const mastery = useMastery()

const reciteCards = computed(() => recite.cards.value)
const masteryItems = computed(() => mastery.items.value)

const ro = computed(() => reciteOverview(reciteCards.value))
const reciteSteps = computed(() => reciteStepDistribution(reciteCards.value))
const rhythm = computed(() => reciteRhythm(reciteCards.value))
const reciteInsight = computed(() => reciteInsights(reciteCards.value, 4))

const mo = computed(() => masteryOverview(masteryItems.value))
const masteryStates = computed(() => masteryStateDistribution(masteryItems.value))
const weak = computed(() => weakList(masteryItems.value))
const mrhythm = computed(() => masteryRhythm(masteryItems.value, new Date()))
const masteryObserve = computed(() => masteryInsights(masteryItems.value, new Date(), 4))

function distHeight(count: number, which: 'recite'): number {
  const max = which === 'recite'
    ? Math.max(1, ...reciteSteps.value.map((s) => s.count))
    : 1
  return Math.round((count / max) * 100)
}
</script>

<style scoped>
.march-panel { padding: 16px; border-radius: 12px; background: var(--bg-card); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.march-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.march-title { font-size: 14px; letter-spacing: 2px; color: rgba(var(--accent-rgb), 0.75); }
.march-tabs { display: flex; gap: 6px; }
.march-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 2px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: transparent; color: inherit; font-size: 12px; cursor: pointer; 
  min-height: 26px;
}
.march-tab.on { background: rgba(var(--accent-rgb), 0.22); border-color: rgba(var(--accent-rgb), 0.5); }

.march-empty { font-size: 12px; opacity: 0.55; padding: 4px 0; }

.march-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.march-chip { flex: 1; min-width: 64px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.march-chip b { font-size: 16px; color: #e8dcc8; }
.march-chip span { font-size: 11px; opacity: 0.55; }

.march-block { margin-top: 12px; }
.march-block-title { margin: 0 0 8px; font-size: 12px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.6); }

.march-dist { display: flex; align-items: flex-end; gap: 4px; height: 52px; }
.march-dist-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; height: 100%; }
.march-dist-fill { display: block; width: 100%; min-height: 2px; border-radius: 2px 2px 0 0; background: rgba(var(--accent-rgb), 0.45); }
.march-dist-count { font-size: 11px; opacity: 0.7; }
.march-dist-label { font-size: 9px; opacity: 0.4; }

.march-states { display: flex; gap: 8px; }
.march-state { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.march-state-icon { font-size: 18px; }
.march-state-count { font-size: 16px; color: #e8dcc8; }
.march-state-label { font-size: 11px; opacity: 0.55; }

.march-line { margin: 4px 0; font-size: 12px; line-height: 1.8; opacity: 0.75; display: flex; flex-wrap: wrap; gap: 6px; }
.march-token { display: inline-block; padding: 1px 8px; border-radius: 999px; background: rgba(240,192,64,0.12); color: #e8dcc8; font-size: 11px; }
.march-insight { margin: 4px 0; font-size: 12px; line-height: 1.7; opacity: 0.75; }
</style>