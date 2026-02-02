export interface EditOperation {
  op: "replace" | "insert_before" | "insert_after" | "delete" | "set_css"
  target: string
  value?: string
}

export interface EditCommandResponse {
  ops: EditOperation[]
}

/**
 * Applies edit operations to HTML string
 * @param html - Current HTML string
 * @param ops - Array of edit operations
 * @returns Modified HTML string
 */
export function applyEdits(html: string, ops: EditOperation[]): string {
  let result = html

  for (const operation of ops) {
    try {
      switch (operation.op) {
        case "replace":
          result = applyReplace(result, operation.target, operation.value || "")
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
    } catch (error) {
      console.error(`[v0] Edit operation failed (${operation.op}):`, error)
      continue
    }
  }

  return result
}

function applyReplace(html: string, target: string, value: string): string {
  const index = html.indexOf(target)

  if (index === -1) {
    console.warn(`[v0] Replace target not found: ${target.substring(0, 50)}...`)
    return html
  }

  // Check for multiple matches
  if (html.indexOf(target, index + 1) !== -1) {
    console.warn(`[v0] Replace target matches multiple locations, skipping: ${target.substring(0, 50)}...`)
    return html
  }

  return html.substring(0, index) + value + html.substring(index + target.length)
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
    const validOps = ["replace", "insert_before", "insert_after", "delete", "set_css"]
    return validOps.includes(op.op) && typeof op.target === "string"
  })
}
