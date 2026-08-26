import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CrossDevicePanel from '../CrossDevicePanel.vue'
import {
  createLocalSnapshotAdapter,
  createLanTransportAdapter,
  exportSnapshot,
  importSnapshot,
  setTransportAdapter,
} from '../../../modules/sync'
import type { TransportAdapter } from '../../../modules/sync'
import { startLanSnapshotServer, importIncomingSnapshot } from '../../../engine/lan-bridge'

// 用内联 vi.fn() 工厂模拟 sync 传输抽象层；test 直接 import 同一模块，
// 拿到的就是组件所用的同一个 mock 实例，断言 toHaveBeenCalled 可靠。
// 注意：本测试位于 __tests__/ 子目录，相对路径需多一层 ../
// isLocalBoundaryUrl 默认返回 true（守门逻辑由 lan-transport.test.ts 的
// 单元测试覆盖：真实 isLocalBoundaryUrl 对公网地址返回 false）。
vi.mock('../../../modules/sync', () => ({
  createLocalSnapshotAdapter: vi.fn(() => ({ kind: 'local' })),
  createLanTransportAdapter: vi.fn(() => ({ kind: 'network' })),
  exportSnapshot: vi.fn(),
  importSnapshot: vi.fn(),
  isLocalBoundaryUrl: vi.fn(() => true),
  setTransportAdapter: vi.fn(),
  SNAPSHOT_FORMAT: 'hf-snapshot/v1',
}))
vi.mock('../../../engine/lan-bridge', () => ({
  startLanSnapshotServer: vi.fn(),
  stopLanSnapshotServer: vi.fn(),
  importIncomingSnapshot: vi.fn(),
}))

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
  HTMLAnchorElement.prototype.click = vi.fn()
  vi.mocked(exportSnapshot).mockReset()
  vi.mocked(importSnapshot).mockReset()
  vi.mocked(setTransportAdapter).mockReset()
  vi.mocked(createLocalSnapshotAdapter).mockReset()
  vi.mocked(createLocalSnapshotAdapter).mockReturnValue({ kind: 'local' } as TransportAdapter)
  vi.mocked(createLanTransportAdapter).mockReset()
  vi.mocked(createLanTransportAdapter).mockReturnValue({ kind: 'network' } as TransportAdapter)
  vi.mocked(importIncomingSnapshot).mockReset()
  vi.mocked(importIncomingSnapshot).mockResolvedValue({ success: true, data: true })
})

// 直接驱动公开响应式状态：jsdom 中禁用按钮不派发 click 事件，
// 这里置 enabled=true 让按钮可点，规避 checkbox 模拟不可靠。
async function enable(wrapper: ReturnType<typeof mount>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(wrapper.vm as any).enabled = true
  await wrapper.vm.$nextTick()
}

// 同 enable，但驱动局域网接续开关 + 本地 peer 地址
async function enableLan(wrapper: ReturnType<typeof mount>, peer = 'http://192.168.1.20:54321') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vm = wrapper.vm as any
  vm.lanEnabled = true
  vm.peerUrl = peer
  vm.localBindHost = '127.0.0.1'
  await vm.$nextTick()
}

describe('CrossDevicePanel · 本地快照（文件接续）', () => {
  it('渲染本地快照段落与两个操作按钮', () => {
    const wrapper = mount(CrossDevicePanel)
    expect(wrapper.text()).toContain('本地快照（文件接续）')
    expect(wrapper.text()).toContain('导出快照文件')
    expect(wrapper.text()).toContain('导入快照文件')
  })

  it('点击导出 → 经本地适配器导出并触发下载', async () => {
    vi.mocked(exportSnapshot).mockResolvedValue({ format: 'hf-snapshot/v1', exportedAt: '', schema: {} })
    const wrapper = mount(CrossDevicePanel)
    await enable(wrapper)

    const btn = wrapper.findAll('button').find(b => b.text().includes('导出快照文件'))!
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    await btn.trigger('click')
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(createLocalSnapshotAdapter).toHaveBeenCalled()
    expect(setTransportAdapter).toHaveBeenCalled()
    expect(exportSnapshot).toHaveBeenCalled()
    expect(wrapper.text()).toContain('已导出快照文件')
  })

  it('导入无效文件 → 提示失败且不调用传输层', async () => {
    const wrapper = mount(CrossDevicePanel)
    await enable(wrapper)

    const file = new File(['this is not json'], 'bad.txt', { type: 'text/plain' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')

    // FileReader.onload 为异步宏任务，用 vi.waitFor 等待 DOM 真正更新，避免固定延时在负载下偶发失败
    await vi.waitFor(() => expect(wrapper.text()).toContain('导入失败'))
    expect(importSnapshot).not.toHaveBeenCalled()
  })

  it('导入合法快照文件 → 经传输层接续本机数据', async () => {
    vi.mocked(importSnapshot).mockResolvedValue(true)
    const wrapper = mount(CrossDevicePanel)
    await enable(wrapper)

    const blob = { format: 'hf-snapshot/v1', exportedAt: '', schema: { kvStore: {} } }
    const file = new File([JSON.stringify(blob)], 'ok.json', { type: 'application/json' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')

    await vi.waitFor(() => {
      expect(importSnapshot).toHaveBeenCalled()
      expect(wrapper.text()).toContain('已导入快照')
    })
  })
})

describe('CrossDevicePanel · 局域网接续（B1.4）', () => {
  it('渲染局域网接续段，默认按钮禁用', () => {
    const wrapper = mount(CrossDevicePanel)
    expect(wrapper.text()).toContain('局域网接续')
    expect(wrapper.text()).toContain('推送到对端')
    expect(wrapper.text()).toContain('从对端拉取')
    const push = wrapper.findAll('button').find(b => b.text().includes('推送到对端'))!
    expect((push.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('未开启/无地址时推送被守门：不调传输层并提示', async () => {
    const wrapper = mount(CrossDevicePanel)
    const push = wrapper.findAll('button').find(b => b.text().includes('推送到对端'))!
    // 未就绪时按钮禁用，真实点击不会触发处理器
    await push.trigger('click')
    await wrapper.vm.$nextTick()
    expect(createLanTransportAdapter).not.toHaveBeenCalled()
    // 即使越权直接驱动处理器，isLanPeerReady 守门也应拦截并提示
    await (wrapper.vm as any).exportLan()
    await wrapper.vm.$nextTick()
    expect(createLanTransportAdapter).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请先启用并填写合法的本地对端地址')
  })

  it('启用局域网但留空对端地址时按钮保持禁用（守第1条）', async () => {
    const wrapper = mount(CrossDevicePanel)
    // 仅开启开关、不填对端地址：isLanPeerReady 为假，按钮禁用，杜绝「推送到未知地址」
    const vm = wrapper.vm as any
    vm.lanEnabled = true
    await vm.$nextTick()
    const push = wrapper.findAll('button').find(b => b.text().includes('推送到对端'))!
    expect((push.element as HTMLButtonElement).disabled).toBe(true)
    // 公网地址被 isLocalBoundaryUrl 硬性拒绝的守门逻辑，由 lan-transport.test.ts 单元测试覆盖
  })

  it('启用 + 合法本地地址时点击推送 → 经 LAN 适配器导出', async () => {
    vi.mocked(exportSnapshot).mockResolvedValue({ format: 'hf-snapshot/v1', exportedAt: '', schema: {} })
    const wrapper = mount(CrossDevicePanel)
    await enableLan(wrapper)
    const push = wrapper.findAll('button').find(b => b.text().includes('推送到对端'))!
    expect((push.element as HTMLButtonElement).disabled).toBe(false)
    await push.trigger('click')
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(createLanTransportAdapter).toHaveBeenCalledWith({ peerUrl: 'http://192.168.1.20:54321' })
    expect(setTransportAdapter).toHaveBeenCalled()
    expect(exportSnapshot).toHaveBeenCalled()
  })

  it('点击本机开启接收 → 把本机 LAN IP 作 bind_host 传给后端桥接', async () => {
    vi.mocked(startLanSnapshotServer).mockResolvedValue({ success: true })
    const wrapper = mount(CrossDevicePanel)
    await enableLan(wrapper)
    const recv = wrapper.findAll('button').find(b => b.text().includes('本机开启接收'))!
    await recv.trigger('click')
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(startLanSnapshotServer).toHaveBeenCalledWith(54321, '127.0.0.1')
  })

  it('点击从对端拉取 → 经后端桥接取回 incoming 快照并接续本机', async () => {
    vi.mocked(importIncomingSnapshot).mockResolvedValue({ success: true, data: true })
    const wrapper = mount(CrossDevicePanel)
    await enableLan(wrapper)
    // 先开启本机接收（置 lanServing），否则拉取按钮禁用
    vi.mocked(startLanSnapshotServer).mockResolvedValue({ success: true })
    await (wrapper.vm as any).startLanReceive()
    await wrapper.vm.$nextTick()
    const pull = wrapper.findAll('button').find(b => b.text().includes('从对端拉取'))!
    expect((pull.element as HTMLButtonElement).disabled).toBe(false)
    await pull.trigger('click')
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(importIncomingSnapshot).toHaveBeenCalled()
    expect(wrapper.text()).toContain('已从对端拉取并接续本机')
  })
})
