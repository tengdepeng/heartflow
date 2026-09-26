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

    <!-- 统一房间壳层：RoomLayout 提供标准化头部 + 面包屑（家 › 当前房间） -->
    <RoomLayout
      :title="roomData?.name ?? ''"
      :subtitle="roomData?.description"
      kicker="从更漏 · 工作日志中锻造出的作品"
      :breadcrumb="breadcrumb"
      data-enter
      @navigate="onCrumb"
    >
      <CraftStatsOverview />
      <!-- 匠庐·桥接驾驶舱（INCR-386 补挂载孤儿桥接面板 CraftBridgePanel：useCraftBridge 聚合 craftHealth 匠庐健康度/dashboard 工坊仪表/synthesisEfficiencies 合成效率/workRecommendations 作品指引, Craft.vue 原仅 CraftStatsOverview 4 项基础统计+专项子面板, 桥接层驾驶舱聚合面零呈现, 真缺口） -->
      <CraftBridgePanel />
      <!-- 匠庐档案（craft-analytics：概览/状态/类型/进化/节律/健康/洞察/标签） -->
      <CraftArchivePanel />
      <CraftWorkbench />
      <CraftWipBench />
      <CraftExhibitionShelf />
      <CraftEvolutionTimeline />
      <!-- 材料库（craft/materials 引擎：材料种类/库存/低库存预警/添加消耗/来源标签，INCR-209） -->
      <CraftMaterialsPanel />
      <!-- 高级工坊（craft/craft-advanced 引擎：创作分析/类型分布/月度趋势/灵感追踪/版本留档，INCR-210） -->
      <CraftAdvancedPanel />
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
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'
import { useCraftUi, CRAFT_UI_KEY } from '../modules/craft/useCraftUi'
import RoomLayout from '../components/RoomLayout.vue'
import type { BreadcrumbItem } from '../components/RoomHeader.vue'
import CraftStatsOverview from '../components/craft/CraftStatsOverview.vue'
import CraftBridgePanel from '../components/CraftBridgePanel.vue'
import CraftArchivePanel from '../components/CraftArchivePanel.vue'
import CraftWorkbench from '../components/craft/CraftWorkbench.vue'
import CraftWipBench from '../components/craft/CraftWipBench.vue'
import CraftMaterialsPanel from '../components/craft/CraftMaterialsPanel.vue'
import CraftAdvancedPanel from '../components/craft/CraftAdvancedPanel.vue'
import CraftExhibitionShelf from '../components/craft/CraftExhibitionShelf.vue'
import CraftEvolutionTimeline from '../components/craft/CraftEvolutionTimeline.vue'
import CraftScenePresets from '../components/craft/CraftScenePresets.vue'
import WorkFormModal from '../components/craft/WorkFormModal.vue'

const ui = useCraftUi()
provide(CRAFT_UI_KEY, ui)
const { entranceRef, entranceClass, nav, roomData } = ui

const breadcrumb = computed<BreadcrumbItem[]>(() => [
  { label: '家', icon: '🏠', to: 'home-space' },
  { label: roomData.value?.name ?? '', icon: roomData.value?.icon },
])

function onCrumb(item: BreadcrumbItem) {
  if (item.to) nav.enterRoom(item.to)
}
</script>

<style scoped src="../components/craft/craft-shared.css"></style>
