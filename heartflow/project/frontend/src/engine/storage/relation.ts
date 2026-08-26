import { loadSchema, saveSchema } from './core'
import type { Person } from '../../modules/relation/types'
export function getRelations(): Person[] { return loadSchema().relations ?? [] }
export function setRelations(relations: Person[]): void { const s = loadSchema(); s.relations = relations; saveSchema(s) }