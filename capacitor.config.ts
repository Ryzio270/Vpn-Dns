import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.solodm.dungeonmaster',
  appName: 'Solo DM',
  webDir: 'dist',
  android: {
    // The app is dark-themed; keep the WebView background dark so there is no
    // white flash between the splash screen and first paint.
    backgroundColor: '#0b0a0f',
  },
}

export default config
