import type { Favorite, StreamItem, ContentType } from '@shared/domain';

interface StreamGridProps {
  contentType: ContentType;
  streams: StreamItem[];
  favorites: Favorite[];
  onToggleFavorite: (stream: StreamItem) => void;
  onPlay: (stream: StreamItem) => void;
  onInspect: (stream: StreamItem) => void;
}

export function StreamGrid({ streams, favorites, onToggleFavorite, onPlay, onInspect, contentType }: StreamGridProps) {
  const favoriteKey = new Set(favorites.map((item) => `${item.contentType}:${item.streamId}`));

  return (
    <div className="stream-grid">
      {streams.map((stream) => {
        const streamId = stream.stream_id ?? stream.series_id ?? 0;
        const isFavorite = favoriteKey.has(`${contentType}:${streamId}`);
        return (
          <article className="stream-card" key={`${contentType}-${streamId}`}>
            <div className="stream-cover">
              {stream.stream_icon || stream.cover ? <img src={stream.stream_icon || stream.cover} alt={stream.name} /> : <span>{stream.name.slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="stream-meta">
              <h3>{stream.name}</h3>
              <p>{stream.plot || stream.rating || 'Sem descrição'}</p>
            </div>
            <div className="stream-actions">
              <button className="primary-button" onClick={() => onPlay(stream)}>{contentType === 'series' ? 'Abrir' : 'Play'}</button>
              <button className="ghost-button" onClick={() => onInspect(stream)}>{contentType === 'live' ? 'EPG' : 'Detalhes'}</button>
              <button className="ghost-button" onClick={() => onToggleFavorite(stream)}>{isFavorite ? '★' : '☆'}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
