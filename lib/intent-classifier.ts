/**
 * Intent Classifier
 * Lightweight, fast classification of user requests into edit strategies
 * Returns JSON only - no full HTML output
 */

export type IntentType = "micro" | "semantic" | "abstract"

export interface IntentClassification {
  intent: IntentType
  confidence: number
  reasoning: string
}

/**
 * Classifies user request into one of three intent types
 * - "micro": small, local, numeric or single-text edits (fast, < 5 ops)
 * - "semantic": language changes, theme changes, multi-section edits
 * - "abstract": vague style requests (modern, premium, Apple-like, etc.)
 *
 * This classifier is intentionally lightweight and token-efficient
 */
export function classifyIntent(userMessage: string): IntentClassification {
  const lower = userMessage.toLowerCase()

  // MICRO INTENT PATTERNS
  // Single-word edits, number changes, specific text replacements
  const microPatterns = [
    /^(change|replace|update|swap|alter).{0,50}(to|with)\s+["']?[^"']+["']?$/i, // "change title to X"
    /^(make|set).{0,30}(to|=)\s+(\d+|true|false|["'][^"']+["'])$/i, // "set padding to 20"
    /^(add|remove|delete).{0,50}(button|link|text|word|title|heading)$/i, // "remove button"
    /^(edit|fix|correct).{0,50}(typo|error|mistake|word|text)$/i, // "fix typo"
    /(what|is).{0,50}(the|this|current).+\?$/i, // "what is the title?"
    /^(make).{0,20}(darker|lighter|bigger|smaller|bold|italic)$/i, // "make text bigger"
    /^[a-z\s]+:\s*["']?[^"']+["']?$/i, // "headline: New Title"
  ]

  // SEMANTIC INTENT PATTERNS
  // Language changes, theme changes, multi-section edits, structural changes
  const semanticPatterns = [
    /translate.{0,50}(to|into)\s+[a-z]+/i, // "translate to Turkish"
    /(make|turn|convert|change).{0,50}(dark|light|theme|mode|blue|modern|minimal)/i, // "make it dark"
    /^(rewrite|change).{0,100}(section|page|all|entire|whole)/i, // "rewrite the whole page"
    /(layout|restructure|reorganize).{0,50}/i, // "restructure layout"
    /^(change|update).{0,50}(language|all text|everything|colors|fonts)/i, // "change all text to Turkish"
    /(make|add|remove).{0,50}(footer|header|sidebar|navigation|menu)/i, // "add footer"
    /^(style|design).{0,50}(like|similar to|inspired by)/i, // "style like Apple"
  ]

  // ABSTRACT INTENT PATTERNS
  // Vague creative requests without specific targets
  const abstractPatterns = [
    /(make|make it|feel|look).{0,50}(modern|premium|luxury|minimalist|brutalist|cozy|professional|corporate|playful|fun|sleek|elegant|bold)/i, // "make it modern"
    /(more|less).{0,50}(modern|professional|playful|minimal|bold|fancy)/i, // "more professional"
    /^(improve|enhance|better).{0,50}(design|look|feel|ui|ux)$/i, // "improve design"
    /(vibe|feel|aesthetic|mood|energy).{0,50}(modern|premium|etc)/i, // "Apple-like vibe"
    /^(make it).{0,50}(look like|feel like|seem like|inspired by)/i, // "make it look like X"
    /(imagine|picture|envision).{0,50}(modern|premium|sleek)/i, // "imagine a modern version"
    /^(refresh|revamp|update).{0,50}(design|look|appearance)$/i, // "refresh the design"
  ]

  // Count pattern matches
  const microCount = microPatterns.filter((p) => p.test(lower)).length
  const semanticCount = semanticPatterns.filter((p) => p.test(lower)).length
  const abstractCount = abstractPatterns.filter((p) => p.test(lower)).length

  // Determine primary intent
  let intent: IntentType = "semantic" // Default fallback
  let confidence = 0
  let reasoning = ""

  if (microCount > 0) {
    intent = "micro"
    confidence = Math.min(0.95, 0.6 + microCount * 0.15)
    reasoning = `Detected micro edit pattern (${microCount} matches): local text/value change`
  } else if (abstractCount > 0) {
    intent = "abstract"
    confidence = Math.min(0.95, 0.6 + abstractCount * 0.15)
    reasoning = `Detected abstract pattern (${abstractCount} matches): vague creative request`
  } else if (semanticCount > 0) {
    intent = "semantic"
    confidence = Math.min(0.95, 0.6 + semanticCount * 0.15)
    reasoning = `Detected semantic pattern (${semanticCount} matches): language/theme/structure change`
  } else {
    // Fallback heuristics based on message length and content
    if (lower.length < 30) {
      intent = "micro"
      confidence = 0.4
      reasoning = "Short message - treating as potential micro edit"
    } else if (lower.includes("translate") || lower.includes("language")) {
      intent = "semantic"
      confidence = 0.7
      reasoning = "Language-related keywords detected"
    } else {
      intent = "semantic"
      confidence = 0.5
      reasoning = "Default fallback to semantic"
    }
  }

  console.log(`[v0] Intent classified: ${intent} (confidence: ${(confidence * 100).toFixed(0)}%) - ${reasoning}`)

  return {
    intent,
    confidence,
    reasoning,
  }
}
