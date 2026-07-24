import type { ContentType, ShelfView } from '@iplayertv/core';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';

interface TopBarProps {
  search: string;
  shelfView: ShelfView;
  activeTab: ContentType;
  onSearchChange: (value: string) => void;
  onShelfChange: (value: ShelfView) => void;
  onTabChange: (tab: ContentType) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export function TopBar({ search, shelfView, activeTab, onSearchChange, onShelfChange, onTabChange, onOpenSettings, onToggleSidebar }: TopBarProps) {
  const { t } = useTranslation();
  const setSearchModalOpen = useAppStore(state => state.setSearchModalOpen);
  
  return (
    <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', background: '#0f172a', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <button className="ghost-button" onClick={onToggleSidebar} style={{ padding: '8px 12px', fontSize: '18px', borderRadius: '8px', cursor: 'pointer' }}>
        ☰
      </button>
      <div style={{ fontWeight: 700, fontSize: '18px', color: '#f8fafc' }}>
        {activeTab === 'live' ? t('tabs.live', 'TV Ao Vivo') : activeTab === 'movie' ? t('tabs.movie', 'Filmes') : t('tabs.series', 'Séries')}
      </div>

      <div
        className="search-input-trigger"
        onClick={() => setSearchModalOpen(true)}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          padding: '8px 14px',
          cursor: 'pointer',
          color: '#94a3b8',
          fontSize: '14px',
          maxWidth: '500px',
        }}
      >
        <span>🔍</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {search || t('common.search', 'Buscar tudo... (Cmd+K)')}
        </span>
        <kbd style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#94a3b8' }}>
          ⌘K
        </kbd>
      </div>
    </header>
  );
}
