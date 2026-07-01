# Siren Watch

Live emergency siren detection in the browser. Listens through your microphone, blends a fast frequency-sweep heuristic with Google's YAMNet AI model, and alerts you when a siren-like pattern is detected.

All audio processing runs **locally on your device** — nothing is uploaded.

## Features

- Real-time siren detection (heuristic + siren specialist + YAMNet)
- Sensitivity presets, calibration, and false-positive feedback
- First-run onboarding (mic, notifications, optional calibrate)
- PWA with PNG icons for iOS/Android install
- Self-hosted YAMNet weights (no runtime tfhub dependency)
- Push notifications, flash/vibrate/sound alerts
- **Try demo siren** — synthetic clip through the detector before granting mic access
- IndexedDB detection history with CSV export
- Background-friendly detection via AudioWorklet

## Legal

- [Privacy policy](/privacy) — microphone audio stays on your device
- [Disclaimer](/disclaimer) — not a replacement for official emergency alerts

## Requirements

- Modern browser (Chrome, Edge, Safari, Firefox)
- Microphone access
- **HTTPS** for PWA install and notifications (localhost works for dev)

## Quick start (local)

```bash
npm install
npm run fetch-yamnet   # only if public/models/yamnet/ is missing
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Tap **Try demo siren** to see detection without the microphone, or **Start listening** to use your mic.

## Demo mode

On the Listen tab, **Try demo siren** feeds a synthetic police-style yelp through the same detection pipeline (heuristic, specialist, YAMNet). No microphone permission is required. Demo alerts are shown in the UI but are **not** saved to history or sent as push notifications.

For batch regression tests with multiple clips, use `/test`.

## Deploy

PWAs require HTTPS. Pick any static-friendly Next.js host:

### Vercel (recommended)

```bash
npm i -g vercel
vercel
```

Follow the prompts. Your app will be at `https://your-project.vercel.app`.

### Custom domain (e.g. sirenwatch.app)

1. In Vercel → **Project → Settings → Domains**, add your domain
2. Point DNS (A/CNAME) per Vercel's instructions
3. Set `NEXT_PUBLIC_SITE_URL=https://sirenwatch.app` in Vercel env (and `.env.local` for local OG previews)
4. Redeploy so Open Graph / Twitter cards use the correct absolute URLs

### Cloudflare Pages

1. Push this repo to GitHub
2. In Cloudflare Pages → **Create project** → connect the repo
3. Build command: `npm run build`
4. Output directory: `.next` won't work for static — use Vercel or:

For Cloudflare, add `output: 'export'` to `next.config.js` only if you don't need SSR (this app is fully client-side on the home page, so static export works):

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // ...existing headers config
};
module.exports = nextConfig;
```

Then set output directory to `out`.

### Install on your phone

1. Deploy and open the HTTPS URL
2. **Android (Chrome):** Menu → **Install app** / **Add to Home screen**
3. **iOS (Safari):** Share → **Add to Home Screen**
4. Open the installed app, tap **Start listening**, allow mic + notifications
5. Optional: run **Calibrate** for your room, tune **Sensitivity**

## Configuration

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for Open Graph / social previews |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional Sentry browser SDK for SW/model/mic errors |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key (safe in browser) |
| `VAPID_PRIVATE_KEY` | Web Push private key (server only) |
| `VAPID_SUBJECT` | Contact mailto for push (e.g. `mailto:you@example.com`) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis for persistent push subscriptions |

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Keep the **private** key on your server only — never commit it.

## How detection works

1. **Heuristic layer** — watches for tones sweeping 500–1800 Hz at a siren-like rate (runs in the AudioWorklet)
2. **Siren specialist** — yelp-modulation scorer, or optional custom TF.js model
3. **YAMNet layer** — general-purpose classifier (521 AudioSet classes)
4. **Blending** — when YAMNet is inconclusive (below ~12% siren score), the app trusts the acoustic sweep rather than blocking the alert. Strong YAMNet matches boost confidence.

Mark mistaken alerts with **Not a siren** on the Listen or History tab — stored locally for your review and CSV export.

Use **Strict / Balanced / Sensitive** presets or sliders under Sensitivity. **Calibrate** sets the noise floor and min frequency swing from 10 seconds of ambient audio.

### YAMNet self-hosting

Weights live in `public/models/yamnet/` (~16 MB). The app loads local weights first, then falls back to tfhub.dev.

```bash
npm run fetch-yamnet
```

Re-run after cloning if the model folder is missing. Optional override: `NEXT_PUBLIC_YAMNET_MODEL_URL`.

## Web Push (optional)

Local notifications fire via the service worker when a siren is detected. For server-relayed push (backup delivery path):

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Set in `.env.local` (and Vercel project env):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (e.g. `mailto:you@example.com`)
3. Deploy to Vercel
4. In **Settings → Remote push backup**, tap **Register device**
5. Enable **Relay alerts through server push on detection**

For production, add an **Upstash Redis** integration on Vercel so subscriptions persist (`KV_REST_API_URL` + `KV_REST_API_TOKEN`). Without Redis, subscriptions live in server memory and reset on cold starts.

**Note:** Microphone listening still requires the app to be open. Remote push relays alert notifications only — it does not enable background mic capture on iOS/Android.

When listening starts with **Relay alerts** enabled in Settings, the app auto-registers for push. The Listen tab also prompts you to enable push backup if VAPID keys are configured but the device is not registered yet.

## Offline shell

The service worker (`public/sw.js`) caches the app shell, static Next.js chunks, and core assets on first visit. TensorFlow.js and the YAMNet model (~16 MB) still require network on first load — they are intentionally lazy-loaded when you tap **Start listening** to keep the first paint small.

After a successful visit, reopening the installed PWA may show the UI offline; detection still needs mic access and model weights.

## Error monitoring (optional)

Set `NEXT_PUBLIC_SENTRY_DSN` to a Sentry browser project DSN. The app reports:

- Service worker registration failures
- YAMNet / specialist model load errors
- Microphone permission denials
- Classifier runtime errors

Events are tagged and never include raw audio.

## Social / Open Graph

`app/layout.tsx` sets title, description, and `og-image.png` (1200×630). Regenerate icons and the OG image with:

```bash
npm run generate-icons
```

Ensure `NEXT_PUBLIC_SITE_URL` matches your production domain so share previews resolve correctly.

## Limitations

- Not a replacement for official emergency alerts
- Cannot determine siren direction from one mic
- Phones may pause the microphone when the screen locks or the app is backgrounded
- iOS background listening is especially limited — keep the app foregrounded when possible

## Project structure

```
app/                  Next.js app shell
components/
  detector/           UI panels and visuals
  SirenDetector.tsx   Main page orchestrator
hooks/
  useSirenDetection.ts   Audio graph + detection loop
  useSettings.ts         Persisted sensitivity settings
  useCalibration.ts      Environment calibration
  useDetectionHistory.ts IndexedDB history
lib/
  detection.ts        Heuristic + blend logic
  settings.ts         Presets and localStorage
  calibration.ts      Noise floor analysis
  detectionHistory.ts IndexedDB + CSV export
  yamnet.ts           YAMNet TF.js classifier
  notifications.ts    Service worker + Web Push client
lib/push/
  store.ts              Push subscription persistence (KV or memory)
  send.ts               Server-side web-push broadcast
app/api/push/
  subscribe/route.ts    Register device subscription
  unsubscribe/route.ts  Remove subscription
  broadcast/route.ts    Send push to all registered devices
public/
  manifest.webmanifest
  sw.js               Service worker
  icons/              PWA icons
```

## Scripts

| Command        | Description          |
|----------------|----------------------|
| `npm run dev`  | Development server   |
| `npm run build`| Production build     |
| `npm run start`| Serve production build |
| `npm run lint` | ESLint               |
| `npm run clean`| Delete `.next` cache |
| `npm run generate-icons` | Regenerate PNG PWA icons from SVG |
| `npm run fetch-yamnet` | Download YAMNet weights to `public/models/yamnet/` |

## Test harness

Open `/test` after deploy (or `http://localhost:3000/test` locally) to run synthetic siren and negative clips against your current sensitivity settings. Use it before tuning thresholds.

## Custom siren model (optional)

Drop a Teachable Machine / TF.js export at `public/models/siren-specialist/model.json`, or set `NEXT_PUBLIC_SIREN_MODEL_URL`. Until then, the built-in yelp-modulation specialist runs alongside YAMNet.

## Android TWA (Google Play)

To distribute via Google Play as a Trusted Web Activity, see [docs/android-twa.md](docs/android-twa.md). The TWA wraps your production HTTPS URL — no separate app codebase. Host `/.well-known/assetlinks.json` (see `public/.well-known/assetlinks.json.example`) to verify domain ownership.

## Roadmap (bigger bets)

These are **optional future tracks** — the current product is a privacy-first PWA.

### Native shell (Capacitor / React Native)

**Why:** A WebView wrapper alone does **not** fix lock-screen listening. iOS and Android suspend `getUserMedia` when the app backgrounds unless you use **native background audio** (iOS `UIBackgroundModes: audio`, Android foreground service + mic).

**Verdict for now:** Deploy as PWA or Android TWA. Capacitor is a **new product track**, not a small upgrade.

### Multi-mic / direction hint

**Why:** Bearing needs known mic geometry, stable phase, and often >10 cm spacing. Phone stereo mics are close together; web APIs expose a mixed mono stream on many devices.

**Verdict:** Skip on web. If you go native, a rough “louder in left/right” hint might be a v2 experiment — not reliable enough to promise users.

### Community “siren heard here” map

**Why:** Needs accounts or abuse-resistant anonymity, moderation, GDPR/CCPA, false reports, and liability. Contradicts “audio never leaves device” unless you only upload **user-opt-in alerts**, not raw audio.

**Verdict:** Skip unless the product becomes a **social alert network** with legal review and a backend team. Optional share-with-location is enough for personal SOS.

## Troubleshooting

### `Cannot find module './819.js'` (or similar)

Stale Next.js build cache. Stop the dev server, then:

```bash
npm run clean
npm run dev
```

Hard-refresh the browser (Cmd+Shift+R). If dev mode keeps failing, use production mode:

```bash
npm run build
npm run start
```

Then open [http://localhost:3000](http://localhost:3000).

### Tabs (Listen / Settings / History) not showing

The page crashed before React loaded — fix the server error above. Tabs sit directly under the **SIREN WATCH** header.

## License

[MIT](LICENSE) — see [LICENSE](LICENSE) for details.
