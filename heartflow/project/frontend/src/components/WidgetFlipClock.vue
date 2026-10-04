<script setup lang="ts">
// ============================================================
// 小组件内容 · 翻页数字时钟（flip-clock 类型）
// 复用 modules/flip-clock 的显示偏好（12/24h、是否显示秒），
// 每秒翻页；首页画布 / 系统小窗 / Android 卡同源。
// ============================================================
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useFlipClock, formatClock } from '../modules/flip-clock'

const { format, showSeconds } = useFlipClock()
const now = ref(new Date())
let timer: number | null = null

const parts = computed(() =>
  formatClock(now.value, { format: format.value, showSeconds: showSeconds.value, showDate: true }),
)
const dateLabel = computed(() => {
  const d = now.value
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>

<template>
  <div class="wfc">
    <div class="wfc-row">
      <span class="wfc-card"><span class="wfc-num">{{ parts.hh }}</span></span>
      <span class="wfc-sep">:</span>
      <span class="wfc-card"><span class="wfc-num">{{ parts.mm }}</span></span>
      <template v-if="showSeconds">
        <span class="wfc-sep">:</span>
        <span class="wfc-card wfc-card-sm"><span class="wfc-num">{{ parts.ss }}</span></span>
      </template>
      <span v-if="format === '12h'" class="wfc-meridiem">{{ parts.meridiem }}</span>
    </div>
    <div class="wfc-date">{{ dateLabel }}</div>
  </div>
</template>

<style scoped>
.wfc { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.wfc-row { display: flex; align-items: center; gap: 4px; }
.wfc-card {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 46px;
  padding: 0 6px;
  border-radius: 9px;
  background: linear-gradient(180deg, #2a3348, #1b2233);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 10px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
/* 翻页中缝：上下两半的分隔线 */
.wfc-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(0, 0, 0, 0.45);
}
.wfc-num {
  font-size: 26px;
  font-weight: 700;
  color: #eef2fb;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.wfc-card-sm { min-width: 34px; }
.wfc-card-sm .wfc-num { font-size: 20px; color: #b8c6e6; }
.wfc-sep { font-size: 22px; font-weight: 700; color: rgba(180, 195, 225, 0.6); }
.wfc-meridiem { margin-left: 4px; font-size: 11px; color: #8a94ad; }
.wfc-date { font-size: 11px; color: #8a94ad; letter-spacing: 0.5px; }
</style>
