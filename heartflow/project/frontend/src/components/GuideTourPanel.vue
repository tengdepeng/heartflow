<script setup lang="ts">
// ============================================================
// 全局 UI · 分步引导蒙层 · 启动面板（INCR-500）
// 列出内置引导，一键开始；显示完成态并可重置。
// 与 GuideTourOverlay.vue 配套：本面板负责启动，覆盖层负责呈现。
// ============================================================
import { useGuideTour } from '../modules/guide-tour/guide-tour'

const { tours, isCompleted, start, reset } = useGuideTour()
</script>

<template>
  <section class="gtp-panel">
    <header class="gtp-head">
      <span class="gtp-kicker">引导 · 蒙层</span>
      <h4 class="gtp-title">分步引导</h4>
      <p class="gtp-sub">逐目标高亮 + 气泡说明，第一次也能快速上手</p>
    </header>

    <div class="gtp-list">
      <div
        v-for="t in tours"
        :key="t.id"
        class="gtp-item"
        :class="{ 'is-done': isCompleted(t.id) }"
      >
        <div class="gtp-item-main">
          <span class="gtp-name">
            {{ t.name }}
            <em v-if="isCompleted(t.id)" class="gtp-done-tag">已完成</em>
          </span>
          <span class="gtp-desc">{{ t.desc }}</span>
          <span class="gtp-meta">{{ t.steps.length }} 步</span>
        </div>
        <div class="gtp-item-actions">
          <button class="gtp-btn gtp-btn--primary" type="button" @click="start(t.id)">开始引导</button>
          <button v-if="isCompleted(t.id)" class="gtp-btn" type="button" @click="reset(t.id)">重置</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gtp-panel {
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.gtp-head { margin-bottom: 10px; }
.gtp-kicker { font-size: 11px; letter-spacing: 0.14em; color: rgba(var(--accent-rgb), 0.6); }
.gtp-title { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.gtp-sub { margin: 4px 0 0; font-size: 12px; color: rgba(var(--text-primary-rgb), 0.42); }

.gtp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gtp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.12);
}
.gtp-item.is-done { border-color: rgba(var(--accent-rgb), 0.28); background: rgba(var(--accent-rgb), 0.06); }

.gtp-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gtp-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.gtp-done-tag {
  font-style: normal;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 5px;
  background: rgba(var(--accent-rgb), 0.16);
  color: var(--accent);
}

.gtp-desc { font-size: 11px; line-height: 1.4; color: rgba(var(--text-primary-rgb), 0.45); }
.gtp-meta { font-size: 10px; color: rgba(var(--accent-rgb), 0.55); }

.gtp-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.gtp-btn {
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
.gtp-btn:hover { border-color: rgba(var(--accent-rgb), 0.34); }

.gtp-btn--primary {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
}
</style>
