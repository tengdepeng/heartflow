// ============================================================
// GuidedCapturePanel · AI 拍照引导取景面板（INCR-506）测试
// 覆盖：三诊场景切换 / 分步引导随场景更新 / 无摄像头中性提示 /
//       历史元数据渲染与清空
// 依赖真实 photo-guide 引擎 + 真实 storage（jsdom，无摄像头）。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { storage } from '../../engine/storage'
import { reloadPhotoGuide } from '../../modules/photo-guide/photo-guide'
import GuidedCapturePanel from '../GuidedCapturePanel.vue'

const KEY = 'hf:photo_captures'

describe('GuidedCapturePanel · AI 拍照引导取景', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadPhotoGuide()
  })

  it('渲染标题与三类场景，默认选中舌诊', () => {
    const w = mount(GuidedCapturePanel)
    expect(w.text()).toContain('AI 拍照引导取景')
    const scenes = w.findAll('.gcap-scene')
    expect(scenes).toHaveLength(3)
    expect(scenes[0].classes()).toContain('is-active')
    expect(w.text()).toContain('舌诊取景')
  })

  it('切换场景后分步引导随之更新', async () => {
    const w = mount(GuidedCapturePanel)
    expect(w.text()).toContain('自然伸出舌头')
    await w.findAll('.gcap-scene')[1].trigger('click') // 面诊
    expect(w.findAll('.gcap-scene')[1].classes()).toContain('is-active')
    expect(w.text()).toContain('面部完整落入中央方框')
    expect(w.text()).not.toContain('自然伸出舌头')
  })

  it('无摄像头环境点击开启取景给出中性提示', async () => {
    const w = mount(GuidedCapturePanel)
    await w.find('.gcap-btn--primary').trigger('click')
    expect(w.find('.gcap-error').exists()).toBe(true)
    expect(w.text()).toContain('不支持摄像头')
  })

  it('无历史时不渲染记录区', () => {
    const w = mount(GuidedCapturePanel)
    expect(w.find('.gcap-history').exists()).toBe(false)
  })

  it('预置历史后渲染记录并支持清空', async () => {
    storage.setKV(KEY, [
      { id: 'pc_1', sceneId: 'pulse', at: '2026-02-02T09:00:00.000Z', score: 90, level: 'good' },
      { id: 'pc_2', sceneId: 'face', at: '2026-02-01T09:00:00.000Z', score: 40, level: 'poor' },
    ])
    reloadPhotoGuide()
    const w = mount(GuidedCapturePanel)
    expect(w.findAll('.gcap-history-item')).toHaveLength(2)
    expect(w.text()).toContain('脉诊取景')
    await w.find('.gcap-clear').trigger('click')
    expect(w.find('.gcap-history').exists()).toBe(false)
  })
})
