<template>
    <!-- ========== AI管家面板 ========== -->
    <Transition name="steward-slide">
      <div v-if="showSteward" class="kt-steward-panel">
        <div class="steward-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>AI管家 · 知识洞察</span>
          <button class="steward-close" @click="showSteward=false">✕</button>
        </div>
        <div class="steward-body">
          <div class="steward-section">
            <h4 class="steward-section-title">📊 知识概览</h4>
            <div class="steward-stats">
              <div class="steward-stat">
                <span class="steward-stat-val">{{ nodes.length }}</span>
                <span class="steward-stat-lbl">知识节点</span>
              </div>
              <div class="steward-stat">
                <span class="steward-stat-val">{{ computedRelations.length }}</span>
                <span class="steward-stat-lbl">关联关系</span>
              </div>
              <div class="steward-stat">
                <span class="steward-stat-val">{{ categories.filter(c => nodesByCat(c.key).length > 0).length }}</span>
                <span class="steward-stat-lbl">活跃分类</span>
              </div>
            </div>
            <!-- 健康评分 -->
            <div class="steward-health">
              <div class="steward-health-ring">
                <svg viewBox="0 0 36 36" class="steward-health-svg">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(var(--accent-rgb), 0.08)" stroke-width="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none"
                    :stroke="healthLevel.color"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="`${healthScore * 1.02} 102`"
                    transform="rotate(-90 18 18)"
                    class="steward-health-arc"
                  />
                </svg>
                <div class="steward-health-val">{{ healthScore }}</div>
              </div>
              <div class="steward-health-info">
                <span class="steward-health-label">知识健康度</span>
                <span class="steward-health-level" :style="{ color: healthLevel.color }">{{ healthLevel.label }}</span>
              </div>
            </div>
          </div>
          <div class="steward-section">
            <h4 class="steward-section-title">📈 分类分布</h4>
            <div class="steward-cat-list">
              <div v-for="cat in categories" :key="cat.key" class="steward-cat-row">
                <span class="steward-cat-icon">{{ cat.icon }}</span>
                <span class="steward-cat-name">{{ cat.label }}</span>
                <div class="steward-cat-bar-wrap">
                  <div class="steward-cat-bar" :style="{ width: catDensity(cat.key) + '%', background: catColor(cat.key) }"></div>
                </div>
                <span class="steward-cat-count">{{ nodesByCat(cat.key).length }}</span>
              </div>
            </div>
          </div>
          <div class="steward-section">
            <h4 class="steward-section-title">💡 建议</h4>
            <div class="steward-tips">
              <p v-if="stewardTips.length === 0" class="steward-tip-empty">暂无洞察建议</p>
              <p v-for="(tip, i) in stewardTips" :key="i" class="steward-tip">{{ tip }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  showSteward,
  nodes,
  computedRelations,
  categories,
  nodesByCat,
  catDensity,
  catColor,
  healthScore,
  healthLevel,
  stewardTips,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
