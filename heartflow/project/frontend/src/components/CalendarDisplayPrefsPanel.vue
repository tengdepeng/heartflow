<script setup lang="ts">
// ============================================================
// 时间线 · 日历显示偏好面板（INCR-503）
// 借鉴 96 APK「万年日历」显示开关矩阵：每周首日 / 固定六行 /
// 时长条 / 数字加粗 / 数字背景 / 今日徽章 / 紧凑密度。
// 全部开关即时写入 hf:calendar_prefs，右侧迷你月历实时预览。
// 纯本地、零网络。
// ============================================================
import { computed } from 'vue'
import { useCalendarPrefs } from '../modules/calendar-prefs/calendar-prefs'
import { weekdaysFor, buildMonthGrid } from '../modules/calendar-prefs/calendar-prefs'

const { prefs, setPref, reset } = useCalendarPrefs()

const weekdays = computed(() => weekdaysFor(prefs.value.weekStart))

const previewGrid = computed(() => {
  const now = new Date()
  return buildMonthGrid(now.getFullYear(), now.getMonth(), prefs.value.weekStart, prefs.value.sixRow)
})

const todayKey = computed(() => {
  const n = new Date()
  return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`
})

function isToday(d: Date): boolean {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey.value
}

interface ToggleItem {
  key: 'sixRow' | 'showFocusBar' | 'boldNumber' | 'numberBackground' | 'showTodayBadge' | 'compact'
  label: string
  desc: string
}

const TOGGLES: ToggleItem[] = [
  { key: 'sixRow', label: '固定六行', desc: '全月补齐 42 格，切换月份高度不跳动' },
  { key: 'showFocusBar', label: '专注时长条', desc: '每日底部显示专注时长比例条' },
  { key: 'boldNumber', label: '日期加粗', desc: '日期数字加粗显示' },
  { key: 'numberBackground', label: '数字背景', desc: '为日期数字添加底色圆点' },
  { key: 'showTodayBadge', label: '「今天」徽章', desc: '当前月份标题旁显示今天标识' },
  { key: 'compact', label: '紧凑密度', desc: '压缩行高，同屏显示更多内容' },
]
</script>

<template>
  <section class="calp-panel">
    <header class="calp-head">
      <span class="calp-kicker">时间线 · 日历</span>
      <h4 class="calp-title">日历显示偏好</h4>
      <p class="calp-sub">开关即时生效并记忆，右侧为实时预览</p>
    </header>

    <div class="calp-body">
      <div class="calp-controls">
        <div class="calp-field">
          <span class="calp-field-label">每周首日</span>
          <div class="calp-seg" role="group" aria-label="每周首日">
            <button
              class="calp-seg-btn"
              :class="{ 'is-active': prefs.weekStart === 0 }"
              type="button"
              @click="setPref('weekStart', 0)"
            >周日开头</button>
            <button
              class="calp-seg-btn"
              :class="{ 'is-active': prefs.weekStart === 1 }"
              type="button"
              @click="setPref('weekStart', 1)"
            >周一开头</button>
          </div>
        </div>

        <div
          v-for="t in TOGGLES"
          :key="t.key"
          class="calp-toggle"
          role="switch"
          :aria-checked="prefs[t.key]"
          :tabindex="0"
          @click="setPref(t.key, !prefs[t.key])"
          @keydown.enter.prevent="setPref(t.key, !prefs[t.key])"
          @keydown.space.prevent="setPref(t.key, !prefs[t.key])"
        >
          <div class="calp-toggle-text">
            <span class="calp-toggle-label">{{ t.label }}</span>
            <span class="calp-toggle-desc">{{ t.desc }}</span>
          </div>
          <span class="calp-switch" :class="{ 'is-on': prefs[t.key] }"><i /></span>
        </div>
      </div>

      <div class="calp-preview" :class="{ 'is-compact': prefs.compact }">
        <div class="calp-preview-head">
          <span v-for="(w, i) in weekdays" :key="i" class="calp-preview-wd">{{ w }}</span>
        </div>
        <div class="calp-preview-grid">
          <div
            v-for="(c, i) in previewGrid"
            :key="i"
            class="calp-preview-cell"
            :class="{ 'is-other': !c.isCurrentMonth, 'is-today': isToday(c.date) }"
          >
            <span
              class="calp-preview-num"
              :class="{ 'is-bold': prefs.boldNumber, 'is-bg': prefs.numberBackground }"
            >{{ c.date.getDate() }}</span>
            <span v-if="prefs.showFocusBar && c.isCurrentMonth && c.date.getDate() % 5 === 0" class="calp-preview-bar" />
          </div>
        </div>
      </div>
    </div>

    <div class="calp-foot">
      <span class="calp-hint">偏好仅保存在本地，不上传云端</span>
      <button class="calp-reset" type="button" @click="reset">恢复默认</button>
    </div>
  </section>
</template>

<style scoped>
.calp-panel {
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.calp-head { margin-bottom: 12px; }
.calp-kicker { font-size: 11px; letter-spacing: 0.14em; color: rgba(var(--accent-rgb), 0.6); }
.calp-title { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.calp-sub { margin: 4px 0 0; font-size: 12px; color: rgba(var(--text-primary-rgb), 0.42); }

.calp-body {
  display: grid;
  grid-template-columns: 1fr minmax(180px, 220px);
  gap: 16px;
  align-items: start;
}

.calp-controls { display: flex; flex-direction: column; gap: 8px; }

.calp-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.calp-field-label { font-size: 12px; font-weight: 600; color: var(--text-primary); }

.calp-seg {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
}
.calp-seg-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-family: inherit;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.6);
  cursor: pointer;
  transition: all 0.2s;
}
.calp-seg-btn.is-active {
  background: rgba(var(--accent-rgb), 0.18);
  color: var(--accent);
  font-weight: 600;
}

.calp-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.calp-toggle:hover { border-color: rgba(var(--accent-rgb), 0.28); }
.calp-toggle:focus-visible { outline: 2px solid rgba(var(--accent-rgb), 0.4); outline-offset: 1px; }

.calp-toggle-text { display: flex; flex-direction: column; gap: 2px; }
.calp-toggle-label { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.calp-toggle-desc { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.42); }

.calp-switch {
  flex-shrink: 0;
  width: 34px;
  height: 18px;
  border-radius: 9px;
  background: rgba(var(--text-primary-rgb), 0.16);
  position: relative;
  transition: background 0.2s;
}
.calp-switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}
.calp-switch.is-on { background: rgba(var(--accent-rgb), 0.7); }
.calp-switch.is-on i { transform: translateX(16px); }

.calp-preview {
  padding: 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.calp-preview-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.calp-preview-wd { text-align: center; font-size: 10px; color: rgba(var(--text-primary-rgb), 0.4); }

.calp-preview-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}
.calp-preview-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-radius: 4px;
}
.calp-preview.is-compact .calp-preview-cell { aspect-ratio: 1.6; }
.calp-preview-cell.is-other { opacity: 0.22; }
.calp-preview-cell.is-today { background: rgba(var(--accent-rgb), 0.1); }

.calp-preview-num {
  font-size: 10px;
  line-height: 1;
  color: rgba(var(--text-primary-rgb), 0.7);
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.calp-preview-num.is-bold { font-weight: 700; }
.calp-preview-num.is-bg { background: rgba(var(--accent-rgb), 0.16); }
.calp-preview-cell.is-today .calp-preview-num { color: var(--accent); font-weight: 700; }

.calp-preview-bar {
  width: 60%;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(90deg, var(--accent), rgba(var(--accent-rgb), 0.4));
}

.calp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}
.calp-hint { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.4); }
.calp-reset {
  padding: 6px 12px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--text-primary-rgb), 0.8);
  cursor: pointer;
  transition: all 0.2s;
}
.calp-reset:hover { border-color: rgba(var(--accent-rgb), 0.34); }

@media (max-width: 520px) {
  .calp-body { grid-template-columns: 1fr; }
}
</style>
