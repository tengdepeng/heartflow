<template>
  <section class="aap">
    <div class="aap-head">
      <div class="aap-title-wrap">
        <span class="aap-title">⚙️ 自动归档台</span>
        <span class="aap-sub">允许遗忘，归档而非删除 · 默认不静默动数据</span>
      </div>
      <span class="aap-gate" :class="gate.enabled ? 'is-on' : 'is-off'">{{ gate.icon }} {{ gate.label }}</span>
    </div>

    <p class="aap-hint">{{ gate.hint }}</p>

    <!-- 触发区 -->
    <div class="aap-run">
      <label class="aap-threshold-label">闲置阈值
        <select v-model.number="thresholdDays" class="aap-threshold">
          <option v-for="t in ARCHIVE_THRESHOLD_OPTIONS" :key="t" :value="t">{{ t }} 天</option>
        </select>
      </label>
      <button class="aap-run-btn" @click="run">触发一轮归档</button>
      <span v-if="lastSummary" class="aap-result">{{ lastSummary }}</span>
    </div>

    <!-- 审计日志 -->
    <div v-if="log.length" class="aap-log">
      <h4 class="aap-section-title">最近巡检</h4>
      <ul class="aap-log-list">
        <li v-for="(e, i) in log.slice(0, 5)" :key="i" class="aap-log-item">
          <span class="aap-log-time">{{ fmtLogTime(e.ranAt) }}</span>
          <span class="aap-log-text">归档 {{ e.total }} 条（冥想 {{ e.archivedMeditations }} · 释怀 {{ e.archivedReleases }} · 笔记 {{ e.archivedNotes }}）</span>
        </li>
      </ul>
    </div>

    <!-- 还原台 -->
    <div v-if="archivedItems.length" class="aap-restore">
      <h4 class="aap-section-title">已归档 · 可还原（{{ archivedItems.length }}）</h4>
      <ul class="aap-restore-list">
        <li v-for="it in archivedItems" :key="it.kind + it.id" class="aap-restore-item">
          <span class="aap-item-kind">{{ kindIcon(it.kind) }}</span>
          <div class="aap-item-main">
            <span class="aap-item-title">{{ it.title }}</span>
            <span class="aap-item-meta">{{ kindLabel(it.kind) }} · 归档{{ fmtDate(it.archivedAt) }}</span>
          </div>
          <button class="aap-restore-btn" @click="restore(it)">还原</button>
        </li>
      </ul>
    </div>
    <p v-else-if="!running" class="aap-empty">暂无已归档内容。触发归档后，长期未动的冥想、释怀与笔记会来到这里。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getNoteStore } from '../modules/note'
import { useLightPavilion } from '../modules/light'
import { isTargetActive } from '../engine/constitution-effect'
import {
  getAutoArchiveLog,
  autoArchiveGateMeta,
  collectArchivedItems,
  describeAutoArchive,
  ARCHIVE_THRESHOLD_OPTIONS,
  DEFAULT_THRESHOLD_DAYS,
} from '../modules/archive/auto-archive'
import { runAutoArchiveIfEnabled } from '../modules/archive/useAutoArchive'
import type { ArchivedItem } from '../modules/archive/auto-archive'
import type { MeditationType } from '../modules/light'

const pavilion = useLightPavilion()
const noteStore = getNoteStore()

const thresholdDays = ref<number>(DEFAULT_THRESHOLD_DAYS)
const lastSummary = ref('')
const running = ref(false)
const refreshTick = ref(0)

const gate = computed(() => autoArchiveGateMeta(isTargetActive('data:auto-archive')))

const log = computed(() => getAutoArchiveLog())

const MED_LABEL: Record<MeditationType, string> = {
  breath: '呼吸', body_scan: '身体扫描', loving_kindness: '慈心', walking: '行禅',
  guided: '引导', silent: '静默', visualization: '观想', mantra: '持咒',
}

const archivedItems = computed<ArchivedItem[]>(() => {
  void refreshTick.value
  return collectArchivedItems<any>({
    meditations: pavilion.meditations.value as any[],
    releases: pavilion.releases.value as any[],
    notes: noteStore.allNotes.value as any[],
    getId: (i) => i.id,
    getTitle: (i) => {
      if (i && typeof i.type === 'string' && i.type in MED_LABEL) return MED_LABEL[i.type as MeditationType]
      return i.title || i.content || '未命名'
    },
    isArchived: (i) => Boolean(i.archived),
    getArchivedAt: (i) => i.archivedAt || i.timestamp || i.date || i.updatedAt || '',
  })
})

function run() {
  running.value = true
  const result = runAutoArchiveIfEnabled({ thresholdDays: thresholdDays.value })
  lastSummary.value = describeAutoArchive(result)
  refreshTick.value++
  running.value = false
}

function restore(it: ArchivedItem) {
  if (it.kind === 'note') { noteStore.restore(it.id) }
  else if (it.kind === 'meditation') { pavilion.restoreMeditation(it.id) }
  else if (it.kind === 'release') { pavilion.restoreRelease(it.id) }
  refreshTick.value++
}

function kindLabel(k: string): string {
  return k === 'note' ? '笔记' : k === 'release' ? '释怀' : '冥想'
}
function kindIcon(k: string): string {
  return k === 'note' ? '📝' : k === 'release' ? '🕊️' : '🧘'
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
function fmtLogTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => { refreshTick.value++ })
</script>

<style scoped>
.aap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}
.aap-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.aap-title-wrap { display: flex; flex-direction: column; gap: 2px; }
.aap-title { font-size: 15px; font-weight: 500; }
.aap-sub { font-size: 11px; color: var(--text-secondary); }
.aap-gate { font-size: 12px; padding: 4px 10px; border-radius: 999px; }
.aap-gate.is-on { background: rgba(90, 184, 160, 0.12); border: 1px solid rgba(90, 184, 160, 0.4); color: var(--accent-cyan, #5ab8a0); }
.aap-gate.is-off { background: rgba(128, 128, 128, 0.08); border: 1px solid rgba(128, 128, 128, 0.3); color: var(--text-secondary); }
.aap-hint { margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.aap-run { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.aap-threshold-label { font-size: 13px; color: var(--text-high); display: inline-flex; align-items: center; gap: 8px; }
.aap-threshold { padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: var(--bg-panel, #1a1612)); color: var(--text-high); font-size: 13px; }
.aap-run-btn {
  padding: 8px 16px; border-radius: 8px; cursor: pointer;
  background: rgba(var(--accent-rgb), 0.15); border: 1px solid rgba(var(--accent-rgb), 0.4); color: var(--accent);
  font-size: 13px; transition: background 0.15s;
}
.aap-run-btn:hover { background: rgba(var(--accent-rgb), 0.28); }
.aap-result { font-size: 12px; color: var(--accent-cyan, #5ab8a0); }
.aap-section-title { margin: 10px 0 6px; font-size: 13px; color: var(--text-medium); }
.aap-log-list, .aap-restore-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.aap-log-item { display: flex; gap: 10px; align-items: center; font-size: 12px; color: var(--text-secondary); }
.aap-log-time { flex: 0 0 90px; opacity: 0.7; font-variant-numeric: tabular-nums; }
.aap-log-text { flex: 1; }
.aap-restore-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: var(--bg-surface, rgba(255, 255, 255, 0.03)); border: 1px solid rgba(255,255,255,0.07); }
.aap-item-kind { font-size: 15px; }
.aap-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.aap-item-title { font-size: 13px; color: var(--text-high); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aap-item-meta { font-size: 11px; color: var(--text-secondary); }
.aap-restore-btn { flex-shrink: 0; padding: 5px 12px; border-radius: 6px; cursor: pointer; background: rgba(90, 184, 160, 0.12); border: 1px solid rgba(90, 184, 160, 0.35); color: var(--accent-cyan, #5ab8a0); font-size: 12px; }
.aap-restore-btn:hover { background: rgba(90, 184, 160, 0.24); }
.aap-empty { margin: 0; font-size: 12px; color: var(--text-secondary); opacity: 0.8; }
</style>