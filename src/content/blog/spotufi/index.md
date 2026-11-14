---
title: 'Spotufi: A Native Android Client That Plays Spotify’s Own Stream'
description: 'A technical look at Spotufi, an open-source Android client that runs the official Spotify Web Player in a headless WebView and adds offline FLAC downloads, synced lyrics, transcripts and scrobbling.'
date: 2026-11-14
tags:
  [
    'Spotufi',
    'Android',
    'Spotify',
    'Kotlin',
    'Jetpack Compose',
    'Widevine',
    'Open Source',
  ]
image: '../../../assets/covers/spotufi-cover.jpg'
authors: ['fr0stb1rd']
---

Most unofficial Spotify clients solve playback the same way: look the song up on Spotify, then play a "matching" track from somewhere else. The result is a Spotify-shaped interface on top of a different audio source, with the usual problems of wrong versions, live recordings and missing tracks.

**Spotufi** takes the opposite route. It signs in with a real Spotify account, runs the official Spotify Web Player inside an invisible Chromium WebView, and plays the stream that Spotify serves and decrypts through Widevine on the device. Everything around that engine (library, search, queue, lyrics, downloads, scrobbling, Android Auto) is native Kotlin and Jetpack Compose.

**📦 Download:** [GitLab Releases](https://gitlab.com/fr0stb1rd/spotufi/-/releases) | [Obtainium](https://apps.obtainium.imranr.dev/redirect?r=obtainium://add/https://gitlab.com/fr0stb1rd/spotufi/) | **💻 Source:** [gitlab.com/fr0stb1rd/spotufi](https://gitlab.com/fr0stb1rd/spotufi)

## 🎧 What Is Spotufi?

Spotufi is a multi-source Android music player whose default source is Spotify itself. It supports Free and Premium accounts, plays playlists, albums, artists, radios, podcasts and audiobooks, and adds features on top: offline lossless downloads, crossfade, scrobbling, word-synced transcripts and a local listening recap.

| Property           | Value                                                                       |
| :----------------- | :-------------------------------------------------------------------------- |
| Platform           | Android 10 (API 29) or newer                                                |
| Language / UI      | Kotlin, Jetpack Compose, Material 3                                         |
| Architecture       | MVVM, manual dependency injection, 5 Gradle modules                         |
| Playback engine    | Spotify Web Player in a headless Chromium WebView (Widevine)                |
| System integration | Media3 `MediaLibraryService` (notification, lock screen, headset, Android Auto) |
| Languages          | 13                                                                          |
| License            | GPL-3.0-or-later                                                            |

## 🔊 What Actually Plays

A common assumption is that an app like this resolves a song on Spotify and streams a match from elsewhere. Spotufi has four distinct audio paths, and only one of them is the default:

| Path                            | When it is used                                                                  | Where the audio comes from                                                                                          |
| :------------------------------ | :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Spotify Web Player** (default) | Every normal play: playlists, albums, artists, radios, podcasts, audiobooks      | Spotify's own CDN, decrypted by the device's Widevine module. Same recording as the official app.                   |
| **BitChord / NewPipe fallback** | Only when Spotify refuses: a `402` licence or country restriction, or a device without usable Widevine | A matched track from another source, so playback does not stop. A rescue path, not the engine. |
| **Lossless FLAC**               | Only for downloads the user requests                                             | SpotiFLAC resolves the same recording from TIDAL, Qobuz or Amazon and verifies it by ISRC (or title and artist within 3 s). |
| **Local files**                 | Audio files on the device                                                        | Device storage, played through Media3 ExoPlayer.                                                                    |

:::note
Streaming quality follows the Web Player's own levels: Auto, Low, Normal and High. There is no artificial "320 kbps" switch; the engine plays what Spotify serves. Lossless audio belongs to the download path, not the stream.
:::

## 🏗️ Architecture

Spotufi is MVVM over Jetpack Compose, split so that the UI never depends on the playback host. All Android modules live under `base/`.

| Module          | Type                                | Purpose                                                                  |
| :-------------- | :---------------------------------- | :----------------------------------------------------------------------- |
| `:app`          | Android app (compileSdk 37, minSdk 29) | UI, navigation, ViewModels, DI, downloads, lyrics, scrobbling         |
| `:api`          | Pure JVM library                    | Interfaces and data models between the UI and the engine; no Android or Spotify details |
| `:api-spotify`  | JVM library                         | `SpotifyApi`: the implementation of `:api`, GraphQL client and bridge protocol |
| `:host-android` | Android library                     | WebView host (`WebPlayerHost`), `PlaybackService`, network stack         |
| `:host-cdp`     | Pure JVM library                    | Desktop Chrome host over the DevTools Protocol, for automated live tests |

The `:app` module talks to playback only through `:api`. `:host-android` and `:host-cdp` are two implementations of the same host contract, which is why the same bridge script, and the same API layer above it, can run against a real phone or against desktop Chrome in live tests. Dependency wiring is manual: a single `Graph` object, with no annotation-processing framework.

### The Player Bridge

The core trick is a small script, `player-bridge.js`, injected into the official Web Player page. It does not patch the page. It walks React's context tree to find the page's own service registry, then calls the services the page already uses (`PlayerAPI`, `PlaybackAPI`, `LibraryAPI`, `TokenProvider`).

| Direction    | Android                                                                                  | Desktop (CDP)                            |
| :----------- | :--------------------------------------------------------------------------------------- | :--------------------------------------- |
| Host → page  | `evaluateJavascript("Myspoti.call(id, method, args)")`                                   | `Runtime.evaluate`, same call            |
| Page → host  | `MyspotiHost.postMessage(json)` (web message listener, restricted to `open.spotify.com`) | `Runtime.addBinding("__mspHostPost")`    |

Messages from the page are single JSON strings: `ready`, `state`, `queue`, `result` (with a call `id`) and `error`. The player state carries the track, context URI, pause and buffering flags, the position with the timestamp it was sampled at (the host extrapolates while playing), duration, shuffle, repeat mode, speed, `restrictions` and a `playbackId`.

Some design details that matter in practice:

- **Request/response over a message channel.** Each command gets an incrementing id and a `CompletableDeferred`. Android's `evaluateJavascript` does not wait for Promises, so results always arrive as `result` messages.
- **Backpressure by design.** Event flows use `DROP_OLDEST`. During a main-thread stall the newest state is the only one that matters, and the default `SUSPEND` policy would drop exactly that value.
- **Tolerance for hostile input.** The collector that handles page messages runs on the main thread, where an uncaught exception kills the app. Every message is handled inside `runCatching`, and malformed ones are logged and dropped.
- **Restrictions are respected.** Commands can be refused by the page's `restrictions` (for example while the next track loads), and the error says so.

### From Tap to Sound

1. The user taps a track and the Compose UI calls `play(contextUri, trackUri)` on the API layer.
2. The Kotlin bridge assigns a call id and runs `Myspoti.call` in the WebView through `evaluateJavascript`.
3. `player-bridge.js` forwards the call to the page's own `PlayerAPI` and `PlaybackAPI` services.
4. The Web Player requests the audio and a Widevine licence from Spotify's CDN and licence server, and receives the encrypted stream.
5. State changes travel back as `postMessage` JSON, update a `StateFlow`, and recompose the UI.

Spotify keeps ownership of the session. Next, previous, shuffle, repeat and the queue are Spotify's own, so playback stays in sync with the account and with other devices. If another Spotify Connect device takes over playback, Spotufi pulls it back. A Media3 `PlaybackService` mirrors that session to the notification, lock screen, headset buttons and Android Auto.

### Reads vs. Writes

The `:api-spotify` layer splits traffic by purpose:

- **Reads** (search, catalog, home, library lists, lyrics, user data) go straight to Spotify over HTTP using the page's web token plus a client token minted by the app. The GraphQL surface is large: `SpotifyApi.raw` can reach all **179 GraphQL operations** of the current Web Player build, and **89 page services** for anything that is not typed yet. Operation hashes live in `gql-ops.json` and are refreshed by a tool that reads the public bundles.
- **Writes and playback** (play, queue edits, library saves, folders, Connect, Jam) go through the page's own services via the bridge.

The `docs/api/` folder in the repository documents the captured session flow, GraphQL variables and capability coverage.

## ✨ Features

### ▶️ Playback

- Real Spotify account and real Spotify stream (Free or Premium)
- Playlists, albums, artists, radios, podcasts, shows and audiobooks
- Queue with drag-to-reorder, play next and insert-before, plus Spotify's own shuffle and repeat
- Session restore: queue, track and position survive a restart
- Sleep timer and autoplay/radio built on real Spotify recommendations
- Crossfade from 0 to 12 s (a fade, not an overlap)
- Mini player with dynamic album-art colors and a draggable seek bar
- Jam: start a session and share the invite link, or join with a QR scan or a pasted link

### 🔍 Discovery and Library

- Personalized home feed with filters (All, Music, Podcasts, Audiobooks)
- Search across tracks, albums, artists, playlists and podcasts, with genre categories and curated playlists
- Artist pages with biography, verified badge, discography and related artists
- Taste profile: exclude a track or artist from radios and mixes
- Canvas video loops with a battery saver toggle
- One library for liked songs, saved albums, followed artists and playlists, in list or grid layout with custom order

### 📝 Lyrics

The lyrics resolver tries sources in a fixed order:

1. **Spotify's own color-lyrics**, looked up by track id: the same text, colors and credits as the official app.
2. **LRCLIB**, an open fallback (line-synced or plain). A fallback result is kept only when title, artist and length match the track.
3. **NetEase and Genius**, opt-in and off by default.

The full-screen view supports auto-scroll, tap-any-line to seek, optional line translation, background prefetch and a persistent lyrics cache.

### 🎙️ Podcasts and Audiobooks

- Episode progress bars on show pages, episode pages and Home, matching the Spotify web player
- Playback speed from 0.5x to 3.5x, skip buttons and a sleep timer
- **Transcripts** with a word-level preview and a full reader: speaker labels, playback highlighting, auto-follow and copy

### 📻 Scrobbling and History

Three services are supported, each with its own switches and thresholds: **Last.fm**, **ListenBrainz** and **Libre.fm**. Now-playing updates and scrobbles are sent in batches, and accepted or ignored answers are read back from the API with a hint when the session is bad.

| Service      | Qualifying threshold                                                          |
| :----------- | :---------------------------------------------------------------------------- |
| Last.fm      | `min(duration × percent, maxSeconds)`, percent clamped to 10–100, max clamped to 30–180 s |
| ListenBrainz | `min(duration / 2, 4 min)`                                                    |

Qualified listens go into a persistent **outbox** first, so they survive network failures and process restarts. When a send fails, the entry's attempt counter increases and it is retried later with backoff. Each entry has a deterministic id (`service | account | track | startedAt`), so enqueueing the same listen twice is a no-op.

Alongside this, a **Recents** screen and a local **Recap** (30 days, 12 months or all time) are built from the app's own listen history, with minutes split by source: Spotify, downloads and local files.

### 🎨 Interface and Platform

- Material 3 with accent colors and a pure-black AMOLED theme
- Solid or translucent bottom bars, portrait, landscape or auto-rotate
- Android Auto through `MediaLibraryService`
- Built-in updater that checks GitLab releases
- Developer tools: engine status, log copy, player restart and a recovery test
- **13 languages:** English, Turkish, Azerbaijani, German, Spanish, French, Italian, Portuguese, Russian, Indonesian, Japanese, Simplified Chinese and Hindi

## 💾 Offline: Downloads, Cache and Data Saver

### Lossless Downloads

Downloads do not re-record or re-encode anything. A request is resolved to the same recording on a lossless catalog, and the file is stored as served.

| Setting          | Options                                                                  |
| :--------------- | :----------------------------------------------------------------------- |
| Download quality | Off, small AAC, FLAC 16-bit, FLAC 24-bit, or ask each time               |
| Match rule       | ISRC first; otherwise title and artist with duration within 3 s          |
| Sources          | SpotiFLAC resolves through TIDAL (DASH), Qobuz and Amazon                |

**DASH without ffmpeg.** Hi-res FLAC arrives as a segmented DASH manifest. The segments are fragmented MP4 carrying raw FLAC frames, so the app builds a real `.flac` file directly:

1. Take STREAMINFO from the init segment's `dfLa` box.
2. Concatenate every media segment's `mdat` payload (the FLAC frames), downloading a few segments in parallel.
3. Write `fLaC`, the STREAMINFO metadata block, then the frames.

### Encrypted Storage

Downloaded files are not plain audio on disk. They use AES-CTR with a random per-file key, stored wrapped by an Android Keystore key that never leaves the device. The file layout is `MSE1`, a 16-byte IV, then the ciphertext. CTR mode keeps random access cheap, so seeking inside an encrypted file works without decrypting from the start. Copied out of the app, a file is just noise.

### Playback Cache and Preloading

- Playback cache with a storage cap from 500 MB to 5 GB, or unlimited
- `PlaybackCacheManager` is a serial, **latest-queue-wins** preloader: requests go through a conflated channel, so a fast-changing queue never piles up cache I/O
- `QueuePreloader` watches the active queue and caches the current and upcoming tracks proactively

### Data Saver

On mobile data or any metered network (never on Wi-Fi), the Data Saver switch makes the app behave as if offline. Every connection is refused, the hidden Spotify player is shut down, and only downloads and local files play. Back on Wi-Fi, the player is rebuilt.

## 🧩 Engineering Notes

- **Local files take over cleanly.** `LocalPlayer` (ExoPlayer) pauses the Spotify engine while it is active, and the `SongPlayer` facade routes controls from the player, mini player and notification to whichever engine is current.
- **Rate-limit awareness.** The host tracks audio-licence `429` answers in a sliding window. After a burst it pauses further attempts for a growing interval and exposes `licenseLimitedUntil` to the app, instead of feeding a retry storm.
- **Diagnosing refusals.** Some free accounts get `402 COMMAND_FAILED` on Connect commands. A dedicated diagnostic summary groups answers per route (latency, headers, error type, and whether a success on another route really started audio within 10 s). It holds no ids, tokens or addresses.
- **Measurement-driven Compose work.** The repository contains a Compose compiler audit of 231 composables and 3,494 composable arguments, plus focused fixes such as list keys, content types on lazy rows and scroll-phase reads moved out of composition. The reports state their limits: no runtime gain is claimed without measurements. The universal release APK is about 16.9 MB (arm64-v8a about 14.6 MB).

## 🛡️ Privacy and Crash Reports

Spotufi is distributed outside Google Play, so nobody is told when it crashes on a given phone. To fix that, release builds can send crash reports through [measure.sh](https://measure.sh), which is open source under Apache-2.0.

- **On by default**, explained once on the setup screen after sign-in. **Settings → Send crash reports** turns it off, which stops the SDK entirely.
- **Sent:** crashes (Kotlin/Java and native), ANRs, survived errors that indicate real faults, device model, Android and app version, locale, and recent screens and taps.
- **Never sent:** Spotify account, password, tokens, library, playlists or listening history. Network URLs are not collected.
- Debug builds and forks without credentials contain no reporting at all.

## 🚀 Installation

| Source                                                                                                  | Notes                                           |
| :------------------------------------------------------------------------------------------------------ | :---------------------------------------------- |
| [Obtainium](https://apps.obtainium.imranr.dev/redirect?r=obtainium://add/https://gitlab.com/fr0stb1rd/spotufi/) | Tracks GitLab releases and updates automatically |
| [GitLab Releases](https://gitlab.com/fr0stb1rd/spotufi/-/releases)                                      | Manual download                                 |

Release APKs are split per ABI (`arm64-v8a`, `armeabi-v7a`, `x86_64`, `x86`) with a universal build alongside, plus SHA-256 checksums. After installation the app can update itself: the checker queries GitLab releases at most once every three hours, shows the release notes from the matching `CHANGELOG.md` section, then downloads and installs the signed APK.

### Build from Source

Prerequisites: JDK 21 LTS and Android SDK 37.

```bash
git clone https://gitlab.com/fr0stb1rd/spotufi.git
cd spotufi/base
./gradlew assembleDebug --warning-mode all

# release build
./gradlew :app:assembleRelease --no-daemon --warning-mode all

# unit tests
./gradlew testDebugUnitTest :api:test :api-spotify:test :host-cdp:test --warning-mode all
```

Debug APKs land in `base/app/build/outputs/apk/debug/`. All dependency and toolchain versions live in `base/gradle/libs.versions.toml` and the Gradle wrapper.

## ⚖️ Limits and Trade-offs

:::warning
The engine drives an official web page through its internal services. That is what makes the stream authentic, but it also ties the project to the Web Player's structure. A change on Spotify's side can break the bridge or the GraphQL operation hashes until they are updated.
:::

- Streaming quality is the Web Player's, not an arbitrary bitrate setting.
- Jam: Spotify answers `RESTRICTED` when a free account tries to **start** a Jam; joining and the rest are wired.
- Private session is not supported by the Web Player, and friend activity returns an empty list.
- Disallowed or region-locked tracks trigger the fallback engine, which is a different source by definition.
- Spotufi is not affiliated with or endorsed by Spotify AB. The project is for educational purposes, and users are encouraged to support artists through Spotify Premium and official purchases.

## 🙏 Credits and License

Spotufi builds on several open-source projects: [Spotifusion](https://github.com/p1di/spotifusion), [SpotiDuck](https://github.com/SpotiDuck), [Myspoti / Spotui](https://github.com/kota-zo/myspoti) (Web Player WebView bridge architecture), [BitChord](https://github.com/kushagrasinghx/BitChord) and [NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor) (fallback path), [SpotiFLAC](https://github.com/spotbye/SpotiFLAC) (lossless resolving), [LRCLIB](https://lrclib.net) (synced lyrics), [Measure](https://github.com/measure-sh/measure) (crash reporting), [SimpMusic](https://github.com/maxrave-dev/SimpMusic) (crossfade and audio filters), [Metrolist](https://github.com/mostafaalagamy/Metrolist), [Meld](https://github.com/FrancescoGrazioso/Meld), [Neptune](https://github.com/navneet851/spotify-clone-jetpack-compose) and the Spotui forks. Full notices are in `THIRD_PARTY_NOTICES.md`.

Spotufi is free software under the **GNU GPL v3 or later**.

Ready to try it? [Get Spotufi on GitLab!](https://gitlab.com/fr0stb1rd/spotufi)
