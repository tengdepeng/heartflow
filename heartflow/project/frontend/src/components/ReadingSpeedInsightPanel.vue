<template>
  <section class="rsi" aria-label="阅读速度·洞察">
    <div class="rsi-head">
      <span class="rsi-title">⚡ 阅读速度 · 洞察</span>
      <span class="rsi-sub">追踪阅读节奏，编织知识网络</span>
    </div>

    <!-- 速度概览 -->
    <div class="rsi-grid">
      <div class="rsi-stat">
        <span class="rsi-stat-num">{{ stats.averageWPM }}</span>
        <span class="rsi-stat-label">均速(字/分)</span>
      </div>
      <div class="rsi-stat">
        <span class="rsi-stat-num">{{ stats.recentWPM }}</span>
        <span class="rsi-stat-label">近5次均速</span>
      </div>
      <div class="rsi-stat">
        <span class="rsi-stat-num">{{ trendText }}</span>
        <span class="rsi-stat-label">速度趋势</span>
      </div>
      <div class="rsi-stat">
        <span class="rsi-stat-num">{{ Math.round(stats.averageComprehension * 100) }}%</span>
        <span class="rsi-stat-label">平均理解率</span>
      </div>
    </div>

    <!-- 目标进度 -->
    <div class="rsi-card">
      <h4 class="rsi-h">速度目标</h4>
      <div class="rsi-goal">
        <div class="rsi-goal-row">
          <span>速度 {{ goal.targetWPM }} 字/分</span>
          <span class="rsi-goal-pct">{{ goalProgress.speedPercent }}%</span>
        </div>
        <div class="rsi-track"><i class="rsi-fill" :style="{ width: goalProgress.speedPercent + '%' }"></i></div>
        <div class="rsi-goal-row">
          <span>理解率 {{ Math.round(goal.targetComprehension * 100) }}%</span>
          <span class="rsi-goal-pct">{{ goalProgress.comprehensionPercent }}%</span>
        </div>
        <div class="rsi-track"><i class="rsi-fill" :style="{ width: goalProgress.comprehensionPercent + '%' }"></i></div>
        <p class="rsi-progress-label">
          进度：{{ goal.progress }}（综合 {{ goalProgress.overallPercent }}%）· 截止 {{ fmtDate(goal.deadline) }}
        </p>
      </div>
    </div>

    <!-- 趋势走势 -->
    <div class="rsi-card" v-if="trend.points.length">
      <h4 class="rsi-h">近 30 天速度走势</h4>
      <svg class="rsi-spark" :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`" role="img" aria-label="阅读速度走势">
        <polyline class="rsi-spark-line" :points="sparkPoints" />
      </svg>
      <p class="rsi-trend-meta">
        方向：{{ dirText }} · 变化率 {{ trend.changeRate }}% · 最佳日
        {{ trend.bestDay.date || '—' }} ({{ trend.bestDay.wpm }} 字/分)
      </p>
    </div>
    <div class="rsi-card" v-else>
      <p class="rsi-empty-text">暂无速度记录，先在下方登记一次阅读速度。</p>
    </div>

    <!-- 个性化建议 -->
    <div class="rsi-card">
      <h4 class="rsi-h">个性化建议</h4>
      <ul class="rsi-recs">
        <li v-for="(r, i) in recommendations" :key="i" class="rsi-rec" :class="'pri-' + r.priority">
          <div class="rsi-rec-top">
            <span class="rsi-rec-title">{{ r.title }}</span>
            <span class="rsi-rec-tag">{{ typeLabel(r.type) }}</span>
          </div>
          <p class="rsi-rec-desc">{{ r.description }}</p>
          <span class="rsi-rec-impact">{{ r.estimatedImpact }}</span>
        </li>
      </ul>
    </div>

    <!-- 登记速度 -->
    <div class="rsi-card">
      <h4 class="rsi-h">登记一次阅读速度</h4>
      <div class="rsi-form">
        <label class="rsi-field">
          <span>书籍</span>
          <select v-model="form.bookId" class="rsi-input">
            <option value="">— 选择书架书目 —</option>
            <option v-for="b in bookOptions" :key="b.id" :value="b.id">{{ b.title }}</option>
          </select>
        </label>
        <label class="rsi-field">
          <span>阅读页数</span>
          <input class="rsi-input" type="number" min="1" v-model.number="form.pagesRead" />
        </label>
        <label class="rsi-field">
          <span>时长(分钟)</span>
          <input class="rsi-input" type="number" min="1" v-model.number="form.duration" />
        </label>
        <label class="rsi-field">
          <span>理解率(%)</span>
          <input class="rsi-input" type="number" min="0" max="100" v-model.number="form.comprehension" />
        </label>
        <label class="rsi-field">
          <span>难度(1-5)</span>
          <input class="rsi-input" type="number" min="1" max="5" v-model.number="form.difficulty" />
        </label>
        <button class="rsi-btn" :disabled="!canRecord" @click="onRecord">登记</button>
      </div>
    </div>

    <!-- 设定目标 -->
    <div class="rsi-card">
      <h4 class="rsi-h">设定速度目标</h4>
      <div class="rsi-form">
        <label class="rsi-field">
          <span>目标速度(字/分)</span>
          <input class="rsi-input" type="number" min="1" v-model.number="goalForm.targetWPM" />
        </label>
        <label class="rsi-field">
          <span>目标理解率(%)</span>
          <input class="rsi-input" type="number" min="0" max="100" v-model.number="goalForm.targetComprehension" />
        </label>
        <label class="rsi-field">
          <span>截止日期</span>
          <input class="rsi-input" type="date" v-model="goalForm.deadline" />
        </label>
        <button class="rsi-btn" :disabled="!canSetGoal" @click="onSetGoal">保存目标</button>
      </div>
    </div>

    <!-- 知识节点 -->
    <div class="rsi-card">
      <h4 class="rsi-h">知识节点（{{ knowledgeStats.totalNodes }}）</h4>
      <ul class="rsi-nodes">
        <li v-for="n in knowledgeNodes" :key="n.id" class="rsi-node" :class="'ntype-' + n.type">
          <div class="rsi-node-top">
            <span class="rsi-node-label">{{ n.label }}</span>
            <span class="rsi-node-type">{{ typeLabel(n.type) }}</span>
          </div>
          <p class="rsi-node-content">{{ n.content }}</p>
          <div class="rsi-node-meta">
            <span>来源：{{ n.sourceBookName || '—' }}</span>
            <span>关联 {{ n.connections.length }}</span>
          </div>
        </li>
      </ul>
      <p v-if="!knowledgeNodes.length" class="rsi-empty-text">还没有知识节点，在下方添加第一个。</p>
    </div>

    <!-- 新增知识节点 -->
    <div class="rsi-card">
      <h4 class="rsi-h">新增知识节点</h4>
      <div class="rsi-form">
        <label class="rsi-field rsi-field-wide">
          <span>标签</span>
          <input class="rsi-input" v-model="nodeForm.label" placeholder="如：心流状态" />
        </label>
        <label class="rsi-field">
          <span>类型</span>
          <select class="rsi-input" v-model="nodeForm.type">
            <option value="concept">概念</option>
            <option value="fact">事实</option>
            <option value="insight">洞见</option>
            <option value="question">疑问</option>
            <option value="connection">关联</option>
          </select>
        </label>
        <label class="rsi-field rsi-field-wide">
          <span>来源书名</span>
          <input class="rsi-input" v-model="nodeForm.sourceBookName" placeholder="如：心流" />
        </label>
        <label class="rsi-field rsi-field-wide">
          <span>内容</span>
          <textarea class="rsi-input" rows="2" v-model="nodeForm.content" placeholder="摘录或笔记内容……"></textarea>
        </label>
        <button class="rsi-btn" :disabled="!canAddNode" @click="onAddNode">添加</button>
      </div>
    </div>

    <!-- 连接节点 -->
    <div class="rsi-card" v-if="knowledgeNodes.length >= 2">
      <h4 class="rsi-h">连接两个节点</h4>
      <div class="rsi-form rsi-inline">
        <select class="rsi-input" v-model="connectForm.a">
          <option v-for="n in knowledgeNodes" :key="n.id" :value="n.id">{{ n.label }}</option>
        </select>
        <span class="rsi-link">↔</span>
        <select class="rsi-input" v-model="connectForm.b">
          <option v-for="n in knowledgeNodes" :key="n.id" :value="n.id">{{ n.label }}</option>
        </select>
        <button class="rsi-btn" :disabled="!canConnect" @click="onConnect">连接</button>
      </div>
    </div>

    <!-- 阅读计划 -->
    <div class="rsi-card">
      <h4 class="rsi-h">阅读计划（{{ readingPlans.length }}）</h4>
      <ul class="rsi-plans">
        <li v-for="p in readingPlans" :key="p.id" class="rsi-plan" :class="{ done: p.completed }">
          <div class="rsi-plan-top">
            <span class="rsi-plan-name">{{ p.name }}</span>
            <span class="rsi-plan-date">{{ fmtDate(p.targetDate) }}</span>
          </div>
          <p class="rsi-plan-desc">{{ p.description || '—' }}</p>
          <div class="rsi-plan-foot">
            <span class="rsi-plan-books">{{ p.books.length }} 本 · {{ p.completed ? '已完成' : '进行中' }}</span>
            <button v-if="!p.completed" class="rsi-btn-sm" @click="onCompletePlan(p.id)">标记完成</button>
          </div>
        </li>
      </ul>
      <p v-if="!readingPlans.length" class="rsi-empty-text">还没有阅读计划，在下方创建第一个。</p>
    </div>

    <!-- 新增计划 -->
    <div class="rsi-card">
      <h4 class="rsi-h">新增阅读计划</h4>
      <div class="rsi-form">
        <label class="rsi-field rsi-field-wide">
          <span>计划名</span>
          <input class="rsi-input" v-model="planForm.name" placeholder="如：本月通读三本书" />
        </label>
        <label class="rsi-field rsi-field-wide">
          <span>说明</span>
          <input class="rsi-input" v-model="planForm.description" placeholder="一句话目标" />
        </label>
        <label class="rsi-field rsi-field-wide">
          <span>书目(逗号分隔)</span>
          <input class="rsi-input" v-model="planForm.books" placeholder="书名1，书名2" />
        </label>
        <label class="rsi-field">
          <span>目标日期</span>
          <input class="rsi-input" type="date" v-model="planForm.targetDate" />
        </label>
        <button class="rsi-btn" :disabled="!canCreatePlan" @click="onCreatePlan">创建</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useReadingSpeed, useReadingInsights, useReadingHall } from '../modules/reading'
import type { KnowledgeNode } from '../modules/reading'

const readingSpeed = useReadingSpeed()
const readingInsights = useReadingInsights()
const hall = useReadingHall()

// ---- 速度概览 ----
const stats = computed(() => readingSpeed.computeSpeedStats())
const trend = computed(() => readingSpeed.analyzeSpeedTrend(30))
const recommendations = computed(() => readingSpeed.getSpeedRecommendations())
const goal = computed(() => readingSpeed.speedGoal.value)
const goalProgress = computed(() => readingSpeed.goalProgress.value)

const TREND_LABEL: Record<string, string> = { improving: '↑提升', stable: '→平稳', declining: '↓下降' }
const trendText = computed(() => TREND_LABEL[stats.value.trend] ?? '→平稳')
const DIR_LABEL: Record<string, string> = { up: '上升', down: '下降', flat: '平稳' }
const dirText = computed(() => DIR_LABEL[trend.value.direction] ?? '平稳')

// ---- 趋势 sparkline ----
const SPARK_W = 300
const SPARK_H = 80
const SPARK_PAD = 6
const sparkPoints = computed(() => {
  const pts = trend.value.points
  if (pts.length === 0) return ''
  const wpms = pts.map((p) => p.averageWPM)
  const max = Math.max(...wpms, 1)
  const min = Math.min(...wpms, 0)
  const range = max - min || 1
  const stepX = pts.length > 1 ? (SPARK_W - SPARK_PAD * 2) / (pts.length - 1) : 0
  return pts
    .map((p, i) => {
      const x = SPARK_PAD + stepX * i
      const y = SPARK_H - SPARK_PAD - ((p.averageWPM - min) / range) * (SPARK_H - SPARK_PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

// ---- 类型标签 ----
const TYPE_LABEL: Record<string, string> = {
  technique: '技巧',
  habit: '习惯',
  material: '素材',
  environment: '环境',
  goal: '目标',
  concept: '概念',
  fact: '事实',
  insight: '洞见',
  question: '疑问',
  connection: '关联',
}
function typeLabel(t: string): string {
  return TYPE_LABEL[t] ?? t
}

// ---- 书架书目（供速度登记下拉） ----
const bookOptions = computed(() => hall.books.value.map((b) => ({ id: b.id, title: b.title })))

// ---- 登记速度表单 ----
const form = reactive({
  bookId: '',
  pagesRead: 10,
  duration: 20,
  comprehension: 70,
  difficulty: 3,
})
const canRecord = computed(() => !!form.bookId && Number(form.pagesRead) > 0 && Number(form.duration) > 0)
function onRecord() {
  if (!canRecord.value) return
  readingSpeed.recordSpeed(
    form.bookId,
    'sess_' + Date.now(),
    Number(form.pagesRead),
    Number(form.duration),
    {
      comprehensionRate: Number(form.comprehension) / 100,
      difficulty: Number(form.difficulty),
    },
  )
  form.pagesRead = 10
  form.duration = 20
  form.comprehension = 70
  form.difficulty = 3
}

// ---- 设定目标表单 ----
const goalForm = reactive({
  targetWPM: 500,
  targetComprehension: 75,
  deadline: '',
})
const canSetGoal = computed(
  () => Number(goalForm.targetWPM) > 0 && Number(goalForm.targetComprehension) >= 0 && !!goalForm.deadline,
)
function onSetGoal() {
  if (!canSetGoal.value) return
  readingSpeed.setSpeedGoal(
    Number(goalForm.targetWPM),
    Number(goalForm.targetComprehension) / 100,
    new Date(goalForm.deadline).toISOString(),
  )
}

// ---- 知识节点 ----
const knowledgeNodes = readingInsights.knowledgeNodes
const knowledgeStats = computed(() => readingInsights.knowledgeStats.value)
const nodeForm = reactive({
  label: '',
  type: 'insight' as KnowledgeNode['type'],
  sourceBookName: '',
  content: '',
})
const canAddNode = computed(() => nodeForm.label.trim().length > 0 && nodeForm.content.trim().length > 0)
function onAddNode() {
  if (!canAddNode.value) return
  readingInsights.addKnowledgeNode(
    nodeForm.label.trim(),
    nodeForm.content.trim(),
    '', // 本面板不绑定书架 sourceBookId，仅记录来源书名
    nodeForm.sourceBookName.trim(),
    nodeForm.type,
  )
  nodeForm.label = ''
  nodeForm.content = ''
  nodeForm.sourceBookName = ''
}

// ---- 连接节点 ----
const connectForm = reactive({ a: '', b: '' })
const canConnect = computed(
  () => !!connectForm.a && !!connectForm.b && connectForm.a !== connectForm.b,
)
function onConnect() {
  if (!canConnect.value) return
  readingInsights.connectNodes(connectForm.a, connectForm.b)
}

// ---- 阅读计划 ----
const readingPlans = readingInsights.readingPlans
const planForm = reactive({
  name: '',
  description: '',
  books: '',
  targetDate: '',
})
const canCreatePlan = computed(() => planForm.name.trim().length > 0 && !!planForm.targetDate)
function onCreatePlan() {
  if (!canCreatePlan.value) return
  const books = planForm.books
    .split(/[，,]/)
    .map((s) => s.trim())
    .filter(Boolean)
  readingInsights.createReadingPlan(
    planForm.name.trim(),
    planForm.description.trim(),
    books,
    new Date(planForm.targetDate).toISOString(),
  )
  planForm.name = ''
  planForm.description = ''
  planForm.books = ''
  planForm.targetDate = ''
}
function onCompletePlan(id: string) {
  readingInsights.completePlan(id)
}

// ---- 日期格式化 ----
function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
</script>

<style scoped>
.rsi {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.rsi-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.rsi-title { font-size: 16px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.85); letter-spacing: 1px; }
.rsi-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); letter-spacing: 0.5px; }

/* 概览 */
.rsi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.rsi-stat {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 12px 4px; border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.rsi-stat-num { font-size: 18px; font-weight: 500; color: var(--accent); }
.rsi-stat-label { font-size: 10px; color: rgba(var(--accent-rgb), 0.45); }

/* 卡片通用 */
.rsi-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px 16px; border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.rsi-h { margin: 0; font-size: 13px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.rsi-empty-text { margin: 0; font-size: 12px; color: rgba(var(--text-primary-rgb), 0.4); }

/* 目标进度 */
.rsi-goal { display: flex; flex-direction: column; gap: 6px; }
.rsi-goal-row { display: flex; justify-content: space-between; font-size: 12px; color: rgba(var(--text-primary-rgb), 0.7); }
.rsi-goal-pct { color: var(--accent); }
.rsi-track { height: 8px; border-radius: 4px; background: rgba(var(--accent-rgb), 0.1); overflow: hidden; }
.rsi-fill {
  display: block; height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  transition: width 0.4s;
}
.rsi-progress-label { margin: 2px 0 0; font-size: 11px; color: rgba(var(--text-primary-rgb), 0.45); }

/* sparkline */
.rsi-spark { width: 100%; height: 80px; display: block; }
.rsi-spark-line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.rsi-trend-meta { margin: 0; font-size: 11px; color: rgba(var(--text-primary-rgb), 0.5); }

/* 建议 */
.rsi-recs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.rsi-rec { padding: 10px 12px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.05); border-left: 3px solid rgba(var(--accent-rgb), 0.3); }
.rsi-rec-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rsi-rec-title { font-size: 13px; color: rgba(var(--text-primary-rgb), 0.85); font-weight: 500; }
.rsi-rec-tag { font-size: 10px; color: rgba(var(--accent-rgb), 0.7); padding: 1px 6px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.12); white-space: nowrap; }
.rsi-rec-desc { margin: 4px 0; font-size: 12px; line-height: 1.5; color: rgba(var(--text-primary-rgb), 0.6); }
.rsi-rec-impact { font-size: 11px; color: var(--success, #34d399); }
.rsi-rec.pri-high { border-left-color: rgba(224, 112, 80, 0.5); }
.rsi-rec.pri-medium { border-left-color: rgba(var(--accent-rgb), 0.4); }
.rsi-rec.pri-low { border-left-color: rgba(var(--text-primary-rgb), 0.2); }

/* 表单 */
.rsi-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.rsi-field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 120px; }
.rsi-field-wide { flex-basis: 100%; }
.rsi-field > span { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.55); }
.rsi-input {
  width: 100%; padding: 8px 10px; border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high); font-size: 13px; font-family: inherit;
  box-sizing: border-box; transition: border-color 0.25s;
}
.rsi-input:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.35); }
.rsi-form .rsi-btn { flex: 0 0 auto; }
.rsi-inline { flex-wrap: nowrap; }
.rsi-link { color: rgba(var(--accent-rgb), 0.6); font-size: 14px; }

/* 按钮 */
.rsi-btn {
  padding: 8px 20px; border: 1px solid rgba(var(--accent-rgb), 0.25);
  border-radius: 8px; background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent); font-size: 13px; font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}
.rsi-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.4); }
.rsi-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.rsi-btn-sm {
  padding: 4px 12px; border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 6px; background: transparent; color: var(--accent);
  font-size: 11px; font-family: inherit; cursor: pointer;
}
.rsi-btn-sm:hover { background: rgba(var(--accent-rgb), 0.12); }

/* 知识节点 */
.rsi-nodes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.rsi-node { padding: 10px 12px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.04); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.rsi-node-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rsi-node-label { font-size: 13px; color: rgba(var(--text-primary-rgb), 0.85); font-weight: 500; }
.rsi-node-type { font-size: 10px; color: rgba(var(--accent-rgb), 0.7); }
.rsi-node-content { margin: 4px 0; font-size: 12px; line-height: 1.5; color: rgba(var(--text-primary-rgb), 0.6); }
.rsi-node-meta { display: flex; justify-content: space-between; font-size: 10px; color: rgba(var(--text-primary-rgb), 0.4); }
.rsi-node.ntype-insight { border-left: 3px solid rgba(var(--accent-rgb), 0.4); }
.rsi-node.ntype-question { border-left: 3px solid rgba(224, 112, 80, 0.4); }
.rsi-node.ntype-connection { border-left: 3px solid rgba(96, 165, 250, 0.4); }

/* 阅读计划 */
.rsi-plans { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.rsi-plan { padding: 10px 12px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.04); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.rsi-plan.done { opacity: 0.6; }
.rsi-plan-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.rsi-plan-name { font-size: 13px; color: rgba(var(--text-primary-rgb), 0.85); font-weight: 500; }
.rsi-plan-date { font-size: 11px; color: rgba(var(--accent-rgb), 0.6); }
.rsi-plan-desc { margin: 4px 0; font-size: 12px; line-height: 1.5; color: rgba(var(--text-primary-rgb), 0.55); }
.rsi-plan-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rsi-plan-books { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.45); }

@media (max-width: 480px) {
  .rsi-grid { grid-template-columns: repeat(2, 1fr); }
  .rsi-inline { flex-wrap: wrap; }
}
</style>
