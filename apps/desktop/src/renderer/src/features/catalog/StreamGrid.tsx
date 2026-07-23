import type { Favorite, StreamItem, ContentType } from '@iplayertv/core';

interface StreamGridProps {
  contentType: ContentType;
  streams: StreamItem[];
  favorites: Favorite[];
  watched: Array<{ contentType: string, streamId: number }>;
  nowPlaying?: Record<number, string>;
  isFavoriting?: boolean;
  onToggleFavorite: (stream: StreamItem) => void;
  onToggleWatched?: (stream: StreamItem) => void;
  onPlay: (stream: StreamItem) => void;
  onInspect?: (stream: StreamItem) => void;
  onAddMultiView?: (stream: StreamItem) => void;
}

import React, { useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';

const StreamCard = React.memo(({ 
  stream, contentType, isFavorite, isWatched, currentProgramme,
  onPlay, onAddMultiView, onInspect, onToggleWatched, onToggleFavorite 
}: {
  stream: StreamItem;
  contentType: ContentType;
  isFavorite: boolean;
  isWatched: boolean;
  currentProgramme?: string;
  onPlay: (stream: StreamItem) => void;
  onAddMultiView?: (stream: StreamItem) => void;
  onInspect?: (stream: StreamItem) => void;
  onToggleWatched?: (stream: StreamItem) => void;
  onToggleFavorite: (stream: StreamItem) => void;
}) => {
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
        {onToggleWatched && contentType !== 'live' && (
          <button className={`ghost-button ${isWatched ? 'active' : ''}`} style={isWatched ? { color: '#13c0d7', borderColor: '#13c0d7' } : {}} onClick={() => onToggleWatched(stream)}>
            {isWatched ? '✓ Visto' : 'Marcar Visto'}
          </button>
        )}
        <button className="ghost-button" onClick={() => onToggleFavorite(stream)}>{isFavorite ? '★' : '☆'}</button>
      </div>
    </article>
  );
});

export function StreamGrid({ streams, favorites, watched, nowPlaying, onToggleFavorite, onToggleWatched, onPlay, onInspect, onAddMultiView, contentType }: StreamGridProps) {
  const favoriteKey = useMemo(() => new Set(favorites.map((item) => `${item.contentType}:${item.streamId}`)), [favorites]);
  const watchedKey = useMemo(() => new Set(watched?.map((item) => `${item.contentType}:${item.streamId}`)), [watched]);

  return (
    <VirtuosoGrid
      style={{ flex: 1, minHeight: '400px', width: '100%' }}
      data={streams}
      listClassName="stream-grid"
      itemContent={(index, stream) => {
        const streamId = stream.stream_id ?? stream.series_id ?? 0;
        const isFavorite = favoriteKey.has(`${contentType}:${streamId}`);
        const isWatched = watchedKey?.has(`${contentType}:${streamId}`);
        const currentProgramme = contentType === 'live' && nowPlaying ? nowPlaying[streamId] : undefined;
        return (
          <StreamCard
            stream={stream}
            contentType={contentType}
            isFavorite={isFavorite}
            isWatched={isWatched}
            currentProgramme={currentProgramme}
            onPlay={onPlay}
            onAddMultiView={onAddMultiView}
            onInspect={onInspect}
            onToggleWatched={onToggleWatched}
            onToggleFavorite={onToggleFavorite}
          />
        );
      }}
    />
  );
}
