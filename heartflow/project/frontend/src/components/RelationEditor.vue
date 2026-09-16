<template>
  <div class="re-overlay" @click.self="$emit('close')">
    <div class="re-card">
      <h3 class="re-title">关系编辑</h3>
      <p class="re-subtitle">为「{{ nodeTitle }}」建立与其他节点的联系</p>

      <!-- 已有关系列表 -->
      <div class="re-section">
        <h4 class="re-section-title">已有关系 ({{ existingRelations.length }})</h4>
        <div v-if="existingRelations.length === 0" class="re-empty">暂未建立关系</div>
        <div v-else v-for="rel in existingRelations" :key="rel.id" class="re-rel-item">
          <span class="re-rel-icon">{{ RELATION_TYPE_META[rel.type].icon }}</span>
          <span class="re-rel-label">{{ RELATION_TYPE_META[rel.type].label }}</span>
          <span class="re-rel-arrow">→</span>
          <span class="re-rel-target">{{ getNodeTitle(rel.targetId === nodeId ? rel.sourceId : rel.targetId) }}</span>
          <span class="re-rel-desc" v-if="rel.label">「{{ rel.label }}」</span>
          <button class="re-del-btn" @click="removeRelation(rel.id)">×</button>
        </div>
      </div>

      <!-- 新建关系 -->
      <div class="re-section">
        <h4 class="re-section-title">新建关系</h4>
        <div class="re-form">
          <select v-model="newRel.targetId" class="re-select">
            <option value="" disabled>选择目标节点</option>
            <option v-for="n in availableNodes" :key="n.id" :value="n.id">{{ n.title }}</option>
          </select>
          <div class="re-type-grid">
            <button
              v-for="(meta, type) in RELATION_TYPE_META"
              :key="type"
              class="re-type-btn"
              :class="{ active: newRel.type === type }"
              @click="newRel.type = type as RelationType"
            >
              <span class="re-type-icon">{{ meta.icon }}</span>
              <span class="re-type-label">{{ meta.label }}</span>
            </button>
          </div>
          <input v-model="newRel.label" class="re-input" placeholder="关系描述（可选）" />
          <button class="re-add-btn" :disabled="!newRel.targetId || !newRel.type" @click="addRelation">添加关系</button>
        </div>
      </div>

      <div class="re-actions">
        <button class="re-btn-close" @click="$emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { RELATION_TYPE_META, createRelation, deleteRelation, getNodeRelations, getNodes } from '../modules/knowledge/index'
import type { RelationType } from '../modules/knowledge/types'

const props = defineProps<{
  nodeId: string
  nodeTitle: string
}>()

const allNodes = computed(() => getNodes())
const nodeId = props.nodeId

const existingRelations = computed(() => getNodeRelations(nodeId))

const availableNodes = computed(() =>
  allNodes.value.filter(n => n.id !== nodeId)
)

const newRel = reactive({
  targetId: '',
  type: 'related' as RelationType,
  label: '',
})

function getNodeTitle(id: string): string {
  return allNodes.value.find(n => n.id === id)?.title || '未知节点'
}

function addRelation() {
  if (!newRel.targetId || !newRel.type) return
  createRelation({
    sourceId: nodeId,
    targetId: newRel.targetId,
    type: newRel.type,
    label: newRel.label,
  } as any)
  newRel.targetId = ''
  newRel.label = ''
}

function removeRelation(id: string) {
  deleteRelation(id)
}
</script>

<style scoped>
.re-overlay {
  position: fixed; inset: 0;
  background: rgba(10, 8, 6, 0.75);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.re-card {
  background: var(--bg-deep);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 14px;
  padding: 24px;
  width: 440px;
  max-width: 90vw;
  display: flex; flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  max-height: 80vh;
  overflow-y: auto;
}
.re-title { font-size: 16px; font-weight: 500; color: var(--text-high); margin: 0; }
.re-subtitle { font-size: 12px; color: var(--text-dim); margin: -8px 0 0; }
.re-section-title { font-size: 13px; font-weight: 500; color: var(--text-bright); margin: 0 0 8px; }
.re-empty { font-size: 12px; color: var(--text-secondary); padding: 8px 0; text-align: center; }
.re-rel-item {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 6px; font-size: 13px; color: rgba(var(--text-primary-rgb), 0.78);
}
.re-rel-icon { font-size: 16px; }
.re-rel-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.5); }
.re-rel-arrow { color: var(--text-secondary); margin: 0 4px; }
.re-rel-target { flex: 1; }
.re-rel-desc { font-size: 11px; color: rgba(var(--accent-rgb), 0.35); }
.re-del-btn { width: 20px; height: 20px; border-radius: 50%; border: none; background: transparent; color: rgba(var(--text-primary-rgb), 0.15); cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; 
  min-height: 24px;
  min-width: 24px;
}
.re-del-btn:hover { color: rgba(224,112,80,0.7); }
.re-form { display: flex; flex-direction: column; gap: 10px; }
.re-select, .re-input {
  padding: 8px 10px; border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px; background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high); font-size: 13px; font-family: inherit; outline: none;
}
.re-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.re-type-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px;
  border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg); cursor: pointer; font-family: inherit; transition: all 0.2s;
}
.re-type-btn:hover { background: rgba(55,48,40,0.6); }
.re-type-btn.active { background: rgba(var(--accent-rgb), 0.1); border-color: rgba(var(--accent-rgb), 0.25); }
.re-type-icon { font-size: 20px; }
.re-type-label { font-size: 10px; color: var(--text-medium); }
.re-add-btn {
  padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1); color: var(--accent); font-family: inherit; cursor: pointer; transition: all 0.2s;
}
.re-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.re-add-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.2); border-color: rgba(var(--accent-rgb), 0.3); }
.re-actions { display: flex; justify-content: flex-end; }
.re-btn-close {
  padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent; color: var(--text-medium); font-family: inherit; cursor: pointer; transition: all 0.2s;
}
.re-btn-close:hover { background: var(--card-bg); color: var(--text-bright); }
</style>