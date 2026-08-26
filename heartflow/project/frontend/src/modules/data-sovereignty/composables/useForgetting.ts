// ============================================================
// 数据主权与遗忘退场 · 遗忘方法组合式函数
// 封装 5 种遗忘方法的 UI 状态管理
// ============================================================

import { ref, computed } from 'vue'
import {
  getSovereigntyConfig,
  updateSovereigntyConfig,
  FORGET_METHODS,
  getForgetMethodInfo,
  executeForgetting,
  getForgettingRecords,
  calculateAgingProgress,
  getSealedDataList,
  getHibernatedDataList,
  unsealModuleData,
  wakeModuleData,
  removeAgingMark,
} from '../sovereignty-engine'
import type { ForgetMethod, ForgetResult } from '../types'

export function useForgetting() {
  const config = getSovereigntyConfig()
  const records = getForgettingRecords()

  // ---- 状态 ----

  /** 当前选中的遗忘方法 */
  const selectedMethod = ref<ForgetMethod>(config.value.defaultForgetMethod)

  /** 是否显示遗忘方法选择器 */
  const showMethodPicker = ref(false)

  /** 当前正在遗忘的模块 */
  const forgettingModule = ref<{ key: string; name: string; prefix: string } | null>(null)

  /** 遗忘操作进行中 */
  const isForgetting = ref(false)

  /** 最后一次遗忘结果 */
  const lastForgetResult = ref<ForgetResult | null>(null)

  /** 遗忘方法选择器是否可见 */
  const showMethodSelector = ref(false)

  // ---- 计算属性 ----

  /** 遗忘方法列表 */
  const methods = computed(() => FORGET_METHODS)

  /** 当前遗忘方法信息 */
  const currentMethodInfo = computed(() => getForgetMethodInfo(selectedMethod.value))

  /** 最近的遗忘记录（最多10条） */
  const recentRecords = computed(() => records.value.slice(0, 10))

  /** 封存数据列表（可恢复） */
  const sealedList = computed(() => getSealedDataList())

  /** 休眠数据列表（可恢复） */
  const hibernatedList = computed(() => getHibernatedDataList())

  // ---- 方法 ----

  /**
   * 选择遗忘方法
   */
  function selectMethod(method: ForgetMethod) {
    selectedMethod.value = method
    config.value.defaultForgetMethod = method
    updateSovereigntyConfig({ defaultForgetMethod: method })
  }

  /**
   * 执行遗忘操作
   */
  async function forget(
    moduleKey: string,
    moduleName: string,
    prefix: string,
    method?: ForgetMethod
  ): Promise<ForgetResult> {
    const m = method || selectedMethod.value
    isForgetting.value = true
    forgettingModule.value = { key: moduleKey, name: moduleName, prefix }

    try {
      const result = executeForgetting(moduleKey, moduleName, prefix, m)
      lastForgetResult.value = result
      return result
    } finally {
      isForgetting.value = false
      forgettingModule.value = null
    }
  }

  /**
   * 获取模块的自然老化进度
   */
  function getAgingProgress(moduleKey: string): number {
    return calculateAgingProgress(moduleKey)
  }

  /**
   * 恢复封存数据
   */
  function recoverSealed(sealId: string): boolean {
    return unsealModuleData(sealId)
  }

  /**
   * 恢复休眠数据
   */
  function recoverHibernated(hibernateId: string): boolean {
    return wakeModuleData(hibernateId)
  }

  /**
   * 取消自然老化标记
   */
  function cancelAging(moduleKey: string) {
    removeAgingMark(moduleKey)
  }

  /**
   * 清除遗忘结果
   */
  function clearResult() {
    lastForgetResult.value = null
  }

  /**
   * 格式化遗忘记录的时间
   */
  function formatForgetTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    const dt = new Date(timestamp)
    return `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`
  }

  /**
   * 格式化数据大小
   */
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0B'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1048576).toFixed(1)}MB`
  }

  /**
   * 格式化恢复截止时间
   */
  function formatRecoverableUntil(timestamp: number): string {
    const now = Date.now()
    const remaining = timestamp - now
    if (remaining <= 0) return '已过期'
    const days = Math.floor(remaining / 86400000)
    if (days > 30) return `${Math.floor(days / 30)} 个月后`
    return `${days} 天后`
  }

  return {
    // 状态
    selectedMethod,
    showMethodPicker,
    forgettingModule,
    isForgetting,
    lastForgetResult,
    showMethodSelector,

    // 计算属性
    methods,
    currentMethodInfo,
    recentRecords,
    sealedList,
    hibernatedList,

    // 方法
    selectMethod,
    forget,
    getAgingProgress,
    recoverSealed,
    recoverHibernated,
    cancelAging,
    clearResult,
    formatForgetTime,
    formatBytes,
    formatRecoverableUntil,
  }
}