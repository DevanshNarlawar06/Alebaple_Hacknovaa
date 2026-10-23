# Beacon: the phone app (React Native + Expo)

The native version of the `/beacon` page in the web app. Same screens, same wording, same colours, and it talks to the
same SachVerify API. Everything for the app lives in this folder; nothing outside it is needed to build or run it.

| Screen | What it does |
|---|---|
| **Home** | Threat level for your area (all clear / stay alert / alert), what to do, "I'm safe", nearby updates, rumour check. Pull down to refresh. |
| **Why this alert?** | The rule behind the status and the official alerts that triggered it. |
| **Map** | Your alert area and the reports around you, coloured by verdict (Leaflet in a WebView, no map key needed). |
| **Check** | Paste a message, news link or YouTube video. Live progress while it is checked, then a plain-language verdict, who said what, and the full evidence. Share the result. |
| **Settings** | Area (including your phone's GPS), alert radius, alert sound and notifications, server address. |

## Run it

You need Node.js. In two terminals:

```powershell
# 1. The API, reachable from your phone (from this folder)
.\start-backend.ps1            # prints the address to use, for example http://192.168.1.20:8000

# 2. The app
npm install
npx expo start                 # scan the QR code with Expo Go (Android or iOS)
```

The phone and the computer must be on the **same Wi-Fi**. The app guesses the computer's address from Expo, so it
usually just works. If the Home screen says "Can't reach the server", open **Settings > Server address**, type the
address that `start-backend.ps1` printed, and press **Save and test connection**. Windows may ask to let Python
through the firewall: allow it on *Private networks*.

Other ways to run it:

```powershell
npx expo start --web           # in a browser (handy for development; the map uses an iframe there)
npx expo start --android       # Android emulator (the address 10.0.2.2 reaches your computer automatically)
```

To fix the address without touching Settings, create `.env` here with `EXPO_PUBLIC_API_BASE=http://192.168.1.20:8000`.

## How it works

- **Navigation:** Expo Router. Screens are files in `src/app` (`(tabs)` = Home, Map, Check, Settings; `why.tsx` is pushed from Home).
- **Live status:** the app polls `/api/beacon/status` every 15 seconds, when it comes back to the foreground, and on pull-to-refresh.
  (The web app uses a server-sent stream; native has no `EventSource`, and polling needs nothing extra.)
- **Live check progress:** `POST /api/claims/check/start` returns a job id; the app polls `GET /api/claims/check/{id}` about
  every 350 ms and draws the timeline from the steps the server reports. See `src/lib/api.ts` (`checkLive`).
- **Alerts:** when the level turns **RED** and "Alert sound & notifications" is on, the phone vibrates and shows a local
  notification with its notification sound. Local notifications work in Expo Go; remote push is not used.
- **Privacy:** your position is rounded to about 1 km before it is sent. The exact position stays on the phone.
- **Settings are saved** on the phone (area, radius, alert preference, server address).

## Folder map

```
src/app/            screens (Expo Router)
src/components/     CheckFlow (the Check screen), CheckProgress, Evidence, LeafletMap, BeaconHeader, ui
src/lib/            api (types + checkLive), config (server address), alerts, format, storage
src/state/beacon.tsx  area, radius, alert preference and the polling of Beacon status
src/theme.ts        colours, copied from the web app so the two match
```

## Checks

```powershell
npx tsc --noEmit        # types
npx expo lint           # lint
npx expo-doctor         # dependency and config health
```

## Building an installable app

```powershell
npx eas-cli@latest build --platform android --profile preview   # APK to share
```

Before shipping, point `EXPO_PUBLIC_API_BASE` at a server with a public address (the app talks plain HTTP to a laptop on a
local network during development). Android allows that in Expo Go; a release build needs HTTPS or a cleartext exception.
