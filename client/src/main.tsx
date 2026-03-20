import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

// Hide native Capacitor splash screen
SplashScreen.hide().catch(() => {});

// On iOS: keep status bar visible but don't overlay the WebView
// This ensures the topbar never hides behind the notch
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setStyle({ style: Style.Default }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
}

// ── Cache nuke — clears SW caches, unregisters service workers, clears storage ─
async function nukeCache() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch {}
  localStorage.clear();
  sessionStorage.clear();
  window.location.reload();
}

// ── Version check — if app version changed, auto-clear stale SW cache ─────────
try {
  const APP_VERSION = '__APP_VERSION__';
  const storedVersion = localStorage.getItem('app_version');
  if (storedVersion && storedVersion !== APP_VERSION) {
    nukeCache(); // version mismatch: nuke and reload
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
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', background: '#fff', minHeight: '100vh' }}>
          <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>A cached version of the app may be out of date.</p>
          <button
            onClick={nukeCache}
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
)
