<template>
  <section class="nap">
    <div class="nap-head">
      <span class="nap-title">🧭 笔记健康分析</span>
      <span v-if="report.healthSummary.avgScore > 0" class="nap-tag" :style="{ color: gradeColor(report.healthSummary.avgScore) }">
        平均健康 {{ report.healthSummary.avgScore }} 分
      </span>
      <span v-else class="nap-tag">书房尚空</span>
    </div>

    <!-- 写作统计 -->
    <div class="nap-block">
      <div class="nap-block-title">写作统计</div>
      <div class="nap-metrics">
        <div class="nap-metric"><b>{{ report.writing.totalNotes }}</b><span>总笔记</span></div>
        <div class="nap-metric"><b>{{ fmtNum(report.writing.totalChars) }}</b><span>总字数</span></div>
        <div class="nap-metric"><b>{{ fmtNum(report.writing.totalWords) }}</b><span>英文词</span></div>
        <div class="nap-metric"><b>{{ fmtNum(report.writing.avgCharsPerNote) }}</b><span>平均每篇</span></div>
        <div class="nap-metric"><b>{{ fmtNum(report.writing.medianCharsPerNote) }}</b><span>中位数</span></div>
        <div class="nap-metric"><b>{{ pct(report.writing.emptyNoteRatio) }}</b><span>空笔记</span></div>
      </div>

      <!-- 字数分布 -->
      <div v-if="report.writing.lengthDistribution.length" class="nap-bars">
        <div v-for="b in report.writing.lengthDistribution" :key="b.label" class="nap-bar-row">
          <span class="nap-bar-label">{{ b.label }}</span>
          <div class="nap-bar"><i :style="{ width: Math.max(2, b.ratio * 100) + '%' }"></i></div>
          <span class="nap-bar-count">{{ b.count }}</span>
        </div>
      </div>
    </div>

    <!-- 健康度 -->
    <div class="nap-block">
      <div class="nap-block-title">笔记健康度</div>
      <div v-if="report.healthSummary.avgScore > 0" class="nap-health-grid">
        <div class="nap-health-ring" :style="{ '--score': report.healthSummary.avgScore }">
          <div class="nap-ring-inner">
            <b>{{ report.healthSummary.avgScore }}</b>
            <span>平均分</span>
          </div>
        </div>
        <div class="nap-grade-list">
          <div v-for="g in gradeRows" :key="g.key" class="nap-grade-row">
            <span class="nap-grade-dot" :style="{ background: g.color }"></span>
            <span class="nap-grade-name">{{ g.label }}</span>
            <div class="nap-grade-bar"><i :style="{ width: g.pct + '%' }"></i></div>
            <span class="nap-grade-count">{{ g.count }}</span>
          </div>
        </div>
      </div>
      <p v-else class="nap-empty">写下第一篇笔记，健康分析会在这里展开。</p>

      <!-- 需要关注的笔记 -->
      <div v-if="report.healthSummary.attentionNeeded.length" class="nap-attention">
        <div class="nap-attention-title">需要关注</div>
        <div v-for="h in healthList" :key="h.noteId" class="nap-health-item">
          <div class="nap-health-item-head">
            <span class="nap-health-item-title">{{ h.title || '未命名' }}</span>
            <span class="nap-health-item-score" :style="{ color: gradeColor(h.overallScore) }">{{ h.overallScore }}</span>
          </div>
          <div class="nap-health-item-bar"><i :style="{ width: h.overallScore + '%', background: gradeColor(h.overallScore) }"></i></div>
          <div v-if="h.suggestions.length" class="nap-health-suggest">
            <span v-for="(s, i) in h.suggestions.slice(0, 2)" :key="i" class="nap-health-suggest-item">· {{ s }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签分析 -->
    <div class="nap-block">
      <div class="nap-block-title">标签分析</div>
      <div v-if="report.tags.topTags.length" class="nap-tags">
        <div v-for="(t, i) in report.tags.topTags.slice(0, 8)" :key="t.tag" class="nap-tag"
          :style="{ fontSize: (11 + (report.tags.topTags.length - i) * 0.8) + 'px' }">
          <span class="nap-tag-name">{{ t.tag }}</span>
          <span class="nap-tag-count">{{ t.count }}</span>
        </div>
      </div>
      <p v-else class="nap-empty">还没有标签，写笔记时加 #标签 试试。</p>
      <div class="nap-tag-meta">
        <span>平均每篇 {{ report.tags.avgTagsPerNote }} 个标签</span>
        <span>无标签 {{ pct(report.tags.untaggedRatio) }}</span>
      </div>
    </div>

    <!-- 生命周期 -->
    <div class="nap-block">
      <div class="nap-block-title">生命周期</div>
      <div class="nap-metrics">
        <div class="nap-metric"><b>{{ report.lifecycle.activeCount }}</b><span>活跃</span></div>
        <div class="nap-metric"><b>{{ report.lifecycle.archivedCount }}</b><span>已归档</span></div>
        <div class="nap-metric"><b>{{ report.lifecycle.deletedCount }}</b><span>已删除</span></div>
        <div class="nap-metric"><b>{{ pct(report.lifecycle.archiveRatio) }}</b><span>归档率</span></div>
        <div class="nap-metric"><b>{{ pct(report.lifecycle.deleteRatio) }}</b><span>删除率</span></div>
      </div>
    </div>

    <!-- 内容质量 -->
    <div class="nap-block">
      <div class="nap-block-title">内容质量</div>
      <div class="nap-metrics">
        <div class="nap-metric"><b>{{ pct(report.quality.uniqueWordRatio) }}</b><span>用词独特</span></div>
        <div class="nap-metric"><b>{{ report.quality.avgTitleLength }}</b><span>标题均长</span></div>
        <div class="nap-metric"><b>{{ report.quality.avgParagraphs }}</b><span>段落均数</span></div>
        <div class="nap-metric"><b>{{ pct(report.quality.linkRatio) }}</b><span>含链接</span></div>
        <div class="nap-metric"><b>{{ pct(report.quality.listRatio) }}</b><span>含列表</span></div>
        <div class="nap-metric"><b>{{ pct(report.quality.duplicationRatio) }}</b><span>内容重复</span></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Note } from '../types'
import { useNote } from '../modules/note'
import { useNoteAnalytics } from '../modules/note'

const props = defineProps<{ notes: Note[] }>()

const { knowledgeRings } = useNote()
const { generateReport } = useNoteAnalytics()

const report = computed(() => generateReport(props.notes, knowledgeRings.value))

watch(
  () => props.notes,
  () => { /* report 为 computed，自动响应 */ },
  { deep: true },
)

const GRADE_META = [
  { key: 'excellent', label: '优秀', color: '#8a9a7a' },
  { key: 'good', label: '良好', color: '#c9a86a' },
  { key: 'fair', label: '一般', color: '#d0a05a' },
  { key: 'poor', label: '较差', color: '#c46a5a' },
  { key: 'critical', label: '严重', color: '#b04a4a' },
] as const

const gradeRows = computed(() => {
  const s = report.value.healthSummary
  const total = Math.max(1, s.excellentCount + s.goodCount + s.fairCount + s.poorCount + s.criticalCount)
  return GRADE_META.map(g => ({
    key: g.key,
    label: g.label,
    color: g.color,
    count: s[`${g.key}Count`],
    pct: Math.round((s[`${g.key}Count`] / total) * 100),
  }))
})

const healthList = computed(() =>
  [...report.value.healthScores]
    .sort((a, b) => a.overallScore - b.overallScore)
    .slice(0, 6),
)

function gradeColor(score: number): string {
  if (score >= 85) return GRADE_META[0].color
  if (score >= 70) return GRADE_META[1].color
  if (score >= 55) return GRADE_META[2].color
  if (score >= 40) return GRADE_META[3].color
  return GRADE_META[4].color
}

function fmtNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function pct(r: number): string {
  return Math.round(r * 100) + '%'
}
</script>

<style scoped>
.nap {
  position: relative;
  z-index: 1;
  margin: 20px 32px 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.nap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.nap-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.75);
}

.nap-tag {
  font-size: 11px;
  padding: 3px 12px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
}

.nap-block {
  padding: 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.07);
  margin-bottom: 12px;
}

.nap-block:last-child { margin-bottom: 0; }

.nap-block-title {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.45);
  margin-bottom: 10px;
}

.nap-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
}

.nap-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.05);
}

.nap-metric b {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
}

.nap-metric span {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

/* 字数分布 */
.nap-bars {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 12px;
}

.nap-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}

.nap-bar-label { flex: 0 0 64px; }

.nap-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}

.nap-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.35);
  transition: width 0.4s;
}

.nap-bar-count { flex: 0 0 24px; text-align: right; }

/* 健康度 */
.nap-health-grid {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nap-health-ring {
  flex: 0 0 96px;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) calc(var(--score) * 1%), rgba(var(--accent-rgb), 0.08) 0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nap-ring-inner {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.nap-ring-inner b { font-size: 22px; font-weight: 600; color: var(--accent); }
.nap-ring-inner span { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }

.nap-grade-list { flex: 1; display: flex; flex-direction: column; gap: 6px; }

.nap-grade-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.55);
}

.nap-grade-dot { width: 8px; height: 8px; border-radius: 50%; }
.nap-grade-name { flex: 0 0 32px; }
.nap-grade-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.nap-grade-bar i { display: block; height: 100%; border-radius: 3px; background: rgba(var(--accent-rgb), 0.3); transition: width 0.4s; }
.nap-grade-count { flex: 0 0 20px; text-align: right; }

/* 需要关注 */
.nap-attention { margin-top: 12px; }

.nap-attention-title {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  margin-bottom: 8px;
}

.nap-health-item {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  margin-bottom: 6px;
}

.nap-health-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.nap-health-item-title {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nap-health-item-score { font-size: 13px; font-weight: 600; }

.nap-health-item-bar { height: 5px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.nap-health-item-bar i { display: block; height: 100%; border-radius: 3px; transition: width 0.4s; }

.nap-health-suggest {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}

.nap-health-suggest-item {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
  line-height: 1.5;
}

/* 标签 */
.nap-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  line-height: 1.4;
}

.nap-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(var(--accent-rgb), 0.55);
}

.nap-tag-count {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.5);
}

.nap-tag-meta {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
}

.nap-empty {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.35);
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .nap { margin: 16px 16px 0; padding: 14px; }
  .nap-health-grid { flex-direction: column; align-items: stretch; }
  .nap-health-ring { align-self: center; }
}
</style>
