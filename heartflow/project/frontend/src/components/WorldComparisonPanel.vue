<template>
  <section class="wcp" aria-label="世界对照">
    <!-- 面板头 -->
    <div class="wcp-head">
      <div class="wcp-head-left">
        <span class="wcp-title">🪞 世界对照</span>
        <span class="wcp-sub">分支对比 · 相似度 · 分歧识别</span>
      </div>
      <span class="wcp-badge">{{ engine.totalComparisons.value }} 次对比</span>
    </div>

    <!-- 空态 -->
    <p v-if="branches.length < 2" class="wcp-empty">
      至少需要两个时间分支才能对照。先在「分支星图」种下分支与检查点，再让两个世界彼此映照。
    </p>

    <template v-else>
      <!-- 选择对比对象 -->
      <div class="wcp-form">
        <select v-model="branchAId" class="wcp-input" aria-label="分支 A">
          <option v-for="b in branches" :key="'a-' + b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <span class="wcp-arrow">⇄</span>
        <select v-model="branchBId" class="wcp-input" aria-label="分支 B">
          <option v-for="b in branches" :key="'b-' + b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <button class="wcp-btn wcp-run" :disabled="!canCompare" @click="compare">对照</button>
        <button class="wcp-btn" :disabled="branches.length < 2" @click="generateReport">生成报告</button>
      </div>

      <!-- 对比结果 -->
      <div v-if="comparison" class="wcp-result">
        <div class="wcp-result-head">
          <span class="wcp-similarity" :class="simClass">
            {{ Math.round(comparison.overallSimilarity * 100) }}% 相似
          </span>
          <span class="wcp-result-name">{{ comparison.name }}</span>
        </div>

        <!-- 维度相似度 -->
        <div class="wcp-block">
          <div class="wcp-block-title">维度相似度</div>
          <div v-for="s in comparison.similarityScores" :key="s.dimension" class="wcp-dim">
            <div class="wcp-dim-head">
              <span class="wcp-dim-label">{{ s.label }}</span>
              <span class="wcp-dim-value">{{ Math.round(s.score * 100) }}%</span>
            </div>
            <div class="wcp-dim-bar">
              <div class="wcp-dim-fill" :style="{ width: Math.round(s.score * 100) + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- 分歧点 -->
        <div v-if="comparison.divergencePoints.length" class="wcp-block">
          <div class="wcp-block-title">分歧点（{{ comparison.divergencePoints.length }}）</div>
          <div v-for="d in comparison.divergencePoints" :key="d.id" class="wcp-divergence">
            <span class="wcp-divergence-sev" :class="'sev-' + sevClass(d.severity)">{{ Math.round(d.severity * 100) }}%</span>
            <span class="wcp-divergence-desc">{{ d.description }}</span>
          </div>
        </div>

        <!-- 关键差异 -->
        <div v-if="comparison.keyDifferences.length" class="wcp-block">
          <div class="wcp-block-title">关键差异</div>
          <ul class="wcp-diff-list">
            <li v-for="(d, i) in comparison.keyDifferences" :key="i" class="wcp-diff">• {{ d }}</li>
          </ul>
        </div>

        <!-- 检查点对比 -->
        <div class="wcp-block">
          <div class="wcp-block-title">检查点对比</div>
          <div class="wcp-cp-grid">
            <div class="wcp-cp-stat">
              <span class="wcp-cp-num">{{ comparison.checkpointComparison.aCount }}</span>
              <span class="wcp-cp-label">{{ branchName(comparison.branchA.id) }}</span>
            </div>
            <div class="wcp-cp-stat">
              <span class="wcp-cp-num">{{ comparison.checkpointComparison.sharedCount }}</span>
              <span class="wcp-cp-label">共享</span>
            </div>
            <div class="wcp-cp-stat">
              <span class="wcp-cp-num">{{ comparison.checkpointComparison.bCount }}</span>
              <span class="wcp-cp-label">{{ branchName(comparison.branchB.id) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 报告 -->
      <div v-if="report" class="wcp-block wcp-report">
        <div class="wcp-block-title">📄 {{ report.name }}</div>
        <div class="wcp-report-row">
          <span class="wcp-report-label">最相似</span>
          <span v-for="(p, i) in report.mostSimilarPairs" :key="'s' + i" class="wcp-report-pair">
            「{{ p.branchAName }}」vs「{{ p.branchBName }}」{{ Math.round(p.similarity * 100) }}%
          </span>
        </div>
        <div class="wcp-report-row">
          <span class="wcp-report-label">最分歧</span>
          <span v-for="(p, i) in report.mostDivergentPairs" :key="'d' + i" class="wcp-report-pair">
            「{{ p.branchAName }}」vs「{{ p.branchBName }}」{{ Math.round(p.similarity * 100) }}%
          </span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorldComparison } from '../modules/parallel-world/world-comparison'
import type { WorldBranch, Checkpoint } from '../modules/parallel-world/types'
import type { WorldComparison } from '../modules/parallel-world/world-comparison'

const props = defineProps<{
  branches: WorldBranch[]
  checkpoints: Checkpoint[]
}>()

const engine = useWorldComparison()

const branchAId = ref(props.branches[0]?.id ?? '')
const branchBId = ref(props.branches[1]?.id ?? '')
const comparison = ref<WorldComparison | null>(null)
const report = ref(engine.getLatestReport() ?? null)

const canCompare = computed(() => {
  if (!branchAId.value || !branchBId.value) return false
  return branchAId.value !== branchBId.value
})

const simClass = computed(() => {
  if (!comparison.value) return ''
  const s = comparison.value.overallSimilarity
  if (s >= 0.8) return 'sim-high'
  if (s >= 0.6) return 'sim-mid'
  if (s >= 0.3) return 'sim-low'
  return 'sim-none'
})

function compare() {
  const a = props.branches.find(b => b.id === branchAId.value)
  const b = props.branches.find(b => b.id === branchBId.value)
  if (!a || !b) return
  comparison.value = engine.compareWorlds(a, b, props.checkpoints, props.branches)
}

function generateReport() {
  report.value = engine.generateComparisonReport(props.branches, props.checkpoints, props.branches)
}

function branchName(id: string): string {
  return props.branches.find(b => b.id === id)?.name ?? id
}

function sevClass(sev: number): string {
  if (sev >= 0.7) return 'critical'
  if (sev >= 0.4) return 'warning'
  return 'info'
}
</script>

<style scoped>
.wcp {
  margin-top: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.wcp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.wcp-head-left { display: flex; flex-direction: column; gap: 2px; }
.wcp-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.wcp-sub { font-size: 12px; opacity: 0.72; }
.wcp-badge {
  padding: 3px 12px; border-radius: 999px;
  background: rgba(195, 159, 106, 0.16); border: 1px solid rgba(195, 159, 106, 0.4);
  color: #d9c390; font-size: 12px; white-space: nowrap;
}
.wcp-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }

.wcp-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.wcp-input {
  flex: 1; min-width: 110px; padding: 6px 10px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.22); background: rgba(20, 24, 20, 0.45);
  color: #e8ddc8; font-size: 12px;
}
.wcp-arrow { color: #8a9a7a; }
.wcp-btn {
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(195, 159, 106, 0.4); background: rgba(195, 159, 106, 0.14);
  color: #e8d9a8; font-size: 12px; cursor: pointer;
}
.wcp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.wcp-run { background: rgba(138, 154, 122, 0.2); border-color: rgba(138, 154, 122, 0.5); color: #cfe0b0; }

.wcp-result { display: flex; flex-direction: column; gap: 8px; }
.wcp-result-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.wcp-similarity { font-size: 14px; font-weight: 700; padding: 3px 12px; border-radius: 999px; }
.wcp-similarity.sim-high { background: rgba(138, 154, 122, 0.2); color: #a9c08a; }
.wcp-similarity.sim-mid { background: rgba(195, 159, 106, 0.18); color: #d9c390; }
.wcp-similarity.sim-low { background: rgba(196, 106, 90, 0.16); color: #e0a08a; }
.wcp-similarity.sim-none { background: rgba(196, 106, 90, 0.24); color: #e0a08a; }
.wcp-result-name { font-size: 12px; color: #8a8a80; }

.wcp-block { border: 1px solid rgba(195, 159, 106, 0.22); border-radius: 10px; padding: 10px 12px; background: rgba(195, 159, 106, 0.06); }
.wcp-block-title { font-size: 12px; font-weight: 700; color: #d9c390; margin-bottom: 6px; }

.wcp-dim { margin-bottom: 5px; }
.wcp-dim-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
.wcp-dim-label { color: #e8ddc8; }
.wcp-dim-value { color: #f0d9a8; font-weight: 600; }
.wcp-dim-bar { height: 6px; border-radius: 999px; background: rgba(195, 159, 106, 0.12); overflow: hidden; }
.wcp-dim-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #c4956a, #8a9a7a); }

.wcp-divergence { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; border-bottom: 1px dashed rgba(195, 159, 106, 0.12); }
.wcp-divergence-sev { padding: 1px 8px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.wcp-divergence-sev.sev-critical { background: rgba(196, 106, 90, 0.2); color: #e0a08a; }
.wcp-divergence-sev.sev-warning { background: rgba(195, 159, 106, 0.16); color: #d9c390; }
.wcp-divergence-sev.sev-info { background: rgba(138, 154, 122, 0.18); color: #a9c08a; }
.wcp-divergence-desc { flex: 1; color: #e0d4ba; }

.wcp-diff-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
.wcp-diff { font-size: 12px; color: #e0d4ba; line-height: 1.6; }

.wcp-cp-grid { display: flex; gap: 8px; }
.wcp-cp-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px; border-radius: 8px; background: rgba(195, 159, 106, 0.05); }
.wcp-cp-num { font-size: 18px; font-weight: 700; color: #f0d9a8; }
.wcp-cp-label { font-size: 11px; color: #8a9a7a; }

.wcp-report { margin-top: 8px; }
.wcp-report-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 3px 0; font-size: 12px; }
.wcp-report-label { color: #d9c390; white-space: nowrap; }
.wcp-report-pair { padding: 1px 8px; border-radius: 999px; background: rgba(195, 159, 106, 0.1); color: #e0d4ba; font-size: 11px; }
</style>
