/**
 * @fileoverview Rutas para Gestión de Documentos
 * @description Define las rutas REST para subida, descarga y gestión de documentos de convenios
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { Router } from 'express';
import {
  uploadDocument,
  getDocumentsByConvenio,
  downloadDocument,
  deleteDocument,
  getDocumentInfo
} from '../controllers/documents.controller.js';
import {
  upload,
  validateConvenioExists,
  handleMulterErrors,
  validateFileMetadata
} from '../middleware/file-upload.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del documento
 *         fileName:
 *           type: string
 *           description: Nombre original del archivo
 *         fileSize:
 *           type: integer
 *           description: Tamaño del archivo en bytes
 *         mimeType:
 *           type: string
 *           description: Tipo MIME del archivo
 *         description:
 *           type: string
 *           description: Descripción opcional del documento
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de subida
 *         uploader:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 */

/**
 * @swagger
 * /api/convenios/{convenioId}/documents:
 *   post:
 *     summary: Subir documento a un convenio
 *     tags: [Documents]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a subir (PDF, DOC, DOCX, JPG, JPEG, PNG)
 *               description:
 *                 type: string
 *                 description: Descripción opcional del documento
 *     responses:
 *       201:
 *         description: Documento subido exitosamente
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
 *                     document:
 *                       $ref: '#/components/schemas/Document'
 *       400:
 *         description: Error en validación del archivo
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Convenio no encontrado
 *       413:
 *         description: Archivo demasiado grande
 */
router.post('/convenios/:convenioId/documents',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  validateConvenioExists,
  upload.single('file'),
  handleMulterErrors,
  validateFileMetadata,
  uploadDocument
);

/**
 * @swagger
 * /api/convenios/{convenioId}/documents:
 *   get:
 *     summary: Listar documentos de un convenio
 *     tags: [Documents]
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
 *     responses:
 *       200:
 *         description: Lista de documentos del convenio
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
 *                     documents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Document'
 *                     convenio:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nombre:
 *                           type: string
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
router.get('/convenios/:convenioId/documents',
  authMiddleware,
  validateConvenioExists,
  getDocumentsByConvenio
);

/**
 * @swagger
 * /api/convenios/{convenioId}/documents/{documentId}:
 *   get:
 *     summary: Obtener información de un documento específico
 *     tags: [Documents]
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
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Información del documento
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
 *                     document:
 *                       $ref: '#/components/schemas/Document'
 */
router.get('/convenios/:convenioId/documents/:documentId',
  authMiddleware,
  validateConvenioExists,
  getDocumentInfo
);

/**
 * @swagger
 * /api/convenios/{convenioId}/documents/{documentId}/download:
 *   get:
 *     summary: Descargar documento
 *     tags: [Documents]
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
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Archivo descargado
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Documento no encontrado
 */
router.get('/convenios/:convenioId/documents/:documentId/download',
  authMiddleware,
  downloadDocument
);

/**
 * @swagger
 * /api/convenios/{convenioId}/documents/{documentId}:
 *   delete:
 *     summary: Eliminar documento
 *     tags: [Documents]
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
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Documento eliminado exitosamente
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
 *         description: Sin permisos para eliminar el documento
 *       404:
 *         description: Documento no encontrado
 */
router.delete('/convenios/:convenioId/documents/:documentId',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR']),
  deleteDocument
);

export default router;