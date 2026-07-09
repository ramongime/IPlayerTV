import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeAccountId: null,
      setActiveAccountId: (id) => set({ activeAccountId: id }),
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'iplayertv-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ activeAccountId: state.activeAccountId }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
