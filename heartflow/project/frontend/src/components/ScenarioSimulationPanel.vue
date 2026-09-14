<template>
  <section class="ssp" aria-label="情景推演">
    <!-- 面板头 -->
    <div class="ssp-head">
      <div class="ssp-head-left">
        <span class="ssp-title">🔮 情景推演</span>
        <span class="ssp-sub">场景结果 · 决策树 · What-If</span>
      </div>
      <span class="ssp-badge">{{ stats.totalScenarios }} 场景 · {{ stats.totalSimulations }} 模拟</span>
    </div>

    <!-- 标签页 -->
    <div class="ssp-tabs">
      <button v-for="t in tabs" :key="t.key" class="ssp-tab" :class="{ active: tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <!-- 场景页 -->
    <div v-if="tab === 'scenario'" class="ssp-page">
      <div class="ssp-form">
        <input v-model="scnForm.title" class="ssp-input" placeholder="场景标题" />
        <input v-model="scnForm.branch" class="ssp-input" placeholder="所属分支" />
        <input v-model="scnForm.description" class="ssp-input ssp-wide" placeholder="场景描述…" />
        <button class="ssp-btn ssp-add" :disabled="!scnForm.title" @click="addScenario">创建场景</button>
      </div>

      <p v-if="!scenarios.length" class="ssp-empty">还没有场景。先创建一个「如果……会怎样」的假设，再为它推演结果。</p>

      <div v-for="s in scenarios" :key="s.id" class="ssp-card">
        <div class="ssp-card-head">
          <div class="ssp-card-main">
            <span class="ssp-card-title">{{ s.title }}</span>
            <span class="ssp-card-branch">🌿 {{ s.branchId }}</span>
          </div>
          <button class="ssp-btn ssp-mini ssp-del" @click="removeScenario(s.id)">删除</button>
        </div>
        <p v-if="s.description" class="ssp-card-desc">{{ s.description }}</p>

        <!-- 结果列表 -->
        <div v-if="outcomesFor(s.id).length" class="ssp-outcomes">
          <div v-for="o in outcomesFor(s.id)" :key="o.id" class="ssp-outcome">
            <span class="ssp-outcome-label">{{ o.label }}</span>
            <span class="ssp-outcome-impact" :class="'impact-' + o.impact">{{ IMPACT_LABELS[o.impact] }}</span>
            <span class="ssp-outcome-prob">{{ Math.round(o.probability * 100) }}%</span>
          </div>
        </div>

        <!-- 添加结果 -->
        <div class="ssp-form ssp-form-inline">
          <input v-model="outForm.label" class="ssp-input" placeholder="结果标签" />
          <input v-model.number="outForm.probability" type="number" min="0" max="1" step="0.1" class="ssp-input ssp-narrow" placeholder="概率 0-1" />
          <select v-model="outForm.impact" class="ssp-input ssp-narrow" aria-label="影响程度">
            <option v-for="(label, key) in IMPACT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
          <button class="ssp-btn ssp-mini" :disabled="!outForm.label" @click="addOutcome(s.id)">加结果</button>
        </div>

        <!-- 模拟 -->
        <div class="ssp-sim-row">
          <button class="ssp-btn ssp-run" :disabled="!outcomesFor(s.id).length" @click="runSim(s.id)">运行推演</button>
          <span v-if="latestSim(s.id)" class="ssp-sim-result">
            {{ latestSim(s.id)!.recommendation }}
          </span>
        </div>
      </div>
    </div>

    <!-- 决策树页 -->
    <div v-else-if="tab === 'tree'" class="ssp-page">
      <div class="ssp-form">
        <input v-model="treeForm.title" class="ssp-input" placeholder="决策树标题" />
        <input v-model="treeForm.branch" class="ssp-input" placeholder="所属分支" />
        <input v-model="treeForm.question" class="ssp-input ssp-wide" placeholder="根问题（起点）" />
        <button class="ssp-btn ssp-add" :disabled="!treeForm.title" @click="addTree">创建决策树</button>
      </div>

      <p v-if="!decisionTrees.length" class="ssp-empty">还没有决策树。把一次重要决定拆成一棵可以推演的分叉树。</p>

      <div v-for="t in decisionTrees" :key="t.id" class="ssp-card">
        <div class="ssp-card-head">
          <div class="ssp-card-main">
            <span class="ssp-card-title">🌳 {{ t.title }}</span>
            <span class="ssp-card-branch">{{ t.branchId }} · {{ t.totalNodes }} 节点 · {{ t.leafCount }} 叶</span>
          </div>
          <button class="ssp-btn ssp-mini ssp-del" @click="removeTree(t.id)">删除</button>
        </div>
        <div class="ssp-tree">
          <div class="ssp-tree-node root">
            <span class="ssp-tree-q">❓ {{ t.rootNode.question }}</span>
          </div>
          <div v-for="(n, i) in t.rootNode.children" :key="n.id" class="ssp-tree-node child">
            <span class="ssp-tree-choice">{{ n.choiceLabel || '分支 ' + (i + 1) }}</span>
            <span class="ssp-tree-label">{{ n.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- What-If 页 -->
    <div v-else-if="tab === 'whatif'" class="ssp-page">
      <div class="ssp-form">
        <input v-model="wiForm.title" class="ssp-input" placeholder="假设分析标题" />
        <input v-model="wiForm.branch" class="ssp-input" placeholder="基准分支" />
        <button class="ssp-btn ssp-add" :disabled="!wiForm.title" @click="addWhatIf">创建分析</button>
      </div>

      <p v-if="!whatIfAnalyses.length" class="ssp-empty">还没有假设分析。挑一个基准分支，推演「如果参数变了会怎样」。</p>

      <div v-for="a in whatIfAnalyses" :key="a.id" class="ssp-card">
        <div class="ssp-card-head">
          <div class="ssp-card-main">
            <span class="ssp-card-title">🧭 {{ a.title }}</span>
            <span class="ssp-card-branch">基准 · {{ a.baseBranchId }}</span>
          </div>
          <button class="ssp-btn ssp-mini ssp-del" @click="removeWhatIf(a.id)">删除</button>
        </div>

        <div v-if="a.alternatives.length" class="ssp-outcomes">
          <div v-for="alt in a.alternatives" :key="alt.id" class="ssp-outcome">
            <span class="ssp-outcome-label">{{ alt.label }}</span>
            <span class="ssp-outcome-impact" :class="'risk-' + alt.riskLevel">{{ RISK_LABELS[alt.riskLevel] }}</span>
            <span class="ssp-outcome-prob">可行 {{ Math.round(alt.feasibilityScore * 100) }}%</span>
          </div>
        </div>

        <div class="ssp-form ssp-form-inline">
          <input v-model="altForm.label" class="ssp-input" placeholder="备选方案" />
          <button class="ssp-btn ssp-mini" :disabled="!altForm.label" @click="addAlternative(a.id)">加方案</button>
          <button class="ssp-btn ssp-mini ssp-run" :disabled="!a.alternatives.length" @click="evaluate(a.id)">评估排序</button>
        </div>
        <p v-if="bestOf(a.id)" class="ssp-best">最佳方案：{{ bestOf(a.id)!.label }}（可行性 {{ Math.round(bestOf(a.id)!.feasibilityScore * 100) }}%）</p>
      </div>
    </div>

    <!-- 统计页 -->
    <div v-else class="ssp-page">
      <div class="ssp-stats">
        <div class="ssp-stat">
          <span class="ssp-stat-num">{{ stats.totalScenarios }}</span>
          <span class="ssp-stat-label">场景</span>
        </div>
        <div class="ssp-stat">
          <span class="ssp-stat-num">{{ stats.totalSimulations }}</span>
          <span class="ssp-stat-label">模拟</span>
        </div>
        <div class="ssp-stat">
          <span class="ssp-stat-num">{{ stats.totalDecisionTrees }}</span>
          <span class="ssp-stat-label">决策树</span>
        </div>
        <div class="ssp-stat">
          <span class="ssp-stat-num">{{ Math.round(stats.avgConfidence * 100) }}%</span>
          <span class="ssp-stat-label">平均置信</span>
        </div>
      </div>
      <div v-if="stats.totalSimulations" class="ssp-block">
        <div class="ssp-block-title">风险分布</div>
        <div v-for="(count, level) in stats.riskDistribution" :key="level" class="ssp-row">
          <span class="ssp-row-label">{{ RISK_LABELS[level as RiskLevel] }}</span>
          <span class="ssp-row-count">{{ count }} 次</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useScenarioSimulation, IMPACT_LABELS } from '../modules/parallel-world/scenario-sim'
import type { ScenarioOutcome } from '../modules/parallel-world/scenario-sim'

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

const RISK_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '极高',
}

const engine = useScenarioSimulation()

const tab = ref<'scenario' | 'tree' | 'whatif' | 'stats'>('scenario')
const tabs: { key: 'scenario' | 'tree' | 'whatif' | 'stats'; label: string }[] = [
  { key: 'scenario', label: '场景' },
  { key: 'tree', label: '决策树' },
  { key: 'whatif', label: 'What-If' },
  { key: 'stats', label: '统计' },
]

const scnForm = reactive({ title: '', description: '', branch: '' })
const outForm = reactive({ label: '', probability: 0.5, impact: 'medium' as ScenarioOutcome['impact'] })
const treeForm = reactive({ title: '', branch: '', question: '' })
const wiForm = reactive({ title: '', branch: '' })
const altForm = reactive({ label: '' })

const scenarios = computed(() => engine.scenarios.value)
const decisionTrees = computed(() => engine.decisionTrees.value)
const whatIfAnalyses = computed(() => engine.whatIfAnalyses.value)
const stats = computed(() => engine.getSimulationStats())

function addScenario() {
  engine.createScenario(scnForm.title.trim(), scnForm.description.trim(), scnForm.branch.trim() || '主干')
  scnForm.title = ''
  scnForm.description = ''
  scnForm.branch = ''
}

function removeScenario(id: string) {
  engine.removeScenario(id)
}

function outcomesFor(scenarioId: string) {
  return engine.getOutcomesForScenario(scenarioId)
}

function addOutcome(scenarioId: string) {
  engine.addOutcome(scenarioId, outForm.label.trim(), '', outForm.probability, outForm.impact, outForm.label.trim())
  outForm.label = ''
}

function runSim(scenarioId: string) {
  engine.runSimulation(scenarioId, '')
}

function latestSim(scenarioId: string) {
  return engine.getLatestSimulation(scenarioId)
}

function addTree() {
  engine.createDecisionTree(treeForm.title.trim(), '', treeForm.branch.trim() || '主干', treeForm.question.trim() || '如何选择？')
  treeForm.title = ''
  treeForm.branch = ''
  treeForm.question = ''
}

function removeTree(id: string) {
  engine.removeDecisionTree(id)
}

function addWhatIf() {
  engine.createWhatIfAnalysis(wiForm.title.trim(), '', wiForm.branch.trim() || '主干')
  wiForm.title = ''
  wiForm.branch = ''
}

function removeWhatIf(id: string) {
  engine.removeWhatIfAnalysis(id)
}

function addAlternative(analysisId: string) {
  engine.addAlternative(analysisId, altForm.label.trim(), '', {})
  altForm.label = ''
}

function evaluate(analysisId: string) {
  engine.evaluateAlternatives(analysisId)
}

function bestOf(analysisId: string) {
  return engine.evaluateAlternatives(analysisId).best
}
</script>

<style scoped>
.ssp {
  margin-top: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.ssp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.ssp-head-left { display: flex; flex-direction: column; gap: 2px; }
.ssp-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.ssp-sub { font-size: 12px; opacity: 0.72; }
.ssp-badge {
  padding: 3px 12px; border-radius: 999px;
  background: rgba(195, 159, 106, 0.16); border: 1px solid rgba(195, 159, 106, 0.4);
  color: #d9c390; font-size: 12px; white-space: nowrap;
}
.ssp-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }

.ssp-tabs { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.ssp-tab {
  padding: 4px 14px; border-radius: 999px; font-size: 12px;
  border: 1px solid rgba(195, 159, 106, 0.2); background: transparent;
  color: #c9bea6; cursor: pointer;
}
.ssp-tab.active { background: rgba(195, 159, 106, 0.18); border-color: rgba(195, 159, 106, 0.45); color: #f0d9a8; }

.ssp-page { display: flex; flex-direction: column; gap: 10px; }
.ssp-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ssp-form-inline { margin-top: 6px; }
.ssp-wide { flex-basis: 100%; }
.ssp-input {
  flex: 1; min-width: 110px; padding: 6px 10px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(20, 24, 20, 0.45);
  color: #e8ddc8; font-size: 12px;
}
.ssp-narrow { flex: 0.5; min-width: 80px; }
.ssp-btn {
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.4); background: rgba(195, 159, 106, 0.14);
  color: #e8d9a8; font-size: 12px; cursor: pointer;
}
.ssp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ssp-add { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.ssp-run { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }
.ssp-mini { padding: 2px 10px; font-size: 11px; }
.ssp-del { background: rgba(196, 106, 90, 0.16); border-color: rgba(196, 106, 90, 0.4); color: #e0a08a; }

.ssp-card {
  border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px;
  background: rgba(195, 159, 106, 0.06);
}
.ssp-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ssp-card-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ssp-card-title { font-size: 13px; font-weight: 600; color: #f0d9a8; }
.ssp-card-branch { font-size: 11px; color: #8a9a7a; }
.ssp-card-desc { font-size: 12px; color: #e0d4ba; line-height: 1.6; margin: 6px 0 0; }

.ssp-outcomes { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
.ssp-outcome { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.ssp-outcome-label { flex: 1; color: #e8ddc8; }
.ssp-outcome-impact { padding: 1px 8px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.ssp-outcome-impact.impact-very-high, .ssp-outcome-impact.risk-critical { background: rgba(196, 106, 90, 0.2); color: #e0a08a; }
.ssp-outcome-impact.impact-high, .ssp-outcome-impact.risk-high { background: rgba(196, 106, 90, 0.14); color: #e0b08a; }
.ssp-outcome-impact.impact-medium, .ssp-outcome-impact.risk-medium { background: rgba(195, 159, 106, 0.16); color: #d9c390; }
.ssp-outcome-impact.impact-low, .ssp-outcome-impact.impact-very-low, .ssp-outcome-impact.risk-low { background: rgba(138, 154, 122, 0.18); color: #a9c08a; }
.ssp-outcome-prob { font-size: 11px; color: #8a8a80; white-space: nowrap; }

.ssp-sim-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
.ssp-sim-result { font-size: 12px; color: #cfe0b0; line-height: 1.6; flex: 1; min-width: 160px; }

.ssp-tree { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.ssp-tree-node { display: flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 8px; font-size: 12px; }
.ssp-tree-node.root { background: rgba(195, 159, 106, 0.1); border: 1px solid rgba(195, 159, 106, 0.25); }
.ssp-tree-node.child { margin-left: 18px; background: rgba(138, 154, 122, 0.08); border: 1px solid rgba(138, 154, 122, 0.2); }
.ssp-tree-q { color: #f0d9a8; }
.ssp-tree-choice { padding: 1px 8px; border-radius: 999px; background: rgba(138, 154, 122, 0.2); color: #a9c08a; font-size: 11px; white-space: nowrap; }
.ssp-tree-label { color: #e0d4ba; }

.ssp-best { font-size: 12px; color: #cfe0b0; margin: 6px 0 0; }

.ssp-stats { display: flex; gap: 8px; flex-wrap: wrap; }
.ssp-stat {
  flex: 1; min-width: 72px; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 6px; border-radius: 10px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(195, 159, 106, 0.06);
}
.ssp-stat-num { font-size: 20px; font-weight: 700; color: #f0d9a8; }
.ssp-stat-label { font-size: 11px; color: #8a9a7a; }
.ssp-block { border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px; background: rgba(195, 159, 106, 0.06); }
.ssp-block-title { font-size: 12px; font-weight: 700; color: #d9c390; margin-bottom: 6px; }
.ssp-row { display: flex; align-items: center; justify-content: space-between; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.ssp-row-label { color: #e8ddc8; }
.ssp-row-count { color: #8a8a80; }
</style>
