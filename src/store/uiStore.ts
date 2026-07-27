import { create } from 'zustand'

export type InventoryView = 'grid' | 'list'

interface UIState {
  inventoryView: InventoryView
  setInventoryView: (view: InventoryView) => void
  compendiumQuery: string
  setCompendiumQuery: (query: string) => void
  compendiumCategory: string
  setCompendiumCategory: (category: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  inventoryView: 'list',
  setInventoryView: (inventoryView) => set({ inventoryView }),
  compendiumQuery: '',
  setCompendiumQuery: (compendiumQuery) => set({ compendiumQuery }),
  compendiumCategory: 'all',
  setCompendiumCategory: (compendiumCategory) => set({ compendiumCategory }),
}))
