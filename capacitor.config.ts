import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.playograph.app',
  appName: 'Play-O-Graph',
  webDir: 'out',
  server: {
    url: 'https://www.play-o-graph.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'Play-O-Graph',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1a2c18',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#1a2c18',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a2c18',
    },
  },
};

export default config;
