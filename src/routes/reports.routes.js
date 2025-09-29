import { Router } from 'express';
import {
  getActivitiesReport,
  getActivitiesReportPreview,
  getActivitiesList,
  exportActivitiesCSV,
  exportActivitiesPDF,
  getReportsStats
} from '../controllers/reports.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ReporteActividad:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID de la actividad
 *           example: 1
 *         nombre:
 *           type: string
 *           description: Nombre de la actividad
 *           example: "Desarrollo de Software Educativo"
 *         descripcion:
 *           type: string
 *           description: Descripción de la actividad
 *           example: "Desarrollo de plataforma educativa para matemáticas"
 *         estado:
 *           type: string
 *           enum: [Planeada, EnProgreso, Completada]
 *           example: "Completada"
 *         fechaInicio:
 *           type: string
 *           format: date
 *           example: "2025-01-15"
 *         fechaFin:
 *           type: string
 *           format: date
 *           example: "2025-06-30"
 *         convenio:
 *           type: object
 *           properties:
 *             titulo:
 *               type: string
 *               example: "Convenio de Investigación Tecnológica"
 *             estado:
 *               type: string
 *               example: "Activo"
 *             partes:
 *               type: string
 *               example: "Universidad ABC, Empresa XYZ"
 *         responsable:
 *           type: string
 *           description: Email del responsable
 *           example: "profesor@universidad.edu.co"
 *         estadisticas:
 *           type: object
 *           properties:
 *             participantes:
 *               type: integer
 *               example: 5
 *             productos:
 *               type: integer
 *               example: 3
 * 
 *     ResumenReporte:
 *       type: object
 *       properties:
 *         periodo:
 *           type: object
 *           properties:
 *             fechaInicio:
 *               type: string
 *               format: date
 *               example: "2025-01-01"
 *             fechaFin:
 *               type: string
 *               format: date
 *               example: "2025-12-31"
 *             diasPeriodo:
 *               type: integer
 *               example: 365
 *         totales:
 *           type: object
 *           properties:
 *             actividades:
 *               type: integer
 *               example: 25
 *             conveniosInvolucrados:
 *               type: integer
 *               example: 8
 *             responsablesInvolucrados:
 *               type: integer
 *               example: 12
 *             totalParticipantes:
 *               type: integer
 *               example: 87
 *             totalProductos:
 *               type: integer
 *               example: 45
 *         porEstado:
 *           type: object
 *           properties:
 *             Planeada:
 *               type: integer
 *               example: 5
 *             EnProgreso:
 *               type: integer
 *               example: 12
 *             Completada:
 *               type: integer
 *               example: 8
 *         porcentajes:
 *           type: object
 *           properties:
 *             Planeada:
 *               type: string
 *               example: "20.00"
 *             EnProgreso:
 *               type: string
 *               example: "48.00"
 *             Completada:
 *               type: string
 *               example: "32.00"
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/reports/activities:
 *   get:
 *     summary: Generar reporte de actividades por rango de fechas
 *     description: Endpoint principal para generar reportes completos de actividades. Solo accesible para Gestores y Administradores.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango (YYYY-MM-DD)
 *         example: "2025-01-01"
 *       - in: query
 *         name: fechaFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango (YYYY-MM-DD)
 *         example: "2025-12-31"
 *       - in: query
 *         name: formato
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Formato de salida del reporte
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente
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
 *                   example: "Reporte generado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     meta:
 *                       type: object
 *                       properties:
 *                         fechaInicio:
 *                           type: string
 *                           format: date-time
 *                         fechaFin:
 *                           type: string
 *                           format: date-time
 *                         fechaGeneracion:
 *                           type: string
 *                           format: date-time
 *                         totalRegistros:
 *                           type: integer
 *                     resumen:
 *                       $ref: '#/components/schemas/ResumenReporte'
 *                     actividades:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ReporteActividad'
 *           text/csv:
 *             schema:
 *               type: string
 *               description: Archivo CSV con los datos del reporte
 *       400:
 *         description: Parámetros de fecha inválidos o faltantes
 *       403:
 *         description: Acceso denegado - Se requiere rol Gestor o Administrador
 *       500:
 *         description: Error interno del servidor
 */
router.get('/reports/activities',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getActivitiesReport
);

/**
 * @swagger
 * /api/reports/activities/preview:
 *   get:
 *     summary: Obtener vista previa del reporte de actividades
 *     description: Endpoint optimizado que retorna solo el resumen estadístico sin los datos completos
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Vista previa generada exitosamente
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
 *                   example: "Vista previa del reporte generada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     preview:
 *                       type: boolean
 *                       example: true
 *                     resumen:
 *                       $ref: '#/components/schemas/ResumenReporte'
 *                     estimacion:
 *                       type: object
 *                       properties:
 *                         tiempoGeneracion:
 *                           type: string
 *                           enum: [rápido, medio, lento]
 *                           example: "rápido"
 *                         registrosEstimados:
 *                           type: integer
 *                           example: 25
 *       400:
 *         description: Parámetros de fecha inválidos
 *       403:
 *         description: Acceso denegado
 */
router.get('/reports/activities/preview',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getActivitiesReportPreview
);

/**
 * @swagger
 * /api/reports/activities/list:
 *   get:
 *     summary: Obtener lista paginada de actividades
 *     description: Endpoint para obtener lista de actividades con paginación, sin datos relacionados pesados
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango
 *       - in: query
 *         name: fechaFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Número de registros por página
 *     responses:
 *       200:
 *         description: Lista obtenida exitosamente
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
 *                   example: "Lista de actividades obtenida exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     actividades:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ReporteActividad'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 50
 *                         total:
 *                           type: integer
 *                           example: 123
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         hasNext:
 *                           type: boolean
 *                           example: true
 *                         hasPrev:
 *                           type: boolean
 *                           example: false
 *       403:
 *         description: Acceso denegado
 */
router.get('/reports/activities/list',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getActivitiesList
);

/**
 * @swagger
 * /api/reports/activities/export/csv:
 *   get:
 *     summary: Exportar reporte de actividades a CSV
 *     description: Endpoint para descarga directa del reporte en formato CSV
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango
 *       - in: query
 *         name: fechaFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango
 *     responses:
 *       200:
 *         description: Archivo CSV generado exitosamente
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               description: Archivo CSV con BOM UTF-8
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: 'attachment; filename="reporte_actividades_2025-01-01_2025-12-31.csv"'
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: 'text/csv; charset=utf-8'
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: Acceso denegado
 */
router.get('/reports/activities/export/csv',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  exportActivitiesCSV
);

/**
 * @swagger
 * /api/reports/activities/export/pdf:
 *   get:
 *     summary: Exportar reporte de actividades a PDF
 *     description: Genera y descarga un archivo PDF con el reporte de actividades filtrado por rango de fechas
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del período (YYYY-MM-DD)
 *         example: '2025-01-01'
 *       - in: query
 *         name: fechaFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del período (YYYY-MM-DD)
 *         example: '2025-12-31'
 *     responses:
 *       200:
 *         description: Archivo PDF generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: Información del archivo para descarga
 *             schema:
 *               type: string
 *               example: 'attachment; filename="reporte_actividades_2025-01-01_2025-12-31.pdf"'
 *           Content-Type:
 *             description: Tipo de contenido del archivo
 *             schema:
 *               type: string
 *               example: 'application/pdf'
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: Acceso denegado
 */
router.get('/reports/activities/export/pdf',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  exportActivitiesPDF
);

/**
 * @swagger
 * /api/reports/stats:
 *   get:
 *     summary: Obtener estadísticas de reportes disponibles
 *     description: Endpoint que proporciona información sobre los tipos de reportes y estadísticas generales
 *     tags: [Reportes]
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
 *                   example: "Estadísticas de reportes obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     estadisticas:
 *                       type: object
 *                       properties:
 *                         añoActual:
 *                           allOf:
 *                             - $ref: '#/components/schemas/ResumenReporte'
 *                             - type: object
 *                               properties:
 *                                 periodo:
 *                                   type: string
 *                                   example: "2025-01-01 - 2025-09-29"
 *                         mesActual:
 *                           allOf:
 *                             - $ref: '#/components/schemas/ResumenReporte'
 *                             - type: object
 *                               properties:
 *                                 periodo:
 *                                   type: string
 *                                   example: "2025-09-01 - 2025-09-29"
 *                     tiposReporte:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tipo:
 *                             type: string
 *                             example: "actividades"
 *                           descripcion:
 *                             type: string
 *                             example: "Reporte de actividades por rango de fechas"
 *                           formatos:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["JSON", "CSV"]
 *                           rolesPermitidos:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["ADMIN", "GESTOR"]
 *                     limitaciones:
 *                       type: object
 *                       properties:
 *                         rangoMaximo:
 *                           type: string
 *                           example: "730 días"
 *                         formatosDisponibles:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["JSON", "CSV"]
 *                         rolesPermitidos:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["ADMIN", "GESTOR"]
 *       403:
 *         description: Acceso denegado
 */
router.get('/reports/stats',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  getReportsStats
);

export default router;