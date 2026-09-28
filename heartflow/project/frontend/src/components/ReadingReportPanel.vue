<template>
  <section class="rrp-panel" aria-label="年度阅读报告">
    <div class="rrp-head">
      <span class="rrp-title">📈 年度阅读报告</span>
      <span class="rrp-sub">{{ viewYear }} 年 · 把读过的每一页收进回顾</span>
    </div>

    <!-- 概览 -->
    <div class="rrp-grid">
      <div class="rrp-cell"><b>{{ report.totalBooks }}</b><span>藏书</span></div>
      <div class="rrp-cell"><b>{{ report.finishedBooks }}</b><span>本年读完</span></div>
      <div class="rrp-cell"><b>{{ report.totalMinutes }}</b><span>阅读分钟</span></div>
      <div class="rrp-cell"><b>{{ report.activeDays }}</b><span>阅读天数</span></div>
      <div class="rrp-cell"><b>{{ report.avgWpm }}</b><span>均速(字/分)</span></div>
      <div class="rrp-cell"><b>{{ report.totalWords }}</b><span>累计字数</span></div>
    </div>

    <p v-if="report.bestDay" class="rrp-best">
      本年度最投入的一天：{{ report.bestDay.date }} · {{ report.bestDay.minutes }} 分钟
    </p>
    <p v-else class="rrp-best rrp-best--none">今年还没有阅读记录，从今天开始吧。</p>

    <!-- 偏好标签 -->
    <div class="rrp-block">
      <h3 class="rrp-block-title">偏好标签</h3>
      <div v-if="report.topTags.length" class="rrp-chips">
        <span v-for="t in report.topTags" :key="t.tag" class="rrp-chip">{{ t.tag }} ×{{ t.count }}</span>
      </div>
      <p v-else class="rrp-empty-hint">暂无标签记录</p>
    </div>

    <!-- 月度趋势 -->
    <div class="rrp-block">
      <h3 class="rrp-block-title">月度阅读趋势</h3>
      <div v-if="report.monthly.length" class="rrp-trend" aria-label="月度阅读趋势">
        <div v-for="m in report.monthly" :key="m.month" class="rrp-trend-col"
          :title="`${m.label} 月 · ${m.books} 本 / ${m.minutes} 分钟`">
          <div class="rrp-trend-track">
            <i class="rrp-trend-fill" :style="{ height: barPct(m.minutes) + '%' }"></i>
          </div>
          <span class="rrp-trend-label">{{ m.label }}</span>
        </div>
      </div>
      <p v-else class="rrp-empty-hint">本年还没有月度数据</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useReadingReport } from '../modules/reading'

const { viewYear, report } = useReadingReport()

const maxMinutes = computed(() =>
  Math.max(1, ...report.value.monthly.map(m => m.minutes)),
)

function barPct(minutes: number): number {
  return Math.max(4, Math.round((minutes / maxMinutes.value) * 100))
}
</script>

<style scoped>
.rrp-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 18px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.rrp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rrp-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
  letter-spacing: 1px;
}

.rrp-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

.rrp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.rrp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 8px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  text-align: center;
}

.rrp-cell b {
  font-size: 20px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.rrp-cell span {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.rrp-best {
  margin: 0;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.65);
  text-align: center;
  letter-spacing: 0.5px;
}

.rrp-best--none {
  color: var(--text-low);
}

.rrp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rrp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.rrp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rrp-chip {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.rrp-empty-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
}

.rrp-trend {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 96px;
  padding: 4px 2px 0;
}

.rrp-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}

.rrp-trend-track {
  flex: 1;
  width: 100%;
  max-width: 22px;
  display: flex;
  align-items: flex-end;
  background: rgba(var(--accent-rgb), 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.rrp-trend-fill {
  display: block;
  width: 100%;
  border-radius: 4px;
  background: linear-gradient(180deg, #c49a5a, #8a9a7a);
  opacity: 0.85;
  transition: height 0.3s;
}

.rrp-trend-label {
  font-size: 10px;
  color: var(--text-low);
}

@media (max-width: 480px) {
  .rrp-grid {
    gap: 6px;
  }

  .rrp-cell b {
    font-size: 17px;
  }

  .rrp-panel {
    padding: 14px 14px;
  }
}
</style>
