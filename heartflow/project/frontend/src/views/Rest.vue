<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance rest">
    <!-- 氛围背景层：息壤 - 自然休憩 -->
    <div data-enter class="rest-ambient" aria-hidden="true">
      <div class="rest-glow rest-glow--top"></div>
      <div class="rest-glow rest-glow--bottom"></div>
      <!-- 树叶飘落 SVG -->
      <div class="rest-leaves" aria-hidden="true">
        <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="0.5" opacity="0.025">
            <path d="M80,60 Q100,40 120,60 Q100,80 80,60Z" />
            <path d="M280,140 Q300,120 320,140 Q300,160 280,140Z" />
            <path d="M150,260 Q170,240 190,260 Q170,280 150,260Z" />
            <path d="M250,380 Q270,360 290,380 Q270,400 250,380Z" />
            <path d="M100,480 Q120,460 140,480 Q120,500 100,480Z" />
            <path d="M300,560 Q320,540 340,560 Q320,580 300,560Z" />
            <path d="M180,660 Q200,640 220,660 Q200,680 180,660Z" />
            <!-- 波浪线：湖面 -->
            <path d="M60,400 Q130,390 200,400 Q270,410 340,400" />
            <path d="M60,420 Q130,410 200,420 Q270,430 340,420" />
            <path d="M60,440 Q130,430 200,440 Q270,450 340,440" />
          </g>
        </svg>
      </div>
      <!-- 浮动光点 -->
      <div class="rest-firefly rest-firefly-1"></div>
      <div class="rest-firefly rest-firefly-2"></div>
      <div class="rest-firefly rest-firefly-3"></div>
      <div class="rest-firefly rest-firefly-4"></div>
      <div class="rest-firefly rest-firefly-5"></div>
    </div>

    <!-- 通用氛围光晕 -->
    <div data-enter class="rest-atmos" aria-hidden="true">
      <div class="atmos-warm-glow"></div>
      <div class="atmos-work-light"></div>
    </div>

    <RoomLayout
      title="息壤"
      kicker="工作间歇与休假"
      subtitle="在奔忙的日常中，留一片滋养身心的休憩之地。"
      data-enter
    >
      <template #breadcrumb>
        <nav class="rest-breadcrumb">
          <router-link to="/home-space" class="bc-link">家</router-link>
          <span class="bc-sep">→</span>
          <router-link to="/worklog" class="bc-link">更漏</router-link>
          <span class="bc-sep">→</span>
          <span class="bc-current">息壤</span>
        </nav>
      </template>

    <!-- ===== 标签导航 ===== -->
    <div class="rest-season-indicator">
      <span class="rest-season-badge">{{ seasonLabel }}季</span>
    </div>

    <nav data-enter class="rest-tabs">
      <button
        class="rest-tab-btn"
        :class="{ 'rest-tab-btn--active': activeTab === 'rest' }"
        @click="activeTab = 'rest'"
      >🌿 休憩</button>
      <button
        class="rest-tab-btn"
        :class="{ 'rest-tab-btn--active': activeTab === 'sleep' }"
        @click="activeTab = 'sleep'"
      >🌙 睡眠</button>
      <button
        class="rest-tab-btn"
        :class="{ 'rest-tab-btn--active': activeTab === 'ritual' }"
        @click="activeTab = 'ritual'"
      >🕯️ 仪式</button>
    </nav>

    <!-- ===== 休憩标签页 ===== -->
    <template v-if="activeTab === 'rest'">

    <!-- ===== 搜索筛选 ===== -->
    <section data-enter class="rest-section">
      <div class="rest-search">
        <span class="rest-search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="rest-search-input"
          placeholder="搜索休憩方式或记录..."
        />
        <button
          v-if="searchQuery"
          class="rest-search-clear"
          @click="searchQuery = ''"
        >✕</button>
      </div>
    </section>

    <!-- ===== 概览统计 ===== -->
    <section data-enter class="rest-section">
      <div class="rest-overview">
        <div class="rest-overview-stat">
          <span class="ros-value">{{ overview.restDays }}</span>
          <span class="ros-label">休息日</span>
        </div>
        <div class="rest-overview-stat">
          <span class="ros-value">{{ overview.avgRecovery }}<span class="ros-unit">%</span></span>
          <span class="ros-label">平均恢复度</span>
        </div>
        <div class="rest-overview-stat">
          <span class="ros-value">{{ overview.breakCount }}</span>
          <span class="ros-label">小憩次数</span>
        </div>
      </div>
    </section>

    <!-- ===== 漫步功能 ===== -->
    <section data-enter class="rest-section">
      <div class="rest-stroll-area">
        <button class="rest-stroll-btn" @click="startStroll" :disabled="strolling || practicesData.length === 0">
          <span class="rest-stroll-icon">{{ strolling ? '🚶' : '🌿' }}</span>
          <span class="rest-stroll-text">{{ strolling ? '漫步中...' : '漫步 · 随机休憩' }}</span>
        </button>
        <div v-if="strolling && strollingActivity" class="rest-stroll-result">
          <span class="rest-stroll-result-icon">{{ strollingActivity.icon }}</span>
          <span class="rest-stroll-result-name">{{ strollingActivity.name }}</span>
          <span class="rest-stroll-result-desc">{{ strollingActivity.description }}</span>
        </div>
      </div>
    </section>

    <!-- ===== 休憩记录表单 ===== -->
    <section data-enter class="rest-section">
      <button
        class="rest-form-toggle"
        @click="showForm = !showForm"
        :class="{ 'rest-form-toggle--active': showForm }"
      >
        <span class="rft-icon">{{ showForm ? '−' : '+' }}</span>
        <span class="rft-text">{{ showForm ? '收起记录' : '记录休憩' }}</span>
      </button>
      <div v-if="showForm" class="rest-form">
        <div class="rest-form-row">
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">活动类型</label>
            <select v-model="newBreak.activity" class="rff-select">
              <option value="" disabled>选择活动</option>
              <option
                v-for="p in practicesData"
                :key="p.id"
                :value="p.id"
              >{{ p.icon }} {{ p.name }}</option>
            </select>
          </div>
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">时长（分钟）</label>
            <input
              v-model.number="newBreak.duration"
              type="number"
              min="1"
              max="480"
              class="rff-input"
            />
          </div>
        </div>
        <div class="rest-form-row">
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">心情</label>
            <div class="rff-mood-row">
              <button
                v-for="m in 5"
                :key="m"
                class="rff-mood-btn"
                :class="{ 'rff-mood-btn--active': newBreak.mood === m }"
                @click="newBreak.mood = m"
              >{{ m }}</button>
            </div>
          </div>
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">备注（可选）</label>
            <input
              v-model="newBreak.note"
              type="text"
              class="rff-input"
              placeholder="记录感受..."
              maxlength="60"
            />
          </div>
        </div>
        <div class="rest-form-actions">
          <button
            class="rfa-btn rfa-btn--primary"
            :disabled="!newBreak.activity"
            @click="addBreakRecord"
          >保存记录</button>
          <button
            class="rfa-btn rfa-btn--cancel"
            @click="showForm = false"
          >取消</button>
        </div>
      </div>
    </section>

    <!-- ===== 休憩方式 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">休憩方式</h3>
      <div class="rest-practices-grid">
        <div
          v-for="practice in practices"
          :key="practice.id"
          class="rest-practice-card"
          :style="{ '--prac-color': practice.color }"
          role="button"
          tabindex="0"
          :aria-label="'编辑休憩方式 ' + practice.name"
          @click="openEditPractice(practice)"
          @keydown.enter.prevent="openEditPractice(practice)"
          @keydown.space.prevent="openEditPractice(practice)"
        >
          <div class="rpc-header">
            <span class="rpc-icon">{{ practice.icon }}</span>
            <span class="rpc-name">{{ practice.name }}</span>
          </div>
          <div class="rpc-vegetation" v-if="VEGETATION_MAP[practice.id]">
            <span class="rpc-veg-icon">{{ VEGETATION_MAP[practice.id].icon }}</span>
            <span class="rpc-veg-name">{{ VEGETATION_MAP[practice.id].plant }}</span>
          </div>
          <p class="rpc-desc">{{ practice.description }}</p>
          <div class="rpc-recovery">
            <div class="rpc-recovery-track">
              <div
                class="rpc-recovery-fill"
                :style="{ width: practice.recovery + '%' }"
              ></div>
            </div>
            <span class="rpc-recovery-label">{{ practice.recovery }}% 恢复力</span>
          </div>
          <div class="rpc-tags">
            <span
              v-for="tag in practice.tags"
              :key="tag"
              class="rpc-tag"
            >{{ tag }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 近期休憩记录 ===== -->
    <section class="rest-section">
      <h3 class="section-label">近期休憩</h3>
      <div class="rest-recent">
        <div
          v-for="(entry, idx) in recentBreaks"
          :key="idx"
          class="rest-recent-card"
          :style="{ '--break-delay': idx * 0.06 + 's' }"
        >
          <span class="rrc-icon">{{ entry.icon }}</span>
          <div class="rrc-content">
            <span class="rrc-title">{{ entry.activity }}</span>
            <span class="rrc-meta">{{ entry.duration }} · {{ entry.date }}</span>
          </div>
          <span class="rrc-mood">{{ entry.mood }}</span>
        </div>
        <EmptyState
          v-if="recentBreaks.length === 0"
          icon="🌿"
          title="尚未记录休憩"
          hint="试着在忙碌中给自己一个短暂的停顿。"
          :glow="false"
          cta-label=""
        />
      </div>
    </section>

    <!-- ===== 恢复力建议 ===== -->
    <section class="rest-section">
      <h3 class="section-label">休憩建议</h3>
      <div class="rest-tips">
        <div
          v-for="(tip, idx) in restTips"
          :key="idx"
          class="rest-tip-card"
          :style="{ '--tip-delay': idx * 0.08 + 's' }"
        >
          <span class="rtc-icon">{{ tip.icon }}</span>
          <div class="rtc-content">
            <span class="rtc-title">{{ tip.title }}</span>
            <p class="rtc-desc">{{ tip.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 电子木鱼 · 功德计数器（息壤·INCR-487，借鉴 96 APK 电子木鱼） ===== -->
    <MeritWoodenFishPanel />

    <!-- ===== 休息提醒（rest·useRestReminders：番茄钟/定时/疲劳/姿势规则 + 模拟触发，INCR-164） ===== -->
    <RestReminderPanel />

    <!-- ===== 专注休憩联动（rest·useFocusRestLink，INCR-174） ===== -->
    <RestFocusLinkPanel />

    <!-- ===== 休息质量面板（rest，INCR-174） ===== -->
    <RestQualityPanel />

    <!-- ===== 休憩档案（rest/rest-analytics 引擎：总览/活动分布/节律/恢复健康/洞察，INCR-199） ===== -->
    <RestArchivePanel :records="breakRecords" :practices="practicesData" />

    <!-- ===== 休憩成就与趋势（rest/rest-advanced 引擎：趋势概览/30日柱状图/成就勋章/重置，INCR-200） ===== -->
    <RestAchievementTrendPanel :records="breakRecords" :practices="practicesData" />

    <!-- ===== 底部导航 ===== -->
    <section class="rest-section">
      <div class="rest-footer-nav">
        <router-link to="/worklog" class="rest-nav-link">
          <span class="rnl-icon">⏳</span>
          <span class="rnl-text">返回更漏</span>
        </router-link>
        <router-link to="/home-space" class="rest-nav-link">
          <span class="rnl-icon">🏠</span>
          <span class="rnl-text">回到家的</span>
        </router-link>
        <router-link to="/craft" class="rest-nav-link">
          <span class="rnl-icon">🔧</span>
          <span class="rnl-text">匠庐</span>
        </router-link>
        <router-link to="/bag" class="rest-nav-link">
          <span class="rnl-icon">🎒</span>
          <span class="rnl-text">行囊</span>
        </router-link>
      </div>
    </section>

    <!-- 底部铭文 -->
    <footer class="rest-colophon">
      <div class="colophon-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="colophon-text">息者 · 养也</p>
    </footer>

    </template>

    <!-- ===== 睡眠标签页 ===== -->
    <template v-if="activeTab === 'sleep'">
      <RestSleepPanel />
    </template>

    <!-- ===== 仪式标签页 ===== -->
    <template v-if="activeTab === 'ritual'">
      <RestRitualPanel />
    </template>

    <!-- ===== 实践编辑弹窗 ===== -->
    <Teleport to="body">
      <div v-if="editingPractice" class="rest-modal-overlay" @click.self="editingPractice = null">
        <div class="rest-modal">
          <h3 class="rest-modal-title">编辑休憩方式</h3>
          <div class="rest-modal-body">
            <div class="rest-modal-field">
              <label class="rmf-label">名称</label>
              <input
                v-model="editingPractice.name"
                type="text"
                class="rmf-input"
                maxlength="10"
              />
            </div>
            <div class="rest-modal-field">
              <label class="rmf-label">恢复力（0-100）</label>
              <input
                v-model.number="editingPractice.recovery"
                type="number"
                min="0"
                max="100"
                class="rmf-input"
              />
              <div class="rmf-range-track">
                <div
                  class="rmf-range-fill"
                  :style="{ width: Math.min(100, Math.max(0, editingPractice.recovery)) + '%' }"
                ></div>
              </div>
            </div>
            <div class="rest-modal-field">
              <label class="rmf-label">标签（逗号分隔）</label>
              <input
                :value="editingPractice.tags.join('、')"
                @input="onTagsInput"
                type="text"
                class="rmf-input"
                placeholder="标签1、标签2"
              />
            </div>
          </div>
          <div class="rest-modal-actions">
            <button class="rma-btn rma-btn--primary" @click="savePractice">保存</button>
            <button class="rma-btn rma-btn--cancel" @click="editingPractice = null">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConfig } from '../resonance/bridges/config'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRest } from '../modules/rest'
import { getLocalDateKey } from '../utils/time'
import type { RestPractice, BreakRecord } from '../modules/rest'
import RestSleepPanel from './RestSleepPanel.vue'
import RestRitualPanel from './RestRitualPanel.vue'
import RestReminderPanel from '../components/RestReminderPanel.vue'
import RestFocusLinkPanel from '../components/RestFocusLinkPanel.vue'
import RestQualityPanel from '../components/RestQualityPanel.vue'
import RestArchivePanel from '../components/RestArchivePanel.vue'
import RestAchievementTrendPanel from '../components/RestAchievementTrendPanel.vue'
import MeritWoodenFishPanel from '../components/MeritWoodenFishPanel.vue'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'

// ---- 标签导航 ----
const activeTab = ref<'rest' | 'sleep' | 'ritual'>('rest')

// ---- 休憩方式定义 ----
const { entranceRef, entranceClass } = useViewEntrance()

// ---- 12 种休息类别植被映射 ----
const VEGETATION_MAP: Record<string, { plant: string; icon: string; color: string; season: string[] }> = {
  meditation: { plant: '莲花', icon: '🪷', color: '#e8a0c0', season: ['夏', '秋'] },
  nap: { plant: '含羞草', icon: '🌿', color: '#8aba7a', season: ['春', '夏', '秋'] },
  walk: { plant: '蒲公英', icon: '🌼', color: '#e8c060', season: ['春', '夏'] },
  reading: { plant: '橡树', icon: '🌳', color: '#6a8a5a', season: ['春', '夏', '秋', '冬'] },
  music: { plant: '风铃草', icon: '🔔', color: '#a0c0d0', season: ['春', '夏'] },
  tea: { plant: '茶树', icon: '🍵', color: '#8a9a6a', season: ['秋', '冬'] },
  stretch: { plant: '竹子', icon: '🎋', color: '#6aba7a', season: ['春', '夏', '秋'] },
  dayoff: { plant: '云朵', icon: '☁️', color: '#a0a8b0', season: ['春', '夏', '秋', '冬'] },
  breathing: { plant: '松树', icon: '🌲', color: '#6a8a7a', season: ['春', '夏', '秋', '冬'] },
  journal: { plant: '勿忘我', icon: '🌸', color: '#c0a0d0', season: ['春', '秋'] },
  garden: { plant: '向日葵', icon: '🌻', color: '#e8b040', season: ['春', '夏'] },
  social: { plant: '藤蔓', icon: '🌿', color: '#7ab89a', season: ['春', '夏', '秋', '冬'] },
}

// ---- 四季主题 ----
const SEASON_THEMES = {
  spring: { accentColor: '#8aba7a', glowColor: 'rgba(138, 186, 122, 0.08)' },
  summer: { accentColor: '#e8a040', glowColor: 'rgba(232, 160, 64, 0.08)' },
  autumn: { accentColor: '#c08040', glowColor: 'rgba(192, 128, 64, 0.08)' },
  winter: { accentColor: '#80a0c0', glowColor: 'rgba(128, 160, 192, 0.06)' },
}

function getCurrentSeason(): keyof typeof SEASON_THEMES {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

const currentSeason = computed(() => getCurrentSeason())

// ---- 漫步功能 ----
const strolling = ref(false)
const strollingActivity = ref<RestPractice | null>(null)

function startStroll() {
  if (practicesData.value.length === 0) return
  strolling.value = true
  const randomIdx = Math.floor(Math.random() * practicesData.value.length)
  strollingActivity.value = practicesData.value[randomIdx]
  setTimeout(() => {
    strolling.value = false
    strollingActivity.value = null
  }, 3000)
}

// 季节中文名
const seasonLabel = computed(() => {
  const labels: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
  return labels[currentSeason.value] || '春'
})

// ---- 四季CSS动态变量 ----
const seasonAccentColor = computed(() => SEASON_THEMES[currentSeason.value].accentColor)
const seasonAccentRgb = computed(() => {
  const hex = SEASON_THEMES[currentSeason.value].accentColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
})
const seasonGlowColor = computed(() => SEASON_THEMES[currentSeason.value].glowColor)
const seasonBackground = computed(() => {
  const gradients: Record<string, string> = {
    spring: 'linear-gradient(170deg, #080a08 0%, #0a0e0a 35%, #090b09 65%, #060806 100%)',
    summer: 'linear-gradient(170deg, #0a0806 0%, #0e0a06 35%, #0b0907 65%, #080604 100%)',
    autumn: 'linear-gradient(170deg, #0a0806 0%, #0e0a06 35%, #0b0907 65%, #080604 100%)',
    winter: 'linear-gradient(170deg, #08080a 0%, #0a0a0e 35%, #09090b 65%, #060608 100%)',
  }
  return gradients[currentSeason.value] || gradients.spring
})

// ---- 默认休憩方式（12 种）已下沉至 useRest 模块（DEFAULT_PRACTICES） ----

// ---- 休息数据层（休憩方式 + 休息记录） ----
const rest = useRest()
const { practicesData, breakRecords } = rest
onMounted(rest.load)

const configBridge = useConfig()
const { config: configRef } = configBridge

// ---- 搜索筛选 ----
const searchQuery = ref('')

// ---- 表单状态 ----
const showForm = ref(false)
const newBreak = ref({
  activity: '',
  duration: 15,
  mood: 3,
  note: '',
})

// ---- 编辑实践状态 ----
const editingPractice = ref<RestPractice | null>(null)

// ---- 过滤后的休憩方式 ----
const practices = computed<RestPractice[]>(() => {
  if (!searchQuery.value) return practicesData.value
  const q = searchQuery.value.toLowerCase()
  return practicesData.value.filter(
    p => p.name.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q))
  )
})

// ---- 心情展示辅助 ----
function getMoodDisplay(mood: number): string {
  const map: Record<number, string> = {
    1: '不佳 😞',
    2: '稍弱 😕',
    3: '一般 😐',
    4: '不错 😊',
    5: '很好 😌',
  }
  return map[mood] || '一般 😐'
}

// ---- 近期休憩记录（从 breakRecords 派生） ----
interface BreakEntry {
  icon: string
  activity: string
  duration: string
  date: string
  mood: string
}

const DEFAULT_BREAKS: BreakEntry[] = [
  { icon: '🧘', activity: '午间冥想', duration: '15 分钟', date: '今天', mood: '平静 😌' },
  { icon: '🚶', activity: '公园散步', duration: '30 分钟', date: '昨天', mood: '舒畅 🌿' },
  { icon: '🍵', activity: '下午茶时光', duration: '20 分钟', date: '前天', mood: '温暖 ☕' },
  { icon: '😴', activity: '午后小憩', duration: '25 分钟', date: '3 天前', mood: '恢复 ⚡' },
  { icon: '🎵', activity: '听古典乐', duration: '40 分钟', date: '4 天前', mood: '沉浸 🎻' },
]

const recentBreaks = computed<BreakEntry[]>(() => {
  // 如果有实际记录，从 breakRecords 派生
  if (breakRecords.value.length > 0) {
    let records = breakRecords.value
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      records = records.filter(r => {
        const practice = practicesData.value.find(p => p.id === r.activity)
        return (practice?.name.toLowerCase().includes(q)) || r.activity.toLowerCase().includes(q)
      })
    }
    return records.slice().reverse().slice(0, 10).map(r => {
      const practice = practicesData.value.find(p => p.id === r.activity)
      return {
        icon: practice?.icon || '🌿',
        activity: practice?.name || r.activity,
        duration: `${r.duration} 分钟`,
        date: r.date,
        mood: getMoodDisplay(r.mood),
      }
    })
  }
  // 无记录时回退到默认展示，但仍支持搜索
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    return DEFAULT_BREAKS.filter(b => b.activity.toLowerCase().includes(q))
  }
  return DEFAULT_BREAKS
})

// ---- 添加休憩记录 ----
function addBreakRecord() {
  if (!newBreak.value.activity) return
  const record: BreakRecord = {
    id: Date.now().toString(),
    activity: newBreak.value.activity,
    duration: newBreak.value.duration,
    mood: newBreak.value.mood,
    note: newBreak.value.note || undefined,
    // ⚠️ 落库日键按本地日历日（与 rest 模块读取口径一致）
    date: getLocalDateKey(),
  }
  breakRecords.value = [...breakRecords.value, record]
  rest.saveBreakRecords()
  // 重置表单
  newBreak.value = { activity: '', duration: 15, mood: 3, note: '' }
  showForm.value = false
}

// ---- 打开编辑实践弹窗 ----
function openEditPractice(practice: RestPractice) {
  editingPractice.value = { ...practice }
}

// ---- 标签输入处理 ----
function onTagsInput(e: Event) {
  if (!editingPractice.value) return
  const val = (e.target as HTMLInputElement).value
  editingPractice.value.tags = val.split(/[、,，]/).map(t => t.trim()).filter(Boolean)
}

// ---- 保存实践编辑 ----
function savePractice() {
  if (!editingPractice.value) return
  const idx = practicesData.value.findIndex(p => p.id === editingPractice.value!.id)
  if (idx !== -1) {
    practicesData.value[idx] = { ...editingPractice.value! }
    rest.savePractices()
  }
  editingPractice.value = null
}

// ---- 计算概览统计 ----
const overview = computed(() => {
  const records = breakRecords.value
  const pracs = practicesData.value
  const avgRecovery = pracs.length > 0
    ? Math.round(pracs.reduce((sum, p) => sum + p.recovery, 0) / pracs.length)
    : 0
  const breakCount = records.length
  const uniqueDays = new Set(records.map(r => r.date)).size
  const restDays = uniqueDays > 0 ? uniqueDays : configRef.display.statsWindowDays
  return { restDays, avgRecovery, breakCount }
})

// ---- 休憩建议 ----
interface RestTip {
  icon: string
  title: string
  description: string
}

const restTips: RestTip[] = [
  {
    icon: '⏰',
    title: '番茄工作法',
    description: '每 25 分钟专注后，安排 5 分钟小憩，让大脑保持高效运转。',
  },
  {
    icon: '🌿',
    title: '自然接触',
    description: '每天至少 15 分钟户外时间，接触自然光与绿色植物。',
  },
  {
    icon: '💧',
    title: '补水提醒',
    description: '工作间隙别忘了喝水，脱水会导致疲劳感加重。',
  },
  {
    icon: '🧘',
    title: '呼吸调节',
    description: '4-7-8 呼吸法：吸气 4 秒，屏息 7 秒，呼气 8 秒，快速平复情绪。',
  },
  {
    icon: '📵',
    title: '数字排毒',
    description: '每工作 2 小时，远离屏幕 10 分钟，给眼睛和大脑休息。',
  },
  {
    icon: '🌙',
    title: '睡眠规律',
    description: '保持固定的作息时间，高质量的睡眠是最好的恢复。',
  },
]
</script>

<style scoped>
/* =============================================================
   息壤视图 — 青绿自然主题 (#7ab87a)
   ============================================================= */

/* ---- 根容器 ---- */
.rest {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 36px;
  --accent: v-bind(seasonAccentColor);
  --accent-rgb: v-bind(seasonAccentRgb);
  --text-primary: #d8e8d8;
  --text-secondary: rgba(216, 232, 216, 0.55);
  --text-muted: rgba(216, 232, 216, 0.3);
  --card-bg: rgba(30, 42, 30, 0.4);
  --card-border: rgba(122, 184, 122, 0.08);
  --card-hover-bg: rgba(40, 55, 40, 0.5);
  --card-hover-border: rgba(122, 184, 122, 0.2);
  --transition: 0.25s ease;
  background: v-bind(seasonBackground);
}

:deep(.room-layout) {
  position: relative;
  z-index: 1;
}

/* ---- 氛围背景层 ---- */
.rest-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.rest-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.rest-glow--top {
  top: -15%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, v-bind(seasonGlowColor) 0%, transparent 70%);
}

.rest-glow--bottom {
  bottom: -10%;
  right: -10%;
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, v-bind(seasonGlowColor) 0%, transparent 65%);
}

.rest-leaves {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 500px;
  height: 100%;
  color: var(--accent);
  opacity: 0.5;
}

.rest-leaves svg {
  width: 100%;
  height: 100%;
}

/* ---- 萤火虫光点 ---- */
.rest-firefly {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0;
  animation: firefly-drift 10s ease-in-out infinite;
}

.rest-firefly-1 { top: 12%; left: 20%; animation-delay: 0s; }
.rest-firefly-2 { top: 35%; right: 15%; animation-delay: 2.5s; }
.rest-firefly-3 { top: 55%; left: 25%; animation-delay: 5s; }
.rest-firefly-4 { top: 75%; right: 20%; animation-delay: 7.5s; }
.rest-firefly-5 { top: 90%; left: 50%; animation-delay: 3s; }

@keyframes firefly-drift {
  0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  25% { opacity: 0.08; transform: translate(10px, -15px) scale(1.2); }
  50% { opacity: 0.15; transform: translate(-5px, -30px) scale(1.5); }
  75% { opacity: 0.06; transform: translate(15px, -10px) scale(0.8); }
}

/* ---- 通用氛围光晕 ---- */
.rest-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.atmos-warm-glow {
  position: absolute;
  top: -10%;
  left: 10%;
  width: 80%;
  height: 50%;
  background: radial-gradient(
    ellipse at 30% 40%,
    v-bind(seasonGlowColor) 0%,
    transparent 60%
  );
  animation: rest-breathe 7s ease-in-out infinite;
}

@keyframes rest-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---- 铭文装饰 ---- */
.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(122, 184, 122, 0.25),
    transparent
  );
}

.orn-diamond {
  font-size: 9px;
  color: var(--accent);
  opacity: 0.4;
}

/* ---- 面包屑 ---- */
.rest-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 12px;
}

.bc-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition);
  letter-spacing: 0.5px;
}

.bc-link:hover {
  color: var(--accent);
}

.bc-sep {
  color: var(--text-secondary);
  opacity: 0.3;
  font-size: 10px;
}

.bc-current {
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* ---- 标题 ---- */



/* ---- 标签导航 ---- */
.rest-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  z-index: 1;
  position: relative;
}

.rest-tab-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 1px;
}

.rest-tab-btn:hover {
  color: var(--text-secondary);
  background: rgba(122, 184, 122, 0.05);
}

.rest-tab-btn--active {
  background: rgba(122, 184, 122, 0.1);
  color: var(--accent);
  font-weight: 400;
}

/* ---- 搜索栏 ---- */
.rest-search {
  position: relative;
  display: flex;
  align-items: center;
  z-index: 1;
}

.rest-search-icon {
  position: absolute;
  left: 14px;
  font-size: 14px;
  opacity: 0.4;
  pointer-events: none;
}

.rest-search-input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  letter-spacing: 0.5px;
  outline: none;
  transition: all var(--transition);
}

.rest-search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.rest-search-input:focus {
  border-color: rgba(122, 184, 122, 0.25);
  background: rgba(40, 55, 40, 0.5);
}

.rest-search-clear {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  opacity: 0.6;
  transition: opacity var(--transition);
}

.rest-search-clear:hover {
  opacity: 1;
}

/* ---- 概览统计 ---- */
.rest-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.rest-overview-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  transition: all var(--transition);
}

.rest-overview-stat:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.ros-value {
  font-size: 32px;
  font-weight: 300;
  color: var(--text-primary);
  letter-spacing: 1px;
  line-height: 1;
}

.ros-unit {
  font-size: 14px;
  opacity: 0.5;
  margin-left: 2px;
}

.ros-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* ---- 区域标题 ---- */
.section-label {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 400;
  color: var(--text-secondary);
  letter-spacing: 2px;
}

/* ---- 休憩记录表单 ---- */
.rest-form-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 14px 16px;
  background: var(--card-bg);
  border: 1px dashed var(--card-border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all var(--transition);
  z-index: 1;
  position: relative;
}

.rest-form-toggle:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  color: var(--text-primary);
}

.rest-form-toggle--active {
  border-style: solid;
  border-color: rgba(122, 184, 122, 0.2);
  background: rgba(40, 55, 40, 0.5);
}

.rft-icon {
  font-size: 18px;
  font-weight: 300;
  width: 20px;
  text-align: center;
}

.rft-text {
  font-size: 12px;
}

.rest-form {
  margin-top: 10px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 1;
  position: relative;
  animation: rest-card-in 0.3s ease both;
}

.rest-form-row {
  display: flex;
  gap: 12px;
}

.rest-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rest-form-field--half {
  flex: 1;
  min-width: 0;
}

.rff-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.rff-input {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all var(--transition);
}

.rff-input:focus {
  border-color: rgba(122, 184, 122, 0.25);
}

.rff-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.rff-select {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all var(--transition);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0,0 L5,6 L10,0' fill='none' stroke='%23d8e8d8' stroke-width='1' opacity='0.4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.rff-select:focus {
  border-color: rgba(122, 184, 122, 0.25);
}

.rff-select option {
  background: #0a0e0a;
  color: var(--text-primary);
}

.rff-mood-row {
  display: flex;
  gap: 6px;
}

.rff-mood-btn {
  flex: 1;
  padding: 8px 0;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
  text-align: center;
}

.rff-mood-btn:hover {
  border-color: rgba(122, 184, 122, 0.2);
  color: var(--text-secondary);
}

.rff-mood-btn--active {
  background: rgba(122, 184, 122, 0.15);
  border-color: rgba(122, 184, 122, 0.3);
  color: var(--accent);
}

.rest-form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.rfa-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 12px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all var(--transition);
  border: 1px solid transparent;
}

.rfa-btn--primary {
  background: rgba(122, 184, 122, 0.15);
  border-color: rgba(122, 184, 122, 0.25);
  color: var(--accent);
}

.rfa-btn--primary:hover:not(:disabled) {
  background: rgba(122, 184, 122, 0.25);
  border-color: rgba(122, 184, 122, 0.4);
}

.rfa-btn--primary:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.rfa-btn--cancel {
  background: transparent;
  border-color: var(--card-border);
  color: var(--text-secondary);
}

.rfa-btn--cancel:hover {
  border-color: var(--text-secondary);
  color: var(--text-secondary);
}

/* ---- 休憩方式网格 ---- */
.rest-practices-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.rest-practice-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  transition: all var(--transition);
  cursor: pointer;
}

.rest-practice-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  transform: translateY(-2px);
}

.rest-practice-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: var(--card-hover-border);
}

.rpc-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rpc-icon {
  font-size: 20px;
  opacity: 0.8;
}

.rpc-name {
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.rpc-desc {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.rpc-recovery {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rpc-recovery-track {
  flex: 1;
  height: 4px;
  background: rgba(122, 184, 122, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.rpc-recovery-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(122, 184, 122, 0.4), var(--accent));
  border-radius: 2px;
  transition: width 0.6s ease;
}

.rpc-recovery-label {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.rpc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rpc-tag {
  padding: 2px 6px;
  font-size: 9px;
  color: var(--text-secondary);
  background: rgba(122, 184, 122, 0.06);
  border: 1px solid rgba(122, 184, 122, 0.1);
  border-radius: 3px;
  letter-spacing: 0.5px;
}

/* ---- 近期休憩 ---- */
.rest-recent {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rest-recent-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  transition: all var(--transition);
  animation: rest-card-in 0.4s ease both;
  animation-delay: var(--break-delay);
}

@keyframes rest-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.rest-recent-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.rrc-icon {
  font-size: 22px;
  opacity: 0.7;
  flex-shrink: 0;
}

.rrc-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rrc-title {
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.rrc-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.rrc-mood {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

/* 已迁共享 EmptyState */

/* ---- 休憩建议 ---- */
.rest-tips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.rest-tip-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  transition: all var(--transition);
  animation: rest-card-in 0.4s ease both;
  animation-delay: var(--tip-delay);
}

.rest-tip-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  transform: translateY(-2px);
}

.rtc-icon {
  font-size: 24px;
  opacity: 0.7;
}

.rtc-title {
  font-size: 12px;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.rtc-desc {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ---- 实践编辑弹窗 ---- */
.rest-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: modal-fade-in 0.2s ease;
}

@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.rest-modal {
  width: 90%;
  max-width: 420px;
  background: linear-gradient(170deg, #0a0e0a 0%, #0c100c 50%, #0a0e0a 100%);
  border: 1px solid rgba(122, 184, 122, 0.15);
  border-radius: 12px;
  padding: 28px 24px;
  max-height: 86vh;
  overflow-y: auto;
  animation: modal-scale-in 0.25s ease;
}

@keyframes modal-scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.rest-modal-title {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 400;
  color: var(--text-primary);
  letter-spacing: 2px;
  text-align: center;
}

.rest-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rest-modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rmf-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.rmf-input {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all var(--transition);
}

.rmf-input:focus {
  border-color: rgba(122, 184, 122, 0.25);
}

.rmf-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.rmf-range-track {
  height: 4px;
  background: rgba(122, 184, 122, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}

.rmf-range-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(122, 184, 122, 0.4), var(--accent));
  border-radius: 2px;
  transition: width 0.3s ease;
}

.rest-modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 24px;
}

.rma-btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 12px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all var(--transition);
  border: 1px solid transparent;
}

.rma-btn--primary {
  background: rgba(122, 184, 122, 0.15);
  border-color: rgba(122, 184, 122, 0.25);
  color: var(--accent);
}

.rma-btn--primary:hover {
  background: rgba(122, 184, 122, 0.25);
  border-color: rgba(122, 184, 122, 0.4);
}

.rma-btn--cancel {
  background: transparent;
  border-color: var(--card-border);
  color: var(--text-secondary);
}

.rma-btn--cancel:hover {
  border-color: var(--text-secondary);
  color: var(--text-secondary);
}

/* ---- 底部导航 ---- */
.rest-footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.rest-nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  text-decoration: none;
  transition: all var(--transition);
}

.rest-nav-link:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  transform: translateY(-1px);
}

.rnl-icon {
  font-size: 16px;
  opacity: 0.7;
}

.rnl-text {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* ---- 底部铭文 ---- */
.rest-colophon {
  text-align: center;
  margin-top: 12px;
  position: relative;
  z-index: 1;
}

.colophon-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}

.colophon-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 3px;
  opacity: 0.6;
}

/* =============================================================
   响应式
   ============================================================= */
@media (max-width: 860px) {
  .rest-practices-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .rest-tips {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .rest-practices-grid {
    grid-template-columns: 1fr;
  }
  .rest-tips {
    grid-template-columns: 1fr;
  }
  .rest-overview {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .ros-value {
    font-size: 24px;
  }
  .rest-form-row {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .rest-overview {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .rest-overview-stat {
    padding: 14px;
    flex-direction: row;
    justify-content: space-between;
  }
}

/* =============================================================
   漫步功能
   ============================================================= */
.rest-stroll-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.rest-stroll-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  border-radius: 999px;
  background: rgba(122, 184, 122, 0.1);
  border: 1px solid rgba(122, 184, 122, 0.15);
  color: var(--text-secondary);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 1px;
}

.rest-stroll-btn:hover:not(:disabled) {
  background: rgba(122, 184, 122, 0.2);
  border-color: rgba(122, 184, 122, 0.3);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.rest-stroll-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rest-stroll-icon {
  font-size: 20px;
  line-height: 1;
}

.rest-stroll-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  animation: stroll-fade-in 0.3s ease;
}

@keyframes stroll-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.rest-stroll-result-icon {
  font-size: 24px;
  line-height: 1;
}

.rest-stroll-result-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.rest-stroll-result-desc {
  font-size: 11px;
  color: var(--text-secondary);
}

/* ---- 植被标识 ---- */
.rpc-vegetation {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(122, 184, 122, 0.06);
  border: 1px solid rgba(122, 184, 122, 0.08);
  font-size: 11px;
  color: var(--text-secondary);
  align-self: flex-start;
}

.rpc-veg-icon {
  font-size: 14px;
  line-height: 1;
}

.rpc-veg-name {
  letter-spacing: 0.3px;
}

/* ---- 季节标识 ---- */
.rest-season-indicator {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.rest-season-badge {
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 10px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  letter-spacing: 1px;
  transition: all 0.5s ease;
}
</style>