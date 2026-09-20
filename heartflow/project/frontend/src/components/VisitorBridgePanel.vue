<template>
  <section class="vbp" data-test="visitor-bridge-panel" aria-label="访客·桥接总览">
    <header class="vbp-head">
      <div class="vbp-head-text">
        <h3 class="vbp-title">🚪 访客·桥接总览</h3>
        <p class="vbp-sub">门禁概览 · 会话剩余 · 足迹留痕 — 一屏守望访客与殿堂的每一次相遇</p>
      </div>
      <div class="vbp-badge">
        <span class="vbp-badge-dot" :class="statusKey" data-test="vbp-status"></span>
        <span class="vbp-badge-label">{{ statusLabel }}</span>
      </div>
    </header>

    <!-- 门禁概览 -->
    <div class="vbp-block" data-test="vbp-summary">
      <span class="vbp-block-label">门禁概览</span>
      <div class="vbp-grid">
        <div class="vbp-cell" v-for="c in cells" :key="c.key" data-test="vbp-cell">
          <b class="vbp-cell-value">{{ c.value }}</b>
          <span class="vbp-cell-label">{{ c.label }}</span>
        </div>
      </div>
      <div class="vbp-lastvisit" data-test="vbp-lastvisit">最近访问 · {{ fmtVisit(summary.lastVisitAt) }}</div>
    </div>

    <!-- 活跃会话 · 剩余时间 -->
    <div v-if="infos.length" class="vbp-block" data-test="vbp-sessions">
      <span class="vbp-block-label">活跃会话 · 门禁状态</span>
      <div class="vbp-list">
        <div class="vbp-item" v-for="s in infos" :key="s.session.id" data-test="vbp-session">
          <div class="vbp-item-head">
            <span class="vbp-item-avatar">{{ roleIcon(s.session.role) }}</span>
            <span class="vbp-item-name">{{ s.session.name }}</span>
            <span class="vbp-item-role">{{ roleLabel(s.session.role) }}</span>
            <b class="vbp-item-state" :class="s.isExpired ? 'exp' : 'ok'">
              {{ s.isExpired ? '已过期' : '门禁有效' }}
            </b>
          </div>
          <div class="vbp-item-meta">
            <span>足迹 {{ s.footprintCount }} 处</span>
            <span v-if="s.remainingTime">· 剩余 {{ s.remainingTime }}</span>
            <span v-if="s.session.allowedRooms?.length">· 可访问 {{ s.session.allowedRooms.length }} 房</span>
            <span v-if="s.isExpired">· 请续期或重新邀请</span>
          </div>
        </div>
      </div>
    </div>

    <p v-if="emptyAll" class="vbp-empty" data-test="vbp-empty">
      殿堂的门还很安静。创建第一个访客会话、生成一枚邀请码，访客足迹将在这里显影。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVisitorBridge } from '../modules/visitor/visitor-bridge'
import { VISITOR_ROLE_LABELS } from '../modules/visitor'
import { getRoom } from '../engine/room-graph'

const bridge = useVisitorBridge()

const summary = computed(() => bridge.summary.value)
const infos = computed(() => bridge.sessionInfos.value)

const ROLE_ICON: Record<string, string> = { family: '👪', friend: '🤝', guest: '🧑‍🎤', collaborator: '🧑‍💻' }
function roleIcon(role: string): string { return ROLE_ICON[role] ?? '🧑‍🦱' }
function roleLabel(role: string): string { return VISITOR_ROLE_LABELS[role as keyof typeof VISITOR_ROLE_LABELS] ?? role }

const mostActiveRoomName = computed(() => {
  const id = summary.value.mostActiveRoom
  if (!id) return '—'
  return getRoom(id)?.name ?? id
})

const LAST_VISIT_FMT = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
function fmtVisit(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso)
  return Number.isNaN(t.getTime()) ? '—' : `${LAST_VISIT_FMT.format(t)}`
}

const cells = computed(() => [
  { key: 'active', label: '活跃会话', value: summary.value.activeSessions },
  { key: 'total', label: '会话累计', value: summary.value.totalSessions },
  { key: 'pending', label: '待办邀请', value: summary.value.pendingInvitations },
  { key: 'rules', label: '活跃规则', value: summary.value.activeRules },
  { key: 'footprints', label: '足迹总数', value: summary.value.totalFootprints },
  { key: 'room', label: '最活跃房间', value: mostActiveRoomName.value },
])

const statusKey = computed(() => {
  const s = summary.value
  if (s.totalFootprints === 0 && s.activeSessions === 0) return 'idle'
  if (s.pendingInvitations > 0) return 'open'
  return 'active'
})

const statusLabel = computed(() => {
  const s = summary.value
  if (s.totalFootprints === 0 && s.activeSessions === 0) return '待客'
  if (s.pendingInvitations > 0) return '有邀约'
  return '往来中'
})

const emptyAll = computed(() =>
  infos.value.length === 0 &&
  summary.value.totalFootprints === 0 &&
  summary.value.totalSessions === 0
)
</script>

<style scoped>
.vbp {
  background: linear-gradient(160deg, rgba(200, 214, 224, 0.08), rgba(200, 214, 224, 0.02));
  border: 1px solid rgba(200, 214, 224, 0.14);
  border-radius: 14px;
  padding: 16px 18px;
  color: var(--text);
}
.vbp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.vbp-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.vbp-sub {
  margin: 3px 0 0;
  font-size: 12px;
  opacity: 0.55;
}
.vbp-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(200, 214, 224, 0.08);
}
.vbp-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.vbp-badge-dot.idle { background: #95a5a6; }
.vbp-badge-dot.open { background: #d0b269; }
.vbp-badge-dot.active { background: #8a9a7a; }
.vbp-badge-label { font-size: 12px; opacity: 0.8; }
.vbp-block { margin-top: 12px; }
.vbp-block:first-of-type { margin-top: 0; }
.vbp-block-label {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.55;
  margin-bottom: 8px;
}
.vbp-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.vbp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(200, 214, 224, 0.05);
  border: 1px solid rgba(200, 214, 224, 0.08);
}
.vbp-cell-value {
  font-size: 15px;
  font-weight: 600;
}
.vbp-cell-label { font-size: 11px; opacity: 0.6; }
.vbp-lastvisit {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.55;
}
.vbp-list { display: flex; flex-direction: column; gap: 8px; }
.vbp-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(200, 214, 224, 0.05);
  border: 1px solid rgba(200, 214, 224, 0.08);
}
.vbp-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.vbp-item-avatar {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(200, 214, 224, 0.12);
  font-size: 13px;
}
.vbp-item-name { font-weight: 600; }
.vbp-item-role { font-size: 11px; opacity: 0.6; }
.vbp-item-state {
  margin-left: auto;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}
.vbp-item-state.ok { background: rgba(138, 154, 122, 0.18); color: #a8b898; }
.vbp-item-state.exp { background: rgba(196, 106, 90, 0.18); color: #d08a7a; }
.vbp-item-meta {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.65;
}
.vbp-empty {
  margin: 12px 0 0;
  font-size: 12px;
  opacity: 0.55;
}
</style>