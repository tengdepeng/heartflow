<template>
  <section class="sm-panel" aria-label="自体镜像概览">
    <div class="sm-panel-head">
      <span class="sm-panel-title">🪞 自体镜像</span>
      <span class="sm-panel-sub">十二维度 · 自评与洞察</span>
    </div>

    <!-- 平衡度 -->
    <div class="sm-block">
      <span class="sm-block-label">平衡度</span>
      <div class="sm-balance">
        <div class="sm-balance-ring">
          <svg viewBox="0 0 36 36" class="sm-balance-svg">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3" />
            <circle cx="18" cy="18" r="15.5" fill="none"
              :stroke="balance.color"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="`${balance.score * 1.02} 102`"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span class="sm-balance-val">{{ balance.score }}</span>
        </div>
        <div class="sm-balance-info">
          <span class="sm-balance-label" :style="{ color: balance.color }">{{ balance.label }}</span>
          <p v-for="(s, i) in balance.suggestions" :key="i" class="sm-balance-suggest">{{ s }}</p>
        </div>
      </div>
    </div>

    <!-- 星盘洞察 -->
    <div class="sm-block">
      <span class="sm-block-label">星盘洞察</span>
      <div class="sm-insight-row">
        <span class="sm-insight">最强：{{ insight.strongest }}</span>
        <span class="sm-insight">最弱：{{ insight.weakest }}</span>
      </div>
      <p class="sm-overall">{{ insight.advice }}</p>
    </div>

    <!-- 分布 -->
    <div class="sm-block">
      <span class="sm-block-label">星级分布</span>
      <div class="sm-dist">
        <div v-for="d in distribution" :key="d.label" class="sm-dist-row">
          <span class="sm-dist-label">{{ d.label }}</span>
          <div class="sm-dist-bar-wrap">
            <div class="sm-dist-bar" :style="{ width: distPct(d.count) + '%' }"></div>
          </div>
          <span class="sm-dist-count">{{ d.count }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSelfMirrorHousesStore } from '../modules/self-mirror'
import { computeHouseStats, assessBalance } from '../modules/self-mirror'
import { deriveAstrolabeInsight } from '../modules/self-mirror'

const store = getSelfMirrorHousesStore()
const houses = computed(() => store.houses.value)

const stats = computed(() => computeHouseStats(houses.value))
const balance = computed(() => assessBalance(houses.value))
const insight = computed(() => deriveAstrolabeInsight(houses.value))
const distribution = computed(() => stats.value.distribution)

function distPct(count: number): number {
  const max = Math.max(...distribution.value.map(d => d.count), 1)
  return Math.round((count / max) * 100)
}
</script>

<style scoped>
.sm-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.sm-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.sm-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}

.sm-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}

.sm-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.sm-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}

.sm-balance {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sm-balance-ring {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
}

.sm-balance-svg {
  width: 100%;
  height: 100%;
}

.sm-balance-val {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}

.sm-balance-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sm-balance-label {
  font-size: 13px;
  font-weight: 600;
}

.sm-balance-suggest {
  margin: 0;
  font-size: 10px;
  line-height: 1.5;
  color: var(--text-low);
}

.sm-insight-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sm-insight {
  font-size: 11px;
  color: rgba(240, 242, 255, 0.82);
}

.sm-overall {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(240, 242, 255, 0.8);
}

.sm-dist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sm-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sm-dist-label {
  width: 40px;
  font-size: 10px;
  color: var(--text-low);
  flex-shrink: 0;
}

.sm-dist-bar-wrap {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.sm-dist-bar {
  height: 100%;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.5);
}

.sm-dist-count {
  width: 20px;
  font-size: 10px;
  color: var(--text-medium);
  text-align: right;
}
</style>
