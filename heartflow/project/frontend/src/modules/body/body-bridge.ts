// ============================================================
// Body 桥接层
// 极简透传：直接暴露各 composable 的原始 API
// ============================================================

import { computed, ref } from 'vue'
import { useBodyGreenhouse } from './greenhouse'
import { useHealthDashboard, useHealthGoals } from './health-dashboard'
import { useNutritionEngine } from './nutrition-engine'
import { useExerciseTracker } from './exercise-tracker'

export function useBodyBridge() {
  const greenhouse = useBodyGreenhouse()
  const dashboard = useHealthDashboard()
  const goals = useHealthGoals()
  const nutrition = useNutritionEngine()
  const exercise = useExerciseTracker()
  const isLoading = ref(false)

  // ---- 聚合状态 ----

  const summary = computed(() => {
    const state = greenhouse.greenhouseState.value
    const activeGoals = goals.getActiveGoals()
    const achievedGoals = goals.getAchievedGoals()
    const dashData = dashboard.computeDashboard(
      greenhouse.metrics.value,
      goals.goals.value,
    )

    return {
      totalMetrics: greenhouse.metrics.value.length,
      totalSleepRecords: greenhouse.sleepRecords.value.length,
      totalExerciseRecords: exercise.records.value.length,
      bodyScore: state.bodyScore,
      plantHealth: state.plantHealth,
      sleepAvg7d: greenhouse.getSleepAvg7d(),
      sleepQualityAvg7d: greenhouse.getSleepQualityAvg7d(),
      activeGoals: activeGoals.length,
      achievedGoals: achievedGoals.length,
      dashboardScore: dashData.overallScore,
    }
  })

  return {
    // 状态
    metrics: greenhouse.metrics,
    sleepRecords: greenhouse.sleepRecords,
    greenhouseState: greenhouse.greenhouseState,
    isLoading,
    summary,
    // 子模块直通
    greenhouse,
    dashboard,
    goals,
    nutrition,
    exercise,
  }
}