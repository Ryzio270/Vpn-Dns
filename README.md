# ⚔️ ArcaneQuest — AI Dungeon Master for Android

An endless, AI-narrated tabletop RPG in your pocket. An AI Dungeon Master runs the
world, rolls the dice, hands out loot with invented stats, and writes a living
encyclopedia of your campaign as you play.

## 📲 Download the APK

Every push builds a signed APK automatically:

1. Go to this repo's **Releases** page and grab `app-release.apk` from the
   **"ArcaneQuest APK (latest build)"** release, or download the
   `ArcaneQuest-APK` artifact from the latest **Actions** run.
2. Open the file on your Android phone (Android 8.0+).
3. Allow "install from unknown sources" if prompted. Play.

No API key or account needed — the default AI provider (Pollinations) is free and
keyless. You can switch to DeepSeek, OpenRouter, Groq, or any OpenAI-compatible
endpoint in **Settings**.

## ✨ Features

- **6 campaign save slots** — run multiple campaigns side by side; progress
  auto-saves after every scene.
- **Campaign setup wizard** — choose the world description, technology level
  (Stone Age → Space Fantasy), magic level, campaign vibe (Grimdark, Heist,
  Horror, Comedy...), difficulty, and create your character with rolled
  4d6-drop-lowest ability scores.
- **Cinematic storytelling** — narration types itself across the screen in
  smooth motion and always trails off in an ellipsis... then you pick one of
  **3 AI-generated choices** or type anything you want.
- **Simulated dice rolls** — when the outcome is uncertain (combat,
  investigation, persuasion, stealth...), the DM rolls: `d20: 13 + 3 = 16 ·
  SUCCESS`, with critical successes and failures shaping the story.
- **Living inventory** — weapons, armor and gear whose stats are **invented by
  the AI as the story unfolds** (damage dice, armor bonuses, rarity, value).
  Equip/unequip from the inventory tab.
- **World journal** — the AI automatically writes encyclopedia entries for key
  **characters, factions, regions, nations, cities and lore**, and updates them
  as the story evolves.
- **Character sheet** — HP, XP with level-ups, gold, six ability scores, and
  perks the AI awards for memorable deeds.

## 🛠 Building it yourself

```bash
./gradlew assembleRelease
# APK lands in app/build/outputs/apk/release/app-release.apk
```

Kotlin + Jetpack Compose, min SDK 26 (Android 8.0), target SDK 35.

> Note: `keystore/arcanequest.keystore` is a throwaway signing key committed so
> CI can produce installable builds. Don't use it for Play Store publishing.
