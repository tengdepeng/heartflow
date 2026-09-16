<template>
  <section class="cep-panel">
    <div class="cep-header">
      <h4 class="cep-title">⚖ 立法厅 · 用户条款</h4>
      <span class="cep-subtitle">宪法体系补全 · 条款增删改 · 修订工作流 · 冲突检测</span>
    </div>

    <!-- 统计概览 -->
    <div class="cep-stats">
      <div class="cep-stat">
        <span class="cep-stat-num">{{ stats.total }}</span>
        <span class="cep-stat-label">条款总数</span>
      </div>
      <div class="cep-stat">
        <span class="cep-stat-num">{{ stats.byType.user }}</span>
        <span class="cep-stat-label">用户条款</span>
      </div>
      <div class="cep-stat">
        <span class="cep-stat-num">{{ stats.totalAmendments }}</span>
        <span class="cep-stat-label">修订案</span>
      </div>
      <div class="cep-stat">
        <span class="cep-stat-num">{{ stats.unresolvedConflicts }}</span>
        <span class="cep-stat-label">未决冲突</span>
      </div>
      <div class="cep-stat">
        <span class="cep-stat-num cep-health" :class="`h-${report.health}`">{{ healthLabel }}</span>
        <span class="cep-stat-label">宪法健康</span>
      </div>
    </div>

    <!-- 选项卡 -->
    <div class="cep-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['cep-tab', { active: activeTab === t.key }]"
        @click="activeTab = t.key"
      >{{ t.label }}</button>
    </div>

    <!-- ===== 条款 ===== -->
    <div v-if="activeTab === 'clauses'" class="cep-section">
      <form class="cep-add-form" @submit.prevent="handleAddClause">
        <div class="cep-form-row">
          <input v-model="form.number" class="cep-input cep-input-sm" placeholder="编号(如 6.1)" />
          <input v-model="form.title" class="cep-input" placeholder="条款标题" required />
        </div>
        <textarea v-model="form.content" class="cep-textarea" rows="2" placeholder="条款正文…" required></textarea>
        <div class="cep-form-row">
          <select v-model="form.severity" class="cep-input cep-input-sm">
            <option value="constitutional">宪法级</option>
            <option value="statutory">法律级</option>
            <option value="regulatory">规章级</option>
            <option value="guideline">指引级</option>
          </select>
          <input v-model="form.chapter" class="cep-input cep-input-sm" placeholder="章节(如 用户条款)" />
          <input v-model="form.tagsText" class="cep-input cep-input-sm" placeholder="标签(逗号分隔)" />
          <button class="cep-btn cep-btn-primary" type="submit">新增条款</button>
        </div>
      </form>

      <div v-if="clauses.length === 0" class="cep-empty">暂无条款</div>
      <div v-for="chapter in chapters" :key="chapter" class="cep-chapter">
        <div class="cep-chapter-head">
          <span class="cep-chapter-name">{{ chapter }}</span>
          <span class="cep-chapter-count">{{ clausesByChapter(chapter).length }} 条</span>
        </div>
        <div
          v-for="clause in clausesByChapter(chapter)"
          :key="clause.id"
          class="cep-clause"
          :class="{ 'is-system': isSystem(clause), 'is-repealed': clause.status === 'repealed' }"
        >
          <div class="cep-clause-head">
            <span class="cep-clause-number">第{{ clause.number }}条</span>
            <span class="cep-clause-status" :class="`st-${clause.status}`">{{ statusLabel(clause.status) }}</span>
            <span class="cep-clause-severity" :class="`sv-${clause.severity}`">{{ severityLabel(clause.severity) }}</span>
            <span v-if="isSystem(clause)" class="cep-clause-system">系统</span>
            <div class="cep-clause-actions">
              <button v-if="!isSystem(clause)" class="cep-btn cep-btn-sm" @click="startEdit(clause)">编辑</button>
              <button
                v-if="!isSystem(clause) && clause.status !== 'repealed'"
                class="cep-btn cep-btn-sm cep-btn-warn"
                @click="handleRepeal(clause.id)"
              >废止</button>
              <button v-if="!isSystem(clause)" class="cep-btn cep-btn-sm cep-btn-danger" @click="handleRemove(clause.id)">删除</button>
            </div>
          </div>
          <div class="cep-clause-title">{{ clause.title }}</div>
          <p class="cep-clause-content">{{ clause.content }}</p>
          <div v-if="editingId === clause.id" class="cep-edit-form">
            <input v-model="editForm.title" class="cep-input" placeholder="标题" />
            <textarea v-model="editForm.content" class="cep-textarea" rows="2"></textarea>
            <div class="cep-form-row">
              <button class="cep-btn cep-btn-primary" @click="saveEdit(clause.id)">保存</button>
              <button class="cep-btn" @click="editingId = null">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 修订 ===== -->
    <div v-if="activeTab === 'amendments'" class="cep-section">
      <form class="cep-add-form" @submit.prevent="handleCreateAmendment">
        <div class="cep-form-row">
          <input v-model="amForm.title" class="cep-input" placeholder="修订案标题" required />
        </div>
        <textarea v-model="amForm.description" class="cep-textarea" rows="2" placeholder="修订描述…"></textarea>
        <div class="cep-form-row">
          <select v-model="amForm.clauseNumber" class="cep-input cep-input-sm">
            <option v-for="c in clauses" :key="c.id" :value="c.number">第{{ c.number }}条 · {{ c.title }}</option>
          </select>
          <select v-model="amForm.changeType" class="cep-input cep-input-sm">
            <option value="modify">修改</option>
            <option value="repeal">废止</option>
            <option value="add">新增</option>
          </select>
          <button class="cep-btn cep-btn-primary" type="submit">发起修订</button>
        </div>
        <textarea
          v-if="amForm.changeType !== 'repeal'"
          v-model="amForm.newContent"
          class="cep-textarea"
          rows="2"
          placeholder="新条款内容…"
        ></textarea>
      </form>

      <div v-if="amendments.length === 0" class="cep-empty">暂无修订案</div>
      <div v-for="am in amendments" :key="am.id" class="cep-amendment">
        <div class="cep-amendment-head">
          <span class="cep-amendment-title">{{ am.title }}</span>
          <span class="cep-amendment-status" :class="`st-${am.status}`">{{ amendmentStatusLabel(am.status) }}</span>
        </div>
        <p class="cep-amendment-desc">{{ am.description }}</p>
        <div class="cep-amendment-meta">
          <span>涉及：{{ am.targetClauseNumbers.join('、') }}</span>
          <span>提议者：{{ am.proposer }}</span>
        </div>
        <div class="cep-amendment-actions">
          <button v-if="am.status === 'draft'" class="cep-btn cep-btn-sm" @click="handleSubmitAmendment(am.id)">提交</button>
          <button
            v-if="am.status === 'proposed' || am.status === 'under_review'"
            class="cep-btn cep-btn-sm cep-btn-primary"
            @click="handleReview(am.id, 'approve')"
          >通过</button>
          <button
            v-if="am.status === 'proposed' || am.status === 'under_review'"
            class="cep-btn cep-btn-sm cep-btn-danger"
            @click="handleReview(am.id, 'reject')"
          >驳回</button>
          <button v-if="am.status === 'approved'" class="cep-btn cep-btn-sm cep-btn-primary" @click="handleEnact(am.id)">生效</button>
        </div>
      </div>
    </div>

    <!-- ===== 冲突 ===== -->
    <div v-if="activeTab === 'conflicts'" class="cep-section">
      <div v-if="unresolvedConflicts.length === 0" class="cep-empty cep-empty-ok">✓ 暂无未决冲突</div>
      <div v-for="conflict in unresolvedConflicts" :key="conflict.id" class="cep-conflict">
        <div class="cep-conflict-head">
          <span class="cep-conflict-type" :class="`ct-${conflict.type}`">{{ conflictTypeLabel(conflict.type) }}</span>
          <span class="cep-conflict-severity" :class="`cs-${conflict.severity}`">{{ conflictSeverityLabel(conflict.severity) }}</span>
          <button class="cep-btn cep-btn-sm cep-btn-primary" @click="handleResolve(conflict.id)">标记已解决</button>
        </div>
        <p class="cep-conflict-desc">{{ conflict.description }}</p>
        <p class="cep-conflict-suggestion">建议：{{ conflict.suggestion }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClauseEditor } from '../modules/constitution/clause-editor'
import type { Clause, ClauseSeverity } from '../modules/constitution/clause-editor'

const {
  clauses,
  amendments,
  conflicts,
  addClause,
  updateClause,
  repealClause,
  removeClause,
  createAmendment,
  submitAmendment,
  reviewAmendment,
  approveAmendment,
  rejectAmendment,
  enactAmendment,
  resolveConflict,
  getClauseStats,
  generateClauseReport,
} = useClauseEditor()

const activeTab = ref<'clauses' | 'amendments' | 'conflicts'>('clauses')
const tabs: { key: 'clauses' | 'amendments' | 'conflicts'; label: string }[] = [
  { key: 'clauses', label: '条款' },
  { key: 'amendments', label: '修订' },
  { key: 'conflicts', label: '冲突' },
]

const stats = computed(() => getClauseStats())
const report = computed(() => generateClauseReport())
const healthLabel = computed(
  () => ({ healthy: '健康', caution: '谨慎', warning: '警示', critical: '危急' })[report.value.health],
)
const unresolvedConflicts = computed(() => conflicts.value.filter((c) => !c.resolved))

// ---- 条款表单 ----
const form = ref({
  number: '',
  title: '',
  content: '',
  severity: 'statutory' as ClauseSeverity,
  chapter: '用户条款',
  tagsText: '',
})

function handleAddClause() {
  if (!form.value.title.trim() || !form.value.content.trim()) return
  addClause(
    form.value.number.trim() || `U${clauses.value.length + 1}`,
    form.value.title.trim(),
    form.value.content.trim(),
    'user',
    form.value.severity,
    form.value.chapter.trim() || '用户条款',
    form.value.tagsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
  )
  form.value = { number: '', title: '', content: '', severity: 'statutory', chapter: '用户条款', tagsText: '' }
}

// ---- 章节分组 ----
const chapters = computed(() => [...new Set(clauses.value.map((c) => c.chapter))])
function clausesByChapter(chapter: string): Clause[] {
  return clauses.value.filter((c) => c.chapter === chapter).sort((a, b) => a.order - b.order)
}

function isSystem(c: Clause): boolean {
  return c.type === 'core' && c.severity === 'constitutional'
}

// ---- 编辑 ----
const editingId = ref<string | null>(null)
const editForm = ref({ title: '', content: '' })

function startEdit(c: Clause) {
  editingId.value = c.id
  editForm.value = { title: c.title, content: c.content }
}

function saveEdit(id: string) {
  updateClause(id, { title: editForm.value.title.trim(), content: editForm.value.content.trim() })
  editingId.value = null
}

function handleRepeal(id: string) {
  repealClause(id)
}

function handleRemove(id: string) {
  removeClause(id)
}

// ---- 修订 ----
const amForm = ref({
  title: '',
  description: '',
  clauseNumber: '',
  changeType: 'modify' as 'modify' | 'repeal' | 'add',
  newContent: '',
})

function handleCreateAmendment() {
  if (!amForm.value.title.trim()) return
  createAmendment(
    amForm.value.title.trim(),
    amForm.value.description.trim(),
    'user',
    [
      {
        clauseNumber: amForm.value.clauseNumber,
        changeType: amForm.value.changeType,
        newContent: amForm.value.newContent.trim(),
        rationale: amForm.value.description.trim() || '用户发起修订',
      },
    ],
  )
  amForm.value = { title: '', description: '', clauseNumber: '', changeType: 'modify', newContent: '' }
}

function handleSubmitAmendment(id: string) {
  submitAmendment(id)
}

function handleReview(id: string, opinion: 'approve' | 'reject') {
  reviewAmendment(id, 'user', opinion, opinion === 'approve' ? '同意' : '驳回')
  if (opinion === 'approve') approveAmendment(id)
  else rejectAmendment(id)
}

function handleEnact(id: string) {
  enactAmendment(id)
}

// ---- 冲突 ----
function handleResolve(id: string) {
  resolveConflict(id)
}

// ---- 标签映射 ----
const statusLabels: Record<string, string> = {
  draft: '草稿', proposed: '已提议', review: '评审中', approved: '已批准',
  enacted: '已生效', repealed: '已废止', amended: '已修订',
}
function statusLabel(s: string): string {
  return statusLabels[s] ?? s
}

const severityLabels: Record<string, string> = {
  constitutional: '宪法级', statutory: '法律级', regulatory: '规章级', guideline: '指引级',
}
function severityLabel(s: string): string {
  return severityLabels[s] ?? s
}

const amendmentStatusLabels: Record<string, string> = {
  draft: '草稿', proposed: '已提议', under_review: '评审中', approved: '已批准',
  rejected: '已驳回', enacted: '已生效',
}
function amendmentStatusLabel(s: string): string {
  return amendmentStatusLabels[s] ?? s
}

const conflictTypeLabels: Record<string, string> = {
  contradiction: '矛盾', overlap: '重叠', tension: '张力', precedence: '优先级',
}
function conflictTypeLabel(s: string): string {
  return conflictTypeLabels[s] ?? s
}

const conflictSeverityLabels: Record<string, string> = {
  critical: '严重', major: '重要', minor: '轻微',
}
function conflictSeverityLabel(s: string): string {
  return conflictSeverityLabels[s] ?? s
}
</script>

<style scoped>
.cep-panel {
  margin-top: 40px;
  padding: 20px 22px;
  border-radius: 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.35);
}

.cep-header {
  margin-bottom: 16px;
}

.cep-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
  font-family: var(--font-heading-zh);
  letter-spacing: 1px;
}

.cep-subtitle {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

/* ---- 统计 ---- */
.cep-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.cep-stat {
  flex: 1;
  min-width: 90px;
  padding: 12px 10px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  text-align: center;
}

.cep-stat-num {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.cep-stat-label {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.cep-health.h-healthy { color: #8a9a7a; }
.cep-health.h-caution { color: #d4b464; }
.cep-health.h-warning { color: #c87864; }
.cep-health.h-critical { color: #c46a5a; }

/* ---- 选项卡 ---- */
.cep-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.1);
}

.cep-tab {
  padding: 8px 18px;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.5);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.cep-tab:hover {
  color: var(--accent);
}

.cep-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

/* ---- 表单 ---- */
.cep-add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.cep-form-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.cep-input,
.cep-textarea {
  font-family: inherit;
  font-size: 13px;
  padding: 8px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.cep-input:focus,
.cep-textarea:focus {
  border-color: var(--accent);
}

.cep-input { flex: 1; min-width: 120px;
}
.cep-input-sm { flex: 0 1 auto; min-width: 90px;
}
.cep-textarea { width: 100%; resize: vertical; }

/* ---- 按钮 ---- */
.cep-btn {
  font-family: inherit;
  font-size: 12px;
  padding: 7px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.7);
  cursor: pointer;
  transition: all 0.2s;
}

.cep-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.35);
  color: var(--accent);
}

.cep-btn-primary {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.25);
}

.cep-btn-primary:hover {
  background: rgba(var(--accent-rgb), 0.2);
}

.cep-btn-warn {
  color: #d4b464;
  border-color: rgba(212, 180, 100, 0.25);
}

.cep-btn-warn:hover {
  background: rgba(212, 180, 100, 0.12);
  color: #d4b464;
}

.cep-btn-danger {
  color: #c87864;
  border-color: rgba(200, 120, 100, 0.25);
}

.cep-btn-danger:hover {
  background: rgba(200, 120, 100, 0.12);
  color: #c87864;
}

.cep-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  font-size: 11px;

  min-height: 26px;
}

/* ---- 章节 ---- */
.cep-chapter {
  margin-bottom: 16px;
}

.cep-chapter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cep-chapter-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
}

.cep-chapter-count {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

/* ---- 条款卡片 ---- */
.cep-clause {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 8px;
  transition: all 0.2s;
}

.cep-clause:hover {
  border-color: rgba(var(--accent-rgb), 0.18);
}

.cep-clause.is-system {
  background: rgba(212, 180, 100, 0.04);
  border-color: rgba(212, 180, 100, 0.12);
}

.cep-clause.is-repealed {
  opacity: 0.45;
}

.cep-clause-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cep-clause-number {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  font-family: var(--font-heading-zh);
}

.cep-clause-status,
.cep-clause-severity {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.3px;
}

.cep-clause-status.st-draft { background: rgba(180, 180, 190, 0.12); color: #9a9aa6; }
.cep-clause-status.st-enacted { background: rgba(138, 154, 122, 0.14); color: #8a9a7a; }
.cep-clause-status.st-repealed { background: rgba(200, 120, 100, 0.14); color: #c87864; }
.cep-clause-status.st-proposed { background: rgba(212, 180, 100, 0.14); color: #d4b464; }

.cep-clause-severity.sv-constitutional { background: rgba(212, 180, 100, 0.12); color: #d4b464; }
.cep-clause-severity.sv-statutory { background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }
.cep-clause-severity.sv-regulatory { background: rgba(138, 154, 122, 0.12); color: #8a9a7a; }
.cep-clause-severity.sv-guideline { background: rgba(180, 180, 190, 0.1); color: #9a9aa6; }

.cep-clause-system {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(212, 180, 100, 0.12);
  color: #d4b464;
  border: 1px solid rgba(212, 180, 100, 0.2);
}

.cep-clause-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.cep-clause-title {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
}

.cep-clause-content {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.75);
}

.cep-edit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

/* ---- 修订案 ---- */
.cep-amendment {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 8px;
}

.cep-amendment-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cep-amendment-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.cep-amendment-status {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.3px;
}

.cep-amendment-status.st-draft { background: rgba(180, 180, 190, 0.12); color: #9a9aa6; }
.cep-amendment-status.st-proposed { background: rgba(212, 180, 100, 0.14); color: #d4b464; }
.cep-amendment-status.st-under_review { background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }
.cep-amendment-status.st-approved { background: rgba(138, 154, 122, 0.14); color: #8a9a7a; }
.cep-amendment-status.st-rejected { background: rgba(200, 120, 100, 0.14); color: #c87864; }
.cep-amendment-status.st-enacted { background: rgba(138, 154, 122, 0.14); color: #8a9a7a; }

.cep-amendment-desc {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.65);
}

.cep-amendment-meta {
  display: flex;
  gap: 14px;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.cep-amendment-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

/* ---- 冲突 ---- */
.cep-conflict {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(200, 120, 100, 0.04);
  border: 1px solid rgba(200, 120, 100, 0.12);
  margin-bottom: 8px;
}

.cep-conflict-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cep-conflict-type,
.cep-conflict-severity {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.3px;
}

.cep-conflict-type.ct-contradiction { background: rgba(200, 120, 100, 0.14); color: #c87864; }
.cep-conflict-type.ct-overlap { background: rgba(212, 180, 100, 0.14); color: #d4b464; }
.cep-conflict-type.ct-tension { background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }

.cep-conflict-severity.cs-critical { background: rgba(200, 120, 100, 0.16); color: #c46a5a; }
.cep-conflict-severity.cs-major { background: rgba(212, 180, 100, 0.14); color: #d4b464; }
.cep-conflict-severity.cs-minor { background: rgba(138, 154, 122, 0.12); color: #8a9a7a; }

.cep-conflict-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.75);
}

.cep-conflict-suggestion {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

/* ---- 空状态 ---- */
.cep-empty {
  text-align: center;
  padding: 24px 12px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.4);
  border: 1px dashed rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
}

.cep-empty-ok {
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.2);
}

@media (max-width: 640px) {
  .cep-stats {
    gap: 6px;
  }
  .cep-stat {
    min-width: 70px;
}
}
</style>
