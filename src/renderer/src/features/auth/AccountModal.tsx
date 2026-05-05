import { useState, useEffect } from 'react';
import type { Account } from '@shared/domain';
import { parseM3uUrl } from '@shared/utils/parseM3uUrl';

interface AccountModalProps {
  open: boolean;
  editAccount?: Account;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    server: string;
    username: string;
    password: string;
    output: 'm3u8' | 'ts';
    player: 'vlc' | 'mpv' | 'browser' | 'internal';
    userAgent?: string;
  }) => Promise<void>;
  onUpdate?: (id: string, payload: Partial<{
    name: string;
    server: string;
    username: string;
    password: string;
    output: 'm3u8' | 'ts';
    player: 'vlc' | 'mpv' | 'browser' | 'internal';
    userAgent?: string;
  }>) => Promise<void>;
}

interface FormState {
  name: string;
  server: string;
  username: string;
  password: string;
  output: 'm3u8' | 'ts';
  player: 'vlc' | 'mpv' | 'browser' | 'internal';
  userAgent: string;
}

const emptyForm: FormState = {
  name: '',
  server: '',
  username: '',
  password: '',
  output: 'm3u8',
  player: 'internal',
  userAgent: ''
};

export function AccountModal({ open, editAccount, onClose, onSave, onUpdate }: AccountModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [inputMode, setInputMode] = useState<'xtream' | 'm3u'>('xtream');
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uError, setM3uError] = useState<string>();

  const isEdit = !!editAccount;

  useEffect(() => {
    if (open && editAccount) {
      setInputMode('xtream');
      setM3uUrl('');
      setM3uError(undefined);
      setForm({
        name: editAccount.name,
        server: editAccount.server,
        username: editAccount.username,
        password: editAccount.password,
        output: editAccount.output,
        player: editAccount.player,
        userAgent: editAccount.userAgent || ''
      });
    } else if (open && !editAccount) {
      setForm(emptyForm);
      setM3uUrl('');
      setM3uError(undefined);
    }
  }, [open, editAccount]);

  if (!open) return null;

  const handleM3uParse = () => {
    const result = parseM3uUrl(m3uUrl);
    if (!result) {
      setM3uError('URL M3U inválida. Esperado formato: http://servidor/get.php?username=X&password=Y&type=m3u_plus');
      return;
    }
    setM3uError(undefined);
    setForm(prev => ({
      ...prev,
      server: result.server,
      username: result.username,
      password: result.password,
      output: result.output,
      name: prev.name || `Conta M3U - ${result.username}`
    }));
    // Switch to xtream view so they can see the extracted fields
    setInputMode('xtream');
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (isEdit && editAccount && onUpdate) {
        await onUpdate(editAccount.id, form);
      } else {
        await onSave(form);
      }
      onClose();
      setForm(emptyForm);
      setM3uUrl('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{isEdit ? 'Editar conta' : 'Nova conta'}</h2>

        {!isEdit && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className={inputMode === 'xtream' ? 'primary-button' : 'ghost-button'}
              onClick={() => setInputMode('xtream')}
              style={{ flex: 1 }}
            >
              Xtream (Usuário/Senha)
            </button>
            <button
              className={inputMode === 'm3u' ? 'primary-button' : 'ghost-button'}
              onClick={() => setInputMode('m3u')}
              style={{ flex: 1 }}
            >
              URL M3U
            </button>
          </div>
        )}

        {inputMode === 'm3u' && !isEdit ? (
          <div className="form-grid">
            <textarea
              placeholder="Cole aqui a URL M3U completa&#10;Ex: http://servidor.com/get.php?username=user&password=pass&type=m3u_plus"
              value={m3uUrl}
              onChange={(e) => { setM3uUrl(e.target.value); setM3uError(undefined); }}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            {m3uError && <p style={{ color: '#ff8585', fontSize: '0.85rem', margin: '0' }}>{m3uError}</p>}
            <button className="primary-button" onClick={handleM3uParse}>
              Extrair dados da URL
            </button>
            <input placeholder="Nome da conta (opcional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value as FormState['player'] })}>
              <option value="internal">Player Interno (Recomendado)</option>
              <option value="vlc">VLC</option>
              <option value="mpv">mpv</option>
              <option value="browser">Navegador (Browser)</option>
            </select>
          </div>
        ) : (
          <div className="form-grid">
            <input placeholder="Nome da conta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Servidor ex: https://meu-servidor.com:443" value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} />
            <input placeholder="Usuário" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input placeholder="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.output} onChange={(e) => setForm({ ...form, output: e.target.value as 'm3u8' | 'ts' })}>
              <option value="m3u8">m3u8</option>
              <option value="ts">ts</option>
            </select>
            <select value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value as FormState['player'] })}>
              <option value="internal">Player Interno (Recomendado)</option>
              <option value="vlc">VLC</option>
              <option value="mpv">mpv</option>
              <option value="browser">Navegador (Browser)</option>
            </select>
            <input placeholder="User-Agent opcional" value={form.userAgent} onChange={(e) => setForm({ ...form, userAgent: e.target.value })} />
          </div>
        )}

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>Cancelar</button>
          <button
            className="primary-button"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? 'Salvando...' : isEdit ? 'Atualizar conta' : 'Salvar conta'}
          </button>
        </div>
      </div>
    </div>
  );
}

