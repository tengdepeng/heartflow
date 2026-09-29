<template>
  <div class="dw-shell">
    <!-- 标题栏：整块为窗口拖动区（data-tauri-drag-region），右侧关闭 -->
    <header class="dw-head" data-tauri-drag-region>
      <span class="dw-brand" data-tauri-drag-region>✦ 心流小组件</span>
      <button class="dw-close" title="隐藏小组件" @click="dismiss">✕</button>
    </header>

    <main class="dw-body">
      <p v-if="!enabledWidgets.length" class="dw-empty">
        还没有启用的小组件，<br />回主窗「桌面小组件」里添加一个吧。
      </p>

      <!-- 卡片内容：与首页画布同源（WidgetCard 紧凑态） -->
      <section v-for="w in enabledWidgets" :key="w.id" class="dw-card">
        <header class="dw-card-head">
          <span class="dw-card-icon">{{ WIDGET_META[w.type].icon }}</span>
          <span class="dw-card-title">{{ WIDGET_META[w.type].label }}</span>
        </header>
        <WidgetCard :instance="w" compact />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWidgetManager, WIDGET_META } from '../modules/touchpoints'
import { useDesktopWidget } from '../modules/desktop-widget'
import WidgetCard from '../components/WidgetCard.vue'
import { startWidgetSnapshotSync } from '../modules/desktop-widget/sync'

const manager = useWidgetManager()
const { dismissWindow } = useDesktopWidget()

const enabledWidgets = computed(() => manager.enabledWidgets.value)

function dismiss() { dismissWindow() }

// ---- 系统小组件快照同步（共享出口，与首页画布同一份逻辑） ----
startWidgetSnapshotSync()
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
  background: rgba(24, 30, 48, .82);
  border: 1px solid rgba(150, 170, 210, .16);
  border-radius: 12px; padding: 10px 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .3);
  display: flex; flex-direction: column; gap: 6px;
  backdrop-filter: blur(10px);
}
/* 卡片内容样式由 WidgetCard（wcard-compact）承担，此处只留窗口外壳样式 */
.dw-card-head { display: flex; align-items: center; gap: 6px; }
.dw-card-icon { font-size: 13px; }
.dw-card-title { font-size: 12px; font-weight: 600; color: #dbe3f7; }
</style>
