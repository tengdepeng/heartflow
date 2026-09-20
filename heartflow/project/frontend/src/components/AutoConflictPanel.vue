<template>
  <section class="acp-panel" aria-label="冲突仲裁">
    <!-- 面板头 -->
    <div class="acp-head">
      <div class="acp-head-left">
        <span class="acp-title">⚖️ 冲突仲裁</span>
        <span class="acp-sub">自动解决 · 规则引擎 · 模式分析</span>
      </div>
      <span class="acp-badge">{{ resolutionCount }} 次解决 · {{ rules.length }} 条规则</span>
    </div>

    <!-- 空态 -->
    <p v-if="branches.length === 0" class="acp-empty">
      还没有平行分支可仲裁。先在「分支星图」种下时间分支与检查点，再让规则替你裁决分歧。
    </p>
    <p v-else-if="branches.length < 2" class="acp-empty">
      至少需要两个分支才能仲裁。当前仅有「{{ branches[0].name }}」，再多建一个分支吧。
    </p>

    <template v-else>
      <!-- 标签页 -->
      <div class="acp-tabs">
        <button v-for="t in tabs" :key="t.key" class="acp-tab" :class="{ active: tab === t.key }" @click="tab = t.key">
          {{ t.label }}
        </button>
      </div>

      <!-- 仲裁页 -->
      <div v-if="tab === 'arbitrate'" class="acp-page">
        <div class="acp-form">
          <select v-model="sourceCpId" class="acp-input" aria-label="源检查点">
            <option value="">选择源检查点</option>
            <option v-for="c in allCheckpoints" :key="'s-' + c.id" :value="c.id">{{ branchName(c.branchId) }} · {{ c.label }}</option>
          </select>
          <span class="acp-arrow">⇄</span>
          <select v-model="targetCpId" class="acp-input" aria-label="目标检查点">
            <option value="">选择目标检查点</option>
            <option v-for="c in allCheckpoints" :key="'t-' + c.id" :value="c.id">{{ branchName(c.branchId) }} · {{ c.label }}</option>
          </select>
          <button class="acp-btn acp-detect" :disabled="!canDetect" @click="detect">检测冲突</button>
        </div>

        <!-- 冲突列表 -->
        <div v-if="conflicts.length" class="acp-block">
          <div class="acp-block-title">检测到 {{ conflicts.length }} 个冲突</div>
          <div class="acp-conflicts">
            <div v-for="c in conflicts" :key="c.id" class="acp-conflict">
              <span class="acp-conflict-type">{{ TYPE_LABELS[c.type] }}</span>
              <span class="acp-conflict-field">{{ c.fieldName }}</span>
              <span class="acp-conflict-desc">{{ c.description }}</span>
            </div>
          </div>
          <div class="acp-resolve-row">
            <select v-model="strategy" class="acp-input acp-strategy" aria-label="解决策略">
              <option v-for="s in strategies" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <button class="acp-btn acp-run" @click="resolve">一键解决</button>
          </div>
        </div>

        <!-- 解决结果 -->
        <div v-if="lastResult" class="acp-result">
          <div class="acp-result-head">
            <span class="acp-result-status" :class="{ ok: lastResult.allResolved, fail: !lastResult.allResolved }">
              {{ lastResult.allResolved ? '✓ 全部解决' : '✗ 部分解决' }}
            </span>
            <span class="acp-result-summary">{{ lastResult.summary }}</span>
          </div>
        </div>

        <!-- 默认策略（并入 ConflictResolutionPanel 独有能力 INCR-400） -->
        <div class="acp-block">
          <div class="acp-block-title">默认策略</div>
          <div class="acp-form">
            <select v-model="defaultStrategy" class="acp-input acp-strategy" aria-label="默认策略">
              <option v-for="s in strategies" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <span class="acp-default-hint">未命中规则时的兜底策略</span>
          </div>
        </div>

        <!-- 解决历史（并入 ConflictResolutionPanel 独有能力 INCR-400） -->
        <div class="acp-block">
          <div class="acp-block-title">解决历史（{{ historyRecords.length }}）</div>
          <p v-if="!historyRecords.length" class="acp-empty">还没有解决记录。检测并解决冲突后会记录在这里。</p>
          <div v-else class="acp-history">
            <div
              v-for="h in historyRecords"
              :key="h.id"
              class="acp-history-item"
              :class="{ active: h.id === selectedHistoryId }"
              @click="selectedHistoryId = h.id"
            >
              <span class="acp-history-summary">{{ h.summary }}</span>
              <span class="acp-history-meta">{{ fmtTime(h.resolvedAt) }} · {{ h.allResolved ? '全部解决' : '部分解决' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 规则页 -->
      <div v-else-if="tab === 'rules'" class="acp-page">
        <div class="acp-rules-head">
          <span class="acp-block-title">解决规则（{{ rules.length }}）</span>
          <button class="acp-btn acp-mini" @click="resetRules">重置默认</button>
        </div>
        <p v-if="!rules.length" class="acp-empty">还没有规则。添加一条规则，让冲突自动裁决。</p>
        <div v-else class="acp-rules">
          <div v-for="r in rules" :key="r.id" class="acp-rule" :class="{ disabled: !r.enabled }">
            <div class="acp-rule-body">
              <div class="acp-rule-top">
                <span class="acp-rule-name">{{ r.name }}</span>
                <span class="acp-rule-priority">P{{ r.priority }}</span>
                <span class="acp-rule-strategy">{{ RULE_STRATEGY_LABELS[r.strategy] }}</span>
                <span class="acp-rule-hit">{{ r.hitCount }} 次命中</span>
              </div>
              <p v-if="r.description" class="acp-rule-desc">{{ r.description }}</p>
              <div v-if="r.conflictTypes.length" class="acp-rule-types">
                <span v-for="ct in r.conflictTypes" :key="ct" class="acp-rule-type-tag">{{ TYPE_LABELS[ct] }}</span>
              </div>
            </div>
            <div class="acp-rule-ops">
              <button class="acp-btn acp-mini" :class="{ on: r.enabled }" @click="toggleRule(r.id)">{{ r.enabled ? '启用' : '停用' }}</button>
              <button class="acp-btn acp-mini acp-del" @click="deleteRule(r.id)">删除</button>
            </div>
          </div>
        </div>

        <!-- 新增规则 -->
        <div class="acp-block">
          <div class="acp-block-title">新增规则</div>
          <div class="acp-form acp-form--col">
            <input v-model="ruleForm.name" class="acp-input" placeholder="规则名称（必填）" />
            <input v-model="ruleForm.description" class="acp-input" placeholder="规则描述（可选）" />
            <div class="acp-form-row">
              <select v-model="ruleForm.strategy" class="acp-input acp-strategy" aria-label="规则策略">
                <option v-for="s in ruleStrategies" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
              <input v-model.number="ruleForm.priority" type="number" min="1" max="10" class="acp-input acp-priority" placeholder="优先级 1-10" />
            </div>
            <input v-model="ruleForm.fieldPatterns" class="acp-input" placeholder="字段模式，逗号分隔（可空），如：tags,label" />
            <div class="acp-block-label acp-types-title">冲突类型</div>
            <div class="acp-type-grid">
              <label v-for="t in typeOptions" :key="t.value" class="acp-type-cell" :class="{ on: ruleForm.conflictTypes.includes(t.value) }">
                <input v-model="ruleForm.conflictTypes" type="checkbox" :value="t.value" class="acp-type-check" />
                <span>{{ t.label }}</span>
              </label>
            </div>
            <p v-if="!ruleForm.conflictTypes.length" class="acp-empty acp-hint">至少选择一种冲突类型</p>
            <button class="acp-btn acp-add acp-rule-save" :disabled="!ruleForm.name.trim() || ruleForm.conflictTypes.length === 0" @click="addRule">添加规则</button>
          </div>
        </div>
      </div>

      <!-- 分析页 -->
      <div v-else class="acp-page">
        <p v-if="!analysis.totalResolved" class="acp-empty">
          还没有解决记录。先在「仲裁」页检测并解决一次冲突，这里会生成模式分析。
        </p>
        <template v-else>
          <div class="acp-stats">
            <div class="acp-stat">
              <span class="acp-stat-num">{{ analysis.totalResolved }}</span>
              <span class="acp-stat-label">已解决</span>
            </div>
            <div class="acp-stat">
              <span class="acp-stat-num">{{ Math.round(analysis.autoResolveRate * 100) }}%</span>
              <span class="acp-stat-label">自动率</span>
            </div>
            <div class="acp-stat">
              <span class="acp-stat-num">{{ Math.round(analysis.ruleHitRate * 100) }}%</span>
              <span class="acp-stat-label">规则命中</span>
            </div>
          </div>
          <div v-if="analysis.mostCommonTypes.length" class="acp-block">
            <div class="acp-block-title">高频冲突类型</div>
            <div v-for="t in analysis.mostCommonTypes" :key="t.type" class="acp-analysis-row">
              <span class="acp-analysis-key">{{ TYPE_LABELS[t.type] }}</span>
              <span class="acp-analysis-count">{{ t.count }} 次</span>
            </div>
          </div>
          <div v-if="analysis.recommendations.length" class="acp-block">
            <div class="acp-block-title">建议</div>
            <div v-for="(rec, i) in analysis.recommendations" :key="i" class="acp-analysis-row">
              <span class="acp-analysis-key">💡</span>
              <span class="acp-analysis-count">{{ rec }}</span>
            </div>
          </div>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useAutoConflictResolution } from '../modules/parallel-world'
import type { WorldBranch, Checkpoint } from '../modules/parallel-world/types'
import type {
  ConflictStrategy,
  AutoConflictType,
  ResolutionStrategy,
  ConflictResolution,
  ResolutionResult,
} from '../modules/parallel-world/auto-conflict-resolution'

const props = defineProps<{
  branches: WorldBranch[]
  checkpoints: Checkpoint[]
}>()

const engine = useAutoConflictResolution()

const tab = ref<'arbitrate' | 'rules' | 'analysis'>('arbitrate')
const tabs: { key: 'arbitrate' | 'rules' | 'analysis'; label: string }[] = [
  { key: 'arbitrate', label: '仲裁' },
  { key: 'rules', label: '规则' },
  { key: 'analysis', label: '分析' },
]

const sourceCpId = ref('')
const targetCpId = ref('')
const strategy = ref<ConflictStrategy>('newest-wins')
const conflicts = ref<ConflictResolution[]>([])

const ruleForm = reactive({
  name: '',
  description: '',
  conflictTypes: [] as AutoConflictType[],
  strategy: 'merge' as ResolutionStrategy,
  priority: 5,
  fieldPatterns: '',
})

const rules = computed(() => engine.rules.value)
const resolutionCount = computed(() => engine.resolutionHistory.value.length)
const lastResult = computed<ResolutionResult | null>(() => engine.latestResolution.value)
const analysis = computed(() => engine.analyzeConflictPatterns())
const defaultStrategy = computed({
  get: () => engine.defaultStrategy.value,
  set: (v: ConflictStrategy) => engine.setDefaultStrategy(v),
})
const historyRecords = computed(() => engine.resolutionHistory.value)
const selectedHistoryId = ref('')

const allCheckpoints = computed(() => props.checkpoints)
const canDetect = computed(() => {
  if (!sourceCpId.value || !targetCpId.value) return false
  const s = props.checkpoints.find(c => c.id === sourceCpId.value)
  const t = props.checkpoints.find(c => c.id === targetCpId.value)
  return !!s && !!t && s.branchId !== t.branchId
})

const strategies = engine.getAvailableStrategies()

const TYPE_LABELS: Record<AutoConflictType, string> = {
  data: '数据',
  label: '标签名',
  tag: '标签',
  metadata: '元数据',
  timeline: '时间线',
  snapshot: '快照',
}

const RULE_STRATEGY_LABELS: Record<ResolutionStrategy, string> = {
  'keep-source': '保留源',
  'keep-target': '保留目标',
  'keep-newest': '保留最新',
  'keep-oldest': '保留最旧',
  'merge': '合并',
  'keep-both': '保留双方',
  'skip': '跳过',
  'custom': '自定义',
}

const typeOptions: { value: AutoConflictType; label: string }[] = [
  { value: 'data', label: '数据' },
  { value: 'label', label: '标签名' },
  { value: 'tag', label: '标签' },
  { value: 'metadata', label: '元数据' },
  { value: 'timeline', label: '时间线' },
  { value: 'snapshot', label: '快照' },
]

const ruleStrategies: { value: ResolutionStrategy; label: string }[] = [
  { value: 'keep-source', label: '保留源' },
  { value: 'keep-target', label: '保留目标' },
  { value: 'keep-newest', label: '保留最新' },
  { value: 'keep-oldest', label: '保留最旧' },
  { value: 'merge', label: '合并' },
  { value: 'keep-both', label: '保留双方' },
  { value: 'skip', label: '跳过' },
  { value: 'custom', label: '自定义' },
]

function detect() {
  const source = props.checkpoints.find(c => c.id === sourceCpId.value)
  const target = props.checkpoints.find(c => c.id === targetCpId.value)
  if (!source || !target) return
  conflicts.value = engine.detectConflicts(source, target)
}

function resolve() {
  const source = props.checkpoints.find(c => c.id === sourceCpId.value)
  const target = props.checkpoints.find(c => c.id === targetCpId.value)
  if (!source || !target || !conflicts.value.length) return
  const sourceBranch = props.branches.find(b => b.id === source.branchId)
  const targetBranch = props.branches.find(b => b.id === target.branchId)
  engine.resolveConflict(conflicts.value, strategy.value, sourceBranch, targetBranch)
}

function toggleRule(id: string) {
  const rule = engine.getRule(id)
  if (rule) engine.toggleRule(id, !rule.enabled)
}

function deleteRule(id: string) {
  engine.deleteRule(id)
}

function resetRules() {
  engine.resetRules()
}

function addRule() {
  if (!ruleForm.name.trim() || ruleForm.conflictTypes.length === 0) return
  engine.addResolutionRule(ruleForm.name.trim(), ruleForm.description.trim(), [...ruleForm.conflictTypes], ruleForm.strategy, {
    fieldPatterns: ruleForm.fieldPatterns.split(',').map(s => s.trim()).filter(Boolean),
    priority: ruleForm.priority,
  })
  ruleForm.name = ''
  ruleForm.description = ''
  ruleForm.conflictTypes = []
  ruleForm.priority = 5
  ruleForm.fieldPatterns = ''
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function branchName(id: string): string {
  return props.branches.find(b => b.id === id)?.name ?? id
}
</script>

<style scoped>
.acp-panel {
  margin-top: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.acp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.acp-head-left { display: flex; flex-direction: column; gap: 2px; }
.acp-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.acp-sub { font-size: 12px; opacity: 0.72; }
.acp-badge {
  padding: 3px 12px; border-radius: 999px;
  background: rgba(195, 159, 106, 0.16); border: 1px solid rgba(195, 159, 106, 0.4);
  color: #d9c390; font-size: 12px; white-space: nowrap;
}
.acp-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }

.acp-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
.acp-tab {
  padding: 4px 14px; border-radius: 999px; font-size: 12px;
  border: 1px solid rgba(195, 159, 106, 0.2); background: transparent;
  color: #c9bea6; cursor: pointer;
}
.acp-tab.active { background: rgba(195, 159, 106, 0.18); border-color: rgba(195, 159, 106, 0.45); color: #f0d9a8; }

.acp-page { display: flex; flex-direction: column; gap: 10px; }
.acp-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.acp-input {
  flex: 1; min-width: 110px; padding: 6px 10px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(20, 24, 20, 0.45);
  color: #e8ddc8; font-size: 12px;
}
.acp-strategy { flex: 1.2; }
.acp-priority { flex: 0.5; min-width: 80px;
}
.acp-arrow { color: #8a9a7a; }
.acp-btn {
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.4); background: rgba(195, 159, 106, 0.14);
  color: #e8d9a8; font-size: 12px; cursor: pointer;
}
.acp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.acp-detect { background: rgba(195, 159, 106, 0.2); }
.acp-run { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.acp-add { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.acp-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 2px 10px; font-size: 11px; 
  min-height: 26px;
}
.acp-mini.on { background: rgba(138, 154, 122, 0.22); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.acp-del { background: rgba(196, 106, 90, 0.16); border-color: rgba(196, 106, 90, 0.4); color: #e0a08a; }

.acp-block {
  border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px;
  background: rgba(195, 159, 106, 0.06);
}
.acp-block-title { font-size: 12px; font-weight: 700; color: #d9c390; margin-bottom: 6px; }

.acp-conflicts { display: flex; flex-direction: column; gap: 4px; }
.acp-conflict { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.acp-conflict-type { padding: 1px 8px; border-radius: 999px; background: rgba(196, 106, 90, 0.18); color: #e0a08a; font-size: 11px; white-space: nowrap; }
.acp-conflict-field { color: #d9c390; font-size: 11px; white-space: nowrap; }
.acp-conflict-desc { flex: 1; color: #e0d4ba; }
.acp-resolve-row { display: flex; gap: 8px; margin-top: 6px; }

.acp-result {
  border: 1px solid rgba(138, 154, 122, 0.3); border-radius: 10px; padding: 10px 12px;
  background: rgba(138, 154, 122, 0.08);
}
.acp-result-head { display: flex; align-items: center; gap: 10px; }
.acp-result-status { font-weight: 700; font-size: 13px; white-space: nowrap; }
.acp-result-status.ok { color: #a9c08a; }
.acp-result-status.fail { color: #e0a08a; }
.acp-result-summary { font-size: 12px; color: #e0d4ba; line-height: 1.6; }

.acp-rules-head { display: flex; align-items: center; justify-content: space-between; }
.acp-rules { display: flex; flex-direction: column; gap: 4px; }
.acp-rule { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.acp-rule.disabled { opacity: 0.55; }
.acp-rule-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.acp-rule-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.acp-rule-name { color: #e8ddc8; }
.acp-rule-priority { padding: 1px 8px; border-radius: 999px; background: rgba(224, 169, 109, 0.14); color: #e0a96d; font-size: 11px; white-space: nowrap; }
.acp-rule-strategy { padding: 1px 8px; border-radius: 999px; background: rgba(138, 154, 122, 0.2); color: #a9c08a; font-size: 11px; white-space: nowrap; }
.acp-rule-hit { font-size: 11px; color: #8a8a80; white-space: nowrap; }
.acp-rule-desc { margin: 0; font-size: 11px; color: #c4b89e; line-height: 1.5; }
.acp-rule-types { display: flex; gap: 4px; flex-wrap: wrap; }
.acp-rule-type-tag { padding: 1px 7px; border-radius: 6px; background: rgba(195, 159, 106, 0.12); color: #c9bea6; font-size: 10px; }
.acp-rule-ops { display: flex; gap: 6px; flex-shrink: 0; }

.acp-stats { display: flex; gap: 10px; }
.acp-stat {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px; border-radius: 10px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(195, 159, 106, 0.06);
}
.acp-stat-num { font-size: 20px; font-weight: 700; color: #f0d9a8; }
.acp-stat-label { font-size: 11px; color: #8a9a7a; }
.acp-analysis-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.acp-analysis-key { color: #d9c390; white-space: nowrap; }
.acp-analysis-count { flex: 1; color: #e0d4ba; }

/* INCR-400 并入 ConflictResolutionPanel 独有能力样式 */
.acp-default-hint { font-size: 11px; color: #8a8a80; }
.acp-history { display: flex; flex-direction: column; gap: 4px; }
.acp-history-item { display: flex; flex-direction: column; gap: 2px; padding: 7px 10px; border-radius: 8px; border: 1px solid transparent; background: rgba(195, 159, 106, 0.05); cursor: pointer; }
.acp-history-item:hover { background: rgba(195, 159, 106, 0.1); }
.acp-history-item.active { border-color: rgba(195, 159, 106, 0.35); background: rgba(195, 159, 106, 0.12); }
.acp-history-summary { font-size: 12px; color: #e0d4ba; line-height: 1.5; }
.acp-history-meta { font-size: 11px; color: #8a8a80; }
.acp-form--col { flex-direction: column; align-items: stretch; }
.acp-form--col .acp-input { flex: none; width: 100%; }
.acp-form-row { display: flex; gap: 8px; flex-wrap: wrap; }
.acp-form-row .acp-input { flex: 1; min-width: 120px; }
.acp-types-title { margin-top: 2px; }
.acp-type-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.acp-type-cell { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(195, 159, 106, 0.06); font-size: 12px; cursor: pointer; }
.acp-type-cell.on { border-color: rgba(138, 154, 122, 0.5); background: rgba(138, 154, 122, 0.14); }
.acp-type-check { accent-color: #8a9a7a; }
.acp-hint { margin: 0; font-size: 11px; }
.acp-rule-save { align-self: flex-start; }
</style>
