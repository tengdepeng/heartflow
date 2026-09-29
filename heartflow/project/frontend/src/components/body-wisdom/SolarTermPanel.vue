<template>
  <section class="stp" aria-label="节气养生">
    <div class="stp-head">
      <span class="stp-title">☀️ 节气养生</span>
      <span class="stp-sub">二十四节气养生日历 · 当前节气建议 · 节气打卡</span>
    </div>

    <!-- 当前节气 -->
    <div class="stp-block">
      <span class="stp-block-label">当前节气</span>
      <div class="stp-current">
        <span class="stp-season-icon">{{ seasonMeta.icon }}</span>
        <div class="stp-current-body">
          <strong class="stp-current-name">{{ current.name }} · {{ current.season }}季</strong>
          <span class="stp-current-theme">{{ current.theme }}</span>
          <span class="stp-current-meta">六气 {{ current.sixQi }} · 五行属{{ current.element }}</span>
        </div>
        <span v-if="next" class="stp-days">距{{ next.name }} {{ daysToNext }} 天</span>
      </div>
      <p v-if="insights.transition" class="stp-transition">{{ insights.transition }}</p>
      <div class="stp-highlights">
        <span v-for="h in insights.highlights" :key="h" class="stp-highlight">{{ h }}</span>
      </div>
    </div>

    <!-- 养生建议 -->
    <div class="stp-block">
      <span class="stp-block-label">养生建议 · {{ current.name }}</span>
      <div class="stp-advice">
        <div class="stp-advice-item">
          <span class="stp-advice-icon">🥗</span>
          <div class="stp-advice-body">
            <strong class="stp-advice-title">饮食</strong>
            <p v-for="d in current.diet" :key="d" class="stp-advice-line">{{ d }}</p>
          </div>
        </div>
        <div class="stp-advice-item">
          <span class="stp-advice-icon">🏃</span>
          <div class="stp-advice-body">
            <strong class="stp-advice-title">运动</strong>
            <p v-for="e in current.exercise" :key="e" class="stp-advice-line">{{ e }}</p>
          </div>
        </div>
        <div class="stp-advice-item">
          <span class="stp-advice-icon">💆</span>
          <div class="stp-advice-body">
            <strong class="stp-advice-title">穴位</strong>
            <p v-for="a in current.acupressure" :key="a.point" class="stp-advice-line">
              {{ a.point }} · {{ a.location }} · {{ a.benefit }}
            </p>
          </div>
        </div>
        <div class="stp-advice-item">
          <span class="stp-advice-icon">🛏</span>
          <div class="stp-advice-body">
            <strong class="stp-advice-title">起居</strong>
            <p v-for="l in current.lifestyle" :key="l" class="stp-advice-line">{{ l }}</p>
          </div>
        </div>
        <div class="stp-advice-item">
          <span class="stp-advice-icon">🧘</span>
          <div class="stp-advice-body">
            <strong class="stp-advice-title">情志</strong>
            <p v-for="e in current.emotional" :key="e" class="stp-advice-line">{{ e }}</p>
          </div>
        </div>
        <div class="stp-advice-item">
          <span class="stp-advice-icon">🚫</span>
          <div class="stp-advice-body">
            <strong class="stp-advice-title">禁忌</strong>
            <p v-for="t in current.taboo" :key="t" class="stp-advice-line">{{ t }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 节气打卡 -->
    <div class="stp-block">
      <span class="stp-block-label">节气打卡 · 今年 {{ stats.total }} 次</span>
      <div class="stp-checkin-row">
        <button
          class="stp-checkin-btn"
          :class="{ done: checkedIn }"
          :disabled="checkedIn"
          @click="toggleCheckIn"
        >
          {{ checkedIn ? '✅ 已打卡 ' + current.name : '☑ 打卡 ' + current.name }}
        </button>
        <input v-model="checkInNote" class="stp-input" placeholder="打卡备注（可选）" />
      </div>
      <div v-if="stats.records.length" class="stp-checkin-list">
        <div v-for="r in stats.records" :key="r.term" class="stp-checkin">
          <span class="stp-checkin-term">{{ r.term }}</span>
          <span class="stp-checkin-note">{{ r.note || '已打卡' }}</span>
          <span class="stp-checkin-time">{{ fmtDate(r.checkedAt) }}</span>
        </div>
      </div>
      <p v-else class="stp-empty">今年还没有节气打卡，从 {{ current.name }} 开始记录吧。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getSolarTermStore } from '../../modules/body-wisdom/solar-term'
import {
  getCurrentSolarTerm,
  getNextSolarTerm,
  daysToNextSolarTerm,
  solarTermInsights,
  SOLAR_SEASON_META,
} from '../../modules/body-wisdom/solar-term'

const store = getSolarTermStore()

const current = getCurrentSolarTerm()
const next = getNextSolarTerm(current.name)
const daysToNext = daysToNextSolarTerm(current.name)
const insights = solarTermInsights()
const seasonMeta = SOLAR_SEASON_META[current.season]

const checkInNote = ref('')
const checkedIn = computed(() => store.isCheckedIn(current.name))
const stats = computed(() => store.checkInStats.value)

function toggleCheckIn() {
  if (checkedIn.value) return
  store.checkIn(current.name, checkInNote.value.trim())
  checkInNote.value = ''
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.stp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border, rgba(120, 140, 120, 0.25));
  border-radius: 12px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
}
.stp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #e8ece4);
}
.stp-sub {
  font-size: 12px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.stp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.stp-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent, #d4a574);
}
.stp-current {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stp-season-icon {
  font-size: 28px;
}
.stp-current-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.stp-current-name {
  font-size: 14px;
  color: var(--text, #e8ece4);
}
.stp-current-theme,
.stp-current-meta {
  font-size: 12px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.stp-days {
  font-size: 12px;
  color: var(--accent, #d4a574);
  white-space: nowrap;
}
.stp-transition {
  font-size: 12px;
  color: #c46a5a;
}
.stp-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.stp-highlight {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.15);
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.stp-advice {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stp-advice-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.stp-advice-icon {
  font-size: 16px;
}
.stp-advice-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stp-advice-title {
  font-size: 12px;
  color: var(--text, #e8ece4);
}
.stp-advice-line {
  font-size: 12px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
  margin: 0;
}
.stp-checkin-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.stp-checkin-btn {
  padding: 6px 12px;
  border: 1px solid rgba(138, 154, 122, 0.4);
  border-radius: 8px;
  background: transparent;
  color: var(--accent, #d4a574);
  font-size: 12px;
  cursor: pointer;
}
.stp-checkin-btn.done {
  border-color: rgba(138, 154, 122, 0.6);
  background: rgba(138, 154, 122, 0.15);
}
.stp-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid rgba(120, 140, 120, 0.25);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text, #e8ece4);
  font-size: 12px;
}
.stp-checkin-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stp-checkin {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}
.stp-checkin-term {
  color: var(--accent, #d4a574);
  min-width: 48px;
}
.stp-checkin-note {
  color: var(--text, #e8ece4);
  flex: 1;
}
.stp-checkin-time {
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
}
.stp-empty {
  font-size: 12px;
  color: var(--text-dim, rgba(232, 224, 216, 0.48));
  margin: 0;
}
</style>
