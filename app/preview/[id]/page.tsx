"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getProjectByPublicId } from "@/lib/firebase-storage"

export default function PreviewPage() {
  const params = useParams()
  const projectId = params.id as string
  const [html, setHtml] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProject() {
      try {
        const project = await getProjectByPublicId(projectId)
        if (project) {
          setHtml(project.html)
          setProjectName(project.name)
        } else {
          setError("Project not found or not published")
        }
      } catch (err) {
        setError("Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      loadProject()
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-mono">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (error || !html) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Preview Not Available</h1>
          <p className="text-gray-400 mb-6">{error || "This project has not been published or does not exist."}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-white text-black font-bold border-4 border-black hover:bg-gray-100 transition-colors"
          >
            Go to Blackmird
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b-4 border-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white font-black text-lg hover:text-gray-300 transition-colors">
            BLACKMIRD
          </a>
          <span className="text-gray-500">|</span>
          <span className="text-white font-mono text-sm truncate max-w-[200px]">{projectName}</span>
        </div>
        <a
          href="/"
          className="px-4 py-1 bg-white text-black text-sm font-bold border-2 border-white hover:bg-black hover:text-white transition-colors"
        >
          Create Your Own
        </a>
      </div>
      <iframe
        srcDoc={html}
        className="w-full border-0"
        style={{ height: "calc(100vh - 52px)", marginTop: "52px" }}
        title={projectName}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
