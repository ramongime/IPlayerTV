import { useEffect, useState } from 'react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState({ externalPlayers: { vlcPath: '', mpvPath: '' }, stream: { probeTimeoutMs: 3500 } });

  useEffect(() => {
    if (open) {
      window.xtremeApi.settings.get().then(setSettings);
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
            value={settings.externalPlayers.vlcPath || ''}
            onChange={(e) => setSettings({ ...settings, externalPlayers: { ...settings.externalPlayers, vlcPath: e.target.value } })}
          />
          <input
            placeholder="Caminho do mpv"
            value={settings.externalPlayers.mpvPath || ''}
            onChange={(e) => setSettings({ ...settings, externalPlayers: { ...settings.externalPlayers, mpvPath: e.target.value } })}
          />
          <input
            type="number"
            placeholder="Tempo do probe em ms"
            value={settings.stream.probeTimeoutMs}
            onChange={(e) => setSettings({ ...settings, stream: { probeTimeoutMs: Number(e.target.value || 3500) } })}
          />
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
