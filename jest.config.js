module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // functions/ is a separate npm package (Cloud Functions) with its own
  // jest config — it must not be picked up by the mobile app's test run.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/functions/'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|@react-native-firebase|react-native-.*)/)',
  ],
};
