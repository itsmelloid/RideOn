import React from 'react';
import { View } from 'react-native';
import AppText from './AppText';
import Button from './Button';
import { colors } from '../theme';

// Catches unexpected render errors so the user sees a recovery screen instead of a crash.
// In production, send `error` to a crash reporter (e.g. Sentry) inside componentDidCatch.
export default class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    if (__DEV__) console.warn('ErrorBoundary caught:', error);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AppText variant="h2" align="center">Something went wrong</AppText>
        <AppText variant="body" align="center" style={{ marginVertical: 12 }}>Please try again. If the problem continues, restart the app.</AppText>
        <Button title="Try Again" onPress={() => this.setState({ hasError: false })} />
      </View>
    );
  }
}
