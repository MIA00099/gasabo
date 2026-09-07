# Kigali Market — native mobile app

The app is the **same Vite SPA** as the website, loaded in a native WebView via
[Capacitor](https://capacitorjs.com). There is no second codebase: every screen,
fix and feature ships to the app the moment it ships to the site. The only
difference is that the app talks to the deployed API over HTTPS instead of its
own origin.

```
src/ (one SPA)  ──vite build──▶  dist/  ──cap sync──▶  android/  ──Android Studio──▶  .apk / .aab
```

- `capacitor.config.ts` — app id (`com.kigalimarket.app`), name, splash
- `.env.app` — `VITE_API_BASE_URL` baked into the **app** build only
- `android/` — the generated native project (committed; safe to regenerate with `npx cap add android`)
- `src/native/app.js` — status bar / splash / Android Back button (no-op on web)

---

## How the API URL works

| Build | Command | `VITE_API_BASE_URL` | API + images resolve to |
|---|---|---|---|
| Website | `npm run build` | *(empty)* | `/api/...` on its own origin — unchanged |
| App | `npm run app:build` | `https://www.kigalimarket.com` (from `.env.app`) | `https://www.kigalimarket.com/api/...` |

`src/api/client.js` prefixes every request with `API_BASE`, and rewrites every
server-relative `/uploads/...` image URL in API responses to absolute. Point
`.env.app` at whatever origin serves the API (staging, production, a LAN IP for
testing). The server already allows the app's WebView origins in CORS
(`server/src/app.ts` → `NATIVE_APP_ORIGINS`).

---

## One-time setup (Android)

1. Install **Android Studio** (bundles the Android SDK) and a **JDK 21**.
2. Set `ANDROID_HOME` (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`) and add
   `platform-tools` to `PATH`.
3. From the repo root:
   ```bash
   npm install
   npm run app:add:android   # only if android/ is missing
   ```

`android/` is already committed, so step 3's `app:add:android` is normally not needed.

## Dev loop

```bash
npm run app:build     # vite build --mode app  +  cap sync android
npm run app:android    # opens android/ in Android Studio
```

Then in Android Studio press **Run** (▶) with an emulator or a USB device
(Developer Options → USB debugging). Re-run `npm run app:build` after any web
change and press Run again — or use live reload:

```bash
# 1. run the dev server on your LAN
npm run dev -- --host
# 2. temporarily add to capacitor.config.ts:
#    server: { url: 'http://<your-LAN-IP>:5173', cleartext: true, androidScheme: 'https' }
# 3. npx cap sync android  &&  npm run app:android
```
Remove the `server.url` line before building a release.

## Release build

1. Bump `versionCode` (integer, +1 every upload) and `versionName` in
   `android/app/build.gradle`.
2. Generate an upload keystore **once** and keep it safe (losing it means you
   can never update the app):
   ```bash
   keytool -genkey -v -keystore kigalimarket-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
3. Android Studio → **Build → Generate Signed Bundle / APK → Android App Bundle**,
   select the keystore, build `release`. Output: `android/app/release/app-release.aab`.
4. Upload the `.aab` at [play.google.com/console](https://play.google.com/console)
   (one-time $25 developer registration). First submission also needs: app icon,
   feature graphic, screenshots, privacy-policy URL (`/privacy` is live), and the
   data-safety form.

App icons/splash: drop a 1024×1024 `icon.png` (and optional `splash.png`) in a
`resources/` folder and run `npx @capacitor/assets generate --android`.

## iOS

Needs a **Mac** with Xcode. On that machine:
```bash
npm i -D @capacitor/ios@6
npx cap add ios
npm run app:build && npx cap sync ios
npx cap open ios       # then set a signing team in Xcode and Archive
```
Publishing needs an Apple Developer account ($99/yr).

## Troubleshooting

- **White screen / “Could not reach the server”** — `.env.app` URL wrong or not
  reachable from the phone, or CORS. Check `chrome://inspect` (device WebView
  DevTools) → Network.
- **Images missing** — the API is storing uploads on local disk and
  `VITE_API_BASE_URL` doesn't front them, or Supabase bucket isn't public.
- **`SDK location not found`** — set `ANDROID_HOME`, or create
  `android/local.properties` with `sdk.dir=<path>`.
- **Back button closes the app immediately** — expected at the home screen;
  elsewhere it walks SPA history (`src/native/app.js`).
