import { describe, it, expect } from 'vitest'
import { parseTask } from '../parser'
import { resolveRoomRoute } from '../roomResolver'

// 回归：用户说「打开/记录工时」必须跳转到更漏(/worklog)，
// 而不是被 focus 误判成计时器，也不是无反应。
describe('worklog 导航识别', () => {
  it('工时 / 工作日志 别名解析到 /worklog', () => {
    expect(resolveRoomRoute('工时').path).toBe('/worklog')
    expect(resolveRoomRoute('工作日志').path).toBe('/worklog')
    expect(resolveRoomRoute('更漏').path).toBe('/worklog')
  })

  it('打开工时 → explore 意图 + 目标工时（不误判 focus）', () => {
    const r = parseTask('打开工时')
    expect(r.best?.intent).toBe('explore')
    expect(r.best?.intent).not.toBe('focus') // 关键：不能启动计时器
    expect(r.best?.params?.roomTarget).toBe('工时')
  })

  it('记录工时 → explore 意图 + 目标工时（记录也可导航）', () => {
    const r = parseTask('记录工时')
    expect(r.best?.intent).toBe('explore')
    expect(r.best?.params?.roomTarget).toBe('工时')
  })

  it('去 / 前往 工时 同样跳转', () => {
    for (const p of ['去工时', '前往工时']) {
      const r = parseTask(p)
      expect(r.best?.intent).toBe('explore')
      expect(r.best?.params?.roomTarget).toBe('工时')
    }
  })

  it('记录笔记 / 记录情绪 不被导航抢走（仍走各自意图）', () => {
    expect(parseTask('记录笔记').best?.intent).toBe('note')
    expect(parseTask('记录情绪').best?.intent).toBe('emotion')
  })

  it('扩充导航动词：进/访问/走/转到/导航/去到/唤出/展开/跳转/切到/逛 均能跳转', () => {
    const cases: [string, string][] = [
      ['进设置', '/settings'],
      ['访问记账', '/reward'],
      ['走心流', '/'],
      ['转到花园', '/garden'],
      ['导航到情绪', '/garden'],
      ['去到书房', '/study'],
      ['唤出星图', '/star-map'],
      ['展开地图', '/map'],
      ['跳转知识', '/knowledge'],
      ['切到设置', '/settings'],
      ['逛知识殿堂', '/knowledge'],
      ['进更漏', '/worklog'],
    ]
    for (const [phrase, expectPath] of cases) {
      const r = parseTask(phrase)
      // 多数动词走 explore；但「访问记账」被 finance、「进设置 / 切到设置」被 settings
      // 以更高置信度抢占（与 explore 同目的地，属正确优先级），不强制意图名。
      const override = phrase === '访问记账' || phrase === '进设置' || phrase === '切到设置'
      if (!override) {
        expect(r.best?.intent, `${phrase} 应为 explore`).toBe('explore')
      }
      // settings/finance 意图经 executor 硬编码 target（「设置」/「劳酬」）导航，
      // explore 经 params.roomTarget；统一用 resolveRoomRoute 校验落地路由。
      // （'settings' 不在 IntentCategory 联合内，比较前收窄为 string 以通过类型门）
      const intent = r.best?.intent as string | undefined
      const rt =
        (r.best?.params?.roomTarget as string) ||
        (intent === 'settings' ? '设置' : intent === 'finance' ? '劳酬' : '')
      expect(resolveRoomRoute(rt).path, `${phrase} 应跳转 ${expectPath}`).toBe(expectPath)
    }
  })

  it('其他意图不被导航动词误抢', () => {
    expect(parseTask('开始专注').best?.intent).toBe('focus')
    expect(parseTask('我想记账').best?.intent).toBe('finance')
    expect(parseTask('打开记账').best?.intent).toBe('finance')
  })
})

