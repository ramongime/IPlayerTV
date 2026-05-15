import type { Favorite, StreamItem, ContentType } from '@shared/domain';

interface StreamGridProps {
  contentType: ContentType;
  streams: StreamItem[];
  favorites: Favorite[];
  nowPlaying?: Record<number, string>;
  isFavoriting?: boolean;
  onToggleFavorite: (stream: StreamItem) => void;
  onPlay: (stream: StreamItem) => void;
  onInspect?: (stream: StreamItem) => void;
  onAddMultiView?: (stream: StreamItem) => void;
}

import { VirtuosoGrid } from 'react-virtuoso';

export function StreamGrid({ streams, favorites, nowPlaying, onToggleFavorite, onPlay, onInspect, onAddMultiView, contentType }: StreamGridProps) {
  const favoriteKey = new Set(favorites.map((item) => `${item.contentType}:${item.streamId}`));

  return (
    <VirtuosoGrid
      style={{ flex: 1, minHeight: '400px', width: '100%' }}
      data={streams}
      listClassName="stream-grid"
      itemContent={(index, stream) => {
        const streamId = stream.stream_id ?? stream.series_id ?? 0;
        const isFavorite = favoriteKey.has(`${contentType}:${streamId}`);
        const currentProgramme = contentType === 'live' && nowPlaying ? nowPlaying[streamId] : undefined;
        return (
          <article className="stream-card">
            <div className="stream-cover">
              {stream.stream_icon || stream.cover ? <img src={stream.stream_icon || stream.cover} alt={stream.name} loading="lazy" /> : <span>{stream.name.slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="stream-meta">
              <h3>{stream.name}</h3>
              {currentProgramme ? (
                <p className="now-playing-label">
                  <span className="live-dot" />
                  {currentProgramme}
                </p>
              ) : (
                <p>{stream.plot || stream.rating || 'Sem descrição'}</p>
              )}
            </div>
            <div className="stream-actions">
              <button className="primary-button" onClick={() => onPlay(stream)}>{contentType === 'series' ? 'Abrir' : 'Play'}</button>
              {contentType === 'live' && onAddMultiView && (
                <button className="ghost-button" onClick={() => onAddMultiView(stream)}>Multi-Tela</button>
              )}
              {onInspect && (
                <button className="ghost-button" onClick={() => onInspect(stream)}>{contentType === 'live' ? 'EPG' : 'Detalhes'}</button>
              )}
              <button className="ghost-button" onClick={() => onToggleFavorite(stream)}>{isFavorite ? '★' : '☆'}</button>
            </div>
          </article>
        );
      }}
    />
  );
}
