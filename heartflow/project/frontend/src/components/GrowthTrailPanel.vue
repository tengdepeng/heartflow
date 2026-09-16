<template>
  <section class="gtp" aria-label="生长轨迹">
    <div class="gtp-head">
      <span class="gtp-title">🌱 生长轨迹</span>
      <span class="gtp-sub">进度快照 · 里程碑 · 生长日志，看见每一株目标的成长</span>
    </div>

    <!-- 生长统计 -->
    <div class="gtp-stats">
      <div class="gtp-stat"><b>{{ stats.totalGoals }}</b><span>目标</span></div>
      <div class="gtp-stat"><b class="gtp-stat-active">{{ stats.activeGoals }}</b><span>生长中</span></div>
      <div class="gtp-stat"><b class="gtp-stat-bloom">{{ stats.completedGoals }}</b><span>已开花</span></div>
      <div class="gtp-stat"><b>{{ Math.round(stats.averageProgress * 100) }}%</b><span>平均进度</span></div>
    </div>
    <div v-if="stats.totalAnchors > 0" class="gtp-anchors">
      <span>锚点 {{ stats.totalDoneAnchors }}/{{ stats.totalAnchors }}</span>
      <div class="gtp-bar"><i :style="{ width: anchorPct + '%' }"></i></div>
    </div>

    <!-- 里程碑 -->
    <div class="gtp-block">
      <div class="gtp-block-head">
        <span class="gtp-block-label">里程碑</span>
        <select v-model="selectedGoalId" class="gtp-select">
          <option value="">选择目标</option>
          <option v-for="g in goals" :key="g.id" :value="g.id">{{ g.title }}</option>
        </select>
      </div>

      <p v-if="!selectedGoalId" class="gtp-empty">选择一个目标，为它的生长之路标记里程碑。</p>
      <template v-else>
        <div class="gtp-ms-form">
          <input v-model="msLabel" placeholder="里程碑，如：完成第一章" class="gtp-input" @keyup.enter="addMilestone" />
          <input v-model="msDate" type="date" class="gtp-input gtp-input--date" />
          <button class="gtp-btn" :disabled="!msLabel.trim()" @click="addMilestone">添加</button>
        </div>

        <p v-if="!timeline || timeline.milestones.length === 0" class="gtp-empty">还没有里程碑，先添加一个。</p>
        <template v-else>
          <div class="gtp-ms-list">
            <div v-for="m in timeline.milestones" :key="m.id" class="gtp-ms" :class="'st-' + m.status">
              <span class="gtp-ms-icon">{{ msIcon(m.status) }}</span>
              <div class="gtp-ms-main">
                <b class="gtp-ms-label">{{ m.label }}</b>
                <span class="gtp-ms-date">{{ m.date }}</span>
              </div>
              <div class="gtp-ms-actions">
                <button v-if="m.status === 'pending'" class="gtp-mini gtp-mini--ok" @click="markAchieved(m.id)">达成</button>
                <button v-if="m.status === 'pending'" class="gtp-mini gtp-mini--miss" @click="markMissed(m.id)">错过</button>
              </div>
            </div>
          </div>
          <div v-if="msProgress.total > 0" class="gtp-ms-progress">
            <span>里程碑进度 {{ msProgress.achieved }}/{{ msProgress.total }}</span>
            <div class="gtp-bar"><i :style="{ width: msProgress.progress * 100 + '%' }"></i></div>
          </div>
        </template>
      </template>
    </div>

    <!-- 生长日志 -->
    <div class="gtp-block">
      <span class="gtp-block-label">生长日志</span>
      <p v-if="recentLogs.length === 0" class="gtp-empty">还没有生长记录，推进目标后会在这里留下痕迹。</p>
      <div v-else class="gtp-log-list">
        <div v-for="log in recentLogs" :key="log.id" class="gtp-log">
          <span class="gtp-log-dot"></span>
          <div class="gtp-log-main">
            <div class="gtp-log-head">
              <b class="gtp-log-event">{{ logEventLabel(log.event) }}</b>
              <span class="gtp-log-date">{{ fmtDate(log.recordedAt) }}</span>
            </div>
            <p class="gtp-log-detail">{{ log.detail }}</p>
            <span v-if="log.goalId" class="gtp-log-goal">{{ goalTitle(log.goalId) }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  useProgressStats,
  useMilestoneTimeline,
} from '../modules/goal/goal-progress'
import type { Goal } from '../modules/goal/types'

const props = defineProps<{ goals: Goal[] }>()

const statsStore = useProgressStats()
const timelineStore = useMilestoneTimeline()

const selectedGoalId = ref('')
const msLabel = ref('')
const msDate = ref('')

const stats = computed(() => statsStore.computeStats(props.goals))
const anchorPct = computed(() =>
  stats.value.totalAnchors > 0 ? Math.round(stats.value.totalDoneAnchors / stats.value.totalAnchors * 100) : 0,
)
const recentLogs = computed(() => statsStore.getRecentLogs(12))
const timeline = computed(() =>
  selectedGoalId.value ? timelineStore.getTimeline(selectedGoalId.value) : undefined,
)
const msProgress = computed(() =>
  selectedGoalId.value
    ? timelineStore.computeMilestoneProgress(selectedGoalId.value)
    : { total: 0, achieved: 0, missed: 0, pending: 0, progress: 0 },
)

function goalTitle(id: string): string {
  return props.goals.find(g => g.id === id)?.title ?? '未知目标'
}

function addMilestone() {
  if (!selectedGoalId.value || !msLabel.value.trim()) return
  if (!timelineStore.getTimeline(selectedGoalId.value)) {
    timelineStore.createTimeline(selectedGoalId.value, goalTitle(selectedGoalId.value))
  }
  timelineStore.addMilestone(
    selectedGoalId.value,
    msLabel.value.trim(),
    msDate.value || new Date().toISOString().slice(0, 10),
  )
  msLabel.value = ''
  msDate.value = ''
}

function markAchieved(id: string) {
  if (selectedGoalId.value) timelineStore.markAchieved(selectedGoalId.value, id)
}
function markMissed(id: string) {
  if (selectedGoalId.value) timelineStore.markMissed(selectedGoalId.value, id)
}

function msIcon(status: string): string {
  return { pending: '○', achieved: '●', missed: '✕' }[status] || '○'
}

function logEventLabel(event: string): string {
  const map: Record<string, string> = {
    status_change: '状态变化',
    progress_update: '进度更新',
  }
  return map[event] || event
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

onMounted(() => {
  statsStore.loadSnapshots()
  statsStore.loadLogs()
  timelineStore.loadTimelines()
})
</script>

<style scoped>
.gtp {
  margin: 4px 0 24px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--bg-card, rgba(18, 14, 11, 0.6));
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.gtp-head { margin-bottom: 14px; }
.gtp-title { font-size: 14px; font-weight: 500; color: var(--accent); letter-spacing: 0.5px; }
.gtp-sub { display: block; margin-top: 3px; font-size: 11px; color: var(--text-secondary); }

.gtp-stats { display: flex; gap: 8px; margin-bottom: 10px; }
.gtp-stat {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 4px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.05);
}
.gtp-stat b { font-size: 16px; font-weight: 600; color: var(--text-high); font-variant-numeric: tabular-nums; }
.gtp-stat b.gtp-stat-active { color: #e0a96d; }
.gtp-stat b.gtp-stat-bloom { color: #f9a8d4; }
.gtp-stat span { font-size: 10px; color: var(--text-secondary); }

.gtp-anchors { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 11px; color: var(--text-secondary); }
.gtp-bar { flex: 1; height: 5px; border-radius: 999px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.gtp-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.4), var(--accent)); }

.gtp-block { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px dashed rgba(var(--accent-rgb), 0.12); }
.gtp-block-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.gtp-block-label { font-size: 12px; color: var(--text-secondary); letter-spacing: 0.5px; }
.gtp-select {
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  padding: 5px 8px;
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  max-width: 200px;
}
.gtp-select:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.25); }
.gtp-select option { background: #0a0906; color: var(--text-high); }

.gtp-empty { font-size: 12px; color: rgba(var(--text-primary-rgb), 0.3); font-style: italic; margin: 0; }

.gtp-ms-form { display: flex; gap: 6px; flex-wrap: wrap; }
.gtp-input {
  flex: 1; min-width: 100px;
  padding: 7px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.gtp-input:focus { border-color: rgba(var(--accent-rgb), 0.25); }
.gtp-input::placeholder { color: var(--text-dim); }
.gtp-input--date { flex: none; width: 140px; }

.gtp-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.gtp-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.3); }
.gtp-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.gtp-ms-list { display: flex; flex-direction: column; gap: 6px; }
.gtp-ms {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.07);
}
.gtp-ms.st-achieved { opacity: 0.7; border-color: rgba(138, 154, 122, 0.25); }
.gtp-ms.st-missed { opacity: 0.55; border-color: rgba(196, 106, 90, 0.25); }
.gtp-ms-icon { font-size: 14px; color: var(--accent); }
.gtp-ms.st-achieved .gtp-ms-icon { color: #8a9a7a; }
.gtp-ms.st-missed .gtp-ms-icon { color: #c46a5a; }
.gtp-ms-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.gtp-ms-label { font-size: 12px; color: var(--text-high); }
.gtp-ms.st-achieved .gtp-ms-label { text-decoration: line-through; color: var(--text-secondary); }
.gtp-ms-date { font-size: 10px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
.gtp-ms-actions { display: flex; gap: 4px; }
.gtp-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 8px; border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent; color: var(--text-secondary);
  font-size: 10px; font-family: inherit; cursor: pointer;

  min-height: 26px;
}
.gtp-mini--ok:hover { color: #8a9a7a; border-color: rgba(138, 154, 122, 0.4); }
.gtp-mini--miss:hover { color: #c46a5a; border-color: rgba(196, 106, 90, 0.4); }

.gtp-ms-progress { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--text-secondary); }

.gtp-log-list { display: flex; flex-direction: column; }
.gtp-log { display: flex; gap: 10px; }
.gtp-log-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.5);
  margin-top: 5px; flex-shrink: 0;
}
.gtp-log-main { flex: 1; padding-bottom: 10px; border-bottom: 1px solid rgba(var(--accent-rgb), 0.06); margin-bottom: 10px; }
.gtp-log:last-child .gtp-log-main { border-bottom: none; margin-bottom: 0; }
.gtp-log-head { display: flex; align-items: center; justify-content: space-between; }
.gtp-log-event { font-size: 12px; color: var(--text-high); }
.gtp-log-date { font-size: 10px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
.gtp-log-detail { margin: 3px 0 0; font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
.gtp-log-goal {
  display: inline-block; margin-top: 4px;
  font-size: 10px; padding: 1px 7px; border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08); color: var(--accent);
}
</style>
