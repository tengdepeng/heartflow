// ============================================================
// 房间挂载冒烟测试 · 可用性基线
// 在「空存储 / 无 Tauri」环境下把每个视图真正 mount 起来，
// 捕获 setup / 初始渲染 / onMounted 抛出的错误。
// 目的：用硬证据回答「哪些房间打开即崩 / 空状态下不健壮」，
//       直接服务于「让所有房间进入可用状态」。
// 这不是功能验收，而是「不白屏、不抛错」的可用性底线。
// ============================================================
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { ROUTE_TRANSITION_DONE_KEY } from '../../composables/useViewEntrance'

// ---- 浏览器 API 垫片（happy-dom 缺失项） ----
// 所有赋值均显式 `as unknown as` 目标类型，避免依赖 @ts-expect-error：
// 当前 TS DOM lib 已接受这些赋值，旧的 @ts-expect-error 会变成“未使用指令”报错。
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = (class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }) as unknown as typeof window.ResizeObserver
  }
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = (class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return [] as never[] }
    }) as unknown as typeof window.IntersectionObserver
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16) as unknown as number) as unknown as typeof window.requestAnimationFrame
    window.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as unknown as typeof window.cancelAnimationFrame
  }
  if (!window.scrollTo) {
    window.scrollTo = (() => {}) as unknown as typeof window.scrollTo
  }
  // canvas getContext 兜底（部分视图/子组件用 canvas 画背景）
  if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = (() => ({
      fillRect() {}, clearRect() {}, getImageData: () => ({ data: [] }),
      putImageData() {}, createImageData: () => ({}), setTransform() {}, drawImage() {}, save() {}, restore() {}, beginPath() {}, moveTo() {},
      lineTo() {}, closePath() {}, stroke() {}, fill() {}, arc() {},
      translate() {}, scale() {}, rotate() {}, clip() {}, rect() {},
      fillText() {}, measureText: () => ({ width: 0 }), createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext
  }
})

// ---- 路由桩 ----
vi.mock('vue-router', () => ({
  createRouter: () => ({
    push: vi.fn(), back: vi.fn(), replace: vi.fn(),
    beforeEach: vi.fn(), afterEach: vi.fn(), resolve: vi.fn(),
    currentRoute: { value: { path: '/', params: {}, query: {}, meta: {}, name: 'home' } },
  }),
  createWebHashHistory: () => ({}),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), beforeEach: vi.fn(), afterEach: vi.fn() }),
  useRoute: () => ({ path: '/', params: {}, query: {}, meta: {}, name: 'home' }),
  RouterLink: { name: 'RouterLink', template: '<a><slot/></a>' },
  RouterView: { name: 'RouterView', template: '<div><slot/></div>' },
}))

// ---- storage：不 mock，使用真实实现 ----
// 真实 loadSchema() 在空存储时返回 createDefaultSchema()（含完整默认 config /
// constitution:null / advisors:[] 等），与「首次启动 · 空存储」的真实 Web 环境一致。
// happy-dom 无 window.__TAURI__ → 走 LocalStorageBackend（用 happy-dom 的 localStorage），
// 因此 getConfig() 等 getter 会拿到真实默认值，不会因空 {} 而读嵌套字段崩溃。
// 之前的 mock 把 loadSchema 返回裸 {} 导致 25 个假阳性，故此处刻意不 mock。

// ---- Tauri 桩 ----
vi.mock('@tauri-apps/api/core', () => ({ invoke: async (_cmd: string, _args?: unknown) => null }))
vi.mock('@tauri-apps/api/shell', () => ({ open: async (_url: string) => {} }))

// ---- resonance 桩（部分视图直接引用） ----
vi.mock('../../resonance/bridges/runtime', () => ({
  useRuntimeState: () => ({
    isSanctuaryActive: ref(false),
    enterSanctuary: vi.fn(),
    exitSanctuary: vi.fn(),
  }),
}))
vi.mock('../../resonance', () => ({
  useResonance: () => ({ initialize: vi.fn(), invoke: async () => ({ ok: true, data: null }) }),
}))

// ---- 视图清单（相对本测试文件的 ../*.vue） ----
const viewModules = import.meta.glob('../*.vue') as Record<string, () => Promise<unknown>>

interface SmokeResult {
  file: string
  ok: boolean
  error?: string
}

const results: SmokeResult[] = []

afterEach(() => {
  setActivePinia(createPinia())
})

describe('房间挂载冒烟 · 可用性底线', () => {
  const files = Object.keys(viewModules).sort()

  it(`应成功挂载全部 ${files.length} 个视图（空存储环境）`, async () => {
    for (const file of files) {
      let wrapper: VueWrapper<unknown> | null = null
      try {
        setActivePinia(createPinia())
        const mod = (await viewModules[file]()) as { default: unknown }
        const Comp = mod.default as any
        wrapper = mount(Comp, {
          global: {
            plugins: [createPinia()],
            stubs: {
              Teleport: true,
              Transition: true,
              TransitionGroup: true,
            },
            provide: {
              [ROUTE_TRANSITION_DONE_KEY]: ref(false),
            },
          },
          attachTo: document.body,
        })
        // 触达 onMounted + 初始渲染
        await wrapper.vm.$nextTick()
        await new Promise((r) => setTimeout(r, 0))
        results.push({ file, ok: true })
      } catch (e) {
        const err = e as Error
        results.push({ file, ok: false, error: err?.stack || err?.message || String(e) })
      } finally {
        if (wrapper) {
          try { wrapper.unmount() } catch { /* ignore */ }
          wrapper = null
        }
      }
    }

    const failed = results.filter((r) => !r.ok)
    // 输出可读报告
    const report = [
      `房间挂载冒烟结果：${results.length - failed.length}/${results.length} 通过`,
      ...(failed.length
        ? ['失败清单（' + failed.length + '）：', ...failed.map((f) => `  ✗ ${f.file}\n    ${String(f.error).split('\n').slice(0, 3).join('\n    ')}`)]
        : ['全部视图挂载通过（空存储环境下无抛错）。']),
    ].join('\n')
    // eslint-disable-next-line no-console
    console.log('\n' + report + '\n')

    expect(failed, report).toHaveLength(0)
  }, 180000)
})

// 便于单独调试时查看结果（CI 也会打印）
export { results }
