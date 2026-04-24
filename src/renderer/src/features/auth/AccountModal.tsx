import { useState } from 'react';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    server: string;
    username: string;
    password: string;
    output: 'm3u8' | 'ts';
    player: 'vlc' | 'mpv' | 'browser';
    userAgent?: string;
  }) => Promise<void>;
}

export function AccountModal({ open, onClose, onSave }: AccountModalProps) {
  const [form, setForm] = useState<{
    name: string;
    server: string;
    username: string;
    password: string;
    output: 'm3u8' | 'ts';
    player: 'vlc' | 'mpv' | 'browser';
    userAgent: string;
  }>({
    name: '',
    server: '',
    username: '',
    password: '',
    output: 'm3u8',
    player: 'vlc',
    userAgent: ''
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Nova conta Xtream</h2>
        <div className="form-grid">
          <input placeholder="Nome da conta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Servidor ex: https://meu-servidor.com:443" value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} />
          <input placeholder="Usuário" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input placeholder="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select value={form.output} onChange={(e) => setForm({ ...form, output: e.target.value as 'm3u8' | 'ts' })}>
            <option value="m3u8">m3u8</option>
            <option value="ts">ts</option>
          </select>
          <select value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value as 'vlc' | 'mpv' | 'browser' })}>
            <option value="vlc">VLC</option>
            <option value="mpv">mpv</option>
            <option value="browser">Browser</option>
          </select>
          <input placeholder="User-Agent opcional" value={form.userAgent} onChange={(e) => setForm({ ...form, userAgent: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>Cancelar</button>
          <button
            className="primary-button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(form);
                onClose();
                setForm({
                  name: '',
                  server: '',
                  username: '',
                  password: '',
                  output: 'm3u8',
                  player: 'vlc',
                  userAgent: ''
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Validando...' : 'Salvar conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
