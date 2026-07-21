import { useTranslation } from 'react-i18next';
import { ContentType } from '@iplayertv/core';
import defaultLogo from '@/assets/icon.png';

interface GlobalNavProps {
  activeTab: ContentType;
  onTabChange: (tab: ContentType) => void;
  onOpenSettings: () => void;
  logoSrc?: string;
}

export function GlobalNav({ activeTab, onTabChange, onOpenSettings, logoSrc }: GlobalNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="global-nav">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <img 
          src={logoSrc || defaultLogo} 
          alt="Logo" 
          style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <NavIcon 
            active={activeTab === 'live'} 
            onClick={() => onTabChange('live')}
            title="TV Ao Vivo"
          >
            📺
          </NavIcon>
          <NavIcon 
            active={activeTab === 'movie'} 
            onClick={() => onTabChange('movie')}
            title="Filmes"
          >
            🎬
          </NavIcon>
          <NavIcon 
            active={activeTab === 'series'} 
            onClick={() => onTabChange('series')}
            title="Séries"
          >
            📽️
          </NavIcon>
        </div>
      </div>
      <div>
        <NavIcon active={false} onClick={onOpenSettings} title="Configurações">
          ⚙️
        </NavIcon>
      </div>
    </nav>
  );
}

function NavIcon({ active, onClick, children, title }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: active ? 'rgba(76, 201, 240, 0.2)' : 'transparent',
        color: active ? '#4cc9f0' : 'rgba(255, 255, 255, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      }}
      onMouseOut={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
