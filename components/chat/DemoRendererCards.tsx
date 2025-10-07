"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import RitualButtons from "@/components/RitualButtons";
import { getEmotionDescriptor } from "@/lib/emotions";
import waveHand from "@/images/emojis/hands/wavehandright.png";
import sleepyEmoji from "@/images/emojis/sleepy.png";
import happyEmoji from "@/images/emojis/happy.png";
import thumbsupHand from "@/images/emojis/hands/thumbsup.png";

// Renders visual/demo card content that does not require complex interactive state
// Props kept loose to minimize coupling; context carries required callbacks/state
export default function DemoRendererCards({ m, context }: { m: any; context: any }) {
  const meta = (m?.metadata as any) || {};
  if (!meta.demo) return null;

  if (meta.demo === "wakeupCard") {
    const welcome: string = String(meta.welcome || "Morning spark.");
    const quest: string = String(meta.quest || "Set one clear move for today.");
    const quote: string = String(meta.quote || "Breathe in and take the first step.");
    const joy = getEmotionDescriptor("joyful");
    return (
      <section aria-label="Wake up" className="rounded-xl overflow-hidden shadow-elevated">
        <div className="relative p-5 bg-gradient-to-b from-[#0d2f4d] via-[#123a60] to-[#0b2237] text-white space-y-4">
          {joy ? (
            <div className="flex justify-center">
              <div className="relative h-24 w-24 chuckle-motion">
                <Image src={joy.image} alt="Joyful Surge emoji" fill sizes="96px" className="object-contain drop-shadow-lg" priority={false} />
                <div className="absolute bottom-[-4px] left-[-10px] h-12 w-12 wave-motion">
                  <Image src={waveHand} alt="Waving hand" fill sizes="48px" className="object-contain drop-shadow-lg" priority={false} />
                </div>
              </div>
            </div>
          ) : null}
          <div className="text-center space-y-2">
            <div className="text-white font-semibold text-lg">{welcome}</div>
            <div className="text-white/85 text-sm">{quest}</div>
            <div className="mt-2 text-[13px] text-yellow-200/90 italic">“{quote}”</div>
          </div>
        </div>
      </section>
    );
  }

  if (meta.demo === "listSection") {
    const title: string = String(meta.title || "List");
    const sections: Array<{ header?: string; items: string[] }> = Array.isArray(meta.sections) ? meta.sections : [];
    const totalItems = sections.reduce((acc, s) => acc + (Array.isArray(s.items) ? s.items.length : 0), 0);
    const impulse: string | undefined = typeof meta.currentImpulse === "string" && meta.currentImpulse.trim() ? meta.currentImpulse.trim() : undefined;
    const { addMessage } = context;
    return (
      <section aria-label={title} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
        <header className="px-3 py-2 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-[var(--fg)]/60">{totalItems} items</div>
          </div>
          {impulse ? (
            <div className="mt-1 text-xs text-[var(--fg)]/70">
              <span className="text-[var(--accent)]/90">Impulse:</span> {impulse}
            </div>
          ) : null}
        </header>
        <div className="divide-y divide-[var(--border)]">
          {sections.map((sec, sIdx) => {
            const hdr = (sec.header || "").toString();
            const up = hdr.toUpperCase();
            const isOrange = up === "CONSEQUENCES" || up === "BETTER ALTERNATIVES";
            return (
              <div key={sIdx}>
                {sec.header ? (
                  <div
                    className={
                      "px-3 py-1.5 text-[11px] uppercase tracking-wide bg-[var(--surface-2)]/30 " +
                      (isOrange ? "text-amber-300" : "text-[var(--fg)]/60")
                    }
                  >
                    {up}
                  </div>
                ) : null}
                <ul className="divide-y divide-[var(--border)]">
                  {(sec.items || []).map((line: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 px-3 py-2">
                      <span className="inline-flex h-3.5 w-3.5 rounded-sm bg-gray-500/30 mt-0.5" />
                      <span className="text-sm text-[var(--fg)]">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="px-3 py-2">
            <button
              type="button"
              className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 text-sm"
              onClick={async () => {
                const started = Date.now();
                const metaTimer: any = {
                  demo: "countdown",
                  seconds: 300,
                  startedAt: started,
                  label: "5-minute evaluation",
                  next: { type: "webhookPost", payload: { text: "How do you feel about your impulse now?" } },
                };
                const idTimer = `m_${started}_eval5`;
                context.addMessage({ id: idTimer, role: "assistant", text: "", metadata: metaTimer, timestamp: started });
                try {
                  await fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: idTimer, role: "assistant", text: "", metadata: metaTimer, timestamp: started, echo: false }),
                  });
                } catch {}
              }}
            >
              I need to evaluate.
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (meta.demo === "enjoyDayCard") {
    return (
      <section aria-label="Enjoy your day" className="rounded-xl overflow-hidden shadow-elevated">
        <div className="relative p-5 bg-gradient-to-b from-[#0d2f4d] via-[#123a60] to-[#0b2237] text-white space-y-4">
          <div className="flex justify-center">
            <div className="relative h-24 w-24 chuckle-motion">
              <Image src={happyEmoji as any} alt="Happy emoji" fill sizes="96px" className="object-contain drop-shadow-lg" />
              <div className="absolute bottom-[-4px] right-[-10px] h-12 w-12 wave-motion">
                <Image src={thumbsupHand} alt="Thumbs up" fill sizes="48px" className="object-contain drop-shadow-lg" />
              </div>
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-white font-semibold text-lg">Enjoy your day!</div>
            <div className="text-white/85 text-sm">I’ll be here when you need me.</div>
          </div>
        </div>
      </section>
    );
  }

  if (meta.demo === "urgentGrid") {
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const items = (context.urgentTodos || [])
      .slice()
      .filter((t: any) => !t.done)
      .sort((a: any, b: any) => (a.done === b.done ? 0 : a.done ? 1 : -1) || (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9))
      .map((t: any) => ({ title: t.title, priority: t.priority }));
    const chip = (p: string) => {
      const base = "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] leading-4 font-medium";
      const map: Record<string, string> = {
        high: "bg-red-500/20 text-red-300 border border-red-500/30",
        medium: "bg-amber-500/20 text-amber-200 border border-amber-500/30",
        low: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30",
      };
      return <span className={`${base} ${map[p] || "bg-gray-500/20 text-gray-200 border border-gray-500/30"}`}>{p}</span>;
    };
    return (
      <section aria-label="Urgent todos" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
        <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[var(--accent)]/20 text-[var(--accent)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.6c.75 1.335-.223 3.001-1.742 3.001H3.48c-1.52 0-2.492-1.666-1.742-3.002l6.519-11.6zM10 13.5a1 1 0 100 2 1 1 0 000-2zm1-6.5a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd"/></svg>
            </span>
            <div className="text-sm font-medium">Urgent Todos</div>
          </div>
          <div className="text-xs text-[var(--fg)]/60 flex items-center gap-3">
            <span>{items.length} items</span>
            <Link href="/urgent" className="underline text-[var(--fg)]/70 hover:text-[var(--fg)]">Open</Link>
          </div>
        </header>
        <div className="grid grid-cols-[1fr_auto] bg-[var(--surface-2)]/30 text-[11px] uppercase tracking-wide text-[var(--fg)]/60">
          <div className="px-3 py-2">Name</div>
          <div className="px-3 py-2">Priority</div>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {items.map((it: any, idx: number) => (
            <li key={idx} className="grid grid-cols-[1fr_auto] items-center">
              <div className={"px-3 py-2 truncate " + (it.priority === "high" ? "text-red-400" : "text-[var(--accent)]")}>
                {it.title}
              </div>
              <div className="px-3 py-2">{chip(it.priority)}</div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (meta.demo === "winddownIntro") {
    const { setMessages, messages } = context;
    return (
      <section aria-label="Winddown Intro" className="rounded-xl overflow-hidden shadow-elevated">
        <div className="relative p-4 md:p-5 bg-gradient-to-b from-[#3a1010] via-[#2b0b0b] to-[#1c0606]">
          <div className="flex items-start gap-3">
            <div className="shrink-0 text-red-200">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 10.586V8a6 6 0 00-6-6z"></path>
                <path d="M9 16a3 3 0 006 0H9z"></path>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold">It's time to start your windown.</div>
              <div className="text-white/85 text-sm">Shut down blue lights, and take sleeping supplements.</div>
            </div>
          </div>
          {m.buttons && m.buttons.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <RitualButtons
                ritualId={m.ritualId}
                buttons={m.buttons}
                onActionStart={() => {
                  context.setMessages(context.messages.map((mm: any) => (mm.id === m.id ? { ...mm, buttons: [] } : mm)));
                }}
              />
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (meta.demo === "goodnightCard") {
    return (
      <section aria-label="Good night" className="rounded-xl overflow-hidden shadow-elevated">
        <div className="relative p-5 bg-gradient-to-b from-[#0d1d3a] via-[#0b1730] to-[#071022] text-white space-y-4">
          <div className="flex justify-center">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 chuckle-motion">
                <Image src={sleepyEmoji} alt="Sleepy emoji" fill sizes="96px" className="object-contain drop-shadow-lg" priority={false} />
              </div>
              <span className="absolute text-lg text-blue-200 sleepy-z" style={{ left: "50%", transform: "translate(-50%, 0)", top: "0.25rem" }}>Z</span>
              <span className="absolute text-base text-blue-100 sleepy-z" style={{ left: "50%", transform: "translate(-50%, -0.75rem)", top: "-0.75rem", animationDelay: "420ms" }}>Z</span>
              <span className="absolute text-sm text-blue-100 sleepy-z" style={{ left: "50%", transform: "translate(-50%, -1.5rem)", top: "-1.5rem", animationDelay: "840ms" }}>Z</span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-white font-semibold text-lg">Good night</div>
            <div className="text-white/85 text-sm">You finished your winddown. Keep lights low, keep phone away, and rest well.</div>
            <div className="mt-2 text-[13px] text-blue-200/90 italic">“I’m here in the morning. Sleep well.”</div>
          </div>
        </div>
      </section>
    );
  }

  if (meta.demo === "todayList") {
    const items = context.todayTasks ?? [];
    const todayISO: string = context.todayISO;
    const todayLoading: boolean = !!context.todayLoading;
    return (
      <section aria-label="Today's tasks" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
        <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gray-500/20 text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M16.704 5.29a1 1 0 00-1.408-1.418l-6.3 6.25-2.292-2.276a1 1 0 00-1.416 1.414l3 2.98a1 1 0 001.408 0l7.008-6.95z"/></svg>
            </span>
            <div className="text-sm font-medium">Today's Tasks</div>
          </div>
          <div className="text-xs text-[var(--fg)]/60 flex items-center gap-3">
            <span>{todayLoading ? "Loading…" : `${items.length} items`}</span>
            <Link href={`/schedule/${todayISO}`} className="underline text-[var(--fg)]/70 hover:text-[var(--fg)]">Open</Link>
          </div>
        </header>
        {todayLoading ? (
          <div className="px-3 py-3 text-sm text-[var(--fg)]/60">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-3 text-sm text-[var(--fg)]/60">No tasks scheduled today.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {items.map((t: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between px-3 py-2">
                <Link href={`/schedule/${todayISO}`} className="flex items-center gap-3 min-w-0 group">
                  <span className="inline-flex h-3.5 w-3.5 rounded-sm bg-gray-500/30 group-hover:bg-gray-400/40" />
                  <span className="truncate group-hover:underline">{t.title}</span>
                </Link>
                <Link href={`/schedule/${todayISO}`} className="text-[11px] text-[var(--fg)]/50 hover:underline">{t.start}{typeof t.durationMin === 'number' ? ` · ${t.durationMin}m` : ''}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return null;
}
