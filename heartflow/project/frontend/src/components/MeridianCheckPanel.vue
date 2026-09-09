<template>
  <section data-enter class="meridian-check">
    <header class="mc-head">
      <span class="mc-icon">🧭</span>
      <div>
        <h3 class="mc-title">经络自检 · 藏象体检</h3>
        <p class="mc-desc">依据你记录的经络感受，推演薄弱经络与调理出路（子午流注借鉴）</p>
      </div>
    </header>

    <!-- 操作 -->
    <div class="mc-actions">
      <div class="mc-source" :class="{ 'mc-source-ok': hasRecords }">
        <span class="mc-source-dot"></span>
        已积累 {{ records.length }} 条经络感受记录
      </div>
      <button class="mc-btn" :disabled="!hasRecords" @click="runCheck">
        开始经络自检
      </button>
    </div>

    <!-- 空状态：无数据 -->
    <p v-if="!report && !hasRecords" class="mc-empty">
      还没有可自检的经络记录。先在上方记录几条经络感受，回来点「开始经络自检」，看看哪些经络最需要关照。
    </p>

    <!-- 有报告 -->
    <template v-if="report">
      <div class="mc-verdict" :style="{ borderColor: scoreColor(report.overallScore) }">
        <span class="mc-verdict-score" :style="{ color: scoreColor(report.overallScore) }">{{ report.overallScore }}</span>
        <div class="mc-verdict-meta">
          <b class="mc-verdict-title">{{ scoreNote(report.overallScore) }}</b>
          <span class="mc-verdict-time">第 {{ reportCount }} 次自检 · {{ fmtTime(report.checkedAt) }}</span>
        </div>
      </div>

      <!-- 最需关照 -->
      <div v-if="report.issues.length > 0" class="mc-card mc-worst">
        <h4 class="mc-card-title">最需关照</h4>
        <div class="mc-worst-body">
          <p class="mc-worst-emotion">{{ issues[0].relatedEmotion }}</p>
          <p class="mc-worst-desc">{{ issues[0].description }}</p>
          <p class="mc-worst-remedy">{{ issues[0].remedy }}</p>
        </div>
      </div>

      <!-- 问题清单 -->
      <div class="mc-card">
        <h4 class="mc-card-title">问题经络 <span class="mc-count">{{ report.issues.length }}</span></h4>
        <p v-if="report.issues.length === 0" class="mc-muted">各经络记录平稳，暂无突出问题。</p>
        <div v-for="iss in report.issues" :key="iss.meridian" class="mc-issue" :class="'mc-issue-' + iss.severity">
          <div class="mc-issue-top">
            <span class="mc-issue-organ">{{ iss.organ }}</span>
            <span class="mc-issue-sev">{{ sevLabel(iss.severity) }}</span>
          </div>
          <p class="mc-issue-desc">{{ iss.description }}</p>
          <p class="mc-issue-remedy"><b>调理</b> {{ iss.remedy }}</p>
          <p class="mc-issue-emotion"><b>关联情绪</b> {{ iss.relatedEmotion }}</p>
        </div>
      </div>

      <!-- 建议 -->
      <div class="mc-card">
        <h4 class="mc-card-title">调理建议</h4>
        <ul class="mc-recs">
          <li v-for="(r, i) in report.recommendations" :key="i" class="mc-rec">{{ r }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  useMeridianCheck,
} from '../modules/body-wisdom'
import type { MeridianRecord, MeridianIssue } from '../modules/body-wisdom'

const props = defineProps<{ records: MeridianRecord[] }>()

const check = useMeridianCheck()
check.loadCheckReports()

const records = computed<MeridianRecord[]>(() => props.records)

const report = computed(() => check.latestReport.value)
const reportCount = computed(() => check.checkReports.value.length)
const issues = computed<MeridianIssue[]>(() => report.value?.issues ?? [])

const hasRecords = computed(() => records.value.length > 0)

function runCheck() {
  check.performMeridianCheck(records.value)
}

// ---- 评分与颜色 ----
function scoreColor(v: number): string {
  if (v >= 80) return '#8a9a7a'
  if (v >= 60) return '#f0c040'
  return '#c46a5a'
}
function scoreNote(v: number): string {
  if (v >= 80) return '经络诸脉平稳，藏象调和'
  if (v >= 60) return '整体尚可，个别经络可再关照'
  if (v >= 40) return '多个经络有波动，建议重视'
  return '经络状态偏弱，宜系统调理'
}
function sevLabel(s: MeridianIssue['severity']): string {
  return s === 'severe' ? '严重' : s === 'moderate' ? '关注' : '轻微'
}
function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.meridian-check {
  margin-top: 26px;
  padding: 20px 20px 24px;
  border-radius: 18px;
  background: radial-gradient(circle at 85% 0%, rgba(196, 106, 90, 0.08), rgba(0, 0, 0, 0.18));
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.mc-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.mc-icon { font-size: 24px; line-height: 1; }
.mc-title { margin: 0; font-size: 18px; letter-spacing: 2px; color: var(--text-high, #fff); }
.mc-desc { margin: 4px 0 0; font-size: 12px; opacity: 0.6; line-height: 1.6; }

.mc-actions {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 16px; flex-wrap: wrap;
}
.mc-source { display: flex; align-items: center; gap: 7px; font-size: 12px; opacity: 0.7; }
.mc-source-dot { width: 8px; height: 8px; border-radius: 50%; background: #c46a5a; }
.mc-source-ok .mc-source-dot { background: #8a9a7a; }
.mc-btn {
  padding: 7px 16px; border-radius: 8px;
  border: 1px solid rgba(196, 106, 90, 0.4);
  background: rgba(196, 106, 90, 0.14); color: #dfa093;
  font-size: 12px; font-family: inherit; cursor: pointer;
  transition: background 0.25s, border-color 0.25s;
}
.mc-btn:hover:not(:disabled) { background: rgba(196, 106, 90, 0.24); }
.mc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.mc-empty { font-size: 13px; opacity: 0.55; line-height: 1.8; }

/* 综合评分 */
.mc-verdict {
  display: flex; align-items: center; gap: 16px;
  padding: 16px; border-radius: 14px; border: 1px solid;
  background: rgba(255, 255, 255, 0.03); margin-bottom: 14px;
}
.mc-verdict-score {
  font-size: 44px; font-weight: 600; line-height: 1; min-width: 84px; text-align: center;
}
.mc-verdict-meta { display: flex; flex-direction: column; gap: 4px; }
.mc-verdict-title { font-size: 15px; color: var(--text-high, #fff); letter-spacing: 1px; }
.mc-verdict-time { font-size: 11px; opacity: 0.55; }

.mc-card {
  padding: 16px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 12px;
}
.mc-card-title { margin: 0 0 12px; font-size: 14px; letter-spacing: 1px; color: var(--text-high, #fff); display: flex; align-items: center; gap: 6px; }
.mc-count { font-size: 11px; opacity: 0.55; }
.mc-muted { font-size: 12px; opacity: 0.5; }

/* 最需关照 */
.mc-worst { border-color: rgba(196, 106, 90, 0.28); background: rgba(196, 106, 90, 0.06); }
.mc-worst-body { display: flex; flex-direction: column; gap: 6px; }
.mc-worst-emotion { margin: 0; font-size: 16px; color: #dfa093; font-weight: 600; }
.mc-worst-desc { margin: 0; font-size: 13px; color: var(--text-high, #fff); line-height: 1.6; }
.mc-worst-remedy { margin: 0; font-size: 12px; opacity: 0.7; line-height: 1.7; }

/* 问题清单 */
.mc-issue {
  padding: 12px; border-radius: 10px; margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid;
}
.mc-issue:last-child { margin-bottom: 0; }
.mc-issue-severe { border-left-color: #c46a5a; }
.mc-issue-moderate { border-left-color: #f0c040; }
.mc-issue-mild { border-left-color: #8a9a7a; }
.mc-issue-top { display: flex; align-items: center; gap: 8px; }
.mc-issue-organ { font-size: 14px; font-weight: 600; color: var(--text-high, #fff); }
.mc-issue-sev {
  font-size: 10px; padding: 1px 8px; border-radius: 999px;
}
.mc-issue-severe .mc-issue-sev { background: rgba(196, 106, 90, 0.16); color: #d98a78; }
.mc-issue-moderate .mc-issue-sev { background: rgba(240, 192, 64, 0.14); color: #e0bd6e; }
.mc-issue-mild .mc-issue-sev { background: rgba(138, 154, 122, 0.16); color: #8a9a7a; }
.mc-issue-desc { margin: 6px 0 0; font-size: 12px; opacity: 0.75; line-height: 1.6; }
.mc-issue-remedy { margin: 6px 0 0; font-size: 12px; opacity: 0.7; line-height: 1.7; }
.mc-issue-remedy b, .mc-issue-emotion b { color: #f0c040; font-weight: 600; }
.mc-issue-emotion { margin: 4px 0 0; font-size: 11px; opacity: 0.55; }

/* 建议 */
.mc-recs { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.mc-rec { padding-left: 16px; position: relative; font-size: 13px; opacity: 0.85; line-height: 1.7; }
.mc-rec::before { content: '·'; position: absolute; left: 2px; color: #8a9a7a; font-weight: 700; }
</style>