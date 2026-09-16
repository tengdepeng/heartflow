<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance wh">
    <!-- 装饰头 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <div data-enter class="header-kicker">把工作痕迹也放回自己这里</div>
    <header><h1>工作中心</h1></header>

    <!-- 概览卡片 -->
    <div class="overview-cards">
      <div class="overview-card">
        <span class="overview-num">{{ marks.length }}</span>
        <span class="overview-label">工痕</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ values.length }}</span>
        <span class="overview-label">劳酬</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ skills.length }}</span>
        <span class="overview-label">技能</span>
      </div>
    </div>

    <!-- 统计概览行 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-num">{{ marks.length }}</span>
        <span class="stat-label">工痕</span>
      </div>
      <div class="stat-item">
        <span class="stat-num">{{ values.length }}</span>
        <span class="stat-label">劳酬</span>
      </div>
      <div class="stat-item">
        <span class="stat-num">{{ skills.length }}</span>
        <span class="stat-label">技能</span>
      </div>
      <div class="stat-item">
        <span class="stat-num">{{ networks.length }}</span>
        <span class="stat-label">业脉</span>
      </div>
    </div>

    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="['tab',{active:tab===t.key}]" @click="tab=t.key">{{t.icon}} {{t.label}}</button>
    </div>

    <!-- 工痕：身体印记 -->
    <div v-if="tab==='marks'">
      <section>
        <h3>身体印记</h3>
        <!-- 严重程度筛选 -->
        <div class="filter-row">
          <button
            v-for="s in severityOptions"
            :key="s.key"
            :class="['filter-btn',{active:severityFilter===s.key}]"
            @click="severityFilter=s.key"
          >{{ s.label }}</button>
        </div>
        <!-- 按严重程度分组展示 -->
        <div v-if="severityGroups.length > 0">
          <div v-for="sg in severityGroups" :key="sg.key" class="group-section">
            <div class="group-title">
              {{ sg.label }} <span class="group-count">{{ sg.items.length }}</span>
            </div>
            <div class="mark-map">
              <div
                v-for="m in sg.items"
                :key="m.id"
                :class="['mark-card',`sev-${m.severity}`]"
              >
                <span>{{ m.part }}</span>
                <span class="mark-desc">{{ m.desc }}</span>
                <span class="mark-date">{{ fmt(m.at) }}</span>
                <button class="wh-del" @click="removeMark(m.id)">×</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="wh-empty">
          <span class="wh-empty-icon">🦴</span>
          <p class="wh-empty-title">还没有身体印记</p>
          <p class="wh-empty-hint">记录工作给身体留下的痕迹，从颈、肩、腰开始</p>
        </div>
        <!-- 添加工痕 -->
        <div class="add-row">
          <input v-model="markForm.part" placeholder="部位（颈/肩/腰…）" class="wh-input" />
          <input v-model="markForm.desc" placeholder="描述" class="wh-input" />
          <select v-model="markForm.severity" class="wh-select">
            <option value="mild">轻微</option>
            <option value="moderate">中等</option>
            <option value="severe">严重</option>
          </select>
          <button @click="addMark" class="wh-btn">+</button>
        </div>
      </section>
    </div>

    <!-- 劳酬：工作价值 -->
    <div v-if="tab==='value'">
      <section>
        <h3>工作价值</h3>
        <!-- 得失统计 -->
        <div class="value-stats">
          <div class="value-stat gain">
            <span class="value-stat-num">+{{ gainCount }}</span>
            <span class="value-stat-label">获得</span>
          </div>
          <div class="value-stat loss">
            <span class="value-stat-num">-{{ lossCount }}</span>
            <span class="value-stat-label">损失</span>
          </div>
          <div class="value-stat" :class="netGain >= 0 ? 'gain' : 'loss'">
            <span class="value-stat-num">{{ netGain >= 0 ? '+' : '' }}{{ netGain }}</span>
            <span class="value-stat-label">净收益</span>
          </div>
        </div>
        <!-- 得失类型筛选 -->
        <div class="filter-row">
          <button
            v-for="o in valueTypeOptions"
            :key="o.key"
            :class="['filter-btn',{active:valueTypeFilter===o.key}]"
            @click="valueTypeFilter=o.key"
          >{{ o.label }}</button>
        </div>
        <!-- 列表 -->
        <div v-if="filteredValues.length > 0">
          <div v-for="v in filteredValues" :key="v.id" class="val-card">
            <span :class="v.type==='gain'?'gain':'loss'">{{ v.type==='gain' ? '+' : '-' }}</span>
            <span>{{ v.text }}</span>
            <button class="wh-del" @click="removeVal(v.id)">×</button>
          </div>
        </div>
        <div v-else class="wh-empty">
          <span class="wh-empty-icon">⚖️</span>
          <p class="wh-empty-title">还没有工作价值记录</p>
          <p class="wh-empty-hint">在这份工作中你获得了什么、失去了什么？</p>
        </div>
        <!-- 添加劳酬 -->
        <div class="add-row">
          <input v-model="valForm.text" placeholder="这份工作让我学到了/失去了…" class="wh-input" style="flex:2" />
          <select v-model="valForm.type" class="wh-select">
            <option value="gain">获得</option>
            <option value="loss">损失</option>
          </select>
          <button @click="addValue" class="wh-btn">+</button>
        </div>
      </section>
    </div>

    <!-- 匠庐：工作成果 -->
    <div v-if="tab==='works'">
      <section>
        <h3>工作成果</h3>
        <!-- 按年份分组时间线 -->
        <div v-if="workYearGroups.length > 0">
          <div v-for="wg in workYearGroups" :key="wg.year" class="group-section">
            <div class="group-title">
              {{ wg.year }} 年 <span class="group-count">{{ wg.items.length }} 项</span>
            </div>
            <div v-for="w in wg.items" :key="w.id" class="work-card">
              <span>🏆</span>
              <div>
                <strong>{{ w.title }}</strong>
                <p>{{ w.desc }}</p>
              </div>
              <span class="work-date">{{ fmt(w.at) }}</span>
              <button class="wh-del" @click="removeWork(w.id)">×</button>
            </div>
          </div>
        </div>
        <div v-else class="wh-empty">
          <span class="wh-empty-icon">🏆</span>
          <p class="wh-empty-title">还没有工作成果</p>
          <p class="wh-empty-hint">完成的里程碑、项目、作品都可以记录在这里</p>
        </div>
        <!-- 添加成果 -->
        <div class="add-row">
          <input v-model="workForm.title" placeholder="成果名称" class="wh-input" />
          <input v-model="workForm.desc" placeholder="描述" class="wh-input" />
          <button @click="addWork" class="wh-btn">+</button>
        </div>
      </section>
    </div>

    <!-- 业脉：职业关系 -->
    <div v-if="tab==='network'">
      <section>
        <h3>职业关系</h3>
        <!-- 关系摘要 -->
        <div class="net-summary">
          <div v-for="rg in roleGroups" :key="rg.role" class="net-summary-item">
            <span class="net-summary-icon">{{ roleIcon(rg.role) }}</span>
            <span class="net-summary-label">{{ roleLabel(rg.role) }}</span>
            <span class="net-summary-count">{{ rg.items.length }}</span>
          </div>
        </div>
        <!-- 按角色分组展示 -->
        <div v-if="roleGroups.length > 0">
          <div v-for="rg in roleGroups" :key="rg.role" class="group-section">
            <div class="group-title">
              {{ roleIcon(rg.role) }} {{ roleLabel(rg.role) }} <span class="group-count">{{ rg.items.length }}</span>
            </div>
            <div v-for="n in rg.items" :key="n.id" :class="['net-card',`role-${n.role}`]">
              {{ roleIcon(n.role) }} {{ n.name }} · {{ roleLabel(n.role) }}
              <button class="wh-del" @click="removeNet(n.id)">×</button>
            </div>
          </div>
        </div>
        <div v-else class="wh-empty">
          <span class="wh-empty-icon">🔗</span>
          <p class="wh-empty-title">还没有职业关系</p>
          <p class="wh-empty-hint">导师、同事、上级、客户——记录你的职业网络</p>
        </div>
        <!-- 添加业脉 -->
        <div class="add-row">
          <input v-model="netForm.name" placeholder="姓名" class="wh-input" />
          <select v-model="netForm.role" class="wh-select">
            <option value="mentor">导师</option>
            <option value="peer">同事</option>
            <option value="boss">上级</option>
            <option value="client">客户</option>
          </select>
          <button @click="addNet" class="wh-btn">+</button>
        </div>
      </section>
    </div>

    <!-- 行囊：技能与工具 -->
    <div v-if="tab==='skills'">
      <section>
        <h3>技能与工具</h3>
        <!-- 按熟练度等级分组 -->
        <div v-if="levelGroups.length > 0">
          <div v-for="lg in levelGroups" :key="lg.level" class="group-section">
            <div class="group-title">
              {{ lg.label }} <span class="group-count">{{ lg.items.length }}</span>
            </div>
            <div v-for="s in lg.items" :key="s.id" class="skill-row">
              <span class="skill-dots">{{ '●'.repeat(s.level) }}{{ '○'.repeat(3 - s.level) }}</span>
              <span>{{ s.name }}</span>
              <button class="wh-del" @click="removeSkill(s.id)">×</button>
            </div>
          </div>
        </div>
        <div v-else class="wh-empty">
          <span class="wh-empty-icon">🎒</span>
          <p class="wh-empty-title">还没有技能记录</p>
          <p class="wh-empty-hint">记录你掌握的技能和工具，见证能力的成长</p>
        </div>
        <!-- 添加行囊 -->
        <div class="add-row">
          <input v-model="skillForm.name" placeholder="技能/工具名" class="wh-input" />
          <select v-model="skillForm.level" class="wh-select">
            <option value="3">熟练</option>
            <option value="2">掌握</option>
            <option value="1">学习中</option>
          </select>
          <button @click="addSkill" class="wh-btn">+</button>
        </div>
      </section>
    </div>

    <!-- 息壤：工作中的间歇 -->
    <div v-if="tab==='breaks'">
      <section>
        <h3>工作中的间歇</h3>
        <!-- 按类型分组 -->
        <div v-if="breakTypeGroups.length > 0">
          <div v-for="bg in breakTypeGroups" :key="bg.type" class="group-section">
            <div class="group-title">
              {{ breakTypeLabel(bg.type) }} <span class="group-count">{{ bg.items.length }}</span>
            </div>
            <div v-for="b in bg.items" :key="b.id" class="break-card">
              <span>☕</span>
              <span>{{ b.text }}</span>
              <span class="break-date">{{ fmt(b.at) }}</span>
              <button class="wh-del" @click="removeBreak(b.id)">×</button>
            </div>
          </div>
        </div>
        <div v-else class="wh-empty">
          <span class="wh-empty-icon">☕</span>
          <p class="wh-empty-title">还没有间歇记录</p>
          <p class="wh-empty-hint">午休、茶歇、摸鱼、年假——工作间隙也是生活的一部分</p>
        </div>
        <!-- 添加息壤 -->
        <div class="add-row">
          <input v-model="breakForm.text" placeholder="午休/茶歇/摸鱼/年假…" class="wh-input" />
          <select v-model="breakForm.type" class="wh-select">
            <option value="lunch">午休</option>
            <option value="tea">茶歇</option>
            <option value="slack">摸鱼</option>
            <option value="vacation">年假</option>
            <option value="other">其他</option>
          </select>
          <button @click="addBreak" class="wh-btn">+</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useWorkHub } from '../modules/workhub'

const { entranceRef, entranceClass } = useViewEntrance()
const tab = ref('marks')
const tabs = [
  { key: 'marks', label: '工痕', icon: '🦴' },
  { key: 'value', label: '劳酬', icon: '⚖️' },
  { key: 'works', label: '匠庐', icon: '🏆' },
  { key: 'network', label: '业脉', icon: '🔗' },
  { key: 'skills', label: '行囊', icon: '🎒' },
  { key: 'breaks', label: '息壤', icon: '☕' }
]

const wh = useWorkHub()
const fmt = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}` }
const getYear = (iso: string) => new Date(iso).getFullYear()

// ===== 工痕：身体印记 =====
interface Mark { id: string; part: string; desc: string; severity: string; at: string }
const marks = ref<Mark[]>(wh.load('marks'))
const markForm = reactive({ part: '', desc: '', severity: 'mild' })

const severityOptions = [
  { key: 'all', label: '全部' },
  { key: 'mild', label: '轻微' },
  { key: 'moderate', label: '中等' },
  { key: 'severe', label: '严重' }
]
const severityFilter = ref('all')

const severityLabels: Record<string, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重'
}

const severityGroups = computed(() => {
  const filtered = severityFilter.value === 'all'
    ? marks.value
    : marks.value.filter(m => m.severity === severityFilter.value)
  const groups: { key: string; label: string; items: Mark[] }[] = []
  const order = ['severe', 'moderate', 'mild']
  for (const key of order) {
    const items = filtered.filter(m => m.severity === key)
    if (items.length > 0) {
      groups.push({ key, label: severityLabels[key] || key, items })
    }
  }
  return groups
})

function addMark() {
  if (!markForm.part) return
  marks.value.unshift({
    id: `mk${Date.now()}`,
    part: markForm.part,
    desc: markForm.desc,
    severity: markForm.severity,
    at: new Date().toISOString()
  })
  wh.save('marks', marks.value)
  markForm.part = ''
  markForm.desc = ''
}

function removeMark(id: string) {
  marks.value = marks.value.filter(m => m.id !== id)
  wh.save('marks', marks.value)
}

// ===== 劳酬：工作价值 =====
interface Value { id: string; text: string; type: string; at: string }
const values = ref<Value[]>(wh.load('values'))
const valForm = reactive({ text: '', type: 'gain' })

const gainCount = computed(() => values.value.filter(v => v.type === 'gain').length)
const lossCount = computed(() => values.value.filter(v => v.type === 'loss').length)
const netGain = computed(() => gainCount.value - lossCount.value)

const valueTypeOptions = [
  { key: 'all', label: '全部' },
  { key: 'gain', label: '获得' },
  { key: 'loss', label: '损失' }
]
const valueTypeFilter = ref('all')

const filteredValues = computed(() => {
  if (valueTypeFilter.value === 'all') return values.value
  return values.value.filter(v => v.type === valueTypeFilter.value)
})

function addValue() {
  if (!valForm.text) return
  values.value.unshift({
    id: `vl${Date.now()}`,
    text: valForm.text,
    type: valForm.type,
    at: new Date().toISOString()
  })
  wh.save('values', values.value)
  valForm.text = ''
}

function removeVal(id: string) {
  values.value = values.value.filter(v => v.id !== id)
  wh.save('values', values.value)
}

// ===== 匠庐：工作成果 =====
interface Work { id: string; title: string; desc: string; at: string }
const works = ref<Work[]>(wh.load('works'))
const workForm = reactive({ title: '', desc: '' })

const workYearGroups = computed(() => {
  const map: Record<number, Work[]> = {}
  for (const w of works.value) {
    const y = getYear(w.at)
    if (!map[y]) map[y] = []
    map[y].push(w)
  }
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => b - a)
    .map(year => ({ year, items: map[year] }))
})

function addWork() {
  if (!workForm.title) return
  works.value.unshift({
    id: `wk${Date.now()}`,
    title: workForm.title,
    desc: workForm.desc,
    at: new Date().toISOString()
  })
  wh.save('works', works.value)
  workForm.title = ''
  workForm.desc = ''
}

function removeWork(id: string) {
  works.value = works.value.filter(w => w.id !== id)
  wh.save('works', works.value)
}

// ===== 业脉：职业关系 =====
interface Net { id: string; name: string; role: string; at: string }
const networks = ref<Net[]>(wh.load('nets'))
const netForm = reactive({ name: '', role: 'peer' })

const roleIcons: Record<string, string> = {
  mentor: '🧑‍🏫',
  peer: '👥',
  boss: '👔',
  client: '🤝'
}
function roleIcon(r: string) { return roleIcons[r] || '👤' }

const roleLabels: Record<string, string> = {
  mentor: '导师',
  peer: '同事',
  boss: '上级',
  client: '客户'
}
function roleLabel(r: string) { return roleLabels[r] || r }

const roleGroups = computed(() => {
  const map: Record<string, Net[]> = {}
  for (const n of networks.value) {
    if (!map[n.role]) map[n.role] = []
    map[n.role].push(n)
  }
  const order = ['mentor', 'peer', 'boss', 'client']
  return order
    .filter(r => map[r] && map[r].length > 0)
    .map(role => ({ role, items: map[role] }))
})

function addNet() {
  if (!netForm.name) return
  networks.value.unshift({
    id: `nt${Date.now()}`,
    name: netForm.name,
    role: netForm.role,
    at: new Date().toISOString()
  })
  wh.save('nets', networks.value)
  netForm.name = ''
}

function removeNet(id: string) {
  networks.value = networks.value.filter(n => n.id !== id)
  wh.save('nets', networks.value)
}

// ===== 行囊：技能与工具 =====
interface Skill { id: string; name: string; level: number; at: string }
const skills = ref<Skill[]>(wh.load('skills'))
const skillForm = reactive({ name: '', level: '2' })

const levelLabels: Record<number, string> = {
  3: '熟练',
  2: '掌握',
  1: '学习中'
}

const levelGroups = computed(() => {
  const map: Record<number, Skill[]> = {}
  for (const s of skills.value) {
    if (!map[s.level]) map[s.level] = []
    map[s.level].push(s)
  }
  return [3, 2, 1]
    .filter(l => map[l] && map[l].length > 0)
    .map(level => ({ level, label: levelLabels[level], items: map[level] }))
})

function addSkill() {
  if (!skillForm.name) return
  skills.value.unshift({
    id: `sk${Date.now()}`,
    name: skillForm.name,
    level: parseInt(skillForm.level),
    at: new Date().toISOString()
  })
  wh.save('skills', skills.value)
  skillForm.name = ''
}

function removeSkill(id: string) {
  skills.value = skills.value.filter(s => s.id !== id)
  wh.save('skills', skills.value)
}

// ===== 息壤：工作中的间歇 =====
interface Break { id: string; text: string; type: string; at: string }
const breaks = ref<Break[]>(wh.load('breaks'))
const breakForm = reactive({ text: '', type: 'other' })

const breakTypeLabels: Record<string, string> = {
  lunch: '午休',
  tea: '茶歇',
  slack: '摸鱼',
  vacation: '年假',
  other: '其他'
}
function breakTypeLabel(t: string) { return breakTypeLabels[t] || t }

const breakTypeGroups = computed(() => {
  const map: Record<string, Break[]> = {}
  for (const b of breaks.value) {
    const t = b.type || 'other'
    if (!map[t]) map[t] = []
    map[t].push(b)
  }
  const order = ['lunch', 'tea', 'slack', 'vacation', 'other']
  return order
    .filter(t => map[t] && map[t].length > 0)
    .map(type => ({ type, items: map[type] }))
})

function addBreak() {
  if (!breakForm.text) return
  breaks.value.unshift({
    id: `br${Date.now()}`,
    text: breakForm.text,
    type: breakForm.type,
    at: new Date().toISOString()
  })
  wh.save('breaks', breaks.value)
  breakForm.text = ''
}

function removeBreak(id: string) {
  breaks.value = breaks.value.filter(b => b.id !== id)
  wh.save('breaks', breaks.value)
}
</script>

<style scoped>
/* ============================================
   深夜食堂 · 暖琥珀
   WorkHub 工作中心
   ============================================ */

.wh {
  max-width: 520px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100%;
  overflow-y: auto;
  background: transparent;
  color: var(--text-high);
}

/* ---- 装饰头 ---- */
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.orn-line {
  display: block;
  width: 50px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);
}
.orn-diamond {
  font-size: 8px;
  color: var(--accent);
  opacity: 0.35;
}

.header-kicker {
  text-align: center;
  font-size: 12px;
  letter-spacing: 3px;
  color: rgba(var(--accent-rgb), 0.35);
  margin-bottom: 8px;
}

header h1 {
  text-align: center;
  font-size: 24px;
  font-weight: 500;
  font-family: var(--font-heading-zh);
  letter-spacing: 4px;
  color: rgba(var(--text-primary-rgb), 0.92);
  margin-bottom: 24px;
}

/* ---- 概览卡片 ---- */
.overview-cards {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.overview-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  transition: all 0.25s;
}
.overview-card:hover {
  background: rgba(55, 48, 40, 0.7);
  border-color: rgba(var(--accent-rgb), 0.22);
}
.overview-num {
  font-size: 22px;
  font-weight: 600;
  color: var(--accent);
}
.overview-label {
  font-size: 11px;
  color: var(--text-medium);
  margin-top: 2px;
}

/* ---- 统计概览行 ---- */
.stats-bar {
  display: flex;
  justify-content: space-around;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px 8px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.45);
  border: 1px solid rgba(var(--accent-rgb), 0.10);
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-num {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
}
.stat-label {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

/* ---- 选项卡 ---- */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
}
.tab {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  background: transparent;
  color: var(--text-low);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.tab:hover {
  color: var(--text-bright);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.tab.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.28);
  color: var(--accent);
}

/* ---- 区块通用 ---- */
section { margin-bottom: 20px; }
section h3 {
  font-size: 14px;
  color: rgba(var(--text-primary-rgb), 0.6);
  margin-bottom: 10px;
  font-weight: 500;
}

/* ---- 筛选按钮行 ---- */
.filter-row {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  background: transparent;
  color: var(--text-low);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;

  min-height: 26px;
}
.filter-btn:hover {
  color: rgba(var(--text-primary-rgb), 0.65);
  border-color: rgba(var(--accent-rgb), 0.18);
}
.filter-btn.active {
  background: rgba(var(--accent-rgb), 0.10);
  border-color: rgba(var(--accent-rgb), 0.22);
  color: var(--accent);
}

/* ---- 分组区块 ---- */
.group-section { margin-bottom: 12px; }
.group-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  padding-left: 2px;
}
.group-count {
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: 4px;
}

/* ---- 输入与按钮 ---- */
.add-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.wh-input {
  flex: 1;
  min-width: 80px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.wh-input:focus { border-color: rgba(var(--accent-rgb), 0.35); }
.wh-input::placeholder { color: rgba(var(--text-primary-rgb), 0.25); }

.wh-select {
  padding: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.wh-select:focus { border-color: rgba(var(--accent-rgb), 0.35); }

.wh-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.wh-btn:hover {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.35);
}

.wh-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  opacity: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
*:hover > .wh-del { opacity: 1; }
.wh-del:hover { color: #e06c6c; }

/* ---- 卡片通用 ---- */
.mark-card,
.val-card,
.work-card,
.net-card,
.skill-row,
.break-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 4px;
  font-size: 13px;
  transition: all 0.2s;
}
.mark-card:hover,
.val-card:hover,
.work-card:hover,
.net-card:hover,
.skill-row:hover,
.break-card:hover {
  background: rgba(55, 48, 40, 0.65);
  border-color: rgba(var(--accent-rgb), 0.14);
}

.mark-desc { flex: 1; color: var(--text-secondary); }
.mark-date { font-size: 11px; color: var(--text-secondary); }
.work-card strong { font-size: 13px; display: block; }
.work-card p { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.45); margin: 2px 0 0; }
.work-date { font-size: 11px; color: var(--text-secondary); }
.break-date { font-size: 11px; color: var(--text-secondary); margin-left: auto; }
.skill-dots { letter-spacing: 2px; color: var(--accent); }
.gain { color: var(--success); }
.loss { color: #d98c7a; }

/* ---- 劳酬得失统计 ---- */
.value-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.value-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.value-stat-num {
  font-size: 18px;
  font-weight: 600;
}
.value-stat-label {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

/* ---- 业脉关系摘要 ---- */
.net-summary {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.net-summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 12px;
}
.net-summary-icon { font-size: 14px; }
.net-summary-label { color: var(--text-secondary); }
.net-summary-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .wh { padding: 32px 20px 64px; }
  .overview-cards { gap: 6px; }
  .overview-card { min-width: 0; }
  .tabs { overflow-x: auto; flex-wrap: nowrap; justify-content: flex-start; -webkit-overflow-scrolling: touch; }
  .tabs::-webkit-scrollbar { display: none; }
}

@media (max-width: 640px) {
  .wh { padding: 24px 14px 56px; }
  .overview-cards { flex-direction: column; gap: 6px; }
  .tab { font-size: 11px; padding: 4px 10px; }
  .add-row { flex-direction: column; }
  .add-row .wh-btn { width: 100%; }
  .add-row .wh-input { width: 100%; }
  .add-row .wh-select { width: 100%; }
}

/* ---- 空状态 ---- */
.wh-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  animation: fade-slide-up 0.4s ease-out;
}
.wh-empty-icon {
  font-size: 28px;
  opacity: 0.3;
  margin-bottom: 12px;
}
.wh-empty-title {
  font-size: 14px;
  color: var(--text-dim);
  margin: 0 0 6px;
  font-weight: 500;
}
.wh-empty-hint {
  font-size: 12px;
  color: var(--text-faint);
  margin: 0;
  line-height: 1.5;
  max-width: 240px;
}
</style>