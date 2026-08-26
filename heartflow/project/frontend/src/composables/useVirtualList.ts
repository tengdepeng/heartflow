// ============================================================
// useVirtualList — 轻量虚拟列表组合式函数
// 适用于中等数据量（100~5000 条）的纵向滚动列表
// 无需外部依赖，基于滚动容器 + 绝对定位实现
// ============================================================

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

export interface VirtualRow<T> {
  /** 原始数据条目 */
  data: T
  /** 行索引（在原始数组中的位置） */
  index: number
  /** 行在容器中的垂直偏移量（px） */
  offset: number
  /** 行高（px） */
  height: number
}

export interface UseVirtualListOptions<T> {
  /** 容器元素引用 */
  containerRef: Ref<HTMLElement | null>
  /** 数据源 */
  items: Ref<T[]>
  /** 每行预估高度（px），默认 80 */
  estimatedItemHeight?: number
  /** 渲染缓冲区（上下各额外渲染的行数），默认 5 */
  buffer?: number
  /** 是否启用，默认 true */
  enabled?: boolean
}

export function useVirtualList<T>(options: UseVirtualListOptions<T>) {
  const {
    containerRef,
    items,
    estimatedItemHeight = 80,
    buffer = 5,
    enabled = true,
  } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)

  // 每行的高度映射（index -> height），用于支持动态高度
  const rowHeights = ref<Map<number, number>>(new Map())

  function getRowHeight(index: number): number {
    return rowHeights.value.get(index) ?? estimatedItemHeight
  }

  // 计算每行的 offset 和总高度
  const virtualRows = computed<VirtualRow<T>[]>(() => {
    if (!enabled) {
      // 未启用时，返回所有数据（无虚拟化）
      return items.value.map((data, index) => {
        const offset = items.value
          .slice(0, index)
          .reduce((sum, _, i) => sum + getRowHeight(i), 0)
        return { data, index, offset, height: getRowHeight(index) }
      })
    }

    // 容器尚未挂载/未测量高度时，回退到渲染所有条目
    if (containerHeight.value === 0) {
      return items.value.map((data, index) => {
        const offset = items.value
          .slice(0, index)
          .reduce((sum, _, i) => sum + getRowHeight(i), 0)
        return { data, index, offset, height: getRowHeight(index) }
      })
    }

    // 可见范围
    const start = scrollTop.value
    const end = scrollTop.value + containerHeight.value

    // 计算可见范围 + 缓冲区
    let accOffset = 0
    const visible: VirtualRow<T>[] = []
    let firstVisibleIndex = -1
    let lastVisibleIndex = -1

    for (let i = 0; i < items.value.length; i++) {
      const h = getRowHeight(i)
      const rowEnd = accOffset + h

      if (rowEnd > start && accOffset < end) {
        if (firstVisibleIndex === -1) firstVisibleIndex = i
        lastVisibleIndex = i
      }

      accOffset += h
    }

    if (firstVisibleIndex === -1) return []

    // 扩展缓冲区
    const from = Math.max(0, firstVisibleIndex - buffer)
    const to = Math.min(items.value.length - 1, lastVisibleIndex + buffer)

    // 重新计算从 from 开始的偏移
    let offset = 0
    for (let i = 0; i < from; i++) {
      offset += getRowHeight(i)
    }

    for (let i = from; i <= to; i++) {
      visible.push({
        data: items.value[i],
        index: i,
        offset,
        height: getRowHeight(i),
      })
      offset += getRowHeight(i)
    }

    return visible
  })

  // 总列表高度（用于撑开滚动条）
  const totalHeight = computed(() => {
    return items.value.reduce((sum, _, i) => sum + getRowHeight(i), 0)
  })

  let scrollHandler: (() => void) | null = null
  let resizeObserver: ResizeObserver | null = null

  function onScroll() {
    if (containerRef.value) {
      scrollTop.value = containerRef.value.scrollTop
    }
  }

  /** 更新某一行的高度 */
  function setRowHeight(index: number, height: number) {
    if (height !== rowHeights.value.get(index)) {
      rowHeights.value.set(index, height)
      // 触发响应式更新
      rowHeights.value = new Map(rowHeights.value)
    }
  }

  /** 重置所有行高（数据变化时调用） */
  function resetRowHeights() {
    rowHeights.value = new Map()
  }

  onMounted(() => {
    if (!enabled) return

    const container = containerRef.value
    if (!container) return

    containerHeight.value = container.clientHeight

    scrollHandler = onScroll
    container.addEventListener('scroll', scrollHandler)

    resizeObserver = new ResizeObserver(() => {
      containerHeight.value = container.clientHeight
    })
    resizeObserver.observe(container)
  })

  onUnmounted(() => {
    if (containerRef.value && scrollHandler) {
      containerRef.value.removeEventListener('scroll', scrollHandler)
    }
    resizeObserver?.disconnect()
  })

  return {
    virtualRows,
    totalHeight,
    scrollTop,
    containerHeight,
    setRowHeight,
    resetRowHeights,
  }
}