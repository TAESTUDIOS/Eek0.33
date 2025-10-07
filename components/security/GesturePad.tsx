'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface GesturePadProps {
  onPatternComplete: (pattern: number[]) => void;
  disabled?: boolean;
}

const NODE_COUNT = 9;

/**
 * GesturePad
 * Purpose: 3x3 gesture pad that captures the order of visited nodes while the pointer is down.
 * Behavior: Emits the visited indexes (0-8) when the gesture ends; ignores duplicates.
 */
export default function GesturePad({ onPatternComplete, disabled }: GesturePadProps) {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const patternRef = useRef<number[]>([]);

  const finishGesture = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const result = [...patternRef.current];
    patternRef.current = [];
    if (result.length === 0) {
      setActiveNodes([]);
      return;
    }
    requestAnimationFrame(() => {
      onPatternComplete(result);
      setActiveNodes([]);
    });
  }, [isDrawing, onPatternComplete]);

  const extendGesture = useCallback(
    (index: number) => {
      if (!isDrawing || disabled) return;
      setActiveNodes((prev) => {
        if (prev.includes(index)) return prev;
        patternRef.current = [...patternRef.current, index];
        return [...prev, index];
      });
    },
    [disabled, isDrawing]
  );

  const startGesture = useCallback(
    (index: number) => {
      if (disabled) return;
      patternRef.current = [index];
      setActiveNodes([index]);
      setIsDrawing(true);
    },
    [disabled]
  );

  useEffect(() => {
    if (!isDrawing) {
      return;
    }

    const handleEnd = () => finishGesture();
    const handleMove = (event: PointerEvent) => {
      if (!isDrawing) return;
      event.preventDefault();
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (!target || !(target instanceof HTMLElement)) return;
      const indexAttr = target.dataset.gestureNode;
      if (typeof indexAttr === 'undefined') return;
      extendGesture(Number(indexAttr));
    };

    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
    window.addEventListener('pointermove', handleMove, { passive: false });

    return () => {
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      window.removeEventListener('pointermove', handleMove);
    };
  }, [extendGesture, finishGesture, isDrawing]);

  const nodes = Array.from({ length: NODE_COUNT }, (_, index) => index);

  return (
    <div className="select-none touch-none">
      <div
        className="mx-auto grid max-w-xs grid-cols-3 gap-6"
        onPointerLeave={() => finishGesture()}
      >
        {nodes.map((index) => {
          const isActive = activeNodes.includes(index);
          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              aria-label={`Gesture node ${index + 1}`}
              data-gesture-node={index}
              onPointerDown={(event) => {
                event.preventDefault();
                startGesture(index);
              }}
              onPointerEnter={() => extendGesture(index)}
              className={`h-20 w-20 rounded-full border transition-colors md:h-24 md:w-24 ${
                disabled
                  ? 'cursor-default border-[var(--border)] bg-[var(--surface-1)]/40'
                  : isActive
                  ? 'border-blue-500 bg-blue-500/80 shadow-lg shadow-blue-500/30'
                  : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-blue-400'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
