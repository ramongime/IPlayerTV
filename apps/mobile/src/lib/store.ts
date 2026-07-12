import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
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

// Sensitive values live in the OS keychain/keystore, not in plaintext AsyncStorage
// (see security-reactnative). expo-secure-store works in Expo Go.
const SECURE_KEYS = { parentalPin: 'parentalPin', tmdbApiKey: 'tmdbApiKey' } as const;

async function secureWrite(key: string, value?: string) {
  try {
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.warn(`SecureStore write failed for ${key}:`, e);
  }
}

async function secureRead(key: string): Promise<string | undefined> {
  try {
    return (await SecureStore.getItemAsync(key)) ?? undefined;
  } catch (e) {
    console.warn(`SecureStore read failed for ${key}:`, e);
    return undefined;
  }
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
      setParentalPin: (pin) => {
        set({ parentalPin: pin });
        void secureWrite(SECURE_KEYS.parentalPin, pin);
      },
      tmdbApiKey: undefined,
      setTmdbApiKey: (key) => {
        set({ tmdbApiKey: key });
        void secureWrite(SECURE_KEYS.tmdbApiKey, key);
      },
    }),
    {
      name: 'iplayertv-app',
      storage: createJSONStorage(() => AsyncStorage),
      // parentalPin/tmdbApiKey are intentionally excluded — they live in SecureStore.
      partialize: (state) => ({
        activeAccountId: state.activeAccountId,
        hiddenCategories: state.hiddenCategories,
      }),
      onRehydrateStorage: () => (state) => {
        void (async () => {
          // One-time migration: pull any pre-existing plaintext values (from the old
          // AsyncStorage blob) into SecureStore, then load from SecureStore.
          const legacyPin = state?.parentalPin;
          const legacyKey = state?.tmdbApiKey;

          let pin = await secureRead(SECURE_KEYS.parentalPin);
          if (!pin && legacyPin) {
            pin = legacyPin;
            await secureWrite(SECURE_KEYS.parentalPin, legacyPin);
          }

          let apiKey = await secureRead(SECURE_KEYS.tmdbApiKey);
          if (!apiKey && legacyKey) {
            apiKey = legacyKey;
            await secureWrite(SECURE_KEYS.tmdbApiKey, legacyKey);
          }

          useAppStore.setState({ parentalPin: pin, tmdbApiKey: apiKey });
          state?.setHasHydrated(true);
        })();
      },
    }
  )
);
