<template>
  <section class="sdp">
    <div class="sdp-head">
      <span class="sdp-title">🌱 蜕变光茧</span>
      <span class="sdp-sub">记录每一次成长阶段的蜕壳</span>
    </div>

    <!-- 光茧概览 -->
    <div class="sdp-stats" v-if="stats.total > 0">
      <div class="sdp-stat"><b>{{ stats.total }}</b><span>光茧</span></div>
      <div class="sdp-stat"><b>{{ stats.completed }}</b><span>已化蝶</span></div>
      <div class="sdp-stat"><b>{{ stats.active }}</b><span>蜕变中</span></div>
      <div class="sdp-stat"><b>{{ Math.round(stats.avgTransitions * 10) / 10 }}</b><span>均蜕变次</span></div>
    </div>

    <!-- 阶段分布 -->
    <div class="sdp-stages" v-if="stats.total > 0">
      <div v-for="s in stats.byStage" :key="s.stage" class="sdp-stage">
        <span class="sdp-stage-dot" :style="{ background: s.color }"></span>
        <span class="sdp-stage-label">{{ s.label }}</span>
        <span class="sdp-stage-count">{{ s.count }}</span>
      </div>
    </div>

    <!-- 光茧列表 -->
    <div class="sdp-cocoons">
      <div v-for="c in cocoons" :key="c.id" class="sdp-cocoon">
        <div class="sdp-cocoon-head">
          <span class="sdp-cocoon-stage">{{ stageIcon(c.stage) }}</span>
          <span class="sdp-cocoon-name">{{ c.name }}</span>
          <span class="sdp-cocoon-season">{{ seasonLabel(c.season) }}</span>
        </div>
        <div class="sdp-cocoon-meta" v-if="c.drivingForce">
          <span class="sdp-drive" :style="{ color: driveColor(c.drivingForce) }">
            {{ driveLabel(c.drivingForce) }}
          </span>
        </div>
        <div class="sdp-cocoon-actions">
          <button
            v-for="next in nextStages(c.stage)"
            :key="next"
            class="sdp-advance"
            @click="onAdvance(c.id, next)"
          >→ {{ stageLabel(next) }}</button>
          <button v-if="c.stage !== 'gestating'" class="sdp-regress" @click="onRegress(c.id)">↺ 回退</button>
          <button class="sdp-del" @click="onRemove(c.id)">×</button>
        </div>
      </div>
      <p v-if="cocoons.length === 0" class="sdp-empty">还没有光茧，记录一个正在成长的蜕变目标</p>
    </div>

    <!-- 创建光茧 -->
    <div class="sdp-form">
      <input v-model="newName" class="sdp-input" placeholder="光茧名称，如：学会非线性代数" @keyup.enter="submit" />
      <select v-model="newForce" class="sdp-select">
        <option disabled value="">驱动力…</option>
        <option v-for="(label, key) in DRIVES" :key="key" :value="key">{{ label }}</option>
      </select>
      <button class="sdp-submit" @click="submit" :disabled="!newName.trim()">孕育光茧</button>
    </div>

    <template v-if="journalEntries.length > 0 || yearReview">
      <div class="sdp-divider"></div>
      <div class="sdp-subhead">
        <span class="sdp-title">📓 季节日志</span>
      </div>
      <div class="sdp-journals">
        <div v-for="e in journalEntries" :key="e.id" class="sdp-journal">
          <div class="sdp-journal-head">
            <span class="sdp-mood">{{ moodIcon(e.mood) }}</span>
            <span class="sdp-journal-title">{{ e.title }}</span>
            <span class="sdp-journal-season">{{ seasonLabel(e.season) }} {{ e.year }}</span>
          </div>
          <p class="sdp-journal-content">{{ e.content }}</p>
        </div>
      </div>

      <div v-if="yearReview" class="sdp-review">
        <div class="sdp-review-head">
          <span class="sdp-review-year">{{ yearReview.year }} 年度回顾</span>
          <span class="sdp-review-theme">{{ yearReview.yearTheme }}</span>
        </div>
        <div class="sdp-review-rows">
          <div v-for="s in yearReview.seasons" :key="s.season" class="sdp-review-season">
            <span>{{ seasonLabel(s.season) }}</span>
            <span>{{ s.dominantMood }}</span>
            <span>{{ s.entryCount }}篇</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 创建日志 -->
    <div class="sdp-divider"></div>
    <div class="sdp-subhead">
      <span class="sdp-title">✍️ 写一篇季节日志</span>
    </div>
    <div class="sdp-form sdp-form--col">
      <input v-model="logTitle" class="sdp-input" placeholder="标题" />
      <textarea v-model="logContent" class="sdp-textarea" rows="3" placeholder="记录此刻的感受…"></textarea>
      <select v-model="logMood" class="sdp-select">
        <option v-for="(label, key) in MOODS" :key="key" :value="key">{{ label }}</option>
      </select>
      <button class="sdp-submit" @click="submitJournal" :disabled="!logTitle.trim()">留下一篇日志</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Cocoon, CocoonStage } from '../modules/seasonal'
import {
  COCOON_STAGE_LABELS,
  COCOON_STAGE_ICONS,
} from '../modules/seasonal'
import type { DrivingForce } from '../modules/seasonal/cocoon'
import { DRIVING_FORCE_LABELS, DRIVING_FORCE_COLORS } from '../modules/seasonal/cocoon'
import type { SeasonalJournalEntry, YearReview } from '../modules/seasonal'
import type { CocoonStats } from '../modules/seasonal'

defineProps<{
  cocoons: Cocoon[]
  stats: CocoonStats
  journalEntries: SeasonalJournalEntry[]
  yearReview: YearReview | null
  season: string
}>()

const emit = defineEmits<{
  (e: 'advance', id: string, to: CocoonStage): void
  (e: 'regress', id: string): void
  (e: 'remove', id: string): void
  (e: 'create', name: string, force: DrivingForce): void
  (e: 'journal', title: string, content: string, mood: SeasonalJournalEntry['mood']): void
}>()

const DRIVES = DRIVING_FORCE_LABELS as Record<string, string>
const MOODS: Record<SeasonalJournalEntry['mood'], string> = {
  excited: '兴奋', peaceful: '平静', reflective: '沉思',
  melancholic: '感伤', energetic: '充满活力', tired: '疲惫',
}

const newName = ref('')
const newForce = ref<DrivingForce>('for_goal')
const logTitle = ref('')
const logContent = ref('')
const logMood = ref<SeasonalJournalEntry['mood']>('reflective')

function submit() {
  const name = newName.value.trim()
  if (!name) return
  emit('create', name, newForce.value)
  newName.value = ''
}

function submitJournal() {
  if (!logTitle.value.trim()) return
  emit('journal', logTitle.value.trim(), logContent.value.trim(), logMood.value)
  logTitle.value = ''
  logContent.value = ''
}

function stageLabel(s: CocoonStage): string { return COCOON_STAGE_LABELS[s] }
function stageIcon(s: CocoonStage): string { return COCOON_STAGE_ICONS[s] }
function nextStages(s: CocoonStage): CocoonStage[] {
  const map: Record<CocoonStage, CocoonStage[]> = {
    gestating: ['cracking'], cracking: ['emerging'], emerging: ['flying'], flying: [],
  }
  return map[s] || []
}
function seasonLabel(s: string): string {
  const labels: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
  return labels[s] || s
}
function driveLabel(f: DrivingForce): string { return DRIVING_FORCE_LABELS[f] }
function driveColor(f: DrivingForce): string { return DRIVING_FORCE_COLORS[f] }
function moodIcon(m: SeasonalJournalEntry['mood']): string {
  const icons: Record<SeasonalJournalEntry['mood'], string> = {
    excited: '🎉', peaceful: '😌', reflective: '🤔', melancholic: '😢', energetic: '⚡', tired: '😴',
  }
  return icons[m]
}

function onAdvance(id: string, to: CocoonStage) { emit('advance', id, to) }
function onRegress(id: string) { emit('regress', id) }
function onRemove(id: string) { emit('remove', id) }
</script>

<style scoped>
.sdp {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 24px auto 0;
  padding: 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.sdp-head, .sdp-subhead {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.sdp-title { font-size: 15px; font-weight: 500; color: var(--accent); }
.sdp-sub { font-size: 11px; color: var(--text-faint); }
.sdp-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.sdp-stat { flex: 1 1 80px; padding: 10px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.03); border: 1px solid rgba(var(--accent-rgb), 0.06); display: flex; flex-direction: column; align-items: center; gap: 2px; }
.sdp-stat b { font-size: 16px; color: var(--text-bright); }
.sdp-stat span { font-size: 11px; color: var(--text-low); }
.sdp-stages { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.sdp-stage { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-low); }
.sdp-stage-dot { width: 8px; height: 8px; border-radius: 50%; }
.sdp-stage-count { color: var(--text-bright); }
.sdp-cocoons { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.sdp-cocoon { border: 1px solid rgba(var(--accent-rgb), 0.08); border-radius: 10px; padding: 10px 12px; background: rgba(var(--accent-rgb), 0.02); }
.sdp-cocoon-head { display: flex; align-items: center; gap: 8px; }
.sdp-cocoon-stage { font-size: 14px; }
.sdp-cocoon-name { font-size: 13px; color: var(--text-bright); flex: 1; }
.sdp-cocoon-season { font-size: 10px; color: var(--text-faint); padding: 1px 6px; border-radius: 4px; background: rgba(var(--accent-rgb), 0.05); }
.sdp-cocoon-meta { margin-top: 4px; }
.sdp-drive { font-size: 10px; }
.sdp-cocoon-actions { display: flex; gap: 6px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
.sdp-advance {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: transparent;
  color: var(--accent);
  border-radius: 7px;
  padding: 3px 10px;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;

  min-height: 26px;
}
.sdp-advance:hover { background: rgba(var(--accent-rgb), 0.06); }
.sdp-regress { border: none; background: transparent; color: var(--text-low); font-size: 11px; cursor: pointer; font-family: inherit; }
.sdp-del { border: none; background: transparent; color: var(--text-faint); font-size: 14px; cursor: pointer; margin-left: auto; }
.sdp-empty { font-size: 12px; color: var(--text-faint); padding: 4px 0; }
.sdp-form { display: flex; gap: 8px; margin-bottom: 12px; }
.sdp-form--col { flex-direction: column; }
.sdp-input, .sdp-select, .sdp-textarea {
  padding: 7px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-bright);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.sdp-input { flex: 1; }
.sdp-select { min-width: 120px;
}
.sdp-textarea { resize: vertical; font-family: inherit; }
.sdp-submit {
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  padding: 7px 16px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.sdp-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.sdp-divider { height: 1px; background: rgba(var(--accent-rgb), 0.08); margin: 16px 0; }
.sdp-journals { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.sdp-journal { border-left: 2px solid rgba(var(--accent-rgb), 0.3); padding: 6px 12px; }
.sdp-journal-head { display: flex; align-items: center; gap: 8px; }
.sdp-mood { font-size: 13px; }
.sdp-journal-title { font-size: 13px; color: var(--text-bright); flex: 1; }
.sdp-journal-season { font-size: 10px; color: var(--text-faint); }
.sdp-journal-content { font-size: 12px; color: var(--text-low); margin-top: 4px; }
.sdp-review { border-radius: 10px; background: rgba(var(--accent-rgb), 0.03); padding: 12px; }
.sdp-review-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.sdp-review-year { font-size: 12px; color: var(--accent); }
.sdp-review-theme { font-size: 12px; color: var(--text-low); }
.sdp-review-rows { display: flex; gap: 10px; flex-wrap: wrap; }
.sdp-review-season { display: flex; gap: 8px; font-size: 11px; color: var(--text-low); background: rgba(var(--accent-rgb), 0.04); padding: 3px 8px; border-radius: 6px; }
</style>