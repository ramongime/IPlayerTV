import { useTranslation } from 'react-i18next';
import type { ContentType } from '@iplayertv/core';
import { motion } from 'framer-motion';
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
            title={t('tabs.live', 'TV Ao Vivo')}
          >
            📺
          </NavIcon>
          <NavIcon 
            active={activeTab === 'movie'} 
            onClick={() => onTabChange('movie')}
            title={t('tabs.movie', 'Filmes')}
          >
            🎬
          </NavIcon>
          <NavIcon 
            active={activeTab === 'series'} 
            onClick={() => onTabChange('series')}
            title={t('tabs.series', 'Séries')}
          >
            📽️
          </NavIcon>
        </div>
      </div>
      <div>
        <NavIcon active={false} onClick={onOpenSettings} title={t('common.settings', 'Configurações')}>
          ⚙️
        </NavIcon>
      </div>
    </nav>
  );
}

function NavIcon({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        position: 'relative',
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: 'transparent',
        color: active ? '#4cc9f0' : 'rgba(255, 255, 255, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        cursor: 'pointer',
        zIndex: 1,
      }}
    >
      {active && (
        <motion.div
          layoutId="activeNavPill"
          transition={{ type: 'spring' as const, stiffness: 500, damping: 35 }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(76, 201, 240, 0.2)',
            borderRadius: '12px',
            border: '1px solid rgba(76, 201, 240, 0.4)',
            zIndex: -1,
          }}
        />
      )}
      {children}
    </button>
  );
}
