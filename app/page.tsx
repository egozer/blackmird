"use client"

import { useState, useEffect, useCallback } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import type { User } from "firebase/auth"
import LandingPage from "@/components/landing-page"
import ChatPanel from "@/components/chat-panel"
import PreviewPanel from "@/components/preview-panel"
import AuthModal from "@/components/auth-modal"
import { saveProject as saveProjectToFirebase, publishProject, type SavedProject } from "@/lib/firebase-storage"
import { extractStyleProfile, applyStyleProfile, type StyleProfile } from "@/lib/style-memory"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showApp, setShowApp] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState("")
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("Untitled Project")
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0)
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "system" | "user" | "assistant"; content: string }>
  >([
    {
      id: "system",
      role: "system",
      content:
        "You are an expert HTML developer. Generate clean, production-ready single-file HTML websites. Always include proper styling, responsive design, and semantic HTML.",
    },
  ])
  const [generatedHtml, setGeneratedHtml] = useState("")
  const [editableHtml, setEditableHtml] = useState("")
  const [loading, setLoading] = useState(false)
  const [generationPhase, setGenerationPhase] = useState<string | null>(null)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [skeletonHtml, setSkeletonHtml] = useState("")
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)
  const [buildMetrics, setBuildMetrics] = useState<{ startTime: number; endTime: number } | null>(null)
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
      if (!currentUser && showApp) {
        setShowApp(false)
        setShowAuthModal(true)
      }
    })
    return () => unsubscribe()
  }, [showApp])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault()
        e.returnValue = "Leaving now will cancel generation."
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [loading])

  const handleSendMessage = useCallback(
    async (userMessage: string, retryCount = 0) => {
      const newUserMessage = { id: Date.now().toString(), role: "user" as const, content: userMessage }

      if (retryCount === 0) {
        setMessages((prev) => [...prev, newUserMessage])
        setBuildMetrics({ startTime: Date.now(), endTime: 0 })
      }

      setLoading(true)
      setGenerationPhase("Planning layout & structure")
      setShowSkeleton(true)

      const skeletonTimer = setTimeout(() => {
        const basicSkeleton = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Building...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .skeleton { background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%; animation: shimmer 2s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="skeleton" style="height: 40px; width: 200px; margin-bottom: 2rem;"></div>
    <div class="skeleton" style="height: 300px; margin-bottom: 2rem;"></div>
    <div class="skeleton" style="height: 200px;"></div>
  </div>
</body>
</html>`
        setSkeletonHtml(basicSkeleton)
      }, 6000)

      const phaseSequence = [
        { phase: "Planning layout & structure", delay: 0 },
        { phase: "Designing visual theme", delay: 15000 },
        { phase: "Generating HTML & CSS", delay: 35000 },
        { phase: "Final assembly", delay: 55000 },
      ]

      phaseSequence.forEach(({ phase, delay }) => {
        setTimeout(() => {
          if (loading) setGenerationPhase(phase)
        }, delay)
      })

      try {
        const currentMessages = [...messages, { role: "user" as const, content: userMessage }]
        let enhancedMessage = userMessage
        if (styleProfile && editableHtml) {
          const styleHints = applyStyleProfile(styleProfile)
          enhancedMessage = `${userMessage}${styleHints}`
        }

        const response = await fetch("/api/generate-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentMessages,
            currentHtml: editableHtml,
            userMessage: enhancedMessage,
          }),
        })

        if (!response.ok) {
          const errorType = response.status === 408 ? "timeout" : response.status >= 500 ? "server" : "generation"
          throw new Error(errorType)
        }

        const data = await response.json()
        const htmlContent = data.html
        const editMode = data.mode
        const editIntent = data.intent
        const editsApplied = data.editsApplied || 0
        const lineCount = htmlContent.split("\n").filter((line: string) => line.trim()).length

        if (lineCount === 1) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + Math.random()).toString(),
              role: "assistant",
              content: `Incomplete response detected. Retrying...`,
            },
          ])

          await new Promise((resolve) => setTimeout(resolve, 800))
          return handleSendMessage(userMessage, retryCount + 1)
        }

        clearTimeout(skeletonTimer)
        setGenerationPhase("Finalizing...")
        setShowSkeleton(false)

        await new Promise((resolve) => setTimeout(resolve, 2500))

        const newStyleProfile = extractStyleProfile(htmlContent)
        setStyleProfile(newStyleProfile)

        setGeneratedHtml(htmlContent)
        setEditableHtml(htmlContent)

        const endTime = Date.now()
        const buildTime = Math.round((endTime - (buildMetrics?.startTime || endTime)) / 1000)
        setBuildMetrics({ startTime: buildMetrics?.startTime || endTime, endTime })

        // Generate appropriate response message based on mode
        let responseMessage: string
        if (editMode === "edit") {
          const intentLabel = editIntent === "micro" ? "Quick edit" : editIntent === "semantic" ? "Semantic update" : editIntent === "abstract" ? "Design transformation" : "Edit"
          responseMessage = `${intentLabel} complete · ${editsApplied} changes applied · ${buildTime}s`
        } else {
          responseMessage = `Built in ${buildTime}s · ${lineCount} lines · Optimized for clarity and performance`
        }

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: responseMessage,
          },
        ])
      } catch (error) {
        clearTimeout(skeletonTimer)
        setShowSkeleton(false)

        let errorMessage = "Something went wrong. "
        let actionHint = ""

        if (error instanceof Error) {
          if (error.message === "timeout") {
            errorMessage = "Generation took longer than expected."
            actionHint = "Try simplifying your request or breaking it into smaller steps."
          } else if (error.message === "server") {
            errorMessage = "Our servers are having issues."
            actionHint = "Please wait a moment and try again."
          } else {
            errorMessage = "Could not complete generation."
            actionHint = "Try rephrasing your request or be more specific about what you need."
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `${errorMessage} ${actionHint}`,
          },
        ])
      } finally {
        setLoading(false)
        setGenerationPhase(null)
        setShowSkeleton(false)
        setSkeletonHtml("")
      }
    },
    [messages, editableHtml, loading, styleProfile, buildMetrics],
  )

  const handleStartApp = (prompt: string) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    setInitialPrompt(prompt)
    setCurrentProjectId(Date.now().toString())
    setProjectName(prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""))
    setShowApp(true)
  }

  const handleLoadProject = (project: SavedProject) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    setCurrentProjectId(project.id)
    setProjectName(project.name)
    setMessages(project.messages)
    setEditableHtml(project.html)
    setGeneratedHtml(project.html)
    setStyleProfile(project.styleProfile || null)
    setShowApp(true)
  }

  const handleSaveProject = async (name: string) => {
    if (!currentProjectId || !user) {
      console.log("[v0] Cannot save: missing projectId or user")
      return
    }

    console.log("[v0] Starting save operation:", { projectId: currentProjectId, userId: user.uid })

    const project: SavedProject = {
      id: currentProjectId,
      name,
      html: editableHtml,
      messages,
      styleProfile,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: user.uid,
    }

    try {
      await saveProjectToFirebase(project)
      setProjectName(name)
      setProjectsRefreshKey((prev) => prev + 1)
      console.log("[v0] Save completed successfully, projects will refresh")
      alert("Project saved successfully!")
    } catch (error) {
      console.error("[v0] Save failed with error:", error)
      alert("Failed to save project. Check console for details.")
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setShowApp(false)
      setProjectsRefreshKey(0)
    } catch (error) {
      console.error("Failed to sign out:", error)
    }
  }

  useEffect(() => {
    if (showApp && initialPrompt) {
      const timer = setTimeout(() => {
        handleSendMessage(initialPrompt)
        setInitialPrompt("")
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [showApp, initialPrompt, handleSendMessage])

  const handleDownloadHtml = () => {
    if (!editableHtml) return
    const blob = new Blob([editableHtml], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePublishProject = async (): Promise<string | null> => {
    if (!currentProjectId || !user || !editableHtml) {
      return null
    }

    const project: SavedProject = {
      id: currentProjectId,
      name: projectName,
      html: editableHtml,
      messages,
      styleProfile,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: user.uid,
    }

    try {
      await publishProject(project)
      setIsPublished(true)
      return currentProjectId
    } catch (error) {
      console.error("Failed to publish:", error)
      return null
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#E8E3D9]">
        <div className="text-2xl font-extrabold animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!showApp) {
    return (
      <>
        <LandingPage
          onStart={handleStartApp}
          onLoadProject={handleLoadProject}
          user={user}
          onSignOut={handleSignOut}
          onShowAuth={() => setShowAuthModal(true)}
          refreshKey={projectsRefreshKey}
        />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="flex h-screen bg-slate-950 animate-in fade-in duration-500">
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loading}
          projectName={projectName}
          onSaveProject={handleSaveProject}
          generationPhase={generationPhase}
          user={user}
          onSignOut={handleSignOut}
          onPublishProject={handlePublishProject}
          isPublished={isPublished}
          projectId={currentProjectId}
          onDownload={handleDownloadHtml}
        />
        <PreviewPanel
          html={showSkeleton ? skeletonHtml : editableHtml}
          onHtmlChange={setEditableHtml}
          onDownload={handleDownloadHtml}
          onPublish={handlePublishProject}
          isGenerating={loading}
        />
      </div>
    </>
  )
}
