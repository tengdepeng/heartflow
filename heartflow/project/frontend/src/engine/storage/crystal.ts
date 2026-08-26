import { loadSchema, saveSchema } from './core'
import type { TimeCrystal } from '../../types'
export function getCrystals(): TimeCrystal[] { return loadSchema().crystals }
export function addCrystal(crystal: TimeCrystal): void { const s = loadSchema(); s.crystals.push(crystal); saveSchema(s) }
export function setCrystals(crystals: TimeCrystal[]): void { const s = loadSchema(); s.crystals = crystals; saveSchema(s) }
export function updateCrystal(id: string, data: Partial<TimeCrystal>): boolean {
  const s = loadSchema()
  const idx = s.crystals.findIndex(c => c.id === id)
  if (idx === -1) return false
  s.crystals[idx] = { ...s.crystals[idx], ...data }
  saveSchema(s)
  return true
}
export function removeCrystal(id: string): boolean {
  const s = loadSchema()
  const len = s.crystals.length
  s.crystals = s.crystals.filter(c => c.id !== id)
  if (s.crystals.length === len) return false
  saveSchema(s)
  return true
}