<template>
  <section class="wrh" aria-label="工作节律">
    <div class="wrh-head">
      <span class="wrh-title">🌗 工作节律</span>
      <span class="wrh-sub">时段生产力 · 焦点时段 · 习惯节奏，找到你的工作韵律</span>
    </div>

    <div v-if="entries.length === 0" class="wrh-empty">
      <span>🕐</span>
      <p>还没有工作日志，记录后这里会生成你的工作节律画像。</p>
    </div>

    <template v-else>
      <!-- 节奏横幅 -->
      <div class="wrh-rhythm">
        <span class="wrh-rhythm-tag" :class="'rt-' + profile.rhythm.type">{{ rhythmLabel }}</span>
        <div class="wrh-rhythm-main">
          <b class="wrh-rhythm-desc">{{ profile.rhythm.description }}</b>
          <div class="wrh-rhythm-stats">
            <span>工作块 {{ profile.rhythm.avgBlockDuration }} 分</span>
            <span>每日 {{ profile.rhythm.avgBlocksPerDay }} 块</span>
            <span>日均 {{ profile.avgDailyEntries }} 条</span>
            <span>日均专注 {{ profile.avgDailyFocus }} 分</span>
          </div>
        </div>
      </div>

      <!-- 时段生产力 -->
      <div class="wrh-block">
        <span class="wrh-block-label">时段生产力</span>
        <div class="wrh-slots">
          <div
            v-for="s in sortedSlots"
            :key="s.slot"
            :class="['wrh-slot', { 'wrh-slot--peak': s.isPeak }]"
            :title="`${s.label}: ${s.productivityScore} 分 · ${s.entryCount} 条`"
          >
            <div class="wrh-slot-head">
              <span class="wrh-slot-label">{{ s.label }}</span>
              <span class="wrh-slot-score">{{ s.productivityScore }}<small>分</small></span>
            </div>
            <div class="wrh-slot-bar"><i :style="{ width: slotPct(s.productivityScore) + '%' }"></i></div>
            <div class="wrh-slot-meta">
              <span class="wrh-slot-entry">{{ s.entryCount }} 条</span>
              <span v-if="s.isPeak" class="wrh-slot-peak">峰值</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最佳/最差工作日 + 连续 -->
      <div class="wrh-block">
        <div class="wrh-days">
          <div class="wrh-day-card">
            <span class="wrh-day-kicker">最佳工作日</span>
            <b class="wrh-day-value">{{ profile.bestDayOfWeek || '—' }}</b>
          </div>
          <div class="wrh-day-card wrh-day-card--low">
            <span class="wrh-day-kicker">低谷工作日</span>
            <b class="wrh-day-value">{{ profile.worstDayOfWeek || '—' }}</b>
          </div>
          <div class="wrh-day-card">
            <span class="wrh-day-kicker">当前连续</span>
            <b class="wrh-day-value">{{ profile.streakPattern.currentStreak }}<small>天</small></b>
          </div>
          <div class="wrh-day-card">
            <span class="wrh-day-kicker">最长连续</span>
            <b class="wrh-day-value">{{ profile.streakPattern.longestStreak }}<small>天</small></b>
          </div>
        </div>
      </div>

      <!-- 焦点时段 -->
      <div class="wrh-block" v-if="focusBlocks.length > 0">
        <span class="wrh-block-label">专注焦点时段</span>
        <div class="wrh-focus">
          <div v-for="(f, i) in focusBlocks" :key="i" class="wrh-focus-item">
            <span class="wrh-focus-time">{{ f.startHour }}:00–{{ f.endHour }}:00</span>
            <span class="wrh-focus-day">{{ DAY_LABELS[f.dayOfWeek] }}</span>
            <span class="wrh-focus-reliability">{{ Math.round(f.reliability * 100) }}% 稳定</span>
          </div>
        </div>
      </div>

      <!-- 习惯洞察 -->
      <div class="wrh-block" v-if="profile.insights.length > 0">
        <span class="wrh-block-label">习惯洞察</span>
        <div class="wrh-insights">
          <div
            v-for="ins in profile.insights"
            :key="ins.title"
            class="wrh-insight"
            :class="'ins-' + ins.type"
          >
            <span class="wrh-insight-tag">{{ insightTagLabel(ins.type) }}</span>
            <div class="wrh-insight-main">
              <b class="wrh-insight-title">{{ ins.title }}</b>
              <p class="wrh-insight-desc">{{ ins.description }}</p>
            </div>
            <span class="wrh-insight-conf">{{ Math.round(ins.confidence * 100) }}%</span>
          </div>
        </div>
      </div>

      <!-- 高频标签 -->
      <div class="wrh-block" v-if="profile.topTags.length > 0">
        <span class="wrh-block-label">高频标签</span>
        <div class="wrh-tags">
          <span v-for="t in profile.topTags.slice(0, 8)" :key="t.tag" class="wrh-tag">{{ t.tag }} ×{{ t.count }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWorklog } from '../modules/worklog/entries'
import { useWorklogHabits } from '../modules/worklog/worklog-habits'

const worklog = useWorklog()
const habits = useWorklogHabits()

const entries = computed(() => worklog.entries.value)
const profile = computed(() => habits.buildProfile(entries.value))
const focusBlocks = computed(() => habits.discoverFocusBlocks(entries.value).slice(0, 6))

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const RHYTHM_LABELS: Record<string, string> = {
  sprinter: '冲刺型',
  marathoner: '长跑型',
  steady: '稳健型',
  irregular: '不规律',
}

const sortedSlots = computed(() =>
  [...profile.value.timeSlotProductivity].sort((a, b) => b.productivityScore - a.productivityScore),
)

const maxSlotScore = computed(() =>
  Math.max(...profile.value.timeSlotProductivity.map(s => s.productivityScore), 1),
)

const rhythmLabel = computed(() => RHYTHM_LABELS[profile.value.rhythm.type] ?? '不规律')

function slotPct(score: number): number {
  return Math.round((score / maxSlotScore.value) * 100)
}

function insightTagLabel(type: string): string {
  const map: Record<string, string> = {
    strength: '优势',
    weakness: '短板',
    pattern: '模式',
    suggestion: '建议',
  }
  return map[type] ?? type
}

onMounted(() => worklog.load())
</script>

<style scoped>
.wrh {
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(240, 192, 64, 0.14);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.wrh-head { display: flex; flex-direction: column; gap: 2px; }
.wrh-title { font-size: 14px; font-weight: 600; color: #e8b64c; letter-spacing: 1px; }
.wrh-sub { font-size: 11px; color: rgba(232, 182, 76, 0.5); }

.wrh-empty { text-align: center; padding: 36px 16px; color: rgba(232, 182, 76, 0.35); }
.wrh-empty span { font-size: 30px; display: block; margin-bottom: 8px; }
.wrh-empty p { font-size: 12px; }

/* ---- 节奏横幅 ---- */
.wrh-rhythm {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 10px;
  background: rgba(232, 182, 76, 0.05);
  border: 1px solid rgba(232, 182, 76, 0.1);
}
.wrh-rhythm-tag {
  flex: 0 0 auto;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(232, 182, 76, 0.15);
  color: #e8b64c;
}
.wrh-rhythm-tag.rt-marathoner { background: rgba(138, 154, 122, 0.18); color: #8a9a7a; }
.wrh-rhythm-tag.rt-steady { background: rgba(107, 159, 196, 0.18); color: #6b9fc4; }
.wrh-rhythm-tag.rt-irregular { background: rgba(196, 106, 90, 0.18); color: #c46a5a; }
.wrh-rhythm-main { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.wrh-rhythm-desc { font-size: 12px; font-weight: 500; color: rgba(240, 210, 150, 0.85); line-height: 1.5; }
.wrh-rhythm-stats { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 10px; color: rgba(232, 182, 76, 0.55); }

/* ---- 区块 ---- */
.wrh-block { display: flex; flex-direction: column; gap: 10px; }
.wrh-block-label { font-size: 12px; font-weight: 600; color: rgba(232, 182, 76, 0.7); letter-spacing: 1px; }

/* ---- 时段 ---- */
.wrh-slots { display: flex; flex-direction: column; gap: 10px; }
.wrh-slot { padding: 8px 10px; border-radius: 8px; background: rgba(232, 182, 76, 0.04); border: 1px solid rgba(232, 182, 76, 0.07); }
.wrh-slot--peak { border-color: rgba(232, 182, 76, 0.35); background: rgba(232, 182, 76, 0.09); }
.wrh-slot-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.wrh-slot-label { font-size: 10px; color: rgba(232, 182, 76, 0.6); }
.wrh-slot-score { font-size: 13px; font-weight: 600; color: #e8b64c; }
.wrh-slot-score small { font-size: 9px; font-weight: 400; opacity: 0.6; margin-left: 2px; }
.wrh-slot-bar { height: 5px; border-radius: 3px; background: rgba(232, 182, 76, 0.12); overflow: hidden; }
.wrh-slot-bar i { display: block; height: 100%; background: linear-gradient(90deg, rgba(232, 182, 76, 0.5), #e8b64c); transition: width 0.4s; }
.wrh-slot-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 5px; }
.wrh-slot-entry { font-size: 9px; color: rgba(232, 182, 76, 0.4); }
.wrh-slot-peak { font-size: 9px; padding: 1px 6px; border-radius: 6px; background: rgba(240, 192, 64, 0.2); color: #f0c040; }

/* ---- 工作日 ---- */
.wrh-days { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.wrh-day-card {
  display: flex; flex-direction: column; gap: 4px;
  padding: 12px 8px; border-radius: 10px;
  background: rgba(232, 182, 76, 0.05); border: 1px solid rgba(232, 182, 76, 0.08);
  text-align: center;
}
.wrh-day-kicker { font-size: 10px; color: rgba(232, 182, 76, 0.5); }
.wrh-day-value { font-size: 17px; color: #e8b64c; }
.wrh-day-value small { font-size: 10px; font-weight: 400; opacity: 0.6; margin-left: 2px; }
.wrh-day-card--low { border-color: rgba(196, 106, 90, 0.25); }
.wrh-day-card--low .wrh-day-value { color: #c46a5a; }

/* ---- 焦点时段 ---- */
.wrh-focus { display: flex; flex-wrap: wrap; gap: 6px; }
.wrh-focus-item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(107, 159, 196, 0.08); border: 1px solid rgba(107, 159, 196, 0.15);
  font-size: 10px;
}
.wrh-focus-time { color: #6b9fc4; font-weight: 600; }
.wrh-focus-day { color: rgba(232, 182, 76, 0.6); }
.wrh-focus-reliability { color: rgba(232, 182, 76, 0.4); }

/* ---- 洞察 ---- */
.wrh-insights { display: flex; flex-direction: column; gap: 8px; }
.wrh-insight {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 10px 12px; border-radius: 10px;
  background: rgba(232, 182, 76, 0.05); border: 1px solid rgba(232, 182, 76, 0.08);
  border-left: 3px solid #8a9a7a;
}
.wrh-insight.ins-weakness { border-left-color: #c46a5a; }
.wrh-insight.ins-pattern { border-left-color: #6b9fc4; }
.wrh-insight.ins-suggestion { border-left-color: #cf8b6b; }
.wrh-insight-tag { font-size: 9px; padding: 2px 6px; border-radius: 6px; background: rgba(138, 154, 122, 0.18); color: #8a9a7a; flex: 0 0 auto; }
.wrh-insight.ins-weakness .wrh-insight-tag { background: rgba(196, 106, 90, 0.18); color: #c46a5a; }
.wrh-insight-main { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.wrh-insight-title { font-size: 12px; color: rgba(240, 210, 150, 0.9); }
.wrh-insight-desc { font-size: 11px; color: rgba(232, 182, 76, 0.6); margin: 0; line-height: 1.5; }
.wrh-insight-conf { font-size: 10px; color: rgba(232, 182, 76, 0.4); }

/* ---- 标签 ---- */
.wrh-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.wrh-tag { font-size: 10px; padding: 4px 9px; border-radius: 8px; background: rgba(232, 182, 76, 0.08); border: 1px solid rgba(232, 182, 76, 0.1); color: rgba(232, 182, 76, 0.7); }
</style>