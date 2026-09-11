<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance cog">
    <!-- 氛围背景层：释光阁 · 思维光轨 -->
    <div class="cog-ambient" aria-hidden="true">
      <div class="cog-glow cog-glow--top"></div>
      <div class="cog-glow cog-glow--mid"></div>
      <div class="cog-glow cog-glow--bot"></div>
      <!-- 释光阁 SVG 装饰 -->
      <div class="cog-svg-decor" aria-hidden="true">
        <svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="cogLightCore" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.06"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="cogBeamGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0"/>
              <stop offset="40%" stop-color="var(--accent)" stop-opacity="0.05"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
            <radialGradient id="cogPrismGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <filter id="cogLightBlur">
              <feGaussianBlur stdDeviation="1.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <!-- 中心光晕 -->
          <circle cx="300" cy="200" r="240" fill="url(#cogLightCore)"/>

          <!-- 四束光：从棱镜向外发散 -->
          <g opacity="0.04" stroke="var(--accent)" stroke-width="0.6" class="cog-light-beams">
            <!-- 上光束 -->
            <line x1="300" y1="180" x2="300" y2="40" stroke-dasharray="4,8">
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="4s" repeatCount="indefinite"/>
            </line>
            <!-- 右光束 -->
            <line x1="320" y1="200" x2="540" y2="200" stroke-dasharray="4,8">
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="4.5s" repeatCount="indefinite"/>
            </line>
            <!-- 下光束 -->
            <line x1="300" y1="220" x2="300" y2="380" stroke-dasharray="4,8">
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="5s" repeatCount="indefinite"/>
            </line>
            <!-- 左光束 -->
            <line x1="280" y1="200" x2="60" y2="200" stroke-dasharray="4,8">
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="4.2s" repeatCount="indefinite"/>
            </line>
          </g>

          <!-- 棱镜 -->
          <g opacity="0.06" class="cog-prism">
            <polygon points="300,170 330,200 300,230 270,200" fill="var(--accent)" stroke="var(--accent)" stroke-width="0.5">
              <animate attributeName="opacity" values="0.04;0.08;0.04" dur="6s" repeatCount="indefinite"/>
            </polygon>
            <circle cx="300" cy="200" r="28" fill="url(#cogPrismGlow)">
              <animate attributeName="r" values="26;32;26" dur="5s" repeatCount="indefinite"/>
            </circle>
          </g>

          <!-- 思维光轨：同心圆 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.4" fill="none" class="cog-thought-orbits">
            <circle cx="300" cy="200" r="80">
              <animate attributeName="r" values="78;84;78" dur="8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="300" cy="200" r="120">
              <animate attributeName="r" values="118;124;118" dur="10s" repeatCount="indefinite"/>
            </circle>
            <circle cx="300" cy="200" r="160" stroke-dasharray="3,8">
              <animate attributeName="r" values="158;163;158" dur="7s" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" from="0" to="-22" dur="6s" repeatCount="indefinite"/>
            </circle>
          </g>

          <!-- 漂浮光点 -->
          <g fill="var(--accent)" opacity="0.05" filter="url(#cogLightBlur)" class="cog-light-particles">
            <circle cx="120" cy="100" r="1.5" class="cog-particle cog-particle--1"/>
            <circle cx="480" cy="120" r="2" class="cog-particle cog-particle--2"/>
            <circle cx="80" cy="280" r="1.2" class="cog-particle cog-particle--3"/>
            <circle cx="520" cy="300" r="1.8" class="cog-particle cog-particle--4"/>
            <circle cx="150" cy="400" r="1.5" class="cog-particle cog-particle--5"/>
            <circle cx="450" cy="420" r="1.3" class="cog-particle cog-particle--6"/>
            <circle cx="200" cy="550" r="1.7" class="cog-particle cog-particle--7"/>
            <circle cx="400" cy="580" r="1.4" class="cog-particle cog-particle--8"/>
            <circle cx="100" cy="650" r="1.8" class="cog-particle cog-particle--9"/>
            <circle cx="500" cy="680" r="1.2" class="cog-particle cog-particle--10"/>
            <circle cx="300" cy="350" r="1.5" class="cog-particle cog-particle--11"/>
            <circle cx="250" cy="150" r="1" class="cog-particle cog-particle--12"/>
          </g>

          <!-- 素镜反射线 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.3" class="cog-mirror-lines">
            <line x1="80" y1="500" x2="520" y2="500"/>
            <line x1="80" y1="520" x2="520" y2="520"/>
            <line x1="80" y1="540" x2="520" y2="540"/>
            <line x1="80" y1="560" x2="520" y2="560"/>
          </g>

          <!-- 底部光池 -->
          <ellipse cx="300" cy="540" rx="200" ry="60" fill="none" stroke="var(--accent)" stroke-width="0.3" opacity="0.04" class="cog-light-pool">
            <animate attributeName="rx" values="195;205;195" dur="9s" repeatCount="indefinite"/>
            <animate attributeName="ry" values="58;62;58" dur="9s" repeatCount="indefinite"/>
          </ellipse>
        </svg>
      </div>
    </div>

    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">释光 · 素镜 · 回看自我</p>
    <h1 class="cog-title">释光阁</h1>

    <div data-enter class="cog-overview">
      <div class="cog-overview-card">
        <span class="cog-overview-num">{{ reflections.length }}</span>
        <span class="cog-overview-label">反思</span>
      </div>
      <div class="cog-overview-card">
        <span class="cog-overview-num">{{ breadth.toFixed(0) }}%</span>
        <span class="cog-overview-label">广度</span>
      </div>
      <div class="cog-overview-card">
        <span class="cog-overview-num">{{ depth.toFixed(0) }}%</span>
        <span class="cog-overview-label">深度</span>
      </div>
    </div>

    <!-- 释光仪 -->
    <section data-enter>
      <h3>🔦 释光仪</h3>
      <p class="cog-hint">放上一件你想回看的事，从四个角度把它陈列出来。</p>
      <textarea v-model="subject" placeholder="例如：这件事在最近几次记录里反复出现…" class="cog-input" rows="2" />
      <div class="cog-light-btns">
        <button v-for="l in lights" :key="l.key" @click="activeLight=l.key" :class="['cog-light-btn',{active:activeLight===l.key}]" :style="activeLight===l.key?{borderColor:'#d4a574',background:'#d4a57422'}:{}">{{l.icon}} {{l.label}}</button>
      </div>
      <div v-if="activeLight && subject" class="cog-light-result" :style="{borderColor:currentLight?.color+'33'}">
        <p>{{ lightResponse }}</p>
      </div>
    </section>

    <!-- F4 四束光思考链：逐步展开本地规则推导 -->
    <section data-enter class="cog-reasoning-chain" v-if="lightStates.length">
      <h3>💡 四束光思考链</h3>
      <p class="cog-hint">把四束光的推导逐条摊开，看看它们各自从你的哪些记录里得出了什么。</p>
      <div class="crc-controls">
        <button class="crc-toggle" @click="expandAllChains = !expandAllChains">{{ expandAllChains ? '全部收起' : '全部展开' }}</button>
      </div>
      <div class="crc-list">
        <div v-for="st in lightStates" :key="st.key" class="crc-item">
          <button class="crc-head" @click="toggleChain(st.key)">
            <span class="crc-icon" :style="{ color: st.color }">{{ st.icon }}</span>
            <span class="crc-label">{{ st.label }}</span>
            <span class="crc-level" :style="{ color: st.color }">{{ st.level }} · {{ st.score }}</span>
            <span class="crc-caret">{{ openChains.has(st.key) ? '▾' : '▸' }}</span>
          </button>
          <transition name="crc-fade">
            <ul v-if="openChains.has(st.key)" class="crc-steps">
              <li v-for="(ins, i) in st.insights" :key="i" class="crc-step">
                <span class="crc-step-idx">{{ i + 1 }}</span>
                <span class="crc-step-text">{{ ins }}</span>
              </li>
            </ul>
          </transition>
        </div>
      </div>
    </section>

    <!-- 素镜 · 回看 -->
    <section data-enter>
      <h3>🪞 素镜 · 回看</h3>
      <textarea v-model="behavior" placeholder="例如：我反复刷手机，然后又停下来…" class="cog-input" rows="2" />
      <button @click="translateB" class="cog-btn" :disabled="!behavior.trim()" style="margin-top:8px">查看记录</button>
      <div v-if="translation" class="cog-light-result" style="border-color:rgba(var(--accent-rgb), 0.2)"><p>{{ translation }}</p></div>
    </section>

    <!-- 认知光图 -->
    <section data-enter>
      <h3>📊 认知光图</h3>
      <div class="cog-chart-grid">
        <div class="cog-mini-chart"><span>广度</span><div class="cog-mini-bar"><div :style="{width:breadth+'%',background:'#d4a574'}"/></div></div>
        <div class="cog-mini-chart"><span>深度</span><div class="cog-mini-bar"><div :style="{width:depth+'%',background:'#d4a574'}"/></div></div>
        <div class="cog-mini-chart"><span>弹性</span><div class="cog-mini-bar"><div :style="{width:flexibility+'%',background:'#d4a574'}"/></div></div>
      </div>
      <p class="cog-chart-hint">基于最近 {{ recentCount }} 条记录自动评估</p>
    </section>

    <!-- 反思笔记 -->
    <section data-enter>
      <h3>📝 反思笔记</h3>
      <div class="cog-reflection-input">
        <input v-model="reflectionTitle" placeholder="标题" class="cog-input" style="margin-bottom:6px" />
        <textarea v-model="reflectionBody" placeholder="写下你的反思…" class="cog-input" rows="3" />
        <button @click="saveReflection" class="cog-btn" :disabled="!reflectionBody.trim()" style="margin-top:8px">📌 保存反思</button>
      </div>
      <div v-if="reflections.length" class="cog-reflection-list">
        <div v-for="r in reflections" :key="r.id" class="cog-reflection-card">
          <div class="cog-reflection-header">
            <strong>{{ r.title || '无标题反思' }}</strong>
            <button @click="deleteReflection(r.id)" class="cog-tiny-btn" title="删除">✕</button>
          </div>
          <p class="cog-reflection-body">{{ r.body }}</p>
          <span class="cog-reflection-date">{{ fmt(r.at) }}</span>
        </div>
      </div>
      <div v-else class="cog-empty-hint">还没有反思记录，从上面的释光仪开始吧</div>
    </section>

    <!-- 字镜墙 / 素镜墙 双模 -->
    <section data-enter class="cog-dual-mirror">
      <h3>🪞 字镜墙 / 素镜墙</h3>
      <p class="cog-hint">在字镜墙中回看你收集的词语，在素镜墙中回看无评判的行为记录。</p>

      <!-- 模式切换 -->
      <div class="cog-mirror-toggle">
        <button
          @click="mirrorMode = 'word'"
          :class="['cog-mirror-tab', { active: mirrorMode === 'word' }]"
        >
          <span class="cog-mirror-tab-icon">字</span>
          <span class="cog-mirror-tab-label">字镜墙</span>
        </button>
        <button
          @click="mirrorMode = 'plain'"
          :class="['cog-mirror-tab', { active: mirrorMode === 'plain' }]"
        >
          <span class="cog-mirror-tab-icon">素</span>
          <span class="cog-mirror-tab-label">素镜墙</span>
        </button>
      </div>

      <!-- ===== 字镜墙 ===== -->
      <div v-if="mirrorMode === 'word'" class="cog-word-mirror">
        <!-- 词频概览 -->
        <div v-if="wordMirrorWords.length" class="cog-word-freq">
          <div class="cog-word-freq-title">词频概览</div>
          <div class="cog-word-freq-bars">
            <div
              v-for="w in wordMirrorWords.slice(0, 8)"
              :key="'freq-' + w.id"
              class="cog-word-freq-item"
            >
              <span class="cog-word-freq-word">{{ w.word }}</span>
              <div class="cog-word-freq-bar-track">
                <div
                  class="cog-word-freq-bar-fill"
                  :style="{ width: freqPercent(w.count) + '%' }"
                />
              </div>
              <span class="cog-word-freq-count">{{ w.count }}</span>
            </div>
          </div>
        </div>

        <!-- 词语卡片网格 -->
        <div v-if="wordMirrorWords.length" class="cog-word-grid">
          <div
            v-for="w in wordMirrorWords"
            :key="w.id"
            class="cog-word-card"
            :class="{ 'cog-word-card-connected': w.connections && w.connections.length }"
          >
            <div class="cog-word-card-header">
              <span class="cog-word-word">{{ w.word }}</span>
              <span class="cog-word-count-badge">{{ w.count }}次</span>
            </div>
            <div v-if="w.meaning" class="cog-word-meaning">{{ w.meaning }}</div>
            <div v-if="w.context" class="cog-word-context">{{ w.context }}</div>
            <div v-if="w.connections && w.connections.length" class="cog-word-connections">
              <span class="cog-word-conn-label">关联：</span>
              <span
                v-for="(conn, ci) in w.connections"
                :key="ci"
                class="cog-word-conn-tag"
              >{{ conn }}</span>
            </div>
            <span class="cog-word-date">{{ fmt(w.at) }}</span>
          </div>
        </div>
        <div v-else class="cog-empty-hint">
          还没有收集的词语。在反思中标记那些反复出现的词，它们会在这里聚成光墙。
        </div>
      </div>

      <!-- ===== 素镜墙 ===== -->
      <div v-if="mirrorMode === 'plain'" class="cog-plain-mirror">
        <div v-if="wordHistory.length" class="cog-plain-list">
          <div v-for="h in wordHistory" :key="h.id" class="cog-plain-card">
            <div class="cog-plain-time-row">
              <span class="cog-plain-dot" />
              <span class="cog-plain-time">{{ fmt(h.at) }}</span>
            </div>
            <p class="cog-plain-behavior">{{ h.behavior }}</p>
          </div>
        </div>
        <div v-else class="cog-empty-hint">
          还没有行为记录。在素镜回看中留下痕迹，这里会忠实地呈现它们。
        </div>
      </div>
    </section>

    <!-- 冥想分析（来自 cognition 模块） -->
    <section data-enter class="cog-meditation-section" v-if="meditationSummary.totalSessions > 0">
      <h3>🧘 冥想分析</h3>
      <div class="cog-meditation-grid">
        <div class="cog-med-stat">
          <span class="cog-med-num">{{ meditationSummary.totalSessions }}</span>
          <span class="cog-med-label">总次数</span>
        </div>
        <div class="cog-med-stat">
          <span class="cog-med-num">{{ meditationSummary.totalDuration }}<small>min</small></span>
          <span class="cog-med-label">总时长</span>
        </div>
        <div class="cog-med-stat">
          <span class="cog-med-num">{{ meditationSummary.currentStreak }}<small>天</small></span>
          <span class="cog-med-label">连续冥想</span>
        </div>
        <div class="cog-med-stat">
          <span class="cog-med-num">{{ meditationSummary.longestStreak }}<small>天</small></span>
          <span class="cog-med-label">最长连续</span>
        </div>
      </div>
      <div v-if="meditationSummary.avgMoodImprovement > 0" class="cog-med-mood">
        <span class="cog-med-mood-label">平均情绪改善</span>
        <span class="cog-med-mood-value" :class="meditationSummary.avgMoodImprovement > 0 ? 'positive' : 'negative'">
          {{ meditationSummary.avgMoodImprovement > 0 ? '+' : '' }}{{ meditationSummary.avgMoodImprovement.toFixed(1) }}
        </span>
      </div>
    </section>

    <!-- 留光阁 · 冥想与释怀记录（归档） -->
    <section data-enter class="cog-light-records">
      <h3>🏮 留光阁记录</h3>
      <LightRecordsPanel />
    </section>

    <!-- 澄明统计（light·useClarityDashboard：冥想/释怀/趋势/最佳时段） -->
    <ClarionStatsPanel />

    <!-- 感知采集合规（INCR-254 补挂载孤儿组件：宪法第52条沉默默认 · 可配置采集项授权开关） -->
    <PerceptionCompliancePanel />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useMeditationAnalytics, evaluateFourLights, LIGHT_META, LIGHT_ORDER, type FourLightsInput, useCognitionReflections } from '../modules/cognition'
import LightRecordsPanel from '../components/LightRecordsPanel.vue'
import ClarionStatsPanel from '../components/ClarionStatsPanel.vue'
import PerceptionCompliancePanel from '../components/PerceptionCompliancePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()

// ---- 冥想分析模块集成 ----
const meditation = useMeditationAnalytics()

const meditationSummary = computed(() => {
  const s = meditation.stats.value
  const st = meditation.streak.value
  return {
    totalSessions: s.totalSessions,
    totalDuration: s.totalDuration,
    currentStreak: st.currentStreak,
    longestStreak: st.longestStreak,
    avgMoodImprovement: s.averageMoodImprovement,
  }
})

const reflectionsStore = useCognitionReflections()
const reflections = reflectionsStore.items
const reflectionTitle = ref('')
const reflectionBody = ref('')

const lights = LIGHT_ORDER.map((k) => ({ key: k, ...LIGHT_META[k] }))
const activeLight = ref('')
const subject = ref('')
const currentLight = computed(() => lights.find((l) => l.key === activeLight.value))

// ---- 四束光本地规则引擎（确定性、无随机） ----
const fourLightsInput = computed<FourLightsInput>(() => {
  const sessions = recentSessions.value
  const tagVariety = new Set(sessions.flatMap((s) => s.tags || [])).size
  const modeVariety = new Set(sessions.map((s) => s.mode)).size
  const avgDurMin = sessions.length
    ? sessions.reduce((a, s) => a + (s.elapsed || 0), 0) / sessions.length / 60000
    : 0
  const now = Date.now()
  const recentRefl = reflections.value.filter(
    (r) => now - new Date(r.at).getTime() < 30 * 86400000,
  ).length
  return {
    reflectionCount: reflections.value.length,
    reflectionRecentCount: recentRefl,
    meditationSessions: meditationSummary.value.totalSessions,
    meditationStreak: meditationSummary.value.currentStreak,
    focusSessions: sessions.length,
    focusTagVariety: tagVariety,
    focusModeVariety: modeVariety,
    avgFocusDurationMin: avgDurMin,
    wordMirrorCount: wordMirrorWords.value.length,
    wordHistoryCount: wordHistory.value.length,
  }
})
const lightStates = computed(() => evaluateFourLights(fourLightsInput.value))
const currentLightState = computed(() => lightStates.value.find((s) => s.key === activeLight.value))

// ---- F4 四束光思考链：逐步展开本地推导 ----
const openChains = ref<Set<string>>(new Set())
const expandAllChains = ref(false)
function toggleChain(key: string) {
  const s = new Set(openChains.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  openChains.value = s
}
watch(expandAllChains, (all) => {
  openChains.value = all ? new Set(LIGHT_ORDER) : new Set()
})

const lightResponse = computed(() => {
  const st = currentLightState.value
  if (!st) return ''
  const head = subject.value.trim() ? `就「${subject.value.trim()}」而言，` : ''
  const tail = st.insights[0] || ''
  return `${st.label}（${st.level} · ${st.score}）：${head}${tail}`
})

const behavior = ref('')
const translation = ref('')
const translations = [
  '这段记录里，还可以继续写下当时的动作、停顿或一句话。',
  '这里留下了一次切换或停顿的痕迹。',
  '可以把当下最明显的感受、念头或动作继续补在这里。',
  '这段停留可以继续补下身体反应、念头变化或注意力切换。',
  '这个片段里，真正重要的可能不是"做了什么"，而是"停下来之前"你在想什么。',
  '你注意到自己停了一下——这个停顿里可能藏着什么信息。',
]
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
function translateB() {
  // 确定性：同一段行为文字始终给出同一句回看，避免随机抖动
  translation.value = translations[hashStr(behavior.value) % translations.length]
}

const recentSessions = computed(() => storage.getSessions().filter(s => s.status === 'completed'))
const recentCount = computed(() => Math.min(recentSessions.value.length, 20))
const breadth = computed(() =>
  clampInt(20 + fourLightsInput.value.focusTagVariety * 10 + wordMirrorWords.value.length * 3),
)
const depth = computed(() =>
  clampInt(15 + fourLightsInput.value.avgFocusDurationMin * 2 + fourLightsInput.value.reflectionRecentCount * 4),
)
const flexibility = computed(() =>
  clampInt(20 + fourLightsInput.value.focusModeVariety * 18 + fourLightsInput.value.meditationSessions * 1.5),
)

function saveReflection() {
  if (!reflectionBody.value.trim()) return
  reflections.value.unshift({
    id: `ref${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
    title: reflectionTitle.value.trim(),
    body: reflectionBody.value.trim(),
    at: new Date().toISOString(),
  })
  reflections.value = reflections.value.slice(0, 30)
  reflectionsStore.save()
  reflectionTitle.value = ''
  reflectionBody.value = ''
}

function deleteReflection(id: string) {
  reflections.value = reflections.value.filter(r => r.id !== id)
  reflectionsStore.save()
}

// ===== 字镜墙 / 素镜墙 双模 =====
const mirrorMode = ref<'word' | 'plain'>('word')

interface WordMirrorEntry {
  id: string
  word: string
  meaning: string
  context: string
  count: number
  connections: string[]
  at: string
}
const wordMirrorWords = ref<WordMirrorEntry[]>([])

interface WordHistoryEntry {
  id: string
  behavior: string
  at: string
}
const wordHistory = ref<WordHistoryEntry[]>([])

const maxWordCount = computed(() => {
  if (!wordMirrorWords.value.length) return 1
  return Math.max(...wordMirrorWords.value.map(w => w.count), 1)
})

function freqPercent(count: number): number {
  return Math.round((count / maxWordCount.value) * 100)
}

function loadWordMirror() {
  try {
    wordMirrorWords.value = storage.getKV<WordMirrorEntry[]>('hf:word_mirror', [])
  } catch {
    wordMirrorWords.value = []
  }
}

function loadWordHistory() {
  try {
    wordHistory.value = storage.getKV<WordHistoryEntry[]>('hf:word_history', [])
    // 按时间倒序排列
    wordHistory.value.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  } catch {
    wordHistory.value = []
  }
}

function clampInt(n: number): number {
  if (!isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function fmt(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => { reflectionsStore.load(); loadWordMirror(); loadWordHistory() })
</script>

<style scoped>
.cog {
  --cog-text: #f0e6d8;
  --cog-text-secondary: #c4b8a8;
  --cog-text-muted: #8a7e72;
  --cog-accent: var(--accent);
  --cog-bg-card: var(--card-bg);
  --cog-border-card: rgba(var(--accent-rgb), 0.08);
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  color: var(--cog-text);
  font-family: inherit;
}
/* 氛围背景层 */
.cog-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.cog-glow {
  position: absolute;
  pointer-events: none;
}
.cog-glow--top {
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 250px;
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
}
.cog-glow--mid {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 350px;
  height: 350px;
  background: radial-gradient(circle at center, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
}
.cog-glow--bot {
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 450px;
  height: 200px;
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
}

/* SVG 装饰层 */
.cog-svg-decor {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}
.cog-svg-decor svg {
  width: 100%;
  max-width: 600px;
  height: 100%;
  max-height: 100vh;
  opacity: 0.7;
}

/* 光点浮动 */
.cog-particle {
  animation: cog-particle-float 6s ease-in-out infinite;
}
.cog-particle--1 { animation-delay: 0s; }
.cog-particle--2 { animation-delay: -0.5s; }
.cog-particle--3 { animation-delay: -1s; }
.cog-particle--4 { animation-delay: -1.5s; }
.cog-particle--5 { animation-delay: -2s; }
.cog-particle--6 { animation-delay: -2.5s; }
.cog-particle--7 { animation-delay: -3s; }
.cog-particle--8 { animation-delay: -3.5s; }
.cog-particle--9 { animation-delay: -4s; }
.cog-particle--10 { animation-delay: -4.5s; }
.cog-particle--11 { animation-delay: -1.2s; }
.cog-particle--12 { animation-delay: -2.8s; }
@keyframes cog-particle-float {
  0%, 100% { transform: translateY(0); opacity: 0.05; }
  50% { transform: translateY(-12px); opacity: 0.1; }
}

/* 素镜反射线呼吸 */
.cog-mirror-lines {
  animation: mirror-breathe 5s ease-in-out infinite;
}
@keyframes mirror-breathe {
  0%, 100% { opacity: 0.02; }
  50% { opacity: 0.05; }
}

.cog > * {
  position: relative;
  z-index: 1;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}
.orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--cog-accent), transparent);
}
.orn-diamond {
  font-size: 10px;
  color: var(--cog-accent);
  opacity: 0.7;
}
.header-kicker {
  text-align: center;
  font-size: 11px;
  letter-spacing: 4px;
  color: var(--cog-text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
}
.cog-title {
  text-align: center;
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 6px;
  color: var(--cog-accent);
  margin: 0 0 28px;
}
.cog-overview {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
}
.cog-overview-card {
  flex: 1;
  text-align: center;
  padding: 14px 8px;
  border-radius: 10px;
  background: var(--cog-bg-card);
  border: 1px solid var(--cog-border-card);
}
.cog-overview-num {
  display: block;
  font-size: 24px;
  font-weight: 500;
  color: var(--cog-accent);
  line-height: 1.2;
}
.cog-overview-label {
  display: block;
  font-size: 11px;
  color: var(--cog-text-muted);
  margin-top: 4px;
}
section {
  margin-bottom: 28px;
}
section h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--cog-text-secondary);
  margin-bottom: 8px;
  opacity: 0.85;
}
.cog-hint {
  font-size: 12px;
  color: var(--cog-text-muted);
  margin-bottom: 8px;
}
.cog-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--cog-border-card);
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.25);
  color: var(--cog-text);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  resize: vertical;
  line-height: 1.6;
  box-sizing: border-box;
}
.cog-input:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.cog-light-btns {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.cog-light-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--cog-text-muted);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.cog-light-btn:hover {
  color: var(--cog-accent);
  border-color: rgba(var(--accent-rgb), 0.25);
}
.cog-light-btn.active {
  border-color: var(--cog-accent);
  background: rgba(var(--accent-rgb), 0.13);
  color: var(--cog-accent);
}
.cog-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--cog-accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}
.cog-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
}
.cog-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.cog-light-result {
  padding: 14px;
  border-radius: 10px;
  border: 1px solid;
  background: rgba(var(--bg-card-rgb), 0.3);
  margin-top: 10px;
}
.cog-light-result p {
  font-size: 13px;
  line-height: 1.7;
  margin: 0;
  color: var(--cog-text-secondary);
}
.cog-chart-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 6px;
}
.cog-mini-chart {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.cog-mini-chart span {
  width: 40px;
  color: var(--cog-text-muted);
}
.cog-mini-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--bg-card-rgb), 0.5);
  overflow: hidden;
}
.cog-mini-bar div {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s;
}
.cog-chart-hint {
  font-size: 11px;
  color: var(--cog-text-muted);
  margin-top: 4px;
}
.cog-reflection-input {
  margin-bottom: 16px;
}
.cog-reflection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cog-reflection-card {
  padding: 12px;
  border-radius: 10px;
  background: var(--cog-bg-card);
  border: 1px solid var(--cog-border-card);
  border-left: 2px solid rgba(var(--accent-rgb), 0.25);
}
.cog-reflection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.cog-reflection-header strong {
  font-size: 13px;
  color: var(--cog-text);
}
.cog-tiny-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--cog-text-muted);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.cog-tiny-btn:hover {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--cog-accent);
}
.cog-reflection-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--cog-text-secondary);
  margin: 0;
}
.cog-reflection-date {
  font-size: 11px;
  color: var(--cog-text-muted);
  margin-top: 4px;
  display: block;
}
.cog-empty-hint {
  font-size: 12px;
  color: var(--cog-text-muted);
  text-align: center;
  padding: 24px 0;
}

/* === 字镜墙 / 素镜墙 双模 === */
.cog-dual-mirror {
  margin-top: 4px;
}

/* 模式切换 */
.cog-mirror-toggle {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--bg-card-rgb), 0.25);
}
.cog-mirror-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: var(--cog-text-muted);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
}
.cog-mirror-tab:first-child {
  border-right: 1px solid rgba(var(--accent-rgb), 0.08);
}
.cog-mirror-tab.active {
  background: rgba(var(--accent-rgb), 0.13);
  color: var(--cog-accent);
}
.cog-mirror-tab:hover:not(.active) {
  color: var(--cog-text-secondary);
}
.cog-mirror-tab-icon {
  font-size: 14px;
  font-weight: 500;
}
.cog-mirror-tab-label {
  font-size: 12px;
  letter-spacing: 1px;
}

/* ===== 字镜墙 ===== */

/* 词频概览 */
.cog-word-freq {
  padding: 14px;
  border-radius: 10px;
  background: var(--cog-bg-card);
  border: 1px solid var(--cog-border-card);
  margin-bottom: 14px;
}
.cog-word-freq-title {
  font-size: 12px;
  color: var(--cog-text-muted);
  margin-bottom: 10px;
  letter-spacing: 1px;
}
.cog-word-freq-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cog-word-freq-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cog-word-freq-word {
  width: 56px;
  font-size: 12px;
  color: var(--cog-text-secondary);
  text-align: right;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cog-word-freq-bar-track {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--bg-card-rgb), 0.5);
  overflow: hidden;
}
.cog-word-freq-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--cog-accent));
  transition: width 0.6s ease;
  min-width: 4px;
}
.cog-word-freq-count {
  width: 24px;
  font-size: 11px;
  color: var(--cog-text-muted);
  text-align: left;
  flex-shrink: 0;
}

/* 词语卡片网格 */
.cog-word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.cog-word-card {
  padding: 12px;
  border-radius: 10px;
  background: var(--cog-bg-card);
  border: 1px solid var(--cog-border-card);
  transition: border-color 0.25s, box-shadow 0.25s;
  position: relative;
}
.cog-word-card-connected {
  border-left: 2px solid rgba(var(--accent-rgb), 0.3);
}
.cog-word-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.04);
}
.cog-word-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.cog-word-word {
  font-size: 16px;
  font-weight: 500;
  color: var(--cog-accent);
  letter-spacing: 1px;
}
.cog-word-count-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--cog-accent);
}
.cog-word-meaning {
  font-size: 12px;
  color: var(--cog-text-secondary);
  line-height: 1.5;
  margin-bottom: 4px;
}
.cog-word-context {
  font-size: 11px;
  color: var(--cog-text-muted);
  line-height: 1.5;
  margin-bottom: 6px;
  font-style: italic;
}
.cog-word-connections {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}
.cog-word-conn-label {
  font-size: 10px;
  color: var(--cog-text-muted);
}
.cog-word-conn-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(124, 92, 252, 0.1);
  color: rgba(124, 92, 252, 0.8);
  border: 1px solid rgba(124, 92, 252, 0.15);
}
.cog-word-date {
  font-size: 10px;
  color: var(--cog-text-muted);
  opacity: 0.6;
}

/* ===== 素镜墙 ===== */
.cog-plain-mirror {
  position: relative;
}
.cog-plain-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.cog-plain-card {
  padding: 14px 12px;
  border-radius: 8px;
  background: var(--cog-bg-card);
  border: 1px solid var(--cog-border-card);
  transition: border-color 0.2s;
}
.cog-plain-card:hover {
  border-color: rgba(var(--accent-rgb), 0.12);
}
.cog-plain-time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.cog-plain-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.4);
  flex-shrink: 0;
}
.cog-plain-time {
  font-size: 11px;
  color: var(--cog-text-muted);
  opacity: 0.7;
}
.cog-plain-behavior {
  font-size: 13px;
  line-height: 1.7;
  color: var(--cog-text-secondary);
  margin: 0;
  padding-left: 14px;
}

/* === 响应式：双模镜像 === */
@media (max-width: 640px) {
  .cog-word-grid {
    grid-template-columns: 1fr;
  }
  .cog-mirror-tab {
    padding: 8px 0;
  }
}

/* === F4 四束光思考链 === */
.cog-reasoning-chain { margin-bottom: 28px; }
.crc-controls { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.crc-toggle {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.55);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.crc-toggle:hover { color: var(--cog-accent); border-color: rgba(var(--accent-rgb), 0.4); }
.crc-list { display: flex; flex-direction: column; gap: 8px; }
.crc-item {
  border-radius: 10px;
  background: var(--cog-bg-card);
  border: 1px solid var(--cog-border-card);
  overflow: hidden;
}
.crc-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.crc-icon { font-size: 15px; }
.crc-label { flex: 1; font-size: 13px; color: var(--cog-text); font-weight: 500; }
.crc-level { font-size: 11px; opacity: 0.85; }
.crc-caret { font-size: 11px; opacity: 0.4; color: var(--cog-text-muted); }
.crc-steps { list-style: none; margin: 0; padding: 4px 14px 14px; display: flex; flex-direction: column; gap: 8px; }
.crc-step { display: flex; gap: 10px; font-size: 12px; line-height: 1.6; color: var(--cog-text-secondary); }
.crc-step-idx {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--cog-accent);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.crc-fade-enter-active, .crc-fade-leave-active { transition: opacity 0.25s ease; }
.crc-fade-enter-from, .crc-fade-leave-to { opacity: 0; }

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .cog { padding: 32px 20px 64px; }
  .cog-overview { gap: 8px; }
  .cog-overview-card { padding: 12px 8px; }
  .cog-chart-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .cog { padding: 24px 14px 56px; }
  .cog-overview { flex-direction: column; }
  section h3 { font-size: 12px; }
}

@media (max-width: 480px) {
  .cog { padding: 12px; }
  .cog-overview { flex-direction: column; gap: 6px; }
  .cog-title { font-size: 22px; }
}
/* ===== 冥想分析（模块集成） ===== */
.cog-meditation-section { margin-bottom: 24px; position: relative; z-index: 1; }
.cog-meditation-section h3 { font-size: 14px; font-weight: 400; color: rgba(var(--accent-rgb), 0.6); letter-spacing: 1px; margin-bottom: 10px; }
.cog-meditation-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.cog-med-stat { padding: 12px 8px; border-radius: 10px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); text-align: center; }
.cog-med-num { font-size: 18px; font-weight: 500; color: var(--accent); display: block; }
.cog-med-num small { font-size: 11px; font-weight: 400; opacity: 0.6; margin-left: 2px; }
.cog-med-label { font-size: 10px; color: rgba(var(--accent-rgb), 0.5); margin-top: 2px; display: block; }
.cog-med-mood { margin-top: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.04); display: flex; justify-content: space-between; align-items: center; }
.cog-med-mood-label { font-size: 12px; color: rgba(var(--accent-rgb), 0.5); }
.cog-med-mood-value { font-size: 14px; font-weight: 500; }
.cog-med-mood-value.positive { color: #34d399; }
.cog-med-mood-value.negative { color: #ef4444; }

@media (max-width: 640px) {
  .cog-meditation-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>