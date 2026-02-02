# AI Coding Agent Instructions

## Project Overview
This is a **Next.js web application** for AI-powered single-page HTML website generation. Users describe a website via chat, AI generates clean HTML, and users can iteratively edit it with chat-based commands.

## Architecture

### Core Data Flow
1. **User Chat** (`chat-panel.tsx`) → **API Route** (`/api/generate-html/route.ts`) → **HTML Generation/Editing**
2. **HTML Editor** (`html-edit-engine.tsx`) → Operations applied to HTML string
3. **Firebase Storage** → Save projects, load projects, manage user data
4. **Style Memory** → Extract and apply visual preferences across generations

### Key Components & Responsibilities

| Component | Purpose | Critical Patterns |
|-----------|---------|-------------------|
| `app/page.tsx` (Home) | Main orchestrator | Client-side state mgmt: user auth, messages, current HTML, projects |
| `chat-panel.tsx` | User input & AI conversation | Sends to `/api/generate-html`, displays generation phases |
| `preview-panel.tsx` | Live HTML preview | Renders generated/edited HTML safely |
| `html-edit-engine.tsx` | HTML manipulation | Applies edit operations without DOM (string-based) |
| `lib/firebase-storage.ts` | Persistence layer | Projects stored under `users/{userId}/projects/{projectId}` |
| `lib/style-memory.ts` | Design consistency | Extracts style profile from HTML, generates prompts for AI |

### Critical Integrations

- **Firebase Realtime Database**: Projects stored at `users/{userId}/projects`, user profile at `users/{userId}/profile`
- **OpenRouter API**: LLM calls via `OPENROUTER_API_KEY` env var (multiple free models supported)
- **AI Intent Decomposition**: Route.ts analyzes user messages for layout, style, mood to guide generation
- **Edit Command Protocol**: AI returns JSON `{ ops: [{ op, target, value }] }` for HTML modifications

## Developer Workflows

### Local Development
```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev server at http://localhost:3000
pnpm build        # Production build
pnpm lint         # Run ESLint
```

### Key Environment Variables
- `OPENROUTER_API_KEY`: Required for AI generation via OpenRouter (free tier supported)
- Firebase config embedded in `lib/firebase.ts` (already configured)

## Project-Specific Patterns & Conventions

### 1. **HTML Editing: String-Based Operations**
   - **Never use DOM manipulation** — all edits through `html-edit-engine.tsx`
   - Operations: `replace`, `insert_before`, `insert_after`, `delete`, `set_css`
   - AI returns `EditCommandResponse` with ops array; parse and apply via `applyEdits(html, ops)`
   - **Example**: To update button text, target specific HTML string and use `replace` op

### 2. **Message Structure**
   - System role: Initializes AI personality ("expert HTML developer")
   - User role: Human input (descriptions, edit requests)
   - Assistant role: AI responses (HTML code or edit commands)
   - **Store message history** in state to maintain conversation context across sessions

### 3. **State Management (Home Component)**
   - Single source of truth: `messages[]`, `currentProjectId`, `currentHtml`
   - Use `useState` + `useCallback` for event handlers
   - Project persistence triggered by explicit "Save" button, not auto-save

### 4. **Style Extraction & Memory**
   - `extractStyleProfile()` parses font, spacing, colors, borders from existing HTML
   - `applyStyleProfile()` returns instruction string for AI to maintain visual consistency
   - Always extract style profile after HTML generation; store with project in `SavedProject.styleProfile`

### 5. **Firebase Data Structure**
   ```
   users/
     {userId}/
       profile/ → { email, displayName, createdAt, lastLogin }
       projects/
         {projectId} → SavedProject { id, name, html, messages, styleProfile, timestamps, userId }
   ```
   - Project IDs are UUIDs; use `crypto.randomUUID()` when creating new projects

### 6. **UI Components**
   - All UI uses **shadcn/ui** + **Radix** primitives (no custom component styling)
   - Icons from **lucide-react**
   - Theme provider (`theme-provider.tsx`) handles light/dark mode
   - Mobile detection via `use-mobile.ts` hook

## Common Tasks & Code Patterns

### Add a New Feature
1. If UI: Create component in `components/`, import in `app/page.tsx`
2. If API: Add route in `app/api/`, export handler as default
3. If data persistence: Update `firebase-storage.ts` with new ref path

### Modify HTML Generation Logic
- Edit `/api/generate-html/route.ts`: Adjust `decomposeIntent()`, prompt engineering, or response parsing
- **Test locally**: Send chat message, check browser console for `[v0]` debug logs and AI response

### Debug Edit Operations
- Check `html-edit-engine.tsx` for operation logic
- Validate AI response structure: `{ ops: [...] }`
- Common issue: Target string not found → ops silently skipped with console error

### Authentication Flow
- Firebase Auth managed in `lib/firebase.ts`
- On sign-in, call `saveUserData()` in `firebase-storage.ts`
- On sign-out, clear local state in Home component
- Auth state persisted in Firebase; check `app/page.tsx` `onAuthStateChanged` hook

## Important Files Reference
- **Main app logic**: [app/page.tsx](app/page.tsx)
- **API endpoint**: [app/api/generate-html/route.ts](app/api/generate-html/route.ts)
- **HTML operations**: [lib/html-edit-engine.tsx](lib/html-edit-engine.tsx)
- **Firebase config**: [lib/firebase.ts](lib/firebase.ts)
- **Project persistence**: [lib/firebase-storage.ts](lib/firebase-storage.ts)
- **Style system**: [lib/style-memory.ts](lib/style-memory.ts)

## Debugging Tips
- All logs prefixed with `[v0]` in browser console
- Firebase errors logged with context (operation + data snippet)
- API errors caught in route.ts; check OpenRouter response for rate limits or API key issues
- TypeScript strict mode enabled; avoid `any` types unless unavoidable

## Testing Considerations
- No test suite in repo; manual testing workflow
- Test new features: clear browser cache, sign in fresh, create new project
- For HTML editing: Generate baseline HTML, then test edit commands via chat

---
**Last Updated**: 2025-02-02 | Generated for v0.1.0
