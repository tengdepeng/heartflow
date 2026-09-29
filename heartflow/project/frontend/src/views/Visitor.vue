<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance vs">
    <!-- 氛围背景层：访客 · 门与足迹 -->
    <div data-enter class="vs-ambient" aria-hidden="true">
      <div class="vs-glow vs-glow--top"></div>
      <div class="vs-glow vs-glow--bottom"></div>
      <div class="vs-door" aria-hidden="true">
        <svg viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="1" opacity="0.04">
            <rect x="40" y="20" width="120" height="360" rx="6" />
            <circle cx="140" cy="210" r="4" fill="currentColor" />
            <line x1="100" y1="20" x2="100" y2="380" />
            <path d="M60 340 q20 -30 40 0 q20 30 40 0" />
          </g>
        </svg>
      </div>
      <div class="vs-node vs-node-1"></div>
      <div class="vs-node vs-node-2"></div>
    </div>

    <!-- Header -->
    <header data-enter class="vs-header">
      <div class="breadcrumb-row">
        <button class="breadcrumb-link" @click="nav.enterRoom('home-space')">
          <span class="breadcrumb-home-icon">🏠</span>
          <span>家</span>
        </button>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-link current">
          <span class="breadcrumb-icon">{{ roomData?.icon }}</span>
          <span>{{ roomData?.name }}</span>
        </span>
      </div>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="vs-title">{{ roomData?.name }}</h1>
      <p class="vs-subtitle">{{ roomData?.description }}</p>
      <p class="vs-kicker">让访客以受限视角，看见你的殿堂</p>
    </header>

    <!-- 概览统计 -->
    <section data-enter class="vs-section">
      <div class="vs-overview">
        <div class="vs-ov-card">
          <span class="vs-ov-value">{{ stats.totalSessions }}</span>
          <span class="vs-ov-label">会话</span>
        </div>
        <div class="vs-ov-card">
          <span class="vs-ov-value">{{ stats.activeSessions }}</span>
          <span class="vs-ov-label">活跃</span>
        </div>
        <div class="vs-ov-card">
          <span class="vs-ov-value">{{ stats.totalVisits }}</span>
          <span class="vs-ov-label">访问</span>
        </div>
        <div class="vs-ov-card">
          <span class="vs-ov-value">{{ stats.uniqueVisitors }}</span>
          <span class="vs-ov-label">独立访客</span>
        </div>
      </div>
    </section>

    <!-- 访客·桥接总览（INCR-387 补挂载孤儿桥接面板 VisitorBridgePanel：useVisitorBridge 聚合 summary 门禁概览 活跃会话/会话累计/待办邀请/活跃规则/足迹总数/最活跃房间/最近访问 + sessionInfos 活跃会话剩余时间/过期/足迹数, Visitor.vue 原仅直引 useVisitor 引擎+原始列表+4 项基础计数, 桥接层驾驶舱聚合面零呈现, 真缺口） -->
    <VisitorBridgePanel />

    <!-- 访客会话 -->
    <section data-enter class="vs-section">
      <h3 class="vs-section-title">🪪 访客会话</h3>
      <div class="vs-add">
        <input v-model="sessionForm.name" class="vs-input" placeholder="访客名称" />
        <select v-model="sessionForm.role" class="vs-select">
          <option v-for="(label, role) in VISITOR_ROLE_LABELS" :key="role" :value="role">{{ roleIcon(role) }} {{ label }}</option>
        </select>
        <input v-model.number="sessionForm.duration" class="vs-input vs-num" type="number" min="1" max="720" placeholder="时长(时)" />
        <button class="vs-btn" :disabled="!sessionForm.name.trim()" @click="createSession">创建会话</button>
      </div>
      <div v-if="visitor.sessions.value.length" class="vs-list">
        <div v-for="s in visitor.sessions.value" :key="s.id" class="vs-item" :class="{ inactive: !s.active }">
          <div class="vs-item-head">
            <span class="vs-item-avatar">{{ roleIcon(s.role) }}</span>
            <span class="vs-item-name">{{ s.name }}</span>
            <span class="vs-item-role">{{ VISITOR_ROLE_LABELS[s.role] }}</span>
            <span class="vs-item-key" :title="s.accessKey">{{ s.accessKey.slice(0, 8) }}…</span>
            <span class="vs-item-state" :class="{ off: !s.active }">{{ s.active ? '活跃' : '停用' }}</span>
          </div>
          <div class="vs-item-meta">
            <span>访问 {{ s.visitCount }} 次</span>
            <span>· 过期 {{ fmtDate(s.expiresAt) }}</span>
            <span v-if="s.allowedRooms.length">· 可访问 {{ s.allowedRooms.length }} 房</span>
          </div>
          <div class="vs-item-ctrl">
            <button v-if="s.active" class="vs-btn vs-btn--ghost" @click="deactivate(s.id)">停用</button>
            <button class="vs-btn vs-btn--danger" @click="remove(s.id)">删除</button>
          </div>
        </div>
      </div>
      <p v-else class="vs-none">还没有访客会话。创建一个，分享访问密钥。</p>
    </section>

    <!-- 邀请码 -->
    <section data-enter class="vs-section">
      <h3 class="vs-section-title">📨 邀请码</h3>
      <div class="vs-add">
        <select v-model="inviteForm.role" class="vs-select">
          <option v-for="(label, role) in VISITOR_ROLE_LABELS" :key="role" :value="role">{{ roleIcon(role) }} {{ label }}</option>
        </select>
        <label class="vs-check"><input v-model="inviteForm.oneTime" type="checkbox" /> 一次性</label>
        <button class="vs-btn" @click="createInvite">生成邀请码</button>
      </div>
      <div v-if="visitor.invitations.value.length" class="vs-list">
        <div v-for="i in visitor.invitations.value" :key="i.id" class="vs-item" :class="{ inactive: !i.valid }">
          <div class="vs-item-head">
            <span class="vs-item-avatar">{{ roleIcon(i.role) }}</span>
            <span class="vs-item-code">{{ i.code }}</span>
            <span class="vs-item-role">{{ VISITOR_ROLE_LABELS[i.role] }}</span>
            <span class="vs-item-state" :class="{ off: !i.valid }">{{ i.valid ? '有效' : '已失效' }}</span>
          </div>
          <div class="vs-item-meta">
            <span>使用 {{ i.usedCount }}/{{ i.maxUses }}</span>
            <span>· 过期 {{ fmtDate(i.expiresAt) }}</span>
          </div>
          <div class="vs-item-ctrl">
            <button v-if="i.valid" class="vs-btn vs-btn--ghost" @click="revoke(i.id)">撤销</button>
          </div>
        </div>
      </div>
      <p v-else class="vs-none">还没有邀请码。生成一个，分享给想邀请的人。</p>
    </section>

    <!-- 访问控制 -->
    <section data-enter class="vs-section">
      <h3 class="vs-section-title">🛡 访问控制</h3>
      <div class="vs-add">
        <input v-model="ruleForm.name" class="vs-input" placeholder="规则名称" />
        <select v-model="ruleForm.targetRoom" class="vs-select">
          <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
        <select v-model="ruleForm.minRole" class="vs-select">
          <option v-for="(label, role) in VISITOR_ROLE_LABELS" :key="role" :value="role">{{ label }}</option>
        </select>
        <button class="vs-btn" :disabled="!ruleForm.name.trim()" @click="addRule">添加规则</button>
      </div>
      <div v-if="visitor.rules.value.length" class="vs-list">
        <div v-for="r in visitor.rules.value" :key="r.id" class="vs-item" :class="{ inactive: !r.enabled }">
          <div class="vs-item-head">
            <span class="vs-item-name">{{ r.name }}</span>
            <span class="vs-item-role">{{ roomName(r.targetRoom) }}</span>
            <span class="vs-item-role">≥ {{ VISITOR_ROLE_LABELS[r.minRole] }}</span>
            <span class="vs-item-state" :class="{ off: !r.enabled }">{{ r.enabled ? '启用' : '停用' }}</span>
          </div>
          <div class="vs-item-ctrl">
            <button class="vs-btn vs-btn--ghost" @click="toggleRule(r.id)">{{ r.enabled ? '停用' : '启用' }}</button>
            <button class="vs-btn vs-btn--danger" @click="removeRule(r.id)">删除</button>
          </div>
        </div>
      </div>
      <p v-else class="vs-none">还没有访问规则。添加规则，控制访客能进入哪些空间。</p>
    </section>

    <!-- 访客足迹 -->
    <section data-enter class="vs-section">
      <h3 class="vs-section-title">👣 访客足迹</h3>
      <div v-if="stats.recentFootprints.length" class="vs-footprints">
        <div v-for="f in stats.recentFootprints" :key="f.id" class="vs-fp">
          <span class="vs-fp-icon">{{ actionIcon(f.action) }}</span>
          <span class="vs-fp-name">{{ f.visitorName }}</span>
          <span class="vs-fp-room">{{ roomName(f.roomId) }}</span>
          <span class="vs-fp-action">{{ actionLabel(f.action) }}</span>
          <span class="vs-fp-time">{{ fmtTime(f.timestamp) }}</span>
        </div>
      </div>
      <p v-else class="vs-none">还没有访客足迹。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import { useVisitor } from '../modules/visitor'
import { VISITOR_ROLE_LABELS } from '../modules/visitor'
import type { VisitorRole } from '../modules/visitor'
import VisitorBridgePanel from '../components/VisitorBridgePanel.vue'
import { getAllRooms, getRoom } from '../engine/room-graph'

const { entranceClass, entranceRef } = useViewEntrance()
const nav = useRoomNavigation()
const roomData = computed(() => getRoom('visitor'))

const visitor = useVisitor()
const rooms = computed(() => getAllRooms())

const stats = computed(() => visitor.visitorStats.value)

const sessionForm = ref({ name: '', role: 'guest' as VisitorRole, duration: 24 })
const inviteForm = ref({ role: 'friend' as VisitorRole, oneTime: false })
const ruleForm = ref({ name: '', targetRoom: 'garden', minRole: 'guest' as VisitorRole })

const ROLE_ICONS: Record<VisitorRole, string> = {
  stranger: '👤',
  guest: '🧑',
  friend: '🤝',
  family: '👨‍👩‍👧',
  collaborator: '🛠',
}
function roleIcon(role: VisitorRole) {
  return ROLE_ICONS[role] ?? '👤'
}

const ACTION_META: Record<string, { label: string; icon: string }> = {
  enter: { label: '进入', icon: '🚪' },
  leave: { label: '离开', icon: '🚶' },
  view: { label: '查看', icon: '👁' },
  interact: { label: '互动', icon: '💬' },
  export: { label: '导出', icon: '📤' },
}
function actionLabel(a: string) {
  return ACTION_META[a]?.label ?? a
}
function actionIcon(a: string) {
  return ACTION_META[a]?.icon ?? '·'
}

function roomName(id: string) {
  return getAllRooms().find(r => r.id === id)?.name ?? id
}
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function createSession() {
  if (!sessionForm.value.name.trim()) return
  visitor.createSession(sessionForm.value.name.trim(), sessionForm.value.role, ['garden', 'home-space'], sessionForm.value.duration)
  sessionForm.value.name = ''
}
function deactivate(id: string) {
  visitor.deactivateSession(id)
}
function remove(id: string) {
  visitor.removeSession(id)
}
function createInvite() {
  visitor.createInvitation(inviteForm.value.role, ['garden', 'home-space'], {
    oneTime: inviteForm.value.oneTime,
    maxUses: inviteForm.value.oneTime ? 1 : 5,
    expiresInHours: 72,
  })
}
function revoke(id: string) {
  visitor.revokeInvitation(id)
}
function addRule() {
  if (!ruleForm.value.name.trim()) return
  visitor.addRule({
    name: ruleForm.value.name.trim(),
    targetRoom: ruleForm.value.targetRoom,
    minRole: ruleForm.value.minRole,
    enabled: true,
  })
  ruleForm.value.name = ''
}
function toggleRule(id: string) {
  visitor.toggleRule(id)
}
function removeRule(id: string) {
  visitor.removeRule(id)
}

onMounted(() => {
  visitor.cleanup()
})
</script>

<style scoped>
.vs { position: relative; max-width: 860px; margin: 0 auto; padding: 28px 20px 60px; }
.vs-ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.vs-glow { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.14; }
.vs-glow--top { width: 420px; height: 420px; top: -120px; right: -80px; background: #7a9ab8; }
.vs-glow--bottom { width: 380px; height: 380px; bottom: -100px; left: -80px; background: #c9a063; }
.vs-door { position: absolute; right: 6%; top: 12%; opacity: 0.5; }
.vs-node { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.12; }
.vs-node-1 { top: 30%; left: 12%; }
.vs-node-2 { bottom: 22%; right: 14%; }

.vs-header { position: relative; z-index: 1; text-align: center; margin-bottom: 24px; }
.vs-title { font-size: 26px; letter-spacing: 4px; color: var(--text-high, rgba(232, 224, 216, 0.88)); margin: 8px 0 4px; }
.vs-subtitle { font-size: 13px; color: rgba(232, 221, 208, 0.6); margin: 0 0 6px; }
.vs-kicker { font-size: 11px; letter-spacing: 2px; color: rgba(var(--accent-rgb), 0.5); margin: 0; }

.vs-section { position: relative; z-index: 1; margin-bottom: 20px; padding: 18px 20px; border-radius: 14px; background: var(--card-bg, rgba(18, 14, 11, 0.6)); border: 1px solid var(--border, rgba(255, 255, 255, 0.08)); }
.vs-section-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); margin: 0 0 12px; }

.vs-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.vs-ov-card { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px; border-radius: 12px; background: rgba(255,255,255,0.03); }
.vs-ov-value { font-size: 22px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.vs-ov-label { font-size: 11px; color: rgba(232, 221, 208, 0.45); }

.vs-add { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.vs-input { flex: 1; min-width: 120px; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 12px; font-family: inherit; outline: none; }
.vs-input:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.vs-input::placeholder { color: rgba(232, 221, 208, 0.35); }
.vs-num { max-width: 90px; }
.vs-select { padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 12px; font-family: inherit; outline: none; }
.vs-check { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(232, 221, 208, 0.6); }
.vs-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d4a574); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.vs-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.vs-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.vs-btn--ghost { background: transparent; border-color: rgba(255,255,255,0.15); color: rgba(232, 221, 208, 0.6); }
.vs-btn--ghost:hover { border-color: rgba(var(--accent-rgb), 0.4); color: var(--accent, #d4a574); background: rgba(var(--accent-rgb), 0.08); }
.vs-btn--danger { background: transparent; border-color: rgba(196,106,90,0.35); color: #c46a5a; }
.vs-btn--danger:hover { background: rgba(196,106,90,0.1); border-color: #c46a5a; }

.vs-list { display: flex; flex-direction: column; gap: 8px; }
.vs-item { padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.vs-item.inactive { opacity: 0.55; }
.vs-item-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.vs-item-avatar { font-size: 15px; }
.vs-item-name { font-size: 13px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.vs-item-role { font-size: 10px; padding: 1px 8px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); }
.vs-item-key { font-size: 10px; color: rgba(232, 221, 208, 0.4); font-family: monospace; }
.vs-item-code { font-size: 12px; font-weight: 600; color: #f0c040; font-family: monospace; letter-spacing: 0.5px; }
.vs-item-state { font-size: 10px; padding: 1px 8px; border-radius: 8px; background: rgba(138,154,122,0.15); color: #8a9a7a; }
.vs-item-state.off { background: rgba(148,163,184,0.12); color: #94a3b8; }
.vs-item-meta { font-size: 10px; color: rgba(232, 221, 208, 0.45); margin-bottom: 8px; }
.vs-item-ctrl { display: flex; gap: 6px; }

.vs-footprints { display: flex; flex-direction: column; gap: 6px; }
.vs-fp { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); font-size: 11px; }
.vs-fp-icon { font-size: 13px; }
.vs-fp-name { font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.vs-fp-room { color: rgba(var(--accent-rgb), 0.7); }
.vs-fp-action { color: rgba(232, 221, 208, 0.5); }
.vs-fp-time { margin-left: auto; font-size: 10px; color: rgba(232, 221, 208, 0.35); }

.vs-none { font-size: 12px; color: rgba(232, 221, 208, 0.45); text-align: center; padding: 16px 0; margin: 0; }

@media (max-width: 640px) {
  .vs { padding: 20px 14px 48px; }
  .vs-overview { grid-template-columns: repeat(2, 1fr); }
  .vs-add { flex-direction: column; align-items: stretch; }
  .vs-num { max-width: none; }
}
</style>