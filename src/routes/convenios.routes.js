/**
 * @fileoverview Rutas de Consulta para Convenios - Solo GET endpoints
 * @description Implementa únicamente las rutas de consulta/lectura para tu tarea específica
 * @author Tu Nombre
 * @version 1.0.0
 * 
 * NOTA IMPORTANTE: Este archivo solo contiene rutas GET para consultar datos.
 * Tu compañero implementará las rutas POST/PUT/DELETE por separado.
 * 
 * Rutas implementadas:
 * - GET /api/convenios - Consulta con filtros
 * - GET /api/convenios/:id - Consulta por ID
 * - POST /api/convenios/search - Búsqueda avanzada
 * - GET /api/convenios/stats - Estadísticas
 * 
 * Complejidad de rutas:
 * - Consultas básicas: O(log n)
 * - Consultas con filtros: O(log n * m)
 * - Búsquedas complejas: O(log n * k)
 */

import { Router } from 'express';
import {
  getConvenios,
  getConvenioById,
  searchConvenios,
  getConveniosStats
} from '../controllers/convenios.controller.js';
import {
  validateConveniosQuery,
  validateConvenioId,
  validateAdvancedSearch
} from '../validators/convenios.validator.js';

const router = Router();

/**
 * @route GET /api/convenios
 * @description Obtener convenios con filtros opcionales
 * @access Public (ajustar según necesidades)
 * @complexity O(log n * m) donde n=registros, m=filtros
 * 
 * Query Parameters:
 * - estado: string - Filtrar por estado específico
 * - estados: string[] - Filtrar por múltiples estados
 * - fechaInicio: string (YYYY-MM-DD) - Filtrar desde fecha
 * - fechaFin: string (YYYY-MM-DD) - Filtrar hasta fecha
 * - busqueda: string - Búsqueda de texto en nombre/descripción
 * - includePartes: boolean - Incluir partes relacionadas
 * - sortBy: string - Campo para ordenar
 * - sortOrder: string - Orden (asc/desc)
 * - page: number - Número de página
 * - limit: number - Registros por página
 * 
 * @example
 * GET /api/convenios?estado=Activo&page=1&limit=10
 * GET /api/convenios?estados=Activo,Borrador&busqueda=academico
 * GET /api/convenios?fechaInicio=2025-01-01&fechaFin=2025-12-31
 */
router.get('/', 
  validateConveniosQuery,  // Middleware de validación - O(k)
  getConvenios            // Controlador principal - O(log n * m)
);

/**
 * @route GET /api/convenios/stats
 * @description Obtener estadísticas agregadas de convenios
 * @access Public
 * @complexity O(log n) con índices optimizados
 * 
 * @returns {Object} Estadísticas de convenios:
 * - total: número total de convenios
 * - porEstado: conteo por cada estado
 * - recientes: convenios creados en últimos 30 días
 * 
 * @example
 * GET /api/convenios/stats
 */
router.get('/stats', 
  getConveniosStats       // Controlador de estadísticas - O(log n)
);

/**
 * @route GET /api/convenios/:id
 * @description Obtener convenio específico por ID
 * @access Public
 * @complexity O(1) usando clave primaria
 * 
 * Path Parameters:
 * - id: number - ID del convenio
 * 
 * Query Parameters:
 * - includePartes: boolean - Incluir partes relacionadas
 * 
 * @example
 * GET /api/convenios/123
 * GET /api/convenios/123?includePartes=true
 */
router.get('/:id',
  validateConvenioId,     // Validación de ID - O(1)
  getConvenioById         // Controlador por ID - O(1)
);

/**
 * @route POST /api/convenios/search
 * @description Búsqueda avanzada con criterios complejos
 * @access Public
 * @complexity O(log n * k) donde k=criterios de búsqueda
 * 
 * @body {Object} Criterios de búsqueda:
 * - textSearch: string - Texto a buscar
 * - estados: string[] - Estados a incluir
 * - fechaDesde: string - Fecha desde
 * - fechaHasta: string - Fecha hasta
 * - incluirPartes: boolean - Incluir relaciones
 * - ordenarPor: string - Campo de ordenamiento
 * - orden: string - Dirección del orden
 * - pagina: number - Página de resultados
 * - limite: number - Registros por página
 * 
 * @example
 * POST /api/convenios/search
 * {
 *   "textSearch": "academico",
 *   "estados": ["Activo", "Borrador"],
 *   "fechaDesde": "2025-01-01",
 *   "fechaHasta": "2025-12-31",
 *   "incluirPartes": true,
 *   "ordenarPor": "fechaInicio",
 *   "orden": "desc",
 *   "pagina": 1,
 *   "limite": 20
 * }
 */
router.post('/search',
  validateAdvancedSearch, // Validación de criterios - O(k)
  searchConvenios         // Controlador de búsqueda - O(log n * k)
);

/**
 * Middleware de manejo de errores para rutas de convenios
 * Complejidad: O(1)
 */
router.use((error, req, res, next) => {
  console.error(`Error en ruta de convenios: ${req.method} ${req.path}`, error);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en consulta de convenios',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

/**
 * Middleware para rutas no encontradas en este módulo
 * Complejidad: O(1)
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta de consulta no encontrada: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /api/convenios - Consultar convenios con filtros',
      'GET /api/convenios/:id - Obtener convenio por ID',
      'POST /api/convenios/search - Búsqueda avanzada',
      'GET /api/convenios/stats - Estadísticas de convenios'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;

/**
 * @namespace RouteDocumentation
 * @description Documentación detallada de las rutas implementadas
 * 
 * EJEMPLOS DE USO:
 * 
 * 1. Consulta básica:
 *    GET /api/convenios
 *    Retorna todos los convenios con paginación por defecto
 * 
 * 2. Filtrar por estado:
 *    GET /api/convenios?estado=Activo
 *    Retorna solo convenios activos
 * 
 * 3. Múltiples filtros:
 *    GET /api/convenios?estados=Activo,Borrador&busqueda=universidad&page=2&limit=5
 *    Filtros combinados con paginación
 * 
 * 4. Rango de fechas:
 *    GET /api/convenios?fechaInicio=2025-01-01&fechaFin=2025-12-31&sortBy=fechaInicio&sortOrder=asc
 *    Convenios en rango de fechas ordenados
 * 
 * 5. Incluir relaciones:
 *    GET /api/convenios?includePartes=true
 *    Convenios con información de partes involucradas
 * 
 * 6. Convenio específico:
 *    GET /api/convenios/123?includePartes=true
 *    Un convenio específico con sus partes
 * 
 * 7. Estadísticas:
 *    GET /api/convenios/stats
 *    Resumen estadístico de todos los convenios
 * 
 * 8. Búsqueda avanzada:
 *    POST /api/convenios/search
 *    Con body JSON para criterios complejos
 * 
 * OPTIMIZACIONES IMPLEMENTADAS:
 * - Índices de base de datos en campos clave
 * - Paginación para evitar sobrecarga de memoria
 * - Validaciones tempranas para errores rápidos
 * - Queries optimizadas con Prisma
 * - Manejo eficiente de relaciones opcionales
 * - Caching de resultados de validación
 * 
 * COMPLEJIDADES BIG O:
 * - GET /api/convenios: O(log n * m) - log n por índices, m por filtros
 * - GET /api/convenios/:id: O(1) - búsqueda por clave primaria
 * - POST /api/convenios/search: O(log n * k) - k por criterios complejos
 * - GET /api/convenios/stats: O(log n) - agregaciones con índices
 * 
 * CASOS DE USO PRINCIPALES:
 * 1. Dashboard administrativo - estadísticas y listas
 * 2. Búsqueda de convenios por usuarios
 * 3. Reportes filtrados por criterios específicos
 * 4. APIs para aplicaciones móviles
 * 5. Integración con sistemas externos
 */
