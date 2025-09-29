/**
 * @fileoverview Rutas para Gestión de Actividades
 * @description Define las rutas REST para CRUD completo de actividades vinculadas a convenios
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { Router } from 'express';
import {
  createActividad,
  getActividadesByConvenio,
  getActividad,
  updateActividad,
  deleteActividad,
  getEstadisticasActividades
} from '../controllers/actividades.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Actividad:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la actividad
 *         nombre:
 *           type: string
 *           description: Nombre de la actividad
 *         descripcion:
 *           type: string
 *           description: Descripción detallada de la actividad
 *         fechaInicio:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de inicio
 *         fechaFin:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de finalización
 *         estado:
 *           type: string
 *           enum: [Planeada, EnProgreso, Completada]
 *           description: Estado actual de la actividad
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         responsable:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 *             rol:
 *               type: string
 *     ActividadInput:
 *       type: object
 *       required:
 *         - nombre
 *         - descripcion
 *         - responsableId
 *         - fechaInicio
 *         - fechaFin
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre de la actividad
 *           example: "Revisión de documentos legales"
 *         descripcion:
 *           type: string
 *           description: Descripción detallada
 *           example: "Revisar y validar todos los documentos legales del convenio"
 *         responsableId:
 *           type: integer
 *           description: ID del usuario responsable
 *           example: 1
 *         fechaInicio:
 *           type: string
 *           format: date-time
 *           description: Fecha de inicio
 *           example: "2024-01-15T09:00:00Z"
 *         fechaFin:
 *           type: string
 *           format: date-time
 *           description: Fecha de finalización
 *           example: "2024-01-30T17:00:00Z"
 */

/**
 * @swagger
 * /api/convenios/{convenioId}/actividades:
 *   post:
 *     summary: Crear nueva actividad en un convenio
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convenioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del convenio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActividadInput'
 *     responses:
 *       201:
 *         description: Actividad creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     actividad:
 *                       $ref: '#/components/schemas/Actividad'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Convenio no encontrado
 */
router.post('/convenios/:convenioId/actividades',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  createActividad
);

/**
 * @swagger
 * /api/convenios/{convenioId}/actividades:
 *   get:
 *     summary: Listar actividades de un convenio
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convenioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del convenio
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
 *           default: 10
 *           maximum: 50
 *         description: Elementos por página
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Planeada, EnProgreso, Completada]
 *         description: Filtrar por estado
 *       - in: query
 *         name: responsableId
 *         schema:
 *           type: integer
 *         description: Filtrar por responsable
 *     responses:
 *       200:
 *         description: Lista de actividades del convenio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     actividades:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Actividad'
 *                     convenio:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nombre:
 *                           type: string
 *                     filtros:
 *                       type: object
 *                     pagination:
 *                       type: object
 */
router.get('/convenios/:convenioId/actividades',
  authMiddleware,
  getActividadesByConvenio
);

/**
 * @swagger
 * /api/convenios/{convenioId}/actividades/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de actividades del convenio
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convenioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del convenio
 *     responses:
 *       200:
 *         description: Estadísticas de actividades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     convenio:
 *                       type: object
 *                     estadisticas:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         planeadas:
 *                           type: integer
 *                         enProgreso:
 *                           type: integer
 *                         completadas:
 *                           type: integer
 *                         vencidas:
 *                           type: integer
 *                         progreso:
 *                           type: integer
 *                           description: Porcentaje de progreso (0-100)
 */
router.get('/convenios/:convenioId/actividades/estadisticas',
  authMiddleware,
  getEstadisticasActividades
);

/**
 * @swagger
 * /api/convenios/{convenioId}/actividades/{actividadId}:
 *   get:
 *     summary: Obtener actividad específica
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convenioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del convenio
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la actividad
 *     responses:
 *       200:
 *         description: Información de la actividad
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     actividad:
 *                       $ref: '#/components/schemas/Actividad'
 */
router.get('/convenios/:convenioId/actividades/:actividadId',
  authMiddleware,
  getActividad
);

/**
 * @swagger
 * /api/convenios/{convenioId}/actividades/{actividadId}:
 *   put:
 *     summary: Actualizar actividad
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convenioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del convenio
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la actividad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nuevo nombre (opcional)
 *               descripcion:
 *                 type: string
 *                 description: Nueva descripción (opcional)
 *               responsableId:
 *                 type: integer
 *                 description: Nuevo responsable (opcional)
 *               fechaInicio:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha de inicio (opcional)
 *               fechaFin:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha de fin (opcional)
 *               estado:
 *                 type: string
 *                 enum: [Planeada, EnProgreso, Completada]
 *                 description: Nuevo estado (opcional)
 *     responses:
 *       200:
 *         description: Actividad actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     actividad:
 *                       $ref: '#/components/schemas/Actividad'
 */
router.put('/convenios/:convenioId/actividades/:actividadId',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  updateActividad
);

/**
 * @swagger
 * /api/convenios/{convenioId}/actividades/{actividadId}:
 *   delete:
 *     summary: Eliminar actividad
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convenioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del convenio
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la actividad
 *     responses:
 *       200:
 *         description: Actividad eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Sin permisos para eliminar la actividad
 *       404:
 *         description: Actividad no encontrada
 */
router.delete('/convenios/:convenioId/actividades/:actividadId',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  deleteActividad
);

export default router;