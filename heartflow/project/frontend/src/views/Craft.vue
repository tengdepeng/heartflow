<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance craft">
    <div data-enter class="craft-ambient" aria-hidden="true">
      <div class="craft-glow craft-glow--top"></div>
      <div class="craft-glow craft-glow--bottom"></div>
      <!-- 木纹 SVG -->
      <div class="craft-wood-grain" aria-hidden="true">
        <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="0.5" opacity="0.03">
            <path d="M0,40 Q100,20 200,60 Q300,100 400,50" />
            <path d="M0,120 Q120,100 240,140 Q340,170 400,130" />
            <path d="M0,200 Q80,220 200,180 Q320,150 400,200" />
            <path d="M0,280 Q140,260 260,300 Q360,330 400,290" />
            <path d="M0,360 Q100,340 200,380 Q320,410 400,370" />
            <path d="M0,440 Q130,420 230,460 Q350,490 400,450" />
            <path d="M0,520 Q90,500 210,540 Q330,570 400,530" />
            <path d="M0,600 Q110,580 220,620 Q340,650 400,610" />
            <path d="M0,680 Q120,660 240,700 Q350,730 400,690" />
            <path d="M0,760 Q80,740 200,780 Q320,800 400,760" />
          </g>
        </svg>
      </div>
      <!-- 浮动工具图标 -->
      <div class="craft-tool craft-tl-1">🔨</div>
      <div class="craft-tool craft-tl-2">⚒</div>
      <div class="craft-tool craft-tl-3">🔧</div>
      <div class="craft-tool craft-tl-4">🪚</div>
      <!-- 木屑粒子 -->
      <div class="craft-sawdust craft-sd-1"></div>
      <div class="craft-sawdust craft-sd-2"></div>
      <div class="craft-sawdust craft-sd-3"></div>
      <div class="craft-sawdust craft-sd-4"></div>
      <div class="craft-sawdust craft-sd-5"></div>
    </div>

    <!-- 通用氛围光晕 -->
    <div data-enter class="craft-atmos" aria-hidden="true">
      <div class="atmos-warm-glow"></div>
      <div class="atmos-work-light"></div>
    </div>

    <!-- Header -->
    <header data-enter class="craft-header">
      <div class="breadcrumb-row">
        <button class="breadcrumb-link" @click="nav.enterRoom('home-space')">
          <span class="breadcrumb-home-icon">🏠</span>
          <span>家</span>
        </button>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-link current">
          <span class="breadcrumb-icon">{{ roomData?.icon }}</span>
          <span>{{ roomData?.name }}</span>
        </span>
      </div>
      <div class="craft-header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="craft-title">{{ roomData?.name }}</h1>
      <p class="craft-subtitle">{{ roomData?.description }}</p>
      <p class="craft-kicker">从更漏 · 工作日志中锻造出的作品</p>
    </header>

    <CraftStatsOverview />
    <!-- 匠庐档案（craft-analytics：概览/状态/类型/进化/节律/健康/洞察/标签） -->
    <CraftArchivePanel />
    <CraftWorkbench />
    <CraftWipBench />
    <CraftExhibitionShelf />
    <CraftEvolutionTimeline />
    <CraftScenePresets />
    <WorkFormModal />

    <!-- 底部铭文 -->
    <footer class="craft-colophon">
      <div class="colophon-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="colophon-text">匠人匠心 · 成果为证</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { useCraftUi, CRAFT_UI_KEY } from '../modules/craft/useCraftUi'
import CraftStatsOverview from '../components/craft/CraftStatsOverview.vue'
import CraftArchivePanel from '../components/CraftArchivePanel.vue'
import CraftWorkbench from '../components/craft/CraftWorkbench.vue'
import CraftWipBench from '../components/craft/CraftWipBench.vue'
import CraftExhibitionShelf from '../components/craft/CraftExhibitionShelf.vue'
import CraftEvolutionTimeline from '../components/craft/CraftEvolutionTimeline.vue'
import CraftScenePresets from '../components/craft/CraftScenePresets.vue'
import WorkFormModal from '../components/craft/WorkFormModal.vue'

const ui = useCraftUi()
provide(CRAFT_UI_KEY, ui)
const { entranceRef, entranceClass, nav, roomData } = ui
</script>

<style scoped src="../components/craft/craft-shared.css"></style>
