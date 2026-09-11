<template>
  <section class="syc syc-panel" :class="{ 'syc--busy': syncStatus === 'syncing' }">
    <header class="syc-head">
      <h3 class="syc-title">🔄 同步中心</h3>
      <p class="syc-sub">多端同步 · 冲突协调 · 快照备份</p>
    </header>

    <nav class="syc-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="syc-tab"
        :class="{ 'syc-tab--active': activeTab === tab.key }"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- 目标·同步 -->
    <div v-show="activeTab === 'targets'" class="syc-body">
      <div class="syc-stats">
        <div class="syc-stat"><span class="syc-stat-n">{{ targets.length }}</span><span class="syc-stat-l">同步目标</span></div>
        <div class="syc-stat"><span class="syc-stat-n">{{ unresolvedConflictCount }}</span><span class="syc-stat-l">未解决冲突</span></div>
        <div class="syc-stat"><span class="syc-stat-n">{{ snapshots.length }}</span><span class="syc-stat-l">快照备份</span></div>
      </div>

      <div class="syc-card">
        <h4 class="syc-card-h">同步配置</h4>
        <label class="syc-field">设备名
          <input v-model="config.deviceName" class="syc-input" @change="onUpdateConfig" />
        </label>
        <label class="syc-field">冲突策略
          <select v-model="config.conflictStrategy" class="syc-input" @change="onUpdateConfig">
            <option value="local">本地优先</option>
            <option value="remote">远端优先</option>
            <option value="last-write">后写覆盖</option>
          </select>
        </label>
        <label class="syc-field">日志保留上限
          <input v-model.number="config.logRetentionLimit" type="number" min="1" class="syc-input" @change="onUpdateConfig" />
        </label>
        <label class="syc-field">快照保留上限
          <input v-model.number="config.snapshotRetentionLimit" type="number" min="1" class="syc-input" @change="onUpdateConfig" />
        </label>
      </div>

      <div class="syc-card">
        <h4 class="syc-card-h">添加目标</h4>
        <div class="syc-row">
          <input v-model="newTarget.name" placeholder="名称" class="syc-input" />
          <select v-model="newTarget.type" class="syc-input">
            <option value="remote">远端设备</option>
            <option value="local">本地</option>
            <option value="file">文件</option>
          </select>
          <button class="syc-btn syc-btn--primary" @click="onAddTarget">添加</button>
        </div>
      </div>

      <ul class="syc-list">
        <li v-for="t in targets" :key="t.id" class="syc-item" :class="`syc-item--${t.lastSyncStatus || 'idle'}`">
          <div class="syc-item-main">
            <span class="syc-item-name">{{ t.name }}</span>
            <span class="syc-badge">{{ typeLabel(t.type) }}</span>
            <span class="syc-badge" :class="`syc-badge--${t.lastSyncStatus || 'idle'}`">{{ statusLabel(t.lastSyncStatus) }}</span>
          </div>
          <div class="syc-item-actions">
            <button class="syc-btn" :disabled="syncing" @click="onSync(t.id, 'export')">导出</button>
            <button class="syc-btn" :disabled="syncing" @click="onSync(t.id, 'import')">导入</button>
            <button class="syc-btn" :disabled="syncing" @click="onSync(t.id, 'bidirectional')">双向</button>
            <button class="syc-btn syc-btn--danger" @click="onRemoveTarget(t.id)">删除</button>
          </div>
        </li>
        <li v-if="targets.length === 0" class="syc-empty">暂无同步目标</li>
      </ul>

      <div v-if="syncing" class="syc-progress">
        <div class="syc-progress-bar" :style="{ width: `${Math.round(syncProgress * 100)}%` }" />
      </div>
      <p v-if="syncError" class="syc-error">同步失败：{{ syncError }}</p>
    </div>

    <!-- 冲突协调 -->
    <div v-show="activeTab === 'conflicts'" class="syc-body">
      <div class="syc-stats">
        <div class="syc-stat"><span class="syc-stat-n">{{ unresolvedConflictCount }}</span><span class="syc-stat-l">未解决冲突</span></div>
      </div>
      <div v-if="unresolvedConflictCount > 0" class="syc-row syc-row--end">
        <button class="syc-btn" @click="onResolveAll('local')">全部保留本地</button>
        <button class="syc-btn" @click="onResolveAll('remote')">全部采用远端</button>
      </div>
      <ul class="syc-list">
        <li v-for="c in conflicts" :key="c.id" class="syc-item" :class="{ 'syc-item--conflict': c.resolution === null }">
          <div class="syc-item-main">
            <span class="syc-badge">{{ c.domain }}</span>
            <span class="syc-item-name">{{ c.entryId }}</span>
          </div>
          <div v-if="c.resolution === null" class="syc-item-actions">
            <button class="syc-btn" @click="onResolve(c.id, 'local')">保留本地</button>
            <button class="syc-btn" @click="onResolve(c.id, 'remote')">采用远端</button>
          </div>
          <span v-else class="syc-resolved">已{{ c.resolution === 'local' ? '保留本地' : '采用远端' }}</span>
        </li>
        <li v-if="conflicts.length === 0" class="syc-empty">无冲突记录</li>
      </ul>
    </div>

    <!-- 快照备份 -->
    <div v-show="activeTab === 'snapshots'" class="syc-body">
      <div class="syc-row syc-row--end">
        <button class="syc-btn syc-btn--primary" @click="onCreateSnapshot">创建快照</button>
      </div>
      <ul class="syc-list">
        <li v-for="s in recentSnapshots" :key="s.id" class="syc-item">
          <div class="syc-item-main">
            <span class="syc-item-name">{{ formatTime(s.createdAt) }}</span>
            <span class="syc-badge">{{ s.totalEntries }} 条 / {{ formatBytes(s.sizeBytes) }}</span>
          </div>
          <div class="syc-item-actions">
            <button class="syc-btn" @click="onRestore(s.id)">恢复</button>
          </div>
        </li>
        <li v-if="snapshots.length === 0" class="syc-empty">暂无快照</li>
      </ul>
    </div>

    <!-- 日志·迁移 -->
    <div v-show="activeTab === 'logs'" class="syc-body">
      <div class="syc-row syc-row--end">
        <button class="syc-btn" @click="onExportFile">导出数据文件</button>
        <button class="syc-btn" @click="fileInput?.click()">导入同步文件</button>
        <input ref="fileInput" type="file" accept="application/json" hidden @change="onImportFile" />
      </div>
      <p v-if="importError" class="syc-error">导入失败：{{ importError }}</p>
      <ul class="syc-list">
        <li v-for="log in recentLogs" :key="log.id" class="syc-item">
          <div class="syc-item-main">
            <span class="syc-badge" :class="`syc-badge--${log.status}`">{{ statusLabel(log.status) }}</span>
            <span class="syc-item-name">{{ formatTime(log.timestamp) }}</span>
            <span class="syc-muted">出 {{ log.exportedCount }} / 入 {{ log.importedCount }} / 冲突 {{ log.conflictCount }}</span>
          </div>
        </li>
        <li v-if="recentLogs.length === 0" class="syc-empty">暂无同步日志</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useSync } from '@/modules/sync'

const sync = useSync()
const {
  config, targets, conflicts, snapshots,
  syncStatus, syncProgress, syncError,
  unresolvedConflictCount, recentLogs, recentSnapshots,
  updateConfig, addTarget, removeTarget, sync: runSync,
  createSnapshot, restoreSnapshot, resolveConflict, resolveAllConflicts,
  downloadSyncData, importSyncFile,
} = sync

const tabs = [
  { key: 'targets', label: '目标 · 同步' },
  { key: 'conflicts', label: '冲突协调' },
  { key: 'snapshots', label: '快照备份' },
  { key: 'logs', label: '日志 · 迁移' },
] as const
type TabKey = typeof tabs[number]['key']
const activeTab = ref<TabKey>('targets')

const syncing = computed(() => syncStatus.value === 'syncing')
const fileInput = ref<HTMLInputElement | null>(null)

const newTarget = reactive({ name: '', type: 'remote' as 'remote' | 'local' | 'file' })

function onUpdateConfig() {
  updateConfig({
    deviceName: config.value.deviceName,
    conflictStrategy: config.value.conflictStrategy,
    logRetentionLimit: config.value.logRetentionLimit,
    snapshotRetentionLimit: config.value.snapshotRetentionLimit,
  })
}
function onAddTarget() {
  if (!newTarget.name.trim()) return
  addTarget({
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: newTarget.name.trim(),
    type: newTarget.type,
    lastSyncAt: '',
    lastSyncStatus: 'idle',
  })
  newTarget.name = ''
}
function onRemoveTarget(id: string) { removeTarget(id) }
async function onSync(id: string, direction: 'export' | 'import' | 'bidirectional') {
  await runSync(id, direction)
}
function onCreateSnapshot() { createSnapshot() }
function onRestore(id: string) { restoreSnapshot(id) }
function onResolve(id: string, strategy: 'local' | 'remote') { resolveConflict(id, strategy) }
function onResolveAll(strategy: 'local' | 'remote') { resolveAllConflicts(strategy) }
function onExportFile() { downloadSyncData() }
const importError = ref<string | null>(null)
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importError.value = null
  try {
    await importSyncFile(file)
  } catch (err) {
    // 引擎的 importSyncFile 失败仅 reject、不写 syncError（index.ts:585），
    // 且导入动作发生在 logs 分页，故在此就地展示，避免失败被静默吞掉。
    importError.value = err instanceof Error ? err.message : String(err)
  }
  input.value = ''
}

const typeLabel = (t: string) => ({ remote: '远端设备', local: '本地', file: '文件' }[t] ?? t)
const statusLabel = (s: string) => ({ idle: '待命', success: '成功', error: '失败', conflict: '冲突', syncing: '同步中' }[s] ?? s)
function formatTime(iso: string) {
  try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }) } catch { return iso }
}
function formatBytes(n: number) {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1)
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`
}
</script>

<style scoped>
.syc-panel {
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  padding: 16px;
  color: var(--hf-text);
  max-width: 560px;
}
.syc-head { margin-bottom: 12px; }
.syc-title { margin: 0; font-size: 16px; }
.syc-sub { margin: 2px 0 0; font-size: 12px; color: var(--hf-text-muted); }
.syc-tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
.syc-tab {
  background: transparent; border: 1px solid var(--hf-border);
  color: var(--hf-text-muted); border-radius: 999px;
  padding: 4px 12px; font-size: 12px; cursor: pointer;
}
.syc-tab--active { background: var(--hf-primary); color: #fff; border-color: var(--hf-primary); }
.syc-stats { display: flex; gap: 8px; margin-bottom: 12px; }
.syc-stat {
  flex: 1; background: var(--hf-bg); border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius); padding: 8px; text-align: center;
}
.syc-stat-n { display: block; font-size: 18px; font-weight: 600; color: var(--hf-primary); }
.syc-stat-l { font-size: 11px; color: var(--hf-text-muted); }
.syc-card { background: var(--hf-bg); border: 1px solid var(--hf-border); border-radius: var(--hf-radius); padding: 10px; margin-bottom: 10px; }
.syc-card-h { margin: 0 0 8px; font-size: 13px; }
.syc-field { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--hf-text-muted); margin-bottom: 8px; }
.syc-input {
  background: var(--hf-surface); border: 1px solid var(--hf-border);
  border-radius: 6px; padding: 5px 8px; color: var(--hf-text); font-size: 13px;
}
.syc-row { display: flex; gap: 6px; align-items: center; }
.syc-row--end { justify-content: flex-end; margin-bottom: 8px; }
.syc-btn {
  background: var(--hf-surface); border: 1px solid var(--hf-border);
  color: var(--hf-text); border-radius: 6px; padding: 5px 10px;
  font-size: 12px; cursor: pointer;
}
.syc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.syc-btn--primary { background: var(--hf-primary); color: #fff; border-color: var(--hf-primary); }
.syc-btn--danger { color: #e06c75; border-color: #e06c75; }
.syc-list { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.syc-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; background: var(--hf-bg); border: 1px solid var(--hf-border); border-radius: 6px; padding: 8px; }
.syc-item--success { border-left: 3px solid #98c379; }
.syc-item--error { border-left: 3px solid #e06c75; }
.syc-item--conflict { border-left: 3px solid #e5c07b; }
.syc-item-main { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.syc-item-name { font-size: 13px; }
.syc-item-actions { display: flex; gap: 4px; }
.syc-badge { font-size: 11px; padding: 1px 6px; border-radius: 6px; background: var(--hf-surface); border: 1px solid var(--hf-border); color: var(--hf-text-muted); }
.syc-badge--success { color: #98c379; border-color: #98c379; }
.syc-badge--error { color: #e06c75; border-color: #e06c75; }
.syc-badge--conflict { color: #e5c07b; border-color: #e5c07b; }
.syc-muted { font-size: 11px; color: var(--hf-text-muted); }
.syc-resolved { font-size: 11px; color: var(--hf-text-muted); }
.syc-empty { font-size: 12px; color: var(--hf-text-muted); text-align: center; padding: 12px; }
.syc-progress { height: 4px; background: var(--hf-border); border-radius: 999px; overflow: hidden; margin-top: 8px; }
.syc-progress-bar { height: 100%; background: var(--hf-primary); transition: width 0.2s ease; }
.syc-error { color: #e06c75; font-size: 12px; margin: 8px 0 0; }
</style>
