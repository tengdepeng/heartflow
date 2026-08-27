<template>
  <section class="pe-panel" aria-label="预览引擎">
    <div class="pe-panel-head">
      <span class="pe-panel-title">🎬 预览引擎</span>
      <span class="pe-panel-sub">撤销重做 · 装修历史 · 批量操作</span>
    </div>

    <!-- 撤销/重做 -->
    <div class="pe-block">
      <span class="pe-block-label">撤销 / 重做</span>
      <div class="pe-row">
        <button class="pe-btn" @click="undo" :disabled="!canUndo">↩ 撤销 ({{ undoCount }})</button>
        <button class="pe-btn" @click="redo" :disabled="!canRedo">↪ 重做 ({{ redoCount }})</button>
        <button class="pe-btn pe-btn-danger" @click="clearUndoRedo" :disabled="!canUndo && !canRedo">清空</button>
      </div>
    </div>

    <!-- 预览状态 -->
    <div class="pe-block">
      <span class="pe-block-label">实时预览</span>
      <div v-if="!previewActive" class="pe-row">
        <select v-model="targetConfigId" class="pe-select">
          <option value="">选择配置</option>
          <option v-for="cfg in configs" :key="cfg.id" :value="cfg.id">{{ cfg.name }}</option>
        </select>
        <button class="pe-btn pe-btn-primary" @click="startPreview" :disabled="!targetConfigId">开始预览</button>
      </div>
      <div v-else class="pe-row">
        <span class="pe-previewing">预览中 · {{ previewConfigName }}</span>
        <button class="pe-btn pe-btn-primary" @click="commitPreview">提交</button>
        <button class="pe-btn" @click="cancelPreview">取消</button>
      </div>
    </div>

    <!-- 装修历史 -->
    <div class="pe-block">
      <span class="pe-block-label">装修历史 · {{ history.length }}</span>
      <ul v-if="recentHistory.length" class="pe-list">
        <li v-for="h in recentHistory" :key="h.id" class="pe-item">
          <span class="pe-item-desc">{{ h.description }}</span>
          <span class="pe-item-meta">{{ fmtTime(h.timestamp) }}</span>
        </li>
      </ul>
      <p v-else class="pe-empty">暂无装修历史。</p>
      <button class="pe-btn pe-btn-danger" @click="clearHistory" :disabled="!history.length" style="margin-top:8px">清空历史</button>
    </div>

    <!-- 批量操作 -->
    <div class="pe-block">
      <span class="pe-block-label">批量操作 · {{ batchOps.length }}</span>
      <div class="pe-row">
        <select v-model="batchType" class="pe-select">
          <option value="update">批量更新</option>
          <option value="duplicate">批量复制</option>
          <option value="delete">批量删除</option>
        </select>
        <button class="pe-btn pe-btn-primary" @click="createBatch" :disabled="!configs.length">创建</button>
      </div>
      <ul v-if="batchOps.length" class="pe-list">
        <li v-for="op in batchOps" :key="op.id" class="pe-item">
          <span class="pe-item-desc">{{ batchTypeLabel(op.type) }} · {{ op.status }}</span>
          <span class="pe-item-meta">成功 {{ op.successCount }} / 失败 {{ op.failureCount }}</span>
          <button class="pe-btn" @click="executeBatch(op.id)" :disabled="op.status !== 'pending' && op.status !== 'running'">执行</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePreviewEngine } from '../modules/customization/preview-engine'
import { getSpaceConfigs } from '../modules/customization/engine'

const pe = usePreviewEngine()

const configs = computed(() => getSpaceConfigs())
const canUndo = computed(() => pe.canUndo.value)
const canRedo = computed(() => pe.canRedo.value)
const undoCount = computed(() => pe.undoCount.value)
const redoCount = computed(() => pe.redoCount.value)
const history = computed(() => pe.history.value)
const recentHistory = computed(() => pe.recentHistory.value)
const batchOps = computed(() => pe.batchOps.value)
const previewActive = computed(() => pe.previewState.value.active)

const targetConfigId = ref('')
const batchType = ref<'update' | 'duplicate' | 'delete'>('update')

const previewConfigName = computed(() => {
  const id = pe.previewState.value.configId
  return configs.value.find(c => c.id === id)?.name ?? ''
})

function startPreview() {
  if (!targetConfigId.value) return
  pe.startPreview(targetConfigId.value)
}
function commitPreview() {
  pe.commitPreview('应用预览修改')
  targetConfigId.value = ''
}
function cancelPreview() {
  pe.cancelPreview()
  targetConfigId.value = ''
}
function undo() {
  pe.undo()
}
function redo() {
  pe.redo()
}
function clearUndoRedo() {
  pe.clearUndoRedo()
}
function clearHistory() {
  pe.clearHistory()
}
function createBatch() {
  if (!configs.value.length) return
  const ids = configs.value.slice(0, 3).map(c => c.id)
  const params = batchType.value === 'update' ? { description: '批量更新' } : { suffix: ' (副本)' }
  pe.createBatchOperation(batchType.value, ids, params)
}
function executeBatch(id: string) {
  pe.executeBatchOperation(id)
}
function batchTypeLabel(type: string): string {
  const labels: Record<string, string> = { update: '更新', delete: '删除', duplicate: '复制', export: '导出', import: '导入' }
  return labels[type] ?? type
}
function fmtTime(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}
</script>

<style scoped>
.pe-panel {
  width: 100%;
  max-width: 520px;
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
.pe-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.pe-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.pe-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.pe-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pe-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.pe-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.pe-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.pe-btn-primary {
  background: rgba(107, 159, 196, 0.12);
  border-color: rgba(107, 159, 196, 0.3);
  color: #6b9fc4;
}
.pe-btn-danger {
  background: rgba(196, 106, 90, 0.1);
  border-color: rgba(196, 106, 90, 0.3);
  color: #c46a5a;
}
.pe-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.pe-select {
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  flex: 1;
  min-width: 100px;
}
.pe-previewing {
  font-size: 12px;
  color: #5ab8a0;
  flex: 1;
}
.pe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pe-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pe-item-desc {
  flex: 1;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.9);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pe-item-meta {
  font-size: 10px;
  color: var(--text-low);
  font-variant-numeric: tabular-nums;
}
.pe-empty {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
  text-align: center;
}
</style>
