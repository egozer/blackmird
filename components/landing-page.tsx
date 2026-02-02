"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowUp, Clock, Trash2, FolderOpen, Monitor, LogOut, User } from "lucide-react"
import { getProjects, deleteProject, type SavedProject } from "@/lib/firebase-storage"
import type { User as FirebaseUser } from "firebase/auth"

interface LandingPageProps {
  onStart: (prompt: string) => void
  onLoadProject: (project: SavedProject) => void
  user: FirebaseUser | null
  onSignOut: () => void
  onShowAuth: () => void
  refreshKey?: number
}

export default function LandingPage({
  onStart,
  onLoadProject,
  user,
  onSignOut,
  onShowAuth,
  refreshKey,
}: LandingPageProps) {
  const [prompt, setPrompt] = useState("")
  const [showHint, setShowHint] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [pastProjects, setPastProjects] = useState<SavedProject[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [showIntentSelector, setShowIntentSelector] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const loadProjects = async () => {
      console.log("[v0] Landing page loading projects, refreshKey:", refreshKey)
      if (user) {
        const projects = await getProjects(user.uid)
        console.log("[v0] Landing page received projects:", projects.length)
        setPastProjects(projects)
      } else {
        setPastProjects([])
      }
    }
    loadProjects()
  }, [user, refreshKey])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim() && !isMobile) {
      onStart(prompt)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && prompt.trim() && !isMobile) {
      e.preventDefault()
      onStart(prompt)
    }
  }

  const handleGetStarted = () => {
    if (isMobile) return
    setIsExpanded(true)
    setPrompt("surprise me")
    setTimeout(() => {
      const textarea = document.querySelector("textarea")
      textarea?.focus()
      textarea?.select()
    }, 100)
  }

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (user) {
      await deleteProject(user.uid, id)
      const projects = await getProjects(user.uid)
      setPastProjects(projects)
    }
  }

  const handleInputFocus = () => {
    if (!prompt.trim() && !isMobile) {
      setShowIntentSelector(true)
    }
  }

  const handleIntentSelect = (intent: string) => {
    const prompts = {
      landing: "Create a modern landing page for a SaaS product",
      portfolio: "Build a minimal portfolio website for a designer",
      saas: "Design a SaaS dashboard with analytics",
    }
    setPrompt(prompts[intent as keyof typeof prompts] || "")
    setShowIntentSelector(false)
    setIsExpanded(true)
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex flex-col">
        {/* Mobile Header */}
        <header className="px-6 py-6 border-b border-[#d4d0c8]">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0a0a0a]">Blackmird</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mt-1">AI HTML Generator</p>
        </header>

        {/* Mobile Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 bg-[#0a0a0a] rounded-sm flex items-center justify-center mb-8">
            <Monitor className="w-10 h-10 text-[#f5f3ef]" />
          </div>

          <h2 className="text-4xl font-extrabold text-[#0a0a0a] mb-4 leading-tight">Desktop Only</h2>

          <p className="text-lg text-[#6b6b6b] max-w-sm mb-8 leading-relaxed">
            Create any landing page, portfolio, or website with AI. Please use a desktop browser for the full
            experience.
          </p>

          <div className="bg-[#e8e4dc] px-6 py-4 rounded-sm">
            <p className="text-sm text-[#0a0a0a] font-medium">Open on desktop to start building</p>
          </div>
        </main>

        {/* Mobile Footer */}
        <footer className="px-6 py-6 border-t border-[#d4d0c8]">
          <div className="flex items-center justify-center">
            <a
              href="https://instagram.com/blackmird"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0a0a0a] font-medium hover:underline"
            >
              @blackmird
            </a>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex flex-col">
      {/* Navigation - Groth style */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[#d4d0c8]">
        <div className="flex items-center gap-12">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0a0a0a]">Blackmird</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b]">AI HTML Generator</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button
                onClick={() => (window.location.href = "/profile")}
                className="flex items-center gap-3 px-4 py-2 bg-white border border-[#d4d0c8] hover:bg-[#e8e4dc] transition-colors"
              >
                <User className="w-4 h-4 text-[#6b6b6b]" />
                <span className="text-sm font-medium text-[#0a0a0a]">
                  {user.displayName || user.email?.split("@")[0]}
                </span>
              </button>
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-[#d4d0c8] text-[#0a0a0a] text-sm font-medium hover:bg-[#e8e4dc] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={onShowAuth}
              className="px-6 py-3 bg-[#0a0a0a] text-[#f5f3ef] text-sm font-medium tracking-wide hover:bg-[#2a2a2a] transition-colors"
            >
              Log In
            </button>
          )}
          <button
            onClick={handleGetStarted}
            className="px-6 py-3 bg-[#0a0a0a] text-[#f5f3ef] text-sm font-medium tracking-wide hover:bg-[#2a2a2a] transition-colors"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero Section - Groth brutalist style */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Big title - Poppins ExtraBold */}
          <h2 className="text-[clamp(4rem,15vw,12rem)] font-extrabold text-[#0a0a0a] leading-[0.85] tracking-tighter mb-6">
            Just Build
          </h2>
          <p className="text-lg text-[#6b6b6b] max-w-md mx-auto font-normal">
            Create apps and websites by chatting with AI
          </p>
        </div>

        {/* Input Box - Groth style */}
        <form
          onSubmit={handleSubmit}
          className={`w-full animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 transition-all ease-out duration-500 ${
            isExpanded ? "max-w-4xl" : "max-w-2xl"
          }`}
        >
          <div className="relative bg-white border-2 border-[#0a0a0a] shadow-[4px_4px_0px_0px_#0a0a0a] hover:shadow-[6px_6px_0px_0px_#0a0a0a] transition-all duration-300">
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                if (!e.target.value.trim()) {
                  setShowIntentSelector(true)
                } else {
                  setShowIntentSelector(false)
                }
              }}
              onFocus={handleInputFocus}
              onBlur={() => setTimeout(() => setShowIntentSelector(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Blackmird to create a blog, landing page, portfolio..."
              rows={isExpanded ? 5 : 3}
              className={`w-full bg-transparent text-[#0a0a0a] placeholder-[#a0a0a0] resize-none focus:outline-none transition-all duration-500 font-medium ${
                isExpanded ? "px-8 py-6 text-xl" : "px-6 py-5 text-lg"
              }`}
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className={`absolute right-4 bg-[#0a0a0a] hover:bg-[#2a2a2a] disabled:bg-[#d4d0c8] disabled:cursor-not-allowed text-white transition-all duration-300 ${
                isExpanded ? "bottom-4 p-4" : "bottom-3 p-3"
              }`}
            >
              <ArrowUp className={`transition-all duration-300 ${isExpanded ? "w-6 h-6" : "w-5 h-5"}`} />
            </button>

            {showIntentSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-[#0a0a0a] shadow-[4px_4px_0px_0px_#0a0a0a] z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2">
                  <p className="text-xs uppercase tracking-wider text-[#6b6b6b] px-3 py-2 font-medium">
                    What would you like to build?
                  </p>
                  <button
                    type="button"
                    onClick={() => handleIntentSelect("landing")}
                    className="w-full text-left px-3 py-3 hover:bg-[#f5f3ef] text-[#0a0a0a] font-medium transition-colors"
                  >
                    Landing Page
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIntentSelect("portfolio")}
                    className="w-full text-left px-3 py-3 hover:bg-[#f5f3ef] text-[#0a0a0a] font-medium transition-colors"
                  >
                    Portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIntentSelect("saas")}
                    className="w-full text-left px-3 py-3 hover:bg-[#f5f3ef] text-[#0a0a0a] font-medium transition-colors"
                  >
                    SaaS Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Enter Hint */}
        {showHint && (
          <p className="mt-6 text-[#6b6b6b] text-sm animate-in fade-in duration-500 font-medium">
            Press <kbd className="px-2 py-1 bg-white border border-[#d4d0c8] text-xs font-mono">Enter</kbd> to start
            building
          </p>
        )}
      </main>

      {/* Past Projects Section */}
      <section className="py-20 px-8 border-t border-[#d4d0c8] bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline gap-4 mb-12">
            <h3 className="text-4xl font-extrabold text-[#0a0a0a] tracking-tight">Projects</h3>
            <span className="text-sm text-[#6b6b6b] border border-[#d4d0c8] rounded-full px-3 py-1">
              {pastProjects.length}
            </span>
          </div>

          {!user ? (
            <div className="text-center py-16 border-2 border-dashed border-[#d4d0c8]">
              <div className="w-16 h-16 bg-[#e8e4dc] flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-[#6b6b6b]" />
              </div>
              <p className="text-[#6b6b6b] text-lg font-medium mb-4">Log in to save and manage projects</p>
              <button
                onClick={onShowAuth}
                className="px-6 py-3 bg-[#0a0a0a] text-[#f5f3ef] text-sm font-medium hover:bg-[#2a2a2a] transition-colors"
              >
                Log In
              </button>
            </div>
          ) : pastProjects.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-[#d4d0c8]">
              <div className="w-16 h-16 bg-[#e8e4dc] flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[#6b6b6b]" />
              </div>
              <p className="text-[#6b6b6b] text-lg font-medium">No projects yet</p>
              <p className="text-[#a0a0a0] text-sm mt-2">Start building something above</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onLoadProject(project)}
                  className="group bg-[#f5f3ef] border-2 border-[#0a0a0a] p-6 cursor-pointer hover:shadow-[4px_4px_0px_0px_#0a0a0a] transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-[#0a0a0a] flex items-center justify-center text-white">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="p-2 text-[#a0a0a0] hover:text-[#dc2626] hover:bg-[#fef2f2] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-lg font-bold text-[#0a0a0a] mb-2 truncate">{project.name}</h4>
                  <p className="text-[#6b6b6b] text-sm">
                    {new Date(project.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-[#a0a0a0] text-xs mt-2">
                    {project.messages.filter((m) => m.role === "user").length} messages
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer - Groth style */}
      <footer className="py-8 px-8 border-t border-[#d4d0c8] bg-[#0a0a0a] text-[#f5f3ef]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-lg font-bold">Blackmird</span>
            <span className="text-[#6b6b6b] text-sm ml-3">AI HTML Generator</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-[#a0a0a0]">
            <a
              href="https://instagram.com/blackmird"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f5f3ef] hover:underline font-medium"
            >
              @blackmird
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
