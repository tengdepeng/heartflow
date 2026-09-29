<template>
  <section class="ppl-panel" data-testid="ppl-panel" data-enter>
    <header class="panel-header">
      <span class="panel-icon">&#x1F680;</span>
      <div>
        <h4 class="panel-title">发布流水线</h4>
        <p class="panel-desc">草稿 → 审核 → 发布 → 归档 · 版本管理 · 发布统计</p>
      </div>
    </header>

    <div class="panel-body">
      <!-- 标题统计行 -->
      <div class="ppl-stats" data-testid="ppl-stats">
        <div class="ppl-stat">
          <b data-testid="ppl-total">{{ stats.totalPublished }}</b>
          <span>已发布</span>
        </div>
        <div class="ppl-stat">
          <b data-testid="ppl-pipeline-count">{{ pipelineList.length }}</b>
          <span>流水线</span>
        </div>
        <div class="ppl-stat">
          <b data-testid="ppl-approval">{{ approvalRate }}</b>
          <span>通过率</span>
        </div>
        <div class="ppl-stat">
          <b>{{ avgReview }}</b>
          <span>均审时长</span>
        </div>
      </div>

      <!-- 阶段分布条 -->
      <div v-if="stageEntries.length" class="ppl-stage-bar" data-testid="ppl-stage-bar">
        <span
          v-for="entry in stageEntries"
          :key="entry.stage"
          class="ppl-stage-chip"
          :style="{ '--stage-color': entry.color }"
          :title="entry.description"
        >
          <i></i>{{ entry.label }} {{ entry.count }}
        </span>
      </div>
      <p v-else class="ppl-empty-hint" data-testid="ppl-no-stage">暂无流水线 · 发布引擎等待第一条产出</p>

      <!-- 流水线列表 -->
      <div class="ppl-block-title">
        <span>流水线记录</span>
        <span class="ppl-block-sub">点击记录查看版本档案</span>
      </div>
      <div v-if="pipelineList.length" class="ppl-list" data-testid="ppl-list">
        <div
          v-for="p in pipelineList"
          :key="p.recordId"
          class="ppl-item"
          :class="{ active: selectedId === p.recordId }"
          :data-testid="'ppl-item-' + p.recordId"
          @click="selectRecord(p.recordId)"
        >
          <div class="ppl-item-top">
            <span class="ppl-type-chip" :class="'ppl-type-' + recordOf(p.recordId)?.type">{{ typeLabel(recordOf(p.recordId)?.type) }}</span>
            <span
              class="ppl-stage-badge"
              :style="{ background: stageMeta(p.stage).color }"
              :data-testid="'ppl-stage-' + p.recordId"
            >{{ stageMeta(p.stage).icon }} {{ stageMeta(p.stage).label }}</span>
            <span v-if="p.publishChannels.length" class="ppl-channels">
              <span v-for="ch in p.publishChannels" :key="ch" class="ppl-channel-chip">{{ channelLabel(ch) }}</span>
            </span>
            <button class="ppl-toggle" :aria-label="expandedId === p.recordId ? '收起阶段历史' : '展开阶段历史'" @click.stop="toggleHistory(p.recordId)">
              {{ expandedId === p.recordId ? '▾' : '▸' }}
            </button>
          </div>
          <p class="ppl-content">{{ truncate(recordOf(p.recordId)?.content || '（无内容）', 80) }}</p>
          <div class="ppl-actions" data-testid="ppl-actions">
            <button
              v-if="canGo(p.recordId, 'review')"
              class="panel-btn small"
              data-testid="ppl-act-review"
              @click.stop="act(p.recordId, 'review')"
            >&#x1F50D; 提交审核</button>
            <button
              v-if="canGo(p.recordId, 'approved')"
              class="panel-btn small"
              data-testid="ppl-act-approve"
              @click.stop="act(p.recordId, 'approved')"
            >&#x2705; 通过</button>
            <button
              v-if="canGo(p.recordId, 'rejected')"
              class="panel-btn small danger"
              data-testid="ppl-act-reject"
              @click.stop="act(p.recordId, 'rejected')"
            >&#x274C; 驳回</button>
            <button
              v-if="canGo(p.recordId, 'published')"
              class="panel-btn small"
              data-testid="ppl-act-publish"
              @click.stop="act(p.recordId, 'published')"
            >&#x1F680; 发布</button>
            <button
              v-if="canGo(p.recordId, 'archived')"
              class="panel-btn small"
              data-testid="ppl-act-archive"
              @click.stop="act(p.recordId, 'archived')"
            >&#x1F4E6; 归档</button>
            <button
              v-if="canGo(p.recordId, 'withdrawn')"
              class="panel-btn small"
              data-testid="ppl-act-withdraw"
              @click.stop="act(p.recordId, 'withdrawn')"
            >&#x21A9;&#xFE0F; 撤回</button>
            <button
              v-if="canGo(p.recordId, 'draft')"
              class="panel-btn small ghost"
              data-testid="ppl-act-draft"
              @click.stop="act(p.recordId, 'draft')"
            >&#x1F4DD; 退回草稿</button>
          </div>
          <div v-if="expandedId === p.recordId" class="ppl-history" data-testid="ppl-history">
            <div v-for="h in [...p.stageHistory].reverse()" :key="h.enteredAt + h.stage" class="ppl-history-row">
              <span class="ppl-history-stage" :style="{ color: stageMeta(h.stage).color }">{{ stageMeta(h.stage).label }}</span>
              <span class="ppl-history-time">{{ formatTime(h.enteredAt) }}</span>
              <span v-if="h.duration" class="ppl-history-duration">停留 {{ formatDuration(h.duration) }}</span>
              <span v-if="h.comment" class="ppl-history-comment">{{ h.comment }}</span>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="ppl-empty-hint" data-testid="ppl-no-list">暂无流水线记录</p>

      <!-- 版本管理 -->
      <template v-if="selectedRecord">
        <div class="ppl-block-title">
          <span>版本档案</span>
          <span class="ppl-block-sub">{{ truncate(selectedRecord.content, 24) }}</span>
        </div>
        <div class="ppl-actions">
          <button
            class="panel-btn small"
            data-testid="ppl-create-version"
            @click="createSnapshot"
          >&#x1F4BE; 创建快照</button>
        </div>
        <div v-if="versionsOfSelected.length" class="ppl-versions" data-testid="ppl-versions">
          <div
            v-for="v in versionsOfSelected"
            :key="v.id"
            class="ppl-version"
            :class="{ cmp: compareA === v.id || compareB === v.id }"
            :data-testid="'ppl-version-' + v.version"
          >
            <div class="ppl-version-top">
              <b>v{{ v.version }}</b>
              <span class="ppl-version-note">{{ v.changeNote || '快照' }}</span>
              <span v-if="v.changeSummary" class="ppl-version-pct">变更 {{ v.changeSummary.changePercent }}%</span>
              <span class="ppl-version-time">{{ formatTime(v.createdAt) }}</span>
            </div>
            <div class="ppl-version-actions">
              <button class="panel-btn small ghost" :data-testid="'ppl-cmp-' + v.version" @click="setCompare(v.id)">对比</button>
              <button class="panel-btn small ghost" :data-testid="'ppl-rollback-' + v.version" @click="rollbackTo(v.id)">回滚</button>
            </div>
          </div>
        </div>
        <p v-else class="ppl-empty-hint">尚无版本快照</p>

        <!-- 版本差异 -->
        <div v-if="diffResult" class="ppl-diff" data-testid="ppl-diff">
          <div class="ppl-diff-head">
            <span>差异对比</span>
            <span class="ppl-diff-meta">v{{ diffResult.oldVersion.version }} → v{{ diffResult.newVersion.version }} · 相似度 {{ Math.round(diffResult.similarity * 100) }}%</span>
          </div>
          <div v-for="(block, bi) in diffResult.diffBlocks" :key="bi" class="ppl-diff-block" :class="'ppl-diff-' + block.type">
            <span class="ppl-diff-tag">{{ block.type === 'added' ? '新增' : block.type === 'removed' ? '删除' : '修改' }}</span>
            <pre class="ppl-diff-text">{{ (block.type === 'removed' ? block.oldContent : block.newContent).join('\n') }}</pre>
          </div>
          <button class="panel-btn small ghost" data-testid="ppl-diff-clear" @click="clearCompare">清除对比</button>
        </div>
      </template>

      <!-- 发布统计 -->
      <div class="ppl-block-title">
        <span>发布统计</span>
      </div>
      <div class="ppl-stat-grid" data-testid="ppl-stat-grid">
        <div class="ppl-stat-card">
          <span class="ppl-stat-label">按类型</span>
          <div class="ppl-stat-rows">
            <div v-for="(count, t) in stats.byType" :key="t" class="ppl-stat-row">
              <span>{{ typeLabel(t) }}</span>
              <b>{{ count }}</b>
            </div>
            <p v-if="!Object.keys(stats.byType).length" class="ppl-empty-hint">无记录</p>
          </div>
        </div>
        <div class="ppl-stat-card">
          <span class="ppl-stat-label">按渠道</span>
          <div class="ppl-stat-rows">
            <div v-for="(count, ch) in stats.byChannel" :key="ch" class="ppl-stat-row">
              <span>{{ channelLabel(ch) }}</span>
              <b>{{ count }}</b>
            </div>
            <p v-if="!Object.keys(stats.byChannel).length" class="ppl-empty-hint">无记录</p>
          </div>
        </div>
        <div class="ppl-stat-card">
          <span class="ppl-stat-label">热门标签</span>
          <div class="ppl-stat-rows">
            <div v-for="tag in stats.topTags" :key="tag.tag" class="ppl-stat-row">
              <span>{{ tag.tag }}</span>
              <b>{{ tag.count }}</b>
            </div>
            <p v-if="!stats.topTags.length" class="ppl-empty-hint">无标签</p>
          </div>
        </div>
        <div class="ppl-stat-card">
          <span class="ppl-stat-label">协作</span>
          <div class="ppl-stat-rows">
            <div class="ppl-stat-row"><span>评论</span><b>{{ stats.commentStats.totalComments }}</b></div>
            <div class="ppl-stat-row"><span>线程</span><b>{{ stats.commentStats.totalThreads }}</b></div>
            <div class="ppl-stat-row"><span>版本快照</span><b>{{ stats.versionStats.totalSnapshots }}</b></div>
            <div class="ppl-stat-row"><span>均版本/记录</span><b>{{ stats.versionStats.averageVersionsPerRecord }}</b></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import {
  useOutputManager,
  usePublishPipeline,
  PIPELINE_STAGE_META,
  PUBLISH_CHANNEL_META,
  type PipelineStage,
  type OutputRecord,
} from '../modules/output'

useViewEntrance()

// ---- 引擎接线（与 output-bridge 同构：manager 提供 get/update 注入 pipeline） ----
const manager = useOutputManager()
const pipeline = usePublishPipeline(
  (id: string) => manager.get(id),
  (id: string, updates: Record<string, unknown>) => manager.update(id, updates),
)

const allRecords = ref<OutputRecord[]>([])

function refresh() {
  allRecords.value = manager.getAll()
  // 引擎流水线为惰性初始化（getOrInitPipeline）：getStage 走初始化路径，为全部记录预热，保证列表/统计完整
  allRecords.value.forEach((r) => pipeline.getStage(r.id))
}

onMounted(refresh)

const records = computed(() => allRecords.value)

function recordOf(id: string) {
  return records.value.find((r) => r.id === id) || null
}

// ---- 统计 ----
const stats = computed(() => pipeline.computePublishStats(records.value))
const pipelineList = computed(() => Object.values(pipeline.pipelines.value))
const approvalRate = computed(() => `${stats.value.approvalRate}%`)
const avgReview = computed(() => {
  const ms = stats.value.averageReviewDuration
  return ms > 0 ? formatDuration(ms) : '—'
})
const stageEntries = computed(() => {
  return Object.entries(stats.value.byStage)
    .map(([stage, count]) => ({
      stage,
      count,
      label: stageMeta(stage as PipelineStage).label,
      description: stageMeta(stage as PipelineStage).description,
      color: stageMeta(stage as PipelineStage).color,
    }))
    .sort((a, b) => b.count - a.count)
})

// ---- 选中与历史 ----
const selectedId = ref<string | null>(null)
const expandedId = ref<string | null>(null)
const selectedRecord = computed(() => (selectedId.value ? recordOf(selectedId.value) : null))

function selectRecord(id: string) {
  selectedId.value = selectedId.value === id ? null : id
  compareA.value = null
  compareB.value = null
}

function toggleHistory(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ---- 阶段操作 ----
function stageMeta(stage: PipelineStage) {
  return PIPELINE_STAGE_META[stage]
}

function canGo(recordId: string, target: PipelineStage) {
  return pipeline.canTransition(recordId, target)
}

function act(recordId: string, target: PipelineStage) {
  pipeline.transition(recordId, target)
  refresh()
}

// ---- 版本管理 ----
const versionsOfSelected = computed(() => (selectedId.value ? pipeline.getVersions(selectedId.value) : []))
const compareA = ref<string | null>(null)
const compareB = ref<string | null>(null)
const diffResult = computed(() => {
  if (!compareA.value || !compareB.value) return null
  return pipeline.diffVersions(compareA.value, compareB.value)
})

function createSnapshot() {
  if (!selectedId.value) return
  pipeline.createVersion(selectedId.value, '手动快照')
  refresh()
}

function rollbackTo(versionId: string) {
  if (!selectedId.value) return
  pipeline.rollback(selectedId.value, versionId)
  refresh()
}

function setCompare(versionId: string) {
  // A/B 槽位填充：首个点击进 A，次个（不同版本）进 B，重复点击清除
  if (compareA.value === null) {
    compareA.value = versionId
  } else if (compareB.value === null) {
    if (versionId !== compareA.value) compareB.value = versionId
    else {
      compareA.value = null
      compareB.value = null
    }
  } else {
    compareA.value = null
    compareB.value = null
  }
}

function clearCompare() {
  compareA.value = null
  compareB.value = null
}

// ---- 展示工具 ----
function typeLabel(t?: string) {
  const labels: Record<string, string> = { note: '笔记', emotion: '情绪', anchor: '心锚', crystal: '结晶', session: '会话' }
  return t ? (labels[t] ?? t) : '未知'
}

function channelLabel(ch: string) {
  return PUBLISH_CHANNEL_META[ch as keyof typeof PUBLISH_CHANNEL_META]?.label ?? ch
}

function truncate(text: string, len: number) {
  return text.length > len ? text.slice(0, len) + '…' : text
}

function formatTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDuration(ms: number) {
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`
  const hour = Math.round(min / 60)
  if (hour < 24) return `${hour}h`
  return `${Math.round(hour / 24)}d`
}
</script>

<style scoped>
.ppl-panel {
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  padding: 16px;
  margin-bottom: 18px;
}

.ppl-panel .panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.ppl-panel .panel-icon {
  font-size: 20px;
}

.ppl-panel .panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
}

.ppl-panel .panel-desc {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin: 2px 0 0;
}

.ppl-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.ppl-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.ppl-stat b {
  font-size: 20px;
  color: var(--text-primary, #e8e0d8);
}

.ppl-stat span {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-stage-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.ppl-stage-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-stage-chip i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--stage-color);
}

.ppl-block-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}

.ppl-block-sub {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ppl-item {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.ppl-item:hover {
  border-color: rgba(255, 255, 255, 0.16);
}

.ppl-item.active {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.03);
}

.ppl-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ppl-type-chip {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-stage-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  color: #1a1a1a;
}

.ppl-channels {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}

.ppl-channel-chip {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-toggle {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  cursor: pointer;
  font-size: 12px;
}

.ppl-content {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin: 6px 0 0;
  line-height: 1.5;
}

.ppl-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.panel-btn.small {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary, #e8e0d8);
  cursor: pointer;
}

.panel-btn.small:hover {
  background: rgba(255, 255, 255, 0.12);
}

.panel-btn.small.danger {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.4);
}

.panel-btn.small.ghost {
  background: none;
}

.ppl-history {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.09);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ppl-history-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.ppl-history-stage {
  font-weight: 600;
  min-width: 52px;
}

.ppl-history-time,
.ppl-history-duration {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-history-comment {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-style: italic;
}

.ppl-versions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.ppl-version {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 8px 10px;
}

.ppl-version.cmp {
  border-color: rgba(240, 192, 64, 0.5);
}

.ppl-version-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
}

.ppl-version-top b {
  color: var(--text-primary, #e8e0d8);
}

.ppl-version-note {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-version-pct {
  font-size: 11px;
  color: #f0c040;
}

.ppl-version-time {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-version-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.ppl-diff {
  margin-top: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
}

.ppl-diff-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
}

.ppl-diff-meta {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-diff-block {
  display: flex;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 11px;
}

.ppl-diff-added {
  background: rgba(138, 154, 122, 0.15);
}

.ppl-diff-removed {
  background: rgba(196, 106, 90, 0.15);
}

.ppl-diff-modified {
  background: rgba(240, 192, 64, 0.12);
}

.ppl-diff-tag {
  flex-shrink: 0;
  font-weight: 600;
}

.ppl-diff-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.ppl-stat-card {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 10px;
}

.ppl-stat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}

.ppl-stat-rows {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ppl-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ppl-stat-row b {
  color: var(--text-primary, #e8e0d8);
}

.ppl-empty-hint {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin: 4px 0;
}
</style>
