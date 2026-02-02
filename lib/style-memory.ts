export interface StyleProfile {
  fontFamily?: string
  spacingDensity?: "compact" | "normal" | "relaxed"
  colorTone?: "light" | "dark" | "vibrant" | "muted"
  borderStyle?: "sharp" | "rounded" | "none"
}

export function extractStyleProfile(html: string): StyleProfile {
  const profile: StyleProfile = {}

  // Extract font family
  const fontMatch = html.match(/font-family:\s*['"]?([^;'"]+)['"]?/i)
  if (fontMatch) profile.fontFamily = fontMatch[1].split(",")[0].trim()

  // Extract spacing density
  const paddingMatches = html.match(/padding:\s*(\d+)/gi) || []
  const avgPadding =
    paddingMatches.length > 0
      ? paddingMatches.reduce((sum, p) => sum + Number.parseInt(p.match(/\d+/)?.[0] || "0"), 0) / paddingMatches.length
      : 16
  profile.spacingDensity = avgPadding < 12 ? "compact" : avgPadding > 24 ? "relaxed" : "normal"

  // Extract color tone
  const bgMatches = html.match(/background(?:-color)?:\s*#([0-9a-f]{3,6})/gi) || []
  if (bgMatches.length > 0) {
    const firstBg = bgMatches[0].match(/#([0-9a-f]{3,6})/i)?.[1] || ""
    const luminance = Number.parseInt(firstBg.slice(0, 2), 16)
    profile.colorTone = luminance < 100 ? "dark" : "light"
  }

  // Extract border style
  const hasBorderRadius = html.includes("border-radius")
  const hasSharpBorders = html.match(/border-radius:\s*0/i)
  profile.borderStyle = hasSharpBorders ? "sharp" : hasBorderRadius ? "rounded" : "none"

  return profile
}

export function applyStyleProfile(profile: StyleProfile): string {
  const hints: string[] = []

  if (profile.fontFamily) hints.push(`Continue using the ${profile.fontFamily} font family`)
  if (profile.spacingDensity) hints.push(`Maintain ${profile.spacingDensity} spacing density`)
  if (profile.colorTone) hints.push(`Keep the ${profile.colorTone} color tone`)
  if (profile.borderStyle) hints.push(`Use ${profile.borderStyle} border styling`)

  return hints.length > 0 ? `\n\nSTYLE CONSISTENCY REQUIREMENTS:\n${hints.map((h) => `- ${h}`).join("\n")}` : ""
}
