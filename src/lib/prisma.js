import { PrismaClient } from '@prisma/client';

// Instancia global de Prisma Client para reutilizar conexiones
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // Logs para desarrollo
});

// Manejo de conexión y desconexión
export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Base de datos conectada exitosamente');
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Base de datos desconectada exitosamente');
  } catch (error) {
    console.error('❌ Error al desconectar de la base de datos:', error);
  }
};

// Manejo de cierre graceful
process.on('beforeExit', async () => {
  await disconnectDB();
});

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

export default prisma;