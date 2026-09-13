<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance data-outflow-room">
    <!-- 氛围背景（仅辉光，房间根透明，不铺不透明渐变） -->
    <div data-enter class="dov-atmos">
      <div class="dov-warm-glow"></div>
    </div>

    <header data-enter class="dov-header">
      <div class="dov-ornament">
        <span class="dov-orn-line"></span>
        <span class="dov-orn-diamond">🚪</span>
        <span class="dov-orn-line"></span>
      </div>
      <h1 class="dov-title">数据流出日志</h1>
      <p class="dov-subtitle">守护室 · 记录每一次数据离开本设备的去向</p>
    </header>

    <section data-enter class="dov-body">
      <div class="dov-toolbar">
        <span class="dov-count">共 {{ logs.length }} 条记录</span>
        <button
          class="dov-clear"
          type="button"
          :disabled="logs.length === 0"
          @click="onClearAll"
        >清空全部</button>
      </div>

      <p class="dov-note">
        仅记录 时间 / 渠道 / 净化后的去向 / 摘要 —— 绝不含任何数据内容，写入失败亦不会阻塞主流程。
      </p>

      <div v-if="logs.length === 0" class="dov-empty">
        <span class="dov-empty-icon">🌿</span>
        <p>还没有数据离开本设备。</p>
      </div>

      <ul v-else class="dov-list">
        <li v-for="log in logs" :key="log.id" class="dov-item" :data-channel="log.channel">
          <span class="dov-dot" :style="{ background: channelColor(log.channel) }"></span>
          <div class="dov-item-main">
            <div class="dov-item-top">
              <span class="dov-channel">{{ log.channelLabel }}</span>
              <span class="dov-time">{{ formatTime(log.at) }}</span>
            </div>
            <div class="dov-target">去向：{{ log.target }}</div>
            <div class="dov-summary">{{ log.summary }}</div>
          </div>
        </li>
      </ul>
    </section>

    <!-- 外流态势（INCR-287 补挂载孤儿组件 OutflowArchivePanel：总览/渠道分布/近7天节奏/温和洞察，消费 guard/outflow-analytics 纯函数，引擎应用库内唯一） -->
    <section data-enter class="dov-archive">
      <OutflowArchivePanel :logs="logs" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import OutflowArchivePanel from '../components/OutflowArchivePanel.vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useDataOutflow, type OutflowChannel } from '../engine/data-outflow'

const { entranceRef, entranceClass } = useViewEntrance()
const { logs, load, clearAllOutflow } = useDataOutflow()

const CHANNEL_COLORS: Record<OutflowChannel, string> = {
  export: '#7a8a9a',
  sync: '#8a7a6a',
  'external-ai': '#c4a0b8',
  share: '#a08ac4',
  backup: '#6a8a7a',
}

function channelColor(ch: OutflowChannel): string {
  return CHANNEL_COLORS[ch] ?? '#8a8a8a'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function onClearAll(): void {
  if (logs.value.length === 0) return
  clearAllOutflow()
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.data-outflow-room {
  /* 房间根透明，仅留主题辉光；视图根用 min-height:100% 避免硬撑 100vh */
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 48px 20px 96px;
  gap: 26px;
  position: relative;
  overflow: hidden;
}

/* 氛围辉光（不透明渐变禁止，仅用半透明径向辉光） */
.dov-atmos {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.dov-warm-glow {
  position: absolute;
  top: 10%;
  left: 50%;
  width: min(560px, 84vw);
  height: min(560px, 84vw);
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(138, 122, 106, 0.10), transparent 68%);
  filter: blur(8px);
}

.dov-header,
.dov-body,
.dov-archive {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 640px;
}

.dov-archive { display: flex; flex-direction: column; gap: 0; }

.dov-header {
  text-align: center;
}
.dov-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}
.dov-orn-line {
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--text-muted), transparent);
}
.dov-orn-diamond {
  font-size: 14px;
  filter: grayscale(0.1);
}
.dov-title {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 4px;
  color: rgba(240, 242, 255, 0.92);
}
.dov-subtitle {
  margin: 8px 0 0;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-secondary);
}

.dov-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dov-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dov-count {
  font-size: 12px;
  color: var(--text-secondary);
}
.dov-clear {
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.7);
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: 999px;
  padding: 6px 16px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, opacity 0.2s;
}
.dov-clear:hover:not(:disabled) {
  border-color: rgba(196, 160, 184, 0.5);
  color: rgba(240, 242, 255, 0.92);
}
.dov-clear:disabled {
  opacity: 0.35;
  cursor: default;
}

.dov-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-low);
}

.dov-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 0;
  color: var(--text-dim);
}
.dov-empty-icon {
  font-size: 32px;
  opacity: 0.6;
}
.dov-empty p {
  margin: 0;
  font-size: 13px;
}

.dov-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dov-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-light);
}
.dov-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
}
.dov-item-main {
  flex: 1 1 auto;
  min-width: 0;
}
.dov-item-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.dov-channel {
  font-size: 13px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.85);
}
.dov-time {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
}
.dov-target {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-medium);
}
.dov-summary {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 移动端：收窄 padding，避免溢出 */
@media (max-width: 640px) {
  .data-outflow-room {
    padding: 32px 14px 88px;
    gap: 20px;
  }
  .dov-title {
    font-size: 22px;
  }
  .dov-body {
    max-width: 100%;
  }
}
</style>
