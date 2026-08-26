// ============================================================
// useVirtualList 虚拟列表 composable · 测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { ref, nextTick } from 'vue'
import { useVirtualList } from '../useVirtualList'

function makeContainer(height: number) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientHeight', { value: height, writable: true })
  Object.defineProperty(el, 'scrollTop', { value: 0, writable: true })
  return el
}

describe('useVirtualList', () => {
  // ---- 未启用模式 ----
  it('enabled=false 时返回所有条目', () => {
    const items = ref([1, 2, 3, 4, 5])
    const containerRef = ref(makeContainer(400))
    const { virtualRows, totalHeight } = useVirtualList({
      containerRef,
      items,
      enabled: false,
      estimatedItemHeight: 80,
    })

    expect(virtualRows.value.length).toBe(5)
    expect(virtualRows.value[0].data).toBe(1)
    expect(virtualRows.value[0].index).toBe(0)
    expect(virtualRows.value[0].offset).toBe(0)
    expect(virtualRows.value[1].offset).toBe(80)
    expect(virtualRows.value[2].offset).toBe(160)
    // 总高度 = 5 * 80 = 400
    expect(totalHeight.value).toBe(400)
  })

  // ---- 容器未挂载时回退到全部条目 ----
  it('containerHeight=0 时返回所有条目', () => {
    const items = ref([1, 2, 3])
    const containerRef = ref(makeContainer(0))
    const { virtualRows } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 80,
    })

    expect(virtualRows.value.length).toBe(3)
  })

  // ---- 空数据 ----
  it('空数据时返回空数组', () => {
    const items = ref<number[]>([])
    const containerRef = ref(makeContainer(400))
    const { virtualRows, totalHeight } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 80,
    })

    expect(virtualRows.value).toEqual([])
    expect(totalHeight.value).toBe(0)
  })

  // ---- totalHeight 计算 ----
  it('totalHeight 为所有行高之和', () => {
    const items = ref([1, 2, 3])
    const containerRef = ref(makeContainer(400))
    const { totalHeight } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 100,
    })

    expect(totalHeight.value).toBe(300)
  })

  // ---- 虚拟化核心逻辑 ----
  it('虚拟化模式下仅渲染可见行 + 缓冲区', async () => {
    // 容器高 400px，每行 80px，可见 5 行
    // buffer=2，总共应渲染 5+2+2=9 行（如果数据够）
    const items = ref(Array.from({ length: 50 }, (_, i) => i))
    const containerRef = ref(makeContainer(400))
    const { virtualRows, containerHeight } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 80,
      buffer: 2,
    })

    // 模拟 onMounted 设置容器高度
    containerHeight.value = 400
    await nextTick()

    // 可见范围: 0-400, 可见索引 0-4
    // buffer: from=0, to=6 → 7 行
    expect(virtualRows.value.length).toBeGreaterThanOrEqual(5)
    expect(virtualRows.value.length).toBeLessThanOrEqual(10)
    // 第一行 data 应为 0
    expect(virtualRows.value[0].data).toBe(0)
  })

  // ---- offset 连续性 ----
  it('相邻行的 offset 连续递增', () => {
    const items = ref(Array.from({ length: 30 }, (_, i) => i))
    const containerRef = ref(makeContainer(400))
    const { virtualRows } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 80,
    })

    for (let i = 1; i < virtualRows.value.length; i++) {
      const prev = virtualRows.value[i - 1]
      const curr = virtualRows.value[i]
      expect(curr.offset).toBe(prev.offset + prev.height)
    }
  })

  // ---- 动态行高 ----
  it('setRowHeight 更新行高', async () => {
    const items = ref([1, 2, 3])
    const containerRef = ref(makeContainer(400))
    const { setRowHeight, virtualRows, totalHeight } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 80,
    })

    setRowHeight(0, 120)
    await nextTick()

    expect(virtualRows.value[0].height).toBe(120)
    // totalHeight = 120 + 80 + 80 = 280
    expect(totalHeight.value).toBe(280)
  })

  it('resetRowHeights 重置所有行高', async () => {
    const items = ref([1, 2, 3])
    const containerRef = ref(makeContainer(400))
    const { setRowHeight, resetRowHeights, totalHeight } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 80,
    })

    setRowHeight(0, 120)
    setRowHeight(1, 100)
    await nextTick()
    expect(totalHeight.value).toBe(300) // 120 + 100 + 80

    resetRowHeights()
    await nextTick()
    expect(totalHeight.value).toBe(240) // 80 + 80 + 80
  })

  // ---- 数据变化 ----
  it('数据变化后 virtualRows 更新', async () => {
    const items = ref([1, 2, 3])
    const containerRef = ref(makeContainer(400))
    const { virtualRows, totalHeight } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 80,
    })

    expect(virtualRows.value.length).toBe(3)

    items.value = [1, 2, 3, 4, 5]
    await nextTick()

    expect(virtualRows.value.length).toBe(5)
    expect(totalHeight.value).toBe(400)
  })

  // ---- 边界：单条数据 ----
  it('单条数据正常渲染', () => {
    const items = ref([42])
    const containerRef = ref(makeContainer(400))
    const { virtualRows, totalHeight } = useVirtualList({
      containerRef,
      items,
      estimatedItemHeight: 80,
    })

    expect(virtualRows.value.length).toBe(1)
    expect(virtualRows.value[0].data).toBe(42)
    expect(virtualRows.value[0].index).toBe(0)
    expect(virtualRows.value[0].offset).toBe(0)
    expect(totalHeight.value).toBe(80)
  })

  // ---- 返回的 API 完整性 ----
  it('返回所有公开 API', () => {
    const items = ref([1, 2])
    const containerRef = ref(makeContainer(400))
    const result = useVirtualList({ containerRef, items })

    expect(result.virtualRows).toBeDefined()
    expect(result.totalHeight).toBeDefined()
    expect(result.scrollTop).toBeDefined()
    expect(result.containerHeight).toBeDefined()
    expect(typeof result.setRowHeight).toBe('function')
    expect(typeof result.resetRowHeights).toBe('function')
  })
})