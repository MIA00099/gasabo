import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell config. The app is the existing Vite SPA (built to dist/)
 * loaded in a WebView; it talks to the deployed REST API over HTTPS, so the
 * API base URL is a build-time env var (VITE_API_BASE_URL) baked into the
 * bundle - see src/api/client.js and .env.example.
 *
 *   npm run app:build     # vite build, then copy dist/ into android/
 *   npm run app:android   # open the Android project in Android Studio
 *
 * A full build needs Android Studio + JDK 21 (see MOBILE_APP.md). iOS needs
 * a Mac; add @capacitor/ios there and `npx cap add ios`.
 */
const config: CapacitorConfig = {
  appId: 'com.kigalimarket.app',
  appName: 'Kigali Market',
  webDir: 'dist',
  android: {
    // https://localhost (not http://) so Web Storage is treated as a secure
    // origin and survives app restarts, and so mixed-content rules match the
    // real site.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#032202',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
