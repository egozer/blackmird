"use client"

import { useState, useRef } from "react"
import { Download, Eye, Code, RefreshCw, Monitor, Smartphone, Share2, Copy, Check, X } from "lucide-react"

interface PreviewPanelProps {
  html: string
  onHtmlChange: (html: string) => void
  onDownload: () => void
  onPublish?: () => Promise<string | null>
  isGenerating?: boolean
}

export default function PreviewPanel({ html, onHtmlChange, onDownload, onPublish, isGenerating = false }: PreviewPanelProps) {
  const [mode, setMode] = useState<"preview" | "code">("preview")
  const [iframeKey, setIframeKey] = useState(0)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleHtmlEdit = (newHtml: string) => {
    onHtmlChange(newHtml)
  }

  const refreshPreview = () => {
    setIframeKey((prev) => prev + 1)
  }

  const handleShare = async () => {
    if (!onPublish) return
    setPublishing(true)
    const id = await onPublish()
    if (id) {
      const url = `${window.location.origin}/preview/${id}`
      setShareUrl(url)
      setShowShareModal(true)
      generateQRCode(url)
    }
    setPublishing(false)
  }

  const generateQRCode = (url: string) => {
    if (!qrCanvasRef.current) return
    const canvas = qrCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Use QR Code API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = 200
      canvas.height = 200
      ctx.drawImage(img, 0, 0)
    }
    img.src = qrApiUrl
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQRCode = () => {
    if (!qrCanvasRef.current) return
    const link = document.createElement('a')
    link.download = 'qrcode.png'
    link.href = qrCanvasRef.current.toDataURL()
    link.click()
  }

  const getIframeStyle = () => {
    const baseStyle = "w-full h-full border-none bg-white transition-all duration-300"
    const widthStyle = viewMode === "mobile" ? "max-w-[375px] mx-auto" : "w-full"
    return `${baseStyle} ${widthStyle}`
  }

  return (
    <div className="w-3/4 flex flex-col bg-[#f5f3ef] animate-in slide-in-from-right duration-500">
      {/* Header - Groth style */}
      <div className="px-6 py-5 border-b border-[#d4d0c8] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="flex border-2 border-[#0a0a0a]">
            <button
              onClick={() => setMode("preview")}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                mode === "preview" ? "bg-[#0a0a0a] text-[#f5f3ef]" : "bg-white text-[#0a0a0a] hover:bg-[#e8e4dc]"
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setMode("code")}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors border-l-2 border-[#0a0a0a] ${
                mode === "code" ? "bg-[#0a0a0a] text-[#f5f3ef]" : "bg-white text-[#0a0a0a] hover:bg-[#e8e4dc]"
              }`}
            >
              <Code className="w-4 h-4" />
              Code
            </button>
          </div>

          {mode === "preview" && html && (
            <div className="flex border-2 border-[#0a0a0a] ml-2">
              <button
                onClick={() => setViewMode("desktop")}
                className={`px-3 py-2 transition-colors ${
                  viewMode === "desktop" ? "bg-[#0a0a0a] text-[#f5f3ef]" : "bg-white text-[#0a0a0a] hover:bg-[#e8e4dc]"
                }`}
                title="Desktop view"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`px-3 py-2 transition-colors border-l-2 border-[#0a0a0a] ${
                  viewMode === "mobile" ? "bg-[#0a0a0a] text-[#f5f3ef]" : "bg-white text-[#0a0a0a] hover:bg-[#e8e4dc]"
                }`}
                title="Mobile view"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {mode === "code" && (
            <button
              onClick={refreshPreview}
              className="px-4 py-2 flex items-center gap-2 text-sm font-medium bg-white border-2 border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#e8e4dc] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
          {onPublish && (
            <button
              onClick={handleShare}
              disabled={!html || isGenerating || publishing}
              className="px-5 py-2 flex items-center gap-2 text-sm font-bold bg-[#10b981] hover:bg-[#fbbf24] disabled:opacity-50 disabled:cursor-not-allowed text-white hover:text-[#0a0a0a] transition-colors"
            >
              {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              Share
            </button>
          )}
          <button
            onClick={onDownload}
            disabled={!html || isGenerating}
            className="px-5 py-2 flex items-center gap-2 text-sm font-bold bg-[#0a0a0a] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed text-[#f5f3ef] transition-colors shadow-[3px_3px_0px_0px_#b5694d] hover:shadow-[4px_4px_0px_0px_#b5694d]"
          >
            <Download className="w-4 h-4" />
            Download HTML
          </button>
        </div>
      </div>

      {/* Share Modal with QR Code */}
      {showShareModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border-2 border-[#f5f3ef] p-8 w-[32rem] shadow-[6px_6px_0px_0px_#f5f3ef] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#f5f3ef]">Share Your Project</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
              >
                <X className="w-5 h-5 text-[#a0a0a0]" />
              </button>
            </div>
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

            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="bg-white p-4 rounded">
                <canvas ref={qrCanvasRef} className="w-[200px] h-[200px]" />
              </div>
              <button
                onClick={downloadQRCode}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#f5f3ef] text-sm font-medium transition-colors border border-[#2a2a2a] flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR Code
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

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {!html ? (
          <div className="flex flex-col items-center justify-center h-full text-[#6b6b6b]">
            <div className="w-20 h-20 mb-6 bg-[#e8e4dc] border-2 border-[#d4d0c8] flex items-center justify-center">
              <Eye className="w-10 h-10 text-[#a0a0a0]" />
            </div>
            <p className="text-xl font-bold text-[#0a0a0a]">No preview yet</p>
            <p className="text-sm text-[#6b6b6b] mt-2">Start by describing your website in the chat</p>
          </div>
        ) : mode === "preview" ? (
          <div className={`h-full ${viewMode === "mobile" ? "bg-[#e8e4dc] flex items-center justify-center" : ""}`}>
            <iframe
              key={iframeKey}
              srcDoc={html}
              className={getIframeStyle()}
              title="Website Preview"
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          <textarea
            value={html}
            onChange={(e) => handleHtmlEdit(e.target.value)}
            className="w-full h-full p-6 bg-[#0a0a0a] text-[#f5f3ef] font-mono text-xs border-none focus:outline-none resize-none leading-relaxed"
            placeholder="Your HTML will appear here..."
            spellCheck="false"
          />
        )}
      </div>
    </div>
  )
}
