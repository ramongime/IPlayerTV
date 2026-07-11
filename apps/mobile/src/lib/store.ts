import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  hiddenCategories: Record<string, string[]>; // "accountId:contentType" -> ["cat_id", ...]
  toggleHiddenCategory: (accountId: string, contentType: string, categoryId: string) => void;
  parentalPin?: string;
  setParentalPin: (pin?: string) => void;
  tmdbApiKey?: string;
  setTmdbApiKey: (key?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeAccountId: null,
      setActiveAccountId: (id) => set({ activeAccountId: id }),
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      hiddenCategories: {},
      toggleHiddenCategory: (accountId, contentType, categoryId) => set((state) => {
        const key = `${accountId}:${contentType}`;
        const current = state.hiddenCategories[key] || [];
        const next = current.includes(categoryId)
          ? current.filter(id => id !== categoryId)
          : [...current, categoryId];
        return { hiddenCategories: { ...state.hiddenCategories, [key]: next } };
      }),
      parentalPin: undefined,
      setParentalPin: (pin) => set({ parentalPin: pin }),
      tmdbApiKey: undefined,
      setTmdbApiKey: (key) => set({ tmdbApiKey: key }),
    }),
    {
      name: 'iplayertv-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        activeAccountId: state.activeAccountId,
        hiddenCategories: state.hiddenCategories,
        parentalPin: state.parentalPin,
        tmdbApiKey: state.tmdbApiKey,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
