# Android Trusted Web Activity (TWA)

Wrap the Siren Watch PWA for **Google Play** distribution. A TWA opens your HTTPS site in a Chrome-powered full-screen shell — no WebView quirks, same codebase as the web app.

## Prerequisites

- Production PWA on HTTPS with a valid `manifest.webmanifest`
- Custom domain configured (e.g. `https://sirenwatch.app`)
- [Google Play Developer](https://play.google.com/console) account ($25 one-time)
- Java JDK 17+ and Android SDK (installed via Android Studio or Bubblewrap)

## 1. Verify PWA installability

Before packaging, confirm in Chrome DevTools → **Application → Manifest**:

- `name`, `short_name`, `start_url`, `display: standalone`
- Icons 192×192 and 512×512 (maskable recommended)
- `theme_color` and `background_color`

Run Lighthouse **PWA** audit on your production URL.

## 2. Generate the Android project (Bubblewrap)

[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) is Google's CLI for TWAs.

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://sirenwatch.app/manifest.webmanifest
```

Follow prompts:

| Prompt | Suggested value |
|--------|-----------------|
| Domain | `sirenwatch.app` |
| App name | `Siren Watch` |
| Launcher name | `Siren Watch` |
| Theme color | `#0A0E14` |
| Background color | `#0A0E14` |
| Start URL | `/` |
| Icon | Use `public/icons/icon-512.png` from this repo |
| Maskable icon | `public/icons/icon-maskable-512.png` |
| Signing key | Create new keystore (store safely — required for updates) |

This creates an `android/` folder with a Gradle project.

## 3. Digital Asset Links

Google Play requires proof that you own the domain. Bubblewrap generates a `assetlinks.json` snippet.

Host it at:

```
https://sirenwatch.app/.well-known/assetlinks.json
```

### Next.js on Vercel

1. Copy `public/.well-known/assetlinks.json.example` to `public/.well-known/assetlinks.json`
2. Replace `REPLACE_WITH_SHA256_FINGERPRINT` with your **release** signing key fingerprint:

```bash
keytool -list -v -keystore your-release-key.keystore -alias your-alias
```

3. Deploy and verify:

```bash
curl https://sirenwatch.app/.well-known/assetlinks.json
```

Use [Google's Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator) to validate the association.

## 4. Build and test

```bash
cd android
./gradlew assembleRelease    # or bubblewrap build
```

Install the APK on a device:

```bash
adb install app/build/outputs/apk/release/app-release-unsigned.apk
```

Confirm:

- App opens full-screen to your production URL
- Add to Home Screen behavior matches installed PWA
- Microphone permission prompt works (same as Chrome)

## 5. Play Store listing

1. Create app in Play Console
2. Upload AAB (`./gradlew bundleRelease`)
3. Complete **Data safety** form — declare microphone use, on-device processing, no audio upload
4. Add screenshots, short description, privacy policy URL (`/privacy`)
5. Content rating questionnaire (utility / safety app)

### Store copy tips

- Emphasize **on-device** processing and accessibility (deaf/HoH users)
- Link to `/disclaimer` — not a replacement for official emergency alerts
- Note mic limitations when screen is locked (same as PWA)

## 6. Updates

Web app updates deploy instantly via Vercel — users get new UI on next launch.

To change TWA shell settings (splash, orientation, shortcuts), bump `versionCode` in `android/app/build.gradle` and ship a new Play release.

## Alternatives

| Tool | Notes |
|------|-------|
| [PWABuilder](https://www.pwabuilder.com/) | Web UI, generates TWA + store packages |
| [Capacitor](https://capacitorjs.com/) | Heavier; needed only for native plugins (background mic) |

For Siren Watch, **TWA is sufficient** if you accept the same background-mic limits as the browser PWA.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Site cannot be verified" | Check `assetlinks.json` fingerprint matches **release** keystore |
| White screen on launch | Ensure `start_url` is reachable; check CSP headers |
| Mic denied | User must grant permission; add `RECORD_AUDIO` in AndroidManifest (Bubblewrap adds this) |
| Old UI after deploy | TWA loads live URL — hard refresh or clear site data |
