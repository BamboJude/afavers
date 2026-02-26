import { useState, useRef } from 'react';

/**
 * Touch swipe gesture hook for job cards.
 * - Swipe right (> threshold px) → calls onSwipeRight
 * - Swipe left  (> threshold px) → calls onSwipeLeft
 * - Uses touch-action: pan-y so vertical scroll still works natively.
 */
export function useSwipeAction(
  onSwipeRight: () => void,
  onSwipeLeft: () => void,
  threshold = 80
) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'h' | 'v' | null>(null);
  // Keep offset in a ref too so onTouchEnd can read the latest value
  const offsetRef = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!locked.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }

    if (locked.current === 'v') return;

    setSwiping(true);
    offsetRef.current = dx;
    setOffset(dx);
  };

  const onTouchEnd = () => {
    if (locked.current === 'h') {
      if (offsetRef.current > threshold) onSwipeRight();
      else if (offsetRef.current < -threshold) onSwipeLeft();
    }
    setSwiping(false);
    offsetRef.current = 0;
    setOffset(0);
    locked.current = null;
  };

  const progress = Math.min(Math.abs(offset) / threshold, 1);
  const action: 'save' | 'hide' | null = offset > 20 ? 'save' : offset < -20 ? 'hide' : null;

  return {
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd } as const,
    cardStyle: {
      transform: `translateX(${offset}px)`,
      transition: swiping ? 'none' : 'transform 0.3s ease',
      touchAction: 'pan-y' as const,
    },
    bgOpacity: progress,
    action,
  };
}
