// app/api/fallback/route.ts
// Server-side proxy for fallback chat requests to avoid CORS from the browser.
// It accepts a JSON body: { text: string, lastMessages?: any[], tone?: string, url?: string }
// If url is omitted, it uses process.env.NEXT_PUBLIC_FALLBACK_WEBHOOK.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const text: string = body?.text ?? "";
    const lastMessages = Array.isArray(body?.lastMessages) ? body.lastMessages : [];
    const tone: string | undefined = body?.tone;
    const name: string | undefined = body?.name;
    const profileNotes: string | undefined = body?.profileNotes;
    const sessionId: string | undefined = body?.sessionId;
    const bodyUrl: string | undefined = body?.url;
    const envUrl: string | undefined = process.env.NEXT_PUBLIC_FALLBACK_WEBHOOK;
    const url: string | undefined = bodyUrl || envUrl;

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "No fallback webhook URL configured." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Basic validation: require HTTPS for serverless environments
    if (!/^https:\/\//i.test(url)) {
      return NextResponse.json(
        { ok: false, error: "Invalid webhook URL. Must start with https://", target: url, source: bodyUrl ? "settings" : "env" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    let res: Response;
    try {
      // Add Basic Auth if credentials are embedded in the URL
      let target = url;
      let extraHeaders: Record<string, string> = {};
      try {
        const u = new URL(url);
        if (u.username || u.password) {
          const creds = `${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`;
          const encoded = Buffer.from(creds).toString("base64");
          extraHeaders["Authorization"] = `Basic ${encoded}`;
          // strip credentials from target URL
          u.username = "";
          u.password = "";
          target = u.toString();
        }
        // If no embedded creds, try server env basic auth
        if (!extraHeaders["Authorization"]) {
          const basicUser = process.env.FALLBACK_BASIC_USER;
          const basicPass = process.env.FALLBACK_BASIC_PASS;
          if (basicUser && basicPass) {
            const encoded = Buffer.from(`${basicUser}:${basicPass}`).toString("base64");
            extraHeaders["Authorization"] = `Basic ${encoded}`;
          }
        }
      } catch {}

      res = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...extraHeaders },
        body: JSON.stringify({ text, lastMessages, tone, name, profileNotes, sessionId }),
        cache: "no-store",
      });
    } catch (fetchErr: any) {
      const message = typeof fetchErr?.message === "string" ? fetchErr.message : "network error";
      return NextResponse.json(
        { ok: false, error: `Fetch to webhook failed: ${message}`, target: url, source: bodyUrl ? "settings" : "env" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Read body once, then try to parse JSON; otherwise return raw text
    let data: any = null;
    let raw: string = "";
    try {
      raw = await res.text();
      try {
        data = JSON.parse(raw);
      } catch {
        data = { text: raw };
      }
    } catch (readErr: any) {
      data = { text: "" };
    }

    if (!res.ok) {
      const msg = data?.error || `Fallback request failed (${res.status})`;
      return NextResponse.json(
        { ok: false, error: msg, data, target: url, source: bodyUrl ? "settings" : "env" },
        { status: res.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json({ ok: true, source: bodyUrl ? "settings" : "env", target: url, ...data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "proxy error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
