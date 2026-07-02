import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    externalPlayers: { vlcPath: '', mpvPath: '' },
    stream: { probeTimeoutMs: 3500 },
    player: { defaultAudioLanguage: '', defaultSubtitleLanguage: '', splitAudio: false },
    tmdbApiKey: '',
    parentalPin: ''
  });
  const enableSearchAll = useAppStore(state => state.enableSearchAll);
  const setEnableSearchAll = useAppStore(state => state.setEnableSearchAll);

  // PIN change state
  const [pinAction, setPinAction] = useState<'none' | 'set' | 'change' | 'remove'>('none');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const hasPinConfigured = !!settings.parentalPin;

  useEffect(() => {
    if (open) {
      window.xtremeApi.settings.get().then((data: any) => {
        setSettings({
          ...data,
          player: data.player || { defaultAudioLanguage: '', defaultSubtitleLanguage: '', splitAudio: false }
        });
      });
      resetPinState();
    }
  }, [open]);

  const resetPinState = () => {
    setPinAction('none');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
  };

  const handleSetPin = () => {
    if (newPin.length !== 4) {
      setPinError(t('settingsModal.pinMustBe4'));
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(t('settingsModal.pinMismatch'));
      return;
    }
    setSettings({ ...settings, parentalPin: newPin });
    resetPinState();
  };

  const handleChangePin = () => {
    // Validate current PIN
    if (currentPin !== settings.parentalPin) {
      setPinError(t('settingsModal.currentPinWrong'));
      return;
    }
    if (newPin.length !== 4) {
      setPinError(t('settingsModal.pinMustBe4'));
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(t('settingsModal.pinMismatch'));
      return;
    }
    setSettings({ ...settings, parentalPin: newPin });
    resetPinState();
  };

  const handleRemovePin = () => {
    if (currentPin !== settings.parentalPin) {
      setPinError(t('settingsModal.currentPinWrong'));
      return;
    }
    setSettings({ ...settings, parentalPin: '' });
    resetPinState();
  };

  if (!open) return null;

  const onlyDigits = (value: string) => /^\d*$/.test(value);

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div className="modal-header-row">
          <h2 style={{ margin: 0 }}>{t('settingsModal.title')}</h2>
          <button className="ghost-button" onClick={onClose} style={{ padding: '6px 12px', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
          {/* Settings Fields Card */}
          <div style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '20px',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* External Players Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="settings-label">
                {t('settingsModal.vlcPath')}
              </label>
              <input
                className="settings-input"
                placeholder="/Applications/VLC.app/Contents/MacOS/VLC"
                value={settings.externalPlayers?.vlcPath || ''}
                onChange={(e) => setSettings({ ...settings, externalPlayers: { ...settings.externalPlayers, vlcPath: e.target.value } })}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="settings-label">
                {t('settingsModal.mpvPath')}
              </label>
              <input
                className="settings-input"
                placeholder="/usr/local/bin/mpv"
                value={settings.externalPlayers?.mpvPath || ''}
                onChange={(e) => setSettings({ ...settings, externalPlayers: { ...settings.externalPlayers, mpvPath: e.target.value } })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="settings-label">
                  {t('settingsModal.probeTime')}
                </label>
                <input
                  className="settings-input"
                  type="number"
                  value={settings.stream?.probeTimeoutMs || 3500}
                  onChange={(e) => setSettings({ ...settings, stream: { probeTimeoutMs: Number(e.target.value || 3500) } })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="settings-label">
                  {t('settingsModal.tmdbKey')}
                </label>
                <input
                  className="settings-input"
                  placeholder="xxxxxxxxxxxxxxx"
                  value={settings.tmdbApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, tmdbApiKey: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="settings-label">
                  {t('settingsModal.defaultAudio')}
                </label>
                <input
                  className="settings-input"
                  placeholder="pt"
                  value={settings.player?.defaultAudioLanguage || ''}
                  onChange={(e) => setSettings({ ...settings, player: { ...settings.player, defaultAudioLanguage: e.target.value } })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="settings-label">
                  {t('settingsModal.defaultSubtitle')}
                </label>
                <input
                  className="settings-input"
                  placeholder="pt"
                  value={settings.player?.defaultSubtitleLanguage || ''}
                  onChange={(e) => setSettings({ ...settings, player: { ...settings.player, defaultSubtitleLanguage: e.target.value } })}
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={enableSearchAll}
                  onChange={(e) => setEnableSearchAll(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#f8fafc' }}>{t('settingsModal.enableAllCategory')}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.player?.splitAudio || false}
                  onChange={(e) => setSettings({ ...settings, player: { ...settings.player, splitAudio: e.target.checked } })}
                />
                <span className="toggle-slider"></span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#f8fafc' }}>{t('settingsModal.splitAudio')}</span>
            </label>
          </div>

          {/* Cache Management Section */}
          <div style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('settingsModal.clearCache', 'Limpar Dados')}</span>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {t('settingsModal.clearCacheDesc', 'Apagar Histórico de visualização e itens marcados como Visto')}
                  </div>
                </div>
              </div>
              <button
                className="ghost-button danger"
                onClick={async () => {
                  if (confirm(t('settingsModal.confirmClearCache', 'Tem certeza que deseja apagar todo o histórico e os itens vistos?'))) {
                    await window.xtremeApi.watched.clear();
                    alert(t('settingsModal.cacheCleared', 'Dados apagados com sucesso!'));
                    window.location.reload();
                  }
                }}
                style={{ padding: '8px 16px', fontSize: '13px', border: '1px solid rgba(255, 95, 95, 0.4)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', whiteSpace: 'nowrap' }}
              >
                {t('settingsModal.clearButton', 'Apagar Dados')}
              </button>
            </div>
          </div>

          {/* Parental PIN Section */}
          <div style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pinAction !== 'none' ? '16px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('settingsModal.parentalPin')}</span>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {hasPinConfigured
                      ? t('settingsModal.pinConfigured')
                      : t('settingsModal.pinNotConfigured')
                    }
                  </div>
                </div>
              </div>
              {pinAction === 'none' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {hasPinConfigured && (
                    <button
                      className="ghost-button danger"
                      onClick={() => setPinAction('remove')}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      {t('common.remove')}
                    </button>
                  )}
                  <button
                    className="ghost-button"
                    onClick={() => setPinAction(hasPinConfigured ? 'change' : 'set')}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    {hasPinConfigured ? t('settingsModal.changePin') : t('settingsModal.setPin')}
                  </button>
                </div>
              )}
              {pinAction !== 'none' && (
                <button
                  className="ghost-button"
                  onClick={resetPinState}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>

            {/* SET PIN (first time — no current PIN needed) */}
            {pinAction === 'set' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
                      {t('settingsModal.newPin')}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => { if (onlyDigits(e.target.value)) { setNewPin(e.target.value); setPinError(''); } }}
                      placeholder="••••"
                      autoFocus
                      style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px', borderColor: pinError ? '#ef4444' : undefined }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
                      {t('settingsModal.confirmPin')}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => { if (onlyDigits(e.target.value)) { setConfirmPin(e.target.value); setPinError(''); } }}
                      placeholder="••••"
                      style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px', borderColor: pinError ? '#ef4444' : undefined }}
                    />
                  </div>
                </div>
                {pinError && <PinErrorMessage message={pinError} />}
                <button className="primary-button" onClick={handleSetPin} style={{ padding: '10px 20px', fontSize: '14px', alignSelf: 'flex-end' }}>
                  {t('settingsModal.confirmPinBtn')}
                </button>
              </div>
            )}

            {/* CHANGE PIN (requires current PIN) */}
            {pinAction === 'change' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
                    {t('settingsModal.currentPin')}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={currentPin}
                    onChange={(e) => { if (onlyDigits(e.target.value)) { setCurrentPin(e.target.value); setPinError(''); } }}
                    placeholder="••••"
                    autoFocus
                    style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px', maxWidth: '160px', borderColor: pinError && pinError === t('settingsModal.currentPinWrong') ? '#ef4444' : undefined }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
                      {t('settingsModal.newPin')}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => { if (onlyDigits(e.target.value)) { setNewPin(e.target.value); setPinError(''); } }}
                      placeholder="••••"
                      style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
                      {t('settingsModal.confirmPin')}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => { if (onlyDigits(e.target.value)) { setConfirmPin(e.target.value); setPinError(''); } }}
                      placeholder="••••"
                      style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px' }}
                    />
                  </div>
                </div>
                {pinError && <PinErrorMessage message={pinError} />}
                <button className="primary-button" onClick={handleChangePin} style={{ padding: '10px 20px', fontSize: '14px', alignSelf: 'flex-end' }}>
                  {t('settingsModal.confirmPinBtn')}
                </button>
              </div>
            )}

            {/* REMOVE PIN (requires current PIN) */}
            {pinAction === 'remove' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                  {t('settingsModal.removeConfirmText')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
                    {t('settingsModal.currentPin')}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={currentPin}
                    onChange={(e) => { if (onlyDigits(e.target.value)) { setCurrentPin(e.target.value); setPinError(''); } }}
                    placeholder="••••"
                    autoFocus
                    style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px', maxWidth: '160px', borderColor: pinError ? '#ef4444' : undefined }}
                  />
                </div>
                {pinError && <PinErrorMessage message={pinError} />}
                <button
                  className="ghost-button danger"
                  onClick={handleRemovePin}
                  style={{ padding: '10px 20px', fontSize: '14px', alignSelf: 'flex-end', border: '1px solid rgba(255, 95, 95, 0.4)' }}
                >
                  {t('settingsModal.confirmRemove')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>{t('common.close')}</button>
          <button
            className="primary-button"
            onClick={async () => {
              await window.xtremeApi.settings.update(settings);
              onClose();
            }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PinErrorMessage({ message }: { message: string }) {
  return (
    <p style={{ color: '#ef4444', margin: 0, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      {message}
    </p>
  );
}
