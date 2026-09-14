<template>
  <section class="vhp-panel" data-enter aria-label="版本历史">
    <header class="vhp-header">
      <h4 class="vhp-title">📜 版本历史</h4>
      <p class="vhp-subtitle">自动保存 · 对比 · 恢复</p>
    </header>

    <!-- 概览 -->
    <div class="vhp-stats">
      <div class="vhp-stat">
        <span class="vhp-stat-num">{{ stats.totalVersions }}</span>
        <span class="vhp-stat-label">总版本</span>
      </div>
      <div class="vhp-stat">
        <span class="vhp-stat-num">{{ stats.notesWithVersions }}</span>
        <span class="vhp-stat-label">有版本笔记</span>
      </div>
      <div class="vhp-stat">
        <span class="vhp-stat-num">{{ stats.milestoneCount }}</span>
        <span class="vhp-stat-label">里程碑</span>
      </div>
      <div class="vhp-stat">
        <span class="vhp-stat-num">{{ fmtChars(stats.totalChars) }}</span>
        <span class="vhp-stat-label">总字符</span>
      </div>
    </div>

    <!-- 笔记选择 -->
    <div class="vhp-pick">
      <span class="vhp-block-label">选择笔记</span>
      <select v-model="selectedNoteId" class="vhp-select">
        <option value="">— 选择一篇笔记查看版本 —</option>
        <option v-for="n in notes" :key="n.id" :value="n.id">{{ n.title || '未命名' }}</option>
      </select>
    </div>

    <!-- 版本列表 -->
    <div v-if="selectedNoteId" class="vhp-versions">
      <div class="vhp-versions-head">
        <span class="vhp-block-label">版本（{{ noteVersions.length }}）</span>
        <div class="vhp-head-actions">
          <button class="vhp-btn vhp-btn-mini" @click="saveMilestone">★ 存为里程碑</button>
          <button class="vhp-btn vhp-btn-mini vhp-btn-danger" @click="deleteAll">清空本笔记版本</button>
        </div>
      </div>
      <input v-model="milestoneLabel" class="vhp-input" placeholder="里程碑标签（可选）" />

      <div v-if="noteVersions.length" class="vhp-version-list">
        <div
          v-for="v in noteVersions"
          :key="v.id"
          class="vhp-version"
          :class="{ 'is-active': v.id === selectedVersionId, 'is-milestone': v.isMilestone }"
        >
          <div class="vhp-version-head">
            <span class="vhp-version-num">v{{ v.versionNumber }}</span>
            <span class="vhp-version-desc">{{ v.description }}</span>
            <span class="vhp-version-meta">{{ fmtTime(v.createdAt) }} · +{{ v.changeSize }} 字</span>
            <span v-if="v.isMilestone" class="vhp-badge">★ {{ v.milestoneLabel || '里程碑' }}</span>
          </div>
          <div class="vhp-version-actions">
            <button class="vhp-btn vhp-btn-mini" @click="toggleMilestone(v.id)">
              {{ v.isMilestone ? '取消里程碑' : '标记里程碑' }}
            </button>
            <button class="vhp-btn vhp-btn-mini" @click="selectVersion(v.id)">
              {{ selectedVersionId === v.id ? '收起差异' : '查看差异' }}
            </button>
            <button class="vhp-btn vhp-btn-mini" @click="restore(v.id)">恢复此版本</button>
            <button class="vhp-btn vhp-btn-mini vhp-btn-danger" @click="removeVersion(v.id)">删除</button>
          </div>

          <!-- 差异视图 -->
          <div v-if="selectedVersionId === v.id && diffSnapshot" class="vhp-diff">
            <p class="vhp-diff-summary">
              与上一版本相似度 {{ Math.round(diffSnapshot.similarity * 100) }}% · 变更 {{ diffSnapshot.totalChangedLines }} 行
            </p>
            <div
              v-for="(d, i) in diffSnapshot.diffs"
              :key="i"
              class="vhp-diff-line"
              :class="'vhp-diff--' + d.type"
            >
              <span class="vhp-diff-marker">{{ diffMarker(d.type) }}</span>
              <span class="vhp-diff-text">{{ diffText(d) }}</span>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="vhp-hint">这篇笔记还没有版本。编辑笔记后手动保存，或标记里程碑。</p>
    </div>

    <!-- 配置 -->
    <div class="vhp-config">
      <button class="vhp-config-toggle" @click="showConfig = !showConfig">
        {{ showConfig ? '收起设置' : '⚙ 版本设置' }}
      </button>
      <div v-if="showConfig" class="vhp-config-body">
        <label class="vhp-config-row">
          <span>每篇最大版本数</span>
          <input
            type="number"
            :value="config.maxVersionsPerNote"
            @change="updateConfigNum('maxVersionsPerNote', $event)"
          />
        </label>
        <label class="vhp-config-row">
          <span>自动保存间隔（分钟）</span>
          <input
            type="number"
            :value="Math.round(config.autoSaveIntervalMs / 60000)"
            @change="updateConfigInterval($event)"
          />
        </label>
        <label class="vhp-config-row">
          <span>最小变更字符</span>
          <input
            type="number"
            :value="config.minChangeSize"
            @change="updateConfigNum('minChangeSize', $event)"
          />
        </label>
        <label class="vhp-config-row">
          <span>清理保留最近</span>
          <input
            type="number"
            :value="config.cleanupKeepRecent"
            @change="updateConfigNum('cleanupKeepRecent', $event)"
          />
        </label>
        <label class="vhp-config-row vhp-config-check">
          <input
            type="checkbox"
            :checked="config.cleanupKeepMilestones"
            @change="updateConfigBool('cleanupKeepMilestones', $event)"
          />
          <span>清理时保留里程碑</span>
        </label>
        <button class="vhp-btn vhp-btn-mini" @click="resetConfig">恢复默认设置</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Note } from '../types'
import {
  useVersionHistory,
  type DiffType,
  type VersionDiff,
} from '../modules/note/version-history'

const props = defineProps<{ notes: Note[] }>()

const emit = defineEmits<{
  restore: [payload: { noteId: string; snapshot: { title: string; content: string; tags: string[] } }]
}>()

const vh = useVersionHistory()
const stats = computed(() => vh.versionStats.value)
const config = computed(() => vh.config.value)

const selectedNoteId = ref('')
const selectedVersionId = ref('')
const milestoneLabel = ref('')
const showConfig = ref(false)

const selectedNote = computed<Note | undefined>(() =>
  props.notes.find(n => n.id === selectedNoteId.value),
)

const noteVersions = computed(() => {
  if (!selectedNoteId.value) return []
  return vh.versions.value
    .filter(v => v.noteId === selectedNoteId.value)
    .sort((a, b) => a.versionNumber - b.versionNumber)
})

const diffSnapshot = computed(() => {
  if (!selectedNoteId.value || !selectedVersionId.value) return null
  return vh.getDiff(selectedNoteId.value, selectedVersionId.value)
})

function selectVersion(id: string) {
  selectedVersionId.value = selectedVersionId.value === id ? '' : id
}

function toggleMilestone(id: string) {
  const v = vh.versions.value.find(x => x.id === id)
  if (!v) return
  if (v.isMilestone) vh.unmarkMilestone(id)
  else vh.markAsMilestone(id, v.description)
}

function saveMilestone() {
  if (!selectedNote.value) return
  const label = milestoneLabel.value.trim() || `里程碑 v${noteVersions.value.length + 1}`
  vh.saveMilestone(selectedNote.value, label)
  milestoneLabel.value = ''
}

function restore(id: string) {
  const snapshot = vh.restoreVersion(id)
  if (!snapshot || !selectedNoteId.value) return
  emit('restore', { noteId: selectedNoteId.value, snapshot })
}

function removeVersion(id: string) {
  vh.deleteVersion(id)
  if (selectedVersionId.value === id) selectedVersionId.value = ''
}

function deleteAll() {
  if (!selectedNoteId.value) return
  vh.deleteAllVersions(selectedNoteId.value)
  selectedVersionId.value = ''
}

function updateConfigNum(key: 'maxVersionsPerNote' | 'minChangeSize' | 'cleanupKeepRecent', e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(val) && val > 0) vh.updateConfig({ [key]: val })
}

function updateConfigInterval(e: Event) {
  const minutes = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(minutes) && minutes > 0) {
    vh.updateConfig({ autoSaveIntervalMs: Math.round(minutes * 60000) })
  }
}

function updateConfigBool(key: 'cleanupKeepMilestones', e: Event) {
  vh.updateConfig({ [key]: (e.target as HTMLInputElement).checked })
}

function resetConfig() {
  vh.resetConfig()
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtChars(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  return String(n)
}

function diffMarker(type: DiffType): string {
  switch (type) {
    case 'added': return '+'
    case 'removed': return '−'
    case 'modified': return '~'
    case 'unchanged': return ' '
  }
}

function diffText(d: VersionDiff): string {
  switch (d.type) {
    case 'added': return d.newValue
    case 'removed': return d.oldValue
    case 'modified': return `${d.oldValue} → ${d.newValue}`
    case 'unchanged': return d.oldValue
  }
}
</script>

<style scoped>
.vhp-panel {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.vhp-header {
  margin-bottom: 10px;
}

.vhp-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.vhp-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.vhp-block-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.vhp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.vhp-stat {
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.08);
  border: 1px solid rgba(138, 154, 122, 0.18);
  text-align: center;
}

.vhp-stat-num {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #8a9a7a;
}

.vhp-stat-label {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.vhp-pick {
  margin-bottom: 12px;
}

.vhp-select {
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px;
  font-family: inherit;
}

.vhp-versions {
  margin-bottom: 12px;
}

.vhp-versions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.vhp-versions-head .vhp-block-label {
  margin-bottom: 0;
}

.vhp-head-actions {
  display: flex;
  gap: 6px;
}

.vhp-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px;
  font-family: inherit;
}

.vhp-version-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vhp-version {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.35);
}

.vhp-version.is-active {
  border-color: rgba(217, 164, 65, 0.35);
  background: rgba(217, 164, 65, 0.06);
}

.vhp-version.is-milestone {
  border-left: 3px solid #d9a441;
}

.vhp-version-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.vhp-version-num {
  font-size: 13px;
  font-weight: 600;
  color: #d9a441;
}

.vhp-version-desc {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.8);
}

.vhp-version-meta {
  margin-left: auto;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.vhp-badge {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(217, 164, 65, 0.14);
  border: 1px solid rgba(217, 164, 65, 0.3);
  font-size: 10px;
  color: #d9a441;
}

.vhp-version-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.vhp-btn {
  padding: 4px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 999px;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.6);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.vhp-btn:hover {
  border-color: rgba(138, 154, 122, 0.4);
  color: #8a9a7a;
}

.vhp-btn-danger:hover {
  border-color: rgba(196, 106, 90, 0.4);
  color: #c46a5a;
}

.vhp-diff {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  max-height: 220px;
  overflow-y: auto;
}

.vhp-diff-summary {
  margin: 0 0 6px;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.vhp-diff-line {
  display: flex;
  gap: 6px;
  padding: 1px 0;
  font-size: 11px;
  line-height: 1.6;
}

.vhp-diff-marker {
  flex-shrink: 0;
  width: 12px;
  text-align: center;
  font-weight: 600;
}

.vhp-diff--added .vhp-diff-marker { color: #8a9a7a; }
.vhp-diff--added .vhp-diff-text { color: rgba(138, 154, 122, 0.9); }
.vhp-diff--removed .vhp-diff-marker { color: #c46a5a; }
.vhp-diff--removed .vhp-diff-text { color: rgba(196, 106, 90, 0.85); text-decoration: line-through; }
.vhp-diff--modified .vhp-diff-marker { color: #d9a441; }
.vhp-diff--modified .vhp-diff-text { color: rgba(217, 164, 65, 0.9); }
.vhp-diff--unchanged .vhp-diff-text { color: rgba(var(--text-primary-rgb), 0.45); }

.vhp-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.vhp-config {
  margin-bottom: 4px;
}

.vhp-config-toggle {
  padding: 4px 0;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.5);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.vhp-config-toggle:hover {
  color: #8a9a7a;
}

.vhp-config-body {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.4);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vhp-config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.7);
}

.vhp-config-row input[type='number'] {
  width: 90px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px;
  font-family: inherit;
}

.vhp-config-check {
  justify-content: flex-start;
  gap: 8px;
}
</style>
