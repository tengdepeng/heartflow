import { loadSchema, saveSchema } from './core'
import type { Goal } from '../../modules/goal/types'
export function getGoals(): Goal[] { return loadSchema().goals ?? [] }
export function setGoals(goals: Goal[]): void { const s = loadSchema(); s.goals = goals; saveSchema(s) }