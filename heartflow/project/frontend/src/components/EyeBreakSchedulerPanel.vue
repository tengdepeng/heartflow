<template>
  <section class="gsp-panel" aria-label="用眼休息调度">
    <div class="gsp-panel-head">
      <span class="gsp-panel-title">🕐 用眼休息调度</span>
      <span class="gsp-panel-sub">20-20-20 · 专注休息节律</span>
    </div>

    <!-- 关闭态 -->
    <div v-if="!enabled" class="gsp-disabled">
      <p class="gsp-disabled-text">
        20-20-20 用眼休息已关闭。在「护眼盾」配置里开启，我会在专注间轻声提醒你起身眺望。
      </p>
    </div>

    <template v-else>
      <!-- 实时倒计时 -->
      <div class="gsp-count" :class="{ due: due }">
        <span class="gsp-count-value">{{ formatCountdown(secondsLeft) }}</span>
        <span class="gsp-count-label">{{ due ? '该起来眺望 6 米外 20 秒了' : '距下次放松' }}</span>
        <p class="gsp-count-advice" v-if="due">起身走动，闭目或望向远处，让睫状肌松开。</p>
      </div>

      <!-- 动作 -->
      <div class="gsp-actions">
        <button v-if="due" class="gsp-btn gsp-btn--primary" @click="takeBreak">✅ 完成休息</button>
        <button v-if="due" class="gsp-btn" @click="deferBreak">稍后 5 分钟</button>
        <button v-else class="gsp-btn" :class="{ active: running }" @click="running ? stop() : start()">
          {{ running ? '⏸ 暂停计时' : '▶ 开始计时' }}
        </button>
      </div>

      <!-- 今日节律 -->
      <div class="gsp-stats">
        <span class="gsp-stat"><em>{{ stats.rests }}</em> 今日休息</span>
        <span class="gsp-stat"><em>{{ stats.defers }}</em> 稍后</span>
        <span class="gsp-stat" v-if="stats.lastRestAt">上次休息 {{ restTimeText }}</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useEyeBreakScheduler, formatCountdown } from '../modules/eye-shield'

const scheduler = useEyeBreakScheduler()
const enabled = computed(() => scheduler.breakMinutes.value > 0)
const running = computed(() => scheduler.running.value)
const due = computed(() => scheduler.due.value)
const secondsLeft = computed(() => scheduler.secondsLeft.value)
const stats = computed(() => scheduler.stats.value)

const restTimeText = computed(() => {
  const at = stats.value.lastRestAt
  if (!at) return ''
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

function start() {
  scheduler.start()
}
function stop() {
  scheduler.stop()
}
function takeBreak() {
  scheduler.takeBreak()
}
function deferBreak() {
  scheduler.deferBreak()
}

onMounted(() => {
  // 面板可见即开始计时，让倒计时实时流动（scope dispose 自动清理定时器）
  scheduler.start()
})
</script>

<style scoped>
.gsp-panel {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.gsp-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.gsp-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.gsp-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.gsp-disabled {
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.gsp-disabled-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-medium);
}
.gsp-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 22px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.gsp-count.due {
  border-color: rgba(224, 169, 109, 0.45);
  background: rgba(196, 106, 90, 0.12);
}
.gsp-count-value {
  font-size: 42px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(240, 242, 255, 0.94);
  line-height: 1;
}
.gsp-count.due .gsp-count-value {
  color: #e0a96d;
}
.gsp-count-label {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.gsp-count-advice {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-high);
}
.gsp-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.gsp-btn {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.gsp-btn:hover {
  border-color: rgba(240, 192, 64, 0.5);
}
.gsp-btn.active {
  border-color: rgba(138, 154, 122, 0.6);
  background: rgba(138, 154, 122, 0.18);
}
.gsp-btn--primary {
  border-color: rgba(196, 106, 90, 0.6);
  background: rgba(196, 106, 90, 0.22);
  color: #f5d9d2;
}
.gsp-btn--primary:hover {
  border-color: #c46a5a;
  background: rgba(196, 106, 90, 0.32);
}
.gsp-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-medium);
}
.gsp-stat em {
  font-style: normal;
  font-weight: 700;
  color: #f0c040;
}
</style>