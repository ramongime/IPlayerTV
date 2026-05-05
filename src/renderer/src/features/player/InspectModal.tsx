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

  return (
    <div className="modal-backdrop">
      <div className="modal large-modal">
        <div className="modal-header-row">
          <div>
            <h2>{stream.name}</h2>
            <p className="muted-text">{stream.plot || 'Sem descrição detalhada.'}</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Fechar</button>
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
