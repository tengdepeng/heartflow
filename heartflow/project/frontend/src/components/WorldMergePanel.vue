<template>
  <section class="wmp" aria-label="世界融合">
    <!-- 面板头 -->
    <div class="wmp-head">
      <div class="wmp-head-left">
        <span class="wmp-title">🧬 世界融合</span>
        <span class="wmp-sub">分支合并 · 遗产继承 · 回滚</span>
      </div>
      <span class="wmp-badge">{{ merge.successfulMergeCount.value }} 次融合 · {{ merge.rollbackCount.value }} 回滚</span>
    </div>

    <!-- 空态 -->
    <p v-if="branches.length < 2" class="wmp-empty">
      至少需要两个时间分支才能融合。先在「分支星图」种下分支与检查点。
    </p>

    <template v-else>
      <!-- 选择合并对象 -->
      <div class="wmp-form">
        <select v-model="sourceId" class="wmp-input" aria-label="源分支">
          <option v-for="b in branches" :key="'s-' + b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <span class="wmp-arrow">⇢</span>
        <select v-model="targetId" class="wmp-input" aria-label="目标分支">
          <option v-for="b in branches" :key="'t-' + b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <button class="wmp-btn" :disabled="!canMerge" @click="previewMerge">预览</button>
        <button class="wmp-btn wmp-run" :disabled="!canMerge" @click="execute">执行融合</button>
      </div>

      <!-- 策略推荐 -->
      <div v-if="canMerge" class="wmp-reco">
        <span class="wmp-reco-label">建议策略</span>
        <span class="wmp-reco-text">{{ strategyLabel(recommendation.strategy) }} — {{ recommendation.reason }}</span>
      </div>

      <!-- 合并预览 -->
      <div v-if="preview" class="wmp-block">
        <div class="wmp-block-title">
          合并预览 · {{ strategyLabel(preview.strategy) }}
        </div>
        <div class="wmp-preview-grid">
          <div class="wmp-preview-stat">
            <span class="wmp-preview-num">{{ preview.newCheckpoints }}</span>
            <span class="wmp-preview-label">新增检查点</span>
          </div>
          <div class="wmp-preview-stat">
            <span class="wmp-preview-num">{{ preview.modifiedCheckpoints }}</span>
            <span class="wmp-preview-label">修改检查点</span>
          </div>
          <div class="wmp-preview-stat">
            <span class="wmp-preview-num">{{ preview.totalConflicts }}</span>
            <span class="wmp-preview-label">冲突</span>
          </div>
        </div>

        <!-- 冲突列表 -->
        <div v-if="preview.conflicts.length" class="wmp-conflicts">
          <div v-for="c in preview.conflicts" :key="c.id" class="wmp-conflict">
            <span class="wmp-conflict-sev" :class="'sev-' + c.severity">{{ SEV_LABELS[c.severity] }}</span>
            <span class="wmp-conflict-desc">{{ c.description }}</span>
            <button v-if="!c.resolved" class="wmp-btn wmp-mini" @click="resolve(c.id, 'keep-source')">保留源</button>
            <button v-if="!c.resolved" class="wmp-btn wmp-mini" @click="resolve(c.id, 'keep-target')">保留目标</button>
            <button v-if="!c.resolved" class="wmp-btn wmp-mini wmp-merge" @click="resolve(c.id, 'merge')">合并</button>
            <span v-else class="wmp-conflict-done">✓ 已解决</span>
          </div>
        </div>
        <button v-if="preview.conflicts.length" class="wmp-btn wmp-mini wmp-auto" @click="autoResolve">自动解决非关键</button>
      </div>

      <!-- 融合结果 -->
      <div v-if="lastResult" class="wmp-block wmp-result">
        <div class="wmp-result-head">
          <span class="wmp-result-status" :class="{ ok: lastResult.success, fail: !lastResult.success }">
            {{ lastResult.success ? '✓ 融合成功' : '✗ 融合失败' }}
          </span>
          <span class="wmp-result-summary">{{ lastResult.summary }}</span>
        </div>
        <div v-if="lastResult.legacies.length" class="wmp-legacies">
          <div class="wmp-block-title">遗产继承（{{ lastResult.legacies.length }}）</div>
          <div v-for="(l, i) in lastResult.legacies" :key="i" class="wmp-legacy">
            <span class="wmp-legacy-type">{{ LEGACY_LABELS[l.type] }}</span>
            <span class="wmp-legacy-reason">{{ l.reason }}</span>
          </div>
        </div>
      </div>

      <!-- 回滚历史 -->
      <div v-if="rollbackHistory.length" class="wmp-block">
        <div class="wmp-block-title">回滚历史</div>
        <div v-for="r in rollbackHistory" :key="r.id" class="wmp-rollback">
          <span class="wmp-rollback-type">{{ ROLLBACK_LABELS[r.type] }}</span>
          <span class="wmp-rollback-desc">{{ r.description }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'
import { useWorldMergeEngine } from '../modules/parallel-world/world-merge-engine'
import { PARALLEL_WORLD_STORAGE_KEYS } from '../modules/parallel-world/types'
import type { WorldBranch, Checkpoint, WorldSnapshot } from '../modules/parallel-world/types'
import type { MergeStrategy, MergePreview, ConflictSeverity, LegacyItem, RollbackAction } from '../modules/parallel-world/world-merge-engine'

const props = defineProps<{
  branches: WorldBranch[]
  checkpoints: Checkpoint[]
  snapshots: WorldSnapshot[]
}>()

const STRATEGY_LABELS: Record<MergeStrategy, string> = {
  'fast-forward': '快进合并',
  'three-way': '三方合并',
  'squash': '压缩合并',
  'rebase': '变基合并',
}

const SEV_LABELS: Record<ConflictSeverity, string> = {
  info: '提示',
  warning: '警告',
  critical: '严重',
}

const LEGACY_LABELS: Record<LegacyItem['type'], string> = {
  checkpoint: '检查点',
  tag: '标签',
  label: '标签名',
  metadata: '元数据',
  color: '颜色',
}

const ROLLBACK_LABELS: Record<RollbackAction['type'], string> = {
  snapshot: '快照',
  checkpoint: '检查点',
  merge: '融合',
}

const merge = useWorldMergeEngine(
  () => props.branches,
  () => props.checkpoints,
  () => props.snapshots,
  async () => {
    await storage.setKV(PARALLEL_WORLD_STORAGE_KEYS.BRANCHES, props.branches)
    await storage.setKV(PARALLEL_WORLD_STORAGE_KEYS.CHECKPOINTS, props.checkpoints)
    await storage.setKV(PARALLEL_WORLD_STORAGE_KEYS.SNAPSHOTS, props.snapshots)
  },
)

const sourceId = ref(props.branches[0]?.id ?? '')
const targetId = ref(props.branches[1]?.id ?? '')
const preview = ref<MergePreview | null>(null)

const canMerge = computed(() => {
  if (!sourceId.value || !targetId.value) return false
  return sourceId.value !== targetId.value
})

const recommendation = computed(() => {
  if (!canMerge.value) return { strategy: 'three-way' as MergeStrategy, reason: '' }
  return merge.recommendStrategy(sourceId.value, targetId.value)
})

const lastResult = computed(() => merge.latestMergeResult.value)
const rollbackHistory = computed(() => merge.getRollbackHistory())

function previewMerge() {
  preview.value = merge.previewMerge(sourceId.value, targetId.value)
}

function execute() {
  // 复用已存在的预览（含手动解决的冲突），避免重新检测丢失协调结果
  const p = preview.value ?? merge.previewMerge(sourceId.value, targetId.value)
  if (!p) return
  preview.value = p
  merge.executeMerge(sourceId.value, targetId.value, recommendation.value.strategy, p.id)
}

function resolve(conflictId: string, resolution: 'keep-source' | 'keep-target' | 'merge') {
  if (preview.value) merge.resolveConflict(preview.value.id, conflictId, resolution)
}

function autoResolve() {
  if (preview.value) merge.autoResolveNonCritical(preview.value.id)
}

function strategyLabel(s: MergeStrategy): string {
  return STRATEGY_LABELS[s]
}
</script>

<style scoped>
.wmp {
  margin-top: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.wmp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.wmp-head-left { display: flex; flex-direction: column; gap: 2px; }
.wmp-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.wmp-sub { font-size: 12px; opacity: 0.72; }
.wmp-badge {
  padding: 3px 12px; border-radius: 999px;
  background: rgba(195, 159, 106, 0.16); border: 1px solid rgba(195, 159, 106, 0.4);
  color: #d9c390; font-size: 12px; white-space: nowrap;
}
.wmp-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }

.wmp-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
.wmp-input {
  flex: 1; min-width: 110px; padding: 6px 10px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(20, 24, 20, 0.45);
  color: #e8ddc8; font-size: 12px;
}
.wmp-arrow { color: #8a9a7a; }
.wmp-btn {
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.4); background: rgba(195, 159, 106, 0.14);
  color: #e8d9a8; font-size: 12px; cursor: pointer;
}
.wmp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.wmp-run { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.wmp-mini { padding: 2px 10px; font-size: 11px; }
.wmp-merge { background: rgba(107, 159, 196, 0.16); border-color: rgba(107, 159, 196, 0.4); color: #a8c8e0; }
.wmp-auto { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; margin-top: 6px; }

.wmp-reco { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.wmp-reco-label { padding: 1px 8px; border-radius: 999px; background: rgba(195, 159, 106, 0.16); color: #d9c390; font-size: 11px; white-space: nowrap; }
.wmp-reco-text { color: #e0d4ba; }

.wmp-block { border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px; background: rgba(195, 159, 106, 0.06); margin-bottom: 8px; }
.wmp-block-title { font-size: 12px; font-weight: 700; color: #d9c390; margin-bottom: 6px; }

.wmp-preview-grid { display: flex; gap: 8px; }
.wmp-preview-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px; border-radius: 8px; background: rgba(195, 159, 106, 0.05); }
.wmp-preview-num { font-size: 18px; font-weight: 700; color: #f0d9a8; }
.wmp-preview-label { font-size: 11px; color: #8a9a7a; }

.wmp-conflicts { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.wmp-conflict { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); flex-wrap: wrap; }
.wmp-conflict-sev { padding: 1px 8px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.wmp-conflict-sev.sev-critical { background: rgba(196, 106, 90, 0.2); color: #e0a08a; }
.wmp-conflict-sev.sev-warning { background: rgba(195, 159, 106, 0.16); color: #d9c390; }
.wmp-conflict-sev.sev-info { background: rgba(138, 154, 122, 0.18); color: #a9c08a; }
.wmp-conflict-desc { flex: 1; color: #e0d4ba; min-width: 140px; }
.wmp-conflict-done { color: #a9c08a; font-size: 11px; }

.wmp-result { border-color: rgba(138, 154, 122, 0.3); }
.wmp-result-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.wmp-result-status { font-weight: 700; font-size: 13px; white-space: nowrap; }
.wmp-result-status.ok { color: #a9c08a; }
.wmp-result-status.fail { color: #e0a08a; }
.wmp-result-summary { font-size: 12px; color: #e0d4ba; line-height: 1.6; }

.wmp-legacies { margin-top: 8px; }
.wmp-legacy { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.wmp-legacy-type { padding: 1px 8px; border-radius: 999px; background: rgba(138, 154, 122, 0.18); color: #a9c08a; font-size: 11px; white-space: nowrap; }
.wmp-legacy-reason { flex: 1; color: #e0d4ba; }

.wmp-rollback { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.wmp-rollback-type { padding: 1px 8px; border-radius: 999px; background: rgba(107, 159, 196, 0.16); color: #a8c8e0; font-size: 11px; white-space: nowrap; }
.wmp-rollback-desc { flex: 1; color: #e0d4ba; }
</style>
