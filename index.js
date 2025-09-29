/**
 * @fileoverview Punto de entrada principal de la aplicación
 * @description Configura el servidor Express con middlewares, rutas y manejo de errores
 */

import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';

// Importar servicio de logging
import logger, { requestLogger } from './src/lib/logger.js';

// Importar configuración validada de variables de entorno
import env from './src/config/env.config.js';

// Importar rutas
import conveniosRoutes from './src/routes/convenios.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import tokenRoutes from './src/routes/token.routes.js';
import documentsRoutes from './src/routes/documents.routes.js';
import participantesRoutes from './src/routes/participantes.routes.js';
import actividadesRoutes from './src/routes/actividades.routes.js';
import productosRoutes from './src/routes/productos.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import reportsRoutes from './src/routes/reports.routes.js';

// Importar middlewares
import { 
  createCorsConfig, 
  corsLogger, 
  corsErrorHandler, 
  securityHeaders 
} from './src/middleware/cors.middleware.js';
// Importar middleware de manejo de errores
import { applyErrorHandlers } from './src/middleware/error.middleware.js';

// Inicializa el cliente de Prisma con logging en desarrollo
const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Inicializa la aplicación Express
const app = express();

// Middlewares de seguridad
app.use(helmet()); // Añade headers de seguridad
app.use(securityHeaders); // Headers de seguridad personalizados
app.use(corsLogger); // Logging de solicitudes CORS

// Limitar tamaño de payload para prevenir ataques DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting global para prevenir ataques de fuerza bruta
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 solicitudes por ventana por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Demasiadas solicitudes, por favor intente más tarde'
  }
});

// Aplicar rate limiting a todas las rutas de la API
app.use('/api', apiLimiter);

// Crear directorio de logs si no existe (para producción)
if (env.NODE_ENV === 'production') {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Aplicar middleware de logging de solicitudes
app.use(requestLogger);

// Configuración CORS basada en variables de entorno
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: env.CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  maxAge: env.CORS_MAX_AGE
}));

// 2. Ruta de prueba para verificar que el servidor esté funcionando
app.get('/', (req, res) => {
  logger.info('Ruta principal accedida');
  res.json({ message: 'Servidor de Gestión de Convenios funcionando correctamente' });
});

// 3. Rutas de la API
app.use('/api/convenios', conveniosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api', documentsRoutes);
app.use('/api', participantesRoutes);
app.use('/api', actividadesRoutes);
app.use('/api', productosRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', reportsRoutes);

// Endpoint de prueba para diagnóstico
app.post('/api/test/register', (req, res) => {
  console.log('📝 TEST REGISTER - Body recibido:', req.body);
  console.log('📝 TEST REGISTER - Headers:', req.headers);
  
  res.json({
    success: true,
    message: 'Endpoint de prueba funcionando',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// Importar controlador simplificado
import { simpleRegister } from './src/controllers/simple-auth.controller.js';

// Ruta de registro simplificada para diagnóstico
app.post('/api/auth/simple-register', simpleRegister);

// 4. Ruta de prueba para verificar la conexión a la base de datos
app.get('/health', async (req, res) => {
  try {
    // Verifica la conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Health check exitoso');
    res.json({ 
      status: 'OK', 
      message: 'Conexión a la base de datos exitosa',
      timestamp: new Date().toISOString(),
      availableEndpoints: {
        consulta: 'GET /api/convenios - Consultar convenios con filtros',
        busqueda: 'POST /api/convenios/search - Búsqueda avanzada',
        estadisticas: 'GET /api/convenios/stats - Estadísticas',
        individual: 'GET /api/convenios/:id - Convenio por ID'
      }
    });
  } catch (error) {
    logger.error('Error en health check', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Error en la conexión a la base de datos',
      error: error.message 
    });
  }
});

// Middleware de manejo de errores CORS
app.use(corsErrorHandler);

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Aplicar middleware de manejo de errores
applyErrorHandlers(app);

// Iniciar el servidor
const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`Servidor iniciado en puerto ${PORT} en modo ${env.NODE_ENV}`, {
    port: PORT,
    environment: env.NODE_ENV,
    url: `http://localhost:${PORT}`,
    nodeVersion: process.version
  });
});

// Manejo de cierre graceful del servidor
process.on('SIGINT', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  logger.critical('Error no controlado (unhandledRejection)', err);
  // En producción podríamos considerar reiniciar el servidor
  // process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.critical('Error no controlado (uncaughtException)', err);
  // En producción podríamos considerar reiniciar el servidor
  // process.exit(1);
});