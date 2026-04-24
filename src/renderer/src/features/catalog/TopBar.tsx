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

      <div className="segmented-control">
        <button className={`ghost-button ${shelfView === 'catalog' ? 'segmented-active' : ''}`} onClick={() => onShelfChange('catalog')}>Catálogo</button>
        <button className={`ghost-button ${shelfView === 'favorites' ? 'segmented-active' : ''}`} onClick={() => onShelfChange('favorites')}>Favoritos</button>
        <button className={`ghost-button ${shelfView === 'history' ? 'segmented-active' : ''}`} onClick={() => onShelfChange('history')}>Histórico</button>
      </div>
      <button className="ghost-button" onClick={onOpenSettings}>Configurações</button>
    </header>
  );
}
