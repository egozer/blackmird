import { type NextRequest, NextResponse } from "next/server"

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

    const intent = decomposeIntent(userMessage)
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

!!! KRITIK - REVIZYON KURALLARI !!!
- Kullanici HERHANGI bir degisiklik istediginde, SEN MUTLAKA KOMPLE HTML DOSYASINI YENIDEN YAZACAKSIN
- ASLA sadece degisen kismi verme - YASAKLANMIS!
- ASLA "isste degisiklik" deme - YASAKLANMIS!
- ASLA kod parcasi verme - YASAKLANMIS!
- HER CEVAP tamamen calisir, kopyala-yapistir hazir HTML olmali
- Onceki TUM ozellikler KORUNMALI + yeni istenen ozellik eklenmeli
- Cikti 50 satirdan az ise = HATALIDIR
- MINIMUM 100+ satir ZORUNLU

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

    if (currentHtml && userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1]

      const enhancedMessages = userMessages.slice(0, -1)
      enhancedMessages.push({
        role: "user",
        content: `MEVCUT HTML KODUM (bunu baz al ve uzerine ekle):
\`\`\`html
${currentHtml}
\`\`\`

ISTENEN DEGISIKLIK: ${lastUserMessage.content}

ONEMLI HATIRLATMA:
- Yukaridaki HTML'in TAMAMINI koru, sadece istenen degisikligi ekle
- KOMPLE HTML dosyasi dondur (minimum 100 satir)
- Sadece degisen kismi verme - KOMPLE DOSYA!`,
      })

      requestMessages.push(...enhancedMessages)
    } else {
      requestMessages.push(...userMessages)
    }

    const requestPayload: any = {
      model: selectedModel,
      messages: requestMessages,
      temperature: 0.7,
      max_tokens: 65000,
      top_p: 0.9,
    }

    // Add reasoning parameter if enabled
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
      return NextResponse.json(
        { error: `OpenRouter API error: ${error.error?.message || "Unknown error"}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    let html = data.choices[0].message.content

    // Extract HTML if wrapped in markdown code block
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

    return NextResponse.json({ html })
  } catch (error) {
    console.error("[v0] Error generating HTML:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate HTML" },
      { status: 500 },
    )
  }
}
