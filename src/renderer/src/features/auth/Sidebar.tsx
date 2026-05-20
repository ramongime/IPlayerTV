import { useState } from 'react';
import type { Account } from '@shared/domain';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  accounts: Account[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  onCreateAccount: () => void;
  onEditAccount: (account: Account) => void;
  onRemoveAccount: (id: string) => void;
}

interface AccountInfo {
  status: string;
  expDate: string;
  activeConnections: number;
  maxConnections: string;
}

export function Sidebar(props: SidebarProps) {
  const { t } = useTranslation();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [showInfoForId, setShowInfoForId] = useState<string>();

  const toggleInfo = async (accountId: string) => {
    if (showInfoForId === accountId) {
      setShowInfoForId(undefined);
      setAccountInfo(null);
      return;
    }
    setLoadingInfo(true);
    setShowInfoForId(accountId);
    try {
      const info = await window.xtremeApi.accounts.info(accountId);
      setAccountInfo(info);
    } catch {
      setAccountInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  };

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">IPlayerTV</div>
        <div className="panel-title">{t('common.accounts')}</div>
        <div className="account-list">
          {props.accounts.map((account) => (
            <div key={account.id}>
              <div
                className={`account-card ${props.activeAccountId === account.id ? 'active' : ''}`}
                onClick={() => props.onAccountChange(account.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{account.name}</strong>
                  <small>{account.server}</small>
                </div>
                <div className="account-card-actions">
                  <button
                    className="ghost-button"
                    title={t('common.accountInfo')}
                    onClick={(e) => { e.stopPropagation(); toggleInfo(account.id); }}
                  >
                    ℹ
                  </button>
                  <button
                    className="ghost-button"
                    title={t('common.editAccount')}
                    onClick={(e) => { e.stopPropagation(); props.onEditAccount(account); }}
                  >
                    ✏
                  </button>
                  <button
                    className="ghost-button danger"
                    title={t('common.removeAccount')}
                    onClick={(e) => { e.stopPropagation(); props.onRemoveAccount(account.id); }}
                  >
                    ×
                  </button>
                </div>
              </div>
              {showInfoForId === account.id && (
                <div className="account-info-panel">
                  {loadingInfo ? (
                    <small>{t('common.loadingInfo')}</small>
                  ) : accountInfo ? (
                    <>
                      <div className="info-row">
                        <span className="info-label">{t('common.status')}</span>
                        <span className={`info-badge ${accountInfo.status === 'Active' ? 'badge-ok' : 'badge-warn'}`}>
                          {accountInfo.status}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('common.expiration')}</span>
                        <span>{accountInfo.expDate}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('common.connections')}</span>
                        <span>{accountInfo.activeConnections} / {accountInfo.maxConnections}</span>
                      </div>
                    </>
                  ) : (
                    <small style={{ color: '#ff8585' }}>{t('common.errorInfo')}</small>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="primary-button full" onClick={props.onCreateAccount}>{t('common.newAccount')}</button>
      </div>

    </aside>
  );
}
