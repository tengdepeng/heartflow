<template>
  <section data-enter class="health-analysis">
    <header class="ha-head">
      <span class="ha-icon">🩺</span>
      <div>
        <h3 class="ha-title">健康分析 · 藏象体检单</h3>
        <p class="ha-desc">把经络记录、体质趋势与情绪印记，汇成一纸可读的身心体检单</p>
      </div>
    </header>

    <!-- 数据来源状态 + 操作 -->
    <div class="ha-actions">
      <div class="ha-source" :class="{ 'ha-source-ok': hasSources }">
        <span class="ha-source-dot"></span>
        {{ sourceSummary }}
      </div>
      <button class="ha-btn" :disabled="!hasSources" @click="runAnalysis">
        {{ report ? '重新生成报告' : '生成健康报告' }}
      </button>
    </div>

    <!-- 空状态 -->
    <p v-if="!report && !hasSources" class="ha-empty">
      还没有可用于分析的数据。先去体质画像完成问卷、记录一条经络感受或情绪，回来生成第一份藏象体检单。
    </p>

    <!-- 报告内容 -->
    <template v-if="report">
      <!-- 综合评级 -->
      <div class="ha-verdict" :style="{ borderColor: scoreColor(report.overallScore) }">
        <span class="ha-verdict-score" :style="{ color: scoreColor(report.overallScore) }">
          {{ report.overallScore }}
        </span>
        <div class="ha-verdict-meta">
          <b class="ha-verdict-title">{{ verdict }}</b>
          <span class="ha-verdict-time">第 {{ reportCount }} 份分析 · {{ fmtTime(report.generatedAt) }}</span>
        </div>
      </div>

      <!-- 五维评分卡 -->
      <div class="ha-score-grid">
        <div class="ha-score-card">
          <span class="ha-score-label">🌿 经络</span>
          <b class="ha-score-num" :style="{ color: scoreColor(report.meridianScore) }">{{ report.meridianScore }}</b>
          <div class="ha-bar"><div class="ha-bar-fill" :style="barStyle(report.meridianScore, scoreColor(report.meridianScore))"></div></div>
        </div>
        <div class="ha-score-card">
          <span class="ha-score-label">⚖️ 体质</span>
          <b class="ha-score-num" :style="{ color: scoreColor(report.constitutionScore) }">{{ report.constitutionScore }}</b>
          <div class="ha-bar"><div class="ha-bar-fill" :style="barStyle(report.constitutionScore, scoreColor(report.constitutionScore))"></div></div>
        </div>
        <div class="ha-score-card">
          <span class="ha-score-label">💭 情绪</span>
          <b class="ha-score-num" :style="{ color: scoreColor(report.moodScore) }">{{ report.moodScore }}</b>
          <div class="ha-bar"><div class="ha-bar-fill" :style="barStyle(report.moodScore, scoreColor(report.moodScore))"></div></div>
        </div>
        <div class="ha-score-card">
          <span class="ha-score-label">🕐 作息</span>
          <b class="ha-score-num" :style="{ color: scoreColor(report.rhythmScore) }">{{ report.rhythmScore }}</b>
          <div class="ha-bar"><div class="ha-bar-fill" :style="barStyle(report.rhythmScore, scoreColor(report.rhythmScore))"></div></div>
        </div>
      </div>

      <div class="ha-grid">
        <!-- 经络健康 -->
        <div class="ha-card">
          <h4 class="ha-card-title">经络健康 · 薄弱在先</h4>
          <p v-if="report.meridianDetails.length === 0" class="ha-muted">暂无经络记录</p>
          <div v-for="m in report.meridianDetails.slice(0, 4)" :key="m.meridian" class="ha-merid">
            <div class="ha-merid-head">
              <span class="ha-merid-name">{{ m.organ }}经</span>
              <span class="ha-merid-trend" :class="trendClass(m.trend)">{{ trendArrow(m.trend) }} {{ trendLabel(m.trend) }}</span>
              <span class="ha-merid-rate" :style="{ color: scoreColor(m.goodRate * 100) }">{{ Math.round(m.goodRate * 100) }}%</span>
            </div>
            <div class="ha-bar ha-bar-sm"><div class="ha-bar-fill" :style="barStyle(m.goodRate * 100, scoreColor(m.goodRate * 100))"></div></div>
            <p class="ha-merid-advice">{{ m.hourAdvice }}</p>
          </div>
          <p v-if="report.meridianDetails.length > 4" class="ha-more">还有 {{ report.meridianDetails.length - 4 }} 条经络记录待展开 · 共 {{ report.meridianDetails.length }} 经</p>
        </div>

        <!-- 情绪-脏腑关联 -->
        <div class="ha-card">
          <h4 class="ha-card-title">情绪 · 脏腑关联</h4>
          <p v-if="report.moodOrganLinks.length === 0" class="ha-muted">暂无情绪记录</p>
          <div v-for="l in report.moodOrganLinks.slice(0, 4)" :key="l.mood + ':' + l.organ" class="ha-mood">
            <div class="ha-mood-head">
              <span class="ha-mood-label">{{ moodLabel(l.mood) }}</span>
              <span class="ha-mood-organ">→ {{ organLabel(l.organ) }} · 五行为{{ elementLabel(l.element) }}</span>
              <span class="ha-mood-count">{{ l.count }} 次</span>
            </div>
            <div class="ha-bar ha-bar-sm"><div class="ha-bar-fill" :style="barStyle(l.strength * 100, linkColor(l.strength))"></div></div>
          </div>
          <p v-if="report.moodOrganLinks.length > 4" class="ha-more">共 {{ report.moodOrganLinks.length }} 组关联</p>
        </div>

        <!-- 体质趋势 -->
        <div class="ha-card">
          <h4 class="ha-card-title">体质趋势</h4>
          <p v-if="report.constitutionTrend.length === 0" class="ha-muted">暂无体质测评记录</p>
          <template v-else>
            <svg :viewBox="`0 0 300 90`" class="ha-trend" preserveAspectRatio="none">
              <path :d="trendPath" fill="none" stroke="#8a9a7a" stroke-width="2" />
              <path :d="trendArea" fill="rgba(138,154,122,0.12)" />
              <circle v-for="(p, i) in report.constitutionTrend" :key="p.date"
                :cx="trendX(i)" :cy="trendY(p.score)" r="2.4" fill="#8a9a7a" />
            </svg>
            <p class="ha-trend-foot">
              最近体质：<b>{{ constitutionLabel(report.constitutionTrend[report.constitutionTrend.length - 1]) }}</b>
              <span class="ha-mut">共 {{ report.constitutionTrend.length }} 次测评</span>
            </p>
          </template>
        </div>

        <!-- 调理建议 -->
        <div class="ha-card">
          <h4 class="ha-card-title">调理建议</h4>
          <p v-if="report.recommendations.length === 0" class="ha-muted">各维度平稳，暂无特别建议</p>
          <div v-for="r in report.recommendations" :key="r.id" class="ha-rec">
            <span class="ha-rec-pri" :class="'ha-rec-' + r.priority">{{ priorityLabel(r.priority) }}</span>
            <div class="ha-rec-body">
              <b class="ha-rec-title">{{ r.title }} <span class="ha-rec-cat">{{ categoryLabel(r.category) }}</span></b>
              <p class="ha-rec-desc">{{ r.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  useHealthAnalysis,
  getConstitutionTrendStore,
  CONSTITUTION_META,
} from '../modules/body-wisdom'
import type { MeridianRecord, MoodRecord, ConstitutionType } from '../modules/body-wisdom'

// 经络/情绪数据由宿主视图供给（INCR-188 薄委托化：直读 storage key 无人写入）
const props = defineProps<{ meridians: MeridianRecord[]; moods: MoodRecord[] }>()

const health = useHealthAnalysis()
const trendStore = getConstitutionTrendStore()

const meridianRecords = computed(() => props.meridians)
const moodRecords = computed(() => props.moods)
const constitutionTrends = computed(() =>
  trendStore.trendHistory.value.map(p => ({
    date: p.date,
    type: p.type,
    score: Math.round(p.primaryScore * 100),
  })),
)

const report = computed(() => health.latestReport.value)
const reportCount = computed(() => health.reports.value.length)

const hasSources = computed(() =>
  meridianRecords.value.length + moodRecords.value.length + constitutionTrends.value.length > 0,
)

const sourceSummary = computed(() => {
  const m = meridianRecords.value.length
  const mo = moodRecords.value.length
  const c = constitutionTrends.value.length
  if (m + mo + c === 0) return '等待经络 / 情绪 / 体质数据'
  return `已采集：经络 ${m} · 情绪 ${mo} · 体质 ${c}`
})

function runAnalysis() {
  health.generateReport(meridianRecords.value, moodRecords.value, constitutionTrends.value)
}

const verdict = computed(() => {
  const v = report.value?.overallScore ?? 0
  if (v >= 80) return '藏象调和，身心状态良好'
  if (v >= 60) return '整体平稳，个别维度可再关照'
  if (v >= 40) return '有所波动，建议关注薄弱环节'
  return '需要更多休整与呵护'
})

function scoreColor(v: number): string {
  if (v >= 80) return '#8a9a7a'
  if (v >= 60) return '#f0c040'
  return '#c46a5a'
}
function barStyle(v: number, color: string): Record<string, string> {
  return { width: `${Math.max(3, Math.round(v))}%`, background: color }
}
function linkColor(strength: number): string {
  return strength > 0.5 ? '#8a9a7a' : strength > 0.25 ? '#f0c040' : '#c46a5a'
}
function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ---- 经络趋势 ----
function trendArrow(t: 'improving' | 'stable' | 'declining'): string {
  return t === 'improving' ? '↗' : t === 'declining' ? '↘' : '→'
}
function trendLabel(t: 'improving' | 'stable' | 'declining'): string {
  return t === 'improving' ? '向好' : t === 'declining' ? '走弱' : '平稳'
}
function trendClass(t: 'improving' | 'stable' | 'declining'): string {
  return t === 'improving' ? 'trend-up' : t === 'declining' ? 'trend-down' : 'trend-mid'
}

// ---- 情绪 / 脏腑 ----
const MOOD_LABEL: Record<string, string> = {
  calm: '平静', anxious: '焦虑', sad: '悲伤', happy: '喜悦', angry: '愤怒', fearful: '恐惧',
}
const ORGAN_LABEL: Record<string, string> = {
  heart: '心', liver: '肝', spleen: '脾', lung: '肺', kidney: '肾',
}
const ELEMENT_LABEL: Record<string, string> = {
  fire: '火', wood: '木', earth: '土', metal: '金', water: '水',
}
function moodLabel(m: string): string { return MOOD_LABEL[m] ?? m }
function organLabel(o: string): string { return ORGAN_LABEL[o] ?? o }
function elementLabel(e: string): string { return ELEMENT_LABEL[e] ?? e }

// ---- 体质趋势 ----
function constitutionLabel(p: { type: ConstitutionType } | undefined): string {
  if (!p) return '—'
  return CONSTITUTION_META[p.type]?.label ?? p.type
}
function trendPath(): string {
  const pts = report.value?.constitutionTrend ?? []
  if (pts.length === 0) return ''
  return pts.map((_, i) => `${i === 0 ? 'M' : 'L'}${trendX(i)},${trendY(pts[i].score)}`).join(' ')
}
function trendArea(): string {
  const pts = report.value?.constitutionTrend ?? []
  if (pts.length === 0) return ''
  const last = pts.length - 1
  return `${trendPath()} L${trendX(last)},86 L${trendX(0)},86 Z`
}
function trendX(i: number): number {
  const n = report.value?.constitutionTrend.length ?? 1
  return 8 + (i / Math.max(n - 1, 1)) * 284
}
function trendY(score: number): number {
  return 84 - Math.min(Math.max(score, 0), 100) * 0.7
}

// ---- 建议 ----
const CATEGORY_LABEL: Record<string, string> = {
  diet: '饮食', exercise: '运动', rest: '作息', mindfulness: '静心', lifestyle: '生活',
}
const PRIORITY_LABEL: Record<string, string> = { high: '高优先', medium: '中优先', low: '低优先' }
function categoryLabel(c: string): string { return CATEGORY_LABEL[c] ?? c }
function priorityLabel(p: string): string { return PRIORITY_LABEL[p] ?? p }
</script>

<style scoped>
.health-analysis {
  margin-top: 26px;
  padding: 20px 20px 24px;
  border-radius: 18px;
  background: radial-gradient(circle at 15% 0%, rgba(138, 154, 122, 0.1), rgba(0, 0, 0, 0.18));
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.ha-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.ha-icon { font-size: 24px; line-height: 1; }
.ha-title { margin: 0; font-size: 18px; letter-spacing: 2px; color: var(--text-high, #fff); }
.ha-desc { margin: 4px 0 0; font-size: 12px; opacity: 0.6; line-height: 1.6; }

.ha-actions {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 16px; flex-wrap: wrap;
}
.ha-source { display: flex; align-items: center; gap: 7px; font-size: 12px; opacity: 0.7; }
.ha-source-dot { width: 8px; height: 8px; border-radius: 50%; background: #c46a5a; }
.ha-source-ok .ha-source-dot { background: #8a9a7a; }
.ha-btn {
  padding: 7px 16px; border-radius: 8px;
  border: 1px solid rgba(138, 154, 122, 0.4);
  background: rgba(138, 154, 122, 0.14); color: #c9d8c4;
  font-size: 12px; font-family: inherit; cursor: pointer;
  transition: background 0.25s, border-color 0.25s;
}
.ha-btn:hover:not(:disabled) { background: rgba(138, 154, 122, 0.24); }
.ha-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ha-empty { font-size: 13px; opacity: 0.55; line-height: 1.8; }

/* 综合评级 */
.ha-verdict {
  display: flex; align-items: center; gap: 16px;
  padding: 16px; border-radius: 14px; border: 1px solid;
  background: rgba(255, 255, 255, 0.03); margin-bottom: 14px;
}
.ha-verdict-score {
  font-size: 44px; font-weight: 600; line-height: 1; min-width: 84px; text-align: center;
}
.ha-verdict-meta { display: flex; flex-direction: column; gap: 4px; }
.ha-verdict-title { font-size: 15px; color: var(--text-high, #fff); letter-spacing: 1px; }
.ha-verdict-time { font-size: 11px; opacity: 0.55; }

/* 五维评分 */
.ha-score-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px;
}
.ha-score-card {
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
}
.ha-score-label { font-size: 11px; opacity: 0.7; }
.ha-score-num { font-size: 24px; font-weight: 600; }
.ha-bar { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.ha-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
.ha-bar-sm { height: 5px; }

.ha-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.ha-card {
  padding: 16px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
}
.ha-card-title { margin: 0 0 12px; font-size: 14px; letter-spacing: 1px; color: var(--text-high, #fff); }
.ha-muted { font-size: 12px; opacity: 0.5; }
.ha-more { margin: 10px 0 0; font-size: 11px; opacity: 0.5; }

/* 经络 */
.ha-merid { margin-bottom: 12px; }
.ha-merid-head { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.ha-merid-name { font-size: 13px; color: var(--text-high, #fff); min-width: 56px; }
.ha-merid-trend { font-size: 11px; }
.ha-merid-rate { margin-left: auto; font-size: 13px; font-weight: 600; }
.trend-up { color: #8a9a7a; }
.trend-down { color: #c46a5a; }
.trend-mid { color: #f0c040; }
.ha-merid-advice { margin: 5px 0 0; font-size: 11px; opacity: 0.55; line-height: 1.6; }

/* 情绪 */
.ha-mood { margin-bottom: 12px; }
.ha-mood-head { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.ha-mood-label { font-size: 13px; color: var(--text-high, #fff); min-width: 40px; }
.ha-mood-organ { font-size: 11px; opacity: 0.7; }
.ha-mood-count { margin-left: auto; font-size: 11px; opacity: 0.5; }

/* 体质趋势 */
.ha-trend { width: 100%; height: 90px; }
.ha-trend-foot { margin: 8px 0 0; font-size: 12px; opacity: 0.75; line-height: 1.7; }
.ha-trend-foot b { color: var(--text-high, #fff); }
.ha-mut { margin-left: 8px; font-size: 11px; opacity: 0.5; }

/* 建议 */
.ha-rec { display: flex; gap: 10px; margin-bottom: 12px; }
.ha-rec:last-child { margin-bottom: 0; }
.ha-rec-pri {
  flex-shrink: 0; height: fit-content; padding: 2px 8px; border-radius: 999px;
  font-size: 10px; margin-top: 2px;
}
.ha-rec-high { background: rgba(196, 106, 90, 0.16); color: #d98a78; }
.ha-rec-medium { background: rgba(240, 192, 64, 0.14); color: #e0bd6e; }
.ha-rec-low { background: rgba(138, 154, 122, 0.16); color: #8a9a7a; }
.ha-rec-body { flex: 1; }
.ha-rec-title { font-size: 13px; color: var(--text-high, #fff); }
.ha-rec-cat {
  margin-left: 6px; font-size: 10px; color: rgba(240, 192, 64, 0.7);
  border: 1px solid rgba(240, 192, 64, 0.25); border-radius: 4px; padding: 1px 5px;
  font-weight: 400;
}
.ha-rec-desc { margin: 4px 0 0; font-size: 11px; opacity: 0.6; line-height: 1.7; }

@media (max-width: 640px) {
  .health-analysis { padding: 16px 14px 20px; }
  .ha-score-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>