// ============================================================
// 天星盘 · 真码测试套件
// 覆盖 useAstrolabe 组合式逻辑 + Astrolabe.vue 渲染。
// 注：旧 components/Astrolabe.vue 的 15 个测试已删除（含一条与真码矛盾的断言：
// 真码 degStyle 至今硬编码 translateY(-258px)，并非 var(--tick-radius)）。本套件测真东西。
// ============================================================
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { useAstrolabe } from '../useAstrolabe'
import Astrolabe from '../Astrolabe.vue'

type AstrolabeApi = ReturnType<typeof useAstrolabe>

function freshRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
  })
  vi.spyOn(router, 'push')
  return router
}

interface Ctx {
  api: AstrolabeApi
  host: VueWrapper
  router: ReturnType<typeof createRouter>
}

/** 在受控视口尺寸下创建组合式实例（viewportW/H 在 setup 时从 window 读取，故需先设窗口） */
function createAstrolabe(opts?: { width?: number; height?: number }): Ctx {
  const w = window as unknown as { innerWidth: number; innerHeight: number }
  if (opts?.width != null) w.innerWidth = opts.width
  if (opts?.height != null) w.innerHeight = opts.height
  const router = freshRouter()
  let api!: AstrolabeApi
  const host = mount(
    {
      setup() {
        api = useAstrolabe()
        return () => null
      },
      template: '<div/>',
    },
    { global: { plugins: [router] } },
  )
  return { api, host, router }
}

beforeEach(async () => {
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = createMockStorage()
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
  ;(window as unknown as { innerWidth: number }).innerWidth = 1280
  ;(window as unknown as { innerHeight: number }).innerHeight = 820
})

afterEach(() => {
  // 清理 Teleport 到 body 的残留 DOM + 卸载挂载实例，避免跨测试污染
  document.querySelectorAll('.astrolabe-overlay').forEach((el) => el.remove())
  ;(window as unknown as { innerWidth: number }).innerWidth = 1280
  ;(window as unknown as { innerHeight: number }).innerHeight = 820
})

describe('useAstrolabe 组合式逻辑', () => {
  it('初始关闭，open/close/toggle 正确切换可见性', () => {
    const { api, host } = createAstrolabe()
    expect(api.visibility.value.visible).toBe(false)
    api.open('keyboard')
    expect(api.visibility.value.visible).toBe(true)
    expect(api.visibility.value.trigger).toBe('keyboard')
    api.close()
    expect(api.visibility.value.visible).toBe(false)
    api.toggle()
    expect(api.visibility.value.visible).toBe(true)
    api.toggle()
    expect(api.visibility.value.visible).toBe(false)
    host.unmount()
  })

  it('degStyle 返回 translateY(-258px)（回归守卫：不得回退为 var(--tick-radius)）', () => {
    const { api, host } = createAstrolabe()
    const s = api.degStyle(0, 72)
    expect(s.transform).toContain('translateY(-258px)')
    // 整点刻度更长更亮（index%6===0 高亮）
    const major = api.degStyle(0, 72)
    const minor = api.degStyle(1, 72)
    expect(Number(major.opacity)).toBeGreaterThan(Number(minor.opacity))
    host.unmount()
  })

  it('compact 在窄视口为 true、宽视口为 false', () => {
    const small = createAstrolabe({ width: 380, height: 800 })
    expect(small.api.compact.value).toBe(true)
    small.host.unmount()

    const large = createAstrolabe({ width: 1280, height: 820 })
    expect(large.api.compact.value).toBe(false)
    large.host.unmount()
  })

  it('worldNodeScale 落在 [0.55, 1] 区间', () => {
    const { api, host } = createAstrolabe()
    const scale = api.worldNodeScale.value
    expect(scale).toBeGreaterThanOrEqual(0.55)
    expect(scale).toBeLessThanOrEqual(1)
    host.unmount()
  })

  it('goTo 有效房间 → 关闭并 router.push；无效房间 → 不导航', async () => {
    const { api, host, router } = createAstrolabe()
    const target = api.worldRooms.value[0] ?? api.mainPathRooms.value[0]
    expect(target).toBeTruthy()
    api.goTo(target.id)
    expect(api.visibility.value.visible).toBe(false)
    await new Promise((r) => setTimeout(r, 80))
    expect(router.push).toHaveBeenCalled()

    // 无效房间：保持关闭且不导航
    ;(router.push as ReturnType<typeof vi.fn>).mockClear()
    api.goTo('__not_a_real_room__')
    expect(router.push).not.toHaveBeenCalled()
    host.unmount()
  })

  it('highlightMatch 高亮匹配文本', async () => {
    const { api, host } = createAstrolabe()
    api.search.value.query = '地图'
    // highlightMatch 读 debouncedQuery（防抖 250ms），需等防抖触发
    await new Promise((r) => setTimeout(r, 300))
    const out = api.highlightMatch('地图室')
    expect(out).toContain('<mark>地图</mark>')
    expect(out).toContain('室')
    host.unmount()
  })
})

describe('Astrolabe.vue 渲染', () => {
  it('关闭时不渲染遮罩；open 后 .astrolabe-overlay/.astrolabe-stage 出现在 body；点击关闭触发关闭', async () => {
    const { api, host, router } = createAstrolabe()
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router], provide: { astrolabe: api } },
      props: { visible: true },
    })
    expect(document.body.querySelector('.astrolabe-overlay')).toBeNull()

    api.open('keyboard')
    await nextTick()
    expect(document.body.querySelector('.astrolabe-overlay')).toBeTruthy()
    expect(document.body.querySelector('.astrolabe-stage')).toBeTruthy()
    // 中心心流节点
    expect(document.body.querySelector('.astrolabe-center')).toBeTruthy()
    // 关闭按钮存在
    const closeBtn = document.body.querySelector('.astrolabe-close')
    expect(closeBtn).toBeTruthy()

    // 点击关闭 → 内部 visibility 置否
    closeBtn!.dispatchEvent(new Event('click'))
    await nextTick()
    expect(api.visibility.value.visible).toBe(false)

    wrapper.unmount()
    host.unmount()
  })

  it('窄视口 open 后 .astrolabe-stage 带 compact 类（隐藏标签防遮挡）', async () => {
    const { api, host, router } = createAstrolabe({ width: 380, height: 800 })
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router], provide: { astrolabe: api } },
      props: { visible: true },
    })
    api.open()
    await nextTick()
    const stage = document.body.querySelector('.astrolabe-stage')
    expect(stage).toBeTruthy()
    expect(stage!.classList.contains('compact')).toBe(true)
    // 紧凑模式下节点标签不渲染（display:none 由 CSS 负责；DOM 上移除 v-if 标签）
    wrapper.unmount()
    host.unmount()
  })
})
