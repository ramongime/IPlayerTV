import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { ContentType } from '@shared/domain';

interface InternalPlayerProps {
  streamUrl: string;
  title: string;
  contentType: ContentType;
  streamId?: number;
  accountId?: string;
  startProgress?: number;
  onClose: () => void;
}

export function InternalPlayer({ streamUrl, title, contentType, streamId, accountId, startProgress, onClose }: InternalPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>();
  const [isHovered, setIsHovered] = useState(true);
  const [playerSettings, setPlayerSettings] = useState<{ defaultAudioLanguage?: string, defaultSubtitleLanguage?: string }>({});

  useEffect(() => {
    window.xtremeApi.settings.get().then((data: any) => {
      if (data.player) {
        setPlayerSettings(data.player);
      }
    });
  }, []);

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
        enableWorker: true,
        renderTextTracksNatively: true
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startProgress && startProgress > 0) {
          video.currentTime = startProgress;
        }

        // Apply audio and subtitle preferences
        if (playerSettings.defaultAudioLanguage) {
          const audioTrackId = hls?.audioTracks.findIndex(track =>
            track.name.toLowerCase().includes(playerSettings.defaultAudioLanguage!.toLowerCase()) ||
            track.lang?.toLowerCase().includes(playerSettings.defaultAudioLanguage!.toLowerCase())
          );
          if (audioTrackId !== undefined && audioTrackId !== -1) {
            hls!.audioTrack = audioTrackId;
          }
        }

        if (playerSettings.defaultSubtitleLanguage) {
          const subtitleTrackId = hls?.subtitleTracks.findIndex(track =>
            track.name.toLowerCase().includes(playerSettings.defaultSubtitleLanguage!.toLowerCase()) ||
            track.lang?.toLowerCase().includes(playerSettings.defaultSubtitleLanguage!.toLowerCase())
          );
          if (subtitleTrackId !== undefined && subtitleTrackId !== -1) {
            hls!.subtitleTrack = subtitleTrackId;
          }
        }

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
      video.addEventListener('loadedmetadata', () => {
        if (startProgress && startProgress > 0) {
          video.currentTime = startProgress;
        }
      });
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
      clearTimeout(hoverTimeout);
      if (hls) {
        hls.destroy();
      }
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [streamUrl, startProgress, playerSettings]);

  // Progress Tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !accountId || !streamId || contentType === 'live') return;

    const interval = setInterval(() => {
      const progress = Math.floor(video.currentTime);
      const duration = Math.floor(video.duration);
      if (!isNaN(progress) && !isNaN(duration) && duration > 0) {
        window.xtremeApi.history.upsertProgress(accountId, streamId, progress, duration).catch(console.error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [accountId, streamId, contentType]);

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
            <button className="primary-button" onClick={() => { setError(undefined); if (videoRef.current) videoRef.current.load(); }}>
              Tentar Novamente
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className={`internal-player-video ${contentType === 'live' ? 'is-live' : ''}`}
          controls={isHovered}
          autoPlay
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
