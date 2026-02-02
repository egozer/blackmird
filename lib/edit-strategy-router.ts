/**
 * Edit Strategy Router
 * Routes edit requests to appropriate strategy based on intent classification
 * Always returns JSON-based edit operations - NEVER full HTML
 */

import type { EditCommandResponse } from "./html-edit-engine"
import type { IntentType } from "./intent-classifier"

/**
 * Micro Edit Strategy
 * Small, local, numeric or single-text edits
 * Fast, ultra-focused, < 5 operations
 */
async function microEditStrategy(
  currentHtml: string,
  userMessage: string,
  selectedModel: string,
  reasoningEnabled: boolean,
  apiKey: string,
): Promise<EditCommandResponse> {
  const systemMessage = `You are a MICRO-EDIT HTML engine. You ONLY make tiny, precise changes.

STRICT RULES:
1. Return ONLY valid JSON with ops array
2. Maximum 5 operations per request
3. ONLY target-specific replacements - NO refactoring
4. Find EXACT strings in the HTML to target
5. If target string doesn't exist, return empty ops
6. If the change would affect multiple places ambiguously, return empty ops
7. Keep edits atomic - ONE concept per change

Example request: "change title to MyApp"
Example response: {"ops": [{"op": "replace", "target": "<title>Old Title</title>", "value": "<title>MyApp</title>"}]}

If nothing should change or you can't find an exact target, return: {"ops": []}`

  const userPrompt = `Current HTML:
\`\`\`
${currentHtml}
\`\`\`

User request: ${userMessage}

Make a TINY, PRECISE change only. Return JSON with edit ops.`

  return await callEditLLM(systemMessage, userPrompt, selectedModel, reasoningEnabled, 2000, apiKey)
}

/**
 * Semantic Edit Strategy
 * Language changes, theme changes, multi-section edits, structural changes
 * Allows multiple operations but no full refactoring
 */
async function semanticEditStrategy(
  currentHtml: string,
  userMessage: string,
  selectedModel: string,
  reasoningEnabled: boolean,
  apiKey: string,
): Promise<EditCommandResponse> {
  const systemMessage = `You are a SEMANTIC HTML transformer. You make meaningful, multi-section changes.

STRICT RULES:
1. Return ONLY valid JSON with ops array
2. Multiple operations allowed (up to 15)
3. This is a TRANSFORMATION, not a refactor
4. Find exact strings/sections to replace
5. Replace entire sections if needed (e.g., all text content)
6. Handle language translations by replacing all visible text
7. Apply theme/color changes consistently
8. Do NOT restructure HTML - only change content/styling
9. If a target can't be found precisely, skip it (return {"ops": []})

Example: "translate to Turkish"
- Find all visible text content
- Replace with Turkish equivalents
- Keep HTML structure identical

Example: "make it dark theme"
- Change background colors to dark
- Change text colors to light
- Update accent colors

Return JSON with edit ops.`

  const userPrompt = `Current HTML:
\`\`\`
${currentHtml}
\`\`\`

User request: ${userMessage}

Apply this SEMANTIC transformation using precise edit operations.`

  return await callEditLLM(systemMessage, userPrompt, selectedModel, reasoningEnabled, 4000, apiKey)
}

/**
 * Abstract Edit Strategy
 * Vague creative requests like "make it modern", "more premium", etc.
 * Converts abstract request into semantic plan, then generates ops
 */
async function abstractEditStrategy(
  currentHtml: string,
  userMessage: string,
  selectedModel: string,
  reasoningEnabled: boolean,
  apiKey: string,
): Promise<EditCommandResponse> {
  const systemMessage = `You are an ABSTRACT design enhancer. You convert vague creative requests into specific edits.

PROCESS:
1. Understand the vague request (e.g., "modern", "premium", "Apple-like")
2. Identify what that means concretely:
   - Modern: cleaner typography, more whitespace, subtle colors, rounded corners
   - Premium: better spacing, elegant fonts, refined colors, smooth interactions
   - Apple-like: minimalist, sans-serif, generous padding, rounded elements
3. Generate SPECIFIC edit operations to achieve this
4. Return ONLY valid JSON

STRICT RULES:
1. Return ONLY valid JSON with ops array
2. Multiple operations allowed (up to 15)
3. Make PRECISE edits that align with the vague request
4. Find exact strings to replace (spacing values, font families, colors)
5. If you can't make specific edits, return {"ops": []}
6. Focus on CSS changes and spacing adjustments
7. Preserve all HTML structure and content

Example request: "make it more modern"
Example response: {"ops": [
  {"op": "set_css", "target": "body", "value": "font-family: 'Segoe UI', sans-serif; letter-spacing: 0.5px"},
  {"op": "set_css", "target": ".container", "value": "padding: 2rem"},
  {"op": "replace", "target": "border-radius: 0", "value": "border-radius: 8px"}
]}

Return JSON with edit ops.`

  const userPrompt = `Current HTML:
\`\`\`
${currentHtml}
\`\`\`

User request: "${userMessage}"

Convert this vague design request into specific edits. Focus on CSS and spacing.`

  return await callEditLLM(systemMessage, userPrompt, selectedModel, reasoningEnabled, 4000, apiKey)
}

/**
 * Low-level LLM call for edit strategies
 * Parses response and validates JSON
 */
async function callEditLLM(
  systemMessage: string,
  userPrompt: string,
  selectedModel: string,
  reasoningEnabled: boolean,
  maxTokens: number,
  apiKey: string,
): Promise<EditCommandResponse> {
  if (!apiKey) {
    console.error("[v0] API key not provided")
    return { ops: [] }
  }

  const requestMessages = [
    { role: "system" as const, content: systemMessage },
    { role: "user" as const, content: userPrompt },
  ]

  const requestPayload: any = {
    model: selectedModel,
    messages: requestMessages,
    temperature: 0.3,
    max_tokens: maxTokens,
    top_p: 0.9,
  }

  if (reasoningEnabled) {
    requestPayload.reasoning = {
      type: "enabled",
      budget_tokens: 3000,
    }
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://blackmird.online",
      },
      body: JSON.stringify(requestPayload),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("[v0] OpenRouter API error:", error)
      return { ops: [] }
    }

    const data = await response.json()
    let responseContent = data.choices[0].message.content

    // Extract JSON from response
    responseContent = responseContent.replace(/```json\n?|\n?```|```\n?|\n?```/g, "").trim()

    try {
      const parsed = JSON.parse(responseContent)
      if (parsed.ops && Array.isArray(parsed.ops)) {
        return parsed as EditCommandResponse
      }
    } catch {
      console.error("[v0] Failed to parse edit response:", responseContent)
    }

    return { ops: [] }
  } catch (error) {
    console.error("[v0] Edit LLM call failed:", error)
    return { ops: [] }
  }
}

/**
 * Main router function
 * Routes to appropriate strategy based on intent
 * Always returns JSON edit operations
 */
export async function routeEditStrategy(
  intent: IntentType,
  currentHtml: string,
  userMessage: string,
  selectedModel: string,
  reasoningEnabled: boolean,
  apiKey: string,
): Promise<EditCommandResponse> {
  console.log(`[v0] Routing to ${intent} edit strategy`)

  switch (intent) {
    case "micro":
      return await microEditStrategy(currentHtml, userMessage, selectedModel, reasoningEnabled, apiKey)

    case "semantic":
      return await semanticEditStrategy(currentHtml, userMessage, selectedModel, reasoningEnabled, apiKey)

    case "abstract":
      return await abstractEditStrategy(currentHtml, userMessage, selectedModel, reasoningEnabled, apiKey)

    default:
      console.warn(`[v0] Unknown intent: ${intent}, defaulting to semantic`)
      return await semanticEditStrategy(currentHtml, userMessage, selectedModel, reasoningEnabled, apiKey)
  }
}
