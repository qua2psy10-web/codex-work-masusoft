import { createDefaultProject } from './defaults'
import { validateProject } from './schema'
import type { ProjectV1 } from './types'

const STORAGE_KEY = 'masusoft.project.v1'

export function saveProject(project: ProjectV1) {
  const next = { ...project, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function loadProject() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return createDefaultProject()
  try {
    return validateProject(JSON.parse(raw))
  } catch {
    return createDefaultProject()
  }
}

export function serializeProject(project: ProjectV1) {
  return JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2)
}

export function deserializeProject(raw: string) {
  const value = JSON.parse(raw) as unknown
  return validateProject(value)
}

export function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
