<template>
  <section class="br-panel" aria-label="备份恢复与安全报告">
    <div class="br-panel-head">
      <span class="br-panel-title">🛟 备份恢复</span>
      <span class="br-panel-sub">加密快照 · 安全报告</span>
    </div>

    <!-- 概览 -->
    <div class="br-block">
      <span class="br-block-label">备份概览</span>
      <div class="br-row">
        <span class="br-stat">{{ backupCount }} 份备份</span>
        <span class="br-stat">共 {{ fmtSize(totalBackupSize) }}</span>
        <span v-if="lastBackup" class="br-stat">最近 {{ fmtDate(lastBackup.createdAt) }}</span>
        <span v-else class="br-stat">尚未备份</span>
      </div>
    </div>

    <!-- 创建备份 -->
    <div class="br-block">
      <span class="br-block-label">创建加密备份</span>
      <div class="br-row">
        <select v-model="backupType" class="br-select">
          <option value="full">全量</option>
          <option value="incremental">增量</option>
          <option value="config-only">仅配置</option>
        </select>
        <input v-model="backupName" class="br-input" placeholder="备份名称（可选）" />
        <button class="br-btn br-btn-primary" @click="doBackup" :disabled="isBackingUp || !passphrase">
          {{ isBackingUp ? '备份中…' : '创建备份' }}
        </button>
      </div>
      <p v-if="!passphrase" class="br-hint">解锁保险库后可用当前口令创建加密备份</p>
      <p v-if="backupMsg" class="br-msg">{{ backupMsg }}</p>
    </div>

    <!-- 备份列表 -->
    <div class="br-block">
      <span class="br-block-label">备份列表 · {{ backups.length }}</span>
      <ul v-if="backups.length" class="br-list">
        <li v-for="b in backups" :key="b.id" class="br-item">
          <div class="br-item-head">
            <strong>{{ b.name }}</strong>
            <span class="br-type">{{ typeLabel(b.type) }}</span>
          </div>
          <div class="br-item-meta">
            <span>{{ fmtDate(b.createdAt) }}</span>
            <span>{{ fmtSize(b.sizeBytes) }}</span>
            <span>{{ b.keyCount }} 键</span>
          </div>
          <div class="br-item-actions">
            <button class="br-btn br-btn-sm" @click="doRestore(b.id)" :disabled="isRestoring || !passphrase">恢复</button>
            <button class="br-btn br-btn-sm br-danger" @click="doDelete(b.id)">删除</button>
          </div>
        </li>
      </ul>
      <p v-else class="br-empty">还没有备份</p>
    </div>

    <!-- 安全报告 -->
    <div class="br-block">
      <span class="br-block-label">安全报告</span>
      <div class="br-row">
        <select v-model="reportPeriod" class="br-select">
          <option value="daily">日报</option>
          <option value="weekly">周报</option>
          <option value="monthly">月报</option>
        </select>
        <button class="br-btn" @click="genReport">生成报告</button>
      </div>
      <div v-if="latestReport" class="br-report">
        <div class="br-report-score">
          <span class="br-score-num">{{ latestReport.score.total }}</span>
          <span class="br-score-label">{{ scoreLevel(latestReport.score.level) }}</span>
        </div>
        <p v-if="latestReport.recommendations.length" class="br-recs">
          <span v-for="r in latestReport.recommendations" :key="r" class="br-rec">· {{ r }}</span>
        </p>
      </div>
      <p v-else class="br-empty">尚未生成报告</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBackupRecovery, useSecurityReports, getSafetyScore } from '../modules/safety'
import type { BackupType, SecurityReportPeriod, SafetyScore } from '../modules/safety'

const props = defineProps<{ passphrase: string }>()

const r = useBackupRecovery()
const rep = useSecurityReports()

const backupType = ref<BackupType>('full')
const backupName = ref('')
const backupMsg = ref('')
const reportPeriod = ref<SecurityReportPeriod>('weekly')

const passphrase = computed(() => props.passphrase)
const isBackingUp = computed(() => r.isBackingUp.value)
const isRestoring = computed(() => r.isRestoring.value)
const backups = computed(() => r.backups.value)
const lastBackup = computed(() => r.lastBackup.value)
const backupCount = computed(() => r.backupCount.value)
const totalBackupSize = computed(() => r.totalBackupSize.value)
const latestReport = computed(() => rep.latestReport.value)

async function doBackup() {
  if (!passphrase.value) return
  const meta = await r.createBackup(backupType.value, backupName.value.trim() || undefined, passphrase.value)
  backupMsg.value = meta ? `已创建备份「${meta.name}」` : '创建失败'
  backupName.value = ''
}

async function doRestore(id: string) {
  if (!passphrase.value) return
  const result = await r.restoreBackup(id, passphrase.value)
  backupMsg.value = result.success
    ? `恢复成功（${result.restored} 个键）`
    : `恢复失败：${result.errors[0] ?? '未知错误'}`
}

function doDelete(id: string) {
  r.deleteBackup(id)
}

function genReport() {
  rep.generateReport(reportPeriod.value, getSafetyScore)
}

function typeLabel(t: BackupType) {
  return t === 'full' ? '全量' : t === 'config-only' ? '仅配置' : '增量'
}

function fmtSize(bytes: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function scoreLevel(level: SafetyScore['level']) {
  return level === 'excellent' ? '优秀' : level === 'good' ? '良好' : '待加强'
}
</script>

<style scoped>
.br-panel {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.br-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.br-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.br-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.br-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.br-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.br-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.br-stat {
  font-size: 12px;
  color: rgba(240, 242, 255, 0.75);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 3px 9px;
}
.br-select,
.br-input {
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.br-input {
  flex: 1;
  min-width: 140px;
}
.br-btn {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.2s ease;
}
.br-btn:hover {
  background: rgba(255, 255, 255, 0.09);
}
.br-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.br-btn-primary {
  background: rgba(138, 154, 122, 0.18);
  border-color: rgba(138, 154, 122, 0.35);
  color: #b8c4a0;
}
.br-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  font-size: 11px;

  min-height: 26px;
}
.br-danger {
  color: #e07a6a;
}
.br-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
}
.br-msg {
  margin: 0;
  font-size: 11px;
  color: #b8c4a0;
}
.br-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.br-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  flex-wrap: wrap;
}
.br-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 120px;
  font-size: 13px;
  color: rgba(240, 242, 255, 0.9);
}
.br-type {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 7px;
  background: rgba(138, 154, 122, 0.16);
  color: #b8c4a0;
}
.br-item-meta {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: var(--text-low);
}
.br-item-actions {
  display: flex;
  gap: 6px;
}
.br-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-low);
}
.br-report {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.br-report-score {
  display: flex;
  align-items: center;
  gap: 10px;
}
.br-score-num {
  font-size: 22px;
  font-weight: 700;
  color: #b8c4a0;
}
.br-score-label {
  font-size: 11px;
  color: var(--text-medium);
}
.br-recs {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--text-medium);
}
</style>
