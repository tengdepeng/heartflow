import { loadSchema, saveSchema } from './core'
import type { Constitution } from '../../types'
export function getConstitution(): Constitution | null { return loadSchema().constitution }
export function setConstitution(constitution: Constitution): void { const s = loadSchema(); s.constitution = constitution; saveSchema(s) }