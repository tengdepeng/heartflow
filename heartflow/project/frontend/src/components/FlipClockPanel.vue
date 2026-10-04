<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useFlipClock, formatClock } from '../modules/flip-clock'

const { format, showSeconds, showDate, setFormat, toggleSeconds, toggleDate, reset } =
  useFlipClock()

const now = ref(new Date())
let timer: number | null = null

const parts = computed(() =>
  formatClock(now.value, {
    format: format.value,
    showSeconds: showSeconds.value,
    showDate: showDate.value,
  }),
)

const groups = computed(() => {
  const g: string[] = [parts.value.hh, parts.value.mm]
  if (showSeconds.value) g.push(parts.value.ss)
  return g
})

const dateText = computed(() => {
  const d = now.value
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <section class="fcl-panel">
    <header class="fcl-head">
      <div class="fcl-head-text">
        <span class="fcl-kicker">触角 · 时钟组件</span>
        <h3 class="fcl-title">翻页数字时钟</h3>
      </div>
      <span v-if="format === '12h'" class="fcl-meridiem">{{ parts.meridiem }}</span>
    </header>

    <div class="fcl-stage">
      <div class="fcl-clock">
        <template v-for="(g, gi) in groups" :key="gi">
          <span v-if="gi > 0" class="fcl-colon" aria-hidden="true">:</span>
          <span class="fcl-card">
            <Transition name="fcl-flip" mode="out-in">
              <span :key="g" class="fcl-digits">{{ g }}</span>
            </Transition>
          </span>
        </template>
      </div>
      <div v-if="showDate" class="fcl-date">{{ dateText }}</div>
    </div>

    <div class="fcl-controls">
      <div class="fcl-field">
        <span class="fcl-label">制式</span>
        <div class="fcl-seg">
          <button type="button" :class="{ active: format === '24h' }" @click="setFormat('24h')">24 时</button>
          <button type="button" :class="{ active: format === '12h' }" @click="setFormat('12h')">12 时</button>
        </div>
      </div>
      <div class="fcl-field fcl-field-checks">
        <label class="fcl-check">
          <input type="checkbox" :checked="showSeconds" @change="toggleSeconds" />
          <span>显示秒</span>
        </label>
        <label class="fcl-check">
          <input type="checkbox" :checked="showDate" @change="toggleDate" />
          <span>显示日期</span>
        </label>
      </div>
    </div>

    <button class="fcl-reset" type="button" @click="reset">恢复默认</button>
  </section>
</template>

<style scoped>
.fcl-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.55), rgba(var(--bg-card-rgb), 0.4));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
}

.fcl-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.fcl-kicker { font-size: 12px; letter-spacing: 0.12em; color: rgba(var(--accent-rgb), 0.7); }
.fcl-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; }

.fcl-meridiem {
  flex: none;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.14);
  color: rgba(var(--accent-rgb), 0.9);
  font-size: 12px;
  font-weight: 600;
}

.fcl-stage { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 14px 0 6px; }

.fcl-clock { display: flex; align-items: center; gap: 8px; }

.fcl-card {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 92px;
  border-radius: 14px;
  background: linear-gradient(180deg, #16121f, #0d0b14);
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(var(--accent-rgb), 0.18);
  overflow: hidden;
  perspective: 420px;
}

.fcl-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(0, 0, 0, 0.5);
}

.fcl-digits {
  font-size: 46px;
  font-weight: 700;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.fcl-colon { font-size: 40px; font-weight: 700; color: rgba(var(--accent-rgb), 0.5); }

.fcl-flip-enter-active { animation: fcl-flip-in 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
.fcl-flip-leave-active { animation: fcl-flip-out 0.5s cubic-bezier(0.22, 1, 0.36, 1); }

@keyframes fcl-flip-in {
  from { transform: rotateX(-90deg); opacity: 0; }
  to { transform: rotateX(0deg); opacity: 1; }
}

@keyframes fcl-flip-out {
  from { transform: rotateX(0deg); opacity: 1; }
  to { transform: rotateX(90deg); opacity: 0; }
}

.fcl-date { font-size: 12px; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 0.04em; }

.fcl-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 14px;
}

.fcl-field { display: flex; flex-direction: column; gap: 6px; }
.fcl-field-checks { flex-direction: row; gap: 16px; }

.fcl-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.6); }

.fcl-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: rgba(0, 0, 0, 0.2); }

.fcl-seg button {
  padding: 4px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.fcl-seg button.active { background: var(--accent); color: var(--bg-primary); font-weight: 600; }

.fcl-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
.fcl-check input { accent-color: var(--accent); }

.fcl-reset {
  display: block;
  margin: 14px auto 0;
  padding: 5px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  border-radius: 8px;
  background: none;
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.fcl-reset:hover { color: var(--text-primary); }

@media (max-width: 480px) {
  .fcl-card { width: 60px; height: 76px; }
  .fcl-digits { font-size: 36px; }
  .fcl-colon { font-size: 32px; }
}
</style>
