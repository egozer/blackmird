import { database } from "./firebase"
import { ref, set, get, remove } from "firebase/database"
import type { StyleProfile } from "./style-memory"

export interface SavedProject {
  id: string
  name: string
  html: string
  messages: Array<{ id: string; role: "system" | "user" | "assistant"; content: string }>
  styleProfile?: StyleProfile | null
  createdAt: number
  updatedAt: number
  userId: string
}

export async function saveUserData(userId: string, email: string, displayName?: string | null) {
  try {
    console.log("[v0] Saving user data to database:", { userId, email, displayName })
    const userRef = ref(database, `users/${userId}/profile`)
    await set(userRef, {
      email,
      displayName: displayName || email.split("@")[0],
      createdAt: Date.now(),
      lastLogin: Date.now(),
    })
    console.log("[v0] User data saved successfully")
  } catch (error) {
    console.error("[v0] Failed to save user data:", error)
    throw error
  }
}

export async function getProjects(userId: string): Promise<SavedProject[]> {
  try {
    console.log("[v0] Fetching projects for user:", userId)
    const projectsRef = ref(database, `users/${userId}/projects`)
    const snapshot = await get(projectsRef)

    if (!snapshot.exists()) {
      console.log("[v0] No projects found in database")
      return []
    }

    const projects: SavedProject[] = []
    snapshot.forEach((child) => {
      const project = child.val()
      console.log("[v0] Found project:", { id: project.id, name: project.name })
      projects.push(project)
    })

    projects.sort((a, b) => b.updatedAt - a.updatedAt)

    console.log("[v0] Loaded and sorted projects:", projects.length)
    return projects
  } catch (error) {
    console.error("[v0] Failed to get projects:", error)
    return []
  }
}

export async function saveProject(project: SavedProject): Promise<void> {
  try {
    console.log("[v0] Saving project:", { id: project.id, name: project.name, userId: project.userId })
    const projectRef = ref(database, `users/${project.userId}/projects/${project.id}`)
    await set(projectRef, {
      ...project,
      updatedAt: Date.now(),
    })
    console.log("[v0] Project saved successfully")
  } catch (error) {
    console.error("[v0] Failed to save project:", error)
    throw error
  }
}

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  try {
    const projectRef = ref(database, `users/${userId}/projects/${projectId}`)
    await remove(projectRef)
  } catch (error) {
    console.error("Failed to delete project:", error)
    throw error
  }
}

export async function getProject(userId: string, projectId: string): Promise<SavedProject | null> {
  try {
    const projectRef = ref(database, `users/${userId}/projects/${projectId}`)
    const snapshot = await get(projectRef)
    return snapshot.exists() ? snapshot.val() : null
  } catch (error) {
    console.error("Failed to get project:", error)
    return null
  }
}

export async function getProjectByPublicId(projectId: string): Promise<SavedProject | null> {
  try {
    const publicRef = ref(database, `public_projects/${projectId}`)
    const snapshot = await get(publicRef)
    return snapshot.exists() ? snapshot.val() : null
  } catch (error) {
    console.error("Failed to get public project:", error)
    return null
  }
}

export async function publishProject(project: SavedProject): Promise<string> {
  try {
    const publicRef = ref(database, `public_projects/${project.id}`)
    await set(publicRef, {
      id: project.id,
      name: project.name,
      html: project.html,
      userId: project.userId,
      publishedAt: Date.now(),
    })
    return project.id
  } catch (error) {
    console.error("Failed to publish project:", error)
    throw error
  }
}

export async function unpublishProject(projectId: string): Promise<void> {
  try {
    const publicRef = ref(database, `public_projects/${projectId}`)
    await remove(publicRef)
  } catch (error) {
    console.error("Failed to unpublish project:", error)
    throw error
  }
}
