<template>
  <section class="lpp">
    <div class="lpp-head">
      <div class="lpp-title-wrap">
        <span class="lpp-title">🧭 学习路径</span>
        <span class="lpp-sub">把技能缺口拆成可执行的路径，一步步走完</span>
      </div>
      <span v-if="paths.length" class="lpp-tag">{{ paths.length }} 条路径</span>
    </div>

    <!-- 统计总览 -->
    <div class="lpp-metrics">
      <div class="lpp-metric">
        <b>{{ stats.total }}</b>
        <span>路径总数</span>
      </div>
      <div class="lpp-metric">
        <b>{{ stats.inProgress }}</b>
        <span>进行中</span>
      </div>
      <div class="lpp-metric">
        <b>{{ stats.completed }}</b>
        <span>已完成</span>
      </div>
      <div class="lpp-metric">
        <b>{{ stats.avgProgress }}%</b>
        <span>平均进度</span>
      </div>
    </div>

    <!-- 技能缺口分析 -->
    <div class="lpp-block">
      <span class="lpp-block-label">技能缺口分析</span>
      <div class="lpp-form">
        <div class="lpp-form-row">
          <input
            v-model="targetRole"
            class="lpp-input"
            type="text"
            placeholder="目标角色，如：技术负责人"
          />
          <button
            class="lpp-btn"
            :disabled="!requiredSkills.length"
            @click="runAnalysis"
          >分析缺口</button>
        </div>
        <div class="lpp-req-row">
          <input
            v-model="reqName"
            class="lpp-input lpp-input--sm"
            type="text"
            placeholder="技能名称"
            @keyup.enter="addRequiredSkill"
          />
          <select v-model="reqCategory" class="lpp-select">
            <option v-for="(m, k) in SKILL_CATEGORY_META" :key="k" :value="k">{{ m.label }}</option>
          </select>
          <select v-model="reqLevel" class="lpp-select">
            <option v-for="(m, k) in PROFICIENCY_META" :key="k" :value="k">{{ m.label }}</option>
          </select>
          <button class="lpp-btn lpp-btn--ghost" @click="addRequiredSkill">＋ 添加</button>
        </div>
        <div v-if="requiredSkills.length" class="lpp-chips">
          <span v-for="(r, i) in requiredSkills" :key="i" class="lpp-chip">
            {{ r.name }} · {{ SKILL_CATEGORY_META[r.category].label }} → {{ PROFICIENCY_META[r.targetProficiency].label }}
            <button class="lpp-chip-x" @click="removeRequiredSkill(i)" title="移除">✕</button>
          </span>
        </div>
        <p v-if="!requiredSkills.length" class="lpp-hint">添加目标技能与期望熟练度，对照现有技能图谱测算缺口</p>
      </div>

      <!-- 缺口结果 -->
      <div v-if="gaps.length" class="lpp-gaps">
        <div v-for="g in gaps" :key="g.currentSkill.name" class="lpp-gap">
          <div class="lpp-gap-head">
            <span class="lpp-gap-name">{{ g.currentSkill.name }}</span>
            <span class="lpp-gap-level">
              {{ PROFICIENCY_META[g.currentSkill.proficiency].label }} → {{ PROFICIENCY_META[g.targetProficiency].label }}
            </span>
            <span class="lpp-gap-hours">{{ g.estimatedHours }}h</span>
          </div>
          <div class="lpp-gap-bar">
            <i :style="{ width: gapPct(g) }"></i>
          </div>
        </div>
        <div class="lpp-gen-row">
          <select v-model="genType" class="lpp-select">
            <option v-for="(m, k) in LEARNING_PATH_TYPE_META" :key="k" :value="k">{{ m.label }}</option>
          </select>
          <button class="lpp-btn lpp-btn--primary" @click="generatePath">生成学习路径</button>
        </div>
      </div>
    </div>

    <!-- 路径列表 -->
    <div class="lpp-block">
      <span class="lpp-block-label">路径列表</span>
      <div v-if="!paths.length" class="lpp-empty">
        <span class="lpp-empty-icon">🛤</span>
        <p class="lpp-empty-text">还没有学习路径，先分析技能缺口并生成一条吧</p>
      </div>
      <div v-else class="lpp-paths">
        <div
          v-for="p in sortedPaths"
          :key="p.id"
          class="lpp-path"
          :style="{ '--path-accent': pathAccent(p) }"
        >
          <div class="lpp-path-head">
            <span class="lpp-path-icon">{{ LEARNING_PATH_TYPE_META[p.type].icon }}</span>
            <div class="lpp-path-title-wrap">
              <b class="lpp-path-name">{{ p.name }}</b>
              <span class="lpp-path-meta">目标：{{ p.targetRole }} · {{ p.nodes.length }} 节点 · {{ p.totalEstimatedHours }}h</span>
            </div>
            <span class="lpp-path-pct">{{ p.progress }}%</span>
          </div>
          <div class="lpp-path-bar">
            <i :style="{ width: p.progress + '%' }"></i>
          </div>
          <div class="lpp-path-foot">
            <button class="lpp-path-toggle" @click="toggleExpand(p.id)">
              {{ expandedId === p.id ? '收起节点' : '查看节点' }}
            </button>
            <span class="lpp-path-done">{{ p.nodes.filter(n => n.completed).length }}/{{ p.nodes.length }} 已完成</span>
          </div>
          <div v-if="expandedId === p.id" class="lpp-nodes">
            <div
              v-for="n in p.nodes"
              :key="n.id"
              class="lpp-node"
              :class="{ done: n.completed }"
            >
              <button class="lpp-node-check" @click="toggleNode(p.id, n.id)">
                {{ n.completed ? '✓' : '' }}
              </button>
              <div class="lpp-node-body">
                <span class="lpp-node-name">{{ n.skillName }}</span>
                <span class="lpp-node-meta">Lv.{{ n.level }} · {{ n.estimatedHours }}h</span>
              </div>
              <span v-if="n.completedAt" class="lpp-node-date">{{ fmtDate(n.completedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLearningPath, LEARNING_PATH_TYPE_META } from '../modules/career/skill-path'
import { SKILL_CATEGORY_META, PROFICIENCY_META } from '../modules/career/skill-map'
import type { SkillNode, SkillCategory, ProficiencyLevel } from '../modules/career/skill-map'
import type { SkillGap, LearningPathType, LearningPath } from '../modules/career/skill-path'

const props = defineProps<{ skills: SkillNode[] }>()

const lp = useLearningPath()
lp.loadAll()

const paths = computed(() => lp.learningPaths.value)

const stats = computed(() => {
  const total = paths.value.length
  const completed = paths.value.filter(p => p.progress === 100).length
  const inProgress = total - completed
  const avgProgress = total > 0
    ? Math.round(paths.value.reduce((s, p) => s + p.progress, 0) / total)
    : 0
  return { total, completed, inProgress, avgProgress }
})

const sortedPaths = computed(() =>
  [...paths.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
)

// ---- 缺口分析 ----
const targetRole = ref('')
const reqName = ref('')
const reqCategory = ref<SkillCategory>('technical')
const reqLevel = ref<ProficiencyLevel>('intermediate')
const requiredSkills = ref<{ name: string; category: SkillCategory; targetProficiency: ProficiencyLevel }[]>([])
const gaps = ref<SkillGap[]>([])
const genType = ref<LearningPathType>('linear')

function addRequiredSkill() {
  const name = reqName.value.trim()
  if (!name) return
  requiredSkills.value.push({ name, category: reqCategory.value, targetProficiency: reqLevel.value })
  reqName.value = ''
}

function removeRequiredSkill(i: number) {
  requiredSkills.value.splice(i, 1)
}

function runAnalysis() {
  if (!requiredSkills.value.length) return
  gaps.value = lp.analyzeSkillGaps(props.skills, targetRole.value || '目标角色', requiredSkills.value)
}

function gapPct(g: SkillGap) {
  return Math.min(Math.round((g.gapSize / 5) * 100), 100) + '%'
}

function generatePath() {
  if (!gaps.value.length) return
  lp.generatePathFromGaps(gaps.value, targetRole.value || '目标角色', genType.value)
  gaps.value = []
  requiredSkills.value = []
  targetRole.value = ''
}

// ---- 路径交互 ----
const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function toggleNode(pathId: string, nodeId: string) {
  lp.completeNode(pathId, nodeId)
}

const PATH_ACCENTS: Record<LearningPathType, string> = {
  linear: '#8a9a7a',
  branching: '#6b9fc4',
  spiral: '#b5707a',
  't-shaped': '#f0c040',
  'pi-shaped': '#d98c7a',
}

function pathAccent(p: LearningPath) {
  return PATH_ACCENTS[p.type] || '#8a9a7a'
}

function fmtDate(iso: string) {
  return iso.slice(0, 10)
}

onMounted(() => {
  lp.loadAll()
})
</script>

<style scoped>
.lpp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.lpp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.lpp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.lpp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.lpp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.lpp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.7); white-space: nowrap; }

.lpp-metrics { display: flex; gap: 8px; margin-bottom: 16px; }
.lpp-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.lpp-metric b { font-size: 18px; font-weight: 600; color: var(--text-high, #d8c3a5); font-variant-numeric: tabular-nums; }
.lpp-metric span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.lpp-block { display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid rgba(var(--accent-rgb), 0.1); }
.lpp-block-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }

.lpp-form { display: flex; flex-direction: column; gap: 8px; }
.lpp-form-row { display: flex; gap: 8px; }
.lpp-req-row { display: flex; gap: 8px; flex-wrap: wrap; }
.lpp-input {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(255,255,255,0.08));
  background: rgba(255,255,255,0.02);
  color: var(--text-high, #d8c3a5);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
}
.lpp-input--sm { flex: 0 0 150px; }
.lpp-input::placeholder { color: rgba(232, 221, 208, 0.35); }
.lpp-input:focus { border-color: rgba(var(--accent-rgb), 0.3); }
.lpp-select {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(255,255,255,0.08));
  background: rgba(255,255,255,0.02);
  color: rgba(232, 221, 208, 0.7);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.lpp-select:focus { border-color: rgba(var(--accent-rgb), 0.3); }
.lpp-btn {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(255,255,255,0.1));
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}
.lpp-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); }
.lpp-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.lpp-btn--ghost { background: transparent; color: rgba(232, 221, 208, 0.6); }
.lpp-btn--ghost:hover:not(:disabled) { color: rgba(232, 221, 208, 0.85); background: rgba(255,255,255,0.04); }
.lpp-btn--primary { background: rgba(var(--accent-rgb), 0.16); color: var(--text-high, #d8c3a5); }

.lpp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.lpp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.7);
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.14);
}
.lpp-chip-x {
  border: none;
  background: none;
  color: rgba(232, 221, 208, 0.4);
  font-size: 10px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.lpp-chip-x:hover { color: rgba(232, 221, 208, 0.85); }
.lpp-hint { font-size: 10px; color: rgba(232, 221, 208, 0.35); margin: 0; }

.lpp-gaps { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.lpp-gap { display: flex; flex-direction: column; gap: 4px; }
.lpp-gap-head { display: flex; align-items: center; gap: 8px; }
.lpp-gap-name { font-size: 12px; color: var(--text-high, #d8c3a5); flex: 1; }
.lpp-gap-level { font-size: 10px; color: rgba(232, 221, 208, 0.5); }
.lpp-gap-hours { font-size: 10px; color: rgba(var(--accent-rgb), 0.6); font-variant-numeric: tabular-nums; }
.lpp-gap-bar { height: 5px; border-radius: 999px; background: rgba(255,255,255,0.05); overflow: hidden; }
.lpp-gap-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #8a9a7a, #c46a5a); }
.lpp-gen-row { display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-top: 4px; }

.lpp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 0; text-align: center; }
.lpp-empty-icon { font-size: 30px; opacity: 0.5; }
.lpp-empty-text { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.lpp-paths { display: flex; flex-direction: column; gap: 10px; }
.lpp-path {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lpp-path-head { display: flex; align-items: center; gap: 10px; }
.lpp-path-icon { font-size: 20px; flex-shrink: 0; }
.lpp-path-title-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lpp-path-name { font-size: 13px; color: var(--text-high, #d8c3a5); font-weight: 500; }
.lpp-path-meta { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.lpp-path-pct { font-size: 15px; font-weight: 600; color: var(--path-accent, #8a9a7a); font-variant-numeric: tabular-nums; }
.lpp-path-bar { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.05); overflow: hidden; }
.lpp-path-bar i { display: block; height: 100%; border-radius: 999px; background: var(--path-accent, #8a9a7a); transition: width 0.4s ease; }
.lpp-path-foot { display: flex; align-items: center; justify-content: space-between; }
.lpp-path-toggle {
  border: none;
  background: none;
  padding: 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.6);
  cursor: pointer;
  font-family: inherit;
}
.lpp-path-toggle:hover { color: rgba(var(--accent-rgb), 0.9); }
.lpp-path-done { font-size: 10px; color: rgba(232, 221, 208, 0.4); font-variant-numeric: tabular-nums; }

.lpp-nodes { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
.lpp-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
  transition: all 0.25s ease;
}
.lpp-node.done { opacity: 0.55; }
.lpp-node-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: transparent;
  color: var(--path-accent, #8a9a7a);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  padding: 0;
  font-family: inherit;
}
.lpp-node.done .lpp-node-check { background: var(--path-accent, #8a9a7a); border-color: var(--path-accent, #8a9a7a); color: #0e110e; }
.lpp-node-body { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px; }
.lpp-node-name { font-size: 12px; color: var(--text-high, #d8c3a5); }
.lpp-node.done .lpp-node-name { text-decoration: line-through; }
.lpp-node-meta { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.lpp-node-date { font-size: 10px; color: rgba(232, 221, 208, 0.3); }
</style>
