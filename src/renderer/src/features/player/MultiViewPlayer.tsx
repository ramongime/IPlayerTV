import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface MultiViewPlayerProps {
  streams: Array<{ url: string; title: string; id: string }>;
  minimized?: boolean;
  onMinimize?: () => void;
  onClose: () => void;
  onRemoveStream: (id: string) => void;
}

function HlsVideo({ url, active, onClick }: { url: string; active: boolean; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls;

    if (Hls.isSupported() && url.includes('.m3u8')) {
      hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          if (err.name !== 'AbortError') console.error('HLS Play error', err);
        });
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !url.includes('.m3u8')) {
      video.src = url;
      video.play().catch((err) => {
        if (err.name !== 'AbortError') console.error('Native Play error', err);
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  return (
    <div 
      className={`multiview-cell ${active ? 'active' : ''}`} 
      onClick={onClick}
    >
      <video
        ref={videoRef}
        autoPlay
        muted={!active}
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
      />
    </div>
  );
}

export function MultiViewPlayer({ streams, minimized, onMinimize, onClose, onRemoveStream }: MultiViewPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Layout based on count
  const count = streams.length;
  let gridStyle = {};
  if (count === 1) {
    gridStyle = { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
  } else if (count === 2) {
    gridStyle = { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
  } else {
    gridStyle = { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
  }

  if (minimized) {
    return (
      <div className="multiview-overlay minimized" onClick={onMinimize}>
        <div className="multiview-minimized-content">
          <span>Multi-view (Pip)</span>
          <small>Selecione um canal na grade para adicionar, ou clique aqui para voltar</small>
        </div>
      </div>
    );
  }

  return (
    <div className="multiview-overlay">
      <div className="multiview-header">
        <h2>Multi-view ({count}/4)</h2>
        <div style={{ flex: 1 }} />
        <span className="multiview-hint">Clique em um vídeo para ouvir o áudio</span>
        {count < 4 && onMinimize && (
          <button className="primary-button" onClick={onMinimize} style={{ marginLeft: '16px' }}>
            + Adicionar Canal
          </button>
        )}
        {onMinimize && <button className="ghost-button" onClick={onMinimize} style={{ marginLeft: '16px' }}>Minimizar</button>}
        <button className="ghost-button" onClick={onClose} style={{ marginLeft: '16px' }}>Fechar</button>
      </div>

      <div className="multiview-grid" style={gridStyle}>
        {streams.map((stream, idx) => (
          <div key={stream.id} style={{ position: 'relative', width: '100%', height: '100%' }}>
            <HlsVideo 
              url={stream.url} 
              active={activeIndex === idx} 
              onClick={() => setActiveIndex(idx)} 
            />
            <div className="multiview-overlay-info">
              <span>{stream.title}</span>
              <button onClick={(e) => { e.stopPropagation(); onRemoveStream(stream.id); }}>X</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
