import { create } from 'zustand';
import type { Account, ContentType } from '@shared/domain';

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
  enableSearchAll: boolean;
  setEnableSearchAll: (value: boolean) => void;
  hiddenCategories: Set<string>;
  toggleHiddenCategory: (categoryId: string) => void;
  loadHiddenCategories: (accountId: string, tab: ContentType) => void;
}

function getHiddenKey(accountId: string, tab: ContentType) {
  return `iplayertv_hidden_${accountId}_${tab}`;
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
  setError: (error) => set({ error }),
  enableSearchAll: false,
  setEnableSearchAll: (enableSearchAll) => set({ enableSearchAll }),
  hiddenCategories: new Set(),
  toggleHiddenCategory: (categoryId) => set((state) => {
    const next = new Set(state.hiddenCategories);
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    // Persist
    if (state.activeAccountId) {
      localStorage.setItem(getHiddenKey(state.activeAccountId, state.activeTab), JSON.stringify([...next]));
    }
    return { hiddenCategories: next };
  }),
  loadHiddenCategories: (accountId, tab) => set(() => {
    try {
      const raw = localStorage.getItem(getHiddenKey(accountId, tab));
      return { hiddenCategories: raw ? new Set(JSON.parse(raw)) : new Set() };
    } catch {
      return { hiddenCategories: new Set() };
    }
  })
}));
