// ============================================================
// VaultCredentialPanel 组件测试（INCR-371：保险库·凭证保险箱面板）
// 覆盖：空态 / 新增凭证 / 概览更新 / 弱密审计 / 重复口令审计 / 搜索 / 显示隐藏 / 删除
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const STRONG = 'Str0ng#Passw0rd!'
const WEAK = '123456'

async function mountPanel(seed: Array<Record<string, any>> = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: seed.length ? { 'hf:vault_credentials': seed } : {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../VaultCredentialPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function credential(overrides: Record<string, any> = {}) {
  return {
    id: 'c1',
    title: '谷歌邮箱',
    username: 'me@gmail.com',
    password: STRONG,
    url: 'gmail.com',
    notes: '主邮箱',
    category: 'email',
    at: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

async function fillAndSubmit(wrapper: any, title: string, username: string, password: string) {
  await wrapper.find('[data-test="vcp-title"]').setValue(title)
  await wrapper.find('[data-test="vcp-username"]').setValue(username)
  await wrapper.find('[data-test="vcp-password"]').setValue(password)
  await wrapper.find('[data-test="vcp-create"]').trigger('submit')
  await wrapper.vm.$nextTick()
}

describe('VaultCredentialPanel 凭证保险箱（INCR-371）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染引导态，概览不出现', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="vault-credential"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('凭证保险箱')
    expect(wrapper.find('[data-test="vcp-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vcp-ov"]').exists()).toBe(false)
  })

  it('新增凭证后列表渲染、概览与弱率更新', async () => {
    const wrapper = await mountPanel()
    await fillAndSubmit(wrapper, '网易邮箱', 'id@163.com', STRONG)
    expect(wrapper.text()).toContain('网易邮箱')
    expect(wrapper.find('[data-test="vcp-ov"]').exists()).toBe(true)
    expect(wrapper.find('.vcp-ov-num').text()).toContain('1') // 条目数
    expect(wrapper.find('[data-test="vcp-group-login"]').exists()).toBe(true) // 默认分类 login
  })

  it('默认隐藏口令，点击可显示再隐藏', async () => {
    const wrapper = await mountPanel([credential()])
    const masked = wrapper.find('[data-test="vcp-pwdtext-c1"]')
    expect(masked.text()).toContain('•') // 掩码
    expect(masked.text()).not.toContain(STRONG)
    await wrapper.find('[data-test="vcp-reveal-c1"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="vcp-pwdtext-c1"]').text()).toContain(STRONG)
    await wrapper.find('[data-test="vcp-reveal-c1"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="vcp-pwdtext-c1"]').text()).not.toContain(STRONG)
  })

  it('弱密码审计：弱口令条目单列并计入弱率', async () => {
    const wrapper = await mountPanel([
      credential({ id: 'w1', title: '弱密账号', password: WEAK }),
      credential({ id: 's1', title: '强密账号' }),
    ])
    expect(wrapper.find('[data-test="vcp-card-weak"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vcp-weak-w1"]').exists()).toBe(true)
    const ov = wrapper.findAll('.vcp-ov-box')
    expect(ov[1].text()).toContain('1') // weakCount
    expect(wrapper.text()).toContain('弱率 50%') // 1 / 2
  })

  it('重复口令审计：同密条目并列计数', async () => {
    const wrapper = await mountPanel([
      credential({ id: 'r1', title: '购物A', password: 'Reused#Pass2026' }),
      credential({ id: 'r2', title: '购物B', password: 'Reused#Pass2026' }),
    ])
    expect(wrapper.find('[data-test="vcp-card-reused"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vcp-reused-r1"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vcp-reused-r2"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vcp-reused-r1"]').text()).toContain('×2')
  })

  it('搜索过滤标题/账号', async () => {
    const wrapper = await mountPanel([
      credential({ id: 'a', title: '工作邮箱' }),
      credential({ id: 'b', title: '游戏账号', notes: '' }),
    ])
    await wrapper.find('[data-test="vcp-query"]').setValue('邮箱')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="vcp-cr-a"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vcp-cr-b"]').exists()).toBe(false)
  })

  it('删除凭证后列表与概览同步更新', async () => {
    const wrapper = await mountPanel([credential({ id: 'd1', title: '待删账号' }), credential({ id: 'k1', title: '保留账号' })])
    await wrapper.find('[data-test="vcp-remove-d1"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="vcp-cr-d1"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="vcp-cr-k1"]').exists()).toBe(true)
    expect(wrapper.find('.vcp-ov-num').text()).toContain('1') // 剩 1 条
  })

  // ============================================================
  // INCR-449：接线 vault-entries 的 updateCredential（此前引擎已实现
  // 但面板零消费 → 密码改了只能删了重录）。每条凭证加「编辑」，
  // 回填表单进入编辑态，保存走 updateCredential（字段级 patch + 刷 updatedAt）。
  // ============================================================
  it('INCR-449 点编辑回填表单并进入编辑态', async () => {
    const wrapper = await mountPanel([credential({ id: 'e1', title: '旧标题', username: 'old@x.com', password: WEAK })])
    expect(wrapper.find('[data-test="vcp-editing-hint"]').exists()).toBe(false)
    await wrapper.find('[data-test="vcp-edit-e1"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="vcp-editing-hint"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vcp-editing-hint"]').text()).toContain('旧标题')
    // 标题/账号/密码已回填
    expect((wrapper.find('[data-test="vcp-title"]').element as HTMLInputElement).value).toBe('旧标题')
    expect((wrapper.find('[data-test="vcp-username"]').element as HTMLInputElement).value).toBe('old@x.com')
    expect((wrapper.find('[data-test="vcp-password"]').element as HTMLInputElement).value).toBe(WEAK)
    // 按钮文案切到编辑态
    expect(wrapper.find('[data-test="vcp-create"]').text()).toContain('保存修改')
  })

  it('INCR-449 编辑保存后就地更新条目而非新增，且退出编辑态', async () => {
    const wrapper = await mountPanel([credential({ id: 'e1', title: '旧标题', password: WEAK })])
    await wrapper.find('[data-test="vcp-edit-e1"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="vcp-title"]').setValue('新标题')
    await wrapper.find('[data-test="vcp-password"]').setValue(STRONG)
    await wrapper.find('[data-test="vcp-create"]').trigger('submit')
    await wrapper.vm.$nextTick()
    // 条目数仍为 1（更新而非新增）
    expect(wrapper.find('.vcp-ov-num').text()).toContain('1')
    expect(wrapper.find('[data-test="vcp-cr-e1"]').text()).toContain('新标题')
    expect(wrapper.find('[data-test="vcp-cr-e1"]').text()).not.toContain('旧标题')
    // 弱密审计随之消失（密码已改强）
    expect(wrapper.find('[data-test="vcp-card-weak"]').exists()).toBe(false)
    // 退出编辑态
    expect(wrapper.find('[data-test="vcp-editing-hint"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="vcp-create"]').text()).toContain('存入')
  })

  it('INCR-449 取消编辑与删除正在编辑的条目都回到新增态', async () => {
    const wrapper = await mountPanel([credential({ id: 'e1' }), credential({ id: 'e2', title: '另一条' })])
    await wrapper.find('[data-test="vcp-edit-e1"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="vcp-editing-hint"]').exists()).toBe(true)
    await wrapper.find('[data-test="vcp-cancel-edit"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="vcp-editing-hint"]').exists()).toBe(false)
    // 编辑 e2 后直接删除它，应自动回到新增态
    await wrapper.find('[data-test="vcp-edit-e2"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="vcp-remove-e2"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="vcp-editing-hint"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="vcp-cr-e2"]').exists()).toBe(false)
  })
})