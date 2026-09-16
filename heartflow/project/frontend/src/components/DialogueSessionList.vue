<template>
  <div class="dialogue-session-list">
    <div class="dsl-head">
      <span class="dsl-title">🪞 镜我对白会话</span>
      <span class="dsl-count">{{ activeSessions.length }} 活跃 · {{ archivedSessions.length }} 归档</span>
    </div>

    <!-- 活跃会话 -->
    <div v-if="activeSessions.length" class="dsl-group">
      <div v-for="s in activeSessions" :key="s.id" class="dsl-item">
        <div class="dsl-body">
          <div class="dsl-line">
            <span class="dsl-name">{{ s.title }}</span>
            <span class="dsl-meta">{{ s.entries.length }} 条 · {{ fmtDate(s.lastActiveAt) }}</span>
          </div>
          <div v-if="s.primaryIntents.length" class="dsl-intents">
            <span v-for="it in s.primaryIntents" :key="it" class="dsl-intent">{{ intentLabel(it) }}</span>
          </div>
        </div>
        <button class="dsl-btn" @click="dlg.archiveSession(s.id)">归档</button>
      </div>
    </div>
    <p v-else-if="!archivedSessions.length" class="dsl-empty">还没有镜我对白会话</p>

    <!-- 已归档会话 -->
    <div v-if="archivedSessions.length" class="dsl-group dsl-archived">
      <div v-for="s in archivedSessions" :key="s.id" class="dsl-item dsl-item-archived">
        <div class="dsl-body">
          <div class="dsl-line">
            <span class="dsl-name">{{ s.title }}</span>
            <span class="dsl-meta">{{ s.entries.length }} 条 · {{ fmtDate(s.lastActiveAt) }}</span>
          </div>
          <div v-if="s.summary" class="dsl-summary">{{ s.summary }}</div>
        </div>
        <button class="dsl-btn dsl-btn-restore" @click="dlg.restoreSession(s.id)">恢复</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDialoguePersistence } from '../modules/mirror'
import { INTENT_INFO } from '../modules/mirror/intents'
import type { IntentCategory } from '../modules/mirror/types'

const dlg = useDialoguePersistence()
const { activeSessions, archivedSessions } = dlg

function intentLabel(it: IntentCategory): string {
  return INTENT_INFO[it]?.label ?? it
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<style scoped>
.dialogue-session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dsl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dsl-title {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
}
.dsl-count {
  font-size: 10px;
  color: var(--text-secondary);
}
.dsl-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dsl-archived { opacity: 0.7; margin-top: 4px; }
.dsl-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: border-color 0.2s;
}
.dsl-item:hover { border-color: rgba(var(--accent-rgb), 0.14); }
.dsl-item-archived { opacity: 0.6; }
.dsl-body { flex: 1; min-width: 0; }
.dsl-line { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.dsl-name { font-size: 13px; color: var(--text-high); }
.dsl-meta { font-size: 10px; color: var(--text-dim); flex-shrink: 0; }
.dsl-intents { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
.dsl-intent {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--text-low);
}
.dsl-summary {
  font-size: 11px;
  color: var(--text-low);
  margin-top: 2px;
  opacity: 0.85;
}
.dsl-empty {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
  margin: 4px 0 0;
}
.dsl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  flex-shrink: 0;
  align-self: center;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  min-height: 26px;
}
.dsl-btn:hover { background: rgba(var(--accent-rgb), 0.18); }
.dsl-btn-restore {
  border-color: rgba(52, 211, 153, 0.2);
  background: rgba(52, 211, 153, 0.08);
  color: rgba(52, 211, 153, 0.75);
}
.dsl-btn-restore:hover {
  background: rgba(52, 211, 153, 0.16);
  border-color: rgba(52, 211, 153, 0.35);
}
</style>
