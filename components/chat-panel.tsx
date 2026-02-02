"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, ArrowLeft, Save, Loader2, LogOut, User, Share2, Check, Copy, Download, Settings } from "lucide-react"
import type { User as FirebaseUser } from "firebase/auth"

interface Message {
  id: string
  role: "system" | "user" | "assistant"
  content: string
}

type AIModel = "stepfun/step-3.5-flash:free" | "nvidia/nemotron-3-nano-30b-a3b:free" | "arcee-ai/trinity-mini:free" | "google/gemma-3n-e2b-it:free"

interface ChatPanelProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  loading: boolean
  projectName: string
  onSaveProject: (name: string) => void
  generationPhase: string | null
  user: FirebaseUser | null
  onSignOut: () => void
  onPublishProject: () => Promise<string | null>
  isPublished: boolean
  projectId: string | null
  onDownload?: () => void
}

export default function ChatPanel({
  messages,
  onSendMessage,
  loading,
  projectName,
  onSaveProject,
  generationPhase,
  user,
  onSignOut,
  onPublishProject,
  isPublished,
  projectId,
  onDownload,
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState(projectName)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [selectedModel, setSelectedModel] = useState<AIModel>("stepfun/step-3.5-flash:free")
  const [reasoningEnabled, setReasoningEnabled] = useState(false)
  const [showModelSettings, setShowModelSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const models: { id: AIModel; name: string }[] = [
    { id: "stepfun/step-3.5-flash:free", name: "Step 3.5 Flash" },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "NVIDIA Nemotron 3 Nano" },
    { id: "arcee-ai/trinity-mini:free", name: "Arcee Trinity Mini" },
    { id: "google/gemma-3n-e2b-it:free", name: "Google Gemma 3 Nano" },
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    setSaveName(projectName)
  }, [projectName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    // Pass model and reasoning settings with the message
    const messageData = JSON.stringify({
      message: input,
      model: selectedModel,
      reasoning: reasoningEnabled,
    })
    onSendMessage(messageData)
    setInput("")
  }

  const handleSave = () => {
    if (saveName.trim()) {
      onSaveProject(saveName.trim())
      setShowSaveModal(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    const id = await onPublishProject()
    if (id) {
      const url = `${window.location.origin}/preview/${id}`
      setShareUrl(url)
      setShowShareModal(true)
    }
    setPublishing(false)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-1/4 flex flex-col bg-[#0a0a0a] border-r border-[#2a2a2a] animate-in slide-in-from-left duration-500">
      {/* Header - Groth style */}
      <div className="px-4 py-4 border-b border-[#2a2a2a]">
        {/* Top row: Logo and user controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => window.location.reload()} className="p-1.5 hover:bg-[#1a1a1a] transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4 text-[#a0a0a0]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#f5f3ef] tracking-tight truncate">Blackmird</h1>
              <p className="text-[9px] uppercase tracking-[0.1em] text-[#6b6b6b] truncate">Generator</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => (window.location.href = "/profile")}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors text-xs font-medium text-[#f5f3ef]"
              >
                <User className="w-3 h-3 text-[#a0a0a0]" />
                <span className="truncate max-w-[80px]">{user.displayName || user.email?.split("@")[0]}</span>
              </button>
              <button
                onClick={() => (window.location.href = "/profile")}
                className="sm:hidden p-1.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors"
                title="Profile"
              >
                <User className="w-3.5 h-3.5 text-[#a0a0a0]" />
              </button>
              <button onClick={onSignOut} className="p-1.5 hover:bg-[#1a1a1a] transition-colors" title="Sign Out">
                <LogOut className="w-4 h-4 text-[#a0a0a0]" />
              </button>
            </div>
          )}
        </div>
        
        {/* Bottom row: Action buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#f5f3ef] text-xs font-medium transition-colors border border-[#2a2a2a] whitespace-nowrap flex-shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981] hover:bg-[#fbbf24] disabled:opacity-50 text-white hover:text-[#0a0a0a] text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Publish</span>
          </button>
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#f5f3ef] text-xs font-medium transition-colors border border-[#2a2a2a] whitespace-nowrap flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border-2 border-[#f5f3ef] p-8 w-[28rem] shadow-[6px_6px_0px_0px_#f5f3ef] animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[#f5f3ef] mb-2">Share Your Project</h3>
            <p className="text-sm text-[#6b6b6b] mb-6">Anyone with this link can view your published HTML</p>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-[#1a1a1a] border-2 border-[#2a2a2a] text-[#f5f3ef] text-sm font-mono focus:outline-none"
              />
              <button
                onClick={handleCopyUrl}
                className="px-4 py-3 bg-[#f5f3ef] hover:bg-white text-[#0a0a0a] font-bold transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-4 py-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#a0a0a0] font-medium transition-colors border border-[#2a2a2a]"
              >
                Close
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-3 bg-[#f5f3ef] hover:bg-white text-[#0a0a0a] font-bold transition-colors text-center"
              >
                Open Preview
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal - Groth style */}
      {showSaveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border-2 border-[#f5f3ef] p-8 w-96 shadow-[6px_6px_0px_0px_#f5f3ef] animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[#f5f3ef] mb-6">Save Project</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Project name..."
              autoFocus
              className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-[#2a2a2a] text-[#f5f3ef] placeholder-[#6b6b6b] focus:outline-none focus:border-[#f5f3ef] mb-6 font-medium"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#a0a0a0] font-medium transition-colors border border-[#2a2a2a]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="flex-1 px-4 py-3 bg-[#f5f3ef] hover:bg-white disabled:opacity-50 text-[#0a0a0a] font-bold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages - Groth style */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages
          .filter((m) => m.role !== "system")
          .map((msg, index) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-sm px-5 py-4 ${
                  msg.role === "user"
                    ? "bg-[#f5f3ef] text-[#0a0a0a] border-2 border-[#f5f3ef]"
                    : "bg-[#1a1a1a] text-[#f5f3ef] border-2 border-[#2a2a2a]"
                }`}
              >
                <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
              </div>
            </div>
          ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-[#1a1a1a] text-[#f5f3ef] px-5 py-5 border-2 border-[#2a2a2a] max-w-md">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#f5f3ef]" />
                <p className="text-sm font-bold text-[#f5f3ef]">{generationPhase || "Generating..."}</p>
              </div>

              {/* Phase progress indicator */}
              <div className="flex gap-1 mb-3">
                {["Planning", "Designing", "Generating", "Assembly"].map((phase, idx) => {
                  const isActive = generationPhase?.toLowerCase().includes(phase.toLowerCase())
                  const phases = ["Planning", "Designing", "Generating", "Assembly"]
                  const currentIdx = phases.findIndex((p) => generationPhase?.toLowerCase().includes(p.toLowerCase()))
                  const isPassed = idx < currentIdx

                  return (
                    <div
                      key={phase}
                      className={`h-1 flex-1 transition-all duration-500 ${
                        isActive ? "bg-[#f5f3ef]" : isPassed ? "bg-[#6b6b6b]" : "bg-[#2a2a2a]"
                      }`}
                    />
                  )
                })}
              </div>

              {/* Time expectation - shown once at start */}
              {generationPhase === "Planning layout & structure" && (
                <p className="text-xs text-[#a0a0a0] font-medium">This typically takes 60-90 seconds</p>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Model Settings Panel */}
      {showModelSettings && (
        <div className="px-6 py-4 border-t border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.1em] text-[#f5f3ef] block mb-2">AI Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as AIModel)}
                className="w-full px-4 py-2 bg-[#0a0a0a] border-2 border-[#2a2a2a] text-[#f5f3ef] text-sm focus:outline-none focus:border-[#f5f3ef] transition-colors"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="reasoning"
                checked={reasoningEnabled}
                onChange={(e) => setReasoningEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#f5f3ef] cursor-pointer"
              />
              <label htmlFor="reasoning" className="text-xs font-medium text-[#f5f3ef] cursor-pointer">
                Enable Reasoning
              </label>
            </div>
            <button
              onClick={() => setShowModelSettings(false)}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#f5f3ef] text-[#f5f3ef] text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Input - Groth style */}
      <form onSubmit={handleSubmit} className="px-6 py-5 border-t border-[#2a2a2a]">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setShowModelSettings(!showModelSettings)}
            className="px-4 py-4 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#f5f3ef] transition-colors flex items-center gap-2 border-2 border-[#2a2a2a]"
            title="AI Model Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe changes or new features..."
            disabled={loading}
            className="flex-1 px-5 py-4 bg-[#1a1a1a] border-2 border-[#2a2a2a] text-[#f5f3ef] placeholder-[#6b6b6b] focus:outline-none focus:border-[#f5f3ef] disabled:opacity-50 transition-colors font-medium"
            style={{ cursor: loading ? "not-allowed" : "text" }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-4 bg-[#f5f3ef] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-[#0a0a0a] transition-colors flex items-center gap-2 font-bold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  )
}
