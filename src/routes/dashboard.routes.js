import { Router } from 'express';
import {
  getDashboardMetricas,
  getMetricasClave,
  getConveniosVencimiento,
  getEstadisticasConvenios,
  getResumenEjecutivo,
  getTendencias
} from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardMetricas:
 *       type: object
 *       properties:
 *         convenios:
 *           type: object
 *           properties:
 *             activos:
 *               type: integer
 *               description: Número de convenios activos
 *               example: 15
 *             proximosVencer:
 *               type: integer
 *               description: Número de convenios próximos a vencer
 *               example: 3
 *             porEstado:
 *               type: object
 *               properties:
 *                 Borrador:
 *                   type: integer
 *                   example: 2
 *                 Activo:
 *                   type: integer
 *                   example: 15
 *                 Finalizado:
 *                   type: integer
 *                   example: 8
 *                 Archivado:
 *                   type: integer
 *                   example: 1
 *         actividades:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 45
 *             porEstado:
 *               type: object
 *               properties:
 *                 Planeada:
 *                   type: integer
 *                   example: 12
 *                 EnProgreso:
 *                   type: integer
 *                   example: 20
 *                 Completada:
 *                   type: integer
 *                   example: 13
 *         productos:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 28
 *             porTipo:
 *               type: object
 *               additionalProperties:
 *                 type: integer
 *         resumen:
 *           type: object
 *           properties:
 *             totalConvenios:
 *               type: integer
 *               example: 26
 *             conveniosActivos:
 *               type: integer
 *               example: 15
 *             conveniosProximosVencer:
 *               type: integer
 *               example: 3
 *             totalActividades:
 *               type: integer
 *               example: 45
 *             totalProductos:
 *               type: integer
 *               example: 28
 * 
 *     ConvenioProximoVencer:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 5
 *         titulo:
 *           type: string
 *           example: "Convenio de Investigación con Universidad XYZ"
 *         fechaFin:
 *           type: string
 *           format: date-time
 *           example: "2025-12-15T00:00:00.000Z"
 *         estado:
 *           type: string
 *           example: "Activo"
 *         diasRestantes:
 *           type: integer
 *           example: 45
 *         urgencia:
 *           type: string
 *           enum: [alta, media, baja]
 *           example: "media"
 *         partes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               parte:
 *                 type: object
 *                 properties:
 *                   nombre:
 *                     type: string
 *                     example: "Universidad ABC"
 *                   tipo:
 *                     type: string
 *                     example: "Universidad"
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/dashboard/metricas:
 *   get:
 *     summary: Obtener métricas completas del dashboard
 *     description: Endpoint principal para Decanos y Administradores con todas las métricas del sistema
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Métricas del dashboard obtenidas exitosamente"
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/DashboardMetricas'
 *                     - type: object
 *                       properties:
 *                         fechaActualizacion:
 *                           type: string
 *                           format: date-time
 *                         usuario:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             email:
 *                               type: string
 *                             rol:
 *                               type: string
 *       403:
 *         description: Acceso denegado - Solo para roles Decano y Administrador
 *       401:
 *         description: No autorizado - Token requerido
 */
router.get('/dashboard/metricas',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']), // GESTOR actúa como Decano
  getDashboardMetricas
);

/**
 * @swagger
 * /api/dashboard/metricas-clave:
 *   get:
 *     summary: Obtener métricas clave del dashboard
 *     description: Endpoint optimizado para widgets principales (convenios activos y próximos a vencer)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dias
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Número de días para considerar "próximo a vencer"
 *     responses:
 *       200:
 *         description: Métricas clave obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Métricas clave obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     conveniosActivos:
 *                       type: integer
 *                       example: 15
 *                     conveniosProximosVencer:
 *                       type: integer
 *                       example: 3
 *                     diasConsiderados:
 *                       type: integer
 *                       example: 90
 *                     fechaConsulta:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Acceso denegado
 */
router.get('/dashboard/metricas-clave',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getMetricasClave
);

/**
 * @swagger
 * /api/dashboard/convenios-vencimiento:
 *   get:
 *     summary: Obtener lista de convenios próximos a vencer
 *     description: Lista detallada de convenios próximos a vencer para alertas y seguimiento
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dias
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Número de días para considerar "próximo a vencer"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Límite de resultados a retornar
 *     responses:
 *       200:
 *         description: Lista de convenios próximos a vencer obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Convenios próximos a vencer obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     convenios:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ConvenioProximoVencer'
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     diasConsiderados:
 *                       type: integer
 *                       example: 90
 *       403:
 *         description: Acceso denegado
 */
router.get('/dashboard/convenios-vencimiento',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getConveniosVencimiento
);

/**
 * @swagger
 * /api/dashboard/estadisticas-convenios:
 *   get:
 *     summary: Obtener estadísticas de convenios por estado
 *     description: Distribución de convenios por cada estado con porcentajes
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Estadísticas de convenios obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     porEstado:
 *                       type: object
 *                       properties:
 *                         Borrador:
 *                           type: integer
 *                           example: 2
 *                         Activo:
 *                           type: integer
 *                           example: 15
 *                         Finalizado:
 *                           type: integer
 *                           example: 8
 *                         Archivado:
 *                           type: integer
 *                           example: 1
 *                     total:
 *                       type: integer
 *                       example: 26
 *                     porcentajes:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           cantidad:
 *                             type: integer
 *                           porcentaje:
 *                             type: number
 *       403:
 *         description: Acceso denegado
 */
router.get('/dashboard/estadisticas-convenios',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getEstadisticasConvenios
);

/**
 * @swagger
 * /api/dashboard/resumen-ejecutivo:
 *   get:
 *     summary: Obtener resumen ejecutivo para la página principal
 *     description: Vista compacta con información esencial y widgets para Decanos/Administradores
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen ejecutivo obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Resumen ejecutivo obtenido exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     widgets:
 *                       type: object
 *                       properties:
 *                         conveniosActivos:
 *                           type: object
 *                           properties:
 *                             valor:
 *                               type: integer
 *                               example: 15
 *                             label:
 *                               type: string
 *                               example: "Convenios Activos"
 *                             tipo:
 *                               type: string
 *                               example: "primary"
 *                             icono:
 *                               type: string
 *                               example: "📋"
 *                         conveniosProximosVencer:
 *                           type: object
 *                           properties:
 *                             valor:
 *                               type: integer
 *                               example: 3
 *                             label:
 *                               type: string
 *                               example: "Próximos a Vencer (90 días)"
 *                             tipo:
 *                               type: string
 *                               example: "warning"
 *                             icono:
 *                               type: string
 *                               example: "⚠️"
 *                     indicadores:
 *                       type: object
 *                       properties:
 *                         porcentajeActivos:
 *                           type: number
 *                           example: 65.22
 *                         estadoGeneral:
 *                           type: string
 *                           enum: [excelente, bueno, requiere_atencion]
 *                           example: "bueno"
 *                     alertas:
 *                       type: object
 *                       properties:
 *                         conveniosVencen:
 *                           type: boolean
 *                           example: true
 *                         cantidadAlertas:
 *                           type: integer
 *                           example: 3
 *                         mensaje:
 *                           type: string
 *                           example: "3 convenio(s) vencen en los próximos 90 días"
 *       403:
 *         description: Acceso denegado - Vista ejecutiva restringida
 */
router.get('/dashboard/resumen-ejecutivo',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getResumenEjecutivo
);

/**
 * @swagger
 * /api/dashboard/tendencias:
 *   get:
 *     summary: Obtener tendencias históricas de convenios
 *     description: Datos de tendencias mensuales de convenios para gráficos y análisis
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tendencias obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tendencias obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tendenciasMensuales:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           mes:
 *                             type: string
 *                             example: "2025-09"
 *                           total:
 *                             type: integer
 *                             example: 5
 *                           activos:
 *                             type: integer
 *                             example: 3
 *                     periodo:
 *                       type: string
 *                       example: "Últimos 12 meses"
 *                     totalMeses:
 *                       type: integer
 *                       example: 12
 *       403:
 *         description: Acceso denegado
 */
router.get('/dashboard/tendencias',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getTendencias
);

export default router;