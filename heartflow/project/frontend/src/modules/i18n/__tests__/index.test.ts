// ============================================================
// 国际化模块测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { registerLocale, getLocaleMap, isLocaleRegistered, SUPPORTED_LANGUAGES, getRegisteredLocales } from '../types'

// 注册测试翻译
const TEST_ZH = {
  'common.save': '保存',
  'common.cancel': '取消',
  'common.search': '搜索',
  'time.minutesAgo': '{n}分钟前',
  'time.hoursAgo': '{n}小时前',
  'note.empty': '将你的思绪安放在这里',
  'note.noMatch': '没有匹配「{tag}」的笔记',
  'focus.sessionCount': '专注次数',
  'focus.singular': '{count} 次专注',
  'focus.plural': '{count} 次专注',
}

const TEST_EN = {
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.search': 'Search',
  'time.minutesAgo': '{n} min ago',
  'time.hoursAgo': '{n} hr ago',
  'note.empty': 'Rest your thoughts here',
  'note.noMatch': 'No notes matching 「{tag}」',
  'focus.sessionCount': 'Focus Sessions',
  'focus.singular': '{count} focus session',
  'focus.plural': '{count} focus sessions',
}

describe('i18n types', () => {
  beforeEach(() => {
    // 清理已注册 locale
    for (const locale of getRegisteredLocales()) {
      registerLocale(locale, {})
    }
  })

  it('registerLocale 注册翻译映射', () => {
    registerLocale('zh-CN', TEST_ZH)
    const map = getLocaleMap('zh-CN')
    expect(map['common.save']).toBe('保存')
  })

  it('getLocaleMap 返回已注册的翻译', () => {
    registerLocale('en', TEST_EN)
    expect(getLocaleMap('en')['common.save']).toBe('Save')
  })

  it('getLocaleMap 未注册的 locale 返回空对象', () => {
    expect(getLocaleMap('zh-CN')).toEqual({})
  })

  it('isLocaleRegistered 正确判断', () => {
    registerLocale('zh-CN', TEST_ZH)
    expect(isLocaleRegistered('zh-CN')).toBe(true)
    expect(isLocaleRegistered('fr')).toBe(false)
  })

  it('SUPPORTED_LANGUAGES 包含 zh-CN 和 en', () => {
    const locales = SUPPORTED_LANGUAGES.map(l => l.locale)
    expect(locales).toContain('zh-CN')
    expect(locales).toContain('en')
  })

  it('getRegisteredLocales 返回已注册的 locale 列表', () => {
    registerLocale('zh-CN', TEST_ZH)
    registerLocale('en', TEST_EN)
    const locales = getRegisteredLocales()
    expect(locales).toContain('zh-CN')
    expect(locales).toContain('en')
  })
})

describe('i18n composable', () => {
  beforeEach(async () => {
    // 注册测试翻译
    registerLocale('zh-CN', TEST_ZH)
    registerLocale('en', TEST_EN)
    // 重置为中文
    const { setLocale } = await import('../index')
    setLocale('zh-CN')
  })

  it('t 函数查找中文字段', async () => {
    const { t } = await import('../index')
    expect(t('common.save')).toBe('保存')
  })

  it('t 函数查找英文字段', async () => {
    const { t, setLocale } = await import('../index')
    setLocale('en')
    expect(t('common.save')).toBe('Save')
  })

  it('t 函数支持插值参数', async () => {
    const { t } = await import('../index')
    expect(t('time.minutesAgo', { n: 5 })).toBe('5分钟前')
  })

  it('t 函数未找到的 key 返回原 key', async () => {
    const { t } = await import('../index')
    expect(t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('t 函数支持多个插值参数', async () => {
    // 注册带双参数的翻译到英文（避免影响 currentMap 缓存）
    registerLocale('en', { ...TEST_EN, 'test.multi': '{a} and {b}' })
    const { t, setLocale } = await import('../index')
    setLocale('en')
    expect(t('test.multi', { a: 'A', b: 'B' })).toBe('A and B')
  })

  it('tPlural 函数选择单数形式', async () => {
    const { tPlural } = await import('../index')
    // 切换英文测试复数
    const { setLocale } = await import('../index')
    setLocale('en')
    expect(tPlural('focus.singular', 'focus.plural', 1)).toBe('1 focus session')
  })

  it('tPlural 函数选择复数形式', async () => {
    const { tPlural, setLocale } = await import('../index')
    setLocale('en')
    expect(tPlural('focus.singular', 'focus.plural', 3)).toBe('3 focus sessions')
  })

  it('setLocale 切换语言并持久化', async () => {
    const { setLocale, getLocale, t } = await import('../index')
    setLocale('en')
    expect(getLocale()).toBe('en')
    expect(t('common.save')).toBe('Save')
  })

  it('setLocale 无效的 locale 不生效', async () => {
    const { setLocale, getLocale } = await import('../index')
    setLocale('zh-CN')
    const before = getLocale()
    // 尝试设置未注册的 locale
    ;(setLocale as any)('fr')
    expect(getLocale()).toBe(before)
  })

  it('getLocale 返回当前语言', async () => {
    const { getLocale } = await import('../index')
    expect(getLocale()).toBe('zh-CN')
  })

  it('getSupportedLanguages 返回语言列表', async () => {
    const { getSupportedLanguages } = await import('../index')
    const langs = getSupportedLanguages()
    expect(langs.length).toBeGreaterThanOrEqual(2)
    expect(langs[0].locale).toBe('zh-CN')
    expect(langs[1].locale).toBe('en')
  })

  it('useI18n 返回同样的接口', async () => {
    const { useI18n } = await import('../index')
    const i18n = useI18n()
    expect(typeof i18n.t).toBe('function')
    expect(typeof i18n.setLocale).toBe('function')
    expect(typeof i18n.getLocale).toBe('function')
    expect(i18n.supportedLanguages.length).toBeGreaterThanOrEqual(2)
  })
})

describe('i18n store', () => {
  beforeEach(async () => {
    registerLocale('zh-CN', TEST_ZH)
    registerLocale('en', TEST_EN)
    const { setLocale } = await import('../index')
    setLocale('zh-CN')
  })

  it('useI18nStore 提供 translate 方法', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const { useI18nStore } = await import('../index')
    const store = useI18nStore()
    expect(store.translate('common.save')).toBe('保存')
  })

  it('useI18nStore switchLocale 切换语言', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const { useI18nStore } = await import('../index')
    const store = useI18nStore()
    store.switchLocale('en')
    expect(store.translate('common.save')).toBe('Save')
    expect(store.locale).toBe('en')
  })

  it('useI18nStore 未知 key 返回原 key', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const { useI18nStore } = await import('../index')
    const store = useI18nStore()
    expect(store.translate('unknown.key')).toBe('unknown.key')
  })
})

describe('zh-CN 完整翻译', () => {
  it('注册所有导航键', () => {
    registerLocale('zh-CN', {
      'nav.home': '首页',
      'nav.settings': '设置',
      'nav.timeline': '时间之河',
    })
    const map = getLocaleMap('zh-CN')
    expect(map['nav.home']).toBe('首页')
    expect(map['nav.settings']).toBe('设置')
  })
})