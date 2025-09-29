/**
 * @fileoverview Controlador para gestión de tokens JWT
 * @description Implementa endpoints para refrescar tokens y gestionar sesiones
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import TokenService from '../services/token.service.js';
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger.js';

const prisma = new PrismaClient();
const tokenService = new TokenService();

/**
 * @class TokenController
 * @description Controlador para gestión de tokens JWT y sesiones
 */
class TokenController {
  /**
   * Refresca un token de acceso usando un refresh token
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   * @returns {Object} Nuevo par de tokens
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token requerido',
          error: 'MISSING_REFRESH_TOKEN'
        });
      }

      // Intentar refrescar los tokens
      const tokens = await tokenService.refreshTokens(refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Tokens refrescados exitosamente',
        data: {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessTokenExpiry: tokens.accessTokenExpiry,
            refreshTokenExpiry: tokens.refreshTokenExpiry
          }
        }
      });
    } catch (error) {
      logger.error(`Error en refreshToken: ${error.message}`, { error });

      // Determinar el tipo de error para una respuesta adecuada
      if (error.message.includes('expirado') || error.message.includes('revocado') || error.message.includes('inválido')) {
        return res.status(401).json({
          success: false,
          message: 'Sesión expirada. Por favor inicie sesión nuevamente.',
          error: 'INVALID_REFRESH_TOKEN'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error refrescando tokens',
        error: 'REFRESH_TOKEN_ERROR'
      });
    }
  }

  /**
   * Cierra la sesión del usuario revocando todos sus tokens
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   * @returns {Object} Resultado de la operación
   */
  async logout(req, res) {
    try {
      const userId = req.user.id;
      
      // Revocar todos los tokens del usuario
      const revokedCount = await tokenService.revokeAllUserTokens(userId);
      
      logger.info(`Usuario ${userId} cerró sesión. ${revokedCount} tokens revocados.`);
      
      return res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      logger.error(`Error en logout: ${error.message}`, { error });
      
      return res.status(500).json({
        success: false,
        message: 'Error cerrando sesión',
        error: 'LOGOUT_ERROR'
      });
    }
  }

  /**
   * Invalida todas las sesiones del usuario (útil para cambio de contraseña)
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   * @returns {Object} Resultado de la operación
   */
  async invalidateAllSessions(req, res) {
    try {
      const userId = req.params.userId;
      
      // Verificar permisos (solo el propio usuario o un admin puede invalidar sesiones)
      if (req.user.id !== parseInt(userId) && req.user.rol !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para realizar esta acción',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      // Revocar todos los tokens del usuario
      const revokedCount = await tokenService.revokeAllUserTokens(userId);
      
      logger.info(`Todas las sesiones del usuario ${userId} fueron invalidadas. ${revokedCount} tokens revocados.`);
      
      return res.status(200).json({
        success: true,
        message: 'Todas las sesiones fueron invalidadas exitosamente',
        data: { revokedCount }
      });
    } catch (error) {
      logger.error(`Error en invalidateAllSessions: ${error.message}`, { error });
      
      return res.status(500).json({
        success: false,
        message: 'Error invalidando sesiones',
        error: 'INVALIDATE_SESSIONS_ERROR'
      });
    }
  }

  /**
   * Limpia tokens expirados de la base de datos (tarea de mantenimiento)
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   * @returns {Object} Resultado de la operación
   */
  async cleanupExpiredTokens(req, res) {
    try {
      // Verificar que sea un administrador
      if (req.user.rol !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Solo administradores pueden ejecutar esta acción',
          error: 'ADMIN_REQUIRED'
        });
      }
      
      const deletedCount = await tokenService.cleanupExpiredTokens();
      
      logger.info(`Limpieza de tokens expirados completada. ${deletedCount} tokens eliminados.`);
      
      return res.status(200).json({
        success: true,
        message: 'Limpieza de tokens expirados completada',
        data: { deletedCount }
      });
    } catch (error) {
      logger.error(`Error en cleanupExpiredTokens: ${error.message}`, { error });
      
      return res.status(500).json({
        success: false,
        message: 'Error limpiando tokens expirados',
        error: 'CLEANUP_TOKENS_ERROR'
      });
    }
  }

  /**
   * Obtiene las sesiones activas del usuario
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   * @returns {Object} Lista de sesiones activas
   */
  async getActiveSessions(req, res) {
    try {
      const userId = req.params.userId || req.user.id;
      
      // Verificar permisos (solo el propio usuario o un admin puede ver sesiones)
      if (req.user.id !== parseInt(userId) && req.user.rol !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para realizar esta acción',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      // Obtener tokens activos
      const activeSessions = await prisma.refreshToken.findMany({
        where: {
          userId: parseInt(userId),
          isRevoked: false,
          expiresAt: {
            gt: new Date() // Solo tokens no expirados
          }
        },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Sesiones activas recuperadas exitosamente',
        data: { activeSessions }
      });
    } catch (error) {
      logger.error(`Error en getActiveSessions: ${error.message}`, { error });
      
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo sesiones activas',
        error: 'GET_SESSIONS_ERROR'
      });
    }
  }
}

export default new TokenController();