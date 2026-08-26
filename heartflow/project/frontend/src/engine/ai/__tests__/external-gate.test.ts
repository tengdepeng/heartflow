// ============================================================
// 外部 AI 端点出口闸测试（宪法第 I 条 本地私有 · fail-closed）
// ============================================================
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadSchema, saveSchema } from '../../storage/core'
import {
  isLocalAIModelHost,
  isExternalAIConsented,
  checkExternalAIGate,
} from '../external-gate'

/** 通过存储切换「允许远程 AI 端点」同意状态，贴近真实运行时路径 */
function setConsent(value: boolean): void {
  const schema = loadSchema()
  schema.config.complianceOverride.allowExternalAI = value
  saveSchema(schema)
}

beforeEach(() => setConsent(false))
afterEach(() => setConsent(false))

describe('isLocalAIModelHost', () => {
  it('localhost 放行', () => {
    expect(isLocalAIModelHost('http://localhost:11434')).toBe(true)
  })
  it('127.0.0.1 放行', () => {
    expect(isLocalAIModelHost('http://127.0.0.1:8080')).toBe(true)
  })
  it('::1 放行', () => {
    expect(isLocalAIModelHost('http://[::1]:11434')).toBe(true)
  })
  it('0.0.0.0 放行（本地绑定全网卡）', () => {
    expect(isLocalAIModelHost('http://0.0.0.0:11434')).toBe(true)
  })
  it('*.localhost 保留后缀放行', () => {
    expect(isLocalAIModelHost('http://ollama.localhost:11434')).toBe(true)
  })
  it('远程域名拦截', () => {
    expect(isLocalAIModelHost('https://api.openai.com/v1')).toBe(false)
  })
  it('远程 IP 拦截', () => {
    expect(isLocalAIModelHost('https://192.168.1.1:8080')).toBe(false)
  })
  it('undefined / 空串 视为非本地', () => {
    expect(isLocalAIModelHost(undefined)).toBe(false)
    expect(isLocalAIModelHost('')).toBe(false)
  })
  it('非法 URL 视为非本地', () => {
    expect(isLocalAIModelHost('not a url')).toBe(false)
  })
})

describe('isExternalAIConsented', () => {
  it('默认 false（fail-closed）', () => {
    expect(isExternalAIConsented()).toBe(false)
  })
  it('开启 allowExternalAI 后为 true', () => {
    setConsent(true)
    expect(isExternalAIConsented()).toBe(true)
  })
})

describe('checkExternalAIGate', () => {
  it('本地地址永远放行（无论同意状态）', () => {
    expect(checkExternalAIGate('http://localhost:11434')).toBeNull()
    setConsent(true)
    expect(checkExternalAIGate('http://127.0.0.1:11434')).toBeNull()
    setConsent(false)
    expect(checkExternalAIGate('http://[::1]:11434')).toBeNull()
  })

  it('远程地址 + 未同意 → 拦截（返回原因字符串）', () => {
    const reason = checkExternalAIGate('https://api.openai.com/v1')
    expect(reason).not.toBeNull()
    expect(typeof reason).toBe('string')
  })

  it('远程地址 + 已同意 → 放行', () => {
    setConsent(true)
    expect(checkExternalAIGate('https://api.openai.com/v1')).toBeNull()
  })

  it('undefined / 空 baseUrl → 拦截（fail-closed）', () => {
    expect(checkExternalAIGate(undefined)).not.toBeNull()
    expect(checkExternalAIGate('')).not.toBeNull()
  })
})
