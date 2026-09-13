// ============================================================
// 数据流出日志路由视图测试（M7）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// 存储值映射：key → value（mock engine/storage，供 data-outflow 读取外流日志）
const kvStore: Record<string, any> = {}
const mockGetKV = vi.fn((key: string, defaultValue: any) =>
  key in kvStore ? kvStore[key] : defaultValue,
)
const mockSetKV = vi.fn((key: string, value: any) => { kvStore[key] = value })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

async function createWrapper() {
  const { default: DataOutflowView } = await import('../DataOutflowView.vue')
  return mount(DataOutflowView, { global: {} })
}

describe('DataOutflowView 数据流出日志路由', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('渲染标题与副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('数据流出日志')
    expect(wrapper.text()).toContain('守护室')
  })

  it('空态提示出现（尚无流出记录）', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.dov-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有数据离开本设备')
  })

  // ============================================================
  // 集成：外流态势面板 OutflowArchivePanel（INCR-287 补挂载孤儿组件）
  // 引擎 modules/guard/outflow-analytics.ts 的纯函数
  // （outflowOverview / channelDistribution / outflowRhythm /
  //   outflowInsights, 另含常量 OUTFLOW_META）在应用内仅本组件消费
  //   （rg 排除 __tests__ 后仅 OutflowArchivePanel 引用）→ 应用库内唯一。
  // Props 契约 logs: GuardOutflowLog[]，宿主 DataOutflowView.vue 经 useDataOutflow
  //   （engine/data-outflow.ts，OUTFLOW_KEY='hf:guard_outflow_logs'，模块级单例 ref）
  //   持有同名日志，直接 :logs="logs" 薄委托。
  // 注：data-outflow 为模块级单例且带 loaded 标记，故 beforeEach 须 vi.resetModules()
  //   使重 import 后 onMounted load() 从 mock storage 重新读取种子日志。
  // 种子 4 条：今天×2(backup/export) + 3天前(sync) + 10天前(share) →
  //   总次数=4 覆盖渠道=4 今日=2 近7天=3 徽章「外流活跃」。
  // ============================================================
  describe('集成：外流态势面板', () => {
    const DAY = 86_400_000
    const mkLog = (id: string, ago: number, channel: string, label: string, target: string, summary: string) => ({
      id,
      at: new Date(Date.now() - ago).toISOString(),
      channel,
      channelLabel: label,
      target,
      summary,
    })

    function seed() {
      kvStore['hf:guard_outflow_logs'] = [
        mkLog('l1', 0, 'backup', '备份', '本地文件', '备份焦点清单'),
        mkLog('l2', 0, 'export', '导出', '本地文件', '导出成长档案'),
        mkLog('l3', 3 * DAY, 'sync', '同步', '对等节点', '同步到配对设备'),
        mkLog('l4', 10 * DAY, 'share', '分享', '对等节点', '分享给阅读伙伴'),
      ]
    }

    it('无流出日志时渲染面板空态（去向安然）', async () => {
      const wrapper = await createWrapper()
      const oap = wrapper.find('.oap-panel')
      expect(oap.exists()).toBe(true)
      expect(oap.find('.oap-badge-neutral').text()).toBe('去向安然')
      expect(oap.find('.oap-empty').text()).toContain('数据未曾离开本设备')
    })

    it('有日志时渲染概览指标与徽章（总次数 4 · 覆盖渠道 4）', async () => {
      seed()
      const wrapper = await createWrapper()
      const oap = wrapper.find('.oap-panel')
      expect(oap.find('.oap-badge').text()).toBe('外流活跃')
      const cells = oap.findAll('.oap-cell').map(c => ({
        label: c.find('span').text(),
        value: c.find('b').text(),
      }))
      const v = (l: string) => cells.find(x => x.label === l)?.value
      expect(v('总次数')).toBe('4')
      expect(v('覆盖渠道')).toBe('4')
      expect(v('今日')).toBe('2')
      expect(v('近7天')).toBe('3')
      expect(v('最常渠道')).toBe('备份')
    })

    it('渠道分布渲染各渠道行及次数占比', async () => {
      seed()
      const wrapper = await createWrapper()
      const oap = wrapper.find('.oap-panel')
      const rows = oap.findAll('.oap-channel-row')
      expect(rows.length).toBe(4)
      const labels = rows.map(r => r.find('.oap-channel-label').text())
      expect(labels).toContain('📤 导出')
      expect(labels).toContain('🔄 同步')
      expect(labels).toContain('🔗 分享')
      expect(labels).toContain('💾 备份')
      const vals = rows.map(r => r.find('.oap-channel-val').text())
      expect(vals.some(t => t.includes('1次'))).toBe(true)
    })

    it('近7天节奏渲染 7 天柱且今天计数>0', async () => {
      seed()
      const wrapper = await createWrapper()
      const oap = wrapper.find('.oap-panel')
      const days = oap.findAll('.oap-rhythm-day')
      expect(days.length).toBe(7)
      expect(days[6].find('.oap-rhythm-label').text()).toBe('今天')
      expect(days[6].find('.oap-rhythm-bar').exists()).toBe(true)
    })

    it('温和洞察渲染（备份习惯与今日流出提示）', async () => {
      seed()
      const wrapper = await createWrapper()
      const oap = wrapper.find('.oap-panel')
      const insights = oap.findAll('.oap-insight').map(i => i.text())
      expect(insights.some(t => t.includes('备份'))).toBe(true)
      expect(insights.some(t => t.includes('今天已有'))).toBe(true)
    })
  })
})