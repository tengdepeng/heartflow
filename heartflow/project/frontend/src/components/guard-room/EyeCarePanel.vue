<template>
  <div data-enter class="guard-tab-content">
    <!-- 日出日落自动启停 -->
    <section class="guard-section">
      <h3 class="section-label">日出日落自动启停</h3>
      <p class="setting-hint">
        借鉴「夜间模式 / 暮光」：按日出日落自动开启 / 关闭护眼，经纬度本地计算，零网络依赖。
      </p>

      <div class="setting-row">
        <span>自动启停</span>
        <label class="toggle">
          <input type="checkbox" :checked="autoEnabled" @change="toggleAuto" />
          <span class="toggle-slider" />
        </label>
      </div>

      <!-- 定位状态 -->
      <div class="sun-loc-row">
        <span class="sun-loc-label">
          {{ hasLocation ? `已定位 · ${latText}` : '未定位 · 使用自定义时间' }}
        </span>
        <button v-if="!hasLocation" class="guard-btn" @click="requestLocation">📍 定位</button>
        <button v-else class="guard-btn" @click="clearLoc">清除定位</button>
      </div>
      <p v-if="locError" class="sun-loc-error">{{ locError }}</p>

      <!-- 今日日出日落与倒计时 -->
      <div v-if="hasLocation" class="sun-times">
        <div class="sun-time-item">
          <span class="sun-time-icon">🌅</span>
          <span class="sun-time-label">日出</span>
          <span class="sun-time-value">{{ fmtTime(todayTimes?.sunrise) }}</span>
        </div>
        <div class="sun-time-item">
          <span class="sun-time-icon">🌇</span>
          <span class="sun-time-label">日落</span>
          <span class="sun-time-value">{{ fmtTime(todayTimes?.sunset) }}</span>
        </div>
        <div class="sun-time-item">
          <span class="sun-time-icon">⏳</span>
          <span class="sun-time-label">下次切换</span>
          <span class="sun-time-value">{{ fmtCountdown(minutesToNext) }}</span>
        </div>
      </div>

      <!-- 当前相位 -->
      <div v-if="autoEnabled" class="sun-phase" :class="`phase-${phaseClass}`">
        <span class="sun-phase-dot"></span>
        <span>{{ phaseLabel }}</span>
        <span class="sun-phase-action">{{ autoActive ? '护眼已自动开启' : '护眼待自动开启' }}</span>
      </div>

      <!-- 自定义时间回退 -->
      <div class="sun-custom">
        <span class="sun-custom-label">无定位时自定义夜间</span>
        <div class="sun-custom-inputs">
          <input
            class="guard-input sun-time-input"
            type="time"
            :value="customStart"
            @change="onCustomStart($event)"
          />
          <span class="sun-custom-sep">至</span>
          <input
            class="guard-input sun-time-input"
            type="time"
            :value="customEnd"
            @change="onCustomEnd($event)"
          />
        </div>
      </div>

      <!-- 夜间自动套用预设 -->
      <div class="sun-preset">
        <span class="sun-preset-label">夜间自动套用</span>
        <div class="sun-preset-chips">
          <button
            v-for="p in EYE_PRESETS"
            :key="p.id"
            class="sun-preset-chip"
            :class="{ active: autoPreset === p.id }"
            @click="setAutoPreset(p.id)"
          >
            <span class="sun-preset-icon">{{ p.icon }}</span>
            <span class="sun-preset-name">{{ p.label }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 护眼模式 -->
    <section class="guard-section">
      <h3 class="section-label">护眼模式</h3>
      <p class="setting-hint">
        借鉴「夜间模式 / 暮光」：蓝光过滤、灰度、超低亮度多重叠加，全部本地计算，不离开设备。
      </p>

      <div class="setting-row">
        <span>护眼总开关</span>
        <label class="toggle">
          <input type="checkbox" :checked="enabled" @change="toggleEnabled" />
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="eye-sliders">
        <div class="eye-slider-row">
          <span class="eye-slider-label">蓝光过滤 <em>{{ blueLight }}%</em></span>
          <input
            type="range" min="0" max="100" :value="blueLight"
            @input="setBlueLight(Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="eye-slider-row">
          <span class="eye-slider-label">灰度模式 <em>{{ grayscale }}%</em></span>
          <input
            type="range" min="0" max="100" :value="grayscale"
            @input="setGrayscale(Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="eye-slider-row">
          <span class="eye-slider-label">亮度遮罩 <em>{{ brightness }}%</em></span>
          <input
            type="range" min="0" max="80" :value="brightness"
            @input="setBrightness(Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </div>

      <div class="eye-presets">
        <button
          v-for="p in EYE_PRESETS"
          :key="p.id"
          class="eye-preset-btn"
          @click="applyPreset(p.id)"
        >
          <span class="eye-preset-icon">{{ p.icon }}</span>
          <span class="eye-preset-label">{{ p.label }}</span>
        </button>
        <button class="eye-preset-btn reset" @click="reset">
          <span class="eye-preset-icon">✕</span>
          <span class="eye-preset-label">还原</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useEyeCare, EYE_PRESETS } from '../../modules/guard/eye-care'
import { useSunSchedule } from '../../modules/guard/sun-schedule'

const {
  enabled,
  blueLight,
  grayscale,
  brightness,
  load,
  toggleEnabled,
  setBlueLight,
  setGrayscale,
  setBrightness,
  applyPreset,
  reset,
} = useEyeCare()

const sun = useSunSchedule()

const locError = ref('')

const autoEnabled = computed(() => sun.state.value.autoEnabled)
const autoPreset = computed(() => sun.state.value.autoPreset)
const hasLocation = computed(() => sun.state.value.lat !== null && sun.state.value.lng !== null)
const latText = computed(() =>
  hasLocation.value
    ? `${sun.state.value.lat!.toFixed(2)}, ${sun.state.value.lng!.toFixed(2)}`
    : ''
)
const customStart = computed(() => sun.state.value.customNightStart ?? '20:00')
const customEnd = computed(() => sun.state.value.customNightEnd ?? '06:00')
const todayTimes = computed(() => sun.todayTimes())
const minutesToNext = computed(() => sun.minutesToNext())
const autoActive = computed(() => sun.shouldEnableEyeCare())

const phaseClass = computed(() => {
  if (!hasLocation.value) return 'custom'
  const t = todayTimes.value
  if (!t) return 'custom'
  if (t.polarDay) return 'day'
  if (t.polarNight) return 'night'
  return autoActive.value ? 'night' : 'day'
})

const phaseLabel = computed(() => {
  if (!hasLocation.value) return '自定义时间'
  const t = todayTimes.value
  if (!t) return '自定义时间'
  if (t.polarDay) return '极昼'
  if (t.polarNight) return '极夜'
  return autoActive.value ? '夜间' : '白天'
})

function toggleAuto() {
  sun.setAutoEnabled(!sun.state.value.autoEnabled)
  syncAuto()
}

function setAutoPreset(id: string) {
  sun.setAutoPreset(id)
  syncAuto()
}

function requestLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    locError.value = '当前环境不支持定位，可改用自定义时间'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      sun.setLocation(pos.coords.latitude, pos.coords.longitude)
      locError.value = ''
      syncAuto()
    },
    () => {
      locError.value = '定位失败，可改用自定义时间'
    },
    { timeout: 8000, maximumAge: 600000 }
  )
}

function clearLoc() {
  sun.clearLocation()
  locError.value = ''
  syncAuto()
}

function onCustomStart(e: Event) {
  const v = (e.target as HTMLInputElement).value || null
  sun.setCustomTimes(v, sun.state.value.customNightEnd)
  syncAuto()
}

function onCustomEnd(e: Event) {
  const v = (e.target as HTMLInputElement).value || null
  sun.setCustomTimes(sun.state.value.customNightStart, v)
  syncAuto()
}

/** 按当前相位自动套用 / 还原护眼 */
function syncAuto() {
  if (!sun.state.value.autoEnabled) return
  if (sun.shouldEnableEyeCare()) {
    applyPreset(sun.state.value.autoPreset)
  } else {
    reset()
  }
}

function fmtTime(d: Date | undefined | null): string {
  if (!d) return '--:--'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtCountdown(min: number): string {
  if (min <= 0) return '--'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h} 时 ${m} 分` : `${m} 分`
}

let timer: number | undefined

onMounted(() => {
  load()
  sun.load()
  syncAuto()
  timer = window.setInterval(syncAuto, 60_000)
})

onUnmounted(() => {
  if (timer !== undefined) window.clearInterval(timer)
})
</script>

<style scoped src="./guard-shared.css"></style>

<style scoped>
/* ---- 日出日落自动启停 ---- */
.sun-loc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.sun-loc-label {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.55);
}

.sun-loc-error {
  font-size: 11px;
  color: var(--warning);
  margin: 6px 0 0;
}

.sun-times {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px 0 4px;
}

.sun-time-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.sun-time-icon {
  font-size: 16px;
  line-height: 1;
}

.sun-time-label {
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.3px;
}

.sun-time-value {
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.75);
  font-variant-numeric: tabular-nums;
}

.sun-phase {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  margin-top: 8px;
  font-size: 12px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.sun-phase-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-faint);
  box-shadow: 0 0 6px currentColor;
}

.sun-phase.phase-night {
  color: rgba(160, 196, 232, 0.9);
  border-color: rgba(160, 196, 232, 0.2);
}

.sun-phase.phase-night .sun-phase-dot {
  background: #a0c4e8;
  color: #a0c4e8;
}

.sun-phase.phase-day {
  color: rgba(240, 200, 150, 0.9);
  border-color: rgba(240, 200, 150, 0.2);
}

.sun-phase.phase-day .sun-phase-dot {
  background: #f0c896;
  color: #f0c896;
}

.sun-phase-action {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-low);
}

.sun-custom {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
}

.sun-custom-label {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.55);
}

.sun-custom-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sun-time-input {
  flex: 1;
  padding: 8px 10px;
  color-scheme: dark;
}

.sun-custom-sep {
  font-size: 12px;
  color: var(--text-low);
}

.sun-preset {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0 0;
}

.sun-preset-label {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.55);
}

.sun-preset-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sun-preset-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.35);
  color: rgba(var(--text-primary-rgb), 0.6);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.sun-preset-chip:hover {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.25);
}

.sun-preset-chip.active {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: var(--accent);
  color: var(--accent);
}

.sun-preset-icon {
  font-size: 15px;
  line-height: 1;
}

.sun-preset-name {
  font-size: 11px;
  letter-spacing: 0.3px;
}

/* ---- 护眼模式 ---- */
.eye-sliders {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 0 8px;
}

.eye-slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eye-slider-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.6);
}

.eye-slider-label em {
  font-style: normal;
  color: var(--accent);
  font-size: 12px;
}

.eye-slider-row input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.18);
  outline: none;
  cursor: pointer;
}

.eye-slider-row input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg-card);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.eye-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.eye-preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.35);
  color: rgba(var(--text-primary-rgb), 0.6);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.eye-preset-btn:hover {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.25);
}

.eye-preset-btn.reset {
  border-color: rgba(255, 107, 107, 0.2);
  color: rgba(255, 107, 107, 0.8);
}

.eye-preset-icon {
  font-size: 16px;
  line-height: 1;
}

.eye-preset-label {
  font-size: 11px;
  letter-spacing: 0.3px;
}

@media (max-width: 480px) {
  .sun-times {
    grid-template-columns: 1fr 1fr;
  }

  .sun-time-item:last-child {
    grid-column: 1 / -1;
  }
}
</style>
