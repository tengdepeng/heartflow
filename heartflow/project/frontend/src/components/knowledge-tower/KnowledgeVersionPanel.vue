<template>
  <section class="kvp" aria-label="版本留档">
    <div class="kvp-head">
      <span class="kvp-title">📜 版本留档</span>
      <span class="kvp-sub">节点快照 · 变更追踪 · 回滚预览</span>
    </div>

    <!-- 统计总览 -->
    <div class="kvp-stats">
      <div class="kvp-stat"><b>{{ stats.totalVersions }}</b><span>总快照</span></div>
      <div class="kvp-stat"><b>{{ stats.nodesWithVersions }}</b><span>留档节点</span></div>
      <div class="kvp-stat"><b>{{ stats.averageVersionsPerNode }}</b><span>平均每节点</span></div>
    </div>

    <!-- 空态 -->
    <div v-if="nodes.length === 0" class="kvp-empty">
      <span>🌱</span>
      <p>还没有知识节点。先在经略阁添加节点，再回来为它们留下版本。</p>
    </div>

    <!-- 节点选择 -->
    <div v-else class="kvp-block">
      <span class="kvp-block-label">选择节点</span>
      <div class="kvp-groups">
        <div v-if="versionedNodes.length" class="kvp-group">
          <span class="kvp-group-label">已有留档</span>
          <div class="kvp-chips">
            <button
              v-for="n in versionedNodes"
              :key="n.id"
              :class="['kvp-chip', { active: currentNodeId === n.id }]"
              @click="selectNode(n.id)"
            >
              {{ n.title }}
              <span class="kvp-chip-count">{{ nodeVersionCount(n.id) }}</span>
            </button>
          </div>
        </div>
        <div class="kvp-group">
          <span class="kvp-group-label">全部节点</span>
          <div class="kvp-chips">
            <button
              v-for="n in plainNodes"
              :key="n.id"
              :class="['kvp-chip', { active: currentNodeId === n.id }]"
              @click="selectNode(n.id)"
            >
              {{ n.title }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 选中节点 -->
    <div v-if="currentNode" class="kvp-block">
      <div class="kvp-node-head">
        <span class="kvp-node-title">{{ currentNode.title }}</span>
        <button class="kvp-btn" @click="captureSnapshot">⧉ 捕获快照</button>
      </div>
      <p v-if="captureHint" class="kvp-hint">{{ captureHint }}</p>

      <div v-if="versionsOfNode.length === 0" class="kvp-sub-empty">
        这个节点还没有留档，点「捕获快照」留下第 1 个版本。
      </div>

      <div v-else class="kvp-versions">
        <article
          v-for="v in versionsOfNode"
          :key="v.id"
          :class="['kvp-version', { open: expandedId === v.id }]"
        >
          <div class="kvp-version-head" @click="toggleExpand(v.id)">
            <span class="kvp-version-num">v{{ v.version }}</span>
            <span class="kvp-version-type" :style="{ color: typeColor(v.changeType) }">{{ typeLabel(v.changeType) }}</span>
            <span class="kvp-version-desc">{{ v.changeDescription }}</span>
            <span class="kvp-version-date">{{ fmtDate(v.changedAt) }}</span>
            <span class="kvp-version-caret">{{ expandedId === v.id ? '▾' : '▸' }}</span>
          </div>

          <!-- 展开详情 -->
          <div v-if="expandedId === v.id" class="kvp-version-detail">
            <div class="kvp-snapshot">
              <div class="kvp-snapshot-title">{{ v.title }}</div>
              <p class="kvp-snapshot-desc">{{ v.desc || '（无描述）' }}</p>
              <div v-if="v.tags.length" class="kvp-snapshot-tags">
                <span v-for="t in v.tags" :key="t" class="kvp-snapshot-tag">{{ t }}</span>
              </div>
            </div>

            <!-- 与上一版本对比 -->
            <div v-if="diffSummary" class="kvp-diff">
              <span class="kvp-diff-label">与 v{{ diffSummary.fromVersion }} 对比</span>
              <div class="kvp-diff-fields">
                <span v-for="f in diffFields" :key="f.key" :class="['kvp-diff-field', { changed: f.changed }]">
                  {{ f.label }}{{ f.changed ? ' ✦' : '' }}
                </span>
              </div>
              <p class="kvp-diff-summary">{{ diffSummary.summary }}</p>
            </div>

            <!-- 回滚预览 -->
            <div class="kvp-rollback">
              <button class="kvp-btn kvp-btn--rollback" @click="previewRollback(v)">↩ 回滚到此版本</button>
              <p v-if="rollbackPreview && rollbackPreview.versionId === v.id" class="kvp-rollback-preview">
                将恢复标题「{{ rollbackPreview.title }}」、描述与 {{ rollbackPreview.tags.length }} 个标签（分类保持不变）
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getNodes } from '../../modules/knowledge'
import { useVersionManager } from '../../modules/knowledge'
import type { KnowledgeNode, KnowledgeVersion } from '../../modules/knowledge'

const api = useVersionManager()

const nodes = computed<KnowledgeNode[]>(() => getNodes())
const stats = computed(() => api.getVersionStats())

const versionedNodes = computed(() =>
  nodes.value.filter(n => api.getVersions(n.id).length > 0),
)
const plainNodes = computed(() =>
  nodes.value.filter(n => api.getVersions(n.id).length === 0),
)

const currentNodeId = ref('')
const currentNode = computed<KnowledgeNode | null>(
  () => nodes.value.find(n => n.id === currentNodeId.value) ?? null,
)
const versionsOfNode = computed(() =>
  currentNode.value ? api.getVersions(currentNode.value.id) : [],
)

function nodeVersionCount(nodeId: string): number {
  return api.getVersions(nodeId).length
}

function selectNode(id: string) {
  currentNodeId.value = id
  expandedId.value = ''
  diffSummary.value = null
  captureHint.value = ''
}

// 自动选中首篇已有留档的节点
onMounted(() => {
  api.loadVersions()
  if (!currentNodeId.value && versionedNodes.value.length > 0) {
    currentNodeId.value = versionedNodes.value[0].id
  }
})

// ---- 捕获快照 ----
const captureHint = ref('')
function captureSnapshot() {
  if (!currentNode.value) return
  const v = api.createVersion(currentNode.value, 'update', '手动留档')
  captureHint.value = `已捕获 v${v.version}`
}

// ---- 展开 / 对比 ----
const expandedId = ref('')
const diffSummary = ref<{ fromVersion: number; toVersion: number; summary: string } | null>(null)

const TYPE_LABEL: Record<KnowledgeVersion['changeType'], string> = {
  create: '创建',
  update: '更新',
  major_update: '重大更新',
  merge: '合并',
  split: '拆分',
}

const TYPE_COLOR: Record<KnowledgeVersion['changeType'], string> = {
  create: '#8a9a7a',
  update: '#f0c060',
  major_update: '#c46a5a',
  merge: '#6b9fc4',
  split: '#a07c8c',
}

function typeLabel(t: KnowledgeVersion['changeType']): string {
  return TYPE_LABEL[t] ?? t
}

function typeColor(t: KnowledgeVersion['changeType']): string {
  return TYPE_COLOR[t] ?? '#f0c060'
}

function toggleExpand(versionId: string) {
  if (expandedId.value === versionId) {
    expandedId.value = ''
    diffSummary.value = null
    return
  }
  expandedId.value = versionId
  rollbackPreview.value = null
  if (!currentNode.value) return
  const versions = api.getVersions(currentNode.value.id)
  const idx = versions.findIndex(v => v.id === versionId)
  if (idx < 0) return
  const prev = versions[idx + 1] // getVersions 按版本降序
  if (prev) {
    const d = api.compareVersions(prev.id, versionId)
    diffSummary.value = d
      ? { fromVersion: d.fromVersion, toVersion: d.toVersion, summary: d.summary }
      : null
  } else {
    diffSummary.value = null
  }
}

const diffFields = computed(() => {
  const d = diffSummary.value
  if (!d) return []
  // 通过重新对比获取字段级变更
  if (!currentNode.value) return []
  const versions = api.getVersions(currentNode.value.id)
  const cur = versions.find(v => v.version === d.toVersion)
  const prev = versions.find(v => v.version === d.fromVersion)
  if (!cur || !prev) return []
  const full = api.compareVersions(prev.id, cur.id)
  if (!full) return []
  return [
    { key: 'title', label: '标题', changed: full.titleChanged },
    { key: 'desc', label: '描述', changed: full.descChanged },
    { key: 'tags', label: '标签', changed: full.tagsChanged },
    { key: 'category', label: '分类', changed: full.categoryChanged },
  ]
})

// ---- 回滚预览 ----
const rollbackPreview = ref<{ versionId: string; title: string; desc: string; tags: string[] } | null>(null)

function previewRollback(v: KnowledgeVersion) {
  if (!currentNode.value) return
  const result = api.rollbackToVersion(v.id, currentNode.value)
  if (result) {
    rollbackPreview.value = {
      versionId: v.id,
      title: result.restoredNode.title ?? '',
      desc: result.restoredNode.desc ?? '',
      tags: result.restoredNode.tags ?? [],
    }
    // 回滚会生成一条「回滚到版本 X」的新版本，刷新当前列表
    expandedId.value = ''
    diffSummary.value = null
    captureHint.value = `已回滚到 v${v.version}，并生成一条回滚记录。`
  }
}

// ---- 格式化 ----
function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.kvp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.kvp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.kvp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high, #d8c3a5);
}

.kvp-sub {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}

.kvp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.kvp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.kvp-stat b {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-high, #d8c3a5);
}

.kvp-stat span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}

.kvp-block {
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.kvp-block-label {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 221, 208, 0.45);
  margin-bottom: 10px;
  display: block;
}

.kvp-empty,
.kvp-sub-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 0;
  text-align: center;
}

.kvp-empty span { font-size: 28px; }
.kvp-empty p,
.kvp-sub-empty {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.4);
  margin: 0;
  line-height: 1.6;
}

.kvp-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kvp-group { display: flex; flex-direction: column; gap: 6px; }

.kvp-group-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(232, 221, 208, 0.35);
}

.kvp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kvp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(232, 221, 208, 0.55);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kvp-chip:hover {
  color: var(--text-high, #d8c3a5);
  border-color: rgba(255, 255, 255, 0.25);
}

.kvp-chip.active {
  background: rgba(240, 192, 96, 0.12);
  border-color: rgba(240, 192, 96, 0.35);
  color: #f0c060;
}

.kvp-chip-count {
  font-size: 9px;
  padding: 0 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(232, 221, 208, 0.6);
}

.kvp-node-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.kvp-node-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-high, #d8c3a5);
}

.kvp-btn {
  padding: 6px 14px;
  border: 1px solid rgba(240, 192, 96, 0.3);
  border-radius: 8px;
  background: rgba(240, 192, 96, 0.08);
  color: #f0c060;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.kvp-btn:hover { background: rgba(240, 192, 96, 0.16); }

.kvp-btn--rollback { border-color: rgba(196, 106, 90, 0.35); color: #c46a5a; background: rgba(196, 106, 90, 0.06); }
.kvp-btn--rollback:hover { background: rgba(196, 106, 90, 0.14); }

.kvp-hint {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.45);
  margin: 0 0 8px;
}

.kvp-versions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.kvp-version {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
}

.kvp-version.open { border-color: rgba(240, 192, 96, 0.25); }

.kvp-version-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
}

.kvp-version-num {
  font-size: 11px;
  font-weight: 600;
  color: #f0c060;
  flex: 0 0 auto;
}

.kvp-version-type {
  font-size: 10px;
  flex: 0 0 auto;
}

.kvp-version-desc {
  flex: 1;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kvp-version-date {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.35);
  flex: 0 0 auto;
}

.kvp-version-caret {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
  flex: 0 0 auto;
}

.kvp-version-detail {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kvp-snapshot {
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(240, 192, 96, 0.2);
}

.kvp-snapshot-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(232, 221, 208, 0.75);
  margin-bottom: 4px;
}

.kvp-snapshot-desc {
  font-size: 11px;
  line-height: 1.6;
  color: rgba(232, 221, 208, 0.5);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0 0 6px;
}

.kvp-snapshot-tags { display: flex; gap: 4px; flex-wrap: wrap; }

.kvp-snapshot-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(232, 221, 208, 0.55);
}

.kvp-diff { display: flex; flex-direction: column; gap: 6px; }

.kvp-diff-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(232, 221, 208, 0.4);
}

.kvp-diff-fields {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.kvp-diff-field {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(232, 221, 208, 0.4);
}

.kvp-diff-field.changed {
  background: rgba(240, 192, 96, 0.12);
  color: #f0c060;
}

.kvp-diff-summary {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.55);
  margin: 0;
}

.kvp-rollback { display: flex; flex-direction: column; gap: 6px; }

.kvp-rollback-preview {
  font-size: 11px;
  color: rgba(196, 106, 90, 0.8);
  margin: 0;
  line-height: 1.5;
}
</style>