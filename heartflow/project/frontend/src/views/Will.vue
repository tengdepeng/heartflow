<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance will">
    <!-- 氛围背景 -->
    <div data-enter class="will-atmosphere">
      <div class="will-atmos-glow"></div>
      <div class="will-atmos-amber"></div>
    </div>

    <!-- 统一房间壳层：RoomLayout 提供标准化头部（装饰菱形 / 标题 / 副标题 / 眉标） -->
    <RoomLayout
      title="遗志堂"
      kicker="Will & Testament Hall"
      subtitle="传承与告别 · 把珍贵的留给值得的"
      data-enter
    >
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
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
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
