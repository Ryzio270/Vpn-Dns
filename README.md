# Solo DM — AI Dungeon Master

A solo tabletop-RPG companion where an AI runs the game. You play through a
chat-style story screen; inventory, quests and world lore fill themselves in as
the story goes, and the whole thing packages as an installable Android APK.

## How it works

Every player turn fires three separately-prompted agents:

| Agent | Job | Blocking? |
|---|---|---|
| **Story** | Writes the DM prose | Yes — it *is* the turn |
| **Bookkeeper** | Extracts state changes as strict JSON (items, quests, lore, HP/XP) | No — runs after, surfaces as toasts |
| **Narrative Director** | Maintains the story bible and writes a brief that steers the next turn | No |

Each agent points at its own provider and model, configured independently in
Settings, so one provider's rate limit can't stall the whole app.

Per-turn context is bounded: setting, director brief, keyword-matched compendium
entries, character sheet, active quests, and the last N exchanges — never full
history. Token cost per turn stays roughly flat however long the campaign runs.

## Stack

React 18 + TypeScript + Vite · Tailwind + shadcn/ui (vendored) + lucide-react ·
Zustand · Dexie (IndexedDB) · Framer Motion · react-router-dom · Capacitor 6.

## AI providers

Two OpenAI-compatible providers, both free-tier:

- **OpenRouter** — `https://openrouter.ai/api/v1`. Key required (free from
  [openrouter.ai/keys](https://openrouter.ai/keys)). 20 req/min; 50 req/day
  unfunded, or 1,000/day permanently after a one-time $10 credit purchase.
- **Pollinations** — `https://gen.pollinations.ai/v1`. Works anonymously at
  1 req/15s; a free account at [auth.pollinations.ai](https://auth.pollinations.ai)
  unlocks 1 req/5s.

Defaults spread the load: Story on OpenRouter, Bookkeeper entirely on
Pollinations (keeping its per-turn JSON calls off OpenRouter's daily budget),
Director on a lighter OpenRouter model — each with a fallback chain.

**Free model rosters on both providers rotate without notice.** The bundled
model lists are suggestions only. Each agent card in Settings has a refresh
button that fetches the provider's live `/v1/models` and filters to what
currently looks free — use it rather than trusting a hardcoded id.

Keys are stored on-device via Capacitor Preferences. Nothing is committed or
bundled.

### Resilience

Every agent call retries once with backoff, then falls through that agent's
fallback chain, then surfaces a clear inline error. Requests to each provider
are additionally paced with a minimum gap (three agents firing at once would
otherwise rate-limit each other on turn one).

To verify the fallback actually works: point an agent's primary at a made-up
model id in Settings and hit its connection test. It should report success via
the next entry in the chain.

## Development

```bash
npm install
npm run dev        # browser preview — Dexie and Preferences both work on web
npm run build      # typecheck + production bundle
```

## Building the APK

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

The gradle step needs a local Android SDK (Android Studio, or the command-line
tools with `ANDROID_HOME` set). Everything up to and including `cap sync` runs
anywhere.

If you'd rather not install the SDK, `.github/workflows/android.yml` builds the
debug APK on a GitHub runner and uploads it as a downloadable artifact — run it
from the Actions tab.

`INTERNET` is declared in `android/app/src/main/AndroidManifest.xml` (verified,
not assumed). Both providers are plain HTTPS, so no cleartext-traffic or
network-security-config exemption is needed.

### Release builds

Generate a keystore and create `android/keystore.properties` (gitignored):

```bash
keytool -genkey -v -keystore android/release.keystore \
  -alias solodm -keyalg RSA -keysize 2048 -validity 10000
```

```properties
storeFile=release.keystore
storePassword=…
keyAlias=solodm
keyPassword=…
```

Then `cd android && ./gradlew assembleRelease`. Without that file, only debug
builds are configured — `build.gradle` skips the signing config rather than
failing obscurely.

## Data & saves

One Dexie database, every table keyed by `campaignId`, so campaigns are fully
isolated. Each campaign exports to a single JSON file (Documents on Android, a
browser download on web) which doubles as backup and save slot. Importing always
creates a new campaign — it never overwrites an existing one.

"Load example campaign" seeds a playable dark-fantasy setting so the Story,
Inventory, Quests and Compendium screens have something real to render on first
run. It's a button, not a default.

## Layout

```
src/
  ai/
    providers/    openAICompatible.ts, index.ts (registry + model discovery)
    agents/       storyAgent.ts, bookkeeperAgent.ts, directorAgent.ts
    resilientChat.ts   retry + fallback + per-provider pacing
    orchestrator.ts    the three-agent turn
  db/             schema.ts, repository.ts, contextBuilder.ts, stateUpdates.ts,
                  transfer.ts (export/import), seed.ts
  components/ui   vendored shadcn primitives
  components/app  StoryBubble, ItemCard, QuestCard, LoreCard, BottomNav…
  screens/        CampaignManager, Play, CharacterSheet, Inventory,
                  QuestJournal, Compendium, Settings
  store/          campaignStore, uiStore, settingsStore
```
