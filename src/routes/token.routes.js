/**
 * @fileoverview Rutas para gestión de tokens y sesiones
 * @description Define endpoints para refrescar tokens y gestionar sesiones
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import express from 'express';
import tokenController from '../controllers/token.controller.js';
import { AuthMiddlewareFactory } from '../middleware/auth.middleware.js';

const router = express.Router();

// Middleware de autenticación
const authMiddleware = AuthMiddlewareFactory.createWithLogging();
const adminGuard = AuthMiddlewareFactory.createRoleGuard(['ADMIN']);

/**
 * @route POST /api/tokens/refresh
 * @description Refresca un token de acceso usando un refresh token
 * @access Público
 */
router.post('/refresh', tokenController.refreshToken);

/**
 * @route POST /api/tokens/logout
 * @description Cierra la sesión del usuario revocando sus tokens
 * @access Privado - Requiere autenticación
 */
router.post('/logout', authMiddleware, tokenController.logout);

/**
 * @route POST /api/tokens/invalidate/:userId
 * @description Invalida todas las sesiones de un usuario
 * @access Privado - Requiere ser el mismo usuario o un administrador
 */
router.post('/invalidate/:userId', authMiddleware, tokenController.invalidateAllSessions);

/**
 * @route GET /api/tokens/sessions/:userId?
 * @description Obtiene las sesiones activas del usuario
 * @access Privado - Requiere ser el mismo usuario o un administrador
 */
router.get('/sessions/:userId?', authMiddleware, tokenController.getActiveSessions);

/**
 * @route POST /api/tokens/cleanup
 * @description Limpia tokens expirados de la base de datos
 * @access Privado - Solo administradores
 */
router.post('/cleanup', authMiddleware, adminGuard, tokenController.cleanupExpiredTokens);

export default router;