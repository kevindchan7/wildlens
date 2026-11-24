# Wildlens

Offline field guide with Taylor, the field agent.

- Scan plants, mushrooms, animals, rocks, water, buildings and materials (Yuka-style score and safety light)
- Ask Taylor: instant answers from the offline guide
- Library with downloadable area packs (Oregon, Dolomites)
- Map with OpenStreetMap, GPS, sunrise/sunset, compass
- Journal and SOS tools

Static site: no build step. Installable as a PWA.

Wildlens is an informational field guide. It does not replace experts, doctors or rescue services.

## Native app (Capacitor)

The `mobile/` folder wraps the web app in `app/` as a native Android/iPhone app.

- **Android, automatic:** every push to `main` runs `.github/workflows/android.yml`, which builds a debug APK and publishes it to the `android-latest` release: https://github.com/kevindchan7/wildlens/releases/tag/android-latest
- **Android, by hand:** `cd mobile && npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/local-notifications @capacitor/haptics @capacitor/splash-screen @capawesome/capacitor-torch && npm run copy-web && npx cap add android && npx cap open android`
- **iPhone:** needs a Mac with Xcode: `npm install @capacitor/ios && npx cap add ios && npx cap open ios`. Publishing needs an Apple Developer account.
- Store release (Play Store) needs a signing key; the CI build is a debug test build.

Native extras already wired in the web code (`NATIVE` bridge): phone torch, timers as system notifications, barometer and step counter (`mobile/native-android/WildSensorsPlugin.java`, copied in by CI). Next: Campfire local server, offline map packs.

## Access control and Gestionale

- `app/accesso.js`: first start asks name + email (needs internet once), then every start pings Supabase (`wl_ping`). Blocked devices, or "closed to everyone", see a lock screen. Offline grace: 30 days.
- `gestionale/`: developer panel (same developer key as the ART Gestionale): users, last access, block/unblock, close to everyone, lock message, CSV.
- Every build publishes site + web app + Gestionale + `Wildlens.apk` to the `pubblico` branch, served by Render at https://wildlens-y5z2.onrender.com

## 0.3 (24 Nov 2026)

- Welcome screen with brand and Taylor: language and day/night chosen first; registration with real email checks (format, typo suggestions, domain lookup, no temporary emails); returning emails recognised; blocking a person blocks all their devices.
- Taylor talks (`app/voce.js`: speech synthesis + voice input; Android via @capacitor-community/text-to-speech and speech-recognition), hops when tapped, gives tips.
- Real photos of species from Wikipedia/Wikimedia Commons, cached for offline.
- Layout fixes and full IT/ES translations; language and theme switch in the header.
- Published code is minified/protected (`scripts/proteggi.mjs`), legal notice and `condizioni.html`.
