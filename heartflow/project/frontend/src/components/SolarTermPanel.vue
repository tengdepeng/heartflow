<template>
  <section class="st">
    <div class="st-head">
      <span class="st-title">☀️ 节气养生</span>
      <span class="st-sub">知源中医「节气养生提醒」借鉴 · 二十四节气养生日历</span>
    </div>

    <!-- ===== 当前节气 ===== -->
    <div class="st-current" :style="{ '--season-color': seasonColor }">
      <div class="st-current-head">
        <span class="st-current-icon">{{ seasonIcon }}</span>
        <div class="st-current-info">
          <span class="st-current-name">{{ insight.current.name }}</span>
          <span class="st-current-meta">
            {{ insight.current.month }}月{{ insight.current.day }}日 · {{ insight.current.season }}季 · {{ insight.current.sixQi }} · 五行属{{ insight.current.element }}
          </span>
        </div>
        <button
          class="st-checkin"
          :class="{ on: checkedIn }"
          @click="toggleCheckIn"
        >{{ checkedIn ? '✓ 已打卡' : '打卡' }}</button>
      </div>
      <p class="st-current-theme">{{ insight.current.theme }}</p>
      <p v-if="insight.transition" class="st-transition">🌗 {{ insight.transition }}</p>
      <p v-if="insight.next" class="st-next">下一节气：{{ insight.next.name }}（约 {{ insight.next.month }}月{{ insight.next.day }}日）</p>
    </div>

    <!-- ===== 节气打卡统计 ===== -->
    <div v-if="checkInStats.total > 0" class="st-stats">
      <span class="st-stats-item">今年已打卡 <strong>{{ checkInStats.total }}</strong> 个节气</span>
      <span class="st-stats-item">完成养生 <strong>{{ checkInStats.done }}</strong> 次</span>
      <div class="st-stats-bar">
        <div class="st-stats-fill" :style="{ width: Math.min(checkInStats.total / 24 * 100, 100) + '%' }"></div>
      </div>
    </div>

    <!-- ===== 当前节气养生建议 ===== -->
    <div class="st-card">
      <div class="st-card-head">
        <span class="st-card-title">🌿 {{ insight.current.name }}养生</span>
      </div>
      <div class="st-block">
        <h5 class="st-block-title">饮食</h5>
        <ul class="st-list">
          <li v-for="(d, i) in insight.current.diet" :key="i">{{ d }}</li>
        </ul>
      </div>
      <div class="st-block">
        <h5 class="st-block-title">运动</h5>
        <ul class="st-list">
          <li v-for="(e, i) in insight.current.exercise" :key="i">{{ e }}</li>
        </ul>
      </div>
      <div class="st-block">
        <h5 class="st-block-title">穴位</h5>
        <ul class="st-list">
          <li v-for="(p, i) in insight.current.acupressure" :key="i">{{ p.point }}（{{ p.location }}）· {{ p.benefit }}</li>
        </ul>
      </div>
      <div class="st-block">
        <h5 class="st-block-title">起居</h5>
        <ul class="st-list">
          <li v-for="(l, i) in insight.current.lifestyle" :key="i">{{ l }}</li>
        </ul>
      </div>
      <div class="st-block">
        <h5 class="st-block-title">情志</h5>
        <ul class="st-list">
          <li v-for="(m, i) in insight.current.emotional" :key="i">{{ m }}</li>
        </ul>
      </div>
      <div class="st-block st-block--taboo">
        <h5 class="st-block-title">禁忌</h5>
        <ul class="st-list">
          <li v-for="(t, i) in insight.current.taboo" :key="i">{{ t }}</li>
        </ul>
      </div>
    </div>

    <!-- ===== 节气日历 ===== -->
    <div class="st-card">
      <div class="st-card-head">
        <span class="st-card-title">📅 二十四节气日历</span>
        <span class="st-card-meta">当前：{{ insight.current.name }}</span>
      </div>
      <div class="st-calendar">
        <div
          v-for="term in calendar"
          :key="term.name"
          class="st-term"
          :class="{
            current: term.name === insight.current.name,
            checked: term.checked,
          }"
          :style="{ '--term-color': SOLAR_SEASON_META[term.season].color }"
        >
          <span class="st-term-icon">{{ SOLAR_SEASON_META[term.season].icon }}</span>
          <span class="st-term-name">{{ term.name }}</span>
          <span class="st-term-date">{{ term.month }}/{{ term.day }}</span>
          <span v-if="term.checked" class="st-term-check">✓</span>
        </div>
      </div>
    </div>

    <!-- ===== 打卡记录 ===== -->
    <div v-if="checkInStats.records.length" class="st-card">
      <div class="st-card-head">
        <span class="st-card-title">🗂 今年打卡记录</span>
      </div>
      <div v-for="c in recentCheckIns" :key="c.term" class="st-checkin-row">
        <span class="st-checkin-term">{{ c.term }}</span>
        <span class="st-checkin-note">{{ c.note || '完成节气养生' }}</span>
        <span class="st-checkin-date">{{ c.checkedAt.slice(0, 10) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SOLAR_TERM_WELLNESS,
  SOLAR_SEASON_META,
  solarTermInsights,
  getSolarTermStore,
} from '../modules/body-wisdom/solar-term'

const store = getSolarTermStore()

const insight = computed(() => solarTermInsights(new Date()))
const checkedIn = computed(() => store.isCheckedIn(insight.value.current.name))

const seasonIcon = computed(() => SOLAR_SEASON_META[insight.value.current.season].icon)
const seasonColor = computed(() => SOLAR_SEASON_META[insight.value.current.season].color)

const checkInStats = computed(() => store.checkInStats.value)
const recentCheckIns = computed(() => store.checkIns.value.slice(-8).reverse())

const calendar = computed(() =>
  SOLAR_TERM_WELLNESS.map(t => ({
    ...t,
    checked: store.isCheckedIn(t.name),
  })),
)

const note = ref('')
function toggleCheckIn(): void {
  const term = insight.value.current.name
  if (checkedIn.value) {
    // 已打卡则取消（简单处理：删除该记录）
    store.checkIn(term, '', false)
  } else {
    store.checkIn(term, note.value, true)
  }
}
</script>

<style scoped>
.st {
  margin-bottom: 56px;
  position: relative;
  z-index: 1;
}

.st-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.st-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  letter-spacing: 0.5px;
}
.st-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

/* ---- 当前节气 ---- */
.st-current {
  margin-bottom: 14px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.5), rgba(26, 22, 18, 0.7));
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--season-color, var(--accent));
}
.st-current-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.st-current-icon {
  font-size: 26px;
  flex-shrink: 0;
}
.st-current-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.st-current-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
}
.st-current-meta {
  font-size: 11px;
  color: var(--text-secondary);
}
.st-checkin {
  flex-shrink: 0;
  padding: 7px 14px;
  font-size: 11px;
  font-family: inherit;
  font-weight: 500;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  cursor: pointer;
  transition: all var(--transition);
}
.st-checkin:hover {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: rgba(var(--accent-rgb), 0.45);
}
.st-checkin.on {
  background: rgba(138, 154, 122, 0.14);
  border-color: rgba(138, 154, 122, 0.35);
  color: #8a9a7a;
}
.st-current-theme {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.6;
}
.st-transition {
  margin: 0 0 6px;
  font-size: 12px;
  color: #f0a050;
  line-height: 1.6;
}
.st-next {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
}

/* ---- 打卡统计 ---- */
.st-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.st-stats-item {
  font-size: 11px;
  color: var(--text-secondary);
}
.st-stats-item strong {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.st-stats-bar {
  flex: 1;
  min-width: 80px;
  height: 5px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.st-stats-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.4), var(--accent));
  transition: width var(--transition);
}

/* ---- 卡片 ---- */
.st-card {
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
}
.st-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.st-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.st-card-meta {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-secondary);
}

.st-block {
  margin-bottom: 10px;
}
.st-block:last-child {
  margin-bottom: 0;
}
.st-block--taboo {
  padding-top: 10px;
  border-top: 1px dashed var(--border-color);
}
.st-block-title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 1px;
}
.st-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.st-list li {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  padding-left: 14px;
  position: relative;
}
.st-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.5);
}
.st-block--taboo .st-list li::before {
  background: rgba(200, 120, 100, 0.6);
}

/* ---- 节气日历 ---- */
.st-calendar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.st-term {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}
.st-term:hover {
  border-color: var(--term-color, var(--border-color));
}
.st-term.current {
  border-color: var(--term-color, var(--accent));
  background: rgba(var(--accent-rgb), 0.1);
  box-shadow: 0 0 0 1px var(--term-color, var(--accent));
}
.st-term.checked {
  opacity: 0.75;
}
.st-term-icon {
  font-size: 15px;
}
.st-term-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.st-term-date {
  font-size: 9px;
  color: var(--text-secondary);
}
.st-term-check {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 10px;
  color: #8a9a7a;
}

/* ---- 打卡记录 ---- */
.st-checkin-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 12px;
}
.st-checkin-term {
  width: 44px;
  flex-shrink: 0;
  font-weight: 500;
  color: var(--text-primary);
}
.st-checkin-note {
  flex: 1;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.st-checkin-date {
  font-size: 10px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .st-calendar {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
