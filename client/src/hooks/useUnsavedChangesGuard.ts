import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Blocks hard unloads and SPA Link navigations when `dirty` is true.
 *
 * React Router v7's `useBlocker` requires a Data Router
 * (`createBrowserRouter` + `RouterProvider`). This app uses the classic
 * `<BrowserRouter>`, so we implement a focused guard by intercepting
 * `history.pushState` / `replaceState` for the lifetime of the component.
 *
 * **Known limitation**: browser Back/Forward buttons are NOT intercepted.
 * A popstate handler that tries to "undo" the pop after the fact is
 * inherently unreliable in BrowserRouter (we cannot know the previous URL
 * without racing the router) and can corrupt the history stack, so we do
 * not attempt it. Users who click Back with unsaved changes will simply
 * navigate away without the in-app dialog — but the `beforeunload`
 * handler still prompts on hard reloads and tab close.
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

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
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
