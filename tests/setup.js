import { PrismaClient } from '@prisma/client';

// Configuración global para tests
global.testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

// Limpiar la base de datos antes de cada test
beforeEach(async () => {
  // Limpiar todas las tablas
  await global.testPrisma.convenio.deleteMany();
});

// Cerrar conexión después de todos los tests
afterAll(async () => {
  await global.testPrisma.$disconnect();
});
