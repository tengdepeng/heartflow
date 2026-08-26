<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance will">
    <!-- 氛围背景 -->
    <div data-enter class="will-atmosphere">
      <div class="will-atmos-glow"></div>
      <div class="will-atmos-amber"></div>
    </div>

    <!-- 顶部标题 · 卷轴样式 -->
    <header data-enter class="will-scroll-header">
      <div class="will-header-ornament">
        <span class="will-orn-line"></span>
        <span class="will-orn-diamond">✦</span>
        <span class="will-orn-line"></span>
      </div>
      <div class="will-header-icon">🕯️</div>
      <h1 class="will-title">遗志堂</h1>
      <p class="will-subtitle">传承与告别 · 把珍贵的留给值得的</p>
      <p class="will-kicker">Will &amp; Testament Hall</p>
      <div class="will-header-ornament">
        <span class="will-orn-line"></span>
        <span class="will-orn-diamond">✦</span>
        <span class="will-orn-line"></span>
      </div>
    </header>

    <!-- 遗志谱系 -->
    <WillHeritagePanel />

    <!-- 殿堂遗嘱 -->
    <TestamentPanel />

    <!-- 页脚 -->
    <footer class="will-colophon" data-enter>
      <div class="will-header-ornament">
        <span class="will-orn-line"></span>
        <span class="will-orn-diamond">✧</span>
        <span class="will-orn-line"></span>
      </div>
      <p class="will-colophon-text">薪火相传 · 灯灯相续</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useViewEntrance } from '../composables/useViewEntrance'
import WillHeritagePanel from '../components/will/WillHeritagePanel.vue'
import TestamentPanel from '../components/will/TestamentPanel.vue'
import '../components/will/will-shared.css'

const { entranceRef, entranceClass } = useViewEntrance()
</script>

<style scoped>
/* ============================================================
   遗志堂视图 — 入场动画
   ============================================================ */

.view-entrance.enter-from [data-enter] {
  opacity: 0;
  transform: translateY(16px);
}

.view-entrance.enter-to [data-enter] {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.view-entrance.enter-to [data-enter]:nth-child(1) { transition-delay: 0s; }
.view-entrance.enter-to [data-enter]:nth-child(2) { transition-delay: 0.08s; }
.view-entrance.enter-to [data-enter]:nth-child(3) { transition-delay: 0.16s; }
.view-entrance.enter-to [data-enter]:nth-child(4) { transition-delay: 0.24s; }
</style>
