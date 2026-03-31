import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_MS = 30 * 1000; // 30 seconds idle → logout
const WARN_MS = 30 * 1000; // warn immediately (full 30s countdown on idle)

export const useIdleTimer = (onLogout: () => void) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const logoutTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const warnTimer    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownInt = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track last activity with a ref so visibility handler always has fresh value
  const lastActiveRef = useRef<number>(Date.now());

  // Keep onLogout stable in a ref so we don't need it as a dependency
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const clearAll = () => {
    if (logoutTimer.current)  clearTimeout(logoutTimer.current);
    if (warnTimer.current)    clearTimeout(warnTimer.current);
    if (countdownInt.current) clearInterval(countdownInt.current);
  };

  /**
   * Schedule warn + logout timers based on `remainingMs` until logout.
   * If already in the warning window, shows countdown immediately.
   */
  const scheduleTimers = useCallback((remainingMs: number) => {
    clearAll();

    if (remainingMs <= 0) {
      onLogoutRef.current();
      return;
    }

    // Logout timer
    logoutTimer.current = setTimeout(() => {
      clearAll();
      onLogoutRef.current();
    }, remainingMs);

    const warnIn = remainingMs - WARN_MS;

    if (warnIn <= 0) {
      // Already inside warning window — start countdown immediately
      const secs = Math.max(1, Math.ceil(remainingMs / 1000));
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
    } else {
      // Not yet in warning window — hide dialog and schedule it
      setShowWarning(false);
      warnTimer.current = setTimeout(() => {
        setShowWarning(true);
        setSecondsLeft(WARN_MS / 1000);
        countdownInt.current = setInterval(() => {
          setSecondsLeft(s => {
            if (s <= 1) {
              if (countdownInt.current) clearInterval(countdownInt.current);
              return 0;
            }
            return s - 1;
          });
        }, 1000);
      }, warnIn);
    }
  }, []);

  /** Called on any user interaction — resets the full idle window */
  const reset = useCallback(() => {
    lastActiveRef.current = Date.now();
    setShowWarning(false);
    scheduleTimers(IDLE_MS);
  }, [scheduleTimers]);

  // ── Page Visibility: handle returning from background / switching tabs ──────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const idleMs    = Date.now() - lastActiveRef.current;
      const remaining = IDLE_MS - idleMs;

      if (remaining <= 0) {
        // Session expired while the page was hidden
        clearAll();
        setShowWarning(false);
        onLogoutRef.current();
      } else {
        // Restart timers with accurate remaining time
        scheduleTimers(remaining);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [scheduleTimers]);

  // ── Activity listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => reset();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    reset(); // kick off timers on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearAll();
    };
  }, [reset]);

  return { showWarning, secondsLeft, stayLoggedIn: reset };
};
