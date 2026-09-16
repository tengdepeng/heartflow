<template>
  <section class="ktp" aria-label="知识迁移">
    <!-- 面板头 -->
    <div class="ktp-head">
      <div class="ktp-head-left">
        <span class="ktp-title">📤 知识迁移</span>
        <span class="ktp-sub">跨分支经验传递 · 应用与沉淀</span>
      </div>
      <span class="ktp-badge">成功率 {{ Math.round(successRate * 100) }}%</span>
    </div>

    <!-- 空态 -->
    <p v-if="branches.length < 2" class="ktp-empty">
      至少需要两个时间分支才能迁移知识。先在「分支星图」种下分支。
    </p>

    <template v-else>
      <!-- 创建迁移 -->
      <div class="ktp-form">
        <select v-model="sourceId" class="ktp-input" aria-label="源分支">
          <option v-for="b in branches" :key="'s-' + b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <span class="ktp-arrow">→</span>
        <select v-model="targetId" class="ktp-input" aria-label="目标分支">
          <option v-for="b in branches" :key="'t-' + b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <input v-model="knowledge" class="ktp-input ktp-wide" placeholder="要迁移的知识点…" @keydown.enter.prevent="create" />
        <select v-model="type" class="ktp-input ktp-narrow" aria-label="知识类型">
          <option v-for="(label, key) in TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <button class="ktp-btn ktp-add" :disabled="!canCreate" @click="create">迁移</button>
      </div>

      <!-- 迁移列表 -->
      <p v-if="!transfers.length" class="ktp-empty">
        还没有知识迁移。把一个分支里学到的经验，传递给另一个世界的自己。
      </p>

      <div v-else class="ktp-list">
        <div v-for="t in transfers" :key="t.id" class="ktp-card">
          <div class="ktp-card-head">
            <span class="ktp-card-type">{{ TYPE_LABELS[t.type] }}</span>
            <span class="ktp-card-route">{{ branchName(t.sourceBranchId) }} → {{ branchName(t.targetBranchId) }}</span>
            <span class="ktp-card-result" :class="'res-' + t.result">{{ RESULT_LABELS[t.result] }}</span>
          </div>
          <p class="ktp-card-knowledge">{{ t.knowledge }}</p>
          <div class="ktp-card-meta">
            <span>适用性 {{ Math.round(t.applicabilityScore * 100) }}%</span>
            <span v-if="t.feedback" class="ktp-card-feedback">反馈：{{ t.feedback }}</span>
          </div>
          <div v-if="t.result === 'pending'" class="ktp-card-actions">
            <button class="ktp-btn ktp-mini ktp-apply" @click="apply(t.id)">应用</button>
            <button class="ktp-btn ktp-mini ktp-reject" @click="reject(t.id)">拒绝</button>
            <button class="ktp-btn ktp-mini ktp-adapt" @click="adapt(t.id)">改写应用</button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKnowledgeTransfer } from '../modules/parallel-world/branch-visualization'
import type { WorldBranch } from '../modules/parallel-world/types'
import type { KnowledgeTransfer } from '../modules/parallel-world/branch-visualization'

const props = defineProps<{
  branches: WorldBranch[]
}>()

const TYPE_LABELS: Record<KnowledgeTransfer['type'], string> = {
  lesson: '教训',
  skill: '技能',
  insight: '洞察',
  pattern: '模式',
  decision: '决策',
}

const RESULT_LABELS: Record<KnowledgeTransfer['result'], string> = {
  pending: '待处理',
  applied: '已应用',
  rejected: '已拒绝',
  adapted: '改写应用',
}

const engine = useKnowledgeTransfer()

const sourceId = ref(props.branches[0]?.id ?? '')
const targetId = ref(props.branches[1]?.id ?? '')
const knowledge = ref('')
const type = ref<KnowledgeTransfer['type']>('lesson')

const canCreate = computed(() => {
  if (!sourceId.value || !targetId.value) return false
  if (sourceId.value === targetId.value) return false
  return knowledge.value.trim().length > 0
})

const transfers = computed(() => engine.transfers.value)
const successRate = computed(() => engine.getTransferSuccessRate())

function create() {
  if (!canCreate.value) return
  engine.createTransfer(sourceId.value, targetId.value, knowledge.value.trim(), type.value)
  knowledge.value = ''
}

function apply(id: string) {
  engine.applyTransfer(id)
}

function reject(id: string) {
  engine.rejectTransfer(id)
}

function adapt(id: string) {
  const t = engine.transfers.value.find(x => x.id === id)
  if (!t) return
  const adapted = prompt('改写后的知识点：', t.knowledge)
  if (adapted && adapted.trim()) {
    engine.adaptTransfer(id, adapted.trim())
  }
}

function branchName(id: string): string {
  return props.branches.find(b => b.id === id)?.name ?? id
}
</script>

<style scoped>
.ktp {
  margin-top: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.ktp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.ktp-head-left { display: flex; flex-direction: column; gap: 2px; }
.ktp-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.ktp-sub { font-size: 12px; opacity: 0.72; }
.ktp-badge {
  padding: 3px 12px; border-radius: 999px;
  background: rgba(138, 154, 122, 0.16); border: 1px solid rgba(138, 154, 122, 0.4);
  color: #a9c08a; font-size: 12px; white-space: nowrap;
}
.ktp-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }

.ktp-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.ktp-input {
  flex: 1; min-width: 110px; padding: 6px 10px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(20, 24, 20, 0.45);
  color: #e8ddc8; font-size: 12px;
}
.ktp-wide { flex-basis: 100%; }
.ktp-narrow { flex: 0.6; min-width: 90px;
}
.ktp-arrow { color: #8a9a7a; }
.ktp-btn {
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.4); background: rgba(195, 159, 106, 0.14);
  color: #e8d9a8; font-size: 12px; cursor: pointer;
}
.ktp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ktp-add { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.ktp-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 2px 10px; font-size: 11px; 
  min-height: 26px;
}
.ktp-apply { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.ktp-reject { background: rgba(196, 106, 90, 0.16); border-color: rgba(196, 106, 90, 0.4); color: #e0a08a; }
.ktp-adapt { background: rgba(107, 159, 196, 0.16); border-color: rgba(107, 159, 196, 0.4); color: #a8c8e0; }

.ktp-list { display: flex; flex-direction: column; gap: 8px; }
.ktp-card { border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px; background: rgba(195, 159, 106, 0.06); }
.ktp-card-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ktp-card-type { padding: 1px 8px; border-radius: 999px; background: rgba(195, 159, 106, 0.16); color: #d9c390; font-size: 11px; white-space: nowrap; }
.ktp-card-route { flex: 1; color: #8a9a7a; font-size: 11px; }
.ktp-card-result { padding: 1px 8px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.ktp-card-result.res-pending { background: rgba(195, 159, 106, 0.16); color: #d9c390; }
.ktp-card-result.res-applied, .ktp-card-result.res-adapted { background: rgba(138, 154, 122, 0.18); color: #a9c08a; }
.ktp-card-result.res-rejected { background: rgba(196, 106, 90, 0.16); color: #e0a08a; }
.ktp-card-knowledge { font-size: 13px; color: #e8ddc8; line-height: 1.6; margin: 6px 0 4px; }
.ktp-card-meta { display: flex; gap: 14px; font-size: 11px; color: #8a8a80; flex-wrap: wrap; }
.ktp-card-feedback { color: #a9c08a; }
.ktp-card-actions { display: flex; gap: 6px; margin-top: 8px; }
</style>
