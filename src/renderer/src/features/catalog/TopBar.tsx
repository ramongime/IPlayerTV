import type { ContentType, ShelfView } from '@shared/domain';

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

const tabs: { key: ContentType; label: string }[] = [
  { key: 'live', label: 'Ao vivo' },
  { key: 'movie', label: 'Filmes' },
  { key: 'series', label: 'Séries' }
];

export function TopBar({ search, shelfView, activeTab, onSearchChange, onShelfChange, onTabChange, onOpenSettings, onToggleSidebar }: TopBarProps) {
  return (
    <header className="topbar">
      <button className="ghost-button" onClick={onToggleSidebar} style={{ padding: '12px 16px', fontSize: '18px' }}>
        ☰
      </button>
      <div className="segmented-control">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`ghost-button ${activeTab === tab.key ? 'segmented-active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <input
        className="search-input"
        placeholder="Buscar canal, filme, série ou episódio"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ flex: 1, minWidth: '200px' }}
      />

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginLeft: '16px' }}>
        <button
          className={`ghost-button ${shelfView === 'history' ? 'segmented-active' : ''}`}
          onClick={() => onShelfChange('history')}
          title="Histórico"
          style={{ padding: '8px', border: 'none', background: 'transparent', color: shelfView === 'history' ? '#4cc9f0' : '#9db2c7' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </button>
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>
        <button
          className="ghost-button"
          onClick={onOpenSettings}
          title="Configurações"
          style={{ padding: '8px', border: 'none', background: 'transparent', color: '#9db2c7' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </button>
      </div>
    </header>
  );
}
