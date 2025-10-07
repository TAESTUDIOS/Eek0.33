Vision

  <details>
  <summary><strong>Urgents TODOs & Today’s Tasks</strong></summary>
  
  ### Urgents TODOs
  - [ ] Add your top 1–3 urgent items here
  - [ ] ...
  
  ### Today's Tasks
  - [ ] Key task 1
  - [ ] Key task 2
  - [ ] Key task 3

</details>

A single-user Personal Stability Assistant (Next.js on Vercel) that uses GPT-5 (via Windsurf flows) + n8n workflows + Pushcut to (1) deliver AI-driven rituals at scheduled times or on chat triggers, (2) surface those rituals inside the chat as interactive dialogues (with buttons and free-text replies), and (3) keep only the last 100 ephemeral messages unless the user saves a message to the Saved page.
Key goals & constraints

Single-user & secure (simple login + encrypted secrets).

Ephemeral chat memory: only last 100 messages kept in active memory/KV.

Rituals live in chat + push notifications.

n8n calls GPT-5 to generate ritual content; n8n drives Pushcut and logging.

Frontend built in Windsurf with GPT-5 guidance â€” clean, modular code, each file <= 500 LOC.

High-level architecture

Frontend (Next.js app on Vercel)

Pages: /chat, /schedule, /saved, /settings.

Chat UI shows AI messages; ritual messages include buttons (Done, Snooze, Skip or custom).

Schedule page maintains ritual configs (name, webhook URL, trigger type, schedule).

Saves message â†’ calls API to persist.

Backend (Next.js API routes or serverless functions)

Manages ritual configs, saved messages, and acts as a secure relay for chat â†’ webhook invocations if chat triggers are used.

Persists saved messages if enabled (e.g., Supabase, Notion via n8n, or Vercel KV).

n8n

Each ritual has a dedicated workflow with its webhook.

n8n workflow: receive webhook â†’ (optional) fetch rules.md â†’ call GPT-5 with system prompt + contextual data â†’ send Pushcut notification â†’ return payload to frontend (so result appears inside chat) â†’ log/save if needed.

Pushcut (iOS)

Receives formatted messages from n8n for local/interactive iOS notifications.

KV store (Vercel KV / Redis)

Stores ephemeral last 100 messages only. Saved messages persist elsewhere.

Main user flows
1) Ritual scheduled flow

Time triggers n8n scheduler â†’ calls ritual webhook.

n8n calls GPT-5 (system rules included) â†’ generates ritual instructions + optional buttons.

n8n sends Pushcut notification.

n8n POSTs the ritual message back to the appâ€™s /api/inject-ritual endpoint (so the ritual appears in chat).

Chat shows ritual; user presses a button or replies text.

Action triggers the ritual-specific n8n workflow (action payload sent to the ritual webhook).

n8n handles the action (log, reschedule snooze, follow-up message via GPT-5) and optionally updates saved logs.

2) Chat-trigger flow

User types a trigger command (e.g., /check or uses chat UI to request a ritual).

Frontend calls the ritualâ€™s webhook (or backend calls it). n8n runs the workflow as above and returns content to be injected into chat.

3) General chat fallback

If the chat input does not match any ritual trigger, frontend calls the fallback n8n webhook.

Fallback n8n workflow calls GPT-5 with fallback system prompt (including rules.md context) and returns response to chat.

Data model (recommended)

RitualConfig

{
  "id": "string",
  "name": "string",
  "webhook": "https://n8n/.../webhook/<id>",
  "trigger": { "type":"schedule"|"chat", "time":"08:00", "repeat":"daily"|"weekly"|... , "chatKeyword":"/check" },
  "buttons": ["Done","Snooze","Skip"],
  "active": true
}


Message (ephemeral): { id, role: 'user'|'assistant'|'system'|'ritual', text, timestamp, ritualId? }

SavedMessage (persistent): { id, text, createdAt, tags? }

Security & privacy

Enforce strong auth for single user (Clerk, NextAuth with a single account, or password-protected).

Store secrets (GPT-5 key, n8n webhook credentials) in Vercel environment variables â€” not in code.

Encrypt any persisted journaling/saved messages at rest if storing locally.

Limit data sent to GPT-5: only include required context (avoid sending full chat history except last N messages if needed).

Rate-limit webhook calls and validate incoming webhook signatures from n8n.

Observability & debugging

Keep logs for each ritual execution in n8n (success/failure, GPT-5 token usage).

Frontend shows last-run status for each ritual in the Schedule page.

Provide a simple debugging UI in Settings to test webhook & view last 10 logs.

Minimum viable feature set (MVP)

Chat with GPT-5 fallback via n8n.

Schedule page to add/edit rituals with webhook + schedule + buttons.

Each ritual appears in chat and as a Pushcut notification (through n8n).

Buttons in chat that call ritual webhook with { action }.

Ephemeral storage of last 100 messages; Saved messages page for persisting selected items.

Simple settings for tone selection and clearing history.

Future enhancements (post-MVP)

Analytics: streaks, completion %, habit graphs.

Smart timing: let GPT-5 suggest ideal ritual times based on usage patterns.

More interactive Pushcut actions and deep linking into specific chat threads.

Multi-device sync (if you later want multi-user support).