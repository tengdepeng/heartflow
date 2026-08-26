// ============================================================
// 长眠守护（宪法第51条 · elastic-long-dormancy → advisor:long-dormancy）
// 在 App 挂载处调用一次：周期性驱动 advisor store 的 applyLongDormancy，
// 使「长眠→沉睡 / 重新互动→唤醒」随时间真实生效。
// 行为落实在 store（state 切换），本 composable 仅负责调度，复用夜静调暗/安息日模式；
// 同时暴露 isDormant（当前是否有幕僚处于长眠），供 UI 提示。
// ============================================================

import { onMounted, onUnmounted, ref, computed } from 'vue'
import { onEffectEvent } from '../engine/constitution-effect'
import { useAdvisorStore } from '../stores/advisor'
import { isLongDormant } from '../modules/advisor/longDormancy'

/**
 * 长眠守护调度：安装后周期性调用 store.applyLongDormancy。
 * @param pollMs 轮询间隔（默认 60s；长眠是慢变量，无需高频）
 */
export function useLongDormancy(pollMs = 60_000) {
  const advisor = useAdvisorStore()
  // 当前处于长眠的幕僚 id 列表（供 UI 提示，如「N 位幕僚已进入长眠」）
  const dormantIds = ref<string[]>([])
  const isDormant = computed(() => dormantIds.value.length > 0)

  function evaluate(): void {
    // 落实 state 切换（长眠→slumber / 重新互动→awake）
    advisor.applyLongDormancy()
    // 刷新当前长眠集合（与 store 切换后的状态保持一致）
    const now = new Date()
    dormantIds.value = advisor.advisors
      .filter(a => !a.retired && isLongDormant(a.lastActiveAt, now))
      .map(a => a.id)
  }

  let timer: ReturnType<typeof setInterval> | null = null
  let offEvent: (() => void) | null = null

  onMounted(() => {
    evaluate()
    // 当前挂载周期结束后再评一次，确保宪法效果引擎已先完成初始化
    setTimeout(evaluate, 0)
    timer = setInterval(evaluate, pollMs)
    offEvent = onEffectEvent(() => evaluate())
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    offEvent?.()
  })

  return { isDormant, dormantIds }
}
