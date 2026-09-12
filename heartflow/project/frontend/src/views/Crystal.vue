<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance crystal">
    <!-- 氛围背景 -->
    <div data-enter class="crystal-atmosphere">
      <div class="crystal-atmos-glow"></div>
      <div class="crystal-atmos-violet"></div>
      <div class="crystal-facets" aria-hidden="true">
        <span class="crystal-facet"></span>
        <span class="crystal-facet"></span>
        <span class="crystal-facet"></span>
        <span class="crystal-facet"></span>
        <span class="crystal-facet"></span>
        <span class="crystal-facet"></span>
      </div>
    </div>

    <!-- 顶部标题 · 卷轴样式 -->
    <header data-enter class="crystal-scroll-header">
      <div class="crystal-header-ornament">
        <span class="crystal-orn-line"></span>
        <span class="crystal-orn-diamond">✦</span>
        <span class="crystal-orn-line"></span>
      </div>
      <div class="crystal-header-icon">💎</div>
      <h1 class="crystal-title">结晶阁</h1>
      <p class="crystal-subtitle">时间结晶 · 心流的凝固与珍藏</p>
      <p class="crystal-kicker">Crystal Pavilion</p>
      <div class="crystal-header-ornament">
        <span class="crystal-orn-line"></span>
        <span class="crystal-orn-diamond">✦</span>
        <span class="crystal-orn-line"></span>
      </div>
    </header>

    <!-- 结晶画廊 -->
    <CrystalGalleryPanel />

    <!-- 基因谱系 -->
    <CrystalGenePanel />

    <!-- 结晶相性图鉴 -->
    <CrystalArchivePanel />

    <!-- 星盘档案 · 星座/落点/引力（canvas/canvas-gravity 引擎，INCR-271 补挂载孤儿组件，薄委托化：组件自包含） -->
    <section data-enter class="cga-section">
      <CanvasGravityArchivePanel />
    </section>

    <!-- 页脚 -->
    <footer class="crystal-colophon" data-enter>
      <div class="crystal-header-ornament">
        <span class="crystal-orn-line"></span>
        <span class="crystal-orn-diamond">✧</span>
        <span class="crystal-orn-line"></span>
      </div>
      <p class="crystal-colophon-text">聚沙成塔 · 凝时成晶</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useViewEntrance } from '../composables/useViewEntrance'
import CrystalGalleryPanel from '../components/crystal/CrystalGalleryPanel.vue'
import CrystalGenePanel from '../components/crystal/CrystalGenePanel.vue'
import CrystalArchivePanel from '../components/crystal/CrystalArchivePanel.vue'
import CanvasGravityArchivePanel from '../components/CanvasGravityArchivePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
</script>

<style scoped>
/* ============================================================
   结晶阁视图 — 入场动画
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

/* ---- 氛围 ---- */
.crystal-atmosphere {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.crystal-atmos-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 70vw;
  height: 70vw;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(160, 124, 140, 0.12), transparent 60%);
}

.crystal-atmos-violet {
  position: absolute;
  bottom: -30%;
  right: -10%;
  width: 60vw;
  height: 60vw;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(176, 112, 122, 0.1), transparent 60%);
}

.crystal-facets {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  opacity: 0.05;
}

.crystal-facet {
  width: 2px;
  height: 120px;
  background: linear-gradient(transparent, #c4a0b8, transparent);
  transform: rotate(30deg);
}

/* ---- 标题 ---- */
.crystal-scroll-header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 56px 24px 28px;
  text-align: center;
}

.crystal-header-ornament {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(var(--accent-rgb), 0.5);
}

.crystal-orn-line {
  width: 56px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent);
}

.crystal-orn-diamond { font-size: 10px; }

.crystal-header-icon {
  font-size: 40px;
  filter: drop-shadow(0 0 16px rgba(160, 124, 140, 0.5));
}

.crystal-title {
  font-size: 34px;
  font-weight: 600;
  letter-spacing: 12px;
  color: var(--accent);
  margin: 0;
}

.crystal-subtitle {
  font-size: 13px;
  letter-spacing: 4px;
  color: rgba(var(--accent-rgb), 0.6);
  margin: 0;
}

.crystal-kicker {
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(var(--accent-rgb), 0.35);
  margin: 0;
}

/* ---- 页脚 ---- */
.crystal-colophon {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 24px 48px;
  text-align: center;
}

.crystal-colophon-text {
  font-size: 11px;
  letter-spacing: 4px;
  color: rgba(var(--accent-rgb), 0.4);
  margin: 0;
}
</style>
