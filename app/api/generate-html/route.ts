import { type NextRequest, NextResponse } from "next/server"
import { applyEdits, isEditCommandResponse, type EditCommandResponse } from "@/lib/html-edit-engine"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

type EditIntent = "micro" | "semantic" | "abstract"

/**
 * STEP 1 — INTENT CLASSIFIER (lightweight, fast)
 * Classifies user request into one of three intents:
 * - "micro": small, local, numeric or single-text edits
 * - "semantic": language changes, theme changes, multi-section edits
 * - "abstract": vague style requests (e.g. "modern", "premium", "Apple-like")
 */
function classifyEditIntent(userMessage: string): EditIntent {
  const lower = userMessage.toLowerCase().trim()
  
  // MICRO patterns - small, local, specific changes
  const microPatterns = [
    /change\s+(the\s+)?(text|title|heading|button|link|number|price|date|time|phone|email|address)/i,
    /replace\s+["']?[^"']+["']?\s+with/i,
    /set\s+(the\s+)?(text|value|content|title)/i,
    /update\s+(the\s+)?(text|title|heading|price|number)/i,
    /make\s+(the\s+)?(text|title|heading|button)\s+(say|read)/i,
    /fix\s+(the\s+)?(typo|spelling|text)/i,
    /^\s*["'][^"']+["']\s*(to|->|=>)\s*["'][^"']+["']\s*$/i,
    /change\s+\d+\s+to\s+\d+/i,
    /increase|decrease|add|remove|delete\s+(the\s+)?(number|count|quantity)/i,
  ]
  
  // SEMANTIC patterns - language, theme, multi-section changes
  const semanticPatterns = [
    /turkish|german|french|spanish|arabic|chinese|japanese|korean|russian|portuguese|italian|dutch|polish|hindi/i,
    /translate|localize|convert\s+to/i,
    /(dark|light|night|day)\s*(mode|theme)/i,
    /change\s+(the\s+)?(language|theme|color\s*scheme|palette)/i,
    /make\s+(it|everything|all|the\s+page)\s+(dark|light|blue|red|green)/i,
    /switch\s+to\s+(dark|light|turkish|english)/i,
    /all\s+(buttons|links|headings|texts|sections)/i,
    /every\s+(button|link|heading|text|section)/i,
    /throughout\s+(the\s+)?(page|site|website)/i,
    /entire\s+(page|site|website)/i,
  ]
  
  // ABSTRACT patterns - vague creative/style requests
  const abstractPatterns = [
    /\b(modern|premium|luxury|elegant|sleek|professional|corporate|playful|fun|minimal|clean|bold|striking|sophisticated)\b/i,
    /apple[\s-]?like|google[\s-]?style|airbnb|stripe|notion|vercel/i,
    /more\s+(attractive|beautiful|pretty|nice|cool|awesome|stunning|impressive)/i,
    /look\s+(better|nicer|more\s+professional|more\s+modern)/i,
    /feel\s+(more\s+)?(premium|luxury|modern|clean)/i,
    /improve\s+(the\s+)?(design|look|style|aesthetics|visuals)/i,
    /make\s+it\s+(pop|stand\s+out|shine|sparkle)/i,
    /redesign|restyle|revamp|refresh|modernize/i,
    /\bux\b|\bui\b|user\s*experience/i,
  ]
  
  // Check patterns in order of specificity
  for (const pattern of microPatterns) {
    if (pattern.test(lower)) {
      return "micro"
    }
  }
  
  for (const pattern of semanticPatterns) {
    if (pattern.test(lower)) {
      return "semantic"
    }
  }
  
  for (const pattern of abstractPatterns) {
    if (pattern.test(lower)) {
      return "abstract"
    }
  }
  
  // Default: if message is short and specific, treat as micro; otherwise semantic
  const wordCount = lower.split(/\s+/).length
  if (wordCount <= 8) {
    return "micro"
  }
  
  return "semantic"
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
    max_tokens: 32000,
    top_p: 0.9,
  }

  if (reasoningEnabled) {
    requestPayload.reasoning = {
      type: "enabled",
      budget_tokens: 5000,
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

/**
 * STEP 2 — EDIT STRATEGIES
 * Automatically routes to the appropriate edit strategy based on intent
 */

async function editPage(
  currentHtml: string,
  messages: Message[],
  selectedModel: string,
  reasoningEnabled: boolean,
): Promise<{ html: string; editsApplied: number; intent: EditIntent }> {
  const lastUserMessage = messages[messages.length - 1]?.content || ""
  
  // Classify intent for logging/UX
  const intent = classifyEditIntent(lastUserMessage)
  
  // For edits, compress HTML to reduce payload size - keep structure, remove extra whitespace/comments
  const compressedHtml = currentHtml
    .replace(/<!--[\s\S]*?-->/g, "") // Remove comments
    .replace(/\s+/g, " ") // Collapse whitespace
    .replace(/>\s+</g, "><") // Remove space between tags
  
  // Simple direct approach: have LLM return modified HTML
  const systemMessage = `You are an HTML editor. Apply requested changes and return complete modified HTML.

RULES:
1. Apply the user's requested changes
2. Return ONLY the complete modified HTML - nothing else
3. Keep all existing HTML structure and content you're not changing
4. Start with <!DOCTYPE html> and end with </html>
5. Don't explain, don't add comments, just return the HTML`

  const requestMessages: Message[] = [
    {
      role: "system",
      content: systemMessage,
    },
    {
      role: "user",
      content: `Current HTML (compressed):\n\`\`\`html\n${compressedHtml.substring(0, 30000)}\n\`\`\`\n\nUser request: ${lastUserMessage}\n\nReturn the complete modified HTML.`,
    },
  ]

  const requestPayload: any = {
    model: selectedModel,
    messages: requestMessages,
    temperature: intent === "micro" ? 0.1 : 0.3,
    max_tokens: intent === "micro" ? 8000 : 32000,
    top_p: 0.9,
  }

  if (reasoningEnabled && intent !== "micro") {
    requestPayload.reasoning = {
      type: "enabled",
      budget_tokens: 3000,
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
    throw new Error(`OpenRouter API error: ${error.error?.message || "Unknown error"}`)
  }

  const data = await response.json()
  let modifiedHtml = data.choices[0].message.content

  // Extract HTML from markdown code blocks if present
  const htmlMatch = modifiedHtml.match(/```html\n([\s\S]*?)\n```/)
  if (htmlMatch) {
    modifiedHtml = htmlMatch[1]
  } else {
    const simpleMatch = modifiedHtml.match(/```\n([\s\S]*?)\n```/)
    if (simpleMatch) {
      modifiedHtml = simpleMatch[1]
    }
  }

  // Validate HTML response
  if (!modifiedHtml.includes("<!DOCTYPE") || modifiedHtml.length < 100) {
    throw new Error("Invalid HTML response")
  }

  const wasModified = modifiedHtml !== currentHtml
  const editsApplied = wasModified ? 1 : 0

  return { html: modifiedHtml, editsApplied, intent }
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
      const html = await generatePage(messages, selectedModel, reasoningEnabled, currentHtml)
      console.log(`[v0] Generated HTML size: ${html.length}`)
      return NextResponse.json({ html, mode: "generate" })
    } else {
      console.log("[v0] Mode: EDIT (apply changes)")
      console.log(`[v0] Current HTML size: ${currentHtml.length}`)
      console.log(`[v0] User message: ${userMessage.substring(0, 100)}`)
      const { html, editsApplied, intent } = await editPage(currentHtml, messages, selectedModel, reasoningEnabled)
      console.log(`[v0] Edit completed - Intent: ${intent}, Operations: ${editsApplied}, New HTML size: ${html.length}`)
      
      // IMPORTANT: Return the modified HTML!
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
