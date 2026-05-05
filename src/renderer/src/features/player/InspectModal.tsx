import { useEffect, useState, useMemo } from 'react';
import type { ContentType, EpgProgramme, Episode, StreamItem } from '@shared/domain';

interface InspectModalProps {
  open: boolean;
  accountId?: string;
  contentType: ContentType;
  stream?: StreamItem;
  onClose: () => void;
  onPlayEpisode: (episode: Episode) => Promise<void>;
  onPlayCatchup?: (epg: EpgProgramme) => Promise<void>;
}

export function InspectModal({ open, accountId, contentType, stream, onClose, onPlayEpisode, onPlayCatchup }: InspectModalProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [epg, setEpg] = useState<EpgProgramme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [tmdbInfo, setTmdbInfo] = useState<import('@shared/domain').TmdbInfo>();

  const groupedEpisodes = useMemo(() => {
    return episodes.reduce((acc, ep) => {
      const seasonNum = ep.season ?? 0;
      if (!acc[seasonNum]) acc[seasonNum] = [];
      acc[seasonNum].push(ep);
      return acc;
    }, {} as Record<number, Episode[]>);
  }, [episodes]);

  const seasons = useMemo(() => {
    return Object.keys(groupedEpisodes).map(Number).sort((a, b) => a - b);
  }, [groupedEpisodes]);



  useEffect(() => {
    if (!open || !accountId || !stream) return;
    const streamId = stream.stream_id ?? stream.series_id;
    if (!streamId) return;

    setLoading(true);
    setError(undefined);

    const task = async () => {
      setExpandedSeason(null);
      setTmdbInfo(undefined);

      // Fetch TMDB Info for Movies and Series (non-blocking)
      if (contentType === 'movie' || contentType === 'series') {
        window.xtremeApi.tmdb.fetchInfo(stream.name, contentType).then(info => {
          if (info) setTmdbInfo(info);
        }).catch(console.error);
      }

      if (contentType === 'series' && stream.series_id) {
        const data = await window.xtremeApi.xtream.seriesEpisodes(accountId, stream.series_id);
        setEpisodes(data);
        setEpg([]);
        return;
      }
      if (contentType === 'live' && stream.stream_id) {
        const data = await window.xtremeApi.xtream.epg(accountId, stream.stream_id, 12);
        setEpg(data);
        setEpisodes([]);
        return;
      }
      setEpisodes([]);
      setEpg([]);
    };

    task().catch((err) => setError(err.message || String(err))).finally(() => setLoading(false));
  }, [open, accountId, contentType, stream]);

  if (!open || !stream) return null;

  const coverImage = tmdbInfo?.posterPath || stream?.cover || stream?.stream_icon;
  const plot = tmdbInfo?.overview || stream?.plot;
  const rating = tmdbInfo?.voteAverage || stream?.rating;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal large-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-row" style={tmdbInfo?.backdropPath ? { backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.9) 30%, transparent), url(${tmdbInfo.backdropPath})`, backgroundSize: 'cover', backgroundPosition: 'right', padding: '24px', borderRadius: '12px 12px 0 0', display: 'flex', gap: '20px' } : { display: 'flex', gap: '20px', paddingBottom: '16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ flexShrink: 0, width: '120px' }}>
            {coverImage ? <img src={coverImage} alt={stream.name} style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} /> : <div className="placeholder">Sem Capa</div>}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{stream.name}</h2>
            {plot && <p className="muted-text" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', maxWidth: '600px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{plot}</p>}
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.9rem', color: '#cbd5e1', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {rating && <span>⭐ {rating}</span>}
              {tmdbInfo?.releaseDate && <span>📅 {tmdbInfo.releaseDate.split('-')[0]}</span>}
              {stream.added && <span>Adicionado em: {new Date(Number(stream.added) * 1000).toLocaleDateString()}</span>}
            </div>
          </div>
          <button className="ghost-button" onClick={onClose} style={{ alignSelf: 'flex-start' }}>Fechar</button>
        </div>

        {loading ? <div className="alert">Carregando detalhes...</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        {contentType === 'live' ? (
          <div className="detail-list">
            {epg.length === 0 ? <div className="alert">Nenhum EPG disponível para esse canal.</div> : epg.map((item, index) => (
              <div className="detail-card" key={`${item.start}-${index}`}>
                <strong>{item.title || 'Sem título'}</strong>
                <small>{item.start || '--'} → {item.end || '--'}</small>
                <p>{item.description || 'Sem descrição'}</p>
              </div>
            ))}
          </div>
        ) : null}

        {contentType === 'series' ? (
          <div className="detail-list">
            {episodes.length === 0 ? <div className="alert">Não foi possível carregar episódios dessa série.</div> : seasons.map((season) => (
              <div key={season} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div
                  className="detail-card"
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setExpandedSeason(expandedSeason === season ? null : season)}
                >
                  <strong style={{ margin: 0, fontSize: '1.1rem' }}>Temporada {season}</strong>
                  <span>{expandedSeason === season ? '▼' : '▶'}</span>
                </div>
                {expandedSeason === season && (
                  <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {groupedEpisodes[season].map((episode) => (
                      <div className="detail-card" key={episode.id}>
                        <strong>T{episode.season}E{episode.episode_num} • {episode.title}</strong>
                        <small>Extensão: {episode.container_extension || 'mp4'}</small>
                        <button className="primary-button" onClick={() => onPlayEpisode(episode)}>Reproduzir episódio</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {contentType === 'movie' ? (
          <div className="detail-list">
            <div className="detail-card">
              <strong>{stream.name}</strong>
              <small>Extensão: {stream.container_extension || 'mp4'}</small>
              <p>{stream.plot || 'Sem descrição detalhada.'}</p>
            </div>
          </div>
        ) : null}

        {contentType === 'live' && epg.length > 0 && (
          <div className="episodes-list">
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>Gravações Disponíveis (Catch-up)</h3>
            {epg.filter(p => p.has_archive).length === 0 && (
              <div className="alert" style={{ background: 'transparent' }}>
                Nenhum programa gravado disponível para este canal.
              </div>
            )}
            {epg.filter(p => p.has_archive).map((prog, idx) => (
              <div key={idx} className="episode-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="episode-info">
                  <h4>{prog.title}</h4>
                  <p>{prog.start} - {prog.end}</p>
                  {prog.description && <p className="episode-plot">{prog.description}</p>}
                </div>
                {onPlayCatchup && (
                  <button className="primary-button" onClick={() => onPlayCatchup(prog)}>
                    Play Gravação
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
