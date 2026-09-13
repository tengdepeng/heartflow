<template>
  <section class="pwap" aria-label="平行世界档案">
    <!-- 面板头 -->
    <div class="pwap-head">
      <div class="pwap-head-left">
        <span class="pwap-title">📜 平行世界档案</span>
        <span class="pwap-sub">概览 · 分布 · 节奏 · 健康 · 温和回看</span>
      </div>
      <div class="pwap-health" :class="'grade-' + health.label">
        <span class="pwap-health-num">{{ health.score }}</span>
        <span class="pwap-health-label">{{ health.label }}</span>
      </div>
    </div>

    <!-- 空态 -->
    <p v-if="overview.forks === 0 && overview.alts === 0 && overview.capsules === 0 && overview.branches === 0" class="pwap-empty">
      平行世界还是空的。种下一棵分叉树、映照一个平行自我，或封存一封时间胶囊，档案会在这里慢慢长出来。
    </p>

    <template v-else>
      <!-- 概览统计 -->
      <div class="pwap-stats">
        <div class="pwap-stat">
          <span class="pwap-stat-num">{{ overview.forks }}</span>
          <span class="pwap-stat-label">抉择分叉</span>
        </div>
        <div class="pwap-stat">
          <span class="pwap-stat-num">{{ overview.alts }}</span>
          <span class="pwap-stat-label">平行自我</span>
        </div>
        <div class="pwap-stat">
          <span class="pwap-stat-num">{{ overview.capsules }}</span>
          <span class="pwap-stat-label">时间胶囊</span>
        </div>
        <div class="pwap-stat">
          <span class="pwap-stat-num">{{ overview.branches }}</span>
          <span class="pwap-stat-label">时间分支</span>
        </div>
        <div class="pwap-stat">
          <span class="pwap-stat-num">{{ overview.checkpoints }}</span>
          <span class="pwap-stat-label">检查点</span>
        </div>
      </div>

      <!-- 分布 -->
      <div class="pwap-grid">
        <div v-if="altRows.length" class="pwap-block">
          <div class="pwap-block-title">平行自我来源</div>
          <div v-for="r in altRows" :key="r.key" class="pwap-row">
            <span class="pwap-row-label">{{ r.label }}</span>
            <div class="pwap-row-bar">
              <div class="pwap-row-fill" :style="{ width: r.pct + '%', background: r.color }"></div>
            </div>
            <span class="pwap-row-count">{{ r.count }} · {{ r.pct }}%</span>
          </div>
        </div>

        <div v-if="capRows.length" class="pwap-block">
          <div class="pwap-block-title">时间胶囊状态</div>
          <div v-for="r in capRows" :key="r.key" class="pwap-row">
            <span class="pwap-row-label">{{ r.label }}</span>
            <div class="pwap-row-bar">
              <div class="pwap-row-fill" :style="{ width: r.pct + '%', background: r.color }"></div>
            </div>
            <span class="pwap-row-count">{{ r.count }} · {{ r.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 节奏 -->
      <div class="pwap-block">
        <div class="pwap-block-title">抉择节奏</div>
        <div class="pwap-rhythm">
          <div class="pwap-rhythm-item">
            <span class="pwap-rhythm-num">{{ rhythm.forks7 }}</span>
            <span class="pwap-rhythm-label">近 7 天分叉</span>
          </div>
          <div class="pwap-rhythm-item">
            <span class="pwap-rhythm-num">{{ rhythm.forks30 }}</span>
            <span class="pwap-rhythm-label">近 30 天分叉</span>
          </div>
          <div class="pwap-rhythm-item">
            <span class="pwap-rhythm-num">{{ rhythm.calmDays === null ? '—' : rhythm.calmDays }}</span>
            <span class="pwap-rhythm-label">最久未抉择（天）</span>
          </div>
          <div class="pwap-rhythm-item">
            <span class="pwap-rhythm-num">{{ rhythm.avgCapsuleWait }}</span>
            <span class="pwap-rhythm-label">平均封存等待（天）</span>
          </div>
        </div>
      </div>

      <!-- 分支绽开 -->
      <div v-if="overview.branches > 0" class="pwap-block pwap-depth">
        <span class="pwap-depth-icon">🌿</span>
        <span class="pwap-depth-text">{{ depthLabel }}</span>
      </div>

      <!-- 健康维度 -->
      <div class="pwap-block">
        <div class="pwap-block-title">平行世界健康</div>
        <div class="pwap-dims">
          <div v-for="d in healthDims" :key="d.key" class="pwap-dim">
            <div class="pwap-dim-head">
              <span class="pwap-dim-label">{{ d.label }}</span>
              <span class="pwap-dim-value">{{ health[d.key] }}</span>
            </div>
            <div class="pwap-dim-bar">
              <div class="pwap-dim-fill" :style="{ width: health[d.key] + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 温和回看 -->
      <div v-if="insights.length" class="pwap-block pwap-insights">
        <div class="pwap-block-title">温和回看</div>
        <ul class="pwap-insight-list">
          <li v-for="(ins, i) in insights" :key="i" class="pwap-insight">💡 {{ ins }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  parallelOverview,
  altSelfSourceRows,
  capsuleStatusRows,
  parallelRhythm,
  branchDepthLabel,
  parallelWorldHealth,
  parallelInsights,
} from '../modules/parallel-world/parallel-analytics'
import type { Fork, AltSelf } from '../modules/parallel-world/parallel-selves'
import type { Capsule } from '../modules/parallel-world/time-capsule'
import type { WorldBranch } from '../modules/parallel-world/types'

const props = defineProps<{
  forks: Fork[]
  alts: AltSelf[]
  capsules: Capsule[]
  branches: WorldBranch[]
}>()

const overview = computed(() => parallelOverview(props.forks, props.alts, props.capsules, props.branches))
const altRows = computed(() => altSelfSourceRows(props.alts))
const capRows = computed(() => capsuleStatusRows(props.capsules))
const rhythm = computed(() => parallelRhythm(props.forks, props.capsules))
const depthLabel = computed(() => branchDepthLabel(props.branches))
const health = computed(() => parallelWorldHealth(props.forks, props.alts, props.capsules, props.branches))
const insights = computed(() => parallelInsights(props.forks, props.alts, props.capsules, props.branches))

const healthDims: { key: 'breadth' | 'depth' | 'continuity'; label: string }[] = [
  { key: 'breadth', label: '探索广度' },
  { key: 'depth', label: '抉择深度' },
  { key: 'continuity', label: '时间延续' },
]
</script>

<style scoped>
.pwap {
  margin-top: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.pwap-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.pwap-head-left { display: flex; flex-direction: column; gap: 2px; }
.pwap-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.pwap-sub { font-size: 12px; opacity: 0.72; }
.pwap-health {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 12px; border-radius: 999px;
  background: rgba(138, 154, 122, 0.16); border: 1px solid rgba(138, 154, 122, 0.4);
}
.pwap-health-num { font-size: 18px; font-weight: 700; color: #cfe0b0; }
.pwap-health-label { font-size: 12px; color: #a9c08a; white-space: nowrap; }
.pwap-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }

.pwap-stats { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.pwap-stat {
  flex: 1; min-width: 72px; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 6px; border-radius: 10px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(195, 159, 106, 0.06);
}
.pwap-stat-num { font-size: 20px; font-weight: 700; color: #f0d9a8; }
.pwap-stat-label { font-size: 11px; color: #8a9a7a; }

.pwap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.pwap-block {
  border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px;
  background: rgba(195, 159, 106, 0.06);
}
.pwap-block-title { font-size: 12px; font-weight: 700; color: #d9c390; margin-bottom: 6px; }
.pwap-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; }
.pwap-row-label { color: #e8ddc8; white-space: nowrap; width: 64px; }
.pwap-row-bar { flex: 1; height: 6px; border-radius: 999px; background: rgba(195, 159, 106, 0.12); overflow: hidden; }
.pwap-row-fill { height: 100%; border-radius: 999px; }
.pwap-row-count { font-size: 11px; color: #8a8a80; white-space: nowrap; }

.pwap-rhythm { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.pwap-rhythm-item { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 6px; border-radius: 8px; background: rgba(195, 159, 106, 0.05); }
.pwap-rhythm-num { font-size: 16px; font-weight: 700; color: #f0d9a8; }
.pwap-rhythm-label { font-size: 10px; color: #8a8a80; text-align: center; }

.pwap-depth { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.pwap-depth-icon { font-size: 16px; }
.pwap-depth-text { font-size: 12px; color: #cfe0b0; }

.pwap-dims { display: flex; flex-direction: column; gap: 6px; }
.pwap-dim-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
.pwap-dim-label { color: #e8ddc8; }
.pwap-dim-value { color: #f0d9a8; font-weight: 600; }
.pwap-dim-bar { height: 6px; border-radius: 999px; background: rgba(195, 159, 106, 0.12); overflow: hidden; }
.pwap-dim-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #c4956a, #8a9a7a); }

.pwap-insights { margin-top: 8px; }
.pwap-insight-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.pwap-insight { font-size: 12px; color: #e0d4ba; line-height: 1.6; }

@media (max-width: 480px) {
  .pwap-grid { grid-template-columns: 1fr; }
}
</style>
