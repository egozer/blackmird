// Cookie-based project storage utilities

export interface SavedProject {
  id: string
  name: string
  html: string
  messages: Array<{ id: string; role: "system" | "user" | "assistant"; content: string }>
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = "blackmird_projects"

export function getProjects(): SavedProject[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveProject(project: SavedProject): void {
  if (typeof window === "undefined") return
  try {
    const projects = getProjects()
    const existingIndex = projects.findIndex((p) => p.id === project.id)
    if (existingIndex >= 0) {
      projects[existingIndex] = { ...project, updatedAt: Date.now() }
    } else {
      projects.unshift(project)
    }
    // Keep only last 20 projects
    const trimmed = projects.slice(0, 20)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.error("Failed to save project:", e)
  }
}

export function deleteProject(id: string): void {
  if (typeof window === "undefined") return
  try {
    const projects = getProjects().filter((p) => p.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch (e) {
    console.error("Failed to delete project:", e)
  }
}

export function getProject(id: string): SavedProject | null {
  const projects = getProjects()
  return projects.find((p) => p.id === id) || null
}
