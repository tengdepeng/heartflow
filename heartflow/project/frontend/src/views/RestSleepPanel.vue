<template>
  <div class="sleep-panel">
    <!-- ===== 睡眠质量仪表盘 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">睡眠仪表盘</h3>
      <div class="sleep-dashboard" v-if="report.totalDays > 0">
        <div class="sleep-stat-card">
          <span class="ssc-value">{{ Math.floor(report.avgDuration / 60) }}<span class="ssc-unit">h</span> {{ report.avgDuration % 60 }}<span class="ssc-unit">m</span></span>
          <span class="ssc-label">平均时长</span>
        </div>
        <div class="sleep-stat-card">
          <span class="ssc-value">{{ report.avgQuality }}<span class="ssc-unit">/5</span></span>
          <span class="ssc-label">睡眠质量</span>
        </div>
        <div class="sleep-stat-card">
          <span class="ssc-value">{{ report.sleepEfficiency }}<span class="ssc-unit">%</span></span>
          <span class="ssc-label">睡眠效率</span>
        </div>
        <div class="sleep-stat-card">
          <span class="ssc-value">{{ report.consistencyScore }}<span class="ssc-unit">分</span></span>
          <span class="ssc-label">规律性</span>
        </div>
        <div class="sleep-stat-card">
          <span class="ssc-value">{{ chronotypeLabel }}</span>
          <span class="ssc-label">睡眠类型</span>
        </div>
        <div class="sleep-stat-card" v-if="report.sleepDebt > 0">
          <span class="ssc-value ssc-value--warn">{{ Math.floor(report.sleepDebt / 60) }}<span class="ssc-unit">h</span></span>
          <span class="ssc-label">睡眠债务</span>
        </div>
      </div>
      <div v-else class="sleep-dashboard-empty">
        <span class="sde-icon">🌙</span>
        <p class="sde-text">开始记录你的睡眠，至少需要 3 天数据才能生成分析</p>
        <button class="sde-btn" @click="showSleepForm = true">记录今晚睡眠</button>
      </div>
    </section>

    <!-- ===== 周趋势 ===== -->
    <section v-if="report.weekTrend.length > 0" data-enter class="rest-section">
      <h3 class="section-label">周趋势</h3>
      <div class="sleep-trend">
        <div
          v-for="day in report.weekTrend"
          :key="day.date"
          class="sleep-trend-bar"
        >
          <div class="stb-bar-wrap">
            <div
              class="stb-bar"
              :style="{ height: (day.duration / 600 * 100) + '%' }"
            ></div>
          </div>
          <span class="stb-label">{{ formatDateLabel(day.date) }}</span>
          <span class="stb-hours">{{ Math.floor(day.duration / 60) }}h</span>
        </div>
      </div>
    </section>

    <!-- ===== 睡眠建议 ===== -->
    <section v-if="report.suggestions.length > 0" data-enter class="rest-section">
      <h3 class="section-label">改善建议</h3>
      <div class="sleep-suggestions">
        <div
          v-for="(s, idx) in report.suggestions"
          :key="idx"
          class="sleep-suggestion-card"
        >
          <span class="ssg-icon">{{ idx === 0 && report.suggestions.length === 1 && s.includes('良好') ? '✨' : '💡' }}</span>
          <span class="ssg-text">{{ s }}</span>
        </div>
      </div>
    </section>

    <!-- ===== 睡眠记录表单 ===== -->
    <section data-enter class="rest-section">
      <button
        class="rest-form-toggle"
        @click="showSleepForm = !showSleepForm"
        :class="{ 'rest-form-toggle--active': showSleepForm }"
      >
        <span class="rft-icon">{{ showSleepForm ? '−' : '+' }}</span>
        <span class="rft-text">{{ showSleepForm ? '收起' : '记录睡眠' }}</span>
      </button>
      <div v-if="showSleepForm" class="rest-form">
        <div class="rest-form-row">
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">入睡时间</label>
            <input v-model="newSleep.bedtime" type="time" class="rff-input" />
          </div>
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">起床时间</label>
            <input v-model="newSleep.wakeTime" type="time" class="rff-input" />
          </div>
        </div>
        <div class="rest-form-row">
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">睡眠质量</label>
            <div class="rff-mood-row">
              <button
                v-for="m in 5"
                :key="m"
                class="rff-mood-btn"
                :class="{ 'rff-mood-btn--active': newSleep.quality === m }"
                @click="newSleep.quality = m"
              >{{ m }}</button>
            </div>
          </div>
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">入睡耗时（分钟）</label>
            <input v-model.number="newSleep.sleepLatency" type="number" min="0" max="120" class="rff-input" />
          </div>
        </div>
        <div class="rest-form-row">
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">醒来感受</label>
            <select v-model="newSleep.wakeFeeling" class="rff-select">
              <option value="refreshed">精神饱满</option>
              <option value="ok">一般</option>
              <option value="groggy">昏沉</option>
              <option value="tired">疲惫</option>
            </select>
          </div>
          <div class="rest-form-field rest-form-field--half">
            <label class="rff-label">备注（可选）</label>
            <input v-model="newSleep.note" type="text" class="rff-input" placeholder="如：睡前喝了咖啡..." maxlength="60" />
          </div>
        </div>
        <div class="rest-form-actions">
          <button class="rfa-btn rfa-btn--primary" @click="addSleepRecord">保存</button>
          <button class="rfa-btn rfa-btn--cancel" @click="showSleepForm = false">取消</button>
        </div>
      </div>
    </section>

    <!-- ===== 近期睡眠记录 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">近期睡眠</h3>
      <div class="sleep-records">
        <div
          v-for="r in sleepQuality.recentRecords.value"
          :key="r.id"
          class="sleep-record-card"
        >
          <div class="src-left">
            <span class="src-date">{{ r.date.slice(5) }}</span>
            <span class="src-time">{{ formatTime(r.bedtime) }} → {{ formatTime(r.wakeTime) }}</span>
          </div>
          <div class="src-right">
            <span class="src-duration">{{ Math.floor(r.duration / 60) }}h{{ r.duration % 60 > 0 ? ' ' + r.duration % 60 + 'm' : '' }}</span>
            <span class="src-quality">{{ '★'.repeat(r.quality) }}{{ '☆'.repeat(5 - r.quality) }}</span>
            <button class="src-delete" @click="sleepQuality.deleteSleepRecord(r.id)" title="删除">✕</button>
          </div>
        </div>
        <div v-if="sleepQuality.recentRecords.value.length === 0" class="rest-recent-empty">
          <div class="rre-placeholder">
            <span class="rre-icon">🌙</span>
            <p class="rre-text">尚未记录睡眠数据</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 智能闹钟 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">智能闹钟</h3>
      <div class="sleep-alarms">
        <div
          v-for="alarm in sleepQuality.alarmConfigs.value"
          :key="alarm.id"
          class="sleep-alarm-card"
          :class="{ 'sleep-alarm-card--disabled': !alarm.enabled }"
        >
          <div class="sac-header">
            <span class="sac-icon">{{ alarm.type === 'wake' ? '⏰' : alarm.type === 'nap' ? '😴' : '🔔' }}</span>
            <span class="sac-label">{{ alarm.label }}</span>
            <button
              class="sac-toggle"
              :class="{ 'sac-toggle--on': alarm.enabled }"
              @click="sleepQuality.toggleAlarm(alarm.id)"
            >
              {{ alarm.enabled ? 'ON' : 'OFF' }}
            </button>
          </div>
          <div class="sac-body">
            <span class="sac-time">{{ alarm.targetWakeTime }}</span>
            <span class="sac-meta">{{ alarm.gradualLight > 0 ? '渐亮 ' + alarm.gradualLight + 'min' : '' }} · {{ soundThemeLabel(alarm.soundTheme) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 最佳起床时间 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">最佳作息计算器</h3>
      <div class="sleep-calculator">
        <div class="scalc-row">
          <div class="scalc-field">
            <label class="rff-label">计划入睡时间</label>
            <input v-model="calcBedtime" type="time" class="rff-input" @change="updateWakeTimes" />
          </div>
          <div class="scalc-results" v-if="wakeTimes.length > 0">
            <span class="scalc-label">建议起床时间：</span>
            <div class="scalc-times">
              <span v-for="(wt, i) in wakeTimes" :key="i" class="scalc-time-tag">
                {{ wt.time }} <small>({{ wt.cycles }}周期 / {{ wt.totalSleep }})</small>
              </span>
            </div>
          </div>
        </div>
        <div class="scalc-row">
          <div class="scalc-field">
            <label class="rff-label">目标起床时间</label>
            <input v-model="calcWakeTime" type="time" class="rff-input" @change="updateBedtimes" />
          </div>
          <div class="scalc-results" v-if="bedtimes.length > 0">
            <span class="scalc-label">建议入睡时间：</span>
            <div class="scalc-times">
              <span v-for="(bt, i) in bedtimes" :key="i" class="scalc-time-tag">
                {{ bt.time }} <small>({{ bt.cycles }}周期 / {{ bt.totalSleep }})</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 睡眠卫生检查表 ===== -->
    <section data-enter class="rest-section">
      <h3 class="section-label">
        睡眠卫生
        <span class="shs-score">{{ sleepQuality.calculateHygieneScore() }}分</span>
      </h3>
      <div class="sleep-hygiene">
        <div
          v-for="item in sleepQuality.hygieneItems.value"
          :key="item.id"
          class="shy-item"
          :class="{ 'shy-item--checked': item.checked }"
          role="checkbox"
          tabindex="0"
          :aria-checked="item.checked"
          :aria-label="'切换睡眠卫生项 ' + item.label"
          @click="sleepQuality.toggleHygieneItem(item.id)"
          @keydown.enter.prevent="sleepQuality.toggleHygieneItem(item.id)"
          @keydown.space.prevent="sleepQuality.toggleHygieneItem(item.id)"
        >
          <span class="shy-check">{{ item.checked ? '✓' : '○' }}</span>
          <div class="shy-content">
            <span class="shy-label">{{ item.label }}</span>
            <span class="shy-desc">{{ item.description }}</span>
          </div>
          <span class="shy-impact" :class="'shy-impact--' + item.impact">
            {{ item.impact === 'high' ? '高' : item.impact === 'medium' ? '中' : '低' }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSleepQuality } from '../modules/rest/sleep-quality'
import type { SleepRecord } from '../modules/rest/sleep-quality'

const sleepQuality = useSleepQuality()

onMounted(() => {
  sleepQuality.init()
})

// ---- 报告 ----
const report = computed(() => sleepQuality.analyzeSleepQuality(7))

const chronotypeLabel = computed(() => {
  const map: Record<string, string> = {
    early_bird: '早鸟型 🐦',
    night_owl: '夜猫型 🦉',
    balanced: '均衡型 ⚖️',
    irregular: '不规律',
  }
  return map[report.value.chronotype] || '未知'
})

// ---- 睡眠表单 ----
const showSleepForm = ref(false)
const newSleep = ref({
  bedtime: '23:00',
  wakeTime: '07:00',
  quality: 3,
  sleepLatency: 15,
  wakeFeeling: 'ok' as SleepRecord['wakeFeeling'],
  note: '',
})

function addSleepRecord() {
  const today = new Date().toISOString().split('T')[0]
  const bedtime = `${today}T${newSleep.value.bedtime}:00.000Z`
  const wakeTime = `${today}T${newSleep.value.wakeTime}:00.000Z`

  // 计算时长
  const bedMin = parseTimeToMinutes(newSleep.value.bedtime)
  let wakeMin = parseTimeToMinutes(newSleep.value.wakeTime)
  if (wakeMin <= bedMin) wakeMin += 24 * 60
  const duration = wakeMin - bedMin - newSleep.value.sleepLatency

  sleepQuality.addSleepRecord({
    date: today,
    bedtime,
    wakeTime,
    duration: Math.max(0, duration),
    quality: newSleep.value.quality,
    sleepLatency: newSleep.value.sleepLatency,
    interruptions: 0,
    wakeFeeling: newSleep.value.wakeFeeling,
    note: newSleep.value.note || undefined,
  })

  newSleep.value = { bedtime: '23:00', wakeTime: '07:00', quality: 3, sleepLatency: 15, wakeFeeling: 'ok', note: '' }
  showSleepForm.value = false
}

// ---- 工具函数 ----
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTime(iso: string): string {
  return iso.split('T')[1]?.slice(0, 5) || '—'
}

function formatDateLabel(date: string): string {
  const d = new Date(date)
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}/${d.getDate()} 周${days[d.getDay()]}`
}

function soundThemeLabel(theme: string): string {
  const map: Record<string, string> = { nature: '自然', gentle: '柔和', classic: '经典', energy: '活力' }
  return map[theme] || theme
}

// ---- 最佳作息计算器 ----
const calcBedtime = ref('23:00')
const calcWakeTime = ref('07:00')
const wakeTimes = ref<{ time: string; cycles: number; totalSleep: string }[]>([])
const bedtimes = ref<{ time: string; cycles: number; totalSleep: string }[]>([])

function updateWakeTimes() {
  wakeTimes.value = sleepQuality.calculateOptimalWakeTimes(calcBedtime.value)
}

function updateBedtimes() {
  bedtimes.value = sleepQuality.calculateOptimalBedtimes(calcWakeTime.value)
}

onMounted(() => {
  updateWakeTimes()
  updateBedtimes()
})
</script>

<style scoped>
/* ---- 睡眠仪表盘 ---- */
.sleep-dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.sleep-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  transition: all var(--transition);
}

.sleep-stat-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.ssc-value {
  font-size: 26px;
  font-weight: 300;
  color: var(--text-primary);
  letter-spacing: 1px;
  line-height: 1;
}

.ssc-value--warn {
  color: #e8a040;
}

.ssc-unit {
  font-size: 13px;
  opacity: 0.5;
}

.ssc-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.sleep-dashboard-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  text-align: center;
}

.sde-icon {
  font-size: 40px;
  opacity: 0.3;
}

.sde-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.sde-btn {
  padding: 8px 20px;
  background: rgba(122, 184, 122, 0.1);
  border: 1px solid rgba(122, 184, 122, 0.2);
  border-radius: 6px;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  letter-spacing: 0.5px;
}

.sde-btn:hover {
  background: rgba(122, 184, 122, 0.2);
  border-color: rgba(122, 184, 122, 0.35);
}

/* ---- 周趋势 ---- */
.sleep-trend {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  padding: 0 4px;
}

.sleep-trend-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}

.stb-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.stb-bar {
  width: 60%;
  max-width: 32px;
  min-height: 4px;
  background: linear-gradient(180deg, var(--accent), rgba(122, 184, 122, 0.3));
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
}

.stb-label {
  font-size: 9px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.stb-hours {
  font-size: 10px;
  color: var(--text-secondary);
}

/* ---- 睡眠建议 ---- */
.sleep-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sleep-suggestion-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  transition: all var(--transition);
}

.sleep-suggestion-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.ssg-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.ssg-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ---- 睡眠记录列表 ---- */
.sleep-records {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sleep-record-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  transition: all var(--transition);
  animation: rest-card-in 0.4s ease both;
}

.sleep-record-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.src-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.src-date {
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.src-time {
  font-size: 11px;
  color: var(--text-secondary);
}

.src-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.src-duration {
  font-size: 13px;
  color: var(--text-secondary);
}

.src-quality {
  font-size: 12px;
  color: #e8a040;
  letter-spacing: 1px;
}

.src-delete {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  opacity: 0.4;
  transition: opacity var(--transition);
}

.src-delete:hover {
  opacity: 1;
  color: #e06060;
}

/* ---- 智能闹钟 ---- */
.sleep-alarms {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sleep-alarm-card {
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  transition: all var(--transition);
}

.sleep-alarm-card--disabled {
  opacity: 0.5;
}

.sleep-alarm-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.sac-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.sac-icon {
  font-size: 18px;
}

.sac-label {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.sac-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-family: inherit;
  letter-spacing: 0.5px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--card-border);
  color: var(--text-secondary);
  transition: all var(--transition);

  min-height: 26px;
}

.sac-toggle--on {
  background: rgba(122, 184, 122, 0.15);
  border-color: rgba(122, 184, 122, 0.3);
  color: var(--accent);
}

.sac-body {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sac-time {
  font-size: 22px;
  font-weight: 300;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.sac-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

/* ---- 最佳作息计算器 ---- */
.sleep-calculator {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scalc-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scalc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 200px;
}

.scalc-results {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scalc-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.scalc-times {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.scalc-time-tag {
  padding: 4px 10px;
  background: rgba(122, 184, 122, 0.08);
  border: 1px solid rgba(122, 184, 122, 0.12);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.scalc-time-tag small {
  font-size: 10px;
  color: var(--text-secondary);
}

/* ---- 睡眠卫生 ---- */
.shs-score {
  font-size: 12px;
  color: var(--accent);
  margin-left: 8px;
  font-weight: 300;
}

.sleep-hygiene {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shy-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition);
}

.shy-item:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.shy-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: var(--card-hover-border);
}

.shy-item--checked {
  background: rgba(122, 184, 122, 0.06);
  border-color: rgba(122, 184, 122, 0.15);
}

.shy-check {
  font-size: 14px;
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.shy-item--checked .shy-check {
  color: var(--accent);
}

.shy-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.shy-label {
  font-size: 12px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.shy-item--checked .shy-label {
  text-decoration: line-through;
  opacity: 0.6;
}

.shy-desc {
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.3;
}

.shy-impact {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.shy-impact--high {
  background: rgba(224, 96, 96, 0.1);
  color: #e06060;
}

.shy-impact--medium {
  background: rgba(232, 160, 64, 0.1);
  color: #e8a040;
}

.shy-impact--low {
  background: rgba(122, 184, 122, 0.1);
  color: var(--accent);
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .sleep-dashboard {
    grid-template-columns: repeat(2, 1fr);
  }

  .sleep-trend {
    height: 80px;
  }

  .scalc-row {
    flex-direction: column;
  }
}
</style>