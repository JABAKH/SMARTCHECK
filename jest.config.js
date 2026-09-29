module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens)/)',
  ],
};
