# rules.md â€” Personal Stability Assistant (Windsurf / GPT-5)

<details>
<summary><strong>Urgents TODOs & Today’s Tasks</strong></summary>

### Urgents TODOs
- [ ] Add your top 13 urgent items here
- [ ] 

### Today's Tasks
- [ ] Key task 1
- [ ] Key task 2
- [ ] Key task 3

</details>
## Purpose
This file defines the coding, UI, and behavioral rules that Windsurf / GPT-5 must follow when generating code and UI for the Personal Stability Assistant.

---

## Core constraints
1. **Single-user & secure**:
   - App built for one user; must require auth before revealing any content.
   - Secrets (API keys, webhooks) must be read from environment variables only.

2. **Message retention**:
   - **Only the last 100 messages** are stored in ephemeral memory (Vercel KV / in-memory store).
   - Older messages are **deleted** unless the user explicitly "saves" them to the Saved Messages storage.

3. **File & function size limits**:
   - **Max 500 LOC per file**. If a generated file would exceed 500 LOC, split into components/modules.
   - Each React component should be < 100 LOC where feasible.

4. **Separation of concerns**:
   - UI components go in `/components`.
   - Business logic and API helpers in `/lib`.
   - Pages in `/app` using the App Router.

5. **Rituals management**:
   - Rituals are defined at runtime by the user (via Schedule page) and reference **one n8n webhook per ritual**.
   - Each ritual config must contain: `id`, `name`, `webhook`, `trigger.type`, optional `buttons`.

6. **Chat behavior**:
   - Rituals appear as **special assistant messages** with a ritual badge/icon and action buttons.
   - Buttons produce `POST` requests to the ritual webhook with `{ ritualId, action, userId, timestamp }`.

7. **Fallback logic**:
   - If a chat message does not match a ritual chat trigger, send it to the **fallback n8n webhook**, which calls GPT-5 with the rules context.

8. **Tone handling**:
   - The app supports tone presets (Gentle, Strict, Playful, Neutral). The selected tone must be sent as `tone` in prompts to n8n/GPT-5.

9. **Testing & dev**:
   - All pages must have a development mode mock for n8n webhooks (so UI can be tested without live n8n).
   - Validate webhooks locally before integration.

10. **UI & accessibility**:
    - Use Tailwind CSS for consistent styling.
    - Ensure buttons and interactive elements are reachable and ARIA-labeled.
    - Mobile-first responsive design.

---

## API / endpoint rules
- `/api/messages`:
  - GET returns last 100 messages.
  - POST appends a message and rotates out oldest messages beyond 100.
- `/api/rituals`:
  - CRUD for rituals. All changes validated before acceptance.
- `/api/save`:
  - Persisted save of a message; saved items are not deleted by ephemeral rotation.

---

## Code generation style
- Prefer functional React components, hooks, and small reusable primitives.
- Use TypeScript with strict types.
- Include short inline comments for non-trivial logic (2â€“3 lines).
- Do not generate secrets in code â€” use `process.env.*`.

---

## Prompting policy for GPT-5 (frontend code generation)
- Always include a brief comment block at top of generated files summarizing purpose and LOC count.
- When asked to scaffold a page/component, create:
  1. The UI component file in `/components`.
  2. Any helper in `/lib`.
  3. The page file in `/app`.
- Avoid generating backend or n8n flows unless explicitly requested.

---

## Failure & edge-handling
- If a ritual webhook fails, n8n should notify the backend; the backend should display an error in the Schedule page. Do not crash the UI.
- If the GPT-5 call times out, n8n will return a friendly retry message; the frontend will show a loading state.

---

## Governance
- Any modification to rules.md must be versioned (e.g., `rules.md v1.0`) and the change logged in Settings -> Rules History.
