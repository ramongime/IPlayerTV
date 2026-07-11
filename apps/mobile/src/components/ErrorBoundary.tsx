import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

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
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.subtitle}>
            Ocorreu um erro inesperado. Tente recarregar.
          </Text>
          {this.state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
            </View>
          )}
          <Pressable onPress={this.handleReload} style={styles.button}>
            <Text style={styles.buttonText}>Recarregar</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  icon: { fontSize: 56 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    maxWidth: '100%',
  },
  errorText: { color: colors.danger, fontSize: 12 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
