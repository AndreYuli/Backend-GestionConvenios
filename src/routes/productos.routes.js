import { Router } from 'express';
import {
  addProducto,
  getProductosByActividad,
  getProductoById,
  updateProducto,
  deleteProducto,
  getTiposProducto
} from '../controllers/productos.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Producto:
 *       type: object
 *       required:
 *         - nombre
 *         - tipo
 *         - descripcion
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del producto
 *         actividadId:
 *           type: integer
 *           description: ID de la actividad a la que pertenece
 *         nombre:
 *           type: string
 *           maxLength: 255
 *           description: Nombre del producto
 *         tipo:
 *           type: string
 *           enum: [Articulo, Software, Patente, Informe, Manual, Prototipo, Dataset, Otro]
 *           description: Tipo de producto
 *         descripcion:
 *           type: string
 *           description: Descripción detallada del producto
 *         enlace:
 *           type: string
 *           maxLength: 500
 *           description: URL o enlace relacionado al producto
 *         archivoUrl:
 *           type: string
 *           maxLength: 500
 *           description: URL del archivo subido (opcional)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *       example:
 *         id: 1
 *         actividadId: 5
 *         nombre: "Artículo de Investigación sobre IA"
 *         tipo: "Articulo"
 *         descripcion: "Artículo académico sobre aplicaciones de inteligencia artificial en la educación"
 *         enlace: "https://doi.org/10.1000/182"
 *         archivoUrl: "/uploads/productos/articulo-ia-educacion.pdf"
 * 
 *     ProductoInput:
 *       type: object
 *       required:
 *         - nombre
 *         - tipo
 *         - descripcion
 *       properties:
 *         nombre:
 *           type: string
 *           maxLength: 255
 *           description: Nombre del producto
 *         tipo:
 *           type: string
 *           enum: [Articulo, Software, Patente, Informe, Manual, Prototipo, Dataset, Otro]
 *           description: Tipo de producto
 *         descripcion:
 *           type: string
 *           description: Descripción detallada del producto
 *         enlace:
 *           type: string
 *           maxLength: 500
 *           description: URL o enlace relacionado al producto
 *         archivoUrl:
 *           type: string
 *           maxLength: 500
 *           description: URL del archivo subido (opcional)
 *       example:
 *         nombre: "Software de Gestión Académica"
 *         tipo: "Software"
 *         descripcion: "Sistema web para gestión de convenios universitarios"
 *         enlace: "https://github.com/universidad/gestion-convenios"
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/actividades/{actividadId}/productos:
 *   post:
 *     summary: Agregar producto a una actividad
 *     description: Permite a responsables de actividad o usuarios con roles ADMIN/GESTOR agregar productos resultantes de actividades
 *     tags: [Productos]
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
 *             $ref: '#/components/schemas/ProductoInput'
 *     responses:
 *       201:
 *         description: Producto agregado exitosamente
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
 *                   example: "Producto agregado exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Producto'
 *       400:
 *         description: Datos inválidos o faltantes
 *       403:
 *         description: Sin permisos para agregar productos a esta actividad
 *       404:
 *         description: Actividad no encontrada
 */
router.post('/actividades/:actividadId/productos',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR', 'CONSULTOR']), // CONSULTOR puede agregar si es responsable
  addProducto
);

/**
 * @swagger
 * /api/actividades/{actividadId}/productos:
 *   get:
 *     summary: Listar productos de una actividad
 *     description: Obtiene todos los productos asociados a una actividad específica
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la actividad
 *     responses:
 *       200:
 *         description: Lista de productos obtenida exitosamente
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
 *                   example: "Productos obtenidos exitosamente"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     actividadId:
 *                       type: integer
 *                       example: 1
 *       404:
 *         description: Actividad no encontrada
 */
router.get('/actividades/:actividadId/productos',
  authMiddleware,
  getProductosByActividad
);

/**
 * @swagger
 * /api/actividades/{actividadId}/productos/{productoId}:
 *   get:
 *     summary: Obtener producto específico
 *     description: Obtiene información detallada de un producto específico de una actividad
 *     tags: [Productos]
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
 *         name: productoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto obtenido exitosamente
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
 *                   example: "Producto obtenido exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Producto'
 *       404:
 *         description: Producto no encontrado en esta actividad
 */
router.get('/actividades/:actividadId/productos/:productoId',
  authMiddleware,
  getProductoById
);

/**
 * @swagger
 * /api/actividades/{actividadId}/productos/{productoId}:
 *   put:
 *     summary: Actualizar producto
 *     description: Actualiza información de un producto existente. Solo disponible para responsables de actividad o usuarios ADMIN/GESTOR
 *     tags: [Productos]
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
 *         name: productoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 maxLength: 255
 *               tipo:
 *                 type: string
 *                 enum: [Articulo, Software, Patente, Informe, Manual, Prototipo, Dataset, Otro]
 *               descripcion:
 *                 type: string
 *               enlace:
 *                 type: string
 *                 maxLength: 500
 *               archivoUrl:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
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
 *                   example: "Producto actualizado exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Producto'
 *       403:
 *         description: Sin permisos para actualizar este producto
 *       404:
 *         description: Producto no encontrado
 */
router.put('/actividades/:actividadId/productos/:productoId',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR', 'CONSULTOR']), // CONSULTOR puede actualizar si es responsable
  updateProducto
);

/**
 * @swagger
 * /api/actividades/{actividadId}/productos/{productoId}:
 *   delete:
 *     summary: Eliminar producto
 *     description: Elimina un producto de una actividad. Solo disponible para responsables de actividad o usuarios ADMIN/GESTOR
 *     tags: [Productos]
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
 *         name: productoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
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
 *                   example: "Producto eliminado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     actividadId:
 *                       type: integer
 *                       example: 5
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Sin permisos para eliminar este producto
 *       404:
 *         description: Producto no encontrado
 */
router.delete('/actividades/:actividadId/productos/:productoId',
  authMiddleware,
  requireRole(['ADMIN', 'GESTOR', 'CONSULTOR']), // CONSULTOR puede eliminar si es responsable
  deleteProducto
);

/**
 * @swagger
 * /api/tipos-producto:
 *   get:
 *     summary: Obtener tipos de producto disponibles
 *     description: Retorna la lista de todos los tipos de producto válidos para crear productos
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tipos de producto obtenidos exitosamente
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
 *                   example: "Tipos de producto obtenidos exitosamente"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       valor:
 *                         type: string
 *                         example: "Articulo"
 *                       etiqueta:
 *                         type: string
 *                         example: "Articulo"
 */
router.get('/tipos-producto',
  authMiddleware,
  getTiposProducto
);

export default router;