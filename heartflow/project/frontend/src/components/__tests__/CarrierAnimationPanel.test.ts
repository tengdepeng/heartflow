// ============================================================
// CarrierAnimationPanel 组件测试 - 载体动画与材质混合
// 真实引擎全链路：直引 carrier-advanced 纯函数引擎（INCR-407）
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CarrierAnimationPanel from '../CarrierAnimationPanel.vue'
import {
  MORPH_LABELS,
  GLOW_LABELS,
  MATERIAL_LABELS,
  CARRIER_ANIMATION_PRESETS,
  BUILTIN_ANIMATION_SEQUENCES,
  MORPH_TRANSITIONS,
  blendMaterials,
} from '../../modules/customization/carrier-advanced'

function mountPanel() {
  return mount(CarrierAnimationPanel, {
    global: { stubs: { transition: false } },
  })
}

describe('CarrierAnimationPanel 载体动画与材质混合', () => {
  beforeEach(() => {
    document.execCommand = (() => () => true) as unknown as typeof document.execCommand
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => undefined },
      configurable: true,
    })
  })

  it('渲染标题与统计：形态/材质/光效/预设数量', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.text()).toContain('载体动画与材质混合')
    expect(wrapper.text()).toContain('8 种形态')
    expect(wrapper.text()).toContain('8 种材质')
    expect(wrapper.text()).toContain('6 种光效')
    expect(wrapper.text()).toContain(`${CARRIER_ANIMATION_PRESETS.length} 套预设`)
  })

  it('渲染形态选择 chips（8 个）且默认选中圆球', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.findAll('[data-testid^="cva-morph-"]').length).toBe(8)
    expect(wrapper.text()).toContain(MORPH_LABELS.orb)
    const orb = wrapper.find('[data-testid="cva-morph-orb"]')
    expect(orb.classes()).toContain('cva-chip--active')
  })

  it('点击形态 chip 切换选中状态并更新预览标签', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.find('[data-testid="cva-morph-lotus"]').trigger('click')
    expect(wrapper.find('[data-testid="cva-morph-lotus"]').classes()).toContain('cva-chip--active')
    expect(wrapper.find('[data-testid="cva-morph-orb"]').classes()).not.toContain('cva-chip--active')
  })

  it('渲染材质选择 chips（8 个）与光效 chips（6 个）', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.findAll('[data-testid^="cva-material-"]').length).toBe(8)
    expect(wrapper.findAll('[data-testid^="cva-glow-"]').length).toBe(6)
    expect(wrapper.text()).toContain(MATERIAL_LABELS.pearl)
    expect(wrapper.text()).toContain(GLOW_LABELS.pulse)
  })

  it('点击材质 chip 切换选中状态', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.find('[data-testid="cva-material-crystal"]').trigger('click')
    expect(wrapper.find('[data-testid="cva-material-crystal"]').classes()).toContain('cva-chip--active')
  })

  it('展示实时生成的关键帧与动画 CSS（含光效名与时长）', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    // 默认 glow=pulse，生成 pulse 关键帧与 CSS
    expect(wrapper.find('.cva-pre').text()).toContain('carrier-pulse')
    expect(wrapper.find('.cva-code').text()).toContain('animation: carrier-pulse')
  })

  it('修改时长输入更新动画 CSS 输出', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.find('[data-testid="cva-duration"]').setValue(4500)
    expect(wrapper.find('.cva-code').text()).toContain('4500ms')
  })

  it('渲染全部动画预设卡片并点击套用（含名称/描述/材质/光效/时长）', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    for (const p of CARRIER_ANIMATION_PRESETS) {
      expect(wrapper.find(`[data-testid="cva-preset-${p.id}"]`).exists()).toBe(true)
      expect(wrapper.text()).toContain(p.name)
      expect(wrapper.text()).toContain(p.description)
    }
    // 点击「水晶绽放」预设，预览标签变为「结晶」
    await wrapper.find('[data-testid="cva-preset-anim_crystal_bloom"]').trigger('click')
    expect(wrapper.find('[data-testid="cva-morph-crystal"]').classes()).toContain('cva-chip--active')
    expect(wrapper.find('.cva-preview-label').text()).toBe(MORPH_LABELS.crystal)
    // 预设的高亮态出现
    expect(wrapper.find('[data-testid="cva-preset-anim_crystal_bloom"]').classes()).toContain('cva-preset--active')
  })

  it('材质混合工具：源/目标/比例可调，展示混合结果材质名', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    // 默认 glass→opal, ratio 0.5
    const expected = blendMaterials('glass', 'opal', 0.5)
    expect(wrapper.text()).toContain(MATERIAL_LABELS.glass)
    expect(wrapper.text()).toContain(MATERIAL_LABELS.opal)
    expect(wrapper.text()).toContain(MATERIAL_LABELS[expected])
    // 切换到 crystal 源，混合结果随之更新
    await wrapper.find('[data-testid="cva-blend-from"]').setValue('crystal')
    const expected2 = blendMaterials('crystal', 'opal', 0.5)
    expect(wrapper.text()).toContain(MATERIAL_LABELS[expected2])
  })

  it('渲染形态过渡列表（引擎定义的过渡组合）', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const count = Object.keys(MORPH_TRANSITIONS).length
    expect(wrapper.findAll('.cva-transition').length).toBe(count)
    // 首条 orb→crystal
    expect(wrapper.text()).toContain(MORPH_LABELS.orb)
    expect(wrapper.text()).toContain(MORPH_LABELS.crystal)
  })

  it('渲染内置动画序列（名称 + 各步骤）', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    for (const s of BUILTIN_ANIMATION_SEQUENCES) {
      expect(wrapper.text()).toContain(s.name)
    }
    expect(wrapper.text()).toContain('唤醒仪式')
    expect(wrapper.text()).toContain('冥想之旅')
  })

  it('复制 CSS：点击后出现复制提示', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.find('[data-testid="cva-copy-css"]').trigger('click')
    expect(wrapper.find('.cva-copy-hint').exists()).toBe(true)
  })

  // ---- INCR-456：预设应用走引擎构造器 createAnimationConfig ----

  it('应用预设后 7 个配置字段逐一等于该预设值（引擎构造器全链路）', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const preset = CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_crystal_bloom')!
    await wrapper.find('[data-testid="cva-preset-anim_crystal_bloom"]').trigger('click')

    // 四个身份字段：形态/光效/材质/主色
    expect(wrapper.find('[data-testid="cva-morph-crystal"]').classes()).toContain('cva-chip--active')
    expect(wrapper.find('[data-testid="cva-glow-sparkle"]').classes()).toContain('cva-chip--active')
    expect(wrapper.find('[data-testid="cva-material-crystal"]').classes()).toContain('cva-chip--active')
    expect((wrapper.find('[data-testid="cva-primary"]').element as HTMLInputElement).value).toBe(preset.config.primaryColor)
    // 三个调整字段：辅色/时长/缓动（loop 走checkbox，单独断言）
    expect((wrapper.find('[data-testid="cva-secondary"]').element as HTMLInputElement).value).toBe(preset.config.secondaryColor)
    expect((wrapper.find('[data-testid="cva-duration"]').element as HTMLInputElement).value).toBe(String(preset.config.duration))
    expect(wrapper.find('[data-testid="cva-easing-spring"]').classes()).toContain('cva-chip--active')
    expect((wrapper.find('[data-testid="cva-loop"]').element as HTMLInputElement).checked).toBe(preset.config.loop)
    // 锁的是引擎默认语义（createAnimationConfig 硬编码 enabled: true），非预设语义
    expect((wrapper.find('[data-testid="cva-enabled"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('预设状态一致性：应用某预设后该预设呈选中态（applyPreset 与 presetIsActive 同源）', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    for (const p of CARRIER_ANIMATION_PRESETS) {
      const btn = wrapper.find(`[data-testid="cva-preset-${p.id}"]`)
      expect(btn.classes()).not.toContain('cva-preset--active')
      await btn.trigger('click')
      // 刚点完立刻回读：引擎构造结果必须被 presetIsActive 判为命中
      expect(wrapper.find(`[data-testid="cva-preset-${p.id}"]`).classes()).toContain('cva-preset--active')
    }
  })

  it('另一预设不误判：应用预设 A 后预设 B 仍为未选中', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const a = CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_gentle_pulse')!
    const b = CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_nebula_drift')!
    await wrapper.find(`[data-testid="cva-preset-${a.id}"]`).trigger('click')
    expect(wrapper.find(`[data-testid="cva-preset-${a.id}"]`).classes()).toContain('cva-preset--active')
    expect(wrapper.find(`[data-testid="cva-preset-${b.id}"]`).classes()).not.toContain('cva-preset--active')
  })

  // ---- INCR-456 补修：给 presetIsActive 的 duration 比对装上牙齿 ----
  // 本例只改 duration 这一个字段，其余 6 个比对字段保持与预设一致，
  // 因此它能精准证明「&& c.duration === t.duration」这一行确实生效。
  // 若顺带改了别的字段，本例会退化成「另一预设不误判」而挡不住变异。
  it('仅调整时长后该预设不再呈选中态', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const a = CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_gentle_pulse')!
    await wrapper.find(`[data-testid="cva-preset-${a.id}"]`).trigger('click')
    // 前置确认：刚应用时该预设确实呈选中态
    expect(wrapper.find(`[data-testid="cva-preset-${a.id}"]`).classes()).toContain('cva-preset--active')

    // 只动 duration，其余 6 个比对字段不动
    const nextDuration = a.config.duration + 1500
    expect(nextDuration).not.toBe(a.config.duration)
    await wrapper.find('[data-testid="cva-duration"]').setValue(nextDuration)
    expect((wrapper.find('[data-testid="cva-duration"]').element as HTMLInputElement).value).toBe(String(nextDuration))

    // 时长已与预设不同 → 该预设不再算「已应用」，高亮必须消失
    expect(wrapper.find(`[data-testid="cva-preset-${a.id}"]`).classes()).not.toContain('cva-preset--active')
  })
})