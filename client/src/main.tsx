import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'
import { initTheme } from './store/themeStore'

initTheme() // restore saved theme before first paint
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import { APP_VERSION, isStaleChunkError, refreshAppCache } from './utils/cacheRecovery'

// Hide native Capacitor splash screen
SplashScreen.hide().catch(() => {});

// On iOS: keep status bar visible but don't overlay the WebView
// This ensures the topbar never hides behind the notch
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setStyle({ style: Style.Default }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
}

// ── Version check — if app version changed, auto-clear stale app/auth cache ───
try {
  const storedVersion = localStorage.getItem('app_version');
  if (storedVersion && storedVersion !== APP_VERSION) {
    refreshAppCache(); // version mismatch: clear stale cache and reload once
  } else {
    localStorage.setItem('app_version', APP_VERSION);
  }
} catch { /* localStorage blocked (private mode etc.) — continue normally */ }

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
    // ChunkLoadError = stale PWA cache after a new deploy — auto-nuke
    if (isStaleChunkError(error)) {
      refreshAppCache();
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', background: '#fff', minHeight: '100vh' }}>
          <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>A cached version of the app may be out of date.</p>
          <button
            onClick={() => refreshAppCache()}
            style={{ marginTop: 16, padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Clear cache &amp; reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Auto-reload when a new service worker takes over (new deploy) ─────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

window.addEventListener('unhandledrejection', (event) => {
  if (isStaleChunkError(event.reason)) {
    event.preventDefault();
    refreshAppCache();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
)
