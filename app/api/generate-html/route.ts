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

/**
 * STEP 2 — EDIT STRATEGIES
 * Automatically routes to the appropriate edit strategy based on intent
 */

// MICRO EDIT - ultra fast, minimal changes
function getMicroEditSystemPrompt(htmlContent: string): string {
  // Extract text content for context
  const textContent = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .trim()
    .substring(0, 800)

  return `You are an HTML micro-edit engine. Return JSON ONLY.

CRITICAL: Copy target strings EXACTLY from the HTML below.

STRICT RULES:
- Return ONLY valid JSON, nothing else
- Maximum 3 operations
- Make ONLY the exact change requested
- Do NOT refactor, beautify, or improve anything else
- Target strings must be copied EXACTLY from the HTML (whitespace matters!)
- If nothing needs changing, return { "ops": [] }

CURRENT TEXT IN PAGE:
${textContent}

JSON Schema:
{
  "ops": [
    {
      "op": "replace",
      "target": "exact string to find (copy from above)",
      "value": "replacement content"
    }
  ]
}

EXAMPLE:
User: "change name to John"
If page has: "Name: Alice"
Return: { "ops": [{ "op": "replace", "target": "Alice", "value": "John" }] }`
}

// SEMANTIC EDIT - language, theme, multi-section changes
function getSemanticEditSystemPrompt(htmlContent: string): string {
  // Extract actual text content from HTML to help LLM find targets
  const textContent = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .trim()
    .substring(0, 1000)

  return `You are an HTML semantic transformation engine. Return JSON ONLY.

CRITICAL: You MUST extract exact text strings from the provided HTML and use them as targets.

STRICT RULES:
- Return ONLY valid JSON, nothing else
- Multiple operations allowed for comprehensive changes
- Target strings MUST be copied exactly from the HTML (including whitespace, punctuation)
- Do NOT modify target strings - copy them exactly as they appear
- If you cannot find an exact match in the HTML, skip that operation
- Do NOT invent targets or approximate matches
- If nothing needs changing, return { "ops": [] }

CURRENT PAGE TEXT CONTENT (use these exact strings as targets):
${textContent}

JSON Schema:
{
  "ops": [
    {
      "op": "replace | insert_before | insert_after | delete | set_css",
      "target": "EXACT string from HTML",
      "value": "replacement content"
    }
  ]
}

INSTRUCTIONS:
1. Look at the text content above - these are the actual strings in the page
2. For text changes: find the EXACT phrase and replace it
3. For CSS changes: use set_css with selector and properties
4. Be precise - copy strings exactly as shown above
5. If you see formatting/whitespace in the target, preserve it in your target string

Be thorough - include ALL necessary changes to fully complete the transformation.`
}


// ABSTRACT EDIT - converts vague requests to concrete operations
function getAbstractEditSystemPrompt(abstractRequest: string): string {
  return `You are an HTML design transformation engine. Return JSON ONLY.

The user wants: "${abstractRequest}"

PROCESS (internal, do not explain):
1. Interpret this abstract request into concrete design changes
2. Generate specific CSS and content operations

STRICT RULES:
- Return ONLY valid JSON, nothing else
- Do NOT output full HTML
- Do NOT explain your changes
- Make the design feel more "${abstractRequest}"
- Focus on: colors, spacing, typography, shadows, borders, animations
- Target strings must match EXACTLY
- If nothing needs changing, return { "ops": [] }

JSON Schema:
{
  "ops": [
    {
      "op": "replace | insert_before | insert_after | delete | set_css",
      "target": "exact string or CSS selector",
      "value": "replacement content or CSS properties"
    }
  ]
}

Common transformations:
- "modern" → clean fonts, generous spacing, subtle shadows, rounded corners
- "premium/luxury" → dark colors, gold accents, elegant typography, smooth animations
- "minimal" → remove decorations, increase whitespace, simple colors
- "professional" → structured layout, muted colors, clear hierarchy
- "playful" → bright colors, rounded shapes, fun animations`
}

async function editPage(
  currentHtml: string,
  messages: Message[],
  selectedModel: string,
  reasoningEnabled: boolean,
): Promise<{ html: string; editsApplied: number; intent: EditIntent }> {
  const lastUserMessage = messages[messages.length - 1]?.content || ""
  
  // STEP 1: Classify intent automatically
  const intent = classifyEditIntent(lastUserMessage)
  console.log(`[v0] Edit intent classified as: ${intent}`)
  
  // STEP 2: Select appropriate system prompt based on intent
  let systemMessage: string
  let maxTokens: number
  let temperature: number
  
  switch (intent) {
    case "micro":
      systemMessage = getMicroEditSystemPrompt(currentHtml)
      maxTokens = 2000
      temperature = 0.2
      break
    case "semantic":
      systemMessage = getSemanticEditSystemPrompt(currentHtml)
      maxTokens = 8000
      temperature = 0.4
      break
    case "abstract":
      systemMessage = getAbstractEditSystemPrompt(lastUserMessage)
      maxTokens = 8000
      temperature = 0.5
      break
  }

  const requestMessages: Message[] = [
    {
      role: "system",
      content: systemMessage,
    },
    {
      role: "user",
      content: `Current HTML:
\`\`\`html
${currentHtml}
\`\`\`

User Request: ${lastUserMessage}

Return ONLY valid JSON with edit operations.`,
    },
  ]

  const requestPayload: any = {
    model: selectedModel,
    messages: requestMessages,
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
  }

  if (reasoningEnabled) {
    requestPayload.reasoning = {
      type: "enabled",
      budget_tokens: intent === "micro" ? 2000 : 5000,
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
  let responseContent = data.choices[0].message.content

  // Try to extract JSON
  let edits: EditCommandResponse
  try {
    // Remove markdown code blocks if present
    responseContent = responseContent.replace(/```json\n?|\n?```/g, "").trim()
    // Also handle plain code blocks
    responseContent = responseContent.replace(/```\n?|\n?```/g, "").trim()
    edits = JSON.parse(responseContent)
  } catch {
    console.error("[v0] Failed to parse edit commands:", responseContent)
    edits = { ops: [] }
  }

  if (!isEditCommandResponse(edits)) {
    console.warn("[v0] Invalid edit command response, returning original HTML")
    return { html: currentHtml, editsApplied: 0, intent }
  }

  // STEP 4: Apply edits safely (skip if target not found or multiple matches)
  const modifiedHtml = applyEdits(currentHtml, edits.ops)
  return { html: modifiedHtml, editsApplied: edits.ops.length, intent }
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
      return NextResponse.json({ html, mode: "generate" })
    } else {
      console.log("[v0] Mode: EDIT (apply changes)")
      const { html, editsApplied, intent } = await editPage(currentHtml, messages, selectedModel, reasoningEnabled)
      console.log(`[v0] Edit completed - Intent: ${intent}, Operations: ${editsApplied}`)
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
