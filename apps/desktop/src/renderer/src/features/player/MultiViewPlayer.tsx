import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Hls from 'hls.js';

interface MultiViewPlayerProps {
  streams: Array<{ url: string; title: string; id: string }>;
  minimized?: boolean;
  onMinimize?: () => void;
  onClose: () => void;
  onRemoveStream: (id: string) => void;
}

export interface HlsVideoHandle {
  getVideoElement: () => HTMLVideoElement | null;
}

const HlsVideo = forwardRef<HlsVideoHandle, { url: string; active: boolean; muted: boolean; onClick: () => void }>(
  ({ url, active, muted, onClick }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current
    }));

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
        style={{ width: '100%', height: '100%' }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted={muted}
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
        />
      </div>
    );
  }
);

export function MultiViewPlayer({ streams, minimized, onMinimize, onClose, onRemoveStream }: MultiViewPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [splitAudio, setSplitAudio] = useState(false);
  // Incrementing this key forces HlsVideo remount after audio cleanup (to get fresh video elements)
  const [audioGeneration, setAudioGeneration] = useState(0);
  const videoRefs = useRef<(HlsVideoHandle | null)[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load split audio setting
  useEffect(() => {
    window.xtremeApi.settings.get().then((data: any) => {
      setSplitAudio(data.player?.splitAudio === true);
    });
  }, []);

  const cleanupAudio = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      // Bump generation to force video remounts — old videos had audio captured by the closed AudioContext
      setAudioGeneration(g => g + 1);
    }
  }, []);

  // Determine if split should be active right now
  const shouldSplit = splitAudio && streams.length === 2 && !minimized;

  // Wire up Web Audio API for stereo split
  useEffect(() => {
    if (!shouldSplit) {
      cleanupAudio();
      return;
    }

    // Delay to ensure video elements are mounted after potential generation change
    const timer = setTimeout(() => {
      const leftVideo = videoRefs.current[0]?.getVideoElement();
      const rightVideo = videoRefs.current[1]?.getVideoElement();

      if (!leftVideo || !rightVideo) return;
      // Avoid double-setup
      if (audioCtxRef.current) return;

      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        // Create sources from video elements
        const leftSource = ctx.createMediaElementSource(leftVideo);
        const rightSource = ctx.createMediaElementSource(rightVideo);

        // Create a splitter for each source (to isolate L channel)
        const leftSplitter = ctx.createChannelSplitter(2);
        const rightSplitter = ctx.createChannelSplitter(2);

        // Create a merger to combine into final stereo output
        const merger = ctx.createChannelMerger(2);

        // Left video → splitter → take channel 0 (L) → merger input 0 (L output)
        leftSource.connect(leftSplitter);
        leftSplitter.connect(merger, 0, 0);

        // Right video → splitter → take channel 0 (L, mono-mixed) → merger input 1 (R output)
        rightSource.connect(rightSplitter);
        rightSplitter.connect(merger, 0, 1);

        // Connect merger to speakers
        merger.connect(ctx.destination);
      } catch (err) {
        console.error('Failed to setup split audio:', err);
        cleanupAudio();
      }
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, [shouldSplit, audioGeneration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

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
        {shouldSplit ? (
          <span className="multiview-hint" style={{ color: '#4cc9f0' }}>
            🎧 Split Audio: esquerdo → L | direito → R
          </span>
        ) : (
          <span className="multiview-hint">Clique em um vídeo para ouvir o áudio</span>
        )}
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
          <div key={stream.id} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
            <HlsVideo
              ref={(el) => { videoRefs.current[idx] = el; }}
              key={`${stream.id}-${audioGeneration}`}
              url={stream.url}
              active={activeIndex === idx}
              muted={shouldSplit ? false : activeIndex !== idx}
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
