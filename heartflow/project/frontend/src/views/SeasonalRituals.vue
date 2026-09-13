<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance sr">
    <!-- 氛围背景层：岁时阁 · 四季轮回 -->
    <div data-enter class="sr-ambient" aria-hidden="true">
      <div class="sr-glow sr-glow--top"></div>
      <div class="sr-glow sr-glow--bottom"></div>
      <!-- 岁时 SVG 装饰 -->
      <div class="sr-svg-decor" aria-hidden="true">
        <svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="srCoreGlow" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.06"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <filter id="srStarGlow">
              <feGaussianBlur stdDeviation="1" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- 中心光晕 -->
          <circle cx="300" cy="250" r="280" fill="url(#srCoreGlow)"/>
          <!-- 岁时环装饰 -->
          <g opacity="0.04" stroke="var(--accent)" stroke-width="0.6" fill="none" class="sr-ring-decor">
            <circle cx="300" cy="300" r="180"/>
            <circle cx="300" cy="300" r="140"/>
            <circle cx="300" cy="300" r="100"/>
            <line x1="300" y1="120" x2="300" y2="480"/>
            <line x1="120" y1="300" x2="480" y2="300"/>
            <line x1="173" y1="173" x2="427" y2="427"/>
            <line x1="173" y1="427" x2="427" y2="173"/>
          </g>
          <!-- 星辰光点 -->
          <g fill="var(--accent)" opacity="0.06" filter="url(#srStarGlow)" class="sr-stars">
            <circle cx="80" cy="120" r="1.5" class="sr-star sr-star--1"/>
            <circle cx="520" cy="100" r="2" class="sr-star sr-star--2"/>
            <circle cx="150" cy="250" r="1.2" class="sr-star sr-star--3"/>
            <circle cx="450" cy="280" r="1.8" class="sr-star sr-star--4"/>
            <circle cx="100" cy="400" r="1.5" class="sr-star sr-star--5"/>
            <circle cx="500" cy="420" r="1.3" class="sr-star sr-star--6"/>
            <circle cx="200" cy="180" r="1" class="sr-star sr-star--7"/>
            <circle cx="400" cy="160" r="1.7" class="sr-star sr-star--8"/>
            <circle cx="280" cy="500" r="1.4" class="sr-star sr-star--9"/>
            <circle cx="350" cy="520" r="1.1" class="sr-star sr-star--10"/>
          </g>
          <!-- 春枝 -->
          <g opacity="0.04" stroke="var(--accent)" stroke-width="0.7" fill="none" class="sr-season-branch sr-branch--spring">
            <path d="M50,150 Q60,130 70,140 Q80,150 75,165"/>
            <path d="M70,140 Q85,125 95,135"/>
            <path d="M75,165 Q90,170 100,160"/>
            <ellipse cx="60" cy="145" rx="4" ry="2.5" fill="var(--accent)" transform="rotate(-20 60 145)"/>
            <ellipse cx="95" cy="130" rx="3.5" ry="2" fill="var(--accent)" transform="rotate(15 95 130)"/>
            <ellipse cx="100" cy="155" rx="3" ry="2" fill="var(--accent)" transform="rotate(-10 100 155)"/>
          </g>
          <!-- 秋叶 -->
          <g opacity="0.04" stroke="var(--accent)" stroke-width="0.7" fill="none" class="sr-season-branch sr-branch--autumn">
            <path d="M550,200 Q540,180 530,190 Q520,200 525,215"/>
            <path d="M530,190 Q515,175 505,185"/>
            <ellipse cx="535" cy="195" rx="4" ry="2.5" fill="var(--accent)" transform="rotate(20 535 195)"/>
            <ellipse cx="505" cy="180" rx="3.5" ry="2" fill="var(--accent)" transform="rotate(-15 505 180)"/>
          </g>
          <!-- 风雪粒子 -->
          <g fill="var(--accent)" opacity="0.03" class="sr-snow-particles">
            <circle cx="180" cy="550" r="2" class="sr-snow sr-snow--1"/>
            <circle cx="420" cy="580" r="1.5" class="sr-snow sr-snow--2"/>
            <circle cx="300" cy="620" r="1.8" class="sr-snow sr-snow--3"/>
            <circle cx="150" cy="650" r="1.3" class="sr-snow sr-snow--4"/>
            <circle cx="450" cy="670" r="2" class="sr-snow sr-snow--5"/>
          </g>
          <!-- 夏萤 -->
          <g fill="var(--accent)" opacity="0.04" class="sr-fireflies">
            <circle cx="250" cy="350" r="1.5" class="sr-firefly sr-firefly--1"/>
            <circle cx="380" cy="380" r="1.2" class="sr-firefly sr-firefly--2"/>
            <circle cx="320" cy="420" r="1.8" class="sr-firefly sr-firefly--3"/>
            <circle cx="200" cy="400" r="1.3" class="sr-firefly sr-firefly--4"/>
          </g>
        </svg>
      </div>
    </div>
    <!-- 装饰性头部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">岁时有序，仪式长存</p>
    <h1 class="sr-title">岁时阁</h1>

    <!-- 统计概览 -->
    <section data-enter class="sr-stats-section">
      <div class="sr-stats-row">
        <div class="sr-stat-card">
          <span class="sr-stat-label">总仪式</span>
          <strong class="sr-stat-value">{{ srStats.total }}</strong>
          <span class="sr-stat-note">全部已登记</span>
        </div>
        <div class="sr-stat-card">
          <span class="sr-stat-label">今年完成</span>
          <strong class="sr-stat-value">{{ srStats.thisYear }}</strong>
          <span class="sr-stat-note">本年度累计</span>
        </div>
        <div class="sr-stat-card">
          <span class="sr-stat-label">连续天数</span>
          <strong class="sr-stat-value">{{ srStats.streak }}</strong>
          <span class="sr-stat-note">持续打卡</span>
        </div>
      </div>
    </section>

    <!-- 季节完成统计 -->
    <section data-enter class="sr-season-stats-section">
      <h3>📊 季节完成统计</h3>
      <div class="sr-distribution-bar">
        <div v-for="sd in seasonDistribution" :key="sd.season" class="sr-dist-item">
          <span class="sr-dist-label">{{ sd.icon }} {{ sd.label }}</span>
          <div class="sr-dist-track">
            <div class="sr-dist-fill" :class="sd.season" :style="{ width: sd.pct + '%' }"></div>
          </div>
          <span class="sr-dist-count">{{ sd.count }}</span>
        </div>
      </div>
    </section>

    <!-- 岁时档案（INCR-15）档案概览/季节分布/岁时健康/温和洞察 -->
    <SeasonalArchivePanel :rituals="srCtx.rituals.value" />

    <!-- 岁时环 -->
    <div data-enter class="sr-ring-container">
      <div class="sr-season-ring">
        <div v-for="t in SOLAR_TERMS" :key="t.name" class="sr-ring-node" :class="{active:t===termCtx.currentTerm.value,upcoming:t===termCtx.upcomingTerm.value}"
          :style="termCtx.nodeAngle(t)" @click="selectedTerm=t" :title="t.name">
          <span class="sr-rn-dot"/>
          <span class="sr-rn-label" v-if="t===termCtx.currentTerm.value||t===termCtx.upcomingTerm.value">{{t.name}}</span>
        </div>
        <div class="sr-ring-center">{{termCtx.currentTerm.value?.icon||'🌱'}}</div>
      </div>
    </div>

    <!-- 当前节气 -->
    <div data-enter class="sr-current-term" v-if="termCtx.currentTerm.value">
      <span class="sr-term-icon">{{termCtx.currentTerm.value.icon}}</span>
      <div><strong>{{termCtx.currentTerm.value.name}}</strong><p class="sr-term-desc">{{termCtx.currentTerm.value.desc}}</p></div>
    </div>

    <!-- 此刻时令 · 自动记录时辰/节气/天气/季节（zeitgeist 引擎，INCR-304 补挂载孤儿组件 DiaryAutoMeta：零 props 自持读桥，宿主内 zeitgeist 无第二消费方） -->
    <section data-enter class="sr-zeitgeist-section">
      <h3>⏱ 此刻时令</h3>
      <p class="sr-zeitgeist-desc">为日志自动附上时令上下文：时辰、节气、天气与季节，一笔记下。</p>
      <DiaryAutoMeta />
    </section>

    <!-- 四季仪式 -->
    <section data-enter class="sr-rituals-section">
      <h3>🌿 四季仪式</h3>

      <!-- 季节分类标签 -->
      <div class="sr-season-tabs">
        <button
          v-for="s in SEASON_META"
          :key="s.key"
          :class="['sr-season-tab', { active: srCtx.activeSeason.value === s.key }]"
          @click="srCtx.activeSeason.value = s.key"
        >
          <span class="sr-season-tab-icon">{{ s.icon }}</span>
          <span class="sr-season-tab-label">{{ s.label }}</span>
          <span class="sr-season-tab-count">{{ srCtx.seasonRituals(s.key).length }}</span>
        </button>
      </div>

      <!-- 排序 & 搜索 -->
      <div class="sr-sort-bar">
        <button
          v-for="opt in sortOptions"
          :key="opt.field"
          :class="['sr-sort-btn', { active: sortField === opt.field }]"
          @click="setSort(opt.field)"
        >
          <span>{{ opt.label }}</span>
          <span v-if="sortField === opt.field" class="sr-sort-arrow">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
        </button>
      </div>
      <div class="sr-search-bar">
        <input v-model="searchQuery" placeholder="搜索仪式名称或描述..." class="sr-input sr-search-input" />
      </div>

      <!-- 仪式卡片列表 -->
      <div class="sr-ritual-cards" v-if="sortedRituals.length > 0">
        <div v-for="(r, index) in sortedRituals" :key="r.id" class="sr-ritual-card" :style="{ animationDelay: `${index * 0.05}s` }">
          <button class="sr-ritual-card-del" @click="srCtx.deleteRitual(r.id)" title="删除仪式">×</button>
          <div class="sr-ritual-card-body">
            <div class="sr-ritual-card-top">
              <span class="sr-ritual-card-name">{{ r.name }}</span>
              <span class="sr-season-tag" :class="r.season">{{ SEASON_META.find(s => s.key === r.season)?.label || r.season }}</span>
            </div>
            <div class="sr-ritual-card-meta">
              <span class="sr-ritual-count">已完成 <strong>{{ r.count }}</strong> 次</span>
              <span v-if="r.lastCompletedAt" class="sr-ritual-last">上次 {{ termCtx.formatDate(r.lastCompletedAt) }}</span>
              <span v-else class="sr-ritual-last never">尚未完成</span>
            </div>
            <p v-if="r.description" class="sr-ritual-desc">{{ r.description }}</p>
            <button class="sr-ritual-complete-btn" @click="srCtx.completeRitual(r.id)">
              <span class="sr-complete-icon">✓</span> 完成
            </button>
          </div>
        </div>
      </div>
      <div v-else class="sr-empty-rituals">
        <span class="sr-empty-icon">🕊</span>
        <template v-if="searchQuery.trim()">
          <p>没有匹配的仪式</p>
          <p class="sr-empty-hint">尝试其他关键词</p>
        </template>
        <template v-else>
          <p>暂无 {{ SEASON_META.find(s => s.key === srCtx.activeSeason.value)?.label }} 仪式</p>
          <p class="sr-empty-hint">在下方的表单中添加一个吧</p>
        </template>
      </div>
    </section>

    <!-- 添加仪式表单 -->
    <section data-enter class="sr-add-section">
      <h3>✚ 添加仪式</h3>
      <div class="sr-add-form">
        <input v-model="form.name" placeholder="仪式名称" class="sr-input" />
        <select v-model="form.season" class="sr-select">
          <option value="spring">🌸 春</option>
          <option value="summer">☀️ 夏</option>
          <option value="autumn">🍂 秋</option>
          <option value="winter">❄️ 冬</option>
        </select>
        <input v-model="form.description" placeholder="描述（可选）" class="sr-input" />
        <button @click="handleAddRitual" class="sr-btn" :disabled="!form.name">添加</button>
      </div>
    </section>

    <!-- 节日卡片 -->
    <section data-enter v-if="selectedTerm"><h3>📋 {{selectedTerm.name}} · 传统习俗</h3>
      <div class="sr-custom-card">
        <p>{{ getTermCustoms(selectedTerm.name) }}</p>
        <span class="sr-custom-source">—— 岁时阁 · 民俗文化</span>
      </div>
    </section>

    <!-- 最近节日 -->
    <section data-enter><h3>🎋 最近节日</h3>
      <div class="sr-festival-list" v-if="termCtx.upcomingFestivals.value.length">
        <div v-for="f in termCtx.upcomingFestivals.value" :key="f.name" class="sr-festival-card" @click="selectedFestival=f">
          <span>{{f.icon}}</span>
          <div><strong>{{f.name}}</strong> · {{f.date}}</div>
        </div>
        <div v-if="selectedFestival" class="sr-custom-card" style="margin-top:8px">
          <p>{{ getFestivalInfo(selectedFestival.name) }}</p>
        </div>
      </div>
    </section>

    <!-- 人生仪礼 -->
    <section data-enter><h3>🕯 人生仪礼</h3>
      <div v-if="prCtx.lifeRituals.value.length" class="sr-ritual-list">
        <div v-for="r in prCtx.lifeRituals.value" :key="r.id" class="sr-ritual-card">
          <span>{{r.icon||'🕯'}}</span>
          <div class="sr-ritual-info"><span class="sr-ritual-name">{{r.name}}</span><span class="sr-ritual-date">{{r.date}}</span></div>
          <div class="sr-life-actions">
            <button v-if="!r.done" class="sr-life-complete-btn" @click="handleCompleteLifeRitual(r.id)" title="完成仪礼">🦋</button>
            <span v-else class="sr-life-done-badge">✓ 已蜕变</span>
            <button class="sr-del" @click="prCtx.removeLifeRitual(r.id)">×</button>
          </div>
        </div>
      </div>
      <div class="sr-add-row">
        <select v-model="lform.type" class="sr-select"><option value="诞生">👶 诞生</option><option value="成人礼">🎓 成人礼</option><option value="毕业">📜 毕业</option><option value="婚礼">💒 婚礼</option><option value="葬礼">🕊 葬礼</option><option value="other">✨ 其他</option></select>
        <input v-model="lform.date" type="date" class="sr-input" style="width:130px"/>
        <input v-model="lform.note" placeholder="备注" class="sr-input"/>
        <button @click="handleAddLifeRitual" class="sr-btn" :disabled="!lform.date">+</button>
      </div>
    </section>

    <!-- 蜕变光茧动画 -->
    <Teleport to="body">
      <div v-if="cocoonState !== 'idle'" class="cocoon-overlay" @click="cocoonState = 'idle'; hatchingRitualId = null">
        <div class="cocoon-container" @click.stop>
          <svg viewBox="0 0 200 200" class="cocoon-svg">
            <defs>
              <radialGradient id="cocoon-bg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(var(--accent-rgb), 0.5)" />
                <stop offset="100%" stop-color="rgba(var(--accent-rgb), 0)" />
              </radialGradient>
              <radialGradient id="cocoon-hatch" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(255,220,150,0.8)" />
                <stop offset="60%" stop-color="rgba(var(--accent-rgb), 0.3)" />
                <stop offset="100%" stop-color="rgba(var(--accent-rgb), 0)" />
              </radialGradient>
              <filter id="sparkleBlur">
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <!-- 光晕背景 -->
            <circle cx="100" cy="100" r="70" fill="url(#cocoon-bg)" :class="['cocoon-glow', cocoonState]" />

            <!-- 茧组 -->
            <g :class="['cocoon-pupa', cocoonState]">
              <!-- 茧体 -->
              <ellipse cx="100" cy="100" rx="22" ry="40" class="cocoon-body" />
              <!-- 茧的纹理 -->
              <path d="M83,85 Q100,80 117,85" class="cocoon-line" />
              <path d="M80,100 Q100,95 120,100" class="cocoon-line" />
              <path d="M83,115 Q100,110 117,115" class="cocoon-line" />
              <!-- 顶部丝线 -->
              <path d="M100,60 Q105,55 108,50" class="cocoon-thread" />
              <!-- 丝线光点 -->
              <circle cx="108" cy="48" r="1.5" class="cocoon-thread-spark" filter="url(#sparkleBlur)" />
            </g>

            <!-- 蝴蝶组 -->
            <g :class="['cocoon-butterfly', cocoonState]">
              <!-- 左翅 -->
              <path d="M100,92 C70,60 35,55 50,82 C55,95 80,105 100,98" class="butterfly-wing butterfly-wing-left" />
              <!-- 右翅 -->
              <path d="M100,92 C130,60 165,55 150,82 C145,95 120,105 100,98" class="butterfly-wing butterfly-wing-right" />
              <!-- 左后翅 -->
              <path d="M100,98 C78,105 55,115 65,128 C72,135 90,118 100,105" class="butterfly-wing butterfly-wing-hl" />
              <!-- 右后翅 -->
              <path d="M100,98 C122,105 145,115 135,128 C128,135 110,118 100,105" class="butterfly-wing butterfly-wing-hr" />
              <!-- 身体 -->
              <ellipse cx="100" cy="105" rx="2.5" ry="13" class="butterfly-body" />
              <!-- 触角 -->
              <path d="M99,94 Q93,82 88,80" class="butterfly-antenna" />
              <path d="M101,94 Q107,82 112,80" class="butterfly-antenna" />
            </g>

            <!-- 蜕变星尘粒子 -->
            <g :class="['cocoon-sparkles', cocoonState]">
              <circle cx="75" cy="75" r="1.5" class="sparkle sparkle--1" filter="url(#sparkleBlur)"/>
              <circle cx="130" cy="70" r="1" class="sparkle sparkle--2" filter="url(#sparkleBlur)"/>
              <circle cx="65" cy="110" r="1.2" class="sparkle sparkle--3" filter="url(#sparkleBlur)"/>
              <circle cx="140" cy="105" r="1.5" class="sparkle sparkle--4" filter="url(#sparkleBlur)"/>
              <circle cx="90" cy="55" r="1" class="sparkle sparkle--5" filter="url(#sparkleBlur)"/>
              <circle cx="115" cy="50" r="1.3" class="sparkle sparkle--6" filter="url(#sparkleBlur)"/>
              <circle cx="55" cy="90" r="0.8" class="sparkle sparkle--7" filter="url(#sparkleBlur)"/>
              <circle cx="150" cy="85" r="1.1" class="sparkle sparkle--8" filter="url(#sparkleBlur)"/>
            </g>
          </svg>
          <div class="cocoon-state-label">{{ cocoonStateLabel }}</div>
        </div>
      </div>
    </Teleport>

    <!-- 私人仪式 -->
    <section data-enter><h3>🕯 私人仪式</h3>
      <div v-if="prCtx.rituals.value.length" class="sr-ritual-list">
        <div v-for="r in prCtx.rituals.value" :key="r.id" class="sr-ritual-card" @click="handleEditRitual(r)">
          <span>{{r.icon||'🕯'}}</span>
          <div class="sr-ritual-info"><span class="sr-ritual-name">{{r.name}}</span><span class="sr-ritual-date">{{r.date}} · {{r.note||'待记录'}}</span></div>
          <button class="sr-del" @click.stop="prCtx.removeRitual(r.id)">×</button>
        </div>
      </div>
      <div class="sr-add-row">
        <input v-model="rform.name" placeholder="仪式名称" class="sr-input"/>
        <input v-model="rform.date" type="date" class="sr-input" style="width:130px"/>
        <button @click="handleAddRitualLegacy" class="sr-btn" :disabled="!rform.name">+</button>
      </div>
    </section>

    <!-- 季节日志 -->
    <JournalPanel />

    <!-- 年度俯瞰（seasonal/overview 引擎：月度分布热力/年度对比/温和洞察，INCR-196） -->
    <SeasonalYearOverviewPanel
      :rituals="srCtx.rituals.value"
      :lifeRituals="prCtx.lifeRituals.value"
      :privateRituals="prCtx.rituals.value"
    />

    <!-- 岁时气象（INCR-253 补挂载孤儿组件：seasonal/seasonal-analytics 岁时节气健康三轴圆环） -->
    <SeasonalHealthPanel
      :rituals="srCtx.rituals.value"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useSeasonalRituals, usePrivateRituals, useSolarTerms } from '../modules/seasonal'
import { SOLAR_TERMS, SEASON_META, getTermCustoms, getFestivalInfo } from '../modules/seasonal'
import type { SolarTerm, Festival } from '../modules/seasonal/types'
import { useViewEntrance } from '../composables/useViewEntrance'
import JournalPanel from '../components/JournalPanel.vue'
import DiaryAutoMeta from '../components/DiaryAutoMeta.vue'
import SeasonalArchivePanel from '../components/SeasonalArchivePanel.vue'
import SeasonalYearOverviewPanel from '../components/SeasonalYearOverviewPanel.vue'
import SeasonalHealthPanel from '../components/SeasonalHealthPanel.vue'

// ---- 模块化 composables ----
const { entranceRef, entranceClass } = useViewEntrance()
const srCtx = useSeasonalRituals()
const prCtx = usePrivateRituals()
const termCtx = useSolarTerms()

// ---- 节气/节日选中状态 ----
const selectedTerm = ref<SolarTerm | null>(null)
const selectedFestival = ref<Festival | null>(null)

// ---- 四季仪式表单 ----
const form = reactive({
  name: '',
  season: 'spring' as 'spring' | 'summer' | 'autumn' | 'winter',
  description: '',
})

function handleAddRitual(): void {
  srCtx.addRitual(form.name, form.season, form.description)
  form.name = ''
  form.season = 'spring'
  form.description = ''
}

// ---- 排序 & 搜索状态 ----
const sortField = ref<'name' | 'count' | 'lastCompleted'>('count')
const sortOrder = ref<'asc' | 'desc'>('desc')
const searchQuery = ref('')

const sortOptions = [
  { field: 'name' as const, label: '名称' },
  { field: 'count' as const, label: '完成次数' },
  { field: 'lastCompleted' as const, label: '最近完成' },
]

function setSort(field: 'name' | 'count' | 'lastCompleted'): void {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

/** 排序 & 过滤后的仪式列表 */
const sortedRituals = computed(() => {
  let list = srCtx.currentSeasonRituals.value
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    )
  }
  // 排序
  const order = sortOrder.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (sortField.value === 'name') {
      return order * a.name.localeCompare(b.name)
    }
    if (sortField.value === 'count') {
      return order * (a.count - b.count)
    }
    // lastCompleted
    const aVal = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0
    const bVal = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0
    return order * (aVal - bVal)
  })
})

/** 季节分布统计 */
const seasonDistribution = computed(() => {
  const seasons = ['spring', 'summer', 'autumn', 'winter'] as const
  const total = srCtx.rituals.value.length || 1
  return seasons.map(s => {
    const count = srCtx.rituals.value.filter(r => r.season === s).length
    return {
      season: s,
      label: SEASON_META.find(m => m.key === s)?.label || s,
      icon: SEASON_META.find(m => m.key === s)?.icon || '',
      count,
      pct: Math.round((count / total) * 100),
    }
  })
})

// ---- 私人仪式表单 ----
const rform = reactive({ name: '', date: '' })
const lform = reactive({ type: '诞生', date: '', note: '' })

function handleAddRitualLegacy(): void {
  prCtx.addRitual(rform.name, rform.date || new Date().toISOString().slice(0, 10))
  rform.name = ''
  rform.date = ''
}

function handleEditRitual(r: { id: string; note: string }): void {
  const n = prompt('记录感受', r.note)
  if (n !== null) {
    prCtx.editRitual(r.id, n)
  }
}

function handleAddLifeRitual(): void {
  prCtx.addLifeRitual(lform.type, lform.date || new Date().toISOString().slice(0, 10), lform.note)
  lform.note = ''
}

// ---- 蜕变光茧动画 ----
const cocoonState = ref<'idle' | 'cocooning' | 'hatching' | 'emerged'>('idle')
const hatchingRitualId = ref<string | null>(null)

const cocoonStateLabel = computed(() => {
  const labels: Record<string, string> = {
    cocooning: '蜕变中...',
    hatching: '破茧而出',
    emerged: '化蝶飞去',
  }
  return labels[cocoonState.value] || ''
})

function handleCompleteLifeRitual(id: string): void {
  const ritual = prCtx.lifeRituals.value.find(r => r.id === id)
  if (!ritual) return

  // 标记为已完成
  prCtx.completeLifeRitual(id)

  // 触发光茧动画序列
  hatchingRitualId.value = id
  cocoonState.value = 'cocooning'

  setTimeout(() => { cocoonState.value = 'hatching' }, 1000)
  setTimeout(() => { cocoonState.value = 'emerged' }, 2000)
  setTimeout(() => {
    cocoonState.value = 'idle'
    hatchingRitualId.value = null
  }, 3000)
}

// 对外暴露统计（兼容模板引用）
const srStats = srCtx.stats
</script>

<style scoped>
/* ===== 暖琥珀主题 ===== */
.sr {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  color: var(--text-primary);
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 氛围背景层 */
.sr-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

/* 光晕层 */
.sr-glow {
  position: absolute;
  pointer-events: none;
  transition: opacity 30s ease;
}

.sr-glow--top {
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.08) 0%, transparent 70%);
}

.sr-glow--bottom {
  bottom: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 300px;
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
}

/* SVG 装饰层 */
.sr-svg-decor {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.sr-svg-decor svg {
  width: 100%;
  height: 100%;
  opacity: 0.7;
}

/* 岁时环装饰动画 */
.sr-ring-decor {
  animation: sr-ring-rotate 60s linear infinite;
  transform-origin: 300px 300px;
}
@keyframes sr-ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 星辰闪烁 */
.sr-star {
  animation: sr-star-twinkle 3s ease-in-out infinite;
}
.sr-star--1 { animation-delay: 0s; }
.sr-star--2 { animation-delay: -0.5s; }
.sr-star--3 { animation-delay: -1s; }
.sr-star--4 { animation-delay: -1.5s; }
.sr-star--5 { animation-delay: -2s; }
.sr-star--6 { animation-delay: -2.5s; }
.sr-star--7 { animation-delay: -0.8s; }
.sr-star--8 { animation-delay: -1.8s; }
.sr-star--9 { animation-delay: -0.3s; }
.sr-star--10 { animation-delay: -1.3s; }
@keyframes sr-star-twinkle {
  0%, 100% { opacity: 0.06; }
  50% { opacity: 0.15; }
}

/* 春枝微动 */
.sr-season-branch {
  animation: sr-branch-sway 8s ease-in-out infinite;
}
.sr-branch--autumn {
  animation-delay: -4s;
}
@keyframes sr-branch-sway {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(2px) rotate(0.5deg); }
  75% { transform: translateX(-2px) rotate(-0.5deg); }
}

/* 风雪飘落 */
.sr-snow {
  animation: sr-snow-fall 10s linear infinite;
}
.sr-snow--1 { animation-delay: 0s; }
.sr-snow--2 { animation-delay: -2s; }
.sr-snow--3 { animation-delay: -4s; }
.sr-snow--4 { animation-delay: -6s; }
.sr-snow--5 { animation-delay: -8s; }
@keyframes sr-snow-fall {
  0% { transform: translateY(-20px) translateX(0); opacity: 0.03; }
  50% { transform: translateY(10px) translateX(10px); opacity: 0.06; }
  100% { transform: translateY(-20px) translateX(0); opacity: 0.03; }
}

/* 夏萤飞舞 */
.sr-firefly {
  animation: sr-firefly-dance 6s ease-in-out infinite;
}
.sr-firefly--1 { animation-delay: 0s; }
.sr-firefly--2 { animation-delay: -1.5s; }
.sr-firefly--3 { animation-delay: -3s; }
.sr-firefly--4 { animation-delay: -4.5s; }
@keyframes sr-firefly-dance {
  0%, 100% { transform: translate(0, 0); opacity: 0.04; }
  25% { transform: translate(15px, -10px); opacity: 0.08; }
  50% { transform: translate(-5px, -20px); opacity: 0.03; }
  75% { transform: translate(-15px, -5px); opacity: 0.07; }
}

/* 装饰性头部 */
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.3), transparent);
}

.orn-diamond {
  color: var(--accent);
  font-size: 11px;
  opacity: 0.6;
}

.header-kicker {
  text-align: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 4px;
  margin: 0 0 4px 0;
  font-weight: 300;
}

.sr-title {
  text-align: center;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 6px;
  color: var(--accent);
  margin: 0 0 28px 0;
  text-shadow: 0 0 30px rgba(var(--accent-rgb), 0.15);
}

/* 统计概览 */
.sr-stats-section {
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.sr-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.sr-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.sr-stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.05) 0%, transparent 50%);
  pointer-events: none;
}

.sr-stat-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 1px;
}

.sr-stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.2;
  text-shadow: 0 0 20px rgba(var(--accent-rgb), 0.2);
}

.sr-stat-note {
  font-size: 9px;
  color: rgba(232, 221, 208, 0.25);
}

/* 岁时环 */
.sr-ring-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.sr-season-ring {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.2);
}

.sr-ring-node {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  margin: -10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sr-ring-node:hover {
  transform: scale(1.3);
}

.sr-ring-node.active .sr-rn-dot {
  background: var(--accent);
  box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.5);
}

.sr-ring-node.upcoming .sr-rn-dot {
  background: rgba(var(--accent-rgb), 0.4);
}

.sr-rn-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.15);
  display: block;
}

.sr-rn-label {
  position: absolute;
  font-size: 9px;
  white-space: nowrap;
  top: -14px;
  opacity: 0.5;
  color: var(--text-primary);
}

.sr-ring-center {
  position: absolute;
  inset: 30%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  border-radius: 50%;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

/* 当前节气 */
.sr-current-term {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.sr-term-icon {
  font-size: 28px;
}

.sr-term-desc {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
  margin-top: 4px;
}

/* 四季仪式 */
.sr-rituals-section {
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

/* 此刻时令 */
.sr-zeitgeist-section {
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}
.sr-zeitgeist-desc {
  margin: 4px 0 12px;
  font-size: 12px;
  opacity: 0.62;
}

.sr-season-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.sr-season-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
  color: rgba(232, 221, 208, 0.5);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.sr-season-tab:hover {
  background: var(--bg-card);
  color: rgba(232, 221, 208, 0.7);
}

.sr-season-tab.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

.sr-season-tab-icon {
  font-size: 16px;
}

.sr-season-tab-count {
  margin-left: auto;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(232, 221, 208, 0.35);
}

.sr-season-tab.active .sr-season-tab-count {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
}

.sr-ritual-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sr-ritual-card {
  position: relative;
  padding: 14px 14px 14px 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-left: 2px solid rgba(var(--accent-rgb), 0.15);
  transition: all 0.2s;
}

.sr-ritual-card:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.15);
  border-left-color: rgba(var(--accent-rgb), 0.3);
}

.sr-ritual-card-del {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(232, 221, 208, 0.15);
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.sr-ritual-card:hover .sr-ritual-card-del {
  opacity: 1;
}

.sr-ritual-card-del:hover {
  background: rgba(255, 107, 107, 0.15);
  color: var(--danger);
}

.sr-ritual-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sr-ritual-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sr-ritual-card-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.sr-season-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.sr-season-tag.spring {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.sr-season-tag.summer {
  background: rgba(255, 107, 107, 0.12);
  color: var(--danger);
}

.sr-season-tag.autumn {
  background: rgba(251, 146, 60, 0.12);
  color: #cf8b6b;
}

.sr-season-tag.winter {
  background: rgba(124, 184, 255, 0.12);
  color: #7cb8ff;
}

.sr-ritual-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sr-ritual-count {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}

.sr-ritual-count strong {
  color: var(--accent);
}

.sr-ritual-last {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}

.sr-ritual-last.never {
  color: rgba(232, 221, 208, 0.25);
}

.sr-ritual-desc {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(232, 221, 208, 0.45);
  margin: 0;
}

.sr-ritual-complete-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}

.sr-ritual-complete-btn:hover {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.35);
  color: #f0ddd0;
}

.sr-complete-icon {
  font-size: 13px;
  font-weight: 700;
}

/* 空状态 */
.sr-empty-rituals {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
  gap: 6px;
  color: rgba(232, 221, 208, 0.25);
}

.sr-empty-rituals .sr-empty-icon {
  font-size: 28px;
  opacity: 0.4;
}

.sr-empty-rituals p {
  font-size: 13px;
  margin: 0;
}

.sr-empty-hint {
  font-size: 11px;
  opacity: 0.5;
}

/* 添加仪式表单 */
.sr-add-section {
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.sr-add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.sr-add-form .sr-input,
.sr-add-form .sr-select {
  width: 100%;
  box-sizing: border-box;
}

.sr-add-form .sr-btn {
  align-self: flex-end;
}

/* 通用卡片 */
.sr-custom-card {
  padding: 14px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-top: 8px;
}

.sr-custom-card p {
  font-size: 13px;
  line-height: 1.7;
  margin: 0;
  color: var(--text-primary);
}

.sr-custom-source {
  font-size: 10px;
  opacity: 0.25;
  margin-top: 6px;
  display: block;
  text-align: right;
  color: rgba(232, 221, 208, 0.5);
}

/* 通用 section 标题 */
section {
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

section h3 {
  font-size: 14px;
  color: rgba(232, 221, 208, 0.7);
  margin-bottom: 10px;
  font-weight: 500;
}

/* 节日列表 */
.sr-festival-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sr-festival-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  color: var(--text-primary);
}

.sr-festival-card:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.15);
}

/* 仪式列表 */
.sr-ritual-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.sr-ritual-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sr-ritual-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.sr-ritual-date {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.4);
}

/* 删除按钮 */
.sr-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(232, 221, 208, 0.15);
  cursor: pointer;
  opacity: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sr-ritual-card:hover .sr-del {
  opacity: 1;
}

.sr-del:hover {
  color: var(--danger);
}

/* 添加行 */
.sr-add-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 表单控件 */
.sr-input {
  flex: 1;
  min-width: 80px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.sr-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.sr-input::placeholder {
  color: rgba(232, 221, 208, 0.25);
}

.sr-select {
  padding: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.sr-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.sr-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.sr-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.45);
}

.sr-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 时段指示器 — 氛围增强 */
.sr-season-ring {
  animation: ring-pulse 6s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0.05); }
  50% { box-shadow: 0 0 20px 4px rgba(var(--accent-rgb), 0.08); }
}

.sr-stat-card {
  animation: card-fade-in 0.6s ease-out both;
}

.sr-stat-card:nth-child(1) { animation-delay: 0.1s; }
.sr-stat-card:nth-child(2) { animation-delay: 0.2s; }
.sr-stat-card:nth-child(3) { animation-delay: 0.3s; }

@keyframes card-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.sr-ritual-card {
  animation: ritual-card-in 0.4s ease-out both;
}

@keyframes ritual-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 排序按钮 ===== */
.sr-sort-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.sr-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
  color: rgba(232, 221, 208, 0.45);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.sr-sort-btn:hover {
  background: var(--bg-card);
  color: rgba(232, 221, 208, 0.7);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.sr-sort-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

.sr-sort-arrow {
  font-size: 10px;
  opacity: 0.7;
  transition: transform 0.2s ease;
}

/* ===== 搜索栏 ===== */
.sr-search-bar {
  margin-bottom: 12px;
}

.sr-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.sr-search-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.06);
}

.sr-search-input::placeholder {
  color: rgba(232, 221, 208, 0.2);
}

/* ===== 季节分布柱状图 ===== */
.sr-distribution-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.sr-dist-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sr-dist-label {
  width: 48px;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.6);
  flex-shrink: 0;
}

.sr-dist-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}

.sr-dist-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 4px;
}

.sr-dist-fill.spring {
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.6), rgba(var(--accent-rgb), 0.4));
}

.sr-dist-fill.summer {
  background: linear-gradient(90deg, rgba(255, 107, 107, 0.6), rgba(255, 107, 107, 0.4));
}

.sr-dist-fill.autumn {
  background: linear-gradient(90deg, rgba(251, 146, 60, 0.6), rgba(251, 146, 60, 0.4));
}

.sr-dist-fill.winter {
  background: linear-gradient(90deg, rgba(124, 184, 255, 0.6), rgba(124, 184, 255, 0.4));
}

.sr-dist-count {
  width: 24px;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: rgba(232, 221, 208, 0.5);
  flex-shrink: 0;
}

/* ===== 增强仪式卡片悬停效果 ===== */
.sr-ritual-card {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sr-ritual-card:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.15);
  border-left-color: rgba(var(--accent-rgb), 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* ===== 节气节点动画 ===== */
.sr-ring-node {
  animation: node-fade-in 0.6s ease-out both;
}

@keyframes node-fade-in {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

.sr-ring-node.active .sr-rn-dot {
  animation: node-pulse 2s ease-in-out infinite;
}

@keyframes node-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(var(--accent-rgb), 0.4); }
  50% { box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.7); }
}

.sr-ring-node:hover .sr-rn-dot {
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.4);
}

/* ===== 仪式卡片过渡 ===== */
.sr-ritual-cards {
  transition: opacity 0.3s ease;
}

/* ===== 季节统计区域进场动画 ===== */
.sr-season-stats-section {
  animation: card-fade-in 0.6s ease-out 0.15s both;
}

/* ===== 排序/搜索栏进场动画 ===== */
.sr-sort-bar {
  animation: card-fade-in 0.4s ease-out 0.1s both;
}

.sr-search-bar {
  animation: card-fade-in 0.4s ease-out 0.15s both;
}

/* ===== 生命仪礼操作按钮 ===== */
.sr-life-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sr-life-complete-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  padding: 0;
  line-height: 1;
}

.sr-life-complete-btn:hover {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: rgba(var(--accent-rgb), 0.5);
  transform: scale(1.15);
  box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.2);
}

.sr-life-done-badge {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 1px;
  white-space: nowrap;
}

/* ===== 蜕变光茧动画 ===== */

/* Overlay */
.cocoon-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 9999;
  animation: cocoon-overlay-in 0.4s ease-out;
}

@keyframes cocoon-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cocoon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.cocoon-svg {
  width: 240px;
  height: 240px;
  overflow: visible;
}

/* === 光晕动画 === */
.cocoon-glow.cocooning {
  animation: glow-pulse 1.5s ease-in-out infinite;
}

.cocoon-glow.hatching {
  transition: all 0.3s;
  fill: url(#cocoon-hatch);
  animation: glow-flash 0.6s ease-in-out 3;
}

.cocoon-glow.emerged {
  opacity: 0;
  transition: opacity 0.5s ease;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.1); }
}

@keyframes glow-flash {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.25); }
}

/* === 茧呼吸动画 === */
.cocoon-pupa {
  transform-origin: 100px 100px;
}

.cocoon-pupa.cocooning {
  animation: cocoon-breathe 1.5s ease-in-out infinite;
}

.cocoon-pupa.hatching {
  animation: cocoon-crack 0.8s ease-in-out forwards;
}

.cocoon-pupa.emerged {
  opacity: 0;
  transition: opacity 0.4s ease;
}

@keyframes cocoon-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

@keyframes cocoon-crack {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.8; }
  100% { transform: scale(1.12); opacity: 0; }
}

.cocoon-body {
  fill: rgba(var(--accent-rgb), 0.12);
  stroke: rgba(var(--accent-rgb), 0.5);
  stroke-width: 1.5;
  filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.15));
}

.cocoon-line {
  fill: none;
  stroke: rgba(var(--accent-rgb), 0.15);
  stroke-width: 0.8;
}

.cocoon-thread {
  fill: none;
  stroke: rgba(var(--accent-rgb), 0.2);
  stroke-width: 1;
}

/* === 蝴蝶动画 === */
.cocoon-butterfly {
  opacity: 0;
  transform-origin: 100px 105px;
}

.cocoon-butterfly.emerged {
  opacity: 1;
  animation: butterfly-flyaway 1.2s ease-in-out forwards;
}

@keyframes butterfly-flyaway {
  0% { transform: translate(0, 0) scale(0.3); opacity: 0; }
  15% { transform: translate(0, 0) scale(1); opacity: 1; }
  30% { transform: translate(10px, -15px) scale(1.05); opacity: 1; }
  60% { transform: translate(30px, -45px) scale(0.95); opacity: 0.8; }
  100% { transform: translate(60px, -80px) scale(0.7); opacity: 0; }
}

.butterfly-wing {
  fill: rgba(var(--accent-rgb), 0.55);
  stroke: rgba(var(--accent-rgb), 0.7);
  stroke-width: 0.8;
  transform-origin: 100px 98px;
}

.cocoon-butterfly.emerged .butterfly-wing-left {
  animation: wing-flap-l 0.15s ease-in-out infinite alternate;
}

.cocoon-butterfly.emerged .butterfly-wing-right {
  animation: wing-flap-r 0.15s ease-in-out infinite alternate;
}

.cocoon-butterfly.emerged .butterfly-wing-hl {
  animation: wing-flap-l 0.15s ease-in-out 0.03s infinite alternate;
}

.cocoon-butterfly.emerged .butterfly-wing-hr {
  animation: wing-flap-r 0.15s ease-in-out 0.03s infinite alternate;
}

@keyframes wing-flap-l {
  from { transform: rotate(0deg); }
  to { transform: rotate(-20deg); }
}

@keyframes wing-flap-r {
  from { transform: rotate(0deg); }
  to { transform: rotate(20deg); }
}

.butterfly-body {
  fill: rgba(var(--accent-rgb), 0.85);
}

.butterfly-antenna {
  fill: none;
  stroke: rgba(var(--accent-rgb), 0.6);
  stroke-width: 0.8;
  stroke-linecap: round;
}

/* === 状态标签 === */
.cocoon-state-label {
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(var(--accent-rgb), 0.3);
  animation: cocoon-label-in 0.4s ease-out;
}
@keyframes cocoon-label-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 丝线光点 */
.cocoon-thread-spark {
  fill: rgba(255, 220, 150, 0.8);
  animation: thread-sparkle 1s ease-in-out infinite;
}
@keyframes thread-sparkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* 蜕变星尘 */
.cocoon-sparkles {
  opacity: 0;
}
.cocoon-sparkles.hatching {
  opacity: 1;
  animation: sparkles-burst 0.8s ease-out forwards;
}
.cocoon-sparkles.emerged {
  opacity: 1;
  animation: sparkles-fade 1s ease-out forwards;
}
@keyframes sparkles-burst {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0.8; transform: scale(1); }
}
@keyframes sparkles-fade {
  0% { opacity: 0.8; }
  100% { opacity: 0; }
}

.sparkle {
  fill: rgba(255, 220, 150, 0.9);
  animation: sparkle-twinkle 0.8s ease-in-out infinite;
}
.sparkle--1 { animation-delay: 0s; }
.sparkle--2 { animation-delay: -0.1s; }
.sparkle--3 { animation-delay: -0.2s; }
.sparkle--4 { animation-delay: -0.3s; }
.sparkle--5 { animation-delay: -0.4s; }
.sparkle--6 { animation-delay: -0.5s; }
.sparkle--7 { animation-delay: -0.6s; }
.sparkle--8 { animation-delay: -0.7s; }
@keyframes sparkle-twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes cocoon-label-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .sr { padding: 32px 20px 64px; }
  .sr-stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .sr-ritual-card-body { gap: 6px; }
}

@media (max-width: 640px) {
  .sr { padding: 24px 14px 56px; }
  .sr-stats-row { grid-template-columns: 1fr; gap: 8px; }
  .sr-season-tabs { flex-wrap: wrap; }
  .sr-season-tab { flex: 1 1 calc(50% - 4px); min-width: 0; }
  .sr-ritual-card-top { flex-direction: row; align-items: center; }
  .sr-ritual-card-meta { flex-direction: row; gap: 8px; }
}
</style>