<template>
  <section class="ssy" aria-label="场景同步">
    <!-- 面板头 -->
    <div class="ssy-head">
      <div class="ssy-head-left">
        <span class="ssy-title">🔁 场景同步</span>
        <span class="ssy-sub">跨分支同步 · 差异识别 · 冲突协调</span>
      </div>
      <span class="ssy-badge">{{ stats.totalSyncs }} 次同步 · {{ stats.totalConflicts }} 冲突</span>
    </div>

    <!-- 空态 -->
    <p v-if="branches.length < 2" class="ssy-empty">
      至少需要两个时间分支才能同步。先在「分支星图」种下分支与检查点。
    </p>

    <template v-else>
      <!-- 选择同步对象 -->
      <div class="ssy-form">
        <select v-model="sourceId" class="ssy-input" aria-label="源分支">
          <option v-for="b in branches" :key="'s-' + b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <span class="ssy-arrow">→</span>
        <select v-model="targetId" class="ssy-input" aria-label="目标分支">
          <option v-for="b in branches" :key="'t-' + b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <button class="ssy-btn" :disabled="!canSync" @click="preview">预览</button>
        <button class="ssy-btn ssy-run" :disabled="!canSync" @click="push">推送</button>
        <button class="ssy-btn ssy-pull" :disabled="!canSync" @click="pull">拉取</button>
      </div>

      <!-- 差异预览 -->
      <div v-if="diff" class="ssy-block">
        <div class="ssy-block-title">
          差异预览 · 分歧率 {{ diff.divergenceRate }}%
        </div>
        <div class="ssy-diff-grid">
          <div class="ssy-diff-stat">
            <span class="ssy-diff-num">{{ diff.aOnly.length }}</span>
            <span class="ssy-diff-label">{{ branchName(sourceId) }} 独有</span>
          </div>
          <div class="ssy-diff-stat">
            <span class="ssy-diff-num">{{ diff.bOnly.length }}</span>
            <span class="ssy-diff-label">{{ branchName(targetId) }} 独有</span>
          </div>
          <div class="ssy-diff-stat">
            <span class="ssy-diff-num">{{ diff.common.filter(c => c.diverged).length }}</span>
            <span class="ssy-diff-label">已分歧</span>
          </div>
        </div>
      </div>

      <!-- 同步预览结果 -->
      <div v-if="previewResult" class="ssy-block">
        <div class="ssy-block-title">同步预览</div>
        <div class="ssy-diff-grid">
          <div class="ssy-diff-stat">
            <span class="ssy-diff-num">{{ previewResult.newCheckpoints.length }}</span>
            <span class="ssy-diff-label">新增</span>
          </div>
          <div class="ssy-diff-stat">
            <span class="ssy-diff-num">{{ previewResult.updatedCheckpoints.length }}</span>
            <span class="ssy-diff-label">更新</span>
          </div>
          <div class="ssy-diff-stat">
            <span class="ssy-diff-num">{{ previewResult.conflicts.length }}</span>
            <span class="ssy-diff-label">冲突</span>
          </div>
        </div>
        <div v-if="previewResult.conflicts.length" class="ssy-conflicts">
          <div v-for="c in previewResult.conflicts" :key="c.id" class="ssy-conflict">
            <span class="ssy-conflict-type">{{ CONFLICT_TYPE_LABELS[c.type] }}</span>
            <span class="ssy-conflict-desc">{{ c.description }}</span>
          </div>
        </div>
      </div>

      <!-- 最近同步 -->
      <div v-if="recentSyncs.length" class="ssy-block">
        <div class="ssy-block-title">最近同步</div>
        <div v-for="e in recentSyncs" :key="e.id" class="ssy-event">
          <span class="ssy-event-status" :class="'st-' + e.status">{{ STATUS_LABELS[e.status] }}</span>
          <span class="ssy-event-desc">
            {{ branchName(e.sourceBranchId) }} → {{ branchName(e.targetBranchId) }}
            · +{{ e.addedCount }} / ~{{ e.updatedCount }} / 冲突 {{ e.conflictCount }}
          </span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSceneSync } from '../modules/parallel-world/scene-sync'
import type { WorldBranch, Checkpoint } from '../modules/parallel-world/types'
import type { SyncEvent, SyncConflictType } from '../modules/parallel-world/scene-sync'

const props = defineProps<{
  branches: WorldBranch[]
  checkpoints: Checkpoint[]
  createCheckpoint: (branchId: string, label: string, description?: string, snapshot?: Record<string, unknown>, tags?: string[]) => Checkpoint
  updateCheckpoint: (checkpointId: string, updates: Partial<Checkpoint>) => Checkpoint | undefined
}>()

const CONFLICT_TYPE_LABELS: Record<SyncConflictType, string> = {
  version: '版本',
  label: '标签名',
  tag: '标签',
  data: '数据',
  timestamp: '时间戳',
}

const STATUS_LABELS: Record<SyncEvent['status'], string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '完成',
  failed: '失败',
  cancelled: '已取消',
}

function createCheckpointSync(
  branchId: string,
  label: string,
  description = '',
  snapshot: Record<string, unknown> = {},
  tags: string[] = [],
): Checkpoint {
  return props.createCheckpoint(branchId, label, description, snapshot, tags)
}

function updateCheckpointSync(checkpointId: string, updates: Partial<Checkpoint>): Checkpoint | undefined {
  return props.updateCheckpoint(checkpointId, updates)
}

const sync = useSceneSync(
  () => props.branches,
  () => props.checkpoints,
  (branchId) => props.checkpoints.filter(cp => cp.branchId === branchId),
  createCheckpointSync,
  updateCheckpointSync,
)

const sourceId = ref(props.branches[0]?.id ?? '')
const targetId = ref(props.branches[1]?.id ?? '')

// 宿主分支为异步加载，初始 props 可能为空；分支到达后回填默认选择
watch(
  () => props.branches,
  (branches) => {
    if (!sourceId.value && branches.length > 0) sourceId.value = branches[0].id
    if (!targetId.value && branches.length > 1) targetId.value = branches[1].id
  },
  { immediate: true },
)
const previewResult = ref<ReturnType<typeof sync.previewSync> | null>(null)

const canSync = computed(() => {
  if (!sourceId.value || !targetId.value) return false
  return sourceId.value !== targetId.value
})

const diff = computed(() => {
  if (!canSync.value) return null
  return sync.getSyncDiff(sourceId.value, targetId.value)
})

const recentSyncs = computed(() => sync.recentSyncs.value)

const stats = computed(() => sync.getSyncStats())

function preview() {
  previewResult.value = sync.previewSync(sourceId.value, targetId.value, ['all'])
}

async function push() {
  previewResult.value = sync.previewSync(sourceId.value, targetId.value, ['all'])
  await sync.pushSync(sourceId.value, targetId.value, ['all'], 'merge')
}

async function pull() {
  previewResult.value = sync.previewSync(targetId.value, sourceId.value, ['all'])
  await sync.pullSync(targetId.value, sourceId.value, ['all'], 'merge')
}

function branchName(id: string): string {
  return props.branches.find(b => b.id === id)?.name ?? id
}
</script>

<style scoped>
.ssy {
  margin-top: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.ssy-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.ssy-head-left { display: flex; flex-direction: column; gap: 2px; }
.ssy-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.ssy-sub { font-size: 12px; opacity: 0.72; }
.ssy-badge {
  padding: 3px 12px; border-radius: 999px;
  background: rgba(195, 159, 106, 0.16); border: 1px solid rgba(195, 159, 106, 0.4);
  color: #d9c390; font-size: 12px; white-space: nowrap;
}
.ssy-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }

.ssy-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.ssy-input {
  flex: 1; min-width: 110px; padding: 6px 10px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(20, 24, 20, 0.45);
  color: #e8ddc8; font-size: 12px;
}
.ssy-arrow { color: #8a9a7a; }
.ssy-btn {
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.4); background: rgba(195, 159, 106, 0.14);
  color: #e8d9a8; font-size: 12px; cursor: pointer;
}
.ssy-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ssy-run { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.ssy-pull { background: rgba(107, 159, 196, 0.16); border-color: rgba(107, 159, 196, 0.4); color: #a8c8e0; }

.ssy-block { border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px; background: rgba(195, 159, 106, 0.06); margin-bottom: 8px; }
.ssy-block-title { font-size: 12px; font-weight: 700; color: #d9c390; margin-bottom: 6px; }

.ssy-diff-grid { display: flex; gap: 8px; }
.ssy-diff-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px; border-radius: 8px; background: rgba(195, 159, 106, 0.05); }
.ssy-diff-num { font-size: 18px; font-weight: 700; color: #f0d9a8; }
.ssy-diff-label { font-size: 11px; color: #8a9a7a; }

.ssy-conflicts { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
.ssy-conflict { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.ssy-conflict-type { padding: 1px 8px; border-radius: 999px; background: rgba(196, 106, 90, 0.18); color: #e0a08a; font-size: 11px; white-space: nowrap; }
.ssy-conflict-desc { flex: 1; color: #e0d4ba; }

.ssy-event { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.ssy-event-status { padding: 1px 8px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.ssy-event-status.st-completed { background: rgba(138, 154, 122, 0.18); color: #a9c08a; }
.ssy-event-status.st-failed { background: rgba(196, 106, 90, 0.18); color: #e0a08a; }
.ssy-event-status.st-pending, .ssy-event-status.st-in_progress { background: rgba(195, 159, 106, 0.16); color: #d9c390; }
.ssy-event-status.st-cancelled { background: rgba(138, 154, 122, 0.1); color: #8a8a80; }
.ssy-event-desc { flex: 1; color: #e0d4ba; }
</style>
