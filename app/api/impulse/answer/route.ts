// app/api/impulse/answer/route.ts
// Processes an impulse control answer by calling GPT-5 Nano (if configured) and returns
// an assistant message with short, direct guidance including consequences and alternatives.

import { NextResponse } from "next/server";
import { uid } from "@/lib/id";

function buildSystemPrompt(userImpulse: string) {
  // Ask for strict JSON so the UI can render a list section
  return [
    "You are the Impulse Control service.",
    `User's current impulse: ${userImpulse}`,
    "Respond concisely with STRICT JSON ONLY, no extra text.",
    "JSON schema:",
    '{',
    '  "reaction": string,',
    '  "consequences": string[],',
    '  "alternatives": string[]',
    '}',
    "Guidelines:",
    "- Keep 'reaction' to one short sentence.",
    "- Provide 3–5 concrete 'consequences'.",
    "- Provide 3–5 practical 'alternatives'.",
  ].join("\n");
}

async function callGpt5Nano(systemPrompt: string) {
  const apiUrl = process.env.GPT5_NANO_URL || process.env.NEXT_PUBLIC_GPT5_NANO_URL;
  const apiKey = process.env.GPT5_NANO_KEY || process.env.NEXT_PUBLIC_GPT5_NANO_KEY;
  if (!apiUrl || !apiKey) return null;
  try {
    // Choose a sensible default model. If using OpenAI, default to gpt-4o-mini unless overridden.
    const isOpenAI = /api\.openai\.com/.test(apiUrl);
    const modelEnv = process.env.GPT5_NANO_MODEL || process.env.NEXT_PUBLIC_GPT5_NANO_MODEL;
    const model = modelEnv || (isOpenAI ? "gpt-4o-mini" : "gpt-5-nano");
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          // Some providers (and stricter policies) prefer at least one user turn.
          { role: "user", content: "Respond concisely per the system instructions." },
        ],
        temperature: 0.2,
        max_tokens: 220,
      }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    // Try common response shapes
    const text =
      data?.choices?.[0]?.message?.content ||
      data?.output ||
      data?.text ||
      "Consider the potential downsides and choose a healthier alternative.";
    return String(text);
  } catch {
    return null;
  }
}

function mockAdvice(impulse: string) {
  // Provide a concise mock response if API is not configured/unavailable
  const trimmed = impulse.trim() || "(unspecified)";
  return [
    `Impulse noted: ${trimmed}.`,
    "Possible consequences:",
    "- Regret or loss of time/focus",
    "- Financial/health downside",
    "- Derailing current goals",
    "Better alternatives:",
    "- Pause 2 minutes; breathe and re-evaluate",
    "- Do one tiny productive task (2–5 min)",
    "- Replace with a healthy micro-reward (tea, short walk)",
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    // Incoming payload from ChatWindow questionSave: { id, text, createdAt }
    const userText: string | undefined = body?.text ?? body?.answer;
    if (!userText) {
      return NextResponse.json({ ok: false, error: "text required" }, { status: 400 });
    }

    const system = buildSystemPrompt(userText);
    const apiText = await callGpt5Nano(system);
    // Try to parse JSON response from model
    const raw = apiText ?? "";
    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {}

    if (parsed && (Array.isArray(parsed.consequences) || Array.isArray(parsed.alternatives))) {
      const sections: Array<{ header?: string; items: string[] }> = [];
      if (parsed.reaction && typeof parsed.reaction === 'string' && parsed.reaction.trim()) {
        sections.push({ header: 'Reaction', items: [String(parsed.reaction).trim()] });
      }
      const cons = Array.isArray(parsed.consequences) ? parsed.consequences.filter((x: any) => typeof x === 'string' && x.trim()).map((s: string) => s.trim()) : [];
      if (cons.length > 0) sections.push({ header: 'Consequences', items: cons });
      const alts = Array.isArray(parsed.alternatives) ? parsed.alternatives.filter((x: any) => typeof x === 'string' && x.trim()).map((s: string) => s.trim()) : [];
      if (alts.length > 0) sections.push({ header: 'Better alternatives', items: alts });

      const msg = {
        id: uid("m"),
        role: "assistant" as const,
        text: "",
        metadata: { demo: 'listSection', title: 'Impulse Control', sections, currentImpulse: userText },
        timestamp: Date.now(),
      };
      return NextResponse.json({ ok: true, message: msg });
    }

    // Fallback: build a structured listSection card from mock advice so UI renders consistently on mobile
    const fallback = mockAdvice(userText);
    const lines = String(fallback).split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const sections: Array<{ header?: string; items: string[] }> = [];
    let current: { header?: string; items: string[] } | null = null;
    for (const line of lines) {
      const isHeader = /^(possible consequences:|better alternatives:|impulse noted:|reaction:)/i.test(line);
      if (isHeader) {
        if (current && current.items.length > 0) sections.push(current);
        const hdr = line.replace(/:$/,'').trim();
        // Normalize header casing
        const title = /consequences/i.test(hdr) ? 'Consequences' : /alternatives/i.test(hdr) ? 'Better alternatives' : /reaction|impulse noted/i.test(hdr) ? 'Reaction' : hdr;
        current = { header: title, items: [] };
      } else if (/^[-•]/.test(line)) {
        const item = line.replace(/^[-•]\s*/, '').trim();
        if (current) current.items.push(item);
      } else {
        // treat as a one-line reaction if header not yet started
        if (!current) current = { header: 'Reaction', items: [] };
        current.items.push(line);
      }
    }
    if (current && current.items.length > 0) sections.push(current);
    const msg = {
      id: uid("m"),
      role: "assistant" as const,
      text: "",
      metadata: { demo: 'listSection', title: 'Impulse Control', sections, currentImpulse: userText },
      timestamp: Date.now(),
    };
    return NextResponse.json({ ok: true, message: msg });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
