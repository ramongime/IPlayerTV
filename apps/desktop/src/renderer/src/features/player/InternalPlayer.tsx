import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import type { ContentType } from '@iplayertv/core';
import { useTranslation } from 'react-i18next';

interface TrackInfo {
  id: number;
  label: string;
  lang?: string;
}

interface InternalPlayerProps {
  streamUrl: string;
  title: string;
  contentType: ContentType;
  streamId?: number;
  accountId?: string;

  onClose: () => void;
}

export function InternalPlayer({ streamUrl, title, contentType, streamId, accountId, onClose }: InternalPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string>();
  const [isHovered, setIsHovered] = useState(true);
  const [playerSettings, setPlayerSettings] = useState<{ defaultAudioLanguage?: string, defaultSubtitleLanguage?: string }>({});

  // Track selection state
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [audioTracks, setAudioTracks] = useState<TrackInfo[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<TrackInfo[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number>(-1);
  const [activeSubtitleTrack, setActiveSubtitleTrack] = useState<number>(-1);

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

  const refreshTracks = useCallback(() => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!hls && !video) return;

    if (hls) {
      const hlsAudio = hls.audioTracks.map((track, i) => ({
        id: i,
        label: track.name || track.lang || `Audio ${i + 1}`,
        lang: track.lang
      }));
      setAudioTracks(hlsAudio);
      setActiveAudioTrack(hls.audioTrack);

      const hlsSubs = hls.subtitleTracks.map((track, i) => ({
        id: i,
        label: track.name || track.lang || `Sub ${i + 1}`,
        lang: track.lang
      }));
      setSubtitleTracks(hlsSubs);
      setActiveSubtitleTrack(hls.subtitleTrack);

      // Debug: mostra no DevTools as faixas encontradas
      console.log(`[IPlayerTV] 🎵 Audio tracks (${hlsAudio.length}):`, hlsAudio);
      console.log(`[IPlayerTV] 📄 Subtitle tracks (${hlsSubs.length}):`, hlsSubs);
    }

    if (!hls && video) {
      const nativeAudio: TrackInfo[] = [];
      if ((video as any).audioTracks) {
        const at = (video as any).audioTracks;
        for (let i = 0; i < at.length; i++) {
          nativeAudio.push({ id: i, label: at[i].label || at[i].language || `Audio ${i + 1}`, lang: at[i].language });
          if (at[i].enabled) setActiveAudioTrack(i);
        }
      }
      setAudioTracks(nativeAudio);

      const nativeSubs: TrackInfo[] = [];
      if (video.textTracks) {
        for (let i = 0; i < video.textTracks.length; i++) {
          const tt = video.textTracks[i];
          if (tt.kind === 'subtitles' || tt.kind === 'captions') {
            nativeSubs.push({ id: i, label: tt.label || tt.language || `Sub ${i + 1}`, lang: tt.language });
            if (tt.mode === 'showing') setActiveSubtitleTrack(i);
          }
        }
      }
      setSubtitleTracks(nativeSubs);
    }
  }, []);

  const selectAudioTrack = (trackId: number) => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (hls) { hls.audioTrack = trackId; }
    else if (video && (video as any).audioTracks) {
      const at = (video as any).audioTracks;
      for (let i = 0; i < at.length; i++) at[i].enabled = i === trackId;
    }
    setActiveAudioTrack(trackId);
    setShowAudioMenu(false);
  };

  const selectSubtitleTrack = (trackId: number) => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (hls) { hls.subtitleTrack = trackId; hls.subtitleDisplay = trackId !== -1; }
    else if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = i === trackId ? 'showing' : 'hidden';
    }
    setActiveSubtitleTrack(trackId);
    setShowSubMenu(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
      hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 600, enableWorker: true, renderTextTracksNatively: true });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (playerSettings.defaultAudioLanguage) {
          const idx = hls?.audioTracks.findIndex(tr =>
            tr.name.toLowerCase().includes(playerSettings.defaultAudioLanguage!.toLowerCase()) ||
            tr.lang?.toLowerCase().includes(playerSettings.defaultAudioLanguage!.toLowerCase())
          );
          if (idx !== undefined && idx !== -1) hls!.audioTrack = idx;
        }
        if (playerSettings.defaultSubtitleLanguage) {
          const idx = hls?.subtitleTracks.findIndex(tr =>
            tr.name.toLowerCase().includes(playerSettings.defaultSubtitleLanguage!.toLowerCase()) ||
            tr.lang?.toLowerCase().includes(playerSettings.defaultSubtitleLanguage!.toLowerCase())
          );
          if (idx !== undefined && idx !== -1) hls!.subtitleTrack = idx;
        }
        setTimeout(refreshTracks, 500);
        video.play().catch((err) => setError('Falha ao reproduzir automaticamente: ' + err.message));
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, refreshTracks);
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, refreshTracks);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: setError('Erro de rede ao carregar a stream.'); hls?.startLoad(); break;
            case Hls.ErrorTypes.MEDIA_ERROR: setError('Erro de mídia. Tentando recuperar...'); hls?.recoverMediaError(); break;
            default: setError('Erro fatal: ' + data.details); hls?.destroy(); break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !streamUrl.includes('.m3u8')) {
      hlsRef.current = null;
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setTimeout(refreshTracks, 500);
      });
      video.play().catch((err) => { if (err.name !== 'AbortError') setError('Falha ao reproduzir: ' + err.message); });
    } else {
      setError('Seu navegador não suporta a reprodução deste formato.');
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); if (video.paused) video.play(); else video.pause(); }
      if (e.key === 'f') { if (!document.fullscreenElement) video.parentElement?.requestFullscreen(); else document.exitFullscreen(); }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      clearTimeout(hoverTimeout);
      if (hls) hls.destroy();
      hlsRef.current = null;
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [streamUrl, playerSettings]);



  const hasAudioOptions = audioTracks.length > 1;
  const hasSubOptions = subtitleTracks.length > 0;

  return (
    <div
      className="internal-player-overlay"
      onMouseMove={handleMouseMove}
      onClick={() => { setIsHovered(true); setShowAudioMenu(false); setShowSubMenu(false); }}
    >
      <div className={`internal-player-container ${isHovered ? 'hovered' : ''}`}>
        {/* Top Header */}
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
            {t('common.close')}
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

        {/* Video element with NATIVE controls */}
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

        {/* Floating Audio/Subtitle buttons above the native controls */}
        {(hasAudioOptions || hasSubOptions) && (
          <div
            style={{
              position: 'absolute',
              bottom: '52px',
              right: '16px',
              display: 'flex',
              gap: '6px',
              alignItems: 'flex-end',
              zIndex: 25,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: isHovered ? 'auto' : 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Audio Track Button */}
            {hasAudioOptions && (
              <div style={{ position: 'relative' }}>
                {showAudioMenu && (
                  <TrackPopup
                    title={t('player.audioTrack')}
                    tracks={audioTracks}
                    activeId={activeAudioTrack}
                    onSelect={selectAudioTrack}
                    showOff={false}
                  />
                )}
                <button
                  onClick={() => { refreshTracks(); setShowAudioMenu(!showAudioMenu); setShowSubMenu(false); }}
                  title={t('player.audioTrack')}
                  style={{
                    background: showAudioMenu ? 'rgba(76, 201, 240, 0.2)' : 'rgba(0,0,0,0.6)',
                    border: `1px solid ${showAudioMenu ? 'rgba(76, 201, 240, 0.5)' : 'rgba(255,255,255,0.2)'}`,
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                  {audioTracks[activeAudioTrack]?.lang?.toUpperCase() || 'AUD'}
                </button>
              </div>
            )}

            {/* Subtitle Track Button */}
            {hasSubOptions && (
              <div style={{ position: 'relative' }}>
                {showSubMenu && (
                  <TrackPopup
                    title={t('player.subtitleTrack')}
                    tracks={subtitleTracks}
                    activeId={activeSubtitleTrack}
                    onSelect={selectSubtitleTrack}
                    showOff={true}
                    offLabel={t('player.subtitlesOff')}
                  />
                )}
                <button
                  onClick={() => { refreshTracks(); setShowSubMenu(!showSubMenu); setShowAudioMenu(false); }}
                  title={t('player.subtitleTrack')}
                  style={{
                    background: showSubMenu ? 'rgba(76, 201, 240, 0.2)' : 'rgba(0,0,0,0.6)',
                    border: `1px solid ${showSubMenu || activeSubtitleTrack >= 0 ? 'rgba(76, 201, 240, 0.5)' : 'rgba(255,255,255,0.2)'}`,
                    color: activeSubtitleTrack >= 0 ? '#4cc9f0' : '#fff',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                  }}
                >
                  CC
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TrackPopup({ title, tracks, activeId, onSelect, showOff, offLabel }: {
  title: string;
  tracks: TrackInfo[];
  activeId: number;
  onSelect: (id: number) => void;
  showOff: boolean;
  offLabel?: string;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: '44px',
        right: 0,
        background: 'rgba(15, 23, 42, 0.96)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.12)',
        padding: '10px',
        minWidth: '200px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        zIndex: 100,
      }}
    >
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '6px', padding: '2px 8px' }}>
        {title}
      </div>
      {showOff && (
        <TrackOption label={offLabel || 'Off'} active={activeId === -1} onClick={() => onSelect(-1)} />
      )}
      {tracks.map((track) => (
        <TrackOption key={track.id} label={track.label} lang={track.lang} active={activeId === track.id} onClick={() => onSelect(track.id)} />
      ))}
    </div>
  );
}

function TrackOption({ label, lang, active, onClick }: { label: string; lang?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '7px 8px',
        border: 'none', borderRadius: '6px',
        background: active ? 'rgba(76, 201, 240, 0.15)' : 'transparent',
        color: active ? '#4cc9f0' : '#e5edf7',
        cursor: 'pointer', textAlign: 'left', fontSize: '13px', transition: 'background 0.15s',
      }}
    >
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: active ? '#4cc9f0' : 'transparent',
        border: `2px solid ${active ? '#4cc9f0' : '#64748b'}`,
        flexShrink: 0,
      }} />
      {label}
      {lang && <span style={{ color: '#64748b', fontSize: '11px' }}>({lang})</span>}
    </button>
  );
}
