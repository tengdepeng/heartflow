import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const KEY_META_KEY = 'hf:safety:key_meta'

function waitFor(ms = 250) {
  return new Promise(r => setTimeout(r, ms))
}

async function mountPanel() {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../CryptoGuardPanel.vue')
  const wrapper = mount(mod.default)
  // 等待 onMounted 中的异步 initialize()（内部会生成系统默认 AES 密钥）
  await waitFor()
  return wrapper
}

describe('CryptoGuardPanel 加密守护', () => {
  it('初始化后进入就绪状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('加密守护')
    expect(wrapper.text()).toContain('就绪')
  })

  it('生成 AES 密钥后出现在活跃密钥', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.cgp-input').setValue('我的密钥')
    await wrapper.find('.cgp-aes-btn').trigger('click')
    await waitFor()

    expect(wrapper.text()).toContain('我的密钥')
    const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
    const data = JSON.parse(raw)
    const keys = data.kvStore[KEY_META_KEY] ?? []
    // 初始化生成 1 个系统默认密钥 + 手动生成 1 个
    expect(keys.length).toBe(2)
    expect(keys.some((k: any) => k.label === '我的密钥')).toBe(true)
  })

  it('加密后展示密文，解密还原明文', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.cgp-textarea').setValue('秘密内容')
    await wrapper.find('.cgp-encrypt-btn').trigger('click')
    await waitFor()
    expect(wrapper.text()).toContain('密文')

    await wrapper.find('.cgp-decrypt-btn').trigger('click')
    await waitFor()
    expect(wrapper.text()).toContain('秘密内容')
  })
})
