<template>
  <section class="crp" aria-label="冲突解决">
    <div class="crp-head">
      <span class="crp-title">⚖️ 冲突解决</span>
      <span class="crp-sub">自动规则 · 冲突检测 · 解决历史</span>
    </div>

    <!-- 统计总览 -->
    <div class="crp-stats">
      <div class="crp-stat"><b>{{ stats.rules }}</b><span>解决规则</span></div>
      <div class="crp-stat"><b>{{ stats.totalHits }}</b><span>规则命中</span></div>
      <div class="crp-stat"><b>{{ stats.history }}</b><span>解决记录</span></div>
      <div class="crp-stat crp-stat--hot"><b>{{ stats.autoRate }}%</b><span>自动解决率</span></div>
    </div>

    <!-- 默认策略 -->
    <div class="crp-block">
      <span class="crp-block-label">默认策略</span>
      <div class="crp-strategy-row">
        <select class="crp-select" :value="defaultStrategy" @change="onStrategyChange">
          <option v-for="s in strategyOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <span class="crp-strategy-hint">未命中规则时的兜底策略</span>
      </div>
    </div>

    <!-- 冲突检测 -->
    <div class="crp-block">
      <span class="crp-block-label">冲突检测</span>
      <div class="crp-detect">
        <select v-model="sourceCheckpointId" class="crp-select">
          <option value="" disabled>选择源检查点</option>
          <option v-for="c in checkpoints" :key="c.id" :value="c.id">{{ checkpointLabel(c) }}</option>
        </select>
        <span class="crp-detect-vs">VS</span>
        <select v-model="targetCheckpointId" class="crp-select">
          <option value="" disabled>选择目标检查点</option>
          <option v-for="c in checkpoints" :key="c.id" :value="c.id">{{ checkpointLabel(c) }}</option>
        </select>
        <button
          class="crp-btn crp-btn--primary crp-detect-btn"
          :disabled="!sourceCheckpointId || !targetCheckpointId || sourceCheckpointId === targetCheckpointId"
          @click="detectConflicts"
        >🔍 检测</button>
      </div>
      <div v-if="detectedConflicts.length" class="crp-conflict-list">
        <div v-for="c in detectedConflicts" :key="c.id" class="crp-conflict" :class="'crp-type--' + c.type">
          <span class="crp-conflict-icon">{{ conflictIcon(c.type) }}</span>
          <div class="crp-conflict-body">
            <span class="crp-conflict-type">{{ conflictLabel(c.type) }}</span>
            <strong class="crp-conflict-field">{{ c.fieldName }}</strong>
            <p class="crp-conflict-desc">{{ c.description }}</p>
          </div>
        </div>
        <button class="crp-btn crp-btn--primary crp-resolve-btn" @click="resolveDetected">⚡ 解决 {{ detectedConflicts.length }} 个冲突</button>
      </div>
      <div v-else-if="detected" class="crp-detect-empty">没有检测到冲突</div>
    </div>

    <!-- 规则管理 -->
    <div class="crp-block">
      <span class="crp-block-label">解决规则 · {{ rules.length }}</span>
      <div v-if="rules.length" class="crp-rule-list">
        <div v-for="r in rules" :key="r.id" class="crp-rule" :class="{ disabled: !r.enabled }">
          <span class="crp-rule-toggle" @click="toggleRule(r.id)">{{ r.enabled ? '✓' : '○' }}</span>
          <div class="crp-rule-body">
            <strong class="crp-rule-name">{{ r.name }}</strong>
            <span class="crp-rule-meta">{{ ruleMeta(r) }}</span>
          </div>
          <span class="crp-rule-priority">P{{ r.priority }}</span>
          <span class="crp-rule-hits">{{ r.hitCount }} 次</span>
          <span class="crp-rule-del" @click="deleteRule(r.id)">✕</span>
        </div>
      </div>
      <div v-else class="crp-empty">还没有解决规则</div>
      <div class="crp-rule-actions">
        <button class="crp-btn crp-btn--sm" @click="showRuleForm = !showRuleForm">＋ 新建规则</button>
        <button class="crp-btn crp-btn--sm crp-rule-reset" @click="resetRules">↺ 重置默认</button>
      </div>

      <!-- 新建规则表单 -->
      <div v-if="showRuleForm" class="crp-rule-form">
        <input v-model="ruleForm.name" class="crp-input" placeholder="规则名称，如：工作线优先" />
        <input v-model="ruleForm.description" class="crp-input" placeholder="规则描述（可选）" />
        <div class="crp-rule-form-row">
          <select v-model="ruleForm.strategy" class="crp-select">
            <option v-for="(label, value) in resolutionLabels" :key="value" :value="value">{{ label }}</option>
          </select>
          <input v-model="ruleForm.priority" type="number" min="1" max="10" class="crp-input crp-input-num" placeholder="优先级 1-10" />
        </div>
        <div class="crp-rule-form-row">
          <input v-model="ruleForm.fieldPatterns" class="crp-input" placeholder="字段模式，逗号分隔（可空）" />
        </div>
        <div class="crp-rule-types">
          <label v-for="(meta, type) in CONFLICT_META" :key="type" class="crp-rule-type">
            <input type="checkbox" :value="type" v-model="ruleForm.conflictTypes" />
            <span>{{ meta.icon }} {{ meta.label }}</span>
          </label>
        </div>
        <button class="crp-btn crp-btn--primary crp-rule-save" :disabled="!ruleForm.name.trim() || ruleForm.conflictTypes.length === 0" @click="addRule">保存规则</button>
      </div>
    </div>

    <!-- 解决历史 -->
    <div class="crp-block">
      <span class="crp-block-label">解决历史 · {{ history.length }}</span>
      <div v-if="history.length" class="crp-history-list">
        <div v-for="h in history" :key="h.id" class="crp-history" :class="{ active: h.id === selectedHistoryId }" @click="selectHistory(h.id)">
          <span class="crp-history-summary">{{ h.summary }}</span>
          <span class="crp-history-meta">{{ fmtTime(h.resolvedAt) }} · {{ h.allResolved ? '全部解决' : '部分解决' }}</span>
        </div>
      </div>
      <div v-else class="crp-empty">还没有解决记录。检测并解决冲突后会记录在这里。</div>
    </div>

    <!-- 模式分析 -->
    <div v-if="patternStats.totalResolved > 0" class="crp-block">
      <span class="crp-block-label">冲突模式分析</span>
      <div class="crp-pattern">
        <div class="crp-pattern-row">
          <span class="crp-pattern-label">自动解决率</span>
          <div class="crp-pattern-bar"><i :style="{ width: (patternStats.autoResolveRate * 100) + '%' }"></i></div>
          <span class="crp-pattern-num">{{ Math.round(patternStats.autoResolveRate * 100) }}%</span>
        </div>
        <div v-if="patternStats.mostCommonTypes.length" class="crp-pattern-types">
          <span v-for="t in patternStats.mostCommonTypes" :key="t.type" class="crp-pattern-chip">{{ conflictLabel(t.type) }} ×{{ t.count }}</span>
        </div>
        <ul class="crp-pattern-rec">
          <li v-for="(rec, i) in patternStats.recommendations" :key="i">💡 {{ rec }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAutoConflictResolution, useParallelWorld, RESOLUTION_LABELS } from '../modules/parallel-world'
import type { AutoConflictType, ConflictStrategy, ConflictResolution, ResolutionRule, ResolutionStrategy } from '../modules/parallel-world'

const parallelWorld = useParallelWorld()
const api = useAutoConflictResolution()

const branches = parallelWorld.branches
const checkpoints = parallelWorld.checkpoints

const rules = api.rules
const history = api.resolutionHistory
const defaultStrategy = api.defaultStrategy

const sourceCheckpointId = ref('')
const targetCheckpointId = ref('')
const detectedConflicts = ref<ConflictResolution[]>([])
const detected = ref(false)
const selectedHistoryId = ref('')
const showRuleForm = ref(false)

const ruleForm = reactive({
  name: '',
  description: '',
  strategy: 'keep-newest' as ResolutionStrategy,
  priority: '5',
  fieldPatterns: '',
  conflictTypes: [] as AutoConflictType[],
})

const CONFLICT_META: Record<AutoConflictType, { icon: string; label: string }> = {
  data: { icon: '🗃️', label: '数据' },
  label: { icon: '🏷️', label: '标签名' },
  tag: { icon: '#️⃣', label: '标签' },
  metadata: { icon: '📝', label: '元数据' },
  timeline: { icon: '🕐', label: '时间线' },
  snapshot: { icon: '📸', label: '快照' },
}

const resolutionLabels = RESOLUTION_LABELS

const stats = computed(() => {
  const results = api.getResolutionHistory()
  const totalResolved = results.reduce((sum, r) => sum + r.totalConflicts, 0)
  const autoResolved = results.reduce((sum, r) => sum + r.autoResolved, 0)
  return {
    rules: rules.value.length,
    totalHits: api.totalHits.value,
    history: history.value.length,
    autoRate: totalResolved > 0 ? Math.round((autoResolved / totalResolved) * 100) : 0,
  }
})

const strategyOptions = computed(() => api.getAvailableStrategies())
const patternStats = computed(() => api.analyzeConflictPatterns())

onMounted(() => {
  parallelWorld.load()
  api.loadRules()
  api.loadHistory()
})

function checkpointLabel(c: { id: string; branchId: string; label: string }) {
  const branch = branches.value.find(b => b.id === c.branchId)
  return `${branch ? branch.name : '未知分支'} · ${c.label}`
}

function onStrategyChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as ConflictStrategy
  api.setDefaultStrategy(v)
}

function detectConflicts() {
  const source = checkpoints.value.find(c => c.id === sourceCheckpointId.value)
  const target = checkpoints.value.find(c => c.id === targetCheckpointId.value)
  if (!source || !target) return
  detectedConflicts.value = api.detectConflicts(source, target)
  detected.value = true
}

function resolveDetected() {
  if (!detectedConflicts.value.length) return
  const source = checkpoints.value.find(c => c.id === sourceCheckpointId.value)
  const target = checkpoints.value.find(c => c.id === targetCheckpointId.value)
  const sourceBranch = branches.value.find(b => b.id === source?.branchId)
  const targetBranch = branches.value.find(b => b.id === target?.branchId)
  const result = api.resolveConflict(detectedConflicts.value, undefined, sourceBranch, targetBranch)
  detectedConflicts.value = []
  detected.value = false
  if (result) selectedHistoryId.value = result.id
}

function toggleRule(id: string) {
  const rule = rules.value.find(r => r.id === id)
  if (rule) api.toggleRule(id, !rule.enabled)
}

function deleteRule(id: string) {
  api.deleteRule(id)
}

function resetRules() {
  api.resetRules()
}

function addRule() {
  const name = ruleForm.name.trim()
  if (!name || ruleForm.conflictTypes.length === 0) return
  const priority = parseInt(ruleForm.priority, 10)
  api.addResolutionRule(
    name,
    ruleForm.description.trim(),
    [...ruleForm.conflictTypes],
    ruleForm.strategy,
    {
      fieldPatterns: ruleForm.fieldPatterns.split(',').map(s => s.trim()).filter(Boolean),
      priority: Number.isFinite(priority) ? Math.max(1, Math.min(10, priority)) : 5,
    },
  )
  ruleForm.name = ''
  ruleForm.description = ''
  ruleForm.priority = '5'
  ruleForm.fieldPatterns = ''
  ruleForm.conflictTypes = []
  showRuleForm.value = false
}

function selectHistory(id: string) {
  selectedHistoryId.value = id
}

function ruleMeta(r: ResolutionRule) {
  const types = r.conflictTypes.map(t => conflictLabel(t)).join('、')
  return `${RESOLUTION_LABELS[r.strategy]} · ${types || '全部类型'}`
}

function conflictIcon(type: AutoConflictType) {
  return CONFLICT_META[type]?.icon ?? '•'
}

function conflictLabel(type: AutoConflictType) {
  return CONFLICT_META[type]?.label ?? type
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.crp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.crp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.crp-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.crp-sub {
  font-size: 12px;
  opacity: 0.6;
}

.crp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.crp-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.crp-stat b {
  font-size: 18px;
  font-weight: 600;
}

.crp-stat span {
  font-size: 11px;
  opacity: 0.6;
}

.crp-stat--hot b {
  color: #e0a96d;
}

.crp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crp-block-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.75;
  letter-spacing: 0.04em;
}

.crp-strategy-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.crp-strategy-hint {
  font-size: 11px;
  opacity: 0.5;
}

.crp-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  max-width: 100%;
}

.crp-select:focus {
  border-color: rgba(224, 169, 109, 0.4);
}

.crp-detect {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.crp-detect .crp-select {
  flex: 1;
  min-width: 140px;
}

.crp-detect-vs {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.5;
  flex-shrink: 0;
}

.crp-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.crp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.crp-btn--primary {
  background: rgba(224, 169, 109, 0.18);
  border-color: rgba(224, 169, 109, 0.35);
}

.crp-btn--sm {
  padding: 5px 10px;
  font-size: 12px;
}

.crp-conflict-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.crp-conflict {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.crp-conflict-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.crp-conflict-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.crp-conflict-type {
  font-size: 10px;
  letter-spacing: 1px;
  opacity: 0.5;
}

.crp-conflict-field {
  font-size: 13px;
  font-weight: 600;
}

.crp-conflict-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  opacity: 0.7;
}

.crp-resolve-btn {
  align-self: flex-start;
}

.crp-detect-empty {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  opacity: 0.55;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.08);
  color: #8a9a7a;
}

.crp-empty {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  opacity: 0.5;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.crp-rule-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.crp-rule {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.crp-rule.disabled {
  opacity: 0.5;
}

.crp-rule-toggle {
  cursor: pointer;
  font-size: 14px;
  color: #8a9a7a;
  flex-shrink: 0;
}

.crp-rule.disabled .crp-rule-toggle {
  color: rgba(255, 255, 255, 0.3);
}

.crp-rule-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.crp-rule-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crp-rule-meta {
  font-size: 11px;
  opacity: 0.55;
}

.crp-rule-priority {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(224, 169, 109, 0.12);
  color: #e0a96d;
  flex-shrink: 0;
}

.crp-rule-hits {
  font-size: 11px;
  opacity: 0.5;
  flex-shrink: 0;
}

.crp-rule-del {
  cursor: pointer;
  opacity: 0.4;
  font-size: 12px;
  flex-shrink: 0;
}

.crp-rule-del:hover {
  opacity: 1;
}

.crp-rule-actions {
  display: flex;
  gap: 8px;
}

.crp-rule-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(224, 169, 109, 0.18);
}

.crp-input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.crp-input::placeholder {
  opacity: 0.4;
}

.crp-input:focus {
  border-color: rgba(224, 169, 109, 0.4);
}

.crp-input-num {
  width: 110px;
}

.crp-rule-form-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.crp-rule-form-row .crp-select {
  flex: 1;
  min-width: 140px;
}

.crp-rule-form-row .crp-input {
  flex: 1;
  min-width: 140px;
}

.crp-rule-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.crp-rule-type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
  cursor: pointer;
}

.crp-rule-save {
  align-self: flex-start;
}

.crp-history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.crp-history {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  cursor: pointer;
}

.crp-history:hover {
  background: rgba(255, 255, 255, 0.05);
}

.crp-history.active {
  border-color: rgba(224, 169, 109, 0.3);
  background: rgba(224, 169, 109, 0.06);
}

.crp-history-summary {
  font-size: 12px;
  line-height: 1.6;
}

.crp-history-meta {
  font-size: 11px;
  opacity: 0.5;
}

.crp-pattern {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.crp-pattern-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.crp-pattern-label {
  font-size: 12px;
  opacity: 0.7;
  flex-shrink: 0;
}

.crp-pattern-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.crp-pattern-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #e0a96d);
  transition: width 0.3s;
}

.crp-pattern-num {
  font-size: 12px;
  font-weight: 600;
  color: #e0a96d;
  flex-shrink: 0;
}

.crp-pattern-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.crp-pattern-chip {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.crp-pattern-rec {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.crp-pattern-rec li {
  font-size: 12px;
  line-height: 1.6;
  opacity: 0.75;
}
</style>
