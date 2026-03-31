import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_MS  = 30 * 1000; // 30s of inactivity → show dialog
const GRACE_MS = 15 * 1000; // 15s grace period in the dialog before forced logout

export const useIdleTimer = (onLogout: () => void) => {
  const [showWarning, setShowWarning]   = useState(false);
  const [secondsLeft, setSecondsLeft]   = useState(0);

  const logoutTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownInt  = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const warningRef    = useRef(false); // mirror of showWarning for event handlers

  const onLogoutRef   = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const clearAll = () => {
    if (logoutTimer.current)  clearTimeout(logoutTimer.current);
    if (countdownInt.current) clearInterval(countdownInt.current);
  };

  /**
   * Show the warning dialog and count down from `fromSecs`.
   * Logout fires automatically when it reaches 0.
   */
  const showDialog = useCallback((fromSecs: number) => {
    clearAll();
    const secs = Math.max(1, fromSecs);
    warningRef.current = true;
    setShowWarning(true);
    setSecondsLeft(secs);

    countdownInt.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (countdownInt.current) clearInterval(countdownInt.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    logoutTimer.current = setTimeout(() => {
      clearAll();
      onLogoutRef.current();
    }, secs * 1000);
  }, []);

  /**
   * Reset: clears dialog and restarts the silent 30s idle timer.
   * Called by the Continue button or on mount.
   */
  const reset = useCallback(() => {
    lastActiveRef.current = Date.now();
    clearAll();
    warningRef.current = false;
    setShowWarning(false);

    // Restart silent idle countdown — no dialog until it fires
    logoutTimer.current = setTimeout(() => {
      showDialog(GRACE_MS / 1000);
    }, IDLE_MS);
  }, [showDialog]);

  // ── Page Visibility: user returns from another tab / app / phone lock ──────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const idleMs    = Date.now() - lastActiveRef.current;
      const remaining = IDLE_MS - idleMs;

      if (remaining <= 0) {
        // Session expired while away → grace period dialog
        showDialog(GRACE_MS / 1000);
      } else {
        // Show dialog with the actual remaining session time
        showDialog(Math.ceil(remaining / 1000));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showDialog]);

  // ── Activity listeners ── only reset when dialog is NOT open ─────────────
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => {
      if (!warningRef.current) reset();
    };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    reset(); // kick off idle timer on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearAll();
    };
  }, [reset]);

  return { showWarning, secondsLeft, stayLoggedIn: reset };
};
