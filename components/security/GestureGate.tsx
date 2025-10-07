'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import GesturePad from './GesturePad';

const STORAGE_KEY = 'psa.gesture.pattern';
const MIN_PATTERN_LENGTH = 4;

type Status = 'checking' | 'setup' | 'confirm' | 'locked' | 'unlocked';

type MessageState = {
  kind: 'info' | 'error';
  text: string;
};

const instructions: Record<Exclude<Status, 'checking' | 'unlocked'>, { title: string; helper: string }> = {
  setup: {
    title: 'Create your gesture',
    helper: 'Connect at least four dots. This gesture will unlock the assistant.',
  },
  confirm: {
    title: 'Confirm your gesture',
    helper: 'Draw the same pattern again to confirm.',
  },
  locked: {
    title: 'Unlock with gesture',
    helper: 'Draw your saved pattern to continue.',
  },
};

const arraysEqual = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => b[index] === value);

/**
 * GestureGate
 * Purpose: Wraps the app with a gesture-based lock screen. Guides initial setup on first load and
 * enforces the saved gesture on subsequent visits before revealing the UI.
 */
export default function GestureGate({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<Status>('checking');
  const [storedPattern, setStoredPattern] = useState<number[] | null>(null);
  const [setupPattern, setSetupPattern] = useState<number[] | null>(null);
  const [message, setMessage] = useState<MessageState | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedValue = localStorage.getItem(STORAGE_KEY);
    if (savedValue) {
      try {
        const parsed = JSON.parse(savedValue);
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'number')) {
          setStoredPattern(parsed);
          setStatus('locked');
          return;
        }
      } catch (error) {
        console.warn('Failed to parse gesture pattern, clearing.');
      }
      localStorage.removeItem(STORAGE_KEY);
    }
    setStatus('setup');
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const handlePattern = (pattern: number[]) => {
    if (pattern.length < MIN_PATTERN_LENGTH) {
      setMessage({ kind: 'error', text: 'Use at least four dots for security.' });
      return;
    }

    if (status === 'setup') {
      setSetupPattern(pattern);
      setStatus('confirm');
      setMessage({ kind: 'info', text: 'Great. Now confirm the same pattern.' });
      return;
    }

    if (status === 'confirm') {
      if (setupPattern && arraysEqual(setupPattern, pattern)) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern));
          setStoredPattern(pattern);
          setStatus('unlocked');
          setMessage({ kind: 'info', text: 'Gesture saved. Welcome!' });
        } catch (error) {
          setMessage({ kind: 'error', text: 'Failed to save gesture. Please try again.' });
          setStatus('setup');
          setSetupPattern(null);
        }
      } else {
        setMessage({ kind: 'error', text: 'Patterns did not match. Start over.' });
        setStatus('setup');
        setSetupPattern(null);
      }
      return;
    }

    if (status === 'locked' && storedPattern) {
      if (arraysEqual(storedPattern, pattern)) {
        setStatus('unlocked');
      } else {
        setMessage({ kind: 'error', text: 'Incorrect pattern. Try again.' });
      }
    }
  };

  if (status === 'unlocked') {
    return <>{children}</>;
  }

  if (status === 'checking') {
    return (
      <div className="relative min-h-screen w-full">
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-0)]">
          <div className="text-center text-sm text-[var(--fg-muted)]">
            Loading security check...
          </div>
        </div>
      </div>
    );
  }

  if (status === 'setup' || status === 'confirm' || status === 'locked') {
    const { title, helper } = instructions[status];

    return (
      <div className="relative min-h-screen w-full">
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-0)]">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-[var(--fg)]">{title}</h1>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">{helper}</p>
            </div>
            <GesturePad onPatternComplete={handlePattern} disabled={false} />
            <div className="min-h-[24px] text-sm">
              {message && (
                <p
                  className={
                    message.kind === 'error'
                      ? 'text-red-500'
                      : 'text-[var(--fg-muted)]'
                  }
                >
                  {message.text}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
