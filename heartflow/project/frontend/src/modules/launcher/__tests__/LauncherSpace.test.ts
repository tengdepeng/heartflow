import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import LauncherSpace from '../LauncherSpace.vue'
import type { ExternalAppEntry } from '../types'

// happy-dom 的 canvas.getContext('webgl') 会返回非 null 的 stub，
// 环境细节不该成为测试依赖 —— 这里显式 stub 掉，稳定覆盖「无 WebGL 降级」分支。
beforeAll(() => {
  // getContext 有多个重载（2d / webgl / webgpu），TS 会挑一个签名；用 never 绕开重载匹配
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never)
})
afterAll(() => {
  vi.restoreAllMocks()
})

function entry(id: string, name: string): ExternalAppEntry {
  return {
    id,
    name,
    icon: '◆',
    category: '工具',
    launch: `C:\\App\\${id}.exe`,
    useDeepLink: false,
    sort: 0,
    launchCount: 0,
  }
}

/**
 * degraded 在 onMounted 中置位（WebGL 探测结果），
 * DOM 更新要等 nextTick —— 故统一走这个 helper 挂载。
 */
async function mountSpace(entries: ExternalAppEntry[]) {
  const wrapper = mount(LauncherSpace, { props: { entries } })
  await nextTick()
  return wrapper
}

describe('LauncherSpace · 3D 空间视图', () => {
  it('无 WebGL 环境（测试环境）降级为平面网格，启动功能不丢', async () => {
    const wrapper = await mountSpace([entry('a', 'Alpha'), entry('b', 'Beta')])
    expect(wrapper.find('.space-fallback').exists()).toBe(true)
    expect(wrapper.findAll('.fb-item')).toHaveLength(2)
    // 降级后不显示 3D 操作提示
    expect(wrapper.find('.space-hint').exists()).toBe(false)
  })

  it('降级网格点击条目会向上抛 launch 事件（携带完整条目）', async () => {
    const wrapper = await mountSpace([entry('a', 'Alpha')])
    await wrapper.find('.fb-item').trigger('click')
    const emitted = wrapper.emitted('launch')
    expect(emitted).toBeTruthy()
    expect((emitted![0][0] as ExternalAppEntry).id).toBe('a')
  })

  it('条目为空时给出空态提示，不渲染网格项', async () => {
    const wrapper = await mountSpace([])
    expect(wrapper.find('.space-fallback-empty').exists()).toBe(true)
    expect(wrapper.findAll('.fb-item')).toHaveLength(0)
  })

  it('图片型图标渲染 <img>，字形图标渲染文本', async () => {
    const withImage: ExternalAppEntry = {
      ...entry('img', '图图标'),
      iconImage: 'data:image/png;base64,AAAA',
    }
    const wrapper = await mountSpace([withImage, entry('glyph', '字图标')])
    const imgs = wrapper.findAll('.fb-icon--img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0].attributes('src')).toBe('data:image/png;base64,AAAA')
    // 字形条目没有图片图标，仍渲染文本节点
    expect(wrapper.findAll('.fb-icon')).toHaveLength(2)
  })
})
