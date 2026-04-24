import type { Account, ContentType } from '@shared/domain';

interface SidebarProps {
  accounts: Account[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  onCreateAccount: () => void;
  onRemoveAccount: (id: string) => void;
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">IPlayerTV</div>
        <div className="panel-title">Contas</div>
        <div className="account-list">
          {props.accounts.map((account) => (
            <div
              key={account.id}
              className={`account-card ${props.activeAccountId === account.id ? 'active' : ''}`}
              onClick={() => props.onAccountChange(account.id)}
            >
              <div>
                <strong>{account.name}</strong>
                <small>{account.server}</small>
              </div>
              <button
                className="ghost-button danger"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onRemoveAccount(account.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="primary-button full" onClick={props.onCreateAccount}>Nova conta</button>
      </div>

    </aside>
  );
}
