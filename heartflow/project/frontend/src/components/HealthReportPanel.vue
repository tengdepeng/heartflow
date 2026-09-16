<template>
  <section class="hrp">
    <header class="hrp-head">
      <h3 class="hrp-title">📋 健康报告档案</h3>
      <p class="hrp-sub">日报/周报/月报 · 把身体数据整理成一段可回看的记录</p>
    </header>

    <!-- 温和洞察 -->
    <div class="hrp-insights" v-if="insights.length">
      <p v-for="(ins, i) in insights" :key="i" class="hrp-insight">{{ ins }}</p>
    </div>

    <!-- 报告生成 -->
    <div class="hrp-gen">
      <div class="hrp-periods">
        <button
          v-for="p in PERIODS"
          :key="p.key"
          class="hrp-period"
          :class="{ active: period === p.key }"
          @click="period = p.key"
        >{{ p.label }}</button>
      </div>
      <button class="hrp-gen-btn" @click="generate">✨ 生成{{ currentPeriodLabel }}</button>
    </div>

    <!-- 空态 -->
    <div class="hrp-empty" v-if="reports.length === 0">
      <span>📄</span>
      <p>报告还没生成。生成一份日报/周报/月报，把身体数据整理成一段可回看的记录。</p>
    </div>

    <!-- 报告列表 -->
    <div class="hrp-list" v-else>
      <article
        v-for="r in reports"
        :key="r.id"
        class="hrp-card"
        :class="{ open: selectedId === r.id, unread: !r.read }"
        @click="toggleDetail(r.id)"
      >
        <div class="hrp-card-head">
          <div class="hrp-card-main">
            <span class="hrp-card-title">{{ r.title }}</span>
            <span class="hrp-card-period">{{ PERIOD_LABEL[r.period] }}</span>
            <span class="hrp-card-range">{{ formatRange(r.dateRange) }}</span>
          </div>
          <div class="hrp-card-meta">
            <span class="hrp-score" :class="'hrp-grade-' + r.summary.grade">{{ r.summary.overallScore }}</span>
            <span class="hrp-grade" :class="'hrp-grade-' + r.summary.grade">{{ GRADE_LABEL[r.summary.grade] }}</span>
            <span class="hrp-bookmark" v-if="r.bookmarked">⭐</span>
            <span class="hrp-unread-dot" v-if="!r.read"></span>
          </div>
        </div>

        <!-- 展开详情 -->
        <div class="hrp-detail" v-if="selectedId === r.id" @click.stop>
          <div class="hrp-summary">
            <div class="hrp-summary-row">
              <span>追踪 <b>{{ r.summary.trackingDays }}</b> 天</span>
              <span>数据完整度 <b>{{ Math.round(r.summary.dataCompleteness * 100) }}%</b></span>
              <span>评分变化 <b :class="r.summary.scoreChange >= 0 ? 'up' : 'down'">{{ r.summary.scoreChange >= 0 ? '+' : '' }}{{ r.summary.scoreChange }}</b></span>
            </div>
            <div class="hrp-findings" v-if="r.summary.highlights.length">
              <p class="hrp-finding hl" v-for="(h, i) in r.summary.highlights" :key="'h' + i">💚 {{ h }}</p>
            </div>
            <div class="hrp-findings" v-if="r.summary.concerns.length">
              <p class="hrp-finding cn" v-for="(c, i) in r.summary.concerns" :key="'c' + i">🧡 {{ c }}</p>
            </div>
          </div>

          <!-- 章节 -->
          <div class="hrp-sections" v-if="r.sections.length">
            <details v-for="s in r.sections" :key="s.id" class="hrp-section">
              <summary class="hrp-section-title">{{ s.title }}</summary>
              <pre class="hrp-section-content">{{ s.content }}</pre>
            </details>
          </div>

          <!-- 建议 -->
          <div class="hrp-recs" v-if="r.recommendations.length">
            <h4 class="hrp-recs-title">💡 健康建议</h4>
            <div v-for="rec in r.recommendations" :key="rec.id" class="hrp-rec">
              <div class="hrp-rec-head">
                <span class="hrp-rec-priority" :class="'p-' + rec.priority">{{ PRIORITY_LABEL[rec.priority] }}</span>
                <span class="hrp-rec-title">{{ rec.title }}</span>
              </div>
              <p class="hrp-rec-desc">{{ rec.description }}</p>
              <p class="hrp-rec-outcome">预期效果：{{ rec.expectedOutcome }}</p>
            </div>
          </div>

          <!-- 操作 -->
          <div class="hrp-actions">
            <button class="hrp-act" @click="toggleBookmark(r.id)">{{ r.bookmarked ? '取消收藏' : '收藏' }}</button>
            <button class="hrp-act" @click="markRead(r.id)" v-if="!r.read">标记已读</button>
            <button class="hrp-act" @click="exportJson(r.id)">导出 JSON</button>
            <button class="hrp-act" @click="exportMarkdown(r.id)">导出 Markdown</button>
            <button class="hrp-act danger" @click="removeReport(r.id)">删除</button>
          </div>
          <pre class="hrp-export" v-if="exportText">{{ exportText }}</pre>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHealthReport, healthReportInsights } from '../modules/body/health-report'
import type { ReportPeriod, HealthReport } from '../modules/body/health-report'
import type { BodyMetric, SleepRecord } from '../modules/body/types'
import type { BodyLog } from '../stores/health'

const props = defineProps<{ logs: BodyLog[] }>()

const {
  reports,
  generateReport,
  getHistoricalReports,
  exportReport,
  markAsRead,
  toggleBookmark,
  deleteReport,
} = useHealthReport()

const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: 'daily', label: '日报' },
  { key: 'weekly', label: '周报' },
  { key: 'monthly', label: '月报' },
]
const PERIOD_LABEL: Record<ReportPeriod, string> = { daily: '日报', weekly: '周报', monthly: '月报' }
const GRADE_LABEL: Record<HealthReport['summary']['grade'], string> = {
  excellent: '优秀', good: '良好', fair: '一般', poor: '需改善',
}
const PRIORITY_LABEL: Record<string, string> = { high: '🔴 高', medium: '🟡 中', low: '🔵 低' }

const period = ref<ReportPeriod>('weekly')
const selectedId = ref<string | null>(null)
const exportText = ref('')

const currentPeriodLabel = computed(() => PERIOD_LABEL[period.value])

const latestReport = computed(() => getHistoricalReports(undefined, 1)[0] ?? null)
const insights = computed(() => healthReportInsights(latestReport.value))

function logsToMetrics(logs: BodyLog[]): BodyMetric[] {
  const out: BodyMetric[] = []
  for (const l of logs) {
    const date = l.at.slice(0, 10)
    if (l.type === 'sleep' && typeof l.value.hours === 'number') {
      out.push({ id: `m_${l.id}`, type: 'sleep', value: l.value.hours, unit: '小时', timestamp: l.at, date })
    } else if (l.type === 'exercise' && typeof l.value.minutes === 'number') {
      out.push({ id: `m_${l.id}`, type: 'exercise', value: l.value.minutes, unit: '分钟', timestamp: l.at, date })
    }
  }
  return out
}

function logsToSleepRecords(logs: BodyLog[]): SleepRecord[] {
  const out: SleepRecord[] = []
  for (const l of logs) {
    if (l.type !== 'sleep' || typeof l.value.hours !== 'number') continue
    const date = l.at.slice(0, 10)
    out.push({
      id: `s_${l.id}`,
      sleepAt: l.at,
      wakeAt: l.at,
      duration: Math.round(l.value.hours * 60),
      quality: 4,
      date,
    })
  }
  return out
}

function generate() {
  generateReport(period.value, {
    metrics: logsToMetrics(props.logs),
    sleepRecords: logsToSleepRecords(props.logs),
    healthGoals: [],
  })
  selectedId.value = null
}

function toggleDetail(id: string) {
  selectedId.value = selectedId.value === id ? null : id
  exportText.value = ''
}

function markRead(id: string) { markAsRead(id) }
function removeReport(id: string) {
  deleteReport(id)
  if (selectedId.value === id) selectedId.value = null
}
function exportJson(id: string) { exportText.value = exportReport(id, 'json') }
function exportMarkdown(id: string) { exportText.value = exportReport(id, 'markdown') }

function formatRange(range: { start: string; end: string }): string {
  return `${range.start} ~ ${range.end}`
}
</script>

<style scoped>
.hrp {
  margin: 14px 0;
  padding: 14px 16px;
  background: linear-gradient(160deg, rgba(107, 159, 196, 0.08), rgba(90, 184, 160, 0.05));
  border: 1px solid rgba(107, 159, 196, 0.25);
  border-radius: 14px;
}
.hrp-head { margin-bottom: 10px; }
.hrp-title { margin: 0 0 4px; font-size: 15px; color: #1a1a2e; }
.hrp-sub { margin: 0; font-size: 12px; color: #7a8a9a; }
.hrp-insights { margin: 8px 0; }
.hrp-insight {
  margin: 4px 0; padding: 6px 10px; font-size: 12px; color: #4a5a6a;
  background: rgba(255, 255, 255, 0.6); border-radius: 8px; border-left: 3px solid #6b9fc4;
}
.hrp-gen { display: flex; align-items: center; gap: 10px; margin: 10px 0; flex-wrap: wrap; }
.hrp-periods { display: flex; gap: 6px; }
.hrp-period {
  padding: 4px 12px; font-size: 12px; border: 1px solid rgba(107, 159, 196, 0.4);
  border-radius: 999px; background: transparent; color: #4a5a6a; cursor: pointer;
}
.hrp-period.active { background: #6b9fc4; border-color: #6b9fc4; color: #fff; }
.hrp-gen-btn {
  padding: 6px 14px; font-size: 12px; border: none; border-radius: 999px;
  background: #5ab8a0; color: #fff; cursor: pointer;
}
.hrp-gen-btn:hover { filter: brightness(1.05); }
.hrp-empty { padding: 20px; text-align: center; color: #8a9a7a; font-size: 13px; }
.hrp-empty span { display: block; font-size: 28px; margin-bottom: 6px; }
.hrp-empty p { margin: 0; line-height: 1.6; }
.hrp-card {
  margin: 8px 0; padding: 10px 12px; background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(107, 159, 196, 0.2); border-radius: 10px; cursor: pointer;
}
.hrp-card.unread { border-left: 3px solid #6b9fc4; }
.hrp-card.open { border-color: #6b9fc4; }
.hrp-card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.hrp-card-main { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hrp-card-title { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.hrp-card-period { font-size: 11px; color: #6b9fc4; background: rgba(107, 159, 196, 0.12); padding: 1px 8px; border-radius: 999px; }
.hrp-card-range { font-size: 11px; color: #8a9a7a; }
.hrp-card-meta { display: flex; align-items: center; gap: 6px; }
.hrp-score { font-size: 16px; font-weight: 700; }
.hrp-grade { font-size: 11px; padding: 1px 8px; border-radius: 999px; }
.hrp-grade-excellent { color: #2e8b6a; background: rgba(90, 184, 160, 0.15); }
.hrp-grade-good { color: #3d7ea6; background: rgba(107, 159, 196, 0.15); }
.hrp-grade-fair { color: #b08a2a; background: rgba(240, 192, 64, 0.18); }
.hrp-grade-poor { color: #b04a3a; background: rgba(196, 106, 90, 0.18); }
.hrp-unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #6b9fc4; }
.hrp-detail { margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(107, 159, 196, 0.3); }
.hrp-summary-row { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: #4a5a6a; }
.hrp-summary-row .up { color: #2e8b6a; }
.hrp-summary-row .down { color: #b04a3a; }
.hrp-findings { margin-top: 6px; }
.hrp-finding { margin: 3px 0; font-size: 12px; }
.hrp-finding.hl { color: #2e8b6a; }
.hrp-finding.cn { color: #b08a2a; }
.hrp-sections { margin-top: 10px; }
.hrp-section { margin: 4px 0; border: 1px solid rgba(107, 159, 196, 0.2); border-radius: 8px; overflow: hidden; }
.hrp-section-title { padding: 6px 10px; font-size: 12px; color: #3d7ea6; background: rgba(107, 159, 196, 0.08); cursor: pointer; }
.hrp-section-content {
  margin: 0; padding: 8px 10px; font-size: 11px; line-height: 1.7; color: #4a5a6a;
  white-space: pre-wrap; font-family: inherit; background: rgba(255, 255, 255, 0.5);
}
.hrp-recs { margin-top: 10px; }
.hrp-recs-title { margin: 0 0 6px; font-size: 12px; color: #1a1a2e; }
.hrp-rec { padding: 8px 10px; margin: 6px 0; background: rgba(255, 255, 255, 0.6); border-radius: 8px; }
.hrp-rec-head { display: flex; align-items: center; gap: 8px; }
.hrp-rec-priority { font-size: 11px; }
.hrp-rec-priority.p-high { color: #b04a3a; }
.hrp-rec-priority.p-medium { color: #b08a2a; }
.hrp-rec-priority.p-low { color: #3d7ea6; }
.hrp-rec-title { font-size: 12px; font-weight: 600; color: #1a1a2e; }
.hrp-rec-desc { margin: 4px 0 0; font-size: 12px; color: #4a5a6a; }
.hrp-rec-outcome { margin: 3px 0 0; font-size: 11px; color: #8a9a7a; }
.hrp-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.hrp-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px; font-size: 11px; border: 1px solid rgba(107, 159, 196, 0.4);
  border-radius: 999px; background: transparent; color: #3d7ea6; cursor: pointer;

  min-height: 26px;
}
.hrp-act.danger { border-color: rgba(196, 106, 90, 0.4); color: #b04a3a; }
.hrp-act:hover { background: rgba(107, 159, 196, 0.1); }
.hrp-export {
  margin: 10px 0 0; padding: 10px; max-height: 220px; overflow: auto;
  font-size: 11px; line-height: 1.6; color: #3a4a5a; background: rgba(26, 26, 46, 0.05);
  border-radius: 8px; white-space: pre-wrap; font-family: inherit;
}
</style>
