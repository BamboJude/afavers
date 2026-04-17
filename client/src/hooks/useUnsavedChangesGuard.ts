import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Blocks both hard unloads and SPA navigations when `dirty` is true.
 *
 * React Router v7's `useBlocker` requires a Data Router
 * (`createBrowserRouter` + `RouterProvider`). This app uses the classic
 * `<BrowserRouter>`, so we implement a focused guard by intercepting
 * `history.pushState` / `replaceState` / `popstate` for the lifetime of
 * the component that mounts this hook.
 *
 * Usage:
 *   const { showPrompt, confirmLeave, cancelLeave } = useUnsavedChangesGuard(isDirty);
 *   ...render a modal when showPrompt is true.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const [showPrompt, setShowPrompt] = useState(false);
  // Pending destination captured when a navigation is blocked.
  const pendingRef = useRef<(() => void) | null>(null);
  const dirtyRef = useRef(dirty);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Hard reload / tab close guard.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      // Some browsers still require a non-empty returnValue string.
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Soft navigation guard: patch history APIs so we can prompt before a
  // React Router push/replace actually mutates the browser URL.
  useEffect(() => {
    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    const wrap = (
      native: typeof window.history.pushState,
    ): typeof window.history.pushState => {
      return (data, unused, url) => {
        if (dirtyRef.current) {
          // Queue the navigation for after confirmation.
          pendingRef.current = () => native(data, unused, url);
          setShowPrompt(true);
          return;
        }
        native(data, unused, url);
      };
    };

    window.history.pushState = wrap(originalPush);
    window.history.replaceState = wrap(originalReplace);

    const onPopState = (event: PopStateEvent) => {
      if (!dirtyRef.current) return;
      // User hit Back/Forward; push the current URL back so we stay put
      // until they confirm, then re-trigger the pop on confirm.
      const targetUrl = window.location.href;
      originalPush(event.state, '', window.location.href);
      pendingRef.current = () => {
        window.location.href = targetUrl;
      };
      setShowPrompt(true);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const confirmLeave = useCallback(() => {
    const proceed = pendingRef.current;
    pendingRef.current = null;
    setShowPrompt(false);
    // Mark form clean so the beforeunload / history patches let the
    // queued navigation through without re-prompting.
    dirtyRef.current = false;
    if (proceed) proceed();
  }, []);

  const cancelLeave = useCallback(() => {
    pendingRef.current = null;
    setShowPrompt(false);
  }, []);

  return { showPrompt, confirmLeave, cancelLeave };
}
