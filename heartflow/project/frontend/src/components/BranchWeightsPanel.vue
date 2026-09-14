<template>
  <section class="bwp" aria-label="分支权重">
    <!-- 面板头 -->
    <div class="bwp-head">
      <div class="bwp-head-left">
        <span class="bwp-title">⚖️ 分支权重</span>
        <span class="bwp-sub">关注度分配 · 优先级排序</span>
      </div>
      <span class="bwp-badge">{{ attentionNeeded.length }} 需关注</span>
    </div>

    <!-- 空态 -->
    <p v-if="branches.length === 0" class="bwp-empty">
      还没有时间分支。先在「分支星图」种下分支，再为每个世界分配关注权重。
    </p>

    <template v-else>
      <!-- 需关注分支 -->
      <div v-if="attentionNeeded.length" class="bwp-block">
        <div class="bwp-block-title">需要关注</div>
        <div v-for="c in attentionNeeded" :key="c.branchId" class="bwp-attention">
          <span class="bwp-attention-name">{{ branchName(c.branchId) }}</span>
          <span class="bwp-attention-priority" :class="'pri-' + c.priority">{{ PRIORITY_LABELS[c.priority] }}</span>
          <span class="bwp-attention-score">{{ Math.round(c.attentionScore * 100) }} 分</span>
        </div>
      </div>

      <!-- 分支权重列表 -->
      <div class="bwp-block">
        <div class="bwp-block-title">权重配置</div>
        <div v-for="b in branches" :key="b.id" class="bwp-row">
          <div class="bwp-row-head">
            <span class="bwp-row-name" :style="{ color: b.color }">{{ b.name }}</span>
            <span v-if="configOf(b.id)" class="bwp-row-priority" :class="'pri-' + configOf(b.id)!.priority">
              {{ PRIORITY_LABELS[configOf(b.id)!.priority] }}
            </span>
            <span v-else class="bwp-row-priority pri-unset">未设置</span>
          </div>
          <div class="bwp-row-controls">
            <input
              v-model.number="weightInputs[b.id]"
              type="range" min="0" max="1" step="0.1"
              class="bwp-slider"
              :aria-label="'权重 ' + b.name"
              @change="setWeight(b.id)"
            />
            <span class="bwp-row-value">{{ Math.round((weightInputs[b.id] ?? 0) * 100) }}%</span>
            <select
              v-model="priorityInputs[b.id]"
              class="bwp-select"
              :aria-label="'优先级 ' + b.name"
              @change="setWeight(b.id)"
            >
              <option v-for="(label, key) in PRIORITY_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div v-if="configOf(b.id)" class="bwp-row-meta">
            <span>综合权重 {{ Math.round(configOf(b.id)!.compositeWeight * 100) }}%</span>
            <span>关注度 {{ Math.round(configOf(b.id)!.attentionScore * 100) }}</span>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useBranchWeights } from '../modules/parallel-world/branch-visualization'
import type { WorldBranch } from '../modules/parallel-world/types'
import type { BranchWeightConfig } from '../modules/parallel-world/branch-visualization'

const props = defineProps<{
  branches: WorldBranch[]
}>()

const PRIORITY_LABELS: Record<BranchWeightConfig['priority'], string> = {
  critical: '关键',
  high: '高',
  medium: '中',
  low: '低',
  archived: '归档',
}

const engine = useBranchWeights()

const weightInputs = reactive<Record<string, number>>({})
const priorityInputs = reactive<Record<string, BranchWeightConfig['priority']>>({})

props.branches.forEach(b => {
  if (weightInputs[b.id] === undefined) weightInputs[b.id] = 0.5
  if (!priorityInputs[b.id]) priorityInputs[b.id] = 'medium'
})

const attentionNeeded = computed(() => engine.getAttentionNeeded())

function configOf(branchId: string): BranchWeightConfig | undefined {
  return engine.getWeight(branchId)
}

function setWeight(branchId: string) {
  engine.setWeight(branchId, weightInputs[branchId] ?? 0.5, priorityInputs[branchId] ?? 'medium')
}

function branchName(id: string): string {
  return props.branches.find(b => b.id === id)?.name ?? id
}
</script>

<style scoped>
.bwp {
  margin-top: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.bwp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.bwp-head-left { display: flex; flex-direction: column; gap: 2px; }
.bwp-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.bwp-sub { font-size: 12px; opacity: 0.72; }
.bwp-badge {
  padding: 3px 12px; border-radius: 999px;
  background: rgba(196, 106, 90, 0.16); border: 1px solid rgba(196, 106, 90, 0.4);
  color: #e0a08a; font-size: 12px; white-space: nowrap;
}
.bwp-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }

.bwp-block { border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px; background: rgba(195, 159, 106, 0.06); margin-bottom: 8px; }
.bwp-block-title { font-size: 12px; font-weight: 700; color: #d9c390; margin-bottom: 6px; }

.bwp-attention { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.bwp-attention-name { flex: 1; color: #e8ddc8; }
.bwp-attention-priority { padding: 1px 8px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.bwp-attention-score { font-size: 11px; color: #8a8a80; white-space: nowrap; }

.bwp-row { padding: 6px 0; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.bwp-row:last-child { border-bottom: none; }
.bwp-row-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.bwp-row-name { font-size: 13px; font-weight: 600; flex: 1; }
.bwp-row-priority { padding: 1px 8px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.bwp-row-priority.pri-critical { background: rgba(196, 106, 90, 0.2); color: #e0a08a; }
.bwp-row-priority.pri-high { background: rgba(196, 106, 90, 0.14); color: #e0b08a; }
.bwp-row-priority.pri-medium { background: rgba(195, 159, 106, 0.16); color: #d9c390; }
.bwp-row-priority.pri-low { background: rgba(138, 154, 122, 0.16); color: #a9c08a; }
.bwp-row-priority.pri-archived { background: rgba(138, 154, 122, 0.1); color: #8a8a80; }
.bwp-row-priority.pri-unset { background: rgba(195, 159, 106, 0.08); color: #8a8a80; }

.bwp-row-controls { display: flex; align-items: center; gap: 8px; }
.bwp-slider { flex: 1; accent-color: #c4956a; }
.bwp-row-value { font-size: 12px; color: #f0d9a8; white-space: nowrap; width: 40px; text-align: right; }
.bwp-select {
  padding: 3px 8px; border-radius: 6px; font-size: 11px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(20, 24, 20, 0.45);
  color: #e8ddc8;
}
.bwp-row-meta { display: flex; gap: 14px; font-size: 11px; color: #8a8a80; margin-top: 3px; }
</style>
