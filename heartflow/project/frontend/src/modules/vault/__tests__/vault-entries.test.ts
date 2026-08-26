// ============================================================
// 密码条目与分类管理测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  createCredential,
  updateCredential,
  searchCredentials,
  credentialsByCategory,
  maskPassword,
  categoryName,
  categoryIcon,
  DEFAULT_VAULT_CATEGORIES,
} from '../vault-entries'

const NOW = new Date('2026-08-22T10:00:00Z')

function cred(over: Partial<Parameters<typeof createCredential>[0]> = {}) {
  return createCredential(
    {
      title: '邮箱',
      username: 'me@example.com',
      password: 'aB3$xY9#zQ7!wP5',
      url: 'https://mail.example.com',
      notes: '工作邮箱',
      category: 'email',
      ...over,
    },
    NOW,
  )
}

describe('createCredential', () => {
  it('创建完整条目并记录时间', () => {
    const c = cred()
    expect(c.title).toBe('邮箱')
    expect(c.username).toBe('me@example.com')
    expect(c.password).toBe('aB3$xY9#zQ7!wP5')
    expect(c.url).toBe('https://mail.example.com')
    expect(c.category).toBe('email')
    expect(c.at).toBe(NOW.toISOString())
    expect(c.updatedAt).toBe(NOW.toISOString())
    expect(c.id).toMatch(/^cr/)
  })

  it('去除首尾空白', () => {
    const c = cred({ title: '  银行  ', username: '  user  ' })
    expect(c.title).toBe('银行')
    expect(c.username).toBe('user')
  })
})

describe('updateCredential', () => {
  it('仅更新传入字段并刷新 updatedAt', () => {
    const c = cred()
    const later = new Date('2026-08-23T10:00:00Z')
    const u = updateCredential(c, { password: 'NewP@ss123' }, later)
    expect(u.password).toBe('NewP@ss123')
    expect(u.title).toBe('邮箱')
    expect(u.username).toBe('me@example.com')
    expect(u.updatedAt).toBe(later.toISOString())
    expect(u.at).toBe(NOW.toISOString())
  })

  it('可清空备注', () => {
    const c = cred({ notes: '工作邮箱' })
    const u = updateCredential(c, { notes: '' })
    expect(u.notes).toBe('')
  })
})

describe('searchCredentials', () => {
  it('空查询返回全部', () => {
    const list = [cred(), cred({ title: '银行' })]
    expect(searchCredentials(list, '')).toHaveLength(2)
  })

  it('按标题 / 账号 / 网址 / 备注匹配', () => {
    const list = [
      cred({ title: '邮箱', username: 'me@example.com', notes: '个人邮箱' }),
      cred({ title: '银行', username: 'bank', url: 'https://bank.example.com', notes: '工资卡' }),
    ]
    expect(searchCredentials(list, '邮箱')).toHaveLength(1)
    expect(searchCredentials(list, 'bank')).toHaveLength(1)
    expect(searchCredentials(list, 'example.com')).toHaveLength(2)
    expect(searchCredentials(list, '工资')).toHaveLength(1)
    expect(searchCredentials(list, '不存在')).toHaveLength(0)
  })

  it('大小写不敏感', () => {
    const list = [cred({ username: 'Me@Example.COM' })]
    expect(searchCredentials(list, 'me@example.com')).toHaveLength(1)
  })
})

describe('credentialsByCategory', () => {
  it('按分类分组并过滤空分类', () => {
    const list = [
      cred({ title: 'A', category: 'email' }),
      cred({ title: 'B', category: 'email' }),
      cred({ title: 'C', category: 'login' }),
    ]
    const groups = credentialsByCategory(list, DEFAULT_VAULT_CATEGORIES)
    expect(groups).toHaveLength(2)
    const email = groups.find(g => g.category.id === 'email')!
    expect(email.items).toHaveLength(2)
  })
})

describe('maskPassword', () => {
  it('掩码为圆点且不超过 12 个', () => {
    expect(maskPassword('secret')).toBe('••••••')
    expect(maskPassword('a'.repeat(30))).toBe('•'.repeat(12))
    expect(maskPassword('')).toBe('')
  })
})

describe('categoryName / categoryIcon', () => {
  it('解析分类名称与图标', () => {
    expect(categoryName(DEFAULT_VAULT_CATEGORIES, 'email')).toBe('邮箱')
    expect(categoryIcon(DEFAULT_VAULT_CATEGORIES, 'email')).toBe('✉️')
    expect(categoryName(DEFAULT_VAULT_CATEGORIES, 'missing')).toBe('未分类')
    expect(categoryIcon(DEFAULT_VAULT_CATEGORIES, 'missing')).toBe('📋')
  })
})
