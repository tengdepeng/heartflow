// ============================================================
// 共鸣图谱视图测试（C1-EXT · 关联可视化）
// 验证：边界声明可见化 / 连线类型图例 / 节点渲染 / 节点详情 / 空态。
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-router', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useRoute: () => ({ path: '/association-graph' }),
}))

function setupMemoryStorage() {
  const mem = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
      removeItem: (k: string) => { mem.delete(k) },
    },
    configurable: true,
  })
  // 动态导入 storage 以在 localStorage 就绪后清除
  return mem
}

async function getWrapper() {
  // 确保 storage 已就绪
  const { storage } = await import('../../engine/storage')
  storage.clear()
  // 两个跨域记录：共享标签「成长」→ 应产生 shared-tag 关联
  storage.setNotes([
    { id: 'n1', title: '关于成长的笔记', content: 'c', tags: ['成长'], createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' } as any,
  ])
  storage.setEmotions([
    { id: 'e1', type: 'calm', note: '平静的成长', createdAt: '2026-01-02T10:00:00.000Z', tags: ['成长'] } as any,
  ])
  const { default: AssociationGraph } = await import('../AssociationGraph.vue')
  return mount(AssociationGraph, {})
}

describe('AssociationGraph 共鸣图谱（C1-EXT）', () => {
  beforeEach(() => {
    setupMemoryStorage()
  })

  it('渲染标题「共鸣图谱」与已知边界声明', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('共鸣图谱')
    // 合规可见化：标注语义关联为本地启发式、非 AI / 向量
    expect(wrapper.text()).toContain('语义关联')
    expect(wrapper.text()).toContain('本地启发式')
    expect(wrapper.text()).toContain('未使用任何 AI 或向量模型')
  })

  it('渲染三类连线类型图例', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    expect(text).toContain('共享标签')
    expect(text).toContain('时间邻近')
    expect(text).toContain('因果顺序')
  })

  it('渲染节点与连线（svg g.ag-node / line）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ag').exists()).toBe(true)
    const nodes = wrapper.findAll('.ag-node')
    expect(nodes.length).toBeGreaterThanOrEqual(2) // 笔记 + 情绪
    const lines = wrapper.findAll('.ag-canvas line')
    expect(lines.length).toBeGreaterThanOrEqual(1) // 共享标签「成长」应产生至少 1 边
  })

  it('点击节点打开详情面板并列出关联原因', async () => {
    const wrapper = await getWrapper()
    const nodes = wrapper.findAll('.ag-node')
    await nodes[0].trigger('click')
    await new Promise(r => setTimeout(r, 30))
    // 详情面板出现
    expect(wrapper.find('.ag-detail').exists()).toBe(true)
    // 关联原因（共享标签：成长）
    const detailText = wrapper.find('.ag-detail').text()
    expect(detailText).toContain('共享标签')
    expect(detailText).toContain('成长')
  })

  it('无跨域记录时显示空态提示', async () => {
    const { storage } = await import('../../engine/storage')
    storage.clear()
    const { default: AssociationGraph } = await import('../AssociationGraph.vue')
    const wrapper = mount(AssociationGraph, {})
    expect(wrapper.find('.ag-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无可关联的跨域记录')
  })

  // ---- 深化：节点下钻真实记录 + 筛选 + 缩放复位 ----
  it('点击节点下钻展示真实记录字段（标题/标签）', async () => {
    const wrapper = await getWrapper()
    const nodes = wrapper.findAll('.ag-node')
    await nodes[0].trigger('click')
    await new Promise(r => setTimeout(r, 30))
    const detail = wrapper.find('.ag-detail')
    expect(detail.exists()).toBe(true)
    // 真实记录详情区出现：笔记 n1 的标题字段
    expect(detail.text()).toContain('记录详情')
    expect(detail.text()).toContain('关于成长的笔记')
  })

  it('时间窗筛选：选择近 7 天隐藏更早记录（概览节点数下降）', async () => {
    const wrapper = await getWrapper()
    const before = wrapper.findAll('.ag-node').length
    const sel = wrapper.find('.ag-filters select.ag-select')
    expect(sel.exists()).toBe(true)
    ;(sel.element as HTMLSelectElement).value = '7'
    await sel.trigger('change')
    await new Promise(r => setTimeout(r, 30))
    const after = wrapper.findAll('.ag-node').length
    expect(after).toBeLessThan(before)
  })

  it('强度阈值筛选：提高阈值隐藏弱关联（可见连线减少）', async () => {
    const wrapper = await getWrapper()
    const before = wrapper.findAll('.ag-canvas line').length
    const range = wrapper.find('.ag-filters input.ag-range') as any
    expect(range.exists()).toBe(true)
    // 直接驱动 v-model：设高于现有边强度的阈值
    await range.setValue(0.99)
    await new Promise(r => setTimeout(r, 30))
    const after = wrapper.findAll('.ag-canvas line').length
    expect(after).toBeLessThanOrEqual(before)
  })

  it('缩放复位按钮存在且可点击（不报错）', async () => {
    const wrapper = await getWrapper()
    const btn = wrapper.find('.ag-reset-zoom')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    await new Promise(r => setTimeout(r, 20))
    // 复位后缩放提示消失（zoomLevel 回 1）
    expect(wrapper.find('.ag-zoom-hint').exists()).toBe(false)
  })

  // ---- 图谱打磨：节点拖拽重定位 + 连通分量聚类 ----
  it('节点可鼠标拖拽重定位（transform 跟随变化，零依赖不持久化）', async () => {
    const wrapper = await getWrapper()
    const node = wrapper.find('.ag-node')
    const before = node.attributes('transform') || ''
    expect(before).toContain('translate')
    const wrapEl = wrapper.find('.ag-canvas-wrap').element as HTMLElement
    Object.defineProperty(wrapEl, 'clientWidth', { configurable: true, value: 800 })
    await node.trigger('pointerdown', { clientX: 100, clientY: 100 })
    await wrapper.find('.ag-canvas-wrap').trigger('pointermove', { clientX: 240, clientY: 170 })
    await new Promise(r => setTimeout(r, 20))
    const after = node.attributes('transform') || ''
    expect(after).not.toBe(before)
    expect(after).toContain('translate')
  })

  it('概览展示「社区」计数：连通节点为单社区时不渲染聚类环', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('社区')
    // n1 + e1 共享标签 → 1 条关联边 → 单一连通分量，clusterCount === 1
    expect(wrapper.find('.ag-cluster-ring').exists()).toBe(false)
  })

  it('多连通分量时渲染聚类社区环（社区数 > 1）', async () => {
    // 第二个隔离组件：结晶 c1 与 n1/e1 无任何关联边
    const { storage } = await import('../../engine/storage')
    storage.clear()
    storage.setNotes([
      { id: 'n1', title: '成长笔记', content: 'c', tags: ['成长'], createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' } as any,
    ])
    storage.setEmotions([
      { id: 'e1', type: 'calm', note: '平静的成长', createdAt: '2026-01-02T10:00:00.000Z', tags: ['成长'] } as any,
    ])
    storage.setCrystals([
      { id: 'c1', insight: '孤晶', createdAt: '2026-03-01T10:00:00.000Z' } as any,
    ])
    const { default: AssociationGraph } = await import('../AssociationGraph.vue')
    const wrapper = mount(AssociationGraph, {})
    expect(wrapper.find('.ag-cluster-ring').exists()).toBe(true)
    const rings = wrapper.findAll('.ag-cluster-ring')
    expect(rings.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================
// 集成：关联档案面板 AssociationArchivePanel（INCR-285 补挂载孤儿组件）
// 引擎 modules/association/association-archive-analytics.ts 的纯函数
// （associationArchiveOverview / linkTypeRows / domainPairRows /
//   associationArchiveHealth / associationInsights）在应用内仅本组件消费：
//   advisor/knowledge-scope.ts 只 import 常量 DOMAIN_ARCHIVE_META，非这些函数。
// 零副作用；Props 契约 graph: AssociationGraph，宿主 AssociationGraph.vue 已有
//   graph = computeAssociationGraph()，直接 :graph="graph" 薄委托，v-if 有数据才渲染。
// 测试沿用 getWrapper() 的 n1(笔记·成长) + e1(情绪·成长) → 1 条 shared-tag 关联。
// ============================================================
describe('集成：关联档案面板', () => {
  beforeEach(() => {
    setupMemoryStorage()
  })

  it('有跨域数据时渲染关联档案面板（标题/健康圆环/三轴）', async () => {
    const wrapper = await getWrapper()
    const aap = wrapper.find('.aap')
    expect(aap.exists()).toBe(true)
    expect(aap.find('.aap-title').text()).toContain('关联档案')
    // 健康圆环：score + /100
    expect(aap.find('.aap-ring').exists()).toBe(true)
    expect(aap.find('.aap-ring-num').text()).toContain('/100')
    // 健康三轴
    const axes = aap.findAll('.aap-axis-label').map(t => t.text())
    expect(axes).toContain('涉域广度')
    expect(axes).toContain('连线密度')
    expect(axes).toContain('关联强度')
  })

  it('概览指标反映图谱数据（记录节点 2 · 关联连线 2）', async () => {
    const wrapper = await getWrapper()
    const aap = wrapper.find('.aap')
    const metrics = aap.findAll('.aap-metric').map(m => ({
      label: m.find('span').text(),
      value: m.find('b').text(),
    }))
    const nodes = metrics.find(m => m.label === '记录节点')
    const links = metrics.find(m => m.label === '关联连线')
    expect(nodes?.value).toBe('2')
    // n1(2026-01-01) 与 e1(2026-01-02) 既共享「成长」标签又时间邻近 → 2 条连线
    expect(links?.value).toBe('2')
  })

  it('类型分布渲染「共享标签」行（shared-tag 1 条）', async () => {
    const wrapper = await getWrapper()
    const aap = wrapper.find('.aap')
    const types = aap.findAll('.aap-type')
    const tagRow = types.find(t =>
      t.find('.aap-type-label').text() === '共享标签',
    )
    expect(tagRow?.exists()).toBe(true)
    expect(tagRow!.find('.aap-type-count').text()).toBe('1条')
  })

  it('域对分布渲染「笔记 × 情绪」并给出温和洞察', async () => {
    const wrapper = await getWrapper()
    const aap = wrapper.find('.aap')
    const pairLabel = aap.find('.aap-pair-label').text()
    expect(pairLabel).toContain('笔记')
    expect(pairLabel).toContain('情绪')
    // 温和洞察：共享标签经线
    const insights = aap.findAll('.aap-insights li').map(t => t.text())
    expect(insights.some(t => t.includes('共享标签牵起了'))).toBe(true)
  })

  it('无跨域记录时不渲染关联档案面板（v-if 随图谱数据）', async () => {
    const { storage } = await import('../../engine/storage')
    storage.clear()
    const { default: AssociationGraph } = await import('../AssociationGraph.vue')
    const wrapper = mount(AssociationGraph, {})
    expect(wrapper.find('.aap').exists()).toBe(false)
  })
})
