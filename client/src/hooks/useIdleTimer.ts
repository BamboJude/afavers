import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_MS   = 30 * 60 * 1000; // 30 minutes idle → logout
const WARN_MS   =  2 * 60 * 1000; // warn 2 minutes before

export const useIdleTimer = (onLogout: () => void) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const logoutTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const warnTimer    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownInt = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (logoutTimer.current)  clearTimeout(logoutTimer.current);
    if (warnTimer.current)    clearTimeout(warnTimer.current);
    if (countdownInt.current) clearInterval(countdownInt.current);
  };

  const reset = useCallback(() => {
    clearAll();
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
    }, IDLE_MS - WARN_MS);

    logoutTimer.current = setTimeout(() => {
      clearAll();
      onLogout();
    }, IDLE_MS);
  }, [onLogout]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => reset();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearAll();
    };
  }, [reset]);

  return { showWarning, secondsLeft, stayLoggedIn: reset };
};
