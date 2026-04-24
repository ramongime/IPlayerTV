import { useEffect, useState } from 'react';
import type { ContentType, EpgProgramme, Episode, StreamItem } from '@/lib/types';

interface InspectModalProps {
  open: boolean;
  accountId?: string;
  contentType: ContentType;
  stream?: StreamItem;
  onClose: () => void;
  onPlayEpisode: (episode: Episode) => Promise<void>;
}

export function InspectModal({ open, accountId, contentType, stream, onClose, onPlayEpisode }: InspectModalProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [epg, setEpg] = useState<EpgProgramme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open || !accountId || !stream) return;
    const streamId = stream.stream_id ?? stream.series_id;
    if (!streamId) return;

    setLoading(true);
    setError(undefined);

    const task = async () => {
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
            {episodes.length === 0 ? <div className="alert">Não foi possível carregar episódios dessa série.</div> : episodes.map((episode) => (
              <div className="detail-card" key={episode.id}>
                <strong>T{episode.season}E{episode.episode_num} • {episode.title}</strong>
                <small>Extensão: {episode.container_extension || 'mp4'}</small>
                <button className="primary-button" onClick={() => onPlayEpisode(episode)}>Reproduzir episódio</button>
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
      </div>
    </div>
  );
}
