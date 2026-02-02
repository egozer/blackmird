export interface EditOperation {
  op: "replace" | "insert_before" | "insert_after" | "delete" | "set_css" | "replace_all"
  target: string
  value?: string
}

export interface EditCommandResponse {
  ops: EditOperation[]
}

/**
 * Applies edit operations to HTML string safely
 * STEP 4 — APPLY LOGIC:
 * - Skip operation if target is not found
 * - Skip if target matches multiple places (for single-match ops)
 * - Do not partially apply broken edits
 * @param html - Current HTML string
 * @param ops - Array of edit operations
 * @returns Modified HTML string
 */
export function applyEdits(html: string, ops: EditOperation[]): string {
  let result = html
  let appliedCount = 0
  let skippedCount = 0

  for (const operation of ops) {
    try {
      const beforeEdit = result
      
      switch (operation.op) {
        case "replace":
          result = applyReplace(result, operation.target, operation.value || "")
          break
        case "replace_all":
          result = applyReplaceAll(result, operation.target, operation.value || "")
          break
        case "insert_before":
          result = applyInsertBefore(result, operation.target, operation.value || "")
          break
        case "insert_after":
          result = applyInsertAfter(result, operation.target, operation.value || "")
          break
        case "delete":
          result = applyDelete(result, operation.target)
          break
        case "set_css":
          result = applySetCss(result, operation.target, operation.value || "")
          break
      }
      
      if (result !== beforeEdit) {
        appliedCount++
      } else {
        skippedCount++
      }
    } catch (error) {
      console.error(`[v0] Edit operation failed (${operation.op}):`, error)
      skippedCount++
      continue
    }
  }

  console.log(`[v0] Edit results: ${appliedCount} applied, ${skippedCount} skipped`)
  return result
}

/**
 * Extracts text content from HTML tags for flexible matching
 */
function extractTextContent(html: string): Map<string, number> {
  const textMap = new Map<string, number>()
  // Remove tags to get text content
  const textOnly = html.replace(/<[^>]*>/g, "")
  // Split into words/phrases
  const matches = textOnly.match(/[A-Za-z0-9\s]+/g) || []
  matches.forEach((match) => {
    const normalized = match.trim().replace(/\s+/g, " ")
    if (normalized.length > 2) {
      textMap.set(normalized, (textMap.get(normalized) || 0) + 1)
    }
  })
  return textMap
}

/**
 * Finds best matching context for a text replacement
 * Looks for the target text and surrounding context to ensure unique match
 */
function findBestMatch(
  html: string,
  target: string,
  context: { before?: string; after?: string } = {},
): { index: number; matched: string } | null {
  // Normalize target
  const normalized = target.trim().replace(/\s+/g, " ")

  // Try exact match first
  let index = html.indexOf(target)
  if (index !== -1 && html.indexOf(target, index + 1) === -1) {
    return { index, matched: target }
  }

  // Try normalized match (ignoring whitespace)
  const htmlLines = html.split(/\n+/)
  for (let i = 0; i < htmlLines.length; i++) {
    const line = htmlLines[i]
    const lineNorm = line.replace(/\s+/g, " ")
    if (lineNorm.includes(normalized)) {
      // Found on this line, now find in original
      const fullMatch = line.match(new RegExp(target.split(/\s+/).join("\\s+"), "i"))
      if (fullMatch) {
        const globalIndex = html.indexOf(line) + line.indexOf(fullMatch[0])
        // Check uniqueness
        if (html.indexOf(fullMatch[0], globalIndex + 1) === -1) {
          return { index: globalIndex, matched: fullMatch[0] }
        }
      }
    }
  }

  // Try partial match with context
  if (context.before || context.after) {
    const beforePattern = context.before ? context.before.slice(-20) : ""
    const afterPattern = context.after ? context.after.slice(0, 20) : ""

    const pattern = new RegExp(
      `${beforePattern ? beforePattern + ".*?" : ""}${normalized.split(/\s+/).join("\\s+")}${afterPattern ? ".*?" + afterPattern : ""}`,
      "i",
    )

    const match = html.match(pattern)
    if (match) {
      const globalIndex = html.indexOf(match[0])
      // Extract just the target part
      const targetStart = match[0].indexOf(normalized)
      return { index: globalIndex + targetStart, matched: normalized }
    }
  }

  return null
}

function applyReplace(html: string, target: string, value: string): string {
  console.log(`[v0] Attempting replace: "${target.substring(0, 40)}..." → "${value.substring(0, 40)}..."`)

  // Try exact match first
  let index = html.indexOf(target)
  if (index !== -1) {
    // Check uniqueness
    if (html.indexOf(target, index + 1) === -1) {
      console.log(`[v0] ✓ Exact match found (unique)`)
      return html.substring(0, index) + value + html.substring(index + target.length)
    } else {
      console.log(`[v0] Exact match found but not unique, trying flexible match...`)
    }
  }

  // Try flexible/normalized match
  const match = findBestMatch(html, target)
  if (match && match.matched) {
    console.log(`[v0] ✓ Flexible match found: "${match.matched.substring(0, 40)}..."`)
    return (
      html.substring(0, match.index) + value + html.substring(match.index + match.matched.length)
    )
  }

  console.warn(`[v0] ✗ No match found for: "${target.substring(0, 40)}..."`)
  return html
}

/**
 * Replace all occurrences of target with value
 * Used for semantic/language changes where we want to replace all instances
 */
function applyReplaceAll(html: string, target: string, value: string): string {
  if (!html.includes(target)) {
    console.warn(`[v0] ReplaceAll target not found: ${target.substring(0, 50)}...`)
    return html
  }
  
  // Use split/join for safe replacement (avoids regex special char issues)
  return html.split(target).join(value)
}

function applyInsertBefore(html: string, target: string, value: string): string {
  const index = html.indexOf(target)

  if (index === -1) {
    console.warn(`[v0] Insert before target not found: ${target.substring(0, 50)}...`)
    return html
  }

  // Check for multiple matches
  if (html.indexOf(target, index + 1) !== -1) {
    console.warn(`[v0] Insert before target matches multiple locations, skipping: ${target.substring(0, 50)}...`)
    return html
  }

  return html.substring(0, index) + value + html.substring(index)
}

function applyInsertAfter(html: string, target: string, value: string): string {
  const index = html.indexOf(target)

  if (index === -1) {
    console.warn(`[v0] Insert after target not found: ${target.substring(0, 50)}...`)
    return html
  }

  // Check for multiple matches
  if (html.indexOf(target, index + 1) !== -1) {
    console.warn(`[v0] Insert after target matches multiple locations, skipping: ${target.substring(0, 50)}...`)
    return html
  }

  const insertIndex = index + target.length
  return html.substring(0, insertIndex) + value + html.substring(insertIndex)
}

function applyDelete(html: string, target: string): string {
  const index = html.indexOf(target)

  if (index === -1) {
    console.warn(`[v0] Delete target not found: ${target.substring(0, 50)}...`)
    return html
  }

  // Check for multiple matches
  if (html.indexOf(target, index + 1) !== -1) {
    console.warn(`[v0] Delete target matches multiple locations, skipping: ${target.substring(0, 50)}...`)
    return html
  }

  return html.substring(0, index) + html.substring(index + target.length)
}

function applySetCss(html: string, cssRule: string, cssValue: string): string {
  const styleTagMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)

  if (!styleTagMatch) {
    // Create style block if missing
    const headMatch = html.match(/<head[^>]*>/)
    if (headMatch) {
      const styleBlock = `<style>\n${cssRule} { ${cssValue} }\n</style>`
      return html.replace(headMatch[0], headMatch[0] + styleBlock)
    }
    return html
  }

  const styleContent = styleTagMatch[1]
  const ruleRegex = new RegExp(`${cssRule}\\s*{[^}]*}`, "g")

  let newStyleContent: string
  if (ruleRegex.test(styleContent)) {
    // Replace existing rule
    newStyleContent = styleContent.replace(ruleRegex, `${cssRule} { ${cssValue} }`)
  } else {
    // Add new rule
    newStyleContent = styleContent + `\n${cssRule} { ${cssValue} }`
  }

  return html.replace(styleTagMatch[0], `<style>${newStyleContent}</style>`)
}

/**
 * Validates if response is valid edit command JSON
 */
export function isEditCommandResponse(data: any): data is EditCommandResponse {
  if (!data || typeof data !== "object") return false
  if (!Array.isArray(data.ops)) return false

  return data.ops.every((op: any) => {
    const validOps = ["replace", "replace_all", "insert_before", "insert_after", "delete", "set_css"]
    return validOps.includes(op.op) && typeof op.target === "string"
  })
}
