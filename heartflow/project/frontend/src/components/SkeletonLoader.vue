<script setup lang="ts">
withDefaults(defineProps<{
  /** 骨架屏变体 */
  variant?: 'home' | 'card-list' | 'list' | 'detail' | 'stats' | 'default'
  /** 主题色调 */
  theme?: 'warm' | 'cool' | 'muted'
  /** 读屏播报的加载语义标签 */
  label?: string
}>(), {
  variant: 'default',
  theme: 'warm',
  label: '加载中',
})

/**
 * detail 变体文本行的宽度。
 * 原实现把 Math.random() 写在模板 :style 里 —— 每次重渲染都会重算，
 * 行宽随机跳动，观感像「内容在抖」。改为固定拟真宽度序列：稳定、无抖动。
 */
const DETAIL_LINE_WIDTHS = [96, 88, 92, 70, 84, 94, 64, 90]
</script>

<template>
  <div
    class="skeleton-loader"
    :class="[`skeleton--${variant}`, `skeleton--${theme}`]"
    role="status"
    aria-busy="true"
    :aria-label="label"
  >
    <span class="hf-sr-only">{{ label }}</span>

    <!-- 首页骨架 -->
    <template v-if="variant === 'home'">
      <div class="sk-hero">
        <div class="sk-block sk-hero-title" />
        <div class="sk-block sk-hero-sub" />
        <div class="sk-block sk-hero-desc" />
      </div>
      <div class="sk-cards-row">
        <div v-for="i in 3" :key="i" class="sk-card">
          <div class="sk-circle" />
          <div class="sk-block sk-card-line" />
          <div class="sk-block sk-card-line sk-card-line--short" />
        </div>
      </div>
      <div class="sk-list">
        <div v-for="i in 4" :key="i" class="sk-list-item">
          <div class="sk-block sk-list-line" />
          <div class="sk-block sk-list-line sk-list-line--short" />
        </div>
      </div>
    </template>

    <!-- 卡片列表骨架 -->
    <template v-else-if="variant === 'card-list'">
      <div class="sk-header">
        <div class="sk-block sk-title" />
        <div class="sk-block sk-subtitle" />
      </div>
      <div class="sk-cards-grid">
        <div v-for="i in 6" :key="i" class="sk-card">
          <div class="sk-circle" />
          <div class="sk-block sk-card-line" />
          <div class="sk-block sk-card-line sk-card-line--short" />
          <div class="sk-block sk-card-line sk-card-line--micro" />
        </div>
      </div>
    </template>

    <!-- 列表骨架 -->
    <template v-else-if="variant === 'list'">
      <div class="sk-header">
        <div class="sk-block sk-title" />
      </div>
      <div class="sk-list">
        <div v-for="i in 5" :key="i" class="sk-list-item">
          <div class="sk-block sk-list-line" />
          <div class="sk-block sk-list-line sk-list-line--short" />
        </div>
      </div>
    </template>

    <!-- 详情/内容骨架 -->
    <template v-else-if="variant === 'detail'">
      <div class="sk-header">
        <div class="sk-block sk-title" />
        <div class="sk-block sk-subtitle" />
      </div>
      <div class="sk-content">
        <div
          v-for="(w, i) in DETAIL_LINE_WIDTHS"
          :key="i"
          class="sk-block sk-text-line"
          :style="{ width: w + '%' }"
        />
      </div>
    </template>

    <!-- 统计面板骨架 -->
    <template v-else-if="variant === 'stats'">
      <div class="sk-header">
        <div class="sk-block sk-title" />
      </div>
      <div class="sk-cards-row">
        <div v-for="i in 4" :key="i" class="sk-card">
          <div class="sk-block sk-stat-value" />
          <div class="sk-block sk-stat-label" />
        </div>
      </div>
      <div class="sk-content">
        <div v-for="i in 6" :key="i" class="sk-block sk-text-line" />
      </div>
    </template>

    <!-- 默认通用骨架 -->
    <template v-else>
      <div class="sk-header">
        <div class="sk-block sk-title" />
      </div>
      <div class="sk-list">
        <div v-for="i in 4" :key="i" class="sk-list-item">
          <div class="sk-block sk-list-line" />
          <div class="sk-block sk-list-line sk-list-line--short" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ============================================================
   骨架屏 — 全局加载占位
   深夜食堂 · 暖琥珀主题
   ============================================================ */

.skeleton-loader {
  width: 100%;
  /* 32px→token 倍数（8px 基准 ×2 档间距），24px→--spacing-lg */
  padding: calc(var(--spacing-md) * 2) var(--spacing-lg);
  animation: sk-fade-in calc(0.3s / var(--hf-animate-speed, 1)) ease-out;
}

/* ---- 脉冲动画 ---- */
@keyframes sk-pulse {
  0%, 100% { opacity: 0.08; }
  50% { opacity: 0.15; }
}
@keyframes sk-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ---- 基础块 ---- */
.sk-block {
  border-radius: var(--radius-sm, 6px);
  height: 14px;
  animation: sk-pulse calc(1.8s / var(--hf-animate-speed, 1)) ease-in-out infinite;
}

/* ---- 主题色调 ---- */
.skeleton--warm .sk-block {
  background: rgba(var(--accent-rgb), 0.5);
}
.skeleton--cool .sk-block {
  background: rgba(107, 159, 196, 0.5);
}
.skeleton--muted .sk-block {
  background: var(--text-faint);
}

/* ---- Header ---- */
.sk-header {
  margin-bottom: 28px;
}
.sk-title {
  width: 45%;
  height: 22px;
  margin-bottom: 10px;
  border-radius: var(--radius-sm, 6px);
}
.sk-subtitle {
  width: 70%;
  height: 12px;
  border-radius: var(--radius-sm, 6px);
}

/* ---- Hero（首页变体） ---- */
.sk-hero {
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.sk-hero-title {
  width: 55%;
  height: 28px;
  border-radius: var(--radius-sm, 6px);
}
.sk-hero-sub {
  width: 40%;
  height: 14px;
}
.sk-hero-desc {
  width: 65%;
  height: 12px;
}

/* ---- Cards row ---- */
.sk-cards-row {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
}
.sk-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}
.sk-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border-radius: var(--radius-md, 10px);
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.sk-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  animation: sk-pulse calc(1.8s / var(--hf-animate-speed, 1)) ease-in-out infinite;
}
.skeleton--warm .sk-circle {
  background: rgba(var(--accent-rgb), 0.4);
}
.skeleton--cool .sk-circle {
  background: rgba(107, 159, 196, 0.4);
}
.skeleton--muted .sk-circle {
  background: rgba(var(--text-primary-rgb), 0.15);
}
.sk-card-line {
  width: 60%;
  height: 10px;
}
.sk-card-line--short {
  width: 35%;
}
.sk-card-line--micro {
  width: 20%;
  height: 8px;
}

/* ---- Stat card ---- */
.sk-stat-value {
  width: 40px;
  height: 24px;
  margin-bottom: 4px;
  border-radius: var(--radius-sm, 6px);
}
.sk-stat-label {
  width: 50px;
  height: 10px;
  border-radius: var(--radius-sm, 6px);
}

/* ---- List ---- */
.sk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sk-list-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: var(--radius-md, 10px);
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.04);
}
.sk-list-line {
  width: 80%;
  height: 11px;
}
.sk-list-line--short {
  width: 40%;
  height: 9px;
}

/* ---- Content text ---- */
.sk-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}
.sk-text-line {
  height: 10px;
  border-radius: var(--radius-sm, 6px);
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .skeleton-loader {
    padding: var(--spacing-lg) var(--spacing-md);
  }
  .sk-cards-row {
    flex-direction: column;
  }
  .sk-cards-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* ---- 降级：系统开启「减少动态效果」时停止脉冲，改为静态低对比块 ---- */
@media (prefers-reduced-motion: reduce) {
  .sk-block,
  .sk-circle {
    animation: none;
    opacity: 0.12;
  }
  .skeleton-loader {
    animation: none;
  }
}
</style>
