<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance sc">
    <!-- 氛围背景层：锻炉工痕 -->
    <div data-enter class="sc-ambient" aria-hidden="true">
      <div class="sc-glow sc-glow--top"></div>
      <div class="sc-glow sc-glow--bottom"></div>
      <div class="sc-forge-svg" aria-hidden="true">
        <svg viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="1" opacity="0.04">
            <path d="M120,480 L120,380 Q120,360 140,360 L260,360 Q280,360 280,380 L280,480 Z" />
            <path d="M100,510 L100,480 L300,480 L300,510 Z" />
            <path d="M160,360 L160,300 Q160,280 180,280 L220,280 Q240,280 240,300 L240,360" />
            <path d="M150,280 L150,260 Q150,240 170,240 L230,240 Q250,240 250,260 L250,280" />
            <rect x="190" y="220" width="20" height="20" rx="4" />
          </g>
          <g stroke="currentColor" stroke-width="0.8" opacity="0.03">
            <path d="M310,280 Q340,260 350,220 Q355,200 340,190" />
            <path d="M320,300 Q360,280 370,230 Q375,200 355,180" />
            <path d="M300,320 Q330,310 345,270 Q355,240 350,210" />
            <path d="M290,340 Q320,330 335,290 Q345,260 340,230" />
          </g>
          <g fill="currentColor" opacity="0.03">
            <circle cx="330" cy="200" r="2" />
            <circle cx="350" cy="180" r="1.5" />
            <circle cx="320" cy="170" r="1" />
            <circle cx="360" cy="210" r="1.2" />
            <circle cx="340" cy="160" r="0.8" />
            <circle cx="310" cy="190" r="1.5" />
          </g>
          <g opacity="0.025">
            <path d="M160,510 Q180,490 200,510 Q220,530 240,510 Q260,490 280,510" fill="none" stroke="currentColor" stroke-width="1.5" />
            <path d="M140,530 Q170,500 200,530 Q230,560 260,530 Q290,500 320,530" fill="none" stroke="currentColor" stroke-width="1" />
          </g>
        </svg>
      </div>
      <div class="sc-anvil-wrap">
        <!-- 点击砧板触发锻打 -->
        <div
          class="sc-anvil-svg"
          :class="{ 'sc-anvil--strike': isStriking }"
          @click="strikeAnvil"
        >
          <div class="sc-anvil-spark" v-if="showSpark">
            <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g class="sc-spark-particle sc-spark-p1" fill="#e8c060">
                <circle cx="200" cy="80" r="3" />
              </g>
              <g class="sc-spark-particle sc-spark-p2" fill="#f0a050">
                <circle cx="220" cy="90" r="2" />
              </g>
              <g class="sc-spark-particle sc-spark-p3" fill="#e8c060">
                <circle cx="180" cy="100" r="2" />
              </g>
              <g class="sc-spark-particle sc-spark-p4" fill="#f0c080">
                <circle cx="210" cy="70" r="1.5" />
              </g>
              <g class="sc-spark-particle sc-spark-p5" fill="#e8c060">
                <circle cx="190" cy="85" r="1.5" />
              </g>
              <g class="sc-spark-particle sc-spark-p6" fill="#f0a050">
                <circle cx="230" cy="80" r="1.5" />
              </g>
              <g class="sc-spark-particle sc-spark-p7" fill="#e8c060">
                <circle cx="170" cy="75" r="1" />
              </g>
              <g class="sc-spark-particle sc-spark-p8" fill="#f0c080">
                <circle cx="215" cy="95" r="1" />
              </g>
            </svg>
          </div>
          <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="currentColor" stroke-width="1.5" opacity="0.06">
              <path d="M120,120 L120,80 Q120,60 140,60 L260,60 Q280,60 280,80 L280,120 Z" />
              <path d="M100,140 L100,120 L300,120 L300,140 Z" />
              <path d="M160,60 L160,30 Q160,20 170,20 L230,20 Q240,20 240,30 L240,60" />
              <path d="M310,60 L340,60 L340,80 L310,80 Z" />
              <line x1="325" y1="80" x2="325" y2="110" />
            </g>
            <g fill="currentColor" opacity="0.04">
              <circle cx="275" cy="55" r="3" />
              <circle cx="290" cy="45" r="2" />
              <circle cx="280" cy="35" r="1.5" />
            </g>
          </svg>
          <div class="sc-anvil-hint" :class="{ 'sc-hint--hidden': marks.length > 0 }">点击锻打</div>
        </div>
      </div>
      <div class="sc-ember sc-e-1"></div>
      <div class="sc-ember sc-e-2"></div>
      <div class="sc-ember sc-e-3"></div>
      <div class="sc-ember sc-e-4"></div>
      <div class="sc-ember sc-e-5"></div>
      <div class="sc-ember sc-e-6"></div>
    </div>

    <!-- Header -->
    <div data-enter class="sc-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">工作的身体印记</p>
      <h1 class="sc-title">工痕</h1>
    </div>

    <!-- 统计概览 -->
    <section data-enter class="sc-stats">
      <div class="sc-stat">
        <span class="sc-stat-value">{{ marks.length }}</span>
        <span class="sc-stat-label">印记总数</span>
      </div>
      <div class="sc-stat">
        <span class="sc-stat-value">{{ severeCount }}</span>
        <span class="sc-stat-label">重度(≥4)</span>
      </div>
      <div class="sc-stat">
        <span class="sc-stat-value">{{ thisMonthCount }}</span>
        <span class="sc-stat-label">本月新增</span>
      </div>
      <div class="sc-stat">
        <span class="sc-stat-value">{{ bodyPartCount }}</span>
        <span class="sc-stat-label">涉及部位</span>
      </div>
    </section>

    <!-- 身体部位分布 -->
    <section data-enter class="sc-body-section" v-if="marks.length">
      <h3 class="sc-section-label">🏷 部位分布</h3>
      <div class="sc-body-chart">
        <div v-for="p in bodyDistribution" :key="p.part" class="sc-body-row">
          <span class="sc-body-part">{{ p.part }}</span>
          <div class="sc-body-bar-wrap">
            <div class="sc-body-bar" :style="{ width: p.percent + '%' }" :title="p.count + '道'"></div>
          </div>
          <span class="sc-body-count">{{ p.count }}</span>
        </div>
      </div>
    </section>

    <!-- 添加印记 -->
    <section data-enter class="sc-form-section">
      <h3 class="sc-section-label">{{ editingMark ? '✏ 编辑印记' : '🔨 新印记' }}</h3>
      <div class="sc-form">
        <div class="sc-form-row">
          <select v-model="formPart" class="sc-input sc-select">
            <option value="" disabled>选择部位</option>
            <option v-for="p in bodyParts" :key="p" :value="p">{{ p }}</option>
          </select>
          <div class="sc-severity-group">
            <span class="sc-severity-label">严重度</span>
            <button
              v-for="n in 5" :key="n"
              :class="['sc-severity-btn', { active: formSeverity >= n }]"
              @click="formSeverity = n"
              :title="n + '级'"
            >{{ n }}</button>
          </div>
        </div>
        <div class="sc-form-row">
          <div class="sc-type-group">
            <span class="sc-type-label">痕迹类型</span>
            <button
              v-for="st in SCAR_TYPES"
              :key="st.type"
              :class="['sc-type-btn', { active: formScarType === st.type }]"
              :style="{ '--type-color': st.color }"
              @click="formScarType = st.type"
              :title="st.label"
            >{{ st.icon }}</button>
          </div>
        </div>
        <div class="sc-form-row">
          <input v-model="formDesc" placeholder="印记描述（如：久坐腰酸）" class="sc-input" :maxlength="displayCfg.noteMaxLength" />
        </div>
        <div class="sc-form-row sc-form-actions">
          <button v-if="editingMark" class="sc-btn sc-btn--cancel" @click="cancelEdit">取消</button>
          <button class="sc-btn sc-btn--primary" @click="saveMark" :disabled="!formValid">
            {{ editingMark ? '更新' : '记录' }}
          </button>
        </div>
      </div>
    </section>

    <!-- 搜索与筛选 -->
    <div data-enter class="sc-filter-bar" v-if="marks.length">
      <div class="sc-search-box">
        <input
          v-model="searchQuery"
          class="sc-search-input"
          placeholder="搜索描述或部位…"
        />
      </div>
      <select v-model="filterPart" class="sc-filter-select">
        <option value="">全部部位</option>
        <option v-for="p in bodyParts" :key="p" :value="p">{{ p }}</option>
      </select>
      <div class="sc-severity-filter">
        <span class="sc-sev-filter-label">严重度</span>
        <button
          :class="['sc-sev-btn', { active: filterSeverityMin === 0 }]"
          @click="filterSeverityMin = 0; filterSeverityMax = 0"
        >全部</button>
        <button
          :class="['sc-sev-btn', { active: filterSeverityMin === 1 && filterSeverityMax === 2 }]"
          @click="filterSeverityMin = 1; filterSeverityMax = 2"
        >1-2轻</button>
        <button
          :class="['sc-sev-btn', { active: filterSeverityMin === 3 && filterSeverityMax === 3 }]"
          @click="filterSeverityMin = 3; filterSeverityMax = 3"
        >3中</button>
        <button
          :class="['sc-sev-btn', { active: filterSeverityMin === 4 && filterSeverityMax === 5 }]"
          @click="filterSeverityMin = 4; filterSeverityMax = 5"
        >4-5重</button>
      </div>
      <select v-model="sortBy" class="sc-filter-select">
        <option value="date-newest">最新优先</option>
        <option value="date-oldest">最早优先</option>
        <option value="severity-desc">严重度最高</option>
        <option value="severity-asc">严重度最低</option>
      </select>
    </div>

    <!-- 痕迹类型分布 -->
    <section data-enter class="sc-type-section" v-if="marks.length">
      <h3 class="sc-section-label">🔍 痕迹类型分布</h3>
      <div class="sc-type-distribution">
        <div v-for="item in typeDistribution" :key="item.type" class="sc-type-row">
          <span class="sc-type-row-icon">{{ item.icon }}</span>
          <span class="sc-type-row-label">{{ item.label }}</span>
          <div class="sc-type-bar-bg">
            <div class="sc-type-bar-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
          </div>
          <span class="sc-type-row-count">{{ item.count }}</span>
        </div>
      </div>
    </section>

    <!-- 印记时间线（含演化动画） -->
    <section data-enter class="sc-timeline-section" v-if="filteredMarks.length">
      <h3 class="sc-section-label">
        📜 印记时间线
        <span class="sc-timeline-count">{{ filteredMarks.length }} 道</span>
      </h3>
      <div class="sc-timeline">
        <div
          v-for="m in filteredMarks"
          :key="m.id"
          class="sc-timeline-item"
          :class="'sc-tl-state--' + getScarState(m.at)"
        >
          <div class="sc-timeline-dot" :style="dotStyle(m.severity)"></div>
          <div class="sc-timeline-card">
            <div class="sc-timeline-header">
              <span class="sc-timeline-part">{{ m.bodyPart }}</span>
              <span class="sc-timeline-type-icon" :style="{ color: SCAR_TYPES.find(t => t.type === m.scarType)?.color }">
                {{ SCAR_TYPES.find(t => t.type === m.scarType)?.icon }}
              </span>
              <span class="sc-timeline-state" :class="`sc-state--${getScarState(m.at)}`">
                {{ SCAR_STATES.find(s => s.state === getScarState(m.at))?.label }}
              </span>
              <span class="sc-timeline-severity">
                <span v-for="n in m.severity" :key="n" class="sc-timeline-fire">🔥</span>
              </span>
              <span class="sc-timeline-date">{{ fmt(m.at) }}</span>
            </div>
            <p class="sc-timeline-desc">{{ m.description }}</p>
            <!-- 愈合进度条 -->
            <div class="sc-heal-bar-wrap">
              <div class="sc-heal-bar" :style="{ width: healProgress(m.at) + '%' }"></div>
            </div>
            <div class="sc-timeline-actions">
              <button class="sc-timeline-btn" @click="editMark(m)">✏</button>
              <button class="sc-timeline-btn sc-timeline-btn--del" @click="deleteMark(m.id)">✕</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 愈合旅程面板 -->
    <section data-enter class="sc-journey-section" v-if="marks.length">
      <h3 class="sc-section-label">🦋 愈合旅程</h3>
      <div class="sc-journey-card">
        <div class="sc-journey-stage">
          <span class="sc-journey-stage-icon">{{ healingJourney.getStageInfo(journeyData.currentStage)?.icon || '👁️' }}</span>
          <div class="sc-journey-stage-info">
            <span class="sc-journey-stage-label">{{ healingJourney.getStageInfo(journeyData.currentStage)?.label || journeyData.currentStage }}</span>
            <span class="sc-journey-stage-desc">{{ healingJourney.getStageInfo(journeyData.currentStage)?.description || '' }}</span>
          </div>
          <div class="sc-journey-stage-progress">
            <span class="sc-journey-progress-value">{{ journeyData.stageProgress }}%</span>
            <div class="sc-journey-progress-bar">
              <div class="sc-journey-progress-fill" :style="{ width: journeyData.stageProgress + '%' }"></div>
            </div>
          </div>
        </div>
        <div class="sc-journey-meta">
          <div class="sc-journey-stat">
            <span class="sc-journey-stat-value">{{ journeyData.totalMarks }}</span>
            <span class="sc-journey-stat-label">印记总数</span>
          </div>
          <div class="sc-journey-stat">
            <span class="sc-journey-stat-value">{{ journeyData.transformedCount }}</span>
            <span class="sc-journey-stat-label">已转化</span>
          </div>
          <div class="sc-journey-stat">
            <span class="sc-journey-stat-value">{{ journeyData.resilienceScore }}</span>
            <span class="sc-journey-stat-label">韧性评分</span>
          </div>
        </div>
        <!-- 里程碑进度 -->
        <div class="sc-journey-milestones">
          <span class="sc-journey-milestone-title">里程碑</span>
          <div class="sc-journey-milestone-list">
            <div
              v-for="ms in journeyData.milestones"
              :key="ms.id"
              class="sc-journey-milestone-item"
              :class="{ 'sc-milestone--achieved': ms.achieved }"
            >
              <span class="sc-milestone-dot" :class="{ 'sc-milestone-dot--done': ms.achieved }"></span>
              <span class="sc-milestone-name">{{ ms.name }}</span>
            </div>
          </div>
        </div>
        <!-- 下一步建议 -->
        <div class="sc-journey-next" v-if="journeyData.nextSteps.length">
          <span class="sc-journey-next-title">下一步</span>
          <ul class="sc-journey-next-list">
            <li v-for="(step, i) in journeyData.nextSteps" :key="i">{{ step }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 叙事增强面板 -->
    <section data-enter class="sc-narrative-section" v-if="marks.length">
      <h3 class="sc-section-label">📖 叙事增强</h3>
      <div class="sc-narrative-card">
        <div class="sc-narrative-mode">
          <span class="sc-narrative-mode-icon">{{ narrative.getPatternInfo(narrativeData.primaryPattern.pattern)?.icon || '📖' }}</span>
          <div class="sc-narrative-mode-info">
            <span class="sc-narrative-mode-label">{{ narrative.getPatternInfo(narrativeData.primaryPattern.pattern)?.label || narrativeData.primaryPattern.pattern }}</span>
            <span class="sc-narrative-mode-score">匹配度 {{ Math.round(narrativeData.primaryPattern.score * 100) }}%</span>
          </div>
        </div>
        <div class="sc-narrative-meta">
          <div class="sc-narrative-stat">
            <span class="sc-narrative-stat-label">叙事基调</span>
            <span class="sc-narrative-stat-value">{{ TONE_LABELS[narrativeData.tone] || narrativeData.tone }}</span>
          </div>
          <div class="sc-narrative-stat">
            <span class="sc-narrative-stat-label">叙事成熟度</span>
            <span class="sc-narrative-stat-value">{{ narrativeData.maturity }}/100</span>
          </div>
        </div>
        <!-- 关键主题 -->
        <div class="sc-narrative-themes" v-if="narrativeData.themes.length">
          <span class="sc-narrative-themes-label">关键主题</span>
          <div class="sc-narrative-theme-tags">
            <span v-for="t in narrativeData.themes" :key="t" class="sc-narrative-theme-tag">{{ t }}</span>
          </div>
        </div>
        <!-- 叙事弧线 -->
        <div class="sc-narrative-arc">
          <span class="sc-narrative-arc-label">叙事弧线</span>
          <div class="sc-narrative-arc-flow">
            <div class="sc-arc-node">
              <span class="sc-arc-node-label">起点</span>
              <span class="sc-arc-node-text">{{ narrativeData.narrativeArc.origin }}</span>
            </div>
            <div class="sc-arc-connector">
              <span class="sc-arc-arrow">→</span>
            </div>
            <div class="sc-arc-node">
              <span class="sc-arc-node-label">转折</span>
              <span class="sc-arc-node-text">{{ narrativeData.narrativeArc.turningPoint }}</span>
            </div>
            <div class="sc-arc-connector">
              <span class="sc-arc-arrow">→</span>
            </div>
            <div class="sc-arc-node">
              <span class="sc-arc-node-label">结局</span>
              <span class="sc-arc-node-text">{{ narrativeData.narrativeArc.resolution }}</span>
            </div>
          </div>
          <span class="sc-arc-type" :class="'sc-arc-type--' + narrativeData.narrativeArc.type">{{ ARC_TYPE_LABELS[narrativeData.narrativeArc.type] || narrativeData.narrativeArc.type }}</span>
        </div>
        <!-- 增强建议 -->
        <div class="sc-narrative-suggestions" v-if="narrativeData.suggestions.length">
          <span class="sc-narrative-suggestions-label">增强建议</span>
          <div class="sc-narrative-suggestion-list">
            <div v-for="(s, i) in narrativeData.suggestions" :key="i" class="sc-narrative-suggestion-item" :class="'sc-suggestion--' + s.priority">
              <span class="sc-suggestion-type">{{ SUGGESTION_TYPE_LABELS[s.type] }}</span>
              <span class="sc-suggestion-title">{{ s.title }}</span>
              <p class="sc-suggestion-advice">{{ s.advice }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 伤痕可视化面板（INCR-161：补挂载 claim-but-orphan 面板） -->
    <section data-enter class="sc-viz-section" v-if="marks.length">
      <ScarVisualizationPanel />
    </section>

    <!-- 伤痕因果链面板（INCR-171：补挂载孤儿面板，引擎 causal-chain.ts 完备） -->
    <section data-enter class="sc-ccp-section" v-if="marks.length">
      <CausalChainPanel :marks="adaptedMarks" />
    </section>

    <!-- 空状态 -->
    <div data-enter v-if="!marks.length" class="sc-empty">
      <p>锻炉安静，尚无印记。</p>
      <p class="sc-empty-hint">点击右上角砧板，或使用下方表单开始记录</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useHealingJourney } from '../modules/scar/healing-journey'
import { useNarrativeEnhancer } from '../modules/scar/narrative-enhancer'
import { useScarMarks } from '../modules/scar/marks'
import type { BodyMark as ModuleBodyMark, ScarStats, HealingStage, SeverityLevel, BodyPart } from '../modules/scar/types'
import ScarVisualizationPanel from '../components/ScarVisualizationPanel.vue'
import CausalChainPanel from '../components/CausalChainPanel.vue'
const { entranceRef, entranceClass } = useViewEntrance()
const healingJourney = useHealingJourney()
const narrative = useNarrativeEnhancer()
const scarMarks = useScarMarks()
const displayCfg = storage.getConfig().display

// 视图挂载时从存储载入痕记
onMounted(() => {
  scarMarks.load()
})

type ScarType = 'impact' | 'cut' | 'burn' | 'wear'

const SCAR_TYPES: { type: ScarType; icon: string; color: string; label: string }[] = [
  { type: 'impact', icon: '🔨', color: '#c48a6a', label: '撞击' },
  { type: 'cut', icon: '🔪', color: '#d08080', label: '割裂' },
  { type: 'burn', icon: '🔥', color: '#e06040', label: '灼烧' },
  { type: 'wear', icon: '🧊', color: '#8a8a7a', label: '磨损' },
]

type ScarState = 'fresh' | 'healing' | 'scarred'

const SCAR_STATES: { state: ScarState; label: string; days: number }[] = [
  { state: 'fresh', label: '新鲜', days: 0 },
  { state: 'healing', label: '愈合', days: 3 },
  { state: 'scarred', label: '疤痕', days: 7 },
]

// ---- 叙事增强标签映射 ----
const TONE_LABELS: Record<string, string> = {
  triumphant: '胜利',
  reflective: '反思',
  melancholic: '忧郁',
  hopeful: '希望',
  stoic: '坚忍',
  compassionate: '共情',
}

const ARC_TYPE_LABELS: Record<string, string> = {
  rising: '上升型',
  'falling-then-rising': '先降后升',
  'hero-journey': '英雄之旅',
  transformation: '转化型',
  redemption: '救赎型',
}

const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  structure: '结构',
  emotion: '情感',
  detail: '细节',
  perspective: '视角',
  language: '语言',
}

function getScarState(at: string): ScarState {
  const days = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24)
  if (days >= 7) return 'scarred'
  if (days >= 3) return 'healing'
  return 'fresh'
}

/** 愈合进度：0%（新鲜）→ 100%（疤痕） */
function healProgress(at: string): number {
  const days = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24)
  if (days >= 7) return 100
  if (days <= 0) return 0
  return Math.round((days / 7) * 100)
}

interface BodyMark {
  id: string
  bodyPart: string
  severity: number // 1-5
  description: string
  scarType: ScarType
  at: string
}

const bodyParts = ['头', '颈', '肩', '臂', '手', '背', '腰', '腿', '足', '眼', '全身']

const formPart = ref('')
const formSeverity = ref(3)
const formDesc = ref('')
const formScarType = ref<ScarType>('impact')
const editingMark = ref<BodyMark | null>(null)

// 搜索与筛选
const searchQuery = ref('')
const filterPart = ref('')
const filterSeverityMin = ref(0)
const filterSeverityMax = ref(0)
const sortBy = ref('date-newest')

// 砧板交互状态
const isStriking = ref(false)
const showSpark = ref(false)

const formValid = computed(() => formPart.value && formDesc.value.trim())

const marks = scarMarks.marks

function saveMarks(list: BodyMark[]) {
  scarMarks.save(list)
}

const severeCount = computed(() => marks.value.filter(m => m.severity >= 4).length)
const thisMonthCount = computed(() => {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return marks.value.filter(m => m.at.startsWith(ym)).length
})
const bodyPartCount = computed(() => new Set(marks.value.map(m => m.bodyPart)).size)

const bodyDistribution = computed(() => {
  const map = new Map<string, number>()
  marks.value.forEach(m => map.set(m.bodyPart, (map.get(m.bodyPart) || 0) + 1))
  const total = marks.value.length
  return Array.from(map.entries())
    .map(([part, count]) => ({ part, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
})

const typeDistribution = computed(() => {
  const map = new Map<ScarType, number>()
  for (const st of SCAR_TYPES) map.set(st.type, 0)
  for (const m of marks.value) {
    map.set(m.scarType, (map.get(m.scarType) || 0) + 1)
  }
  const total = marks.value.length || 1
  return SCAR_TYPES.map(st => ({
    ...st,
    count: map.get(st.type) || 0,
    percent: Math.round(((map.get(st.type) || 0) / total) * 100),
  }))
})

const filteredMarks = computed(() => {
  let result = [...marks.value]
  // 部位筛选
  if (filterPart.value) {
    result = result.filter(m => m.bodyPart === filterPart.value)
  }
  // 严重度筛选
  if (filterSeverityMin.value > 0 || filterSeverityMax.value > 0) {
    result = result.filter(m => m.severity >= filterSeverityMin.value && m.severity <= filterSeverityMax.value)
  }
  // 搜索筛选
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(m =>
      m.description.toLowerCase().includes(q) ||
      m.bodyPart.toLowerCase().includes(q)
    )
  }
  // 排序
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'date-oldest':
        return a.at.localeCompare(b.at)
      case 'severity-desc':
        return b.severity - a.severity
      case 'severity-asc':
        return a.severity - b.severity
      default: // date-newest
        return b.at.localeCompare(a.at)
    }
  })
  return result
})

// ---- 适配本地 BodyMark 到模块 BodyMark 格式 ----
const adaptedMarks = computed<ModuleBodyMark[]>(() =>
  marks.value.map(m => ({
    id: m.id,
    bodyPart: m.bodyPart as unknown as BodyPart,
    severity: m.severity as SeverityLevel,
    description: m.description,
    scarType: m.scarType,
    recordedAt: m.at,
    healingStage: getHealingStage(m.at) as HealingStage,
    healingProgress: healProgress(m.at),
    transformed: false,
  }))
)

/** 根据记录时间判定愈合阶段 */
function getHealingStage(at: string): HealingStage {
  const days = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24)
  if (days < 3) return 'acute'
  if (days < 14) return 'proliferation'
  if (days < 90) return 'remodeling'
  return 'matured'
}

// ---- 工痕统计数据 ----
const scarStats = computed<ScarStats>(() => {
  const total = adaptedMarks.value.length
  const fresh = adaptedMarks.value.filter(m => m.healingStage === 'acute').length
  const healing = adaptedMarks.value.filter(m => m.healingStage === 'proliferation' || m.healingStage === 'remodeling').length
  const scarred = total - fresh - healing
  const transformed = adaptedMarks.value.filter(m => m.transformed).length
  const bodyPartDistribution: Record<BodyPart, number> = {} as Record<BodyPart, number>
  const typeDistribution: Record<import('../modules/scar/types').ScarType, number> = { impact: 0, cut: 0, burn: 0, wear: 0 }
  let totalProgress = 0
  for (const m of adaptedMarks.value) {
    bodyPartDistribution[m.bodyPart] = (bodyPartDistribution[m.bodyPart] || 0) + 1
    typeDistribution[m.scarType]++
    totalProgress += m.healingProgress
  }
  return {
    total,
    fresh,
    healing,
    scarred,
    transformed,
    bodyPartDistribution,
    typeDistribution,
    avgHealingProgress: total > 0 ? Math.round(totalProgress / total) : 0,
    transformationRate: total > 0 ? Math.round((transformed / total) * 100) : 0,
  }
})

// ---- 愈合旅程数据 ----
const journeyData = computed(() =>
  healingJourney.trackJourney(adaptedMarks.value, [], 0, 0)
)

// ---- 叙事增强数据 ----
const narrativeData = computed(() =>
  narrative.enhanceNarrative(adaptedMarks.value, scarStats.value)
)

function dotStyle(severity: number) {
  const colors = ['#c48a6a', '#d49a6a', '#e0a070', '#e8a060', '#f0a050']
  return { background: colors[severity - 1] || colors[0] }
}

function saveMark() {
  const now = new Date().toISOString()
  if (editingMark.value) {
    const list = marks.value.map(m =>
      m.id === editingMark.value!.id
        ? { ...m, bodyPart: formPart.value, severity: formSeverity.value, scarType: formScarType.value, description: formDesc.value.trim(), at: now }
        : m
    )
    saveMarks(list)
    cancelEdit()
  } else {
    const newMark: BodyMark = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      bodyPart: formPart.value,
      severity: formSeverity.value,
      scarType: formScarType.value,
      description: formDesc.value.trim(),
      at: now,
    }
    saveMarks([...marks.value, newMark])
    formPart.value = ''
    formSeverity.value = 3
    formScarType.value = 'impact'
    formDesc.value = ''
  }
}

function editMark(m: BodyMark) {
  editingMark.value = m
  formPart.value = m.bodyPart
  formSeverity.value = m.severity
  formScarType.value = m.scarType
  formDesc.value = m.description
}

function cancelEdit() {
  editingMark.value = null
  formPart.value = ''
  formSeverity.value = 3
  formScarType.value = 'impact'
  formDesc.value = ''
}

function deleteMark(id: string) {
  saveMarks(marks.value.filter(m => m.id !== id))
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 随机部位描述词 */
const PART_DESCRIPTIONS: Record<string, string[]> = {
  '头': ['久坐伏案头痛', '连续加班头晕', '深夜代码头痛'],
  '颈': ['长时间低头颈痛', '屏幕前颈部僵硬', '凌晨颈椎酸痛'],
  '肩': ['高负荷肩周酸痛', '双肩扛重后酸痛', '久坐肩部僵硬'],
  '臂': ['持续敲击手臂酸', '搬重物臂肌拉伤', '重复动作臂痛'],
  '手': ['键盘敲击手指痛', '鼠标手复发', '长时间握笔手僵'],
  '背': ['久坐背部酸痛', '搬设备背部拉伤', '长时间伏案背痛'],
  '腰': ['久坐腰部酸痛', '搬重物腰肌拉伤', '连续加班腰疼'],
  '腿': ['长时间站立腿酸', '奔波后腿部酸痛', '通勤久站腿肿'],
  '足': ['长时间站立脚痛', '奔走一天足底痛', '久站后足跟疼'],
  '眼': ['连续熬夜眼干涩', '长时间盯屏眼酸', '深夜加班眼疲劳'],
  '全身': ['高强度加班全身酸痛', '连续熬夜全身疲惫', '赶项目全身乏力'],
}

/** 随机副词 */
const SEVERITY_ADVERBS: Record<string, string[]> = {
  'impact': ['重击', '冲撞', '冲击'],
  'cut': ['割伤', '划伤', '撕裂'],
  'burn': ['灼痛', '烧灼', '烫伤'],
  'wear': ['磨损', '劳损', '耗损'],
}

/** 砧板锻打：随机生成一个印记 */
function strikeAnvil() {
  if (isStriking.value) return
  isStriking.value = true
  showSpark.value = true

  // 随机选择部位
  const part = bodyParts[Math.floor(Math.random() * bodyParts.length)]
  // 随机严重度（偏向轻中度）
  const weights = [0.3, 0.25, 0.2, 0.15, 0.1]
  const rand = Math.random()
  let cum = 0
  let severity = 1
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i]
    if (rand <= cum) { severity = i + 1; break }
  }
  // 随机痕迹类型
  const types: ScarType[] = ['impact', 'cut', 'burn', 'wear']
  const scarType = types[Math.floor(Math.random() * types.length)]

  // 生成描述
  const descs = PART_DESCRIPTIONS[part] || ['工作留下的印记']
  const advs = SEVERITY_ADVERBS[scarType] || ['留下']
  const prefix = severity >= 4 ? '严重' : severity >= 3 ? '明显' : '轻微'
  const description = `${prefix}${advs[Math.floor(Math.random() * advs.length)]}：${descs[Math.floor(Math.random() * descs.length)]}`

  // 延迟创建印记（配合火花动画）
  setTimeout(() => {
    const newMark: BodyMark = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      bodyPart: part,
      severity,
      scarType,
      description,
      at: new Date().toISOString(),
    }
    saveMarks([...marks.value, newMark])

    // 火花消失
    setTimeout(() => {
      showSpark.value = false
      isStriking.value = false
    }, 400)
  }, 300)
}
</script>

<style scoped>
/* =========================================================
   Forge / Workshop Theme — 工痕 (Scar)
   Color: #c48a6a | Warm copper
   ========================================================= */
:root { --sc-accent: #c48a6a; --sc-bg: #0a0807; }

/* ---- Root ---- */
.sc {
  max-width: 640px; margin: 0 auto; padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  position: relative; overflow: hidden;
}

/* ---- Ambient ---- */
.sc-ambient {
  position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
}
.sc-glow {
  position: absolute; border-radius: 50%; pointer-events: none;
}
.sc-glow--top {
  top: -10%; left: 50%; transform: translateX(-50%);
  width: 600px; height: 500px;
  background: radial-gradient(ellipse, rgba(196,138,106,0.08) 0%, transparent 70%);
}
.sc-glow--bottom {
  bottom: -10%; right: -10%;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(196,138,106,0.05) 0%, transparent 70%);
}
.sc-forge-svg {
  position: absolute; bottom: 5%; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 400px; height: 70%;
  color: var(--sc-accent); opacity: 0.6;
}
.sc-forge-svg svg { width: 100%; height: 100%; }

/* ---- Anvil wrap ---- */
.sc-anvil-wrap {
  position: absolute; top: 12%; right: 5%;
  width: 160px; height: 80px;
  z-index: 2;
}

/* ---- Anvil SVG (interactive) ---- */
.sc-anvil-svg {
  position: relative;
  width: 100%; height: 100%;
  color: var(--sc-accent); opacity: 0.6;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.3s ease;
}
.sc-anvil-svg:hover {
  opacity: 0.9;
  transform: scale(1.05);
}
.sc-anvil-svg:active {
  transform: scale(0.95);
}
.sc-anvil-svg svg { width: 100%; height: 100%; }
.sc-anvil--strike {
  animation: anvil-strike 0.5s ease;
}
@keyframes anvil-strike {
  0% { transform: translateY(0) scale(1); }
  20% { transform: translateY(-6px) scale(1.08); }
  40% { transform: translateY(0) scale(0.95); }
  60% { transform: translateY(-3px) scale(1.02); }
  80% { transform: translateY(0) scale(0.98); }
  100% { transform: translateY(0) scale(1); }
}

/* ---- Spark particles ---- */
.sc-anvil-spark {
  position: absolute; inset: 0;
  z-index: 3;
  pointer-events: none;
}
.sc-anvil-spark svg {
  width: 100%; height: 100%;
}
.sc-spark-particle {
  animation: spark-burst 0.5s ease-out forwards;
}
.sc-spark-p1 { animation-duration: 0.5s; }
.sc-spark-p2 { animation-duration: 0.45s; animation-delay: 0.05s; }
.sc-spark-p3 { animation-duration: 0.48s; animation-delay: 0.03s; }
.sc-spark-p4 { animation-duration: 0.4s; animation-delay: 0.08s; }
.sc-spark-p5 { animation-duration: 0.5s; animation-delay: 0.02s; }
.sc-spark-p6 { animation-duration: 0.42s; animation-delay: 0.06s; }
.sc-spark-p7 { animation-duration: 0.38s; animation-delay: 0.1s; }
.sc-spark-p8 { animation-duration: 0.44s; animation-delay: 0.07s; }

@keyframes spark-burst {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--spark-x, 20px), var(--spark-y, -20px)) scale(0);
    opacity: 0;
  }
}
.sc-spark-p1 { --spark-x: 15px; --spark-y: -25px; }
.sc-spark-p2 { --spark-x: 25px; --spark-y: -10px; }
.sc-spark-p3 { --spark-x: -15px; --spark-y: -20px; }
.sc-spark-p4 { --spark-x: 20px; --spark-y: -30px; }
.sc-spark-p5 { --spark-x: -10px; --spark-y: -15px; }
.sc-spark-p6 { --spark-x: 30px; --spark-y: -15px; }
.sc-spark-p7 { --spark-x: -20px; --spark-y: -25px; }
.sc-spark-p8 { --spark-x: 25px; --spark-y: -5px; }

/* ---- Anvil hint ---- */
.sc-anvil-hint {
  position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
  font-size: 10px; color: rgba(196,138,106,0.4);
  white-space: nowrap; letter-spacing: 1px;
  transition: opacity 0.5s ease;
}
.sc-hint--hidden { opacity: 0; }

/* ---- Floating ember particles ---- */
.sc-ember {
  position: absolute; width: 5px; height: 5px; border-radius: 50%;
  background: var(--sc-accent); opacity: 0;
}
.sc-e-1 { left: 15%; top: 30%; animation: float-ember 12s ease-in-out infinite; }
.sc-e-2 { left: 45%; top: 20%; animation: float-ember 14s ease-in-out infinite 3s; }
.sc-e-3 { left: 70%; top: 35%; animation: float-ember 16s ease-in-out infinite 6s; }
.sc-e-4 { left: 25%; top: 55%; animation: float-ember 13s ease-in-out infinite 2s; }
.sc-e-5 { left: 55%; top: 60%; animation: float-ember 15s ease-in-out infinite 5s; }
.sc-e-6 { left: 80%; top: 45%; animation: float-ember 11s ease-in-out infinite 7s; }
@keyframes float-ember {
  0%, 100% { transform: translateY(0) scale(0); opacity: 0; }
  20% { opacity: 0.1; }
  50% { transform: translateY(-80px) scale(1.2); opacity: 0.15; }
  70% { opacity: 0.05; }
}

/* ---- Header ---- */
.sc-header {
  text-align: center; margin-bottom: 28px; position: relative; z-index: 1;
}
.header-ornament {
  display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px;
}
.orn-line {
  width: 40px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(196,138,106,0.4), transparent);
}
.orn-diamond { color: var(--sc-accent); font-size: 12px; opacity: 0.7; }
.header-kicker {
  font-size: 12px; color: rgba(196,138,106,0.5); letter-spacing: 3px; margin-bottom: 8px; text-transform: uppercase;
}
.sc-title { font-size: 24px; font-weight: 600; letter-spacing: 4px; color: var(--sc-accent); }

/* ---- Stats ---- */
.sc-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  margin-bottom: 28px; position: relative; z-index: 1;
}
.sc-stat {
  text-align: center; padding: 14px 8px;
  background: rgba(196,138,106,0.04); border-radius: 12px;
  border: 1px solid rgba(196,138,106,0.08);
}
.sc-stat-value { display: block; font-size: 22px; font-weight: 600; color: var(--sc-accent); }
.sc-stat-label { display: block; font-size: 11px; color: rgba(196,138,106,0.5); margin-top: 4px; }

/* ---- Section label ---- */
.sc-section-label {
  font-size: 13px; font-weight: 500; color: rgba(196,138,106,0.6);
  letter-spacing: 1px; margin-bottom: 14px;
  display: flex; align-items: center; gap: 8px;
}

/* ---- Body part chart ---- */
.sc-body-section {
  margin-bottom: 28px; position: relative; z-index: 1;
}
.sc-body-chart {
  display: flex; flex-direction: column; gap: 6px;
}
.sc-body-row {
  display: flex; align-items: center; gap: 10px;
}
.sc-body-part {
  width: 28px; font-size: 12px; color: rgba(196,138,106,0.6); text-align: right;
}
.sc-body-bar-wrap {
  flex: 1; height: 10px; border-radius: 5px;
  background: rgba(196,138,106,0.06); overflow: hidden;
}
.sc-body-bar {
  height: 100%; border-radius: 5px;
  background: linear-gradient(90deg, rgba(196,138,106,0.3), var(--sc-accent));
  transition: width 0.4s ease;
}
.sc-body-count { font-size: 11px; color: rgba(196,138,106,0.4); width: 20px; text-align: right; }

/* ---- Type distribution ---- */
.sc-type-section {
  margin-bottom: 28px; position: relative; z-index: 1;
}
.sc-type-distribution {
  display: flex; flex-direction: column; gap: 6px;
}
.sc-type-row {
  display: flex; align-items: center; gap: 10px;
}
.sc-type-row-icon { font-size: 14px; width: 20px; text-align: center; }
.sc-type-row-label {
  font-size: 12px; color: rgba(196,138,106,0.6); width: 28px; text-align: right;
}
.sc-type-bar-bg {
  flex: 1; height: 10px; border-radius: 5px;
  background: rgba(196,138,106,0.06); overflow: hidden;
}
.sc-type-bar-fill {
  height: 100%; border-radius: 5px;
  transition: width 0.5s ease;
}
.sc-type-row-count { font-size: 11px; color: rgba(196,138,106,0.4); width: 20px; text-align: right; }

/* ---- Form ---- */
.sc-form-section {
  margin-bottom: 28px; position: relative; z-index: 1;
}
.sc-form {
  background: rgba(196,138,106,0.03); border: 1px solid rgba(196,138,106,0.08);
  border-radius: 14px; padding: 18px;
}
.sc-form-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.sc-form-row:last-child { margin-bottom: 0; }
.sc-input {
  flex: 1; padding: 8px 12px; font-size: 13px; border: 1px solid rgba(196,138,106,0.12);
  border-radius: 8px; background: rgba(196,138,106,0.03); color: rgba(var(--text-primary-rgb), 0.85);
  outline: none; font-family: inherit;
}
.sc-input:focus { border-color: rgba(196,138,106,0.3); }
.sc-input::placeholder { color: rgba(196,138,106,0.2); }
.sc-select { appearance: none; cursor: pointer; }
.sc-select option { background: #0a0807; color: rgba(var(--text-primary-rgb), 0.85); }

.sc-severity-group {
  display: flex; align-items: center; gap: 4px;
}
.sc-severity-label { font-size: 11px; color: rgba(196,138,106,0.4); margin-right: 4px; }
.sc-severity-btn {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(196,138,106,0.1);
  background: transparent; color: rgba(196,138,106,0.3); font-size: 12px; cursor: pointer;
  transition: all 0.2s;
}
.sc-severity-btn.active {
  background: rgba(196,138,106,0.15); color: var(--sc-accent); border-color: rgba(196,138,106,0.3);
}
.sc-severity-btn:hover { border-color: rgba(196,138,106,0.3); }

/* ---- Scar type ---- */
.sc-type-group {
  display: flex; align-items: center; gap: 6px; width: 100%;
}
.sc-type-label {
  font-size: 11px; color: rgba(196,138,106,0.4); margin-right: 4px; white-space: nowrap;
}
.sc-type-btn {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(196,138,106,0.1);
  background: transparent; font-size: 16px; cursor: pointer;
  transition: all 0.2s; display: flex; align-items: center; justify-content: center;
}
.sc-type-btn:hover {
  border-color: var(--type-color, #c48a6a);
  background: color-mix(in srgb, var(--type-color, #c48a6a) 10%, transparent);
}
.sc-type-btn.active {
  background: color-mix(in srgb, var(--type-color, #c48a6a) 20%, transparent);
  border-color: var(--type-color, #c48a6a);
  box-shadow: 0 0 10px color-mix(in srgb, var(--type-color, #c48a6a) 25%, transparent);
}

.sc-form-actions { justify-content: flex-end; gap: 8px; }
.sc-btn {
  padding: 7px 18px; border-radius: 8px; font-size: 13px; cursor: pointer;
  border: 1px solid transparent; font-family: inherit; transition: all 0.2s;
}
.sc-btn--primary {
  background: rgba(196,138,106,0.15); color: var(--sc-accent); border-color: rgba(196,138,106,0.25);
}
.sc-btn--primary:hover:not(:disabled) { background: rgba(196,138,106,0.25); }
.sc-btn--primary:disabled { opacity: 0.3; cursor: not-allowed; }
.sc-btn--cancel {
  background: transparent; color: rgba(196,138,106,0.4); border-color: rgba(196,138,106,0.1);
}
.sc-btn--cancel:hover { border-color: rgba(196,138,106,0.25); }

/* ---- Timeline ---- */
.sc-timeline-section {
  margin-bottom: 28px; position: relative; z-index: 1;
}
.sc-timeline-count { font-size: 11px; color: rgba(196,138,106,0.3); font-weight: 400; }
.sc-timeline {
  display: flex; flex-direction: column; gap: 12px; position: relative;
}
.sc-timeline::before {
  content: ''; position: absolute; left: 7px; top: 10px; bottom: 10px;
  width: 1px; background: rgba(196,138,106,0.08);
}
.sc-timeline-item {
  display: flex; gap: 16px; align-items: flex-start;
}
.sc-timeline-dot {
  width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0;
  margin-top: 4px; border: 2px solid rgba(10,8,7,0.8);
  box-shadow: 0 0 6px rgba(196,138,106,0.15);
  transition: box-shadow 0.5s ease;
}
.sc-timeline-card {
  flex: 1; background: rgba(196,138,106,0.03); border: 1px solid rgba(196,138,106,0.06);
  border-radius: 10px; padding: 12px 14px;
  transition: border-color 0.5s ease, box-shadow 0.5s ease;
}
.sc-timeline-header {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;
}
.sc-timeline-part { font-size: 12px; font-weight: 500; color: var(--sc-accent); }
.sc-timeline-type-icon { font-size: 13px; line-height: 1; }
.sc-timeline-state {
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  font-weight: 500; letter-spacing: 0.5px;
}
.sc-state--fresh { background: rgba(200,80,60,0.12); color: #c8503c; }
.sc-state--healing { background: rgba(196,138,106,0.12); color: #c48a6a; }
.sc-state--scarred { background: rgba(138,138,122,0.12); color: #8a8a7a; }
.sc-timeline-severity { display: flex; gap: 1px; }
.sc-timeline-fire { font-size: 9px; }
.sc-timeline-date {
  margin-left: auto; font-size: 11px; color: rgba(196,138,106,0.3);
}
.sc-timeline-desc { font-size: 13px; color: rgba(var(--text-primary-rgb), 0.65); line-height: 1.5; margin: 0; }

/* ===== 演化动画：按状态区分 ===== */

/* 新鲜状态：红色脉冲呼吸 */
.sc-tl-state--fresh .sc-timeline-card {
  border-color: rgba(200,80,60,0.15);
  animation: state-fresh-pulse 3s ease-in-out infinite;
}
.sc-tl-state--fresh .sc-timeline-dot {
  animation: dot-fresh-pulse 2s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(200,80,60,0.3);
}
@keyframes state-fresh-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(200,80,60,0); }
  50% { box-shadow: 0 0 12px rgba(200,80,60,0.06); }
}
@keyframes dot-fresh-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 6px rgba(200,80,60,0.3); }
  50% { transform: scale(1.15); box-shadow: 0 0 14px rgba(200,80,60,0.5); }
}

/* 愈合状态：暖色呼吸 */
.sc-tl-state--healing .sc-timeline-card {
  border-color: rgba(196,138,106,0.1);
  animation: state-healing-breathe 4s ease-in-out infinite;
}
.sc-tl-state--healing .sc-timeline-dot {
  animation: dot-healing-breathe 3s ease-in-out infinite;
}
@keyframes state-healing-breathe {
  0%, 100% { box-shadow: 0 0 0 rgba(196,138,106,0); }
  50% { box-shadow: 0 0 8px rgba(196,138,106,0.04); }
}
@keyframes dot-healing-breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.08); opacity: 1; }
}

/* 疤痕状态：稳定微光 */
.sc-tl-state--scarred .sc-timeline-card {
  border-color: rgba(138,138,122,0.06);
}
.sc-tl-state--scarred .sc-timeline-dot {
  animation: dot-scarred-shimmer 5s ease-in-out infinite;
}
@keyframes dot-scarred-shimmer {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.9; }
}

/* ---- 愈合进度条 ---- */
.sc-heal-bar-wrap {
  margin-top: 8px; height: 3px; border-radius: 2px;
  background: rgba(196,138,106,0.06); overflow: hidden;
}
.sc-heal-bar {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #c8503c, #c48a6a, #8a8a7a);
  transition: width 1s ease;
}

/* ---- Timeline actions ---- */
.sc-timeline-actions {
  display: flex; gap: 6px; margin-top: 8px; justify-content: flex-end;
}
.sc-timeline-btn {
  width: 24px; height: 24px; border-radius: 6px; border: 1px solid rgba(196,138,106,0.08);
  background: transparent; color: rgba(196,138,106,0.3); font-size: 11px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.sc-timeline-btn:hover { border-color: rgba(196,138,106,0.25); color: var(--sc-accent); }
.sc-timeline-btn--del:hover { border-color: rgba(200,80,60,0.3); color: #c8503c; }

/* ---- Filter bar ---- */
.sc-filter-bar {
  display: flex; gap: 8px; align-items: center; margin-bottom: 16px; position: relative; z-index: 1; flex-wrap: wrap;
}
.sc-search-box { flex: 1; min-width: 140px; }
.sc-search-input {
  width: 100%; padding: 6px 12px; border: 1px solid rgba(196,138,106,0.1);
  border-radius: 8px; background: rgba(196,138,106,0.03); color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px; font-family: inherit; outline: none; box-sizing: border-box;
}
.sc-search-input:focus { border-color: rgba(196,138,106,0.25); }
.sc-search-input::placeholder { color: rgba(196,138,106,0.2); }
.sc-filter-select {
  padding: 6px 10px; border: 1px solid rgba(196,138,106,0.1); border-radius: 8px;
  background: rgba(196,138,106,0.03); color: var(--text-bright); font-size: 12px;
  font-family: inherit; outline: none; cursor: pointer; appearance: none;
}
.sc-filter-select:focus { border-color: rgba(196,138,106,0.25); }
.sc-filter-select option { background: #0a0807; color: rgba(var(--text-primary-rgb), 0.85); }
.sc-severity-filter {
  display: flex; align-items: center; gap: 4px;
}
.sc-sev-filter-label { font-size: 11px; color: rgba(196,138,106,0.4); margin-right: 2px; }
.sc-sev-btn {
  padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(196,138,106,0.1);
  background: transparent; color: rgba(196,138,106,0.3); font-size: 11px; cursor: pointer;
  transition: all 0.2s; font-family: inherit;
}
.sc-sev-btn.active {
  background: rgba(196,138,106,0.15); color: var(--sc-accent); border-color: rgba(196,138,106,0.3);
}
.sc-sev-btn:hover { border-color: rgba(196,138,106,0.3); }

/* ---- Empty ---- */
.sc-empty {
  text-align: center; padding: 60px 20px;
  font-size: 14px; line-height: 1.8;
  color: rgba(196,138,106,0.3);
  border: 1px solid rgba(196,138,106,0.06);
  border-radius: 16px;
  background: rgba(196,138,106,0.02);
  position: relative; z-index: 1;
}
.sc-empty-hint { font-size: 12px; color: rgba(196,138,106,0.15); margin-top: 4px; }

/* ---- Healing Journey ---- */
.sc-journey-section {
  margin-bottom: 28px; position: relative; z-index: 1;
}
.sc-journey-card {
  background: rgba(196,138,106,0.03); border: 1px solid rgba(196,138,106,0.08);
  border-radius: 14px; padding: 18px;
}
.sc-journey-stage {
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
}
.sc-journey-stage-icon { font-size: 24px; flex-shrink: 0; }
.sc-journey-stage-info { flex: 1; min-width: 0; }
.sc-journey-stage-label { display: block; font-size: 13px; font-weight: 500; color: var(--sc-accent); }
.sc-journey-stage-desc { display: block; font-size: 11px; color: rgba(196,138,106,0.4); margin-top: 2px; }
.sc-journey-stage-progress { min-width: 80px; text-align: right; }
.sc-journey-progress-value { display: block; font-size: 12px; color: var(--sc-accent); font-weight: 500; }
.sc-journey-progress-bar {
  margin-top: 4px; height: 4px; border-radius: 2px;
  background: rgba(196,138,106,0.08); overflow: hidden;
}
.sc-journey-progress-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #c48a6a, #d4a070);
  transition: width 0.6s ease;
}
.sc-journey-meta {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  margin-bottom: 16px;
}
.sc-journey-stat {
  text-align: center; padding: 10px 6px;
  background: rgba(196,138,106,0.04); border-radius: 8px;
}
.sc-journey-stat-value { display: block; font-size: 18px; font-weight: 600; color: var(--sc-accent); }
.sc-journey-stat-label { display: block; font-size: 10px; color: rgba(196,138,106,0.4); margin-top: 2px; }
.sc-journey-milestones { margin-bottom: 14px; }
.sc-journey-milestone-title { font-size: 11px; color: rgba(196,138,106,0.4); display: block; margin-bottom: 8px; }
.sc-journey-milestone-list { display: flex; flex-wrap: wrap; gap: 8px; }
.sc-journey-milestone-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: rgba(196,138,106,0.3);
}
.sc-milestone--achieved { color: var(--sc-accent); }
.sc-milestone-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(196,138,106,0.15);
}
.sc-milestone-dot--done { background: var(--sc-accent); }
.sc-milestone-name { font-size: 11px; }
.sc-journey-next { }
.sc-journey-next-title { font-size: 11px; color: rgba(196,138,106,0.4); display: block; margin-bottom: 6px; }
.sc-journey-next-list {
  margin: 0; padding-left: 16px; list-style: disc;
  font-size: 12px; color: rgba(196,138,106,0.5); line-height: 1.7;
}

/* ---- Narrative Enhancement ---- */
.sc-narrative-section {
  margin-bottom: 28px; position: relative; z-index: 1;
}

/* ---- Scar Visualization (INCR-161) ---- */
.sc-viz-section {
  margin-bottom: 28px; position: relative; z-index: 1;
}
.sc-narrative-card {
  background: rgba(196,138,106,0.03); border: 1px solid rgba(196,138,106,0.08);
  border-radius: 14px; padding: 18px;
}
.sc-narrative-mode {
  display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
}
.sc-narrative-mode-icon { font-size: 24px; flex-shrink: 0; }
.sc-narrative-mode-info { flex: 1; min-width: 0; }
.sc-narrative-mode-label { display: block; font-size: 13px; font-weight: 500; color: var(--sc-accent); }
.sc-narrative-mode-score { display: block; font-size: 11px; color: rgba(196,138,106,0.4); margin-top: 2px; }
.sc-narrative-meta {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
  margin-bottom: 14px;
}
.sc-narrative-stat {
  text-align: center; padding: 10px 6px;
  background: rgba(196,138,106,0.04); border-radius: 8px;
}
.sc-narrative-stat-label { display: block; font-size: 10px; color: rgba(196,138,106,0.4); margin-bottom: 4px; }
.sc-narrative-stat-value { display: block; font-size: 14px; font-weight: 500; color: var(--sc-accent); }
.sc-narrative-themes { margin-bottom: 14px; }
.sc-narrative-themes-label { font-size: 11px; color: rgba(196,138,106,0.4); display: block; margin-bottom: 8px; }
.sc-narrative-theme-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.sc-narrative-theme-tag {
  padding: 3px 10px; border-radius: 12px;
  background: rgba(196,138,106,0.08); color: rgba(196,138,106,0.6);
  font-size: 11px;
}
.sc-narrative-arc { margin-bottom: 14px; }
.sc-narrative-arc-label { font-size: 11px; color: rgba(196,138,106,0.4); display: block; margin-bottom: 8px; }
.sc-narrative-arc-flow {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 8px;
}
.sc-arc-node {
  flex: 1; text-align: center;
  padding: 8px 4px; background: rgba(196,138,106,0.04); border-radius: 8px;
}
.sc-arc-node-label { display: block; font-size: 10px; color: rgba(196,138,106,0.3); margin-bottom: 4px; }
.sc-arc-node-text { display: block; font-size: 12px; color: rgba(196,138,106,0.7); font-weight: 500; }
.sc-arc-connector { color: rgba(196,138,106,0.2); font-size: 14px; flex-shrink: 0; }
.sc-arc-type {
  display: inline-block; padding: 2px 10px; border-radius: 10px;
  font-size: 10px; background: rgba(196,138,106,0.08); color: rgba(196,138,106,0.5);
}
.sc-arc-type--rising { background: rgba(196,138,106,0.12); color: #c48a6a; }
.sc-arc-type--falling-then-rising { background: rgba(180,130,100,0.12); color: #b48264; }
.sc-arc-type--hero-journey { background: rgba(200,150,120,0.12); color: #c89678; }
.sc-arc-type--transformation { background: rgba(160,110,80,0.12); color: #a06e50; }
.sc-arc-type--redemption { background: rgba(180,120,90,0.12); color: #b4785a; }
.sc-narrative-suggestions { }
.sc-narrative-suggestions-label { font-size: 11px; color: rgba(196,138,106,0.4); display: block; margin-bottom: 8px; }
.sc-narrative-suggestion-list { display: flex; flex-direction: column; gap: 8px; }
.sc-narrative-suggestion-item {
  padding: 10px 12px; border-radius: 8px;
  background: rgba(196,138,106,0.04); border: 1px solid rgba(196,138,106,0.06);
}
.sc-suggestion--high { border-left: 3px solid #c8503c; }
.sc-suggestion--medium { border-left: 3px solid #c48a6a; }
.sc-suggestion--low { border-left: 3px solid rgba(196,138,106,0.3); }
.sc-suggestion-type {
  display: inline-block; padding: 1px 6px; border-radius: 4px;
  font-size: 10px; background: rgba(196,138,106,0.1); color: rgba(196,138,106,0.5);
  margin-bottom: 4px;
}
.sc-suggestion-title { display: block; font-size: 12px; font-weight: 500; color: var(--sc-accent); margin-bottom: 4px; }
.sc-suggestion-advice { margin: 0; font-size: 11px; color: rgba(196,138,106,0.5); line-height: 1.5; }

/* ---- Responsive ---- */
@media (max-width: 860px) {
  .sc { padding: 32px 20px 64px; }
}
@media (max-width: 640px) {
  .sc { padding: 24px 14px 56px; }
  .sc-title { font-size: 20px; }
  .header-kicker { font-size: 11px; }
  .sc-stats { grid-template-columns: repeat(2, 1fr); }
  .sc-form-row { flex-direction: column; align-items: stretch; }
  .sc-severity-group { justify-content: center; }
  .sc-type-group { justify-content: center; flex-wrap: wrap; }
  .sc-filter-bar { flex-direction: column; align-items: stretch; }
  .sc-filter-select { width: 100%; }
  .sc-severity-filter { justify-content: center; flex-wrap: wrap; }
  .sc-anvil-wrap { width: 120px; height: 60px; }
}
</style>