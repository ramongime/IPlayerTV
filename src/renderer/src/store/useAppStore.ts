import { create } from 'zustand';
import type { Account, ContentType } from '@/lib/types';

interface AppState {
  accounts: Account[];
  activeAccountId?: string;
  activeTab: ContentType;
  search: string;
  loading: boolean;
  error?: string;
  setAccounts: (accounts: Account[]) => void;
  setActiveAccountId: (id?: string) => void;
  setActiveTab: (tab: ContentType) => void;
  setSearch: (value: string) => void;
  setLoading: (value: boolean) => void;
  setError: (value?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  accounts: [],
  activeTab: 'live',
  search: '',
  loading: false,
  setAccounts: (accounts) => set((state) => ({
    accounts,
    activeAccountId: state.activeAccountId && accounts.some((item) => item.id === state.activeAccountId)
      ? state.activeAccountId
      : accounts[0]?.id
  })),
  setActiveAccountId: (activeAccountId) => set({ activeAccountId }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearch: (search) => set({ search }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
