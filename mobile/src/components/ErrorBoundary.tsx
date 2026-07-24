import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  children: ReactNode;
  onReset: () => void;
}

interface State {
  hasError: boolean;
}

// sem isso, qualquer erro de render (ex.: um dado inconsistente vindo do
// SQLite local) derrubava a arvore de componentes inteira e deixava a tela
// branca, sem nenhum jeito de voltar a nao ser matar o app manualmente
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('Erro inesperado capturado pelo ErrorBoundary:', error);
  }

  handleReset = (): void => {
    this.props.onReset();
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Ocorreu um erro inesperado</Text>
          <Text style={styles.subtitle}>Seu progresso já salvo não foi perdido. Toque abaixo para continuar.</Text>
          <TouchableOpacity style={styles.button} activeOpacity={0.7} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  button: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: radius.md },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
