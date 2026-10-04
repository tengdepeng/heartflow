<template>
  <div class="dw-shell">
    <!-- 标题栏：整块为窗口拖动区（data-tauri-drag-region），右侧关闭 -->
    <header class="dw-head" data-tauri-drag-region>
      <span class="dw-brand" data-tauri-drag-region>✦ 心流小组件</span>
      <span v-if="stamp" class="dw-stamp" data-tauri-drag-region>{{ stamp }}</span>
      <div class="dw-actions">
        <button class="dw-act" :class="{ 'is-on': showAdd }" data-tauri-drag-region="false"
          title="添加小组件" @click="showAdd = !showAdd">＋</button>
        <button class="dw-act" :class="{ 'is-spin': refreshing }" data-tauri-drag-region="false"
          title="立即刷新（同步到手机桌面小组件）" @click="refresh">↻</button>
        <button class="dw-close" data-tauri-drag-region="false" title="隐藏小组件" @click="dismiss">✕</button>
      </div>
    </header>

    <!-- 添加面板：七类与首页画布同源（WidgetCard 唯一实现） -->
    <div v-if="showAdd" class="dw-add">
      <span class="dw-add-label">添加</span>
      <button v-for="t in widgetTypes" :key="t" class="dw-chip"
        :title="`添加${WIDGET_META[t].label}`" @click="add(t)">
        <span class="dw-chip-icon">{{ WIDGET_META[t].icon }}</span>{{ WIDGET_META[t].label }}
      </button>
    </div>

    <main class="dw-body">
      <p v-if="!enabledWidgets.length" class="dw-empty">
        还没有启用的小组件，<br />点标题栏的 ＋ 直接在这里添加一个。
      </p>

      <!-- 卡片内容：与首页画布同源（WidgetCard 紧凑态） -->
      <section v-for="w in enabledWidgets" :key="w.id" class="dw-card" :style="themeVars(w)">
        <header class="dw-card-head">
          <span class="dw-card-icon">{{ WIDGET_META[w.type].icon }}</span>
          <span class="dw-card-title">{{ WIDGET_META[w.type].label }}</span>
          <div class="dw-card-actions">
            <button class="dw-card-btn" title="隐藏（回主窗可恢复）" @click="hide(w.id)">👁</button>
            <button class="dw-card-btn dw-card-btn-danger" title="移除" @click="remove(w.id)">✕</button>
          </div>
        </header>
        <WidgetCard :instance="w" compact />
        <WidgetThemeControls :instance="w" compact />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useWidgetManager, WIDGET_META, widgetThemeVars } from '../modules/touchpoints'
import type { WidgetType, WidgetInstance } from '../modules/touchpoints'
import { useDesktopWidget } from '../modules/desktop-widget'
import WidgetCard from '../components/WidgetCard.vue'
import WidgetThemeControls from '../components/WidgetThemeControls.vue'
import { pushWidgetSnapshotNow } from '../modules/desktop-widget/sync'

const manager = useWidgetManager()
const { dismissWindow } = useDesktopWidget()

const enabledWidgets = computed(() => manager.enabledWidgets.value)

/** 把实例主题展开为卡片外壳 CSS 变量（accent/radius/alpha/bg 同源生效） */
function themeVars(w: WidgetInstance) { return widgetThemeVars(w.theme) }

/** 小窗内可直接添加的十五类（与首页画布 widgetTypes 同源） */
const widgetTypes: WidgetType[] = [
  'pomodoro', 'daily-anchor', 'emotion-check', 'quick-note', 'weather', 'quote', 'quadrant', 'calendar', 'calendar-heatmap',
  'flip-clock', 'life-scale', 'aquarium', 'water-drink', 'ferris-wheel', 'crystal-ball',
]

const showAdd = ref(false)
const refreshing = ref(false)
const stamp = ref('')

function dismiss() { dismissWindow() }

/** 添加：落库后立即推一次快照（用户操作，不走 5s 节流） */
function add(type: WidgetType) {
  manager.addWidget(type, manager.suggestLayout())
  showAdd.value = false
  pushWidgetSnapshotNow()
  markRefreshed()
}

/** 移除 / 隐藏：同样即时同步，避免系统小组件残留旧卡 */
function remove(id: string) {
  manager.removeWidget(id)
  pushWidgetSnapshotNow()
  markRefreshed()
}
function hide(id: string) {
  manager.setWidgetEnabled(id, false)
  pushWidgetSnapshotNow()
  markRefreshed()
}

/** 手动刷新：重建快照 + 触发 Android 原生 widget 即时刷新 */
function refresh() {
  refreshing.value = true
  pushWidgetSnapshotNow()
  markRefreshed()
  window.setTimeout(() => (refreshing.value = false), 600)
}

function markRefreshed() {
  const d = new Date()
  stamp.value = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':')
}

// ---- 自动刷新兜底：每分钟重推一次，保证小窗久置后数据仍新鲜 ----
let timer: number | undefined
onMounted(() => {
  timer = window.setInterval(() => pushWidgetSnapshotNow(true), 60_000)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

// ---- 系统小组件快照同步已提升为全局启动（见 App.vue onMounted） ----
</script>

<style scoped>
.dw-shell {
  display: flex; flex-direction: column; height: 100vh;
  color: var(--text-primary, #e8ecf6);
  font-family: inherit;
  user-select: none;
}
.dw-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px 6px; cursor: move; flex: none;
}
.dw-brand { font-size: 12px; font-weight: 600; letter-spacing: 1px; opacity: .75; }
.dw-stamp { font-size: 10px; color: #6f7a94; margin-left: 6px; opacity: .9; }
.dw-actions { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.dw-act {
  width: 22px; height: 22px; border-radius: 6px; border: 1px solid rgba(150, 170, 210, .2);
  background: rgba(30, 38, 58, .6); color: #9fb0d4; font-size: 12px; cursor: pointer; line-height: 1;
}
.dw-act:hover { background: rgba(120, 140, 200, .22); color: #dbe3f7; }
.dw-act.is-on { background: rgba(90, 120, 220, .3); border-color: #6b86d8; color: #fff; }
.dw-act.is-spin { animation: dw-spin .6s linear; }
@keyframes dw-spin { to { transform: rotate(360deg); } }

.dw-add {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 6px 12px 8px; flex: none;
}
.dw-add-label { font-size: 11px; color: #7c86a0; }
.dw-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px;
  border: 1px solid rgba(140, 160, 200, .2); background: rgba(120, 140, 200, .08);
  color: #c6d0e8; font-size: 11px; cursor: pointer;
}
.dw-chip:hover { background: rgba(90, 120, 220, .22); border-color: #6b86d8; color: #fff; }
.dw-chip-icon { font-size: 12px; }
.dw-close {
  width: 22px; height: 22px; border-radius: 6px; border: 1px solid rgba(150, 170, 210, .2);
  background: rgba(30, 38, 58, .6); color: #9fb0d4; font-size: 11px; cursor: pointer; line-height: 1;
}
.dw-close:hover { background: rgba(220, 90, 90, .25); color: #ff9f9f; }

.dw-body {
  flex: 1; overflow-y: auto; padding: 4px 10px 12px;
  display: flex; flex-direction: column; gap: 10px;
}
.dw-empty { font-size: 12px; color: #8a94ad; text-align: center; line-height: 1.8; margin: 24px 0; }

.dw-card {
  background: var(--ww-bg, rgba(24, 30, 48, var(--ww-alpha, 0.82)));
  border: 1px solid rgba(150, 170, 210, .16);
  border-radius: var(--ww-radius, 12px); padding: 10px 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .3);
  display: flex; flex-direction: column; gap: 6px;
  backdrop-filter: blur(10px);
}
/* 卡片内容样式由 WidgetCard（wcard-compact）承担，此处只留窗口外壳样式 */
.dw-card-head { display: flex; align-items: center; gap: 6px; }
.dw-card-icon { font-size: 13px; }
.dw-card-title { font-size: 12px; font-weight: 600; color: #dbe3f7; }
.dw-card-actions { margin-left: auto; display: flex; gap: 4px; opacity: 0; transition: opacity .15s; }
.dw-card:hover .dw-card-actions { opacity: 1; }
.dw-card-btn {
  width: 20px; height: 20px; border-radius: 5px; border: 1px solid rgba(150, 170, 210, .16);
  background: rgba(30, 38, 58, .5); color: #9fb0d4; font-size: 10px; cursor: pointer; line-height: 1;
}
.dw-card-btn:hover { background: rgba(120, 140, 200, .2); color: #dbe3f7; }
.dw-card-btn-danger:hover { background: rgba(220, 90, 90, .25); color: #ff9f9f; }
</style>
