/**
 * Native-shell glue. A complete no-op in a normal browser: `Capacitor` is
 * always importable (it ships a web fallback) and `isNativePlatform()` is
 * false there, so `initNativeApp()` returns immediately and none of the
 * plugin code below is even loaded.
 *
 * Inside the Capacitor app (see capacitor.config.ts / MOBILE_APP.md) it:
 *   - styles the status bar to match the header and stops it overlaying content
 *   - hides the launch splash once the SPA has painted
 *   - wires the Android hardware Back button to the SPA's own history
 */
import { Capacitor } from '@capacitor/core';

export async function initNativeApp() {
  if (!Capacitor?.isNativePlatform?.()) return;

  document.documentElement.classList.add('is-native-app');

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Header is white; keep the bar opaque (not overlaying the WebView) with
    // dark icons on a white ground so it reads as part of the header.
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    }
  } catch { /* status-bar plugin absent - not fatal */ }

  try {
    const { App } = await import('@capacitor/app');
    // Android Back: step through the SPA's history, and only let the OS close
    // the app when there is nothing left to go back to.
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) window.history.back();
      else App.exitApp();
    });
  } catch { /* app plugin absent - not fatal */ }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* splash-screen plugin absent - not fatal */ }
}
