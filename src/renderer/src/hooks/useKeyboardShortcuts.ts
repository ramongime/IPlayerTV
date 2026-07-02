import { useEffect } from 'react';
import type { ShelfView, ContentType } from '@shared/domain';

interface UseKeyboardShortcutsParams {
  shelfView: ShelfView;
  setShelfView: (view: ShelfView) => void;
  setActiveTab: (tab: ContentType) => void;
  closeModals: () => void;
}

export function useKeyboardShortcuts({ shelfView, setShelfView, setActiveTab, closeModals }: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === '/' || (e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.search-input')?.focus();
      }
      if (e.key === '1') setActiveTab('live');
      if (e.key === '2') setActiveTab('movie');
      if (e.key === '3') setActiveTab('series');
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) setShelfView(shelfView === 'favorites' ? 'catalog' : 'favorites');

      if (e.key === 'Escape') {
        closeModals();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shelfView, setShelfView, setActiveTab, closeModals]);
}
