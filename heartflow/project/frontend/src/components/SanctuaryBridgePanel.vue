<template>
  <section class="snb" data-test="sanctuary-bridge-panel" aria-label="安全岛·中枢总览">
    <header class="snb-head">
      <div class="snb-head-text">
        <h3 class="snb-title">🕊️ 安全岛·中枢总览</h3>
        <p class="snb-sub">激活中枢 · 会话统计 · 使用建议 — 一处守望静默陪伴的运转</p>
      </div>
      <div class="snb-badge" data-test="snb-badge">
        <span class="snb-badge-dot" :class="statusKey" data-test="snb-status"></span>
        <span class="snb-badge-label">{{ statusLabel }}</span>
      </div>
    </header>

    <!-- 会话统计 -->
    <div class="snb-block" data-test="snb-stats">
      <span class="snb-block-label">会话统计</span>
      <div class="snb-grid">
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ st.totalActivations }}</b>
          <span class="snb-cell-label">总激活</span>
        </div>
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ st.sessionsToday }}</b>
          <span class="snb-cell-label">今日会话</span>
        </div>
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ fmtSec(st.avgDuration) }}</b>
          <span class="snb-cell-label">平均停留</span>
        </div>
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ fmtSec(st.longestSession) }}</b>
          <span class="snb-cell-label">最长停留</span>
        </div>
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ fmtSec(st.shortestSession) }}</b>
          <span class="snb-cell-label">最短停留</span>
        </div>
      </div>
    </div>

    <!-- 触发配置 -->
    <div class="snb-block" data-test="snb-config">
      <span class="snb-block-label">触发配置</span>
      <div class="snb-grid">
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ cfg.tapCount }}</b>
          <span class="snb-cell-label">触发次数</span>
        </div>
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ cfg.windowMs }}ms</b>
          <span class="snb-cell-label">触发窗口</span>
        </div>
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ cfg.autoExit ? '开' : '关' }}</b>
          <span class="snb-cell-label">自动退出</span>
        </div>
        <div class="snb-cell" data-test="snb-cell">
          <b class="snb-cell-value">{{ Math.round(cfg.progress * 100) }}%</b>
          <span class="snb-cell-label">触发进度</span>
        </div>
      </div>
    </div>

    <!-- 使用建议 -->
    <div class="snb-block" data-test="snb-recs">
      <span class="snb-block-label">使用建议</span>
      <p v-if="recs.length === 0" class="snb-empty" data-test="snb-recs-empty">
        还没有建议，先静默陪伴几次吧。
      </p>
      <ul v-else class="snb-rec-list">
        <li v-for="(r, i) in recs" :key="i" class="snb-rec" data-test="snb-rec">
          <span class="snb-rec-pri" :class="'pri--' + r.priority">{{ priLabel(r.priority) }}</span>
          <span class="snb-rec-title">{{ r.title }}</span>
          <span class="snb-rec-desc">{{ r.description }}</span>
          <span v-if="r.action" class="snb-rec-action">{{ r.action }}</span>
        </li>
      </ul>
    </div>

    <!-- 激活历史 -->
    <div class="snb-block" data-test="snb-history">
      <span class="snb-block-label">最近激活</span>
      <p v-if="history.length === 0" class="snb-empty" data-test="snb-history-empty">
        尚无激活记录。
      </p>
      <ul v-else class="snb-history-list">
        <li v-for="s in history" :key="s.id" class="snb-history-item" data-test="snb-history-item">
          <span class="snb-history-reason">{{ s.reason }}</span>
          <span class="snb-history-meta">{{ fmtTime(s.startTime) }} · {{ fmtSec(s.duration) }}</span>
        </li>
      </ul>
    </div>

    <p v-if="isIdle" class="snb-empty" data-test="snb-empty">
      中枢尚在待命。当静默陪伴被唤醒，会话统计与建议将在这里显影。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSanctuaryBridge } from '../modules/sanctuary/sanctuary-bridge'

const bridge = useSanctuaryBridge()
const st = computed(() => bridge.sessionStats.value)
const cfg = computed(() => bridge.triggerConfig.value)
const recs = computed(() => bridge.recommendations.value)
const history = computed(() => bridge.getSessionHistory(5))
const active = computed(() => bridge.sanctuaryState.value.isActive)

const isIdle = computed(() => st.value.totalActivations === 0)

const statusKey = computed(() => {
  if (active.value) return 'resting'
  if (st.value.totalActivations > 0) return 'echo'
  return 'idle'
})
const statusLabel = computed(() => {
  if (active.value) return '安住中'
  if (st.value.totalActivations > 0) return '有回响'
  return '待触发'
})

function fmtSec(sec: number): string {
  if (!sec) return '0s'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}m${s}s` : `${m}m`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function priLabel(p: string): string {
  if (p === 'high') return '高'
  if (p === 'medium') return '中'
  return '低'
}
</script>

<style scoped>
.snb {
  width: 264px;
  background: linear-gradient(165deg, rgba(30, 22, 16, 0.9), rgba(16, 12, 9, 0.94));
  border: 1px solid rgba(212, 165, 116, 0.16);
  border-radius: 16px;
  padding: 14px 16px;
  color: rgba(220, 200, 180, 0.86);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
}
.snb-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.snb-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.snb-sub {
  margin: 3px 0 0;
  font-size: 11px;
  opacity: 0.55;
}
.snb-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(212, 165, 116, 0.1);
}
.snb-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.snb-badge-dot.idle { background: #95a5a6; }
.snb-badge-dot.echo { background: #8a9a7a; }
.snb-badge-dot.resting { background: #d0b269; }
.snb-badge-label { font-size: 11px; opacity: 0.85; }
.snb-block { margin-top: 12px; }
.snb-block:first-of-type { margin-top: 0; }
.snb-block-label {
  display: inline-block;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.55;
  margin-bottom: 7px;
}
.snb-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.snb-grid::before,
.snb-grid::after {
  content: '';
}
.snb-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(212, 165, 116, 0.05);
  border: 1px solid rgba(212, 165, 116, 0.08);
}
.snb-cell-value {
  font-size: 14px;
  font-weight: 600;
}
.snb-cell-label {
  font-size: 10px;
  opacity: 0.6;
}
.snb-rec-list, .snb-history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.snb-rec {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(212, 165, 116, 0.04);
  border: 1px solid rgba(212, 165, 116, 0.08);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.snb-rec-pri {
  align-self: flex-start;
  font-size: 9px;
  padding: 1px 7px;
  border-radius: 999px;
}
.snb-rec-pri.pri--high { background: rgba(196, 106, 90, 0.22); color: #d08a7a; }
.snb-rec-pri.pri--medium { background: rgba(208, 178, 105, 0.18); color: #d0b269; }
.snb-rec-pri.pri--low { background: rgba(138, 154, 122, 0.18); color: #8a9a7a; }
.snb-rec-title { font-size: 12px; font-weight: 600; }
.snb-rec-desc { font-size: 11px; opacity: 0.7; line-height: 1.5; }
.snb-rec-action { font-size: 10px; opacity: 0.55; }
.snb-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(10, 8, 6, 0.3);
  border: 0.5px solid transparent;
}
.snb-history-reason { font-size: 11px; }
.snb-history-meta { font-size: 10px; opacity: 0.55; flex-shrink: 0; }
.snb-empty { margin: 6px 0 0; font-size: 11px; opacity: 0.55; line-height: 1.6; }
</style>