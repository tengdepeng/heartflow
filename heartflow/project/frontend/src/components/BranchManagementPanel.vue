<template>
  <section class="bmp" aria-label="时间分支管理">
    <div class="bmp-head">
      <span class="bmp-title">🌿 时间分支</span>
      <span class="bmp-sub">分支管理 · 检查点 · 世界快照</span>
    </div>

    <!-- 统计总览 -->
    <div class="bmp-stats">
      <div class="bmp-stat"><b>{{ stats.branches }}</b><span>分支</span></div>
      <div class="bmp-stat"><b>{{ stats.checkpoints }}</b><span>检查点</span></div>
      <div class="bmp-stat"><b>{{ stats.snapshots }}</b><span>快照</span></div>
      <div class="bmp-stat bmp-stat--hot"><b class="bmp-stat-name">{{ activeBranchName }}</b><span>当前分支</span></div>
    </div>

    <!-- 分支管理 -->
    <div class="bmp-block">
      <span class="bmp-block-label">分支管理</span>
      <div class="bmp-create">
        <input v-model="branchForm.name" class="bmp-input" placeholder="分支名称，如：副业线" />
        <input v-model="branchForm.description" class="bmp-input" placeholder="分支描述（可选）" />
        <div class="bmp-create-row">
          <select v-model="branchForm.parentId" class="bmp-select">
            <option value="" disabled>从分支分叉</option>
            <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
          <select v-model="branchForm.color" class="bmp-select">
            <option v-for="c in BRANCH_COLORS" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <button class="bmp-btn bmp-btn--primary bmp-create-btn" :disabled="!branchForm.name.trim()" @click="addBranch">＋ 创建分支</button>
        </div>
      </div>
      <div v-if="branches.length" class="bmp-branch-list">
        <div v-for="b in branches" :key="b.id" class="bmp-branch" :class="{ active: b.isActive }">
          <span class="bmp-branch-dot" :style="{ background: b.color }"></span>
          <div class="bmp-branch-body">
            <strong class="bmp-branch-name">{{ b.name }}</strong>
            <span class="bmp-branch-meta">{{ b.checkpointCount }} 检查点 · {{ b.description || '无描述' }}</span>
          </div>
          <button v-if="!b.isActive" class="bmp-btn bmp-btn--sm bmp-switch-btn" @click="switchTo(b.id)">切换</button>
          <span v-else class="bmp-branch-active">当前</span>
          <button v-if="b.id !== 'pw_trunk' && !b.isActive" class="bmp-btn bmp-btn--sm bmp-del-btn" @click="removeBranch(b.id)">✕</button>
        </div>
      </div>
      <div v-else class="bmp-empty">还没有分支。</div>
    </div>

    <!-- 检查点管理 -->
    <div class="bmp-block">
      <span class="bmp-block-label">检查点 · {{ activeBranchName }}</span>
      <div class="bmp-create">
        <input v-model="cpForm.label" class="bmp-input" placeholder="检查点标签，如：升职" />
        <input v-model="cpForm.description" class="bmp-input" placeholder="检查点描述（可选）" />
        <div class="bmp-create-row">
          <input v-model="cpForm.tags" class="bmp-input" placeholder="标签，逗号分隔（可选）" />
          <input v-model="cpForm.snapshot" class="bmp-input" placeholder='快照 JSON（可选），如 {"level": 2}' />
          <button class="bmp-btn bmp-btn--primary bmp-cp-btn" :disabled="!cpForm.label.trim()" @click="addCheckpoint">＋ 留下检查点</button>
        </div>
      </div>
      <div v-if="activeCheckpoints.length" class="bmp-cp-list">
        <div v-for="cp in activeCheckpoints" :key="cp.id" class="bmp-cp">
          <span class="bmp-cp-icon">📍</span>
          <div class="bmp-cp-body">
            <strong class="bmp-cp-label">{{ cp.label }}</strong>
            <span class="bmp-cp-meta">{{ cp.description || '无描述' }} · {{ fmtDate(cp.createdAt) }}</span>
            <span v-if="cp.tags.length" class="bmp-cp-tags">{{ cp.tags.join(' · ') }}</span>
          </div>
          <button class="bmp-btn bmp-btn--sm bmp-del-btn" @click="removeCheckpoint(cp.id)">✕</button>
        </div>
      </div>
      <div v-else class="bmp-empty">当前分支还没有检查点。</div>
    </div>

    <!-- 世界快照 -->
    <div class="bmp-block">
      <span class="bmp-block-label">世界快照 · {{ snapshots.length }}</span>
      <div class="bmp-create">
        <input v-model="snapForm.label" class="bmp-input" placeholder="快照名称，如：2026 年 3 月" />
        <input v-model="snapForm.description" class="bmp-input" placeholder="快照描述（可选）" />
        <button class="bmp-btn bmp-btn--primary bmp-snap-btn" :disabled="!snapForm.label.trim()" @click="takeSnap">📸 拍摄快照</button>
      </div>
      <div v-if="snapshots.length" class="bmp-snap-list">
        <div v-for="s in snapshots" :key="s.timestamp" class="bmp-snap">
          <span class="bmp-snap-icon">📸</span>
          <div class="bmp-snap-body">
            <strong class="bmp-snap-label">{{ s.metadata.label }}</strong>
            <span class="bmp-snap-meta">{{ s.metadata.totalCheckpoints }} 检查点 · {{ fmtDate(s.timestamp) }}</span>
          </div>
          <button class="bmp-btn bmp-btn--sm bmp-restore-btn" @click="restoreSnap(s.timestamp)">恢复</button>
        </div>
      </div>
      <div v-else class="bmp-empty">还没有世界快照。拍摄快照可以随时回到这一刻。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useParallelWorld, BRANCH_COLORS } from '../modules/parallel-world'

const parallelWorld = useParallelWorld()
const branches = parallelWorld.branches
const checkpoints = parallelWorld.checkpoints
const snapshots = parallelWorld.snapshots

const branchForm = reactive({ name: '', description: '', parentId: '', color: BRANCH_COLORS[0].value })
const cpForm = reactive({ label: '', description: '', tags: '', snapshot: '' })
const snapForm = reactive({ label: '', description: '' })

const activeBranchName = computed(() => parallelWorld.activeBranch.value?.name ?? '主干')

const activeCheckpoints = computed(() =>
  checkpoints.value
    .filter(cp => cp.branchId === (parallelWorld.activeBranch.value?.id ?? 'pw_trunk'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
)

const stats = computed(() => ({
  branches: branches.value.length,
  checkpoints: checkpoints.value.length,
  snapshots: snapshots.value.length,
}))

onMounted(() => {
  parallelWorld.load()
})

async function addBranch() {
  const name = branchForm.name.trim()
  if (!name) return
  await parallelWorld.createBranch(name, branchForm.description.trim(), branchForm.color, branchForm.parentId || undefined)
  branchForm.name = ''
  branchForm.description = ''
}

async function switchTo(id: string) {
  await parallelWorld.switchBranch(id)
}

async function removeBranch(id: string) {
  await parallelWorld.deleteBranch(id)
}

async function addCheckpoint() {
  const label = cpForm.label.trim()
  if (!label) return
  let snapshot: Record<string, unknown> = {}
  if (cpForm.snapshot.trim()) {
    try {
      snapshot = JSON.parse(cpForm.snapshot.trim())
    } catch {
      snapshot = {}
    }
  }
  const tags = cpForm.tags.split(',').map(t => t.trim()).filter(Boolean)
  await parallelWorld.createCheckpoint(label, cpForm.description.trim(), snapshot, tags)
  cpForm.label = ''
  cpForm.description = ''
  cpForm.tags = ''
  cpForm.snapshot = ''
}

async function removeCheckpoint(id: string) {
  await parallelWorld.deleteCheckpoint(id)
}

async function takeSnap() {
  const label = snapForm.label.trim()
  if (!label) return
  await parallelWorld.takeSnapshot(label, snapForm.description.trim())
  snapForm.label = ''
  snapForm.description = ''
}

async function restoreSnap(timestamp: string) {
  await parallelWorld.restoreSnapshot(timestamp)
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.bmp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.bmp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.bmp-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.bmp-sub {
  font-size: 12px;
  opacity: 0.6;
}

.bmp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.bmp-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  min-width: 0;
}

.bmp-stat b {
  font-size: 18px;
  font-weight: 600;
}

.bmp-stat span {
  font-size: 11px;
  opacity: 0.6;
}

.bmp-stat--hot b {
  color: #e0a96d;
}

.bmp-stat-name {
  font-size: 13px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bmp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bmp-block-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.75;
  letter-spacing: 0.04em;
}

.bmp-create {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bmp-create-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bmp-input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.bmp-input:focus {
  border-color: rgba(224, 169, 109, 0.4);
}

.bmp-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  flex: 1;
  min-width: 110px;
}

.bmp-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.bmp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.bmp-btn--primary {
  background: rgba(224, 169, 109, 0.18);
  border-color: rgba(224, 169, 109, 0.35);
}

.bmp-btn--sm {
  padding: 4px 9px;
  font-size: 12px;
}

.bmp-branch-list,
.bmp-cp-list,
.bmp-snap-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bmp-branch,
.bmp-cp,
.bmp-snap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.bmp-branch.active {
  border-color: rgba(224, 169, 109, 0.4);
  background: rgba(224, 169, 109, 0.06);
}

.bmp-branch-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bmp-branch-body,
.bmp-cp-body,
.bmp-snap-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bmp-branch-name,
.bmp-cp-label,
.bmp-snap-label {
  font-size: 13px;
  font-weight: 600;
}

.bmp-branch-meta,
.bmp-cp-meta,
.bmp-snap-meta {
  font-size: 11px;
  opacity: 0.55;
}

.bmp-cp-tags {
  font-size: 11px;
  color: #e0a96d;
}

.bmp-branch-active {
  font-size: 11px;
  color: #e0a96d;
  flex-shrink: 0;
}

.bmp-empty {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 12px;
  opacity: 0.6;
}
</style>
