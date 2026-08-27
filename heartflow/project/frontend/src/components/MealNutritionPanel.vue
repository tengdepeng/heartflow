<template>
  <section class="mn-panel" aria-label="营养分析">
    <div class="mn-panel-head">
      <span class="mn-panel-title">🥗 营养分析</span>
      <span class="mn-panel-sub">饮食解析 · 均衡评分 · 优化建议</span>
    </div>

    <div v-if="!score" class="mn-empty">
      <span>🌱</span>
      <p>还没有饮食记录。在身体温室记录用餐后，这里会自动生成营养评分。</p>
    </div>

    <template v-else>
      <div class="mn-overview">
        <div class="mn-score-ring">
          <span class="mn-score-num">{{ score.overall }}</span>
          <span class="mn-score-label">综合评分</span>
        </div>
        <div class="mn-score-grid">
          <div class="mn-score-cell">
            <span class="mn-cell-val">{{ score.regularity }}</span>
            <span class="mn-cell-label">膳食规律</span>
          </div>
          <div class="mn-score-cell">
            <span class="mn-cell-val">{{ score.balance }}</span>
            <span class="mn-cell-label">营养均衡</span>
          </div>
          <div class="mn-score-cell">
            <span class="mn-cell-val">{{ score.variety }}</span>
            <span class="mn-cell-label">食物多样</span>
          </div>
          <div class="mn-score-cell">
            <span class="mn-cell-val">{{ score.calorieReasonableness }}</span>
            <span class="mn-cell-label">热量合理</span>
          </div>
        </div>
      </div>

      <div class="mn-block">
        <span class="mn-block-label">宏量营养素比例</span>
        <div class="mn-macro">
          <div class="mn-macro-seg" :style="{ width: score.breakdown.macroRatio.protein + '%', background: '#f0c040' }" :title="'蛋白质 ' + score.breakdown.macroRatio.protein + '%'"></div>
          <div class="mn-macro-seg" :style="{ width: score.breakdown.macroRatio.carbs + '%', background: '#34d399' }" :title="'碳水 ' + score.breakdown.macroRatio.carbs + '%'"></div>
          <div class="mn-macro-seg" :style="{ width: score.breakdown.macroRatio.fat + '%', background: '#f472b6' }" :title="'脂肪 ' + score.breakdown.macroRatio.fat + '%'"></div>
        </div>
        <div class="mn-legend">
          <span class="mn-legend-item"><i style="background:#f0c040"></i>蛋白质 {{ score.breakdown.macroRatio.protein }}%</span>
          <span class="mn-legend-item"><i style="background:#34d399"></i>碳水 {{ score.breakdown.macroRatio.carbs }}%</span>
          <span class="mn-legend-item"><i style="background:#f472b6"></i>脂肪 {{ score.breakdown.macroRatio.fat }}%</span>
        </div>
        <p class="mn-hint">
          共 {{ score.breakdown.mealCount }} 餐 · 热量 {{ score.breakdown.totalCalories }} 千卡
          <template v-if="score.breakdown.recommendedCalories">
            （建议 {{ score.breakdown.recommendedCalories[0] }} ~ {{ score.breakdown.recommendedCalories[1] }} 千卡）
          </template>
        </p>
      </div>

      <div class="mn-block">
        <span class="mn-block-label">食物类别覆盖</span>
        <div class="mn-cats">
          <span v-for="c in score.breakdown.categoryCoverage" :key="c" class="mn-cat on">{{ CATEGORY_LABELS[c] }}</span>
          <span v-for="c in score.breakdown.missingCategories" :key="c" class="mn-cat miss">{{ CATEGORY_LABELS[c] }}</span>
        </div>
        <p v-if="score.breakdown.missingMeals.length" class="mn-hint">
          缺少餐次：{{ score.breakdown.missingMeals.map(m => MEAL_LABELS[m]).join('、') }}
        </p>
      </div>

      <div class="mn-block">
        <span class="mn-block-label">优化建议</span>
        <ul class="mn-recs">
          <li v-for="r in score.recommendations" :key="r.title" class="mn-rec" :class="r.priority">
            <span class="mn-rec-pri">{{ PRIORITY_LABELS[r.priority] }}</span>
            <span class="mn-rec-title">{{ r.title }}</span>
            <span class="mn-rec-desc">{{ r.description }}</span>
          </li>
        </ul>
      </div>

      <div v-if="weeklyTrend" class="mn-block">
        <span class="mn-block-label">本周趋势</span>
        <div class="mn-trend">
          <span class="mn-trend-badge" :class="weeklyTrend.trend">
            {{ TREND_LABELS[weeklyTrend.trend] }} · 均值 {{ weeklyTrend.averageScore }}
          </span>
          <p class="mn-insight">{{ weeklyTrend.weeklyInsight }}</p>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { useMealNutrition } from '../modules/body/meal-nutrition'
import type { FoodCategory, MealType, NutritionRecommendation } from '../modules/body/nutrition-scoring'
import type { BodyLog } from '../stores/health'

const props = defineProps<{ logs: BodyLog[] }>()

const { score, weeklyTrend } = useMealNutrition(() => props.logs)

const CATEGORY_LABELS: Record<FoodCategory, string> = {
  grain: '主食', protein: '蛋白质', vegetable: '蔬菜', fruit: '水果',
  dairy: '乳制品', fat: '脂肪坚果', beverage: '饮品', processed: '加工食品', other: '其他',
}
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐',
}
const PRIORITY_LABELS: Record<NutritionRecommendation['priority'], string> = {
  high: '高', medium: '中', low: '低',
}
const TREND_LABELS: Record<string, string> = {
  improving: '逐步改善', declining: '略有下滑', stable: '保持平稳',
}
</script>

<style scoped>
.mn-panel {
  margin: 22px auto 0;
  max-width: 720px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}
.mn-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.mn-panel-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high);
}
.mn-panel-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.mn-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 0;
  color: var(--text-dim);
}
.mn-empty span {
  font-size: 28px;
}
.mn-empty p {
  margin: 0;
  font-size: 12px;
}
.mn-overview {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 0;
}
.mn-score-ring {
  flex: 0 0 108px;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4px solid var(--accent);
  background: rgba(52, 211, 153, 0.08);
}
.mn-score-num {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-high);
  font-variant-numeric: tabular-nums;
}
.mn-score-label {
  font-size: 11px;
  color: var(--text-dim);
}
.mn-score-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.mn-score-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(232, 224, 216, 0.05);
}
.mn-cell-val {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-high);
  font-variant-numeric: tabular-nums;
}
.mn-cell-label {
  font-size: 11px;
  color: var(--text-dim);
}
.mn-block {
  padding: 12px 0;
  border-top: 1px dashed var(--border);
}
.mn-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-medium);
  margin-bottom: 10px;
}
.mn-macro {
  display: flex;
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(232, 224, 216, 0.08);
}
.mn-macro-seg {
  height: 100%;
}
.mn-legend {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.mn-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-medium);
}
.mn-legend-item i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.mn-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-dim);
}
.mn-cats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mn-cat {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--border);
  color: var(--text-dim);
}
.mn-cat.on {
  border-color: rgba(52, 211, 153, 0.4);
  color: #34d399;
  background: rgba(52, 211, 153, 0.08);
}
.mn-cat.miss {
  border-style: dashed;
}
.mn-recs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mn-rec {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(232, 224, 216, 0.05);
  font-size: 13px;
}
.mn-rec-pri {
  flex: 0 0 24px;
  text-align: center;
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 0;
}
.mn-rec.high .mn-rec-pri {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.mn-rec.medium .mn-rec-pri {
  background: rgba(240, 192, 64, 0.15);
  color: #f0c040;
}
.mn-rec.low .mn-rec-pri {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}
.mn-rec-title {
  font-weight: 600;
  color: var(--text-high);
}
.mn-rec-desc {
  flex: 1;
  color: var(--text-medium);
}
.mn-trend-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
}
.mn-trend-badge.improving {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}
.mn-trend-badge.declining {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.mn-trend-badge.stable {
  background: rgba(240, 192, 64, 0.15);
  color: #f0c040;
}
.mn-insight {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-medium);
  line-height: 1.6;
}
</style>
