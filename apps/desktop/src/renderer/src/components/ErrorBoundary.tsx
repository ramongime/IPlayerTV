import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[IPlayerTV] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0b1220',
          color: '#e2e8f0',
          gap: '20px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px' }}>⚠️</div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Algo deu errado</h1>
          <p style={{ margin: 0, color: '#94a3b8', maxWidth: '500px', lineHeight: 1.6 }}>
            Ocorreu um erro inesperado na interface. Tente recarregar a aplicação.
          </p>
          {this.state.error && (
            <pre style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px',
              color: '#ef4444',
              maxWidth: '600px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
