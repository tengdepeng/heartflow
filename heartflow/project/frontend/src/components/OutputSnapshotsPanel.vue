<template>
  <section class="os-panel" aria-label="版本快照">
    <div class="os-panel-head">
      <span class="os-panel-title">📸 版本快照</span>
      <span class="os-panel-sub">本地备份 · 一键恢复</span>
    </div>
    <!-- 概览 -->
    <div class="os-block">
      <span class="os-block-label">快照概览</span>
      <div class="os-stats">
        <div class="os-stat">
          <span class="os-stat-num">{{ snapshots.length }}</span>
          <span class="os-stat-label">快照</span>
        </div>
        <div class="os-stat">
          <span class="os-stat-num">{{ records.length }}</span>
          <span class="os-stat-label">当前记录</span>
        </div>
        <div class="os-stat">
          <span class="os-stat-num">{{ latest ? latest.recordCount : '—' }}</span>
          <span class="os-stat-label">最近快照</span>
        </div>
      </div>
    </div>
    <!-- 创建快照 -->
    <div class="os-block">
      <span class="os-block-label">创建快照</span>
      <div class="os-row">
        <input v-model="label" class="os-input" placeholder="快照标签（可选）" @keyup.enter="doCreate" />
        <button class="os-btn os-btn-primary" :disabled="records.length === 0" @click="doCreate">备份当前</button>
      </div>
      <p v-if="records.length === 0" class="os-hint">当前没有输出记录，暂无可备份内容。</p>
    </div>
    <!-- 快照列表 -->
    <div v-if="snapshots.length" class="os-block">
      <span class="os-block-label">快照列表（{{ snapshots.length }}）</span>
      <div v-for="s in snapshots" :key="s.id" class="os-snap">
        <div class="os-snap-head">
          <span class="os-snap-label">{{ s.label }}</span>
          <span class="os-snap-count">{{ s.recordCount }} 条</span>
          <button class="os-snap-del" @click="removeSnapshot(s.id)">×</button>
        </div>
        <span class="os-snap-time">{{ formatTime(s.createdAt) }}</span>
        <div class="os-snap-actions">
          <button class="os-btn os-btn-sm" @click="restoreSnapshot(s.id)">恢复</button>
        </div>
      </div>
      <button class="os-btn os-btn-danger" @click="clearAll">清空全部快照</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storage } from '../engine/storage'
import { useOutputSnapshots } from '../modules/output/snapshot'
import type { OutputRecord } from '../modules/output'

const props = defineProps<{ records: OutputRecord[] }>()
const emit = defineEmits<{ (e: 'restored'): void }>()

const snapshotsApi = useOutputSnapshots()
const label = ref('')

const snapshots = computed(() => snapshotsApi.snapshots.value)
const latest = computed(() => snapshots.value[0] || null)

onMounted(() => {
  snapshotsApi.load()
})

function doCreate() {
  snapshotsApi.createSnapshot(props.records, label.value)
  label.value = ''
}

function restoreSnapshot(id: string) {
  const records = snapshotsApi.getSnapshotRecords(id)
  if (!records) return
  if (!confirm(`确定恢复到快照「${snapshots.value.find(s => s.id === id)?.label || ''}」？当前 ${props.records.length} 条记录将被替换。`)) return
  storage.setKV('hf:output_records', records)
  emit('restored')
}

function removeSnapshot(id: string) {
  snapshotsApi.deleteSnapshot(id)
}

function clearAll() {
  if (!confirm('确定清空全部快照？此操作不可撤销。')) return
  snapshotsApi.clearSnapshots()
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.os-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.os-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.os-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.os-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.os-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.os-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.os-stats {
  display: flex;
  gap: 20px;
}
.os-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.os-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #c9d6b8;
}
.os-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.os-row {
  display: flex;
  gap: 8px;
}
.os-input {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: #e8e4d8;
  font-size: 13px;
}
.os-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  color: #e8e4d8;
  background: rgba(139, 155, 122, 0.2);
}
.os-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.os-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.os-btn-danger {
  background: rgba(196, 106, 90, 0.3);
}
.os-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
.os-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
  margin-top: 8px;
}
.os-snap {
  padding: 10px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.15);
}
.os-snap:last-child {
  border-bottom: none;
}
.os-snap-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.os-snap-label {
  font-size: 14px;
  font-weight: 600;
  color: #e8e4d8;
}
.os-snap-count {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.os-snap-del {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(232, 228, 216, 0.4);
  font-size: 16px;
  cursor: pointer;
}
.os-snap-time {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.35);
}
.os-snap-actions {
  margin-top: 6px;
}
</style>
