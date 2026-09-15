// 死接线回归守卫：确保 --hf-night-dim / --hf-sabbath 既被宪法引擎注入、又被 App.vue 叠层
// 真实消费为强度倍率；且 composable 不再用 1/0 覆盖（否则会抹掉用户宪法调校）。
// 这类「只写不读」缺陷无法靠类型检查发现，故用静态源码断言兜底。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => readFileSync(resolve(here, '..', p), 'utf-8')

const appVue = read('App.vue')
const constitutionEffect = read('engine/constitution-effect.ts')
const useNightDim = read('composables/useNightDim.ts')
const useDigitalSabbath = read('composables/useDigitalSabbath.ts')

describe('scene overlay 死接线守卫（night-dim / sabbath）', () => {
  it('宪法引擎注入 --hf-night-dim 强度倍率（getEffectMultiplier 同路）', () => {
    expect(
      /setProperty\('--hf-night-dim',\s*String\(getEffectMultiplier\('scene:night-dim'\)\)\)/.test(
        constitutionEffect,
      ),
    ).toBe(true)
  })

  it('宪法引擎注入 --hf-sabbath 强度倍率（getEffectMultiplier 同路）', () => {
    expect(
      /setProperty\('--hf-sabbath',\s*String\(getEffectMultiplier\('scene:sabbath'\)\)\)/.test(
        constitutionEffect,
      ),
    ).toBe(true)
  })

  it('App.vue .night-dim-overlay.active 消费 --hf-night-dim 作 opacity 强度乘子', () => {
    expect(
      /\.night-dim-overlay\.active\s*\{[^}]*opacity:\s*var\(--hf-night-dim/.test(appVue),
    ).toBe(true)
  })

  it('App.vue .sabbath-overlay.active 消费 --hf-sabbath 作 opacity 强度乘子', () => {
    expect(
      /\.sabbath-overlay\.active\s*\{[^}]*opacity:\s*var\(--hf-sabbath/.test(appVue),
    ).toBe(true)
  })

  it('useNightDim 不再用 1/0 覆盖 --hf-night-dim（强度交还宪法调校）', () => {
    expect(useNightDim).not.toMatch(/setProperty\('--hf-night-dim'/)
    expect(useNightDim).not.toMatch(/removeProperty\('--hf-night-dim'/)
  })

  it('useDigitalSabbath 不再用 1/0 覆盖 --hf-sabbath（强度交还宪法调校）', () => {
    expect(useDigitalSabbath).not.toMatch(/setProperty\('--hf-sabbath'/)
    expect(useDigitalSabbath).not.toMatch(/removeProperty\('--hf-sabbath'/)
  })
})
