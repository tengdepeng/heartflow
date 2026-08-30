import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AIModelSettings from '../AIModelSettings.vue'
import {
  setProviderConfig,
  removeProviderConfig,
  switchActiveProvider,
  patchAIEngineConfig,
} from '../../../engine/ai/config'
import type { AIProviderConfig } from '../../../engine/ai/types'

vi.mock('../../../engine/ai/external-gate', () => ({
  isExternalAIConsented: () => false,
  // 只有 localhost / 127.0.0.1 视为本地；其余一律视为会被出口闸拦截
  isLocalAIModelHost: (url?: string) => !!url && /localhost|127\.0\.0\.1/.test(url),
  checkExternalAIGate: () => null,
}))

// aiEngine 只在「测试连接」时用到，这里固定返回 true，避免真实网络外呼
vi.mock('../../../engine/ai', () => ({
  aiEngine: { checkConnection: async () => true },
}))

function makeCfg(over: Partial<AIProviderConfig> = {}): AIProviderConfig {
  return {
    type: 'local',
    name: undefined,
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    model: {
      model: 'qwen2.5:7b',
      temperature: 0.7,
      maxTokens: 2048,
      contextWindow: 8192,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    timeout: 30000,
    maxRetries: 2,
    retryDelay: 1000,
    ...over,
  }
}

const TEST_ID = 'hf-test-provider'

describe('外链房 · AI 模型与接口设置', () => {
  beforeEach(() => {
    // 复位引擎开关（注意：不要把 memory 置空，否则组件渲染会失去兜底对象）
    patchAIEngineConfig({ enabled: false })
    removeProviderConfig(TEST_ID)
    removeProviderConfig('hf-test-remote')
  })

  afterEach(() => {
    removeProviderConfig(TEST_ID)
    removeProviderConfig('hf-test-remote')
  })

  it('渲染引擎总开关与既有提供商列表', () => {
    setProviderConfig(TEST_ID, makeCfg())
    const wrapper = mount(AIModelSettings)
    expect(wrapper.find('.ai-master').exists()).toBe(true)
    const names = wrapper.findAll('.ai-card-name').map((n) => n.text())
    expect(names).toContain(TEST_ID)
  })

  it('当前激活的提供商带「当前」标记与高亮', () => {
    setProviderConfig(TEST_ID, makeCfg())
    switchActiveProvider(TEST_ID)
    const wrapper = mount(AIModelSettings)
    const card = wrapper.findAll('.ai-card').find((c) => c.text().includes(TEST_ID))!
    expect(card.classes()).toContain('is-active')
    expect(card.text()).toContain('当前')
  })

  it('本地端点不提示拦截，远程端点提示会被出口闸拦截', () => {
    setProviderConfig(TEST_ID, makeCfg())
    setProviderConfig(
      'hf-test-remote',
      makeCfg({ type: 'openai', baseUrl: 'https://api.example.com/v1', apiKey: 'sk-x' }),
    )
    const wrapper = mount(AIModelSettings)
    const cards = wrapper.findAll('.ai-card')
    const local = cards.find((c) => c.text().includes(TEST_ID))!
    const remote = cards.find((c) => c.text().includes('hf-test-remote'))!
    expect(local.find('.ai-gated').exists()).toBe(false)
    expect(remote.find('.ai-gated').exists()).toBe(true)
    expect(remote.text()).toContain('会被出口闸拦截')
  })

  it('无提供商时给出起步引导（而不是空白面板）', () => {
    // 清掉默认提供商，制造真空态
    removeProviderConfig('default')
    const wrapper = mount(AIModelSettings)
    expect(wrapper.find('.ai-empty').exists()).toBe(true)
    expect(wrapper.find('.ai-empty').text()).toContain('localhost:11434')
    // 还原，避免影响其它用例
    setProviderConfig('default', makeCfg({ type: 'openai', baseUrl: 'https://api.openai.com/v1' }))
  })

  it('通过表单新增本地提供商：填写后保存即入列', async () => {
    const wrapper = mount(AIModelSettings)
    await wrapper.find('.ai-btn--primary').trigger('click')
    const inputs = wrapper.findAll('.ai-modal .ai-input')
    await inputs[0].setValue(TEST_ID) // 标识
    await inputs[2].setValue('http://localhost:11434/v1') // baseUrl
    await inputs[4].setValue('qwen2.5:7b') // 模型名
    await wrapper.findAll('.ai-modal .ai-btn--primary')[0].trigger('click')

    // 表单关闭且新提供商出现在列表
    expect(wrapper.find('.ai-modal').exists()).toBe(false)
    expect(wrapper.findAll('.ai-card-name').map((n) => n.text())).toContain(TEST_ID)
  })

  it('标识含非法字符时拒绝保存并提示', async () => {
    const wrapper = mount(AIModelSettings)
    await wrapper.find('.ai-btn--primary').trigger('click')
    const inputs = wrapper.findAll('.ai-modal .ai-input')
    await inputs[0].setValue('bad id!')
    await inputs[2].setValue('http://localhost:11434/v1')
    await inputs[4].setValue('qwen2.5:7b')
    await wrapper.findAll('.ai-modal .ai-btn--primary')[0].trigger('click')

    // 表单不关闭，给出提示
    expect(wrapper.find('.ai-modal').exists()).toBe(true)
    expect(wrapper.find('.ai-notice').exists()).toBe(true)
    expect(wrapper.find('.ai-notice').text()).toContain('标识')
  })

  it('非本地类型未填 API Key 时拒绝保存', async () => {
    const wrapper = mount(AIModelSettings)
    await wrapper.find('.ai-btn--primary').trigger('click')
    const inputs = wrapper.findAll('.ai-modal .ai-input')
    await inputs[0].setValue(TEST_ID)
    await inputs[1].setValue('openai') // 类型切为 OpenAI 兼容
    await inputs[2].setValue('https://api.openai.com/v1')
    await inputs[4].setValue('gpt-4o-mini')
    await wrapper.findAll('.ai-modal .ai-btn--primary')[0].trigger('click')

    expect(wrapper.find('.ai-modal').exists()).toBe(true)
    expect(wrapper.find('.ai-notice').text()).toContain('API Key')
  })
})
