<template>
  <section class="audit-section">
    <div class="section-header">
      <div class="section-header-icon">⛨</div>
      <div>
        <h2 class="section-title">系统通知审计 · 零推送合规证明</h2>
        <span class="section-subtitle">
          仅记录本地 · 永不出本设备 · 宪法第5条端到端 fail-closed 可见
        </span>
      </div>
    </div>

    <!-- 合规状态条 -->
    <div class="audit-state" :class="constitutionBlocked ? 'is-blocked' : 'is-allowed'">
      <span class="audit-state-dot"></span>
      <span class="audit-state-text">
        宪法第5条（禁止主动推送系统通知）：
        <b>{{ constitutionBlocked ? '当前阻断 — 所有系统通知发射均被拦截' : '当前放行 — 仅显式构造点可发射' }}</b>
      </span>
    </div>

    <!-- 概览 -->
    <div class="audit-summary">
      <div class="audit-card">
        <span class="audit-num">{{ summary.total }}</span>
        <span class="audit-label">发射尝试</span>
      </div>
      <div class="audit-card audit-card--blocked">
        <span class="audit-num">{{ summary.blocked }}</span>
        <span class="audit-label">宪法拦截</span>
      </div>
      <div class="audit-card audit-card--delivered">
        <span class="audit-num">{{ summary.delivered }}</span>
        <span class="audit-label">实际落地</span>
      </div>
      <div class="audit-card audit-card--failed">
        <span class="audit-num">{{ summary.failed }}</span>
        <span class="audit-label">未落地（非拦截）</span>
      </div>
    </div>

    <!-- 最近记录 -->
    <div class="audit-list-wrap">
      <div class="audit-list-head">
        <span>最近发射记录（新 → 旧，本地留存最多 200 条）</span>
        <button class="audit-clear" @click="onClear" :disabled="!entries.length">清空本地记录</button>
      </div>

      <ul v-if="entries.length" class="audit-list">
        <li v-for="e in entries" :key="e.id" class="audit-item" :class="`is-${e.reason}`">
          <span class="audit-item-dot" :title="reasonLabel(e.reason)"></span>
          <span class="audit-item-time">{{ formatTime(e.at) }}</span>
          <span class="audit-item-title">{{ e.title || '（无标题）' }}</span>
          <span class="audit-item-badge" :class="{ 'b-blocked': e.blocked, 'b-delivered': e.delivered }">
            {{ e.blocked ? '被拦截' : e.delivered ? '已落地' : '未落地' }}
          </span>
        </li>
      </ul>
      <p v-else class="audit-empty">
        暂无发射记录。当你或系统的显式构造点尝试弹出系统通知时，会在此留痕——包括被宪法拦截的尝试。
      </p>
    </div>

    <!-- 合规说明 -->
    <p class="audit-note">
      说明：本面板的所有数据仅存储在你的本地设备（<code>hf:os-notification-audit</code>），
      不会上传、不会同步到任何云服务。它用于让你<b>亲眼证明</b>第5条「禁止主动推送」端到端 fail-closed——
      任何发射尝试要么被宪法拦截、要么由你显式触发。
    </p>
  </section>
</template>

<script setup lang="ts">
import { useOsNotificationAudit } from '@/modules/constitution/use-os-notification-audit'
import { showToast } from '@/modules/toast'

const { entries, summary, constitutionBlocked, clear } = useOsNotificationAudit()

function reasonLabel(r: string): string {
  return ({
    constitution: '宪法第5条拦截',
    'no-api': '环境无通知能力',
    'no-permission': '系统未授权',
    'construct-error': '构造异常',
    delivered: '已构造并交付',
  } as Record<string, string>)[r] ?? r
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function onClear(): void {
  clear()
  showToast('本地通知审计记录已清空', 'success')
}
</script>

<style scoped>
.audit-section {
  margin-bottom: 56px;
  position: relative;
  z-index: 1;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.section-header-icon {
  font-size: 18px;
  color: var(--accent);
  opacity: 0.7;
}
.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  color: var(--text-primary);
  letter-spacing: 0.5px;
}
.section-subtitle {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

/* 合规状态条 */
.audit-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  margin-bottom: 18px;
  font-size: 13px;
  color: var(--text-secondary);
}
.audit-state b { color: var(--text-primary); }
.audit-state-dot {
  width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto;
}
.audit-state.is-blocked { background: rgba(242, 120, 120, 0.06); }
.audit-state.is-blocked .audit-state-dot { background: #f27878; box-shadow: 0 0 8px #f27878; }
.audit-state.is-allowed { background: rgba(95, 217, 154, 0.06); }
.audit-state.is-allowed .audit-state-dot { background: #5fd99a; box-shadow: 0 0 8px #5fd99a; }

/* 概览 */
.audit-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.audit-card {
  padding: 16px 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}
.audit-num { font-size: 26px; font-weight: 600; font-family: var(--font-heading-zh); color: var(--text-primary); }
.audit-label { font-size: 11px; color: var(--text-secondary); letter-spacing: 0.3px; }
.audit-card--blocked .audit-num { color: #d4b464; }
.audit-card--delivered .audit-num { color: #5fd99a; }
.audit-card--failed .audit-num { color: #9a9aa6; }

/* 列表 */
.audit-list-wrap {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}
.audit-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}
.audit-clear {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
}
.audit-clear:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.audit-clear:disabled { opacity: 0.4; cursor: not-allowed; }

.audit-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
}
.audit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  font-size: 12px;
  border-bottom: 1px dashed var(--border-color);
}
.audit-item:last-child { border-bottom: none; }
.audit-item-dot {
  width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto;
  background: #9a9aa6;
}
.audit-item.is-delivered .audit-item-dot { background: #5fd99a; }
.audit-item.is-constitution .audit-item-dot { background: #d4b464; }
.audit-item.is-no-permission .audit-item-dot,
.audit-item.is-no-api .audit-item-dot,
.audit-item.is-construct-error .audit-item-dot { background: #9a9aa6; }
.audit-item-time { color: var(--text-secondary); flex: 0 0 auto; width: 64px; }
.audit-item-title {
  flex: 1 1 auto;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.audit-item-badge {
  flex: 0 0 auto;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}
.audit-item-badge.b-blocked { color: #d4b464; border-color: rgba(212, 180, 100, 0.3); background: rgba(212, 180, 100, 0.08); }
.audit-item-badge.b-delivered { color: #5fd99a; border-color: rgba(95, 217, 154, 0.3); background: rgba(95, 217, 154, 0.08); }

.audit-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
}

.audit-note {
  margin-top: 16px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-secondary);
  opacity: 0.85;
}
.audit-note code {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: var(--accent);
  opacity: 0.8;
}

@media (max-width: 640px) {
  .audit-summary { grid-template-columns: repeat(2, 1fr); }
}
</style>
