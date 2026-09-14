<template>
  <section class="nhap nhap-archive">
    <!-- 空态：书房未启 -->
    <div v-if="report.writing.totalNotes === 0" class="nhap-empty">
      <span class="nhap-badge nhap-badge-neutral">书房未启</span>
      <span class="nhap-empty-icon">📖</span>
      <p class="nhap-empty-title">书房未启</p>
      <p class="nhap-empty-desc">书房还空着。写下第一篇笔记，健康档案会为每篇思绪把脉——充实、标签、回顾，逐一显影。</p>
    </div>

    <!-- 填充态 -->
    <template v-else>
      <!-- 徽标 + 健康度摘要 -->
      <div class="nhap-head">
        <span class="nhap-badge" :class="'nhap-badge-' + summaryGrade">{{ GRADE_META[summaryGrade].label }}</span>
        <span class="nhap-head-title">笔记健康档案</span>
        <span class="nhap-head-sub">健康度 · 写作 · 标签 · 生命周期 · 质量</span>
      </div>

      <div class="nhap-health">
        <span class="nhap-block-label nhap-health-label">健康度摘要</span>
        <div class="nhap-health-score">
          <span class="nhap-health-num">{{ report.healthSummary.avgScore }}</span>
          <span class="nhap-health-unit">平均健康分</span>
        </div>
        <div class="nhap-health-right">
          <div class="nhap-grade-bar">
            <div
              v-for="g in gradeRows"
              :key="g.key"
              class="nhap-grade-seg"
              :class="'seg-' + g.key"
              :style="{ width: gradeWidth(g.count) }"
              :title="`${g.label} ${g.count} 篇`"
            ></div>
          </div>
          <div class="nhap-grade-legend">
            <span v-for="g in gradeRows" :key="g.key" class="nhap-grade-item">
              <i class="nhap-grade-dot" :class="'dot-' + g.key"></i>{{ g.label }} {{ g.count }}
            </span>
          </div>
          <p v-if="report.healthSummary.attentionNeeded.length > 0" class="nhap-attention">
            ⚠️ {{ report.healthSummary.attentionNeeded.length }} 篇笔记需要关注
          </p>
        </div>
      </div>

      <!-- 写作统计 -->
      <div class="nhap-block">
        <span class="nhap-block-label">✍️ 写作统计</span>
        <div class="nhap-stats">
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ report.writing.totalNotes }}</span>
            <span class="nhap-stat-label">总笔记</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ fmt(report.writing.totalChars) }}</span>
            <span class="nhap-stat-label">总字数</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ fmt(report.writing.avgCharsPerNote) }}</span>
            <span class="nhap-stat-label">平均字数</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ fmt(report.writing.maxCharsPerNote) }}</span>
            <span class="nhap-stat-label">最长</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ fmt(report.writing.minCharsPerNote) }}</span>
            <span class="nhap-stat-label">最短</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ fmt(report.writing.medianCharsPerNote) }}</span>
            <span class="nhap-stat-label">中位数</span>
          </div>
        </div>
        <div class="nhap-dist">
          <div v-for="b in report.writing.lengthDistribution" :key="b.label" class="nhap-dist-row">
            <span class="nhap-dist-label">{{ b.label }}</span>
            <div class="nhap-dist-bar">
              <div class="nhap-dist-fill" :style="{ width: Math.max(2, b.ratio * 100) + '%' }"></div>
            </div>
            <span class="nhap-dist-count">{{ b.count }}</span>
          </div>
        </div>
      </div>

      <!-- 标签分析 -->
      <div class="nhap-block">
        <span class="nhap-block-label">🏷️ 标签分析</span>
        <div class="nhap-stats nhap-stats-3">
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ report.tags.avgTagsPerNote }}</span>
            <span class="nhap-stat-label">平均标签</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ report.tags.untaggedCount }}</span>
            <span class="nhap-stat-label">无标签</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ pct(report.tags.untaggedRatio) }}</span>
            <span class="nhap-stat-label">无标签占比</span>
          </div>
        </div>
        <div class="nhap-tags" v-if="report.tags.topTags.length">
          <span v-for="t in report.tags.topTags.slice(0, 8)" :key="t.tag" class="nhap-tag">
            #{{ t.tag }} <small>{{ t.count }}</small>
          </span>
        </div>
      </div>

      <!-- 生命周期 -->
      <div class="nhap-block">
        <span class="nhap-block-label">🔄 生命周期</span>
        <div class="nhap-stats nhap-stats-4">
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ report.lifecycle.activeCount }}</span>
            <span class="nhap-stat-label">活跃</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ report.lifecycle.archivedCount }}</span>
            <span class="nhap-stat-label">归档</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ report.lifecycle.deletedCount }}</span>
            <span class="nhap-stat-label">回收站</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ pct(report.lifecycle.archiveRatio) }}</span>
            <span class="nhap-stat-label">归档率</span>
          </div>
        </div>
      </div>

      <!-- 内容质量 -->
      <div class="nhap-block">
        <span class="nhap-block-label">🔍 内容质量</span>
        <div class="nhap-stats nhap-stats-5">
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ pct(report.quality.uniqueWordRatio) }}</span>
            <span class="nhap-stat-label">唯一词</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ report.quality.avgTitleLength }}</span>
            <span class="nhap-stat-label">标题长度</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ report.quality.avgParagraphs }}</span>
            <span class="nhap-stat-label">段落</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ pct(report.quality.linkRatio) }}</span>
            <span class="nhap-stat-label">含链接</span>
          </div>
          <div class="nhap-stat">
            <span class="nhap-stat-num">{{ pct(report.quality.codeBlockRatio) }}</span>
            <span class="nhap-stat-label">含代码</span>
          </div>
        </div>
      </div>

      <!-- 待打磨 -->
      <div class="nhap-block nhap-attn" v-if="attentionNotes.length">
        <span class="nhap-block-label">🪛 待打磨</span>
        <div class="nhap-attention-list">
          <div v-for="n in attentionNotes" :key="n.noteId" class="nhap-attention-item">
            <span class="nhap-attention-title">{{ n.title }}</span>
            <span class="nhap-attention-score" :class="'sc-' + n.grade">{{ n.overallScore }}</span>
            <span class="nhap-attention-tip">{{ n.suggestions[0] }}</span>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStudy } from '../modules/study'
import { useNoteAnalytics } from '../modules/note/note-analytics'
import type { NoteHealthScore } from '../modules/note/note-analytics'

const study = useStudy()
const analytics = useNoteAnalytics()

const GRADE_META: Record<NoteHealthScore['grade'], { label: string }> = {
  excellent: { label: '优秀' },
  good: { label: '良好' },
  fair: { label: '一般' },
  poor: { label: '较差' },
  critical: { label: '严重' },
}

const gradeRows = computed(() => {
  const s = report.value.healthSummary
  return [
    { key: 'excellent', label: '优秀', count: s.excellentCount },
    { key: 'good', label: '良好', count: s.goodCount },
    { key: 'fair', label: '一般', count: s.fairCount },
    { key: 'poor', label: '较差', count: s.poorCount },
    { key: 'critical', label: '严重', count: s.criticalCount },
  ]
})

const report = computed(() => analytics.generateReport(study.notes.value, []))

const summaryGrade = computed<NoteHealthScore['grade']>(() => {
  const s = report.value.healthSummary.avgScore
  if (s >= 85) return 'excellent'
  if (s >= 70) return 'good'
  if (s >= 50) return 'fair'
  if (s >= 30) return 'poor'
  return 'critical'
})

const attentionNotes = computed(() => report.value.healthScores.slice(0, 3))

function gradeWidth(count: number): string {
  const total = report.value.healthSummary.excellentCount + report.value.healthSummary.goodCount
    + report.value.healthSummary.fairCount + report.value.healthSummary.poorCount
    + report.value.healthSummary.criticalCount
  if (total === 0) return '0%'
  return `${(count / total) * 100}%`
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}
</script>

<style scoped>
.nhap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 12px 0;
}

/* 空态 */
.nhap-empty {
  border: 1px dashed #e0d6c2;
  border-radius: 14px;
  padding: 26px 20px;
  text-align: center;
  background: #fdfbf5;
}
.nhap-empty-icon {
  font-size: 30px;
}
.nhap-empty-title {
  margin: 8px 0 4px;
  font-weight: 700;
  color: #6b6353;
}
.nhap-empty-desc {
  margin: 0;
  font-size: 12px;
  color: #8a8170;
  line-height: 1.7;
}

/* 头部徽标 */
.nhap-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nhap-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 12px;
  border-radius: 10px;
}
.nhap-badge-excellent { background: #4c8a5a; color: #fff; }
.nhap-badge-good { background: #8a9a7a; color: #fff; }
.nhap-badge-fair { background: #f0c040; color: #4a4234; }
.nhap-badge-poor { background: #e08a4a; color: #fff; }
.nhap-badge-critical { background: #c46a5a; color: #fff; }
.nhap-badge-neutral { background: #e6ddca; color: #6b6353; }
.nhap-head-title {
  font-weight: 700;
  color: #4a4234;
}
.nhap-head-sub {
  font-size: 11px;
  color: #8a8170;
}

/* 健康度摘要 */
.nhap-health {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  background: linear-gradient(135deg, #fdf6e3, #f7efd8);
  border: 1px solid #eadfbe;
  border-radius: 14px;
  padding: 14px 16px;
}
.nhap-health-label {
  width: 100%;
  color: #c49a3a;
}
.nhap-health-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 76px;
}
.nhap-health-num {
  font-size: 34px;
  font-weight: 800;
  color: #c49a3a;
}
.nhap-health-unit {
  font-size: 11px;
  color: #8a8170;
}
.nhap-health-right {
  flex: 1;
}
.nhap-grade-bar {
  display: flex;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background: #eadfbe;
}
.nhap-grade-seg { height: 100%; }
.seg-excellent { background: #4c8a5a; }
.seg-good { background: #8a9a7a; }
.seg-fair { background: #f0c040; }
.seg-poor { background: #e08a4a; }
.seg-critical { background: #c46a5a; }
.nhap-grade-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 11px;
  color: #6b6353;
}
.nhap-grade-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.nhap-grade-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot-excellent { background: #4c8a5a; }
.dot-good { background: #8a9a7a; }
.dot-fair { background: #f0c040; }
.dot-poor { background: #e08a4a; }
.dot-critical { background: #c46a5a; }
.nhap-attention {
  margin: 8px 0 0;
  font-size: 12px;
  color: #c46a5a;
}

/* 区块 */
.nhap-block {
  background: #fffdf7;
  border: 1px solid #e6ddca;
  border-radius: 14px;
  padding: 12px 14px;
}
.nhap-block-label {
  font-size: 11px;
  font-weight: 700;
  color: #8a8170;
  letter-spacing: 0.5px;
}

/* 统计格 */
.nhap-stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-top: 10px;
}
.nhap-stats-3 { grid-template-columns: repeat(3, 1fr); }
.nhap-stats-4 { grid-template-columns: repeat(4, 1fr); }
.nhap-stats-5 { grid-template-columns: repeat(5, 1fr); }
.nhap-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: #f7f4ec;
}
.nhap-stat-num {
  font-size: 18px;
  font-weight: 800;
  color: #4a4234;
}
.nhap-stat-label {
  font-size: 10px;
  color: #8a8170;
}

/* 字数分布 */
.nhap-dist {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
}
.nhap-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.nhap-dist-label {
  width: 64px;
  color: #6b6353;
}
.nhap-dist-bar {
  flex: 1;
  height: 8px;
  background: #f0e9da;
  border-radius: 4px;
  overflow: hidden;
}
.nhap-dist-fill {
  height: 100%;
  background: linear-gradient(90deg, #f0c040, #c49a3a);
  border-radius: 4px;
}
.nhap-dist-count {
  width: 24px;
  text-align: right;
  color: #8a8170;
}

/* 标签 chips */
.nhap-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.nhap-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 10px;
  background: #f1ece1;
  color: #6b6353;
}
.nhap-tag small {
  font-size: 10px;
  color: #a09888;
}

/* 待打磨 */
.nhap-attention-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.nhap-attention-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 10px;
  background: #f7f4ec;
}
.nhap-attention-title {
  flex: 1;
  color: #4a4234;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nhap-attention-score {
  font-weight: 800;
  min-width: 26px;
  text-align: center;
}
.sc-excellent { color: #4c8a5a; }
.sc-good { color: #8a9a7a; }
.sc-fair { color: #c49a3a; }
.sc-poor { color: #e08a4a; }
.sc-critical { color: #c46a5a; }
.nhap-attention-tip {
  color: #8a8170;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
