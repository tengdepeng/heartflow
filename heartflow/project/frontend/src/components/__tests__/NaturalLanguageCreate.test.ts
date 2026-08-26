// ============================================================
// NaturalLanguageCreate 组件测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import NaturalLanguageCreate from '../NaturalLanguageCreate.vue'

function freshRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
  })
  vi.spyOn(router, 'push')
  return router
}

describe('NaturalLanguageCreate', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
  })

  async function setup() {
    const router = freshRouter()
    const wrapper = mount(NaturalLanguageCreate, {
      global: { plugins: [router] },
    })
    return { router, wrapper }
  }

  it('习惯指令：创建并提示前往自律工坊', async () => {
    const { router, wrapper } = await setup()
    await wrapper.find('input').setValue('每天坚持跑步')
    await wrapper.find('.nl-create__btn').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('已创建习惯')
    const goto = wrapper.find('.nl-create__goto')
    expect(goto.exists()).toBe(true)

    await goto.trigger('click')
    expect(router.push).toHaveBeenCalledWith('/automation')
  })

  it('计划指令：创建并提示前往经略阁', async () => {
    const { router, wrapper } = await setup()
    await wrapper.find('input').setValue('制定计划：季度复盘')
    await wrapper.find('.nl-create__btn').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('已创建计划')
    await wrapper.find('.nl-create__goto').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/knowledge')
  })

  it('笔记指令：创建并提示前往思绪书房', async () => {
    const { router, wrapper } = await setup()
    await wrapper.find('input').setValue('记一下刚才的灵感')
    await wrapper.find('.nl-create__btn').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('已创建笔记')
    await wrapper.find('.nl-create__goto').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/study')
  })

  it('无法识别指令：提示暂不支持且不出现前往', async () => {
    const { wrapper } = await setup()
    await wrapper.find('input').setValue('随便说点没有意义的话')
    await wrapper.find('.nl-create__btn').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('暂不支持')
    expect(wrapper.find('.nl-create__goto').exists()).toBe(false)
  })

  it('compact 模式不渲染标题', async () => {
    const router = freshRouter()
    const wrapper = mount(NaturalLanguageCreate, {
      props: { compact: true },
      global: { plugins: [router] },
    })
    expect(wrapper.find('.nl-create__title').exists()).toBe(false)
  })
})
