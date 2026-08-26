// ============================================================
// 平行世界 · 平行档案分析引擎（parallel-analytics）
// 从抉择分叉（Fork）、可能性自我（AltSelf）、时间胶囊（Capsule）、
// 时间分支（WorldBranch）里，读出那些未开的花、未走的路的温度。
// 档案概览、抉择分叉节奏、可能性自我分布（分叉生成 / 自由映照）、
// 时间胶囊状态、平行世界健康（探索广度 / 抉择深度 / 时间延续）
// 与温和回看建议。
// 全纯函数、本地计算、零网络出口，接受 now 以保证时间可测试。
// ============================================================

import type { Fork } from './parallel-selves'
import type { AltSelf } from './parallel-selves'
import type { Capsule } from './time-capsule'
import type { WorldBranch } from './types'

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

const DAY = 24 * 60 * 60 * 1000

// ---- 平行档案概览 ----

export interface ParallelOverview {
  /** 抉择分叉总数 */
  forks: number
  /** 近 30 天新增分叉数 */
  forks30: number
  /** 可能性自我总数 */
  alts: number
  /** 由分叉映照出的平行自我数 */
  altsFromFork: number
  /** 自由映照（模板）的平行自我数 */
  altsFree: number
  /** 时间胶囊总数 */
  capsules: number
  /** 已开启胶囊数 */
  openedCapsules: number
  /** 正在等待开启的胶囊数 */
  pendingCapsules: number
  /** 时间分支总数 */
  branches: number
  /** 总检查点数 */
  checkpoints: number
  /** 最近一次抉择日期 */
  latestForkDate: string | null
}

export function parallelOverview(
  forks: Fork[],
  alts: AltSelf[],
  capsules: Capsule[],
  branches: WorldBranch[],
  now: Date = new Date()
): ParallelOverview {
  const nowT = now.getTime()
  const c30 = nowT - 30 * DAY
  let forks30 = 0
  let latestForkDate: string | null = null

  for (const f of forks) {
    const at = new Date(f.at).getTime()
    if (isFinite(at) && at >= c30) forks30++
    if (!latestForkDate || f.at > latestForkDate) latestForkDate = f.at
  }

  let altsFromFork = 0
  for (const a of alts) if (a.originForkId) altsFromFork++

  let opened = 0
  let pending = 0
  for (const c of capsules) {
    if (c.opened) opened++
    else pending++
  }

  let checkpoints = 0
  for (const b of branches) checkpoints += Number(b.checkpointCount) || 0

  return {
    forks: forks.length,
    forks30,
    alts: alts.length,
    altsFromFork,
    altsFree: alts.length - altsFromFork,
    capsules: capsules.length,
    openedCapsules: opened,
    pendingCapsules: pending,
    branches: branches.length,
    checkpoints,
    latestForkDate,
  }
}

// ---- 专用分布行 ----

export interface ParallelRow {
  key: string
  label: string
  color: string
  count: number
  /** 占比 0-100 */
  pct: number
}

/** 可能性自我来源分布（分叉映照 / 自由映照） */
export function altSelfSourceRows(alts: AltSelf[]): ParallelRow[] {
  const total = alts.length || 1
  let fromFork = 0
  let free = 0
  for (const a of alts) {
    if (a.originForkId) fromFork++
    else free++
  }
  const mk = (key: string, label: string, count: number, color: string): ParallelRow => ({
    key,
    label,
    color,
    count,
    pct: Math.round((count / total) * 100),
  })
  return [
    mk('fork', '分叉映照', fromFork, '#c4956a'),
    mk('free', '自由映照', free, '#6b9fc4'),
  ].filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
}

// ---- 时间胶囊状态分布 ----

/** 时间胶囊状态：已开启 / 可开启未开 / 仍在等待 */
export function capsuleStatusRows(capsules: Capsule[], now: Date = new Date()): ParallelRow[] {
  const total = capsules.length || 1
  let opened = 0
  let ready = 0
  let waiting = 0
  const nowT = now.getTime()
  for (const c of capsules) {
    if (c.opened) opened++
    else if (new Date(c.openDate).getTime() <= nowT) ready++
    else waiting++
  }
  const mk = (key: string, label: string, count: number, color: string): ParallelRow => ({
    key,
    label,
    color,
    count,
    pct: Math.round((count / total) * 100),
  })
  return [
    mk('opened', '已开启', opened, '#8a9a7a'),
    mk('ready', '待开启', ready, '#f0c040'),
    mk('waiting', '仍在等', waiting, '#6b9fc4'),
  ].filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
}

// ---- 抉择分叉节奏 ----

export interface ParallelRhythm {
  /** 近 7 天新增分叉数 */
  forks7: number
  /** 近 30 天新增分叉数 */
  forks30: number
  /** 最久未抉择（天，无分叉为 null） */
  calmDays: number | null
  /** 近 30 天封存的胶囊数 */
  capsules30: number
  /** 平均封存等待天数（作未来的约定） */
  avgCapsuleWait: number
}

export function parallelRhythm(
  forks: Fork[],
  capsules: Capsule[],
  now: Date = new Date()
): ParallelRhythm {
  const nowT = now.getTime()
  const c7 = nowT - 7 * DAY
  const c30 = nowT - 30 * DAY
  let forks7 = 0
  let forks30 = 0
  let scheduleSum = 0
  let scheduleCount = 0
  let capsules30 = 0
  let maxForkAt: number | null = null

  for (const f of forks) {
    const at = new Date(f.at).getTime()
    if (!isFinite(at)) continue
    if (at >= c7) forks7++
    if (at >= c30) forks30++
    if (maxForkAt === null || at > maxForkAt) maxForkAt = at
  }

  for (const c of capsules) {
    const at = new Date(c.at).getTime()
    const open = new Date(c.openDate).getTime()
    if (isFinite(at)) {
      if (at >= c30) capsules30++
      if (isFinite(open)) {
        scheduleSum += Math.max(0, Math.round((open - at) / DAY))
        scheduleCount++
      }
    }
  }

  return {
    forks7,
    forks30,
    calmDays: maxForkAt === null ? null : Math.max(0, Math.round((nowT - maxForkAt) / DAY)),
    capsules30,
    avgCapsuleWait: scheduleCount ? Math.round(scheduleSum / scheduleCount) : 0,
  }
}

// ---- 时间分支绽开的广度 ----

export interface BranchExplorationRows {
  total: number
  depthLabel: string
}

/** 分支绽开深度标签：树、藤、一株 */
export function branchDepthLabel(branches: WorldBranch[]): string {
  const n = branches.length
  if (n >= 5) return `已成 ${n} 条时间枝桠，蔚然成树`
  if (n >= 2) return `牵起 ${n} 条时间枝桠，如藤蔓缠绕`
  if (n === 1) return '一支时间枝桠，正等风来'
  return '时间之树尚未萌芽'
}

// ---- 平行世界健康（0-100）----

export interface ParallelArchiveHealth {
  /** 0-100 平行世界里未竟可能性的丰盈程度 */
  score: number
  /** 探索广度（孵化不同可能性的多彩）0-100 */
  breadth: number
  /** 抉择深度（在岔路口停留与回望的沉淀）0-100 */
  depth: number
  /** 时间延续（酝酿未来与封存当下的长度）0-100 */
  continuity: number
  label: string
}

export function parallelWorldHealth(
  forks: Fork[],
  alts: AltSelf[],
  capsules: Capsule[],
  branches: WorldBranch[],
  now: Date = new Date()
): ParallelArchiveHealth {
  const ov = parallelOverview(forks, alts, capsules, branches, now)

  if (ov.forks === 0 && ov.alts === 0 && ov.capsules === 0) {
    return { score: 0, breadth: 0, depth: 0, continuity: 0, label: '世界初分' }
  }

  // 广度：可能性自我的多样 + 分支绽开
  const breadth = clamp(
    Math.round(
      Math.min(ov.alts, 6) * 7 +
      Math.min(ov.branches, 6) * 4 +
      (ov.altsFromFork > 0 ? 12 : 0)
    )
  )

  // 深度：抉择分叉的沉淀 + 由分叉映照出平行自我的钻探
  const depth = clamp(
    Math.round(
      Math.min(ov.forks, 12) * 4 +
      Math.min(ov.altsFromFork, 6) * 4 +
      (ov.forks > 0 && ov.alts > 0 ? 16 : 0)
    )
  )

  // 延续：时间胶囊的约定长度 + 近期抉择的活性
  const rhythm = parallelRhythm(forks, capsules, now)
  const continuity = clamp(
    Math.round(
      Math.min(ov.capsules, 10) * 5 +
      Math.min(rhythm.avgCapsuleWait, 90) / 90 * 25 +
      Math.min(rhythm.forks30, 10) * 2
    )
  )

  const score = clamp(Math.round(breadth * 0.34 + depth * 0.33 + continuity * 0.33))
  const label =
    score >= 70 ? '繁花似锦' : score >= 45 ? '枝头初放' : score >= 20 ? '新芽微露' : '世界初分'

  return { score, breadth, depth, continuity, label }
}

// ---- 温和回看建议 ----

export function parallelInsights(
  forks: Fork[],
  alts: AltSelf[],
  capsules: Capsule[],
  branches: WorldBranch[],
  now = new Date(),
  limit = 4
): string[] {
  if (forks.length === 0 && alts.length === 0 && capsules.length === 0) {
    return ['平行世界还是空的。在第一个岔路口种下一棵分叉树，让另一个你在远处开花。']
  }
  const out: string[] = []
  const ov = parallelOverview(forks, alts, capsules, branches, now)
  const rhythm = parallelRhythm(forks, capsules, now)
  const health = parallelWorldHealth(forks, alts, capsules, branches, now)

  if (ov.forks > 0 && ov.altsFromFork === 0 && ov.altsFree < 6) {
    out.push('有几个抉择分叉还没映照出平行自我，把没走的 A 也浇灌成光，可能性才不落空。')
  }
  if (ov.alts > 0 && ov.altsFree === 0 && rhythm.forks30 === 0) {
    out.push('平行自我都来自旧抉择，近一月没有新的岔路口。也许有一个尚未言明的决定，正等着被写下。')
  }
  if (ov.capsules > 0 && ov.openedCapsules > 0) {
    out.push(`已有 ${ov.openedCapsules} 封时间胶囊被未来的你开启，说明那时的约定，还被人记得。`)
  }
  if (ov.pendingCapsules > 0 && rhythm.capsules30 === 0) {
    out.push('近一个月没有封存新的时间胶囊。给更远的自己留一句话，让等待本身成为温柔。')
  }
  if (rhythm.calmDays !== null && rhythm.calmDays >= 14) {
    out.push(`已经 ${rhythm.calmDays} 天没有新的抉择分叉，主线依旧。偶尔回望，岔路才不荒芜。`)
  }
  if (forks.length > 0 && rhythm.forks30 === 0 && rhythm.forks7 === 0) {
    out.push('岔路口安静得有些久了。那些反复权衡的时刻，本身就是值得被记录的平行世界。')
  }
  out.push(`当前平行世界的可能性沉淀为「${health.label}」。`)
  return out.slice(0, limit)
}