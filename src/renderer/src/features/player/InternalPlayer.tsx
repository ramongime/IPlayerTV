import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { ContentType } from '@shared/domain';

interface InternalPlayerProps {
  streamUrl: string;
  title: string;
  contentType: ContentType;
  onClose: () => void;
}

export function InternalPlayer({ streamUrl, title, contentType, onClose }: InternalPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(true);
  
  let hoverTimeout: NodeJS.Timeout;

  const handleMouseMove = () => {
    setIsHovered(true);
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => setIsHovered(false), 3000);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        enableWorker: true
      });
      
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => setError('Falha ao reproduzir automaticamente: ' + err.message));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Erro de rede ao carregar a stream.');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Erro de mídia. Tentando recuperar...');
              hls?.recoverMediaError();
              break;
            default:
              setError('Erro fatal: ' + data.details);
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !streamUrl.includes('.m3u8')) {
      // Native support (Safari) or non-HLS formats (.ts, .mp4, etc)
      video.src = streamUrl;
      video.play().catch((err) => {
        if (err.name !== 'AbortError') {
          setError('Falha ao reproduzir: ' + err.message);
        }
      });
    } else {
      setError('Seu navegador não suporta a reprodução deste formato.');
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        if (video.paused) video.play();
        else video.pause();
      }
      if (e.key === 'f') {
        if (!document.fullscreenElement) video.parentElement?.requestFullscreen();
        else document.exitFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeydown);

    return () => {
      if (hls) hls.destroy();
      window.removeEventListener('keydown', handleKeydown);
      clearTimeout(hoverTimeout);
    };
  }, [streamUrl]);

  return (
    <div 
      className="internal-player-overlay" 
      onMouseMove={handleMouseMove}
      onClick={() => setIsHovered(true)}
    >
      <div className={`internal-player-container ${isHovered ? 'hovered' : ''}`}>
        <div className="internal-player-header">
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
            {contentType === 'live' && (
              <span className="live-badge">
                <span className="live-dot" style={{ width: '8px', height: '8px' }}></span>
                AO VIVO
              </span>
            )}
            <h2 style={{ margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{title}</h2>
          </div>
          <button className="ghost-button" onClick={onClose} style={{ background: 'rgba(0,0,0,0.5)' }}>
            Fechar
          </button>
        </div>

        {error && (
          <div className="internal-player-error">
            <p>{error}</p>
            <button className="primary-button" onClick={() => { setError(undefined); if(videoRef.current) videoRef.current.load(); }}>
              Tentar Novamente
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className={`internal-player-video ${contentType === 'live' ? 'is-live' : ''}`}
          controls={isHovered}
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current?.paused) videoRef.current?.play();
            else videoRef.current?.pause();
          }}
        />
      </div>
    </div>
  );
}
