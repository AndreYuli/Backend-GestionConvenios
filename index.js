import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import conveniosRoutes from './src/routes/convenios.routes.js';
import authRoutes from './src/routes/auth.routes.js';

// 1. Inicializa el cliente de Prisma
const prisma = new PrismaClient();
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// 2. Ruta de prueba para verificar que el servidor esté funcionando
app.get('/', (req, res) => {
  res.json({ message: 'Servidor de Gestión de Convenios funcionando correctamente' });
});

// 3. Rutas de la API
app.use('/api/convenios', conveniosRoutes);
app.use('/api/auth', authRoutes);

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