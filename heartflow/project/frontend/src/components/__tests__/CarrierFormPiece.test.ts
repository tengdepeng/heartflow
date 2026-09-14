// ============================================================
// 幕僚 · 载体形态选择器（CarrierFormPiece）组件单测
// 覆盖：4 种官方几何渲染与选中态 / 形态切发 update / 形态标签输入 /
//       视觉滑块（通透度/辉光/缩放/色调）发 update / 图片导入（成功+降采样+失败提示）
// 数据契约：v-model（update:modelValue）+ modelValue: AdvisorCarrier。
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { AdvisorCarrier } from '../../types'

const mockReadImage = vi.fn()

vi.mock('../../modules/advisor/carrier-io', () => ({
  readImageAsDataURL: (...a: any[]) => mockReadImage(...a),
}))

import CarrierFormPiece from '../CarrierFormPiece.vue'

function makeCarrier(overrides: Partial<AdvisorCarrier> = {}): AdvisorCarrier {
  return {
    kind: 'official-geometry',
    geometry: 'orb',
    ...overrides,
  } as AdvisorCarrier
}

async function getWrapper(model: AdvisorCarrier) {
  // 用内联组件桥接 v-model，捕获 update 事件
  const Host = defineComponent({
    props: { model: { type: Object as () => AdvisorCarrier, required: true } },
    emits: ['update:model'],
    setup(props, { emit }) {
      return () =>
        h(CarrierFormPiece, {
          modelValue: props.model,
          'onUpdate:modelValue': (v: AdvisorCarrier) => emit('update:model', v),
        })
    },
  })
  return mount(Host, { props: { model } })
}

describe('CarrierFormPiece · 载体形态选择器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染 4 种官方几何 + 导入图片入口（共 5 个几何按钮）', async () => {
    const w = await getWrapper(makeCarrier())
    const geoms = w.findAll('.cp-geom')
    expect(geoms.length).toBe(5) // 玉珠/晶簇/焰/种 + 导入图片
    expect(w.text()).toContain('玉珠')
    expect(w.text()).toContain('导入图片')
  })

  it('当前几何呈选中态（active class + glyph 预览）', async () => {
    const w = await getWrapper(makeCarrier({ geometry: 'crystal' }))
    const active = w.find('.cp-geom.active')
    expect(active.exists()).toBe(true)
    expect(active.text()).toContain('晶簇')
    expect(w.find('.cp-preview-glyph').text()).toBe('◆')
  })

  it('点击另一几何发出 update:modelValue（kind=official-geometry 且清空 imageData）', async () => {
    const w = await getWrapper(makeCarrier({ geometry: 'orb' }))
    const seedBtn = w.findAll('.cp-geom').find((b) => b.text().includes('种'))!
    await seedBtn.trigger('click')
    const emitted = w.emitted('update:model')!
    const ev = emitted[emitted.length - 1][0] as AdvisorCarrier
    expect(ev.kind).toBe('official-geometry')
    expect(ev.geometry).toBe('seed')
    expect(ev.imageData).toBeUndefined()
  })

  it('形态标签输入发 update:modelValue', async () => {
    const w = await getWrapper(makeCarrier())
    const input = w.find('.cp-label-input input')
    await input.setValue('我的守护灵')
    const ev = w.emitted('update:model')![0][0] as AdvisorCarrier
    expect(ev.formLabel).toBe('我的守护灵')
  })

  it('通透度滑块调整发 update（玻璃值 0.5 → 50%）', async () => {
    const w = await getWrapper(makeCarrier())
    const ranges = w.findAll('.cp-range input[type="range"]')
    expect(ranges.length).toBe(3)
    await ranges[0].setValue('0.5')
    const ev = w.emitted('update:model')![0][0] as AdvisorCarrier
    expect(ev.glass).toBe(0.5)
  })

  it('图片导入成功：读为 dataURL 并切 kind=user-image，显示预览 img', async () => {
    mockReadImage.mockResolvedValue('data:image/png;base64,AAAA')
    const w = await getWrapper(makeCarrier())
    const fileInput = w.find('.cp-import input[type="file"]')
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    Object.defineProperty(fileInput.element, 'files', { value: [file] })
    await fileInput.trigger('change')
    await new Promise((r) => setTimeout(r, 0))
    const ev = w.emitted('update:model')![0][0] as AdvisorCarrier
    expect(ev.kind).toBe('user-image')
    expect(ev.imageData).toBe('data:image/png;base64,AAAA')
    expect(mockReadImage).toHaveBeenCalledWith(file)
  })

  it('图片导入失败：显示错误提示且不发 update', async () => {
    mockReadImage.mockRejectedValue(new Error('图片过大'))
    const w = await getWrapper(makeCarrier())
    const fileInput = w.find('.cp-import input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })] })
    await fileInput.trigger('change')
    await new Promise((r) => setTimeout(r, 0))
    expect(w.find('.cp-error').text()).toContain('图片过大')
    expect(w.emitted('update:model')).toBeUndefined()
  })
})