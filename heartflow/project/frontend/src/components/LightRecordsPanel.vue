<template>
  <div class="light-records-panel">
    <!-- 冥想记录 -->
    <section class="lr-section">
      <div class="lr-section-head">
        <span class="lr-section-title">🧘 冥想记录</span>
        <span class="lr-count">{{ activeMeditations.length }} 活跃 · {{ archivedMeditations.length }} 归档</span>
      </div>

      <div v-if="activeMeditations.length" class="lr-list">
        <div v-for="m in activeMeditations" :key="m.id" class="lr-item">
          <span class="lr-icon">{{ MEDITATION_TYPE_META[m.type]?.icon || '🧘' }}</span>
          <div class="lr-body">
            <div class="lr-line">
              <span class="lr-title">{{ MEDITATION_TYPE_META[m.type]?.label || m.type }}</span>
              <span class="lr-meta">{{ m.duration }} 分钟 · {{ m.date }}</span>
            </div>
            <div v-if="m.stateBefore || m.stateAfter" class="lr-sub">
              {{ m.stateBefore || '—' }} → {{ m.stateAfter || '—' }}
            </div>
            <div v-if="m.insight" class="lr-insight">💡 {{ m.insight }}</div>
          </div>
          <button class="lr-btn" @click="pavilion.archiveMeditation(m.id)">归档</button>
        </div>
      </div>
      <p v-else-if="!archivedMeditations.length" class="lr-empty">还没有冥想记录</p>

      <div v-if="archivedMeditations.length" class="lr-archived">
        <div v-for="m in archivedMeditations" :key="m.id" class="lr-item lr-item-archived">
          <span class="lr-icon">{{ MEDITATION_TYPE_META[m.type]?.icon || '🧘' }}</span>
          <div class="lr-body">
            <div class="lr-line">
              <span class="lr-title">{{ MEDITATION_TYPE_META[m.type]?.label || m.type }}</span>
              <span class="lr-meta">{{ m.duration }} 分钟 · {{ m.date }}</span>
            </div>
          </div>
          <button class="lr-btn lr-btn-restore" @click="pavilion.restoreMeditation(m.id)">恢复</button>
        </div>
      </div>
    </section>

    <!-- 释怀记录 -->
    <section class="lr-section">
      <div class="lr-section-head">
        <span class="lr-section-title">🌊 释怀记录</span>
        <span class="lr-count">{{ activeReleases.length }} 活跃 · {{ archivedReleases.length }} 归档</span>
      </div>

      <div v-if="activeReleases.length" class="lr-list">
        <div v-for="r in activeReleases" :key="r.id" class="lr-item">
          <span class="lr-icon">{{ RELEASE_METHOD_META[r.method]?.icon || '🌊' }}</span>
          <div class="lr-body">
            <div class="lr-line">
              <span class="lr-title">{{ RELEASE_METHOD_META[r.method]?.label || r.method }}</span>
              <span class="lr-meta">{{ r.date }}</span>
            </div>
            <div class="lr-sub lr-clamp">{{ r.content }}</div>
            <div v-if="r.feelingAfter" class="lr-insight">释怀后：{{ r.feelingAfter }}</div>
          </div>
          <button class="lr-btn" @click="pavilion.archiveRelease(r.id)">归档</button>
        </div>
      </div>
      <p v-else-if="!archivedReleases.length" class="lr-empty">还没有释怀记录</p>

      <div v-if="archivedReleases.length" class="lr-archived">
        <div v-for="r in archivedReleases" :key="r.id" class="lr-item lr-item-archived">
          <span class="lr-icon">{{ RELEASE_METHOD_META[r.method]?.icon || '🌊' }}</span>
          <div class="lr-body">
            <div class="lr-line">
              <span class="lr-title">{{ RELEASE_METHOD_META[r.method]?.label || r.method }}</span>
              <span class="lr-meta">{{ r.date }}</span>
            </div>
            <div class="lr-sub lr-clamp">{{ r.content }}</div>
          </div>
          <button class="lr-btn lr-btn-restore" @click="pavilion.restoreRelease(r.id)">恢复</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLightPavilion } from '../modules/light'
import { MEDITATION_TYPE_META, RELEASE_METHOD_META } from '../modules/light/types'

const pavilion = useLightPavilion()
const { activeMeditations, archivedMeditations, activeReleases, archivedReleases } = pavilion
</script>

<style scoped>
.light-records-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.lr-section {
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.lr-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.lr-section-title {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
}
.lr-count {
  font-size: 10px;
  color: var(--text-secondary);
}
.lr-list, .lr-archived {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lr-archived { margin-top: 6px; opacity: 0.7; }
.lr-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: border-color 0.2s;
}
.lr-item:hover { border-color: rgba(var(--accent-rgb), 0.14); }
.lr-item-archived { opacity: 0.6; }
.lr-icon { font-size: 18px; flex-shrink: 0; line-height: 1.4; }
.lr-body { flex: 1; min-width: 0; }
.lr-line { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.lr-title { font-size: 13px; color: var(--text-high); }
.lr-meta { font-size: 10px; color: var(--text-dim); flex-shrink: 0; }
.lr-sub { font-size: 11px; color: var(--text-low); margin-top: 2px; }
.lr-clamp {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lr-insight { font-size: 11px; color: var(--text-low); margin-top: 2px; opacity: 0.85; }
.lr-empty {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
  margin: 4px 0 0;
}
.lr-btn {
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
}
.lr-btn:hover { background: rgba(var(--accent-rgb), 0.18); }
.lr-btn-restore {
  border-color: rgba(52, 211, 153, 0.2);
  background: rgba(52, 211, 153, 0.08);
  color: rgba(52, 211, 153, 0.75);
}
.lr-btn-restore:hover {
  background: rgba(52, 211, 153, 0.16);
  border-color: rgba(52, 211, 153, 0.35);
}
</style>
