<template>
  <div class="skeleton-loader" :class="[`skeleton--${variant}`, `skeleton--${theme}`]">
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
        <div v-for="i in 8" :key="i" class="sk-block sk-text-line" :style="{ width: (60 + Math.random() * 35) + '%' }" />
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

<script setup lang="ts">
withDefaults(defineProps<{
  /** 骨架屏变体 */
  variant?: 'home' | 'card-list' | 'list' | 'detail' | 'stats' | 'default'
  /** 主题色调 */
  theme?: 'warm' | 'cool' | 'muted'
}>(), {
  variant: 'default',
  theme: 'warm',
})
</script>

<style scoped>
/* ============================================================
   骨架屏 — 全局加载占位
   深夜食堂 · 暖琥珀主题
   ============================================================ */

.skeleton-loader {
  width: 100%;
  padding: 32px 24px;
  animation: sk-fade-in 0.3s ease-out;
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
  border-radius: 6px;
  height: 14px;
  animation: sk-pulse 1.8s ease-in-out infinite;
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
  border-radius: 8px;
}
.sk-subtitle {
  width: 70%;
  height: 12px;
  border-radius: 4px;
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
  border-radius: 8px;
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
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.sk-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  animation: sk-pulse 1.8s ease-in-out infinite;
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
  border-radius: 6px;
}
.sk-stat-label {
  width: 50px;
  height: 10px;
  border-radius: 4px;
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
  border-radius: 10px;
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
  border-radius: 4px;
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .skeleton-loader {
    padding: 24px 14px;
  }
  .sk-cards-row {
    flex-direction: column;
  }
  .sk-cards-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>