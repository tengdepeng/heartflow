<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance pavilion">
    <!-- 氛围背景层：留光阁 · 光之庭 -->
    <div data-enter class="pavilion-ambient" aria-hidden="true">
      <div class="pav-glow pav-glow--top"></div>
      <div class="pav-glow pav-glow--mid"></div>
      <div class="pav-glow pav-glow--bottom"></div>
      <!-- 光柱 SVG -->
      <div class="pav-lightbeams" aria-hidden="true">
        <svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="beamGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.06"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="beamGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.04"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
            <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.15"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- 光柱 -->
          <g opacity="0.12">
            <polygon points="160,0 200,800 120,800" fill="url(#beamGrad1)"/>
            <polygon points="440,0 480,800 400,800" fill="url(#beamGrad1)"/>
            <polygon points="290,0 320,800 260,800" fill="url(#beamGrad2)"/>
          </g>
          <!-- 穹顶光晕 -->
          <ellipse cx="300" cy="80" rx="200" ry="80" fill="url(#starGlow)"/>
          <!-- 漂浮光点 -->
          <g fill="var(--accent)" opacity="0.08">
            <circle cx="80" cy="200" r="1.5" class="pav-float pav-float--1"/>
            <circle cx="520" cy="350" r="1" class="pav-float pav-float--2"/>
            <circle cx="150" cy="500" r="2" class="pav-float pav-float--3"/>
            <circle cx="480" cy="180" r="1.5" class="pav-float pav-float--4"/>
            <circle cx="350" cy="620" r="1" class="pav-float pav-float--5"/>
            <circle cx="60" cy="420" r="1.2" class="pav-float pav-float--6"/>
            <circle cx="540" cy="550" r="1.8" class="pav-float pav-float--7"/>
            <circle cx="250" cy="100" r="1" class="pav-float pav-float--8"/>
          </g>
        </svg>
      </div>
      <!-- 旧梦潭水纹（底部装饰） -->
      <div class="pav-water-ripple" aria-hidden="true">
        <svg viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,60 Q75,30 150,60 Q225,90 300,60 Q375,30 450,60 Q525,90 600,60"
            stroke="var(--accent)" stroke-width="0.5" fill="none" opacity="0.06" class="ripple-line ripple-line--1"/>
          <path d="M0,70 Q75,45 150,70 Q225,95 300,70 Q375,45 450,70 Q525,95 600,70"
            stroke="var(--accent)" stroke-width="0.5" fill="none" opacity="0.04" class="ripple-line ripple-line--2"/>
          <path d="M0,80 Q75,58 150,80 Q225,102 300,80 Q375,58 450,80 Q525,102 600,80"
            stroke="var(--accent)" stroke-width="0.5" fill="none" opacity="0.03" class="ripple-line ripple-line--3"/>
        </svg>
      </div>
    </div>

    <!-- 装饰性头部 -->
    <header data-enter class="pavilion-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">把目标放回时间线，让它们慢慢生长</p>
      <h1 class="header-title">留光阁</h1>
      <!-- 统计概览卡片 -->
      <section class="stats-overview">
        <div class="stat-item">
          <span class="stat-value">{{ statsTotal }}</span>
          <span class="stat-label">总目标</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ statsInProgress }}</span>
          <span class="stat-label">进行中</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ statsCompleted }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ statsMilestone }}</span>
          <span class="stat-label">里程碑</span>
        </div>
      </section>
    </header>

    <!-- 搜索与筛选栏（tab-bar） -->
    <section data-enter class="filter-bar">
      <div class="search-row">
        <input v-model="searchQuery" class="search-input" placeholder="搜索目标标题…" />
      </div>
      <div class="tab-bar">
        <button v-for="s in statusFilterOptions" :key="s.key"
          :class="['tab-btn', { active: statusFilter === s.key }]"
          @click="statusFilter = s.key">{{ s.label }}</button>
      </div>
      <div class="domain-filter-row">
        <button :class="['domain-btn-sm', { active: domainFilter === '' }]"
          @click="domainFilter = ''">全部领域</button>
        <button v-for="d in domains" :key="d.key"
          :class="['domain-btn-sm', { active: domainFilter === d.key }]"
          :style="domainFilter === d.key ? { background: (DOMAIN_COLORS as Record<string,string>)[d.key] + '22', borderColor: (DOMAIN_COLORS as Record<string,string>)[d.key] } : {}"
          @click="domainFilter = d.key">{{ d.label }}</button>
      </div>
    </section>

    <!-- 穹顶星光（愿景） -->
    <section data-enter class="dome-section">
      <div class="tier-header vision-header"><span>✨ 愿景 · 穹顶星光</span><button class="btn-add-sm" @click="openCreate('vision')">+</button></div>
      <div class="dome-stars" v-if="goal.visions.value.length">
        <!-- SVG 光晕背景 -->
        <svg class="dome-glow-bg" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="domeGlowGrad" cx="50%" cy="20%" r="60%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.12"/>
              <stop offset="50%" stop-color="var(--accent)" stop-opacity="0.04"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="400" height="80" fill="url(#domeGlowGrad)"/>
          <!-- 星座连线 -->
          <g stroke="var(--accent)" stroke-width="0.3" opacity="0.12">
            <line x1="60" y1="25" x2="140" y2="10"/>
            <line x1="140" y1="10" x2="220" y2="30"/>
            <line x1="220" y1="30" x2="300" y2="15"/>
            <line x1="300" y1="15" x2="350" y2="40"/>
          </g>
        </svg>
        <div class="stars-canvas">
          <span v-for="(v, i) in goal.visions.value" :key="v.id" class="dome-star"
            :style="{
              left: starX(v.id) + '%',
              top: starY(v.id) + '%',
              opacity: 0.3 + v.order * 0.1,
              fontSize: `${10 + v.order * 2}px`,
              animationDelay: `${i * 0.3}s`
            }"
            :title="v.title">✦</span>
        </div>
      </div>
      <p v-else class="tier-empty">在穹顶点亮一颗星，许下一个愿景</p>
    </section>

    <!-- 目标层 -->
    <section data-enter class="goal-tier">
      <div class="tier-header target-header"><span>🎯 目标</span><button class="btn-add-sm" @click="openCreate('target')">+</button></div>
      <div class="goal-cards target-cards" v-if="filteredTargets.length">
        <div v-for="t in filteredTargets" :key="t.id" class="goal-card target-card" :class="`status-${t.status}`"
          :style="{borderColor:domainColor(t.domain)+'44'}">
          <div class="card-body" role="button" tabindex="0" :aria-label="'推进目标 ' + t.title + ' 的进展'" @click="goal.promoteStatus(t.id)" @keydown.enter.prevent="goal.promoteStatus(t.id)" @keydown.space.prevent="goal.promoteStatus(t.id)">
            <span class="card-icon">{{statusIcon(t.status)}}</span>
            <div class="card-info">
              <span class="card-title">{{t.title}}</span>
              <span class="card-meta">{{domainLabel(t.domain)}} · {{STATUS_LABELS[t.status]}}<span v-if="t.anchorDone>0"> · {{t.anchorDone}} 步</span></span>
            </div>
          </div>
          <!-- 完成度进度条 -->
          <div class="progress-wrap" v-if="goal.childrenOf(t.id).length">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: targetProgress(t.id) + '%' }"></div>
            </div>
            <span class="progress-text">{{ targetProgress(t.id) }}%</span>
          </div>
          <!-- 子计划数 -->
          <span class="child-count" v-if="goal.childrenOf(t.id).length">{{ goal.childrenOf(t.id).length }} 计划</span>
          <div class="card-actions">
            <button class="act-btn" @click="goal.toggleDormant(t.id)">{{t.status==='dormant'?'🌱':'💤'}}</button>
            <button class="act-btn del" @click="requestDelete(t)">×</button>
          </div>
        </div>
      </div>
      <p v-else class="tier-empty">中等距离的光…</p>
    </section>

    <!-- 目标间连线（相关目标） -->
    <div data-enter class="goal-links" v-if="goal.targets.value.length>=2">
      <span class="link-hint">目标关联</span>
      <div class="link-chips">
        <span v-for="(pair,i) in goalPairs" :key="i" class="link-chip" :style="{borderColor:domainColor(pair.a.domain)}">{{pair.a.title}} ↔ {{pair.b.title}}</span>
      </div>
    </div>

    <!-- 计划层 -->
    <section data-enter class="goal-tier"><div class="tier-header plan-header"><span>📋 计划</span><button class="btn-add-sm" @click="openCreate('plan')">+</button></div>
      <div class="goal-cards plan-list" v-if="goal.plans.value.length">
        <div v-for="p in goal.plans.value" :key="p.id" class="goal-card plan-card" :class="{done:p.status==='bloom'}">
          <span class="plan-check" role="checkbox" tabindex="0" :aria-checked="p.status==='bloom'" :aria-label="'标记计划 ' + p.title + (p.status==='bloom' ? ' 为未完成' : ' 完成')" @click="goal.markPlanDone(p.id)" @keydown.enter.prevent="goal.markPlanDone(p.id)" @keydown.space.prevent="goal.markPlanDone(p.id)">{{p.status==='bloom'?'⚓':'○'}}</span>
          <span class="card-title" :class="{'line-through':p.status==='bloom'}">{{p.title}}</span>
          <span class="plan-progress">{{p.anchorDone}}/{{p.anchorCount||'?'}}</span>
          <button class="lp-del" @click="goal.remove(p.id)">×</button>
        </div>
      </div>
      <p v-else class="tier-empty">具体的下一步…</p>
    </section>

    <!-- 职业发展区 -->
    <section data-enter class="career-zone" v-if="careerSteps.length">
      <h3>💼 职业发展</h3>
      <div class="career-steps" v-if="careerSteps.length">
        <span v-for="s in careerSteps" :key="s.id" class="career-step" :style="{borderColor:domainColor('work')}">{{s.title}} · {{STATUS_LABELS[s.status]}}</span>
      </div>
    </section>

    <!-- 财富规划 -->
    <section data-enter class="wealth-zone">
      <h3>💰 财富规划</h3>
      <div class="add-row">
        <input v-model="wealthGoal" type="number" placeholder="储蓄目标" class="lp-input"/>
        <button class="lp-btn" @click="saveWealthGoal">设定</button>
      </div>
      <div v-if="wealthTarget>0" class="wealth-bar-wrap">
        <div class="wealth-bar"><div class="wealth-fill" :style="{width:wealthPct+'%'}"/></div>
        <span>¥{{wealthCurrent.toLocaleString()}} / ¥{{wealthTarget.toLocaleString()}} ({{wealthPct}}%)</span>
      </div>
    </section>

    <!-- 旧梦潭：已完成的目标（INCR-373 补挂载孤儿引擎 goal/old-dream：检索/统计/分组陈列/复苏，替换视图自实现） -->
    <section data-enter class="old-dreams">
      <OldDreamPanel :goals="oldDreams" @revive="reviveGoal" />
    </section>

    <!-- 专项规划区 -->
    <section data-enter class="special-plan-section">
      <div class="section-label-row">
        <span class="section-label">专项规划区</span>
        <span class="section-count">{{ specialPlans.length }}</span>
        <button class="section-add-btn" @click="openSpecialPlanModal">+ 新建专项</button>
      </div>
      <div v-if="specialPlans.length === 0" class="special-plan-empty">
        <p>还没有跨目标规划，创建一个将多个目标串联起来</p>
      </div>
      <div v-else class="special-plan-list">
        <div v-for="plan in specialPlans" :key="plan.id" class="special-plan-card">
          <div class="plan-card-header" role="button" tabindex="0" :aria-expanded="expandedPlanId === plan.id" :aria-label="'展开或收起专项计划 ' + plan.title" @click="toggleExpandPlan(plan.id)" @keydown.enter.prevent="toggleExpandPlan(plan.id)" @keydown.space.prevent="toggleExpandPlan(plan.id)">
            <div class="plan-card-title-row">
              <span class="plan-card-title">{{ plan.title }}</span>
              <span class="plan-card-progress">{{ specialPlanProgress(plan) }}%</span>
            </div>
            <p class="plan-card-desc" v-if="plan.description">{{ plan.description }}</p>
            <div class="plan-progress-bar">
              <div class="plan-progress-fill" :style="{ width: specialPlanProgress(plan) + '%' }"></div>
            </div>
            <div class="plan-goal-tags" v-if="plan.relatedGoalIds.length">
              <span v-for="gid in plan.relatedGoalIds" :key="gid" class="plan-goal-tag">{{ getGoalTitle(gid) }}</span>
            </div>
          </div>
          <div v-if="expandedPlanId === plan.id" class="plan-card-body">
            <div class="milestone-list">
              <div v-for="(ms, i) in plan.milestones" :key="i" class="milestone-row" :class="{ done: ms.done }">
                <span class="ms-check" role="checkbox" tabindex="0" :aria-checked="ms.done" :aria-label="'切换里程碑 ' + ms.label + ' 完成状态'" @click="toggleMilestone(plan.id, i)" @keydown.enter.prevent="toggleMilestone(plan.id, i)" @keydown.space.prevent="toggleMilestone(plan.id, i)">{{ ms.done ? '✓' : '○' }}</span>
                <span class="ms-label">{{ ms.label }}</span>
              </div>
              <div class="milestone-add-row">
                <input v-model="newMilestoneLabel" class="ms-input" placeholder="添加里程碑…" @keyup.enter="addMilestone(plan.id, newMilestoneLabel); newMilestoneLabel = ''" />
                <button class="ms-add-btn" @click="addMilestone(plan.id, newMilestoneLabel); newMilestoneLabel = ''">+</button>
              </div>
              <div class="plan-card-actions">
                <span class="plan-card-date">创建于 {{ formatDate(plan.createdAt) }}</span>
                <button class="plan-delete-btn" @click="deleteSpecialPlan(plan.id)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 目标生长进度档案 · 进度快照/生长日志/里程碑轨迹（goal/goal-progress 引擎，INCR-270 补挂载孤儿组件，薄委托化：宿主注入目标） -->
    <section data-enter class="ggap-section">
      <GoalGrowthArchivePanel :goals="goal.goals.value" />
    </section>

    <!-- 专项档案（INCR-286 补挂载孤儿组件 SpecialPlanArchivePanel：档案概览/里程碑进度/游离专项/温和洞察，消费 goal/special-plan-analytics 纯函数，引擎应用内唯一） -->
    <SpecialPlanArchivePanel :plans="specialPlans" />

    <!-- 专项规划创建弹窗 -->
    <Teleport to="body"><Transition name="modal">
      <div v-if="showSpecialPlanModal" class="modal-overlay" @click.self="showSpecialPlanModal = false">
        <div class="modal-card">
          <h3>新建专项规划</h3>
          <input v-model="specialPlanForm.title" class="form-input" placeholder="规划名称…" @keyup.enter="saveSpecialPlan" autofocus />
          <input v-model="specialPlanForm.description" class="form-input" placeholder="规划描述（可选）…" />
          <div class="goal-pick" v-if="goal.targets.value.length">
            <span class="goal-pick-label">关联目标（可选）：</span>
            <div class="goal-pick-list">
              <button v-for="t in goal.targets.value" :key="t.id"
                :class="['goal-pick-btn', { active: specialPlanForm.selectedGoalIds.includes(t.id) }]"
                :style="specialPlanForm.selectedGoalIds.includes(t.id) ? { borderColor: domainColor(t.domain) } : {}"
                @click="toggleGoalSelection(t.id)">
                {{ t.title }}
              </button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showSpecialPlanModal = false">取消</button>
            <button class="btn-save" @click="saveSpecialPlan" :disabled="!specialPlanForm.title.trim()">创建</button>
          </div>
        </div>
      </div>
    </Transition></Teleport>

    <!-- 创建弹窗 -->
    <Teleport to="body"><Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
        <div class="modal-card">
          <h3>新建{{tierLabel(createTier)}}</h3>
          <input v-model="form.title" class="form-input" placeholder="名称…" @keyup.enter="saveGoal" autofocus/>
          <div class="domain-pick">
            <button v-for="d in domains" :key="d.key" :class="['domain-btn',{active:form.domain===d.key}]"
              :style="form.domain===d.key?{background:DOMAIN_COLORS[d.key]+'22',borderColor:DOMAIN_COLORS[d.key]}:{}"
              @click="form.domain=d.key">{{d.label}}</button>
          </div>
          <div class="modal-actions"><button class="btn-cancel" @click="showModal=false">取消</button><button class="btn-save" @click="saveGoal" :disabled="!form.title.trim()">创建</button></div>
        </div>
      </div>
    </Transition></Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body"><Transition name="modal">
      <div v-if="confirmTarget" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal-card confirm-dialog">
          <h3>确认删除</h3>
          <p class="confirm-text">确定要删除目标「<strong>{{ confirmTarget.title }}</strong>」及其所有子计划吗？此操作不可撤销。</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="cancelDelete">取消</button>
            <button class="btn-danger" @click="doDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Transition></Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { storage } from '../engine/storage'
import { useGoal } from '../modules/goal'
import { DOMAIN_LABELS, DOMAIN_COLORS, STATUS_LABELS } from '../modules/goal/types'
import type { GoalTier, GoalStatus, Goal } from '../modules/goal/types'
import type { SpecialPlan } from '../modules/goal/types'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useLightPavilionData } from '../modules/light/pavilion-data'
import GoalGrowthArchivePanel from '../components/GoalGrowthArchivePanel.vue'
import SpecialPlanArchivePanel from '../components/SpecialPlanArchivePanel.vue'
import OldDreamPanel from '../components/OldDreamPanel.vue'
import { useRoomResonance } from '../modules/room-resonance'

const { entranceRef, entranceClass } = useViewEntrance()
const goal = useGoal(); onMounted(() => goal.load())
const light = useLightPavilionData(); light.load()

// ---- 跨房间共鸣联动：留光阁发射「意图」信号 ----
const { emitRoomSignal: emitLightResonance } = useRoomResonance()
function emitLightResonanceSignal() {
  emitLightResonance({
    room: 'light-pavilion',
    kind: 'light',
    label: light.wealthTarget.value > 0 ? `财富目标 ¥${light.wealthTarget.value}` : '尚未设定财富目标',
    detail: light.specialPlans.value.length ? `专项规划 ${light.specialPlans.value.length} 项` : undefined,
    ts: Date.now(),
  })
}
watch([() => light.wealthTarget.value, () => light.specialPlans.value.length], emitLightResonanceSignal, { immediate: true })

type Domain = Goal['domain']

const domains = Object.entries(DOMAIN_LABELS).map(([key, label]) => ({ key: key as Domain, label }))

function domainColor(d: string) { return (DOMAIN_COLORS as Record<string, string>)[d] || '#555' }
function domainLabel(d: string) { return (DOMAIN_LABELS as Record<string, string>)[d] || d }

// ================================================================
// 统计概览 - 计算总目标数、进行中、已完成、里程碑数量
// ================================================================
const statsTotal = computed(() => goal.targets.value.length)
const statsInProgress = computed(() => goal.targets.value.filter(t => t.status !== 'bloom' && t.status !== 'dormant').length)
const statsCompleted = computed(() => goal.targets.value.filter(t => t.status === 'bloom').length)
const statsMilestone = computed(() => goal.plans.value.filter(p => p.status === 'bloom').length)

// ================================================================
// 搜索与筛选 - 按标题搜索、按状态筛选、按领域筛选
// ================================================================
const searchQuery = ref('')
const statusFilter = ref('all')
const domainFilter = ref('')

const statusFilterOptions = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'bloom', label: '已完成' },
  { key: 'dormant', label: '休眠' },
]

/** 根据搜索词、状态筛选、领域筛选过滤目标列表 */
const filteredTargets = computed(() => {
  return goal.targets.value.filter(t => {
    // 搜索过滤：按标题匹配
    if (searchQuery.value && !t.title.includes(searchQuery.value)) return false
    // 状态过滤
    if (statusFilter.value === 'active' && (t.status === 'bloom' || t.status === 'dormant')) return false
    if (statusFilter.value === 'bloom' && t.status !== 'bloom') return false
    if (statusFilter.value === 'dormant' && t.status !== 'dormant') return false
    // 领域过滤
    if (domainFilter.value && t.domain !== domainFilter.value) return false
    return true
  })
})

// ================================================================
// 目标完成度可视化 - 计算每个目标下已完成子计划占比
// ================================================================
function targetProgress(targetId: string): number {
  const children = goal.childrenOf(targetId)
  if (!children.length) return 0
  const done = children.filter(p => p.status === 'bloom').length
  return Math.round((done / children.length) * 100)
}

// ================================================================
// 删除确认 - 防止误删
// ================================================================
const confirmTarget = ref<Goal | null>(null)

function requestDelete(t: Goal) {
  confirmTarget.value = t
}

function doDelete() {
  if (confirmTarget.value) {
    goal.remove(confirmTarget.value.id)
    confirmTarget.value = null
  }
}

function cancelDelete() {
  confirmTarget.value = null
}

// ================================================================
// 目标关联（相关目标配对）
// ================================================================
const goalPairs = computed(() => {
  const ts = goal.targets.value
  const pairs: { a: Goal; b: Goal }[] = []
  for (let i = 0; i < ts.length; i++)
    for (let j = i + 1; j < ts.length; j++)
      if (ts[i].domain === ts[j].domain) pairs.push({ a: ts[i], b: ts[j] })
  return pairs.slice(0, 5)
})

// ================================================================
// 穹顶星光（愿景）
// ================================================================
function starX(id: string) { return (id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 80) + 10 }
function starY(id: string) { return (id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 60) + 5 }

// ================================================================
// 职业发展
// ================================================================
const careerSteps = computed(() => goal.targets.value.filter(t => t.domain === 'work'))

// ================================================================
// 财富规划
// ================================================================
const wealthGoal = ref(0)
const wealthTarget = light.wealthTarget
const wealthCurrent = computed(() => {
  try {
    const l = storage.getKV<any[]>('hf:ledger', [])
    const inc = l.filter((r: any) => r.type === 'income').reduce((a: number, r: any) => a + (r.amount || 0), 0)
    const exp = l.filter((r: any) => r.type === 'expense').reduce((a: number, r: any) => a + (r.amount || 0), 0)
    return inc - exp
  } catch { return 0 }
})
const wealthPct = computed(() => wealthTarget.value > 0 ? Math.min(Math.round((wealthCurrent.value / wealthTarget.value) * 100), 100) : 0)
function saveWealthGoal() {
  if (wealthGoal.value > 0) {
    light.saveWealthTarget(wealthGoal.value)
    wealthGoal.value = 0
  }
}

// ================================================================
// 创建弹窗
// ================================================================
const showModal = ref(false)
const createTier = ref<GoalTier>('target')
const form = reactive({ title: '', domain: 'growth' as Domain })
function openCreate(tier: GoalTier) { createTier.value = tier; form.title = ''; form.domain = 'growth'; showModal.value = true }
function saveGoal() { if (!form.title.trim()) return; goal.create(form.title, createTier.value, form.domain); showModal.value = false }
function tierLabel(t: GoalTier) { return t === 'vision' ? '愿景' : t === 'target' ? '目标' : '计划' }
function statusIcon(s: GoalStatus) { const m: Record<string, string> = { seed: '🌱', sprout: '🌿', growing: '🌳', bloom: '🌸', dormant: '💤' }; return m[s] || '🌱' }

// ================================================================
// 旧梦潭 - 已完成的目标
// ================================================================

/** 所有已完成的目标（status === bloom 或带有 completedAt） */
const oldDreams = computed(() =>
  goal.targets.value.filter(t => t.status === 'bloom' || t.completedAt)
)

/** 将已完成目标恢复为生长中状态 */
function reviveGoal(id: string) {
  const g = goal.goals.value.find(g => g.id === id)
  if (!g) return
  g.status = 'growing'
  g.completedAt = undefined
  goal.update(id, { status: 'growing' })
}

/** 格式化日期，例如 "2026-06-15T00:00:00Z" → "6月15日" */
function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// ================================================================
// 专项规划区 · 跨目标专项规划
// ================================================================

const specialPlans = light.specialPlans

/** 通用目标 ID → 标题查表 */
function getGoalTitle(goalId: string): string {
  const g = goal.goals.value.find(g => g.id === goalId)
  return g?.title || goalId
}

/** 创建专项规划 */
function createSpecialPlan(title: string, description: string, relatedGoalIds: string[]) {
  const now = new Date().toISOString()
  const plan: SpecialPlan = {
    id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    description,
    relatedGoalIds,
    milestones: [],
    createdAt: now,
    updatedAt: now,
  }
  specialPlans.value.push(plan)
  light.saveSpecialPlans(specialPlans.value)
}

/** 切换里程碑完成状态 */
function toggleMilestone(planId: string, index: number) {
  const plan = specialPlans.value.find(p => p.id === planId)
  if (!plan || !plan.milestones[index]) return
  plan.milestones[index].done = !plan.milestones[index].done
  plan.updatedAt = new Date().toISOString()
  light.saveSpecialPlans(specialPlans.value)
}

/** 添加里程碑 */
function addMilestone(planId: string, label: string) {
  const plan = specialPlans.value.find(p => p.id === planId)
  if (!plan || !label.trim()) return
  plan.milestones.push({ label: label.trim(), done: false })
  plan.updatedAt = new Date().toISOString()
  light.saveSpecialPlans(specialPlans.value)
}

/** 删除专项规划 */
function deleteSpecialPlan(planId: string) {
  specialPlans.value = specialPlans.value.filter(p => p.id !== planId)
  light.saveSpecialPlans(specialPlans.value)
}

/** 专项规划完成度百分比 */
function specialPlanProgress(plan: SpecialPlan): number {
  if (!plan.milestones.length) return 0
  const done = plan.milestones.filter(m => m.done).length
  return Math.round((done / plan.milestones.length) * 100)
}

/** 专项规划创建弹窗 */
const showSpecialPlanModal = ref(false)
const specialPlanForm = reactive({ title: '', description: '', selectedGoalIds: [] as string[] })
const newMilestoneLabel = ref('')

function openSpecialPlanModal() {
  specialPlanForm.title = ''
  specialPlanForm.description = ''
  specialPlanForm.selectedGoalIds = []
  showSpecialPlanModal.value = true
}

function saveSpecialPlan() {
  if (!specialPlanForm.title.trim()) return
  createSpecialPlan(specialPlanForm.title.trim(), specialPlanForm.description.trim(), specialPlanForm.selectedGoalIds)
  showSpecialPlanModal.value = false
}

function toggleGoalSelection(goalId: string) {
  const idx = specialPlanForm.selectedGoalIds.indexOf(goalId)
  if (idx >= 0) specialPlanForm.selectedGoalIds.splice(idx, 1)
  else specialPlanForm.selectedGoalIds.push(goalId)
}

/** 专项规划展开编辑 */
const expandedPlanId = ref<string | null>(null)

function toggleExpandPlan(planId: string) {
  expandedPlanId.value = expandedPlanId.value === planId ? null : planId
}
</script>

<style scoped>
/* ================================================================
   深夜食堂 · 暖琥珀主题
   ================================================================ */

/* ---- 全局容器 + 环境光晕 ---- */
.pavilion {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 32px 80px;
  min-height: 100%;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  background: transparent;
}
.pavilion::before,
.pavilion::after {
  content: '';
  position: fixed;
  top: 0;
  width: 220px;
  height: 100dvh;
  pointer-events: none;
  z-index: 0;
}
.pavilion::before {
  left: 0;
  background: radial-gradient(ellipse at left center, rgba(var(--accent-rgb), 0.05), transparent 70%);
}
.pavilion::after {
  right: 0;
  background: radial-gradient(ellipse at right center, rgba(var(--accent-rgb), 0.05), transparent 70%);
}

/* ================================================================
   氛围背景层：留光阁 · 光之庭
   ================================================================ */
.pavilion-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.pav-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}
.pav-glow--top {
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.08), transparent 70%);
}
.pav-glow--mid {
  top: 40%;
  left: 30%;
  width: 300px;
  height: 200px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04), transparent 70%);
  filter: blur(100px);
}
.pav-glow--bottom {
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 200px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.05), transparent 70%);
}
.pav-lightbeams {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.pav-lightbeams svg {
  width: 100%;
  height: 100%;
  max-width: 600px;
  opacity: 0.6;
}

/* 漂浮光点动画 */
.pav-float {
  animation: pavFloat 8s ease-in-out infinite;
}
.pav-float--1 { animation-delay: 0s; animation-duration: 7s; }
.pav-float--2 { animation-delay: 1.5s; animation-duration: 9s; }
.pav-float--3 { animation-delay: 3s; animation-duration: 8s; }
.pav-float--4 { animation-delay: 0.8s; animation-duration: 10s; }
.pav-float--5 { animation-delay: 2.2s; animation-duration: 7.5s; }
.pav-float--6 { animation-delay: 4s; animation-duration: 8.5s; }
.pav-float--7 { animation-delay: 1s; animation-duration: 9.5s; }
.pav-float--8 { animation-delay: 3.5s; animation-duration: 6.5s; }
@keyframes pavFloat {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.08; }
  50% { transform: translateY(-20px) scale(1.5); opacity: 0.18; }
}

/* 水面波纹动画 */
.pav-water-ripple {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  opacity: 0.5;
}
.ripple-line {
  animation: rippleDrift 12s ease-in-out infinite;
}
.ripple-line--1 { animation-delay: 0s; }
.ripple-line--2 { animation-delay: 2s; }
.ripple-line--3 { animation-delay: 4s; }
@keyframes rippleDrift {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(10px); }
}

/* ---- 装饰性头部 ---- */
.pavilion-header {
  text-align: center;
  padding: 48px 0 24px;
  position: relative;
  z-index: 1;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}
.orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.35), transparent);
}
.orn-diamond {
  color: var(--accent);
  font-size: 10px;
  opacity: 0.7;
}
.header-kicker {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 1.5px;
  margin: 0 0 12px;
  font-weight: 300;
}
.header-title {
  font-family: var(--font-heading-zh);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: 4px;
  color: var(--text-high);
  margin: 0 0 24px;
}

/* ---- 统计概览卡片 ---- */
.stats-overview {
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border-right: 1px solid rgba(var(--accent-rgb), 0.08);
}
.stat-item:last-child { border-right: none; }
.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-high);
  line-height: 1.2;
}
.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ---- 搜索与筛选栏 ---- */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
  position: relative;
  z-index: 1;
}
.search-row { width: 100%; }
.search-input {
  width: 100%;
  padding: 9px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.25s;
}
.search-input:focus { border-color: rgba(var(--accent-rgb), 0.25); }
.search-input::placeholder { color: var(--text-dim); }

/* ---- Tab 导航栏 ---- */
.tab-bar {
  display: flex;
  gap: 4px;
  background: var(--card-bg);
  border-radius: 10px;
  padding: 3px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.tab-btn {
  flex: 1;
  padding: 6px 0;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.3px;
}
.tab-btn:hover {
  color: rgba(var(--text-primary-rgb), 0.75);
}
.tab-btn.active {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}

/* ---- 领域筛选 ---- */
.domain-filter-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.domain-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: var(--text-low);
  font-size: 10px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  min-height: 26px;
}
.domain-btn-sm:hover { color: rgba(var(--text-primary-rgb), 0.6); }
.domain-btn-sm.active { color: var(--text-high); border-color: currentColor; }

/* ---- 穹顶星光（愿景） ---- */
.dome-section {
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}
.vision-header { margin-bottom: 10px; }
.dome-stars {
  height: 80px;
  position: relative;
  border-radius: 14px;
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.08), transparent 80%);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  overflow: hidden;
}
.dome-glow-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.stars-canvas { position: relative; height: 100%; z-index: 1; }
.dome-star {
  position: absolute;
  color: var(--accent);
  animation: star-twinkle 3s ease-in-out infinite;
  cursor: pointer;
  transition: text-shadow 0.3s, transform 0.3s;
  filter: drop-shadow(0 0 3px rgba(var(--accent-rgb), 0.3));
}
.dome-star:hover {
  transform: scale(1.4);
  filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.6));
}
@keyframes star-twinkle {
  0%, 100% { opacity: 0.25; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.15); }
}

/* ---- 目标与计划层级 ---- */
.goal-tier {
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}
.tier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}
.btn-add-sm {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-add-sm:hover {
  background: rgba(55, 48, 40, 0.7);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.25);
}
.tier-empty {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.15);
  padding: 10px 0;
  font-style: italic;
}

/* ---- 目标卡片列表 ---- */
.goal-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.goal-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.goal-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: radial-gradient(ellipse at 30% 50%, rgba(var(--accent-rgb), 0.04), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}
.goal-card:hover {
  background: rgba(55, 48, 40, 0.7);
  border-color: rgba(var(--accent-rgb), 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(var(--accent-rgb), 0.08);
}
.goal-card:hover::before {
  opacity: 1;
}
.card-body {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  cursor: pointer;
}
.card-body:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 8px;
}
.card-icon { font-size: 18px; flex-shrink: 0; }
.card-info { flex: 1; min-width: 0; }
.card-title {
  font-size: 14px;
  color: var(--text-high);
  display: block;
}
.card-meta {
  font-size: 10px;
  color: var(--text-dim);
}
.line-through { text-decoration: line-through; opacity: 0.5; }
.child-count {
  font-size: 10px;
  color: var(--text-secondary);
}

/* ---- 卡片操作按钮 ---- */
.card-actions {
  display: flex;
  gap: 4px;
}
.act-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.4;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.act-btn:hover { opacity: 0.8; background: rgba(var(--accent-rgb), 0.08); }
.act-btn.del:hover { color: #e07050; }

/* ---- 完成度进度条 ---- */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.progress-bar {
  width: 44px;
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
  transition: width 0.4s ease;
}
.progress-text {
  font-size: 10px;
  color: var(--text-low);
  min-width: 22px;
  text-align: right;
}

/* ---- 计划层 ---- */
.plan-check { font-size: 16px; cursor: pointer; flex-shrink: 0; }
.plan-check:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
.plan-progress { font-size: 11px; color: var(--text-dim); }
.plan-card.done { opacity: 0.55; }

/* ---- 计划删除按钮 (lp-del) ---- */
.lp-del {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.goal-card:hover .lp-del { opacity: 1; }
.lp-del:hover { color: #e07050; }

/* ---- 目标关联 ---- */
.goal-links {
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}
.link-hint {
  font-size: 11px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 6px;
}
.link-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.link-chip {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid;
  font-size: 11px;
  color: var(--text-secondary);
}

/* ---- 职业发展与财富规划 ---- */
.career-zone,
.wealth-zone {
  margin-bottom: 20px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  position: relative;
  z-index: 1;
}
.career-zone h3,
.wealth-zone h3 {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 400;
}
.career-steps { display: flex; gap: 6px; flex-wrap: wrap; }
.career-step {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid;
  color: var(--text-secondary);
}

/* ---- 财富规划控件 (lp-input / lp-btn) ---- */
.add-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.lp-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.25s;
}
.lp-input:focus { border-color: rgba(var(--accent-rgb), 0.25); }
.lp-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.lp-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.3);
}
.wealth-bar-wrap { margin-top: 8px; }
.wealth-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
  margin-bottom: 4px;
}
.wealth-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #c49560, var(--accent));
  transition: width 0.5s;
}
.wealth-bar-wrap span {
  font-size: 11px;
  color: var(--text-dim);
}

/* ---- 弹窗 ---- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 8, 6, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: var(--bg-deep);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 14px;
  padding: 24px;
  width: 360px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 86vh;
  overflow-y: auto;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.modal-card h3 {
  font-size: 16px;
  color: var(--text-high);
  font-weight: 500;
}
.form-input {
  padding: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.25s;
}
.form-input:focus { border-color: rgba(var(--accent-rgb), 0.25); }
.form-input::placeholder { color: var(--text-dim); }
.domain-pick {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.domain-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.45);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.domain-btn:hover { color: rgba(var(--text-primary-rgb), 0.75); }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.45);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel:hover {
  color: rgba(var(--text-primary-rgb), 0.75);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.btn-save {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-family: inherit;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}
.btn-save:hover { background: #c49560; }
.btn-save:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-danger {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: rgba(224, 112, 80, 0.8);
  color: #fff;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-danger:hover { background: #e07050; }

/* ---- 删除确认弹窗 ---- */
.confirm-dialog .confirm-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}
.confirm-dialog .confirm-text strong {
  color: var(--text-high);
}

/* ---- 弹窗过渡动画 ---- */
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }

/* ---- 旧梦潭：已完成的目标 ---- */
.old-dreams {
  margin-bottom: 20px;
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.6), rgba(var(--bg-card-rgb), 0.3));
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  position: relative;
  z-index: 1;
  overflow: hidden;
}
.old-dreams::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to top, rgba(var(--accent-rgb), 0.04), transparent);
  pointer-events: none;
  border-radius: 0 0 12px 12px;
}
.old-dreams-water {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  pointer-events: none;
  opacity: 0.6;
}
.old-dreams-water svg {
  width: 100%;
  height: 100%;
}
.dream-ripple {
  animation: dreamRipple 6s ease-in-out infinite;
}
.dream-ripple--1 { animation-delay: 0s; }
.dream-ripple--2 { animation-delay: 1.5s; }
.dream-ripple--3 { animation-delay: 3s; }
@keyframes dreamRipple {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(-5px); opacity: 1; }
}
.old-dreams-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.old-dreams-title {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
}
.old-dreams-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.08);
  padding: 1px 8px;
  border-radius: 8px;
}
.old-dreams-empty {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.15);
  padding: 6px 0 2px;
  font-style: italic;
  margin: 0;
}

/* ---- 月份分组 ---- */
.old-month-group {
  margin-bottom: 10px;
}
.old-month-group:last-child {
  margin-bottom: 0;
}
.old-month-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

/* ---- 旧梦卡片 ---- */
.old-dream-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  margin-bottom: 4px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.old-dream-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: radial-gradient(ellipse at 80% 50%, rgba(var(--accent-rgb), 0.03), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.old-dream-card:hover {
  background: rgba(55, 48, 40, 0.6);
  border-color: rgba(var(--accent-rgb), 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}
.old-dream-card:hover::after {
  opacity: 1;
}
.old-dream-card .card-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.old-dream-card .card-info {
  flex: 1;
  min-width: 0;
}
.old-dream-card .card-title {
  font-size: 13px;
  color: var(--text-bright);
  display: block;
}
.old-dream-card .card-meta {
  font-size: 10px;
  color: var(--text-low);
}

/* ---- 复苏按钮 ---- */
.revive-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(52, 211, 153, 0.2);
  background: rgba(52, 211, 153, 0.08);
  color: rgba(52, 211, 153, 0.7);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s;

  min-height: 26px;
}
.revive-btn:hover {
  background: rgba(52, 211, 153, 0.15);
  border-color: rgba(52, 211, 153, 0.35);
  color: rgba(52, 211, 153, 0.9);
}

/* ---- 专项规划区 ---- */
.special-plan-section {
  margin-bottom: 20px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  position: relative;
  z-index: 1;
}
.section-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.section-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
}
.section-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.08);
  padding: 1px 8px;
  border-radius: 8px;
}
.section-add-btn {
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.section-add-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.25);
}
.special-plan-empty {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.15);
  padding: 6px 0 2px;
  font-style: italic;
  margin: 0;
}
.special-plan-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.special-plan-card {
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}
.special-plan-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: radial-gradient(ellipse at 20% 0%, rgba(var(--accent-rgb), 0.04), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.special-plan-card:hover {
  border-color: rgba(var(--accent-rgb), 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(var(--accent-rgb), 0.06);
}
.special-plan-card:hover::before {
  opacity: 1;
}
.plan-card-header {
  padding: 10px 12px;
  cursor: pointer;
}
.plan-card-header:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 8px;
}
.plan-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.plan-card-title {
  font-size: 14px;
  color: var(--text-high);
  font-weight: 500;
}
.plan-card-progress {
  font-size: 11px;
  color: var(--text-low);
}
.plan-card-desc {
  font-size: 12px;
  color: var(--text-dim);
  margin: 0 0 6px;
  line-height: 1.4;
}
.plan-progress-bar {
  height: 3px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
  margin-bottom: 6px;
}
.plan-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), #c49560);
  transition: width 0.4s ease;
}
.plan-goal-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.plan-goal-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-low);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.plan-card-body {
  padding: 0 12px 10px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
  padding-top: 8px;
}
.milestone-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.milestone-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}
.milestone-row:hover {
  background: var(--card-bg);
}
.milestone-row.done {
  opacity: 0.55;
}
.milestone-row.done .ms-label {
  text-decoration: line-through;
}
.ms-check {
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--text-dim);
  transition: color 0.15s;
}
.ms-check:hover {
  color: var(--accent);
}
.ms-check:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
  color: var(--accent);
}
.milestone-row.done .ms-check {
  color: rgba(52, 211, 153, 0.7);
}
.ms-label {
  font-size: 13px;
  color: var(--text-bright);
}
.milestone-add-row {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}
.ms-input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-bright);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.ms-input:focus {
  border-color: rgba(var(--accent-rgb), 0.2);
}
.ms-input::placeholder {
  color: var(--text-faint);
}
.ms-add-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.ms-add-btn:hover {
  background: rgba(var(--accent-rgb), 0.15);
}
.plan-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.04);
}
.plan-card-date {
  font-size: 10px;
  color: var(--text-faint);
}
.plan-delete-btn {
  padding: 2px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: rgba(224, 112, 80, 0.5);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.plan-delete-btn:hover {
  color: #e07050;
  background: rgba(224, 112, 80, 0.08);
}

/* ---- 专项规划目标选择 ---- */
.goal-pick {
  margin-top: 4px;
}
.goal-pick-label {
  font-size: 11px;
  color: var(--text-low);
  display: block;
  margin-bottom: 6px;
}
.goal-pick-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  max-height: 120px;
  overflow-y: auto;
}
.goal-pick-btn {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.45);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.goal-pick-btn:hover {
  color: rgba(var(--text-primary-rgb), 0.75);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.goal-pick-btn.active {
  color: var(--text-high);
  background: var(--card-bg);
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .pavilion { padding: 0 20px 64px; }
  .stats-overview { gap: 8px; }
  .goal-cards { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .pavilion { padding: 0 14px 56px; }
  .stats-overview { flex-direction: column; }
}

@media (max-width: 480px) {
  .pavilion { padding: 0 12px 56px; }
  .stats-overview { gap: 6px; flex-direction: column; }
}
</style>