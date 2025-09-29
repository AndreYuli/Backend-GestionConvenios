export default {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  
  // Configuración básica
  preset: null,
  transform: {},
  
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/generated/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!**/scripts/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Timeout para tests
  testTimeout: 10000
};