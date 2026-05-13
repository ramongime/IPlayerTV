import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState({ 
    externalPlayers: { vlcPath: '', mpvPath: '' }, 
    stream: { probeTimeoutMs: 3500 }, 
    player: { defaultAudioLanguage: '', defaultSubtitleLanguage: '', splitAudio: false },
    tmdbApiKey: '' 
  });
  const { enableSearchAll, setEnableSearchAll } = useAppStore();

  useEffect(() => {
    if (open) {
      window.xtremeApi.settings.get().then((data: any) => {
        setSettings({
          ...data,
          player: data.player || { defaultAudioLanguage: '', defaultSubtitleLanguage: '', splitAudio: false }
        });
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Configurações</h2>
        <div className="form-grid">
          <input
            placeholder="Caminho do VLC"
            value={settings.externalPlayers?.vlcPath || ''}
            onChange={(e) => setSettings({ ...settings, externalPlayers: { ...settings.externalPlayers, vlcPath: e.target.value } })}
          />
          <input
            placeholder="Caminho do mpv"
            value={settings.externalPlayers?.mpvPath || ''}
            onChange={(e) => setSettings({ ...settings, externalPlayers: { ...settings.externalPlayers, mpvPath: e.target.value } })}
          />
          <input
            type="number"
            placeholder="Tempo do probe em ms"
            value={settings.stream?.probeTimeoutMs || 3500}
            onChange={(e) => setSettings({ ...settings, stream: { probeTimeoutMs: Number(e.target.value || 3500) } })}
          />
          <input
            placeholder="TMDB API Key (Para Posteres em Alta Resolução)"
            value={settings.tmdbApiKey || ''}
            onChange={(e) => setSettings({ ...settings, tmdbApiKey: e.target.value })}
          />
          <input
            placeholder="Idioma padrão de Áudio (ex: pt, en)"
            value={settings.player?.defaultAudioLanguage || ''}
            onChange={(e) => setSettings({ ...settings, player: { ...settings.player, defaultAudioLanguage: e.target.value } })}
          />
          <input
            placeholder="Idioma padrão de Legenda (ex: pt, en)"
            value={settings.player?.defaultSubtitleLanguage || ''}
            onChange={(e) => setSettings({ ...settings, player: { ...settings.player, defaultSubtitleLanguage: e.target.value } })}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 0' }}>
            <input
              type="checkbox"
              checked={enableSearchAll}
              onChange={(e) => setEnableSearchAll(e.target.checked)}
            />
            Habilitar a categoria TODOS nas Séries e Filmes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 0' }}>
            <input
              type="checkbox"
              checked={settings.player?.splitAudio || false}
              onChange={(e) => setSettings({ ...settings, player: { ...settings.player, splitAudio: e.target.checked } })}
            />
            Áudio Split L/R no Multi-View (esquerdo → fone esquerdo, direito → fone direito)
          </label>
        </div>
        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>Fechar</button>
          <button
            className="primary-button"
            onClick={async () => {
              await window.xtremeApi.settings.update(settings);
              onClose();
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
