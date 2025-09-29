/**
 * Setup para tests de integración con ES modules
 */

// Configuración global para tests de integración
global.testTimeout = 30000;

// Mock de console para tests más limpios (opcional)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Configurar entorno de prueba
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Restaurar console después de los tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});