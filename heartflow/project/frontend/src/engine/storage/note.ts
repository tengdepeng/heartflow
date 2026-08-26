import { loadSchema, saveSchema } from './core'
import type { Note } from '../../types'
export function getNotes(): Note[] { return loadSchema().notes ?? [] }
export function setNotes(notes: Note[]): void { const s = loadSchema(); s.notes = notes; saveSchema(s) }