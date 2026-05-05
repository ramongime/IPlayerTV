import { useState, useEffect } from 'react';
import type { Account } from '@shared/domain';

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

  const isEdit = !!editAccount;

  useEffect(() => {
    if (open && editAccount) {
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
    }
  }, [open, editAccount]);

  if (!open) return null;

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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{isEdit ? 'Editar conta' : 'Nova conta Xtream'}</h2>
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
