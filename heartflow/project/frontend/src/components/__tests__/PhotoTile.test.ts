// ============================================================
// 照片瓷砖 · 统一玻璃拟态图片组件 单元测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PhotoTile from '../PhotoTile.vue'

describe('PhotoTile 统一玻璃图片组件', () => {
  it('渲染 img 并默认懒加载', () => {
    const wrapper = mount(PhotoTile, { props: { src: 'data:image/jpeg;base64,XXX' } })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('data:image/jpeg;base64,XXX')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('lazy=false 时改为 eager', () => {
    const wrapper = mount(PhotoTile, { props: { src: 'x', lazy: false } })
    expect(wrapper.find('img').attributes('loading')).toBe('eager')
  })

  it('透传 alt 且关闭原生拖拽', () => {
    const wrapper = mount(PhotoTile, { props: { src: 'x', alt: '封面' } })
    const img = wrapper.find('img')
    expect(img.attributes('alt')).toBe('封面')
    expect(img.attributes('draggable')).toBe('false')
  })

  it('根节点带玻璃框类 hf-photo 与上缘高光', () => {
    const wrapper = mount(PhotoTile, { props: { src: 'x' } })
    expect(wrapper.find('.hf-photo').exists()).toBe(true)
    expect(wrapper.find('.hf-photo__sheen').exists()).toBe(true)
  })

  it('rounded=md 时加 hf-photo--md 类', () => {
    const wrapper = mount(PhotoTile, { props: { src: 'x', rounded: 'md' } })
    expect(wrapper.find('.hf-photo--md').exists()).toBe(true)
  })
})
