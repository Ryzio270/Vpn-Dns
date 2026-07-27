import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { CampaignLayout } from '@/screens/CampaignLayout'
import { CampaignManager } from '@/screens/CampaignManager'
import { CharacterSheet } from '@/screens/CharacterSheet'
import { Compendium } from '@/screens/Compendium'
import { Inventory } from '@/screens/Inventory'
import { Play } from '@/screens/Play'
import { QuestJournal } from '@/screens/QuestJournal'
import { Settings } from '@/screens/Settings'

/**
 * HashRouter rather than BrowserRouter: the production bundle is loaded by a
 * native WebView with no server to rewrite deep links.
 */
function App() {
  return (
    <HashRouter>
      <div className="relative h-full overflow-hidden bg-background">
        <Routes>
          <Route path="/" element={<CampaignManager />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/c/:campaignId" element={<CampaignLayout />}>
            <Route index element={<Navigate to="story" replace />} />
            <Route path="story" element={<Play />} />
            <Route path="character" element={<CharacterSheet />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="quests" element={<QuestJournal />} />
            <Route path="compendium" element={<Compendium />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Toaster />
    </HashRouter>
  )
}

export default App
