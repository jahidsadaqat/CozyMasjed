import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  componentStack: string;
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    componentStack: '',
    error: null,
  };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const componentStack = info.componentStack ?? '';

    this.setState({ componentStack });
    console.error('[AppErrorBoundary] Uncaught React error', error, componentStack);
  }

  render() {
    const { children } = this.props;
    const { componentStack, error } = this.state;

    if (!error) {
      return children;
    }

    const details = [error.stack || error.message, componentStack]
      .filter(Boolean)
      .join('\n\nComponent stack:\n');

    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>COZY MASJID</Text>
          <Text accessibilityRole="header" style={styles.title}>
            The room could not be opened
          </Text>
          <Text style={styles.message}>
            Please take a screenshot of the details below and send it with your
            TestFlight feedback.
          </Text>
          <View style={styles.detailsCard}>
            <Text selectable style={styles.details}>
              {details}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF5E6',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  eyebrow: {
    color: '#7B5947',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    color: '#38291F',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    color: '#624A3B',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: '#FFFDFC',
    borderColor: '#E4D2C1',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  details: {
    color: '#5A2730',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },
});
