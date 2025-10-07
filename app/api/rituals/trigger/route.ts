// app/api/rituals/trigger/route.ts
// Server-side proxy to invoke a ritual's n8n webhook to avoid browser CORS issues.
// POST { ritualId, action?, context?, tone? }

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { uid } from "@/lib/id";

async function ensureRitualsTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS rituals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    webhook TEXT NOT NULL DEFAULT '',
    trigger_cfg JSONB NOT NULL,
    buttons JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ritualId = String(body?.ritualId || "").trim();
    const action = body?.action as string | undefined;
    const context = body?.context as unknown;
    const tone = body?.tone as string | undefined;
    const clientSessionId = body?.sessionId as string | undefined;

    if (!ritualId) {
      return NextResponse.json({ ok: false, error: "ritualId required" }, { status: 400 });
    }

    // Special-case: 'winddown' ritual (Evening Winddown)
    if (ritualId === "winddown") {
      // DB helpers
      const sql = getDb();
      await sql`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        ritual_id TEXT,
        buttons JSONB,
        metadata JSONB,
        timestamp_ms BIGINT NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS winddown_sessions (
        id TEXT PRIMARY KEY,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS winddown_answers (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES winddown_sessions(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;

      // No action -> return intro ritual with Start + Mind buttons
      if (!action) {
        const base = Date.now();
        const intro = {
          id: uid("m"),
          role: "ritual" as const,
          text: "It's time to start your windown. Shut down blue lights, and take sleeping supplements.",
          buttons: ["Start winddown", "I have something on my mind"],
          ritualId: "winddown",
          metadata: { demo: "winddownIntro" },
          timestamp: base,
        };
        await sql`INSERT INTO messages (id, role, text, ritual_id, buttons, metadata, timestamp_ms)
                   VALUES (${intro.id}, ${intro.role}, ${intro.text}, ${intro.ritualId}, ${JSON.stringify(intro.buttons)}::jsonb, ${JSON.stringify(intro.metadata)}::jsonb, ${intro.timestamp})`;
        await sql`DELETE FROM messages WHERE id IN (
          SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
        )`;
        return NextResponse.json({ ok: true, messages: [intro] });
      }

      if (action === "Start winddown") {
        const startedTs = Date.now();
        // Use client-provided session ID if available, otherwise generate new one
        const sessionId = clientSessionId || uid("wd");
        await sql`INSERT INTO winddown_sessions (id, started_at)
                  VALUES (${sessionId}, to_timestamp(${Math.floor(startedTs/1000)}))`;
        // Build confirmation + first question (chain through metadata.next)
        const confirm = { id: uid("m"), role: "assistant" as const, text: `Winddown started at ${new Date(startedTs).toLocaleTimeString()}.`, timestamp: startedTs };
        const q1 = {
          id: uid("m"),
          role: "assistant" as const,
          text: "",
          metadata: {
            demo: "questionSave",
            prompt: "What went well today?",
            saveTo: "/api/winddown/answer",
            sessionId,
            question: "what_went_well",
            next: {
              type: "questionSave",
              prompt: "What felt unstable/impulsive?",
              saveTo: "/api/winddown/answer",
              sessionId,
              question: "unstable_or_impulsive",
              next: {
                type: "questionSave",
                prompt: "What's one thing you have learned?",
                saveTo: "/api/winddown/answer",
                sessionId,
                question: "one_thing_learned",
                next: { type: "goodnight" }
              }
            }
          },
          timestamp: startedTs + 1,
        };
        // Persist messages
        await sql`INSERT INTO messages (id, role, text, timestamp_ms) VALUES (${confirm.id}, ${confirm.role}, ${confirm.text}, ${confirm.timestamp})`;
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${q1.id}, ${q1.role}, ${q1.text}, ${JSON.stringify(q1.metadata)}::jsonb, ${q1.timestamp})`;
        await sql`DELETE FROM messages WHERE id IN (
          SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
        )`;
        return NextResponse.json({ ok: true, messages: [confirm, q1] });
      }

      if (action === "I have something on my mind") {
        const ts = Date.now();
        const q = {
          id: uid("m"),
          role: "assistant" as const,
          text: "",
          metadata: {
            demo: "questionSave",
            prompt: "What's on your mind that will prevent you from sleeping?",
            saveTo: "/api/winddown/thoughts",
            next: { type: "winddownIntro" }
          },
          timestamp: ts,
        };
        const sql = getDb();
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${q.id}, ${q.role}, ${q.text}, ${JSON.stringify(q.metadata)}::jsonb, ${q.timestamp})`;
        await sql`DELETE FROM messages WHERE id IN (
          SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
        )`;
        return NextResponse.json({ ok: true, messages: [q] });
      }

      // Unknown action
      return NextResponse.json({ ok: true, text: `Action '${action}' received (winddown).` });
    }

    // Special-case: hardcoded Morning ritual handled internally
    if (ritualId === "morning") {
      // Forward to local /api/morning with same payload
      const res = await fetch(new URL("/api/morning", process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ritualId, action, context, tone, ts: Date.now() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json({ ok: false, status: res.status, error: data?.error || "internal morning error" }, { status: 502 });
      }
      return NextResponse.json({ ok: true, ...data });
    }

    // Special-case: WakeUp v1 ritual -> generate wake up card, then show urgents & today's tasks, then ask sleep hours
    if (ritualId === "wakeup_v1") {
      try {
        const sql = getDb();
        // Ensure messages table exists
        await sql`CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          text TEXT NOT NULL,
          ritual_id TEXT,
          buttons JSONB,
          metadata JSONB,
          timestamp_ms BIGINT NOT NULL
        )`;

        // Build GPT prompt to get a short heartwarming welcome + an epic sci-fi/fantasy style quote
        const nonce = uid("wake");
        const nowISO = new Date().toISOString();
        // Random style directive to push variety across runs
        const styles = [
          "high fantasy dawn (mythic, luminous, noble)",
          "space opera sunrise (vast cosmos, hopeful, triumphant)",
          "solarpunk morning (renewal, nature, gentle tech)",
          "cyberpunk daybreak (resilience, neon-fading, determined)",
          "mythic sci‑fi prologue (hero’s awakening, starlit horizon)",
        ];
        const style = styles[Math.floor(Math.random() * styles.length)];
        const prompt = [
          "You are the WakeUp ritual narrator.",
          "Return STRICT JSON ONLY with: { welcome: string, quote: string }.",
          "Guidelines:",
          "- 'welcome' is a short, heartwarming message (1–2 sentences) as if greeting a hero at dawn.",
          "- 'quote' is a short, powerful sci‑fi/fantasy style line about how epic life is/can be.",
          "- Keep both uplifting and succinct.",
          "- Make it fresh and varied; avoid repeating phrasing you have used before.",
          `- Style: ${style}.`,
          `- Context nonce: ${nonce}; current_time: ${nowISO}. Use this to diversify output.`,
        ].join("\n");

        async function callModelForWake() {
          const apiUrl = process.env.GPT5_NANO_URL || process.env.NEXT_PUBLIC_GPT5_NANO_URL;
          const apiKey = process.env.GPT5_NANO_KEY || process.env.NEXT_PUBLIC_GPT5_NANO_KEY;
          if (!apiUrl || !apiKey) return null;
          try {
            const isOpenAI = /api\.openai\.com/.test(apiUrl);
            const modelEnv = process.env.GPT5_NANO_MODEL || process.env.NEXT_PUBLIC_GPT5_NANO_MODEL;
            const model = modelEnv || (isOpenAI ? "gpt-4o-mini" : "gpt-5-nano");
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model,
                messages: [
                  { role: "system", content: prompt },
                  { role: "user", content: `Return JSON now. Request: ${nonce} at ${nowISO}` },
                ],
                temperature: 0.9,
                top_p: 0.9,
                presence_penalty: 0.7,
                frequency_penalty: 0.5,
                max_tokens: 180,
              }),
            });
            const data = await res.json().catch(() => ({} as any));
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            const text =
              data?.choices?.[0]?.message?.content ||
              data?.output ||
              data?.text ||
              '';
            try {
              return text ? JSON.parse(String(text)) : null;
            } catch {
              return null;
            }
          } catch {
            return null;
          }
        }

        // Randomized local fallbacks to avoid repetition if API is unavailable or fails to parse
        const fallbackWelcomes = [
          "Good morning, brave soul. New light, new chances.",
          "Morning, adventurer—today’s chapter is yours to write.",
          "Rise and greet the day—your path brightens ahead.",
          "Welcome back to the realm of doing—let’s make it count.",
          "Dawn salutes you—courage and clarity at your side.",
        ];
        const fallbackQuotes = [
          "In the tapestry of existence, each thread hums with becoming.",
          "The cosmos tilts toward those who dare to begin.",
          "Every sunrise is a portal; step through with intent.",
          "From stardust to stride—today, you are the spark.",
          "On the edge of dawn, possibility unsheathes its light.",
        ];
        const generated = await callModelForWake();
        const welcome: string = (generated?.welcome && typeof generated.welcome === 'string')
          ? generated.welcome.trim()
          : fallbackWelcomes[Math.floor(Math.random() * fallbackWelcomes.length)];
        const quote: string = (generated?.quote && typeof generated.quote === 'string')
          ? generated.quote.trim()
          : fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];

        const base = Date.now();
        const wakeCard = {
          id: uid("m"),
          role: "assistant" as const,
          text: "",
          metadata: {
            demo: "wakeupCard",
            welcome,
            quest: "A new quest begins.",
            quote,
          },
          timestamp: base,
        };
        const urgents = { id: uid("m"), role: "assistant" as const, text: "", metadata: { demo: "urgentGrid" }, timestamp: base + 1 };
        const today = { id: uid("m"), role: "assistant" as const, text: "", metadata: { demo: "todayList" }, timestamp: base + 2 };
        const askSleep = {
          id: uid("m"),
          role: "assistant" as const,
          text: "",
          metadata: {
            demo: "questionSave",
            prompt: "How many hours did you sleep?",
            saveTo: "/api/sleep/hours",
          },
          timestamp: base + 3,
        };

        // Persist
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${wakeCard.id}, ${wakeCard.role}, ${wakeCard.text}, ${JSON.stringify(wakeCard.metadata)}::jsonb, ${wakeCard.timestamp})`;
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${urgents.id}, ${urgents.role}, ${urgents.text}, ${JSON.stringify(urgents.metadata)}::jsonb, ${urgents.timestamp})`;
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${today.id}, ${today.role}, ${today.text}, ${JSON.stringify(today.metadata)}::jsonb, ${today.timestamp})`;
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${askSleep.id}, ${askSleep.role}, ${askSleep.text}, ${JSON.stringify(askSleep.metadata)}::jsonb, ${askSleep.timestamp})`;
        await sql`DELETE FROM messages WHERE id IN (
          SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
        )`;

        return NextResponse.json({ ok: true, messages: [wakeCard, urgents, today, askSleep] });
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "wakeup_v1 error" }, { status: 500 });
      }
    }

    // Special-case: Impulse Control v1 ritual -> ask for current impulse and route answer to GPT-5 Nano
    if (ritualId === "impulse_control_v1") {
      try {
        const sql = getDb();
        // Ensure messages table exists
        await sql`CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          text TEXT NOT NULL,
          ritual_id TEXT,
          buttons JSONB,
          metadata JSONB,
          timestamp_ms BIGINT NOT NULL
        )`;
        const base = Date.now();
        const q = {
          id: uid("m"),
          role: "assistant" as const,
          text: "",
          metadata: {
            demo: "questionSave",
            prompt: "What is your current impulse?",
            saveTo: "/api/impulse/answer",
          },
          timestamp: base,
        };
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms)
                  VALUES (${q.id}, ${q.role}, ${q.text}, ${JSON.stringify(q.metadata)}::jsonb, ${q.timestamp})`;
        await sql`DELETE FROM messages WHERE id IN (
          SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
        )`;
        return NextResponse.json({ ok: true, messages: [q] });
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "impulse_control_v1 error" }, { status: 500 });
      }
    }

    // Special-case: 'plans' ritual -> inject two assistant cards and persist to DB
    if (ritualId === "plans") {
      try {
        const sql = getDb();
        await ensureRitualsTable();
        // Build two assistant messages rendered by client using metadata
        const base = Date.now();
        const intro = { id: uid("m"), role: "assistant", text: "Mortal.. here are your urgents and tasks for today.", timestamp: base };
        const m1 = { id: uid("m"), role: "assistant", text: "", metadata: { demo: "urgentGrid" }, timestamp: base + 1 };
        const m2 = { id: uid("m"), role: "assistant", text: "", metadata: { demo: "todayList" }, timestamp: base + 2 };
        await sql`CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          text TEXT NOT NULL,
          ritual_id TEXT,
          buttons JSONB,
          metadata JSONB,
          timestamp_ms BIGINT NOT NULL
        )`;
        // Persist both
        await sql`INSERT INTO messages (id, role, text, timestamp_ms) VALUES (${intro.id}, ${intro.role}, ${intro.text}, ${intro.timestamp})`;
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${m1.id}, ${m1.role}, ${m1.text}, ${JSON.stringify(m1.metadata)}::jsonb, ${m1.timestamp})`;
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${m2.id}, ${m2.role}, ${m2.text}, ${JSON.stringify(m2.metadata)}::jsonb, ${m2.timestamp})`;
        await sql`DELETE FROM messages WHERE id IN (
          SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
        )`;
        return NextResponse.json({ ok: true, messages: [intro, m1, m2] });
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "plans error" }, { status: 500 });
      }
    }

    // Special-case: 'chillout' ritual -> inject audio player with random segment
    if (ritualId === "chillout") {
      try {
        const sql = getDb();
        await sql`CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          text TEXT NOT NULL,
          ritual_id TEXT,
          buttons JSONB,
          metadata JSONB,
          timestamp_ms BIGINT NOT NULL
        )`;
        const base = Date.now();
        // Generate random start time (0-120 seconds for variety)
        const randomStart = Math.floor(Math.random() * 120);
        const intro = { 
          id: uid("m"), 
          role: "assistant" as const, 
          text: "Time to chill out. Take a deep breath and let the music calm your mind.", 
          timestamp: base 
        };
        const audioPlayer = { 
          id: uid("m"), 
          role: "assistant" as const, 
          text: "", 
          metadata: { 
            demo: "audioPlayer", 
            audioSrc: "/music/chill1.mp3",
            startTime: randomStart
          }, 
          timestamp: base + 1 
        };
        // Persist both
        await sql`INSERT INTO messages (id, role, text, timestamp_ms) VALUES (${intro.id}, ${intro.role}, ${intro.text}, ${intro.timestamp})`;
        await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms) VALUES (${audioPlayer.id}, ${audioPlayer.role}, ${audioPlayer.text}, ${JSON.stringify(audioPlayer.metadata)}::jsonb, ${audioPlayer.timestamp})`;
        await sql`DELETE FROM messages WHERE id IN (
          SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
        )`;
        return NextResponse.json({ ok: true, messages: [intro, audioPlayer] });
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "chillout error" }, { status: 500 });
      }
    }

    // Resolve webhook/buttons from DB if possible; else fall back to request body
    let webhook: string | undefined = undefined;
    let buttons: string[] | undefined = undefined;
    try {
      await ensureRitualsTable();
      const sql = getDb();
      const rows = await sql`SELECT id, name, webhook, buttons FROM rituals WHERE id = ${ritualId} LIMIT 1`;
      const rit = rows[0];
      if (rit) {
        webhook = rit.webhook || undefined;
        buttons = Array.isArray(rit.buttons) ? rit.buttons : undefined;
      }
    } catch {
      // DB not configured; proceed with client-provided fields
    }

    // Allow client to provide webhook/buttons when DB is not available or ritual not found
    if (!webhook && typeof body?.webhook === "string") webhook = body.webhook;
    if (!buttons && Array.isArray(body?.buttons)) buttons = body.buttons as string[];

    if (!webhook) {
      // No webhook configured -> return a local mock so UX still works
      const text = action
        ? `Action '${action}' received for ritual '${ritualId}' (mock).`
        : `Started ritual '${ritualId}' (mock).`;
      return NextResponse.json({ ok: true, text, buttons: buttons ?? [] });
    }

    // Invoke webhook from the server to avoid browser CORS
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ritualId, action, context, tone, ts: Date.now() }),
    });

    // Forward status and JSON content
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: data?.error || "webhook error" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
