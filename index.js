import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import conveniosRoutes from './src/routes/convenios.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import documentsRoutes from './src/routes/documents.routes.js';
import participantesRoutes from './src/routes/participantes.routes.js';
import actividadesRoutes from './src/routes/actividades.routes.js';
import productosRoutes from './src/routes/productos.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import reportsRoutes from './src/routes/reports.routes.js';
import { 
  createCorsConfig, 
  corsLogger, 
  corsErrorHandler, 
  securityHeaders 
} from './src/middleware/cors.middleware.js';

// 1. Inicializa el cliente de Prisma
const prisma = new PrismaClient();
const app = express();

// Middlewares de seguridad
app.use(securityHeaders);
app.use(corsLogger);
app.use(express.json());

// Configuración CORS simple para desarrollo
app.use(cors({
  origin: [
    'http://localhost:5174',  // Tu frontend principal
    'http://localhost:3000',  // React default
    'http://localhost:5173',  // Vite default
    'http://localhost:4200'   // Angular default
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  maxAge: 86400
}));

// 2. Ruta de prueba para verificar que el servidor esté funcionando
app.get('/', (req, res) => {
  res.json({ message: 'Servidor de Gestión de Convenios funcionando correctamente' });
});

// 3. Rutas de la API
app.use('/api/convenios', conveniosRoutes);
app.use('/api/auth', authRoutes);
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
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Error en la conexión a la base de datos',
      error: error.message 
    });
  }
});

// Middleware de manejo de errores CORS
app.use(corsErrorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  console.log(`URL del servidor: http://localhost:${PORT}`);
  console.log('✅ Servidor listo para recibir endpoints de la API');
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