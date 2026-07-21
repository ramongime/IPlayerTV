import type { ContentType, ShelfView } from '@iplayertv/core';
import { useTranslation } from 'react-i18next';

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
  
  return (
    <header className="topbar">
      <button className="ghost-button" onClick={onToggleSidebar} style={{ padding: '12px 16px', fontSize: '18px' }}>
        ☰
      </button>
      <div style={{ fontWeight: 600, fontSize: '18px', color: '#fff', marginLeft: '8px' }}>
        {activeTab === 'live' ? t('tabs.live') : activeTab === 'movie' ? t('tabs.movie') : t('tabs.series')}
      </div>

      <input
        className="search-input"
        placeholder={t('common.search')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ flex: 1, minWidth: '200px' }}
      />

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginLeft: '16px' }}>
      </div>
    </header>
  );
}
