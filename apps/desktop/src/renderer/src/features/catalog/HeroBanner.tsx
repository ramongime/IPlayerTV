import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { StreamItem } from '@iplayertv/core';

interface HeroBannerProps {
  stream: StreamItem;
  activeTab: 'live' | 'movie' | 'series';
  onPlay: (stream: StreamItem) => void;
  onMoreInfo: (stream: StreamItem) => void;
}

export function HeroBanner({ stream, activeTab, onPlay, onMoreInfo }: HeroBannerProps) {
  const { t } = useTranslation();

  return (
    <div className="hero-banner" style={{
      position: 'relative',
      height: '350px',
      borderRadius: '24px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'flex-end',
      padding: '40px',
      backgroundImage: `linear-gradient(to top, rgba(7, 17, 31, 1) 0%, rgba(7, 17, 31, 0) 100%), url(${stream.cover || stream.stream_icon})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
        <h1 style={{ fontSize: '42px', margin: '0 0 12px 0', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{stream.name}</h1>
        <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#cbd5e1', textShadow: '0 1px 4px rgba(0,0,0,0.8)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {stream.plot || t('common.noDescription')}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="primary-button" onClick={() => {
            if (activeTab === 'series') {
              onMoreInfo(stream);
            } else {
              onPlay(stream);
            }
          }}>{t('common.playNow')}</button>
          <button className="ghost-button" onClick={() => onMoreInfo(stream)}>
            {t('common.moreInfo')}
          </button>
        </div>
      </div>
    </div>
  );
}
