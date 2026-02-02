import { type NextRequest, NextResponse } from "next/server"
import { applyEdits, isEditCommandResponse, type EditCommandResponse } from "@/lib/html-edit-engine"
import { classifyIntent } from "@/lib/intent-classifier"
import { routeEditStrategy } from "@/lib/edit-strategy-router"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

function decomposeIntent(userMessage: string): {
  layout: string
  style: string
  mood: string
} {
  const lower = userMessage.toLowerCase()

  const layout =
    lower.includes("landing") || lower.includes("hero")
      ? "hero-focused"
      : lower.includes("dashboard") || lower.includes("admin")
        ? "grid-layout"
        : lower.includes("portfolio") || lower.includes("gallery")
          ? "gallery-style"
          : "standard-flow"

  const style =
    lower.includes("minimal") || lower.includes("clean")
      ? "minimal"
      : lower.includes("bold") || lower.includes("brutalist")
        ? "brutalist"
        : lower.includes("modern") || lower.includes("sleek")
          ? "modern"
          : "balanced"

  const mood =
    lower.includes("professional") || lower.includes("corporate")
      ? "professional"
      : lower.includes("playful") || lower.includes("fun")
        ? "playful"
        : lower.includes("luxury") || lower.includes("premium")
          ? "luxury"
          : "neutral"

  return { layout, style, mood }
}

// Determine if this is initial generation or edit
function isInitialGeneration(currentHtml: string): boolean {
  return !currentHtml || currentHtml.trim().length === 0
}

async function generatePage(messages: Message[], selectedModel: string, reasoningEnabled: boolean, currentHtml: string): Promise<string> {
  const intent = decomposeIntent(messages[messages.length - 1]?.content || "")
  console.log("[v0] Intent decomposition:", intent)

  const systemMessage = `Sen elit bir frontend muhendisisin. SADECE tek dosya, production-ready HTML websiteleri uretiyorsun.

MUTLAK KURALLAR - BUNLARI ASLA KIRMA:
1. Ciktida SADECE ham HTML kodu olacak - markdown YOK, aciklama YOK, yorum YOK, extra text YOK
2. MINIMUM 100 satirdan fazla olmali
3. Her cevap <!DOCTYPE html> ile baslamali ve </html> ile bitmeli
4. Tek bir .html dosyasi - cift tiklayinca calisacak
5. npm YOK, build tools YOK, framework YOK, API key YOK, auth YOK
6. Tamamen responsive ve offline calismali
7. Public CDN'ler kullanilabilir (Google Fonts, Font Awesome, GSAP, Three.js, Swiper, Anime.js)
8. Smooth animasyonlar, modern UI, semantic HTML, accessibility

INTENT GUIDANCE (use this context):
- Layout approach: ${intent.layout}
- Visual style: ${intent.style}
- Mood/tone: ${intent.mood}

CIKTI FORMATI:
<!DOCTYPE html>
<html>
...TAMAMI...
</html>

BASKA HICBIR SEY YAZMA. SADECE KOMPLE HTML.`

  const requestMessages: Message[] = [
    {
      role: "system",
      content: systemMessage,
    },
  ]

  const userMessages = messages.filter((m) => m.role !== "system")
  requestMessages.push(...userMessages)

  const requestPayload: any = {
    model: selectedModel,
    messages: requestMessages,
    temperature: 0.7,
    max_tokens: 65000,
    top_p: 0.9,
  }

  if (reasoningEnabled) {
    requestPayload.reasoning = {
      type: "enabled",
      budget_tokens: 10000,
    }
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://blackmird.online",
    },
    body: JSON.stringify(requestPayload),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error("[v0] OpenRouter API error:", error)
    throw new Error(`OpenRouter API error: ${error.error?.message || "Unknown error"}`)
  }

  const data = await response.json()
  let html = data.choices[0].message.content

  const htmlMatch = html.match(/```html\n([\s\S]*?)\n```/)
  if (htmlMatch) {
    html = htmlMatch[1]
  } else {
    const simpleMatch = html.match(/```\n([\s\S]*?)\n```/)
    if (simpleMatch) {
      html = simpleMatch[1]
    }
  }

  if (!html.includes("<!DOCTYPE html>") && !html.includes("<html")) {
    const doctypeMatch = html.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i)
    if (doctypeMatch) {
      html = doctypeMatch[1]
    }
  }

  return html
}

async function editPage(
  currentHtml: string,
  messages: Message[],
  selectedModel: string,
  reasoningEnabled: boolean,
  apiKey: string,
): Promise<{ html: string; editsApplied: number; intent: string }> {
  const lastUserMessage = messages[messages.length - 1]?.content || ""

  // Step 1: Classify intent (fast, lightweight)
  const classification = classifyIntent(lastUserMessage)
  console.log(`[v0] Edit intent classified: ${classification.intent} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`)

  // Step 2: Route to appropriate strategy based on intent
  let edits: EditCommandResponse
  try {
    edits = await routeEditStrategy(classification.intent, currentHtml, lastUserMessage, selectedModel, reasoningEnabled, apiKey)
  } catch (error) {
    console.error("[v0] Edit strategy failed:", error)
    edits = { ops: [] }
  }

  // Step 3: Validate and apply edits
  if (!isEditCommandResponse(edits)) {
    console.warn("[v0] Invalid edit command response, returning original HTML")
    return { html: currentHtml, editsApplied: 0, intent: classification.intent }
  }

  const modifiedHtml = applyEdits(currentHtml, edits.ops)
  const editsApplied = edits.ops.filter((op) => {
    // Count as applied if it resulted in a change to the HTML
    // This is approximate - we check if the HTML actually changed
    return modifiedHtml.length !== currentHtml.length
  }).length

  return { html: modifiedHtml, editsApplied: edits.ops.length, intent: classification.intent }
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 })
    }

    const body = await request.json()
    const messages: Message[] = body.messages
    const currentHtml: string = body.currentHtml || ""
    let userMessage: string = body.userMessage || messages[messages.length - 1]?.content || ""
    let selectedModel: string = body.model || "stepfun/step-3.5-flash:free"
    const reasoningEnabled: boolean = body.reasoning || false

    // Parse user message if it's JSON with model/reasoning data
    try {
      const parsed = JSON.parse(userMessage)
      if (parsed.message && parsed.model) {
        userMessage = parsed.message
        selectedModel = parsed.model
      }
    } catch {
      // Not JSON, use as-is
    }

    // Update last message with extracted user message
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages[messages.length - 1].content = userMessage
    }

    // Route to appropriate handler
    if (isInitialGeneration(currentHtml)) {
      console.log("[v0] Mode: GENERATE (initial page)")
      const html = await generatePage(messages, selectedModel, reasoningEnabled)
      return NextResponse.json({ html, mode: "generate", intent: "initial" })
    } else {
      console.log("[v0] Mode: EDIT (apply changes)")
      const { html, editsApplied, intent } = await editPage(currentHtml, messages, selectedModel, reasoningEnabled, OPENROUTER_API_KEY)
      return NextResponse.json({ html, mode: "edit", editsApplied, intent })
    }
  } catch (error) {
    console.error("[v0] Error generating HTML:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate HTML" },
      { status: 500 },
    )
  }
}
