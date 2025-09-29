/**
 * @fileoverview Rutas para Gestión de Participantes
 * @description Define las rutas REST para la gestión de participantes en actividades
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { Router } from 'express';
import {
  addParticipante,
  getParticipantesByActividad,
  getParticipanteById,
  updateParticipante,
  deleteParticipante,
  getRolesDisponibles
} from '../controllers/participantes.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Participante:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del participante
 *         nombreCompleto:
 *           type: string
 *           description: Nombre completo del participante
 *         correoElectronico:
 *           type: string
 *           format: email
 *           description: Correo electrónico del participante
 *         rol:
 *           type: string
 *           enum: [Estudiante, Docente, Docente Investigador, Investigador, Coordinador, Externo, Colaborador]
 *           description: Rol del participante en la actividad
 *         fechaRegistro:
 *           type: string
 *           format: date-time
 *           description: Fecha de registro del participante
 *         ultimaActualizacion:
 *           type: string
 *           format: date-time
 *           description: Última fecha de actualización
 */

/**
 * @swagger
 * /api/roles-participantes:
 *   get:
 *     summary: Obtener roles disponibles para participantes
 *     tags: [Participantes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles disponibles
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
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                     total:
 *                       type: integer
 */
router.get('/roles-participantes',
  authMiddleware,
  getRolesDisponibles
);

/**
 * @swagger
 * /api/actividades/{actividadId}/participantes:
 *   post:
 *     summary: Agregar participante a una actividad
 *     tags: [Participantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             required:
 *               - nombreCompleto
 *               - correoElectronico
 *               - rol
 *             properties:
 *               nombreCompleto:
 *                 type: string
 *                 description: Nombre completo del participante
 *                 example: "Juan Carlos Pérez García"
 *               correoElectronico:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del participante
 *                 example: "juan.perez@universidad.edu.co"
 *               rol:
 *                 type: string
 *                 enum: [Estudiante, Docente, Docente Investigador, Investigador, Coordinador, Externo, Colaborador]
 *                 description: Rol del participante en la actividad
 *                 example: "Estudiante"
 *     responses:
 *       201:
 *         description: Participante agregado exitosamente
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
 *                     participante:
 *                       $ref: '#/components/schemas/Participante'
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Actividad no encontrada
 *       409:
 *         description: Participante ya registrado en la actividad
 */
router.post('/actividades/:actividadId/participantes',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  addParticipante
);

/**
 * @swagger
 * /api/actividades/{actividadId}/participantes:
 *   get:
 *     summary: Listar participantes de una actividad
 *     tags: [Participantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la actividad
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
 *           default: 20
 *           maximum: 50
 *         description: Elementos por página
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [Estudiante, Docente, Docente Investigador, Investigador, Coordinador, Externo, Colaborador]
 *         description: Filtrar por rol específico
 *     responses:
 *       200:
 *         description: Lista de participantes de la actividad
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
 *                     participantes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Participante'
 *                     actividad:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nombre:
 *                           type: string
 *                         descripcion:
 *                           type: string
 *                     estadisticas:
 *                       type: object
 *                       properties:
 *                         totalParticipantes:
 *                           type: integer
 *                         participantesPorRol:
 *                           type: object
 *                         rolesDisponibles:
 *                           type: array
 *                           items:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalCount:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 */
router.get('/actividades/:actividadId/participantes',
  authMiddleware,
  getParticipantesByActividad
);

/**
 * @swagger
 * /api/actividades/{actividadId}/participantes/{participanteId}:
 *   get:
 *     summary: Obtener información de un participante específico
 *     tags: [Participantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la actividad
 *       - in: path
 *         name: participanteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del participante
 *     responses:
 *       200:
 *         description: Información del participante
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
 *                     participante:
 *                       $ref: '#/components/schemas/Participante'
 */
router.get('/actividades/:actividadId/participantes/:participanteId',
  authMiddleware,
  getParticipanteById
);

/**
 * @swagger
 * /api/actividades/{actividadId}/participantes/{participanteId}:
 *   put:
 *     summary: Actualizar información de un participante
 *     tags: [Participantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la actividad
 *       - in: path
 *         name: participanteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del participante
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombreCompleto:
 *                 type: string
 *                 description: Nombre completo del participante
 *               correoElectronico:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del participante
 *               rol:
 *                 type: string
 *                 enum: [Estudiante, Docente, Docente Investigador, Investigador, Coordinador, Externo, Colaborador]
 *                 description: Rol del participante en la actividad
 *     responses:
 *       200:
 *         description: Participante actualizado exitosamente
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
 *                     participante:
 *                       $ref: '#/components/schemas/Participante'
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Participante no encontrado
 *       409:
 *         description: Correo electrónico ya existe
 */
router.put('/actividades/:actividadId/participantes/:participanteId',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  updateParticipante
);

/**
 * @swagger
 * /api/actividades/{actividadId}/participantes/{participanteId}:
 *   delete:
 *     summary: Eliminar participante de una actividad
 *     tags: [Participantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la actividad
 *       - in: path
 *         name: participanteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del participante
 *     responses:
 *       200:
 *         description: Participante eliminado exitosamente
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
 *                     eliminado:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nombreCompleto:
 *                           type: string
 *                         correoElectronico:
 *                           type: string
 *                         rol:
 *                           type: string
 *       404:
 *         description: Participante no encontrado
 */
router.delete('/actividades/:actividadId/participantes/:participanteId',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  deleteParticipante
);

export default router;